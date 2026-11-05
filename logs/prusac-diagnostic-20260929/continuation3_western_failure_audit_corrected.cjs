'use strict';

// Read-only corrected retained-evidence extraction. No runner, controls, saves,
// production files, tests, or data are imported or written.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_';
const dir = __dirname;
const parentReceipt = path.join(dir, 'continuation3_western_failure_receipts.json');
const out = path.join(dir, 'continuation3_western_failure_receipts_corrected.json');
assert.ok(fs.existsSync(parentReceipt), `parent receipt missing: ${parentReceipt}`);
assert.ok(!fs.existsSync(out), `preserve existing corrected evidence: ${out}`);
const parentSha256 = crypto.createHash('sha256').update(fs.readFileSync(parentReceipt)).digest('hex');

const targets = [
  { osid: 'op:jajce:barevo_2', reference: 'HRHB', operation: 'Operation Mistral 2', runs: ['n25', 'n37'] },
  { osid: 'op:jajce:lupnica', reference: 'HRHB', operation: 'Operation Mistral 2', runs: ['n25', 'n37'] },
  { osid: 'op:mrkonjic_grad:majdan_2', reference: 'HRHB', operation: 'Operation Southern Move', runs: ['n25', 'n37'] },
  { osid: 'op:travnik:varosluk', reference: 'RBiH', operation: null, runs: ['n25', 'n37', 'n29', 'n30'] },
];
const artifacts = ['weekly_report.jsonl', 'brigade_temporal_log.jsonl', 'operation_aars.json', 'watched_operations.json', 'destroyed_brigades.json', 'control_delta.json', 'final_save.json', 'initial_save.json', 'run_meta.json'];
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const jsonl = (p) => fs.readFileSync(p, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const copy = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
// Deliberate UTF-16/code-unit ordering; this diagnostic must not depend on locale.
function codepointCompare(a, b) {
  const aa = Array.from(String(a)); const bb = Array.from(String(b));
  for (let i = 0; i < Math.min(aa.length, bb.length); i += 1) {
    const ac = aa[i].codePointAt(0); const bc = bb[i].codePointAt(0);
    if (ac !== bc) return ac - bc;
  }
  return aa.length - bb.length;
}
const stable = (xs, key = (x) => x) => [...xs].sort((a, b) => codepointCompare(key(a), key(b)));

const runs = {};
for (const run of ['n25', 'n37', 'n29', 'n30']) {
  const d = `${root}${run}`;
  runs[run] = {
    weekly: jsonl(`${d}/weekly_report.jsonl`), temporal: jsonl(`${d}/brigade_temporal_log.jsonl`),
    aars: read(`${d}/operation_aars.json`), watched: read(`${d}/watched_operations.json`),
    destroyed: read(`${d}/destroyed_brigades.json`), final: read(`${d}/final_save.json`),
    hashes: Object.fromEntries(artifacts.map((name) => [name, sha256(`${d}/${name}`)])),
  };
  assert.equal(runs[run].weekly.length, 188, `${run} weekly rows`);
  assert.equal(runs[run].temporal.length > 40000, true, `${run} temporal rows`);
  assert.ok(Array.isArray(runs[run].aars) && Array.isArray(runs[run].watched), `${run} AAR/watch schema`);
}
function eventRows(run, osid) { return runs[run].final.political.control_events.filter((e) => e.settlement_id === osid); }
function battleRows(run, osid) {
  return runs[run].weekly.flatMap((r) => (r.battles || []).filter((b) => b.target_osid === osid).map((b) => ({ turn: r.week_index, ...b })));
}
function opRows(run, operation) {
  return operation ? runs[run].weekly.flatMap((r) => (r.operation_diagnostics || []).filter((o) => o.operation_name === operation).map((o) => ({ turn: r.week_index, ...copy(o) }))) : [];
}
function compactTemporal(row) {
  return { turn: row.week_index, brigade_id: row.brigade_id, faction: row.faction, location_osid: row.location_osid,
    lifecycle_status: row.lifecycle_status, status: row.status, active_op_id: row.active_op_id,
    current_op_phase: row.current_op_phase, mv_state: row.mv_state, mv_destinations: row.mv_destinations, personnel: row.personnel };
}
function temporalFor(run, ids, osid, windowOnly) {
  return runs[run].temporal.filter((r) => (!windowOnly || (r.week_index >= 170 && r.week_index <= 188)) &&
    (ids.has(r.brigade_id) || r.location_osid === osid || (r.mv_destinations || []).includes(osid))).map(compactTemporal);
}
function relevantAars(run, target, ids) {
  return runs[run].aars.filter((a) => a.operation_name === target.operation ||
    (a.participating_brigades || []).some((id) => ids.has(id))).map((a) => copy(a));
}
function relevantWatched(run, target) {
  return runs[run].watched.filter((w) => w.operation_name === target.operation || w.operation_id?.includes(target.operation || '\u0000')).map((w) => copy(w));
}
function orderRows(run, target) {
  return opRows(run, target.operation).filter((o) => (o.current_objectives || []).includes(target.osid) ||
    (o.attack_order_targets || []).some((x) => x.target_osid === target.osid) || o.current_objective === target.osid)
    .map((o) => ({ turn: o.turn, operation_name: o.operation_name, operation_phase: o.operation_phase,
      current_objective: o.current_objective, current_objectives: o.current_objectives, participating_brigades: o.participating_brigades,
      attack_order_targets: o.attack_order_targets, participant_attack_orders: o.participant_attack_orders,
      eligible_attacker_count: o.eligible_attacker_count, skipped_attack_orders: o.skipped_attack_orders,
      attack_attempt_count: o.attack_attempt_count, movement_order_count: o.movement_order_count,
      objective_attempt_count: o.objective_attempt_count, objective_capture_count: o.objective_capture_count,
      recovery_reason: o.recovery_reason, missing_fields: ['attack_order_targets', 'participant_attack_orders', 'eligible_attacker_count', 'skipped_attack_orders'].filter((k) => o[k] === undefined) }));
}
function firstDifference(a, b, projection) {
  const turns = stable([...new Set([...a, ...b].map((x) => x.turn))], (x) => String(x)).sort((x, y) => x - y);
  for (const turn of turns) {
    const aa = a.filter((x) => x.turn === turn).map(projection); const bb = b.filter((x) => x.turn === turn).map(projection);
    if (!same(aa, bb)) return { turn, n25: aa, n37: bb };
  }
  return null;
}
function causalClassification(n25, n37) {
  const route = (x) => ({ location_osid: x.location_osid, mv_state: x.mv_state, mv_destinations: x.mv_destinations });
  const roster = (x) => ({ brigade_id: x.brigade_id, lifecycle_status: x.lifecycle_status, status: x.status, active_op_id: x.active_op_id, current_op_phase: x.current_op_phase });
  return { personnel_only: firstDifference(n25, n37, (x) => ({ brigade_id: x.brigade_id, personnel: x.personnel })),
    route_or_operation: firstDifference(n25, n37, route), roster_or_lifecycle: firstDifference(n25, n37, roster) };
}

const receipts = targets.map((target) => {
  const initialIds = new Set(opRows('n25', target.operation).concat(opRows('n37', target.operation)).flatMap((o) => o.participating_brigades || []));
  if (target.osid === 'op:travnik:varosluk') initialIds.add('arbih_737th_muslim_light');
  const fullTemporal = Object.fromEntries(target.runs.map((run) => [run, temporalFor(run, initialIds, target.osid, false)]));
  const windowTemporal = Object.fromEntries(target.runs.map((run) => [run, temporalFor(run, initialIds, target.osid, true)]));
  const orders = Object.fromEntries(target.runs.slice(0, 2).map((run) => [run, orderRows(run, target)]));
  const aars = Object.fromEntries(target.runs.map((run) => [run, relevantAars(run, target, initialIds)]));
  const watched = Object.fromEntries(target.runs.map((run) => [run, relevantWatched(run, target)]));
  const destroyed = Object.fromEntries(target.runs.map((run) => [run, runs[run].destroyed.filter((x) => initialIds.has(x.brigade_id) || x.location_osid === target.osid).map(copy)]));
  const battles = Object.fromEntries(target.runs.map((run) => [run, battleRows(run, target.osid)]));
  const controls = Object.fromEntries(target.runs.map((run) => [run, eventRows(run, target.osid)]));
  const chronology = target.runs.flatMap((run) => orders[run] ? orders[run].flatMap((o) => (o.participant_attack_orders || []).filter((p) => p.target_osid === target.osid).map((p) => ({ run, turn: o.turn, actor: p.brigade_id, target: p.target_osid, battle_count: p.battle_count, battle: battles[run].filter((b) => b.turn === o.turn && b.attacker_brigade === p.brigade_id) }))) : [])
    .concat(target.runs.flatMap((run) => battles[run].map((b) => ({ run, turn: b.turn, actor: b.attacker_brigade, target: b.target_osid, battle: [b] }))));
  chronology.sort((a, b) => a.turn - b.turn || codepointCompare(a.run, b.run) || codepointCompare(a.actor || '', b.actor || ''));
  return { osid: target.osid, reference: target.reference, temporal_claim_window: { from: 170, to: 188, note: 'window only; no run-earliest claim' },
    full_history_scan: { n25: { row_count: fullTemporal.n25.length, actor_ids: stable([...initialIds]) }, n37: { row_count: fullTemporal.n37.length, actor_ids: stable([...initialIds]) },
      divergence_classification: causalClassification(fullTemporal.n25, fullTemporal.n37) },
    observed_chain: { orders, aars, watched, battles, control_events: controls, destroyed, explicit_actor_target_battle_chronology: chronology,
      window_temporal: windowTemporal, full_temporal: fullTemporal },
    lifecycle_boundary: { destroyed_records: destroyed, roster_departure: 'observable only where participating_brigades changes; no withdrawal reason inferred',
      unreported_withdrawal_reason: true, active_op_id_changes: Object.fromEntries(target.runs.map((run) => [run, fullTemporal[run].filter((x) => x.active_op_id !== undefined)])) },
    causal_predicates: { order_receipts: 'recorded where fields are present', selector_rejection: 'unreported; skipped order reasons are not inferred', route_cause: 'unreported', code_cause: 'unreported' } };
});

const result = { scope: 'corrected bounded read-only retained western failure extraction; supersedes initial coverage claim only', denominator: 712,
  parent_receipt: { path: path.relative(process.cwd(), parentReceipt), sha256: parentSha256 }, targets: receipts,
  consumed_artifact_sha256: Object.fromEntries(Object.entries(runs).map(([run, value]) => [run, value.hashes])),
  preserved_inputs: { parent_receipt_unchanged: sha256(parentReceipt) === parentSha256, original_helper: 'continuation3_western_failure_audit.cjs', original_receipt: 'continuation3_western_failure_receipts.json' },
  stopping_rule: 'Stopped at unreported selector, withdrawal, route, and code predicates; no scenario, runner, resume, production, test, data, canon, save, control, or simulation change.' };
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: out, parent_sha256: parentSha256, target_count: receipts.length, denominator: 712,
  endpoints: receipts.map((r) => ({ osid: r.osid, window: r.temporal_claim_window })) }, null, 2));
