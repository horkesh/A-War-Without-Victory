// Check why small sectors can't merge by examining adjacency
const graph = require('../data/derived/operational/operational_contact_graph.json');
const s = require('../data/derived/latest_run_final_save.json');
const sectors = s.military.corps_front_sectors;
const ctrl = s.political.political_controllers;

const GAP = 0.0003; // frontEdgeAdj threshold

// Build frontEdgeAdj
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > GAP) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

// For each small sector, check which other same-corps sectors it's adjacent to
const smallSectors = [];
for (const [sid, sec] of Object.entries(sectors)) {
  if (sec.edge_ids.length <= 2) smallSectors.push({ sid, sec });
}

let noNeighbor = 0;
for (const { sid, sec } of smallSectors) {
  const corps = sec.corps_id;
  // Get friendly OSIDs
  const friendly = new Set();
  for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) friendly.add(o);

  // Find adjacent same-corps sectors
  const neighbors = [];
  for (const [sid2, sec2] of Object.entries(sectors)) {
    if (sid2 === sid || sec2.corps_id !== corps) continue;
    const f2 = new Set();
    for (const ss of sec2.sub_segments) for (const o of ss.friendly_osids) f2.add(o);

    // Check OSID adjacency
    let found = false;
    for (const f of friendly) {
      if (found) break;
      for (const nb of (adj.get(f) || [])) {
        if (f2.has(nb)) { found = true; break; }
      }
    }
    if (found) neighbors.push(sid2);
  }

  if (neighbors.length === 0) {
    noNeighbor++;
    console.log('NO NEIGHBOR: ' + sid + ' (' + corps + ') ' + sec.edge_ids.length + 'e, friendly: ' + [...friendly].join(', '));
  }
}
console.log('\n' + noNeighbor + '/' + smallSectors.length + ' small sectors have NO adjacent same-corps neighbor');
