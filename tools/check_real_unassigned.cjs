const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors || {};
const assignedSet = new Set();
for (const sec of Object.values(sectors)) {
  for (const id of (sec.assigned_brigade_ids || [])) assignedSet.add(id);
  for (const id of (sec.reserve_brigade_ids || [])) assignedSet.add(id);
}
const formations = save.military.formations || {};
let total = 0, unassigned = 0;
const unList = [];
for (const [id, f] of Object.entries(formations)) {
  if (f.status === 'inactive') continue;
  if (f.kind === 'corps' || f.kind === 'army') continue;
  if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
  total++;
  if (!assignedSet.has(id)) {
    unassigned++;
    unList.push(id + '  kind=' + f.kind + '  pers=' + f.personnel + '  loc=' + f.location_osid + '  corps=' + f.corps_id);
  }
}
console.log('Active brigades (excl corps/army):', total);
console.log('In sectors:', total - unassigned);
console.log('Unassigned:', unassigned);
for (const u of unList) console.log('  ' + u);
