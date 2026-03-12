const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n525';

const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));

// Check first weeks
for (let i = 0; i < Math.min(15, lines.length); i++) {
  const w = lines[i];
  console.log('week:', w.week_index_index, 'battles:', (w.battles || []).length);
}

console.log('\n--- Sarajevo battles ---');
for (const w of lines) {
  if (!w.battles) continue;
  for (const b of w.battles) {
    if (b.target_osid && b.target_osid.includes('sarajevo')) {
      console.log('w' + w.week_index, b.target_osid, b.outcome, 'att:', b.attacker_faction, 'pr:', b.power_ratio);
    }
  }
}

console.log('\n--- Gorazde battles ---');
for (const w of lines) {
  if (!w.battles) continue;
  for (const b of w.battles) {
    if (b.target_osid && b.target_osid.includes('gorazde')) {
      console.log('w' + w.week_index, b.target_osid, b.outcome, 'att:', b.attacker_faction, 'pr:', b.power_ratio);
    }
  }
}

console.log('\n--- Battle count per week ---');
for (const w of lines) {
  if (w.battles && w.battles.length > 0) {
    console.log('w' + w.week_index + ': ' + w.battles.length + ' battles');
  }
}
