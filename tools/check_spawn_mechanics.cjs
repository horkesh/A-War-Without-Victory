const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const pools = save.military.militia_pools;
const w0ids = new Set(Object.keys(save.military.formations));

// For every municipality, check: how many brigades want to spawn vs pool size
const munData = {};
for (const b of oob) {
    if (!b.home_mun) continue;
    const key = b.home_mun + ':' + b.faction;
    if (!munData[key]) munData[key] = { mun: b.home_mun, faction: b.faction, brigades: [], spawned: 0, notSpawned: 0 };
    const spawned = w0ids.has(b.id);
    munData[key].brigades.push({ id: b.id, spawned, cost: 800, pers: b.initial_personnel });
    if (spawned) munData[key].spawned++;
    else munData[key].notSpawned++;
}

// Add pool info
for (const [key, data] of Object.entries(munData)) {
    const poolKey = data.mun + ':' + data.faction;
    const pool = pools[poolKey];
    data.poolTotal = pool ? pool.available + pool.committed : 0;
    data.poolAvailable = pool ? pool.available : 0;
    data.poolCommitted = pool ? pool.committed : 0;
    data.totalCost = data.brigades.length * 800;
    data.deficit = data.totalCost - data.poolTotal;
    data.spawnRate = data.brigades.length > 0 ? data.spawned / data.brigades.length : 0;
}

// Sort by deficit (worst first)
const sorted = Object.values(munData)
    .filter(d => d.brigades.length > 0)
    .sort((a, b) => b.deficit - a.deficit);

console.log('=== Municipalities with spawn deficits (pool < total brigade cost) ===\n');
console.log('Mun:Faction | Brigades | Spawned | Pool Total | Total Cost | Deficit | Spawn%');
console.log('-'.repeat(90));
for (const d of sorted.filter(d => d.deficit > 0)) {
    console.log(`${(d.mun + ':' + d.faction).padEnd(30)} | ${String(d.brigades.length).padStart(8)} | ${String(d.spawned).padStart(7)} | ${String(d.poolTotal).padStart(10)} | ${String(d.totalCost).padStart(10)} | ${String(d.deficit).padStart(7)} | ${(d.spawnRate * 100).toFixed(0)}%`);
}

console.log('\n=== Summary by faction ===\n');
const factionSummary = {};
for (const d of Object.values(munData)) {
    if (!factionSummary[d.faction]) factionSummary[d.faction] = { total: 0, spawned: 0, deficit_muns: 0, total_deficit: 0 };
    factionSummary[d.faction].total += d.brigades.length;
    factionSummary[d.faction].spawned += d.spawned;
    if (d.deficit > 0) {
        factionSummary[d.faction].deficit_muns++;
        factionSummary[d.faction].total_deficit += d.deficit;
    }
}
for (const [f, s] of Object.entries(factionSummary).sort((a,b) => a[0].localeCompare(b[0]))) {
    console.log(`${f}: ${s.spawned}/${s.total} spawned (${(100*s.spawned/s.total).toFixed(0)}%), ${s.deficit_muns} muns with deficit, total deficit: ${s.total_deficit}`);
}

// Check: what's the average brigades-per-mun by faction?
console.log('\n=== Brigades per municipality by faction ===\n');
const bpmByFaction = {};
for (const d of Object.values(munData)) {
    if (!bpmByFaction[d.faction]) bpmByFaction[d.faction] = [];
    bpmByFaction[d.faction].push(d.brigades.length);
}
for (const [f, counts] of Object.entries(bpmByFaction).sort((a,b) => a[0].localeCompare(b[0]))) {
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const max = Math.max(...counts);
    console.log(`${f}: avg ${avg.toFixed(1)} brigades/mun, max ${max}, muns with >1: ${counts.filter(c => c > 1).length}/${counts.length}`);
}

// Show the worst offenders — muns where multiple RBiH brigades compete for small pools
console.log('\n=== RBiH municipalities with multiple brigades ===\n');
const rbihMulti = Object.values(munData)
    .filter(d => d.faction === 'RBiH' && d.brigades.length > 1)
    .sort((a, b) => b.brigades.length - a.brigades.length);
for (const d of rbihMulti) {
    console.log(`${d.mun}: ${d.brigades.length} brigades, pool=${d.poolTotal}, cost=${d.totalCost}, spawned=${d.spawned}/${d.brigades.length}`);
    for (const b of d.brigades) {
        console.log(`  ${b.spawned ? '✓' : '✗'} ${b.id} (${b.pers} pers)`);
    }
}

// Same for RS
console.log('\n=== RS municipalities with multiple brigades ===\n');
const rsMulti = Object.values(munData)
    .filter(d => d.faction === 'RS' && d.brigades.length > 1)
    .sort((a, b) => b.brigades.length - a.brigades.length);
for (const d of rsMulti) {
    console.log(`${d.mun}: ${d.brigades.length} brigades, pool=${d.poolTotal}, cost=${d.totalCost}, spawned=${d.spawned}/${d.brigades.length}`);
    for (const b of d.brigades) {
        console.log(`  ${b.spawned ? '✓' : '✗'} ${b.id} (${b.pers} pers)`);
    }
}
