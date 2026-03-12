const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;

console.log('=== ALL SECTORS WITH EMPTY TERRITORY ===\n');
let emptyCount = 0;
for (const [sid, s] of Object.entries(sectors)) {
  if (s.territory_osids.length === 0) {
    emptyCount++;
    const assigned = s.assigned_brigade_ids || [];
    const reserves = s.reserve_brigade_ids || [];
    const friendlyFront = (s.sub_segments || []).flatMap(ss => ss.friendly_osids);
    console.log('Sector:', sid);
    console.log('  Corps:', s.corps_id, '| Faction:', s.faction);
    console.log('  Front edges:', (s.edge_ids || []).length);
    console.log('  Friendly front OSIDs:', friendlyFront);
    console.log('  Assigned brigades:', assigned.length, assigned);
    console.log('  Reserve brigades:', reserves.length, reserves);

    // Check if any assigned brigade is physically on the front
    const frontSet = new Set(friendlyFront);
    for (const bid of [...assigned, ...reserves]) {
      const f = formations[bid];
      if (f) {
        const onFront = frontSet.has(f.location_osid);
        console.log('    Brigade', bid, 'at', f.location_osid, onFront ? '(ON FRONT)' : '(NOT ON FRONT - BUG!)');
      }
    }
    console.log();
  }
}
console.log('Total empty-territory sectors:', emptyCount);
console.log();

console.log('=== CHECK: ANY BRIGADE ASSIGNED TO UNREACHABLE SECTOR? ===\n');
let bugCount = 0;
for (const [sid, s] of Object.entries(sectors)) {
  if (s.territory_osids.length > 0) continue; // Only check empty-territory sectors

  const friendlyFront = new Set((s.sub_segments || []).flatMap(ss => ss.friendly_osids));

  for (const bid of [...(s.assigned_brigade_ids || []), ...(s.reserve_brigade_ids || [])]) {
    const f = formations[bid];
    if (!f) continue;
    if (!friendlyFront.has(f.location_osid)) {
      bugCount++;
      console.log('BUG:', bid, 'assigned to', sid, '(empty territory) but located at', f.location_osid);
    }
  }
}
if (bugCount === 0) console.log('No unreachable brigade assignments found.');
else console.log('\nTotal bugs:', bugCount);

console.log('\n=== SECTOR SUMMARY ===\n');
const totalSectors = Object.keys(sectors).length;
const withBrigades = Object.values(sectors).filter(s => (s.assigned_brigade_ids || []).length > 0).length;
const emptyBrigades = Object.values(sectors).filter(s => (s.assigned_brigade_ids || []).length === 0).length;
console.log('Total sectors:', totalSectors);
console.log('Sectors with brigades:', withBrigades);
console.log('Sectors without brigades:', emptyBrigades);
console.log('Sectors with empty territory:', emptyCount);

// Check the specific 5th corps situation
console.log('\n=== 5th CORPS SECTORS ===\n');
for (const [sid, s] of Object.entries(sectors)) {
  if (s.corps_id !== 'arbih_5th_corps') continue;
  const assigned = s.assigned_brigade_ids || [];
  const reserves = s.reserve_brigade_ids || [];
  const friendlyFront = (s.sub_segments || []).flatMap(ss => ss.friendly_osids);
  const hasKljuc = friendlyFront.some(o => o.includes('kljuc'));
  const hasSanski = friendlyFront.some(o => o.includes('sanski'));
  console.log('Sector:', sid);
  console.log('  Territory:', s.territory_osids.length, 'OSIDs');
  console.log('  Front edges:', (s.edge_ids || []).length);
  console.log('  Assigned:', assigned.length, '| Reserve:', reserves.length);
  if (hasKljuc || hasSanski) console.log('  ** Contains Kljuc/Sanski Most front OSIDs **');
  for (const bid of [...assigned, ...reserves]) {
    const f = formations[bid];
    if (f) console.log('   ', bid, 'at', f.location_osid, 'pers:', f.personnel);
  }
  console.log();
}
