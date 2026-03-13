/**
 * War-or-game insanity check on latest save (n620, 40w run).
 * Checks:
 *   1. Sector contiguity — are all sectors' front edges connected?
 *   2. Brigade assignments — all assigned? Wrong corps?
 *   3. Cross-corps absurdities — e.g. 3rd Corps sectors pulling from Jajce
 *   4. Enclave brigades — Srebrenica/Gorazde/Zepa brigades in appropriate sectors?
 *   5. General sanity — anything a real commander would find laughable
 */
const fs = require('fs');
const path = require('path');

const save = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json'), 'utf8'
));

const sectors = save.military.corps_front_sectors || {};
const formations = save.military.formations || {};
const politicalControllers = save.political_controllers || {};

const EXEMPT_CORPS = new Set([
  'arbih_general_staff', 'vrs_main_staff', 'hvo_general_staff'
]);

// Known enclave OSID prefixes
const ENCLAVE_DEFS = [
  { id: 'bihac_pocket', faction: 'RBiH', prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'] },
  { id: 'srebrenica', faction: 'RBiH', prefixes: ['op:srebrenica:'] },
  { id: 'zepa', faction: 'RBiH', prefixes: ['op:rogatica:zepa'] },
  { id: 'gorazde', faction: 'RBiH', prefixes: ['op:gorazde:'] },
  { id: 'sarajevo', faction: 'RBiH', prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad:', 'op:novi_grad:'] },
];

// Rough geographic grouping of corps to municipalities (for cross-corps checks)
const CORPS_GEO = {
  // ARBiH
  'arbih_1st_corps': ['sarajevo', 'centar_sarajevo', 'novo_sarajevo', 'stari_grad', 'novi_grad', 'ilidza', 'hadzici', 'trnovo', 'visoko', 'breza', 'vares', 'olovo', 'ilijas', 'vogosca', 'pale'],
  'arbih_2nd_corps': ['tuzla', 'lukavac', 'zivinice', 'kalesija', 'kladanj', 'banovici', 'gracanica', 'gradacac', 'srebrenik', 'doboj', 'tesanj', 'maglaj', 'zavidovici', 'zepce'],
  'arbih_3rd_corps': ['zenica', 'travnik', 'bugojno', 'gornji_vakuf', 'novi_travnik', 'vitez', 'kakanj', 'fojnica', 'busovaca', 'kiseljak', 'jablanica', 'konjic'],
  'arbih_4th_corps': ['mostar', 'jablanica', 'konjic', 'prozor', 'capljina', 'stolac', 'neum'],
  'arbih_5th_corps': ['bihac', 'cazin', 'velika_kladusa', 'bosanska_krupa', 'bosanski_petrovac', 'kljuc', 'sanski_most'],
  'arbih_7th_corps': ['travnik', 'zenica'],  // mostly 3rd corps area overlap, formed later
  // VRS
  'vrs_1st_krajina': ['banja_luka', 'prijedor', 'kozarska_dubica', 'bosanski_novi', 'sanski_most', 'kljuc', 'mrkonjic_grad', 'sipovo', 'jajce', 'bosanski_petrovac', 'glamoc', 'drvar', 'bosanska_gradiska', 'prnjavor', 'laktasi', 'celinac', 'kotor_varos'],
  'vrs_2nd_krajina': ['doboj', 'teslic', 'derventa', 'brod', 'modrica', 'bosanski_samac', 'orasje', 'gradacac', 'tesanj', 'maglaj'],
  'vrs_east_bosnia': ['bijeljina', 'zvornik', 'bratunac', 'srebrenica', 'vlasenica', 'sekovici', 'kalesija', 'ugljevik', 'lopare'],
  'vrs_sarajevo_romanija': ['pale', 'sokolac', 'rogatica', 'visegrad', 'han_pijesak', 'ilijas', 'vogosca', 'ilidza', 'hadzici', 'trnovo'],
  'vrs_herzegovina': ['nevesinje', 'gacko', 'bileca', 'trebinje', 'kalinovik', 'foca', 'cajnice', 'gorazde', 'stolac', 'mostar'],
  // HVO
  'hvo_central_bosnia': ['vitez', 'busovaca', 'kiseljak', 'novi_travnik', 'travnik', 'fojnica', 'kakanj', 'zepce', 'vares'],
  'hvo_southeast_herzegovina': ['mostar', 'citluk', 'grude', 'posusje', 'siroki_brijeg', 'capljina', 'stolac', 'neum', 'ljubuski'],
  'hvo_posavina': ['orasje', 'bosanski_brod', 'odzak', 'derventa', 'modrica', 'bosanski_samac'],
  'hvo_tomislavgrad': ['tomislavgrad', 'livno', 'kupres', 'glamoc', 'prozor', 'gornji_vakuf', 'bugojno', 'jablanica'],
};

let issues = [];
let warnings = [];
let info = [];

// ══════════════════════════════════════════════════════════════
// 1. SECTOR CONTIGUITY
// ══════════════════════════════════════════════════════════════

info.push(`\n=== SECTOR CONTIGUITY ===`);
info.push(`Total sectors: ${Object.keys(sectors).length}`);

// For each sector, check if sub_segments friendly_osids overlap or are near each other
// More importantly: check if a single sub_segment has disconnected edge groups
let disconnectedSectors = 0;
for (const [sid, sector] of Object.entries(sectors)) {
  const subSegs = sector.sub_segments || [];
  if (subSegs.length > 1) {
    // Multiple sub-segments is by design (disjoint territory).
    // But let's flag if they're very far apart geographically
    info.push(`  Sector ${sid}: ${subSegs.length} sub-segments, ${sector.assigned_brigade_ids?.length || 0} brigades, ${sector.length_edges} edges`);
  }

  // Check: do sub-segment friendly OSIDs span wildly different municipalities?
  for (const ss of subSegs) {
    const muns = new Set();
    for (const osid of (ss.friendly_osids || [])) {
      const parts = osid.split(':');
      if (parts[1]) muns.add(parts[1]);
    }
    // A single sub-segment spanning >8 municipalities is suspicious
    if (muns.size > 8) {
      warnings.push(`Sector ${sid} sub-segment ${ss.sub_segment_id} spans ${muns.size} municipalities: ${[...muns].sort().join(', ')}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 2. BRIGADE ASSIGNMENTS
// ══════════════════════════════════════════════════════════════

info.push(`\n=== BRIGADE ASSIGNMENTS ===`);

// Collect all brigades assigned in sectors
const assignedInSector = new Set();
const reserveInSector = new Set();
const brigadeToSector = {};

for (const [sid, sector] of Object.entries(sectors)) {
  for (const bid of (sector.assigned_brigade_ids || [])) {
    assignedInSector.add(bid);
    brigadeToSector[bid] = sid;
  }
  for (const bid of (sector.reserve_brigade_ids || [])) {
    reserveInSector.add(bid);
    brigadeToSector[bid] = sid;
  }
}

// Find all active brigades
const activeBrigades = {};
const corpsMap = {}; // brigade → corps
let totalActive = 0;
let destroyedCount = 0;
let inactiveCount = 0;

for (const [fid, fm] of Object.entries(formations)) {
  if (fm.kind === 'corps' || fm.kind === 'army') continue;
  if (fm.status !== 'active') { inactiveCount++; continue; }
  if (!fm.kind || fm.kind === 'brigade') {
    activeBrigades[fid] = fm;
    corpsMap[fid] = fm.corps_id;
    totalActive++;
  }
}

info.push(`Total active brigades: ${totalActive}`);
info.push(`Assigned in sectors: ${assignedInSector.size}`);
info.push(`Reserve in sectors: ${reserveInSector.size}`);
info.push(`Inactive formations: ${inactiveCount}`);

// Find unassigned brigades
const unassigned = [];
for (const [bid, brig] of Object.entries(activeBrigades)) {
  if (EXEMPT_CORPS.has(brig.corps_id || '')) continue;
  if (!assignedInSector.has(bid) && !reserveInSector.has(bid)) {
    unassigned.push({ id: bid, name: brig.name, corps: brig.corps_id, faction: brig.faction, location: brig.location_osid, personnel: brig.personnel });
  }
}

if (unassigned.length > 0) {
  issues.push(`${unassigned.length} UNASSIGNED brigades (not in any sector):`);
  for (const u of unassigned.sort((a, b) => (a.faction || '').localeCompare(b.faction || '') || (a.corps || '').localeCompare(b.corps || ''))) {
    issues.push(`  ${u.faction} ${u.corps} — ${u.name} (${u.id}), ${u.personnel || '?'} pers, at ${u.location || 'no location'}`);
  }
} else {
  info.push(`All non-exempt active brigades assigned to sectors.`);
}

// Check for wrong-corps assignments (brigade in sector owned by different corps)
const wrongCorps = [];
for (const [sid, sector] of Object.entries(sectors)) {
  const sectorCorps = sector.corps_id;
  for (const bid of (sector.assigned_brigade_ids || [])) {
    const brig = activeBrigades[bid];
    if (!brig) continue;
    if (brig.corps_id && brig.corps_id !== sectorCorps) {
      wrongCorps.push({
        brigade: bid,
        brigadeName: brig.name,
        brigadeCorps: brig.corps_id,
        sectorCorps: sectorCorps,
        sector: sid,
        faction: brig.faction
      });
    }
  }
  for (const bid of (sector.reserve_brigade_ids || [])) {
    const brig = activeBrigades[bid];
    if (!brig) continue;
    if (brig.corps_id && brig.corps_id !== sectorCorps) {
      wrongCorps.push({
        brigade: bid,
        brigadeName: brig.name,
        brigadeCorps: brig.corps_id,
        sectorCorps: sectorCorps,
        sector: sid,
        faction: brig.faction,
        role: 'reserve'
      });
    }
  }
}

if (wrongCorps.length > 0) {
  issues.push(`\n${wrongCorps.length} WRONG-CORPS brigade assignments:`);
  for (const wc of wrongCorps) {
    issues.push(`  ${wc.faction} ${wc.brigadeName} (${wc.brigade}) — corps ${wc.brigadeCorps} but in sector of ${wc.sectorCorps} ${wc.role ? `(${wc.role})` : ''}`);
  }
} else {
  info.push(`No wrong-corps brigade assignments found.`);
}

// ══════════════════════════════════════════════════════════════
// 3. CROSS-CORPS GEOGRAPHIC ABSURDITIES
// ══════════════════════════════════════════════════════════════

info.push(`\n=== CROSS-CORPS GEOGRAPHIC CHECK ===`);

// For each sector, check if its territory OSIDs fall far outside the corps' expected geography
const geoIssues = [];
for (const [sid, sector] of Object.entries(sectors)) {
  const corpsId = sector.corps_id;
  const expectedMuns = CORPS_GEO[corpsId];
  if (!expectedMuns) continue; // unknown corps, skip

  const expectedSet = new Set(expectedMuns);
  const territoryMuns = new Set();
  for (const osid of (sector.territory_osids || [])) {
    const mun = osid.split(':')[1];
    if (mun) territoryMuns.add(mun);
  }

  const unexpected = [...territoryMuns].filter(m => !expectedSet.has(m));
  if (unexpected.length > 3) {
    geoIssues.push({
      sector: sid,
      corps: corpsId,
      unexpectedMuns: unexpected.sort(),
      totalTerritory: territoryMuns.size,
      unexpectedCount: unexpected.length
    });
  }
}

if (geoIssues.length > 0) {
  warnings.push(`\n${geoIssues.length} sectors with significant out-of-area territory:`);
  for (const gi of geoIssues) {
    warnings.push(`  ${gi.corps} sector ${gi.sector}: ${gi.unexpectedCount}/${gi.totalTerritory} muns outside expected AoR — ${gi.unexpectedMuns.join(', ')}`);
  }
} else {
  info.push(`No major cross-corps geographic absurdities detected.`);
}

// Check brigade locations vs their corps expected area
const brigadeGeoIssues = [];
for (const [bid, brig] of Object.entries(activeBrigades)) {
  if (!brig.location_osid || !brig.corps_id) continue;
  const expectedMuns = CORPS_GEO[brig.corps_id];
  if (!expectedMuns) continue;

  const mun = brig.location_osid.split(':')[1];
  if (!mun) continue;

  if (!new Set(expectedMuns).has(mun)) {
    // Check if home_osid is also outside area (could be a migrated brigade)
    const homeMun = brig.home_osid ? brig.home_osid.split(':')[1] : null;
    const homeExpected = homeMun ? new Set(expectedMuns).has(homeMun) : false;
    if (homeExpected) {
      // Brigade is from this corps' area but located elsewhere — that's weird
      brigadeGeoIssues.push({
        id: bid,
        name: brig.name,
        corps: brig.corps_id,
        faction: brig.faction,
        location: brig.location_osid,
        home: brig.home_osid,
        locMun: mun,
        homeInArea: true,
        personnel: brig.personnel
      });
    }
  }
}

if (brigadeGeoIssues.length > 5) {
  // Only flag if there are a lot — some movement is expected
  warnings.push(`\n${brigadeGeoIssues.length} brigades located outside their corps' expected geography:`);
  for (const bg of brigadeGeoIssues.slice(0, 15)) {
    warnings.push(`  ${bg.faction} ${bg.name} (${bg.corps}) — home: ${bg.home}, current: ${bg.location}, ${bg.personnel} pers`);
  }
  if (brigadeGeoIssues.length > 15) warnings.push(`  ... and ${brigadeGeoIssues.length - 15} more`);
}

// ══════════════════════════════════════════════════════════════
// 4. ENCLAVE BRIGADES
// ══════════════════════════════════════════════════════════════

info.push(`\n=== ENCLAVE BRIGADE CHECK ===`);

function isInEnclave(osid, enclaveDef) {
  return enclaveDef.prefixes.some(p => osid.startsWith(p));
}

for (const enc of ENCLAVE_DEFS) {
  // Find brigades whose home_osid is in this enclave
  const homeBrigades = [];
  const locatedBrigades = [];

  for (const [bid, brig] of Object.entries(activeBrigades)) {
    if (brig.faction !== enc.faction) continue;

    const homeInEnc = brig.home_osid && isInEnclave(brig.home_osid, enc);
    const locInEnc = brig.location_osid && isInEnclave(brig.location_osid, enc);

    if (homeInEnc) {
      homeBrigades.push({ id: bid, name: brig.name, corps: brig.corps_id, location: brig.location_osid, personnel: brig.personnel, locInEnc });
    }
    if (locInEnc && !homeInEnc) {
      locatedBrigades.push({ id: bid, name: brig.name, corps: brig.corps_id, home: brig.home_osid, personnel: brig.personnel });
    }
  }

  info.push(`\n  ${enc.id.toUpperCase()} enclave:`);
  info.push(`    Home brigades: ${homeBrigades.length}`);
  for (const hb of homeBrigades) {
    const locMatch = hb.locInEnc ? 'IN enclave' : `OUTSIDE enclave at ${hb.location}`;
    const status = hb.locInEnc ? '' : ' *** ISSUE ***';
    info.push(`      ${hb.name} (${hb.corps}) — ${hb.personnel || '?'} pers — ${locMatch}${status}`);
    if (!hb.locInEnc) {
      issues.push(`Enclave brigade ${hb.name} (home: ${enc.id}) is OUTSIDE enclave at ${hb.location}`);
    }
  }

  if (locatedBrigades.length > 0) {
    info.push(`    Non-home brigades IN enclave: ${locatedBrigades.length}`);
    for (const lb of locatedBrigades) {
      info.push(`      ${lb.name} (${lb.corps}) — home: ${lb.home}, ${lb.personnel || '?'} pers`);
    }
  }

  // Check if enclave OSIDs are still faction-controlled
  let controlled = 0;
  let lost = 0;
  const lostOsids = [];
  for (const [osid, ctrl] of Object.entries(politicalControllers)) {
    if (isInEnclave(osid, enc)) {
      if (ctrl === enc.faction) {
        controlled++;
      } else {
        lost++;
        lostOsids.push(osid);
      }
    }
  }
  info.push(`    OSIDs: ${controlled} controlled by ${enc.faction}, ${lost} lost`);
  if (lost > 0 && controlled > 0) {
    info.push(`    Lost OSIDs: ${lostOsids.slice(0, 5).join(', ')}${lostOsids.length > 5 ? ` (+${lostOsids.length - 5} more)` : ''}`);
  }
  if (lost > 0 && controlled === 0) {
    warnings.push(`Enclave ${enc.id} COMPLETELY OVERRUN — 0 OSIDs remaining (${lost} lost)`);
  }
}

// ══════════════════════════════════════════════════════════════
// 5. GENERAL SANITY
// ══════════════════════════════════════════════════════════════

info.push(`\n=== GENERAL SANITY ===`);

// 5a: Faction strength summary
const factionStats = {};
for (const [bid, brig] of Object.entries(activeBrigades)) {
  const f = brig.faction || 'unknown';
  if (!factionStats[f]) factionStats[f] = { count: 0, personnel: 0, zeroMorale: 0, lowCohesion: 0, destroyed: 0, noLocation: 0 };
  factionStats[f].count++;
  factionStats[f].personnel += brig.personnel || 0;
  if ((brig.morale ?? 50) === 0) factionStats[f].zeroMorale++;
  if ((brig.cohesion ?? 50) < 20) factionStats[f].lowCohesion++;
  if (!brig.location_osid) factionStats[f].noLocation++;
}

for (const [f, s] of Object.entries(factionStats)) {
  info.push(`  ${f}: ${s.count} brigades, ${s.personnel} total personnel, avg ${Math.round(s.personnel / s.count)} per brigade`);
  if (s.zeroMorale > 0) warnings.push(`${f}: ${s.zeroMorale} brigades at ZERO morale`);
  if (s.lowCohesion > 0) info.push(`    ${s.lowCohesion} brigades with low cohesion (<20)`);
  if (s.noLocation > 0) issues.push(`${f}: ${s.noLocation} brigades with NO location_osid`);
}

// 5b: Brigades with personnel < 100 (ghost brigades)
const ghosts = [];
for (const [bid, brig] of Object.entries(activeBrigades)) {
  if ((brig.personnel || 0) < 100) {
    ghosts.push({ id: bid, name: brig.name, faction: brig.faction, corps: brig.corps_id, personnel: brig.personnel || 0 });
  }
}
if (ghosts.length > 0) {
  warnings.push(`\n${ghosts.length} GHOST brigades (personnel < 100):`);
  for (const g of ghosts) {
    warnings.push(`  ${g.faction} ${g.name} (${g.corps}) — ${g.personnel} personnel`);
  }
}

// 5c: Sectors with zero brigades
const emptyFrontSectors = [];
for (const [sid, sector] of Object.entries(sectors)) {
  const total = (sector.assigned_brigade_ids || []).length + (sector.reserve_brigade_ids || []).length;
  if (total === 0 && sector.length_edges > 0) {
    emptyFrontSectors.push({ sector: sid, corps: sector.corps_id, faction: sector.faction, edges: sector.length_edges });
  }
}
if (emptyFrontSectors.length > 0) {
  issues.push(`\n${emptyFrontSectors.length} EMPTY front sectors (edges but no brigades):`);
  for (const es of emptyFrontSectors) {
    issues.push(`  ${es.faction} ${es.corps} sector ${es.sector} — ${es.edges} edges, 0 brigades`);
  }
}

// 5d: Massive density imbalances (brigades/edge)
const sectorDensities = [];
for (const [sid, sector] of Object.entries(sectors)) {
  const brigCount = (sector.assigned_brigade_ids || []).length;
  const edges = sector.length_edges || 1;
  sectorDensities.push({ sector: sid, corps: sector.corps_id, faction: sector.faction, brigades: brigCount, edges, density: brigCount / edges });
}
sectorDensities.sort((a, b) => b.density - a.density);

info.push(`\n  Densest sectors (brigades/edge):`);
for (const sd of sectorDensities.slice(0, 5)) {
  info.push(`    ${sd.faction} ${sd.corps}: ${sd.brigades} brigades / ${sd.edges} edges = ${sd.density.toFixed(3)}`);
}
info.push(`  Thinnest sectors (brigades/edge):`);
const nonEmpty = sectorDensities.filter(s => s.brigades > 0);
for (const sd of nonEmpty.slice(-5)) {
  info.push(`    ${sd.faction} ${sd.corps}: ${sd.brigades} brigades / ${sd.edges} edges = ${sd.density.toFixed(3)}`);
}

// 5e: Turn and game state
info.push(`\nTurn: ${save.meta?.turn}, Week: ${save.meta?.turn}, Year: ${save.meta?.year || '?'}`);
info.push(`War started turn: ${save.meta?.war_started_turn ?? '?'}`);

// 5f: Multiple brigades stacked on same OSID (excessive stacking)
const osidStacking = {};
for (const [bid, brig] of Object.entries(activeBrigades)) {
  if (!brig.location_osid) continue;
  if (!osidStacking[brig.location_osid]) osidStacking[brig.location_osid] = [];
  osidStacking[brig.location_osid].push({ id: bid, name: brig.name, faction: brig.faction, corps: brig.corps_id });
}
const heavyStacks = Object.entries(osidStacking)
  .filter(([_, brigs]) => brigs.length >= 5)
  .sort((a, b) => b[1].length - a[1].length);

if (heavyStacks.length > 0) {
  warnings.push(`\n${heavyStacks.length} OSIDs with 5+ brigades stacked:`);
  for (const [osid, brigs] of heavyStacks.slice(0, 10)) {
    const factions = [...new Set(brigs.map(b => b.faction))].join('/');
    const corps = [...new Set(brigs.map(b => b.corps))].join(', ');
    warnings.push(`  ${osid}: ${brigs.length} brigades (${factions}, corps: ${corps})`);
  }
}

// 5g: Brigades assigned to enemy-controlled territory
const behindEnemyLines = [];
for (const [bid, brig] of Object.entries(activeBrigades)) {
  if (!brig.location_osid) continue;
  const ctrl = politicalControllers[brig.location_osid];
  if (ctrl && ctrl !== brig.faction) {
    behindEnemyLines.push({ id: bid, name: brig.name, faction: brig.faction, location: brig.location_osid, controller: ctrl, corps: brig.corps_id });
  }
}
if (behindEnemyLines.length > 0) {
  issues.push(`\n${behindEnemyLines.length} brigades BEHIND ENEMY LINES (on enemy-controlled OSID):`);
  for (const bel of behindEnemyLines.slice(0, 20)) {
    issues.push(`  ${bel.faction} ${bel.name} (${bel.corps}) at ${bel.location} — controlled by ${bel.controller}`);
  }
}

// 5h: Corps sector count summary
info.push(`\n  Sector count by corps:`);
const corpsSectorCount = {};
for (const [sid, sector] of Object.entries(sectors)) {
  const key = `${sector.faction} ${sector.corps_id}`;
  if (!corpsSectorCount[key]) corpsSectorCount[key] = { sectors: 0, brigades: 0, edges: 0 };
  corpsSectorCount[key].sectors++;
  corpsSectorCount[key].brigades += (sector.assigned_brigade_ids || []).length;
  corpsSectorCount[key].edges += sector.length_edges || 0;
}
for (const [key, val] of Object.entries(corpsSectorCount).sort()) {
  info.push(`    ${key}: ${val.sectors} sectors, ${val.brigades} brigades, ${val.edges} edges`);
}

// ══════════════════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   AWWV INSANITY CHECK — n620 (40w save)                 ║');
console.log('╚══════════════════════════════════════════════════════════╝');

for (const line of info) console.log(line);

if (warnings.length > 0) {
  console.log('\n\x1b[33m════ WARNINGS ════\x1b[0m');
  for (const w of warnings) console.log(`\x1b[33m${w}\x1b[0m`);
}

if (issues.length > 0) {
  console.log('\n\x1b[31m════ ISSUES ════\x1b[0m');
  for (const i of issues) console.log(`\x1b[31m${i}\x1b[0m`);
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n\x1b[32m✓ All checks passed. No insanity detected.\x1b[0m');
} else {
  console.log(`\n\x1b[36mSummary: ${issues.length} issue lines, ${warnings.length} warning lines\x1b[0m`);
}
