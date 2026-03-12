const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const secs = d.military.corps_front_sectors;
if (!secs) { console.log('No sectors'); process.exit(1); }
const ids = Object.keys(secs).sort();
console.log('Total sectors:', ids.length);

// Check for territory-split sectors
const terrSplits = ids.filter(id => id.includes('terrsplit') || id.includes(':t'));
console.log('Territory-split sector IDs:', terrSplits.length);
for (const id of terrSplits) {
  const s = secs[id];
  console.log('  ', id, 'edges:', s.edge_ids.length, 'territory:', s.territory_osids.length);
}

// Check corps sectors for Drina (Srebrenica area), 2nd Corps
console.log('\n--- By Corps ---');
const corpsCounts = {};
for (const id of ids) {
  const s = secs[id];
  const c = s.corps_id;
  if (!corpsCounts[c]) corpsCounts[c] = [];
  corpsCounts[c].push(id);
}
for (const [corps, sectorIds] of Object.entries(corpsCounts).sort()) {
  console.log(corps + ':', sectorIds.length, 'sectors');
  for (const sid of sectorIds) {
    const s = secs[sid];
    const terrOsids = s.territory_osids || [];
    // Check if Srebrenica-area OSIDs are present
    const hasSrebrenica = terrOsids.some(o => o.includes('srebrenica'));
    const hasCerska = terrOsids.some(o => o.includes('cerska') || o.includes('vlasenica') || o.includes('bratunac'));
    const tags = [];
    if (hasSrebrenica) tags.push('SREBRENICA');
    if (hasCerska) tags.push('CERSKA/VLASENICA/BRATUNAC');
    const tagStr = tags.length > 0 ? ' [' + tags.join(', ') + ']' : '';
    console.log('  ', sid, 'edges:', s.edge_ids.length, 'terr:', terrOsids.length,
      'brig:', s.assigned_brigade_ids.length, '+' + s.reserve_brigade_ids.length + 'R' + tagStr);
  }
}
