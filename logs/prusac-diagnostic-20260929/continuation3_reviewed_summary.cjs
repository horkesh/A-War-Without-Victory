'use strict';
// Integration receipt only: verify retained bytes and project recorded chronology.
// No simulation entrypoint, orders, state mutation, or overwrite of prior evidence.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const d = 'logs/prusac-diagnostic-20260929/';
const root = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_';
const out = d + 'continuation3_reviewed_summary.json';
assert.ok(!fs.existsSync(out), 'preserve reviewed evidence');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const jsonl = p => fs.readFileSync(p, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const correctedPath = d + 'continuation3_western_failure_receipts_corrected.json';
const corrected = read(correctedPath);
const initialPath = d + 'continuation3_western_failure_receipts.json';
assert.equal(hash(initialPath), corrected.parent_receipt.sha256);
let verified = 0;
for (const [run, hashes] of Object.entries(corrected.consumed_artifact_sha256)) {
  for (const [name, expected] of Object.entries(hashes)) {
    assert.equal(hash(root + run + '/' + name), expected, `${run}/${name} preservation`);
    verified++;
  }
}
const operationNames = ['Operation Mistral 2', 'Operation Southern Move'];
const ghostIds = ['hv_1st_hgz_1995', 'hv_112th_infantry_1995'];
const route = r => r ? { location_osid: r.location_osid, active_op_id: r.active_op_id,
  current_op_phase: r.current_op_phase, mv_state: r.mv_state, mv_destinations: r.mv_destinations } : null;
const summaries = {};
const actorByTurn = {};
for (const run of ['n25', 'n37', 'n29', 'n30']) {
  const weekly = jsonl(root + run + '/weekly_report.jsonl');
  const temporal = jsonl(root + run + '/brigade_temporal_log.jsonl');
  assert.equal(weekly.length, 188);
  assert.ok(temporal.every(r => r.turn === r.week_index + 1), 'raw temporal turn semantics');
  const destroyed = read(root + run + '/destroyed_brigades.json');
  const watched = read(root + run + '/watched_operations.json');
  const rows = temporal.filter(r => r.brigade_id === 'arbih_737th_muslim_light');
  actorByTurn[run] = new Map(rows.map(r => [r.turn, r]));
  const transitions = rows.filter((r, i) => i === 0 || JSON.stringify(route(r)) !== JSON.stringify(route(rows[i - 1])))
    .map(r => ({ turn: r.turn, week_index: r.week_index, ...route(r) }));
  summaries[run] = {
    operations: operationNames.map(name => {
      const ops = weekly.flatMap(w => (w.operation_diagnostics || []).filter(o => o.operation_name === name)
        .map(o => ({ turn: w.week_index, ...o })));
      return { name, first_planning_turn: ops.find(o => o.operation_phase === 'planning')?.turn ?? null,
        first_execution_turn: ops.find(o => o.operation_phase === 'execution')?.turn ?? null,
        attack_chronology: ops.filter(o => (o.participant_attack_orders || []).length)
          .map(o => ({ turn: o.turn, phase: o.operation_phase,
            participant_attack_orders: o.participant_attack_orders, skipped_attack_orders: o.skipped_attack_orders })),
        launch_detail_fields_present: ops.some(o => o.launch_readiness_detail !== undefined || o.launch_blocker_detail !== undefined),
        watched_records: watched.filter(o => o.operation_name === name) };
    }),
    actor_737_route_transitions: transitions,
    ghost_evidence: ghostIds.map(id => ({ id,
      temporal_row_count: temporal.filter(r => r.brigade_id === id).length,
      destroyed_records: destroyed.filter(r => r.brigade_id === id) }))
  };
}
const turns = [...new Set([...actorByTurn.n25.keys(), ...actorByTurn.n37.keys()])].sort((a, b) => a - b);
const firstTurn = turns.find(t => JSON.stringify(route(actorByTurn.n25.get(t))) !== JSON.stringify(route(actorByTurn.n37.get(t))));
const result = {
  scope: 'Reviewed retained chronology only; no unique original code-cause attribution',
  denominator: 712,
  initial_receipt_sha256: hash(initialPath), corrected_receipt_sha256: hash(correctedPath),
  consumed_artifact_sha256: corrected.consumed_artifact_sha256,
  preserved_input_hash_checks: verified,
  targets: read(initialPath).targets.map(t => ({ osid: t.osid, reference: t.reference,
    n25: t.n25_endpoint, n37: t.n37_endpoint })),
  indexing: { temporal: 'raw turn = week_index + 1; initial/corrected helper temporal turn labels are week_index',
    weekly: 'weekly_report.week_index is the completed turn; preserve this distinct schema',
    initial_window: 'temporal week_index170–188 filter; not run-earliest causal divergence' },
  first_737_recorded_route_state_difference: firstTurn === undefined ? null : {
    turn: firstTurn, n25: route(actorByTurn.n25.get(firstTurn)), n37: route(actorByTurn.n37.get(firstTurn)),
    limitation: 'First difference for the named actor in recorded post-turn state, not a selector cause' },
  runs: summaries,
  limits: ['Initial aggregate earliest-divergence claims are superseded by this scoped chronology.',
    'Corrected full-history aggregate comparisons are not accepted as causal first divergence.',
    'Ghost temporal absence is absence of logging, not evidence of destruction or withdrawal.',
    'Current HV withdrawal_turn188 definition is context, not a retained runtime receipt.',
    'Selector rejection, launch predicate and unique route/lifecycle code cause remain unreported.',
    'n37 dirty executable continuity remains unproved.'],
  disposition: 'STOP_CAUSAL_ATTRIBUTION_NO_PRODUCTION_CORRECTION'
};
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: out, target_count: result.targets.length,
  preserved_input_hash_checks: verified, first_737_route_difference_turn: firstTurn,
  ghost_temporal_counts: Object.fromEntries(['n25', 'n37'].map(n => [n, summaries[n].ghost_evidence])) }));
