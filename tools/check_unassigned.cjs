const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;
const sectors = save.military.corps_front_sectors || {};

// Collect all brigades assigned to any sector
const assignedBrigades = new Set();
for (const [sid, sec] of Object.entries(sectors)) {
  for (const ss of (sec.sub_segments || [])) {
    for (const bid of (ss.assigned_brigades || [])) assignedBrigades.add(bid);
  }
}

const unassigned = { RS: [], RBiH: [], HRHB: [] };
const totalActive = { RS: 0, RBiH: 0, HRHB: 0 };

for (const [id, f] of Object.entries(formations)) {
  if (f.status === 'inactive' || f.type === 'corps' || f.type === 'army') continue;
  const fac = f.faction;
  if (fac !== 'RS' && fac !== 'RBiH' && fac !== 'HRHB') continue;
  totalActive[fac]++;
  if (assignedBrigades.has(id)) continue;
  unassigned[fac].push({ id, personnel: f.personnel, loc: f.location_osid, corps: f.corps_id, tags: f.tags });
}

console.log('Active brigades:', totalActive);
console.log('Assigned to sectors:', assignedBrigades.size);
console.log('Total unassigned:', unassigned.RS.length + unassigned.RBiH.length + unassigned.HRHB.length);
console.log();

for (const fac of ['RS', 'RBiH', 'HRHB']) {
  const list = unassigned[fac];
  console.log(`${fac} unassigned: ${list.length} / ${totalActive[fac]} active`);
  list.sort((a, b) => (b.personnel || 0) - (a.personnel || 0));
  for (const b of list) {
    console.log(`  ${b.id}  pers=${b.personnel}  loc=${b.loc}  corps=${b.corps}  tags=${(b.tags||[]).join(',')}`);
  }
  console.log();
}
