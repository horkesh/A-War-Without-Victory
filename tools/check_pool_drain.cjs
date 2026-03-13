const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const pools = save.military.militia_pools;
const w0ids = new Set(Object.keys(save.military.formations));

// For Goražde and Srebrenica — how did all brigades spawn from tiny pools?
const testMuns = ['gorazde', 'srebrenica', 'gradacac', 'centar_sarajevo', 'tuzla'];
for (const mun of testMuns) {
    console.log(`\n=== ${mun} ===`);
    const poolRbih = pools[mun + ':RBiH'];
    if (poolRbih) {
        console.log('Pool RBiH:', JSON.stringify(poolRbih));
        console.log('Pool total (avail+committed):', poolRbih.available + poolRbih.committed);
    }

    const brigades = oob.filter(b => b.home_mun === mun && b.faction === 'RBiH');
    let totalCost = 0;
    for (const b of brigades.sort((a, b) => (a.priority || 50) - (b.priority || 50) || a.id.localeCompare(b.id))) {
        const spawned = w0ids.has(b.id);
        console.log(`  ${spawned ? '✓' : '✗'} ${b.id} initial_pers=${b.initial_personnel} manpower_cost=${b.manpower_cost || 800} priority=${b.priority || 50}`);
        totalCost += b.manpower_cost || 800;
    }
    console.log(`Total manpower_cost: ${totalCost}`);
}

// Key question: does initial_save reflect state BEFORE or AFTER recruitment?
// Check by looking at a formation we know spawned
const f213 = save.military.formations['arbih_213th_vitezka_mountain'];
if (f213) {
    console.log('\n=== Formation state check ===');
    console.log('213th personnel at initial_save:', f213.personnel, '(OOB says 550)');
}
const f801 = save.military.formations['arbih_801st_light'];
if (f801) {
    console.log('801st (Goražde) personnel at initial_save:', f801.personnel, '(OOB says 1100)');
}
