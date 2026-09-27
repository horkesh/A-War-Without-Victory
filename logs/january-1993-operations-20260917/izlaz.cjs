const fs = require('fs');
const rd = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n399';
const lines = fs.readFileSync(rd + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean);
for (const line of lines) {
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  for (const d of rec.operation_diagnostics || []) {
    if (d.operation_name === 'Operacija Izlaz' || JSON.stringify(d.attack_order_targets || []).includes('cardak_2')) {
      console.log('w' + rec.week_index, JSON.stringify({
        op: d.operation_name,
        type: d.operation_type,
        phase: d.operation_phase,
        objective: d.current_objective,
        participants: d.participating_brigades,
        attack_targets: d.attack_order_targets,
        battles: d.battle_count,
        captures: d.objective_capture_count,
        movement_orders: d.movement_order_count,
        skipped: d.skipped_attack_orders,
        recovery: d.recovery_reason,
      }));
    }
  }
}
