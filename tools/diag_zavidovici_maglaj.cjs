const save = require('../data/derived/latest_run_final_save.json');
const graph = require('../data/derived/operational/operational_contact_graph.json');
const st = save.state || save;
const mil = st.military || st;
const sectors = mil.corps_front_sectors;
const pc = st.political.political_controllers || {};
const formations = st.military.formations || {};

// Build OSID adjacency from contact graph
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
  if (ctrlA === faction && ctrlB !== faction) return { friendly: p.a, hostile: p.b, hostileCtrl: ctrlB };
  if (ctrlB === faction && ctrlA !== faction) return { friendly: p.b, hostile: p.a, hostileCtrl: ctrlA };
  return null;
}

// Area keywords to match
const AREA_KEYWORDS = ['zavidovic', 'maglaj'];
const CONTROL_KEYWORDS = ['zavidovic', 'maglaj', 'tesanj', 'doboj', 'bocinja', 'kosova', 'vozuca', 'lijesnica'];

function matchesArea(osid) {
  return AREA_KEYWORDS.some(kw => osid.includes(kw));
}

function matchesControlKeywords(osid) {
  return CONTROL_KEYWORDS.some(kw => osid.includes(kw));
}

function sectorMatchesArea(s) {
  const allOsids = [
    ...s.territory_osids,
    ...s.sub_segments.flatMap(ss => ss.friendly_osids),
    ...s.sub_segments.flatMap(ss => ss.enemy_osids),
  ];
  return allOsids.some(matchesArea);
}

// ============================================================
// 1. POLITICAL CONTROLLERS
// ============================================================
console.log('=== POLITICAL CONTROLLERS (zavidovic/maglaj/tesanj/doboj/bocinja/kosova/vozuca/lijesnica) ===\n');
const controlledOsids = Object.entries(pc)
  .filter(([osid]) => matchesControlKeywords(osid))
  .sort((a, b) => a[0].localeCompare(b[0]));

const byMun = new Map();
for (const [osid, ctrl] of controlledOsids) {
  const mun = osid.split(':')[1] || 'unknown';
  if (!byMun.has(mun)) byMun.set(mun, []);
  byMun.get(mun).push({ osid, ctrl });
}
for (const [mun, entries] of [...byMun.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const factionCounts = {};
  for (const e of entries) factionCounts[e.ctrl] = (factionCounts[e.ctrl] || 0) + 1;
  const summary = Object.entries(factionCounts).map(([f, c]) => f + ':' + c).join(' ');
  console.log(mun + ' (' + entries.length + ' OSIDs) — ' + summary);
  for (const e of entries) {
    console.log('  ' + e.osid + ' → ' + e.ctrl);
  }
}
console.log('\nTotal OSIDs matching keywords:', controlledOsids.length);

// ============================================================
// 2. RBiH SECTORS matching area
// ============================================================
const allSectors = Object.values(sectors);

function printSectorDetail(s, label) {
  console.log('--- ' + label + ': ' + s.sector_id + ' ---');
  console.log('  corps_id: ' + s.corps_id);
  console.log('  faction: ' + s.faction);
  console.log('  edge_ids (' + s.edge_ids.length + '):');
  for (const eid of s.edge_ids) {
    const sides = getEdgeSides(eid, s.faction);
    if (sides) {
      console.log('    ' + eid + '  friendly=' + sides.friendly + ' (' + s.faction + ')  hostile=' + sides.hostile + ' (' + sides.hostileCtrl + ')');
    } else {
      const p = parseEdge(eid);
      if (p) {
        console.log('    ' + eid + '  ' + p.a + ' (' + (pc[p.a] || '?') + ') vs ' + p.b + ' (' + (pc[p.b] || '?') + ')  [SIDES UNCLEAR for ' + s.faction + ']');
      } else {
        console.log('    ' + eid + '  [PARSE FAILED]');
      }
    }
  }
  console.log('  sub_segments (' + s.sub_segments.length + '):');
  for (let i = 0; i < s.sub_segments.length; i++) {
    const ss = s.sub_segments[i];
    console.log('    [' + i + '] friendly: ' + (ss.friendly_osids || []).join(', '));
    console.log('    [' + i + '] enemy:    ' + (ss.enemy_osids || []).join(', '));
  }
  console.log('  territory_osids (' + s.territory_osids.length + '): ' + s.territory_osids.join(', '));
  console.log('  assigned_brigade_ids (' + s.assigned_brigade_ids.length + '): ' + s.assigned_brigade_ids.join(', '));
  // Brigade details
  for (const bid of s.assigned_brigade_ids) {
    const f = formations[bid];
    if (f) {
      console.log('    ' + bid + ': pers=' + (f.personnel || 0) + ' loc=' + (f.location_osid || '?') + ' status=' + (f.status || '?') + ' morale=' + (f.morale || 0) + ' cohesion=' + (f.cohesion || 0));
    }
  }
  console.log();
}

console.log('\n=== RBiH SECTORS MATCHING ZAVIDOVICI/MAGLAJ ===\n');
const rbihMatching = allSectors.filter(s => s.faction === 'RBiH' && sectorMatchesArea(s));
rbihMatching.sort((a, b) => a.sector_id.localeCompare(b.sector_id));
if (rbihMatching.length === 0) {
  console.log('  (none found)');
} else {
  for (const s of rbihMatching) printSectorDetail(s, 'RBiH');
}

// ============================================================
// 3. RS SECTORS matching area
// ============================================================
console.log('\n=== RS SECTORS MATCHING ZAVIDOVICI/MAGLAJ ===\n');
const rsMatching = allSectors.filter(s => s.faction === 'RS' && sectorMatchesArea(s));
rsMatching.sort((a, b) => a.sector_id.localeCompare(b.sector_id));
if (rsMatching.length === 0) {
  console.log('  (none found)');
} else {
  for (const s of rsMatching) printSectorDetail(s, 'RS');
}

// ============================================================
// 4. HRHB SECTORS matching area (just in case)
// ============================================================
const hrhbMatching = allSectors.filter(s => s.faction === 'HRHB' && sectorMatchesArea(s));
if (hrhbMatching.length > 0) {
  console.log('\n=== HRHB SECTORS MATCHING ZAVIDOVICI/MAGLAJ ===\n');
  for (const s of hrhbMatching) printSectorDetail(s, 'HRHB');
}

// ============================================================
// 5. CONTIGUITY CHECK — edges in disconnected components
// ============================================================
console.log('\n=== EDGE CONTIGUITY CHECK (triple-junction adjacency) ===\n');

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
      // Case A: same friendly + hostile neighbors
      if (a.friendly === b.friendly && areAdj(a.hostile, b.hostile)) connected = true;
      // Case B: same hostile + friendly neighbors
      if (a.hostile === b.hostile && areAdj(a.friendly, b.friendly)) connected = true;
      if (connected) {
        adj.get(a.eid).push(b.eid);
        adj.get(b.eid).push(a.eid);
      }
    }
  }
  return { adj, parsed };
}

function findComponents(items, neighborFn) {
  const visited = new Set();
  const components = [];
  for (const item of items) {
    if (visited.has(item)) continue;
    const comp = [];
    const queue = [item];
    visited.add(item);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const n of neighborFn(cur)) {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    components.push(comp);
  }
  return components;
}

const allMatching = [...rbihMatching, ...rsMatching, ...hrhbMatching];
for (const s of allMatching) {
  if (s.edge_ids.length <= 1) {
    console.log(s.sector_id + ': ' + s.edge_ids.length + ' edge(s) — trivially contiguous');
    continue;
  }
  const { adj, parsed } = buildTJAdj(s.edge_ids, s.faction);
  const comps = findComponents(s.edge_ids, eid => adj.get(eid) || []);
  const status = comps.length === 1 ? 'CONTIGUOUS' : 'MULTI-COMPONENT (' + comps.length + ')';
  console.log(s.sector_id + ' (' + s.faction + '): ' + s.edge_ids.length + ' edges, ' + parsed.length + ' parsed → ' + status);
  if (comps.length > 1) {
    for (let c = 0; c < comps.length; c++) {
      console.log('  Component ' + c + ' (' + comps[c].length + ' edges):');
      for (const eid of comps[c]) {
        const sides = getEdgeSides(eid, s.faction);
        if (sides) {
          console.log('    ' + eid + '  fr=' + sides.friendly + ' ho=' + sides.hostile);
        } else {
          console.log('    ' + eid + '  [unparsed]');
        }
      }
    }
  }
}

// ============================================================
// 6. SHARED TERRITORY — OSIDs claimed by multiple sectors
// ============================================================
console.log('\n=== SHARED TERRITORY IN AREA ===\n');
const osidToSectors = new Map();
for (const s of allSectors) {
  for (const o of s.territory_osids) {
    if (!matchesArea(o)) continue;
    const list = osidToSectors.get(o) || [];
    list.push({ sid: s.sector_id, faction: s.faction, corps: s.corps_id });
    osidToSectors.set(o, list);
  }
}
let sharedCount = 0;
for (const [osid, entries] of [...osidToSectors.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (entries.length > 1) {
    sharedCount++;
    console.log('  SHARED: ' + osid + ' (' + pc[osid] + ') → ' + entries.map(e => e.sid + ' (' + e.faction + '/' + e.corps + ')').join(', '));
  }
}
if (sharedCount === 0) console.log('  No shared territory OSIDs in area.');
else console.log('Total shared: ' + sharedCount);

// ============================================================
// 7. CROSS-FRONT SUMMARY — what faces what
// ============================================================
console.log('\n=== CROSS-FRONT SUMMARY (edges in area) ===\n');
const edgeSummary = new Map();
for (const s of allMatching) {
  for (const eid of s.edge_ids) {
    const p = parseEdge(eid);
    if (!p) continue;
    if (!matchesArea(p.a) && !matchesArea(p.b)) continue;
    const ctrlA = pc[p.a] || '?', ctrlB = pc[p.b] || '?';
    const key = ctrlA < ctrlB ? ctrlA + ' vs ' + ctrlB : ctrlB + ' vs ' + ctrlA;
    edgeSummary.set(key, (edgeSummary.get(key) || 0) + 1);
  }
}
for (const [key, count] of [...edgeSummary.entries()].sort()) {
  console.log('  ' + key + ': ' + count + ' edges');
}
