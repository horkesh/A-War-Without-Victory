const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const pools = save.military.militia_pools;

const MIN_MANDATORY_SPAWN = 100;

// Simulate mandatory recruitment with initial_personnel as pool cost
function simulateRecruitment(useInitialPersonnel) {
    // Reconstruct original pool sizes (available + committed)
    const originalPools = {};
    for (const [k, v] of Object.entries(pools)) {
        originalPools[k] = v.available + v.committed;
    }

    const factions = ['HRHB', 'RBiH', 'RS']; // sorted
    const results = { total: 0, spawned: 0, skipped_manpower: 0, byFaction: {} };

    for (const faction of factions) {
        const factionBrigades = oob.filter(b => b.faction === faction && b.mandatory !== false);
        // Sort by priority then id (same as engine)
        factionBrigades.sort((a, b) => ((a.priority || 50) - (b.priority || 50)) || a.id.localeCompare(b.id));

        let spawned = 0, skipped = 0;
        const simPools = { ...originalPools }; // shallow copy is fine for numbers

        for (const brigade of factionBrigades) {
            const poolKey = brigade.home_mun + ':' + faction;
            const poolAvail = simPools[poolKey] || 0;

            // Determine cost
            const cost = useInitialPersonnel
                ? (brigade.initial_personnel || 800)  // Use initial_personnel as pool drain
                : (brigade.manpower_cost || 800);     // Current: use manpower_cost

            const effectiveManpower = Math.min(cost, poolAvail);
            if (effectiveManpower < MIN_MANDATORY_SPAWN && poolAvail < cost) {
                skipped++;
                continue;
            }

            // Spawn
            simPools[poolKey] = poolAvail - effectiveManpower;
            spawned++;
        }

        results.byFaction[faction] = { total: factionBrigades.length, spawned, skipped };
        results.total += factionBrigades.length;
        results.spawned += spawned;
        results.skipped_manpower += skipped;
    }

    return results;
}

console.log('=== CURRENT (manpower_cost=800 default) ===');
const current = simulateRecruitment(false);
console.log(`Total: ${current.spawned}/${current.total} spawned (${(100*current.spawned/current.total).toFixed(0)}%), ${current.skipped_manpower} skipped for manpower`);
for (const [f, d] of Object.entries(current.byFaction)) {
    console.log(`  ${f}: ${d.spawned}/${d.total} (${(100*d.spawned/d.total).toFixed(0)}%)`);
}

console.log('\n=== FIX: mandatory drain = initial_personnel ===');
const fixed = simulateRecruitment(true);
console.log(`Total: ${fixed.spawned}/${fixed.total} spawned (${(100*fixed.spawned/fixed.total).toFixed(0)}%), ${fixed.skipped_manpower} skipped for manpower`);
for (const [f, d] of Object.entries(fixed.byFaction)) {
    console.log(`  ${f}: ${d.spawned}/${d.total} (${(100*d.spawned/d.total).toFixed(0)}%)`);
}

// Show per-municipality improvement for the worst cases
console.log('\n=== Biggest improvements (RBiH) ===');
const muns = {};
for (const b of oob.filter(x => x.faction === 'RBiH' && x.mandatory !== false)) {
    if (!muns[b.home_mun]) muns[b.home_mun] = { brigades: [], pool: 0 };
    muns[b.home_mun].brigades.push(b);
}
for (const [mun, data] of Object.entries(muns)) {
    const poolKey = mun + ':RBiH';
    data.pool = (pools[poolKey]?.available || 0) + (pools[poolKey]?.committed || 0);
}

// Simulate each mun
for (const [mun, data] of Object.entries(muns).sort((a,b) => b[1].brigades.length - a[1].brigades.length)) {
    if (data.brigades.length < 2) continue;
    let poolOld = data.pool, poolNew = data.pool;
    let spawnedOld = 0, spawnedNew = 0;
    const sortedBrigades = data.brigades.sort((a, b) => ((a.priority||50) - (b.priority||50)) || a.id.localeCompare(b.id));
    for (const b of sortedBrigades) {
        const costOld = b.manpower_cost || 800;
        const costNew = b.initial_personnel || 800;
        // Old
        const effOld = Math.min(costOld, poolOld);
        if (effOld >= MIN_MANDATORY_SPAWN || poolOld >= costOld) { spawnedOld++; poolOld -= effOld; }
        // New
        const effNew = Math.min(costNew, poolNew);
        if (effNew >= MIN_MANDATORY_SPAWN || poolNew >= costNew) { spawnedNew++; poolNew -= effNew; }
    }
    if (spawnedNew > spawnedOld) {
        console.log(`  ${mun}: ${spawnedOld}→${spawnedNew}/${data.brigades.length} (pool=${data.pool})`);
    }
}
