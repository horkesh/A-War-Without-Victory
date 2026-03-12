const fs = require('fs');

// Check weekly reports for 107th/108th brigade locations over time
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean);

// Check initial and final saves for brigade positions
const init = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/initial_save.json', 'utf8'));
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/final_save.json', 'utf8'));

const fmns_init = init.military.formations;
const fmns_final = final_.military.formations;

// Find 107th and 108th
for (const id of ['hrhb_107th_gradaac_brigade', 'hrhb_108th_brko_brigade']) {
    const fi = fmns_init[id];
    const ff = fmns_final[id];
    console.log(`\n=== ${id} ===`);
    if (fi) {
        console.log('Initial:', 'location:', fi.location_osid, 'status:', fi.status, 'personnel:', fi.personnel);
    } else {
        console.log('Initial: NOT SPAWNED YET');
    }
    if (ff) {
        console.log('Final:', 'location:', ff.location_osid, 'status:', ff.status, 'personnel:', ff.personnel,
            'cohesion:', ff.cohesion, 'morale:', ff.morale);
    } else {
        console.log('Final: NOT FOUND');
    }
}

// Check ALL brigades at Gradačac and Brčko municipalities at w40
console.log('\n=== BRIGADES IN GRADAČAC/BRČKO AREA (final) ===');
const gradacacOsids = Object.keys(final_.political.political_controllers).filter(k => k.startsWith('op:gradacac:'));
const brckoOsids = Object.keys(final_.political.political_controllers).filter(k => k.startsWith('op:brcko:'));
const allAreaOsids = new Set([...gradacacOsids, ...brckoOsids]);

for (const [fid, f] of Object.entries(fmns_final)) {
    if (f.status === 'active' && f.location_osid) {
        if (allAreaOsids.has(f.location_osid) || f.home_osid?.startsWith('op:gradacac:') || f.home_osid?.startsWith('op:brcko:')) {
            console.log(fid, '| loc:', f.location_osid, '| home:', f.home_osid, '| faction:', f.faction,
                '| pers:', f.personnel, '| corps:', f.corps);
        }
    }
}

// Check control timeline for Gradačac
console.log('\n=== GRADAČAC CONTROL TIMELINE ===');
const pc_init = init.political.political_controllers;
const pc_final = final_.political.political_controllers;
for (const o of gradacacOsids.sort()) {
    console.log(o, 'init:', pc_init[o], 'final:', pc_final[o]);
}

console.log('\n=== BRČKO CONTROL TIMELINE ===');
for (const o of brckoOsids.sort()) {
    console.log(o, 'init:', pc_init[o], 'final:', pc_final[o]);
}

// Check 2nd Corps sectors — what sectors exist and where are they?
console.log('\n=== 2ND CORPS BRIGADES (final) ===');
const corps2brigades = Object.entries(fmns_final).filter(([id, f]) =>
    f.corps === 'arbih_2nd_corps' && f.status === 'active'
).sort((a,b) => a[0].localeCompare(b[0]));
for (const [fid, f] of corps2brigades) {
    const locMun = f.location_osid ? f.location_osid.split(':')[1] : '?';
    const homeMun = f.home_osid ? f.home_osid.split(':')[1] : '?';
    console.log(`  ${fid} | loc:${locMun}(${f.location_osid}) | home:${homeMun} | pers:${f.personnel}`);
}

// Check formation_delta for when 107th/108th spawned
const fd = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/formation_delta.json', 'utf8'));
console.log('\n=== FORMATION DELTA (107th/108th) ===');
for (const [fid, delta] of Object.entries(fd)) {
    if (fid.includes('107th') || fid.includes('108th')) {
        console.log(fid, JSON.stringify(delta));
    }
}
