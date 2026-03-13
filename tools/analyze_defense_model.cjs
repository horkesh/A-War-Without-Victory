const save = require('../data/derived/latest_run_final_save.json');
const graph = require('../data/derived/operational/operational_contact_graph.json');
const st = save.state || save;
const mil = st.military || st;
const sectors = mil.corps_front_sectors;
const formations = mil.formations || {};

// Analyze each sector's defense distribution
console.log('=== SECTOR DEFENSE MODEL ANALYSIS ===');
console.log('REACTIVE_DEFENSE_RATIO = 1.5');
console.log('MIN_DEFENSE_FLOOR_FRACTION = 0.75\n');

const allSectors = Object.values(sectors);
allSectors.sort((a, b) => a.sector_id.localeCompare(b.sector_id));

// For each sector: compute physicalPower per OSID vs reactive capacity
console.log('--- DEFENSE NON-UNIFORMITY PER SECTOR ---');
console.log('(shows how defense varies across front edges within each sector)\n');

let totalOccupied = 0;
let totalEmpty = 0;
let totalEdges = 0;

for (const s of allSectors) {
  if (s.assigned_brigade_ids.length === 0 || s.edge_ids.length === 0) continue;

  const brigades = s.assigned_brigade_ids
    .map(id => formations[id])
    .filter(f => f && f.status === 'active');

  if (brigades.length === 0) continue;

  // Collect all friendly front OSIDs
  const friendlyOsids = new Set();
  for (const ss of s.sub_segments) {
    for (const o of ss.friendly_osids) friendlyOsids.add(o);
  }

  // Map: which OSIDs have brigades physically present?
  const osidBrigades = new Map();
  for (const b of brigades) {
    const loc = b.location_osid;
    if (!loc) continue;
    if (!osidBrigades.has(loc)) osidBrigades.set(loc, []);
    osidBrigades.get(loc).push(b);
  }

  // Count occupied vs empty front OSIDs
  let occupied = 0;
  let empty = 0;
  for (const osid of friendlyOsids) {
    if (osidBrigades.has(osid) && osidBrigades.get(osid).length > 0) occupied++;
    else empty++;
  }

  totalOccupied += occupied;
  totalEmpty += empty;
  totalEdges += s.edge_ids.length;

  // Compute defense at occupied OSID vs empty OSID
  const totalPersonnel = brigades.reduce((s, b) => s + (b.personnel || 0), 0);
  const avgPersonnel = totalPersonnel / brigades.length;
  const avgPower = avgPersonnel; // simplified (without terrain/supply mults)
  const totalPower = totalPersonnel;

  // At an OCCUPIED OSID (1 brigade present):
  // physicalPower ≈ avgPower, sectorReserves = totalPower - avgPower
  // 1-attacker reactive = min(reserves, 1 × avgPower × 1.5)
  const physAtOccupied = avgPower;
  const reservesAtOccupied = totalPower - avgPower;
  const reactive1att = Math.min(reservesAtOccupied, 1 * avgPower * 1.5);
  const defenseOccupied1 = physAtOccupied + reactive1att;

  // At an EMPTY OSID (no brigade present):
  // physicalPower = 0, sectorReserves = totalPower
  // 1-attacker reactive = min(totalPower, 1 × avgPower × 1.5)
  const reactive1attEmpty = Math.min(totalPower, 1 * avgPower * 1.5);
  const defenseEmpty1 = reactive1attEmpty;
  const floorDef = avgPower * 0.75;
  const defenseEmptyWithFloor = Math.max(defenseEmpty1, floorDef);

  // 3-attacker concentrated assault at empty OSID
  const reactive3attEmpty = Math.min(totalPower, 3 * avgPower * 1.5);
  const defense3att = Math.max(reactive3attEmpty, floorDef);

  // Compare: what would it be at RATIO=1.0 (old)?
  const reactive1attOld = Math.min(reservesAtOccupied, 1 * avgPower * 1.0);
  const defenseOccupied1Old = physAtOccupied + reactive1attOld;
  const reactive1attEmptyOld = Math.min(totalPower, 1 * avgPower * 1.0);
  const defenseEmpty1Old = Math.max(reactive1attEmptyOld, floorDef);

  if (s.edge_ids.length >= 5) { // Only show meaningful sectors
    const ratio = defenseOccupied1 > 0 ? (defenseEmptyWithFloor / defenseOccupied1 * 100).toFixed(0) : '?';
    const ratioOld = defenseOccupied1Old > 0 ? (defenseEmpty1Old / defenseOccupied1Old * 100).toFixed(0) : '?';
    console.log(s.sector_id + ' (' + s.faction + ')');
    console.log('  ' + brigades.length + ' brig, ' + s.edge_ids.length + ' edges, ' + occupied + ' occupied / ' + empty + ' empty front OSIDs');
    console.log('  avg personnel: ' + Math.round(avgPersonnel) + ', total: ' + totalPersonnel);
    console.log('  @1.5: occupied=' + Math.round(defenseOccupied1) + ', empty=' + Math.round(defenseEmptyWithFloor) + ', 3-att empty=' + Math.round(defense3att) + ' | empty/occupied=' + ratio + '%');
    console.log('  @1.0: occupied=' + Math.round(defenseOccupied1Old) + ', empty=' + Math.round(defenseEmpty1Old) + ' | empty/occupied=' + ratioOld + '%');
    console.log('  DELTA: occupied +' + Math.round(defenseOccupied1 - defenseOccupied1Old) + ', empty +' + Math.round(defenseEmptyWithFloor - defenseEmpty1Old));
    console.log();
  }
}

console.log('=== FRONT COVERAGE SUMMARY ===');
console.log('Occupied front OSIDs:', totalOccupied);
console.log('Empty front OSIDs:', totalEmpty);
console.log('Coverage ratio:', (totalOccupied / (totalOccupied + totalEmpty) * 100).toFixed(1) + '%');
console.log('Total front edges:', totalEdges);

console.log('\n=== KEY INSIGHT ===');
console.log('At RATIO=1.5, a 1-brigade probe at an empty OSID draws 1.5× avg brigade power from reserves.');
console.log('At RATIO=1.0, it drew only 1.0× — 50% less resistance.');
console.log('But at an OCCUPIED OSID, the brigade is already there (physicalPower) — the reactive');
console.log('component matters LESS because the base is already high.');
console.log('Net effect: empty parts of the line got ~50% stronger, occupied parts got ~20% stronger.');
console.log('This makes probing weak points HARDER (which is the point).');
