'use strict';

// Read-only retained-evidence extraction. This file never imports the runner,
// writes under runs/, or changes controls, saves, data, tests, or production.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_';
const out = path.join(__dirname, 'continuation3_western_failure_receipts.json');
assert.ok(!fs.existsSync(out), `preserve existing evidence: ${out}`);

const targets = [
  { osid: 'op:jajce:barevo_2', reference: 'HRHB', operation: 'Operation Mistral 2', runs: ['n25', 'n37'] },
  { osid: 'op:jajce:lupnica', reference: 'HRHB', operation: 'Operation Mistral 2', runs: ['n25', 'n37'] },
  { osid: 'op:mrkonjic_grad:majdan_2', reference: 'HRHB', operation: 'Operation Southern Move', runs: ['n25', 'n37'] },
  { osid: 'op:travnik:varosluk', reference: 'RBiH', operation: null, runs: ['n25', 'n37', 'n29', 'n30'] },
];
const artifactNames = [
  'weekly_report.jsonl', 'brigade_temporal_log.jsonl', 'operation_aars.json',
  'watched_operations.json', 'destroyed_brigades.json', 'control_delta.json',
  'final_save.json', 'initial_save.json', 'run_meta.json',
];
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const jsonl = (p) => fs.readFileSync(p, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const compact = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const runs = {};
for (const run of ['n25', 'n37', 'n29', 'n30']) {
  const dir = `${root}${run}`;
  runs[run] = {
    weekly: jsonl(`${dir}/weekly_report.jsonl`),
    temporal: jsonl(`${dir}/brigade_temporal_log.jsonl`),
    aars: read(`${dir}/operation_aars.json`),
    watched: read(`${dir}/watched_operations.json`),
    destroyed: read(`${dir}/destroyed_brigades.json`),
    controlDelta: read(`${dir}/control_delta.json`),
    final: read(`${dir}/final_save.json`),
    initial: read(`${dir}/initial_save.json`),
    meta: read(`${dir}/run_meta.json`),
    hashes: Object.fromEntries(artifactNames.map((name) => [name, sha256(`${dir}/${name}`)])),
  };
  assert.equal(runs[run].weekly.length, 188, `${run} weekly rows`);
  assert.equal(runs[run].temporal.length > 40000, true, `${run} temporal rows`);
  assert.equal(Array.isArray(runs[run].aars), true, `${run} operation_aars array`);
  assert.equal(Array.isArray(runs[run].watched), true, `${run} watched_operations array`);
  assert.equal(Array.isArray(runs[run].destroyed), true, `${run} destroyed_brigades array`);
  assert.equal(typeof runs[run].controlDelta.total_flips, 'number', `${run} control_delta schema`);
  assert.equal(typeof runs[run].final.political, 'object', `${run} final save schema`);
  assert.equal(typeof runs[run].meta.provenance, 'object', `${run} run_meta schema`);
}

function controls(run, turn) {
  const save = runs[run].final;
  const result = { ...save.political.initial_political_controllers };
  for (const event of save.political.control_events) if (event.turn <= turn) result[event.settlement_id] = event.to;
  return result;
}
function targetEvents(run, osid) {
  return runs[run].final.political.control_events.filter((e) => e.settlement_id === osid);
}
function targetBattles(run, osid) {
  return runs[run].weekly.flatMap((r) => (r.battles || []).map((b) => ({ turn: r.week_index, ...b })))
    .filter((b) => b.target_osid === osid);
}
function operationRows(run, operation, osid) {
  if (!operation) return [];
  return runs[run].weekly.flatMap((r) => (r.operation_diagnostics || [])
    .filter((o) => o.operation_name === operation && (o.current_objectives || []).includes(osid))
    .map((o) => ({ turn: r.week_index, operation_name: o.operation_name, operation_phase: o.operation_phase,
      current_objectives: o.current_objectives, participating_brigades: o.participating_brigades,
      attack_attempt_count: o.attack_attempt_count, movement_order_count: o.movement_order_count,
      objective_attempt_count: o.objective_attempt_count, objective_capture_count: o.objective_capture_count,
      skipped_attack_orders: o.skipped_attack_orders, recovery_reason: o.recovery_reason })));
}
function operationAllRows(run, operation) {
  if (!operation) return [];
  return runs[run].weekly.flatMap((r) => (r.operation_diagnostics || [])
    .filter((o) => o.operation_name === operation)
    .map((o) => ({ turn: r.week_index, phase: o.operation_phase, current_objectives: o.current_objectives,
      participants: o.participating_brigades, attack_attempt_count: o.attack_attempt_count,
      movement_order_count: o.movement_order_count, recovery_reason: o.recovery_reason })));
}
function temporalRows(run, ids, osid) {
  return runs[run].temporal.filter((r) => r.week_index >= 170 && r.week_index <= 188 &&
    (ids.has(r.brigade_id) || r.location_osid === osid || (r.mv_destinations || []).includes(osid)))
    .map((r) => ({ turn: r.week_index, brigade_id: r.brigade_id, faction: r.faction,
      location_osid: r.location_osid, lifecycle_status: r.lifecycle_status, status: r.status,
      active_op_id: r.active_op_id, current_op_phase: r.current_op_phase, mv_state: r.mv_state,
      mv_destinations: r.mv_destinations, personnel: r.personnel }));
}
function firstDifference(a, b) {
  const turns = [...new Set([...a, ...b].map((x) => x.turn))].sort((x, y) => x - y);
  for (const turn of turns) {
    const before = a.filter((x) => x.turn === turn);
    const after = b.filter((x) => x.turn === turn);
    if (!same(before, after)) return { turn, n25: before, n37: after };
  }
  return null;
}

const receipts = targets.map((target) => {
  const operationRowsByRun = Object.fromEntries(target.runs.slice(0, 2).map((run) => [run, operationRows(run, target.operation, target.osid)]));
  const operationAllByRun = Object.fromEntries(target.runs.slice(0, 2).map((run) => [run, operationAllRows(run, target.operation)]));
  const participantIds = new Set(Object.values(operationAllByRun).flat().flatMap((r) => r.participants || []));
  const temporalByRun = Object.fromEntries(target.runs.map((run) => [run, temporalRows(run, participantIds, target.osid)]));
  const battleByRun = Object.fromEntries(target.runs.map((run) => [run, targetBattles(run, target.osid)]));
  const eventsByRun = Object.fromEntries(target.runs.map((run) => [run, targetEvents(run, target.osid)]));
  const destroyedByRun = Object.fromEntries(target.runs.map((run) => [run, runs[run].destroyed.filter((x) => x.location_osid === target.osid)]));
  const first = {
    operation_target: firstDifference(operationRowsByRun.n25 || [], operationRowsByRun.n37 || []),
    operation_lifecycle: firstDifference(operationAllByRun.n25 || [], operationAllByRun.n37 || []),
    formation_roster_movement: firstDifference(temporalByRun.n25 || [], temporalByRun.n37 || []),
    battle: firstDifference(battleByRun.n25 || [], battleByRun.n37 || []),
    control: firstDifference(eventsByRun.n25 || [], eventsByRun.n37 || []),
    lifecycle: firstDifference(destroyedByRun.n25 || [], destroyedByRun.n37 || []),
  };
  const candidates = Object.entries(first).filter(([, value]) => value).map(([category, value]) => ({ category, ...value }));
  candidates.sort((a, b) => a.turn - b.turn || a.category.localeCompare(b.category));
  const inherited = target.osid === 'op:travnik:varosluk' ? Object.fromEntries(['n29', 'n30'].map((run) => [run, {
    control_events: targetEvents(run, target.osid), battles: targetBattles(run, target.osid),
    destroyed: runs[run].destroyed.filter((x) => x.location_osid === target.osid),
    temporal: temporalRows(run, participantIds, target.osid),
  }])) : null;
  return {
    osid: target.osid, reference: target.reference, n25_endpoint: controls('n25', 188)[target.osid], n37_endpoint: controls('n37', 188)[target.osid],
    first_observable_relevant_divergence: candidates[0] || null,
    causal_predicates: {
      operation_assignment_or_objective: first.operation_target ? 'recorded as operation diagnostics' : 'unreported',
      formation_movement_or_roster: first.formation_roster_movement ? 'recorded as temporal rows' : 'unreported',
      battle_resolution: first.battle ? 'recorded' : 'unreported',
      control_change: eventsByRun.n25.length || eventsByRun.n37.length ? 'recorded in control events' : 'unreported',
      withdrawal_or_destruction: destroyedByRun.n25.length || destroyedByRun.n37.length ? 'recorded in destroyed_brigades' : 'unreported',
      selector_rejection_lifecycle_cause: 'unreported; retained receipts do not identify code cause',
      initial_intelligence: target.osid === 'op:mrkonjic_grad:majdan_2' ? 'unreported in n37 (intel_confidence_at_assessment null)' : 'not applicable or unreported',
    },
    observed_chain: { operation_rows: operationRowsByRun, operation_lifecycle_rows: operationAllByRun,
      formation_rows: temporalByRun, battles: battleByRun, control_events: eventsByRun, destroyed: destroyedByRun, inherited_n29_n30: inherited },
  };
});

const result = {
  scope: 'bounded read-only retained western failure extraction; null/unreported is not zero; chronological correlation is not code cause',
  denominator: 712,
  targets: receipts,
  consumed_artifact_sha256: Object.fromEntries(Object.entries(runs).map(([run, value]) => [run, value.hashes])),
  schema: { weekly_report_jsonl: '188 rows with battles and operation_diagnostics', brigade_temporal_log_jsonl: 'temporal rows keyed by week_index/turn/brigade_id',
    operation_aars: 'array', watched_operations: 'array', destroyed_brigades: 'array', control_delta: 'object', saves: 'JSON with political control_events', run_meta: 'JSON with provenance' },
  stopping_rule: 'Stopped at unreported causal predicates; no scenario, runner, resume, production or data mutation.',
};
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: out, target_count: receipts.length, denominator: 712,
  endpoints: receipts.map((r) => ({ osid: r.osid, n25: r.n25_endpoint, n37: r.n37_endpoint,
    first_turn: r.first_observable_relevant_divergence?.turn ?? null,
    first_category: r.first_observable_relevant_divergence?.category ?? null })) }, null, 2));
