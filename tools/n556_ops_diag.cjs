const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n556';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

// Aggregate operation diagnostics
const corpsBattles = {};
const corpsOpsStatus = {};
let invalidOps = 0;
let invalidReasons = {};

for (let i = 0; i < lines.length; i++) {
  const w = JSON.parse(lines[i]);
  const week = w.week_index || (i + 1);

  // Operation diagnostics
  const opDiag = w.operation_diagnostics || [];
  for (const od of opDiag) {
    const cid = od.corps_id;
    if (!corpsOpsStatus[cid]) corpsOpsStatus[cid] = { active: 0, idle: 0, phases: {}, battles: 0, attacks: 0 };
    if (od.current_phase && od.current_phase !== 'none') {
      corpsOpsStatus[cid].active++;
      corpsOpsStatus[cid].phases[od.current_phase] = (corpsOpsStatus[cid].phases[od.current_phase] || 0) + 1;
    } else {
      corpsOpsStatus[cid].idle++;
    }
    corpsOpsStatus[cid].battles += (od.battle_count || 0);
    corpsOpsStatus[cid].attacks += (od.attack_attempt_count || 0);
  }

  // Combat causality (invalid operations)
  const cc = w.combat_causality || {};
  invalidOps += (cc.invalid_operation_count || 0);
  for (const r of (cc.invalidation_reasons || [])) {
    invalidReasons[r] = (invalidReasons[r] || 0) + 1;
  }

  // Corps summary stances
  if (i === 0 || i === 19 || i === 39) {
    console.log(`\n=== Week ${week} Corps Summary ===`);
    for (const cs of (w.corps_summary || [])) {
      console.log(`  ${cs.faction}: ${cs.corps_count} corps, stances: ${JSON.stringify(cs.stances)}, offensive_targets: ${cs.offensive_targets_total}`);
    }
  }
}

console.log('\n=== Corps Operation Status (40 weeks) ===');
for (const [cid, data] of Object.entries(corpsOpsStatus).sort()) {
  console.log(`  ${cid}: active=${data.active}w idle=${data.idle}w battles=${data.battles} attacks=${data.attacks}`);
  if (Object.keys(data.phases).length > 0) console.log(`    phases: ${JSON.stringify(data.phases)}`);
}

console.log('\n=== Invalid Operations ===');
console.log('Total invalid:', invalidOps);
for (const [r, c] of Object.entries(invalidReasons).sort()) {
  console.log(`  ${r}: ${c}`);
}

// Show week-by-week operation phases for RS corps
console.log('\n=== RS Corps Operation Phases by Week ===');
console.log('Week | 1KK             | 2KK             | SRK             | IBK             | DK              | HK');
for (let i = 0; i < lines.length; i++) {
  const w = JSON.parse(lines[i]);
  const week = w.week_index || (i + 1);
  const opDiag = w.operation_diagnostics || [];
  const phases = {};
  for (const od of opDiag) {
    phases[od.corps_id] = (od.current_phase || 'idle').substring(0, 12) + (od.current_objective ? ' →' + od.current_objective.split(':').pop().substring(0, 8) : '');
  }
  const rCorps = ['vrs_1st_krajina', 'vrs_2nd_krajina', 'vrs_sarajevo_romanija', 'vrs_ibarski', 'vrs_drina', 'vrs_herzegovina'];
  const row = rCorps.map(c => (phases[c] || '-').padEnd(16)).join('| ');
  console.log(`  ${String(week).padStart(2)} | ${row}`);
}
