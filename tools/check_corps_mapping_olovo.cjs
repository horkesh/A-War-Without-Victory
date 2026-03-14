const s = require('../data/derived/latest_run_final_save.json');
const formations = s.military.formations;

// Check what corps Olovo/Zavidovici brigades belong to via getFormationCorpsId logic
// (corps field or parent corps)
console.log('=== Brigade corps assignments for Olovo/Zavidovici/Breza/Vares area ===');
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active' || f.faction !== 'RBiH') continue;
  if (!f.home_osid) continue;
  const mun = f.home_osid.split(':')[1];
  if (['olovo', 'zavidovici', 'breza', 'vares', 'kakanj', 'kladanj'].includes(mun)) {
    // Find which sector this brigade is in
    let sector = 'none';
    for (const [sid, sec] of Object.entries(s.military.corps_front_sectors)) {
      if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids.includes(fid)) {
        sector = sid;
        break;
      }
    }
    console.log((f.name || fid).padEnd(40) + ' corps_id=' + (f.corps_id || '?').padEnd(20) + ' home=' + f.home_osid.padEnd(35) + ' loc=' + (f.location_osid || '?').padEnd(35) + ' sector=' + sector);
  }
}

// Check the 165th Mountain specifically
console.log('\n=== 165th Mountain ===');
for (const [fid, f] of Object.entries(formations)) {
  if (f.name && f.name.includes('165th')) {
    console.log(JSON.stringify({
      id: fid, name: f.name, faction: f.faction,
      corps_id: f.corps_id, home_osid: f.home_osid,
      location_osid: f.location_osid, status: f.status,
    }, null, 2));
  }
}

// Check what mapOsidsToCorps would produce — look at which corps has brigades/HQ nearest to Olovo
console.log('\n=== RBiH corps HQ locations ===');
for (const [fid, f] of Object.entries(formations)) {
  if (f.faction !== 'RBiH' || f.kind !== 'corps') continue;
  console.log(fid + ': ' + (f.name || fid) + ' location=' + f.location_osid);
}

// Check the sector contiguity — are sector 11's friendly OSIDs all connected?
const graph = require('../data/derived/operational/operational_contact_graph.json');
const ctrl = s.political.political_controllers;
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

const sec11 = s.military.corps_front_sectors['sector:arbih_1st_corps:11'];
if (sec11) {
  const friendly = new Set(sec11.sub_segments.flatMap(ss => ss.friendly_osids));
  console.log('\n=== Sector 11 friendly OSID BFS connectivity ===');
  // BFS from first friendly OSID through RBiH territory
  const start = [...friendly][0];
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nb of (adj.get(cur) || [])) {
      if (!visited.has(nb) && ctrl[nb] === 'RBiH') {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  // Check which friendly OSIDs are reachable
  const reachable = [...friendly].filter(o => visited.has(o));
  const unreachable = [...friendly].filter(o => !visited.has(o));
  console.log('Start:', start);
  console.log('Reachable:', reachable.length + '/' + friendly.size);
  if (unreachable.length > 0) {
    console.log('UNREACHABLE:', unreachable);
  } else {
    console.log('All friendly OSIDs connected through RBiH territory');
  }

  // Check direct adjacency between Zavidovici and Olovo OSIDs
  console.log('\n=== Direct adjacency between Zavidovici and Olovo friendly OSIDs ===');
  const zavOsids = [...friendly].filter(o => o.includes('zavidovic'));
  const olovoOsids = [...friendly].filter(o => o.includes('olovo'));
  for (const z of zavOsids) {
    for (const o of olovoOsids) {
      const zAdj = adj.get(z) || [];
      if (zAdj.includes(o)) {
        console.log('ADJACENT: ' + z + ' <-> ' + o);
      }
    }
  }
  // Check what's between them
  console.log('\nPath from zavidovici_2 to olovo_2:');
  const pathStart = 'op:zavidovici:zavidovici_2';
  const pathEnd = 'op:olovo:olovo_2';
  const prev = new Map();
  const vis2 = new Set([pathStart]);
  const q2 = [pathStart];
  let found = false;
  while (q2.length > 0 && !found) {
    const cur = q2.shift();
    for (const nb of (adj.get(cur) || [])) {
      if (!vis2.has(nb) && ctrl[nb] === 'RBiH') {
        vis2.add(nb);
        prev.set(nb, cur);
        q2.push(nb);
        if (nb === pathEnd) { found = true; break; }
      }
    }
  }
  if (found) {
    const path = [];
    let cur = pathEnd;
    while (cur) { path.unshift(cur); cur = prev.get(cur); }
    console.log('Path (' + (path.length - 1) + ' hops):', path.map(p => p.split(':').slice(1).join(':')).join(' -> '));
  } else {
    console.log('NO PATH through RBiH territory');
  }
}
