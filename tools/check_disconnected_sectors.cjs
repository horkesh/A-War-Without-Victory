/**
 * Find all sectors where assigned brigades cannot physically reach the sector
 * through friendly territory. Uses operational_contact_graph for adjacency.
 */
const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;

// Build OSID adjacency from operational_contact_graph
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const adjacency = new Map();
function addEdge(a, b) {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a).add(b);
  adjacency.get(b).add(a);
}
for (const edge of graph.edges) {
  addEdge(edge.a, edge.b);
}
console.log('Loaded', graph.edges.length, 'edges,', graph.nodes.length, 'nodes\n');

// Build per-faction OSID sets
const factionOsids = {};
for (const [, s] of Object.entries(sectors)) {
  const faction = s.faction;
  if (!factionOsids[faction]) factionOsids[faction] = new Set();
  for (const osid of s.territory_osids) factionOsids[faction].add(osid);
  for (const ss of s.sub_segments || []) {
    for (const o of ss.friendly_osids) factionOsids[faction].add(o);
  }
}

// BFS reachability through same-faction territory
function canReach(startOsid, targetOsids, faction) {
  const targets = new Set(targetOsids);
  if (targets.has(startOsid)) return true;
  const friendlySet = factionOsids[faction] || new Set();
  const visited = new Set([startOsid]);
  let frontier = [startOsid];
  while (frontier.length > 0) {
    const next = [];
    for (const curr of frontier) {
      const neighbors = adjacency.get(curr);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        if (targets.has(n)) return true;
        if (friendlySet.has(n)) next.push(n);
      }
    }
    frontier = next;
  }
  return false;
}

// Find the "main blob" for each corps (largest connected component of corps territory)
function getCorpsMainBlob(corpsId, faction) {
  const allCorpsOsids = new Set();
  for (const [, s] of Object.entries(sectors)) {
    if (s.corps_id !== corpsId) continue;
    for (const o of s.territory_osids) allCorpsOsids.add(o);
    for (const ss of s.sub_segments || []) {
      for (const o of ss.friendly_osids) allCorpsOsids.add(o);
    }
  }

  const friendlySet = factionOsids[faction] || new Set();
  // Find connected components
  const visited = new Set();
  const components = [];
  for (const osid of allCorpsOsids) {
    if (visited.has(osid)) continue;
    const component = new Set();
    const queue = [osid];
    visited.add(osid);
    while (queue.length > 0) {
      const curr = queue.shift();
      component.add(curr);
      const neighbors = adjacency.get(curr);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (visited.has(n)) continue;
        if (!allCorpsOsids.has(n) && !friendlySet.has(n)) continue;
        if (allCorpsOsids.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    components.push(component);
  }

  // Return largest component
  components.sort((a, b) => b.size - a.size);
  return components[0] || new Set();
}

console.log('=== DISCONNECTED BRIGADE ASSIGNMENTS ===\n');
let bugCount = 0;
const sectorEntries = Object.entries(sectors).sort((a, b) => a[0].localeCompare(b[0]));

for (const [sid, s] of sectorEntries) {
  const allSectorOsids = [
    ...s.territory_osids,
    ...(s.sub_segments || []).flatMap(ss => ss.friendly_osids)
  ];
  const allBrigades = [...(s.assigned_brigade_ids || []), ...(s.reserve_brigade_ids || [])];

  for (const bid of allBrigades) {
    const f = formations[bid];
    if (!f || !f.location_osid) continue;

    const reachable = canReach(f.location_osid, allSectorOsids, s.faction);
    if (!reachable) {
      bugCount++;
      console.log('DISCONNECTED:', bid);
      console.log('  Corps:', s.corps_id, '| Sector:', sid);
      console.log('  Brigade at:', f.location_osid, '| Personnel:', f.personnel);
      console.log('  Sector front:', (s.sub_segments || []).flatMap(ss => ss.friendly_osids));
      console.log('  Sector territory:', s.territory_osids.length, 'OSIDs');

      // Find which sector the brigade is ACTUALLY in
      for (const [sid2, s2] of sectorEntries) {
        if (s2.corps_id !== s.corps_id) continue;
        const osids2 = [
          ...s2.territory_osids,
          ...(s2.sub_segments || []).flatMap(ss => ss.friendly_osids)
        ];
        if (osids2.includes(f.location_osid)) {
          console.log('  Actually in:', sid2);
          break;
        }
      }
      console.log();
    }
  }
}

if (bugCount === 0) {
  console.log('No disconnected brigade assignments found.');
} else {
  console.log('Total disconnected assignments:', bugCount);
}

// Find sectors that are disconnected pockets (not reachable from corps main blob)
console.log('\n=== DISCONNECTED SECTOR POCKETS ===\n');
const corpsMainBlobs = {};
let disconnectedSectorCount = 0;
for (const [sid, s] of sectorEntries) {
  if (s.territory_osids.length === 0) continue;
  const key = s.corps_id + ':' + s.faction;
  if (!corpsMainBlobs[key]) {
    corpsMainBlobs[key] = getCorpsMainBlob(s.corps_id, s.faction);
  }
  const mainBlob = corpsMainBlobs[key];

  // Check if any of this sector's OSIDs are in the main blob
  const sectorOsids = [...s.territory_osids, ...(s.sub_segments || []).flatMap(ss => ss.friendly_osids)];
  const inMainBlob = sectorOsids.some(o => mainBlob.has(o));

  if (!inMainBlob) {
    disconnectedSectorCount++;
    console.log('POCKET:', sid);
    console.log('  Corps:', s.corps_id, '| Faction:', s.faction);
    console.log('  Territory:', s.territory_osids);
    console.log('  Assigned:', (s.assigned_brigade_ids || []).length, (s.assigned_brigade_ids || []));
    for (const bid of (s.assigned_brigade_ids || [])) {
      const f = formations[bid];
      if (f) console.log('    ', bid, 'at', f.location_osid, 'pers:', f.personnel);
    }
    console.log();
  }
}
console.log('Total disconnected sector pockets:', disconnectedSectorCount);
