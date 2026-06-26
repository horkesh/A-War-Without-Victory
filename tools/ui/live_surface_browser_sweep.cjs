#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { resolveBrowserGateEnv } = require('./browser_gate_pmtiles_env.cjs');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_LIVE_SURFACE_BROWSER_PORT || 3239);
const URL = process.env.AWWV_LIVE_SURFACE_BROWSER_URL || `http://127.0.0.1:${PORT}/?dev=1`;
const LOCALE = String(process.env.AWWV_LIVE_SURFACE_BROWSER_LOCALE || process.env.AWWV_UI_LOCALE || 'en').toLowerCase();
const OUT_DIR = process.env.AWWV_LIVE_SURFACE_BROWSER_OUT_DIR
  || path.join(ROOT, '.tmp_live_surface_browser_sweep');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
const STARTUP_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
const RECORDS_AAR_FIXTURE_OSID = 'op:gradacac:donja_tramosnica_2';
const RECORDS_AAR_FIXTURE_ATTACKER_ID = 'arbih_213th_vitezka_mountain';
const RECORDS_AAR_FIXTURE_DEFENDER_ID = 'rs_1st_birac';
const OPPORTUNITY_LIVE_FIXTURE_ID = 'live_window';
const OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID = 'live_window';

const RAW_TECHNICAL_TOKENS = [
  { label: 'OPSEC', pattern: /\bOPSEC\b/ },
  { label: 'SITREP', pattern: /\bSITREP\b/ },
  { label: 'IVP', pattern: /\bIVP\b/ },
  { label: 'PAX', pattern: /\bPAX\b/ },
  { label: 'OSID', pattern: /\bOSIDs?\b/i },
  { label: 'Expires T', pattern: /\bExpires\s+T\b/i },
  { label: 'T+ timing', pattern: /\bT\+\d+\b/ },
  { label: 'DELAYS', pattern: /\bDELAYS\b/ },
  { label: 'OBJ', pattern: /\bOBJ\b/ },
  { label: 'ATK', pattern: /\bATK\b/ },
  { label: 'DEF', pattern: /\bDEF\b/ },
  { label: 'att / def', pattern: /\batt\s*(?:\/|·|\|)\s*def\b/i },
  { label: 'W/L/D', pattern: /\bW\s*\/\s*L\s*\/\s*D\b/i },
  { label: 'active / total', pattern: /\bactive\s*\/\s*total\b/i },
  { label: 'cap / lost', pattern: /\bcap\s*\/\s*lost\b/i },
  { label: 'convoy_decision', pattern: /\bconvoy_decision\b/i },
  { label: 'STRAIN-SHAPED', pattern: /\bSTRAIN-SHAPED\b/ },
  { label: 'raw planning ids', pattern: /\b(?:eligible_pending_review|not_applicable|surprise_counter_offer|union_3_republics_extra|tactical_commander|in_transit|tier_1|homeDistance|ambush_risk|defender_opsec)\b/i },
  { label: 'op:', pattern: /\bop:/i },
  { label: '.json', pattern: /\.json\b/i },
];

const BCS_ENGLISH_LEAK_TOKENS = [
  { label: 'order interpretation EN header', pattern: /\bORDER INTERPRETATIONS\s*-\s*\d+\s+PENDING\b/ },
  { label: 'Officer morale EN relief', pattern: /\bOfficer morale\s+-?\d+\s+if relieved\b/i },
  { label: 'Enemy offensive fallback', pattern: /\bEnemy offensive threatens corps integrity\b/i },
  { label: 'Hold defensive fallback', pattern: /\bHold defensive positions and absorb the offensive;\s*request reinforcement from Army HQ\b/i },
  { label: 'Command briefing EN no activity', pattern: /\bNo significant activity to report\b/i },
  { label: 'Command briefing EN review headline', pattern: /\b\d+\s+items?\s+for your review\b/i },
  { label: 'Command briefing EN critical headline', pattern: /\b\d+\s+critical\s+items?\s+requires?\s+attention\b/i },
  { label: 'Command briefing EN supply fallback', pattern: /\bSupply lines critically exposed\b/i },
  { label: 'Command briefing EN peace plan fallback', pattern: /\bPeace plan requires response\b/i },
  { label: 'Command briefing EN patron fallback', pattern: /\bPatron override imminent\b/i },
  { label: 'Command briefing EN action fallback', pattern: /\bReview\s+(?:Supply|Plan|Officers)\b/i },
  { label: 'Command briefing EN modal fallback', pattern: /\bNo command briefing packet is available yet\b/i },
];

const LIVE_SURFACES = [
  {
    name: 'Desk',
    open: async (page) => {
      await clickByText(page, 'Desk');
      await waitForVisibleText(page, "President's Desk");
      await waitForVisibleText(page, 'Strategic Situation');
    },
    expectedSurface: 'Desk',
  },
  {
    name: 'War Map',
    open: async (page) => {
      await clickFirstMatchingText(page, ['War Map', 'FIELD']);
      await waitForTacticalMap(page);
    },
    expectedSurface: 'War Map',
  },
  {
    name: 'Army HQ',
    open: async (page) => {
      await clickByText(page, 'Army HQ');
      await waitForVisibleText(page, 'Army HQ');
      await waitForVisibleText(page, 'BRIEFING');
    },
    expectedSurface: 'Army HQ',
  },
  {
    name: 'Records',
    open: async (page) => {
      await clickByText(page, 'Records');
      await waitForVisibleText(page, 'Archive Routes');
      await waitForVisibleText(page, 'Latest Decision');
    },
    expectedSurface: 'Records',
  },
  {
    name: 'Chronicle',
    open: async (page) => {
      await clickByText(page, 'Chronicle');
      await waitForVisibleText(page, 'War Chronicle');
    },
    expectedSurface: 'Chronicle',
  },
  {
    name: 'Codex',
    open: async (page) => {
      await clickByText(page, 'Codex');
      await waitForVisibleText(page, 'Essays');
      await waitForVisibleText(page, 'Codex');
    },
    expectedSurface: 'Codex',
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildRecordsAarLiveProofFixtureState() {
  const state = readJson(STARTUP_SAVE_PATH);
  const fixtureState = typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
  fixtureState.meta = {
    ...(fixtureState.meta ?? {}),
    turn: 1,
    player_faction: 'RBiH',
    tutorial_state: { dismissed: true, completed_steps: [] },
  };
  fixtureState.turn_summaries = [
    {
      turn: 1,
      battles: [
        {
          osid: RECORDS_AAR_FIXTURE_OSID,
          mun_id: 'gradacac',
          attacker_faction: 'RBiH',
          defender_faction: 'RS',
          primary_attacker_id: RECORDS_AAR_FIXTURE_ATTACKER_ID,
          primary_defender_id: RECORDS_AAR_FIXTURE_DEFENDER_ID,
          all_attacker_ids: [RECORDS_AAR_FIXTURE_ATTACKER_ID],
          outcome: 'stalemate',
          attacker_casualties: 12,
          defender_casualties: 9,
          territory_flipped: false,
          was_concentrated: false,
          defender_contributions: [
            {
              brigade_id: RECORDS_AAR_FIXTURE_DEFENDER_ID,
              distance_hops: 0,
              is_home_municipality: false,
              reactive_weight: 1,
              casualties_taken: 9,
            },
          ],
        },
      ],
      territory_net: {},
      notable_flips: [],
      displacement_total: 0,
      displacement_by_ethnicity: {},
      decoration_awards: [],
      arc_transitions: [],
      formation_spawns: [],
      formation_destructions: [],
      supply_deltas: {},
      heavy_munitions_deltas: {},
      movements: [],
      supply_transitions: [],
      events_fired: [],
      notable_events: [],
    },
  ];
  return fixtureState;
}

function buildTurnZeroSetupProvenanceFixtureState() {
  const state = readJson(STARTUP_SAVE_PATH);
  const fixtureState = typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
  fixtureState.meta = {
    ...(fixtureState.meta ?? {}),
    turn: 0,
    player_faction: 'RBiH',
    tutorial_state: { dismissed: true, completed_steps: [] },
  };
  fixtureState.turn_summaries = [
    {
      turn: 0,
      battles: [
        {
          osid: 'op:test:setup',
          mun_id: 'test',
          attacker_faction: 'RS',
          defender_faction: 'RBiH',
          primary_attacker_id: 'rs_setup_probe',
          primary_defender_id: 'arbih_setup_guard',
          all_attacker_ids: ['rs_setup_probe'],
          outcome: 'breakthrough',
          attacker_casualties: 25,
          defender_casualties: 80,
          territory_flipped: false,
          was_concentrated: false,
        },
      ],
      territory_net: { RBiH: -4, RS: 4 },
      notable_flips: [
        { osid: 'op:test:setup', mun_id: 'test', from: 'RS', to: 'RBiH', significance: 'initial_control' },
      ],
      displacement_total: 2400,
      displacement_by_ethnicity: { Bosniak: 1800, Serb: 600 },
      decoration_awards: [],
      arc_transitions: [],
      formation_spawns: [{ formation_id: 'arbih_setup_guard', formation_name: 'Setup Guard', faction: 'RBiH' }],
      formation_destructions: [{ formation_id: 'rs_setup_loss', formation_name: 'Setup Loss', faction: 'RS' }],
      supply_deltas: {},
      heavy_munitions_deltas: {},
      movements: [],
      supply_transitions: [],
      events_fired: [],
      notable_events: [{ kind: 'setup', description: 'Scenario setup marker.', faction: 'RBiH' }],
    },
  ];
  return fixtureState;
}

function buildPlayerFactionStartupFixtureState(faction) {
  const state = readJson(STARTUP_SAVE_PATH);
  const fixtureState = typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
  fixtureState.meta = {
    ...(fixtureState.meta ?? {}),
    turn: 0,
    player_faction: faction,
    tutorial_state: { dismissed: true, completed_steps: [] },
  };
  return fixtureState;
}

function buildOperationOpportunityLiveProofFixtureState() {
  const state = readJson(STARTUP_SAVE_PATH);
  const fixtureState = typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
  fixtureState.meta = {
    ...(fixtureState.meta ?? {}),
    turn: 1,
    player_faction: 'RBiH',
    tutorial_state: { dismissed: true, completed_steps: [] },
    pending_proposal_reviews: [
      {
        id: OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID,
        turn: 1,
        faction: 'RBiH',
        domain: 'ops',
        description: 'Live Window - staff recommendation: approve',
        proposed_action: `OPPORTUNITY:${OPPORTUNITY_LIVE_FIXTURE_ID}`,
        current_value: 'pending_review',
        proposed_value: 'approve',
      },
    ],
  };
  fixtureState.military = {
    ...(fixtureState.military ?? {}),
    operation_opportunities: [
      {
        proposal_id: OPPORTUNITY_LIVE_FIXTURE_ID,
        opportunity_id: OPPORTUNITY_LIVE_FIXTURE_ID,
        status: 'eligible_pending_review',
        approver_faction: 'RBiH',
        eligibility_turn: 1,
        expires_turn: 4,
        last_axis_evaluation: [
          { axis: 'political_authorization', mode: 'required', green: true, reason: 'Presidential review is available.' },
          { axis: 'force_readiness', mode: 'required', green: true, reason: 'Staff reports the window can be authorized.' },
        ],
        last_force_quality_traits: [],
        last_footprint: {
          objectives: ['sarajevo_1'],
          staging_osids: ['sarajevo_1'],
        },
        redirect_variants: [],
      },
    ],
  };
  return fixtureState;
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
    await delay(500);
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function waitForPortClosed(port, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (getPortListenerPids(port).length === 0) return true;
    await delay(250);
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

function quoteCssAttributeValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
    env: resolveBrowserGateEnv(ROOT, 'live-surface-browser-sweep'),
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
      console.error(`[live-surface-browser-sweep] dev server exited with code ${code}`);
      console.error(log);
    } else if (signal) {
      console.error(`[live-surface-browser-sweep] dev server exited via ${signal}`);
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
      console.log(`[live-surface-browser-sweep] dev server cleanup verified: port ${PORT} is not listening`);
    },
  };
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForTacticalMap(page, timeout = 30000) {
  await page.waitForFunction(() => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    if (!(map instanceof HTMLElement)) return false;
    const rect = map.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, { timeout });
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
        const style = window.getComputedStyle(el);
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') <= 0) return false;
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

async function waitForVisibleSelector(page, selector, timeout = 30000) {
  await page.waitForFunction(
    (targetSelector) => {
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
      return Array.from(document.querySelectorAll(targetSelector)).some(isVisible);
    },
    { timeout },
    selector,
  );
}

async function clickVisibleSelector(page, selector, timeout = 30000) {
  await activateVisibleControl(page, selector, timeout);
}

async function activateVisibleControl(page, selector, timeout = 30000) {
  await waitForVisibleSelector(page, selector, timeout);
  const activated = await page.evaluate((targetSelector) => {
    const isVisibleAndEnabled = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const disabled = el instanceof HTMLButtonElement && el.disabled;
      return !disabled
        && rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    };
    const target = Array.from(document.querySelectorAll(targetSelector)).find(isVisibleAndEnabled);
    if (!(target instanceof HTMLElement)) return false;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.click();
    return true;
  }, selector);
  if (!activated) throw new Error(`Visible control could not be activated: ${selector}`);
}

async function isVisibleButtonDisabled(page, selector, timeout = 30000) {
  await waitForVisibleSelector(page, selector, timeout);
  return page.evaluate((targetSelector) => {
    const target = Array.from(document.querySelectorAll(targetSelector)).find((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0;
    });
    return target instanceof HTMLButtonElement && target.disabled;
  }, selector);
}

async function clickFirstVisibleSelector(page, selector, description = selector) {
  await page.waitForFunction(
    (targetSelector) => {
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
      return Array.from(document.querySelectorAll(targetSelector)).some(isVisible);
    },
    { timeout: 30000 },
    selector,
  );
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
  if (!clicked) throw new Error(`No visible ${description} matched selector "${selector}"`);
}

async function visibleSelectorCount(page, selector) {
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
    return Array.from(document.querySelectorAll(targetSelector)).filter(isVisible).length;
  }, selector);
}

async function getVisibleSelectorAttribute(page, selector, attribute, description = selector) {
  await waitForVisibleSelector(page, selector);
  const value = await page.evaluate((targetSelector, attr) => {
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
    return target?.getAttribute(attr) ?? null;
  }, selector, attribute);
  if (value == null) throw new Error(`Visible ${description} did not expose ${attribute}`);
  return value;
}

async function waitForVisibleSelectorAttribute(page, selector, attribute, expected, description = selector) {
  await page.waitForFunction(
    (targetSelector, attr, expectedValue) => {
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
      return Array.from(document.querySelectorAll(targetSelector))
        .filter(isVisible)
        .some((target) => target.getAttribute(attr) === expectedValue);
    },
    { timeout: 30000 },
    selector,
    attribute,
    expected,
  );
}

async function clickVisibleSelectorAt(page, selector, index, description = selector) {
  const clicked = await page.evaluate((targetSelector, targetIndex) => {
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
    const target = Array.from(document.querySelectorAll(targetSelector)).filter(isVisible)[targetIndex];
    if (!(target instanceof HTMLElement)) return false;
    target.click();
    return true;
  }, selector, index);
  if (!clicked) throw new Error(`No visible ${description} matched selector "${selector}" at index ${index}`);
}

async function clickFirstVisibleWithinSelector(page, parentSelector, childSelector, description = `${parentSelector} ${childSelector}`) {
  await page.waitForFunction(
    (rootSelector, targetSelector) => {
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
      return Array.from(document.querySelectorAll(rootSelector))
        .filter(isVisible)
        .some((root) => Array.from(root.querySelectorAll(targetSelector)).some(isVisible));
    },
    { timeout: 30000 },
    parentSelector,
    childSelector,
  );
  const clicked = await page.evaluate((rootSelector, targetSelector) => {
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
    for (const root of Array.from(document.querySelectorAll(rootSelector)).filter(isVisible)) {
      const target = Array.from(root.querySelectorAll(targetSelector)).find(isVisible);
      if (target instanceof HTMLElement) {
        target.click();
        return true;
      }
    }
    return false;
  }, parentSelector, childSelector);
  if (!clicked) throw new Error(`No visible ${description} matched selectors "${parentSelector}" -> "${childSelector}"`);
}

async function expandVisibleArmyHqSectorWithBrigadeInspect(page) {
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-row"][data-sector-id]');
  const sectorCount = await visibleSelectorCount(page, '[data-testid="army-hq-sector-row"][data-sector-id]');
  for (let index = 0; index < sectorCount; index += 1) {
    const candidate = await page.evaluate((targetIndex) => {
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
      const rows = Array.from(document.querySelectorAll('[data-testid="army-hq-sector-row"][data-sector-id]')).filter(isVisible);
      const row = rows[targetIndex];
      if (!(row instanceof HTMLElement)) return null;
      const sectorId = row.getAttribute('data-sector-id') ?? '';
      const visibleBrigadeInspect = Array.from(row.querySelectorAll('[data-testid="army-hq-sector-brigade-inspect"][data-formation-id][data-sector-id]')).find(isVisible);
      const visibleFrontage = Array.from(row.querySelectorAll('[data-testid="army-hq-sector-frontage"][data-front-segments]')).find(isVisible);
      if (visibleBrigadeInspect instanceof HTMLElement && visibleFrontage instanceof HTMLElement) {
        return {
          sectorId,
          formationId: visibleBrigadeInspect.getAttribute('data-formation-id') ?? '',
          expanded: true,
        };
      }
      const expandButton = Array.from(row.querySelectorAll('button')).find((button) => (
        button instanceof HTMLElement
        && isVisible(button)
        && !button.hasAttribute('data-testid')
      ));
      if (!(expandButton instanceof HTMLElement)) return { sectorId, expanded: false };
      expandButton.click();
      return { sectorId, expanded: false };
    }, index);

    if (!candidate?.sectorId) continue;
    const found = await page.waitForFunction(
      (sectorId) => {
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
        const row = Array.from(document.querySelectorAll('[data-testid="army-hq-sector-row"][data-sector-id]'))
          .find((el) => el instanceof HTMLElement && isVisible(el) && el.getAttribute('data-sector-id') === sectorId);
        if (!(row instanceof HTMLElement)) return null;
        const brigadeInspect = Array.from(row.querySelectorAll('[data-testid="army-hq-sector-brigade-inspect"][data-formation-id][data-sector-id]')).find(isVisible);
        const frontage = Array.from(row.querySelectorAll('[data-testid="army-hq-sector-frontage"][data-front-segments]')).find(isVisible);
        if (!(brigadeInspect instanceof HTMLElement) || !(frontage instanceof HTMLElement)) return null;
        return {
          sectorId,
          formationId: brigadeInspect.getAttribute('data-formation-id') ?? '',
        };
      },
      { timeout: candidate.expanded ? 500 : 3000 },
      candidate.sectorId,
    ).then((handle) => handle.jsonValue(), () => null);
    if (found?.formationId) return found;
  }
  return null;
}

async function selectArmyHqCorpsWithSectorBrigadeInspect(page, summary) {
  await waitForVisibleSelector(page, '[data-testid="army-hq-corps-index"]');
  if (await visibleSelectorCount(page, '[data-testid="army-hq-corps-card-detail"]') > 0) {
    const foundInOpenDetail = await expandVisibleArmyHqSectorWithBrigadeInspect(page);
    if (foundInOpenDetail) {
      summary.evidence.armyHqSectorBrigadeProofCorpsIndex = 'existing-detail';
      summary.evidence.armyHqSectorBrigadeProofSectorId = foundInOpenDetail.sectorId;
      summary.evidence.armyHqSectorBrigadeProofFormationId = foundInOpenDetail.formationId;
      return foundInOpenDetail;
    }
  }

  const corpsCount = await visibleSelectorCount(page, '[data-testid="army-hq-corps-card"]');
  for (let index = 0; index < corpsCount; index += 1) {
    await clickVisibleSelectorAt(page, '[data-testid="army-hq-corps-card"]', index, 'Army HQ corps card');
    await waitForVisibleSelector(page, '[data-testid="army-hq-corps-card-detail"]');
    await waitForVisibleSelector(page, '[data-testid="army-hq-sector-row"][data-sector-id]');
    const found = await expandVisibleArmyHqSectorWithBrigadeInspect(page);
    if (found) {
      summary.evidence.armyHqSectorBrigadeProofCorpsIndex = index;
      summary.evidence.armyHqSectorBrigadeProofSectorId = found.sectorId;
      summary.evidence.armyHqSectorBrigadeProofFormationId = found.formationId;
      return found;
    }
  }

  throw new Error(`No Army HQ corps sector exposed a visible brigade inspect-on-field control after inspecting ${corpsCount} corps cards`);
}

async function ensureExpanded(page, selector) {
  await waitForVisibleSelector(page, selector);
  const expanded = await page.$eval(selector, (el) => el.getAttribute('aria-expanded') === 'true');
  if (!expanded) await activateVisibleControl(page, selector);
  await page.waitForFunction(
    (targetSelector) => document.querySelector(targetSelector)?.getAttribute('aria-expanded') === 'true',
    { timeout: 15000 },
    selector,
  );
}

async function clickFirstSectorWithVisibleFormation(page, summary) {
  const sectorSelector = '[data-testid="oob-sector-row"][data-sector-id]';
  await page.waitForFunction(
    (targetSelector) => {
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
      return Array.from(document.querySelectorAll(targetSelector)).some(isVisible);
    },
    { timeout: 30000 },
    sectorSelector,
  );

  const sectorCount = await visibleSelectorCount(page, sectorSelector);
  for (let index = 0; index < sectorCount; index += 1) {
    const sectorId = await page.evaluate((targetSelector, targetIndex) => {
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
      const target = Array.from(document.querySelectorAll(targetSelector)).filter(isVisible)[targetIndex];
      return target instanceof HTMLElement ? target.getAttribute('data-sector-id') : null;
    }, sectorSelector, index);
    await clickVisibleSelectorAt(page, sectorSelector, index, 'OOB sector button');
    const selected = await page.waitForFunction(
      (targetSelector, targetIndex) => {
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
        const target = Array.from(document.querySelectorAll(targetSelector)).filter(isVisible)[targetIndex];
        return target instanceof HTMLElement && target.getAttribute('data-selected') === 'true';
      },
      { timeout: 5000 },
      sectorSelector,
      index,
    ).then(() => true, () => false);
    if (!selected) continue;
    await waitForVisibleSelector(page, '#sector-intel-tab-overview');
    await activateVisibleControl(page, '#sector-intel-tab-forces');
    await waitForVisibleSelector(page, '#sector-intel-panel-forces');
    if (await visibleSelectorCount(page, '[data-testid="corps-front-brigade-row"][data-formation-id][data-location-osid]') > 0) {
      summary.evidence.ownerJourneySectorIndex = index;
      summary.evidence.ownerJourneySectorId = sectorId;
      return sectorId;
    }
  }

  throw new Error(`No visible Corps Front brigade rows with settlement locations found after inspecting ${sectorCount} OOB sectors`);
}

async function closePauseMenuIfPresent(page) {
  const text = await visibleText(page);
  if (!/\bPAUSED\b/i.test(text)) return;
  await clickFirstMatchingText(page, ['RESUME']).catch(() => {});
  await delay(250);
}

async function dialogText(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    return dialog?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  });
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

async function resetToWarMap(page) {
  await page.keyboard.press('Escape');
  await delay(250);
  await closePauseMenuIfPresent(page);
  await page.keyboard.press('Escape');
  await delay(250);
  await closePauseMenuIfPresent(page);
  await clickSelectorIfVisible(page, '[data-testid="warroom-decision-room-close"]');
  await clickSelectorIfVisible(page, '[data-testid="command-card-strip-close"]');
  await clickSelectorIfVisible(page, '[data-testid="codex-close"]');
  await clickSelectorIfVisible(page, '[data-testid="desk-close-overlay"]');
  await activateVisibleControl(page, '[data-testid="toolbar-route-war-map"]').catch(() => {
    return clickFirstMatchingText(page, ['FIELD', 'War Map']).catch(() => {});
  });
  await closePauseMenuIfPresent(page);
  await waitForTacticalMap(page);
  await page.waitForFunction(() => {
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
    const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const hasVisibleText = (selector, pattern) => Array.from(document.querySelectorAll(selector))
      .some((el) => isVisible(el) && pattern.test(textOf(el)));
    const visibleDialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .filter(isVisible)
      .map((el) => ({
        label: [
          el.getAttribute('aria-label'),
          el.getAttribute('aria-labelledby')
            ? document.getElementById(el.getAttribute('aria-labelledby'))?.textContent
            : '',
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        text: textOf(el),
      }));
    const desk = isVisible(document.querySelector('[data-testid="desk-close-overlay"]'))
      || hasVisibleText('section[aria-label], aside, h2', /President's Desk|Strategic Situation/);
    const armyHqDialog = visibleDialogs.find((dialog) => /Army HQ|Army Headquarters/i.test(dialog.label));
    const chronicle = hasVisibleText('h1', /^War Chronicle$/i);
    const codex = isVisible(document.querySelector('[data-testid="codex-panel"]'));
    const commandStrip = isVisible(document.querySelector('[data-testid="command-card-strip"]'));
    const decisionRoom = isVisible(document.querySelector('[data-testid="warroom-decision-room-host"]'));
    return !desk && !armyHqDialog && !chronicle && !codex && !commandStrip && !decisionRoom;
  }, { timeout: 15000 });
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

function assertNoRawTechnicalTokens(surfaceName, text) {
  const found = [];
  for (const { label, pattern } of RAW_TECHNICAL_TOKENS) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      found.push({
        label,
        context: text.slice(Math.max(0, match.index - 160), Math.min(text.length, match.index + match[0].length + 160)).replace(/\s+/g, ' '),
      });
    }
  }
  if (found.length > 0) {
    throw new Error(`${surfaceName} exposed raw technical tokens: ${JSON.stringify(found, null, 2)}`);
  }
  if (LOCALE === 'bcs' || LOCALE === 'bs') {
    assertNoBcsEnglishLeakTokens(surfaceName, text);
  }
}

function assertNoBcsEnglishLeakTokens(surfaceName, text) {
  const found = [];
  for (const { label, pattern } of BCS_ENGLISH_LEAK_TOKENS) {
    const match = pattern.exec(text);
    if (match?.index !== undefined) {
      found.push({
        label,
        match: match[0],
      });
    }
  }
  if (found.length > 0) {
    throw new Error(`${surfaceName} exposed English fallback copy in BCS mode: ${JSON.stringify(found, null, 2)}`);
  }
}

async function getVisibleShellSurfaces(page) {
  return page.evaluate(() => {
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
    const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const hasVisibleText = (selector, pattern) => Array.from(document.querySelectorAll(selector))
      .some((el) => isVisible(el) && pattern.test(textOf(el)));
    const visibleDialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .filter(isVisible)
      .map((el) => ({
        label: [
          el.getAttribute('aria-label'),
          el.getAttribute('aria-labelledby')
            ? document.getElementById(el.getAttribute('aria-labelledby'))?.textContent
            : '',
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        text: textOf(el),
      }));

    const desk = isVisible(document.querySelector('[data-testid="desk-close-overlay"]'))
      || hasVisibleText('section[aria-label], aside, h2', /President's Desk|Strategic Situation/);
    const armyHqDialog = visibleDialogs.find((dialog) => /Army HQ|Army Headquarters/i.test(dialog.label));
    const armyHqText = armyHqDialog?.text ?? '';
    const records = Boolean(armyHqDialog && /Archive Routes|Records archive summary|Decision Consequences|Turn Records/.test(armyHqText));
    const armyHq = Boolean(armyHqDialog && !records);
    const chronicle = hasVisibleText('h1', /^War Chronicle$/i);
    const codex = isVisible(document.querySelector('[data-testid="codex-panel"]'));
    return [
      ...(desk ? ['Desk'] : []),
      ...(records ? ['Records'] : []),
      ...(armyHq ? ['Army HQ'] : []),
      ...(chronicle ? ['Chronicle'] : []),
      ...(codex ? ['Codex'] : []),
    ];
  });
}

async function assertSingleShellSurface(page, expectedSurface) {
  const active = await getVisibleShellSurfaces(page);
  if (expectedSurface === 'War Map') {
    if (active.length > 0) {
      throw new Error(`War Map has stacked shell surface(s): ${active.join(', ')}`);
    }
    return active;
  }
  if (active.length !== 1 || active[0] !== expectedSurface) {
    throw new Error(`Expected only ${expectedSurface} shell surface, saw: ${active.join(', ') || '(none)'}`);
  }
  return active;
}

async function runFoundationalFlow(page, summary) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForVisibleText(page, 'A WAR WITHOUT VICTORY');
  await captureEvidence(page, summary, 'main_menu');

  await clickByText(page, 'Republic of Bosnia and Herzegovina');
  await waitForVisibleText(page, 'WAR HAS STARTED');
  await captureEvidence(page, summary, 'war_start_splash');

  await clickByText(page, 'Acknowledge');
  await waitForVisibleText(page, 'WAR BEGINS');
  const identityDialog = await dialogText(page);
  if (!identityDialog.includes('President of the Presidency of the Republic of Bosnia and Herzegovina')) {
    throw new Error(`WAR BEGINS identity dialog did not show RBiH identity copy: ${identityDialog}`);
  }
  await captureEvidence(page, summary, 'war_begins_identity');

  await clickByText(page, 'Begin');
  await waitForVisibleText(page, 'President');
  await clickFirstMatchingText(page, ['Open Desk', 'President', 'Desk', 'Begin at Desk', 'Open President']);
  await waitForVisibleText(page, 'What Is Bosnia?');
  await waitForVisibleText(page, 'Civic multi-ethnic republic');
  await captureEvidence(page, summary, 'foundational_decision');

  await clickByText(page, 'Civic multi-ethnic republic');
  await waitUntilDialogTextAbsent(page, 'Presidential Response');
  await dismissTutorialIfPresent(page);
  summary.evidence.warStartFoundationalFlow = true;
  await captureEvidence(page, summary, 'after_foundational_decision');
}

async function runSurfaceSweep(page, summary) {
  await resetToWarMap(page);

  for (const surface of LIVE_SURFACES) {
    await surface.open(page);
    const active = await assertSingleShellSurface(page, surface.expectedSurface);
    const text = await visibleText(page);
    const step = await captureEvidence(page, summary, `surface_${surface.name.toLowerCase().replace(/\s+/g, '_')}`);
    step.activeShellSurfaces = active;
    summary.evidence.surfaceSweep[surface.name] = {
      reached: true,
      activeShellSurfaces: active,
    };
    if (surface.name === 'Army HQ') summary.evidence.armyHqReachable = true;
    if (surface.name === 'Records') summary.evidence.recordsReachable = true;
    assertNoRawTechnicalTokens(surface.name, text);
    await resetToWarMap(page);
  }
}

async function runArmyHqInternalDrilldown(page, summary) {
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-army-hq"]');
  await assertSingleShellSurface(page, 'Army HQ');

  await activateVisibleControl(page, '#army-hq-tab-summary');
  await waitForVisibleSelector(page, '#army-hq-tab-summary[aria-selected="true"]');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-summary');
  await waitForVisibleText(page, 'WAR SUMMARY');
  await captureEvidence(page, summary, 'army_hq_internal_summary');

  await activateVisibleControl(page, '#army-hq-tab-personnel');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-personnel');
  await waitForVisibleText(page, 'PERSONNEL COMMAND DOSSIER');
  await captureEvidence(page, summary, 'army_hq_internal_personnel');

  await activateVisibleControl(page, '#army-hq-tab-briefing');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-briefing');
  await waitForVisibleSelector(page, '[data-testid="army-hq-corps-index"]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-opening-command-provenance"]');
  await activateVisibleControl(page, '[data-testid="army-hq-corps-card"][data-commander-source="opening_read_model"]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-corps-card-detail"]');
  await waitForVisibleText(page, 'Back');
  await waitForVisibleText(page, 'Combat Record');
  await captureEvidence(page, summary, 'army_hq_internal_corps_card');

  const active = await assertSingleShellSurface(page, 'Army HQ');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Army HQ Internal Drilldown', text);
  summary.evidence.armyHqInternalDrilldown = true;
  summary.evidence.armyHqInternalActiveShellSurfaces = active;
}

async function runArmyHqPersonnelBrigadeLiveProof(page, summary) {
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-army-hq"]');
  await assertSingleShellSurface(page, 'Army HQ');
  await activateVisibleControl(page, '#army-hq-tab-personnel');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-personnel');
  await waitForVisibleSelector(page, '[data-testid="personnel-orbat-brigade-link"][data-command-id][data-command-kind][data-formation-id]');
  await clickFirstVisibleSelector(
    page,
    '[data-testid="personnel-orbat-brigade-link"][data-command-id][data-command-kind][data-formation-id]',
    'Army HQ Personnel ORBAT brigade link',
  );
  await waitForVisibleSelector(page, '[data-testid="formation-detail-panel"]');
  await captureEvidence(page, summary, 'army_hq_personnel_brigade_live_proof');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Army HQ Personnel Brigade Live Proof', text);
  summary.evidence.armyHqPersonnelBrigadeLiveProof = true;
}

async function runArmyHqSectorFrontSegmentLiveProof(page, summary) {
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-army-hq"]');
  await assertSingleShellSurface(page, 'Army HQ');
  await activateVisibleControl(page, '#army-hq-tab-briefing');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-briefing');
  await selectArmyHqCorpsWithSectorBrigadeInspect(page, summary);
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-row"][data-sector-id]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-row"][data-sector-id][data-coverage-tier][data-current-brigade-count][data-frontline-brigade-count][data-reserve-brigade-count][data-command-directed-brigade-count]');
  const armyHqSectorTruth = await page.evaluate(() => {
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
    const rows = Array.from(document.querySelectorAll('[data-testid="army-hq-sector-row"][data-sector-id]'))
      .filter(isVisible);
    const zeroCurrentRows = rows.filter((row) => row.getAttribute('data-current-brigade-count') === '0');
    const badZeroRows = zeroCurrentRows
      .filter((row) => row.getAttribute('data-coverage-tier') !== 'uncovered')
      .map((row) => ({
        sectorId: row.getAttribute('data-sector-id'),
        coverageTier: row.getAttribute('data-coverage-tier'),
        current: row.getAttribute('data-current-brigade-count'),
      }));
    return {
      rows: rows.length,
      zeroCurrentRows: zeroCurrentRows.length,
      badZeroRows,
    };
  });
  if (armyHqSectorTruth.badZeroRows.length > 0) {
    throw new Error(`Army HQ zero-current sector rows must render as uncovered: ${JSON.stringify(armyHqSectorTruth.badZeroRows)}`);
  }
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-frontage"][data-front-segments]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-inspect"][data-sector-id]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-brigade-inspect"][data-formation-id][data-sector-id]');
  await captureEvidence(page, summary, 'army_hq_sector_front_segment_live_proof');
  await clickFirstVisibleSelector(
    page,
    '[data-testid="army-hq-sector-brigade-inspect"][data-formation-id][data-sector-id]',
    'Army HQ sector brigade inspect-on-field control',
  );
  await waitForVisibleSelector(page, '[data-testid="formation-detail-panel"]');
  await captureEvidence(page, summary, 'army_hq_sector_brigade_inspect_on_field_live_proof');

  await resetToWarMap(page);
  await activateVisibleControl(page, '[data-testid="toolbar-route-army-hq"]');
  await assertSingleShellSurface(page, 'Army HQ');
  await activateVisibleControl(page, '#army-hq-tab-briefing');
  await waitForVisibleSelector(page, '#army-hq-tabpanel-briefing');
  await waitForVisibleSelector(page, '[data-testid="army-hq-corps-index"]');
  await activateVisibleControl(page, '[data-testid="army-hq-corps-card"]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-corps-card-detail"]');
  await waitForVisibleSelector(page, '[data-testid="army-hq-sector-inspect"][data-sector-id]');
  await clickFirstVisibleSelector(page, '[data-testid="army-hq-sector-inspect"][data-sector-id]', 'Army HQ sector inspect-on-field control');
  await waitForVisibleSelector(page, '#sector-intel-tab-overview');
  await waitForVisibleSelector(page, '#sector-intel-panel-overview');
  await captureEvidence(page, summary, 'army_hq_sector_inspect_on_field_live_proof');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Army HQ Sector Front Segment Live Proof', text);
  summary.evidence.armyHqSectorFrontSegmentLiveProof = true;
  summary.evidence.armyHqSectorAssignmentTruthLiveProof = armyHqSectorTruth;
  summary.evidence.armyHqSectorBrigadeInspectOnFieldLiveProof = true;
  summary.evidence.armyHqSectorInspectOnFieldLiveProof = true;
}

async function runOwnerJourneyDrilldown(page, summary, faction = 'RBiH') {
  const journeyKey = String(faction || 'unknown').toLowerCase();
  const evidenceId = (id) => (journeyKey === 'rbih' ? id : `${journeyKey}_${id}`);
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-desk"]');
  await waitForVisibleSelector(page, '[data-testid="desk-open-command-surface"]');
  await clickVisibleSelector(page, '[data-testid="desk-open-command-surface"]');
  await waitForVisibleSelector(page, '[data-testid="command-card-strip"]');
  await clickVisibleSelector(page, '[data-testid="command-card-cat_war_direction"]');
  await waitForVisibleSelector(page, '[data-testid="warroom-decision-room-host"]');
  await waitForVisibleSelector(page, '[data-testid="presidential-decision-room"]');
  await captureEvidence(page, summary, evidenceId('owner_journey_decision_room'));

  await resetToWarMap(page);
  await waitForVisibleSelector(page, '[data-testid="tactical-map"]');
  await ensureExpanded(page, '[data-testid="oob-section-sectors-toggle"]');
  const sectorId = await clickFirstSectorWithVisibleFormation(page, summary);
  if (sectorId) {
    await waitForVisibleSelectorAttribute(
      page,
      '[data-testid="corps-front-panel"]',
      'data-sector-id',
      sectorId,
      'Corps Front panel',
    );
  }
  await waitForVisibleSelector(page, '#sector-intel-tab-overview');
  await activateVisibleControl(page, '#sector-intel-tab-overview');
  await waitForVisibleSelector(page, '#sector-intel-panel-overview');
  await waitForVisibleSelector(page, '[data-testid="oob-sector-row"][data-selected="true"][data-coverage-tier][data-current-brigade-count][data-frontline-brigade-count][data-reserve-brigade-count][data-command-directed-brigade-count]');
  await captureEvidence(page, summary, evidenceId('owner_journey_sector_overview'));

  await activateVisibleControl(page, '#sector-intel-tab-logistics');
  await waitForVisibleSelector(page, '#sector-intel-panel-logistics');
  await activateVisibleControl(page, '#sector-intel-tab-ops');
  await waitForVisibleSelector(page, '#sector-intel-panel-ops');
  const draftDirectiveSelector = `[data-testid="corps-front-draft-directive"][data-origin-sector-id="${quoteCssAttributeValue(sectorId)}"]`;
  const draftDirectiveDisabled = await isVisibleButtonDisabled(page, draftDirectiveSelector);
  if (draftDirectiveDisabled) {
    await page.waitForFunction(
      () => document.body.textContent?.includes('Desktop command bridge unavailable'),
      { timeout: 15000 },
    );
    await captureEvidence(page, summary, evidenceId('owner_journey_ops_planning_bridge_unavailable'));
  } else {
    await activateVisibleControl(page, draftDirectiveSelector);
    await waitForVisibleSelector(page, '[data-testid="ops-planning-modal"][data-origin-sector-id]');
    await waitForVisibleSelector(page, '[data-testid="ops-planning-phase-panel"][data-phase="commander"]');
    for (const phase of ['commander', 'plan', 'g2_assessment', 'authorize']) {
      await waitForVisibleSelector(page, `[data-testid="ops-planning-phase-${phase}"][data-phase="${phase}"]`);
    }
    await captureEvidence(page, summary, evidenceId('owner_journey_ops_planning_modal'));
    await activateVisibleControl(page, '[data-testid="ops-planning-close"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="ops-planning-modal"]'), { timeout: 15000 });
  }
  await activateVisibleControl(page, '#sector-intel-tab-forces');
  await waitForVisibleSelector(page, '#sector-intel-panel-forces');
  const formationId = await getVisibleSelectorAttribute(
    page,
    '[data-testid="corps-front-brigade-row"][data-formation-id][data-location-osid]',
    'data-formation-id',
    'Corps Front brigade row',
  );
  const locationOsid = await getVisibleSelectorAttribute(
    page,
    '[data-testid="corps-front-brigade-row"][data-formation-id][data-location-osid]',
    'data-location-osid',
    'Corps Front brigade row',
  );
  await clickFirstVisibleSelector(page, '[data-testid="corps-front-brigade-row"][data-formation-id][data-location-osid]', 'Corps Front brigade row with a settlement location');
  await waitForVisibleSelectorAttribute(page, '[data-testid="formation-detail-panel"]', 'data-formation-id', formationId, 'formation detail panel');
  await activateVisibleControl(page, '#formation-detail-tab-record');
  await waitForVisibleSelector(page, '#formation-detail-tab-record[aria-selected="true"]');
  await activateVisibleControl(page, '#formation-detail-tab-orders');
  await waitForVisibleSelector(page, '#formation-detail-tab-orders[aria-selected="true"]');
  await captureEvidence(page, summary, evidenceId('owner_journey_formation_detail'));

  await activateVisibleControl(page, '#formation-detail-tab-overview');
  await waitForVisibleSelector(page, '#formation-detail-tab-overview[aria-selected="true"]');
  await waitForVisibleSelector(page, '[data-testid="formation-location-link"][data-osid]');
  await waitForVisibleSelectorAttribute(page, '[data-testid="formation-location-link"][data-osid]', 'data-osid', locationOsid, 'formation location link');
  await activateVisibleControl(page, '[data-testid="formation-location-link"][data-osid]');
  await waitForVisibleSelectorAttribute(page, '[data-testid="settlement-detail-panel"]', 'data-osid', locationOsid, 'settlement detail panel');
  await waitForVisibleSelector(page, '#settlement-tab-overview');
  await waitForVisibleSelector(page, '[data-testid="settlement-panel-overview"]');
  await activateVisibleControl(page, '#settlement-tab-municipality');
  await waitForVisibleSelector(page, '[data-testid="settlement-panel-municipality"]');
  await activateVisibleControl(page, '#settlement-tab-timeline');
  await waitForVisibleSelector(page, '[data-testid="settlement-panel-timeline"]');
  await captureEvidence(page, summary, evidenceId('owner_journey_settlement_detail'));

  await activateVisibleControl(page, '[data-testid="toolbar-route-records"]');
  await waitForVisibleSelector(page, '#army-hq-tab-records');
  for (const subTab of ['aftermath', 'aar', 'ops', 'decisions', 'opportunities']) {
    await activateVisibleControl(page, `[data-testid="records-subtab-${subTab}"]`);
    await waitForVisibleSelector(page, `[data-testid="records-subtab-${subTab}"][data-selected="true"]`);
  }
  await captureEvidence(page, summary, evidenceId('owner_journey_records_tabs'));

  const text = await visibleText(page);
  assertNoRawTechnicalTokens(`Owner Journey Drilldown ${faction}`, text);
  summary.evidence.ownerJourneyDrilldown = true;
  summary.evidence.ownerJourneyDrilldownByFaction[faction] = true;
  summary.evidence.ownerJourneyOpsPlanningModal = true;
  summary.evidence.ownerJourneyOpsPlanningModalByFaction[faction] = true;
}

async function runRecordsAarFormationLinkLiveProof(page, summary) {
  await resetToWarMap(page);

  const fixtureBattleSelector = `[data-testid="aar-battle-row"][data-osid="${RECORDS_AAR_FIXTURE_OSID}"]`;
  const fixtureAttackerLinkSelector = `[data-testid="aar-formation-link"][data-formation-id="${RECORDS_AAR_FIXTURE_ATTACKER_ID}"][data-osid="${RECORDS_AAR_FIXTURE_OSID}"]`;

  await activateVisibleControl(page, '[data-testid="toolbar-route-records"]');
  await waitForVisibleSelector(page, '[data-testid="records-content"]');
  await activateVisibleControl(page, '[data-testid="records-subtab-aar"]');
  await waitForVisibleSelector(page, '[data-testid="records-subtab-aar"][data-selected="true"]');
  if (await visibleSelectorCount(page, fixtureBattleSelector) === 0) {
    await captureEvidence(page, summary, 'records_aar_formation_link_missing_battle_rows');
    throw new Error(`Records AAR fixture did not render battle row for ${RECORDS_AAR_FIXTURE_OSID}`);
  }
  if (await visibleSelectorCount(page, fixtureAttackerLinkSelector) === 0) {
    await captureEvidence(page, summary, 'records_aar_formation_link_missing_formation_links');
    throw new Error(`Records AAR fixture did not render attacker formation link for ${RECORDS_AAR_FIXTURE_ATTACKER_ID}`);
  }
  await clickFirstVisibleSelector(
    page,
    fixtureAttackerLinkSelector,
    'Records AAR fixture attacker formation link',
  );
  await waitForVisibleSelector(page, '[data-testid="formation-detail-panel"]');
  await captureEvidence(page, summary, 'records_aar_formation_link_live_proof');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Records AAR Formation Link Live Proof', text);
  summary.evidence.recordsAarFormationLinkLiveProof = {
    osid: RECORDS_AAR_FIXTURE_OSID,
    clickedFormationId: RECORDS_AAR_FIXTURE_ATTACKER_ID,
  };
}

async function runMapContextMenuLiveProof(page, summary) {
  await resetToWarMap(page);
  const mapBounds = await page.evaluate(() => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    if (!(map instanceof HTMLElement)) return null;
    const rect = map.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.52,
      y: rect.top + rect.height * 0.50,
    };
  });
  if (!mapBounds) throw new Error('Tactical map bounds unavailable for context-menu proof');
  await page.mouse.click(mapBounds.x, mapBounds.y, { button: 'right' });
  await delay(500);
  let activationMethod = 'right-click';
  if (await visibleSelectorCount(page, '[data-testid="map-context-menu"]') === 0) {
    const dispatched = await page.evaluate(({ x, y }) => {
      const map = document.querySelector('[data-testid="tactical-map"]');
      if (!(map instanceof HTMLElement)) return false;
      document.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 2,
        buttons: 2,
      }));
      return true;
    }, mapBounds);
    if (!dispatched) throw new Error('Tactical map unavailable for DOM context-menu proof');
    activationMethod = 'dom-contextmenu';
  }
  if (await visibleSelectorCount(page, '[data-testid="map-context-menu"]') === 0) {
    const openedViaSeam = await page.evaluate((position) => {
      if (typeof window.__awwvLiveSurfaceOpenMapContextMenu !== 'function') return false;
      window.__awwvLiveSurfaceOpenMapContextMenu(position);
      return true;
    }, mapBounds);
    if (!openedViaSeam) throw new Error('Dev live-surface map context-menu seam unavailable');
    activationMethod = 'dev-seam';
  }
  await page.waitForFunction(() => Boolean(document.querySelector('[data-testid="map-context-menu"]')), { timeout: 30000 });
  await waitForVisibleSelector(page, '[data-testid^="map-context-menu-action-"]');
  const actionCount = await visibleSelectorCount(page, '[data-testid^="map-context-menu-action-"]');
  if (actionCount === 0) {
    await captureEvidence(page, summary, 'map_context_menu_missing_actions');
    throw new Error('Map context menu opened without visible actions');
  }
  await captureEvidence(page, summary, 'map_context_menu_live_proof');
  if (await visibleSelectorCount(page, '[data-testid="map-context-menu-action-deselect"]') === 0) {
    await captureEvidence(page, summary, 'map_context_menu_missing_deselect_action');
    throw new Error('Map context menu did not expose the deterministic Deselect action');
  }
  await clickFirstVisibleSelector(page, '[data-testid="map-context-menu-action-deselect"]', 'map context Deselect action');
  await page.waitForFunction(() => !document.querySelector('[data-testid="map-context-menu"]'), { timeout: 10000 });
  await captureEvidence(page, summary, 'map_context_menu_action_live_proof');
  summary.evidence.mapContextMenuLiveProof = { actions: actionCount, activationMethod, clickedAction: 'deselect' };
}

async function runBattleMarkerLiveProof(page, summary) {
  await resetToWarMap(page);
  await page.waitForFunction((fixtureOsid) => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    if (!(map instanceof HTMLElement)) return false;
    const count = Number(map.dataset.battleMarkerCount ?? '0');
    const osids = map.dataset.battleMarkerOsids ?? '';
    return count > 0 && osids.split(',').includes(fixtureOsid);
  }, { timeout: 30000 }, RECORDS_AAR_FIXTURE_OSID);
  const markerEvidence = await page.evaluate(() => {
    const map = document.querySelector('[data-testid="tactical-map"]');
    if (!(map instanceof HTMLElement)) return null;
    return {
      count: Number(map.dataset.battleMarkerCount ?? '0'),
      osids: map.dataset.battleMarkerOsids ?? '',
    };
  });
  await captureEvidence(page, summary, 'battle_marker_live_proof');
  summary.evidence.battleMarkerLiveProof = markerEvidence;
}

async function loadRecordsAarLiveProofFixture(page, summary) {
  const fixtureState = buildRecordsAarLiveProofFixtureState();
  await page.evaluate(async (state) => {
    if (typeof window.handleManualSaveLoad !== 'function') {
      throw new Error('window.handleManualSaveLoad is unavailable');
    }
    await window.handleManualSaveLoad(state);
  }, fixtureState);
  await resetToWarMap(page);
  summary.evidence.recordsAarFixture = {
    source: path.relative(ROOT, STARTUP_SAVE_PATH).replace(/\\/g, '/'),
    turn: 1,
    osid: RECORDS_AAR_FIXTURE_OSID,
    attacker: RECORDS_AAR_FIXTURE_ATTACKER_ID,
    defender: RECORDS_AAR_FIXTURE_DEFENDER_ID,
  };
}

async function loadTurnZeroSetupProvenanceFixture(page, summary) {
  const fixtureState = buildTurnZeroSetupProvenanceFixtureState();
  await page.evaluate(async (state) => {
    if (typeof window.handleManualSaveLoad !== 'function') {
      throw new Error('window.handleManualSaveLoad is unavailable');
    }
    await window.handleManualSaveLoad(state);
  }, fixtureState);
  await resetToWarMap(page);
  summary.evidence.turnZeroSetupProvenanceFixture = {
    source: path.relative(ROOT, STARTUP_SAVE_PATH).replace(/\\/g, '/'),
    turn: 0,
    playerFaction: 'RBiH',
  };
}

async function loadPlayerFactionStartupFixture(page, summary, faction) {
  const fixtureState = buildPlayerFactionStartupFixtureState(faction);
  await page.evaluate(async (state) => {
    if (typeof window.handleManualSaveLoad !== 'function') {
      throw new Error('window.handleManualSaveLoad is unavailable');
    }
    await window.handleManualSaveLoad(state);
  }, fixtureState);
  await resetToWarMap(page);
  summary.evidence.ownerJourneyStartupFixtureByFaction[faction] = {
    source: path.relative(ROOT, STARTUP_SAVE_PATH).replace(/\\/g, '/'),
    turn: 0,
    playerFaction: faction,
  };
}

async function runTurnZeroSetupProvenanceLiveProof(page, summary) {
  await loadTurnZeroSetupProvenanceFixture(page, summary);

  await activateVisibleControl(page, '[data-testid="toolbar-route-desk"]');
  await waitForVisibleSelector(page, '[data-testid="president-desk-shell"]');
  await waitForVisibleText(page, 'No campaign record loaded.');
  const deskText = await visibleText(page);
  if (/Last filed record/i.test(deskText)) {
    await captureEvidence(page, summary, 'turn_zero_setup_provenance_desk_failed');
    throw new Error('Desk consequence strip treated turn-zero setup as a filed record');
  }

  await waitForVisibleSelector(page, '[data-testid="desk-open-command-surface"]');
  await activateVisibleControl(page, '[data-testid="desk-open-command-surface"]');
  await waitForVisibleSelector(page, '[data-testid="command-card-strip"]');
  await waitForVisibleSelector(page, '[data-testid="command-card-cat_record"][data-awwv-count="0"][data-awwv-urgent-count="0"]');
  await captureEvidence(page, summary, 'turn_zero_setup_provenance_live_proof');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Turn-Zero Setup Provenance Live Proof', text);
  summary.evidence.turnZeroSetupProvenanceLiveProof = {
    recordCardCount: 0,
    recordCardUrgentCount: 0,
  };
}

async function loadOperationOpportunityLiveProofFixture(page, summary) {
  const fixtureState = buildOperationOpportunityLiveProofFixtureState();
  await page.evaluate(async (state) => {
    if (typeof window.handleManualSaveLoad !== 'function') {
      throw new Error('window.handleManualSaveLoad is unavailable');
    }
    await window.handleManualSaveLoad(state);
  }, fixtureState);
  await resetToWarMap(page);
  summary.evidence.operationOpportunityFixture = {
    source: path.relative(ROOT, STARTUP_SAVE_PATH).replace(/\\/g, '/'),
    reviewId: OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID,
    proposalId: OPPORTUNITY_LIVE_FIXTURE_ID,
  };
}

async function runArchiveInboxDrilldown(page, summary) {
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-chronicle"]');
  await waitForVisibleSelector(page, '[data-testid="chronicle-overlay"]');
  await assertSingleShellSurface(page, 'Chronicle');
  const chronicleRecordSelector = '[data-testid="chronicle-open-record"]';
  const chronicleRecordTarget = await getVisibleSelectorAttribute(
    page,
    chronicleRecordSelector,
    'data-record-target',
    'Chronicle record route',
  );
  const chronicleDecisionRecordId = chronicleRecordTarget === 'decision'
    ? await getVisibleSelectorAttribute(
      page,
      chronicleRecordSelector,
      'data-decision-record-id',
      'Chronicle decision record id',
    )
    : null;
  await activateVisibleControl(page, chronicleRecordSelector);
  if (chronicleRecordTarget === 'decision') {
    await waitForVisibleSelector(page, '[data-testid="chronicle-overlay"]');
    if (chronicleDecisionRecordId) {
      await waitForVisibleSelector(
        page,
        `[data-focused-chronicle-decision-record-id="${quoteCssAttributeValue(chronicleDecisionRecordId)}"]`,
      );
    }
    await assertSingleShellSurface(page, 'Chronicle');
    await captureEvidence(page, summary, 'archive_chronicle_decision_stays_chronicle');
    summary.evidence.archiveChronicleToRecordsDrilldown = false;
    summary.evidence.archiveChronicleDecisionStaysChronicle = true;
    summary.evidence.archiveChronicleDecisionRecordId = chronicleDecisionRecordId;
  } else {
    await waitForVisibleSelector(page, '[data-testid="records-content"]');
    await waitForVisibleSelector(page, '#army-hq-tab-records[aria-selected="true"]');
    if (chronicleRecordTarget === 'operation') {
      await waitForVisibleSelector(page, '[data-testid="records-subtab-ops"][data-selected="true"]');
    } else {
      await waitForVisibleSelector(page, '[data-testid="records-subtab-aftermath"][data-selected="true"]');
    }
    await assertSingleShellSurface(page, 'Records');
    await captureEvidence(page, summary, 'archive_chronicle_to_records');
    summary.evidence.archiveChronicleToRecordsDrilldown = true;
    summary.evidence.archiveChronicleDecisionStaysChronicle = false;
  }
  summary.evidence.archiveChronicleToRecordsTarget = chronicleRecordTarget;

  await activateVisibleControl(page, '[data-testid="toolbar-route-records"]');
  await waitForVisibleSelector(page, '[data-testid="records-content"]');
  await activateVisibleControl(page, '[data-testid="records-subtab-decisions"]');
  await waitForVisibleSelector(page, '[data-testid="decision-consequence-records-panel"]');
  if (await visibleSelectorCount(page, '[data-testid="decision-consequence-record"][data-record-target="chronicle"]') > 0) {
    const chronicleDecisionRecordId = await getVisibleSelectorAttribute(
      page,
      '[data-testid="decision-consequence-record"][data-record-target="chronicle"]',
      'data-record-id',
      'Decision consequence Chronicle record id',
    );
    await clickFirstVisibleWithinSelector(
      page,
      '[data-testid="decision-consequence-record"][data-record-target="chronicle"]',
      '[data-testid="decision-consequence-open-chronicle"]',
      'Decision consequence Chronicle route',
    );
    await waitForVisibleSelector(page, '[data-testid="chronicle-overlay"]');
    await waitForVisibleSelector(
      page,
      `[data-focused-chronicle-decision-record-id="${quoteCssAttributeValue(chronicleDecisionRecordId)}"]`,
    );
    await assertSingleShellSurface(page, 'Chronicle');
    await captureEvidence(page, summary, 'archive_records_decision_to_chronicle');
    summary.evidence.archiveRecordsDecisionToChronicleDrilldown = true;
    summary.evidence.archiveRecordsDecisionToChronicleRecordId = chronicleDecisionRecordId;
  } else {
    await captureEvidence(page, summary, 'archive_records_no_chronicle_target');
    summary.evidence.archiveRecordsDecisionToChronicleDrilldown = false;
    summary.evidence.archiveRecordsExcludeChronicleTargets = true;
  }

  await resetToWarMap(page);
  await waitForVisibleSelector(page, '[data-testid="presidential-inbox"]');
  summary.evidence.presidentialInboxVisible = true;
  await activateVisibleControl(page, '[data-testid="toolbar-route-desk"]');
  await waitForVisibleSelector(page, '[data-testid="president-desk-shell"]');
  await activateVisibleControl(page, '[data-testid="desk-action-records"]');
  await waitForVisibleSelector(page, '[data-testid="records-content"]');
  await waitForVisibleSelector(page, '[data-testid="records-subtab-aftermath"][data-selected="true"]');
  await assertSingleShellSurface(page, 'Records');
  await captureEvidence(page, summary, 'archive_desk_to_records');
  summary.evidence.deskRecordsRoute = true;

  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Archive Inbox Drilldown', text);
}

async function runPresidentialInboxRoutingLiveProof(page, summary) {
  await resetToWarMap(page);
  await waitForVisibleSelector(page, '[data-testid="presidential-inbox"]');
  summary.evidence.presidentialInboxVisible = true;

  const inboxOpportunitySelector = `[data-testid="presidential-inbox-card"][data-inbox-action="decision_room"][data-actionable="true"][data-inbox-item-type="operation_opportunity"][data-inbox-item-id="opportunity:${OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID}"]`;
  await activateVisibleControl(page, inboxOpportunitySelector);
  await waitForVisibleSelector(page, '[data-testid="warroom-decision-room-host"]');
  await waitForVisibleSelector(page, '[data-testid="presidential-decision-room"]');
  await waitForVisibleSelector(page, `[data-testid="decision-room-priority-card-opportunity:${OPPORTUNITY_LIVE_FIXTURE_ID}"]`);
  await captureEvidence(page, summary, 'inbox_routing_decision_room');

  await resetToWarMap(page);
  await activateVisibleControl(page, '[data-testid="toolbar-route-desk"]');
  await waitForVisibleSelector(page, '[data-testid="president-desk-shell"]');
  await activateVisibleControl(
    page,
    `[data-testid="desk-card-operation_opportunity"][data-inbox-item-id="opportunity:${OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID}"] [data-testid="desk-card-action"]`,
  );
  await waitForVisibleSelector(page, '[data-testid="warroom-decision-room-host"]');
  await waitForVisibleSelector(page, '[data-testid="presidential-decision-room"]');
  await waitForVisibleSelector(page, `[data-testid="decision-room-priority-card-opportunity:${OPPORTUNITY_LIVE_FIXTURE_ID}"]`);
  await captureEvidence(page, summary, 'inbox_routing_desk_card_operation_opportunity');

  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Presidential Inbox Routing Live Proof', text);
  summary.evidence.presidentialInboxRoutingLiveProof = {
    inboxCard: `opportunity:${OPPORTUNITY_LIVE_FIXTURE_REVIEW_ID}`,
    deskCard: 'desk-card-operation_opportunity',
    reached: 'decision-room',
    targetCard: `opportunity:${OPPORTUNITY_LIVE_FIXTURE_ID}`,
  };
}

async function runOperationOpportunityLedgerLiveProof(page, summary) {
  await resetToWarMap(page);
  await activateVisibleControl(page, '[data-testid="toolbar-route-records"]');
  await waitForVisibleSelector(page, '[data-testid="records-content"]');
  await activateVisibleControl(page, '[data-testid="records-subtab-opportunities"]');
  await waitForVisibleSelector(page, '[data-testid="records-subtab-opportunities"][data-selected="true"]');
  await waitForVisibleSelector(page, '[data-testid="opportunity-ledger-pulse"]');
  await waitForVisibleSelector(
    page,
    `[data-testid="opportunity-ledger-record"][data-proposal-id="${OPPORTUNITY_LIVE_FIXTURE_ID}"][data-status="eligible_pending_review"]`,
  );
  await assertSingleShellSurface(page, 'Records');
  await captureEvidence(page, summary, 'operation_opportunity_ledger_live_proof');

  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Operation Opportunity Ledger Live Proof', text);
  summary.evidence.operationOpportunityLedgerLiveProof = {
    proposalId: OPPORTUNITY_LIVE_FIXTURE_ID,
    status: 'eligible_pending_review',
  };
}

async function runCodexInternalDrilldown(page, summary) {
  await resetToWarMap(page);

  await activateVisibleControl(page, '[data-testid="toolbar-route-codex"]');
  await waitForVisibleSelector(page, '[data-testid="codex-panel"]');
  await assertSingleShellSurface(page, 'Codex');

  const essaySelector = [
    '[data-testid="codex-panel"] [data-testid="codex-essay-row"][data-awwv-codex-state="unlocked"]',
    '[data-testid="codex-panel"] [data-testid="codex-essay-row"][data-awwv-codex-state="ghost"]',
  ].join(', ');
  await activateVisibleControl(page, essaySelector);
  await waitForVisibleSelector(page, '[data-testid="codex-selected-essay"][data-essay-id]');
  await waitForVisibleSelector(
    page,
    '[data-testid="codex-selected-essay-body"][data-awwv-codex-selected-state="unlocked"], [data-testid="codex-selected-essay-body"][data-awwv-codex-selected-state="ghost"]',
  );
  await waitForVisibleSelector(page, '[data-testid="codex-essay-row"][data-selected="true"]');

  summary.evidence.codexDilemmaSpineVisible =
    await visibleSelectorCount(page, '[data-testid="codex-dilemma-spine-section"]') > 0;
  summary.evidence.codexDistanceFromHistoryVisible =
    await visibleSelectorCount(page, '[data-testid="codex-distance-from-history-section"]') > 0;

  await captureEvidence(page, summary, 'codex_internal_selected_essay');
  const text = await visibleText(page);
  assertNoRawTechnicalTokens('Codex Internal Drilldown', text);
  summary.evidence.codexInternalDrilldown = true;
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
      surfaceSweep: {},
      armyHqReachable: false,
      recordsReachable: false,
      armyHqInternalDrilldown: false,
      armyHqPersonnelBrigadeLiveProof: false,
      armyHqSectorFrontSegmentLiveProof: false,
      mapContextMenuLiveProof: false,
      ownerJourneyDrilldown: false,
      ownerJourneyDrilldownByFaction: {},
      ownerJourneyOpsPlanningModal: false,
      ownerJourneyOpsPlanningModalByFaction: {},
      ownerJourneyStartupFixtureByFaction: {},
      recordsAarFormationLinkLiveProof: false,
      battleMarkerLiveProof: false,
      recordsAarFixture: false,
      turnZeroSetupProvenanceFixture: false,
      turnZeroSetupProvenanceLiveProof: false,
      operationOpportunityFixture: false,
      archiveChronicleToRecordsDrilldown: false,
      archiveRecordsDecisionToChronicleDrilldown: false,
      presidentialInboxVisible: false,
      presidentialInboxRoutingLiveProof: false,
      operationOpportunityLedgerLiveProof: false,
      deskRecordsRoute: false,
      codexInternalDrilldown: false,
      codexDilemmaSpineVisible: false,
      codexDistanceFromHistoryVisible: false,
      serverPortCleanupVerified: false,
    },
    consoleMessages: [],
  };
  const server = process.env.AWWV_LIVE_SURFACE_BROWSER_URL ? null : startDevServer();
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

    await runFoundationalFlow(page, summary);
    await runSurfaceSweep(page, summary);
    await runArmyHqInternalDrilldown(page, summary);
    await runArmyHqPersonnelBrigadeLiveProof(page, summary);
    await runArmyHqSectorFrontSegmentLiveProof(page, summary);
    await runMapContextMenuLiveProof(page, summary);
    await runOwnerJourneyDrilldown(page, summary);
    await runArchiveInboxDrilldown(page, summary);
    await runCodexInternalDrilldown(page, summary);
    await loadPlayerFactionStartupFixture(page, summary, 'RS');
    await runOwnerJourneyDrilldown(page, summary, 'RS');
    await runTurnZeroSetupProvenanceLiveProof(page, summary);
    await loadOperationOpportunityLiveProofFixture(page, summary);
    await runPresidentialInboxRoutingLiveProof(page, summary);
    await runOperationOpportunityLedgerLiveProof(page, summary);
    await loadRecordsAarLiveProofFixture(page, summary);
    await runBattleMarkerLiveProof(page, summary);
    await runRecordsAarFormationLinkLiveProof(page, summary);
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
      const evidencePath = path.join(OUT_DIR, 'live_surface_browser_sweep.json');
      fs.writeFileSync(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
      console.log('live surface browser sweep ok');
      console.log(`evidence: ${evidencePath}`);
    } else {
      const evidencePath = path.join(OUT_DIR, 'live_surface_browser_sweep_failed.json');
      ensureDir(OUT_DIR);
      fs.writeFileSync(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }
  }
  if (caughtError) throw caughtError;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
