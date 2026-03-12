const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;

// Show RBiH corps sectors and their municipality coverage
console.log('=== RBiH Corps Sector Coverage ===\n');
for (const [sid, sec] of Object.entries(sectors).sort()) {
  if (sec.faction !== 'RBiH') continue;
  const frontOsids = [];
  for (const ss of sec.sub_segments || []) {
    for (const o of ss.friendly_osids || []) frontOsids.push(o);
  }
  const muns = [...new Set(frontOsids.map(o => o.split(':')[1]))].sort();
  console.log(sec.corps_id + ' [' + sid + ']  edges=' + sec.length_edges + '  brig=' + sec.assigned_brigade_ids.length + '  res=' + sec.reserve_brigade_ids.length);
  console.log('  muns: ' + muns.join(', '));
  console.log();
}

// Show where each RBiH corps HQ is located
console.log('\n=== RBiH Corps HQ Locations ===\n');
for (const [id, f] of Object.entries(formations).sort()) {
  if (f.faction !== 'RBiH' || f.kind !== 'corps') continue;
  console.log(id + '  loc=' + f.location_osid);
}

// Show brigade corps assignments and locations
console.log('\n=== RBiH Brigade → Corps → Sector ===\n');
const brigadeToSector = {};
for (const [sid, sec] of Object.entries(sectors)) {
  for (const bid of [...(sec.assigned_brigade_ids || []), ...(sec.reserve_brigade_ids || [])]) {
    brigadeToSector[bid] = { sector: sid, corps: sec.corps_id };
  }
}

for (const [id, f] of Object.entries(formations).sort()) {
  if (f.faction !== 'RBiH' || f.status !== 'active') continue;
  if (f.kind !== 'brigade' && f.kind !== 'og') continue;
  const sInfo = brigadeToSector[id];
  const sectorCorps = sInfo ? sInfo.corps : 'NONE';
  const brigadeCorps = f.corps_id;
  const mismatch = sectorCorps !== brigadeCorps && sectorCorps !== 'NONE' ? ' *** MISMATCH ***' : '';
  if (mismatch || !sInfo) {
    console.log(id + '  brigade_corps=' + brigadeCorps + '  sector_corps=' + sectorCorps + '  loc=' + f.location_osid + mismatch);
  }
}
