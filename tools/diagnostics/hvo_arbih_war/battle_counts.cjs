// node tools/diagnostics/hvo_arbih_war/battle_counts.cjs <label=runDir> [<label=runDir> ...]
// RF-5B bar check: total battles and battles per week (whole run), split by attacker faction.
const fs = require('fs');
const path = require('path');
const rows = [];
for (const arg of process.argv.slice(2)) {
  const [label, dir] = arg.includes('=') ? arg.split(/=(.*)/s) : [path.basename(arg), arg];
  const save = JSON.parse(fs.readFileSync(path.join(dir, 'final_save.json'), 'utf8'));
  const by = { RBiH: 0, RS: 0, HRHB: 0 };
  let total = 0;
  const weeks = save.turn_summaries.length;
  for (const ts of save.turn_summaries) {
    for (const b of ts.battles || []) { total++; by[b.attacker_faction] = (by[b.attacker_faction] || 0) + 1; }
  }
  rows.push({ label, weeks, total, per_week: +(total / weeks).toFixed(3), ...by });
}
const base = rows[0];
for (const r of rows) {
  const d = (k) => (base[k] ? ((r[k] - base[k]) / base[k] * 100).toFixed(1) + '%' : 'n/a');
  console.log(JSON.stringify(r), r === base ? '(base)' : `total ${d('total')} RBiH ${d('RBiH')} RS ${d('RS')} HRHB ${d('HRHB')}`);
}
