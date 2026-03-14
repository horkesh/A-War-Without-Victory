const save = require('../data/derived/latest_run_final_save.json');
const ctrl = save.political.political_controllers;
const graph = require('../data/derived/operational/operational_contact_graph.json');
const edgesRaw = graph.edges;

// Build adjacency
const adj = new Map();
for (const e of edgesRaw) {
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

function bfsFriendly(start, end, faction) {
  const visited = new Set([start]);
  const queue = [start];
  const parent = new Map();
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === end) {
      const path = [end];
      let n = end;
      while (parent.has(n)) { n = parent.get(n); path.unshift(n); }
      return path;
    }
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb) && ctrl[nb] === faction) {
        visited.add(nb);
        parent.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  return null;
}

console.log('=== FRIENDLY-TERRITORY REACHABILITY CHECK ===\n');

const pairs = [
  ['op:zavidovici:hajderovici_2', 'op:olovo:milankovici_2'],
  ['op:zavidovici:ribnica_dio', 'op:kakanj:brnjic_2'],
  ['op:zavidovici:hajderovici_2', 'op:kakanj:brnjic_2'],
  ['op:zavidovici:hajderovici_2', 'op:banovici:repnik_2'],
  ['op:zavidovici:hajderovici_2', 'op:ilijas:krivajevici'],
];

for (const [a, b] of pairs) {
  const path = bfsFriendly(a, b, 'RBiH');
  if (path) {
    console.log(`${a} -> ${b}: REACHABLE (${path.length} hops)`);
    console.log(`  Path: ${path.join(' -> ')}`);
  } else {
    console.log(`${a} -> ${b}: *** UNREACHABLE ***`);
  }
}

console.log('\n=== OSID CONTROL STATUS ===\n');
const checkOsids = [
  'op:zavidovici:hajderovici_2', 'op:zavidovici:ribnica_dio', 'op:zavidovici:cinovici',
  'op:zavidovici:vozuca_2', 'op:zavidovici:cardak_2', 'op:zavidovici:zavidovici_2',
  'op:olovo:kamensko_2', 'op:olovo:milankovici_2', 'op:olovo:olovo_2',
  'op:kakanj:vukanovici', 'op:kakanj:zgosca', 'op:kakanj:brnjic_2', 'op:kakanj:bukovlje_2',
  'op:kakanj:kakanj_2', 'op:kakanj:trsce_2',
  'op:vares:gornja_borovica_2', 'op:vares:vares_2', 'op:vares:toljenak', 'op:vares:ravne',
  'op:maglaj:gornja_bocinja', 'op:maglaj:donja_bocinja_2',
  'op:banovici:repnik_2',
  'op:kladanj:tuholj_2',
  'op:ilijas:krivajevici',
];
for (const osid of checkOsids) {
  console.log(`  ${osid} -> ${ctrl[osid]}`);
}

// Now check: what friendly component is hajderovici_2 in?
console.log('\n=== FRIENDLY CONNECTED COMPONENT FROM hajderovici_2 ===\n');
const visited = new Set(['op:zavidovici:hajderovici_2']);
const queue = ['op:zavidovici:hajderovici_2'];
while (queue.length > 0) {
  const cur = queue.shift();
  for (const nb of (adj.get(cur) || [])) {
    if (!visited.has(nb) && ctrl[nb] === 'RBiH') {
      visited.add(nb);
      queue.push(nb);
    }
  }
}

// Which sector 23 friendly OSIDs are in this component?
const sector23 = save.military.corps_front_sectors['sector:arbih_2nd_corps:23'];
if (sector23) {
  const friendlyOsids = sector23.sub_segments.flatMap(ss => ss.friendly_osids);
  console.log('Sector 23 friendly OSIDs reachability from hajderovici_2:');
  for (const osid of friendlyOsids) {
    const reachable = visited.has(osid);
    console.log(`  ${osid}: ${reachable ? 'REACHABLE' : '*** UNREACHABLE ***'} (ctrl: ${ctrl[osid]})`);
  }
}

// What about edge adjacency? Why does triple-junction connect across the RS corridor?
console.log('\n=== TRIPLE-JUNCTION ANALYSIS AT kamensko_2 ===\n');
const sector23edges = sector23 ? sector23.edge_ids : [];
const edgesFacingKamensko = sector23edges.filter(eid => eid.includes('kamensko_2'));
console.log('Edges facing kamensko_2 in sector 23:');
for (const eid of edgesFacingKamensko) {
  const [a, b] = eid.split('__');
  const friendly = ctrl[a] === 'RBiH' ? a : b;
  const hostile = ctrl[a] === 'RS' ? a : b;
  console.log(`  ${eid}  friendly=${friendly} hostile=${hostile}`);
}

// Check: are the friendly OSIDs of edges facing kamensko_2 adjacent to each other?
console.log('\nAdjacency between friendly OSIDs facing kamensko_2:');
const friendliesAtKamensko = edgesFacingKamensko.map(eid => {
  const [a, b] = eid.split('__');
  return ctrl[a] === 'RBiH' ? a : b;
});
for (let i = 0; i < friendliesAtKamensko.length; i++) {
  for (let j = i + 1; j < friendliesAtKamensko.length; j++) {
    const a = friendliesAtKamensko[i];
    const b = friendliesAtKamensko[j];
    const areAdj = (adj.get(a) || []).includes(b);
    console.log(`  ${a} <-> ${b}: ${areAdj ? 'ADJACENT (Case B fires!)' : 'not adjacent'}`);
  }
}
