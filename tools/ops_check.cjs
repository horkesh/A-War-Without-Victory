'use strict';

/**
 * ops_check.cjs
 * Diagnostic tool for Operation AAR artifacts from scenario runs.
 * Displays a summary table of all completed and active operations with
 * star grades, exchange ratios, objective completion, and casualties.
 *
 * Usage: node tools/ops_check.cjs <run_dir>
 *        node tools/ops_check.cjs              (uses latest run)
 *
 * CommonJS — runs with plain node, no tsx/ESM needed.
 */

const fs   = require('fs');
const path = require('path');

// ─── Resolve run directory ──────────────────────────────────────────────────

function findLatestRunDir() {
    const runsDir = path.join(__dirname, '..', 'runs');
    if (!fs.existsSync(runsDir)) return null;
    const dirs = fs.readdirSync(runsDir)
        .filter(d => {
            const full = path.join(runsDir, d);
            return fs.statSync(full).isDirectory() &&
                   fs.existsSync(path.join(full, 'operation_aars.json'));
        })
        .sort();
    return dirs.length > 0 ? path.join(runsDir, dirs[dirs.length - 1]) : null;
}

const runDir = process.argv[2] || findLatestRunDir();
if (!runDir || !fs.existsSync(runDir)) {
    console.error('Usage: node tools/ops_check.cjs <run_dir>');
    console.error('No run directory found.');
    process.exit(1);
}

// ─── Load data ──────────────────────────────────────────────────────────────

const aarsPath = path.join(runDir, 'operation_aars.json');
if (!fs.existsSync(aarsPath)) {
    console.error(`No operation_aars.json in ${runDir}`);
    process.exit(1);
}

const aars = JSON.parse(fs.readFileSync(aarsPath, 'utf8'));

// Check for active ops in final_save
let activeOps = [];
const finalSavePath = path.join(runDir, 'final_save.json');
if (fs.existsSync(finalSavePath)) {
    try {
        const state = JSON.parse(fs.readFileSync(finalSavePath, 'utf8'));
        const cc = state.military?.corps_command ?? state.corps_command ?? {};
        for (const [corpsId, cmd] of Object.entries(cc)) {
            if (cmd.active_operation) {
                const op = cmd.active_operation;
                activeOps.push({
                    corps_id: corpsId,
                    operation_name: op.operation_name ?? op.name ?? '?',
                    phase: op.phase ?? '?',
                    type: op.type ?? '?',
                    attacks: op.pending_casualties?.attacks ?? 0,
                    objectives: op.objectives?.length ?? 0,
                    brigades: op.participating_brigades?.length ?? 0,
                    started_turn: op.started_turn ?? '?',
                });
            }
        }
    } catch (_) { /* ignore parse errors */ }
}

// ─── Display helpers ────────────────────────────────────────────────────────

function stars(n) {
    return '\u2605'.repeat(Math.max(0, Math.min(5, n))) +
           '\u2606'.repeat(5 - Math.max(0, Math.min(5, n)));
}

function pad(s, n, right) {
    s = String(s);
    if (right) return s.padStart(n);
    return s.padEnd(n);
}

function exchangeStr(suffered, inflicted) {
    const s = suffered.killed + suffered.wounded;
    const i = inflicted.killed + inflicted.wounded;
    if (s === 0 && i === 0) return '  --  ';
    if (s === 0) return ' INF  ';
    return (i / s).toFixed(2).padStart(6);
}

function objStr(targeted, captured) {
    return `${captured.length}/${targeted.length}`;
}

// ─── Summary table ──────────────────────────────────────────────────────────

console.log(`\n  Operation AARs — ${path.basename(runDir)}`);
console.log(`  ${aars.length} completed operations, ${activeOps.length} active\n`);

if (aars.length > 0) {
    // Header
    const H = [
        pad('Grade', 7),
        pad('Operation', 28),
        pad('Faction', 7),
        pad('Corps', 22),
        pad('Turns', 10),
        pad('Obj', 5),
        pad('Exch', 6),
        pad('Suf', 6, true),
        pad('Inf', 6, true),
        pad('T/A', 5, true),
        pad('Outcome', 12),
        pad('Verdict', 18),
    ].join(' ');
    console.log('  ' + H);
    console.log('  ' + '-'.repeat(H.length));

    // Sort by started_turn
    const sorted = [...aars].sort((a, b) => a.started_turn - b.started_turn);

    // Faction totals
    const factionTotals = {};

    for (const aar of sorted) {
        const suf = aar.casualties_suffered.killed + aar.casualties_suffered.wounded;
        const inf = aar.casualties_inflicted.killed + aar.casualties_inflicted.wounded;
        const eqLost = (aar.equipment_lost?.tanks ?? 0) + (aar.equipment_lost?.artillery ?? 0);

        // Accumulate faction totals
        if (!factionTotals[aar.faction]) {
            factionTotals[aar.faction] = { ops: 0, suf: 0, inf: 0, obj_t: 0, obj_c: 0, attacks: 0, eqLost: 0, starsSum: 0 };
        }
        const ft = factionTotals[aar.faction];
        ft.ops++;
        ft.suf += suf;
        ft.inf += inf;
        ft.obj_t += aar.objectives_targeted.length;
        ft.obj_c += aar.objectives_captured.length;
        ft.attacks += aar.total_attacks;
        ft.eqLost += eqLost;
        ft.starsSum += aar.grade.stars;

        const row = [
            pad(stars(aar.grade.stars), 7),
            pad(aar.operation_name, 28),
            pad(aar.faction, 7),
            pad(aar.corps_id, 22),
            pad(`w${aar.started_turn}-w${aar.ended_turn}`, 10),
            pad(objStr(aar.objectives_targeted, aar.objectives_captured), 5),
            exchangeStr(aar.casualties_suffered, aar.casualties_inflicted),
            pad(suf, 6, true),
            pad(inf, 6, true),
            pad(eqLost > 0 ? eqLost : '', 5, true),
            pad(aar.outcome, 12),
            pad(aar.grade.verdict, 18),
        ].join(' ');
        console.log('  ' + row);
    }

    // Faction summary
    console.log('\n  ' + '='.repeat(70));
    console.log('  FACTION SUMMARY\n');
    for (const [faction, t] of Object.entries(factionTotals).sort()) {
        const avgStars = (t.starsSum / t.ops).toFixed(1);
        const exch = t.suf > 0 ? (t.inf / t.suf).toFixed(2) : '--';
        console.log(`  ${pad(faction, 6)}  ${t.ops} ops  avg ${avgStars}\u2605  obj ${t.obj_c}/${t.obj_t}  ` +
            `suf ${t.suf}  inf ${t.inf}  exch ${exch}:1  eq_lost ${t.eqLost}  attacks ${t.attacks}`);
    }
}

// Active operations
if (activeOps.length > 0) {
    console.log('\n  ' + '='.repeat(70));
    console.log('  ACTIVE OPERATIONS\n');
    for (const op of activeOps) {
        console.log(`  ${pad(op.corps_id, 25)} ${pad(op.operation_name, 28)} ${op.phase.padEnd(10)} ` +
            `${op.brigades} bdes  ${op.attacks} atk  since w${op.started_turn}`);
    }
}

console.log('');
