const graph = require('../data/derived/operational/operational_contact_graph.json');

// Check distances for the gornja_borovica_2 Case B bridge
const targets = [
  ['op:zavidovici:hajderovici_2', 'op:vares:gornja_borovica_2'],
  ['op:olovo:kamensko_2', 'op:vares:gornja_borovica_2'],
  ['op:zavidovici:ribnica_dio', 'op:vares:gornja_borovica_2'],
  ['op:kakanj:vukanovici', 'op:vares:gornja_borovica_2'],
  ['op:vares:ravne', 'op:vares:gornja_borovica_2'],
  // Also check the krivajevici bridge (the one we already fixed)
  ['op:olovo:olovo_2', 'op:ilijas:krivajevici'],
];

for (const [a, b] of targets) {
  for (const e of graph.edges) {
    if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) {
      const meters = e.min_dist ? (e.min_dist * 111000).toFixed(1) : '0';
      console.log(a.split(':').slice(1).join(':') + ' <-> ' + b.split(':').slice(1).join(':') +
        ': min_dist=' + e.min_dist?.toFixed(7) + ' (' + meters + 'm) type=' + e.type);
    }
  }
}

// List ALL Case B connections through gornja_borovica_2
console.log('\n=== All front edges involving gornja_borovica_2 ===');
const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;
console.log('gornja_borovica_2 control:', ctrl['op:vares:gornja_borovica_2']);

for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.a.includes('gornja_borovica') || e.b.includes('gornja_borovica')) {
    const meters = e.min_dist ? (e.min_dist * 111000).toFixed(1) : '0';
    const aCtrl = ctrl[e.a] || '?';
    const bCtrl = ctrl[e.b] || '?';
    console.log(e.a.split(':').slice(1).join(':') + '(' + aCtrl + ') <-> ' +
      e.b.split(':').slice(1).join(':') + '(' + bCtrl + ') ' + meters + 'm ' + (e.type || ''));
  }
}
