const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const pools = save.military.militia_pools;

const MIN_MANDATORY_SPAWN = 100;

function simulateRecruitment(mode) {
    const originalPools = {};
    for (const [k, v] of Object.entries(pools)) {
        originalPools[k] = v.available + v.committed;
    }

    const factions = ['HRHB', 'RBiH', 'RS'];
    const results = { total: 0, spawned: 0, skipped_manpower: 0, byFaction: {} };

    for (const faction of factions) {
        const factionBrigades = oob.filter(b => b.faction === faction && b.mandatory !== false);
        factionBrigades.sort((a, b) => ((a.priority || 50) - (b.priority || 50)) || a.id.localeCompare(b.id));

        let spawned = 0, skipped = 0;
        const simPools = { ...originalPools };

        for (const brigade of factionBrigades) {
            // Handle recruit_pool_faction
            const preferredFaction = brigade.recruit_pool_faction || faction;
            let poolKey = brigade.home_mun + ':' + preferredFaction;
            let poolAvail = simPools[poolKey] || 0;
            if (poolAvail <= 0 && preferredFaction !== faction) {
                poolKey = brigade.home_mun + ':' + faction;
                poolAvail = simPools[poolKey] || 0;
            }

            let cost;
            switch (mode) {
                case 'current':
                    cost = brigade.manpower_cost || 800;
                    break;
                case 'min_cost_pers':
                    // Fix: drain = min(manpower_cost, initial_personnel)
                    cost = Math.min(brigade.manpower_cost || 800, brigade.initial_personnel || 800);
                    break;
                case 'initial_pers':
                    // Drain = initial_personnel only
                    cost = brigade.initial_personnel || 800;
                    break;
            }

            const effectiveManpower = Math.min(cost, poolAvail);
            if (effectiveManpower < MIN_MANDATORY_SPAWN && poolAvail < cost) {
                skipped++;
                continue;
            }

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

for (const mode of ['current', 'min_cost_pers', 'initial_pers']) {
    console.log(`\n=== ${mode} ===`);
    const r = simulateRecruitment(mode);
    console.log(`Total: ${r.spawned}/${r.total} (${(100*r.spawned/r.total).toFixed(0)}%), ${r.skipped_manpower} skipped`);
    for (const [f, d] of Object.entries(r.byFaction)) {
        console.log(`  ${f}: ${d.spawned}/${d.total} (${(100*d.spawned/d.total).toFixed(0)}%)`);
    }
}

// Per-mun comparison for key areas
console.log('\n=== Per-municipality comparison (brigades≥2) ===');
console.log('Municipality'.padEnd(25), 'Pool'.padStart(6), 'Current'.padStart(10), 'min(c,p)'.padStart(10), 'init_p'.padStart(10));

function simMun(mun, faction, mode) {
    const poolKey = mun + ':' + faction;
    let pool = (pools[poolKey]?.available || 0) + (pools[poolKey]?.committed || 0);
    const brigades = oob.filter(b => b.home_mun === mun && b.faction === faction && b.mandatory !== false)
        .sort((a, b) => ((a.priority||50) - (b.priority||50)) || a.id.localeCompare(b.id));
    let spawned = 0;
    for (const b of brigades) {
        let cost;
        switch (mode) {
            case 'current': cost = b.manpower_cost || 800; break;
            case 'min_cost_pers': cost = Math.min(b.manpower_cost || 800, b.initial_personnel || 800); break;
            case 'initial_pers': cost = b.initial_personnel || 800; break;
        }
        const eff = Math.min(cost, pool);
        if (eff >= MIN_MANDATORY_SPAWN || pool >= cost) { spawned++; pool -= eff; }
    }
    return `${spawned}/${brigades.length}`;
}

const munFactions = {};
for (const b of oob) {
    if (b.mandatory === false) continue;
    const key = b.home_mun + ':' + b.faction;
    if (!munFactions[key]) munFactions[key] = { mun: b.home_mun, faction: b.faction, count: 0 };
    munFactions[key].count++;
}

for (const [key, data] of Object.entries(munFactions).sort((a, b) => b[1].count - a[1].count)) {
    if (data.count < 2) continue;
    const poolKey = data.mun + ':' + data.faction;
    const poolTotal = (pools[poolKey]?.available || 0) + (pools[poolKey]?.committed || 0);
    const c = simMun(data.mun, data.faction, 'current');
    const m = simMun(data.mun, data.faction, 'min_cost_pers');
    const i = simMun(data.mun, data.faction, 'initial_pers');
    const changed = c !== m;
    if (changed) {
        console.log(`${(data.mun + ':' + data.faction).padEnd(25)} ${String(poolTotal).padStart(6)} ${c.padStart(10)} ${m.padStart(10)} ${i.padStart(10)}`);
    }
}
