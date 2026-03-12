const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n552';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

let byOutcome = {};
let rsTotal = 0, rsSuccess = 0;
let earlyRS = 0, earlyRSsuc = 0;
let lateRS = 0, lateRSsuc = 0;

for (const line of lines) {
  const w = JSON.parse(line);
  const week = w.week || w.turn || 0;
  for (const b of (w.battles || [])) {
    if (b.attacker_faction !== 'RS') continue;
    rsTotal++;
    const o = b.outcome;
    byOutcome[o] = (byOutcome[o] || 0) + 1;
    const success = o === 'decisive_victory' || o === 'victory' || o === 'costly_victory';
    if (success) rsSuccess++;
    if (week <= 12) { earlyRS++; if (success) earlyRSsuc++; }
    else { lateRS++; if (success) lateRSsuc++; }
  }
}

console.log('RS attacks:', rsTotal, 'success:', rsSuccess, 'rate:', (rsSuccess/rsTotal*100).toFixed(1)+'%');
console.log('\nOutcome distribution:');
for (const [o, c] of Object.entries(byOutcome).sort()) {
  console.log(`  ${o}: ${c} (${(c/rsTotal*100).toFixed(1)}%)`);
}
console.log('\nEarly (w1-12):', earlyRS, 'attacks,', earlyRSsuc, 'success');
console.log('Late (w13-40):', lateRS, 'attacks,', lateRSsuc, 'success');
