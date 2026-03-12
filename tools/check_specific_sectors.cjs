const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = save.military.corps_front_sectors;
const formations = save.military.formations;
const pc = save.political_controllers;

function printCorpsSectors(corpsId, label) {
  console.log(`=== ${label} ===\n`);
  const corpsSectors = [];
  for (const [sid, s] of Object.entries(sectors)) {
    if (s.corps_id === corpsId) corpsSectors.push([sid, s]);
  }
  corpsSectors.sort((a, b) => a[0].localeCompare(b[0]));

  for (const [sid, s] of corpsSectors) {
    const assigned = s.assigned_brigade_ids || [];
    const reserves = s.reserve_brigade_ids || [];
    const friendlyFront = (s.sub_segments || []).flatMap(ss => ss.friendly_osids);
    const enemyFront = (s.sub_segments || []).flatMap(ss => ss.enemy_osids);
    console.log('Sector:', sid);
    console.log('  Territory:', s.territory_osids.length, 'OSIDs');
    console.log('  Territory sample:', s.territory_osids.slice(0, 5));
    console.log('  Front edges:', (s.edge_ids || []).length);
    console.log('  Friendly front:', friendlyFront);
    console.log('  Enemy front:', enemyFront);
    console.log('  Assigned:', assigned.length, '| Reserve:', reserves.length);
    for (const bid of [...assigned, ...reserves]) {
      const f = formations[bid];
      if (!f) continue;
      const onFront = new Set(friendlyFront).has(f.location_osid);
      const inTerritory = s.territory_osids.includes(f.location_osid);
      const label = onFront ? '(ON FRONT)' : inTerritory ? '(IN TERRITORY)' : '(ELSEWHERE - UNREACHABLE?)';
      console.log('   ', bid, 'at', f.location_osid, 'pers:', f.personnel, label);
    }
    console.log();
  }
}

printCorpsSectors('hvo_tomislavgrad', 'HVO TOMISLAVGRAD OZ');
printCorpsSectors('arbih_5th_corps', 'ARBIH 5TH CORPS');

// Now check: for each brigade that's ELSEWHERE, can it reach its sector through friendly territory?
console.log('=== REACHABILITY ANALYSIS ===\n');

// Build adjacency from political controllers
// Quick check: what controls the OSIDs between brigade location and sector front?
function checkPath(brigadeId, sectorId) {
  const s = sectors[sectorId];
  const f = formations[brigadeId];
  if (!f || !s) return;

  const friendlyFront = new Set((s.sub_segments || []).flatMap(ss => ss.friendly_osids));
  const inTerritory = s.territory_osids.includes(f.location_osid);
  const onFront = friendlyFront.has(f.location_osid);

  if (onFront || inTerritory) return; // Already reachable

  // BFS from brigade location through same-faction territory toward sector territory/front
  const faction = f.faction;
  const target = new Set([...s.territory_osids, ...friendlyFront]);

  // We don't have adjacency graph in save, but we can check if brigade's location
  // is in ANY sector of the same corps
  let brigadeInCorpsSector = null;
  for (const [sid2, s2] of Object.entries(sectors)) {
    if (s2.corps_id !== s.corps_id) continue;
    if (s2.territory_osids.includes(f.location_osid)) {
      brigadeInCorpsSector = sid2;
      break;
    }
    const ff2 = new Set((s2.sub_segments || []).flatMap(ss => ss.friendly_osids));
    if (ff2.has(f.location_osid)) {
      brigadeInCorpsSector = sid2;
      break;
    }
  }

  console.log('  UNREACHABLE:', brigadeId);
  console.log('    Location:', f.location_osid, '| Assigned sector:', sectorId);
  console.log('    Brigade actually in sector:', brigadeInCorpsSector || 'NONE');
  console.log('    Sector territory:', s.territory_osids.length, 'OSIDs');
  console.log('    Sector front:', [...friendlyFront]);

  // Check what faction controls the territory between
  const locController = pc[f.location_osid];
  console.log('    Location controller:', locController);
  for (const fo of friendlyFront) {
    console.log('    Front OSID', fo, 'controller:', pc[fo]);
  }
  console.log();
}

for (const [sid, s] of Object.entries(sectors)) {
  if (s.corps_id !== 'hvo_tomislavgrad' && s.corps_id !== 'arbih_5th_corps') continue;
  for (const bid of [...(s.assigned_brigade_ids || []), ...(s.reserve_brigade_ids || [])]) {
    checkPath(bid, sid);
  }
}
