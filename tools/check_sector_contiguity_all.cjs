/**
 * Check ALL ARBiH sectors for friendly-territory contiguity.
 * A sector "crosses enemy territory" if its friendly OSIDs are in
 * multiple disconnected BFS components through friendly-only adjacency.
 */
const graph = require('../data/derived/operational/operational_contact_graph.json');
const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;
const sectors = s.military.corps_front_sectors;
const GAP = 0.0003;

// Build friendly adjacency (RBiH <-> RBiH within 33m)
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

let violations = 0;
for (const [sid, sec] of Object.entries(sectors)) {
  if (!sid.startsWith('sector:arbih_')) continue;

  // Get friendly OSIDs
  const friendlies = new Set();
  for (const eid of sec.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    if (ctrl[a] === 'RBiH') friendlies.add(a);
    if (ctrl[b] === 'RBiH') friendlies.add(b);
  }

  if (friendlies.size === 0) continue;

  // BFS from first friendly OSID
  const start = [...friendlies][0];
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb) && friendlies.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }

  // BFS through ALL friendly territory (not just sector friendlies)
  const visitedAll = new Set([start]);
  const queueAll = [start];
  while (queueAll.length > 0) {
    const cur = queueAll.shift();
    for (const nb of (adj.get(cur) || [])) {
      if (!visitedAll.has(nb)) {
        visitedAll.add(nb);
        queueAll.push(nb);
      }
    }
  }

  const unreachable = [...friendlies].filter(f => !visitedAll.has(f));
  if (unreachable.length > 0) {
    violations++;
    const muns = new Set();
    for (const f of friendlies) muns.add(f.split(':')[1]);
    console.log('DISCONNECTED: ' + sid + ' (' + sec.edge_ids.length + ' edges)');
    console.log('  Municipalities: ' + [...muns].join(', '));
    console.log('  Reachable from ' + start + ': ' + visitedAll.size);
    console.log('  Unreachable friendlies: ' + unreachable.join(', '));
  }
}

console.log('\n' + violations + ' sectors with disconnected friendly territory');
