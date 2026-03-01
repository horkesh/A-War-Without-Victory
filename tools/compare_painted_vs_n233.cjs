const fs = require('fs');
const painted = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_jan1993.json','utf8')).by_settlement_id;
const final = JSON.parse(fs.readFileSync('runs/apr1992_definitive_52w__8f0480811cda911e__w52_n233/final_save.json','utf8'));
const pc = final.political_controllers || {};

const mismatches = {};
let matchCount = 0;
for (const osid of Object.keys(painted)) {
  const target = painted[osid];
  const actual = pc[osid] || 'none';
  if (target === actual) { matchCount++; continue; }
  const key = actual + '_should_be_' + target;
  if (!(key in mismatches)) mismatches[key] = [];
  mismatches[key].push(osid);
}

console.log('Matched: ' + matchCount + ' / ' + Object.keys(painted).length);
console.log('Mismatched: ' + (Object.keys(painted).length - matchCount));
console.log();

for (const [key, list] of Object.entries(mismatches)) {
  if (list.length === 0) continue;
  const byMun = {};
  for (const osid of list) {
    const mun = osid.split(':')[1];
    if (!(mun in byMun)) byMun[mun] = 0;
    byMun[mun]++;
  }
  console.log(key + ': ' + list.length + ' OSIDs');
  const sorted = Object.entries(byMun).sort((a,b) => b[1]-a[1]);
  for (const [m,c] of sorted.slice(0,20)) console.log('  ' + m + ': ' + c);
  if (sorted.length > 20) console.log('  ... and ' + (sorted.length-20) + ' more muns');
  console.log();
}
