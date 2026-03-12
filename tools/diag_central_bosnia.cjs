// Diagnostic: Check OOB manpower_cost vs initial_personnel mismatch
const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

for (const fac of ['RBiH', 'RS', 'HRHB']) {
    const mandatory = oob.filter(b => b.faction === fac && b.mandatory);
    const noMC = mandatory.filter(b => b.manpower_cost == null);
    const withMC = mandatory.filter(b => b.manpower_cost != null);
    console.log(fac + ': ' + mandatory.length + ' mandatory, ' + noMC.length + ' default mc(800), ' + withMC.length + ' explicit mc');

    // Show the mismatch: ip=440 but mc=800 means 360 wasted pool per brigade
    const mismatch = mandatory.filter(b => {
        const mc = b.manpower_cost || 800;
        const ip = b.initial_personnel || 500;
        return mc > ip * 1.2; // mc is >20% more than ip
    });
    if (mismatch.length > 0) {
        console.log('  Mismatch (mc > 1.2 * ip): ' + mismatch.length);
        for (const b of mismatch.slice(0, 5)) {
            console.log('    ' + b.id.padEnd(45) + ' mc=' + (b.manpower_cost || 800) + ' ip=' + (b.initial_personnel || 500));
        }
        if (mismatch.length > 5) console.log('    ... and ' + (mismatch.length - 5) + ' more');
    }
}

// Show 3rd Corps pool consumption at w0
console.log('\n=== 3RD CORPS W0 POOL CONSUMPTION ===');
const corps3w0 = oob.filter(b => b.corps === 'arbih_3rd_corps' && (b.available_from == null || b.available_from === 0));
const byMun = {};
for (const b of corps3w0) {
    const m = b.home_mun;
    if (byMun[m] == null) byMun[m] = { count: 0, totalMC: 0, totalIP: 0 };
    byMun[m].count++;
    byMun[m].totalMC += (b.manpower_cost || 800);
    byMun[m].totalIP += (b.initial_personnel || 440);
}
for (const [m, d] of Object.entries(byMun).sort((a,b) => a[0].localeCompare(b[0]))) {
    console.log(m.padEnd(20) + ' ' + d.count + ' brigades, pool needed: ' + d.totalMC + ' (at mc=800), actual spawn cost: ' + d.totalIP);
}
process.exit(0);
const fmns = save.military.formations;

// Count brigades per corps
const byCorp = {};
const corpPersonnel = {};
for (const [id, f] of Object.entries(fmns)) {
    if (f.status === 'active' && f.kind === 'brigade') {
        const corps = f.corps_id || 'NO_CORPS';
        byCorp[corps] = (byCorp[corps] || 0) + 1;
        corpPersonnel[corps] = (corpPersonnel[corps] || 0) + (f.personnel || 0);
    }
}
const sorted = Object.entries(byCorp).sort((a,b) => b[1] - a[1]);
console.log('=== ACTIVE BRIGADES PER CORPS ===');
for (const [c, n] of sorted) {
    console.log(String(n).padStart(3) + ' brig ' + String(corpPersonnel[c]).padStart(6) + ' pers  ' + c);
}

// Check arbih corps that cover central Bosnia
for (const corpsId of ['arbih_2nd_corps', 'arbih_3rd_corps', 'arbih_1st_corps']) {
    console.log('\n=== ' + corpsId.toUpperCase() + ' BRIGADES ===');
    for (const [id, f] of Object.entries(fmns)) {
        if (f.corps_id === corpsId && f.status === 'active' && f.kind === 'brigade') {
            console.log('  ' + id.padEnd(45) + ' ' + String(f.personnel).padStart(5) + ' pers at ' + (f.location_osid || 'unknown'));
        }
    }
}

// Check HVO central bosnia
console.log('\n=== HVO CENTRAL BOSNIA BRIGADES ===');
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'hvo_central_bosnia' && f.status === 'active' && f.kind === 'brigade') {
        console.log('  ' + id.padEnd(45) + ' ' + String(f.personnel).padStart(5) + ' pers at ' + (f.location_osid || 'unknown'));
    }
}

// Check VRS 1st Krajina (the ones pushing into central Bosnia)
console.log('\n=== VRS 1ST KRAJINA BRIGADES ===');
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'vrs_1st_krajina' && f.status === 'active' && f.kind === 'brigade') {
        console.log('  ' + id.padEnd(45) + ' ' + String(f.personnel).padStart(5) + ' pers at ' + (f.location_osid || 'unknown'));
    }
}

// Sector coverage summary
console.log('\n=== SECTOR COVERAGE BY CORPS (brigades / edges) ===');
const sectors = save.military.corps_front_sectors;
const sectorsByCorps = {};
for (const [sid, s] of Object.entries(sectors)) {
    const c = s.corps_id;
    if (sectorsByCorps[c] == null) sectorsByCorps[c] = {brigades: 0, edges: 0, sectors: 0, empty: 0};
    sectorsByCorps[c].brigades += s.assigned_brigade_ids.length;
    sectorsByCorps[c].edges += s.length_edges;
    sectorsByCorps[c].sectors++;
    if (s.assigned_brigade_ids.length === 0) sectorsByCorps[c].empty++;
}
for (const [c, d] of Object.entries(sectorsByCorps).sort((a,b) => a[0].localeCompare(b[0]))) {
    const density = (d.brigades / Math.max(1, d.edges)).toFixed(2);
    console.log(c.padEnd(30) + ' ' + d.brigades + ' brig / ' + d.edges + ' edges = ' + density + ' density  (' + d.sectors + ' sectors, ' + d.empty + ' empty)');
}
