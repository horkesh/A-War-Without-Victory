'use strict';
/**
 * EVENT-ANCHORS (SHAPE, orchestrator ruling §61) and AREA-BANDS (RECORDED, ruling §63) rows for
 * tools/verify_checkpoints.cjs. Neither row changes the tool's exit code.
 *
 * ONE SOURCE: the anchor lists are read from src/scenario/historical_anchors.ts at run time through
 * tsx's namespaced CommonJS loader (`tsx/cjs/api`, a devDependency already in node_modules). There
 * is no copied list here. If the TS file cannot be loaded the rows print UNAVAILABLE.
 *
 * TURN INDEXING. `runTurn` increments `meta.turn` before any phase runs, so the first simulated week
 * is turn 1 and turn 0 is the initial state. Events fire in the `evaluate-events` phase at that
 * post-increment turn and record it in `military.event_last_fired_turn`; control flips carry the same
 * turn in `political.control_events`, and the weekly report's `week_index` is the same number. The
 * anchors' `expected_week_max` and the bands' `at_week` are compared against that turn directly.
 */
const fs = require('fs');
const path = require('path');

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const ANCHORS_TS = path.join(__dirname, '..', '..', 'src', 'scenario', 'historical_anchors.ts');
const OSID_AREAS_JSON = path.join(__dirname, '..', '..', 'data', 'derived', 'operational', 'osid_areas.json');

/** Every HISTORICAL_EVENT_ANCHORS_* and HISTORICAL_AREA_BANDS_* export, tagged with its epoch suffix. */
function loadHistoricalAnchors(tsPath = ANCHORS_TS) {
  const { require: tsxRequire } = require('tsx/cjs/api');
  const mod = tsxRequire(tsPath, __filename);
  const eventAnchors = [];
  const areaBands = [];
  for (const key of Object.keys(mod).sort(cmp)) {
    let m = /^HISTORICAL_EVENT_ANCHORS_(.+)$/.exec(key);
    if (m) { for (const a of mod[key]) eventAnchors.push({ ...a, epoch: m[1] }); continue; }
    m = /^HISTORICAL_AREA_BANDS_(.+)$/.exec(key);
    if (m) for (const b of mod[key]) areaBands.push({ ...b, epoch: m[1] });
  }
  // Chronological; ties broken by id so the order never depends on export order.
  eventAnchors.sort((a, b) => cmp(a.expected_week_max, b.expected_week_max) || cmp(a.event_id, b.event_id));
  const FACTION_ORDER = { RS: 0, RBiH: 1, HRHB: 2 };
  areaBands.sort((a, b) => cmp(a.at_week, b.at_week)
    || cmp(FACTION_ORDER[a.faction] ?? 9, FACTION_ORDER[b.faction] ?? 9) || cmp(a.faction, b.faction));
  return { eventAnchors, areaBands };
}

/**
 * 'player' when a human faction is set and the harness is not auto-controlling it; otherwise the
 * recorded bot decision mode ('emergent', or 'historical' when unset, as the Farz rows read it).
 */
function runDecisionMode(meta) {
  const m = meta || {};
  if (m.player_faction && m.headless_scenario_auto_control !== true) return 'player';
  return m.decision_mode === 'emergent' ? 'emergent' : 'historical';
}

/**
 * Fire record per event id from the final save. `event_last_fired_turn` is the turn source; when an
 * event fired more than once (`event_fire_counts` > 1) the last turn is not the first, so the first
 * `events_fired` week from weekly_report.jsonl is used when the run has one. An id listed only in
 * `fired_event_ids` has no turn (`turn: null`).
 */
function fireRecords(military, weeklyFirstFire) {
  const mil = military || {};
  const last = mil.event_last_fired_turn || {};
  const counts = mil.event_fire_counts || {};
  const out = new Map();
  for (const id of Object.keys(last).sort(cmp)) {
    const n = Number(counts[id] ?? 1);
    let turn = last[id];
    let note = '';
    if (n > 1) {
      const first = weeklyFirstFire && weeklyFirstFire.get(id);
      if (Number.isFinite(first) && first <= turn) turn = first;
      else note = ` (last of ${n} fires)`;
    }
    out.set(id, { turn, note });
  }
  for (const id of (mil.fired_event_ids || [])) if (!out.has(id)) out.set(id, { turn: null, note: ' (no fire turn recorded)' });
  return out;
}

/**
 * Hands-off historical: primary on time and no alt leg = PASS; both legs = FAIL; alt leg only =
 * ALT-PATH PASS (red); primary late or nothing = FAIL. Emergent and player: either leg passes,
 * both legs are NOTED. A run that ends before the deadline with nothing fired is a GAP.
 */
function evaluateEventAnchor(anchor, fires, mode, finalTurn) {
  const deadline = anchor.expected_week_max + anchor.tolerance;
  const primary = fires.get(anchor.event_id) || null;
  const altIds = (anchor.xor_with || []).slice().sort(cmp);
  const altsFired = altIds.filter((id) => fires.has(id)).map((id) => ({ id, ...fires.get(id) }));
  const onTime = primary != null && primary.turn != null && primary.turn <= deadline;
  const both = primary != null && altsFired.length > 0;
  let status;
  let reason = '';
  if (mode === 'historical') {
    if (both) { status = 'FAIL'; reason = 'both legs fired'; }
    else if (onTime) status = 'PASS';
    else if (altsFired.length > 0) { status = 'ALT-PATH PASS'; reason = 'only the alternative leg fired'; }
    else if (primary) { status = 'FAIL'; reason = primary.turn == null ? 'primary fired, no fire turn recorded' : 'primary fired late'; }
    else if (Number.isFinite(finalTurn) && finalTurn < deadline) { status = 'GAP'; reason = `run ends t${finalTurn}, before the deadline`; }
    else { status = 'FAIL'; reason = 'nothing fired'; }
  } else if (onTime || altsFired.length > 0) {
    status = 'PASS';
    if (both) reason = 'both legs fired (NOTED, not failed)';
    else if (!onTime) reason = 'via the alternative leg';
  } else if (primary) { status = 'FAIL'; reason = primary.turn == null ? 'primary fired, no fire turn recorded' : 'primary fired late'; }
  else if (Number.isFinite(finalTurn) && finalTurn < deadline) { status = 'GAP'; reason = `run ends t${finalTurn}, before the deadline`; }
  else { status = 'FAIL'; reason = 'nothing fired'; }
  return { anchor, deadline, primary, altIds, altsFired, status, reason, bothNoted: both && mode !== 'historical' };
}

function formatEventAnchorRow(r) {
  const a = r.anchor;
  const t = (rec) => (rec.turn == null ? 't?' : `t${rec.turn}`) + (rec.note || '');
  let s = `  [${a.epoch}] ${a.event_id.padEnd(34)} by t${r.deadline} (${a.expected_week_max}+${a.tolerance})  primary ${r.primary ? t(r.primary) : '-'}`;
  if (r.altIds.length > 0) {
    s += `  alt ${r.altIds.map((id) => {
      const f = r.altsFired.find((x) => x.id === id);
      return `${id} ${f ? t(f) : '-'}`;
    }).join(', ')}`;
  }
  const red = r.status !== 'PASS' && r.status !== 'GAP';
  s += `  ${red ? '***' : '**'} ${r.status}${r.reason ? `: ${r.reason}` : ''} ${red ? '***' : '**'}`;
  return s;
}

/** Prints the EVENT-ANCHORS row; returns the counts. */
function printEventAnchorsRow({ log, anchors, save, weeklyFirstFire, loadError }) {
  log('');
  if (loadError) {
    log(`EVENT-ANCHORS (SHAPE, §61) — UNAVAILABLE: cannot load src/scenario/historical_anchors.ts (${loadError})`);
    return { red: 0, unavailable: true };
  }
  const mode = runDecisionMode(save.meta);
  const finalTurn = save.meta && save.meta.turn;
  const fires = fireRecords(save.military, weeklyFirstFire);
  log(`EVENT-ANCHORS (SHAPE, §61 — recorded, does not change the exit code; mode read: ${mode}${mode === 'historical' ? ', hands-off: primary on time passes, both legs fail, the alt leg alone is an alt-path pass' : ', either leg passes'})`);
  log('  fire turns: military.event_last_fired_turn (turn 1 = first simulated week); deadline = expected_week_max + tolerance');
  const rows = anchors.map((a) => evaluateEventAnchor(a, fires, mode, finalTurn));
  for (const r of rows) log(formatEventAnchorRow(r));
  const n = (s) => rows.filter((r) => r.status === s).length;
  const red = rows.filter((r) => r.status !== 'PASS' && r.status !== 'GAP').length;
  const noted = rows.filter((r) => r.bothNoted).length;
  log(`  event anchors compared: ${rows.length} — ${n('PASS')} pass, ${n('ALT-PATH PASS')} alt-path pass, ${n('FAIL')} fail, ${n('GAP')} gap${noted ? `, ${noted} both-legs noted` : ''}; SHAPE red: ${red}`);
  return { red, rows };
}

let osidAreasCache = null;
function loadOsidAreas(p = OSID_AREAS_JSON) {
  if (!osidAreasCache) {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    osidAreasCache = { total: j.total_area_km2, areas: j.areas };
  }
  return osidAreasCache;
}

/** Same measure as getFactionTerritoryAreaPct (src/sim/osid_areas.ts), as a 0..1 share. */
function factionAreaShare(controllers, faction, osidAreas) {
  const { areas, total } = osidAreas;
  if (!(total > 0)) return 0;
  let km2 = 0;
  for (const osid of Object.keys(controllers).sort(cmp)) if (controllers[osid] === faction) km2 += areas[osid] ?? 0;
  return km2 / total;
}

/**
 * Prints the AREA-BANDS row. Control at a week is replayed from the run's own flip log
 * (`political.control_events` over `initial_political_controllers`, the tool's stateAt); a band
 * past the run's last turn, or a save with no flip log, is a GAP. Never changes the exit code.
 */
function printAreaBandsRow({ log, bands, save, stateAt, loadError, osidAreas }) {
  log('');
  if (loadError) {
    log(`AREA-BANDS (RECORDED, §63) — UNAVAILABLE: cannot load src/scenario/historical_anchors.ts (${loadError})`);
    return { unavailable: true };
  }
  const pol = save.political || {};
  const hasLog = pol.initial_political_controllers && Array.isArray(pol.control_events);
  const finalTurn = save.meta && save.meta.turn;
  log('AREA-BANDS (RECORDED, §63 — under the calibration hold; not a merge bar, never changes the exit code)');
  log('  share = area-weighted settlement control (osid_areas.json), replayed from control_events at the band week');
  const rows = [];
  for (const b of bands) {
    const tag = b.diagnostic_only ? 'diagnostic only' : 'authoritative';
    const head = `  [${b.epoch}] w${String(b.at_week).padEnd(3)} ${b.faction.padEnd(4)}`;
    const range = `band ${b.min_share.toFixed(2)}-${b.max_share.toFixed(2)}`;
    if (!hasLog) { rows.push({ band: b, status: 'GAP' }); log(`${head} GAP (save has no initial controllers / control_events)  ${range}  (${tag})`); continue; }
    if (!Number.isFinite(finalTurn) || b.at_week > finalTurn) { rows.push({ band: b, status: 'GAP' }); log(`${head} GAP (run ends t${finalTurn ?? '?'})  ${range}  (${tag})`); continue; }
    const share = factionAreaShare(stateAt(b.at_week), b.faction, osidAreas);
    const inBand = share >= b.min_share && share <= b.max_share;
    rows.push({ band: b, status: inBand ? 'IN' : 'OUT', share });
    log(`${head} ${share.toFixed(4)}  ${range}  ${inBand ? 'IN' : 'OUT'}  (${tag})`);
  }
  const c = (s, auth) => rows.filter((r) => r.status === s && (auth == null || !r.band.diagnostic_only === auth)).length;
  const authTotal = rows.filter((r) => !r.band.diagnostic_only).length;
  log(`  area bands compared: ${rows.length} — ${c('IN')} in, ${c('OUT')} out, ${c('GAP')} gap; authoritative ${c('IN', true)}/${authTotal} in`);
  return { rows };
}

module.exports = {
  loadHistoricalAnchors, runDecisionMode, fireRecords, evaluateEventAnchor, formatEventAnchorRow,
  printEventAnchorsRow, printAreaBandsRow, factionAreaShare, loadOsidAreas, ANCHORS_TS,
};
