const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;
const graph = require('../data/derived/operational/operational_contact_graph.json');

// Build adjacency at 16.6m threshold
const THRESHOLD = 0.00015;
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > THRESHOLD) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

// BFS from srebrenica OSIDs through RBiH territory
const start = Object.keys(ctrl).filter(o => o.includes('srebrenica') && ctrl[o] === 'RBiH');
const visited = new Set(start);
const queue = [...start];
while (queue.length > 0) {
  const cur = queue.shift();
  for (const nb of (adj.get(cur) || [])) {
    if (!visited.has(nb) && ctrl[nb] === 'RBiH') {
      visited.add(nb);
      queue.push(nb);
    }
  }
}
const visegradReached = [...visited].filter(o => o.includes('visegrad'));
console.log('Srebrenica RBiH OSIDs:', start.length);
console.log('Reachable Visegrad RBiH OSIDs:', visegradReached);
console.log('Total reachable from Srebrenica:', visited.size);
const corridor = [...visited].filter(o =>
  o.includes('vlasenica') || o.includes('hanpijesak') ||
  o.includes('rogatica') || o.includes('zepa')
);
console.log('Corridor OSIDs:', corridor);

// Also check: are Srebrenica and Visegrad OSIDs in the same enclave or connected territory?
console.log('\nAll RBiH OSIDs in Visegrad mun:',
  Object.keys(ctrl).filter(o => o.includes('visegrad') && ctrl[o] === 'RBiH'));
