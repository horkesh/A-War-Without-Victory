/**
 * For each Case B pair, compute shared boundary lengths:
 * - F1-H boundary length
 * - F2-H boundary length
 * - F1-F2 boundary length
 * - min(F1-H, F2-H) as the gating metric
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

// Cache boundary lengths
const blCache = new Map();
function sharedBoundaryLength(osidA, osidB) {
    const key = osidA < osidB ? osidA + '__' + osidB : osidB + '__' + osidA;
    if (blCache.has(key)) return blCache.get(key);

    const ringsA = polyMap.get(osidA), ringsB = polyMap.get(osidB);
    if (!ringsA || !ringsB) { blCache.set(key, 0); return 0; }

    const bVertSet = new Set();
    for (const ring of ringsB) for (const pt of ring) bVertSet.add(pt[0] + ',' + pt[1]);

    let totalLength = 0;
    for (const ring of ringsA) {
        for (let k = 0; k < ring.length - 1; k++) {
            const p1 = ring[k];
            const p2 = ring[k + 1];
            if (bVertSet.has(p1[0] + ',' + p1[1]) && bVertSet.has(p2[0] + ',' + p2[1])) {
                totalLength += haversinePt(p1, p2);
            }
        }
    }
    blCache.set(key, totalLength);
    return totalLength;
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

console.log('Computing shared boundary lengths...');

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

                const f1hLen = sharedBoundaryLength(fi, h);
                const f2hLen = sharedBoundaryLength(fj, h);
                const f1f2Len = sharedBoundaryLength(fi, fj);
                const minFH = Math.min(f1hLen, f2hLen);

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                results.push({
                    faction, f1: fi, f2: fj, h, angle,
                    f1hLen: Math.round(f1hLen),
                    f2hLen: Math.round(f2hLen),
                    f1f2Len: Math.round(f1f2Len),
                    minFH: Math.round(minFH),
                    isBogus
                });
            }
        }
    }
}

console.log('Computed ' + results.length + ' pairs\n');

console.log('--- BOGUS ---');
for (const r of results.filter(r => r.isBogus)) {
    console.log('  minFH=' + r.minFH + 'm | f1h=' + r.f1hLen + 'm f2h=' + r.f2hLen + 'm f1f2=' + r.f1f2Len + 'm | angle=' + r.angle.toFixed(1) +
        ' | F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Sort by minFH
results.sort((a, b) => a.minFH - b.minFH);

console.log('\n--- BOTTOM 40 by min(F1-H, F2-H) boundary length ---');
for (let i = 0; i < Math.min(40, results.length); i++) {
    const r = results[i];
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' minFH=' + r.minFH + 'm | f1h=' + r.f1hLen + ' f2h=' + r.f2hLen + ' f1f2=' + r.f1f2Len + ' | angle=' + r.angle.toFixed(1) +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Also sort by f1f2Len
results.sort((a, b) => a.f1f2Len - b.f1f2Len);
console.log('\n--- BOTTOM 40 by F1-F2 boundary length ---');
for (let i = 0; i < Math.min(40, results.length); i++) {
    const r = results[i];
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' f1f2=' + r.f1f2Len + 'm | minFH=' + r.minFH + ' | angle=' + r.angle.toFixed(1) +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Histogram of minFH
console.log('\nHistogram of min(F1-H, F2-H) boundary length (500m buckets):');
const buckets = new Array(30).fill(0);
const bogusBuckets = new Array(30).fill(0);
for (const r of results) {
    const idx = Math.min(Math.floor(r.minFH / 500), 29);
    buckets[idx]++;
    if (r.isBogus) bogusBuckets[idx]++;
}
for (let i = 0; i < 30; i++) {
    if (buckets[i] > 0 || (i > 0 && i < 20 && buckets[i - 1] > 0)) {
        const label = (i * 500) + '-' + ((i + 1) * 500) + 'm';
        const bogusNote = bogusBuckets[i] > 0 ? ' (' + bogusBuckets[i] + ' bogus)' : '';
        console.log('  ' + label.padEnd(14) + String(buckets[i]).padStart(4) + bogusNote + ' ' + '#'.repeat(Math.min(buckets[i], 60)));
    }
}

// Gap analysis for minFH
const minFHs = results.map(r => r.minFH).sort((a, b) => a - b);
console.log('\nGap analysis for min(F1-H, F2-H) (gaps > 200m):');
for (let i = 1; i < minFHs.length; i++) {
    const gap = minFHs[i] - minFHs[i - 1];
    if (gap > 200) {
        console.log('  GAP: ' + minFHs[i - 1] + 'm -> ' + minFHs[i] + 'm (' + gap + 'm) below: ' + i + '/' + minFHs.length);
    }
}

// Histogram of f1f2Len
console.log('\nHistogram of F1-F2 boundary length (500m buckets):');
const f1f2Buckets = new Array(30).fill(0);
const f1f2Bogus = new Array(30).fill(0);
for (const r of results) {
    const idx = Math.min(Math.floor(r.f1f2Len / 500), 29);
    f1f2Buckets[idx]++;
    if (r.isBogus) f1f2Bogus[idx]++;
}
for (let i = 0; i < 30; i++) {
    if (f1f2Buckets[i] > 0 || (i > 0 && i < 20 && f1f2Buckets[i - 1] > 0)) {
        const label = (i * 500) + '-' + ((i + 1) * 500) + 'm';
        const bogusNote = f1f2Bogus[i] > 0 ? ' (' + f1f2Bogus[i] + ' bogus)' : '';
        console.log('  ' + label.padEnd(14) + String(f1f2Buckets[i]).padStart(4) + bogusNote + ' ' + '#'.repeat(Math.min(f1f2Buckets[i], 60)));
    }
}

// Gap analysis for f1f2Len
const f1f2Lens = results.map(r => r.f1f2Len).sort((a, b) => a - b);
console.log('\nGap analysis for F1-F2 boundary length (gaps > 200m):');
for (let i = 1; i < f1f2Lens.length; i++) {
    const gap = f1f2Lens[i] - f1f2Lens[i - 1];
    if (gap > 200) {
        console.log('  GAP: ' + f1f2Lens[i - 1] + 'm -> ' + f1f2Lens[i] + 'm (' + gap + 'm) below: ' + i + '/' + f1f2Lens.length);
    }
}
