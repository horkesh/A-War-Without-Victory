#!/usr/bin/env node
/**
 * compare_vertex_vs_heuristic.cjs
 *
 * Compares vertex-based triple junction connectivity with the current
 * Case A/B heuristic for front edge adjacency. Uses the latest scenario save
 * to get actual front edges, then checks:
 *
 * 1. For each Case B pair (same hostile H, friendly F1/F2 adjacent):
 *    does a triple junction vertex (F1, F2, H) exist?
 * 2. How many Case B connections are geometrically real vs heuristic-only?
 * 3. How many vertex-based connections are missed by Case A/B?
 *
 * Usage: node tools/compare_vertex_vs_heuristic.cjs [<final_save_path>]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..');
const GEOJSON_PATH = path.join(PROJECT, 'data/derived/operational/operational_settlements.geojson');
const CONTACT_GRAPH_PATH = path.join(PROJECT, 'data/derived/operational/operational_contact_graph.json');

// ── Find latest save ───────────────────────────────────────────────────────────

const DEFAULT_SAVE = (function findLatestSave() {
    const runsDir = path.join(PROJECT, 'runs');
    if (!fs.existsSync(runsDir)) return null;
    const dirs = fs.readdirSync(runsDir).filter(d => d.includes('definitive_40w'));
    if (dirs.length === 0) return null;
    dirs.sort((a, b) => {
        const na = parseInt((a.match(/_n(\d+)$/) || ['', '0'])[1], 10);
        const nb = parseInt((b.match(/_n(\d+)$/) || ['', '0'])[1], 10);
        return nb - na;
    });
    return path.join(runsDir, dirs[0], 'final_save.json');
})();

const savePath = process.argv[2] || DEFAULT_SAVE;
if (!savePath || !fs.existsSync(savePath)) {
    console.error('No save file found. Pass path as argument.');
    process.exit(1);
}

console.log(`Save: ${path.relative(PROJECT, savePath)}`);

// ── Load data ──────────────────────────────────────────────────────────────────

const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const geo = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
const contactGraph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8'));
const root = save.state || save;
const mil = root.military;

// ── Build triple junction lookup from polygon vertices ─────────────────────────

const osidVertices = new Map();
for (const feature of geo.features) {
    const osid = feature.properties.osid;
    const verts = [];
    if (feature.geometry.type === 'Polygon') {
        const ring = feature.geometry.coordinates[0];
        for (let i = 0; i < ring.length - 1; i++) verts.push(ring[i]);
    } else if (feature.geometry.type === 'MultiPolygon') {
        for (const poly of feature.geometry.coordinates) {
            const ring = poly[0];
            for (let i = 0; i < ring.length - 1; i++) verts.push(ring[i]);
        }
    }
    osidVertices.set(osid, verts);
}

// vertex key → set of OSIDs
const vertexToOsids = new Map();
for (const [osid, verts] of osidVertices) {
    for (const [lon, lat] of verts) {
        const key = `${lon},${lat}`;
        let set = vertexToOsids.get(key);
        if (!set) { set = new Set(); vertexToOsids.set(key, set); }
        set.add(osid);
    }
}

// Triple junction set: "A|B|C" (sorted) where A,B,C share a vertex
const tripleJunctionSet = new Set();
// Pair junction set: "A|B" (sorted) where A,B share a vertex
const pairJunctionSet = new Set();

for (const [, osids] of vertexToOsids) {
    if (osids.size < 2) continue;
    const arr = [...osids].sort();
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            pairJunctionSet.add(`${arr[i]}|${arr[j]}`);
            for (let k = j + 1; k < arr.length; k++) {
                tripleJunctionSet.add(`${arr[i]}|${arr[j]}|${arr[k]}`);
            }
        }
    }
}

console.log(`Vertex triples: ${tripleJunctionSet.size}, vertex pairs: ${pairJunctionSet.size}`);

// ── Build shared-boundary adjacency ────────────────────────────────────────────

const sharedBoundaryAdj = new Map();
function addAdj(map, a, b) {
    let list = map.get(a);
    if (!list) { list = []; map.set(a, list); }
    if (!list.includes(b)) list.push(b);
}
for (const edge of contactGraph.edges) {
    if (edge.min_dist === 0) {
        addAdj(sharedBoundaryAdj, edge.a, edge.b);
        addAdj(sharedBoundaryAdj, edge.b, edge.a);
    }
}

// ── Build centroid map ─────────────────────────────────────────────────────────

const centroids = new Map();
for (const node of contactGraph.nodes) {
    centroids.set(node.id, { lat: node.lat, lon: node.lon });
}

function centroidAngleDeg(fi, fj, h) {
    const cFi = centroids.get(fi);
    const cFj = centroids.get(fj);
    const cH = centroids.get(h);
    if (!cFi || !cFj || !cH) return null;
    const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon };
    const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon };
    const a1 = Math.atan2(v1.lat, v1.lon);
    const a2 = Math.atan2(v2.lat, v2.lon);
    let diff = Math.abs(a1 - a2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return (diff * 180) / Math.PI;
}

// ── Analyze front edges ────────────────────────────────────────────────────────

const frontEdges = mil.war_front_edges_osid;
const factions = ['RBiH', 'RS', 'HRHB'];

console.log(`\nFront edges: ${frontEdges.length}`);

let totalCaseA = 0;
let totalCaseB = 0;
let caseBWithVertex = 0;
let caseBWithoutVertex = 0;
let caseAWithVertex = 0;
let caseAWithoutVertex = 0;

const caseBDetails = [];

for (const faction of factions) {
    const friendlyToEdges = new Map();
    const hostileToEdges = new Map();
    const edgeFriendly = new Map();
    const edgeHostile = new Map();

    for (const fe of frontEdges) {
        let friendly, hostile;
        if (fe.side_a === faction) { friendly = fe.a; hostile = fe.b; }
        else if (fe.side_b === faction) { friendly = fe.b; hostile = fe.a; }
        else continue;

        const eid = fe.edge_id;
        edgeFriendly.set(eid, friendly);
        edgeHostile.set(eid, hostile);

        let list = friendlyToEdges.get(friendly);
        if (!list) { list = []; friendlyToEdges.set(friendly, list); }
        list.push(eid);

        list = hostileToEdges.get(hostile);
        if (!list) { list = []; hostileToEdges.set(hostile, list); }
        list.push(eid);
    }

    // Case A: same friendly, hostile adj
    for (const [f, edges] of friendlyToEdges) {
        for (let i = 0; i < edges.length; i++) {
            const hi = edgeHostile.get(edges[i]);
            for (let j = i + 1; j < edges.length; j++) {
                const hj = edgeHostile.get(edges[j]);
                if (hi === hj) continue;
                const isAdj = (sharedBoundaryAdj.get(hi) || []).includes(hj);
                if (!isAdj) continue;

                totalCaseA++;
                // Check if vertex triple junction exists: (F, H1, H2)
                const tripleKey = [f, hi, hj].sort().join('|');
                if (tripleJunctionSet.has(tripleKey)) {
                    caseAWithVertex++;
                } else {
                    caseAWithoutVertex++;
                }
            }
        }
    }

    // Case B: same hostile, friendly adj
    for (const [h, edges] of hostileToEdges) {
        for (let i = 0; i < edges.length; i++) {
            const fi = edgeFriendly.get(edges[i]);
            for (let j = i + 1; j < edges.length; j++) {
                const fj = edgeFriendly.get(edges[j]);
                if (fi === fj) continue;
                const isAdj = (sharedBoundaryAdj.get(fi) || []).includes(fj);
                if (!isAdj) continue;

                totalCaseB++;
                const tripleKey = [fi, fj, h].sort().join('|');
                const hasVertex = tripleJunctionSet.has(tripleKey);
                const angle = centroidAngleDeg(fi, fj, h);

                if (hasVertex) {
                    caseBWithVertex++;
                } else {
                    caseBWithoutVertex++;
                }

                caseBDetails.push({
                    faction,
                    f1: fi,
                    f2: fj,
                    h,
                    hasVertex,
                    angle: angle ? Math.round(angle * 10) / 10 : null,
                    isBridge165: angle !== null && angle > 165,
                });
            }
        }
    }
}

// ── Report ─────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(80));
console.log('CASE A: same friendly OSID F, hostile H1 adj H2');
console.log('='.repeat(80));
console.log(`Total Case A pairs: ${totalCaseA}`);
console.log(`  With vertex triple junction (F, H1, H2): ${caseAWithVertex} (${(100*caseAWithVertex/totalCaseA).toFixed(1)}%)`);
console.log(`  WITHOUT vertex triple junction:           ${caseAWithoutVertex} (${(100*caseAWithoutVertex/totalCaseA).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80));
console.log('CASE B: same hostile OSID H, friendly F1 adj F2');
console.log('='.repeat(80));
console.log(`Total Case B pairs: ${totalCaseB}`);
console.log(`  With vertex triple junction (F1, F2, H): ${caseBWithVertex} (${(100*caseBWithVertex/totalCaseB).toFixed(1)}%)`);
console.log(`  WITHOUT vertex triple junction:           ${caseBWithoutVertex} (${(100*caseBWithoutVertex/totalCaseB).toFixed(1)}%)`);

// Show Case B pairs without vertex support
const noVertexPairs = caseBDetails.filter(d => !d.hasVertex);
if (noVertexPairs.length > 0) {
    console.log(`\n--- Case B pairs WITHOUT vertex triple junction (${noVertexPairs.length}) ---`);
    noVertexPairs.sort((a, b) => (a.angle || 0) - (b.angle || 0));
    for (const d of noVertexPairs) {
        const f1Short = d.f1.replace('op:', '');
        const f2Short = d.f2.replace('op:', '');
        const hShort = d.h.replace('op:', '');
        const bridgeStr = d.isBridge165 ? ' [BRIDGE@165]' : '';
        console.log(`  ${d.faction.padEnd(6)} angle=${(d.angle ?? '?').toString().padStart(6)}°  F1=${f1Short.padEnd(34)} F2=${f2Short.padEnd(34)} H=${hShort}${bridgeStr}`);
    }
}

// Show Case B pairs WITH vertex support but flagged as bridge
const vertexButBridge = caseBDetails.filter(d => d.hasVertex && d.isBridge165);
if (vertexButBridge.length > 0) {
    console.log(`\n--- Case B with vertex triple junction BUT angle>165° (would be bridge-blocked) (${vertexButBridge.length}) ---`);
    for (const d of vertexButBridge) {
        const f1Short = d.f1.replace('op:', '');
        const f2Short = d.f2.replace('op:', '');
        const hShort = d.h.replace('op:', '');
        console.log(`  ${d.faction.padEnd(6)} angle=${(d.angle ?? '?').toString().padStart(6)}°  F1=${f1Short.padEnd(34)} F2=${f2Short.padEnd(34)} H=${hShort}`);
    }
}

// ── Vertex-only connections (NOT found by Case A/B) ────────────────────────────

// For completeness: check if there are triple-junction vertex connections that
// the current heuristic would NOT find. This would mean the vertex approach
// finds MORE connections.

console.log('\n' + '='.repeat(80));
console.log('OVERALL COMPARISON');
console.log('='.repeat(80));
console.log(`Case A heuristic connections: ${totalCaseA}`);
console.log(`  Backed by vertex geometry: ${caseAWithVertex} (${(100*caseAWithVertex/totalCaseA).toFixed(1)}%)`);
console.log(`  Heuristic-only (no vertex): ${caseAWithoutVertex}`);
console.log(`Case B heuristic connections: ${totalCaseB}`);
console.log(`  Backed by vertex geometry: ${caseBWithVertex} (${(100*caseBWithVertex/totalCaseB).toFixed(1)}%)`);
console.log(`  Heuristic-only (no vertex): ${caseBWithoutVertex}`);
console.log(`\nTotal heuristic connections: ${totalCaseA + totalCaseB}`);
console.log(`Total backed by vertex geometry: ${caseAWithVertex + caseBWithVertex} (${(100*(caseAWithVertex + caseBWithVertex)/(totalCaseA + totalCaseB)).toFixed(1)}%)`);

// Analysis of bridge-blocked vs vertex-backed
const bridgeBlocked = caseBDetails.filter(d => d.isBridge165);
const bridgeBlockedWithVertex = bridgeBlocked.filter(d => d.hasVertex);
console.log(`\nBridge-blocked pairs (angle>165°): ${bridgeBlocked.length}`);
console.log(`  Of those, have vertex triple junction: ${bridgeBlockedWithVertex.length}`);
console.log(`  => Bridge heuristic is ${bridgeBlockedWithVertex.length > 0 ? 'OVERRIDING' : 'consistent with'} geometry for ${bridgeBlockedWithVertex.length} pairs`);

// By faction
console.log('\nBreakdown by faction:');
for (const faction of factions) {
    const fCaseB = caseBDetails.filter(d => d.faction === faction);
    const fWithVertex = fCaseB.filter(d => d.hasVertex);
    const fNoVertex = fCaseB.filter(d => !d.hasVertex);
    console.log(`  ${faction}: ${fCaseB.length} Case B pairs, ${fWithVertex.length} vertex-backed, ${fNoVertex.length} heuristic-only`);
}
