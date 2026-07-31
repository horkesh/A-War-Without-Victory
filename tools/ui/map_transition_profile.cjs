'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { _electron: electron } = require('playwright');

const repo = path.resolve(__dirname, '..', '..');
const evidenceRoot = path.join(repo, 'tmp-map-transition-perf');
const requiredTransitionMarks = [
  'command',
  'viewport-visible',
  'core-data-ready',
  'map-created',
  'style-loaded',
  'current-state-rendered',
  'interactive',
];

function strictCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseInteger(value, label, minimum, maximum) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${label} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function readOption(argv, name, fallback) {
  const prefix = `${name}=`;
  const inline = argv.filter((arg) => arg.startsWith(prefix));
  const separated = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name) separated.push(argv[index + 1]);
  }
  const values = [...inline.map((arg) => arg.slice(prefix.length)), ...separated];
  if (values.length > 1) throw new Error(`${name} may be supplied only once`);
  if (values.length === 0) return fallback;
  if (!values[0] || String(values[0]).startsWith('--')) throw new Error(`${name} requires a value`);
  return String(values[0]);
}

function parseOptions(argv) {
  const label = readOption(argv, '--label', 'baseline');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(label)) {
    throw new Error('--label must use 1-64 lowercase ASCII letters, digits, underscores, or hyphens');
  }
  return {
    label,
    cycles: parseInteger(readOption(argv, '--cycles', '20'), '--cycles', 1, 100),
    warmups: parseInteger(readOption(argv, '--warmups', '3'), '--warmups', 0, 20),
  };
}

function writeJsonExclusive(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function snapshotRepositorySaves() {
  const savesRoot = path.join(repo, 'saves');
  if (!fs.existsSync(savesRoot)) return [];
  const pending = [savesRoot];
  const files = [];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => strictCompare(a.name, b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      if (entry.isFile()) {
        files.push({
          name: path.relative(savesRoot, absolute).replaceAll('\\', '/'),
          bytes: fs.statSync(absolute).size,
          sha256: fileSha256(absolute),
        });
      }
    }
  }
  return files.sort((a, b) => strictCompare(a.name, b.name));
}

function assertRepositorySavesUnchanged(before) {
  const after = snapshotRepositorySaves();
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    throw new Error('Repository saves changed during map-transition profiling');
  }
  return { unchanged: true, file_count: after.length };
}

function percentile(values, requestedPercentile) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (requestedPercentile / 100) * (sorted.length - 1);
  const lowIndex = Math.floor(rank);
  const highIndex = Math.ceil(rank);
  const low = sorted[lowIndex];
  const high = sorted[highIndex];
  return Math.round((low + (high - low) * (rank - lowIndex)) * 1000) / 1000;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntil(label, predicate, timeoutMs = 90000, intervalMs = 100) {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const result = await predicate();
    if (result) return result;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function sanitizeDiagnosticLine(value, outputDirectory) {
  let line = String(value ?? '').trim();
  for (const [needle, replacement] of [
    [repo, '<repo>'],
    [outputDirectory, '<evidence>'],
    [process.env.USERPROFILE, '<user>'],
  ]) {
    if (needle) line = line.split(String(needle)).join(replacement);
  }
  return line.slice(0, 1600);
}

function attachPageDiagnostics(page, diagnostics) {
  if (diagnostics.attached.has(page)) return;
  diagnostics.attached.add(page);
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    diagnostics.console.push({
      type: message.type(),
      message: sanitizeDiagnosticLine(message.text(), diagnostics.outputDirectory),
    });
  });
  page.on('pageerror', (error) => {
    diagnostics.page_errors.push({
      kind: 'pageerror',
      message: sanitizeDiagnosticLine(error?.message ?? error, diagnostics.outputDirectory),
    });
  });
  page.on('requestfailed', (request) => {
    let resourceKey = 'unparseable-resource';
    try {
      const url = new URL(request.url());
      resourceKey = `${url.protocol}//${url.host}${url.pathname}`;
    } catch (_error) { /* retain stable fallback */ }
    diagnostics.request_failures.push({
      kind: 'requestfailed',
      method: request.method(),
      resource_type: request.resourceType(),
      resource_key: resourceKey,
      error: request.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    let resourceKey = 'unparseable-resource';
    try {
      const url = new URL(response.url());
      resourceKey = `${url.protocol}//${url.host}${url.pathname}`;
    } catch (_error) { /* retain stable fallback */ }
    diagnostics.http_errors.push({
      method: response.request().method(),
      status: response.status(),
      resource_type: response.request().resourceType(),
      resource_key: resourceKey,
    });
  });
}

async function waitForGamePage(application) {
  return waitUntil('Electron game page', async () => {
    for (const page of application.windows()) {
      const url = page.url();
      if (!url.startsWith('devtools://') && url.startsWith('awwv://warroom')) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        return page;
      }
    }
    return null;
  });
}

async function waitForEmbeddedFrame(page, profilingRequired) {
  return waitUntil('embedded tactical frame', async () => {
    const frame = page.frames().find((candidate) => {
      const url = candidate.url();
      return url.includes('/index.html')
        && url.includes('embedded=1')
        && (!profilingRequired || url.includes('profile_map_transition=1'));
    });
    if (!frame) return null;
    await frame.waitForLoadState('domcontentloaded').catch(() => {});
    return frame;
  });
}

async function clickVisible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  await locator.click({ timeout: 30000 });
  await sleep(100);
}

async function startCleanCampaign(page) {
  await clickVisible(page.locator('#mm-new-campaign'));
  await clickVisible(page.locator('#sp-faction-RBiH'));
  let frame = await waitForEmbeddedFrame(page, false);
  await frame.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const acknowledge = frame.getByRole('button', { name: /Acknowledge/i }).first();
    if (await acknowledge.isVisible().catch(() => false)) {
      await acknowledge.click();
      await sleep(250);
      continue;
    }
    const begin = frame.getByRole('button', { name: /^Begin$/i }).first();
    if (await begin.isVisible().catch(() => false)) {
      await begin.click();
      await sleep(250);
      continue;
    }
    break;
  }

  await page.evaluate(() => {
    const iframe = document.querySelector('#tactical-map-iframe');
    if (!(iframe instanceof HTMLIFrameElement)) throw new Error('tactical-map-iframe unavailable');
    const next = new URL(iframe.src);
    next.searchParams.set('embedded', '1');
    next.searchParams.set('view', 'warroom');
    next.searchParams.set('profile_map_transition', '1');
    next.searchParams.delete('intro');
    iframe.src = next.toString();
  });
  frame = await waitForEmbeddedFrame(page, true);
  await frame.locator('[data-testid="warroom-toolbar"]').waitFor({ state: 'visible', timeout: 90000 });
  return frame;
}

async function readCurrentTurn(frame) {
  return frame.evaluate(async () => {
    if (!window.awwv?.getCurrentGameState) throw new Error('desktop game-state bridge unavailable');
    const serialized = await window.awwv.getCurrentGameState();
    const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    const turn = parsed?.meta?.turn;
    if (!Number.isInteger(turn) || turn < 0) throw new Error('current turn unavailable');
    return turn;
  });
}

async function profileSnapshot(frame) {
  return frame.evaluate(() => {
    const profile = window.__AWWV_MAP_TRANSITION_PROFILE__;
    if (!profile) throw new Error('map transition profile bridge unavailable');
    return profile.snapshot();
  });
}

async function waitForProfileSample(frame, priorSampleCount) {
  return waitUntil('complete map transition sample', async () => {
    const snapshot = await profileSnapshot(frame);
    return snapshot.samples.length > priorSampleCount ? snapshot : null;
  }, 120000);
}

function subtractResourceCounts(after, before) {
  const result = {};
  const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])].sort(strictCompare);
  for (const key of keys) {
    const delta = Number(after?.[key] ?? 0) - Number(before?.[key] ?? 0);
    if (delta !== 0) result[key] = delta;
  }
  return result;
}

function counterDelta(after, before) {
  return {
    map_constructions: after.map_constructions - before.map_constructions,
    webgl_releases: after.webgl_releases - before.webgl_releases,
    static_resource_requests: subtractResourceCounts(
      after.static_resource_requests,
      before.static_resource_requests,
    ),
  };
}

async function profileOneCycle(frame, kind, expectedTurn) {
  const before = await profileSnapshot(frame);
  await frame.evaluate((selectedKind) => {
    window.__AWWV_MAP_TRANSITION_PROFILE__?.setKind(selectedKind);
  }, kind);
  await clickVisible(frame.locator('[data-testid="warroom-toolbar-war-map"]'));
  await frame.waitForFunction((turn) => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    return map?.getAttribute('data-map-ready') === 'true'
      && map?.getAttribute('data-map-state-turn') === String(turn);
  }, expectedTurn, { timeout: 120000 });
  const mapReady = await frame.locator('[data-testid="tactical-map"]')
    .getAttribute('data-map-ready');
  const mapTurn = await frame.locator('[data-testid="tactical-map"]')
    .getAttribute('data-map-state-turn');
  await waitForProfileSample(frame, before.samples.length);
  await clickVisible(frame.locator('[data-testid="toolbar-route-desk"]'));
  await frame.locator('[data-testid="warroom-toolbar"]').waitFor({ state: 'visible', timeout: 30000 });
  await sleep(100);
  const after = await profileSnapshot(frame);
  const sample = after.samples.at(-1);
  if (!sample || sample.kind !== kind) throw new Error(`Missing ${kind} timing sample`);
  const missingMarks = requiredTransitionMarks.filter(
    (mark) => !Number.isFinite(sample.durations_ms?.[mark]),
  );
  if (missingMarks.length > 0) {
    throw new Error(`Incomplete map transition sample; missing: ${missingMarks.join(', ')}`);
  }
  if (sample.loaded_turn !== expectedTurn || mapTurn !== String(expectedTurn)) {
    throw new Error(`Exact-turn readiness failed: expected ${expectedTurn}, sample ${sample.loaded_turn}, map ${mapTurn}`);
  }
  if (mapReady !== 'true' || sample.current_state_ready !== true || sample.fingerprint_matches !== true) {
    throw new Error(`Current-state readiness failed for ${kind} cycle`);
  }
  return {
    kind,
    cycle_index: sample.cycle_index,
    loaded_turn: sample.loaded_turn,
    fingerprint_matches: sample.fingerprint_matches,
    current_state_ready: sample.current_state_ready,
    durations_ms: sample.durations_ms,
    counters: counterDelta(after.lifetime_counters, before.lifetime_counters),
    lifetime_counters: after.lifetime_counters,
  };
}

function expectedInspectorLine(line) {
  return /^Debugger ending on ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f-]+$/i.test(line)
    || line === 'For help, see: https://nodejs.org/en/docs/inspector';
}

async function runLaunch(launchIndex, options, outputDirectory) {
  const launchRoot = path.join(outputDirectory, 'runtime', `launch-${launchIndex}`);
  const userDataDirectory = path.join(launchRoot, 'user-data');
  const isolatedSaveRoot = path.join(launchRoot, 'saves');
  fs.mkdirSync(userDataDirectory, { recursive: true });
  fs.mkdirSync(isolatedSaveRoot, { recursive: true });
  const diagnostics = {
    outputDirectory,
    attached: new WeakSet(),
    console: [],
    page_errors: [],
    request_failures: [],
    http_errors: [],
    main_process_stdout: [],
    main_process_stderr: [],
  };
  const application = await electron.launch({
    cwd: repo,
    args: ['.', `--user-data-dir=${userDataDirectory}`],
    env: {
      ...process.env,
      AWWV_MAP_TRANSITION_PROFILE: '1',
      AWWV_MAP_TRANSITION_SAVE_ROOT: isolatedSaveRoot,
      AWWV_MAP_TRANSITION_COLD_CACHE: '1',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
    timeout: 90000,
  });
  const runtime = await application.evaluate(({ app }) => ({
    application: app.getVersion(),
    electron: process.versions.electron ?? null,
    chromium: process.versions.chrome ?? null,
  }));
  const collectProcessOutput = (target) => (chunk) => {
    for (const line of String(chunk ?? '').split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
      target.push(sanitizeDiagnosticLine(line, outputDirectory));
    }
  };
  const processHandle = application.process();
  processHandle.stdout?.on('data', collectProcessOutput(diagnostics.main_process_stdout));
  processHandle.stderr?.on('data', collectProcessOutput(diagnostics.main_process_stderr));
  const attach = (page) => attachPageDiagnostics(page, diagnostics);
  application.on('window', attach);
  for (const page of application.windows()) attach(page);

  let lifetimeCounters = null;
  let cold = null;
  const warmups = [];
  const measured = [];
  try {
    const page = await waitForGamePage(application);
    attach(page);
    const frame = await startCleanCampaign(page);
    const expectedTurn = await readCurrentTurn(frame);
    cold = await profileOneCycle(frame, 'cold', expectedTurn);
    await page.screenshot({ path: path.join(outputDirectory, `launch-${launchIndex}-cold.png`) });
    for (let index = 0; index < options.warmups; index += 1) {
      warmups.push(await profileOneCycle(frame, 'warm', expectedTurn));
    }
    for (let index = 0; index < options.cycles; index += 1) {
      measured.push(await profileOneCycle(frame, 'warm', expectedTurn));
    }
    lifetimeCounters = (await profileSnapshot(frame)).lifetime_counters;
    await page.screenshot({ path: path.join(outputDirectory, `launch-${launchIndex}-warm.png`) });
  } finally {
    await application.close().catch(() => {});
  }

  const expectedMainProcessStderr = diagnostics.main_process_stderr.filter(expectedInspectorLine);
  const unexpectedMainProcessStderr = diagnostics.main_process_stderr.filter((line) => !expectedInspectorLine(line));
  return {
    launch_index: launchIndex,
    runtime,
    cold,
    warmups,
    measured,
    lifetime_counters: lifetimeCounters,
    diagnostics: {
      console_errors_and_warnings: diagnostics.console,
      page_errors: diagnostics.page_errors,
      request_failures: diagnostics.request_failures,
      http_errors: diagnostics.http_errors,
      expected_main_process_stderr: expectedMainProcessStderr,
      main_process_stderr: unexpectedMainProcessStderr,
      main_process_stdout: diagnostics.main_process_stdout,
    },
  };
}

function buildSummary(launches) {
  const cold = launches.map((launch) => launch.cold?.durations_ms?.interactive).filter(Number.isFinite);
  const warm = launches.flatMap((launch) => launch.measured)
    .map((sample) => sample.durations_ms?.interactive)
    .filter(Number.isFinite);
  const allDiagnostics = launches.map((launch) => launch.diagnostics);
  return {
    cold_current_state_ms: {
      samples: cold.length,
      p50: percentile(cold, 50),
      p95: percentile(cold, 95),
    },
    warm_switch_ms: {
      samples: warm.length,
      p50: percentile(warm, 50),
      p95: percentile(warm, 95),
    },
    runtime_diagnostics: {
      console_errors_and_warnings: allDiagnostics.reduce((sum, row) => sum + row.console_errors_and_warnings.length, 0),
      page_errors: allDiagnostics.reduce((sum, row) => sum + row.page_errors.length, 0),
      request_failures: allDiagnostics.reduce((sum, row) => sum + row.request_failures.length, 0),
      http_errors: allDiagnostics.reduce((sum, row) => sum + row.http_errors.length, 0),
      main_process_stderr: allDiagnostics.reduce((sum, row) => sum + row.main_process_stderr.length, 0),
    },
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const outputDirectory = path.join(evidenceRoot, options.label);
  fs.mkdirSync(outputDirectory, { recursive: false });
  const repositorySavesBefore = snapshotRepositorySaves();
  const launches = [];
  let failure = null;
  try {
    for (let launchIndex = 1; launchIndex <= 3; launchIndex += 1) {
      launches.push(await runLaunch(launchIndex, options, outputDirectory));
    }
  } catch (error) {
    failure = error;
  }
  const repository_saves = assertRepositorySavesUnchanged(repositorySavesBefore);
  const evidence = {
    schema_version: 1,
    label: options.label,
    options: { cycles: options.cycles, warmups: options.warmups, cold_launches: 3 },
    runtime: {
      platform: process.platform,
      architecture: process.arch,
      node: process.versions.node,
      application: launches[0]?.runtime?.application ?? null,
      electron: launches[0]?.runtime?.electron ?? null,
      chromium: launches[0]?.runtime?.chromium ?? null,
    },
    repository_saves,
    launches,
    summary: buildSummary(launches),
    ok: failure == null,
    error: failure == null ? null : sanitizeDiagnosticLine(failure?.stack ?? failure, outputDirectory),
  };
  const evidencePath = path.join(outputDirectory, failure == null ? 'baseline.json' : 'baseline-failed.json');
  writeJsonExclusive(evidencePath, evidence);
  process.stdout.write(`${JSON.stringify({ ok: evidence.ok, evidence: `tmp-map-transition-perf/${options.label}/${path.basename(evidencePath)}`, summary: evidence.summary })}\n`);
  if (failure) throw failure;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${String(error?.stack ?? error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertRepositorySavesUnchanged,
  buildSummary,
  parseOptions,
  percentile,
  snapshotRepositorySaves,
};
