/**
 * For each Case B pair WITH a triple point: what's the ratio of
 * triplePointCount to f1f2SharedCount?
 * If ratio is high (close to 1.0), F1 and F2 only share boundary AT the triple point.
 * If ratio is low, F1-F2 boundary extends beyond the triple point = legitimate.
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
function centroidAngleDeg(fi, fj, h) { const cFi = centroids.get(fi), cFj = centroids.get(fj), cH = centroids.get(h); if (!cFi || !cFj || !cH) return null; const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon }; const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon }; const a1 = Math.atan2(v1.lat, v1.lon), a2 = Math.atan2(v2.lat, v2.lon); let diff = Math.abs(a1 - a2); if (diff > Math.PI) diff = 2 * Math.PI - diff; return (diff * 180) / Math.PI; }

function getVertSet(osid) {
    const rings = polyMap.get(osid);
    if (!rings) return new Set();
    const s = new Set();
    for (const ring of rings) for (const pt of ring) s.add(pt[0] + ',' + pt[1]);
    return s;
}

const runsDir = path.join(PROJECT, 'runs');
const dirs = fs.readdirSync(runsDir).filter(d => d.includes('definitive_40w'));
dirs.sort((a, b) => { const na = parseInt((a.match(/_n(\d+)$/) || ['', '0'])[1], 10); const nb = parseInt((b.match(/_n(\d+)$/) || ['', '0'])[1], 10); return nb - na; });
const savePath = path.join(runsDir, dirs[0], 'final_save.json');
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const root = save.state || save;
const frontEdges = root.military.war_front_edges_osid;
const factions = ['RBiH', 'RS', 'HRHB'];
const results = [];

console.log('Computing triple point ratios...');

const vertSetCache = new Map();
function cachedVertSet(osid) {
    if (!vertSetCache.has(osid)) vertSetCache.set(osid, getVertSet(osid));
    return vertSetCache.get(osid);
}

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

                const vF1 = cachedVertSet(fi);
                const vF2 = cachedVertSet(fj);
                const vH = cachedVertSet(h);

                let f1f2Count = 0;
                let tripleCount = 0;
                const f1f2NonTriple = [];
                for (const v of vF1) {
                    if (vF2.has(v)) {
                        f1f2Count++;
                        if (vH.has(v)) tripleCount++;
                        else f1f2NonTriple.push(v);
                    }
                }

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                if (tripleCount > 0) {
                    results.push({
                        faction, f1: fi, f2: fj, h, angle,
                        f1f2Count,
                        tripleCount,
                        nonTripleF1F2: f1f2Count - tripleCount,
                        ratio: tripleCount / f1f2Count,
                        isBogus
                    });
                }
            }
        }
    }
}

console.log('Triple-point pairs: ' + results.length + '\n');

// Sort by nonTripleF1F2 ascending (least non-triple shared vertices first)
results.sort((a, b) => a.nonTripleF1F2 - b.nonTripleF1F2 || a.f1f2Count - b.f1f2Count);

console.log('--- BOGUS ---');
for (const r of results.filter(r => r.isBogus)) {
    console.log('  nonTriple=' + r.nonTripleF1F2 + ' f1f2=' + r.f1f2Count + ' triple=' + r.tripleCount + ' ratio=' + r.ratio.toFixed(3) +
        ' | angle=' + r.angle.toFixed(1) + ' | F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Distribution of nonTripleF1F2
console.log('\nDistribution of nonTripleF1F2 (F1-F2 shared verts NOT on H):');
const distrib = {};
const bogusDistrib = {};
for (const r of results) {
    const key = r.nonTripleF1F2;
    distrib[key] = (distrib[key] || 0) + 1;
    if (r.isBogus) bogusDistrib[key] = (bogusDistrib[key] || 0) + 1;
}
const keys = Object.keys(distrib).map(Number).sort((a, b) => a - b);
for (const k of keys) {
    const bogusNote = bogusDistrib[k] ? ' (' + bogusDistrib[k] + ' bogus)' : '';
    console.log('  nonTriple=' + k + ': ' + distrib[k] + ' pairs' + bogusNote);
}

// Show all pairs with nonTripleF1F2 = 0
console.log('\n--- ALL with nonTripleF1F2 = 0 (F1-F2 boundary ONLY at triple point) ---');
for (const r of results.filter(r => r.nonTripleF1F2 === 0)) {
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' f1f2=' + r.f1f2Count + ' triple=' + r.tripleCount + ' | angle=' + r.angle.toFixed(1) +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Show all with nonTripleF1F2 = 1 or 2
console.log('\n--- ALL with nonTripleF1F2 = 1-2 ---');
for (const r of results.filter(r => r.nonTripleF1F2 >= 1 && r.nonTripleF1F2 <= 2)) {
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' nonTriple=' + r.nonTripleF1F2 + ' f1f2=' + r.f1f2Count + ' triple=' + r.tripleCount + ' | angle=' + r.angle.toFixed(1) +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}
