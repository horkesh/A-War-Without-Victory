const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors || {};

// Count via assigned_brigade_ids on sector
let sectorAssigned = 0;
const sectorBrigades = new Set();
for (const sec of Object.values(sectors)) {
  const ids = sec.assigned_brigade_ids || [];
  sectorAssigned += ids.length;
  for (const id of ids) sectorBrigades.add(id);
  const reserves = sec.reserve_brigade_ids || [];
  for (const id of reserves) sectorBrigades.add(id);
}
console.log('Brigades in sector assigned_brigade_ids:', sectorAssigned);
console.log('Brigades in sector (incl reserves):', sectorBrigades.size);

// Check brigade_front_assignment
const bfa = save.military.brigade_front_assignment || {};
const bfaEntries = Object.entries(bfa);
console.log('\nbrigade_front_assignment entries:', bfaEntries.length);
if (bfaEntries.length > 0) {
  console.log('First 5:');
  for (const [bid, assignment] of bfaEntries.slice(0, 5)) {
    console.log('  ' + bid + ':', JSON.stringify(assignment));
  }
}

// Count active brigades
const formations = save.military.formations || {};
let active = { RS: 0, RBiH: 0, HRHB: 0 };
let unassigned = { RS: 0, RBiH: 0, HRHB: 0 };
for (const [id, f] of Object.entries(formations)) {
  if (f.status === 'inactive' || f.type === 'corps' || f.type === 'army') continue;
  const fac = f.faction;
  if (fac !== 'RS' && fac !== 'RBiH' && fac !== 'HRHB') continue;
  active[fac]++;
  if (!sectorBrigades.has(id)) {
    unassigned[fac]++;
  }
}
console.log('\nActive brigades:', active);
console.log('Unassigned (not in any sector):', unassigned);
console.log('Total unassigned:', unassigned.RS + unassigned.RBiH + unassigned.HRHB);

// Show some unassigned RS brigades with high personnel
const unassignedList = [];
for (const [id, f] of Object.entries(formations)) {
  if (f.status === 'inactive' || f.type === 'corps' || f.type === 'army') continue;
  if (f.faction !== 'RS') continue;
  if (sectorBrigades.has(id)) continue;
  unassignedList.push({ id, pers: f.personnel, loc: f.location_osid });
}
unassignedList.sort((a, b) => (b.pers || 0) - (a.pers || 0));
console.log('\nTop 15 unassigned RS brigades:');
for (const b of unassignedList.slice(0, 15)) {
  console.log('  ' + b.id + '  pers=' + b.pers + '  loc=' + b.loc);
}
