/**
 * Diagnostic: check brigade displacement from home/sector.
 * For each active brigade, compute BFS hop distance from current location
 * to (a) home_osid and (b) assigned sector's friendly OSIDs.
 * Flag brigades far from both.
 */

const fs = require('fs');
const path = require('path');

// Load save
const savePath = path.resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));

// Load contact graph for adjacency
const graphPath = path.resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_contact_graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

// Build adjacency map
const adjacency = new Map();
for (const node of graph.nodes) {
    adjacency.set(node.id, []);
}
for (const edge of graph.edges) {
    const src = edge.a ?? edge.source ?? edge.from;
    const tgt = edge.b ?? edge.target ?? edge.to;
    if (!adjacency.has(src)) adjacency.set(src, []);
    if (!adjacency.has(tgt)) adjacency.set(tgt, []);
    adjacency.get(src).push(tgt);
    adjacency.get(tgt).push(src);
}

// Political controllers for friendly territory
const pc = (save.political && save.political.political_controllers) || save.political_controllers || {};

// BFS distance between two OSIDs (through friendly territory only)
function bfsDistance(startOsid, targetOsids, faction) {
    if (!startOsid) return Infinity;
    const targetSet = new Set(targetOsids);
    if (targetSet.has(startOsid)) return 0;

    const visited = new Set();
    const queue = [[startOsid, 0]];
    visited.add(startOsid);

    while (queue.length > 0) {
        const [current, dist] = queue.shift();
        const neighbors = adjacency.get(current) || [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            if (targetSet.has(n)) return dist + 1;
            // Only traverse through friendly territory
            const ctrl = pc[n];
            if (ctrl === faction) {
                queue.push([n, dist + 1]);
            }
        }
    }
    return Infinity;
}

// BFS distance ignoring faction (raw graph distance)
function bfsDistanceRaw(startOsid, targetOsid) {
    if (!startOsid || !targetOsid) return Infinity;
    if (startOsid === targetOsid) return 0;

    const visited = new Set();
    const queue = [[startOsid, 0]];
    visited.add(startOsid);

    while (queue.length > 0) {
        const [current, dist] = queue.shift();
        const neighbors = adjacency.get(current) || [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            if (n === targetOsid) return dist + 1;
            queue.push([n, dist + 1]);
        }
    }
    return Infinity;
}

const formations = (save.military && save.military.formations) || save.formations || {};
const sectors = (save.military && save.military.corps_front_sectors) || save.corps_front_sectors || {};

// Build brigade → sector map
const brigadeToSector = {};
for (const [sectorId, sector] of Object.entries(sectors)) {
    for (const bid of (sector.assigned_brigade_ids || [])) {
        brigadeToSector[bid] = sectorId;
    }
    for (const bid of (sector.reserve_brigade_ids || [])) {
        brigadeToSector[bid] = sectorId;
    }
}

// Extract municipality from OSID
function munFromOsid(osid) {
    if (!osid) return null;
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : null;
}

// Analyze each faction
for (const factionFilter of ['RBiH', 'RS', 'HRHB']) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FACTION: ${factionFilter}`);
    console.log('='.repeat(80));

    const displaced = [];
    let totalBrigades = 0;

    const sortedIds = Object.keys(formations).sort();
    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f || f.faction !== factionFilter || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        totalBrigades++;

        const loc = f.location_osid;
        const homeOsid = f.home_osid;
        const sectorId = brigadeToSector[fid];
        const sector = sectorId ? sectors[sectorId] : null;

        // Distance from location to home
        const distToHome = bfsDistanceRaw(loc, homeOsid);

        // Distance from location to sector's friendly front OSIDs
        let distToSectorFront = Infinity;
        let sectorFrontOsids = [];
        if (sector) {
            for (const ss of (sector.sub_segments || [])) {
                for (const o of (ss.friendly_osids || [])) {
                    sectorFrontOsids.push(o);
                }
            }
            distToSectorFront = bfsDistance(loc, sectorFrontOsids, factionFilter);
        }

        // Distance from home_osid to sector territory
        let distHomeToSector = Infinity;
        if (sector && homeOsid) {
            const sectorTerritory = sector.territory_osids || [];
            distHomeToSector = bfsDistanceRaw(homeOsid, sectorTerritory.length > 0 ? sectorTerritory[0] : null);
        }

        const homeMun = munFromOsid(homeOsid);
        const locMun = munFromOsid(loc);

        if (distToSectorFront > 5 || distToHome > 8) {
            displaced.push({
                id: fid,
                name: f.name,
                corps: f.corps_id,
                homeMun,
                homeOsid,
                locMun,
                location: loc,
                sectorId: sectorId || '(none)',
                distToHome,
                distToSectorFront,
                distHomeToSector,
            });
        }
    }

    // Sort by distance to sector front descending
    displaced.sort((a, b) => b.distToSectorFront - a.distToSectorFront);

    console.log(`\nTotal active brigades: ${totalBrigades}`);
    console.log(`Displaced (>5 hops from sector front OR >8 hops from home): ${displaced.length}`);

    if (displaced.length > 0) {
        console.log(`\n${'─'.repeat(120)}`);
        console.log(
            'Brigade'.padEnd(40) +
            'Home Mun'.padEnd(18) +
            'Location Mun'.padEnd(18) +
            'Sector'.padEnd(30) +
            'D→Home'.padEnd(8) +
            'D→SecF'.padEnd(8) +
            'Home→Sec'
        );
        console.log('─'.repeat(120));
        for (const d of displaced) {
            const dHome = d.distToHome === Infinity ? '∞' : String(d.distToHome);
            const dSec = d.distToSectorFront === Infinity ? '∞' : String(d.distToSectorFront);
            const dHS = d.distHomeToSector === Infinity ? '∞' : String(d.distHomeToSector);
            console.log(
                `${d.name} (${d.corps || '?'})`.padEnd(40) +
                (d.homeMun || '?').padEnd(18) +
                (d.locMun || '?').padEnd(18) +
                d.sectorId.padEnd(30) +
                dHome.padEnd(8) +
                dSec.padEnd(8) +
                dHS
            );
        }
    }
}

// ── Specific checks ──
console.log('\n' + '='.repeat(80));
console.log('SPECIFIC CHECKS: Gračanica brigades');
console.log('='.repeat(80));

for (const fid of Object.keys(formations).sort()) {
    const f = formations[fid];
    if (!f || f.status !== 'active') continue;
    const homeMun = munFromOsid(f.home_osid);
    if (homeMun === 'gracanica') {
        const locMun = munFromOsid(f.location_osid);
        const sid = brigadeToSector[fid] || '(none)';
        console.log(`  ${f.name} [${f.faction}] home=${f.home_osid} loc=${f.location_osid} (mun: ${homeMun}→${locMun}) sector=${sid}`);
    }
}

console.log('\nSPECIFIC CHECKS: Hadžići brigades');
console.log('='.repeat(80));

for (const fid of Object.keys(formations).sort()) {
    const f = formations[fid];
    if (!f || f.status !== 'active') continue;
    const homeMun = munFromOsid(f.home_osid);
    if (homeMun === 'hadzici') {
        const locMun = munFromOsid(f.location_osid);
        const sid = brigadeToSector[fid] || '(none)';
        console.log(`  ${f.name} [${f.faction}] home=${f.home_osid} loc=${f.location_osid} (mun: ${homeMun}→${locMun}) sector=${sid}`);
    }
}

// ── Sector count summary ──
console.log('\n' + '='.repeat(80));
console.log('SECTOR COUNT SUMMARY');
console.log('='.repeat(80));

const sectorsByFaction = {};
for (const [sid, sec] of Object.entries(sectors)) {
    const f = sec.faction;
    if (!sectorsByFaction[f]) sectorsByFaction[f] = { count: 0, totalBrigades: 0, emptyCount: 0 };
    sectorsByFaction[f].count++;
    sectorsByFaction[f].totalBrigades += (sec.assigned_brigade_ids || []).length + (sec.reserve_brigade_ids || []).length;
    if ((sec.assigned_brigade_ids || []).length === 0) sectorsByFaction[f].emptyCount++;
}

for (const [f, stats] of Object.entries(sectorsByFaction)) {
    console.log(`  ${f}: ${stats.count} sectors, ${stats.totalBrigades} brigades assigned, ${stats.emptyCount} empty sectors`);
    console.log(`    avg brigades/sector: ${(stats.totalBrigades / stats.count).toFixed(1)}`);
}

// ── Phase 2b analysis: brigades not on any front and not matching home ──
console.log('\n' + '='.repeat(80));
console.log('BRIGADES ASSIGNED TO SECTORS FAR FROM HOME (home mun not in sector territory)');
console.log('='.repeat(80));

let mismatchCount = 0;
for (const fid of Object.keys(formations).sort()) {
    const f = formations[fid];
    if (!f || f.status !== 'active') continue;
    if (f.kind !== 'brigade' && f.kind !== 'og') continue;

    const sectorId = brigadeToSector[fid];
    if (!sectorId) continue;
    const sector = sectors[sectorId];
    if (!sector) continue;

    const homeMun = munFromOsid(f.home_osid);
    if (!homeMun) continue;

    // Check if home mun is in sector territory
    const sectorMuns = new Set();
    for (const osid of (sector.territory_osids || [])) {
        const m = munFromOsid(osid);
        if (m) sectorMuns.add(m);
    }

    if (!sectorMuns.has(homeMun)) {
        const locMun = munFromOsid(f.location_osid);
        const distToHome = bfsDistanceRaw(f.location_osid, f.home_osid);
        if (distToHome > 5) {
            mismatchCount++;
            if (mismatchCount <= 30) {
                console.log(`  ${f.name} [${f.faction}/${f.corps_id}] home_mun=${homeMun} loc_mun=${locMun} sector=${sectorId} dist_to_home=${distToHome === Infinity ? '∞' : distToHome}`);
            }
        }
    }
}
console.log(`\nTotal brigades far from home AND in non-home sector: ${mismatchCount}`);
