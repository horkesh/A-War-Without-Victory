const graph = require('../data/derived/operational/operational_contact_graph.json');
const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;
const formations = s.military.formations;
const sectors = s.military.corps_front_sectors;

// Build adjacency
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

// BFS distance through friendly territory
function bfsDist(from, to, faction) {
  if (from === to) return 0;
  const visited = new Set([from]);
  let frontier = [from];
  let dist = 0;
  while (frontier.length > 0 && dist < 20) {
    dist++;
    const next = [];
    for (const osid of frontier) {
      for (const nb of (adj.get(osid) || [])) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        if (nb === to) return dist;
        if (ctrl[nb] === faction) next.push(nb);
      }
    }
    frontier = next;
  }
  return Infinity;
}

// Build sector front OSID sets
const sectorFronts = {};
for (const [sid, sec] of Object.entries(sectors)) {
  const fronts = new Set();
  for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) fronts.add(o);
  sectorFronts[sid] = fronts;
}

// Check each brigade
const displaced = [];
let totalChecked = 0;
let phase2bCount = 0;
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active') continue;
  if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
  if (!f.location_osid) continue;
  totalChecked++;

  // Find assigned sector
  let assignedSector = null;
  for (const [sid, sec] of Object.entries(sectors)) {
    if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids.includes(fid)) {
      assignedSector = sid;
      break;
    }
  }

  if (!assignedSector) continue;
  const sec = sectors[assignedSector];
  const fronts = sectorFronts[assignedSector];

  // Distance from location to nearest sector front OSID
  let minDist = Infinity;
  for (const frontOsid of fronts) {
    const d = bfsDist(f.location_osid, frontOsid, f.faction);
    if (d < minDist) minDist = d;
  }

  // Distance from home to location
  const homeDist = f.home_osid ? bfsDist(f.home_osid, f.location_osid, f.faction) : 0;

  if (minDist > 5 || homeDist > 8) {
    displaced.push({
      fid,
      name: f.name || fid,
      faction: f.faction,
      corps: sec.corps_id,
      home: f.home_osid,
      loc: f.location_osid,
      sector: assignedSector,
      sectorDist: minDist,
      homeDist,
    });
  }
}

displaced.sort((a, b) => b.sectorDist - a.sectorDist);

console.log('Checked', totalChecked, 'brigades');
console.log('Displaced (>5 hops from sector OR >8 hops from home):', displaced.length);
console.log();
for (const d of displaced) {
  const homeMun = d.home ? d.home.split(':')[1] : '?';
  const locMun = d.loc ? d.loc.split(':')[1] : '?';
  console.log(`  ${d.name} (${d.faction} ${d.corps})`);
  console.log(`    home: ${homeMun}, at: ${locMun}, sector: ${d.sector}`);
  console.log(`    sector_dist=${d.sectorDist} home_dist=${d.homeDist}`);
}

// Sector stats
let total = 0, empty = 0, single = 0, multi = 0;
for (const sec of Object.values(sectors)) {
  total++;
  const bc = sec.assigned_brigade_ids.length + sec.reserve_brigade_ids.length;
  if (bc === 0) empty++;
  else if (bc === 1) single++;
  else multi++;
}
console.log(`\nSectors: ${total} total, ${empty} empty, ${single} single-brig, ${multi} multi-brig`);

// Check unassigned brigades
let unassigned = 0;
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active' || (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group')) continue;
  if (!f.location_osid) continue;
  let found = false;
  for (const sec of Object.values(sectors)) {
    if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids.includes(fid)) { found = true; break; }
  }
  if (!found) unassigned++;
}
console.log('Unassigned brigades:', unassigned);
