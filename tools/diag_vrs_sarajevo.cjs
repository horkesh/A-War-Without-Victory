const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));

const formations = save.military.formations;
const sectors = save.military.corps_front_sectors;

// Which VRS corps has sectors in Sarajevo municipalities?
const sarajevoMunis = new Set([
    'centar_sarajevo', 'stari_grad_sarajevo', 'novo_sarajevo',
    'novi_grad_sarajevo', 'ilidza', 'ilijas', 'vogosca', 'trnovo', 'pale', 'hadzici'
]);

console.log('=== VRS sectors covering Sarajevo-area municipalities ===');
for (const [sid, sec] of Object.entries(sectors).sort()) {
    if (sec.faction !== 'RS') continue;
    const friendly = new Set();
    for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) friendly.add(o);
    const sarajevoOsids = [...friendly].filter(o => sarajevoMunis.has(o.split(':')[1]));
    if (sarajevoOsids.length > 0) {
        const munis = [...new Set(sarajevoOsids.map(o => o.split(':')[1]))].sort();
        console.log(`  ${sid} [${sec.corps_id}]: ${sec.edge_ids.length} edges, ${sec.assigned_brigade_ids.length} brig`);
        console.log(`    Sarajevo munis: ${munis.join(', ')}`);
        // What brigades are assigned?
        for (const bid of sec.assigned_brigade_ids) {
            const f = formations[bid];
            if (f) console.log(`    brig: ${bid} corps=${f.corps_id} home=${f.home_osid} loc=${f.location_osid}`);
        }
    }
}

// Check VRS brigade home_osids in Sarajevo area
console.log('\n=== VRS brigades with home_osid in Sarajevo area ===');
for (const [fid, f] of Object.entries(formations).sort()) {
    if (f.faction !== 'RS' || f.kind !== 'brigade') continue;
    if (!f.home_osid) continue;
    const homeMun = f.home_osid.split(':')[1];
    if (sarajevoMunis.has(homeMun)) {
        console.log(`  ${fid}: corps=${f.corps_id} home=${f.home_osid} loc=${f.location_osid}`);
    }
}

// Check: which VRS corps has home seeds in Sarajevo?
console.log('\n=== VRS corps → home municipality mapping (Sarajevo area only) ===');
const corpsMunCount = {};
for (const [fid, f] of Object.entries(formations)) {
    if (f.faction !== 'RS' || f.kind !== 'brigade') continue;
    if (!f.home_osid || !f.corps_id) continue;
    const mun = f.home_osid.split(':')[1];
    if (!sarajevoMunis.has(mun)) continue;
    const key = f.corps_id + ':' + mun;
    corpsMunCount[key] = (corpsMunCount[key] || 0) + 1;
}
for (const [key, count] of Object.entries(corpsMunCount).sort()) {
    console.log(`  ${key}: ${count} brigades`);
}

// Check SRK vs Herzegovina brigade counts
console.log('\n=== VRS corps brigade counts ===');
const corpsCount = {};
for (const [fid, f] of Object.entries(formations)) {
    if (f.faction !== 'RS' || f.kind !== 'brigade') continue;
    if (f.status === 'destroyed' || f.status === 'not_yet_formed') continue;
    const corps = f.corps_id || 'none';
    corpsCount[corps] = (corpsCount[corps] || 0) + 1;
}
for (const [corps, count] of Object.entries(corpsCount).sort()) {
    console.log(`  ${corps}: ${count} brigades`);
}
