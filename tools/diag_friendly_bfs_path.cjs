/**
 * Trace BFS path from dragoradi (Ilijas) to olovo_2 (Olovo)
 * through friendly-only OSIDs using strict 5.5m adjacency
 */
const graph = require('../data/derived/operational/operational_contact_graph.json');
const save = require('../data/derived/latest_run_final_save.json');
const ctrl = save.political.political_controllers;

const SHARED_BOUNDARY_THRESHOLD = 0.00005; // 5.5m

// Build strict adjacency (5.5m)
const strictAdj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > SHARED_BOUNDARY_THRESHOLD) continue;
  if (!strictAdj.has(e.a)) strictAdj.set(e.a, []);
  if (!strictAdj.has(e.b)) strictAdj.set(e.b, []);
  strictAdj.get(e.a).push(e.b);
  strictAdj.get(e.b).push(e.a);
}

const start = 'op:ilijas:dragoradi';
const target = 'op:olovo:olovo_2';

// BFS through friendly-only using strict adjacency
const visited = new Set([start]);
const queue = [start];
const parent = new Map();
let found = false;

while (queue.length > 0) {
  const cur = queue.shift();
  if (cur === target) { found = true; break; }
  for (const nb of (strictAdj.get(cur) || [])) {
    if (visited.has(nb)) continue;
    if (ctrl[nb] !== 'RBiH') continue; // friendly only
    visited.add(nb);
    parent.set(nb, cur);
    queue.push(nb);
  }
}

if (found) {
  const path = [target];
  let cur = target;
  while (parent.has(cur)) {
    cur = parent.get(cur);
    path.unshift(cur);
  }
  console.log('PATH EXISTS (' + path.length + ' hops):');
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const mun = p.split(':')[1];
    // Find edge to next hop
    if (i < path.length - 1) {
      const next = path[i + 1];
      const e = graph.edges.find(e =>
        (e.a === p && e.b === next) || (e.a === next && e.b === p));
      const dist = e ? (e.min_dist !== undefined ? e.min_dist.toFixed(7) : 'n/a') : '?';
      const type = e ? e.type : '?';
      console.log('  ' + p + ' (' + mun + ') → [' + type + ' ' + dist + ']');
    } else {
      console.log('  ' + p + ' (' + mun + ')');
    }
  }
} else {
  console.log('NO PATH from dragoradi to olovo_2 through strict friendly BFS');
  console.log('dragoradi component: ' + visited.size + ' friendly OSIDs');

  // Check which OSIDs olovo_2 connects to
  const visited2 = new Set([target]);
  const queue2 = [target];
  while (queue2.length > 0) {
    const cur = queue2.shift();
    for (const nb of (strictAdj.get(cur) || [])) {
      if (visited2.has(nb)) continue;
      if (ctrl[nb] !== 'RBiH') continue;
      visited2.add(nb);
      queue2.push(nb);
    }
  }
  console.log('olovo_2 component: ' + visited2.size + ' friendly OSIDs');
}

// Also: check direct edge between dragoradi and olovo_2
const directEdge = graph.edges.find(e =>
  (e.a === start && e.b === target) || (e.a === target && e.b === start));
if (directEdge) {
  console.log('\nDirect edge: type=' + directEdge.type + ' min_dist=' + directEdge.min_dist);
} else {
  console.log('\nNo direct edge between dragoradi and olovo_2');
}
