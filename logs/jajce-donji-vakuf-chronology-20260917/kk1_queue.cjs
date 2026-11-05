// Read-only: 1KK queue timeline (Corridor -> Jajce -> Donji Vakuf) from an existing run dir.
const fs = require('fs');
const dir = process.argv[2];
const lo = +(process.argv[3] ?? 1);
const hi = +(process.argv[4] ?? 60);
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
for (const w of lines) {
  if (w.week_index < lo || w.week_index > hi) continue;
  for (const d of w.operation_diagnostics || []) {
    if (d.corps_id !== 'vrs_1st_krajina') continue;
    console.log(
      'w' + String(w.week_index).padStart(3) +
      ' ' + String(d.operation_name).padEnd(24) +
      ' type=' + String(d.operation_type).padEnd(11) +
      ' phase=' + String(d.operation_phase).padEnd(10) +
      ' obj=' + String(d.current_objective).padEnd(32) +
      ' atk=' + d.attack_attempt_count +
      ' bat=' + d.battle_count +
      ' elig=' + d.eligible_attacker_count +
      ' mv=' + d.movement_order_count +
      ' mvonly=' + d.movement_only_execution_turns +
      ' idle=' + d.idle_execution_turn_streak +
      ' caps=' + d.objective_capture_count +
      ' rec=' + String(d.recovery_reason) +
      ' brig=' + (d.participating_brigades || []).length,
    );
  }
}
