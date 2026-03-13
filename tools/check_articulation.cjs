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

const pc = save.political.political_controllers;
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}

// Sector friendly OSIDs
const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const friendlyOsids = new Set();
for (const ss of sec.sub_segments) {
  for (const o of ss.friendly_osids) friendlyOsids.add(o);
}

const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica']);
const srebFriendly = new Set([...friendlyOsids].filter(o => srebMunis.has(o.split(':')[1])));
const cerskaFriendly = new Set([...friendlyOsids].filter(o => cerskaMunis.has(o.split(':')[1])));

console.log('Sreb friendly:', [...srebFriendly].sort());
console.log('Cerska friendly:', [...cerskaFriendly].sort());

// Check: for each RBiH OSID, if we remove it, does Srebrenica disconnect from Cerska?
const canReach = (start, targets, excluded) => {
  const visited = new Set([start]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (targets.has(curr)) return true;
    for (const nb of (adj.get(curr) || [])) {
      if (visited.has(nb) || nb === excluded) continue;
      if (!rbihOsids.has(nb)) continue;
      visited.add(nb);
      queue.push(nb);
    }
  }
  return false;
};

// Find articulation vertices
console.log('\nArticulation vertices between Srebrenica and Cerska:');
const startOsid = [...srebFriendly][0];
let articulations = 0;
for (const osid of [...rbihOsids].sort()) {
  // Skip if it IS a start or target
  if (osid === startOsid) continue;
  const reachable = canReach(startOsid, cerskaFriendly, osid);
  if (!reachable) {
    articulations++;
    console.log(`  ARTICULATION: ${osid} (removing it disconnects Sreb from Cerska)`);
  }
}
if (articulations === 0) {
  console.log('  NONE — multiple redundant paths exist');
}

// Show all RBiH OSIDs in the corridor between Sreb and Cerska
console.log('\nRBiH OSIDs between Sreb and Cerska (BFS path):');
const pathVisited = new Set([startOsid]);
const pathParent = new Map();
const pathQueue = [startOsid];
let head = 0;
let found = null;
while (head < pathQueue.length) {
  const curr = pathQueue[head++];
  if (cerskaFriendly.has(curr)) { found = curr; break; }
  for (const nb of (adj.get(curr) || [])) {
    if (pathVisited.has(nb)) continue;
    if (!rbihOsids.has(nb)) continue;
    pathVisited.add(nb);
    pathParent.set(nb, curr);
    pathQueue.push(nb);
  }
}
if (found) {
  const path = [found];
  let c = found;
  while (pathParent.has(c)) { c = pathParent.get(c); path.unshift(c); }
  console.log('Shortest path:', path.join(' -> '));

  // For each node on the path, count its RBiH neighbors
  for (const p of path) {
    const rbihNeighbors = (adj.get(p) || []).filter(n => rbihOsids.has(n));
    console.log(`  ${p}: ${rbihNeighbors.length} RBiH neighbors`);
  }
}

// Also: how many RBiH OSIDs are in the Bratunac/Srebrenica/Vlasenica area?
for (const mun of ['bratunac', 'srebrenica', 'vlasenica']) {
  const osids = [...rbihOsids].filter(o => o.split(':')[1] === mun);
  console.log(`\n${mun}: ${osids.length} RBiH OSIDs`);
  for (const o of osids.sort()) console.log(`  ${o}`);
}
