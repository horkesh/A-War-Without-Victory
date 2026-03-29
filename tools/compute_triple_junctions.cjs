#!/usr/bin/env node
/**
 * compute_triple_junctions.cjs
 *
 * Analyzes polygon vertex sharing in the operational settlements GeoJSON to find
 * triple junctions — vertices where 3+ OSID polygons meet. This is the geometric
 * ground truth for front edge adjacency (replacing the Case A/B heuristic).
 *
 * Usage: node tools/compute_triple_junctions.cjs [--tolerance <deg>] [--validate] [--json]
 *
 * Options:
 *   --tolerance <deg>  Snap tolerance in degrees (default: 0 = exact match)
 *   --validate         Run the Trnovo-Kalinovik bridge validation
 *   --json             Output triple_junctions.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const toleranceIdx = args.indexOf('--tolerance');
const TOLERANCE = toleranceIdx >= 0 ? parseFloat(args[toleranceIdx + 1]) : 0;
const VALIDATE = args.includes('--validate');
const OUTPUT_JSON = args.includes('--json');

const GEOJSON_PATH = path.join(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const CONTACT_GRAPH_PATH = path.join(__dirname, '..', 'data', 'derived', 'operational', 'operational_contact_graph.json');

// ── Load data ──────────────────────────────────────────────────────────────────

const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
console.log(`Loaded ${geo.features.length} features from operational_settlements.geojson`);

// ── Extract all polygon ring vertices per OSID ─────────────────────────────────

/** @type {Map<string, [number,number][]>} osid → list of [lon, lat] vertices */
const osidVertices = new Map();

for (const feature of geo.features) {
    const osid = feature.properties.osid;
    const verts = [];

    if (feature.geometry.type === 'Polygon') {
        // Only outer ring (index 0), skip closing vertex (last = first)
        const ring = feature.geometry.coordinates[0];
        for (let i = 0; i < ring.length - 1; i++) {
            verts.push(ring[i]);
        }
    } else if (feature.geometry.type === 'MultiPolygon') {
        for (const poly of feature.geometry.coordinates) {
            const ring = poly[0]; // outer ring
            for (let i = 0; i < ring.length - 1; i++) {
                verts.push(ring[i]);
            }
        }
    }

    osidVertices.set(osid, verts);
}

console.log(`Extracted vertices for ${osidVertices.size} OSIDs`);

// ── Build vertex → set of OSIDs map ────────────────────────────────────────────

/**
 * Key function for vertex lookup. With tolerance=0, use exact string key.
 * With tolerance>0, we need spatial binning.
 */
function vertexKey(lon, lat) {
    if (TOLERANCE === 0) {
        return `${lon},${lat}`;
    }
    // Snap to grid with cell size = tolerance
    const snapLon = Math.round(lon / TOLERANCE) * TOLERANCE;
    const snapLat = Math.round(lat / TOLERANCE) * TOLERANCE;
    return `${snapLon.toFixed(12)},${snapLat.toFixed(12)}`;
}

/** @type {Map<string, Set<string>>} vertexKey → set of OSIDs */
const vertexToOsids = new Map();
let totalVertices = 0;

for (const [osid, verts] of osidVertices) {
    for (const [lon, lat] of verts) {
        totalVertices++;
        const key = vertexKey(lon, lat);
        let set = vertexToOsids.get(key);
        if (!set) { set = new Set(); vertexToOsids.set(key, set); }
        set.add(osid);
    }
}

// ── Analyze sharing ────────────────────────────────────────────────────────────

let uniqueVertices = vertexToOsids.size;
let shared2 = 0;    // vertices shared by exactly 2 OSIDs
let shared3 = 0;    // vertices shared by exactly 3 OSIDs
let shared4plus = 0; // vertices shared by 4+ OSIDs
let unshared = 0;   // vertices belonging to only 1 OSID

/** @type {Map<string, Set<string>>} sorted OSID triple key → set of vertex keys */
const tripleJunctions = new Map();
/** @type {Map<string, Set<string>>} sorted OSID pair key → set of vertex keys */
const pairJunctions = new Map();

for (const [vKey, osids] of vertexToOsids) {
    const count = osids.size;
    if (count === 1) { unshared++; continue; }
    if (count === 2) shared2++;
    else if (count === 3) shared3++;
    else shared4plus++;

    // Record pairs
    const osidArr = [...osids].sort();
    for (let i = 0; i < osidArr.length; i++) {
        for (let j = i + 1; j < osidArr.length; j++) {
            const pKey = `${osidArr[i]}|${osidArr[j]}`;
            let ps = pairJunctions.get(pKey);
            if (!ps) { ps = new Set(); pairJunctions.set(pKey, ps); }
            ps.add(vKey);
        }
    }

    // Record triples (from 3+ sharing vertices)
    if (count >= 3) {
        for (let i = 0; i < osidArr.length; i++) {
            for (let j = i + 1; j < osidArr.length; j++) {
                for (let k = j + 1; k < osidArr.length; k++) {
                    const tKey = `${osidArr[i]}|${osidArr[j]}|${osidArr[k]}`;
                    let ts = tripleJunctions.get(tKey);
                    if (!ts) { ts = new Set(); tripleJunctions.set(tKey, ts); }
                    ts.add(vKey);
                }
            }
        }
    }
}

console.log('\n=== VERTEX SHARING ANALYSIS ===');
console.log(`Tolerance: ${TOLERANCE} degrees${TOLERANCE === 0 ? ' (exact match)' : ` (~${(TOLERANCE * 111000).toFixed(1)}m)`}`);
console.log(`Total vertex instances: ${totalVertices}`);
console.log(`Unique vertex positions: ${uniqueVertices}`);
console.log(`  Unshared (1 OSID):    ${unshared} (${(100*unshared/uniqueVertices).toFixed(1)}%)`);
console.log(`  Shared by 2 OSIDs:    ${shared2} (${(100*shared2/uniqueVertices).toFixed(1)}%)`);
console.log(`  Shared by 3 OSIDs:    ${shared3} (${(100*shared3/uniqueVertices).toFixed(1)}%)`);
console.log(`  Shared by 4+ OSIDs:   ${shared4plus} (${(100*shared4plus/uniqueVertices).toFixed(1)}%)`);
console.log(`\nOSID pairs sharing vertices: ${pairJunctions.size}`);
console.log(`Triple junctions (3-OSID triples): ${tripleJunctions.size}`);

// Show some examples of 4+ junctions
if (shared4plus > 0) {
    console.log('\n=== VERTICES SHARED BY 4+ OSIDs ===');
    let count = 0;
    for (const [vKey, osids] of vertexToOsids) {
        if (osids.size >= 4) {
            console.log(`  ${vKey}: ${[...osids].sort().join(', ')} (${osids.size} OSIDs)`);
            if (++count >= 10) { console.log('  ... (showing first 10)'); break; }
        }
    }
}

// ── Compare with contact graph ─────────────────────────────────────────────────

const contactGraph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8'));
const contactPairs = new Set();
const sharedBoundaryPairs = new Set(); // min_dist === 0
for (const e of contactGraph.edges) {
    const key = [e.a, e.b].sort().join('|');
    contactPairs.add(key);
    if (e.min_dist === 0) sharedBoundaryPairs.add(key);
}

// Check: vertex-sharing pairs vs contact graph pairs
let vertexPairsInGraph = 0;
let vertexPairsNotInGraph = 0;
let vertexPairsInSharedBoundary = 0;
const missingFromGraph = [];
for (const pKey of pairJunctions.keys()) {
    if (contactPairs.has(pKey)) {
        vertexPairsInGraph++;
        if (sharedBoundaryPairs.has(pKey)) vertexPairsInSharedBoundary++;
    } else {
        vertexPairsNotInGraph++;
        missingFromGraph.push(pKey);
    }
}

// Contact graph pairs NOT found via vertex sharing
let graphPairsNotInVertices = 0;
const graphNotVertex = [];
for (const e of contactGraph.edges) {
    const key = [e.a, e.b].sort().join('|');
    if (!pairJunctions.has(key)) {
        graphPairsNotInVertices++;
        if (e.min_dist === 0 && graphNotVertex.length < 10) {
            graphNotVertex.push({ key, min_dist: e.min_dist });
        }
    }
}

console.log('\n=== COMPARISON WITH CONTACT GRAPH ===');
console.log(`Contact graph edges: ${contactGraph.edges.length}`);
console.log(`  shared_boundary (min_dist=0): ${sharedBoundaryPairs.size}`);
console.log(`Vertex-sharing pairs: ${pairJunctions.size}`);
console.log(`  Also in contact graph: ${vertexPairsInGraph}`);
console.log(`  Also shared_boundary: ${vertexPairsInSharedBoundary}`);
console.log(`  NOT in contact graph: ${vertexPairsNotInGraph}`);
console.log(`Contact graph pairs NOT in vertex sharing: ${graphPairsNotInVertices}`);

if (missingFromGraph.length > 0) {
    console.log(`\nVertex pairs NOT in contact graph (first 10):`);
    for (const p of missingFromGraph.slice(0, 10)) {
        const [a, b] = p.split('|');
        const verts = pairJunctions.get(p);
        console.log(`  ${a} <-> ${b} (${verts.size} shared vertices)`);
    }
}

if (graphNotVertex.length > 0) {
    console.log(`\nShared-boundary graph pairs WITHOUT shared vertices (first 10):`);
    for (const { key, min_dist } of graphNotVertex) {
        console.log(`  ${key} (min_dist=${min_dist})`);
    }
}

// ── Floating point analysis ────────────────────────────────────────────────────

// For pairs that ARE in the contact graph with min_dist=0 but DON'T share vertices,
// check if their vertices are very close but not exact
if (TOLERANCE === 0) {
    console.log('\n=== FLOATING POINT PRECISION ANALYSIS ===');

    // Find closest near-miss between two OSIDs that are contact-graph neighbors but don't share vertices
    let nearMissCount = 0;
    const nearMissSamples = [];

    for (const e of contactGraph.edges) {
        if (e.min_dist !== 0) continue;
        const key = [e.a, e.b].sort().join('|');
        if (pairJunctions.has(key)) continue; // already sharing

        const vertsA = osidVertices.get(e.a);
        const vertsB = osidVertices.get(e.b);
        if (!vertsA || !vertsB) continue;

        // Find minimum vertex distance
        let minDist = Infinity;
        let bestA = null, bestB = null;
        for (const [lonA, latA] of vertsA) {
            for (const [lonB, latB] of vertsB) {
                const d = Math.sqrt((lonA - lonB) ** 2 + (latA - latB) ** 2);
                if (d < minDist) {
                    minDist = d;
                    bestA = [lonA, latA];
                    bestB = [lonB, latB];
                }
            }
        }

        if (minDist < 0.001) { // < ~111m
            nearMissCount++;
            if (nearMissSamples.length < 10) {
                nearMissSamples.push({
                    pair: key,
                    minDist,
                    meters: minDist * 111000,
                    vertA: bestA,
                    vertB: bestB
                });
            }
        }
    }

    console.log(`Shared-boundary pairs without exact vertex match: ${graphPairsNotInVertices} (of ${sharedBoundaryPairs.size})`);
    console.log(`  Of those, close near-misses (<111m): ${nearMissCount}`);
    if (nearMissSamples.length > 0) {
        console.log('\nNearest vertex pairs (shared_boundary but no exact match):');
        nearMissSamples.sort((a, b) => a.minDist - b.minDist);
        for (const s of nearMissSamples) {
            console.log(`  ${s.pair}`);
            console.log(`    dist: ${s.minDist.toExponential(4)} deg = ${s.meters.toFixed(2)}m`);
            console.log(`    vertA: [${s.vertA[0]}, ${s.vertA[1]}]`);
            console.log(`    vertB: [${s.vertB[0]}, ${s.vertB[1]}]`);
        }
    }
}

// ── Trnovo-Kalinovik validation ────────────────────────────────────────────────

if (VALIDATE) {
    console.log('\n=== TRNOVO-KALINOVIK BRIDGE VALIDATION ===');
    const GOLUBICI = 'op:kalinovik:golubici_2';
    const TRNOVO = 'op:trnovo:trnovo';
    const TOSICI = 'op:trnovo:tosici';

    // Check for triple junction at these three
    const tripleKey = [GOLUBICI, TOSICI, TRNOVO].sort().join('|');
    const tripleVerts = tripleJunctions.get(tripleKey);

    if (tripleVerts) {
        console.log(`FOUND triple junction for (golubici_2, trnovo, tosici): ${tripleVerts.size} shared vertices`);
        for (const v of tripleVerts) {
            console.log(`  vertex: ${v}`);
        }
        console.log('=> Vertex-based connectivity WOULD still connect them (bridge is geometrically real)');
    } else {
        console.log('NO triple junction found for (golubici_2, trnovo, tosici)');

        // Check pair-wise vertex sharing
        for (const [a, b, label] of [
            [GOLUBICI, TRNOVO, 'golubici_2 <-> trnovo'],
            [GOLUBICI, TOSICI, 'golubici_2 <-> tosici'],
            [TRNOVO, TOSICI, 'trnovo <-> tosici'],
        ]) {
            const pKey = [a, b].sort().join('|');
            const pVerts = pairJunctions.get(pKey);
            console.log(`  ${label}: ${pVerts ? pVerts.size + ' shared vertices' : 'NO shared vertices'}`);
        }
        console.log('=> Vertex-based connectivity would correctly SPLIT them');
    }
}

// ── Output JSON ────────────────────────────────────────────────────────────────

if (OUTPUT_JSON) {
    const outPath = path.join(__dirname, '..', 'data', 'derived', 'operational', 'triple_junctions.json');

    // Build output: array of { osids: [a, b, c], vertices: [[lon,lat], ...] }
    const output = {
        tolerance_degrees: TOLERANCE,
        generated: new Date().toISOString(),
        total_triples: tripleJunctions.size,
        total_pairs: pairJunctions.size,
        triples: [],
        pairs: []
    };

    for (const [tKey, verts] of [...tripleJunctions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const osids = tKey.split('|');
        output.triples.push({
            osids,
            vertex_count: verts.size
        });
    }

    // Also emit pairs (for Case A — shared boundary between two OSIDs)
    for (const [pKey, verts] of [...pairJunctions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const osids = pKey.split('|');
        output.pairs.push({
            osids,
            vertex_count: verts.size
        });
    }

    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${outPath}`);
    console.log(`  ${output.triples.length} triples, ${output.pairs.length} pairs`);
}

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n=== SUMMARY ===');
console.log(`Triple junction approach ${tripleJunctions.size > 0 ? 'IS' : 'is NOT'} viable at tolerance=${TOLERANCE}`);
if (tripleJunctions.size === 0 && TOLERANCE === 0) {
    console.log('Try running with --tolerance 0.0000001 (or higher) to check for floating-point near-misses');
}
