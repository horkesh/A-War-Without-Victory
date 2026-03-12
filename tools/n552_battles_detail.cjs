const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n552';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

// Show first 30 RS battles with details
let count = 0;
let byOutcome = {};
let earlySuccess = 0, earlyTotal = 0;
let lateSuccess = 0, lateTotal = 0;

for (const line of lines) {
  const w = JSON.parse(line);
  for (const b of (w.battles || [])) {
    if (b.attacker_faction !== 'RS') continue;
    const outcome = b.outcome;
    byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
    const success = outcome === 'decisive' || outcome === 'victory' || outcome === 'costly';
    if (w.week <= 12) { earlyTotal++; if (success) earlySuccess++; }
    else { lateTotal++; if (success) lateSuccess++; }

    if (count < 30) {
      console.log(`w${w.week} ${outcome.padEnd(18)} PR:${(b.power_ratio || 0).toFixed(2)} att:${b.attacker_count || '?'} attPow:${(b.attacker_power || 0).toFixed(0)} defPow:${(b.defender_power || 0).toFixed(0)} attCas:${b.attacker_casualties} defCas:${b.defender_casualties} target:${b.target_osid || '?'}`);
      count++;
    }
  }
}

console.log('\n=== Outcome distribution ===');
for (const [o, c] of Object.entries(byOutcome).sort()) {
  console.log(`  ${o}: ${c}`);
}

console.log('\nEarly war (w1-12):', earlyTotal, 'attacks,', earlySuccess, 'success,', earlyTotal > 0 ? (earlySuccess/earlyTotal*100).toFixed(1)+'%' : 'N/A');
console.log('Late war (w13-40):', lateTotal, 'attacks,', lateSuccess, 'success,', lateTotal > 0 ? (lateSuccess/lateTotal*100).toFixed(1)+'%' : 'N/A');
