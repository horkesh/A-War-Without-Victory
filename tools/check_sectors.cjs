const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors || {};
const sectorIds = Object.keys(sectors);
console.log('Total sectors:', sectorIds.length);

if (sectorIds.length > 0) {
  const first = sectors[sectorIds[0]];
  console.log('First sector id:', sectorIds[0]);
  console.log('First sector keys:', Object.keys(first));
  console.log('First sector sub_segments count:', (first.sub_segments || []).length);
  if (first.sub_segments && first.sub_segments[0]) {
    const ss = first.sub_segments[0];
    console.log('First sub_segment keys:', Object.keys(ss));
    console.log('  assigned_brigades:', ss.assigned_brigades);
    console.log('  friendly_osids count:', (ss.friendly_osids || []).length);
    console.log('  hostile_osids count:', (ss.hostile_osids || []).length);
  }
}

// Count total assigned brigades across all sectors
let totalAssigned = 0;
for (const sec of Object.values(sectors)) {
  for (const ss of (sec.sub_segments || [])) {
    totalAssigned += (ss.assigned_brigades || []).length;
  }
}
console.log('\nTotal brigades assigned across all sectors:', totalAssigned);

// Check if there's a separate brigade_front_assignments structure
const mil = save.military;
console.log('\nmilitary top-level keys:', Object.keys(mil).sort().join(', '));
