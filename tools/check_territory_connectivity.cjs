const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const e of graph.edges) {
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

// RBiH-controlled OSIDs
const pc = save.political.political_controllers;
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}

// Get sector's friendly OSIDs
const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const friendlyOsids = new Set();
for (const ss of sec.sub_segments) {
  for (const o of ss.friendly_osids) friendlyOsids.add(o);
}

const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);

const srebFriendly = [...friendlyOsids].filter(o => srebMunis.has(o.split(':')[1]));
const cerskaFriendly = [...friendlyOsids].filter(o => cerskaMunis.has(o.split(':')[1]));

console.log('Sector friendly OSIDs:');
console.log('  Srebrenica:', srebFriendly.sort());
console.log('  Cerska:', cerskaFriendly.sort());

// Check: are ALL friendly OSIDs RBiH-controlled?
for (const o of friendlyOsids) {
  if (!rbihOsids.has(o)) {
    console.log(`  WARNING: ${o} is NOT RBiH-controlled (${pc[o]})`);
  }
}

// BFS from Srebrenica through RBiH territory to Cerska
const start = srebFriendly[0];
const targets = new Set(cerskaFriendly);
const visited = new Set([start]);
const parent = new Map();
const queue = [start];
let head = 0;
let found = null;
while (head < queue.length) {
  const curr = queue[head++];
  if (targets.has(curr)) { found = curr; break; }
  for (const nb of (adj.get(curr) || [])) {
    if (visited.has(nb)) continue;
    if (!rbihOsids.has(nb)) continue;
    visited.add(nb);
    parent.set(nb, curr);
    queue.push(nb);
  }
}

if (found) {
  const path = [found];
  let c = found;
  while (parent.has(c)) { c = parent.get(c); path.unshift(c); }
  console.log(`\nBFS found path (${path.length} hops):`);
  for (const p of path) {
    console.log(`  ${p} [${pc[p]}] mun=${p.split(':')[1]}`);
  }
} else {
  console.log('\nNO path through RBiH territory between Srebrenica and Cerska');
  // Show which RBiH OSIDs were reachable
  const reachableMunis = new Map();
  for (const v of visited) {
    const mun = v.split(':')[1];
    reachableMunis.set(mun, (reachableMunis.get(mun) || 0) + 1);
  }
  console.log('Reachable from Srebrenica (by municipality):');
  for (const [mun, count] of [...reachableMunis.entries()].sort()) {
    console.log(`  ${mun}: ${count} OSIDs`);
  }
}
