#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { resolveBrowserGateEnv } = require('./browser_gate_pmtiles_env.cjs');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_FIRST_HOUR_BROWSER_PORT || 3237);
const URL = process.env.AWWV_FIRST_HOUR_BROWSER_URL || `http://127.0.0.1:${PORT}/?dev=1`;
const OUT_DIR = process.env.AWWV_FIRST_HOUR_BROWSER_OUT_DIR
  || path.join(ROOT, '.tmp_first_hour_browser_gate');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
const RUN_OPENING_VISUAL_MATRIX = process.env.AWWV_FIRST_HOUR_OPENING_MATRIX === 'true';

const OPENING_VISUAL_VIEWPORTS = [
  { id: 'desktop-1920x1080', width: 1920, height: 1080, confirmFaction: 'RBiH' },
  { id: 'desktop-1366x768', width: 1366, height: 768, confirmFaction: 'RS' },
  { id: 'tablet-1024x768', width: 1024, height: 768, confirmFaction: 'HRHB' },
  { id: 'narrow-700x900', width: 700, height: 900, confirmFaction: 'RBiH' },
  { id: 'short-1024x560', width: 1024, height: 560, confirmFaction: 'RS' },
];

const RAW_FIRST_HOUR_LABELS = [
  'rbih_state_identity',
  'turn_fired',
  'response_id',
  'event_id',
  'pending_event_decisions',
  'foundational_choice',
];

const RAW_FIRST_HOUR_PATTERNS = [
  { label: 'Rbih State Identity', pattern: /\bRbih State Identity\b/ },
  { label: 'Response recorded: civic.', pattern: /\bResponse recorded:\s+civic\./i },
];

const FORBIDDEN_DECISION_LEAK_PATTERNS = [
  { label: 'Downstream impact preview', pattern: /\bDownstream impact preview\b/i },
  { label: 'long-term branch copy', pattern: /\blong-term branch\b/i },
  { label: 'Future consequences heading', pattern: /\bFuture consequences\b/i },
  { label: 'future details control', pattern: /\bShow details\b/i },
  { label: 'future_consequences field', pattern: /\bfuture_consequences\b/i },
  { label: 'opens_events field', pattern: /\bopens_events\b/i },
  { label: 'closes_events field', pattern: /\bcloses_events\b/i },
  { label: 'future event id', pattern: /\bcsq_[a-z0-9_]+\b/i },
  { label: 'speculative later-event copy', pattern: /\blater event may or may not happen\b/i },
];

const FORBIDDEN_FUTURE_KNOWLEDGE_PATTERNS = [
  { label: 'Srebrenica demilitarization title', pattern: /\bThe Demilitarization of Srebrenica\b/i },
  { label: 'Vance-Owen title', pattern: /\bThe Vance-Owen Peace Plan\b/i },
  { label: 'Owen-Stoltenberg title', pattern: /\bThe Owen-Stoltenberg Plan\b/i },
  { label: 'Contact Group title', pattern: /\bThe Contact Group Plan\b/i },
  { label: 'Srebrenica fall title', pattern: /\bThe Fall of Srebrenica\b/i },
  { label: 'Dayton future settlement name', pattern: /\bDayton\b/i },
  { label: 'Karadzic-Mladic rupture title', pattern: /\bKarad\S*\s+Moves\s+Against\s+Mlad/i },
  { label: 'raw dated future event id', pattern: /\b[a-z][a-z0-9_]+_(?:1993|1994|1995)\b/i },
];

const FACTION_OPENING_FLOWS = [
  {
    faction: 'RBiH',
    identityNeedle: 'President of the Presidency of the Republic of Bosnia and Herzegovina',
    eventId: 'rbih_state_identity',
    decisionTitle: 'What Is Bosnia?',
    responseLabel: 'Civic multi-ethnic republic',
    responseId: 'civic',
    receiptCheck: true,
  },
  {
    faction: 'RS',
    identityNeedle: 'six strategic goals for the Serb people of Bosnia',
    eventId: 'rs_strategic_goals',
    decisionTitle: 'The Assembly Speaks',
    responseLabel: 'Adopt all six goals',
    responseId: 'all_six',
    receiptCheck: true,
  },
  {
    faction: 'HRHB',
    identityNeedle: 'Croat para-state proclaimed at Grude',
    eventId: 'hrhb_political_goal',
    decisionTitle: 'What Is Herceg-Bosna?',
    responseLabel: 'Croat republic',
    responseId: 'croat_republic',
    receiptCheck: true,
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanBrowserGateOutputDir() {
  ensureDir(OUT_DIR);
  for (const fileName of ['first_hour_browser_gate.json', 'first_hour_browser_gate_failed.json']) {
    fs.rmSync(path.join(OUT_DIR, fileName), { force: true });
  }
  fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
  ensureDir(SCREENSHOT_DIR);
}

async function waitForServer(url, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function waitForPortClosed(port, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (getPortListenerPids(port).length === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return getPortListenerPids(port).length === 0;
}

function getPortListenerPids(port) {
  if (process.platform !== 'win32') return [];
  const result = spawnSync('netstat.exe', ['-ano'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return [];
  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[0] !== 'TCP') continue;
    const [protocol, localAddress, , state, pid] = columns;
    if (protocol === 'TCP' && state === 'LISTENING' && extractLocalPort(localAddress) === port) {
      pids.add(pid);
    }
  }
  return Array.from(pids).map((pid) => Number(pid)).filter((pid) => Number.isInteger(pid) && pid > 0);
}

function extractLocalPort(localAddress) {
  const match = String(localAddress).match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function getWindowsCommandLine(pid) {
  const command = `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function resolveViteBin() {
  const packageJsonPath = require.resolve('vite/package.json', { paths: [ROOT] });
  const packageJson = readJson(packageJsonPath);
  return path.join(path.dirname(packageJsonPath), packageJson.bin.vite);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commandLineIncludesWorktreeRoot(commandLine) {
  const normalizedCommandLine = commandLine.toLowerCase().replace(/\//g, '\\');
  const normalizedRoot = ROOT.toLowerCase().replace(/\//g, '\\');
  return normalizedCommandLine.includes(normalizedRoot);
}

function commandLineHasExactPortArgument(commandLine, port) {
  const escapedPort = escapeRegExp(String(port));
  const exactPortArg = new RegExp(`(?:^|\\s)--port(?:=|\\s+)["']?${escapedPort}["']?(?=$|\\s)`, 'i');
  return exactPortArg.test(commandLine);
}

function isOwnedViteListener(pid, trackedPid) {
  if (pid === trackedPid) return true;
  const commandLine = getWindowsCommandLine(pid);
  const lowerCommandLine = commandLine.toLowerCase();
  return lowerCommandLine.includes('vite')
    && lowerCommandLine.includes('vite.config.ts')
    && commandLineIncludesWorktreeRoot(commandLine)
    && commandLineHasExactPortArgument(commandLine, PORT);
}

function taskkill(pid) {
  spawnSync('taskkill.exe', ['/pid', String(pid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

function startDevServer() {
  const child = spawn(process.execPath, [
    resolveViteBin(),
    '--config',
    path.join(ROOT, 'src', 'ui', 'map', 'vite.config.ts'),
    '--host',
    '127.0.0.1',
    '--port',
    String(PORT),
    '--strictPort',
  ], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: resolveBrowserGateEnv(ROOT, 'first-hour-browser-gate'),
    windowsHide: true,
  });

  let log = '';
  let stopping = false;
  const collect = (chunk) => {
    log += chunk.toString();
    if (log.length > 20000) log = log.slice(-20000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (code !== null && code !== 0) {
      console.error(`[first-hour-browser-gate] dev server exited with code ${code}`);
      console.error(log);
    } else if (signal) {
      console.error(`[first-hour-browser-gate] dev server exited via ${signal}`);
    }
  });

  return {
    child,
    getLog: () => log,
    stop: async () => {
      stopping = true;
      if (process.platform === 'win32') {
        if (child.exitCode === null) taskkill(child.pid);
      } else if (child.exitCode === null) {
        child.kill();
      }
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        child.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
        if (child.exitCode !== null) {
          clearTimeout(timeout);
          resolve();
        }
      });
      if (process.platform === 'win32' && !(await waitForPortClosed(PORT))) {
        const ownedListeners = getPortListenerPids(PORT).filter((pid) => isOwnedViteListener(pid, child.pid));
        for (const pid of ownedListeners) taskkill(pid);
      }
      if (process.platform === 'win32' && !(await waitForPortClosed(PORT))) {
        const listeners = getPortListenerPids(PORT);
        throw new Error(`Dev server cleanup left port ${PORT} listening on pid(s): ${listeners.join(', ')}`);
      }
      console.log(`[first-hour-browser-gate] dev server cleanup verified: port ${PORT} is not listening`);
    },
  };
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function visibleText(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function visibleSurfaceText(page, requiredTexts) {
  const text = await page.evaluate((needles) => {
    const normalizedNeedles = needles.map((needle) => String(needle).toLowerCase());
    const candidates = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el instanceof HTMLElement)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const textContent = el.innerText ?? '';
        return {
          el,
          text: textContent,
          visible: rect.width > 0
            && rect.height > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity || '1') > 0,
        };
      })
      .filter(({ text, visible }) => {
        if (!visible || !text) return false;
        const lower = text.toLowerCase();
        return normalizedNeedles.every((needle) => lower.includes(needle));
      })
      .sort((a, b) => a.text.length - b.text.length);
    return candidates[0]?.text ?? '';
  }, requiredTexts);
  if (!text) {
    throw new Error(`No visible surface contained required text: ${requiredTexts.join(' | ')}`);
  }
  return text;
}

async function visibleSelectorText(page, selector, label) {
  const text = await page.evaluate((targetSelector) => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const target = Array.from(document.querySelectorAll(targetSelector)).find(isVisible);
    return target?.innerText ?? target?.textContent ?? '';
  }, selector);
  if (!text) throw new Error(`No visible selector text found for ${label ?? selector}`);
  return text;
}

async function dialogText(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    return dialog?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  });
}

async function waitForVisibleText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (needle) => (document.body?.innerText ?? '').toLowerCase().includes(needle.toLowerCase()),
    { timeout },
    text,
  );
}

async function waitUntilTextAbsent(page, text, timeout = 15000) {
  await page.waitForFunction(
    (needle) => !(document.body?.innerText ?? '').toLowerCase().includes(needle.toLowerCase()),
    { timeout },
    text,
  );
}

async function waitUntilDialogTextAbsent(page, text, timeout = 15000) {
  await page.waitForFunction(
    (needle) => !Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .some((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        return (el.textContent ?? '').toLowerCase().includes(needle.toLowerCase());
      }),
    { timeout },
    text,
  );
}

async function clickByTextIfVisible(page, text) {
  return page.evaluate((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'))
      .map((el) => {
        const label = [
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
        return { el, label };
      })
      .filter(({ el, label }) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        return label.includes(normalizedNeedle);
      })
      .sort((a, b) => {
        const aExact = a.label === normalizedNeedle ? 0 : 1;
        const bExact = b.label === normalizedNeedle ? 0 : 1;
        return aExact - bExact || a.label.length - b.label.length;
      });
    const target = candidates[0]?.el;
    if (!target) return false;
    target.click();
    return true;
  }, text);
}

async function clickByText(page, text) {
  const clicked = await clickByTextIfVisible(page, text);
  if (!clicked) throw new Error(`No visible clickable control matched "${text}"`);
}

async function clickFirstMatchingText(page, labels) {
  let lastError = null;
  for (const label of labels) {
    try {
      await clickByText(page, label);
      return label;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`No visible clickable control matched any label: ${labels.join(' | ')}`);
}

async function clickSelector(page, selector, label) {
  const clicked = await page.evaluate((targetSelector) => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const target = Array.from(document.querySelectorAll(targetSelector)).find(isVisible);
    if (!(target instanceof HTMLElement)) return false;
    target.click();
    return true;
  }, selector);
  if (!clicked) throw new Error(`No visible ${label ?? selector} control found`);
}

async function clickSelectorIfVisible(page, selector) {
  return page.evaluate((targetSelector) => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const target = Array.from(document.querySelectorAll(targetSelector)).find(isVisible);
    if (!(target instanceof HTMLElement)) return false;
    target.click();
    return true;
  }, selector);
}

async function assertSelectedWarroomVisibleBeneathDateSting(page, summary, flow) {
  const imageNeedleByFaction = {
    RBiH: 'hq_rbih_1992',
    RS: 'hq_rs_1992',
    HRHB: 'hq_hrhb_1992',
  };
  const expectedImageNeedle = imageNeedleByFaction[flow.faction];
  if (!expectedImageNeedle) throw new Error(`No opening Warroom image contract for ${flow.faction}`);

  await page.waitForFunction((imageNeedle) => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const shell = document.querySelector('[data-testid="warroom-shell"]');
    const plate = shell?.querySelector('[data-testid="warroom-scene-plate"]');
    const image = plate?.querySelector('img');
    const dateSting = Array.from(document.querySelectorAll('[role="dialog"]'))
      .find((element) => visible(element) && (element.textContent ?? '').includes('WAR HAS STARTED'));
    return visible(shell)
      && visible(plate)
      && image instanceof HTMLImageElement
      && image.src.includes(imageNeedle)
      && image.complete
      && image.naturalWidth > 0
      && visible(dateSting);
  }, { timeout: 30000 }, expectedImageNeedle);

  const evidence = await page.evaluate((imageNeedle) => {
    const shell = document.querySelector('[data-testid="warroom-shell"]');
    const plate = shell?.querySelector('[data-testid="warroom-scene-plate"]');
    const image = plate?.querySelector('img');
    const dateSting = Array.from(document.querySelectorAll('[role="dialog"]'))
      .find((element) => (element.textContent ?? '').includes('WAR HAS STARTED'));
    const openingBriefPresentDuringDateSting = document
      .querySelector('[data-testid="presidential-inbox-opening-brief"]') !== null;
    const dateStingStyle = dateSting ? window.getComputedStyle(dateSting) : null;
    const backgroundParts = dateStingStyle?.backgroundColor
      .match(/rgba?\(([^)]+)\)/)?.[1]
      .split(',')
      .map((part) => Number(part.trim())) ?? [];
    const dateStingBackgroundAlpha = backgroundParts.length === 4 ? backgroundParts[3] : 1;
    return {
      warroomShellPresent: shell !== null,
      scenePlatePresent: plate !== null,
      sceneImageSrc: image instanceof HTMLImageElement ? image.src : null,
      sceneImageDecoded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      sceneImageMatchesFaction: image instanceof HTMLImageElement && image.src.includes(imageNeedle),
      dateStingPresent: dateSting !== undefined,
      openingBriefPresentDuringDateSting,
      dateStingBackgroundAlpha,
      dateStingBackdropFilter: dateStingStyle?.backdropFilter ?? null,
    };
  }, expectedImageNeedle);

  summary.evidence.selectedWarroomVisibleBeneathDateStingByFaction ??= {};
  summary.evidence.selectedWarroomVisibleBeneathDateStingByFaction[flow.faction] = evidence;
  summary.evidence.openingBriefAbsentDuringDateStingByFaction ??= {};
  summary.evidence.openingBriefAbsentDuringDateStingByFaction[flow.faction] = !evidence.openingBriefPresentDuringDateSting;
  if (
    !evidence.warroomShellPresent
    || !evidence.scenePlatePresent
    || !evidence.sceneImageDecoded
    || !evidence.sceneImageMatchesFaction
    || !evidence.dateStingPresent
    || evidence.openingBriefPresentDuringDateSting
    || evidence.dateStingBackgroundAlpha > 0.72
    || evidence.dateStingBackdropFilter !== 'none'
  ) {
    throw new Error(`${flow.faction} Warroom continuity beneath date sting failed: ${JSON.stringify(evidence)}`);
  }
}

async function assertToolbarRoutesDisabled(page, summary, flow) {
  const routeTestIds = [
    'toolbar-route-desk',
    'toolbar-route-war-map',
    'toolbar-route-army-hq',
    'toolbar-route-records',
    'toolbar-route-chronicle',
    'toolbar-route-codex',
  ];
  const states = await page.evaluate((testIds) => {
    return Object.fromEntries(testIds.map((testId) => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      if (!(el instanceof HTMLElement)) return [testId, { present: false, disabled: true }];
      return [testId, {
        present: true,
        disabled: Boolean(el.disabled) || el.getAttribute('aria-disabled') === 'true',
      }];
    }));
  }, routeTestIds);
  summary.evidence.toolbarLockWhileDecisionActive ??= {};
  summary.evidence.toolbarLockWhileDecisionActive[flow.faction] = states;
  const unlocked = Object.entries(states)
    .filter(([, state]) => state.present && !state.disabled)
    .map(([testId, state]) => ({ testId, state }));
  if (unlocked.length > 0) {
    throw new Error(`${flow.faction} toolbar routes were not disabled while decision modal was active: ${JSON.stringify(unlocked)}`);
  }

  for (const key of ['h', 'c', 'x', 'd', 'u']) {
    await page.keyboard.press(key);
    await delay(100);
  }
  const leakedSurfaces = await page.evaluate(() => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const visibleTextFor = (selector) => Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
      .join(' ');
    const hasVisible = (selector) => Array.from(document.querySelectorAll(selector)).some(isVisible);
    return {
      armyHq: hasVisible('[id^="army-hq-tabpanel-"], [data-testid="army-hq-corps-index"]'),
      chronicle: /^War Chronicle$/i.test(visibleTextFor('h1')),
      codex: Boolean(Array.from(document.querySelectorAll('[data-testid="codex-panel"]')).some(isVisible)),
      decisionHistory: /Decision History|Authored Choices/i.test(visibleTextFor('[role="dialog"], [aria-modal="true"]')),
      humanitarianLedger: /National Humanitarian Ledger/i.test(visibleTextFor('[role="dialog"], [aria-modal="true"], aside, section')),
    };
  });
  summary.evidence.hotkeyLockWhileDecisionActive ??= {};
  summary.evidence.hotkeyLockWhileDecisionActive[flow.faction] = leakedSurfaces;
  const leaked = Object.entries(leakedSurfaces).filter(([, visible]) => visible);
  if (leaked.length > 0) {
    throw new Error(`${flow.faction} hotkeys opened shell surfaces behind the required decision: ${JSON.stringify(leaked)}`);
  }
}

async function waitForSelectorHidden(page, selector, timeout = 15000) {
  await page.waitForFunction((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) return true;
    const rect = target.getBoundingClientRect();
    return rect.width <= 0 || rect.height <= 0;
  }, { timeout }, selector);
}

async function captureEvidence(page, summary, id) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${String(summary.steps.length + 1).padStart(2, '0')}_${id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const text = await visibleText(page);
  const step = {
    id,
    screenshot: path.relative(ROOT, screenshotPath).replace(/\\/g, '/'),
    textSample: text.replace(/\s+/g, ' ').slice(0, 1400),
  };
  summary.steps.push(step);
  return step;
}

async function waitForOpeningScene(page, scene, timeout = 30000) {
  await page.waitForFunction((expectedScene) => {
    const menu = document.querySelector('.main-menu-opening');
    const layer = document.querySelector('.opening-cinematic');
    const plate = layer?.querySelector('[data-scene-state="current"]');
    const image = plate?.querySelector('img');
    return menu?.getAttribute('data-opening-scene') === expectedScene
      && layer?.getAttribute('data-opening-phase') === 'idle'
      && layer?.getAttribute('aria-busy') === 'false'
      && image instanceof HTMLImageElement
      && image.complete
      && image.naturalWidth > 0;
  }, { timeout }, scene);
}

async function waitForOpeningSceneGeometryStable(page, timeout = 5000) {
  await page.evaluate((timeoutMs) => new Promise((resolve, reject) => {
    const deadline = performance.now() + timeoutMs;
    let previous = null;
    let stableFrames = 0;
    const sample = () => {
      const wrapper = document.querySelector('.opening-cinematic__plate--current');
      const plate = wrapper?.querySelector('[data-scene-state="current"]');
      if (!(wrapper instanceof HTMLElement) || !(plate instanceof HTMLElement)) {
        reject(new Error('opening scene geometry unavailable while waiting for a stable frame'));
        return;
      }
      const rect = plate.getBoundingClientRect();
      const current = [rect.x, rect.y, rect.width, rect.height, getComputedStyle(wrapper).transform];
      const stable = previous !== null && current.every((value, index) => (
        typeof value === 'number'
          ? Math.abs(value - previous[index]) <= 0.01
          : value === previous[index]
      ));
      stableFrames = stable ? stableFrames + 1 : 0;
      previous = current;
      if (stableFrames >= 3) {
        resolve();
        return;
      }
      if (performance.now() >= deadline) {
        reject(new Error(`opening scene geometry did not settle: ${JSON.stringify(current)}`));
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }), timeout);
}

async function startOpeningPhaseTrace(page) {
  await page.evaluate(() => {
    const trace = { active: true, samples: [] };
    window.__awwvOpeningPhaseTrace = trace;
    const sample = () => {
      if (!trace.active) return;
      const layer = document.querySelector('.opening-cinematic');
      const monitor = document.querySelector('.main-menu-opening__monitor');
      const plates = Array.from(layer?.querySelectorAll('.opening-cinematic__plate') ?? []);
      const portal = layer?.querySelector('.opening-cinematic__portal');
      const images = plates.map((plate) => {
        const image = plate.querySelector('img');
        const style = getComputedStyle(plate);
        return {
          state: plate.querySelector('[data-scene-state]')?.getAttribute('data-scene-state') ?? null,
          decoded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          opacity: Number(style.opacity),
          transform: style.transform,
          transitionDuration: style.transitionDuration,
        };
      });
      const monitorStyle = monitor ? getComputedStyle(monitor) : null;
      const portalStyle = portal ? getComputedStyle(portal) : null;
      trace.samples.push({
        phase: layer?.getAttribute('data-opening-phase') ?? null,
        reducedMotion: layer?.getAttribute('data-reduced-motion') ?? null,
        monitorBackgroundImage: monitorStyle?.backgroundImage ?? null,
        layerBackgroundColor: layer ? getComputedStyle(layer).backgroundColor : null,
        portalOpacity: portalStyle ? Number(portalStyle.opacity) : null,
        portalTransform: portalStyle?.transform ?? null,
        portalTransitionDuration: portalStyle?.transitionDuration ?? null,
        images,
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopOpeningPhaseTrace(page) {
  return page.evaluate(() => {
    const trace = window.__awwvOpeningPhaseTrace;
    if (!trace) return [];
    trace.active = false;
    return trace.samples;
  });
}

function assertOpeningTraceCoverage(trace, label, reducedMotion) {
  if (trace.length === 0) throw new Error(`${label} opening trace captured no animation frames`);
  const uncovered = trace.filter((sample) => {
    const monitorCoversFrame = sample.monitorBackgroundImage && sample.monitorBackgroundImage !== 'none';
    const decodedPlateCoversFrame = sample.images.some((image) => image.decoded && image.opacity > 0.01);
    return !monitorCoversFrame && !decodedPlateCoversFrame;
  });
  if (uncovered.length > 0) {
    throw new Error(`${label} exposed ${uncovered.length} frame(s) without a decoded plate or monitoring-room backdrop`);
  }
  if (trace.some((sample) => sample.images.length > 2)) {
    throw new Error(`${label} mounted more than current plus incoming scene plates`);
  }
  if (reducedMotion) {
    const transformed = trace.filter((sample) => sample.images.some((image) => image.transform !== 'none')
      || (sample.portalTransform !== null && sample.portalTransform !== 'none'));
    const wrongDuration = trace.filter((sample) => sample.images.some((image) => image.transitionDuration !== '0.155s')
      || (sample.portalTransitionDuration !== null && sample.portalTransitionDuration !== '0.155s'));
    if (transformed.length > 0 || wrongDuration.length > 0) {
      throw new Error(`${label} reduced-motion path was not transform-free at exactly 155ms`);
    }
  }
}

async function openingStateEvidence(page, label) {
  const evidence = await page.evaluate(() => {
    const parseColor = (value) => {
      const parts = value.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map((part) => Number(part.trim()));
      if (!parts || parts.length < 3) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length === 4 ? parts[3] : 1 };
    };
    const composite = (front, back) => ({
      r: front.r * front.a + back.r * (1 - front.a),
      g: front.g * front.a + back.g * (1 - front.a),
      b: front.b * front.a + back.b * (1 - front.a),
      a: 1,
    });
    const luminance = (color) => {
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    };
    const ratio = (front, back) => {
      const a = luminance(front);
      const b = luminance(back);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const contrastFor = (textSelector, backgroundSelector) => {
      const text = document.querySelector(textSelector);
      const background = document.querySelector(backgroundSelector);
      if (!(text instanceof HTMLElement) || !(background instanceof HTMLElement)) return null;
      const foreground = parseColor(getComputedStyle(text).color);
      const backgroundColor = parseColor(getComputedStyle(background).backgroundColor);
      const rootColor = parseColor(getComputedStyle(document.body).backgroundColor);
      if (!foreground || !backgroundColor || !rootColor) return null;
      const opaqueBackground = backgroundColor.a < 1 ? composite(backgroundColor, rootColor) : backgroundColor;
      return {
        foreground: getComputedStyle(text).color,
        background: getComputedStyle(background).backgroundColor,
        ratio: ratio(foreground, opaqueBackground),
      };
    };
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusStyle = active ? getComputedStyle(active) : null;
    const mainMenu = document.querySelector('.main-menu-opening');
    const layerStyle = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return { zIndex: style.zIndex, pointerEvents: style.pointerEvents };
    };
    const interactiveHitTests = Array.from(document.querySelectorAll(
      '.opening-splash button, .main-menu-opening button, .main-menu-opening select',
    )).flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const centerInViewport = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
      if (
        rect.width <= 0
        || rect.height <= 0
        || style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity || '1') <= 0
        || !centerInViewport
      ) return [];
      const hit = document.elementFromPoint(x, y);
      return [{
        testId: element.getAttribute('data-testid'),
        tag: element.tagName,
        text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 100),
        hitTag: hit?.tagName ?? null,
        hitTestId: hit instanceof HTMLElement ? hit.getAttribute('data-testid') : null,
        hitClass: hit instanceof HTMLElement ? hit.className : null,
        hitText: hit instanceof HTMLElement ? (hit.innerText || '').trim().slice(0, 100) : null,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        center: { x, y },
        centerHit: hit === element || (hit instanceof Node && element.contains(hit)),
      }];
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      },
      focus: active ? {
        tag: active.tagName,
        text: (active.innerText || active.getAttribute('aria-label') || '').trim().slice(0, 160),
        outlineStyle: focusStyle?.outlineStyle ?? null,
        outlineWidth: focusStyle?.outlineWidth ?? null,
        outlineColor: focusStyle?.outlineColor ?? null,
      } : null,
      contrast: {
        heading: contrastFor('.command-heading h2', '.main-menu-opening__console'),
        body: contrastFor('.command-console-copy, .command-console-thesis', '.main-menu-opening__console'),
        data: contrastFor('.command-eyebrow', '.main-menu-opening__console'),
      },
      scene: document.querySelector('.main-menu-opening')?.getAttribute('data-opening-scene') ?? null,
      phase: document.querySelector('.opening-cinematic')?.getAttribute('data-opening-phase') ?? null,
      reducedMotion: document.querySelector('.opening-cinematic')?.getAttribute('data-reduced-motion') ?? null,
      openingLayerOrder: mainMenu ? {
        scene: layerStyle('.opening-cinematic.main-menu-opening__scene'),
        scrim: layerStyle('.main-menu-opening__scrim'),
        header: layerStyle('.main-menu-opening__header'),
        workspace: layerStyle('.main-menu-opening__workspace'),
        version: layerStyle('.main-menu-opening__version'),
        portal: layerStyle('.opening-cinematic__portal'),
      } : null,
      interactiveHitTests,
      fontFamilies: Array.from(document.querySelectorAll('.main-menu-opening, .command-eyebrow, .main-menu-opening__version'))
        .map((element) => getComputedStyle(element).fontFamily),
    };
  });
  if (evidence.horizontalOverflow.document > 0 || evidence.horizontalOverflow.body > 0) {
    throw new Error(`${label} has horizontal overflow: ${JSON.stringify(evidence.horizontalOverflow)}`);
  }
  for (const [role, contrast] of Object.entries(evidence.contrast)) {
    if (contrast && contrast.ratio < 4.5) {
      throw new Error(`${label} ${role} contrast is ${contrast.ratio.toFixed(2)}:1, below WCAG AA`);
    }
  }
  const occluded = evidence.interactiveHitTests.filter((entry) => !entry.centerHit);
  if (occluded.length > 0) {
    throw new Error(`${label} has occluded visible opening controls: ${JSON.stringify(occluded)}`);
  }
  if (evidence.openingLayerOrder) {
    const { scene, scrim, header, workspace, version } = evidence.openingLayerOrder;
    if (
      scene?.zIndex !== '0'
      || scrim?.zIndex !== '1'
      || scrim?.pointerEvents !== 'none'
      || header?.zIndex !== '2'
      || workspace?.zIndex !== '2'
      || version?.zIndex !== '2'
    ) {
      throw new Error(`${label} opening scene/scrim/content stack is not canonical: ${JSON.stringify(evidence.openingLayerOrder)}`);
    }
  }
  return evidence;
}

async function sceneGeometry(page, kind) {
  return page.evaluate((sceneKind) => {
    const selector = sceneKind === 'preview'
      ? '.opening-cinematic [data-scene-state="current"]'
      : '[data-testid="warroom-shell"] [data-testid="warroom-scene-plate"]';
    const plate = document.querySelector(selector);
    const image = plate?.querySelector('img');
    if (!(plate instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return null;
    const rect = plate.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const style = getComputedStyle(plate);
    const imageStyle = getComputedStyle(image);
    return {
      src: image.src,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      imageRect: { x: imageRect.x, y: imageRect.y, width: imageRect.width, height: imageRect.height },
      objectFit: imageStyle.objectFit,
      transform: style.transform,
      transformOrigin: style.transformOrigin,
    };
  }, kind);
}

function assertSceneContinuity(preview, confirmed, label) {
  if (!preview || !confirmed) throw new Error(`${label} is missing preview or confirmed scene geometry`);
  const delta = (a, b) => Math.abs(a - b);
  const rectKeys = ['x', 'y', 'width', 'height'];
  const geometryMismatch = rectKeys.some((key) => delta(preview.rect[key], confirmed.rect[key]) > 0.5)
    || rectKeys.some((key) => delta(preview.imageRect[key], confirmed.imageRect[key]) > 0.5);
  if (
    preview.src !== confirmed.src
    || preview.naturalWidth <= 0
    || preview.naturalHeight <= 0
    || confirmed.naturalWidth !== preview.naturalWidth
    || confirmed.naturalHeight !== preview.naturalHeight
    || preview.objectFit !== confirmed.objectFit
    || preview.transform !== confirmed.transform
    || geometryMismatch
  ) {
    throw new Error(`${label} preview-to-confirmed crop continuity failed: ${JSON.stringify({ preview, confirmed })}`);
  }
}

async function enterOpeningLanding(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.opening-splash', { visible: true, timeout: 30000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-testid="opening-splash-art"]');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  }, { timeout: 30000 });
}

async function runOpeningVisualMatrix(page, summary) {
  summary.evidence.openingVisualMatrix = { artStatus: 'fallback-art', viewports: {}, reducedMotion: null };
  for (const viewport of OPENING_VISUAL_VIEWPORTS) {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await enterOpeningLanding(page);
    const viewportEvidence = { states: {}, transitionTraces: {}, previews: {}, continuity: null };
    summary.evidence.openingVisualMatrix.viewports[viewport.id] = viewportEvidence;

    viewportEvidence.states.splash = await openingStateEvidence(page, `${viewport.id} splash`);
    await captureEvidence(page, summary, `${viewport.id}_splash`);
    await clickByText(page, 'Assume Responsibility');
    await waitForOpeningScene(page, 'neutral');
    viewportEvidence.states.landing = await openingStateEvidence(page, `${viewport.id} neutral landing`);
    await captureEvidence(page, summary, `${viewport.id}_neutral_landing`);

    await clickByText(page, 'New War');
    await page.waitForSelector('[data-testid="main-menu-faction-RBiH"]', { visible: true, timeout: 15000 });
    await page.keyboard.press('Tab');
    viewportEvidence.states.factionSelector = await openingStateEvidence(page, `${viewport.id} faction selector`);
    const focus = viewportEvidence.states.factionSelector.focus;
    if (!focus || focus.outlineStyle === 'none' || Number.parseFloat(focus.outlineWidth ?? '0') < 2) {
      throw new Error(`${viewport.id} faction selector has no visible >=2px keyboard focus ring: ${JSON.stringify(focus)}`);
    }
    await captureEvidence(page, summary, `${viewport.id}_neutral_faction_selector_focus`);

    for (const faction of ['RBiH', 'RS', 'HRHB']) {
      await startOpeningPhaseTrace(page);
      await clickSelector(page, `[data-testid="main-menu-faction-${faction}"]`, `${faction} matrix faction`);
      await waitForOpeningScene(page, faction);
      await waitForOpeningSceneGeometryStable(page);
      const trace = await stopOpeningPhaseTrace(page);
      assertOpeningTraceCoverage(trace, `${viewport.id} ${faction}`, false);
      viewportEvidence.transitionTraces[faction] = trace;
      viewportEvidence.previews[faction] = await sceneGeometry(page, 'preview');
      viewportEvidence.states[`${faction}Preview`] = await openingStateEvidence(page, `${viewport.id} ${faction} preview`);
      await captureEvidence(page, summary, `${viewport.id}_${faction.toLowerCase()}_preview`);
    }

    if (viewport.confirmFaction !== 'HRHB') {
      await clickSelector(page, `[data-testid="main-menu-faction-${viewport.confirmFaction}"]`, `${viewport.confirmFaction} confirmed faction`);
      await waitForOpeningScene(page, viewport.confirmFaction);
      await waitForOpeningSceneGeometryStable(page);
    }
    await clickByText(page, 'Take command');
    await waitForVisibleText(page, 'How should the war unfold?');
    viewportEvidence.states.mode = await openingStateEvidence(page, `${viewport.id} mode`);
    const confirmedPreview = await sceneGeometry(page, 'preview');
    await captureEvidence(page, summary, `${viewport.id}_mode`);
    await clickByText(page, 'Begin');
    await waitForVisibleText(page, 'WAR HAS STARTED');
    await assertSelectedWarroomVisibleBeneathDateSting(
      page,
      summary,
      { faction: viewport.confirmFaction },
    );
    const confirmed = await sceneGeometry(page, 'confirmed');
    assertSceneContinuity(confirmedPreview, confirmed, `${viewport.id} ${viewport.confirmFaction}`);
    viewportEvidence.continuity = {
      faction: viewport.confirmFaction,
      preview: confirmedPreview,
      confirmed,
      maxAllowedRectDeltaPx: 0.5,
      transformOriginNote: 'Recorded numerically; identical translation means origin does not alter the settled crop.',
    };
    viewportEvidence.states.confirmedWarroom = await openingStateEvidence(page, `${viewport.id} confirmed Warroom`);
    await captureEvidence(page, summary, `${viewport.id}_${viewport.confirmFaction.toLowerCase()}_confirmed_warroom`);
  }

  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await enterOpeningLanding(page);
  await clickByText(page, 'Assume Responsibility');
  await waitForOpeningScene(page, 'neutral');
  await clickByText(page, 'New War');
  await page.waitForSelector('[data-testid="main-menu-faction-RBiH"]', { visible: true, timeout: 15000 });
  await startOpeningPhaseTrace(page);
  await clickSelector(page, '[data-testid="main-menu-faction-RBiH"]', 'reduced-motion RBiH faction');
  await waitForOpeningScene(page, 'RBiH');
  await waitForOpeningSceneGeometryStable(page);
  const reducedTrace = await stopOpeningPhaseTrace(page);
  assertOpeningTraceCoverage(reducedTrace, 'reduced-motion RBiH', true);
  summary.evidence.openingVisualMatrix.reducedMotion = {
    state: await openingStateEvidence(page, 'reduced-motion preview'),
    trace: reducedTrace,
  };
  await captureEvidence(page, summary, 'reduced_motion_1366x768_rbih_preview');

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
}

function isIgnoredConsoleError(message) {
  const url = message.location?.url ?? '';
  if (/Failed to load resource/i.test(message.text) && /\/favicon\.ico$/i.test(url)) return true;
  return message.text === 'deck: Failed to fetch'
    && message.browserGatePhase === 'teardown'
    && /\/node_modules\/\.vite\/deps\/@deck__gl_layers\.js(?:\?|$)/i.test(url);
}

function assertNoConsoleErrors(consoleMessages) {
  const errors = consoleMessages.filter((message) => {
    if (message.kind === 'pageerror') return true;
    if (message.type !== 'error') return false;
    return !isIgnoredConsoleError(message);
  });
  if (errors.length > 0) {
    throw new Error(`Browser console errors detected: ${JSON.stringify(errors.slice(0, 10), null, 2)}`);
  }
}

function isIgnoredNetworkFailure(entry) {
  const url = String(entry.url ?? '');
  if (/^(?:data|blob):/i.test(url)) return true;
  if (/\/favicon\.ico(?:\?|$)/i.test(url)) return true;
  return entry.failureText === 'net::ERR_ABORTED';
}

function assertNoNetworkFailures(requestFailures, httpFailures) {
  const failedRequests = requestFailures.filter((entry) => !isIgnoredNetworkFailure(entry));
  const failedResponses = httpFailures.filter((entry) => !isIgnoredNetworkFailure(entry));
  if (failedRequests.length > 0 || failedResponses.length > 0) {
    throw new Error(`Browser network failures detected: ${JSON.stringify({
      requestFailures: failedRequests.slice(0, 10),
      httpFailures: failedResponses.slice(0, 10),
    }, null, 2)}`);
  }
}

function assertRawLabelsAbsent(surfaceName, text) {
  const lower = text.toLowerCase();
  const found = RAW_FIRST_HOUR_LABELS
    .filter((label) => lower.includes(label.toLowerCase()))
    .map((label) => {
      const index = lower.indexOf(label.toLowerCase());
      return { label, index, length: label.length };
    });
  for (const { label, pattern } of RAW_FIRST_HOUR_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      found.push({ label, index: match.index, length: match[0].length });
    }
  }
  if (found.length > 0) {
    const contexts = found.map(({ label, index, length }) => {
      return {
        label,
        context: text.slice(Math.max(0, index - 160), Math.min(text.length, index + length + 160)).replace(/\s+/g, ' '),
      };
    });
    throw new Error(`${surfaceName} exposed raw first-hour labels: ${JSON.stringify(contexts, null, 2)}`);
  }
}

function assertNoDecisionKnowledgeLeaks(surfaceName, text) {
  const found = [];
  for (const { label, pattern } of FORBIDDEN_DECISION_LEAK_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      found.push({
        label,
        context: text.slice(Math.max(0, match.index - 160), Math.min(text.length, match.index + match[0].length + 160)).replace(/\s+/g, ' '),
      });
    }
  }
  if (found.length > 0) {
    throw new Error(`${surfaceName} exposed pre-choice decision knowledge: ${JSON.stringify(found, null, 2)}`);
  }
}

function assertNoFutureKnowledgeLeaks(surfaceName, text) {
  const found = [];
  for (const { label, pattern } of FORBIDDEN_FUTURE_KNOWLEDGE_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      found.push({
        label,
        context: text.slice(Math.max(0, match.index - 160), Math.min(text.length, match.index + match[0].length + 160)).replace(/\s+/g, ' '),
      });
    }
  }
  if (found.length > 0) {
    throw new Error(`${surfaceName} exposed future campaign knowledge: ${JSON.stringify(found, null, 2)}`);
  }
}

function assertNoFirstHourKnowledgeLeaks(surfaceName, text) {
  assertRawLabelsAbsent(surfaceName, text);
  assertNoDecisionKnowledgeLeaks(surfaceName, text);
  assertNoFutureKnowledgeLeaks(surfaceName, text);
}

async function dismissTutorialIfPresent(page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const before = await visibleText(page);
    if (!/tutorial|thesis lesson|skip/i.test(before)) return;
    const clicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const label = [
            el.textContent,
            el.getAttribute('aria-label'),
            el.getAttribute('title'),
          ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
          return rect.width > 0 && rect.height > 0 && (
            label.includes('skip tutorial')
            || label === 'skip'
            || label.includes('read later')
            || label.includes('review later')
          );
        });
      const target = candidates[0];
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked) return;
    await delay(300);
  }
}

async function runFoundationalFlow(page, summary, flow) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForVisibleText(page, 'A WAR WITHOUT VICTORY');
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_opening_splash`);
  await clickByText(page, 'Assume Responsibility');
  await waitForVisibleText(page, 'New War');
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_main_menu`);

  await clickByText(page, 'New War');
  await page.waitForSelector('[data-testid="main-menu-faction-RBiH"]', { visible: true, timeout: 15000 });
  await clickSelector(page, `[data-testid="main-menu-faction-${flow.faction}"]`, `${flow.faction} faction`);
  await waitForVisibleText(page, 'Take command');
  const dossierText = await visibleText(page);
  if (!dossierText.includes(flow.identityNeedle)) {
    throw new Error(`${flow.faction} faction dossier did not show expected identity copy: ${dossierText.replace(/\s+/g, ' ').slice(0, 1400)}`);
  }
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_faction_dossier`);

  await clickByText(page, 'Take command');
  await waitForVisibleText(page, 'How should the war unfold?');
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_decision_mode`);

  await clickByText(page, 'Begin');
  await waitForVisibleText(page, 'WAR HAS STARTED');
  await assertSelectedWarroomVisibleBeneathDateSting(page, summary, flow);
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_war_start_splash`);

  const acknowledgedDateSting = await clickByTextIfVisible(page, 'Acknowledge');
  summary.evidence.dateStingDismissalByFaction ??= {};
  summary.evidence.dateStingDismissalByFaction[flow.faction] = acknowledgedDateSting ? 'acknowledged' : 'auto';
  await waitUntilTextAbsent(page, 'WAR HAS STARTED');
  await page.waitForSelector('[data-testid="presidential-inbox-opening-brief"]', { visible: true, timeout: 30000 });
  const openingBriefText = await visibleSelectorText(
    page,
    '[data-testid="presidential-inbox-opening-brief"]',
    `${flow.faction} opening brief`,
  );
  summary.evidence.openingBriefVisibleInSelectedWarroomByFaction ??= {};
  summary.evidence.openingBriefVisibleInSelectedWarroomByFaction[flow.faction] = {
    visible: true,
    textSample: openingBriefText.replace(/\s+/g, ' ').slice(0, 800),
  };
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_opening_brief`);

  await clickSelector(
    page,
    '[data-testid="presidential-inbox-opening-brief-open-desk"]',
    `${flow.faction} opening brief desk action`,
  );
  await page.waitForFunction((title, response) => {
    const text = document.body?.innerText ?? '';
    return text.includes(response)
      || (text.includes("President's Desk") && text.includes('Decision Packet') && text.includes(title));
  }, { timeout: 30000 }, flow.decisionTitle, flow.responseLabel);
  const deskBlockEvidence = await page.evaluate((title, response) => {
    const bodyText = document.body?.innerText ?? '';
    const compactText = bodyText.replace(/\s+/g, ' ');
    const hasModalActive = /Decision Required/i.test(compactText)
      && compactText.includes(title)
      && compactText.includes(response);
    const hasDeskPacket = compactText.includes("President's Desk")
      && compactText.includes('Decision Packet')
      && compactText.includes(title)
      && /Advance\s*Blocked/i.test(compactText);
    return {
      hasDesk: compactText.includes("President's Desk"),
      hasDecisionPacket: compactText.includes('Decision Packet'),
      hasRequired: compactText.includes('Required'),
      hasFoundationalTitle: compactText.includes(title),
      hasHistoricalOption: compactText.includes(response),
      hasAdvanceBlocked: /Advance\s*Blocked/i.test(compactText),
      hasDecideNow: compactText.includes('Decide now'),
      hasModalActive,
      hasDeskPacket,
      activeModalBlocksDesk: hasModalActive && !compactText.includes("President's Desk") && !compactText.includes('Decide now'),
      textSample: compactText.slice(0, 1200),
    };
  }, flow.decisionTitle, flow.responseLabel);
  const deskBlockedWhileDecisionActive = deskBlockEvidence.activeModalBlocksDesk || deskBlockEvidence.hasDeskPacket;
  summary.evidence.deskBlockEvidence ??= {};
  summary.evidence.deskBlockedWhileDecisionActive ??= {};
  summary.evidence.deskBlockEvidence[flow.faction] = deskBlockEvidence;
  summary.evidence.deskBlockedWhileDecisionActive[flow.faction] = deskBlockedWhileDecisionActive;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_desk_blocked_by_foundational_decision`);
  if (!deskBlockedWhileDecisionActive) {
    throw new Error(`${flow.faction} deskBlockedWhileDecisionActive invariant failed: ${JSON.stringify(deskBlockEvidence)}`);
  }

  if (!deskBlockEvidence.hasModalActive) {
    await clickByText(page, 'Decide now');
  }
  await waitForVisibleText(page, flow.decisionTitle);
  await waitForVisibleText(page, flow.responseLabel);
  await assertToolbarRoutesDisabled(page, summary, flow);
  const decisionDialog = await dialogText(page);
  if (!decisionDialog.includes(flow.decisionTitle) || !decisionDialog.includes(flow.responseLabel)) {
    throw new Error(`${flow.faction} foundational decision modal did not show expected option: ${decisionDialog}`);
  }
  assertNoDecisionKnowledgeLeaks(`${flow.faction} foundational decision modal`, decisionDialog);
  assertNoFutureKnowledgeLeaks(`${flow.faction} foundational decision modal`, decisionDialog);
  summary.evidence.decisionKnowledgeLeaksAbsentByFaction ??= {};
  summary.evidence.decisionKnowledgeLeaksAbsentByFaction[flow.faction] = true;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_foundational_decision`);

  await clickByText(page, flow.responseLabel);
  await waitUntilDialogTextAbsent(page, 'Presidential Response');
  await dismissTutorialIfPresent(page);
  summary.evidence.allFactionFoundationalFlows ??= {};
  summary.evidence.allFactionFoundationalFlows[flow.faction] = {
    eventId: flow.eventId,
    decisionTitle: flow.decisionTitle,
    responseLabel: flow.responseLabel,
    responseId: flow.responseId,
    resolved: true,
  };
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_after_decision_receipt`);
}

async function verifyFirstHourDecisionRoomKnowledgeBoundary(page, summary, flow) {
  await clickSelector(page, '[data-testid="warroom-toolbar-command-surface"]', 'Decision Room');
  await page.waitForSelector('[data-testid="command-card-strip"]', { timeout: 30000 });
  const commandStripText = await visibleSelectorText(page, '[data-testid="command-card-strip"]', 'Command Surface');
  assertNoFirstHourKnowledgeLeaks(`${flow.faction} Command Surface`, commandStripText);
  const selectedCard = await page.evaluate(() => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const cards = Array.from(document.querySelectorAll('[data-testid^="command-card-"]'))
      .filter((el) => el instanceof HTMLElement && isVisible(el) && !String(el.getAttribute('data-testid')).includes('fallback'))
      .sort((a, b) => {
        const urgentDelta = Number(b.getAttribute('data-awwv-required-count') ?? 0) - Number(a.getAttribute('data-awwv-required-count') ?? 0);
        if (urgentDelta !== 0) return urgentDelta;
        return Number(b.getAttribute('data-awwv-count') ?? 0) - Number(a.getAttribute('data-awwv-count') ?? 0);
      });
    const target = cards[0];
    if (!(target instanceof HTMLElement)) return null;
    const testId = target.getAttribute('data-testid');
    target.click();
    return testId;
  });
  if (!selectedCard) throw new Error(`${flow.faction} Command Surface did not expose a selectable command card`);
  await page.waitForSelector('[data-testid="warroom-decision-room-host"], [data-testid="presidential-decision-room"]', { timeout: 30000 });
  const decisionRoomText = await visibleSelectorText(
    page,
    '[data-testid="warroom-decision-room-host"], [data-testid="presidential-decision-room"]',
    'Decision Room',
  );
  assertNoFirstHourKnowledgeLeaks(`${flow.faction} Decision Room`, decisionRoomText);
  summary.evidence.futureKnowledgeLeaksAbsentByFaction ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction] ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction].commandSurface = true;
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction].decisionRoom = true;
  summary.evidence.firstHourDecisionRoomCardByFaction ??= {};
  summary.evidence.firstHourDecisionRoomCardByFaction[flow.faction] = selectedCard;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_decision_room_knowledge_boundary`);
  await clickSelector(page, '[data-testid="warroom-decision-room-close"]', 'Decision Room close');
  await waitForSelectorHidden(page, '[data-testid="warroom-decision-room-host"]');
}

async function verifyFirstHourCodexKnowledgeBoundary(page, summary, flow) {
  await clickSelector(page, '[data-testid="chronicle-close"]', 'Chronicle close');
  await waitForSelectorHidden(page, '[data-testid="chronicle-overlay"]');
  await clickSelector(page, '[data-testid="toolbar-route-codex"]', 'Codex toolbar route');
  await page.waitForSelector('[data-testid="codex-panel"]', { timeout: 30000 });
  const codexText = await visibleSelectorText(page, '[data-testid="codex-panel"]', 'Codex');
  assertNoFirstHourKnowledgeLeaks(`${flow.faction} Codex`, codexText);
  summary.evidence.futureKnowledgeLeaksAbsentByFaction ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction] ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction].codex = true;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_codex_knowledge_boundary`);
  await clickSelector(page, '[data-testid="codex-close"]', 'Codex close');
  await waitForSelectorHidden(page, '[data-testid="codex-panel"]');
}

async function verifyDecisionRecordsAndChronicle(page, summary, flow) {
  if (await clickSelectorIfVisible(page, '[data-testid="desk-close-overlay"]')) {
    await waitForSelectorHidden(page, '[data-testid="desk-close-overlay"]');
  }
  await clickSelector(page, '[data-testid="warroom-toolbar-staff"]', 'Army HQ Warroom route');
  await waitForVisibleText(page, 'BRIEFING');
  await clickByText(page, 'RECORDS');
  await waitForVisibleText(page, 'Archive Routes');
  await assertTurnZeroRecordsProvenanceCounts(page, summary, flow);
  await captureEvidence(page, summary, 'army_hq_records');
  await waitForVisibleText(page, 'Latest Filed Decision');
  await waitForVisibleText(page, flow.decisionTitle);
  await waitForVisibleText(page, 'Chronicle Decisions');
  await waitForVisibleText(page, '1');
  const recordsSummaryText = await visibleSurfaceText(page, [
    'Archive Routes',
    'Chronicle Decisions',
    flow.decisionTitle,
  ]);
  assertNoFirstHourKnowledgeLeaks('Army HQ Records summary', recordsSummaryText);
  summary.evidence.receiptChecksByFaction ??= {};
  summary.evidence.receiptChecksByFaction[flow.faction] = {
    eventId: flow.eventId,
    decisionTitle: flow.decisionTitle,
    responseLabel: flow.responseLabel,
    records: false,
    chronicle: false,
  };
  summary.evidence.recordsSummaryShowsChronicleFiledDecision = true;
  await clickFirstMatchingText(page, ['DECISION LOG', 'Decision Log', 'Decisions', 'DECISIONS']);
  await page.waitForSelector('[aria-label="Decision consequence records"]', { timeout: 30000 });
  await waitForVisibleText(page, 'Decision Consequences');
  await waitForVisibleText(page, 'No presidential decision consequences have been filed yet.');
  summary.evidence.recordsReceiptAppears = false;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_records_decision_receipt`);
  const recordsText = await visibleSurfaceText(page, [
    'Decision Consequences',
    'No presidential decision consequences have been filed yet.',
  ]);
  if (recordsText.includes(flow.responseLabel)) {
    throw new Error(`${flow.faction} Chronicle-filed response appeared inside Army HQ Records decision log`);
  }
  assertNoFirstHourKnowledgeLeaks('Army HQ Records', recordsText);
  summary.evidence.rawFirstHourLabelsAbsentByFaction ??= {};
  summary.evidence.rawFirstHourLabelsAbsentByFaction[flow.faction] ??= {};
  summary.evidence.rawFirstHourLabelsAbsentByFaction[flow.faction].records = true;

  await clickFirstMatchingText(page, ['Open Chronicle', 'CHRONICLE', 'Chronicle']);
  await waitForVisibleText(page, 'War Chronicle');
  await waitForVisibleText(page, flow.decisionTitle);
  const chronicleText = await visibleSurfaceText(page, [
    'War Chronicle',
    flow.decisionTitle,
  ]);
  assertNoFirstHourKnowledgeLeaks('Chronicle', chronicleText);
  summary.evidence.chronicleReceiptAppears = true;
  summary.evidence.receiptChecksByFaction[flow.faction].chronicle = true;
  summary.evidence.rawFirstHourLabelsAbsentByFaction[flow.faction].chronicle = true;
  summary.evidence.futureKnowledgeLeaksAbsentByFaction ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction] ??= {};
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction].records = true;
  summary.evidence.futureKnowledgeLeaksAbsentByFaction[flow.faction].chronicle = true;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_chronicle_decision_receipt`);
}

async function assertTurnZeroRecordsProvenanceCounts(page, summary, flow) {
  const counts = await page.evaluate(() => {
    const readCount = (id) => {
      const tab = document.querySelector(`[data-testid="records-subtab-${id}"]`);
      if (!(tab instanceof HTMLElement)) return null;
      const count = Array.from(tab.querySelectorAll('span'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((text) => /^\d+$/.test(text))
        .at(-1);
      return count == null ? null : Number(count);
    };
    return {
      aftermath: readCount('aftermath'),
      aar: readCount('aar'),
    };
  });

  if (counts.aftermath !== 0 || counts.aar !== 0) {
    throw new Error(`${flow.faction} turn-0 Records provenance leaked into normal history: aftermath=${counts.aftermath}, aar=${counts.aar}`);
  }

  summary.evidence.turnZeroRecordsProvenanceCountsByFaction ??= {};
  summary.evidence.turnZeroRecordsProvenanceCountsByFaction[flow.faction] = counts;
}

async function run() {
  cleanBrowserGateOutputDir();
  const summary = {
    ok: false,
    url: URL,
    outDir: path.relative(ROOT, OUT_DIR).replace(/\\/g, '/'),
    steps: [],
    evidence: {
      serverPortCleanupVerified: false,
    },
    consoleMessages: [],
    requestFailures: [],
    httpFailures: [],
    browserGatePhase: 'setup',
  };
  const server = process.env.AWWV_FIRST_HOUR_BROWSER_URL ? null : startDevServer();
  let caughtError = null;

  try {
    if (server) await waitForServer(URL);

    const puppeteer = require('puppeteer');
    const chromeExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      || process.env.AWWV_CHROME_EXECUTABLE
      || [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ].find((candidate) => fs.existsSync(candidate));

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromeExecutablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1440, height: 1000 },
    });

    try {
      const page = await browser.newPage();
      page.on('console', (message) => summary.consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
        browserGatePhase: summary.browserGatePhase,
      }));
      page.on('pageerror', (error) => summary.consoleMessages.push({
        kind: 'pageerror',
        text: error.message,
        browserGatePhase: summary.browserGatePhase,
      }));
      page.on('requestfailed', (request) => summary.requestFailures.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failureText: request.failure()?.errorText ?? 'unknown',
      }));
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
          const request = response.request();
          summary.httpFailures.push({
            url: response.url(),
            status,
            statusText: response.statusText(),
            method: request.method(),
            resourceType: request.resourceType(),
          });
        }
      });

      if (RUN_OPENING_VISUAL_MATRIX) {
        summary.browserGatePhase = 'opening-visual-matrix';
        await runOpeningVisualMatrix(page, summary);
      }

      for (const flow of FACTION_OPENING_FLOWS) {
        summary.browserGatePhase = `proof:${flow.faction}`;
        await runFoundationalFlow(page, summary, flow);
        await verifyFirstHourDecisionRoomKnowledgeBoundary(page, summary, flow);
        if (flow.receiptCheck) {
          await verifyDecisionRecordsAndChronicle(page, summary, flow);
          await verifyFirstHourCodexKnowledgeBoundary(page, summary, flow);
        }
      }

      summary.browserGatePhase = 'teardown';
    } finally {
      await browser.close();
    }
    assertNoConsoleErrors(summary.consoleMessages);
    assertNoNetworkFailures(summary.requestFailures, summary.httpFailures);
    summary.ok = true;
  } catch (error) {
    caughtError = error;
    summary.ok = false;
    summary.error = error instanceof Error ? error.message : String(error);
    if (server) console.error(server.getLog());
  } finally {
    if (server) {
      await server.stop();
      summary.evidence.serverPortCleanupVerified = true;
    }
    if (summary.ok) {
      const evidencePath = path.join(OUT_DIR, 'first_hour_browser_gate.json');
      fs.writeFileSync(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
      console.log('first-hour browser gate ok');
      console.log(`evidence: ${evidencePath}`);
    } else {
      const evidencePath = path.join(OUT_DIR, 'first_hour_browser_gate_failed.json');
      fs.writeFileSync(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }
  }
  if (caughtError) throw caughtError;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
