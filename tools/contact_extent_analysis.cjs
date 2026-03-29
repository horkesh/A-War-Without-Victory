/**
 * For each Case B pair, compute contact extent and junction distance metrics.
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

function getVertices(rings) { const verts = []; for (const ring of rings) for (const pt of ring) verts.push(pt); return verts; }

function findExactShared(osidA, osidB) {
    const ringsA = polyMap.get(osidA), ringsB = polyMap.get(osidB);
    if (!ringsA || !ringsB) return [];
    const vertsA = getVertices(ringsA), vertsB = getVertices(ringsB);
    const bSet = new Set(vertsB.map(p => p[0] + ',' + p[1]));
    return vertsA.filter(va => bSet.has(va[0] + ',' + va[1]));
}

function contactExtent(pts) {
    if (pts.length < 2) return 0;
    let maxDist = 0;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const d = haversinePt(pts[i], pts[j]);
            if (d > maxDist) maxDist = d;
        }
    }
    return maxDist;
}

const runsDir = path.join(PROJECT, 'runs');
const dirs = fs.readdirSync(runsDir).filter(d => d.includes('definitive_40w'));
dirs.sort((a, b) => {
    const na = parseInt((a.match(/_n(\d+)$/) || ['', '0'])[1], 10);
    const nb = parseInt((b.match(/_n(\d+)$/) || ['', '0'])[1], 10);
    return nb - na;
});
const savePath = path.join(runsDir, dirs[0], 'final_save.json');
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const root = save.state || save;
const frontEdges = root.military.war_front_edges_osid;
const factions = ['RBiH', 'RS', 'HRHB'];
const results = [];

console.log('Computing contact extents...');

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
                if (!(sharedBoundaryAdj.get(fi) || []).includes(fj)) continue;
                const angle = centroidAngleDeg(fi, fj, h);
                if (angle === null) continue;

                const f1h = findExactShared(fi, h);
                const f2h = findExactShared(fj, h);
                const f1hExt = contactExtent(f1h);
                const f2hExt = contactExtent(f2h);
                const maxExt = Math.max(f1hExt, f2hExt);

                // Find common triple junction vertex
                const f1hSet = new Set(f1h.map(p => p[0] + ',' + p[1]));
                const commonVerts = f2h.filter(p => f1hSet.has(p[0] + ',' + p[1]));

                // Distance from contact zone centroids to nearest common vertex
                let f1hCentroidToJunction = -1, f2hCentroidToJunction = -1;
                if (commonVerts.length > 0 && f1h.length > 0 && f2h.length > 0) {
                    const f1hC = [f1h.reduce((s,p) => s+p[0],0)/f1h.length, f1h.reduce((s,p) => s+p[1],0)/f1h.length];
                    const f2hC = [f2h.reduce((s,p) => s+p[0],0)/f2h.length, f2h.reduce((s,p) => s+p[1],0)/f2h.length];
                    f1hCentroidToJunction = Math.min(...commonVerts.map(cv => haversinePt(f1hC, cv)));
                    f2hCentroidToJunction = Math.min(...commonVerts.map(cv => haversinePt(f2hC, cv)));
                }

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                results.push({
                    faction, f1: fi, f2: fj, h, angle,
                    f1hExt: Math.round(f1hExt), f2hExt: Math.round(f2hExt),
                    maxExt: Math.round(maxExt),
                    commonVerts: commonVerts.length,
                    f1hToJ: Math.round(f1hCentroidToJunction),
                    f2hToJ: Math.round(f2hCentroidToJunction),
                    isBogus
                });
            }
        }
    }
}

console.log('Computed ' + results.length + ' pairs\n');

console.log('--- BOGUS ---');
for (const r of results.filter(r => r.isBogus)) {
    const maxJ = Math.max(r.f1hToJ, r.f2hToJ);
    console.log('  maxJDist=' + maxJ + 'm | angle=' + r.angle.toFixed(1) + ' maxExt=' + r.maxExt + 'm common=' + r.commonVerts + ' f1hToJ=' + r.f1hToJ + 'm f2hToJ=' + r.f2hToJ + 'm | F1=' + r.f1.replace('op:','') + ' F2=' + r.f2.replace('op:','') + ' H=' + r.h.replace('op:',''));
}

// Sort by max junction distance
results.sort((a, b) => {
    const aMax = Math.max(a.f1hToJ, a.f2hToJ);
    const bMax = Math.max(b.f1hToJ, b.f2hToJ);
    return bMax - aMax;
});

console.log('\n--- TOP 40 by max(contact centroid to junction) ---');
for (let i = 0; i < Math.min(40, results.length); i++) {
    const r = results[i];
    const marker = r.isBogus ? '>>>' : '   ';
    const maxJ = Math.max(r.f1hToJ, r.f2hToJ);
    console.log(marker + ' maxJDist=' + maxJ + 'm | angle=' + r.angle.toFixed(1) + ' maxExt=' + r.maxExt + 'm common=' + r.commonVerts + ' | ' + r.faction + ' F1=' + r.f1.replace('op:','') + ' F2=' + r.f2.replace('op:','') + ' H=' + r.h.replace('op:',''));
}

// Pairs with NO common vertex
const noCommon = results.filter(r => r.commonVerts === 0);
console.log('\nPairs with NO common triple-junction vertex: ' + noCommon.length);
for (const r of noCommon.filter(r => r.isBogus)) {
    console.log('  >>> BOGUS: ' + r.f1.replace('op:','') + ' ' + r.f2.replace('op:','') + ' H=' + r.h.replace('op:',''));
}

// Histogram of maxJDist for pairs WITH common vertices
const withCommon = results.filter(r => r.commonVerts > 0);
console.log('\nMaxJDist HISTOGRAM (for ' + withCommon.length + ' pairs with common vertex, 500m buckets):');
const buckets = new Array(30).fill(0);
const bogusBuckets = new Array(30).fill(0);
for (const r of withCommon) {
    const maxJ = Math.max(r.f1hToJ, r.f2hToJ);
    const idx = Math.min(Math.floor(maxJ / 500), 29);
    buckets[idx]++;
    if (r.isBogus) bogusBuckets[idx]++;
}
for (let i = 0; i < 30; i++) {
    if (buckets[i] > 0 || (i > 0 && i < 20 && buckets[i-1] > 0)) {
        const label = (i*500) + '-' + ((i+1)*500) + 'm';
        const bogusNote = bogusBuckets[i] > 0 ? ' (' + bogusBuckets[i] + ' bogus)' : '';
        console.log('  ' + label.padEnd(14) + String(buckets[i]).padStart(4) + bogusNote + ' ' + '#'.repeat(Math.min(buckets[i], 60)));
    }
}

// Gap analysis
const jDists = withCommon.map(r => Math.max(r.f1hToJ, r.f2hToJ)).sort((a, b) => a - b);
console.log('\nMaxJDist GAP ANALYSIS (gaps > 300m):');
for (let i = 1; i < jDists.length; i++) {
    const gap = jDists[i] - jDists[i-1];
    if (gap > 300) {
        console.log('  GAP: ' + jDists[i-1] + 'm -> ' + jDists[i] + 'm (' + gap + 'm wide) below: ' + i + ', above: ' + (jDists.length - i));
    }
}
