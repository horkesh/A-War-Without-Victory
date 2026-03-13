const save = require('../data/derived/latest_run_final_save.json');
const st = save.state || save;
const mil = st.military || st;
const sectors = mil.corps_front_sectors;
const corps2 = Object.values(sectors).filter(v => v.corps_id === 'arbih_2nd_corps');
corps2.sort((a, b) => a.sector_id.localeCompare(b.sector_id));

console.log('=== ARBiH 2nd Corps — Relevant Sectors ===\n');
for (const s of corps2) {
    const fr = s.sub_segments.flatMap(ss => ss.friendly_osids);
    const en = s.sub_segments.flatMap(ss => ss.enemy_osids);
    const all = [...fr, ...en, ...s.territory_osids];
    const relevant = all.some(o =>
        o.includes('kakanj') || o.includes('visoko') || o.includes('olovo') ||
        o.includes('zavidovici') || o.includes('kladanj') || o.includes('sasevci')
    );
    if (!relevant) continue;
    console.log(s.sector_id + ' edges:' + s.edge_ids.length + ' terr:' + s.territory_osids.length +
        ' brig:' + s.assigned_brigade_ids.length + ' subsegs:' + s.sub_segments.length);
    console.log('  friendly:', fr.join(', '));
    console.log('  enemy:', en.join(', '));
    console.log('  territory:', s.territory_osids.join(', '));
    console.log('  brigades:', s.assigned_brigade_ids.join(', '));
    console.log();
}

// Check for shared territory OSIDs
console.log('=== Shared Territory Check ===');
const osidToSectors = new Map();
for (const s of corps2) {
    for (const o of s.territory_osids) {
        const list = osidToSectors.get(o) || [];
        list.push(s.sector_id);
        osidToSectors.set(o, list);
    }
}
let sharedCount = 0;
for (const [osid, sects] of osidToSectors) {
    if (sects.length > 1) {
        console.log('  SHARED: ' + osid + ' → ' + sects.join(', '));
        sharedCount++;
    }
}
console.log('Total shared territory OSIDs: ' + sharedCount);
