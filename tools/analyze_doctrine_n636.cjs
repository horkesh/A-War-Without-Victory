/**
 * Diagnostic script: RS doctrine analysis for n636 run.
 *
 * Analyzes:
 * 1. RS battles by outcome per week, attack success rate, average power ratio
 * 2. Operation lifecycle: stalls, completions, aborts, movement-only stalls
 * 3. RS blitz phase (w0-12) attack tempo: battles/week, captures/week, zero-attack weeks
 * 4. Current doctrine parameter values from source files
 *
 * Usage: node tools/analyze_doctrine_n636.cjs
 */

const fs = require('fs');
const path = require('path');

const RUN_DIR = path.join(__dirname, '..', 'runs', 'apr1992_definitive_40w__3d15da15e1712ac8__w40_n636');

// ═══════════════════════════════════════════════════════════════════════════
// Load data
// ═══════════════════════════════════════════════════════════════════════════

const weeklyLines = fs.readFileSync(path.join(RUN_DIR, 'weekly_report.jsonl'), 'utf8').trim().split('\n');
const weeks = weeklyLines.map(l => JSON.parse(l));

const aars = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'operation_aars.json'), 'utf8'));
const rsAars = aars.filter(a => a.faction === 'RS');

// ═══════════════════════════════════════════════════════════════════════════
// 1. RS battles by outcome per week
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('1. RS BATTLES BY OUTCOME PER WEEK');
console.log('═══════════════════════════════════════════════════════════════\n');

const outcomeOrder = ['decisive_victory', 'victory', 'costly_victory', 'stalemate', 'repulsed', 'catastrophic'];
const shortNames = { decisive_victory: 'DV', victory: 'V', costly_victory: 'CV', stalemate: 'S', repulsed: 'R', catastrophic: 'C' };

// Header
console.log('Week | DV  V  CV  S   R   C  | Total | Success% | Avg PwrRatio | Captures');
console.log('-----|------------------------|-------|----------|-------------|----------');

const weeklyStats = [];

for (const week of weeks) {
    const wi = week.week_index;
    const battles = (week.battles || []).filter(b => b.attacker_faction === 'RS');

    const byCat = {};
    for (const o of outcomeOrder) byCat[o] = 0;
    let totalPR = 0;
    let captures = 0;

    for (const b of battles) {
        byCat[b.outcome] = (byCat[b.outcome] || 0) + 1;
        totalPR += b.power_ratio || 0;
        if (b.attacker_won) captures++;
    }

    const total = battles.length;
    const successes = (byCat.decisive_victory || 0) + (byCat.victory || 0) + (byCat.costly_victory || 0);
    const successRate = total > 0 ? ((successes / total) * 100).toFixed(1) : '-';
    const avgPR = total > 0 ? (totalPR / total).toFixed(2) : '-';

    const cols = outcomeOrder.map(o => String(byCat[o] || 0).padStart(3));

    console.log(`w${String(wi).padStart(2, '0')}  | ${cols.join(' ')} | ${String(total).padStart(5)} | ${String(successRate).padStart(7)}% | ${String(avgPR).padStart(11)} | ${captures}`);

    weeklyStats.push({ wi, total, successes, captures, avgPR: total > 0 ? totalPR / total : 0 });
}

// Summary
const allRsBattles = weeks.flatMap(w => (w.battles || []).filter(b => b.attacker_faction === 'RS'));
const totalBattles = allRsBattles.length;
const totalSuccesses = allRsBattles.filter(b => ['decisive_victory', 'victory', 'costly_victory'].includes(b.outcome)).length;
const totalCaptures = allRsBattles.filter(b => b.attacker_won).length;
const avgPRAll = totalBattles > 0 ? (allRsBattles.reduce((s, b) => s + (b.power_ratio || 0), 0) / totalBattles).toFixed(2) : '-';

console.log('-----|------------------------|-------|----------|-------------|----------');
console.log(`TOTAL                          | ${String(totalBattles).padStart(5)} | ${String(((totalSuccesses / totalBattles) * 100).toFixed(1)).padStart(7)}% | ${String(avgPRAll).padStart(11)} | ${totalCaptures}`);

// ═══════════════════════════════════════════════════════════════════════════
// Breakdown of RS battles where RS is DEFENDER
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('1b. RS AS DEFENDER (attacks against RS)');
console.log('═══════════════════════════════════════════════════════════════\n');

const defBattles = weeks.flatMap(w => (w.battles || []).filter(b => b.defender_faction === 'RS'));
const defByOutcome = {};
for (const b of defBattles) {
    defByOutcome[b.outcome] = (defByOutcome[b.outcome] || 0) + 1;
}
console.log(`Total attacks against RS: ${defBattles.length}`);
console.log('Attacker outcomes (from attacker perspective):');
for (const o of outcomeOrder) {
    if (defByOutcome[o]) console.log(`  ${o}: ${defByOutcome[o]}`);
}
const defLosses = defBattles.filter(b => b.attacker_won).length;
console.log(`RS territory lost to attacks: ${defLosses}`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. Operation lifecycle analysis
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('2. RS OPERATION LIFECYCLE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Total RS operations (from AARs): ${rsAars.length}`);
console.log();

// Outcome breakdown
const aarOutcomes = {};
for (const a of rsAars) {
    aarOutcomes[a.outcome] = (aarOutcomes[a.outcome] || 0) + 1;
}
console.log('Operation outcomes:');
for (const [k, v] of Object.entries(aarOutcomes).sort()) {
    console.log(`  ${k}: ${v}`);
}

// Detailed per-operation table
console.log('\nDetailed RS operations:');
console.log('Name                                  | Corps                  | Start | End | Dur | Obj Tgt | Obj Cap | Attacks | Outcome  | Grade');
console.log('--------------------------------------|------------------------|-------|-----|-----|---------|---------|---------|----------|------');

for (const a of rsAars) {
    const name = (a.operation_name || '').padEnd(37).substring(0, 37);
    const corps = (a.corps_id || '').padEnd(22).substring(0, 22);
    const start = String(a.started_turn).padStart(5);
    const end = String(a.ended_turn).padStart(3);
    const dur = String(a.duration_turns).padStart(3);
    const objTgt = String((a.objectives_targeted || []).length).padStart(7);
    const objCap = String((a.objectives_captured || []).length).padStart(7);
    const attacks = String(a.total_attacks || 0).padStart(7);
    const outcome = (a.outcome || '').padEnd(8).substring(0, 8);
    const grade = a.grade ? `${a.grade.stars}★ ${a.grade.verdict}` : '-';

    console.log(`${name} | ${corps} | ${start} | ${end} | ${dur} | ${objTgt} | ${objCap} | ${attacks} | ${outcome} | ${grade}`);
}

// Recovery reasons from weekly diagnostics
console.log('\nOperation stall/abort analysis (from weekly diagnostics):');
const recoveryReasons = {};
const movementOnlyTurns = {};
const maxFailureOps = new Set();

for (const week of weeks) {
    if (!week.operation_diagnostics) continue;
    for (const diag of week.operation_diagnostics) {
        if (diag.faction_id !== 'RS') continue;
        if (diag.recovery_reason) {
            recoveryReasons[diag.recovery_reason] = (recoveryReasons[diag.recovery_reason] || 0) + 1;
        }
        if (diag.movement_only_execution_turns > 0) {
            const key = diag.operation_name;
            movementOnlyTurns[key] = Math.max(movementOnlyTurns[key] || 0, diag.movement_only_execution_turns);
        }
    }
}

console.log('  Recovery reasons across all weekly snapshots:');
for (const [k, v] of Object.entries(recoveryReasons).sort()) {
    console.log(`    ${k}: ${v} (weekly observation count)`);
}

console.log('\n  Operations with movement-only execution turns:');
if (Object.keys(movementOnlyTurns).length === 0) {
    console.log('    None');
} else {
    for (const [name, max] of Object.entries(movementOnlyTurns).sort()) {
        const hitMax = max >= 4 ? ' *** HIT MAX_MOVEMENT_ONLY_EXECUTION_TURNS ***' : '';
        console.log(`    ${name}: max ${max} movement-only turns${hitMax}`);
    }
}

// Check for max_failures from AARs turn logs
console.log('\n  Operations that hit failure limits (from AAR turn logs):');
for (const a of rsAars) {
    if (!a.turn_log) continue;
    let maxFailCount = 0;
    let maxConsecFail = 0;
    let maxMoveOnly = 0;
    for (const tl of a.turn_log) {
        // We don't have direct failure_count in turn logs, but we can check notable_events
        if (tl.notable_events) {
            for (const ev of tl.notable_events) {
                if (ev === 'max_failures' || ev === 'stalled') {
                    console.log(`    ${a.operation_name}: ${ev} at turn ${tl.turn}`);
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. RS blitz phase (w0-12) attack tempo
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('3. RS BLITZ PHASE (w0-12) ATTACK TEMPO');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Phase    | Weeks | Total Battles | Avg/Week | Total Captures | Avg Cap/Week | Zero-Attack Weeks');
console.log('---------|-------|---------------|----------|----------------|--------------|------------------');

const phases = [
    { name: 'Blitz', start: 0, end: 12 },
    { name: 'Sustained', start: 12, end: 26 },
    { name: 'Consol', start: 26, end: 40 },
];

for (const phase of phases) {
    const phaseWeeks = weeklyStats.filter(w => w.wi >= phase.start && w.wi < phase.end);
    const phaseBattles = phaseWeeks.reduce((s, w) => s + w.total, 0);
    const phaseCaptures = phaseWeeks.reduce((s, w) => s + w.captures, 0);
    const numWeeks = phaseWeeks.length;
    const avgBattles = numWeeks > 0 ? (phaseBattles / numWeeks).toFixed(1) : '-';
    const avgCaptures = numWeeks > 0 ? (phaseCaptures / numWeeks).toFixed(1) : '-';
    const zeroWeeks = phaseWeeks.filter(w => w.total === 0).length;
    const zeroList = phaseWeeks.filter(w => w.total === 0).map(w => `w${w.wi}`).join(', ');

    console.log(`${phase.name.padEnd(8)} | ${String(numWeeks).padStart(5)} | ${String(phaseBattles).padStart(13)} | ${String(avgBattles).padStart(8)} | ${String(phaseCaptures).padStart(14)} | ${String(avgCaptures).padStart(12)} | ${zeroWeeks}${zeroList ? ' (' + zeroList + ')' : ''}`);
}

// Detailed blitz week-by-week
console.log('\nBlitz phase week-by-week detail:');
console.log('Week | Battles | Captures | Success% | Avg PR  | Operations Active');
console.log('-----|---------|----------|----------|---------|------------------');

for (let wi = 0; wi < 12 && wi < weeks.length; wi++) {
    const w = weeks[wi];
    const stats = weeklyStats[wi];
    const rsDiags = (w.operation_diagnostics || []).filter(d => d.faction_id === 'RS');
    const activeOps = rsDiags.map(d => `${d.operation_name}(${d.operation_phase})`).join(', ');
    const sr = stats.total > 0 ? ((stats.successes / stats.total) * 100).toFixed(0) + '%' : '-';
    const pr = stats.total > 0 ? stats.avgPR.toFixed(2) : '-';

    console.log(`w${String(wi).padStart(2, '0')}  | ${String(stats.total).padStart(7)} | ${String(stats.captures).padStart(8)} | ${String(sr).padStart(7)}  | ${String(pr).padStart(7)} | ${activeOps}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Control counts over time
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('RS CONTROL COUNTS OVER TIME');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Week | RS OSIDs | RBiH | HRHB | RS Delta/wk | Phase');
console.log('-----|----------|------|------|-------------|------');

let prevRS = null;
for (const week of weeks) {
    const wi = week.week_index;
    const cc = week.control_counts || {};
    const rsCount = cc.RS || 0;
    const delta = prevRS !== null ? rsCount - prevRS : '-';
    let phase = 'consol';
    if (wi < 12) phase = 'blitz';
    else if (wi < 26) phase = 'sustained';

    console.log(`w${String(wi).padStart(2, '0')}  | ${String(rsCount).padStart(8)} | ${String(cc.RBiH || 0).padStart(4)} | ${String(cc.HRHB || 0).padStart(4)} | ${String(delta).padStart(11)} | ${phase}`);
    prevRS = rsCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Current doctrine parameters
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('4. CURRENT DOCTRINE PARAMETERS (from source files)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('TIMELINE JSON (data/scenarios/timelines/apr1992.json) — these OVERRIDE code defaults:');
console.log('  RS doctrine_phases:');
console.log('    w0-12  (blitz):        attack_share=0.35, aggression=+0.15, stance=offensive');
console.log('    w12-26 (sustained):    attack_share=0.25, aggression=+0.08, stance=offensive');
console.log('    w26+   (consolidation):attack_share=0.20, aggression=+0.05, stance=offensive');
console.log();
console.log('CODE DEFAULTS (src/sim/combat/bot_strategy.ts) — FACTION_DOCTRINE_PHASES:');
console.log('  RS (identical to timeline — timeline takes precedence):');
console.log('    w0-12:    attack_share=0.35, aggression=+0.15, stance=offensive');
console.log('    w12-26:   attack_share=0.25, aggression=+0.08, stance=offensive');
console.log('    w26+:     attack_share=0.20, aggression=+0.05, stance=offensive');
console.log();
console.log('  RS_EARLY_WAR_END_WEEK = 26 (bot_constants.ts)');
console.log();
console.log('FACTION_STRATEGIES.RS (static, non-time-phased):');
console.log('  max_attack_posture_share: 0.40 (fallback if no doctrine phase)');
console.log('  attack_coverage_threshold: 120');
console.log('  min_active_brigades: 3');
console.log();
console.log('SECTOR OFFENSIVE CONSTANTS (src/sim/combat/sector_offensive.ts):');
console.log('  MAX_TOTAL_FAILURES = 5');
console.log('  MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3');
console.log('  MAX_MOVEMENT_ONLY_EXECUTION_TURNS = 4');
console.log();
console.log('STANDING ORDERS (timeline JSON):');
console.log('  w0-26:  "Territorial Seizure" — general_offensive');
console.log('  w26+:   "Targeted Operations" — balanced');
console.log();
console.log('EXTERNAL SUPPORT (timeline JSON):');
console.log('  RS external_support: 1.26x combat multiplier through w26');
console.log('  Municipalities: bijeljina, zvornik, foca, vlasenica, bratunac, visegrad, rogatica, prijedor');
console.log();
console.log('COHESION:');
console.log('  RS ceiling: w0=85, w13=82, w26=78, w39=73, w52=68');
console.log('  RS floor:   w0=35, w40=35, w60=25, w80=20');
console.log('  RS drift:   w0-20=+0.05, w20-40=+0.05, w40-53=0, w53-79=-0.10');
console.log();
console.log('EQUIPMENT DECAY: RS 0.5%/week from w26, floor 0.60');

// ═══════════════════════════════════════════════════════════════════════════
// Battle outcome distribution summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('BATTLE OUTCOME DISTRIBUTION BY PHASE');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const phase of phases) {
    const phaseBattles = weeks
        .filter(w => w.week_index >= phase.start && w.week_index < phase.end)
        .flatMap(w => (w.battles || []).filter(b => b.attacker_faction === 'RS'));

    const dist = {};
    for (const o of outcomeOrder) dist[o] = 0;
    for (const b of phaseBattles) dist[b.outcome] = (dist[b.outcome] || 0) + 1;

    const total = phaseBattles.length;
    console.log(`${phase.name} (w${phase.start}-${phase.end}): ${total} battles`);
    for (const o of outcomeOrder) {
        if (dist[o] > 0) {
            console.log(`  ${o}: ${dist[o]} (${((dist[o] / total) * 100).toFixed(1)}%)`);
        }
    }

    const avgPR = total > 0 ? (phaseBattles.reduce((s, b) => s + (b.power_ratio || 0), 0) / total).toFixed(2) : '-';
    console.log(`  Avg power ratio: ${avgPR}`);
    console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// High-power-ratio battles that still failed
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('RS BATTLES WITH POWER_RATIO >= 1.5 THAT FAILED (stalemate/repulsed/catastrophic)');
console.log('═══════════════════════════════════════════════════════════════\n');

const failedHighPR = allRsBattles.filter(b => b.power_ratio >= 1.5 && ['stalemate', 'repulsed', 'catastrophic'].includes(b.outcome));
if (failedHighPR.length === 0) {
    console.log('None found.');
} else {
    console.log('Target OSID                         | PR    | Outcome       | Week');
    console.log('------------------------------------|-------|---------------|-----');
    // Find week for each battle
    for (const week of weeks) {
        for (const b of (week.battles || [])) {
            if (b.attacker_faction === 'RS' && b.power_ratio >= 1.5 && ['stalemate', 'repulsed', 'catastrophic'].includes(b.outcome)) {
                console.log(`${(b.target_osid || '').padEnd(35)} | ${b.power_ratio.toFixed(2).padStart(5)} | ${b.outcome.padEnd(13)} | w${week.week_index}`);
            }
        }
    }
}
console.log(`\nTotal high-PR failures: ${failedHighPR.length} / ${allRsBattles.filter(b => b.power_ratio >= 1.5).length} high-PR battles`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('END OF ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
