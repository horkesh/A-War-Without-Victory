const s = require('../data/derived/latest_run_final_save.json');
const l = s.military.casualty_ledger;
let grandKIA = 0, grandWIA = 0, grandMIA = 0;
for (const [fac, entry] of Object.entries(l)) {
  if (typeof entry.killed !== 'number') continue;
  const total = entry.killed + entry.wounded + entry.missing_captured;
  console.log(fac, '— KIA:', entry.killed, 'WIA:', entry.wounded, 'MIA:', entry.missing_captured, 'Total:', total);
  grandKIA += entry.killed;
  grandWIA += entry.wounded;
  grandMIA += entry.missing_captured;
}
console.log('TOTAL — KIA:', grandKIA, 'WIA:', grandWIA, 'MIA:', grandMIA, 'Grand:', grandKIA + grandWIA + grandMIA);
