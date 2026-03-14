/**
 * Trace the exact edge-to-edge connectivity in sector:arbih_2nd_corps:23
 * to find the spurious bridge that connects disconnected front segments.
 */
const save = require('../data/derived/latest_run_final_save.json');
const graph = require('../data/derived/operational/operational_contact_graph.json');
const ctrl = save.political.political_controllers;

// Build full adjacency and shared boundary adjacency
const fullAdj = new Map();
const sharedBoundaryAdj = new Map();
const SHARED_BOUNDARY_THRESHOLD = 0.00005;

for (const e of graph.edges) {
  if (!fullAdj.has(e.a)) fullAdj.set(e.a, []);
  if (!fullAdj.has(e.b)) fullAdj.set(e.b, []);
  fullAdj.get(e.a).push(e.b);
  fullAdj.get(e.b).push(e.a);

  // Shared boundary = actual polygon boundary (not distance contacts)
  if (e.type !== 'distance_contact' || (e.min_dist !== undefined && e.min_dist <= SHARED_BOUNDARY_THRESHOLD)) {
    if (!sharedBoundaryAdj.has(e.a)) sharedBoundaryAdj.set(e.a, []);
    if (!sharedBoundaryAdj.has(e.b)) sharedBoundaryAdj.set(e.b, []);
    sharedBoundaryAdj.get(e.a).push(e.b);
    sharedBoundaryAdj.get(e.b).push(e.a);
  }
}

const sector = save.military.corps_front_sectors['sector:arbih_2nd_corps:23'];
if (!sector) { console.log('Sector not found!'); process.exit(1); }

const faction = 'RBiH';

// Parse edges into friendly/hostile
const edges = [];
for (const eid of sector.edge_ids) {
  const sep = eid.indexOf('__');
  if (sep < 0) continue;
  const a = eid.slice(0, sep);
  const b = eid.slice(sep + 2);
  const friendly = ctrl[a] === faction ? a : b;
  const hostile = ctrl[a] === faction ? b : a;
  edges.push({ eid, friendly, hostile });
}

// Build edge adjacency using Case A and Case B (exactly as the engine does)
function isAdj(x, y, adjMap) {
  return (adjMap.get(x) || []).includes(y);
}

function buildEdgeAdj(edgeList, adjMap, label) {
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };

  const connections = [];

  // Case A: same friendly, hostile OSIDs adjacent
  for (let i = 0; i < edgeList.length; i++) {
    for (let j = i + 1; j < edgeList.length; j++) {
      const ei = edgeList[i];
      const ej = edgeList[j];
      if (ei.friendly === ej.friendly && isAdj(ei.hostile, ej.hostile, adjMap)) {
        link(ei.eid, ej.eid);
        connections.push({
          type: 'Case A',
          e1: ei.eid, e2: ej.eid,
          shared: `friendly=${ei.friendly}`,
          linked: `hostile ${ei.hostile} adj ${ej.hostile}`,
        });
      }
      if (ei.hostile === ej.hostile && isAdj(ei.friendly, ej.friendly, adjMap)) {
        link(ei.eid, ej.eid);
        connections.push({
          type: 'Case B',
          e1: ei.eid, e2: ej.eid,
          shared: `hostile=${ei.hostile}`,
          linked: `friendly ${ei.friendly} adj ${ej.friendly}`,
        });
      }
    }
  }

  return { adj, connections };
}

// Build with FULL adjacency (what the engine currently uses)
const fullResult = buildEdgeAdj(edges, fullAdj, 'full');
// Build with SHARED BOUNDARY adjacency (stricter)
const strictResult = buildEdgeAdj(edges, sharedBoundaryAdj, 'strict');

// Find connected components
function findComponents(edgeList, adjMap) {
  const visited = new Set();
  const components = [];
  for (const e of edgeList) {
    if (visited.has(e.eid)) continue;
    const comp = [];
    const queue = [e.eid];
    visited.add(e.eid);
    while (queue.length > 0) {
      const cur = queue.shift();
      comp.push(cur);
      for (const nb of (adjMap.get(cur) || [])) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

console.log('=== EDGE CONNECTIVITY (FULL osidAdjacency) ===\n');
const fullComps = findComponents(edges, fullResult.adj);
console.log(`Components: ${fullComps.length}`);
for (let i = 0; i < fullComps.length; i++) {
  console.log(`  Component ${i}: ${fullComps[i].length} edges`);
  for (const eid of fullComps[i]) {
    const e = edges.find(x => x.eid === eid);
    console.log(`    ${eid}  (friendly=${e.friendly}, hostile=${e.hostile})`);
  }
}

console.log('\n=== EDGE CONNECTIVITY (SHARED BOUNDARY ONLY) ===\n');
const strictComps = findComponents(edges, strictResult.adj);
console.log(`Components: ${strictComps.length}`);
for (let i = 0; i < strictComps.length; i++) {
  console.log(`  Component ${i}: ${strictComps[i].length} edges`);
  for (const eid of strictComps[i]) {
    const e = edges.find(x => x.eid === eid);
    console.log(`    ${eid}  (friendly=${e.friendly}, hostile=${e.hostile})`);
  }
}

// Show ALL Case A connections at hajderovici_2 — the suspected bridge
console.log('\n=== CASE A CONNECTIONS AT hajderovici_2 (full adj) ===\n');
for (const c of fullResult.connections) {
  if (c.type === 'Case A' && c.shared.includes('hajderovici_2')) {
    console.log(`  ${c.e1}`);
    console.log(`  ${c.e2}`);
    console.log(`  ${c.shared} — ${c.linked}`);
    // Check if this connection ALSO exists in strict adj
    const inStrict = strictResult.connections.some(sc =>
      sc.type === c.type && ((sc.e1 === c.e1 && sc.e2 === c.e2) || (sc.e1 === c.e2 && sc.e2 === c.e1)));
    console.log(`  In strict (shared boundary)? ${inStrict ? 'YES' : '*** NO — spurious bridge ***'}`);
    console.log();
  }
}

// Show ALL Case B connections at kamensko_2
console.log('=== CASE B CONNECTIONS AT kamensko_2 (full adj) ===\n');
for (const c of fullResult.connections) {
  if (c.type === 'Case B' && c.shared.includes('kamensko_2')) {
    const inStrict = strictResult.connections.some(sc =>
      sc.type === c.type && ((sc.e1 === c.e1 && sc.e2 === c.e2) || (sc.e1 === c.e2 && sc.e2 === c.e1)));
    console.log(`  ${c.e1}`);
    console.log(`  ${c.e2}`);
    console.log(`  ${c.shared} — ${c.linked}`);
    console.log(`  In strict? ${inStrict ? 'YES' : '*** NO — spurious bridge ***'}`);
    console.log();
  }
}

// Check the specific adjacencies
console.log('=== KEY ADJACENCY CHECKS ===\n');
const checks = [
  ['op:kakanj:vukanovici', 'op:olovo:kamensko_2'],
  ['op:kakanj:vukanovici', 'op:vares:gornja_borovica_2'],
  ['op:olovo:kamensko_2', 'op:vares:gornja_borovica_2'],
  ['op:zavidovici:hajderovici_2', 'op:kakanj:brnjic_2'],
  ['op:zavidovici:ribnica_dio', 'op:banovici:repnik_2'],
];

for (const [a, b] of checks) {
  const inFull = isAdj(a, b, fullAdj);
  const inStrict = isAdj(a, b, sharedBoundaryAdj);
  // Find the edge type
  const edgeData = graph.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  console.log(`  ${a} <-> ${b}`);
  console.log(`    full: ${inFull}, strict: ${inStrict}, edge_type: ${edgeData ? edgeData.type : 'none'}, min_dist: ${edgeData ? edgeData.min_dist : 'N/A'}`);
}

// Count connections that exist in full but NOT in strict
const fullOnly = fullResult.connections.filter(c => {
  return !strictResult.connections.some(sc =>
    sc.type === c.type && ((sc.e1 === c.e1 && sc.e2 === c.e2) || (sc.e1 === c.e2 && sc.e2 === c.e1)));
});
console.log(`\n=== SUMMARY ===`);
console.log(`Full adj connections: ${fullResult.connections.length}`);
console.log(`Strict adj connections: ${strictResult.connections.length}`);
console.log(`Full-only (potential spurious): ${fullOnly.length}`);
console.log(`Full adj components: ${fullComps.length}`);
console.log(`Strict adj components: ${strictComps.length}`);
