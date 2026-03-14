/**
 * Diagnostic: sector/brigade assignment state from latest run save.
 * Checks brigade assignment coverage, per-faction stats, empty sectors, top sectors.
 */
const fs = require('fs');
const path = require('path');

const saveFile = path.join(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const save = JSON.parse(fs.readFileSync(saveFile, 'utf8'));

const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;

// ── 1. Build formation index ──
const allFormations = Object.values(formations);
const activeBrigades = allFormations.filter(f =>
  f.kind === 'brigade' && f.status !== 'dissolved' && f.personnel > 0
);
const dissolvedBrigades = allFormations.filter(f =>
  f.kind === 'brigade' && (f.status === 'dissolved' || f.personnel <= 0)
);

console.log('=== FORMATION SUMMARY ===');
console.log(`Total formations: ${allFormations.length}`);
console.log(`Total brigades (kind=brigade): ${allFormations.filter(f => f.kind === 'brigade').length}`);
console.log(`Active brigades (personnel>0, not dissolved): ${activeBrigades.length}`);
console.log(`Dissolved/dead brigades: ${dissolvedBrigades.length}`);
console.log();

// ── 2. Sector analysis ──
const sectorEntries = Object.entries(sectors);
console.log(`=== SECTOR SUMMARY ===`);
console.log(`Total sectors: ${sectorEntries.length}`);
console.log();

// Collect all assigned brigade IDs across all sectors
const allAssigned = new Set();
const allReserve = new Set();
const sectorData = [];

for (const [sectorId, sector] of sectorEntries) {
  const assigned = sector.assigned_brigade_ids || [];
  const reserve = sector.reserve_brigade_ids || [];
  assigned.forEach(id => allAssigned.add(id));
  reserve.forEach(id => allReserve.add(id));
  sectorData.push({
    sectorId,
    faction: sector.faction,
    corpsId: sector.corps_id,
    assignedCount: assigned.length,
    reserveCount: reserve.length,
    edgeCount: (sector.edge_ids || []).length,
    assigned,
    reserve,
    stance: sector.sector_stance,
  });
}

console.log(`=== ASSIGNMENT COVERAGE ===`);
console.log(`Brigades assigned to ANY sector: ${allAssigned.size}`);
console.log(`Brigades in reserve in ANY sector: ${allReserve.size}`);
console.log(`Union (assigned + reserve): ${new Set([...allAssigned, ...allReserve]).size}`);
console.log(`Active brigades NOT in any sector: ${activeBrigades.filter(b => !allAssigned.has(b.id) && !allReserve.has(b.id)).length}`);
console.log();

// List unassigned active brigades
const unassigned = activeBrigades.filter(b => !allAssigned.has(b.id) && !allReserve.has(b.id));
if (unassigned.length > 0) {
  console.log(`=== UNASSIGNED ACTIVE BRIGADES (${unassigned.length}) ===`);
  // Group by faction
  const byFaction = {};
  for (const b of unassigned) {
    if (!byFaction[b.faction]) byFaction[b.faction] = [];
    byFaction[b.faction].push(b);
  }
  for (const [faction, brigades] of Object.entries(byFaction).sort()) {
    console.log(`  ${faction} (${brigades.length}):`);
    for (const b of brigades.sort((a, b) => a.id.localeCompare(b.id))) {
      console.log(`    ${b.id} — corps: ${b.corps_id}, personnel: ${b.personnel}, loc: ${b.location_osid}, status: ${b.status}`);
    }
  }
  console.log();
}

// ── 3. Histogram of brigades per sector ──
console.log(`=== HISTOGRAM: BRIGADES PER SECTOR (assigned only) ===`);
const histogram = {};
for (const s of sectorData) {
  const count = s.assignedCount;
  histogram[count] = (histogram[count] || 0) + 1;
}
const maxBucket = Math.max(...Object.keys(histogram).map(Number));
for (let i = 0; i <= maxBucket; i++) {
  const count = histogram[i] || 0;
  const bar = '#'.repeat(count);
  console.log(`  ${String(i).padStart(3)} brigades: ${String(count).padStart(3)} sectors  ${bar}`);
}
console.log();

// ── 4. Per-faction stats ──
console.log(`=== PER-FACTION SECTOR STATS ===`);
const factions = ['RBiH', 'RS', 'HRHB'];
for (const faction of factions) {
  const fSectors = sectorData.filter(s => s.faction === faction);
  const totalAssigned = fSectors.reduce((sum, s) => sum + s.assignedCount, 0);
  const totalReserve = fSectors.reduce((sum, s) => sum + s.reserveCount, 0);
  const counts = fSectors.map(s => s.assignedCount);
  const minC = counts.length ? Math.min(...counts) : 0;
  const maxC = counts.length ? Math.max(...counts) : 0;
  const avgC = counts.length ? (totalAssigned / counts.length).toFixed(1) : '0';
  const activeFaction = activeBrigades.filter(b => b.faction === faction).length;

  console.log(`  ${faction}:`);
  console.log(`    Sectors: ${fSectors.length}`);
  console.log(`    Total brigades assigned: ${totalAssigned}`);
  console.log(`    Total brigades in reserve: ${totalReserve}`);
  console.log(`    Active brigades (faction): ${activeFaction}`);
  console.log(`    Assignment rate: ${activeFaction > 0 ? ((totalAssigned + totalReserve) / activeFaction * 100).toFixed(1) : 0}%`);
  console.log(`    Avg brigades/sector: ${avgC}`);
  console.log(`    Min/Max brigades per sector: ${minC} / ${maxC}`);

  // Stance distribution
  const stanceDist = {};
  for (const s of fSectors) {
    stanceDist[s.stance] = (stanceDist[s.stance] || 0) + 1;
  }
  console.log(`    Stance distribution: ${JSON.stringify(stanceDist)}`);
  console.log();
}

// ── 5. Empty sectors (0 brigades) ──
const emptySectors = sectorData.filter(s => s.assignedCount === 0 && s.reserveCount === 0);
if (emptySectors.length > 0) {
  console.log(`=== EMPTY SECTORS (0 assigned + 0 reserve): ${emptySectors.length} ===`);
  for (const s of emptySectors.sort((a, b) => a.sectorId.localeCompare(b.sectorId))) {
    console.log(`  ${s.sectorId} — faction: ${s.faction}, edges: ${s.edgeCount}, stance: ${s.stance}`);
  }
  console.log();
}

// ── 6. Top 10 sectors by brigade count ──
console.log(`=== TOP 10 SECTORS BY BRIGADE COUNT ===`);
const sorted = [...sectorData].sort((a, b) => (b.assignedCount + b.reserveCount) - (a.assignedCount + a.reserveCount));
for (let i = 0; i < Math.min(10, sorted.length); i++) {
  const s = sorted[i];
  console.log(`  ${s.sectorId} — assigned: ${s.assignedCount}, reserve: ${s.reserveCount}, edges: ${s.edgeCount}, faction: ${s.faction}, stance: ${s.stance}`);
}
console.log();

// ── 7. Expectation comparison ──
console.log(`=== EXPECTATION CHECK ===`);
console.log(`OOB expects ~247 brigades total, ~200+ active at w40`);
console.log(`Actual active: ${activeBrigades.length}`);
console.log(`Assigned to sectors: ${allAssigned.size}`);
console.log(`In reserve: ${allReserve.size}`);
console.log(`Unassigned active: ${unassigned.length}`);
const gap = activeBrigades.length - allAssigned.size - allReserve.size +
  // count overlap
  [...allAssigned].filter(id => allReserve.has(id)).length;
console.log(`Coverage gap (active - union of assigned+reserve): ${activeBrigades.length - new Set([...allAssigned, ...allReserve]).size}`);
if (unassigned.length > 10) {
  console.log(`⚠ WARNING: ${unassigned.length} active brigades have NO sector assignment — potential bug!`);
} else if (unassigned.length > 0) {
  console.log(`Note: ${unassigned.length} unassigned — likely exempt corps or enclave units.`);
} else {
  console.log(`All active brigades assigned. Coverage looks healthy.`);
}
