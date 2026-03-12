const fs = require('fs');

const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const edge of graph.edges) {
  if (!adj.has(edge.a)) adj.set(edge.a, []);
  if (!adj.has(edge.b)) adj.set(edge.b, []);
  adj.get(edge.a).push(edge.b);
  adj.get(edge.b).push(edge.a);
}

const secs = save.military.corps_front_sectors;
const sector = secs['sector:arbih_2nd_corps:4'];

// Collect friendly OSIDs
const allFriendly = new Set();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) allFriendly.add(o);
}

// Parse edges
const edgeIds = sector.edge_ids;
const edgeFriendly = new Map();
const edgeHostile = new Map();
const friendlyToEdges = new Map();
const hostileToEdges = new Map();

for (const eid of edgeIds) {
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

// Build triple-junction adjacency
const edgeNeighbors = new Map();
function linkEdges(ea, eb) {
  if (ea === eb) return;
  if (!edgeNeighbors.has(ea)) edgeNeighbors.set(ea, new Set());
  if (!edgeNeighbors.has(eb)) edgeNeighbors.set(eb, new Set());
  edgeNeighbors.get(ea).add(eb);
  edgeNeighbors.get(eb).add(ea);
}

function isAdj(a, b) {
  return (adj.get(a) || []).includes(b);
}

// Case A: same friendly, hostile OSIDs adjacent
let caseALinks = 0;
for (const [friendly, edges] of friendlyToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const hi = edgeHostile.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const hj = edgeHostile.get(edges[j]);
      if (isAdj(hi, hj)) {
        linkEdges(edges[i], edges[j]);
        caseALinks++;
      }
    }
  }
}

// Case B: same hostile, friendly OSIDs adjacent
let caseBLinks = 0;
for (const [hostile, edges] of hostileToEdges) {
  for (let i = 0; i < edges.length; i++) {
    const fi = edgeFriendly.get(edges[i]);
    for (let j = i + 1; j < edges.length; j++) {
      const fj = edgeFriendly.get(edges[j]);
      if (isAdj(fi, fj)) {
        linkEdges(edges[i], edges[j]);
        caseBLinks++;
      }
    }
  }
}

console.log('Case A links (same friendly, hostile adj):', caseALinks);
console.log('Case B links (same hostile, friendly adj):', caseBLinks);

// Find connected components of edges
const visited = new Set();
const components = [];
for (const eid of edgeIds.sort()) {
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

console.log('\nEdge components:', components.length);
for (let i = 0; i < components.length; i++) {
  const comp = components[i];
  const friendlies = new Set(comp.map(e => edgeFriendly.get(e)));
  const hostiles = new Set(comp.map(e => edgeHostile.get(e)));
  const hasSreb = [...friendlies].some(f => f && (f.includes('srebrenica') || f.includes('bratunac')));
  const hasCerska = [...friendlies].some(f => f && (f.includes('vlasenica') || f.includes('cerska')));
  const tags = [];
  if (hasSreb) tags.push('SREBRENICA');
  if (hasCerska) tags.push('CERSKA');
  console.log(`  Component ${i}: ${comp.length} edges [${tags.join('+')}]`);
  console.log('    Friendly OSIDs:', [...friendlies].sort());
  console.log('    Hostile OSIDs:', [...hostiles].sort());
}

// Show the bridge edges connecting Srebrenica to Cerska
console.log('\nBridge analysis:');
const srebEdges = edgeIds.filter(e => {
  const f = edgeFriendly.get(e);
  return f && (f.includes('srebrenica') || f.includes('bratunac'));
});
const cerskaEdges = edgeIds.filter(e => {
  const f = edgeFriendly.get(e);
  return f && f.includes('vlasenica');
});
console.log('Srebrenica edges:', srebEdges.length);
console.log('Cerska edges:', cerskaEdges.length);

// Find which hostile OSIDs are shared
const srebHostiles = new Set(srebEdges.map(e => edgeHostile.get(e)));
const cerskaHostiles = new Set(cerskaEdges.map(e => edgeHostile.get(e)));
const sharedHostiles = [...srebHostiles].filter(h => cerskaHostiles.has(h));
console.log('Shared hostile OSIDs:', sharedHostiles);
console.log('  → These are the bridge points: same hostile OSID facing both Srebrenica AND Cerska friendly OSIDs');

for (const h of sharedHostiles) {
  const fromSreb = srebEdges.filter(e => edgeHostile.get(e) === h);
  const fromCerska = cerskaEdges.filter(e => edgeHostile.get(e) === h);
  console.log(`\n  Hostile ${h}:`);
  for (const e of fromSreb) console.log(`    Sreb: ${edgeFriendly.get(e)} ↔ ${h}`);
  for (const e of fromCerska) console.log(`    Cerska: ${edgeFriendly.get(e)} ↔ ${h}`);
  // Are the friendly OSIDs adjacent?
  for (const s of fromSreb) {
    for (const c of fromCerska) {
      const sf = edgeFriendly.get(s);
      const cf = edgeFriendly.get(c);
      const adjacent = isAdj(sf, cf);
      console.log(`    ${sf} adj ${cf}? ${adjacent}`);
    }
  }
}
