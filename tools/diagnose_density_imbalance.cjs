/**
 * Diagnostic script: Density imbalance analysis for REAL_WAR_MASTER #15
 * Reads latest_run_final_save.json and reports per-corps sector density,
 * idle brigades, and connected component analysis.
 *
 * Usage: node tools/diagnose_density_imbalance.cjs
 */

const fs = require('fs');
const path = require('path');

const SAVE_PATH = path.join(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const state = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf-8'));

const formations = state.military?.formations || {};
const sectors = state.military?.corps_front_sectors || {};

// ── Collect all brigade IDs assigned to any sector ──
const assignedSet = new Set();
const reserveSet = new Set();
for (const s of Object.values(sectors)) {
    for (const bid of (s.assigned_brigade_ids || [])) assignedSet.add(bid);
    for (const bid of (s.reserve_brigade_ids || [])) reserveSet.add(bid);
}

// ── Group sectors by corps ──
const sectorsByCorps = {};
for (const s of Object.values(sectors)) {
    const cid = s.corps_id;
    if (!sectorsByCorps[cid]) sectorsByCorps[cid] = [];
    sectorsByCorps[cid].push(s);
}

// ── All active brigades ──
const allBrigades = Object.values(formations).filter(f =>
    f.kind === 'brigade' && f.status === 'active'
);

// ── Report per-corps ──
const corpsIds = Object.keys(sectorsByCorps).sort();

for (const corpsId of corpsIds) {
    const corpsSectors = sectorsByCorps[corpsId];
    corpsSectors.sort((a, b) => a.sector_id.localeCompare(b.sector_id));

    const faction = corpsSectors[0]?.faction || '?';
    console.log(`\n${'='.repeat(80)}`);
    console.log(`CORPS: ${corpsId}  (${faction})  — ${corpsSectors.length} sectors`);
    console.log(`${'='.repeat(80)}`);
    console.log(
        'Sector'.padEnd(40),
        'Edges'.padStart(6),
        'Assign'.padStart(7),
        'Resrv'.padStart(6),
        'Density'.padStart(8),
        'Threat'.padStart(8),
        'Stance'.padStart(12),
        'DefPwr'.padStart(8)
    );
    console.log('-'.repeat(95));

    let minDensity = Infinity, maxDensity = 0;
    let thinUnderThreat = [];

    for (const s of corpsSectors) {
        const edges = s.length_edges || 0;
        const assigned = (s.assigned_brigade_ids || []).length;
        const reserves = (s.reserve_brigade_ids || []).length;
        const density = edges > 0 ? assigned / edges : 0;
        const threat = s.threat_ratio ?? 0;

        if (density > 0 && density < minDensity) minDensity = density;
        if (density > maxDensity) maxDensity = density;

        const flag = (density < 0.1 && threat > 50) ? ' *** THIN+THREAT ***' : '';

        if (density < 0.1 && threat > 50) {
            thinUnderThreat.push({ sector: s.sector_id, density, threat, edges, assigned });
        }

        console.log(
            s.sector_id.padEnd(40),
            String(edges).padStart(6),
            String(assigned).padStart(7),
            String(reserves).padStart(6),
            density.toFixed(3).padStart(8),
            threat.toFixed(0).padStart(8),
            (s.sector_stance || 'n/a').padStart(12),
            (s.defensive_power || 0).toFixed(0).padStart(8),
            flag
        );
    }

    if (maxDensity > 0 && minDensity < Infinity) {
        console.log(`  Density ratio (max/min): ${(maxDensity / minDensity).toFixed(1)}x  (min=${minDensity.toFixed(4)}, max=${maxDensity.toFixed(4)})`);
    }

    if (thinUnderThreat.length > 0) {
        console.log(`  ** ${thinUnderThreat.length} sector(s) thin + under threat:`);
        for (const t of thinUnderThreat) {
            console.log(`     ${t.sector} — density ${t.density.toFixed(4)}, threat ${t.threat.toFixed(0)}, ${t.edges} edges, ${t.assigned} brigades`);
        }
    }

    // Sectors with exactly 1 brigade (rescued by ensureMinimumSectorCoverage?)
    const rescuedCandidates = corpsSectors.filter(s => (s.assigned_brigade_ids || []).length === 1);
    if (rescuedCandidates.length > 0) {
        console.log(`  ** ${rescuedCandidates.length} sector(s) with exactly 1 brigade (possible rescue):`);
        for (const s of rescuedCandidates) {
            console.log(`     ${s.sector_id} — ${s.length_edges} edges, threat ${(s.threat_ratio || 0).toFixed(0)}`);
        }
    }
}

// ── Unassigned brigades ──
console.log(`\n${'='.repeat(80)}`);
console.log('UNASSIGNED BRIGADES (not in any sector assigned or reserve list)');
console.log(`${'='.repeat(80)}`);

const EXEMPT_CORPS = new Set(['arbih_general_staff', 'vrs_main_staff', 'hvo_main_staff']);

const unassigned = allBrigades.filter(f => {
    if (EXEMPT_CORPS.has(f.corps_id)) return false;
    return !assignedSet.has(f.id) && !reserveSet.has(f.id);
});

console.log(`Total active brigades: ${allBrigades.length}`);
console.log(`Assigned to sectors: ${assignedSet.size}`);
console.log(`In sector reserves: ${reserveSet.size}`);
console.log(`Unassigned (non-exempt): ${unassigned.length}`);

if (unassigned.length > 0) {
    // Group by corps
    const unassignedByCorps = {};
    for (const f of unassigned) {
        const cid = f.corps_id || 'NO_CORPS';
        if (!unassignedByCorps[cid]) unassignedByCorps[cid] = [];
        unassignedByCorps[cid].push(f);
    }
    for (const cid of Object.keys(unassignedByCorps).sort()) {
        console.log(`\n  ${cid}:`);
        for (const f of unassignedByCorps[cid].sort((a, b) => (b.personnel || 0) - (a.personnel || 0))) {
            console.log(`    ${f.id.padEnd(45)} loc=${(f.location_osid || 'none').padEnd(40)} home=${(f.home_osid || 'none').padEnd(40)} pers=${f.personnel || 0}`);
        }
    }
}

// ── Deep dive: vrs_1st_krajina ──
console.log(`\n${'='.repeat(80)}`);
console.log('DEEP DIVE: vrs_1st_krajina');
console.log(`${'='.repeat(80)}`);

const krajinaSectors = sectorsByCorps['vrs_1st_krajina'] || [];
const krajinaBrigades = allBrigades.filter(f => f.corps_id === 'vrs_1st_krajina');

console.log(`Total brigades in corps: ${krajinaBrigades.length}`);
console.log(`Total sectors: ${krajinaSectors.length}`);

// Brigade location analysis
const brigadeLocations = {};
for (const f of krajinaBrigades) {
    const loc = f.location_osid || 'NONE';
    const mun = loc.split(':')[1] || 'unknown';
    if (!brigadeLocations[mun]) brigadeLocations[mun] = [];
    brigadeLocations[mun].push(f);
}

console.log('\nBrigade locations by municipality:');
for (const [mun, brs] of Object.entries(brigadeLocations).sort((a, b) => b[1].length - a[1].length)) {
    const inSector = brs.filter(f => assignedSet.has(f.id) || reserveSet.has(f.id));
    const notInSector = brs.filter(f => !assignedSet.has(f.id) && !reserveSet.has(f.id));
    console.log(`  ${mun}: ${brs.length} brigades (${inSector.length} in sector, ${notInSector.length} unassigned)`);
    for (const f of brs) {
        const status = assignedSet.has(f.id) ? 'ASSIGNED' : reserveSet.has(f.id) ? 'RESERVE' : 'IDLE';
        console.log(`    ${status.padEnd(10)} ${f.id.padEnd(40)} pers=${(f.personnel || 0).toString().padStart(5)} posture=${f.posture || 'n/a'}`);
    }
}

// Which sectors have Posavina / Banja Luka area OSIDs?
console.log('\nSector territory analysis (looking for Banja Luka / Posavina coverage):');
const banjaLukaMuns = ['banja_luka', 'laktasi', 'celinac', 'kotor_varos', 'prnjavor', 'srbac', 'gradiska'];
const posavinaMuns = ['brod', 'derventa', 'odzak', 'samac', 'modrica', 'orasje', 'doboj'];

for (const s of krajinaSectors) {
    const territory = s.territory_osids || [];
    const blCount = territory.filter(o => banjaLukaMuns.some(m => o.includes(`:${m}:`))).length;
    const posCount = territory.filter(o => posavinaMuns.some(m => o.includes(`:${m}:`))).length;

    if (blCount > 0 || posCount > 0) {
        console.log(`  ${s.sector_id}: ${(s.assigned_brigade_ids || []).length} assigned, ${s.length_edges} edges, density ${s.density?.toFixed(3) || 'n/a'}`);
        if (blCount > 0) console.log(`    Banja Luka area OSIDs: ${blCount}`);
        if (posCount > 0) console.log(`    Posavina area OSIDs: ${posCount}`);
    }
}

// Connected component analysis
// Build simple connectivity from sector territory_osids
console.log('\nConnected component analysis (via territory OSID overlap):');
// For each 1KK sector, check if territory overlaps with other sectors
const allTerritoryByComponent = new Map();
for (const s of krajinaSectors) {
    const terr = new Set(s.territory_osids || []);
    allTerritoryByComponent.set(s.sector_id, terr);
}

// Check if Banja Luka-area brigades share territory with Posavina sectors
const blBrigades = krajinaBrigades.filter(f => {
    const loc = f.location_osid || '';
    return banjaLukaMuns.some(m => loc.includes(`:${m}:`));
});

console.log(`\nBanja Luka area brigades: ${blBrigades.length}`);
for (const f of blBrigades) {
    const inSector = assignedSet.has(f.id) ? 'ASSIGNED' : reserveSet.has(f.id) ? 'RESERVE' : 'IDLE';
    // Find which sector this brigade is in
    let sectorName = 'NONE';
    for (const s of krajinaSectors) {
        if ((s.assigned_brigade_ids || []).includes(f.id) || (s.reserve_brigade_ids || []).includes(f.id)) {
            sectorName = s.sector_id;
            break;
        }
    }
    console.log(`  ${inSector.padEnd(10)} ${f.id.padEnd(40)} sector=${sectorName.padEnd(35)} pers=${f.personnel || 0}`);
}

const posBrigades = krajinaBrigades.filter(f => {
    const loc = f.location_osid || '';
    return posavinaMuns.some(m => loc.includes(`:${m}:`));
});

console.log(`\nPosavina area brigades: ${posBrigades.length}`);
for (const f of posBrigades) {
    const inSector = assignedSet.has(f.id) ? 'ASSIGNED' : reserveSet.has(f.id) ? 'RESERVE' : 'IDLE';
    let sectorName = 'NONE';
    for (const s of krajinaSectors) {
        if ((s.assigned_brigade_ids || []).includes(f.id) || (s.reserve_brigade_ids || []).includes(f.id)) {
            sectorName = s.sector_id;
            break;
        }
    }
    console.log(`  ${inSector.padEnd(10)} ${f.id.padEnd(40)} sector=${sectorName.padEnd(35)} pers=${f.personnel || 0}`);
}

// Summary stats
console.log(`\n${'='.repeat(80)}`);
console.log('SUMMARY');
console.log(`${'='.repeat(80)}`);

// Per-faction summary
const factions = ['RS', 'RBiH', 'HRHB'];
for (const fac of factions) {
    const facBrigades = allBrigades.filter(f => f.faction === fac);
    const facAssigned = facBrigades.filter(f => assignedSet.has(f.id));
    const facReserve = facBrigades.filter(f => reserveSet.has(f.id));
    const facIdle = facBrigades.filter(f => !assignedSet.has(f.id) && !reserveSet.has(f.id) && !EXEMPT_CORPS.has(f.corps_id));
    console.log(`${fac}: ${facBrigades.length} total, ${facAssigned.length} assigned, ${facReserve.length} reserve, ${facIdle.length} idle`);
}

// Density ratios per corps
console.log('\nDensity ratios by corps:');
for (const corpsId of corpsIds) {
    const cs = sectorsByCorps[corpsId];
    const densities = cs.map(s => {
        const edges = s.length_edges || 1;
        const assigned = (s.assigned_brigade_ids || []).length;
        return assigned / edges;
    }).filter(d => d > 0);

    if (densities.length >= 2) {
        const min = Math.min(...densities);
        const max = Math.max(...densities);
        const ratio = max / min;
        if (ratio > 3) {
            console.log(`  ${corpsId}: ${ratio.toFixed(1)}x ratio (min=${min.toFixed(4)}, max=${max.toFixed(4)}) *** HIGH ***`);
        } else {
            console.log(`  ${corpsId}: ${ratio.toFixed(1)}x ratio`);
        }
    } else {
        console.log(`  ${corpsId}: ${densities.length} sector(s) with brigades`);
    }
}
