// Reproduce buildEdgeAdjacency with sharedBoundaryAdj and find the bridge path
const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build shared boundary adjacency (min_dist === 0 or undefined)
const sharedAdj = new Map();
let sharedCount = 0, distCount = 0;
for (const e of graph.edges) {
  if (e.min_dist !== undefined && e.min_dist > 0) { distCount++; continue; }
  sharedCount++;
  if (!sharedAdj.has(e.a)) sharedAdj.set(e.a, []);
  if (!sharedAdj.has(e.b)) sharedAdj.set(e.b, []);
  sharedAdj.get(e.a).push(e.b);
  sharedAdj.get(e.b).push(e.a);
}
console.log(`Graph: ${sharedCount} shared boundary edges, ${distCount} distance contacts`);

// Get 2nd corps edges from sectors
const sector4 = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const sector5 = save.military.corps_front_sectors['sector:arbih_2nd_corps:5'];

// Collect ALL 2nd corps front edges
const allEdgeIds = [];
for (const [sid, sec] of Object.entries(save.military.corps_front_sectors)) {
  if (sid.includes('arbih_2nd_corps')) {
    for (const eid of sec.edge_ids) allEdgeIds.push(eid);
  }
}
console.log(`Total 2nd corps edges: ${allEdgeIds.length}`);

// Build edge meta from front edges
const frontEdges = save.military.war_front_edges_osid;
const edgeMeta = new Map();
for (const e of frontEdges) edgeMeta.set(e.edge_id, e);

// Reproduce buildEdgeAdjacency with sharedBoundaryAdj
const faction = 'RBiH';
const friendlyToEdges = new Map();
const hostileToEdges = new Map();
const edgeHostile = new Map();
const edgeFriendly = new Map();

for (const eid of allEdgeIds) {
  const meta = edgeMeta.get(eid);
  if (!meta) continue;
  let friendly, hostile;
  if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
  else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
  else continue;

  edgeFriendly.set(eid, friendly);
  edgeHostile.set(eid, hostile);

  let list = friendlyToEdges.get(friendly);
  if (!list) { list = []; friendlyToEdges.set(friendly, list); }
  list.push(eid);

  list = hostileToEdges.get(hostile);
  if (!list) { list = []; hostileToEdges.set(hostile, list); }
  list.push(eid);
}

// Build edge adjacency using SHARED BOUNDARY only
const edgeNeighbors = new Map();
function linkEdges(ea, eb) {
  if (ea === eb) return;
  if (!edgeNeighbors.has(ea)) edgeNeighbors.set(ea, new Set());
  if (!edgeNeighbors.has(eb)) edgeNeighbors.set(eb, new Set());
  edgeNeighbors.get(ea).add(eb);
  edgeNeighbors.get(eb).add(ea);
}

function isAdj(a, b) {
  return (sharedAdj.get(a) || []).includes(b);
}

// Case A: same friendly, hostile adj via shared boundary
let caseALinks = 0;
let caseABridges = [];
for (const [friendly, edges] of friendlyToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const hi = edgeHostile.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const hj = edgeHostile.get(edges[j]);
      if (isAdj(hi, hj)) {
        linkEdges(edges[i], edges[j]);
        caseALinks++;
        // Check if this is a cross-area link
        const isSreb = (o) => o.includes('srebrenica') || o.includes('bratunac');
        const isCerska = (o) => o.includes('vlasenica') || o.includes('milici') || o.includes('zvornik');
        const f1 = edgeFriendly.get(edges[i]), f2 = edgeFriendly.get(edges[j]);
        if ((isSreb(f1) && isCerska(f2)) || (isCerska(f1) && isSreb(f2)) ||
            (isSreb(hi) !== isSreb(hj)) || (isCerska(hi) !== isCerska(hj))) {
          // Check specifically if hostile pair crosses areas
          const hiSreb = isSreb(hi), hiCerska = isCerska(hi);
          const hjSreb = isSreb(hj), hjCerska = isCerska(hj);
          if ((hiSreb && hjCerska) || (hiCerska && hjSreb)) {
            caseABridges.push({
              friendly, hi, hj,
              e1: edges[i], e2: edges[j]
            });
          }
        }
      }
    }
  }
}
console.log(`Case A links (shared boundary): ${caseALinks}`);
if (caseABridges.length > 0) {
  console.log(`Case A BRIDGES (cross-area):`, caseABridges.length);
  for (const b of caseABridges) {
    console.log(`  friendly=${b.friendly}, hostiles=${b.hi} <-> ${b.hj}`);
    // Verify the edge in graph
    const graphEdge = graph.edges.find(e =>
      (e.a === b.hi && e.b === b.hj) || (e.a === b.hj && e.b === b.hi));
    if (graphEdge) {
      console.log(`    graph edge: type=${graphEdge.type}, min_dist=${graphEdge.min_dist}`);
    }
  }
}

// Case B: same hostile, friendly adj via shared boundary
let caseBLinks = 0;
let caseBBridges = [];
for (const [hostile, edges] of hostileToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const fi = edgeFriendly.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const fj = edgeFriendly.get(edges[j]);
      if (isAdj(fi, fj)) {
        linkEdges(edges[i], edges[j]);
        caseBLinks++;
        const isSreb = (o) => o.includes('srebrenica') || o.includes('bratunac');
        const isCerska = (o) => o.includes('vlasenica') || o.includes('milici') || o.includes('zvornik');
        if ((isSreb(fi) && isCerska(fj)) || (isCerska(fi) && isSreb(fj))) {
          caseBBridges.push({ hostile, fi, fj });
        }
      }
    }
  }
}
console.log(`Case B links (shared boundary): ${caseBLinks}`);
if (caseBBridges.length > 0) {
  console.log(`Case B BRIDGES (cross-area):`, caseBBridges.length);
  for (const b of caseBBridges) {
    console.log(`  hostile=${b.hostile}, friendlies=${b.fi} <-> ${b.fj}`);
    const graphEdge = graph.edges.find(e =>
      (e.a === b.fi && e.b === b.fj) || (e.a === b.fj && e.b === b.fi));
    if (graphEdge) {
      console.log(`    graph edge: type=${graphEdge.type}, min_dist=${graphEdge.min_dist}`);
    }
  }
}

// Find components
const visited = new Set();
const components = [];
for (const eid of allEdgeIds.sort()) {
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

console.log(`\nComponents: ${components.length}`);
const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);
for (let i = 0; i < components.length; i++) {
  const comp = components[i];
  const friendlies = [...new Set(comp.map(e => edgeFriendly.get(e)))].filter(Boolean);
  const hasSreb = friendlies.some(f => srebMunis.has(f.split(':')[1]));
  const hasCerska = friendlies.some(f => cerskaMunis.has(f.split(':')[1]));
  const tags = [];
  if (hasSreb) tags.push('SREB');
  if (hasCerska) tags.push('CERSKA');
  console.log(`  Component ${i}: ${comp.length} edges [${tags.join('+')}]`);
}
