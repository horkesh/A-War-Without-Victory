/**
 * diagnose_case_b_angles.cjs
 *
 * Diagnostic tool: dumps ALL Case B connections and their centroid angles
 * from a 40w scenario run. Goal: find the natural gap in the angle
 * distribution to pick the right threshold for isCaseBBridge.
 *
 * Case B: two front edges share the same hostile OSID H, with distinct
 * friendly OSIDs F1/F2 that are adjacent (min_dist === 0 shared boundary).
 * The angle is computed from centroids: angle between vectors (H->F1) and (H->F2).
 *
 * Usage:
 *   node tools/diagnose_case_b_angles.cjs [<final_save_path>]
 *
 * Defaults to the latest n1176 40w run if no path given.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- Paths ---
const PROJECT = path.resolve(__dirname, '..');
const CONTACT_GRAPH = path.join(PROJECT, 'data/derived/operational/operational_contact_graph.json');

const DEFAULT_SAVE = (function findLatestSave() {
    const runsDir = path.join(PROJECT, 'runs');
    // Find the latest 40w run directory (highest nXXXX suffix)
    const dirs = fs.readdirSync(runsDir)
        .filter(d => d.includes('definitive_40w'));
    if (dirs.length === 0) return null;
    // Sort by the numeric suffix nXXXX (descending) to get the highest
    dirs.sort((a, b) => {
        const na = parseInt((a.match(/_n(\d+)$/) || ['', '0'])[1], 10);
        const nb = parseInt((b.match(/_n(\d+)$/) || ['', '0'])[1], 10);
        return nb - na;
    });
    const latest = dirs[0];
    return path.join(runsDir, latest, 'final_save.json');
})();

const savePath = process.argv[2] || DEFAULT_SAVE;
if (!savePath || !fs.existsSync(savePath)) {
    console.error('No save file found. Pass path as argument or ensure a 40w run exists.');
    process.exit(1);
}

console.log(`Loading save: ${path.relative(PROJECT, savePath)}`);

// --- Load data ---
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH, 'utf8'));

// Build centroid map: osid -> { lat, lon }
const centroids = new Map();
for (const node of graph.nodes) {
    centroids.set(node.id, { lat: node.lat, lon: node.lon });
}

// Build shared-boundary adjacency: only edges with min_dist === 0
const sharedBoundaryAdj = new Map();
function addAdj(map, a, b) {
    let list = map.get(a);
    if (!list) { list = []; map.set(a, list); }
    if (!list.includes(b)) list.push(b);
}
for (const edge of graph.edges) {
    if (edge.min_dist === 0) {
        addAdj(sharedBoundaryAdj, edge.a, edge.b);
        addAdj(sharedBoundaryAdj, edge.b, edge.a);
    }
}

// Build full adjacency (all edges)
const fullAdj = new Map();
for (const edge of graph.edges) {
    addAdj(fullAdj, edge.a, edge.b);
    addAdj(fullAdj, edge.b, edge.a);
}

// Build edge distance map for min_dist lookups
const edgeDistMap = new Map();
for (const edge of graph.edges) {
    const key1 = `${edge.a}__${edge.b}`;
    const key2 = `${edge.b}__${edge.a}`;
    edgeDistMap.set(key1, edge.min_dist);
    edgeDistMap.set(key2, edge.min_dist);
}
function getMinDist(a, b) {
    return edgeDistMap.get(`${a}__${b}`) ?? edgeDistMap.get(`${b}__${a}`) ?? Infinity;
}

// --- Normalize save structure (may or may not have a `state` wrapper) ---
const root = save.state || save;
const mil = root.military;
const pol = root.political;

// --- Front edges ---
const frontEdges = mil.war_front_edges_osid;
console.log(`Front edges: ${frontEdges.length}`);

// Political controllers for faction lookup
const pc = pol.political_controllers;

// Build sector lookup: edge_id -> sector_id(s)
const sectorByEdge = new Map();
const sectors = mil.corps_front_sectors;
for (const [sectorId, sector] of Object.entries(sectors)) {
    for (const eid of sector.edge_ids) {
        let list = sectorByEdge.get(eid);
        if (!list) { list = []; sectorByEdge.set(eid, list); }
        list.push(sectorId);
    }
}

// --- Angle computation (exact replica of isCaseBBridge) ---
function centroidAngleDeg(fi, fj, h) {
    const cFi = centroids.get(fi);
    const cFj = centroids.get(fj);
    const cH = centroids.get(h);
    if (!cFi || !cFj || !cH) return null;

    // Vectors from H to fi and fj
    const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon };
    const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon };

    const angle1 = Math.atan2(v1.lat, v1.lon);
    const angle2 = Math.atan2(v2.lat, v2.lon);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    return (diff * 180) / Math.PI;
}

// --- Group front edges by hostile OSID ---
// For each front edge, determine friendly/hostile per faction
// We process ALL factions since Case B is per-faction

const factions = ['RBiH', 'RS', 'HRHB'];
const results = [];

for (const faction of factions) {
    // Group edges by hostile OSID for this faction
    const hostileToEdges = new Map();

    for (const fe of frontEdges) {
        let friendly, hostile;
        if (fe.side_a === faction) { friendly = fe.a; hostile = fe.b; }
        else if (fe.side_b === faction) { friendly = fe.b; hostile = fe.a; }
        else continue;

        let list = hostileToEdges.get(hostile);
        if (!list) { list = []; hostileToEdges.set(hostile, list); }
        list.push({ friendly, hostile, edge_id: fe.edge_id });
    }

    // For each hostile OSID with 2+ edges, check all pairs
    for (const [h, edges] of hostileToEdges.entries()) {
        if (edges.length < 2) continue;

        for (let i = 0; i < edges.length; i++) {
            const fi = edges[i].friendly;
            for (let j = i + 1; j < edges.length; j++) {
                const fj = edges[j].friendly;
                if (fi === fj) continue;

                // Check adjacency (shared boundary, min_dist === 0)
                const isAdj = (sharedBoundaryAdj.get(fi) || []).includes(fj);
                if (!isAdj) continue;

                const angle = centroidAngleDeg(fi, fj, h);
                if (angle === null) continue;

                // Get sector info
                const sectorsI = sectorByEdge.get(edges[i].edge_id) || ['none'];
                const sectorsJ = sectorByEdge.get(edges[j].edge_id) || ['none'];

                // Also get fi-H and fj-H distances
                const fiHDist = getMinDist(fi, h);
                const fjHDist = getMinDist(fj, h);

                results.push({
                    faction,
                    f1: fi,
                    f2: fj,
                    h,
                    angle: Math.round(angle * 100) / 100,
                    f1_faction: pc[fi] || '?',
                    f2_faction: pc[fj] || '?',
                    h_faction: pc[h] || '?',
                    sectors_e1: sectorsI,
                    sectors_e2: sectorsJ,
                    same_sector: sectorsI.some(s => sectorsJ.includes(s)),
                    fi_h_dist: fiHDist,
                    fj_h_dist: fjHDist,
                    would_be_blocked_165: angle > 165,
                });
            }
        }
    }
}

// Sort by angle ascending
results.sort((a, b) => a.angle - b.angle);

// --- Output ---
console.log(`\n${'='.repeat(80)}`);
console.log(`CASE B ANGLE DIAGNOSTIC — ${results.length} pairs found`);
console.log(`${'='.repeat(80)}\n`);

// Detailed listing
console.log('ALL CASE B CANDIDATE PAIRS (sorted by angle ascending):');
console.log('-'.repeat(120));
console.log(
    'Angle'.padEnd(8) +
    'Faction'.padEnd(7) +
    'F1'.padEnd(35) +
    'F2'.padEnd(35) +
    'H'.padEnd(35)
);
console.log('-'.repeat(120));

for (const r of results) {
    const shortF1 = r.f1.replace('op:', '');
    const shortF2 = r.f2.replace('op:', '');
    const shortH = r.h.replace('op:', '');
    console.log(
        `${r.angle.toFixed(1).padStart(6)}° ` +
        `${r.faction.padEnd(6)} ` +
        `${shortF1.padEnd(34)} ` +
        `${shortF2.padEnd(34)} ` +
        `${shortH}`
    );
}

// Detailed output with sectors
console.log(`\n${'='.repeat(80)}`);
console.log('DETAILED VIEW (with sectors, distances):');
console.log('='.repeat(80));

for (const r of results) {
    const shortF1 = r.f1.replace('op:', '');
    const shortF2 = r.f2.replace('op:', '');
    const shortH = r.h.replace('op:', '');
    console.log(
        `\n  ${r.angle.toFixed(1)}°  ${r.faction}` +
        `  F1=${shortF1} (ctrl: ${r.f1_faction})` +
        `  F2=${shortF2} (ctrl: ${r.f2_faction})` +
        `  H=${shortH} (ctrl: ${r.h_faction})` +
        `\n    F1-H dist=${r.fi_h_dist}m  F2-H dist=${r.fj_h_dist}m` +
        `  same_sector=${r.same_sector}` +
        `  blocked@165°=${r.would_be_blocked_165}` +
        `\n    sectors_e1=${r.sectors_e1.join(',')}` +
        `  sectors_e2=${r.sectors_e2.join(',')}`
    );
}

// --- Histogram ---
console.log(`\n${'='.repeat(80)}`);
console.log('ANGLE HISTOGRAM (10° buckets):');
console.log('='.repeat(80));

const buckets = new Array(18).fill(0); // 0-10, 10-20, ..., 170-180
for (const r of results) {
    const idx = Math.min(Math.floor(r.angle / 10), 17);
    buckets[idx]++;
}

const maxCount = Math.max(...buckets);
for (let i = 0; i < 18; i++) {
    const lo = i * 10;
    const hi = lo + 10;
    const count = buckets[i];
    const bar = count > 0 ? '#'.repeat(Math.ceil((count / Math.max(maxCount, 1)) * 50)) : '';
    const label = `${String(lo).padStart(3)}°-${String(hi).padStart(3)}°`;
    console.log(`  ${label}  ${String(count).padStart(4)}  ${bar}`);
}

// --- Gap analysis ---
console.log(`\n${'='.repeat(80)}`);
console.log('GAP ANALYSIS:');
console.log('='.repeat(80));

// Find gaps > 5° between consecutive angles
const angles = results.map(r => r.angle);
if (angles.length > 1) {
    const gaps = [];
    for (let i = 1; i < angles.length; i++) {
        const gap = angles[i] - angles[i - 1];
        if (gap > 5) {
            gaps.push({
                below: angles[i - 1],
                above: angles[i],
                gap,
                indexBelow: i - 1,
                indexAbove: i,
                countBelow: i,
                countAbove: angles.length - i,
            });
        }
    }

    if (gaps.length === 0) {
        console.log('  No gaps > 5° found in the distribution.');
    } else {
        gaps.sort((a, b) => b.gap - a.gap);
        console.log(`  Found ${gaps.length} gaps > 5°:\n`);
        for (const g of gaps) {
            const midpoint = (g.below + g.above) / 2;
            console.log(
                `  GAP: ${g.below.toFixed(1)}° → ${g.above.toFixed(1)}°` +
                `  (${g.gap.toFixed(1)}° wide)` +
                `  midpoint=${midpoint.toFixed(1)}°` +
                `  ${g.countBelow} below / ${g.countAbove} above`
            );
        }
    }
}

// --- Summary statistics ---
console.log(`\n${'='.repeat(80)}`);
console.log('SUMMARY:');
console.log('='.repeat(80));
console.log(`  Total Case B candidate pairs: ${results.length}`);
console.log(`  Angle range: ${angles[0]?.toFixed(1)}° — ${angles[angles.length - 1]?.toFixed(1)}°`);
console.log(`  Median: ${angles[Math.floor(angles.length / 2)]?.toFixed(1)}°`);
console.log(`  Mean: ${(angles.reduce((s, a) => s + a, 0) / angles.length).toFixed(1)}°`);

const blocked165 = results.filter(r => r.would_be_blocked_165).length;
console.log(`  Currently blocked (>165°): ${blocked165}`);
console.log(`  Currently allowed (<=165°): ${results.length - blocked165}`);

// Count by faction
for (const f of factions) {
    const fResults = results.filter(r => r.faction === f);
    if (fResults.length > 0) {
        console.log(`  ${f}: ${fResults.length} pairs, angles ${fResults[0].angle.toFixed(1)}°-${fResults[fResults.length - 1].angle.toFixed(1)}°`);
    }
}

// Threshold recommendations
console.log(`\n  THRESHOLD RECOMMENDATIONS:`);
for (const thresh of [90, 100, 110, 120, 130, 140, 150, 160, 165, 170]) {
    const blocked = results.filter(r => r.angle > thresh).length;
    const allowed = results.length - blocked;
    console.log(`    >${thresh}°: ${blocked} blocked, ${allowed} allowed`);
}
