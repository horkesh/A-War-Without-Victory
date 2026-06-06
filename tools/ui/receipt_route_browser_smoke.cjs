#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_RECEIPT_ROUTE_SMOKE_PORT || 3231);
const URL = process.env.AWWV_RECEIPT_ROUTE_SMOKE_URL || `http://127.0.0.1:${PORT}/?dev=1&view=warroom`;
const OUT_DIR = process.env.AWWV_RECEIPT_ROUTE_SMOKE_OUT_DIR
  || path.join(ROOT, '.tmp_receipt_route_browser_proof');
const SAVE_FILE = path.join(ROOT, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildReceiptRouteSave() {
  const save = readJson(SAVE_FILE);
  save.meta = {
    ...(save.meta || {}),
    player_faction: 'RS',
    phase: 'war',
    turn: 44,
  };
  save.military = {
    ...(save.military || {}),
    pending_event_decisions: [],
    pending_event_notifications: [],
    pending_convoy_decisions: [],
    patron_defiance_supply_cuts: [
      { faction: 'RS', turn: 44, cut_fraction: 0.35, support_after: 0.45 },
    ],
  };
  save.turn_summaries = [];
  save.operation_history = [
    {
      operation_id: 'receipt_route_hist_op',
      operation_name: 'Receipt Route Historic Operation',
      corps_id: 'vrs_1st_krajina',
      faction: 'RS',
      started_turn: 42,
      ended_turn: 43,
      outcome: 'success',
      objectives_targeted: [],
      objectives_captured: [],
      objectives_logged_captured: [],
      objectives_held_without_logged_capture: [],
      capture_provenance: 'no_objectives_held',
      total_attacks: 1,
      casualties_suffered: { killed: 0, wounded: 0 },
      casualties_inflicted: { killed: 0, wounded: 0 },
      equipment_lost: { tanks: 0, artillery: 0 },
      equipment_destroyed: { tanks: 0, artillery: 0 },
      equipment_captured: { tanks: 0, artillery: 0 },
      grade: { stars: 2, verdict: 'solid', factors: {} },
      duration_turns: 1,
      weekly_log: [],
    },
  ];
  return save;
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
      console.error(`[receipt-route-smoke] dev server exited with code ${code}`);
      console.error(log);
    } else if (signal) {
      console.error(`[receipt-route-smoke] dev server exited via ${signal}`);
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
      console.log(`[receipt-route-smoke] dev server cleanup verified: port ${PORT} is not listening`);
    },
  };
}

async function visibleText(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function waitForVisibleText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (needle) => (document.body?.innerText ?? '').toLowerCase().includes(needle.toLowerCase()),
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

async function visibleButtonLabels(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('button, [role="button"], a'))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((el) => [
      el.textContent,
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean));
}

async function waitForButtonLabel(page, text, timeout = 30000) {
  const started = Date.now();
  const normalizedNeedle = text.toLowerCase();
  let labels = [];
  while (Date.now() - started < timeout) {
    labels = await visibleButtonLabels(page);
    if (labels.some((label) => label.toLowerCase().includes(normalizedNeedle))) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No visible clickable control matched "${text}". Visible labels: ${labels.join(' | ')}`);
}

async function run() {
  ensureDir(OUT_DIR);
  const save = buildReceiptRouteSave();
  const server = process.env.AWWV_RECEIPT_ROUTE_SMOKE_URL ? null : startDevServer();

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
      const consoleMessages = [];
      page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function', { timeout: 30000 });
      await page.evaluate((payload) => window.handleManualSaveLoad(payload), save);

      await waitForVisibleText(page, "President's Desk");
      await clickByText(page, "President's Desk");
      await waitForVisibleText(page, 'Recent Consequences');
      await waitForVisibleText(page, 'Patron defiance supply cut');

      await clickByText(page, 'Patron defiance supply cut');
      await waitForVisibleText(page, 'Decision Consequences');
      await waitForVisibleText(page, 'Filed to Records');
      await waitForVisibleText(page, 'Review in Records');
      await waitForButtonLabel(page, 'After-Action Report0');
      await waitForButtonLabel(page, 'Operation History1');

      const evidence = await page.evaluate(() => {
        const bodyText = document.body?.innerText ?? '';
        const lowerBodyText = bodyText.toLowerCase();
        return {
          hasDecisionRecords: lowerBodyText.includes('decision consequences'),
          hasRecordsFiled: lowerBodyText.includes('filed to records'),
          hasAarZero: Array.from(document.querySelectorAll('button')).some((button) =>
            (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase().includes('after-action report0')
          ),
          hasOperationHistoryOne: Array.from(document.querySelectorAll('button')).some((button) =>
            (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase().includes('operation history1')
          ),
          bodyTextSample: bodyText.replace(/\s+/g, ' ').slice(0, 1200),
        };
      });

      if (!evidence.hasDecisionRecords || !evidence.hasRecordsFiled) {
        throw new Error(`Patron consequence did not route to Decision consequence records: ${JSON.stringify(evidence)}`);
      }
      if (!evidence.hasAarZero || !evidence.hasOperationHistoryOne) {
        throw new Error(`AAR and Operation History counts did not remain split: ${JSON.stringify(evidence)}`);
      }
      const screenshotPath = path.join(OUT_DIR, 'receipt_route_browser_smoke.png');
      const evidencePath = path.join(OUT_DIR, 'receipt_route_browser_smoke.json');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      fs.writeFileSync(evidencePath, `${JSON.stringify({
        ok: true,
        url: URL,
        screenshot: screenshotPath,
        evidence,
        consoleMessages: consoleMessages.slice(-20),
      }, null, 2)}\n`, 'utf8');

      console.log('receipt route browser smoke ok');
      console.log(`evidence: ${evidencePath}`);
      console.log(`screenshot: ${screenshotPath}`);
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (server) console.error(server.getLog());
    throw error;
  } finally {
    if (server) await server.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
