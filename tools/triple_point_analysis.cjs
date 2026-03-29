/**
 * For each Case B pair (F1, F2, H): does the F1-F2 boundary actually TOUCH H?
 *
 * A true triple junction means F1, F2, and H all meet at a point.
 * This means: some vertex on the F1-F2 boundary is also on H's boundary.
 *
 * If F1-F2 boundary does NOT touch H, then F1 and F2 are adjacent to each other
 * somewhere else, and each independently touches H at different places.
 * That's a bridge.
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
function haversinePt(p1, p2) { const R = 6371000; const toRad = x => x * Math.PI / 180; const dLat = toRad(p2[1] - p1[1]); const dLon = toRad(p2[0] - p1[0]); const lat1 = toRad(p1[1]), lat2 = toRad(p2[1]); const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
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

console.log('Computing triple point presence...');

// Cache vertex sets
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

                // Get vertex sets
                const vF1 = cachedVertSet(fi);
                const vF2 = cachedVertSet(fj);
                const vH = cachedVertSet(h);

                // Find F1-F2 shared vertices
                const f1f2Shared = [];
                for (const v of vF1) { if (vF2.has(v)) f1f2Shared.push(v); }

                // Check if any F1-F2 shared vertex is also in H
                let triplePointCount = 0;
                for (const v of f1f2Shared) { if (vH.has(v)) triplePointCount++; }

                // Also find F1-H shared that are in F2 (same thing, but from different direction)
                // This should give same count

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                results.push({
                    faction, f1: fi, f2: fj, h, angle,
                    f1f2SharedCount: f1f2Shared.length,
                    triplePointCount,
                    hasTriplePoint: triplePointCount > 0,
                    isBogus
                });
            }
        }
    }
}

console.log('Total: ' + results.length + '\n');

// Count
const withTriple = results.filter(r => r.hasTriplePoint);
const withoutTriple = results.filter(r => !r.hasTriplePoint);
const bogusWithTriple = withTriple.filter(r => r.isBogus);
const bogusWithout = withoutTriple.filter(r => r.isBogus);

console.log('WITH triple point (F1-F2-H vertex): ' + withTriple.length + ' pairs (' + bogusWithTriple.length + ' bogus)');
console.log('WITHOUT triple point: ' + withoutTriple.length + ' pairs (' + bogusWithout.length + ' bogus)');

console.log('\n--- BOGUS (detail) ---');
for (const r of results.filter(r => r.isBogus)) {
    console.log('  triple=' + r.hasTriplePoint + ' (count=' + r.triplePointCount + ') f1f2shared=' + r.f1f2SharedCount +
        ' | angle=' + r.angle.toFixed(1) + ' | F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

console.log('\n--- WITHOUT triple point (first 30) ---');
for (let i = 0; i < Math.min(30, withoutTriple.length); i++) {
    const r = withoutTriple[i];
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' angle=' + r.angle.toFixed(1) + ' f1f2shared=' + r.f1f2SharedCount +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}
