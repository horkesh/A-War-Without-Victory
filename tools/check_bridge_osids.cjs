const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build full adjacency
const adj = new Map();
for (const e of graph.edges) {
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const allF = new Set();
for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) allF.add(o);

// Parse edges
const edges = [];
for (const eid of sec.edge_ids) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep), b = eid.slice(sep + 2);
  const friendly = allF.has(a) ? a : b;
  const hostile = friendly === a ? b : a;
  edges.push({ eid, friendly, hostile });
}

// Build edge adjacency (triple junction with full adj)
const edgeNeighbors = new Map();
function link(ea, eb) {
  if (ea === eb) return;
  if (!edgeNeighbors.has(ea)) edgeNeighbors.set(ea, new Set());
  if (!edgeNeighbors.has(eb)) edgeNeighbors.set(eb, new Set());
  edgeNeighbors.get(ea).add(eb);
  edgeNeighbors.get(eb).add(ea);
}

const friendlyToEdges = new Map();
const hostileToEdges = new Map();
for (const e of edges) {
  if (!friendlyToEdges.has(e.friendly)) friendlyToEdges.set(e.friendly, []);
  friendlyToEdges.get(e.friendly).push(e);
  if (!hostileToEdges.has(e.hostile)) hostileToEdges.set(e.hostile, []);
  hostileToEdges.get(e.hostile).push(e);
}

// Case A
for (const [friendly, fedges] of friendlyToEdges) {
  for (let i = 0; i < fedges.length; i++) {
    for (let j = i + 1; j < fedges.length; j++) {
      if ((adj.get(fedges[i].hostile) || []).includes(fedges[j].hostile)) {
        link(fedges[i].eid, fedges[j].eid);
      }
    }
  }
}
// Case B
for (const [hostile, hedges] of hostileToEdges) {
  for (let i = 0; i < hedges.length; i++) {
    for (let j = i + 1; j < hedges.length; j++) {
      if ((adj.get(hedges[i].friendly) || []).includes(hedges[j].friendly)) {
        link(hedges[i].eid, hedges[j].eid);
      }
    }
  }
}

// For each friendly OSID, check if removing its edges disconnects the graph
console.log('Bridge OSID analysis:');
for (const [friendly, fedges] of [...friendlyToEdges.entries()].sort()) {
  const excludeEids = new Set(fedges.map(e => e.eid));
  const remainingEids = sec.edge_ids.filter(e => !excludeEids.has(e));
  if (remainingEids.length === 0) continue;

  // BFS on remaining edges using edge adjacency
  const visited = new Set();
  const queue = [remainingEids[0]];
  visited.add(remainingEids[0]);
  while (queue.length > 0) {
    const curr = queue.shift();
    for (const nb of (edgeNeighbors.get(curr) || [])) {
      if (visited.has(nb) || excludeEids.has(nb)) continue;
      visited.add(nb);
      queue.push(nb);
    }
  }

  const unreached = remainingEids.filter(e => !visited.has(e));
  if (unreached.length > 0) {
    console.log(`  BRIDGE: ${friendly} (${fedges.length} edges) — removing disconnects ${unreached.length} of ${remainingEids.length} remaining edges`);

    // Check what areas the components are in
    const srebMunis = new Set(['srebrenica', 'bratunac']);
    const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);
    const reachedFriendly = new Set();
    const unreachedFriendly = new Set();
    for (const eid of [...visited]) {
      const e = edges.find(x => x.eid === eid);
      if (e) reachedFriendly.add(e.friendly);
    }
    for (const eid of unreached) {
      const e = edges.find(x => x.eid === eid);
      if (e) unreachedFriendly.add(e.friendly);
    }
    const reachedSreb = [...reachedFriendly].filter(f => srebMunis.has(f.split(':')[1]));
    const reachedCerska = [...reachedFriendly].filter(f => cerskaMunis.has(f.split(':')[1]));
    const unreachedSreb = [...unreachedFriendly].filter(f => srebMunis.has(f.split(':')[1]));
    const unreachedCerska = [...unreachedFriendly].filter(f => cerskaMunis.has(f.split(':')[1]));
    console.log(`    Reached: ${reachedSreb.length} Sreb, ${reachedCerska.length} Cerska`);
    console.log(`    Unreached: ${unreachedSreb.length} Sreb, ${unreachedCerska.length} Cerska`);
  }
}
