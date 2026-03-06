const fs = require('fs');
const runDir = 'runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n193';
const save = JSON.parse(fs.readFileSync(runDir + '/final_save.json', 'utf8'));
const state = save.state || save.gameState || save;
const cfs = state.corps_front_sectors || {};
const formations = state.formations || {};
const pc = state.political_controllers || {};

// Check: any sector has a brigade NOT in pocket?
console.log('=== Sectors with <=2 friendly OSIDs — checking brigade locations ===');
let crossPocketCount = 0;
let emptyPocketCount = 0;
for (const [sectorId, sector] of Object.entries(cfs)) {
  const friendlyOsids = sector.sub_segments.flatMap(ss => ss.friendly_osids);
  if (friendlyOsids.length > 2) continue;

  const allBids = [...(sector.assigned_brigade_ids || []), ...(sector.reserve_brigade_ids || [])];
  if (allBids.length === 0) {
    emptyPocketCount++;
    continue;
  }

  for (const bid of allBids) {
    const f = formations[bid];
    if (!f) continue;
    const inPocket = friendlyOsids.includes(f.location_osid);
    if (!inPocket) {
      crossPocketCount++;
      console.log('  CROSS-POCKET:', sectorId, '| brigade:', bid, '(', f.name, ') @ ', f.location_osid, '| sector friendly:', JSON.stringify(friendlyOsids));
    }
  }
}
console.log('\nCross-pocket assignments:', crossPocketCount);
console.log('Empty pocket sectors (correct):', emptyPocketCount);

// Broader check: any brigade assigned to sector where it can't reach through friendly territory?
// Simplified: check if brigade location_osid is in the same connected component as sector friendly_osids
console.log('\n=== Overall sector assignment stats ===');
let totalSectors = 0;
let sectorsWithBrigades = 0;
let sectorsEmpty = 0;
let totalAssigned = 0;
let totalReserve = 0;
for (const [sectorId, sector] of Object.entries(cfs)) {
  totalSectors++;
  const a = (sector.assigned_brigade_ids || []).length;
  const r = (sector.reserve_brigade_ids || []).length;
  totalAssigned += a;
  totalReserve += r;
  if (a + r > 0) sectorsWithBrigades++;
  else sectorsEmpty++;
}
console.log('Total sectors:', totalSectors);
console.log('Sectors with brigades:', sectorsWithBrigades);
console.log('Empty sectors:', sectorsEmpty);
console.log('Total assigned:', totalAssigned);
console.log('Total reserve:', totalReserve);

// Troop strength summary
console.log('\n=== Troop Strength at w40 ===');
const factionTroops = {};
for (const [id, f] of Object.entries(formations)) {
  if (f.kind !== 'brigade' || f.status !== 'active') continue;
  const fac = f.faction;
  factionTroops[fac] = (factionTroops[fac] || 0) + (f.personnel || 0);
}
for (const [fac, troops] of Object.entries(factionTroops).sort()) {
  console.log(fac + ':', (troops / 1000).toFixed(1) + 'k');
}

// Run summary
const summary = JSON.parse(fs.readFileSync(runDir + '/run_summary.json', 'utf8'));
if (summary.benchmarks) {
  console.log('\n=== Benchmarks ===');
  for (const b of summary.benchmarks) {
    console.log(b.id, ':', b.pass ? 'PASS' : 'FAIL', '|', b.description || '', '| actual:', b.actual, '| target:', b.target);
  }
}
