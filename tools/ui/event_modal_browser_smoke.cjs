#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_EVENT_MODAL_SMOKE_PORT || 3227);
const URL = process.env.AWWV_EVENT_MODAL_SMOKE_URL || `http://127.0.0.1:${PORT}/?dev=1`;
const OUT_DIR = process.env.AWWV_EVENT_MODAL_SMOKE_OUT_DIR
  || path.join(ROOT, '.tmp_event_modal_browser_proof');
const EVENT_FILE = path.join(ROOT, 'data', 'scenarios', 'events', 'war_1992.json');
const SAVE_FILE = path.join(ROOT, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
const EVENT_ID = process.env.AWWV_EVENT_MODAL_SMOKE_EVENT_ID || 'rbih_state_identity';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findEvent() {
  const events = readJson(EVENT_FILE);
  const event = events.find((entry) => entry.id === EVENT_ID);
  if (!event) throw new Error(`Event ${EVENT_ID} not found in ${EVENT_FILE}`);
  return event;
}

function buildPendingDecision(event) {
  return {
    event_id: event.id,
    event_title: event.title || event.narrative || event.id,
    narrative: event.narrative,
    situation: event.situation,
    category: event.category,
    historical_source: event.historical_source,
    source_note: event.source_note,
    source: event.source,
    staff_assessment: event.staff_assessment,
    trigger_evidence: event.trigger_evidence,
    turn_fired: event.trigger?.turn_min ?? 1,
    faction: event.responding_faction,
    requires_player_response: event.requires_player_response,
    historical_default_response_id: event.historical_default_response_id,
    response_options: event.response_options || [],
  };
}

function buildSaveWithPendingDecision(event) {
  const save = readJson(SAVE_FILE);
  save.meta = { ...(save.meta || {}), player_faction: event.responding_faction, phase: 'war' };
  save.military = { ...(save.military || {}) };
  save.military.pending_event_decisions = [buildPendingDecision(event)];
  return save;
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

function startDevServer() {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? [
      '/d',
      '/s',
      '/c',
      `npm.cmd run dev:map -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    ]
    : [
      'run',
      'dev:map',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT),
      '--strictPort',
    ];
  let stopping = false;
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  let log = '';
  const collect = (chunk) => {
    log += chunk.toString();
    if (log.length > 20000) log = log.slice(-20000);
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (code !== null && code !== 0) {
      console.error(`[event-modal-smoke] dev server exited with code ${code}`);
      console.error(log);
    } else if (signal) {
      console.error(`[event-modal-smoke] dev server exited via ${signal}`);
    }
  });
  return {
    child,
    getLog: () => log,
    stop: async () => {
      if (child.exitCode !== null) return;
      stopping = true;
      if (process.platform === 'win32') {
        spawn(process.env.ComSpec || 'cmd.exe', [
          '/d',
          '/s',
          '/c',
          `taskkill /pid ${child.pid} /T /F`,
        ], { stdio: 'ignore' });
      } else {
        child.kill();
      }
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        child.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    },
  };
}

async function visibleDialogText(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  });
}

async function run() {
  ensureDir(OUT_DIR);
  const event = findEvent();
  const save = buildSaveWithPendingDecision(event);
  const server = process.env.AWWV_EVENT_MODAL_SMOKE_URL ? null : startDevServer();

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
      await page.waitForSelector('[role="dialog"] #event-decision-title', { timeout: 30000 });

      const dialogText = await visibleDialogText(page);
      const evidence = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const title = document.querySelector('#event-decision-title')?.textContent?.trim() ?? null;
        const labels = Array.from(dialog?.querySelectorAll('button') ?? [])
          .map((button) => button.textContent?.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        return {
          title,
          role: dialog?.getAttribute('role') ?? null,
          ariaLabelledBy: dialog?.getAttribute('aria-labelledby') ?? null,
          text: dialog?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          buttons: labels,
          bodyHasDecisionRoom: (document.body?.innerText ?? '').includes('Decision Room'),
          dialogHasDecisionRoom: (dialog?.textContent ?? '').includes('Decision Room'),
          dialogHasDesk: (dialog?.textContent ?? '').includes("President's Desk"),
        };
      });

      const requiredSnippets = [
        event.title,
        'Situation',
        event.source_note,
        event.staff_assessment,
        event.trigger_evidence[0],
        'Historical default',
        'AI historical path for calibration',
        'morale +3',
        'international standing +15',
        'Campaign record updated: Civic',
      ];
      const missing = requiredSnippets.filter((snippet) => snippet && !dialogText.includes(snippet));
      if (missing.length > 0) {
        throw new Error(`Modal dialog missing expected text: ${missing.join(' | ')}`);
      }
      if (evidence.dialogHasDecisionRoom || evidence.dialogHasDesk) {
        throw new Error('Event decision dialog contains Desk/Decision Room text instead of the direct modal surface');
      }

      const screenshotPath = path.join(OUT_DIR, 'event_modal_browser_smoke.png');
      const evidencePath = path.join(OUT_DIR, 'event_modal_browser_smoke.json');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      fs.writeFileSync(evidencePath, `${JSON.stringify({
        ok: true,
        url: URL,
        event_id: event.id,
        title: event.title,
        screenshot: screenshotPath,
        evidence,
        consoleMessages: consoleMessages.slice(-20),
      }, null, 2)}\n`, 'utf8');

      console.log(`event modal browser smoke ok: ${event.id}`);
      console.log(`evidence: ${evidencePath}`);
      console.log(`screenshot: ${screenshotPath}`);
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (server) {
      console.error(server.getLog());
    }
    throw error;
  } finally {
    if (server) await server.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
