// Ad-hoc investigative playthrough (NOT a permanent repo tool — not wired into any
// npm script). Launches the REAL Electron desktop app via Playwright and plays a
// full campaign as RS, deliberately choosing ahistorical/counterfactual event
// options and firing every presidential lever as often as possible, to find out
// how much the engine railroads the player back to the historical outcome.
//
// Drives decisions through window.awwv.* — the exact contextBridge surface the
// real UI buttons call (src/desktop/preload.cjs -> src/desktop/electron-main.cjs
// ipcMain handlers). This is the real Electron process, the real IPC path, the
// real engine — not a headless shortcut.
'use strict';

import { _electron as electron } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, appendFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const __dirname_ = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname_, '../..');
const MUNICIPALITY_IDS = Object.keys(
  JSON.parse(readFileSync(join(REPO_ROOT, 'data/derived/municipality_hq_settlement.json'), 'utf8')).by_mun1990_id,
).sort();
// weapons_shipment / croatian_support_package are faction-restricted (confirmed at
// runtime: RS gets "Invalid municipality support type" for both) — staff_priority is
// the faction-agnostic lever, so that's what RS rotates through.
const SUPPORT_TYPES = ['staff_priority'];
const OUT_DIR = 'C:/Users/User/AppData/Local/Temp/claude/F--A-War-Without-Victory/9734fb27-cf65-4213-8371-96c33f5cb07e/scratchpad/rs_ahistorical_run';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });

const LOG_PATH = join(OUT_DIR, 'log.jsonl');
const CHECKPOINT_PATH = join(OUT_DIR, 'CHECKPOINT.md');
const ANOMALIES_PATH = join(OUT_DIR, 'anomalies.jsonl');

const FACTION = 'RS';
const TURN_CAP = 420; // safety net well past 188w; real games typically end via Dayton/collapse before this
const SCREENSHOT_EVERY = 15;

function nowIso() { return new Date().toISOString(); }
function log(entry) {
  appendFileSync(LOG_PATH, JSON.stringify({ ts: nowIso(), ...entry }) + '\n');
}
function anomaly(entry) {
  appendFileSync(ANOMALIES_PATH, JSON.stringify({ ts: nowIso(), ...entry }) + '\n');
  console.log('[ANOMALY]', JSON.stringify(entry));
}
function say(...args) { console.log(...args); }

const tally = {
  turns_advanced: 0,
  decisions_resolved: 0,
  decisions_diverged: 0,
  front_visits: 0,
  address_nations: 0,
  decorate_units: 0,
  replace_co_attempts: 0,
  replace_co_ok: 0,
  stop_op_attempts: 0,
  stop_op_ok: 0,
  force_launch_proposal_attempts: 0,
  force_launch_proposal_ok: 0,
  request_op_attempts: 0,
  request_op_ok: 0,
  request_op_rejected: 0,
  elite_deploy_attempts: 0,
  elite_deploy_ok: 0,
  local_support_attempts: 0,
  local_support_ok: 0,
  ca_insufficient_blocks: 0,
  console_errors: 0,
  page_errors: 0,
};

function writeCheckpoint(extra) {
  const lines = [
    `# RS ahistorical playthrough — live checkpoint`,
    ``,
    `Updated: ${nowIso()}`,
    ``,
    '```json',
    JSON.stringify(tally, null, 2),
    '```',
    ``,
    extra ? extra : '',
  ];
  writeFileSync(CHECKPOINT_PATH, lines.join('\n'));
}

async function ipc(page, method, ...args) {
  return page.evaluate(([m, a]) => window.awwv[m](...a), [method, args]);
}

async function getState(page) {
  const raw = await page.evaluate(() => window.awwv.getCurrentGameState());
  if (raw == null) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function countRsTerritory(state) {
  const pc = state?.political?.political_controllers ?? {};
  let rs = 0, total = 0;
  for (const k of Object.keys(pc)) {
    total++;
    if (pc[k] === 'RS') rs++;
  }
  return { rs, total };
}

const ICONIC_PATTERNS = [
  { key: 'sarajevo', re: /sarajevo/i },
  { key: 'tuzla', re: /tuzla/i },
  { key: 'gorazde', re: /gorazde|goražde/i },
  { key: 'bihac', re: /bihac|bihać/i },
  { key: 'srebrenica', re: /srebrenica/i },
  { key: 'zepa', re: /zepa|žepa/i },
  { key: 'mostar', re: /mostar/i },
  { key: 'brcko', re: /brcko|brčko/i },
];

function classifyIconicOsids(state) {
  const pc = state?.political?.political_controllers ?? {};
  const out = {};
  for (const { key, re } of ICONIC_PATTERNS) {
    out[key] = Object.keys(pc).filter((id) => re.test(id)).map((id) => ({ id, control: pc[id] }));
  }
  return out;
}

// Pick the most "ahistorical" response for a pending decision.
function chooseAhistoricalResponse(decision) {
  const opts = decision.response_options ?? decision.options ?? [];
  if (opts.length === 0) return null;
  const counterfactual = opts.find((o) => o.historical_marker === 'counterfactual');
  if (counterfactual) return counterfactual.id;
  const nonDefault = opts.find((o) => o.id !== decision.historical_default_response_id);
  if (nonDefault) return nonDefault.id;
  // Only one option, or no historical_default marked: avoid options[0] (bots default to
  // options[0] = historical choice per this project's own convention) if there's a choice.
  if (opts.length > 1) return opts[opts.length - 1].id;
  return opts[0].id;
}

async function resolveAllPendingDecisions(page, faction) {
  let guard = 0;
  while (guard++ < 25) {
    const state = await getState(page);
    if (!state) break;
    const pending = (state.military?.pending_event_decisions ?? []).filter((d) => d.faction === faction);
    if (pending.length === 0) break;
    for (const d of pending) {
      const responseId = chooseAhistoricalResponse(d);
      if (!responseId) continue;
      const diverged = d.historical_default_response_id !== undefined && responseId !== d.historical_default_response_id;
      let result;
      try {
        result = await ipc(page, 'respondToEventDecision', d.event_id, responseId);
      } catch (e) {
        anomaly({ type: 'decision_call_threw', eventId: d.event_id, error: String(e) });
        continue;
      }
      tally.decisions_resolved++;
      if (diverged) tally.decisions_diverged++;
      log({
        type: 'decision',
        turn: state.meta?.turn,
        eventId: d.event_id,
        title: d.event_title,
        chosen: responseId,
        historicalDefault: d.historical_default_response_id,
        diverged,
        ok: result?.ok !== false,
        result,
      });
      if (result?.ok === false) {
        anomaly({ type: 'decision_resolve_failed', eventId: d.event_id, responseId, result });
      }
    }
  }
}

// Player-decision families beyond plain event decisions (src/state/player_decision_manifest.ts).
// Some of these (peace_plan, paramilitary_request) can hard-block advance-turn; resolve
// them proactively each turn rather than relying solely on the blocked_decisions retry path.
async function resolveOtherDecisionFamilies(page) {
  const state = await getState(page);
  if (!state) return;

  const peacePlan = state.military?.negotiation?.pending_peace_plan;
  if (peacePlan?.plan_id) {
    // Doctrine: reject peace plans (maximal ahistorical war continuation, per the user's
    // brief) so the campaign runs its full ahistorical course rather than truncating early.
    let result;
    try {
      result = await ipc(page, 'resolvePeacePlan', peacePlan.plan_id, 'rejected');
    } catch (e) {
      anomaly({ type: 'peace_plan_threw', planId: peacePlan.plan_id, error: String(e) });
      return;
    }
    log({ type: 'decision_family', family: 'peace_plan', planId: peacePlan.plan_id, chosen: 'rejected', result });
    if (result?.ok === false) anomaly({ type: 'peace_plan_resolve_failed', planId: peacePlan.plan_id, result });
  }

  const paramilitary = (state.pending_paramilitary_requests ?? []).filter(
    (r) => !r.faction || r.faction === FACTION,
  );
  if (paramilitary.length > 0) {
    // Doctrine: deny paramilitary integration requests (assert central command authority
    // over irregulars) — a legitimate ahistorical-strengthening choice that avoids
    // deliberately roleplaying atrocity-adjacent escalation. Documented in the final report.
    const decisions = paramilitary
      .filter((r) => typeof r.target_osid === 'string')
      .map((r) => ({ target_osid: r.target_osid, decision: 'deny' }));
    if (decisions.length > 0) {
      let result;
      try {
        result = await ipc(page, 'resolveParamilitaryRequests', decisions, {});
      } catch (e) {
        anomaly({ type: 'paramilitary_threw', error: String(e) });
        return;
      }
      log({ type: 'decision_family', family: 'paramilitary_request', count: decisions.length, chosen: 'deny', result });
      if (result?.ok === false) anomaly({ type: 'paramilitary_resolve_failed', result });
    }
  }

  const convoys = (state.military?.pending_convoy_decisions ?? []).filter((c) => !c.decision);
  for (const c of convoys) {
    let result;
    try {
      result = await ipc(page, 'stageConvoyDecision', c.id, 'divert');
    } catch (e) {
      anomaly({ type: 'convoy_threw', convoyId: c.id, error: String(e) });
      continue;
    }
    log({ type: 'decision_family', family: 'convoy_decision', convoyId: c.id, chosen: 'divert', result });
    if (result?.ok === false) anomaly({ type: 'convoy_resolve_failed', convoyId: c.id, result });
  }

  const dayton = state.military?.negotiation?.pending_dayton;
  if (dayton) {
    let result;
    try {
      result = await ipc(page, 'resolveDayton', dayton);
    } catch (e) {
      anomaly({ type: 'dayton_threw', error: String(e) });
      return;
    }
    log({ type: 'decision_family', family: 'dayton_negotiation', chosen: 'echo_pending_proposal', result });
    if (result?.ok === false) anomaly({ type: 'dayton_resolve_failed', result });
  }
}

async function tryLeadershipGesture(page, kind, availMethod, initMethod, costTallyKey) {
  let avail;
  try {
    avail = await ipc(page, availMethod);
  } catch (e) {
    anomaly({ type: 'availability_call_threw', kind, error: String(e) });
    return;
  }
  if (!avail || avail.ok === false || avail.available !== true) {
    if (avail && avail.reason && avail.reason !== 'insufficient_ca' && avail.reason !== 'cooldown') {
      log({ type: 'lever_unavailable', kind, reason: avail.reason ?? avail.error });
    }
    return;
  }
  let result;
  try {
    result = await ipc(page, initMethod);
  } catch (e) {
    anomaly({ type: 'initiate_call_threw', kind, error: String(e) });
    return;
  }
  log({ type: 'lever', kind, result });
  if (result?.ok) {
    tally[costTallyKey]++;
  } else if (result?.reason === 'insufficient_ca') {
    tally.ca_insufficient_blocks++;
  } else {
    anomaly({ type: 'lever_failed_unexpectedly', kind, result });
  }
}

async function tryReplaceCO(page, state) {
  const corpsIds = Object.keys(state.military?.corps_command ?? {}).filter(
    (id) => state.military?.formations?.[id]?.faction === FACTION,
  ).sort();
  for (const corpsId of corpsIds) {
    const cc = state.military.corps_command[corpsId];
    if (cc.pending_co_replacement) continue;
    tally.replace_co_attempts++;
    let result;
    try {
      result = await ipc(page, 'stageCoReplacementOrder', { corpsId });
    } catch (e) {
      anomaly({ type: 'replace_co_threw', corpsId, error: String(e) });
      continue;
    }
    log({ type: 'lever', kind: 'replace_co', corpsId, result });
    if (result?.ok) tally.replace_co_ok++;
    else if (/insufficient_command_authority/.test(result?.error ?? '')) tally.ca_insufficient_blocks++;
    else if (result?.error && result.error !== 'no_reserve_candidate' && !/no.*officer/i.test(result.error)) {
      anomaly({ type: 'replace_co_unexpected_error', corpsId, result });
    }
    if (/insufficient_command_authority/.test(result?.error ?? '')) break; // CA exhausted; further corps would just repeat the same block
  }
}

async function tryStopOp(page, state) {
  const corpsIds = Object.keys(state.military?.corps_command ?? {}).filter(
    (id) => state.military?.formations?.[id]?.faction === FACTION,
  ).sort();
  for (const corpsId of corpsIds) {
    const cc = state.military.corps_command[corpsId];
    if (cc.pending_op_halt) continue;
    const ops = cc.active_operations ?? [];
    if (ops.length === 0) continue;
    const op = ops[0];
    tally.stop_op_attempts++;
    let result;
    try {
      result = await ipc(page, 'stageOpHaltOrder', { corpsId, opName: op.name });
    } catch (e) {
      anomaly({ type: 'stop_op_threw', corpsId, error: String(e) });
      continue;
    }
    log({ type: 'lever', kind: 'stop_op', corpsId, opName: op.name, result });
    if (result?.ok) tally.stop_op_ok++;
    else if (/insufficient_command_authority/.test(result?.error ?? '')) { tally.ca_insufficient_blocks++; break; }
    else anomaly({ type: 'stop_op_unexpected_error', corpsId, result });
  }
}

async function tryForceLaunchProposals(page, state) {
  const proposals = (state.meta?.pending_proposal_reviews ?? []).filter((p) => !p.resolved && !p.accepted);
  for (const p of proposals) {
    if (typeof p.proposed_action !== 'string' || !p.proposed_action.startsWith('APPROVE_OP:')) continue;
    tally.force_launch_proposal_attempts++;
    let result;
    try {
      result = await ipc(page, 'forceLaunchProposal', p.proposal_id ?? p.id);
    } catch (e) {
      anomaly({ type: 'force_launch_proposal_threw', error: String(e) });
      continue;
    }
    log({ type: 'lever', kind: 'force_launch_proposal', proposalId: p.proposal_id ?? p.id, result });
    if (result?.ok) tally.force_launch_proposal_ok++;
    else if (/insufficient_command_authority/.test(result?.error ?? '')) tally.ca_insufficient_blocks++;
    else anomaly({ type: 'force_launch_proposal_unexpected_error', result });
  }
}

let requestOpTargetCursor = 0;
async function tryRequestOp(page, state) {
  const pc = state?.political?.political_controllers ?? {};
  const nonRsIds = Object.keys(pc).filter((id) => pc[id] && pc[id] !== FACTION).sort();
  if (nonRsIds.length === 0) return;
  // Prefer iconic never-historically-taken targets first, then rotate through the rest.
  const iconic = nonRsIds.filter((id) => ICONIC_PATTERNS.some(({ re }) => re.test(id)));
  const pool = iconic.length > 0 ? iconic : nonRsIds;

  const corpsIds = Object.keys(state.military?.corps_command ?? {}).filter(
    (id) => state.military?.formations?.[id]?.faction === FACTION,
  ).sort();
  for (const corpsId of corpsIds) {
    const cc = state.military.corps_command[corpsId];
    if (cc.pending_op_directive) continue;
    const targetOsid = pool[requestOpTargetCursor % pool.length];
    requestOpTargetCursor++;
    tally.request_op_attempts++;
    let result;
    try {
      result = await ipc(page, 'stageOpDirectiveOrder', { corpsId, targetOsid });
    } catch (e) {
      anomaly({ type: 'request_op_threw', corpsId, targetOsid, error: String(e) });
      continue;
    }
    log({ type: 'lever', kind: 'request_op', corpsId, targetOsid, result });
    if (result?.ok) tally.request_op_ok++;
    else if (/insufficient_command_authority/.test(result?.error ?? '')) { tally.ca_insufficient_blocks++; break; }
    else {
      tally.request_op_rejected++;
    }
  }
}

async function tryEliteDeploy(page, state) {
  const requests = (state.military?.pending_reserve_requests ?? []).filter((r) => r.faction === FACTION);
  if (requests.length === 0) return;
  const tracker = state.military?.elite_brigade_tracker ?? {};
  const eligible = Object.keys(tracker).filter((bId) => {
    const t = tracker[bId];
    return t && (t.active_episode_index === null || t.active_episode_index === undefined);
  }).sort();
  if (eligible.length === 0) return;
  const req = requests[0];
  const brigadeId = eligible[0];
  tally.elite_deploy_attempts++;
  let result;
  try {
    result = await ipc(page, 'approveReserveRequest', req.request_id, brigadeId, 'ahistorical maximal presidential intervention');
  } catch (e) {
    anomaly({ type: 'elite_deploy_threw', error: String(e) });
    return;
  }
  log({ type: 'lever', kind: 'elite_deploy', requestId: req.request_id, brigadeId, result });
  if (result?.ok) tally.elite_deploy_ok++;
  else if (/insufficient_command_authority/.test(result?.error ?? '')) tally.ca_insufficient_blocks++;
  else anomaly({ type: 'elite_deploy_unexpected_error', result });
}

let localSupportCursor = 0;
// Local Support (municipality panel footer lever, no separate CA cost per the UI
// contract): rotate through all municipalities and support types so the whole
// lever surface gets exercised over the campaign, not just the ones the tactical
// map UI recon happened to click on.
async function tryLocalSupport(page, state) {
  if (MUNICIPALITY_IDS.length === 0) return;
  const munId = MUNICIPALITY_IDS[localSupportCursor % MUNICIPALITY_IDS.length];
  const supportType = SUPPORT_TYPES[localSupportCursor % SUPPORT_TYPES.length];
  localSupportCursor++;
  const existing = state.municipality_support_orders?.[FACTION];
  if (existing?.mun_id === munId && existing?.type === supportType) return; // already staged identically
  tally.local_support_attempts++;
  let result;
  try {
    result = await ipc(page, 'stageMunicipalitySupportOrder', { faction: FACTION, munId, type: supportType });
  } catch (e) {
    anomaly({ type: 'local_support_threw', munId, supportType, error: String(e) });
    return;
  }
  log({ type: 'lever', kind: 'local_support', munId, supportType, result });
  if (result?.ok) tally.local_support_ok++;
  else if (/insufficient_command_authority/.test(result?.error ?? '')) tally.ca_insufficient_blocks++;
  else if (result?.error && !/not.*(found|control|eligible)/i.test(result.error)) {
    anomaly({ type: 'local_support_unexpected_error', munId, supportType, result });
  }
}

async function advanceWithRetry(page) {
  let guard = 0;
  while (guard++ < 10) {
    let result;
    try {
      result = await ipc(page, 'advanceTurn', {});
    } catch (e) {
      anomaly({ type: 'advance_turn_threw', error: String(e) });
      return { ok: false, error: String(e) };
    }
    if (result?.ok) return result;
    if (result?.error === 'pending_required_decisions' && Array.isArray(result.blocked_decisions) && result.blocked_decisions.length > 0) {
      let resolvedAny = false;
      const unresolvedNonEvent = result.blocked_decisions.filter((bd) => bd.family_id && bd.family_id !== 'event_decision');
      for (const bd of result.blocked_decisions) {
        if (bd.family_id && bd.family_id !== 'event_decision') continue; // handled below via resolveOtherDecisionFamilies
        const state = await getState(page);
        const d = (state?.military?.pending_event_decisions ?? []).find((x) => x.event_id === bd.event_id);
        if (!d) {
          anomaly({ type: 'blocked_decision_not_found_in_pending', blocked: bd });
          continue;
        }
        const responseId = chooseAhistoricalResponse(d);
        if (!responseId) continue;
        const r = await ipc(page, 'respondToEventDecision', d.event_id, responseId);
        resolvedAny = true;
        log({ type: 'decision', turn: state?.meta?.turn, eventId: d.event_id, title: d.event_title, chosen: responseId, forcedByBlock: true, ok: r?.ok !== false });
      }
      if (unresolvedNonEvent.length > 0) {
        await resolveOtherDecisionFamilies(page);
        resolvedAny = true;
      }
      if (!resolvedAny) {
        anomaly({ type: 'advance_turn_blocked_unresolvable', blocked_decisions: result.blocked_decisions, guard });
        return result;
      }
      continue;
    }
    anomaly({ type: 'advance_turn_failed', result, guard });
    return result;
  }
  anomaly({ type: 'advance_turn_retry_exhausted' });
  return { ok: false, error: 'retry_exhausted' };
}

async function screenshot(page, name) {
  try {
    await page.screenshot({ path: join(OUT_DIR, 'screenshots', `${name}.png`) });
  } catch (e) {
    anomaly({ type: 'screenshot_failed', name, error: String(e) });
  }
}

async function main() {
  say('[playthrough] launching Electron from', REPO_ROOT);
  const electronApp = await electron.launch({ args: ['.'], cwd: REPO_ROOT, timeout: 120000 });
  electronApp.on('window', (win) => {
    win.on('console', (msg) => {
      if (msg.type() === 'error') {
        tally.console_errors++;
        anomaly({ type: 'console_error', text: msg.text() });
      }
    });
    win.on('pageerror', (err) => {
      tally.page_errors++;
      anomaly({ type: 'page_error', message: err.message, stack: err.stack });
    });
  });

  // firstWindow() is unreliable here: the packaged app opens a DevTools window
  // whose 'window' event can fire before/instead of the real app window's, so
  // firstWindow() sometimes returns the devtools:// page. Poll for a non-devtools
  // window instead.
  let page = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const candidates = electronApp.windows();
    page = candidates.find((w) => {
      try { return !w.url().startsWith('devtools:'); } catch { return false; }
    }) ?? null;
    if (page) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!page) throw new Error('Could not find non-devtools app window after 30s');
  say('[playthrough] resolved app window url=' + page.url());
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      tally.console_errors++;
      anomaly({ type: 'console_error', text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    tally.page_errors++;
    anomaly({ type: 'page_error', message: err.message, stack: err.stack });
  });
  await page.waitForLoadState('domcontentloaded');
  say('[playthrough] main window loaded (url=' + page.url() + '), waiting for window.awwv...');
  await screenshot(page, '000a_pre_awwv_wait');
  try {
    await page.waitForFunction(() => typeof window.awwv !== 'undefined' && typeof window.awwv.startNewCampaign === 'function', undefined, { timeout: 60000 });
  } catch (e) {
    await screenshot(page, '000b_awwv_wait_timeout');
    const title = await page.title().catch(() => '<err>');
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000)).catch(() => '<err>');
    anomaly({ type: 'awwv_wait_timeout_diagnostics', url: page.url(), title, bodyText });
    throw e;
  }

  say('[playthrough] starting new campaign as RS');
  const startResult = await ipc(page, 'startNewCampaign', { playerFaction: FACTION, scenarioKey: 'apr_1992' });
  log({ type: 'campaign_start', result: { ok: startResult?.ok } });
  if (!startResult?.ok) {
    anomaly({ type: 'campaign_start_failed', result: startResult });
    throw new Error('startNewCampaign failed: ' + JSON.stringify(startResult));
  }

  await screenshot(page, '000_campaign_start');

  // ── One-time UI recon: open the tactical map, click a settlement, capture the
  // settlement info panel (answers "what's at the bottom of the settlement panel")
  // and gives a real visual QA pass, not just IPC state.
  try {
    const before = new Set(electronApp.windows());
    await ipc(page, 'openTacticalMapWindow', {});
    let mapWindow = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const fresh = electronApp.windows().filter((w) => !before.has(w) && !w.url().startsWith('devtools:'));
      if (fresh.length > 0) { mapWindow = fresh[fresh.length - 1]; break; }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (mapWindow) {
      await mapWindow.waitForLoadState('domcontentloaded').catch(() => {});
      await mapWindow.waitForTimeout(4000);
      await mapWindow.screenshot({ path: join(OUT_DIR, 'screenshots', '001_tactical_map.png') }).catch((e) => anomaly({ type: 'map_screenshot_failed', error: String(e) }));
      // Click roughly center-map to try to select a settlement; MapLibre canvas hit-testing
      // means this is best-effort — the screenshot is the real evidence either way.
      const box = mapWindow.viewportSize() ?? { width: 1280, height: 800 };
      await mapWindow.mouse.click(box.width / 2, box.height / 2).catch(() => {});
      await mapWindow.waitForTimeout(1500);
      await mapWindow.screenshot({ path: join(OUT_DIR, 'screenshots', '002_after_map_click.png') }).catch((e) => anomaly({ type: 'map_click_screenshot_failed', error: String(e) }));
      const panelVisible = await mapWindow.locator('[data-testid="settlement-detail-panel"]').count().catch(() => 0);
      log({ type: 'ui_recon', panelVisibleAfterCenterClick: panelVisible > 0 });
      if (panelVisible > 0) {
        await mapWindow.locator('[data-testid="settlement-detail-panel"]').screenshot({ path: join(OUT_DIR, 'screenshots', '003_settlement_panel.png') }).catch(() => {});
      }
    } else {
      anomaly({ type: 'tactical_map_window_did_not_open' });
    }
  } catch (e) {
    anomaly({ type: 'ui_recon_threw', error: String(e) });
  }

  writeCheckpoint('UI recon complete. Beginning turn loop.');

  // ── Main campaign loop ──────────────────────────────────────────────────────
  let baselineIconic = null;
  for (let i = 0; i < TURN_CAP; i++) {
    let state = await getState(page);
    if (!state) { anomaly({ type: 'state_null_mid_loop' }); break; }
    if (state.meta?.game_over) {
      log({ type: 'game_over_detected', turn: state.meta?.turn, verdict: state.meta?.game_over_verdict ?? null });
      break;
    }
    if (baselineIconic === null) baselineIconic = classifyIconicOsids(state);

    await resolveAllPendingDecisions(page, FACTION);
    await resolveOtherDecisionFamilies(page);

    state = await getState(page);
    if (!state) break;

    await tryLeadershipGesture(page, 'front_visit', 'getFrontVisitAvailability', 'initiateFrontVisit', 'front_visits');
    await tryLeadershipGesture(page, 'address_nation', 'getAddressNationAvailability', 'initiateAddressNation', 'address_nations');
    await tryLeadershipGesture(page, 'decorate_unit', 'getDecorateUnitAvailability', 'initiateDecorateUnit', 'decorate_units');

    state = await getState(page);
    if (state) {
      await tryReplaceCO(page, state);
      await tryStopOp(page, state);
      await tryForceLaunchProposals(page, state);
      await tryRequestOp(page, state);
      await tryEliteDeploy(page, state);
      await tryLocalSupport(page, state);
    }

    // Resolve anything the leadership gestures / levers injected before advancing.
    await resolveAllPendingDecisions(page, FACTION);
    await resolveOtherDecisionFamilies(page);

    const preAdvanceState = await getState(page);
    const preTerritory = preAdvanceState ? countRsTerritory(preAdvanceState) : null;

    const advanceResult = await advanceWithRetry(page);
    tally.turns_advanced++;

    const postState = await getState(page);
    const postTerritory = postState ? countRsTerritory(postState) : null;

    log({
      type: 'turn_summary',
      turn: postState?.meta?.turn ?? preAdvanceState?.meta?.turn,
      rsTerritory: postTerritory,
      territoryDelta: preTerritory && postTerritory ? postTerritory.rs - preTerritory.rs : null,
      advanceOk: advanceResult?.ok !== false,
      tally: { ...tally },
    });

    if (postState) {
      const iconicNow = classifyIconicOsids(postState);
      for (const key of Object.keys(iconicNow)) {
        const before = baselineIconic[key] ?? [];
        const now = iconicNow[key];
        for (const nowOsid of now) {
          const beforeOsid = before.find((b) => b.id === nowOsid.id);
          if (beforeOsid && beforeOsid.control !== nowOsid.control) {
            log({ type: 'iconic_osid_control_change', key, osid: nowOsid.id, from: beforeOsid.control, to: nowOsid.control, turn: postState.meta?.turn });
            baselineIconic[key] = now;
          }
        }
      }
    }

    if (i % SCREENSHOT_EVERY === 0) {
      await screenshot(page, `turn_${String(postState?.meta?.turn ?? i).padStart(3, '0')}`);
      writeCheckpoint(`Last logged turn: ${postState?.meta?.turn ?? 'unknown'}\nRS territory: ${postTerritory ? postTerritory.rs + '/' + postTerritory.total : 'n/a'}`);
    }

    if (advanceResult?.ok === false && advanceResult?.error !== 'pending_required_decisions') {
      anomaly({ type: 'stuck_advance_turn_failure', result: advanceResult, turn: postState?.meta?.turn });
      // Try a few more times before giving up entirely.
      let stuckGuard = 0;
      let recovered = false;
      while (stuckGuard++ < 5) {
        const r2 = await advanceWithRetry(page);
        if (r2?.ok) { recovered = true; break; }
      }
      if (!recovered) {
        log({ type: 'loop_aborted_stuck', turn: postState?.meta?.turn });
        break;
      }
    }
  }

  const finalState = await getState(page);
  await screenshot(page, 'final_state');
  log({ type: 'run_complete', finalTurn: finalState?.meta?.turn, gameOver: finalState?.meta?.game_over ?? false, tally: { ...tally } });
  writeCheckpoint(`RUN COMPLETE at turn ${finalState?.meta?.turn}. game_over=${finalState?.meta?.game_over ?? false}`);

  if (finalState) {
    writeFileSync(join(OUT_DIR, 'final_state.json'), JSON.stringify(finalState, null, 2));
  }

  await electronApp.close();
  say('[playthrough] done.');
}

main().catch((e) => {
  anomaly({ type: 'fatal', error: String(e && e.stack ? e.stack : e) });
  writeCheckpoint(`RUN CRASHED: ${e}`);
  process.exitCode = 1;
});
