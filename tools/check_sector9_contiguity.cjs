const graph = require('../data/derived/operational/operational_contact_graph.json');
const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;
const GAP = 0.0003;

// Build friendly adjacency
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > GAP) continue;
  if (ctrl[e.a] === 'RBiH' && ctrl[e.b] === 'RBiH') {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
}

// BFS from breza:koritnik
const start = 'op:breza:koritnik';
const targets = ['op:breza:mahala', 'op:breza:podgora', 'op:breza:zupca_2', 'op:visoko:podvinjci_2'];
const visited = new Set([start]);
const queue = [start];
while (queue.length > 0) {
  const cur = queue.shift();
  for (const nb of (adj.get(cur) || [])) {
    if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
  }
}
console.log('BFS from ' + start + ' (component size: ' + visited.size + '):');
for (const t of targets) {
  console.log('  ' + t + ': ' + (visited.has(t) ? 'REACHABLE' : 'UNREACHABLE'));
}

// Also check: is vares:budozelje_2 RS territory between breza and vares?
console.log('\nbudozelje_2 controller: ' + ctrl['op:vares:budozelje_2']);
console.log('podlugovi controller: ' + ctrl['op:ilijas:podlugovi']);

// Check which edges form the bridge
const sec9edges = [
  'op:breza:koritnik__op:vares:budozelje_2',
  'op:breza:mahala__op:vares:budozelje_2',
  'op:breza:podgora__op:vares:budozelje_2',
  'op:vares:budozelje_2__op:visoko:podvinjci_2'
];
console.log('\nEdges touching budozelje_2:');
for (const eid of sec9edges) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep), b = eid.slice(sep + 2);
  // Get edge distance
  const e = graph.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const dist = e ? (e.min_dist !== undefined ? e.min_dist.toFixed(7) : 'n/a') : 'no edge';
  console.log('  ' + eid + ': dist=' + dist);
}
