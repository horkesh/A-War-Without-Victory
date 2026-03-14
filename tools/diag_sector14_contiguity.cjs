/**
 * Check if sector:arbih_1st_corps:14 friendly territory is contiguous
 * through friendly-only BFS
 */
const graph = require('../data/derived/operational/operational_contact_graph.json');
const save = require('../data/derived/latest_run_final_save.json');
const ctrl = save.political.political_controllers;
const GAP = 0.0003;

// Build friendly-only adjacency (RBiH<->RBiH within 33m)
const friendlyAdj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > GAP) continue;
  if (ctrl[e.a] === 'RBiH' && ctrl[e.b] === 'RBiH') {
    if (!friendlyAdj.has(e.a)) friendlyAdj.set(e.a, []);
    if (!friendlyAdj.has(e.b)) friendlyAdj.set(e.b, []);
    friendlyAdj.get(e.a).push(e.b);
    friendlyAdj.get(e.b).push(e.a);
  }
}

// BFS from krivajevici
const start = 'op:ilijas:krivajevici';
const target = 'op:zavidovici:ribnica_dio';
const visited = new Set([start]);
const queue = [start];
const parent = new Map();
let found = false;

while (queue.length > 0) {
  const cur = queue.shift();
  if (cur === target) { found = true; break; }
  for (const nb of (friendlyAdj.get(cur) || [])) {
    if (!visited.has(nb)) {
      visited.add(nb);
      parent.set(nb, cur);
      queue.push(nb);
    }
  }
}

if (found) {
  const path = [target];
  let cur = target;
  while (parent.has(cur)) {
    cur = parent.get(cur);
    path.unshift(cur);
  }
  console.log('PATH EXISTS: ' + path.length + ' hops');
  for (const p of path) {
    console.log('  ' + p + ' (' + p.split(':')[1] + ')');
  }
} else {
  console.log('NO PATH from krivajevici to ribnica_dio through friendly territory');
  console.log('krivajevici component: ' + visited.size + ' OSIDs');

  // BFS from ribnica_dio
  const visited2 = new Set([target]);
  const queue2 = [target];
  while (queue2.length > 0) {
    const cur = queue2.shift();
    for (const nb of (friendlyAdj.get(cur) || [])) {
      if (!visited2.has(nb)) { visited2.add(nb); queue2.push(nb); }
    }
  }
  console.log('ribnica_dio component: ' + visited2.size + ' OSIDs');

  const s14 = save.military.corps_front_sectors['sector:arbih_1st_corps:14'];
  const friendlies = new Set();
  for (const eid of s14.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    if (ctrl[a] === 'RBiH') friendlies.add(a);
    else friendlies.add(b);
  }

  console.log('\nSector 14 friendlies:');
  for (const f of [...friendlies].sort()) {
    const fromKriv = visited.has(f) ? 'kriv-comp' : '';
    const fromRib = visited2.has(f) ? 'rib-comp' : '';
    console.log('  ' + f + ': ' + (fromKriv || fromRib || 'ISOLATED'));
  }
}

// Also check: 707th Slavna Mountain (Bugojno) at repnik_2
console.log('\n=== BRIGADE CHECK ===');
const brigs = save.military.formations;
for (const [id, f] of Object.entries(brigs)) {
  if (!f.home_osid) continue;
  const homeMun = f.home_osid.split(':')[1];
  if (homeMun === 'bugojno' && f.faction === 'RBiH') {
    console.log(id + ': home=' + f.home_osid + ' loc=' + f.location_osid + ' corps=' + f.corps + ' status=' + f.status);
  }
}

// Check sectors containing repnik_2
console.log('\nSectors containing repnik_2:');
const sectors = save.military.corps_front_sectors;
for (const [sid, s] of Object.entries(sectors)) {
  for (const eid of s.edge_ids) {
    if (eid.includes('repnik_2')) {
      console.log('  ' + sid + ': ' + eid);
    }
  }
}
