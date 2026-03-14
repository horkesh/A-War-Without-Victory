/**
 * Test: what happens if we use sharedBoundaryAdj (strict, threshold 0.00005)
 * for the Case A/B checks instead of full osidAdjacency?
 */
const graph = require('../data/derived/operational/operational_contact_graph.json');
const save = require('../data/derived/latest_run_final_save.json');
const ctrl = save.political.political_controllers;

const SHARED_BOUNDARY_THRESHOLD = 0.00005;

// Build strict adjacency (same as buildSharedBoundaryAdjacency)
const strictAdj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > SHARED_BOUNDARY_THRESHOLD) continue;
  if (!strictAdj.has(e.a)) strictAdj.set(e.a, []);
  if (!strictAdj.has(e.b)) strictAdj.set(e.b, []);
  strictAdj.get(e.a).push(e.b);
  strictAdj.get(e.b).push(e.a);
}

// Full adjacency
const fullAdj = new Map();
for (const e of graph.edges) {
  if (!fullAdj.has(e.a)) fullAdj.set(e.a, []);
  if (!fullAdj.has(e.b)) fullAdj.set(e.b, []);
  fullAdj.get(e.a).push(e.b);
  fullAdj.get(e.b).push(e.a);
}

const faction = 'RBiH';
const sector = save.military.corps_front_sectors['sector:arbih_2nd_corps:23'];
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

function buildAdj(edgeList, caseAdj) {
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  };
  const isAdj = (x, y) => (caseAdj.get(x) || []).includes(y);

  // Case A
  const byFriendly = new Map();
  for (const e of edgeList) {
    if (!byFriendly.has(e.friendly)) byFriendly.set(e.friendly, []);
    byFriendly.get(e.friendly).push(e);
  }
  for (const group of byFriendly.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (isAdj(group[i].hostile, group[j].hostile)) {
          link(group[i].eid, group[j].eid);
        }
      }
    }
  }
  // Case B
  const byHostile = new Map();
  for (const e of edgeList) {
    if (!byHostile.has(e.hostile)) byHostile.set(e.hostile, []);
    byHostile.get(e.hostile).push(e);
  }
  for (const group of byHostile.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (isAdj(group[i].friendly, group[j].friendly)) {
          link(group[i].eid, group[j].eid);
        }
      }
    }
  }
  return adj;
}

function findComponents(edgeList, adj) {
  const visited = new Set();
  const comps = [];
  for (const e of edgeList) {
    if (visited.has(e.eid)) continue;
    const comp = [];
    const queue = [e.eid];
    visited.add(e.eid);
    while (queue.length > 0) {
      const cur = queue.shift();
      comp.push(cur);
      for (const nb of (adj.get(cur) || [])) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    comps.push(comp);
  }
  return comps;
}

// Test with full adjacency
const fullEdgeAdj = buildAdj(edges, fullAdj);
const fullComps = findComponents(edges, fullEdgeAdj);
console.log(`FULL adjacency: ${fullComps.length} component(s) [${fullComps.map(c => c.length).join(', ')}]`);

// Test with strict adjacency
const strictEdgeAdj = buildAdj(edges, strictAdj);
const strictComps = findComponents(edges, strictEdgeAdj);
console.log(`STRICT adjacency (shared boundary only): ${strictComps.length} component(s) [${strictComps.map(c => c.length).join(', ')}]`);

if (strictComps.length > 1) {
  console.log('\n=== SPLIT COMPONENTS WITH STRICT ADJACENCY ===\n');
  for (let i = 0; i < strictComps.length; i++) {
    console.log(`Component ${i} (${strictComps[i].length} edges):`);
    for (const eid of strictComps[i]) {
      const e = edges.find(x => x.eid === eid);
      console.log(`  ${eid}  friendly=${e.friendly} hostile=${e.hostile}`);
    }
  }
}

// What edges does hajderovici_2 connect to via Case A with full vs strict?
console.log('\n=== hajderovici_2 Case A connections ===\n');
const hajEdges = edges.filter(e => e.friendly === 'op:zavidovici:hajderovici_2');
console.log(`hajderovici_2 faces ${hajEdges.length} hostile OSIDs:`);
for (const e of hajEdges) {
  console.log(`  ${e.hostile}`);
}
console.log('\nCase A pairs (full adj):');
for (let i = 0; i < hajEdges.length; i++) {
  for (let j = i + 1; j < hajEdges.length; j++) {
    const inFull = (fullAdj.get(hajEdges[i].hostile) || []).includes(hajEdges[j].hostile);
    const inStrict = (strictAdj.get(hajEdges[i].hostile) || []).includes(hajEdges[j].hostile);
    if (inFull || inStrict) {
      const edgeData = graph.edges.find(e =>
        (e.a === hajEdges[i].hostile && e.b === hajEdges[j].hostile) ||
        (e.a === hajEdges[j].hostile && e.b === hajEdges[i].hostile));
      console.log(`  ${hajEdges[i].hostile} <-> ${hajEdges[j].hostile}: full=${inFull} strict=${inStrict} min_dist=${edgeData?.min_dist?.toFixed(7)}`);
    }
  }
}

// Also check: what front edges does hajderovici_2 have ACROSS BOTH sectors (12 and 23)?
console.log('\n=== hajderovici_2 front edges across ALL sectors ===\n');
const allSectors = save.military.corps_front_sectors;
for (const [sid, s] of Object.entries(allSectors)) {
  for (const eid of s.edge_ids) {
    if (eid.includes('hajderovici_2')) {
      const sep = eid.indexOf('__');
      const a = eid.slice(0, sep);
      const b = eid.slice(sep + 2);
      const friendly = ctrl[a] === 'RBiH' ? a : b;
      const hostile = ctrl[a] === 'RBiH' ? b : a;
      console.log(`  ${sid}: ${eid} (friendly=${friendly}, hostile=${hostile})`);
    }
  }
}
