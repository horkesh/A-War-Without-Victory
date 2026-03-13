const save = require('../data/derived/latest_run_final_save.json');
const st = save.state || save;
const pol = st.political || st;
const pc = pol.political_controllers || {};

// Check control of key areas
const areas = ['kakanj', 'visoko', 'olovo', 'zavidovici', 'kladanj', 'sasevci', 'hajderovici'];
for (const area of areas) {
    const osids = Object.entries(pc).filter(([k]) => k.includes(area));
    const byFaction = {};
    for (const [osid, faction] of osids) {
        byFaction[faction] = (byFaction[faction] || 0) + 1;
    }
    console.log(area + ':', JSON.stringify(byFaction), '(' + osids.length + ' total)');
}

// Show ALL sectors across all factions that contain these areas
const mil = st.military || st;
const sectors = mil.corps_front_sectors;
console.log('\n=== All Sectors containing target areas ===');
for (const s of Object.values(sectors)) {
    const fr = s.sub_segments.flatMap(ss => ss.friendly_osids);
    const en = s.sub_segments.flatMap(ss => ss.enemy_osids);
    const all = [...fr, ...en, ...s.territory_osids];
    const relevant = all.some(o =>
        o.includes('kakanj') || o.includes('visoko') || o.includes('olovo') ||
        o.includes('zavidovici') || o.includes('kladanj') || o.includes('sasevci')
    );
    if (!relevant) continue;
    console.log(s.sector_id + ' (' + s.faction + ') edges:' + s.edge_ids.length +
        ' terr:' + s.territory_osids.length + ' brig:' + s.assigned_brigade_ids.length +
        ' subsegs:' + s.sub_segments.length);
    console.log('  friendly:', fr.filter(o => areas.some(a => o.includes(a))).join(', '));
    console.log('  enemy:', en.filter(o => areas.some(a => o.includes(a))).join(', '));
}

// Check shared territory for ALL factions
console.log('\n=== Shared Territory (all factions) ===');
const osidToSectors = new Map();
for (const s of Object.values(sectors)) {
    for (const o of s.territory_osids) {
        const list = osidToSectors.get(o) || [];
        list.push(s.sector_id);
        osidToSectors.set(o, list);
    }
}
let sharedCount = 0;
for (const [osid, sects] of osidToSectors) {
    if (sects.length > 1) {
        sharedCount++;
    }
}
console.log('Total shared territory OSIDs across all factions: ' + sharedCount);
