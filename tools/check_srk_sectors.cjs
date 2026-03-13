/**
 * Diagnostic: SRK (vrs_sarajevo_romanija) sector/brigade/corps-state analysis
 * Compare n636 vs n635 runs — why did SRK launch ZERO operations?
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const CORPS = 'vrs_sarajevo_romanija';

const RUNS = {
  n635: path.join(BASE, 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n635'),
  n636: path.join(BASE, 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n636'),
};

function loadJSON(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function analyzeState(label, state) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Turn: ${state.turn}, Week: ${state.week}, Phase: ${state.phase}`);

  // 1. Sectors
  const sectors = state.military?.corps_front_sectors || {};
  const srkSectors = Object.values(sectors).filter(s => s.sector_id?.startsWith(`sector:${CORPS}`));
  console.log(`\n--- SECTORS (${srkSectors.length} found for ${CORPS}) ---`);
  for (const s of srkSectors) {
    console.log(`  ${s.sector_id}`);
    console.log(`    front edge_ids: ${s.edge_ids?.length || 0}`);
    console.log(`    sub_segments: ${s.sub_segments?.length || 0}`);
    console.log(`    territory_osids: ${s.territory_osids?.length || 0}`);
    console.log(`    assigned_brigade_ids (${s.assigned_brigade_ids?.length || 0}): ${JSON.stringify(s.assigned_brigade_ids || [])}`);
    console.log(`    reserve_brigade_ids (${s.reserve_brigade_ids?.length || 0}): ${JSON.stringify(s.reserve_brigade_ids || [])}`);
    console.log(`    density: ${s.density?.toFixed(3)}`);
    console.log(`    threat_ratio: ${s.threat_ratio?.toFixed(3)}`);
    console.log(`    opposing_factions: ${JSON.stringify(s.opposing_factions)}`);
  }

  // 2. Formations
  const formations = state.military?.formations || {};
  const srkBrigades = Object.values(formations).filter(f => f.corps_id === CORPS || f.corps === CORPS);
  console.log(`\n--- BRIGADES (${srkBrigades.length} in ${CORPS}) ---`);
  for (const b of srkBrigades) {
    const id = b.brigade_id || b.formation_id || b.id;
    console.log(`  ${id}`);
    console.log(`    location_osid: ${b.location_osid}, home_osid: ${b.home_osid}`);
    console.log(`    personnel: ${b.personnel}, stance: ${b.stance}, posture: ${b.posture}`);
    console.log(`    is_active: ${b.is_active}, disrupted_turns: ${b.disrupted_turns || 0}`);
    console.log(`    operation_id: ${b.operation_id || 'NONE'}`);
    console.log(`    morale: ${b.morale}, cohesion: ${b.cohesion}, fatigue: ${b.fatigue}`);
    console.log(`    faction: ${b.faction}, corps_id: ${b.corps_id || b.corps}`);
  }

  // 3. Corps command state
  // Try both possible keys
  const corpsStates = state.military?.corps_command_state || state.military?.corps_command || {};
  const srkCmd = corpsStates[CORPS];
  console.log(`\n--- CORPS COMMAND STATE (${CORPS}) ---`);
  console.log(`  (key used: ${state.military?.corps_command ? 'corps_command' : state.military?.corps_command_state ? 'corps_command_state' : 'NEITHER FOUND'})`);
  if (!srkCmd) {
    console.log('  *** NOT FOUND ***');
    const allKeys = Object.keys(corpsStates);
    const vrsKeys = allKeys.filter(k => k.startsWith('vrs'));
    console.log(`  All corps keys: ${JSON.stringify(allKeys)}`);
    console.log(`  VRS corps keys: ${JSON.stringify(vrsKeys)}`);
  } else {
    // Print without weekly_log spam
    const { ...cmdCopy } = srkCmd;
    if (cmdCopy.active_operation?.weekly_log) {
      cmdCopy.active_operation = { ...cmdCopy.active_operation, weekly_log: `[${cmdCopy.active_operation.weekly_log.length} entries]` };
    }
    console.log(JSON.stringify(cmdCopy, null, 2));
  }

  // 4. Check directive details
  if (srkCmd?.directive) {
    console.log(`\n--- DIRECTIVE DETAILS ---`);
    const d = srkCmd.directive;
    console.log(`  offensive_targets: ${JSON.stringify(d.offensive_targets)}`);
    console.log(`  hold_osids: ${JSON.stringify(d.hold_osids)}`);
    console.log(`  avoid_osids: ${JSON.stringify(d.avoid_osids)}`);
    console.log(`  max_attackers_per_target: ${d.max_attackers_per_target}`);
    console.log(`  reserve_fraction: ${d.reserve_fraction}`);
    console.log(`  min_attack_outcome: ${d.min_attack_outcome}`);
    console.log(`  aggression_modifier: ${d.aggression_modifier}`);
  }

  // 5. Check active operation
  if (srkCmd?.active_operation) {
    console.log(`\n--- ACTIVE OPERATION ---`);
    const opCopy = { ...srkCmd.active_operation };
    if (opCopy.weekly_log) opCopy.weekly_log = `[${opCopy.weekly_log.length} entries]`;
    console.log(JSON.stringify(opCopy, null, 2));
  }

  // 6. Pre-planned operations
  const prePlanned = state.military?.pre_planned_operations || [];
  const srkOps = prePlanned.filter(op => op.corps_id === CORPS);
  console.log(`\n--- PRE-PLANNED OPERATIONS (${srkOps.length} for ${CORPS}) ---`);
  for (const op of srkOps) {
    console.log(JSON.stringify(op, null, 2));
  }

  // 7. Operation AARs in state?
  const opHistory = state.military?.operation_history || [];
  const srkHistory = opHistory.filter(h => h.corps_id === CORPS);
  console.log(`\n--- OPERATION HISTORY in state (${srkHistory.length} for ${CORPS}) ---`);
  for (const h of srkHistory) {
    console.log(`  ${h.operation_name || h.name}: result=${h.result}, turns=${h.turns_active}`);
  }

  // 8. Check all VRS corps for comparison
  console.log(`\n--- ALL VRS CORPS COMMAND STATES (summary) ---`);
  for (const [cid, cmd] of Object.entries(corpsStates)) {
    if (!cid.startsWith('vrs')) continue;
    console.log(`  ${cid}: stance=${cmd.stance}, exhaustion=${cmd.corps_exhaustion}, active_op=${cmd.active_operation?.operation_name || cmd.active_operation?.name || 'NONE'}, consecutive_probes=${cmd.consecutive_probes || 0}`);
    if (cmd.directive) {
      console.log(`    directive: targets=${cmd.directive.offensive_targets?.length || 0}, aggression=${cmd.directive.aggression_modifier}, stance=${cmd.directive.stance}`);
    }
  }

  // 9. Check army_stance for RS
  const armyStance = state.military?.army_stance || {};
  console.log(`\n--- ARMY STANCE ---`);
  console.log(`  RS: ${JSON.stringify(armyStance['RS'])}`);

  return { srkSectors, srkBrigades, srkCmd };
}

// Main
for (const [run, dir] of Object.entries(RUNS)) {
  // Final save
  const finalPath = path.join(dir, 'final_save.json');
  if (fs.existsSync(finalPath)) {
    const state = loadJSON(finalPath);
    analyzeState(`${run} — FINAL SAVE`, state);
  } else {
    console.log(`\n*** ${run} final_save.json not found ***`);
  }

  // Initial save
  const initPath = path.join(dir, 'initial_save.json');
  if (fs.existsSync(initPath)) {
    const state = loadJSON(initPath);
    analyzeState(`${run} — INITIAL SAVE`, state);
  } else {
    console.log(`\n*** ${run} initial_save.json not found ***`);
  }
}

// Also check operation AARs file
for (const [run, dir] of Object.entries(RUNS)) {
  const aarPath = path.join(dir, 'operation_aars.json');
  if (fs.existsSync(aarPath)) {
    const aars = loadJSON(aarPath);
    const srkAars = aars.filter(a => a.corps_id === CORPS);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${run} — OPERATION AARs (${srkAars.length} for ${CORPS}, total ${aars.length})`);
    console.log(`${'='.repeat(80)}`);
    for (const a of srkAars) {
      console.log(JSON.stringify(a, null, 2));
    }
    if (srkAars.length === 0) {
      // Show all VRS AARs for context
      const vrsAars = aars.filter(a => a.corps_id?.startsWith('vrs'));
      console.log(`  VRS AARs total: ${vrsAars.length}`);
      for (const a of vrsAars) {
        console.log(`    ${a.corps_id}: ${a.operation_name || a.name} — ${a.result || a.outcome}`);
      }
    }
  }
}

// Check activity summary
for (const [run, dir] of Object.entries(RUNS)) {
  const actPath = path.join(dir, 'activity_summary.json');
  if (fs.existsSync(actPath)) {
    const act = loadJSON(actPath);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${run} — ACTIVITY SUMMARY (SRK ops)`);
    console.log(`${'='.repeat(80)}`);
    // Look for SRK-related data
    if (act.operations_by_corps) {
      console.log(`  operations_by_corps[${CORPS}]: ${JSON.stringify(act.operations_by_corps[CORPS])}`);
    }
    if (act.attacks_by_corps) {
      console.log(`  attacks_by_corps[${CORPS}]: ${JSON.stringify(act.attacks_by_corps[CORPS])}`);
    }
    // Show all VRS corps ops
    for (const key of Object.keys(act.operations_by_corps || {})) {
      if (key.startsWith('vrs')) {
        console.log(`  operations_by_corps[${key}]: ${JSON.stringify(act.operations_by_corps[key])}`);
      }
    }
    for (const key of Object.keys(act.attacks_by_corps || {})) {
      if (key.startsWith('vrs')) {
        console.log(`  attacks_by_corps[${key}]: ${JSON.stringify(act.attacks_by_corps[key])}`);
      }
    }
  }
}
