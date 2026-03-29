/**
 * Compute contact zone distances for ALL Case B pairs.
 * For each (F1, F2, H), find where F1 touches H and where F2 touches H
 * on the polygon boundary, then measure the distance between those zones.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const PROJECT = path.resolve(__dirname, '..');

const geojson = JSON.parse(fs.readFileSync(path.join(PROJECT, 'data/derived/operational/operational_settlements.geojson'), 'utf8'));
const graph = JSON.parse(fs.readFileSync(path.join(PROJECT, 'data/derived/operational/operational_contact_graph.json'), 'utf8'));

const polyMap = new Map();
for (const f of geojson.features) {
    const osid = f.properties.osid;
    const geom = f.geometry;
    let rings;
    if (geom.type === 'Polygon') rings = geom.coordinates;
    else if (geom.type === 'MultiPolygon') rings = geom.coordinates.flat();
    polyMap.set(osid, rings);
}

const centroids = new Map();
for (const node of graph.nodes) centroids.set(node.id, { lat: node.lat, lon: node.lon });
const sharedBoundaryAdj = new Map();
function addAdj(map, a, b) { let list = map.get(a); if (!list) { list = []; map.set(a, list); } if (!list.includes(b)) list.push(b); }
for (const edge of graph.edges) { if (edge.min_dist === 0) { addAdj(sharedBoundaryAdj, edge.a, edge.b); addAdj(sharedBoundaryAdj, edge.b, edge.a); } }

function haversinePt(p1, p2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(p2[1] - p1[1]);
    const dLon = toRad(p2[0] - p1[0]);
    const lat1 = toRad(p1[1]), lat2 = toRad(p2[1]);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function centroidAngleDeg(fi, fj, h) {
    const cFi = centroids.get(fi), cFj = centroids.get(fj), cH = centroids.get(h);
    if (!cFi || !cFj || !cH) return null;
    const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon };
    const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon };
    const a1 = Math.atan2(v1.lat, v1.lon), a2 = Math.atan2(v2.lat, v2.lon);
    let diff = Math.abs(a1 - a2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return (diff * 180) / Math.PI;
}

function getVertices(rings) {
    const verts = [];
    for (const ring of rings) for (const pt of ring) verts.push(pt);
    return verts;
}

function findSharedBoundaryFast(osidA, osidB) {
    const ringsA = polyMap.get(osidA);
    const ringsB = polyMap.get(osidB);
    if (!ringsA || !ringsB) return [];
    const vertsA = getVertices(ringsA);
    const vertsB = getVertices(ringsB);

    const GRID = 0.001;
    const gridB = new Map();
    for (const vb of vertsB) {
        const key = Math.floor(vb[0] / GRID) + ',' + Math.floor(vb[1] / GRID);
        let list = gridB.get(key);
        if (!list) { list = []; gridB.set(key, list); }
        list.push(vb);
    }

    const EPSILON = 50;
    const shared = [];
    for (const va of vertsA) {
        const gx = Math.floor(va[0] / GRID);
        const gy = Math.floor(va[1] / GRID);
        let found = false;
        for (let dx = -1; dx <= 1 && !found; dx++) {
            for (let dy = -1; dy <= 1 && !found; dy++) {
                const nbrs = gridB.get((gx + dx) + ',' + (gy + dy));
                if (!nbrs) continue;
                for (const vb of nbrs) {
                    if (haversinePt(va, vb) < EPSILON) { shared.push(va); found = true; break; }
                }
            }
        }
    }
    return shared;
}

function contactZoneDistance(f1, f2, h) {
    const f1h = findSharedBoundaryFast(f1, h);
    const f2h = findSharedBoundaryFast(f2, h);
    if (f1h.length === 0 || f2h.length === 0) return { contactDist: -1, minDist: -1, f1hCount: f1h.length, f2hCount: f2h.length };

    const f1hC = [f1h.reduce((s, p) => s + p[0], 0) / f1h.length, f1h.reduce((s, p) => s + p[1], 0) / f1h.length];
    const f2hC = [f2h.reduce((s, p) => s + p[0], 0) / f2h.length, f2h.reduce((s, p) => s + p[1], 0) / f2h.length];
    const contactDist = haversinePt(f1hC, f2hC);

    let minDist = Infinity;
    for (const p1 of f1h) { for (const p2 of f2h) { const d = haversinePt(p1, p2); if (d < minDist) minDist = d; } }

    return { contactDist: Math.round(contactDist), minDist: Math.round(minDist), f1hCount: f1h.length, f2hCount: f2h.length };
}

// Load save
const runsDir = path.join(PROJECT, 'runs');
const dirs = fs.readdirSync(runsDir).filter(d => d.includes('definitive_40w'));
dirs.sort((a, b) => {
    const na = parseInt((a.match(/_n(\d+)$/) || ['', '0'])[1], 10);
    const nb = parseInt((b.match(/_n(\d+)$/) || ['', '0'])[1], 10);
    return nb - na;
});
const savePath = path.join(runsDir, dirs[0], 'final_save.json');
console.log('Loading save:', path.relative(PROJECT, savePath));

const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const root = save.state || save;
const frontEdges = root.military.war_front_edges_osid;
const factions = ['RBiH', 'RS', 'HRHB'];
const results = [];

console.log('Computing contact zones for all Case B pairs...');

for (const faction of factions) {
    const hostileToEdges = new Map();
    for (const fe of frontEdges) {
        let friendly, hostile;
        if (fe.side_a === faction) { friendly = fe.a; hostile = fe.b; }
        else if (fe.side_b === faction) { friendly = fe.b; hostile = fe.a; }
        else continue;
        let list = hostileToEdges.get(hostile);
        if (!list) { list = []; hostileToEdges.set(hostile, list); }
        list.push({ friendly, hostile });
    }
    for (const [h, edges] of hostileToEdges.entries()) {
        if (edges.length < 2) continue;
        for (let i = 0; i < edges.length; i++) {
            const fi = edges[i].friendly;
            for (let j = i + 1; j < edges.length; j++) {
                const fj = edges[j].friendly;
                if (fi === fj) continue;
                const isAdj = (sharedBoundaryAdj.get(fi) || []).includes(fj);
                if (!isAdj) continue;
                const angle = centroidAngleDeg(fi, fj, h);
                if (angle === null) continue;
                const cz = contactZoneDistance(fi, fj, h);
                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));
                results.push({ faction, f1: fi, f2: fj, h, angle, contactDist: cz.contactDist, minDist: cz.minDist, isBogus });
            }
        }
    }
}

console.log(`Computed ${results.length} Case B pairs\n`);

// Sort by minDist
results.sort((a, b) => a.minDist - b.minDist);

// Show bogus
console.log('--- BOGUS BRIDGES ---');
for (const r of results.filter(r => r.isBogus)) {
    console.log(`  minDist=${r.minDist}m contactDist=${r.contactDist}m | angle=${r.angle.toFixed(1)} | ` +
        `F1=${r.f1.replace('op:', '')} F2=${r.f2.replace('op:', '')} H=${r.h.replace('op:', '')}`);
}

// Histogram of minDist (the minimum distance between any F1-H contact vertex and any F2-H contact vertex)
console.log('\nMIN CONTACT POINT DISTANCE HISTOGRAM (500m buckets):');
const buckets = new Array(30).fill(0);
const bogusBuckets = new Array(30).fill(0);
for (const r of results) {
    if (r.minDist < 0) continue;
    const idx = Math.min(Math.floor(r.minDist / 500), 29);
    buckets[idx]++;
    if (r.isBogus) bogusBuckets[idx]++;
}
for (let i = 0; i < 30; i++) {
    if (buckets[i] > 0 || (i > 0 && i < 25 && buckets[i - 1] > 0)) {
        const label = `${i * 500}-${(i + 1) * 500}m`;
        const bogusNote = bogusBuckets[i] > 0 ? ` (${bogusBuckets[i]} bogus)` : '';
        console.log(`  ${label.padEnd(14)} ${String(buckets[i]).padStart(4)}${bogusNote} ${'#'.repeat(Math.min(buckets[i], 60))}`);
    }
}

// Gap analysis on minDist
const minDists = results.filter(r => r.minDist >= 0).map(r => r.minDist).sort((a, b) => a - b);
console.log('\nMIN CONTACT DISTANCE GAP ANALYSIS (gaps > 200m):');
for (let i = 1; i < minDists.length; i++) {
    const gap = minDists[i] - minDists[i - 1];
    if (gap > 200) {
        console.log(`  GAP: ${minDists[i - 1]}m -> ${minDists[i]}m (${gap}m wide) items below: ${i}, above: ${minDists.length - i}`);
    }
}

// Contact zone centroid distance histogram
console.log('\nCONTACT ZONE CENTROID DISTANCE HISTOGRAM (1km buckets):');
const cbuckets = new Array(20).fill(0);
const cbogusBuckets = new Array(20).fill(0);
for (const r of results) {
    if (r.contactDist < 0) continue;
    const idx = Math.min(Math.floor(r.contactDist / 1000), 19);
    cbuckets[idx]++;
    if (r.isBogus) cbogusBuckets[idx]++;
}
for (let i = 0; i < 20; i++) {
    if (cbuckets[i] > 0 || (i > 0 && i < 15 && cbuckets[i - 1] > 0)) {
        const label = `${i}-${i + 1}km`;
        const bogusNote = cbogusBuckets[i] > 0 ? ` (${cbogusBuckets[i]} bogus)` : '';
        console.log(`  ${label.padEnd(10)} ${String(cbuckets[i]).padStart(4)}${bogusNote} ${'#'.repeat(Math.min(cbuckets[i], 60))}`);
    }
}

// Show all pairs with minDist > 3000m
console.log('\n--- ALL pairs with minDist > 3000m ---');
results.sort((a, b) => a.minDist - b.minDist);
for (const r of results.filter(r => r.minDist > 3000)) {
    const marker = r.isBogus ? '>>> ' : '    ';
    console.log(`${marker}minDist=${r.minDist}m contactDist=${r.contactDist}m | angle=${r.angle.toFixed(1)} | ` +
        `${r.faction} F1=${r.f1.replace('op:', '')} F2=${r.f2.replace('op:', '')} H=${r.h.replace('op:', '')}`);
}
