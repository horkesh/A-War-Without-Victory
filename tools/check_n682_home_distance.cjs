/**
 * check_n682_home_distance.cjs
 *
 * Diagnostic: Brigade-to-home distance analysis from latest run.
 * 1. Loads final save
 * 2. For each active brigade, extracts municipality from home_osid and location_osid
 * 3. Reports home vs away counts
 * 4. Lists top 20 furthest-from-home brigades (by BFS hop distance from home_distance_cache)
 * 5. Checks sector assignment proximity — are brigades near their sector's front edges?
 */

const fs = require('fs');
const path = require('path');

const savePath = path.join(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const data = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const mil = data.military;
const formations = mil.formations || {};
const sectors = mil.corps_front_sectors || {};
const homeDistCache = mil.home_distance_cache || {};

// Extract municipality from OSID format: op:municipality:slug
function munFromOsid(osid) {
    if (!osid) return null;
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : null;
}

// ── 1. Active brigades: home vs away ──
const activeBrigades = [];
for (const [id, f] of Object.entries(formations)) {
    if (f.kind !== 'brigade' || f.status !== 'active' || (f.personnel || 0) <= 0) continue;
    const homeMun = munFromOsid(f.home_osid);
    const locMun = munFromOsid(f.location_osid);
    activeBrigades.push({
        id,
        faction: f.faction,
        corps_id: f.corps_id,
        home_osid: f.home_osid,
        location_osid: f.location_osid,
        homeMun,
        locMun,
        personnel: f.personnel || 0,
        atHome: homeMun === locMun,
        hopDistance: homeDistCache[id] ?? null,
    });
}

console.log('=== BRIGADE HOME DISTANCE ANALYSIS (n682) ===');
console.log(`Active brigades with personnel > 0: ${activeBrigades.length}`);
console.log();

const atHome = activeBrigades.filter(b => b.atHome);
const away = activeBrigades.filter(b => !b.atHome);
console.log(`At home municipality: ${atHome.length} (${(100 * atHome.length / activeBrigades.length).toFixed(1)}%)`);
console.log(`Away from home:       ${away.length} (${(100 * away.length / activeBrigades.length).toFixed(1)}%)`);
console.log();

// ── 2. Breakdown by faction ──
console.log('── By faction ──');
const factions = ['RBiH', 'RS', 'HRHB'];
for (const fac of factions) {
    const facBrigades = activeBrigades.filter(b => b.faction === fac);
    const facHome = facBrigades.filter(b => b.atHome);
    const facAway = facBrigades.filter(b => !b.atHome);
    console.log(`  ${fac}: ${facBrigades.length} active — ${facHome.length} home (${(100 * facHome.length / facBrigades.length).toFixed(0)}%), ${facAway.length} away`);
}
console.log();

// ── 3. Hop distance distribution ──
console.log('── BFS Hop Distance Distribution ──');
const hopBuckets = {};
for (const b of activeBrigades) {
    const d = b.hopDistance ?? 'unknown';
    hopBuckets[d] = (hopBuckets[d] || 0) + 1;
}
const sortedHops = Object.entries(hopBuckets).sort((a, b) => {
    if (a[0] === 'unknown') return 1;
    if (b[0] === 'unknown') return -1;
    return Number(a[0]) - Number(b[0]);
});
for (const [dist, count] of sortedHops) {
    const bar = '#'.repeat(Math.min(count, 60));
    console.log(`  ${String(dist).padStart(3)} hops: ${String(count).padStart(3)} ${bar}`);
}
console.log();

// ── 4. Top 20 furthest from home (by hop distance, then by municipality mismatch) ──
console.log('── Top 20 Furthest From Home (BFS hops) ──');
const sorted = [...activeBrigades]
    .filter(b => b.hopDistance != null && b.hopDistance > 0)
    .sort((a, b) => (b.hopDistance || 0) - (a.hopDistance || 0));

console.log(`${'Brigade'.padEnd(40)} ${'Home Mun'.padEnd(22)} ${'Current Mun'.padEnd(22)} ${'Hops'.padStart(4)}  Corps`);
console.log('-'.repeat(110));
for (const b of sorted.slice(0, 20)) {
    console.log(
        `${b.id.padEnd(40)} ${(b.homeMun || '?').padEnd(22)} ${(b.locMun || '?').padEnd(22)} ${String(b.hopDistance).padStart(4)}  ${b.corps_id}`
    );
}
console.log();

// ── 5. Sector proximity check ──
// For each sector, check if assigned brigades are in the sector's territory_osids
// or at least in the sub_segments' friendly_osids (front edge territory)
console.log('── Sector Assignment Proximity ──');

// Build sector lookup: brigade_id → sector info
const brigadeSectorMap = {};
for (const [sid, sec] of Object.entries(sectors)) {
    const frontOsids = new Set();
    for (const sub of (sec.sub_segments || [])) {
        for (const osid of (sub.friendly_osids || [])) frontOsids.add(osid);
    }
    const territorySet = new Set(sec.territory_osids || []);

    for (const bid of (sec.assigned_brigade_ids || [])) {
        brigadeSectorMap[bid] = {
            sector_id: sec.sector_id,
            corps_id: sec.corps_id,
            frontOsids,
            territorySet,
            totalFrontEdges: sec.length_edges,
        };
    }
}

let inFrontTerritory = 0;
let inSectorTerritory = 0;
let outsideSector = 0;
const outsideList = [];

for (const b of activeBrigades) {
    const sec = brigadeSectorMap[b.id];
    if (!sec) continue; // not assigned to any sector

    const loc = b.location_osid;
    if (sec.frontOsids.has(loc)) {
        inFrontTerritory++;
    } else if (sec.territorySet.has(loc)) {
        inSectorTerritory++;
    } else {
        outsideSector++;
        outsideList.push({
            id: b.id,
            faction: b.faction,
            corps_id: b.corps_id,
            location_osid: b.location_osid,
            sector_id: sec.sector_id,
            hopDistance: b.hopDistance,
        });
    }
}

const totalAssigned = inFrontTerritory + inSectorTerritory + outsideSector;
console.log(`Brigades assigned to sectors: ${totalAssigned}`);
console.log(`  On front-edge OSIDs:   ${inFrontTerritory} (${(100 * inFrontTerritory / totalAssigned).toFixed(1)}%)`);
console.log(`  In sector territory:   ${inSectorTerritory} (${(100 * inSectorTerritory / totalAssigned).toFixed(1)}%)`);
console.log(`  OUTSIDE sector:        ${outsideSector} (${(100 * outsideSector / totalAssigned).toFixed(1)}%)`);
console.log();

if (outsideList.length > 0) {
    console.log('── Brigades OUTSIDE Their Assigned Sector Territory ──');
    console.log(`${'Brigade'.padEnd(40)} ${'Location'.padEnd(35)} ${'Sector'.padEnd(30)} Hops`);
    console.log('-'.repeat(115));
    for (const b of outsideList.slice(0, 20)) {
        console.log(
            `${b.id.padEnd(40)} ${(b.location_osid || '?').padEnd(35)} ${b.sector_id.padEnd(30)} ${b.hopDistance ?? '?'}`
        );
    }
}

// ── 6. Unassigned brigades (not in any sector) ──
const assignedIds = new Set(Object.keys(brigadeSectorMap));
const unassigned = activeBrigades.filter(b => !assignedIds.has(b.id));
console.log();
console.log(`── Unassigned Brigades (not in any sector): ${unassigned.length} ──`);
if (unassigned.length > 0) {
    const byFaction = {};
    for (const b of unassigned) {
        byFaction[b.faction] = (byFaction[b.faction] || 0) + 1;
    }
    console.log('  By faction:', byFaction);
    for (const b of unassigned.slice(0, 10)) {
        console.log(`  ${b.id.padEnd(40)} ${b.faction.padEnd(6)} corps=${b.corps_id} loc=${b.location_osid} hops=${b.hopDistance}`);
    }
}

// ── 7. High-distance brigades by corps ──
console.log();
console.log('── Average Hop Distance By Corps ──');
const corpsDist = {};
for (const b of activeBrigades) {
    if (b.hopDistance == null) continue;
    if (!corpsDist[b.corps_id]) corpsDist[b.corps_id] = { total: 0, count: 0, max: 0, maxId: '' };
    corpsDist[b.corps_id].total += b.hopDistance;
    corpsDist[b.corps_id].count++;
    if (b.hopDistance > corpsDist[b.corps_id].max) {
        corpsDist[b.corps_id].max = b.hopDistance;
        corpsDist[b.corps_id].maxId = b.id;
    }
}
const corpsEntries = Object.entries(corpsDist).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));
console.log(`${'Corps'.padEnd(30)} ${'Avg'.padStart(5)} ${'Max'.padStart(4)} ${'#'.padStart(3)}  Furthest Brigade`);
console.log('-'.repeat(100));
for (const [corps, d] of corpsEntries) {
    console.log(
        `${corps.padEnd(30)} ${(d.total / d.count).toFixed(1).padStart(5)} ${String(d.max).padStart(4)} ${String(d.count).padStart(3)}  ${d.maxId}`
    );
}
