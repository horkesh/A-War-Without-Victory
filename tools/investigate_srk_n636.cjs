/**
 * Diagnostic: investigate why vrs_sarajevo_romanija (SRK) launched ZERO operations in n636 but had ops in n635.
 */
const fs = require('fs');
const path = require('path');

const CORPS = 'vrs_sarajevo_romanija';
const RUN_DIR_635 = path.join(__dirname, '..', 'runs', 'apr1992_definitive_40w__3d15da15e1712ac8__w40_n635');
const RUN_DIR_636 = path.join(__dirname, '..', 'runs', 'apr1992_definitive_40w__3d15da15e1712ac8__w40_n636');

function loadJsonl(filepath) {
  return fs.readFileSync(filepath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function loadJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function banner(text) {
  console.log('\n' + '='.repeat(80));
  console.log(text);
  console.log('='.repeat(80));
}

function section(text) {
  console.log('\n--- ' + text + ' ---');
}

function analyzeRun(label, runDir) {
  banner(`${label}: ${path.basename(runDir)}`);

  const weeklyLines = loadJsonl(path.join(runDir, 'weekly_report.jsonl'));
  const finalSave = loadJson(path.join(runDir, 'final_save.json'));
  const initialSave = loadJson(path.join(runDir, 'initial_save.json'));

  // ========== 1. Operation diagnostics for SRK every week ==========
  section('1. Operation Diagnostics (ALL weeks)');
  let opWeeks = 0;
  for (const week of weeklyLines) {
    const wi = week.week_index;
    const srkDiags = (week.operation_diagnostics || []).filter(d => d.corps_id === CORPS);
    if (srkDiags.length === 0) {
      console.log(`  w${wi}: NO operation diagnostics`);
    } else {
      opWeeks++;
      for (const d of srkDiags) {
        console.log(`  w${wi}: op="${d.operation_name}" phase=${d.operation_phase} obj=${d.current_objective} battles=${d.battle_count} captures=${d.objective_capture_count} attacks=${d.attack_attempt_count} eligible=${d.eligible_attacker_count} participating=${d.participating_brigades_count || d.participating_brigade_count || 'N/A'} idle_streak=${d.idle_execution_turn_streak} mvmt_only=${d.movement_only_execution_turns} consec_fail_curr=${d.consecutive_failures_on_current || 0} total_fail=${d.failure_count || d.total_failures || 0}`);
      }
    }
  }
  console.log(`  TOTAL weeks with SRK ops: ${opWeeks} / ${weeklyLines.length}`);

  // ========== 2. Final save corps command state + formations ==========
  section('2. Final Save - Corps Command State');
  const mil = finalSave.military;
  const cc = mil.corps_command ? mil.corps_command[CORPS] : null;
  if (cc) {
    console.log('  active_operation:', cc.active_operation ? JSON.stringify({
      name: cc.active_operation.operation_name || cc.active_operation.name,
      phase: cc.active_operation.phase || cc.active_operation.operation_phase,
      commander: cc.active_operation.commander_officer_id,
      force_ratio: cc.active_operation.force_ratio_estimate,
      axes: (cc.active_operation.axes || []).map(a => ({
        axis_id: a.axis_id,
        status: a.status,
        obj_capture: a.objective_capture_count,
        failures: a.failure_count,
        idle_streak: a.idle_execution_turn_streak,
        last_result: a.last_result,
        momentum: a.momentum,
        brigades: a.assigned_brigades
      }))
    }, null, 2) : 'NONE');
    console.log('  active_ogs:', cc.active_ogs);
    // Show other fields
    const { active_operation, active_ogs, ...rest } = cc;
    if (Object.keys(rest).length > 0) {
      console.log('  other corps_command fields:', JSON.stringify(rest, null, 2));
    }
  } else {
    console.log('  NO corps_command entry for SRK');
  }

  section('2b. Final Save - SRK Formations');
  const fmns = mil.formations;
  const srkFmns = Object.entries(fmns)
    .filter(([k, f]) => f.corps_id === CORPS)
    .map(([k, f]) => ({
      id: f.id || k,
      location: f.location_osid,
      personnel: f.personnel,
      stance: f.status?.stance || f.stance,
      posture: f.posture,
      home_defense: f.home_defense_active,
      morale: f.morale,
      cohesion: f.cohesion,
      assignment: f.assignment,
      home_osid: f.home_osid,
      status: f.status
    }));
  for (const f of srkFmns) {
    console.log(`  ${f.id}: loc=${f.location} pers=${f.personnel} morale=${f.morale} coh=${f.cohesion} posture=${f.posture} home_def=${f.home_defense} assignment=${JSON.stringify(f.assignment)} status=${JSON.stringify(f.status)}`);
  }
  const combatEffective = srkFmns.filter(f => f.personnel >= 400).length;
  console.log(`  Combat effective (>=400 pers): ${combatEffective} / ${srkFmns.length}`);

  // ========== 3. All SRK battles across all weeks ==========
  section('3. SRK Battles (ALL weeks)');
  let totalBattles = 0;
  for (const week of weeklyLines) {
    const wi = week.week_index;
    const battles = (week.battles || []).filter(b => {
      const attCorps = b.attacker_corps || b.attacker_corps_id;
      const defCorps = b.defender_corps || b.defender_corps_id;
      const attBrigade = b.attacker_brigade || '';
      const defBrigade = b.defender_brigade || '';
      // Check if SRK is involved via corps fields or brigade names
      return attCorps === CORPS || defCorps === CORPS ||
        attBrigade.includes('sarajevo') || defBrigade.includes('sarajevo') ||
        // Also check by known SRK brigade IDs
        srkFmnIds.has(attBrigade) || srkFmnIds.has(defBrigade);
    });
    if (battles.length > 0) {
      totalBattles += battles.length;
      for (const b of battles) {
        console.log(`  w${wi}: ${b.attacker_brigade} (${b.attacker_faction}) → ${b.defender_brigade || 'sector'} (${b.defender_faction}) @ ${b.target_osid} outcome=${b.outcome} ratio=${b.power_ratio} att_cas=${b.attacker_casualties} def_cas=${b.defender_casualties}`);
      }
    }
  }
  console.log(`  TOTAL SRK battles: ${totalBattles}`);

  // ========== 4. Sectors for SRK ==========
  section('4. SRK Sectors');
  // Check initial save
  const initSectors = initialSave.military?.corps_front_sectors;
  if (initSectors) {
    const srkInitSectors = Object.entries(initSectors).filter(([k]) => k.includes('sarajevo_romanija'));
    console.log(`  Initial save: ${srkInitSectors.length} SRK sectors`);
    for (const [k, v] of srkInitSectors) {
      const edges = v.front_edges || v.edges || [];
      const osids = v.territory_osids || v.osids || [];
      const brigades = v.assigned_brigades || v.brigades || [];
      console.log(`    ${k}: edges=${edges.length} osids=${osids.length} brigades=${JSON.stringify(brigades)}`);
    }
  }
  // Check final save
  const finalSectors = mil.corps_front_sectors;
  if (finalSectors) {
    const srkFinalSectors = Object.entries(finalSectors).filter(([k]) => k.includes('sarajevo_romanija'));
    console.log(`  Final save: ${srkFinalSectors.length} SRK sectors`);
    for (const [k, v] of srkFinalSectors) {
      const edges = v.front_edges || v.edges || [];
      const osids = v.territory_osids || v.osids || [];
      const brigades = v.assigned_brigades || v.brigades || [];
      console.log(`    ${k}: edges=${edges.length} osids=${osids.length} brigades=${JSON.stringify(brigades)}`);
    }
  }

  // ========== 5. Activity summary for SRK ==========
  section('5. Activity Summary');
  try {
    const activity = loadJson(path.join(runDir, 'activity_summary.json'));
    // Look for SRK data
    if (activity.corps_operations) {
      const srkOps = Object.entries(activity.corps_operations).filter(([k]) => k.includes('sarajevo'));
      console.log('  corps_operations for SRK:', srkOps.length ? JSON.stringify(srkOps, null, 2) : 'NONE');
    }
    if (activity.operation_count_by_corps) {
      console.log('  operation_count_by_corps:', JSON.stringify(activity.operation_count_by_corps));
    }
    // Check for total ops per faction/corps
    const rs = activity.RS || activity.rs || activity.factions?.RS;
    if (rs) {
      console.log('  RS activity:', JSON.stringify(rs).substring(0, 500));
    }
  } catch (e) {
    console.log('  Could not load activity_summary:', e.message);
  }

  // ========== 6. Operation AARs ==========
  section('6. Operation AARs for SRK');
  try {
    const aars = loadJson(path.join(runDir, 'operation_aars.json'));
    const srkAars = (Array.isArray(aars) ? aars : []).filter(a => a.corps_id === CORPS || (a.corps && a.corps === CORPS));
    console.log(`  SRK AARs: ${srkAars.length}`);
    for (const a of srkAars) {
      console.log(`    ${a.operation_name || a.name}: outcome=${a.outcome || a.result} captures=${a.objective_capture_count || a.captures} battles=${a.battle_count || a.battles} weeks=${a.duration_weeks || a.weeks}`);
    }
    if (!Array.isArray(aars)) {
      // Maybe keyed by corps
      const srkEntry = aars[CORPS] || aars.vrs_sarajevo_romanija;
      if (srkEntry) console.log('  SRK AARs (keyed):', JSON.stringify(srkEntry).substring(0, 1000));
      else console.log('  AAR keys:', Object.keys(aars).slice(0, 10));
    }
  } catch (e) {
    console.log('  Could not load operation_aars:', e.message);
  }

  // ========== 7. Corps directives / stances from weekly reports ==========
  section('7. Corps Summary / Directives from weekly reports');
  for (const week of weeklyLines) {
    const wi = week.week_index;
    // corps_summary is per-faction, check if it has per-corps data
    if (week.corps_summary) {
      const rs = week.corps_summary.find(c => c.faction === 'RS');
      if (rs && wi <= 2) {
        console.log(`  w${wi} RS corps_summary:`, JSON.stringify(rs));
      }
    }
  }

  return { srkFmns, srkFmnIds: new Set(srkFmns.map(f => f.id)) };
}

// We need SRK formation IDs for battle matching — get them first from both runs
function getSrkFmnIds(runDir) {
  const save = loadJson(path.join(runDir, 'final_save.json'));
  const fmns = save.military.formations;
  return new Set(Object.keys(fmns).filter(k => fmns[k].corps_id === CORPS));
}

// Get IDs from both runs
const srkFmnIds635 = getSrkFmnIds(RUN_DIR_635);
const srkFmnIds636 = getSrkFmnIds(RUN_DIR_636);
// Merge
var srkFmnIds = new Set([...srkFmnIds635, ...srkFmnIds636]);

analyzeRun('n635 (GOOD - had ops)', RUN_DIR_635);
analyzeRun('n636 (BAD - zero ops)', RUN_DIR_636);

// ========== 8. Check scenario for pre-planned ops ==========
banner('Scenario: Pre-planned operations for SRK');
try {
  const scenario = loadJson(path.join(__dirname, '..', 'data', 'scenarios', 'apr1992_definitive_40w.json'));
  if (scenario.pre_planned_operations) {
    const srkOps = scenario.pre_planned_operations.filter(op =>
      op.corps_id === CORPS || op.corps === CORPS
    );
    console.log(`Pre-planned ops for SRK: ${srkOps.length}`);
    for (const op of srkOps) {
      console.log('  ', JSON.stringify(op, null, 2));
    }
  } else {
    console.log('No pre_planned_operations field in scenario');
    // Check other possible locations
    if (scenario.operations) {
      const srkOps = (Array.isArray(scenario.operations) ? scenario.operations : Object.values(scenario.operations))
        .filter(op => op.corps_id === CORPS || op.corps === CORPS);
      console.log(`operations field - SRK: ${srkOps.length}`);
      for (const op of srkOps) console.log('  ', JSON.stringify(op).substring(0, 500));
    }
  }
  // Also check timeline doctrine
  if (scenario.timeline || scenario.timeline_file) {
    console.log('Timeline ref:', scenario.timeline_file || 'inline');
  }
} catch (e) {
  console.log('Could not load scenario:', e.message);
}

// ========== 9. Check timeline doctrine for SRK ==========
banner('Timeline Doctrine');
try {
  const timeline = loadJson(path.join(__dirname, '..', 'data', 'scenarios', 'timelines', 'apr1992.json'));
  if (timeline.doctrine_phases) {
    const rsPhases = timeline.doctrine_phases.RS || timeline.doctrine_phases.rs;
    if (rsPhases) {
      console.log('RS doctrine phases:', JSON.stringify(rsPhases, null, 2));
    }
  }
  // Check for corps-specific overrides
  if (timeline.corps_overrides) {
    const srk = timeline.corps_overrides[CORPS];
    if (srk) console.log('SRK corps override:', JSON.stringify(srk, null, 2));
    else console.log('No SRK corps override. Keys:', Object.keys(timeline.corps_overrides));
  }
} catch (e) {
  console.log('Could not load timeline:', e.message);
}

// ========== 10. Diff initial saves for SRK formations ==========
banner('DIFF: Initial Save SRK formations');
const init635 = loadJson(path.join(RUN_DIR_635, 'initial_save.json'));
const init636 = loadJson(path.join(RUN_DIR_636, 'initial_save.json'));
const fmns635 = init635.military.formations;
const fmns636 = init636.military.formations;
const srkInit635 = Object.keys(fmns635).filter(k => fmns635[k].corps_id === CORPS);
const srkInit636 = Object.keys(fmns636).filter(k => fmns636[k].corps_id === CORPS);
console.log(`n635 initial SRK formations: ${srkInit635.length} - ${srkInit635.join(', ')}`);
console.log(`n636 initial SRK formations: ${srkInit636.length} - ${srkInit636.join(', ')}`);

// Check if initial corps_command differs
const cc635 = init635.military.corps_command ? init635.military.corps_command[CORPS] : null;
const cc636 = init636.military.corps_command ? init636.military.corps_command[CORPS] : null;
console.log('\nn635 initial corps_command SRK:', JSON.stringify(cc635));
console.log('n636 initial corps_command SRK:', JSON.stringify(cc636));

// Check initial sectors
const initSec635 = init635.military.corps_front_sectors;
const initSec636 = init636.military.corps_front_sectors;
if (initSec635) {
  const srk635 = Object.keys(initSec635).filter(k => k.includes('sarajevo_romanija'));
  console.log(`\nn635 initial SRK sectors: ${srk635.length}`);
}
if (initSec636) {
  const srk636 = Object.keys(initSec636).filter(k => k.includes('sarajevo_romanija'));
  console.log(`n636 initial SRK sectors: ${srk636.length}`);
}

// ========== 11. Check what code changed between n635 and n636 ==========
banner('Code diff check');
// Check run_meta for hash/params
const meta635 = loadJson(path.join(RUN_DIR_635, 'run_meta.json'));
const meta636 = loadJson(path.join(RUN_DIR_636, 'run_meta.json'));
console.log('n635 meta:', JSON.stringify(meta635, null, 2));
console.log('n636 meta:', JSON.stringify(meta636, null, 2));

// ========== 12. Check run_summary for operation counts ==========
banner('Run Summaries - Operation counts');
const sum635 = loadJson(path.join(RUN_DIR_635, 'run_summary.json'));
const sum636 = loadJson(path.join(RUN_DIR_636, 'run_summary.json'));
// Look for ops-related fields
for (const [label, sum] of [['n635', sum635], ['n636', sum636]]) {
  section(label);
  if (sum.operations_by_corps) {
    console.log('  operations_by_corps:', JSON.stringify(sum.operations_by_corps));
  }
  if (sum.total_operations) {
    console.log('  total_operations:', JSON.stringify(sum.total_operations));
  }
  // Check RS-specific
  const rsData = sum.RS || sum.rs || sum.factions?.RS;
  if (rsData) {
    console.log('  RS summary:', JSON.stringify(rsData).substring(0, 800));
  }
  // Just dump all keys at top level
  console.log('  Top-level keys:', Object.keys(sum));
}
