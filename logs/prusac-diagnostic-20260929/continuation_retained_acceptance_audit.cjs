'use strict';
// Read-only retained-artifact audit. No simulation or control/reference writer.
// Question/pass/cost/stop: sana_ivanjska_joint_validation_plan.md clean continuation.
// Exact command: node logs/prusac-diagnostic-20260929/continuation_retained_acceptance_audit.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { classifyCombatCapture } = require('../../tools/lib/capture_provenance.cjs');

const runRoot = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_';
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const save25 = readJson(`${runRoot}n25/final_save.json`);
const save37 = readJson(`${runRoot}n37/final_save.json`);
const summary = readJson(`${runRoot}n37/run_summary.json`);
const weekly = fs.readFileSync(`${runRoot}n37/weekly_report.jsonl`, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(weekly.length, 188);
const battles = weekly.flatMap((row) => row.battles ?? []);
const battleById = new Map(battles.map((battle) => [battle.battle_id, battle]));

if (process.argv[2] === '--western') {
  // Exact command: node logs/prusac-diagnostic-20260929/continuation_retained_acceptance_audit.cjs --western
  // Cheap read-only comparison; stop on missing/unknown schema, never rerun a campaign.
  const rows25 = fs.readFileSync(`${runRoot}n25/weekly_report.jsonl`, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(rows25.length, 188);
  const names = ['Operation Mistral 2', 'Operation Southern Move'];
  const operations = names.map((name) => ({ name,
    runs: [['n25', rows25, save25], ['n37', weekly, save37]].map(([run, rows, save]) => {
      const receipts = rows.flatMap((row) => (row.operation_diagnostics ?? [])
        .filter((op) => op.operation_name === name)
        .map((op) => ({ turn: row.week_index, phase: op.operation_phase,
          current_objectives: op.current_objectives, participants: op.participating_brigades })));
      assert.ok(receipts.length > 0, `missing operation diagnostics: ${run} ${name}`);
      const op = save.military.corps_command.hvo_tomislavgrad.active_operations.find((op) => op.name === name);
      return { run, first_planning: receipts.find((row) => row.phase === 'planning')?.turn ?? null,
        first_execution: receipts.find((row) => row.phase === 'execution')?.turn ?? null,
        late_receipts: receipts.filter((row) => row.turn >= 175),
        endpoint: op ? { phase: op.phase, started_turn: op.started_turn, phase_started_turn: op.phase_started_turn,
          preparation_sub_phase: op.preparation_sub_phase ?? null,
          preparation_turns_elapsed: op.preparation_turns_elapsed ?? null,
          preparation_max_turns: op.preparation_max_turns ?? null,
          intel_confidence_at_assessment: op.intel_confidence_at_assessment ?? null,
          participants: op.participating_brigades,
          axes: op.axes?.map((axis) => ({ id: axis.axis_id, current_objective: axis.objectives[axis.current_objective_index] ?? null,
            assigned_brigades: axis.assigned_brigades })) } : null };
    }) }));
  const out = path.join(__dirname, 'continuation_western_receipts.json');
  assert.ok(!fs.existsSync(out), `preserve existing evidence: ${out}`);
  fs.writeFileSync(out, JSON.stringify({ scope: 'retained-only western lifecycle comparison; null is unreported, not zero', operations }, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, operations: operations.map(({ name, runs }) => ({ name,
    runs: runs.map(({ late_receipts, ...row }) => row) })) }, null, 2));
  process.exit(0);
}

function at(save, week) {
  const controls = { ...save.political.initial_political_controllers };
  for (const event of save.political.control_events) {
    if (event.turn <= week) controls[event.settlement_id] = event.to;
  }
  return controls;
}
const checkpoints = [['jan1993', 39], ['apr1994', 104], ['apr1995', 156], ['oct1995', 188]].map(([name, week]) => {
  const ref = readJson(`data/source/calibration/painted_control_${name}.json`).by_settlement_id;
  const ids = Object.keys(ref).sort();
  assert.equal(ids.length, 712, `reference denominator ${name}`);
  const old = at(save25, week);
  const current = at(save37, week);
  return { name, week, denominator: ids.length,
    n25_matches: ids.filter((id) => old[id] === ref[id]).length,
    n37_matches: ids.filter((id) => current[id] === ref[id]).length,
    lost_matches: ids.filter((id) => old[id] === ref[id] && current[id] !== ref[id])
      .map((osid) => ({ osid, reference: ref[osid], n25: old[osid], n37: current[osid] })),
    gained_matches: ids.filter((id) => old[id] !== ref[id] && current[id] === ref[id]) };
});
const targets = [
  ['Petrovac town', 'op:bosanski_petrovac:bosanski_petrovac_2', 'RBiH'],
  ['Kljuc town', 'op:kljuc:kljuc_2', 'RBiH'],
  ['Sanski town', 'op:sanski_most:sanski_most_2', 'RBiH'],
  ['Budimlic Japra', 'op:sanski_most:budimlic_japra_2', 'RBiH'],
  ['Lusci Palanka', 'op:sanski_most:lusci_palanka_2', 'RBiH'],
  ['Jelasinovci', 'op:sanski_most:jelasinovci', 'RBiH'],
  ['Skucani Vakuf', 'op:sanski_most:skucani_vakuf_2', 'RBiH'],
  ['Bravnice', 'op:jajce:bravnice', 'HRHB'],
  ['Vinac', 'op:jajce:vinac_2', 'HRHB'],
  ['Jajce town', 'op:jajce:jajce_3', 'HRHB'],
  ['Lupnica', 'op:jajce:lupnica', 'HRHB'],
  ['Barevo', 'op:jajce:barevo_2', 'HRHB'],
  ['Majdan', 'op:mrkonjic_grad:majdan_2', 'HRHB'],
  ['Varosluk', 'op:travnik:varosluk', 'RBiH'],
];
const endpoint = at(save37, 188);
const captures = targets.map(([name, osid, faction]) => {
  assert.ok(osid in endpoint, `unknown target ${osid}`);
  const events = save37.political.control_events.filter((event) => event.settlement_id === osid && event.to === faction);
  return { name, osid, expected: faction, at188: endpoint[osid], captures: events.map((event) => ({
    turn: event.turn, mechanism: event.mechanism, attacker_brigade: event.attacker_brigade,
    provenance: classifyCombatCapture(event, battleById.get(event.battle_id)) })) };
});
const protectedTargets = [
  ['op:jablanica:doljani_2', 'RBiH', [104]],
  ['op:donji_vakuf:prusac_2', 'RBiH', [39, 104, 156, 188]],
  ['op:prozor:ljubunci_2', 'HRHB', [39, 104, 156, 188]],
  ['op:prozor:lug_2', 'HRHB', [39, 104, 156, 188]],
  ['op:prozor:paros', 'HRHB', [39, 104, 156, 188]],
  ['op:trnovo:gornja_presjenica', 'RS', [39, 104, 156, 188]],
].map(([osid, expected, weeks]) => ({ osid,
  checkpoints: weeks.map((week) => {
    // Lug and Paros are RBiH in January, HRHB at the later checkpoints.
    // Preserve their authored timeline rather than invent an all-weeks HRHB gate.
    const checkpointExpected = week === 39 && ['op:prozor:lug_2', 'op:prozor:paros'].includes(osid)
      ? 'RBiH' : expected;
    const controller = at(save37, week)[osid];
    return { week, expected: checkpointExpected, controller, ok: controller === checkpointExpected };
  }) }));
const result = { scope: 'retained n25/n37 read-only audit; extraction success does not mean calibration acceptance',
  checkpoints, captures, protectedTargets, anomaly_detection: {
    count: summary.anomaly_detection.count, critical: summary.anomaly_detection.critical,
    info: summary.anomaly_detection.info, warning: summary.anomaly_detection.warning },
  farz: 'Separate authoritative verifier: continuation_n37_checkpoints.stdout.log / .exit.txt; Sana belt receipts are not Farz receipts.' };
const out = path.join(__dirname, 'continuation_retained_acceptance_audit_final.json');
assert.ok(!fs.existsSync(out), `preserve existing evidence: ${out}`);
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: out, checkpoints: checkpoints.map(({ gained_matches, ...row }) => row),
  protected_ok: protectedTargets.every((row) => row.checkpoints.every((checkpoint) => checkpoint.ok)) }, null, 2));
