/**
 * For each Case B pair, compute the distance from the F1-F2 shared boundary centroid
 * to the F1-H and F2-H shared boundary centroids. High distance means F1-F2 boundary
 * is far from where they each touch H = bridge.
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
function getVertices(rings) { const verts = []; for (const ring of rings) for (const pt of ring) verts.push(pt); return verts; }

function findExactShared(osidA, osidB) {
    const ringsA = polyMap.get(osidA), ringsB = polyMap.get(osidB);
    if (!ringsA || !ringsB) return [];
    const vertsA = getVertices(ringsA), vertsB = getVertices(ringsB);
    const bSet = new Set(vertsB.map(p => p[0] + ',' + p[1]));
    return vertsA.filter(va => bSet.has(va[0] + ',' + va[1]));
}

function contactCentroid(pts) {
    if (pts.length === 0) return null;
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
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

console.log('Computing junction distances...');

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
                const f1f2 = findExactShared(fi, fj);

                const f1hC = contactCentroid(f1h);
                const f2hC = contactCentroid(f2h);
                const f1f2C = contactCentroid(f1f2);

                let f1f2ToF1H = -1, f1f2ToF2H = -1, contactSep = -1;
                if (f1f2C && f1hC) f1f2ToF1H = haversinePt(f1f2C, f1hC);
                if (f1f2C && f2hC) f1f2ToF2H = haversinePt(f1f2C, f2hC);
                if (f1hC && f2hC) contactSep = haversinePt(f1hC, f2hC);

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                results.push({
                    faction, f1: fi, f2: fj, h, angle,
                    contactSep: Math.round(contactSep),
                    f1f2ToF1H: Math.round(f1f2ToF1H),
                    f1f2ToF2H: Math.round(f1f2ToF2H),
                    f1hCount: f1h.length, f2hCount: f2h.length, f1f2Count: f1f2.length,
                    isBogus
                });
            }
        }
    }
}

const validResults = results.filter(r => r.f1f2ToF1H >= 0 && r.f1f2ToF2H >= 0);
console.log('Total: ' + results.length + ', with valid F1-F2 boundary: ' + validResults.length + '\n');

console.log('--- BOGUS ---');
for (const r of results.filter(r => r.isBogus)) {
    const maxD = Math.max(r.f1f2ToF1H, r.f1f2ToF2H);
    console.log('  maxD=' + maxD + 'm | contactSep=' + r.contactSep + 'm | f1f2ToF1H=' + r.f1f2ToF1H + ' f1f2ToF2H=' + r.f1f2ToF2H + ' | f1h=' + r.f1hCount + ' f2h=' + r.f2hCount + ' f1f2=' + r.f1f2Count +
        ' | F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Sort valid results by maxD descending
validResults.sort((a, b) => {
    return Math.max(b.f1f2ToF1H, b.f1f2ToF2H) - Math.max(a.f1f2ToF1H, a.f1f2ToF2H);
});

console.log('\n--- TOP 40 by max(f1f2-to-F1H, f1f2-to-F2H) ---');
for (let i = 0; i < Math.min(40, validResults.length); i++) {
    const r = validResults[i];
    const marker = r.isBogus ? '>>>' : '   ';
    const maxD = Math.max(r.f1f2ToF1H, r.f1f2ToF2H);
    console.log(marker + ' maxD=' + maxD + 'm | contactSep=' + r.contactSep + 'm angle=' + r.angle.toFixed(1) + ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Histogram
const maxDs = validResults.map(r => Math.max(r.f1f2ToF1H, r.f1f2ToF2H));
console.log('\nHistogram of maxD (1km buckets), ' + validResults.length + ' pairs:');
const buckets = new Array(20).fill(0);
const bogusBuckets = new Array(20).fill(0);
for (let k = 0; k < validResults.length; k++) {
    const idx = Math.min(Math.floor(maxDs[k] / 1000), 19);
    buckets[idx]++;
    if (validResults[k].isBogus) bogusBuckets[idx]++;
}
for (let i = 0; i < 20; i++) {
    if (buckets[i] > 0 || (i > 0 && i < 15 && buckets[i - 1] > 0)) {
        const label = i + '-' + (i + 1) + 'km';
        const bogusNote = bogusBuckets[i] > 0 ? ' (' + bogusBuckets[i] + ' bogus)' : '';
        console.log('  ' + label.padEnd(10) + String(buckets[i]).padStart(4) + bogusNote + ' ' + '#'.repeat(Math.min(buckets[i], 60)));
    }
}

// Gap analysis
const sortedDs = [...maxDs].sort((a, b) => a - b);
console.log('\nGap analysis (gaps > 400m):');
for (let i = 1; i < sortedDs.length; i++) {
    const gap = sortedDs[i] - sortedDs[i - 1];
    if (gap > 400) {
        console.log('  GAP: ' + sortedDs[i - 1] + 'm -> ' + sortedDs[i] + 'm (' + gap + 'm) items_below: ' + i + '/' + sortedDs.length);
    }
}

// Now try: the "invalid" ones with f1f2Count=0 (no shared exact vertices between F1 and F2)
const noF1F2 = results.filter(r => r.f1f2Count === 0);
console.log('\n\nPairs with NO exact F1-F2 shared vertices: ' + noF1F2.length);
const bogusNoF1F2 = noF1F2.filter(r => r.isBogus);
console.log('Of which bogus: ' + bogusNoF1F2.length);
// For these, we can still use contactSep (F1-H vs F2-H centroid distance)
console.log('For these, contactSep distribution:');
const sepBuckets = new Array(20).fill(0);
const sepBogus = new Array(20).fill(0);
for (const r of noF1F2) {
    if (r.contactSep < 0) continue;
    const idx = Math.min(Math.floor(r.contactSep / 1000), 19);
    sepBuckets[idx]++;
    if (r.isBogus) sepBogus[idx]++;
}
for (let i = 0; i < 20; i++) {
    if (sepBuckets[i] > 0) {
        const label = i + '-' + (i + 1) + 'km';
        const bogusNote = sepBogus[i] > 0 ? ' (' + sepBogus[i] + ' bogus)' : '';
        console.log('  ' + label.padEnd(10) + String(sepBuckets[i]).padStart(4) + bogusNote);
    }
}
