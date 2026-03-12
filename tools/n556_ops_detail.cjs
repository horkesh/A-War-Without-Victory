const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n556';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

// Per-week per-corps operation details
let noEligibleByCorps = {};
let noOrdersByCorps = {};
let totalExecWeeks = {};

for (let i = 0; i < lines.length; i++) {
  const w = JSON.parse(lines[i]);
  const week = w.week_index || (i + 1);
  const opDiag = w.operation_diagnostics || [];

  for (const od of opDiag) {
    const cid = od.corps_id;
    if (!od.corps_id.startsWith('vrs_')) continue; // RS only

    if (od.operation_phase === 'execution') {
      totalExecWeeks[cid] = (totalExecWeeks[cid] || 0) + 1;
    }

    for (const reason of (od.invalidation_reasons || [])) {
      if (reason === 'execution_without_eligible_attackers') {
        noEligibleByCorps[cid] = (noEligibleByCorps[cid] || 0) + 1;
      }
      if (reason === 'execution_without_attack_orders') {
        noOrdersByCorps[cid] = (noOrdersByCorps[cid] || 0) + 1;
      }
    }
  }
}

console.log('=== Invalid execution weeks by corps ===');
for (const cid of Object.keys({...totalExecWeeks, ...noEligibleByCorps, ...noOrdersByCorps}).sort()) {
  console.log(`  ${cid}: exec=${totalExecWeeks[cid]||0}w no_eligible=${noEligibleByCorps[cid]||0} no_orders=${noOrdersByCorps[cid]||0}`);
}

// Show a sample of invalid operation weeks
console.log('\n=== Weeks with invalid operations (first 10) ===');
let shown = 0;
for (let i = 0; i < lines.length && shown < 15; i++) {
  const w = JSON.parse(lines[i]);
  const week = w.week_index || (i + 1);
  const opDiag = w.operation_diagnostics || [];

  for (const od of opDiag) {
    if ((od.invalidation_reasons || []).length === 0) continue;
    if (!od.corps_id.startsWith('vrs_')) continue;
    shown++;
    console.log(`  w${week} ${od.corps_id}: phase=${od.operation_phase} eligible=${od.eligible_attacker_count} attacks=${od.attack_attempt_count} movement=${od.movement_order_count} brigades=${od.participating_brigades?.length || 0} obj=${od.current_objective} reasons=${od.invalidation_reasons.join(',')}`);
  }
}

// Check how many operations each corps runs over 40 weeks
console.log('\n=== Operation lifecycle per week (1KK sample) ===');
for (let i = 0; i < lines.length; i++) {
  const w = JSON.parse(lines[i]);
  const week = w.week_index || (i + 1);
  const opDiag = w.operation_diagnostics || [];
  const kk = opDiag.find(d => d.corps_id === 'vrs_1st_krajina');
  if (kk) {
    const invalid = (kk.invalidation_reasons || []).join(',') || 'ok';
    console.log(`  w${week}: phase=${kk.operation_phase || 'none'} obj=${(kk.current_objective||'').split(':').pop()} elig=${kk.eligible_attacker_count} atk=${kk.attack_attempt_count} bat=${kk.battle_count} mov=${kk.movement_order_count} brigs=${kk.participating_brigades?.length || 0} [${invalid}]`);
  }
}
