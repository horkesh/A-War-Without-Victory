/**
 * Deep comparative analysis: n635 (good, RS 0.505) vs n636 (bad, RS 0.470)
 * Identifies where RS lost ground, when divergence starts, and which corps/regions are affected.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const RUN_635 = path.join(BASE, 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n635');
const RUN_636 = path.join(BASE, 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n636');

function load(runDir, file) {
  return JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf8'));
}

function loadJsonl(runDir, file) {
  return fs.readFileSync(path.join(runDir, file), 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));
}

// ─── 1. Run Summary: territory shares ───
console.log('═══════════════════════════════════════════════════════════');
console.log('  1. TERRITORY SHARES (run_summary.json)');
console.log('═══════════════════════════════════════════════════════════');

const sum635 = load(RUN_635, 'run_summary.json');
const sum636 = load(RUN_636, 'run_summary.json');

// Extract final week control_counts from weekly_report (run_summary has anchor_checks, not shares directly)
const weeks635 = loadJsonl(RUN_635, 'weekly_report.jsonl');
const weeks636 = loadJsonl(RUN_636, 'weekly_report.jsonl');

const lastWeek635 = weeks635[weeks635.length - 1];
const lastWeek636 = weeks636[weeks636.length - 1];

const total = 744; // total OSIDs
for (const faction of ['RS', 'RBiH', 'HRHB']) {
  const c635 = lastWeek635.control_counts[faction] || 0;
  const c636 = lastWeek636.control_counts[faction] || 0;
  const s635 = (c635 / total * 100).toFixed(1);
  const s636 = (c636 / total * 100).toFixed(1);
  const delta = c636 - c635;
  console.log(`  ${faction.padEnd(5)}: n635=${c635} (${s635}%)  n636=${c636} (${s636}%)  delta=${delta > 0 ? '+' : ''}${delta}`);
}

// ─── 2. Political controllers: count per faction ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  2. POLITICAL CONTROLLERS (final_save.json)');
console.log('═══════════════════════════════════════════════════════════');

const save635 = load(RUN_635, 'final_save.json');
const save636 = load(RUN_636, 'final_save.json');

const pc635 = save635.political.political_controllers;
const pc636 = save636.political.political_controllers;

const factionCount = (pc) => {
  const counts = {};
  for (const [osid, faction] of Object.entries(pc)) {
    counts[faction] = (counts[faction] || 0) + 1;
  }
  return counts;
};

const fc635 = factionCount(pc635);
const fc636 = factionCount(pc636);
console.log('  Final OSID counts from political_controllers:');
for (const faction of ['RS', 'RBiH', 'HRHB']) {
  const v635 = fc635[faction] || 0;
  const v636 = fc636[faction] || 0;
  console.log(`  ${faction.padEnd(5)}: n635=${v635}  n636=${v636}  delta=${v636 - v635 > 0 ? '+' : ''}${v636 - v635}`);
}

// ─── 3. OSIDs RS controls in n635 but NOT n636 ("lost" territory) ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  3. RS "LOST" OSIDs (RS in n635, not RS in n636)');
console.log('═══════════════════════════════════════════════════════════');

const rsOsids635 = new Set(Object.entries(pc635).filter(([, f]) => f === 'RS').map(([o]) => o));
const rsOsids636 = new Set(Object.entries(pc636).filter(([, f]) => f === 'RS').map(([o]) => o));

const lostByRS = [...rsOsids635].filter(o => !rsOsids636.has(o)).sort();
const gainedByRS = [...rsOsids636].filter(o => !rsOsids635.has(o)).sort();

console.log(`  RS lost ${lostByRS.length} OSIDs, gained ${gainedByRS.length} OSIDs (net ${gainedByRS.length - lostByRS.length})`);

console.log('\n  Lost OSIDs (RS in n635 → other in n636):');
for (const osid of lostByRS) {
  console.log(`    ${osid}  → ${pc636[osid]}`);
}

if (gainedByRS.length > 0) {
  console.log('\n  Gained OSIDs (not RS in n635 → RS in n636):');
  for (const osid of gainedByRS) {
    console.log(`    ${osid}  (was ${pc635[osid]})`);
  }
}

// ─── 4. Group lost OSIDs by municipality ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  4. LOST OSIDs BY MUNICIPALITY');
console.log('═══════════════════════════════════════════════════════════');

const getMunicipality = (osid) => {
  // format: op:municipality:slug
  const parts = osid.split(':');
  return parts.length >= 2 ? parts[1] : 'unknown';
};

const lostByMuni = {};
for (const osid of lostByRS) {
  const muni = getMunicipality(osid);
  if (!lostByMuni[muni]) lostByMuni[muni] = [];
  lostByMuni[muni].push(osid);
}

const gainedByMuni = {};
for (const osid of gainedByRS) {
  const muni = getMunicipality(osid);
  if (!gainedByMuni[muni]) gainedByMuni[muni] = [];
  gainedByMuni[muni].push(osid);
}

const sortedMunis = Object.entries(lostByMuni).sort((a, b) => b[1].length - a[1].length);
for (const [muni, osids] of sortedMunis) {
  const gained = gainedByMuni[muni] ? ` (+${gainedByMuni[muni].length} gained)` : '';
  console.log(`  ${muni.padEnd(25)} ${osids.length} lost${gained}`);
  for (const o of osids) {
    console.log(`    ${o} → ${pc636[o]}`);
  }
}

// ─── 5. Week-by-week RS territory progression ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  5. WEEK-BY-WEEK RS OSID COUNT');
console.log('═══════════════════════════════════════════════════════════');

console.log('  Week  n635_RS  n636_RS  delta  n635_RBiH  n636_RBiH  n635_HRHB  n636_HRHB');
console.log('  ─────────────────────────────────────────────────────────────────────────────');

let firstDivergence = null;
for (let i = 0; i < Math.max(weeks635.length, weeks636.length); i++) {
  const w635 = weeks635[i];
  const w636 = weeks636[i];
  if (!w635 || !w636) break;

  const rs635 = w635.control_counts.RS || 0;
  const rs636 = w636.control_counts.RS || 0;
  const rbih635 = w635.control_counts.RBiH || 0;
  const rbih636 = w636.control_counts.RBiH || 0;
  const hrhb635 = w635.control_counts.HRHB || 0;
  const hrhb636 = w636.control_counts.HRHB || 0;
  const delta = rs636 - rs635;

  if (delta !== 0 && firstDivergence === null) {
    firstDivergence = i + 1;
  }

  const marker = delta !== 0 ? ' ◄' : '';
  console.log(`  w${String(i + 1).padStart(2)}    ${String(rs635).padStart(4)}     ${String(rs636).padStart(4)}   ${(delta >= 0 ? '+' : '') + String(delta).padStart(3)}     ${String(rbih635).padStart(4)}       ${String(rbih636).padStart(4)}      ${String(hrhb635).padStart(4)}       ${String(hrhb636).padStart(4)}${marker}`);
}

if (firstDivergence !== null) {
  console.log(`\n  >>> FIRST RS DIVERGENCE AT WEEK ${firstDivergence} <<<`);
}

// ─── 6. Total battles, orders, casualties per faction ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  6. TOTAL BATTLES, ATTACK ORDERS, CASUALTIES');
console.log('═══════════════════════════════════════════════════════════');

function aggregateWeekly(weeks) {
  let totalBattles = 0;
  let totalOrders = 0;
  let totalObjAttempts = 0;
  let totalObjCaptures = 0;
  const casualties = { RS: { att: 0, def: 0 }, RBiH: { att: 0, def: 0 }, HRHB: { att: 0, def: 0 } };
  const battlesByFaction = { RS: 0, RBiH: 0, HRHB: 0 };
  const winsByFaction = { RS: 0, RBiH: 0, HRHB: 0 };

  for (const w of weeks) {
    totalBattles += (w.combat_causality?.total_battles || 0);
    totalOrders += (w.combat_causality?.total_attack_orders || 0);
    totalObjAttempts += (w.combat_causality?.total_objective_attempts || 0);
    totalObjCaptures += (w.combat_causality?.total_objective_captures || 0);

    if (w.battles) {
      for (const b of w.battles) {
        battlesByFaction[b.attacker_faction] = (battlesByFaction[b.attacker_faction] || 0) + 1;
        casualties[b.attacker_faction].att += b.attacker_casualties || 0;
        casualties[b.defender_faction].def += b.defender_casualties || 0;
        if (b.attacker_won) winsByFaction[b.attacker_faction]++;
      }
    }
  }

  return { totalBattles, totalOrders, totalObjAttempts, totalObjCaptures, casualties, battlesByFaction, winsByFaction };
}

const agg635 = aggregateWeekly(weeks635);
const agg636 = aggregateWeekly(weeks636);

console.log('                         n635       n636      delta');
console.log(`  Total battles:       ${String(agg635.totalBattles).padStart(5)}      ${String(agg636.totalBattles).padStart(5)}      ${agg636.totalBattles - agg635.totalBattles > 0 ? '+' : ''}${agg636.totalBattles - agg635.totalBattles}`);
console.log(`  Total orders:        ${String(agg635.totalOrders).padStart(5)}      ${String(agg636.totalOrders).padStart(5)}      ${agg636.totalOrders - agg635.totalOrders > 0 ? '+' : ''}${agg636.totalOrders - agg635.totalOrders}`);
console.log(`  Obj attempts:        ${String(agg635.totalObjAttempts).padStart(5)}      ${String(agg636.totalObjAttempts).padStart(5)}      ${agg636.totalObjAttempts - agg635.totalObjAttempts > 0 ? '+' : ''}${agg636.totalObjAttempts - agg635.totalObjAttempts}`);
console.log(`  Obj captures:        ${String(agg635.totalObjCaptures).padStart(5)}      ${String(agg636.totalObjCaptures).padStart(5)}      ${agg636.totalObjCaptures - agg635.totalObjCaptures > 0 ? '+' : ''}${agg636.totalObjCaptures - agg635.totalObjCaptures}`);

console.log('\n  Battles launched (as attacker):');
for (const f of ['RS', 'RBiH', 'HRHB']) {
  console.log(`    ${f.padEnd(5)}: n635=${agg635.battlesByFaction[f]}  n636=${agg636.battlesByFaction[f]}  delta=${agg636.battlesByFaction[f] - agg635.battlesByFaction[f] > 0 ? '+' : ''}${agg636.battlesByFaction[f] - agg635.battlesByFaction[f]}`);
}

console.log('\n  Wins (as attacker):');
for (const f of ['RS', 'RBiH', 'HRHB']) {
  console.log(`    ${f.padEnd(5)}: n635=${agg635.winsByFaction[f]}  n636=${agg636.winsByFaction[f]}  delta=${agg636.winsByFaction[f] - agg635.winsByFaction[f] > 0 ? '+' : ''}${agg636.winsByFaction[f] - agg635.winsByFaction[f]}`);
}

console.log('\n  Casualties (attacker + defender):');
for (const f of ['RS', 'RBiH', 'HRHB']) {
  const tot635 = agg635.casualties[f].att + agg635.casualties[f].def;
  const tot636 = agg636.casualties[f].att + agg636.casualties[f].def;
  console.log(`    ${f.padEnd(5)}: n635=${tot635} (att:${agg635.casualties[f].att} def:${agg635.casualties[f].def})  n636=${tot636} (att:${agg636.casualties[f].att} def:${agg636.casualties[f].def})  delta=${tot636 - tot635 > 0 ? '+' : ''}${tot636 - tot635}`);
}

// ─── 7. RS Operation count and outcomes per corps ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  7. RS OPERATIONS BY CORPS (operation_aars.json)');
console.log('═══════════════════════════════════════════════════════════');

const ops635 = load(RUN_635, 'operation_aars.json');
const ops636 = load(RUN_636, 'operation_aars.json');

const rsOps635 = ops635.filter(o => o.faction === 'RS');
const rsOps636 = ops636.filter(o => o.faction === 'RS');

console.log(`  Total RS operations: n635=${rsOps635.length}  n636=${rsOps636.length}`);

function groupByCorps(ops) {
  const byCorps = {};
  for (const op of ops) {
    if (!byCorps[op.corps_id]) byCorps[op.corps_id] = [];
    byCorps[op.corps_id].push(op);
  }
  return byCorps;
}

const byCorps635 = groupByCorps(rsOps635);
const byCorps636 = groupByCorps(rsOps636);

const allCorps = new Set([...Object.keys(byCorps635), ...Object.keys(byCorps636)]);
const sortedCorps = [...allCorps].sort();

for (const corps of sortedCorps) {
  const ops1 = byCorps635[corps] || [];
  const ops2 = byCorps636[corps] || [];
  console.log(`\n  ${corps}:`);
  console.log(`    Count: n635=${ops1.length}  n636=${ops2.length}`);

  // Outcome breakdown
  const outcomes1 = {};
  const outcomes2 = {};
  for (const o of ops1) outcomes1[o.outcome] = (outcomes1[o.outcome] || 0) + 1;
  for (const o of ops2) outcomes2[o.outcome] = (outcomes2[o.outcome] || 0) + 1;
  const allOutcomes = new Set([...Object.keys(outcomes1), ...Object.keys(outcomes2)]);
  console.log('    Outcomes:');
  for (const oc of [...allOutcomes].sort()) {
    console.log(`      ${oc.padEnd(25)} n635=${(outcomes1[oc] || 0)}  n636=${(outcomes2[oc] || 0)}`);
  }

  // Total captures, casualties
  const caps1 = ops1.reduce((s, o) => s + (o.objectives_captured || 0), 0);
  const caps2 = ops2.reduce((s, o) => s + (o.objectives_captured || 0), 0);
  const cas1 = ops1.reduce((s, o) => s + (o.casualties_suffered?.killed || 0) + (o.casualties_suffered?.wounded || 0), 0);
  const cas2 = ops2.reduce((s, o) => s + (o.casualties_suffered?.killed || 0) + (o.casualties_suffered?.wounded || 0), 0);
  const inf1 = ops1.reduce((s, o) => s + (o.casualties_inflicted?.killed || 0) + (o.casualties_inflicted?.wounded || 0), 0);
  const inf2 = ops2.reduce((s, o) => s + (o.casualties_inflicted?.killed || 0) + (o.casualties_inflicted?.wounded || 0), 0);
  console.log(`    Objectives captured:  n635=${caps1}  n636=${caps2}`);
  console.log(`    Casualties suffered:  n635=${cas1}  n636=${cas2}`);
  console.log(`    Casualties inflicted: n635=${inf1}  n636=${inf2}`);

  // Operation details
  console.log('    Operations:');
  const maxOps = Math.max(ops1.length, ops2.length);
  for (let i = 0; i < maxOps; i++) {
    const o1 = ops1[i];
    const o2 = ops2[i];
    if (o1) console.log(`      n635[${i}]: "${o1.operation_name}" w${o1.started_turn}-w${o1.ended_turn} ${o1.outcome} caps=${o1.objectives_captured} attacks=${o1.total_attacks}`);
    if (o2) console.log(`      n636[${i}]: "${o2.operation_name}" w${o2.started_turn}-w${o2.ended_turn} ${o2.outcome} caps=${o2.objectives_captured} attacks=${o2.total_attacks}`);
  }
}

// ─── 8. All factions operations comparison ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  8. ALL FACTION OPERATIONS SUMMARY');
console.log('═══════════════════════════════════════════════════════════');

for (const faction of ['RS', 'RBiH', 'HRHB']) {
  const fOps635 = ops635.filter(o => o.faction === faction);
  const fOps636 = ops636.filter(o => o.faction === faction);
  const caps635 = fOps635.reduce((s, o) => s + (o.objectives_captured || 0), 0);
  const caps636 = fOps636.reduce((s, o) => s + (o.objectives_captured || 0), 0);
  console.log(`  ${faction}: ops n635=${fOps635.length} n636=${fOps636.length}  captures n635=${caps635} n636=${caps636}`);
}

// ─── 9. Divergence analysis: which weeks saw RS territory changes differ ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  9. WEEKLY RS TERRITORY CHANGES (delta from previous week)');
console.log('═══════════════════════════════════════════════════════════');

console.log('  Week  n635_change  n636_change  diff   n635_battles  n636_battles');
console.log('  ──────────────────────────────────────────────────────────────────');

for (let i = 1; i < Math.min(weeks635.length, weeks636.length); i++) {
  const rs635prev = weeks635[i - 1].control_counts.RS || 0;
  const rs635curr = weeks635[i].control_counts.RS || 0;
  const rs636prev = weeks636[i - 1].control_counts.RS || 0;
  const rs636curr = weeks636[i].control_counts.RS || 0;
  const change635 = rs635curr - rs635prev;
  const change636 = rs636curr - rs636prev;
  const diff = change636 - change635;
  const bat635 = weeks635[i].combat_causality?.total_battles || 0;
  const bat636 = weeks636[i].combat_causality?.total_battles || 0;
  const marker = diff !== 0 ? ' ◄' : '';
  console.log(`  w${String(i + 1).padStart(2)}       ${(change635 >= 0 ? '+' : '') + String(change635).padStart(3)}          ${(change636 >= 0 ? '+' : '') + String(change636).padStart(3)}    ${(diff >= 0 ? '+' : '') + String(diff).padStart(3)}          ${String(bat635).padStart(3)}           ${String(bat636).padStart(3)}${marker}`);
}

// ─── 10. RBiH operations: did RBiH attack RS territory more in n636? ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  10. RBiH OPERATIONS DETAIL (attacking RS territory?)');
console.log('═══════════════════════════════════════════════════════════');

const rbihOps635 = ops635.filter(o => o.faction === 'RBiH');
const rbihOps636 = ops636.filter(o => o.faction === 'RBiH');

function printOpsDetail(label, ops) {
  console.log(`\n  ${label} (${ops.length} operations):`);
  const byCorps = groupByCorps(ops);
  for (const [corps, corpOps] of Object.entries(byCorps).sort()) {
    const caps = corpOps.reduce((s, o) => s + (o.objectives_captured || 0), 0);
    const attacks = corpOps.reduce((s, o) => s + (o.total_attacks || 0), 0);
    console.log(`    ${corps}: ${corpOps.length} ops, ${caps} captures, ${attacks} attacks`);
    for (const o of corpOps) {
      console.log(`      "${o.operation_name}" w${o.started_turn}-w${o.ended_turn} ${o.outcome} caps=${o.objectives_captured} attacks=${o.total_attacks}`);
    }
  }
}

printOpsDetail('n635 RBiH', rbihOps635);
printOpsDetail('n636 RBiH', rbihOps636);

// ─── 11. Where did captured OSIDs go? ───
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  11. WHO TOOK THE LOST RS OSIDs?');
console.log('═══════════════════════════════════════════════════════════');

const takers = {};
for (const osid of lostByRS) {
  const newOwner = pc636[osid];
  takers[newOwner] = (takers[newOwner] || 0) + 1;
}
for (const [faction, count] of Object.entries(takers)) {
  console.log(`  ${faction}: took ${count} OSIDs from RS`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ANALYSIS COMPLETE');
console.log('═══════════════════════════════════════════════════════════');
