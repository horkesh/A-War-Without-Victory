/**
 * Check whether the Case A connections at hajderovici_2 represent
 * TRUE triple junctions (three polygons meet at a point) or just
 * pairwise adjacency (polygons adjacent but not at same point).
 *
 * If hajderovici_2 borders vukanovici on its SOUTH side and kamensko_2
 * on its EAST side, and those two hostile polygons are adjacent
 * somewhere else (not at hajderovici_2), then there's NO triple junction
 * at hajderovici_2 — the front has TWO SEPARATE segments.
 *
 * We can check this by looking at whether all three pairwise adjacencies
 * exist AND whether the shared boundaries are at the same location.
 * Since we don't have vertex data, we check: do ALL THREE pairs share
 * a boundary? A→B, B→C, and A→C? If A→B and A→C are both true but
 * B→C is only a distance_contact far from A, it's not a true triple junction at A.
 */
const graph = require('../data/derived/operational/operational_contact_graph.json');
const save = require('../data/derived/latest_run_final_save.json');
const ctrl = save.political.political_controllers;

// Build edge lookup
const edgeLookup = new Map();
for (const e of graph.edges) {
  const key1 = `${e.a}|${e.b}`;
  const key2 = `${e.b}|${e.a}`;
  edgeLookup.set(key1, e);
  edgeLookup.set(key2, e);
}

function getEdge(a, b) {
  return edgeLookup.get(`${a}|${b}`) || null;
}

// The critical hub: hajderovici_2 faces three hostile OSIDs
const hub = 'op:zavidovici:hajderovici_2';
const hostiles = [
  'op:kakanj:vukanovici',
  'op:olovo:kamensko_2',
  'op:vares:gornja_borovica_2'
];

console.log(`=== TRIPLE JUNCTION ANALYSIS AT ${hub} ===\n`);
console.log(`Hub control: ${ctrl[hub]}`);
for (const h of hostiles) {
  console.log(`  ${h}: ${ctrl[h]}`);
  const e = getEdge(hub, h);
  if (e) console.log(`    Edge: type=${e.type}, min_dist=${e.min_dist}`);
  else console.log(`    NO DIRECT EDGE`);
}

console.log('\n=== HOSTILE-TO-HOSTILE ADJACENCY (the Case A trigger) ===\n');
for (let i = 0; i < hostiles.length; i++) {
  for (let j = i + 1; j < hostiles.length; j++) {
    const e = getEdge(hostiles[i], hostiles[j]);
    if (e) {
      console.log(`  ${hostiles[i]} <-> ${hostiles[j]}:`);
      console.log(`    type=${e.type}, min_dist=${e.min_dist}`);
      // Is this a true triple junction? All three (hub, hostiles[i], hostiles[j])
      // would need to meet at a point. We can't verify vertex-level, but we can
      // check if the hostile-hostile boundary is geometrically near the hub.
    } else {
      console.log(`  ${hostiles[i]} <-> ${hostiles[j]}: NOT ADJACENT`);
    }
  }
}

// Now let's check: how many hostile OSIDs does hajderovici_2 border?
console.log(`\n=== ALL NEIGHBORS OF ${hub} ===\n`);
const hubNeighbors = graph.edges.filter(e => e.a === hub || e.b === hub);
for (const e of hubNeighbors) {
  const other = e.a === hub ? e.b : e.a;
  console.log(`  ${other}: ctrl=${ctrl[other]}, type=${e.type}, min_dist=${e.min_dist}`);
}

// Check kamensko_2's neighbors — is it truly a huge polygon wrapping around?
console.log(`\n=== ALL NEIGHBORS OF op:olovo:kamensko_2 ===\n`);
const kamNeighbors = graph.edges.filter(e => e.a === 'op:olovo:kamensko_2' || e.b === 'op:olovo:kamensko_2');
console.log(`kamensko_2 has ${kamNeighbors.length} neighbors:`);
for (const e of kamNeighbors) {
  const other = e.a === 'op:olovo:kamensko_2' ? e.b : e.a;
  console.log(`  ${other}: ctrl=${ctrl[other]}, type=${e.type}, min_dist=${e.min_dist}`);
}

// Check gornja_borovica_2's neighbors
console.log(`\n=== ALL NEIGHBORS OF op:vares:gornja_borovica_2 ===\n`);
const gbNeighbors = graph.edges.filter(e => e.a === 'op:vares:gornja_borovica_2' || e.b === 'op:vares:gornja_borovica_2');
console.log(`gornja_borovica_2 has ${gbNeighbors.length} neighbors:`);
for (const e of gbNeighbors) {
  const other = e.a === 'op:vares:gornja_borovica_2' ? e.b : e.a;
  console.log(`  ${other}: ctrl=${ctrl[other]}, type=${e.type}, min_dist=${e.min_dist}`);
}

// The KEY question: does the front at hajderovici_2 have a CONTINUOUS boundary
// segment from vukanovici through gornja_borovica_2 to kamensko_2?
// Or are these separate boundary segments on different faces of the polygon?
// We can approximate by checking: do the hostile polygon centroids form a
// contiguous arc around hajderovici_2, or are they on different sides?
console.log(`\n=== CENTROID POSITIONS (from graph nodes) ===\n`);
const nodeMap = new Map();
for (const n of graph.nodes) {
  nodeMap.set(n.id, n);
}
for (const osid of [hub, ...hostiles]) {
  const node = nodeMap.get(osid);
  if (node) {
    console.log(`  ${osid}: lat=${node.lat?.toFixed(4)}, lon=${node.lon?.toFixed(4)}`);
  }
}

// Compute angles from hub to each hostile
const hubNode = nodeMap.get(hub);
if (hubNode) {
  console.log('\n=== ANGLES FROM HUB TO HOSTILES ===\n');
  for (const h of hostiles) {
    const hNode = nodeMap.get(h);
    if (hNode) {
      const dlat = hNode.lat - hubNode.lat;
      const dlon = hNode.lon - hubNode.lon;
      const angle = Math.atan2(dlat, dlon) * 180 / Math.PI;
      console.log(`  ${h}: angle=${angle.toFixed(1)}° (from hub centroid)`);
    }
  }

  // Also check angles to friendly neighbors
  console.log('\n=== ANGLES FROM HUB TO KEY FRIENDLIES ===\n');
  const friendlies = [
    'op:zavidovici:ribnica_dio', 'op:zavidovici:cinovici',
    'op:kakanj:brnjic_2', 'op:banovici:repnik_2',
  ];
  for (const f of friendlies) {
    const fNode = nodeMap.get(f);
    if (fNode) {
      const dlat = fNode.lat - hubNode.lat;
      const dlon = fNode.lon - hubNode.lon;
      const angle = Math.atan2(dlat, dlon) * 180 / Math.PI;
      console.log(`  ${f}: angle=${angle.toFixed(1)}° ctrl=${ctrl[f]}`);
    }
  }
}
