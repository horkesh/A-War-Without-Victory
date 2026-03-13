const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json','utf8'));
const sectors = s.military.corps_front_sectors;
const allAssigned = new Set();
for (const sec of Object.values(sectors)) {
  for (const b of sec.assigned_brigade_ids) allAssigned.add(b);
  for (const b of sec.reserve_brigade_ids) allAssigned.add(b);
}
const unassigned = [];
for (const [fid, f] of Object.entries(s.military.formations)) {
  if (f.kind !== 'brigade') continue;
  if (f.status === 'destroyed' || f.status === 'not_yet_formed') continue;
  if (allAssigned.has(fid)) continue;
  if (f.personnel > 0) unassigned.push({fid, corps: f.corps_id, loc: f.location_osid, pers: f.personnel, status: f.status});
}
unassigned.sort((a,b) => b.pers - a.pers);
console.log('Unassigned brigades with personnel:', unassigned.length);
for (const u of unassigned) console.log('  ' + u.fid + ' [' + u.corps + '] at ' + u.loc + ' (' + u.pers + ' pers, ' + u.status + ')');

// Also check: any REAL cross-corps assignments?
let crossCorps = 0;
for (const [sid, sec] of Object.entries(sectors)) {
  for (const bid of [...sec.assigned_brigade_ids, ...sec.reserve_brigade_ids]) {
    const f = s.military.formations[bid];
    if (!f) continue;
    if (f.corps_id && f.corps_id !== sec.corps_id) {
      crossCorps++;
      if (crossCorps <= 10) console.log('  CROSS-CORPS: ' + bid + ' (corps=' + f.corps_id + ') in ' + sid + ' (corps=' + sec.corps_id + ')');
    }
  }
}
console.log('\nReal cross-corps assignments: ' + crossCorps);
