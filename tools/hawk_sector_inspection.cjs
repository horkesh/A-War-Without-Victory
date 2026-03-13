const save = require('../data/derived/latest_run_final_save.json');
const graph = require('../data/derived/operational/operational_contact_graph.json');
const st = save.state || save;
const mil = st.military || st;
const sectors = mil.corps_front_sectors;
const pc = st.political.political_controllers || {};

// Build OSID adjacency
const osidAdj = new Map();
for (const e of graph.edges) {
  if (!osidAdj.has(e.a)) osidAdj.set(e.a, new Set());
  if (!osidAdj.has(e.b)) osidAdj.set(e.b, new Set());
  osidAdj.get(e.a).add(e.b);
  osidAdj.get(e.b).add(e.a);
}

function areAdj(x, y) { return osidAdj.get(x)?.has(y) || false; }
function parseEdge(eid) {
  const sep = eid.indexOf('__');
  if (sep < 0) return null;
  return { a: eid.slice(0, sep), b: eid.slice(sep + 2) };
}
function getEdgeSides(eid, faction) {
  const p = parseEdge(eid);
  if (!p) return null;
  const ctrlA = pc[p.a], ctrlB = pc[p.b];
  if (ctrlA === faction && ctrlB !== faction) return { friendly: p.a, hostile: p.b };
  if (ctrlB === faction && ctrlA !== faction) return { friendly: p.b, hostile: p.a };
  return null;
}

function buildTJAdj(edgeIds, faction) {
  const parsed = [];
  for (const eid of edgeIds) {
    const sides = getEdgeSides(eid, faction);
    if (sides) parsed.push({ eid, ...sides });
  }
  const adj = new Map();
  for (const eid of edgeIds) adj.set(eid, []);
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i], b = parsed[j];
      let connected = false;
      if (a.friendly === b.friendly && areAdj(a.hostile, b.hostile)) connected = true;
      if (a.hostile === b.hostile && areAdj(a.friendly, b.friendly)) connected = true;
      if (connected) {
        adj.get(a.eid).push(b.eid);
        adj.get(b.eid).push(a.eid);
      }
    }
  }
  return { adj, parsedCount: parsed.length };
}

function findComponents(items, neighborFn) {
  const visited = new Set();
  const components = [];
  for (const item of items) {
    if (visited.has(item)) continue;
    const comp = []; const queue = [item]; visited.add(item);
    while (queue.length) {
      const cur = queue.shift(); comp.push(cur);
      for (const n of neighborFn(cur)) {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    components.push(comp);
  }
  return components;
}

// ===== FULL HAWK INSPECTION =====
const allSectors = Object.values(sectors);
allSectors.sort((a, b) => a.sector_id.localeCompare(b.sector_id));

console.log('=== SECTOR HAWK INSPECTION (n665, hash 0ca780c065365530) ===');
console.log('Total sectors:', allSectors.length);

// 1. Per-faction summary
const factions = [...new Set(allSectors.map(s => s.faction))].sort();
for (const f of factions) {
  const fs = allSectors.filter(s => s.faction === f);
  const totalEdges = fs.reduce((s, x) => s + x.edge_ids.length, 0);
  const totalBrig = fs.reduce((s, x) => s + x.assigned_brigade_ids.length, 0);
  const empty = fs.filter(s => s.assigned_brigade_ids.length === 0).length;
  const multiSub = fs.filter(s => s.sub_segments.length > 1).length;
  console.log('  ' + f + ': ' + fs.length + ' sectors, ' + totalEdges + ' edges, ' + totalBrig + ' brigades, ' + empty + ' empty, ' + multiSub + ' multi-subseg');
}

// 2. Contiguity check
let broken = 0;
const brokenList = [];
for (const s of allSectors) {
  if (s.edge_ids.length <= 1) continue;
  const { adj } = buildTJAdj(s.edge_ids, s.faction);
  const comps = findComponents(s.edge_ids, eid => adj.get(eid) || []);
  if (comps.length > 1) {
    broken++;
    brokenList.push({ id: s.sector_id, edges: s.edge_ids.length, comps: comps.length, sizes: comps.map(c => c.length).sort((a,b) => b-a) });
  }
}
console.log('\n--- CONTIGUITY (triple-junction) ---');
console.log('Contiguous:', allSectors.length - broken, '/', allSectors.length);
if (brokenList.length) {
  console.log('Multi-component:');
  for (const b of brokenList) console.log('  ' + b.id + ' edges:' + b.edges + ' comps:' + b.comps + ' sizes:[' + b.sizes.join(',') + ']');
}

// 3. Same-faction edge overlap
console.log('\n--- EDGE OVERLAP (same faction) ---');
const edgeToSectors = new Map();
for (const s of allSectors) {
  for (const eid of s.edge_ids) {
    const list = edgeToSectors.get(eid) || [];
    list.push({ sid: s.sector_id, faction: s.faction });
    edgeToSectors.set(eid, list);
  }
}
let edgeOverlap = 0;
for (const [eid, entries] of edgeToSectors) {
  const sameFaction = new Map();
  for (const e of entries) {
    if (!sameFaction.has(e.faction)) sameFaction.set(e.faction, []);
    sameFaction.get(e.faction).push(e.sid);
  }
  for (const [f, sids] of sameFaction) {
    if (sids.length > 1) {
      edgeOverlap++;
      if (edgeOverlap <= 5) console.log('  ' + eid + ' → ' + sids.join(', ') + ' (' + f + ')');
    }
  }
}
console.log('Total same-faction edge overlaps:', edgeOverlap);

// 4. Shared territory
console.log('\n--- SHARED TERRITORY ---');
const osidToSectors = new Map();
for (const s of allSectors) {
  for (const o of s.territory_osids) {
    const list = osidToSectors.get(o) || [];
    list.push({ sid: s.sector_id, faction: s.faction });
    osidToSectors.set(o, list);
  }
}
let sharedTerritory = 0, sameFactionShared = 0, crossFactionShared = 0;
for (const [osid, entries] of osidToSectors) {
  if (entries.length > 1) {
    sharedTerritory++;
    const facs = new Set(entries.map(e => e.faction));
    if (facs.size === 1) sameFactionShared++;
    else crossFactionShared++;
  }
}
console.log('Total shared:', sharedTerritory, '(same-faction:', sameFactionShared, ', cross-faction:', crossFactionShared + ')');

// 5. Brigade duplication
console.log('\n--- BRIGADE DUPLICATION ---');
const brigToSectors = new Map();
for (const s of allSectors) {
  for (const bid of s.assigned_brigade_ids) {
    const list = brigToSectors.get(bid) || [];
    list.push(s.sector_id);
    brigToSectors.set(bid, list);
  }
}
let dupBrigades = 0;
for (const [bid, sects] of brigToSectors) {
  if (sects.length > 1) {
    dupBrigades++;
    console.log('  DUP: ' + bid + ' in ' + sects.join(', '));
  }
}
console.log('Duplicate brigade assignments:', dupBrigades);

// 6. Cross-faction assignment
console.log('\n--- CROSS-FACTION ASSIGNMENT ---');
const formations = st.military.formations || {};
let crossFaction = 0;
for (const s of allSectors) {
  for (const bid of s.assigned_brigade_ids) {
    const f = formations[bid];
    if (f && f.faction !== s.faction) {
      crossFaction++;
      console.log('  ' + bid + ' (' + f.faction + ') in ' + s.sector_id + ' (' + s.faction + ')');
    }
  }
}
console.log('Cross-faction assignments:', crossFaction);

// 7. Empty sectors
console.log('\n--- EMPTY SECTORS (front edges, 0 brigades) ---');
const emptySectors = allSectors.filter(s => s.assigned_brigade_ids.length === 0 && s.edge_ids.length > 0);
for (const s of emptySectors) {
  console.log('  ' + s.sector_id + ' edges:' + s.edge_ids.length + ' terr:' + s.territory_osids.length + ' corps:' + s.corps_id);
}
console.log('Total:', emptySectors.length);

// 8. Same-faction front edges (both sides same controller)
console.log('\n--- SAME-FACTION FRONT EDGES (should be 0) ---');
let sameFactionEdges = 0;
for (const s of allSectors) {
  for (const eid of s.edge_ids) {
    const p = parseEdge(eid);
    if (!p) continue;
    if (pc[p.a] === pc[p.b] && pc[p.a] === s.faction) {
      sameFactionEdges++;
      if (sameFactionEdges <= 5) console.log('  ' + s.sector_id + ': ' + eid + ' both ' + pc[p.a]);
    }
  }
}
console.log('Total:', sameFactionEdges);

// 9. Size distribution
console.log('\n--- SIZE DISTRIBUTION ---');
const bins = { '1-3': 0, '4-8': 0, '9-15': 0, '16-25': 0, '26+': 0 };
for (const s of allSectors) {
  const e = s.edge_ids.length;
  if (e <= 3) bins['1-3']++;
  else if (e <= 8) bins['4-8']++;
  else if (e <= 15) bins['9-15']++;
  else if (e <= 25) bins['16-25']++;
  else bins['26+']++;
}
for (const [k, v] of Object.entries(bins)) console.log('  ' + k + ' edges: ' + v + ' sectors');

// 10. Density extremes
console.log('\n--- DENSITY EXTREMES ---');
const manned = allSectors.filter(s => s.assigned_brigade_ids.length > 0 && s.edge_ids.length > 0);
manned.sort((a, b) => (b.assigned_brigade_ids.length / b.edge_ids.length) - (a.assigned_brigade_ids.length / a.edge_ids.length));
const densest = manned[0];
const thinnest = manned[manned.length - 1];
console.log('Densest:  ' + densest.sector_id + ' ' + densest.assigned_brigade_ids.length + '/' + densest.edge_ids.length + ' = ' + (densest.assigned_brigade_ids.length / densest.edge_ids.length).toFixed(3));
console.log('Thinnest: ' + thinnest.sector_id + ' ' + thinnest.assigned_brigade_ids.length + '/' + thinnest.edge_ids.length + ' = ' + (thinnest.assigned_brigade_ids.length / thinnest.edge_ids.length).toFixed(3));
console.log('Ratio: ' + ((densest.assigned_brigade_ids.length / densest.edge_ids.length) / (thinnest.assigned_brigade_ids.length / thinnest.edge_ids.length)).toFixed(1) + ':1');

// 11. Disconnected brigade check (brigade in sector it can't physically reach)
console.log('\n--- DISCONNECTED BRIGADES ---');
// Build friendly components per faction
const factionOsids = new Map();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (!factionOsids.has(ctrl)) factionOsids.set(ctrl, new Set());
  factionOsids.get(ctrl).add(osid);
}
function getFriendlyComponent(startOsid, faction) {
  const friendly = factionOsids.get(faction);
  if (!friendly || !friendly.has(startOsid)) return new Set();
  const visited = new Set([startOsid]);
  const queue = [startOsid];
  while (queue.length) {
    const cur = queue.shift();
    const neighbors = osidAdj.get(cur);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (!visited.has(n) && friendly.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

let disconnected = 0;
for (const s of allSectors) {
  if (s.territory_osids.length === 0) continue;
  // Pick any sector territory OSID as representative
  const sectorOsid = s.territory_osids[0];
  const sectorComp = getFriendlyComponent(sectorOsid, s.faction);

  for (const bid of s.assigned_brigade_ids) {
    const f = formations[bid];
    if (!f) continue;
    const loc = f.location_osid;
    if (!loc) continue;
    if (!sectorComp.has(loc)) {
      disconnected++;
      console.log('  ' + bid + ' at ' + loc + ' cannot reach ' + s.sector_id + ' (terr[0]=' + sectorOsid + ')');
    }
  }
}
console.log('Disconnected brigades:', disconnected);

// 12. Per-corps sector listing
console.log('\n--- PER-CORPS SECTORS ---');
const byCorps = new Map();
for (const s of allSectors) {
  if (!byCorps.has(s.corps_id)) byCorps.set(s.corps_id, []);
  byCorps.get(s.corps_id).push(s);
}
for (const [corps, ss] of [...byCorps.entries()].sort((a,b) => a[0].localeCompare(b[0]))) {
  ss.sort((a, b) => a.sector_id.localeCompare(b.sector_id));
  const totalE = ss.reduce((s, x) => s + x.edge_ids.length, 0);
  const totalB = ss.reduce((s, x) => s + x.assigned_brigade_ids.length, 0);
  const empty = ss.filter(x => x.assigned_brigade_ids.length === 0).length;
  console.log(corps + ': ' + ss.length + ' sectors, ' + totalE + ' edges, ' + totalB + ' brigades' + (empty ? ', ' + empty + ' empty' : ''));
  for (const s of ss) {
    const density = s.edge_ids.length > 0 ? (s.assigned_brigade_ids.length / s.edge_ids.length).toFixed(2) : 'n/a';
    console.log('  ' + s.sector_id + ' e:' + s.edge_ids.length + ' b:' + s.assigned_brigade_ids.length + ' t:' + s.territory_osids.length + ' ss:' + s.sub_segments.length + ' d:' + density);
  }
}
