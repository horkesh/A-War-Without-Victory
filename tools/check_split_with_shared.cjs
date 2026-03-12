// Reproduce the triple-junction split logic with SHARED BOUNDARY adjacency
const fs = require('fs');

const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build FULL adjacency
const fullAdj = new Map();
for (const edge of graph.edges) {
  if (!fullAdj.has(edge.a)) fullAdj.set(edge.a, []);
  if (!fullAdj.has(edge.b)) fullAdj.set(edge.b, []);
  fullAdj.get(edge.a).push(edge.b);
  fullAdj.get(edge.b).push(edge.a);
}

// Build SHARED BOUNDARY adjacency (min_dist === 0 or undefined only)
const sharedAdj = new Map();
for (const edge of graph.edges) {
  if (edge.min_dist !== undefined && edge.min_dist > 0) continue;
  if (!sharedAdj.has(edge.a)) sharedAdj.set(edge.a, []);
  if (!sharedAdj.has(edge.b)) sharedAdj.set(edge.b, []);
  sharedAdj.get(edge.a).push(edge.b);
  sharedAdj.get(edge.b).push(edge.a);
}

console.log('Full adj entries:', fullAdj.size, '/ Shared adj entries:', sharedAdj.size);

const secs = save.military.corps_front_sectors;
const sector = secs['sector:arbih_2nd_corps:4'];

const allFriendly = new Set();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) allFriendly.add(o);
}

// Parse edges
const edgeFriendly = new Map();
const edgeHostile = new Map();
const friendlyToEdges = new Map();
const hostileToEdges = new Map();

for (const eid of sector.edge_ids) {
  const sep = eid.indexOf('__');
  if (sep < 0) continue;
  const a = eid.slice(0, sep);
  const b = eid.slice(sep + 2);
  const friendly = allFriendly.has(a) ? a : allFriendly.has(b) ? b : null;
  if (!friendly) continue;
  const hostile = friendly === a ? b : a;
  edgeFriendly.set(eid, friendly);
  edgeHostile.set(eid, hostile);
  if (!friendlyToEdges.has(friendly)) friendlyToEdges.set(friendly, []);
  friendlyToEdges.get(friendly).push(eid);
  if (!hostileToEdges.has(hostile)) hostileToEdges.set(hostile, []);
  hostileToEdges.get(hostile).push(eid);
}

function isAdj(a, b, adjMap) {
  return (adjMap.get(a) || []).includes(b);
}

// Build triple-junction using SHARED BOUNDARY for Case B
const edgeNeighbors = new Map();
function linkEdges(ea, eb, reason) {
  if (ea === eb) return;
  if (!edgeNeighbors.has(ea)) edgeNeighbors.set(ea, new Set());
  if (!edgeNeighbors.has(eb)) edgeNeighbors.set(eb, new Set());
  edgeNeighbors.get(ea).add(eb);
  edgeNeighbors.get(eb).add(ea);
  // Log bridges between Srebrenica and Cerska
  const fa = edgeFriendly.get(ea);
  const fb = edgeFriendly.get(eb);
  const isSreb = (f) => f && (f.includes('srebrenica') || f.includes('bratunac'));
  const isCerska = (f) => f && f.includes('vlasenica');
  if ((isSreb(fa) && isCerska(fb)) || (isCerska(fa) && isSreb(fb))) {
    console.log(`  BRIDGE: ${reason}`);
    console.log(`    ${ea} (friendly: ${fa})`);
    console.log(`    ${eb} (friendly: ${fb})`);
  }
}

console.log('\n--- Case A (same friendly, hostile adj via FULL adj) ---');
let caseA = 0;
for (const [friendly, edges] of friendlyToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const hi = edgeHostile.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const hj = edgeHostile.get(edges[j]);
      if (isAdj(hi, hj, fullAdj)) {
        linkEdges(edges[i], edges[j], `Case A: friendly=${friendly}, hostiles=${hi}↔${hj}`);
        caseA++;
      }
    }
  }
}
console.log('Case A total links:', caseA);

console.log('\n--- Case B (same hostile, friendly adj via SHARED BOUNDARY adj) ---');
let caseB = 0;
for (const [hostile, edges] of hostileToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const fi = edgeFriendly.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const fj = edgeFriendly.get(edges[j]);
      if (isAdj(fi, fj, sharedAdj)) {
        linkEdges(edges[i], edges[j], `Case B: hostile=${hostile}, friendlies=${fi}↔${fj}`);
        caseB++;
      }
    }
  }
}
console.log('Case B total links:', caseB);

// Find components
const visited = new Set();
const components = [];
for (const eid of sector.edge_ids.sort()) {
  if (visited.has(eid)) continue;
  const comp = [];
  const queue = [eid];
  visited.add(eid);
  while (queue.length > 0) {
    const curr = queue.shift();
    comp.push(curr);
    for (const nb of (edgeNeighbors.get(curr) || [])) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  components.push(comp);
}

console.log('\n--- Edge components (with shared boundary filter) ---');
console.log('Components:', components.length);
for (let i = 0; i < components.length; i++) {
  const comp = components[i];
  const friendlies = [...new Set(comp.map(e => edgeFriendly.get(e)))].sort();
  const hasSreb = friendlies.some(f => f && (f.includes('srebrenica') || f.includes('bratunac')));
  const hasCerska = friendlies.some(f => f && f.includes('vlasenica'));
  const tags = [];
  if (hasSreb) tags.push('SREBRENICA');
  if (hasCerska) tags.push('CERSKA');
  console.log(`  Component ${i}: ${comp.length} edges [${tags.join('+')}]`);
  console.log('    Friendly:', friendlies);
}
