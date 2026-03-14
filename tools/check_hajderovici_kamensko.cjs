const graph = require('../data/derived/operational/operational_contact_graph.json');

// Check the edge between hajderovici_2 and kamensko_2
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if ((e.a.includes('hajderovici') && e.b.includes('kamensko')) ||
      (e.b.includes('hajderovici') && e.a.includes('kamensko'))) {
    console.log('Edge:', e.a, '<->', e.b, 'min_dist:', e.min_dist, 'type:', e.type);
  }
  // Also check ribnica_dio <-> kamensko
  if ((e.a.includes('ribnica_dio') && e.b.includes('kamensko')) ||
      (e.b.includes('ribnica_dio') && e.a.includes('kamensko'))) {
    console.log('Edge:', e.a, '<->', e.b, 'min_dist:', e.min_dist, 'type:', e.type);
  }
}

// Check what the front edges are around this area
const s = require('../data/derived/latest_run_final_save.json');
const sec = s.military.corps_front_sectors['sector:arbih_1st_corps:11'];
console.log('\nSector 11 front edges:');
for (const eid of sec.edge_ids) {
  console.log('  ' + eid);
}

// Check which edges are on the Zavidovici side and which on Olovo side
console.log('\nZavidovici-side edges (friendly includes zavidovici):');
for (const ss of sec.sub_segments) {
  for (const eid of ss.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    if (a.includes('zavidovic') || b.includes('zavidovic')) {
      console.log('  ' + eid);
    }
  }
}
console.log('\nOlovo-side edges (friendly includes olovo):');
for (const ss of sec.sub_segments) {
  for (const eid of ss.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    if (a.includes('olovo') || b.includes('olovo')) {
      console.log('  ' + eid);
    }
  }
}

// Is this a Case A or Case B connection?
// hajderovici_2 (RBiH) <-> kamensko_2 (RBiH) are both friendly
// If both are front-edge friendly OSIDs, and they face different hostile OSIDs,
// they'd be Case A connected (same friendly, hostile adj)
const ctrl = s.political.political_controllers;
console.log('\nControl around hajderovici_2/kamensko_2:');
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}
for (const osid of ['op:zavidovici:hajderovici_2', 'op:olovo:kamensko_2', 'op:zavidovici:ribnica_dio']) {
  const nbs = adj.get(osid) || [];
  const hostile = nbs.filter(n => ctrl[n] !== 'RBiH');
  const friendly = nbs.filter(n => ctrl[n] === 'RBiH');
  console.log(osid.split(':').slice(1).join(':') + ' ctrl=' + ctrl[osid]);
  console.log('  hostile neighbors:', hostile.map(n => n.split(':').slice(1).join(':') + '(' + ctrl[n] + ')').join(', '));
  console.log('  friendly neighbors:', friendly.map(n => n.split(':').slice(1).join(':')).join(', '));
}
