const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const pools = save.military.militia_pools;

// Which RS brigades are hurt by switching to initial_personnel drain?
// i.e., which RS municipalities can afford cost=800 but not cost=1000?
const rsBrigades = oob.filter(b => b.faction === 'RS' && b.mandatory !== false)
    .sort((a, b) => ((a.priority || 50) - (b.priority || 50)) || a.id.localeCompare(b.id));

// Group by municipality
const rsMuns = {};
for (const b of rsBrigades) {
    if (!rsMuns[b.home_mun]) rsMuns[b.home_mun] = [];
    rsMuns[b.home_mun].push(b);
}

console.log('=== RS municipalities where initial_pers drain changes outcome ===\n');

for (const [mun, brigades] of Object.entries(rsMuns).sort((a, b) => b[1].length - a[1].length)) {
    const poolKey = mun + ':RS';
    const poolTotal = (pools[poolKey]?.available || 0) + (pools[poolKey]?.committed || 0);

    // Simulate both modes
    let poolOld = poolTotal, poolNew = poolTotal;
    let spawnOld = 0, spawnNew = 0;
    const details = [];

    for (const b of brigades) {
        const costOld = b.manpower_cost || 800;
        const costNew = b.initial_personnel || 800;

        const effOld = Math.min(costOld, poolOld);
        const okOld = effOld >= 100 || poolOld >= costOld;
        if (okOld) { spawnOld++; poolOld -= effOld; }

        const effNew = Math.min(costNew, poolNew);
        const okNew = effNew >= 100 || poolNew >= costNew;
        if (okNew) { spawnNew++; poolNew -= effNew; }

        if (okOld !== okNew) {
            details.push(`  ${okOld ? '✓→✗' : '✗→✓'} ${b.id} cost=${costOld}→${costNew} pers=${b.initial_personnel}`);
        }
    }

    if (spawnOld !== spawnNew) {
        console.log(`${mun}: pool=${poolTotal}, ${spawnOld}→${spawnNew}/${brigades.length}`);
        for (const d of details) console.log(d);
    }
}

// Now show the RBiH improvements
console.log('\n=== RBiH municipalities where initial_pers drain changes outcome ===\n');
const rbihBrigades = oob.filter(b => b.faction === 'RBiH' && b.mandatory !== false)
    .sort((a, b) => ((a.priority || 50) - (b.priority || 50)) || a.id.localeCompare(b.id));
const rbihMuns = {};
for (const b of rbihBrigades) {
    if (!rbihMuns[b.home_mun]) rbihMuns[b.home_mun] = [];
    rbihMuns[b.home_mun].push(b);
}

for (const [mun, brigades] of Object.entries(rbihMuns).sort((a, b) => b[1].length - a[1].length)) {
    const poolKey = mun + ':RBiH';
    const poolTotal = (pools[poolKey]?.available || 0) + (pools[poolKey]?.committed || 0);

    let poolOld = poolTotal, poolNew = poolTotal;
    let spawnOld = 0, spawnNew = 0;

    for (const b of brigades) {
        const costOld = b.manpower_cost || 800;
        const costNew = b.initial_personnel || 800;

        const effOld = Math.min(costOld, poolOld);
        const okOld = effOld >= 100 || poolOld >= costOld;
        if (okOld) { spawnOld++; poolOld -= effOld; }

        const effNew = Math.min(costNew, poolNew);
        const okNew = effNew >= 100 || poolNew >= costNew;
        if (okNew) { spawnNew++; poolNew -= effNew; }
    }

    if (spawnNew > spawnOld) {
        console.log(`${mun}: pool=${poolTotal}, ${spawnOld}→${spawnNew}/${brigades.length}`);
    }
}

// Summary: what's the net effect?
console.log('\n=== Net effect of initial_pers drain ===');
let rbihGain = 0, rsLoss = 0, hrhbGain = 0;
// (recount properly)
function countSpawns(faction, mode) {
    const fBrigades = oob.filter(b => b.faction === faction && b.mandatory !== false)
        .sort((a, b) => ((a.priority || 50) - (b.priority || 50)) || a.id.localeCompare(b.id));
    const simPools = {};
    for (const [k, v] of Object.entries(pools)) simPools[k] = v.available + v.committed;
    let spawned = 0;
    for (const b of fBrigades) {
        const pk = b.home_mun + ':' + faction;
        const avail = simPools[pk] || 0;
        const cost = mode === 'old' ? (b.manpower_cost || 800) : (b.initial_personnel || 800);
        const eff = Math.min(cost, avail);
        if (eff >= 100 || avail >= cost) { spawned++; simPools[pk] = avail - eff; }
    }
    return spawned;
}

for (const f of ['RBiH', 'RS', 'HRHB']) {
    const old = countSpawns(f, 'old');
    const nw = countSpawns(f, 'new');
    console.log(`${f}: ${old}→${nw} (${nw > old ? '+' : ''}${nw - old})`);
}
