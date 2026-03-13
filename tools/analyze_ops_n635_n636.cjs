#!/usr/bin/env node
/**
 * Diagnostic comparison: n635 (RS w40 0.505) vs n636 (RS w40 0.470)
 * Analyzes operations, battles, troop strength, and movement patterns.
 */

const fs = require('fs');
const path = require('path');

const RUN_DIR = 'F:/A-War-Without-Victory/runs';
const RUNS = {
  n635: 'apr1992_definitive_40w__3d15da15e1712ac8__w40_n635',
  n636: 'apr1992_definitive_40w__3d15da15e1712ac8__w40_n636',
};

function loadWeeklyReports(runName) {
  const fpath = path.join(RUN_DIR, RUNS[runName], 'weekly_report.jsonl');
  return fs.readFileSync(fpath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function loadFinalSave(runName) {
  const fpath = path.join(RUN_DIR, RUNS[runName], 'final_save.json');
  return JSON.parse(fs.readFileSync(fpath, 'utf8'));
}

function loadOperationHistory(runName) {
  const fpath = path.join(RUN_DIR, RUNS[runName], 'operation_aars.json');
  if (fs.existsSync(fpath)) return JSON.parse(fs.readFileSync(fpath, 'utf8'));
  // Fallback: from final_save
  const save = loadFinalSave(runName);
  return save.operation_history || [];
}

// ============================================================
// SECTION 1: Weekly RS operations, battles, attack orders, territory
// ============================================================
function analyzeWeekly(runName) {
  const weeks = loadWeeklyReports(runName);
  const results = [];

  for (const w of weeks) {
    const wi = w.week_index;

    // RS operations from operation_diagnostics
    const rsOps = (w.operation_diagnostics || []).filter(
      op => op.faction_id === 'RS' || (op.corps_id && op.corps_id.startsWith('vrs'))
    );
    const opsByCorps = {};
    for (const op of rsOps) {
      const c = op.corps_id || 'unknown';
      if (!opsByCorps[c]) opsByCorps[c] = [];
      opsByCorps[c].push({
        name: op.operation_name,
        phase: op.operation_phase,
        battles: op.battle_count || 0,
        captures: op.objective_capture_count || 0,
        attacks: op.attack_attempt_count || 0,
        brigades: (op.participating_brigades || []).length,
        movementOnly: op.movement_only_execution_turns || 0,
        idle: op.idle_execution_turn_streak || 0,
      });
    }

    // RS battles
    const rsBattles = (w.battles || []).filter(b => b.attacker_faction === 'RS');
    const rsDefBattles = (w.battles || []).filter(b => b.defender_faction === 'RS');

    // RS attack orders from behavioral_health or combat_causality
    const cc = w.combat_causality || w.behavioral_health?.combat_causality || {};
    // Total attack orders is for ALL factions; try to get RS-specific from ops
    const rsAttackOrders = rsOps.reduce((s, op) => s + (op.attack_attempt_count || 0), 0);

    // RS territory
    const rsTerritory = (w.control_counts || {}).RS || 0;

    // Column movement (all factions - no per-faction breakdown in weekly)
    const colMov = w.column_movement || {};

    results.push({
      week: wi,
      rsOpsCount: rsOps.length,
      rsOpsByCorps: opsByCorps,
      rsBattlesAsAttacker: rsBattles.length,
      rsBattlesAsDefender: rsDefBattles.length,
      rsAttackOrders,
      rsTerritory,
      rsBattleWins: rsBattles.filter(b => b.attacker_won).length,
      rsBattleLosses: rsBattles.filter(b => !b.attacker_won).length,
      rsAttackerCasualties: rsBattles.reduce((s, b) => s + (b.attacker_casualties || 0), 0),
      rsDefenderCasualties: rsBattles.reduce((s, b) => s + (b.defender_casualties || 0), 0),
      columnStarts: colMov.column_starts || 0,
      columnArrivals: colMov.column_arrivals || 0,
      columnBlocked: colMov.column_blocked || 0,
      columnAdvances: colMov.column_advances || 0,
    });
  }
  return results;
}

// ============================================================
// SECTION 2: East Bosnian + Drina corps operations detail
// ============================================================
function analyzeCorpsOps(runName, corpsIds) {
  const weeks = loadWeeklyReports(runName);
  const timeline = {};

  for (const cid of corpsIds) {
    timeline[cid] = [];
  }

  for (const w of weeks) {
    const wi = w.week_index;
    for (const cid of corpsIds) {
      const ops = (w.operation_diagnostics || []).filter(op => op.corps_id === cid);
      for (const op of ops) {
        timeline[cid].push({
          week: wi,
          name: op.operation_name,
          phase: op.operation_phase,
          objective: op.current_objective,
          battles: op.battle_count || 0,
          captures: op.objective_capture_count || 0,
          attacks: op.attack_attempt_count || 0,
          brigades: (op.participating_brigades || []).length,
          brigadesNames: op.participating_brigades || [],
          movementOnly: op.movement_only_execution_turns || 0,
          idle: op.idle_execution_turn_streak || 0,
          eligibleAttackers: op.eligible_attacker_count || 0,
          movementOrders: op.movement_order_count || 0,
          invalidReasons: op.invalidation_reasons || [],
          recoveryReason: op.recovery_reason,
        });
      }
    }
  }
  return timeline;
}

// ============================================================
// SECTION 3: Final save analysis
// ============================================================
function analyzeFinalSave(runName) {
  const save = loadFinalSave(runName);
  const formations = save.military.formations;
  const casualties = save.military.casualty_ledger;

  const rsFormations = Object.values(formations).filter(f => f.faction === 'RS');
  const perCorps = {};

  for (const f of rsFormations) {
    const c = f.corps_id || 'no_corps';
    if (!perCorps[c]) perCorps[c] = { personnel: 0, count: 0, combatEffective: 0, dissolved: 0 };
    perCorps[c].count++;
    perCorps[c].personnel += f.personnel || 0;
    if ((f.personnel || 0) >= 400) perCorps[c].combatEffective++;
    if (f.lifecycle_status === 'dissolved' || (f.personnel || 0) <= 0) perCorps[c].dissolved++;
  }

  const rsCas = casualties.RS || {};

  // Movement state at final save
  const bms = save.military.brigade_movement_state || {};
  const rsMoving = Object.entries(bms).filter(([k, v]) =>
    k.startsWith('rs_') || k.startsWith('vrs_')
  );

  return {
    totalRSPersonnel: rsFormations.reduce((s, f) => s + (f.personnel || 0), 0),
    totalRSFormations: rsFormations.length,
    combatEffective: rsFormations.filter(f => (f.personnel || 0) >= 400).length,
    dissolved: rsFormations.filter(f => f.lifecycle_status === 'dissolved' || (f.personnel || 0) <= 0).length,
    casualties: {
      killed: rsCas.killed || 0,
      wounded: rsCas.wounded || 0,
      missing: rsCas.missing_captured || 0,
      total: (rsCas.killed || 0) + (rsCas.wounded || 0) + (rsCas.missing_captured || 0),
    },
    perCorps,
    rsInTransit: rsMoving.length,
    rsInTransitDetails: rsMoving.map(([k, v]) => ({
      brigade: k,
      stance: v.stance,
      status: v.status,
      turnsRemaining: v.turns_remaining,
    })),
  };
}

// ============================================================
// SECTION 4: Column/movement analysis from weekly reports
// ============================================================
function analyzeMovement(runName) {
  const weeks = loadWeeklyReports(runName);
  const results = [];

  for (const w of weeks) {
    const wi = w.week_index;
    const rsOps = (w.operation_diagnostics || []).filter(
      op => op.faction_id === 'RS' || (op.corps_id && op.corps_id.startsWith('vrs'))
    );

    // Count brigades in movement vs attacking across RS ops
    let totalBrigades = 0;
    let totalMovementOrders = 0;
    let totalAttackAttempts = 0;
    let totalMovementOnlyTurns = 0;

    for (const op of rsOps) {
      totalBrigades += (op.participating_brigades || []).length;
      totalMovementOrders += op.movement_order_count || 0;
      totalAttackAttempts += op.attack_attempt_count || 0;
      totalMovementOnlyTurns += op.movement_only_execution_turns || 0;
    }

    results.push({
      week: wi,
      rsOpsCount: rsOps.length,
      totalBrigadesInOps: totalBrigades,
      totalMovementOrders,
      totalAttackAttempts,
      totalMovementOnlyTurns,
      globalColumnStarts: (w.column_movement || {}).column_starts || 0,
      globalColumnAdvances: (w.column_movement || {}).column_advances || 0,
      globalColumnArrivals: (w.column_movement || {}).column_arrivals || 0,
      globalColumnBlocked: (w.column_movement || {}).column_blocked || 0,
    });
  }
  return results;
}

// ============================================================
// MAIN
// ============================================================

console.log('='.repeat(100));
console.log('DIAGNOSTIC: n635 (RS 0.505) vs n636 (RS 0.470)');
console.log('='.repeat(100));

// ------- SECTION 1: Weekly comparison -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 1: Weekly RS Operations, Battles, Territory');
console.log('='.repeat(100));

const w635 = analyzeWeekly('n635');
const w636 = analyzeWeekly('n636');

const keyWeeks = [1, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40];

console.log('\n--- Weekly Summary Table ---');
console.log(
  'Week'.padStart(4),
  '|', 'Ops635'.padStart(6), 'Ops636'.padStart(6),
  '|', 'Bat635'.padStart(6), 'Bat636'.padStart(6),
  '|', 'Atk635'.padStart(6), 'Atk636'.padStart(6),
  '|', 'Ter635'.padStart(6), 'Ter636'.padStart(6),
  '|', 'Win635'.padStart(6), 'Win636'.padStart(6),
  '|', 'Def635'.padStart(6), 'Def636'.padStart(6),
);
console.log('-'.repeat(110));

for (const wk of keyWeeks) {
  const a = w635.find(r => r.week === wk);
  const b = w636.find(r => r.week === wk);
  if (!a || !b) continue;
  console.log(
    String(wk).padStart(4),
    '|', String(a.rsOpsCount).padStart(6), String(b.rsOpsCount).padStart(6),
    '|', String(a.rsBattlesAsAttacker).padStart(6), String(b.rsBattlesAsAttacker).padStart(6),
    '|', String(a.rsAttackOrders).padStart(6), String(b.rsAttackOrders).padStart(6),
    '|', String(a.rsTerritory).padStart(6), String(b.rsTerritory).padStart(6),
    '|', String(a.rsBattleWins).padStart(6), String(b.rsBattleWins).padStart(6),
    '|', String(a.rsBattlesAsDefender).padStart(6), String(b.rsBattlesAsDefender).padStart(6),
  );
}

// Cumulative battles and territory delta
console.log('\n--- Cumulative RS Attack Battles ---');
let cum635 = 0, cum636 = 0;
for (const wk of keyWeeks) {
  // Sum all weeks up to wk
  cum635 = w635.filter(r => r.week <= wk).reduce((s, r) => s + r.rsBattlesAsAttacker, 0);
  cum636 = w636.filter(r => r.week <= wk).reduce((s, r) => s + r.rsBattlesAsAttacker, 0);
  console.log(`  w${wk}: n635=${cum635}, n636=${cum636}, delta=${cum635 - cum636}`);
}

// Territory divergence
console.log('\n--- RS Territory Divergence ---');
for (const wk of keyWeeks) {
  const a = w635.find(r => r.week === wk);
  const b = w636.find(r => r.week === wk);
  if (!a || !b) continue;
  console.log(`  w${wk}: n635=${a.rsTerritory}, n636=${b.rsTerritory}, delta=${a.rsTerritory - b.rsTerritory}`);
}

// ------- SECTION 1b: RS casualties inflicted per week -------
console.log('\n--- RS Attacker Casualties Per Week (attacker casualties = RS losses when attacking) ---');
console.log(
  'Week'.padStart(4),
  '|', 'AtkCas635'.padStart(9), 'AtkCas636'.padStart(9),
  '|', 'Inflict635'.padStart(10), 'Inflict636'.padStart(10),
);
for (const wk of keyWeeks) {
  const a = w635.find(r => r.week === wk);
  const b = w636.find(r => r.week === wk);
  if (!a || !b) continue;
  console.log(
    String(wk).padStart(4),
    '|', String(a.rsAttackerCasualties).padStart(9), String(b.rsAttackerCasualties).padStart(9),
    '|', String(a.rsDefenderCasualties).padStart(10), String(b.rsDefenderCasualties).padStart(10),
  );
}

// ------- SECTION 2: East Bosnian + Drina corps detail -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 2: vrs_east_bosnian & vrs_drina Operations Detail');
console.log('='.repeat(100));

const targetCorps = ['vrs_east_bosnian', 'vrs_drina'];

for (const run of ['n635', 'n636']) {
  const timeline = analyzeCorpsOps(run, targetCorps);
  console.log(`\n--- ${run} ---`);
  for (const cid of targetCorps) {
    const ops = timeline[cid];
    if (ops.length === 0) {
      console.log(`  ${cid}: NO operations found`);
      continue;
    }
    // Group by operation name
    const byName = {};
    for (const op of ops) {
      if (!byName[op.name]) byName[op.name] = [];
      byName[op.name].push(op);
    }
    console.log(`  ${cid}: ${Object.keys(byName).length} distinct operations`);
    for (const [name, entries] of Object.entries(byName)) {
      const firstWeek = Math.min(...entries.map(e => e.week));
      const lastWeek = Math.max(...entries.map(e => e.week));
      const phases = [...new Set(entries.map(e => e.phase))];
      const maxBrig = Math.max(...entries.map(e => e.brigades));
      const totalBattles = entries.reduce((s, e) => s + e.battles, 0);
      const totalCaptures = Math.max(...entries.map(e => e.captures)); // cumulative field
      const totalAttacks = Math.max(...entries.map(e => e.attacks));
      const maxMovementOnly = Math.max(...entries.map(e => e.movementOnly));
      const lastEntry = entries[entries.length - 1];
      console.log(`    "${name}": w${firstWeek}-w${lastWeek}, phases=[${phases.join(',')}], brigades=${maxBrig}, battles=${totalBattles}, captures=${totalCaptures}, attacks=${totalAttacks}, movOnlyMax=${maxMovementOnly}`);
      console.log(`      last objective: ${lastEntry.objective}`);
      console.log(`      brigades: [${lastEntry.brigadesNames.join(', ')}]`);
    }
  }
}

// ------- SECTION 2b: All RS corps ops comparison -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 2b: All RS Corps Operations — Side by Side');
console.log('='.repeat(100));

const allVrsCorps = ['vrs_1st_krajina', 'vrs_2nd_krajina', 'vrs_east_bosnian', 'vrs_drina', 'vrs_sarajevo_romanija', 'vrs_herzegovina', 'vrs_ilidza'];

for (const cid of allVrsCorps) {
  console.log(`\n  === ${cid} ===`);
  for (const run of ['n635', 'n636']) {
    const timeline = analyzeCorpsOps(run, [cid]);
    const ops = timeline[cid];
    if (ops.length === 0) {
      console.log(`    ${run}: NO operations`);
      continue;
    }
    const byName = {};
    for (const op of ops) {
      if (!byName[op.name]) byName[op.name] = [];
      byName[op.name].push(op);
    }
    console.log(`    ${run}: ${Object.keys(byName).length} ops`);
    for (const [name, entries] of Object.entries(byName)) {
      const firstWeek = Math.min(...entries.map(e => e.week));
      const lastWeek = Math.max(...entries.map(e => e.week));
      const maxBrig = Math.max(...entries.map(e => e.brigades));
      const totalCaptures = Math.max(...entries.map(e => e.captures));
      const totalAttacks = Math.max(...entries.map(e => e.attacks));
      console.log(`      "${name}": w${firstWeek}-w${lastWeek}, brig=${maxBrig}, cap=${totalCaptures}, atk=${totalAttacks}`);
    }
  }
}

// ------- SECTION 3: Final save comparison -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 3: Final Save — RS Troop Strength & Casualties');
console.log('='.repeat(100));

for (const run of ['n635', 'n636']) {
  const result = analyzeFinalSave(run);
  console.log(`\n--- ${run} ---`);
  console.log(`  Total RS personnel: ${result.totalRSPersonnel}`);
  console.log(`  Total RS formations: ${result.totalRSFormations}`);
  console.log(`  Combat effective (>=400): ${result.combatEffective}`);
  console.log(`  Dissolved: ${result.dissolved}`);
  console.log(`  Casualties: killed=${result.casualties.killed}, wounded=${result.casualties.wounded}, missing=${result.casualties.missing}, total=${result.casualties.total}`);
  console.log(`  RS brigades in transit at save: ${result.rsInTransit}`);
  if (result.rsInTransitDetails.length > 0) {
    for (const d of result.rsInTransitDetails) {
      console.log(`    ${d.brigade}: stance=${d.stance}, status=${d.status}, turns=${d.turnsRemaining}`);
    }
  }
  console.log(`  Per-corps breakdown:`);
  const sorted = Object.entries(result.perCorps).sort((a, b) => b[1].personnel - a[1].personnel);
  for (const [corps, data] of sorted) {
    console.log(`    ${corps.padEnd(30)} pers=${String(data.personnel).padStart(6)}, fmns=${String(data.count).padStart(3)}, effective=${String(data.combatEffective).padStart(3)}, dissolved=${data.dissolved}`);
  }
}

// ------- SECTION 4: Movement/column analysis -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 4: RS Movement vs Attack Orders (march-first impact)');
console.log('='.repeat(100));

const mov635 = analyzeMovement('n635');
const mov636 = analyzeMovement('n636');

console.log('\n--- Movement Orders vs Attack Attempts in RS Operations ---');
console.log(
  'Week'.padStart(4),
  '|', 'Mov635'.padStart(6), 'Mov636'.padStart(6),
  '|', 'Atk635'.padStart(6), 'Atk636'.padStart(6),
  '|', 'Brig635'.padStart(7), 'Brig636'.padStart(7),
  '|', 'MvOnly635'.padStart(9), 'MvOnly636'.padStart(9),
  '|', 'ColSt635'.padStart(8), 'ColSt636'.padStart(8),
);
console.log('-'.repeat(110));

for (const wk of keyWeeks) {
  const a = mov635.find(r => r.week === wk);
  const b = mov636.find(r => r.week === wk);
  if (!a || !b) continue;
  console.log(
    String(wk).padStart(4),
    '|', String(a.totalMovementOrders).padStart(6), String(b.totalMovementOrders).padStart(6),
    '|', String(a.totalAttackAttempts).padStart(6), String(b.totalAttackAttempts).padStart(6),
    '|', String(a.totalBrigadesInOps).padStart(7), String(b.totalBrigadesInOps).padStart(7),
    '|', String(a.totalMovementOnlyTurns).padStart(9), String(b.totalMovementOnlyTurns).padStart(9),
    '|', String(a.globalColumnStarts).padStart(8), String(b.globalColumnStarts).padStart(8),
  );
}

// Cumulative movement vs attack
console.log('\n--- Cumulative RS Movement Orders vs Attack Attempts ---');
for (const wk of keyWeeks) {
  const cumMov635 = mov635.filter(r => r.week <= wk).reduce((s, r) => s + r.totalMovementOrders, 0);
  const cumMov636 = mov636.filter(r => r.week <= wk).reduce((s, r) => s + r.totalMovementOrders, 0);
  const cumAtk635 = mov635.filter(r => r.week <= wk).reduce((s, r) => s + r.totalAttackAttempts, 0);
  const cumAtk636 = mov636.filter(r => r.week <= wk).reduce((s, r) => s + r.totalAttackAttempts, 0);
  console.log(`  w${wk}: mov n635=${cumMov635} n636=${cumMov636} (d=${cumMov635-cumMov636}) | atk n635=${cumAtk635} n636=${cumAtk636} (d=${cumAtk635-cumAtk636})`);
}

// Cumulative column starts
console.log('\n--- Cumulative Global Column Starts ---');
for (const wk of keyWeeks) {
  const cs635 = mov635.filter(r => r.week <= wk).reduce((s, r) => s + r.globalColumnStarts, 0);
  const cs636 = mov636.filter(r => r.week <= wk).reduce((s, r) => s + r.globalColumnStarts, 0);
  console.log(`  w${wk}: n635=${cs635}, n636=${cs636}, delta=${cs635-cs636}`);
}

// ------- SECTION 5: Identify divergence point -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 5: Territory Divergence Analysis');
console.log('='.repeat(100));

console.log('\n--- All weeks where RS territory differs ---');
for (let i = 0; i < Math.min(w635.length, w636.length); i++) {
  const a = w635[i];
  const b = w636[i];
  if (!a || !b) continue;
  const delta = a.rsTerritory - b.rsTerritory;
  if (delta !== 0) {
    console.log(`  w${a.week}: n635=${a.rsTerritory}, n636=${b.rsTerritory}, delta=${delta > 0 ? '+' : ''}${delta}`);
  }
}

// ------- SECTION 6: Battle outcomes comparison -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 6: RS Battle Outcome Distribution');
console.log('='.repeat(100));

for (const run of ['n635', 'n636']) {
  const weeks = loadWeeklyReports(run);
  const outcomes = {};
  let totalBattles = 0;
  let totalWins = 0;
  for (const w of weeks) {
    const rsBattles = (w.battles || []).filter(b => b.attacker_faction === 'RS');
    for (const b of rsBattles) {
      const o = b.outcome || 'unknown';
      outcomes[o] = (outcomes[o] || 0) + 1;
      totalBattles++;
      if (b.attacker_won) totalWins++;
    }
  }
  console.log(`  ${run}: ${totalBattles} RS attacks, ${totalWins} wins (${(100*totalWins/totalBattles).toFixed(1)}%)`);
  for (const [o, c] of Object.entries(outcomes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${o.padEnd(20)} ${c} (${(100*c/totalBattles).toFixed(1)}%)`);
  }
}

// ------- SECTION 7: Defensive battles (RS defending) -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 7: RS Defensive Battles (enemy attacking RS)');
console.log('='.repeat(100));

for (const run of ['n635', 'n636']) {
  const weeks = loadWeeklyReports(run);
  const outcomes = {};
  let totalBattles = 0;
  let totalDefWins = 0;
  for (const w of weeks) {
    const defBattles = (w.battles || []).filter(b => b.defender_faction === 'RS');
    for (const b of defBattles) {
      const o = b.outcome || 'unknown';
      outcomes[o] = (outcomes[o] || 0) + 1;
      totalBattles++;
      if (!b.attacker_won) totalDefWins++;
    }
  }
  console.log(`  ${run}: ${totalBattles} attacks against RS, RS held ${totalDefWins} (${(100*totalDefWins/totalBattles).toFixed(1)}%)`);
  for (const [o, c] of Object.entries(outcomes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${o.padEnd(20)} ${c} (${(100*c/totalBattles).toFixed(1)}%)`);
  }
}

// ------- SECTION 8: Per-week all battles detail at divergence -------
console.log('\n' + '='.repeat(100));
console.log('SECTION 8: Battle Detail at First Divergence Point');
console.log('='.repeat(100));

// Find first week of territory divergence
let firstDivWeek = null;
for (let i = 0; i < Math.min(w635.length, w636.length); i++) {
  if (w635[i].rsTerritory !== w636[i].rsTerritory) {
    firstDivWeek = w635[i].week;
    break;
  }
}

if (firstDivWeek) {
  console.log(`\nFirst divergence at w${firstDivWeek}`);
  // Show battles for 3 weeks around divergence
  for (let wk = Math.max(1, firstDivWeek - 1); wk <= firstDivWeek + 2; wk++) {
    for (const run of ['n635', 'n636']) {
      const weeks = loadWeeklyReports(run);
      const w = weeks.find(r => r.week_index === wk);
      if (!w) continue;
      const rsBattles = (w.battles || []).filter(b => b.attacker_faction === 'RS');
      const rsDefBattles = (w.battles || []).filter(b => b.defender_faction === 'RS');
      console.log(`\n  ${run} w${wk}: ${rsBattles.length} RS attacks, ${rsDefBattles.length} enemy attacks on RS`);
      for (const b of rsBattles) {
        console.log(`    ATK → ${b.target_osid}: ${b.outcome}, ratio=${b.power_ratio?.toFixed(2)}, won=${b.attacker_won}, cas=${b.attacker_casualties}/${b.defender_casualties}`);
      }
      for (const b of rsDefBattles) {
        console.log(`    DEF ← ${b.target_osid}: ${b.outcome}, ratio=${b.power_ratio?.toFixed(2)}, won=${b.attacker_won}, cas=${b.attacker_casualties}/${b.defender_casualties}`);
      }
    }
  }
} else {
  console.log('No territory divergence found!');
}

console.log('\n' + '='.repeat(100));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(100));
