/**
 * Combined discriminator: f1f2Len + contactSep.
 * For Case B pairs with short F1-F2 boundary, check if the F1-H and F2-H
 * contact zones are far apart.
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
            const p1 = ring[k], p2 = ring[k + 1];
            if (bVertSet.has(p1[0] + ',' + p1[1]) && bVertSet.has(p2[0] + ',' + p2[1])) totalLength += haversinePt(p1, p2);
        }
    }
    blCache.set(key, totalLength);
    return totalLength;
}

function findExactShared(osidA, osidB) {
    const ringsA = polyMap.get(osidA), ringsB = polyMap.get(osidB);
    if (!ringsA || !ringsB) return [];
    const bSet = new Set();
    for (const ring of ringsB) for (const pt of ring) bSet.add(pt[0] + ',' + pt[1]);
    const shared = [];
    for (const ring of ringsA) for (const pt of ring) if (bSet.has(pt[0] + ',' + pt[1])) shared.push(pt);
    return shared;
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

console.log('Computing combined discriminator...');

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

                const f1f2Len = sharedBoundaryLength(fi, fj);
                const f1h = findExactShared(fi, h);
                const f2h = findExactShared(fj, h);
                const f1hC = contactCentroid(f1h);
                const f2hC = contactCentroid(f2h);
                let contactSep = -1;
                if (f1hC && f2hC) contactSep = haversinePt(f1hC, f2hC);

                const isBogus = (h.includes('tosici') || h.includes('ljuta') || h.includes('obalj')) &&
                    (fi.includes('golubici_2') || fj.includes('golubici_2') || fi.includes('sela_2') || fj.includes('sela_2'));

                results.push({
                    faction, f1: fi, f2: fj, h, angle,
                    f1f2Len: Math.round(f1f2Len),
                    contactSep: Math.round(contactSep),
                    isBogus
                });
            }
        }
    }
}

console.log('Total: ' + results.length);

// For pairs with f1f2Len < 1000m, show contactSep distribution
const shortF1F2 = results.filter(r => r.f1f2Len < 1000);
console.log('\nPairs with f1f2Len < 1000m: ' + shortF1F2.length);
shortF1F2.sort((a, b) => a.contactSep - b.contactSep);

for (const r of shortF1F2) {
    const marker = r.isBogus ? '>>>' : '   ';
    console.log(marker + ' f1f2=' + r.f1f2Len + 'm contactSep=' + r.contactSep + 'm | angle=' + r.angle.toFixed(1) +
        ' | ' + r.faction + ' F1=' + r.f1.replace('op:', '') + ' F2=' + r.f2.replace('op:', '') + ' H=' + r.h.replace('op:', ''));
}

// Try various thresholds
console.log('\n\nTHRESHOLD ANALYSIS:');
for (const f1f2Thresh of [500, 750, 1000, 1500, 2000]) {
    for (const sepThresh of [4000, 5000, 5500, 6000, 7000]) {
        const blocked = results.filter(r => r.f1f2Len < f1f2Thresh && r.contactSep > sepThresh);
        const blockedBogus = blocked.filter(r => r.isBogus).length;
        const blockedLegit = blocked.length - blockedBogus;
        if (blockedBogus > 0 || blockedLegit === 0) {
            console.log('  f1f2 < ' + f1f2Thresh + 'm AND contactSep > ' + sepThresh + 'm: blocks ' + blocked.length + ' (' + blockedBogus + ' bogus, ' + blockedLegit + ' legit FP)');
        }
    }
}
