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

// List all front edge IDs and parse friendly/hostile
console.log('Sector edges:', sector.edge_ids.length);
const allFriendly = new Set();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) allFriendly.add(o);
}

// Parse edges: extract friendly and hostile OSIDs
const edgeInfo = [];
for (const eid of sector.edge_ids) {
  const sep = eid.indexOf('__');
  if (sep < 0) continue;
  const a = eid.slice(0, sep);
  const b = eid.slice(sep + 2);
  const friendly = allFriendly.has(a) ? a : allFriendly.has(b) ? b : null;
  const hostile = friendly === a ? b : a;
  edgeInfo.push({ eid, friendly, hostile });
}

// Group edges by friendly OSID
const byFriendly = new Map();
for (const e of edgeInfo) {
  if (!byFriendly.has(e.friendly)) byFriendly.set(e.friendly, []);
  byFriendly.get(e.friendly).push(e);
}

console.log('\nFront edges by friendly OSID:');
for (const [f, edges] of [...byFriendly.entries()].sort()) {
  const hostiles = edges.map(e => e.hostile.split(':').slice(1).join(':')).join(', ');
  console.log(`  ${f}: ${edges.length} edges → [${hostiles}]`);
}

// Check: which friendly OSIDs are in the "Srebrenica cluster" vs "Cerska cluster"?
// Split by municipality
const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);

const srebFrontOsids = [...allFriendly].filter(o => srebMunis.has(o.split(':')[1]));
const cerskaFrontOsids = [...allFriendly].filter(o => cerskaMunis.has(o.split(':')[1]));
const otherFrontOsids = [...allFriendly].filter(o => !srebMunis.has(o.split(':')[1]) && !cerskaMunis.has(o.split(':')[1]));

console.log('\nFront OSIDs by area:');
console.log('  Srebrenica cluster:', srebFrontOsids.sort());
console.log('  Cerska/Vlasenica cluster:', cerskaFrontOsids.sort());
console.log('  Other:', otherFrontOsids.sort());

// BFS connectivity of front OSIDs through FRIENDLY TERRITORY
const pc = save.political.political_controllers;
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}

// Check if Srebrenica front OSIDs can reach Cerska front OSIDs through RBiH territory
if (srebFrontOsids.length > 0 && cerskaFrontOsids.length > 0) {
  const start = srebFrontOsids[0];
  const targets = new Set(cerskaFrontOsids);
  const visited = new Set([start]);
  const queue = [start];
  let head = 0;
  let hops = 0;
  const distances = new Map();
  const hopQueue = [[start, 0]];
  let hhead = 0;
  while (hhead < hopQueue.length) {
    const [curr, dist] = hopQueue[hhead++];
    for (const nb of (adj.get(curr) || [])) {
      if (visited.has(nb)) continue;
      if (!rbihOsids.has(nb)) continue;
      visited.add(nb);
      hopQueue.push([nb, dist + 1]);
      if (targets.has(nb)) {
        distances.set(nb, dist + 1);
      }
    }
  }
  console.log(`\nBFS from ${start} to Cerska front OSIDs through RBiH:`);
  if (distances.size === 0) {
    console.log('  UNREACHABLE');
  } else {
    for (const [t, d] of [...distances.entries()].sort((a,b) => a[1]-b[1])) {
      console.log(`  → ${t}: ${d} hops`);
    }
  }
}

// Territory between Srebrenica and Cerska: what's the corridor?
console.log('\nTerritory corridor (RBiH OSIDs between Srebrenica and Cerska):');
const corridorMunis = ['osmace', 'konjevic_polje', 'nova_kasaba', 'cerska', 'hanpijesak'];
for (const mun of ['srebrenica', 'bratunac', 'vlasenica', 'milici', 'hanpijesak', 'osmace']) {
  const osids = [...rbihOsids].filter(o => o.split(':')[1] === mun);
  if (osids.length > 0) console.log(`  ${mun}: ${osids.sort()}`);
}
