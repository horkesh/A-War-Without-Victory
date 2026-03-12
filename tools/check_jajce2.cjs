const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const state = save.state || save;
const mil = state.military || state;
const pc = state.political.political_controllers || {};
const sectors = mil.corps_front_sectors || {};

// Collect ALL 1KK sector enemy_osids
const sectorEnemyMap = {};
for (const [sid, sec] of Object.entries(sectors)) {
    if (!sid.includes('vrs_1st_krajina')) continue;
    const enemies = [];
    for (const ss of (sec.sub_segments || [])) {
        for (const eo of (ss.enemy_osids || [])) enemies.push(eo);
    }
    sectorEnemyMap[sid] = enemies;
}

// ALL VRS strategies that apply to 1KK
const strategies = [
    { name: 'Corridor 92 (1KK)', muns: ['brcko', 'odzak', 'derventa', 'bosanski_brod', 'bosanski_samac', 'modrica', 'doboj'], w: '0-25' },
    { name: 'Krajina Sweep', muns: ['kljuc', 'bosanski_petrovac', 'jajce', 'donji_vakuf', 'sipovo', 'sanski_most'], w: '12-30' },
    { name: 'Central Corridor', muns: ['kotor_varos', 'teslic', 'doboj'], w: '0-20' },
];

// For each strategy, find target OSIDs and their sector overlap
for (const strat of strategies) {
    const munSet = new Set(strat.muns);
    const targets = [];
    for (const osid of Object.keys(pc).sort()) {
        const m = osid.match(/^op:([^:]+):/);
        if (m && munSet.has(m[1]) && pc[osid] !== 'RS') {
            targets.push(osid);
        }
    }

    // Check overlap per sector
    console.log(`\n=== ${strat.name} (w${strat.w}) — ${targets.length} enemy targets ===`);
    for (const [sid, enemies] of Object.entries(sectorEnemyMap)) {
        const enemySet = new Set(enemies);
        const overlap = targets.filter(t => enemySet.has(t));
        if (overlap.length > 0) {
            console.log(`  ${sid}: ${overlap.length} overlap — ${overlap.join(', ')}`);
        }
    }
}

// Show the total target overlap per sector (which sector would be priority)
console.log('\n=== Total target overlap per 1KK sector ===');
const allTargetOsids = new Set();
for (const strat of strategies) {
    const munSet = new Set(strat.muns);
    for (const osid of Object.keys(pc).sort()) {
        const m = osid.match(/^op:([^:]+):/);
        if (m && munSet.has(m[1]) && pc[osid] !== 'RS') {
            allTargetOsids.add(osid);
        }
    }
}

const sectorOverlaps = [];
for (const [sid, enemies] of Object.entries(sectorEnemyMap)) {
    const enemySet = new Set(enemies);
    const overlap = [...allTargetOsids].filter(t => enemySet.has(t));
    if (overlap.length > 0) {
        sectorOverlaps.push({ sid, overlap: overlap.length, details: overlap });
    }
}
sectorOverlaps.sort((a, b) => b.overlap - a.overlap);
for (const s of sectorOverlaps) {
    const sec = sectors[s.sid];
    console.log(`${s.sid}: ${s.overlap} targets, ${(sec.assigned_brigade_ids||[]).length} brigades, opposing: ${sec.opposing_factions}`);
    console.log(`  targets: ${s.details.join(', ')}`);
}
