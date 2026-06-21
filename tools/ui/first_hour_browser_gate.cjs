#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_FIRST_HOUR_BROWSER_PORT || 3237);
const URL = process.env.AWWV_FIRST_HOUR_BROWSER_URL || `http://127.0.0.1:${PORT}/?dev=1`;
const OUT_DIR = process.env.AWWV_FIRST_HOUR_BROWSER_OUT_DIR
  || path.join(ROOT, '.tmp_first_hour_browser_gate');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');

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
    env: { ...process.env, BROWSER: 'none' },
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

async function clickByText(page, text) {
  const clicked = await page.evaluate((needle) => {
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

function assertNoConsoleErrors(consoleMessages) {
  const errors = consoleMessages.filter((message) => {
    if (message.kind === 'pageerror') return true;
    if (message.type !== 'error') return false;
    const url = message.location?.url ?? '';
    const isMissingFavicon = /Failed to load resource/i.test(message.text) && /\/favicon\.ico$/i.test(url);
    return !isMissingFavicon;
  });
  if (errors.length > 0) {
    throw new Error(`Browser console errors detected: ${JSON.stringify(errors.slice(0, 10), null, 2)}`);
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
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_main_menu`);

  await clickSelector(page, `[data-testid="main-menu-faction-${flow.faction}"]`, `${flow.faction} faction`);
  await waitForVisibleText(page, 'WAR HAS STARTED');
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_war_start_splash`);

  await clickByText(page, 'Acknowledge');
  await waitForVisibleText(page, 'WAR BEGINS');
  const identityDialog = await dialogText(page);
  if (!identityDialog.includes(flow.identityNeedle)) {
    throw new Error(`${flow.faction} WAR BEGINS identity dialog did not show expected copy: ${identityDialog}`);
  }
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_war_begins_identity`);

  await clickByText(page, 'Begin');
  await waitUntilTextAbsent(page, 'WAR BEGINS');
  await waitForVisibleText(page, 'President');
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_opening_brief`);

  await clickFirstMatchingText(page, ['Open Desk', 'President', 'Desk', 'Begin at Desk', 'Open President']);
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
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_foundational_decision`);

  await clickSelector(
    page,
    `[data-testid="event-decision-response"][data-event-id="${flow.eventId}"][data-response-id="${flow.responseId}"]`,
    `${flow.faction} foundational response ${flow.responseId}`,
  );
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

async function verifyDecisionRecordsAndChronicle(page, summary, flow) {
  await clickSelector(page, '[data-testid="desk-close-overlay"]', 'Desk close');
  await waitForSelectorHidden(page, '[data-testid="desk-close-overlay"]');
  await page.keyboard.press('h');
  await waitForVisibleText(page, 'BRIEFING');
  await clickByText(page, 'RECORDS');
  await waitForVisibleText(page, 'Archive Routes');
  await assertTurnZeroRecordsProvenanceCounts(page, summary, flow);
  await captureEvidence(page, summary, 'army_hq_records');
  await clickFirstMatchingText(page, ['DECISION LOG', 'Decision Log', 'Decisions', 'DECISIONS']);
  await page.waitForSelector('[aria-label="Decision consequence records"]', { timeout: 30000 });
  await waitForVisibleText(page, 'Decision Consequences');
  await waitForVisibleText(page, flow.decisionTitle);
  await waitForVisibleText(page, 'Decision recorded');
  await waitForVisibleText(page, 'Filed to Chronicle');
  summary.evidence.receiptChecksByFaction ??= {};
  summary.evidence.receiptChecksByFaction[flow.faction] = {
    eventId: flow.eventId,
    decisionTitle: flow.decisionTitle,
    responseLabel: flow.responseLabel,
    records: true,
    chronicle: false,
  };
  summary.evidence.recordsReceiptAppears = true;
  await captureEvidence(page, summary, `${flow.faction.toLowerCase()}_records_decision_receipt`);
  const recordsText = await visibleSurfaceText(page, [
    'Decision Consequences',
    flow.decisionTitle,
    flow.responseLabel,
  ]);
  assertRawLabelsAbsent('Army HQ Records', recordsText);
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
  assertRawLabelsAbsent('Chronicle', chronicleText);
  summary.evidence.chronicleReceiptAppears = true;
  summary.evidence.receiptChecksByFaction[flow.faction].chronicle = true;
  summary.evidence.rawFirstHourLabelsAbsentByFaction[flow.faction].chronicle = true;
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
  ensureDir(OUT_DIR);
  ensureDir(SCREENSHOT_DIR);
  const summary = {
    ok: false,
    url: URL,
    outDir: path.relative(ROOT, OUT_DIR).replace(/\\/g, '/'),
    steps: [],
    evidence: {
      serverPortCleanupVerified: false,
    },
    consoleMessages: [],
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
      }));
      page.on('pageerror', (error) => summary.consoleMessages.push({
        kind: 'pageerror',
        text: error.message,
      }));

      for (const flow of FACTION_OPENING_FLOWS) {
        await runFoundationalFlow(page, summary, flow);
        if (flow.receiptCheck) {
          await verifyDecisionRecordsAndChronicle(page, summary, flow);
        }
      }

      assertNoConsoleErrors(summary.consoleMessages);
      summary.ok = true;
    } finally {
      await browser.close();
    }
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
