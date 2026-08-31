import { readFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const aars = JSON.parse(readFileSync(file, 'utf8'));
  const selected = aars.filter((a) => ['Operation Foca', 'Operation Circle', 'Operation Drina', 'Operation Kijevo'].includes(a.operation_name));
  console.log(`### ${file}`);
  console.log(JSON.stringify(selected.map((a) => ({
    operation: a.operation_name,
    id: a.operation_id,
    started: a.started_turn,
    ended: a.ended_turn,
    outcome: a.outcome,
    reason: a.recovery_reason,
    attacks: a.total_attacks,
    killed_suffered: a.casualties_suffered?.killed,
    objectives_captured: a.objectives_captured,
    axes: a.axis_summaries?.map((x) => ({
      axis: x.axis_id,
      brigades: x.brigades,
      attacks: x.total_attacks,
      captured: x.objectives_captured,
      targeted: x.objectives_targeted,
      blocker: x.launch_blocker ?? null,
      killed_suffered: x.casualties_suffered?.killed,
    })),
  })), null, 2));
}
