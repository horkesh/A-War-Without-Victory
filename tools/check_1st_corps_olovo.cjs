const s = require('../data/derived/latest_run_final_save.json');
const sectors = s.military.corps_front_sectors;
const formations = s.military.formations;

// Find 1st Corps sectors with Olovo or Zavidovici
console.log('=== 1st Corps sectors with Olovo/Zavidovici ===');
for (const [sid, sec] of Object.entries(sectors)) {
  if (sec.corps_id !== 'arbih_1st_corps') continue;
  const friendly = sec.sub_segments.flatMap(ss => ss.friendly_osids);
  const hasOlovo = friendly.some(o => o.includes('olovo'));
  const hasZav = friendly.some(o => o.includes('zavidovic'));
  if (hasOlovo || hasZav) {
    const brigs = [...sec.assigned_brigade_ids, ...sec.reserve_brigade_ids];
    console.log(sid + ': ' + sec.edge_ids.length + 'e, ' + brigs.length + 'b');
    console.log('  brigades:', brigs.map(b => formations[b]?.name || b).join(', '));
    console.log('  friendly:', friendly.join(', '));
    const terr = sec.territory_osids.filter(o => o.includes('olovo') || o.includes('zavidovic') || o.includes('breza') || o.includes('vares'));
    if (terr.length) console.log('  territory (olovo/zav/breza/vares):', terr.join(', '));
  }
}

// Check mapOsidsToCorps: what corps are Olovo and Zavidovici OSIDs assigned to?
console.log('\n=== All sectors containing Olovo OSIDs ===');
for (const [sid, sec] of Object.entries(sectors)) {
  const friendly = sec.sub_segments.flatMap(ss => ss.friendly_osids);
  if (friendly.some(o => o.includes('olovo'))) {
    console.log(sid + ' (' + sec.corps_id + '): ' + friendly.filter(o => o.includes('olovo')).join(', '));
  }
}

console.log('\n=== All sectors containing Zavidovici OSIDs ===');
for (const [sid, sec] of Object.entries(sectors)) {
  const friendly = sec.sub_segments.flatMap(ss => ss.friendly_osids);
  if (friendly.some(o => o.includes('zavidovic'))) {
    console.log(sid + ' (' + sec.corps_id + '): ' + friendly.filter(o => o.includes('zavidovic')).join(', '));
  }
}

// Check brigade locations and corps assignments
console.log('\n=== Olovo/Zavidovici brigades ===');
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active') continue;
  if (f.home_osid && (f.home_osid.includes('olovo') || f.home_osid.includes('zavidovic'))) {
    console.log((f.name || fid) + ': corps=' + (f.corps || '?') + ' home=' + f.home_osid + ' loc=' + f.location_osid);
  }
}

// Check which brigades from 1st Corps are in Olovo/Zavidovici area
console.log('\n=== 1st Corps brigades in Olovo/Zavidovici area ===');
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active' || f.faction !== 'RBiH') continue;
  if (f.corps !== 'arbih_1st_corps') continue;
  if (f.location_osid && (f.location_osid.includes('olovo') || f.location_osid.includes('zavidovic'))) {
    console.log((f.name || fid) + ': home=' + f.home_osid + ' loc=' + f.location_osid);
  }
}

// Check what the 1st Corps territory looks like — is Olovo or Zavidovici in its AoR?
console.log('\n=== 1st Corps sector territory municipalities ===');
const corpsMuns = new Set();
for (const [sid, sec] of Object.entries(sectors)) {
  if (sec.corps_id !== 'arbih_1st_corps') continue;
  for (const osid of sec.territory_osids) {
    const mun = osid.split(':')[1];
    corpsMuns.add(mun);
  }
}
console.log([...corpsMuns].sort().join(', '));
