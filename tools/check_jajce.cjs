const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const state = save.state || save;
const pc = state.political.political_controllers || {};

const targetMuns = ['kljuc','bosanski_petrovac','jajce','donji_vakuf','sipovo','sanski_most'];
const munSet = new Set(targetMuns);

console.log('=== Enemy OSIDs in Krajina Sweep municipalities ===');
const targets = [];
for (const osid of Object.keys(pc).sort()) {
    const m = osid.match(/^op:([^:]+):/);
    if (m && munSet.has(m[1]) && pc[osid] !== 'RS') {
        console.log(osid, '->', pc[osid]);
        targets.push(osid);
    }
}
console.log('\nTotal enemy targets:', targets.length);

// Now check which of these are in VRS 1KK sector enemy_osids
const mil = state.military || state;
const sectors = mil.corps_front_sectors || {};
const sectorEnemyOsids = new Set();
for (const [sid, sec] of Object.entries(sectors)) {
    if (sid.includes('vrs_1st_krajina')) {
        for (const ss of (sec.sub_segments || [])) {
            for (const eo of (ss.enemy_osids || [])) {
                sectorEnemyOsids.add(eo);
            }
        }
    }
}

console.log('\n=== Targets IN 1KK sector enemy_osids ===');
const inSector = targets.filter(t => sectorEnemyOsids.has(t));
const notInSector = targets.filter(t => !sectorEnemyOsids.has(t));
console.log('In sector:', inSector.length, inSector);
console.log('NOT in sector:', notInSector.length, notInSector);
