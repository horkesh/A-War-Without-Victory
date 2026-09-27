const fs = require('fs');
const rd = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n399';
const lines = fs.readFileSync(rd + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean);

// Find the cardak capture week and print operations + diagnostics around it.
for (const line of lines) {
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  const hit = (rec.battles || []).some((b) => b.target_osid === 'op:zavidovici:cardak_2');
  if (!hit) continue;
  console.log('=== week ' + rec.week_index + ' cardak battle ===');
  console.log('battles:', JSON.stringify((rec.battles || []).filter((b) => b.target_osid === 'op:zavidovici:cardak_2'), null, 1));
  console.log('ops:', JSON.stringify(rec.ops, null, 1).slice(0, 3000));
  console.log('operation_diagnostics (3rd corps rows):', JSON.stringify((rec.operation_diagnostics || []).filter((d) => JSON.stringify(d).includes('3rd_corps') || JSON.stringify(d).includes('303rd')), null, 1).slice(0, 3000));
}
