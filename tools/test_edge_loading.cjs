// Test that loadOperationalEdges returns shared_segments
const { resolve } = require('path');
const { readFileSync } = require('fs');

const graphPath = resolve(process.cwd(), 'data/derived/operational/operational_contact_graph.json');
const raw = JSON.parse(readFileSync(graphPath, 'utf8'));

// Simulate parseEdges exactly as settlements.ts does
const edgesArray = Array.isArray(raw) ? raw : (raw.edges || []);
const edges = edgesArray.map(item => {
    const edge = { a: item.a, b: item.b };
    if (typeof item.one_way === 'boolean') edge.one_way = item.one_way;
    if (typeof item.allow_self_loop === 'boolean') edge.allow_self_loop = item.allow_self_loop;
    if (typeof item.type === 'string') edge.type = item.type;
    if (typeof item.min_dist === 'number') edge.min_dist = item.min_dist;
    if (typeof item.shared_segments === 'number') edge.shared_segments = item.shared_segments;
    return edge;
});

// Simulate buildSharedBoundaryAdjacency
const THRESHOLD = 0.00005;
let included = 0, skippedDist = 0, skippedSeg = 0;
for (const e of edges) {
    if (!e.a || !e.b) continue;
    if (e.min_dist !== undefined && e.min_dist > THRESHOLD) { skippedDist++; continue; }
    if (e.shared_segments !== undefined && e.shared_segments === 0) { skippedSeg++; continue; }
    included++;
}
console.log('Edges total:', edges.length);
console.log('Included in sharedBoundaryAdj:', included);
console.log('Skipped by min_dist:', skippedDist);
console.log('Skipped by shared_segments=0:', skippedSeg);

// Check sela-golub
const sg = edges.find(e => e.a === 'op:kalinovik:golubici_2' && e.b === 'op:kalinovik:sela_2');
console.log('\nsela-golub edge:', JSON.stringify(sg));
console.log('Would be skipped:', sg && sg.shared_segments === 0 ? 'YES' : 'NO');
