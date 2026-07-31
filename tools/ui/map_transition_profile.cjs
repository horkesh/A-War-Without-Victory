'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
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

function classifyProcessorCount(value) {
  if (!Number.isInteger(value) || value < 1) throw new Error('Logical processor count must be positive');
  if (value <= 4) return '1-4';
  if (value <= 8) return '5-8';
  if (value <= 16) return '9-16';
  if (value <= 32) return '17-32';
  return '33-plus';
}

function classifyMemoryBytes(value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Total memory must be positive');
  const gibibytes = Math.ceil(value / (1024 ** 3));
  if (gibibytes <= 8) return '1-8';
  if (gibibytes <= 16) return '9-16';
  if (gibibytes <= 32) return '17-32';
  if (gibibytes <= 64) return '33-64';
  return '65-plus';
}

function classifyCpu(cpuModel, architecture) {
  const normalized = String(cpuModel ?? '').toLowerCase();
  if (normalized.includes('apple')) return 'apple-silicon';
  if (normalized.includes('intel')) return `intel-${architecture}`;
  if (normalized.includes('amd')) return `amd-${architecture}`;
  if (String(architecture).includes('arm')) return 'other-arm';
  return `other-${architecture}`;
}

function buildMachineManifest(input) {
  if (!input.viewport) return null;
  const width = Number(input.viewport.width);
  const height = Number(input.viewport.height);
  const deviceScaleFactor = Number(input.viewport.deviceScaleFactor);
  if (!Number.isInteger(width) || width < 320 || width > 16384) {
    throw new Error('Viewport width must be an integer from 320 through 16384');
  }
  if (!Number.isInteger(height) || height < 240 || height > 16384) {
    throw new Error('Viewport height must be an integer from 240 through 16384');
  }
  if (!Number.isFinite(deviceScaleFactor) || deviceScaleFactor < 0.5 || deviceScaleFactor > 8) {
    throw new Error('Viewport device scale factor must be from 0.5 through 8');
  }
  return {
    platform: String(input.platform),
    architecture: String(input.architecture),
    cpu_class: classifyCpu(input.cpuModel, input.architecture),
    logical_processor_class: classifyProcessorCount(input.logicalProcessors),
    memory_gib_class: classifyMemoryBytes(input.totalMemoryBytes),
    viewport: {
      width,
      height,
      device_scale_factor: Math.round(deviceScaleFactor * 1000) / 1000,
    },
  };
}

function redactInspectorEndpoints(value) {
  return String(value ?? '').replace(
    /\bws:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+\/[0-9a-z-]+\b/gi,
    '<inspector-endpoint>',
  );
}

function redactEphemeralDiagnostics(value) {
  return String(value ?? '')
    .replace(
      /\bhttps?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+(?:\/[^\s]*)?/gi,
      '<loopback-http-endpoint>',
    )
    .replace(
      /\b(?:127\.0\.0\.1|localhost):\d+(?:\/[^\s]*)?/gi,
      '<loopback-endpoint>',
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '<uuid>',
    )
    .replace(/\bport\s*(?::|=)?\s*\d{2,5}\b/gi, 'port <ephemeral-port>');
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
    [outputDirectory, '<evidence>'],
    [repo, '<repo>'],
    [process.env.USERPROFILE, '<user>'],
  ]) {
    if (needle) line = line.split(String(needle)).join(replacement);
  }
  line = redactEphemeralDiagnostics(redactInspectorEndpoints(line));
  return line.slice(0, 1600);
}

function sanitizeUnexpectedProcessLine(value) {
  return String(value ?? '')
    .replace(/\b(?:https?|wss?|file):\/\/[^\s]+/gi, '<url>')
    .replace(
      /\b[A-Za-z]:[\\/](?:[^\\/\s:*?"<>|]+[\\/])*[^\\/\s:*?"<>|]+/g,
      '<absolute-path>',
    )
    .replace(
      /(^|[\s(\[{"'=,:;])\/(?:[^/\s)\]}"'>,;]+\/)*[^/\s)\]}"'>,;]+/g,
      '$1<absolute-path>',
    )
    .replace(/\b\d{5}\b/g, (digits) => {
      const numeric = Number(digits);
      return numeric >= 49152 && numeric <= 65535 ? '<ephemeral-port>' : digits;
    });
}

function sanitizeDiagnosticPayload(value, outputDirectory) {
  if (typeof value === 'string') {
    return sanitizeUnexpectedProcessLine(sanitizeDiagnosticLine(value, outputDirectory));
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDiagnosticPayload(entry, outputDirectory));
  }
  if (value != null && typeof value === 'object') {
    const sanitized = {};
    for (const [key, entry] of Object.entries(value)) {
      sanitized[key] = sanitizeDiagnosticPayload(entry, outputDirectory);
    }
    return sanitized;
  }
  return value;
}

function sanitizeFailure(failure, outputDirectory) {
  return sanitizeDiagnosticPayload(String(failure?.stack ?? failure), outputDirectory);
}

function buildEvidenceOutcome(failure, outputDirectory) {
  return {
    ok: failure == null,
    error: failure == null ? null : sanitizeFailure(failure, outputDirectory),
  };
}

function formatFatalError(failure) {
  return `${sanitizeFailure(failure)}\n`;
}

function classifyMainProcessStdout(lines) {
  const counts = {
    built_map_server_selected: 0,
    tactical_map_server_started: 0,
  };
  const unexpectedLines = [];
  for (const rawLine of lines) {
    const line = String(rawLine ?? '').trim();
    if (line === '[AWWV] Map: using built server at <loopback-http-endpoint>') {
      counts.built_map_server_selected += 1;
    } else if (line === 'Tactical map server: <loopback-http-endpoint>') {
      counts.tactical_map_server_started += 1;
    } else {
      unexpectedLines.push(sanitizeUnexpectedProcessLine(line));
    }
  }
  const expectedCategories = {};
  for (const key of ['built_map_server_selected', 'tactical_map_server_started']) {
    if (counts[key] > 0) expectedCategories[key] = counts[key];
  }
  return {
    expected_categories: expectedCategories,
    unexpected_lines: unexpectedLines,
  };
}

function classifyMainProcessStderr(lines) {
  const counts = {
    inspector_help: 0,
    inspector_shutdown: 0,
    inspector_startup: 0,
  };
  const unexpectedLines = [];
  for (const rawLine of lines) {
    const line = String(rawLine ?? '').trim();
    if (/^Debugger ending on (?:ws:\/\/|<inspector-endpoint>)/i.test(line)) {
      counts.inspector_shutdown += 1;
    } else if (/^Debugger listening on (?:ws:\/\/|<inspector-endpoint>)/i.test(line)) {
      counts.inspector_startup += 1;
    } else if (line === 'For help, see: https://nodejs.org/en/docs/inspector') {
      counts.inspector_help += 1;
    } else {
      unexpectedLines.push(sanitizeUnexpectedProcessLine(redactInspectorEndpoints(line)));
    }
  }
  const expectedCategories = {};
  for (const key of ['inspector_help', 'inspector_shutdown', 'inspector_startup']) {
    if (counts[key] > 0) expectedCategories[key] = counts[key];
  }
  return {
    expected_categories: expectedCategories,
    unexpected_lines: unexpectedLines,
  };
}

function buildPersistedProcessDiagnostics({ stdout = [], stderr = [], outputDirectory } = {}) {
  const sanitizedStdout = stdout.map((line) => sanitizeDiagnosticLine(line, outputDirectory));
  const sanitizedStderr = stderr.map((line) => sanitizeDiagnosticLine(line, outputDirectory));
  const stdoutClassification = classifyMainProcessStdout(sanitizedStdout);
  const stderrClassification = classifyMainProcessStderr(sanitizedStderr);
  return {
    expected_main_process_stdout: stdoutClassification.expected_categories,
    main_process_stdout: stdoutClassification.unexpected_lines,
    expected_main_process_stderr: stderrClassification.expected_categories,
    main_process_stderr: stderrClassification.unexpected_lines,
  };
}

function attachPageDiagnostics(page, diagnostics) {
  if (diagnostics.attached.has(page)) return;
  diagnostics.attached.add(page);
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    diagnostics.console.push(sanitizeDiagnosticPayload({
      type: message.type(),
      message: message.text(),
    }, diagnostics.outputDirectory));
  });
  page.on('pageerror', (error) => {
    diagnostics.page_errors.push(sanitizeDiagnosticPayload({
      kind: 'pageerror',
      message: error?.message ?? error,
    }, diagnostics.outputDirectory));
  });
  page.on('requestfailed', (request) => {
    let resourceKey = 'unparseable-resource';
    try {
      const url = new URL(request.url());
      resourceKey = `${url.protocol}//${url.host}${url.pathname}`;
    } catch (_error) { /* retain stable fallback */ }
    diagnostics.request_failures.push(sanitizeDiagnosticPayload({
      kind: 'requestfailed',
      method: request.method(),
      resource_type: request.resourceType(),
      resource_key: resourceKey,
      error: request.failure()?.errorText ?? 'unknown',
    }, diagnostics.outputDirectory));
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    let resourceKey = 'unparseable-resource';
    try {
      const url = new URL(response.url());
      resourceKey = `${url.protocol}//${url.host}${url.pathname}`;
    } catch (_error) { /* retain stable fallback */ }
    diagnostics.http_errors.push(sanitizeDiagnosticPayload({
      method: response.request().method(),
      status: response.status(),
      resource_type: response.request().resourceType(),
      resource_key: resourceKey,
    }, diagnostics.outputDirectory));
  });
}

function processHasExited(processHandle) {
  return processHandle.exitCode != null || processHandle.signalCode != null;
}

function waitForProcessExit(processHandle, timeoutMs) {
  if (processHasExited(processHandle)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      processHandle.off?.('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timeout = setTimeout(() => finish(processHasExited(processHandle)), timeoutMs);
    processHandle.once('exit', onExit);
    if (processHasExited(processHandle)) finish(true);
  });
}

function settleWithin(operation, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(() => finish({ completed: false, error: null }), timeoutMs);
    Promise.resolve()
      .then(operation)
      .then(
        () => finish({ completed: true, error: null }),
        (error) => finish({ completed: true, error }),
      );
  });
}

async function closeElectronApplication(application, { timeoutMs = 5000 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new Error('Electron cleanup timeout must be between 1 and 30000 milliseconds');
  }
  const processHandle = application.process();
  const closeResult = await settleWithin(() => application.close(), timeoutMs);
  if (closeResult.completed && closeResult.error == null && await waitForProcessExit(processHandle, timeoutMs)) {
    return {
      graceful_close: true,
      forced_kill: false,
      process_exit_verified: true,
    };
  }

  let forcedKill = false;
  if (!processHasExited(processHandle)) {
    let signalSent = false;
    try {
      signalSent = processHandle.kill();
      forcedKill = signalSent;
    } catch (error) {
      throw new Error(`Electron forced kill failed: ${String(error?.message ?? error)}`);
    }
    if (!signalSent && !processHasExited(processHandle)) {
      throw new Error('Electron forced kill did not send a signal');
    }
  }
  if (!await waitForProcessExit(processHandle, timeoutMs)) {
    throw new Error('Electron process did not exit after forced kill within cleanup timeout');
  }
  return {
    graceful_close: false,
    forced_kill: forcedKill,
    process_exit_verified: true,
  };
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

function pickTopmostStartupControlIndex(candidates) {
  return candidates.findIndex((candidate) => (
    candidate.visible === true
    && candidate.enabled === true
    && candidate.hitTestable === true
  ));
}

async function inspectStartupButtons(locator) {
  return locator.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    const style = window.getComputedStyle(button);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topmost = document.elementFromPoint(centerX, centerY);
    return {
      visible: rect.width > 0
        && rect.height > 0
        && style.visibility !== 'hidden'
        && style.display !== 'none',
        enabled:
          button.getAttribute('aria-disabled') !== 'true' &&
          (!(button instanceof HTMLButtonElement) || !button.disabled),
      hitTestable: topmost != null && (button === topmost || button.contains(topmost)),
    };
  }));
}

const STARTUP_DIAGNOSTIC_ROLES = ['alert', 'dialog', 'status'];
const STARTUP_DIAGNOSTIC_TEST_IDS = new Set([
  'root-error-boundary-map',
  'tactical-map',
  'tactical-map-load-error',
  'tactical-map-loading',
  'tactical-map-viewport',
  'warroom-shell',
]);

function boundedDiagnosticCount(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) return 0;
  return Math.min(numeric, 999);
}

function buildStartupSurfaceDiagnostic(snapshot = {}) {
  const roleCounts = {};
  for (const role of STARTUP_DIAGNOSTIC_ROLES) {
    const count = boundedDiagnosticCount(snapshot.role_counts?.[role]);
    if (count > 0) roleCounts[role] = count;
  }
  const knownTestIds = [...new Set(
    (Array.isArray(snapshot.test_ids) ? snapshot.test_ids : [])
      .filter((testId) => STARTUP_DIAGNOSTIC_TEST_IDS.has(testId)),
  )].sort(strictCompare);
  return {
    dialog_count: boundedDiagnosticCount(snapshot.dialog_count),
    button_count: boundedDiagnosticCount(snapshot.button_count),
    visible_button_count: boundedDiagnosticCount(snapshot.visible_button_count),
    role_counts: roleCounts,
    known_test_ids: knownTestIds,
  };
}

async function describeStartupSurface(frame) {
  const snapshot = await frame.evaluate((roles) => {
    const buttons = [...document.querySelectorAll('button')];
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    return {
      dialog_count: document.querySelectorAll('[role="dialog"]').length,
      button_count: buttons.length,
      visible_button_count: buttons.filter(isVisible).length,
      role_counts: Object.fromEntries(roles.map((role) => [
        role,
        document.querySelectorAll(`[role="${role}"]`).length,
      ])),
      test_ids: [...document.querySelectorAll('[data-testid]')]
        .map((element) => element.getAttribute('data-testid'))
        .filter(Boolean),
    };
  }, STARTUP_DIAGNOSTIC_ROLES);
  return buildStartupSurfaceDiagnostic(snapshot);
}

async function clickTopmostVisibleButton(frame, name) {
  const locator = frame.getByRole('button', { name });
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const states = await inspectStartupButtons(locator);
    const index = pickTopmostStartupControlIndex(states);
    if (index < 0) return false;
    try {
      await locator.nth(index).click({ timeout: 5000 });
      return true;
    } catch (error) {
      lastError = error;
    }
  }
  const diagnostic = await describeStartupSurface(frame);
  throw new Error(`Topmost startup control remained unclickable; startup=${JSON.stringify(diagnostic)}`, {
    cause: lastError,
  });
}

async function startCleanCampaign(page) {
  await clickVisible(page.locator('#mm-new-campaign'));
  await clickVisible(page.locator('#sp-faction-RBiH'));
  let frame = await waitForEmbeddedFrame(page, false);
  await frame.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
  let startupControlsExhausted = true;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await clickTopmostVisibleButton(frame, /Acknowledge/i)) {
      await sleep(250);
      continue;
    }
    if (await clickTopmostVisibleButton(frame, /^Begin$/i)) {
      await sleep(250);
      continue;
    }
    startupControlsExhausted = false;
    break;
  }
  if (startupControlsExhausted) {
    const diagnostic = await describeStartupSurface(frame);
    throw new Error(`Startup control loop exhausted; startup=${JSON.stringify(diagnostic)}`);
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

async function readMapReadinessDiagnostic(frame) {
  return frame.evaluate(() => {
    const profile = window.__AWWV_MAP_TRANSITION_PROFILE__;
    if (!profile) throw new Error('map transition profile bridge unavailable');
    const map = document.querySelector('[data-testid="tactical-map"]');
    const viewport = document.querySelector('[data-testid="tactical-map-viewport"]');
    return {
      debug: profile.debugState(),
      dom: {
        map_ready: map?.getAttribute('data-map-ready') ?? 'missing',
        map_turn: map?.getAttribute('data-map-state-turn') ?? 'missing',
        map_render_ready: map?.getAttribute('data-map-render-ready') ?? 'missing',
        map_revision_ready: map?.getAttribute('data-map-revision-ready') ?? 'missing',
        map_style_ready: map?.getAttribute('data-map-style-ready') ?? 'missing',
        map_reveal_painted: map?.getAttribute('data-map-reveal-painted') ?? 'missing',
        viewport_aria_hidden: viewport?.getAttribute('aria-hidden') ?? 'missing',
        viewport_inert: viewport instanceof HTMLElement ? viewport.inert : null,
        viewport_visibility: viewport instanceof HTMLElement ? viewport.style.visibility : 'missing',
      },
    };
  });
}

function formatMapReadinessDiagnostic(prefix, debug, dom) {
  return `${prefix}; active=${debug.active}; pending_metadata=${debug.pending_metadata}; marks=${debug.marks.join(',')}; map_ready=${dom.map_ready}; map_turn=${dom.map_turn}; map_render_ready=${dom.map_render_ready}; map_revision_ready=${dom.map_revision_ready}; map_style_ready=${dom.map_style_ready}; map_reveal_painted=${dom.map_reveal_painted}; viewport_aria_hidden=${dom.viewport_aria_hidden}; viewport_inert=${dom.viewport_inert}; viewport_visibility=${dom.viewport_visibility}`;
}

async function waitForProfileSample(frame, priorSampleCount) {
  try {
    return await waitUntil('complete map transition sample', async () => {
      const snapshot = await profileSnapshot(frame);
      return snapshot.samples.length > priorSampleCount ? snapshot : null;
    }, 120000);
  } catch (error) {
    const { debug, dom } = await readMapReadinessDiagnostic(frame);
    throw new Error(
      formatMapReadinessDiagnostic('Timed out waiting for complete map transition sample', debug, dom),
      { cause: error },
    );
  }
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
    deck_constructions: Number(after.deck_constructions ?? 0) - Number(before.deck_constructions ?? 0),
    deck_releases: Number(after.deck_releases ?? 0) - Number(before.deck_releases ?? 0),
    static_resource_requests: subtractResourceCounts(
      after.static_resource_requests,
      before.static_resource_requests,
    ),
  };
}

function hasOrderedTransitionDurations(durations) {
  let previous = Number.NEGATIVE_INFINITY;
  for (const mark of requiredTransitionMarks) {
    const value = Number(durations?.[mark]);
    if (!Number.isFinite(value) || value < previous) return false;
    previous = value;
  }
  return true;
}

async function profileOneCycle(frame, kind, expectedTurn) {
  const before = await profileSnapshot(frame);
  await frame.evaluate((selectedKind) => {
    window.__AWWV_MAP_TRANSITION_PROFILE__?.setKind(selectedKind);
  }, kind);
  await clickVisible(frame.locator('[data-testid="warroom-toolbar-war-map"]'));
  try {
    await frame.waitForFunction((turn) => {
      const map = document.querySelector('[data-testid="tactical-map"]');
      return map?.getAttribute('data-map-ready') === 'true'
        && map?.getAttribute('data-map-state-turn') === String(turn);
    }, expectedTurn, { timeout: 120000 });
  } catch (error) {
    const { debug, dom } = await readMapReadinessDiagnostic(frame);
    throw new Error(
      formatMapReadinessDiagnostic('Timed out waiting for current tactical map', debug, dom),
      { cause: error },
    );
  }
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
  if (!hasOrderedTransitionDurations(sample.durations_ms)) {
    throw new Error('Out-of-order map transition sample');
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

async function settlePostLaunchEvidence(run, captureFailure, cleanupApplication) {
  let failure = null;
  let failedEvidence = null;
  let cleanup = null;
  try {
    await run();
  } catch (error) {
    failure = error;
    try {
      failedEvidence = await captureFailure();
    } catch (captureError) {
      const isTimeout = captureError instanceof Error
        && (captureError.name === 'TimeoutError' || /timed?\s*out/i.test(captureError.message));
      failedEvidence = {
        capture_status: 'unavailable',
        screenshot: { attempted: true, captured: false, file: null },
        capture_error_category: isTimeout ? 'capture_timeout' : 'capture_error',
      };
    }
  }
  try {
    cleanup = await cleanupApplication();
  } catch (cleanupError) {
    failure = failure
      ? new AggregateError([failure, cleanupError], 'Electron launch failed and cleanup could not verify process exit')
      : cleanupError;
  }
  return { failure, failedEvidence, cleanup };
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
  let runtime = null;
  let lifetimeCounters = null;
  let cold = null;
  let viewport = null;
  let cleanup = null;
  let page = null;
  let frame = null;
  let stage = 'application-launched';
  const warmups = [];
  const measured = [];
  const settled = await settlePostLaunchEvidence(async () => {
    runtime = await application.evaluate(({ app }) => ({
      application: app.getVersion(),
      electron: process.versions.electron ?? null,
      chromium: process.versions.chrome ?? null,
    }));
    stage = 'runtime-read';
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

    page = await waitForGamePage(application);
    attach(page);
    stage = 'game-page-ready';
    viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      deviceScaleFactor: window.devicePixelRatio,
    }));
    frame = await startCleanCampaign(page);
    stage = 'campaign-ready';
    const expectedTurn = await readCurrentTurn(frame);
    stage = 'cold-transition';
    cold = await profileOneCycle(frame, 'cold', expectedTurn);
    await page.screenshot({ path: path.join(outputDirectory, `launch-${launchIndex}-cold.png`) });
    for (let index = 0; index < options.warmups; index += 1) {
      stage = `warmup-${index + 1}`;
      warmups.push(await profileOneCycle(frame, 'warm', expectedTurn));
    }
    for (let index = 0; index < options.cycles; index += 1) {
      stage = `measured-${index + 1}`;
      measured.push(await profileOneCycle(frame, 'warm', expectedTurn));
    }
    stage = 'final-snapshot';
    lifetimeCounters = (await profileSnapshot(frame)).lifetime_counters;
    await page.screenshot({ path: path.join(outputDirectory, `launch-${launchIndex}-warm.png`) });
    stage = 'complete';
  }, async () => {
    const screenshotFile = `launch-${launchIndex}-failed.png`;
    let screenshotCaptured = false;
    if (page) {
      screenshotCaptured = await page.screenshot({ path: path.join(outputDirectory, screenshotFile) })
        .then(() => true, () => false);
    }
    let readiness = null;
    let startupSurface = null;
    if (frame) {
      readiness = await readMapReadinessDiagnostic(frame).catch(() => null);
      startupSurface = await describeStartupSurface(frame).catch(() => null);
      lifetimeCounters = await profileSnapshot(frame)
        .then((snapshot) => snapshot.lifetime_counters, () => lifetimeCounters);
    }
    return {
      capture_status: 'captured',
      stage,
      screenshot: {
        attempted: page != null,
        captured: screenshotCaptured,
        file: screenshotCaptured ? screenshotFile : null,
      },
      readiness,
      startup_surface: startupSurface,
    };
  }, () => closeElectronApplication(application));
  cleanup = settled.cleanup;

  if (settled.failure && settled.failedEvidence == null) {
    settled.failedEvidence = {
      capture_status: 'unavailable',
      stage,
      screenshot: {
        attempted: false,
        captured: false,
        file: null,
      }
    };
  }

  const processDiagnostics = buildPersistedProcessDiagnostics({
    stdout: diagnostics.main_process_stdout,
    stderr: diagnostics.main_process_stderr,
    outputDirectory,
  });
  return {
    failure: settled.failure,
    launch: {
    launch_index: launchIndex,
    status: settled.failure == null ? 'complete' : 'failed',
    runtime,
    viewport,
    cold,
    warmups,
    measured,
    lifetime_counters: lifetimeCounters,
    cleanup,
    failure_evidence: settled.failedEvidence,
    diagnostics: {
      console_errors_and_warnings: diagnostics.console,
      page_errors: diagnostics.page_errors,
      request_failures: diagnostics.request_failures,
      http_errors: diagnostics.http_errors,
      ...processDiagnostics,
    },
    },
  };
}

function buildSummary(launches) {
  const allSamples = launches.flatMap((launch) => [
    ...(launch.cold ? [launch.cold] : []),
    ...(launch.warmups ?? []),
    ...(launch.measured ?? []),
  ]);
  const completeOrdered = allSamples.filter(
    (sample) => hasOrderedTransitionDurations(sample.durations_ms),
  ).length;
  const cold = launches.map((launch) => launch.cold?.durations_ms?.['current-state-rendered']).filter(Number.isFinite);
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
    sample_integrity: {
      samples: allSamples.length,
      complete_ordered: completeOrdered,
      invalid: allSamples.length - completeOrdered,
    },
    runtime_diagnostics: {
      console_errors_and_warnings: allDiagnostics.reduce((sum, row) => sum + row.console_errors_and_warnings.length, 0),
      page_errors: allDiagnostics.reduce((sum, row) => sum + row.page_errors.length, 0),
      request_failures: allDiagnostics.reduce((sum, row) => sum + row.request_failures.length, 0),
      http_errors: allDiagnostics.reduce((sum, row) => sum + row.http_errors.length, 0),
      main_process_stdout: allDiagnostics.reduce((sum, row) => sum + row.main_process_stdout.length, 0),
      main_process_stderr: allDiagnostics.reduce((sum, row) => sum + row.main_process_stderr.length, 0),
    },
  };
}

const unexpectedDiagnosticKeys = [
  'console_errors_and_warnings',
  'page_errors',
  'request_failures',
  'http_errors',
  'main_process_stdout',
  'main_process_stderr',
];

function unexpectedDiagnosticsFailure(summary) {
  const failures = unexpectedDiagnosticKeys
    .map((key) => [key, summary?.runtime_diagnostics?.[key] ?? 0])
    .filter(([, count]) => count !== 0)
    .map(([key, count]) => `${key}=${count}`);
  return failures.length === 0
    ? null
    : `Unexpected runtime diagnostics: ${failures.join(', ')}`;
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
      const outcome = await runLaunch(launchIndex, options, outputDirectory);
      launches.push(outcome.launch);
      if (outcome.failure) {
        failure = outcome.failure;
        break;
      }
    }
  } catch (error) {
    failure = error;
  }
  const repository_saves = assertRepositorySavesUnchanged(repositorySavesBefore);
  const processors = os.cpus();
  const summary = buildSummary(launches);
  failure ??= unexpectedDiagnosticsFailure(summary);
  const evidence = {
    schema_version: 4,
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
    machine: buildMachineManifest({
      platform: process.platform,
      architecture: process.arch,
      cpuModel: processors[0]?.model ?? '',
      logicalProcessors: processors.length,
      totalMemoryBytes: os.totalmem(),
      viewport: launches[0]?.viewport ?? null,
    }),
    repository_saves,
    launches,
    summary,
    ...buildEvidenceOutcome(failure, outputDirectory),
  };
  const evidencePath = path.join(outputDirectory, failure == null ? 'baseline.json' : 'baseline-failed.json');
  writeJsonExclusive(evidencePath, evidence);
  process.stdout.write(`${JSON.stringify({ ok: evidence.ok, evidence: `tmp-map-transition-perf/${options.label}/${path.basename(evidencePath)}`, summary: evidence.summary })}\n`);
  if (failure) throw failure;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(formatFatalError(error));
    process.exitCode = 1;
  });
}

module.exports = {
  assertRepositorySavesUnchanged,
  buildEvidenceOutcome,
  buildMachineManifest,
  buildPersistedProcessDiagnostics,
  buildStartupSurfaceDiagnostic,
  buildSummary,
  classifyMainProcessStdout,
  classifyMainProcessStderr,
  counterDelta,
  closeElectronApplication,
  formatFatalError,
  hasOrderedTransitionDurations,
  parseOptions,
  pickTopmostStartupControlIndex,
  percentile,
  sanitizeDiagnosticPayload,
  settlePostLaunchEvidence,
  snapshotRepositorySaves,
  unexpectedDiagnosticsFailure,
};
