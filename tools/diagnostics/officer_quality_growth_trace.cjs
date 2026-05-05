#!/usr/bin/env node
/**
 * Officer Quality Growth-Path Trace — Audit-only post-processor.
 *
 * Reads `<run_dir>/brigade_temporal_log.jsonl` and produces per-faction
 * survivorship-vs-growth attribution for the per-formation officer_quality
 * trajectory, in support of LANE-NIGHTSHIFT-OFFICER-QUALITY-GROWTH-PATH-INVESTIGATION.
 *
 * Cross-lane finding (predecessors Wave 4 + Wave 6 + Lane A):
 *   - Wave 4 reinforcement_mult step-curve faction-asymmetric DISPROVED.
 *   - Lane A OFFICER_CASUALTY_MULT faction-asymmetric DISPROVED.
 *   - Both: VRS+HRHB officer_quality whole-run Δ/turn stays positive when canon expects ≤ 0.
 *   - Implication: per-faction multipliers cannot bend the arc; defect is upstream
 *     in the per-brigade growth math (or is a metric artifact: survivorship bias).
 *
 * This diagnostic answers: is the +0.0006/turn faction-mean drift an actual
 * per-formation growth, OR pure survivorship — low-quality cadres dropping out
 * of the active set while high-quality survivors stay flat?
 *
 * Method:
 *   1. For each faction, compute the whole-run Δ officer_quality / turn from the
 *      faction-mean at t1 vs t-final (matches Wave 6 + Lane A diagnostic).
 *   2. Per-formation trajectory: for every active formation present at both t=1
 *      (or first-seen) and t-final (or last-seen-active), compute its individual
 *      Δ officer_quality / turn.
 *   3. Stayer cohort = formations active at BOTH t1 and t-final. If the faction-mean
 *      drift comes from per-formation growth, the stayer mean Δ/turn will match the
 *      faction-mean Δ/turn. If the drift is survivorship, the stayer mean Δ/turn
 *      will be near zero (or even negative) and the gap to faction-mean reveals
 *      the survivorship contribution.
 *   4. Emit dropout cohort stats: formations active at t1 but NOT at t-final.
 *      Their AT-DROPOUT mean officer_quality vs the faction t1 mean tells us
 *      whether dropouts skew low (survivorship pressure UP) or high (no skew).
 *   5. Newcomer cohort: formations not active at t1 but active at t-final.
 *      Their LAST mean officer_quality vs the faction t-final mean tells us
 *      whether reinforcements / reconstitutions enter at low or high quality.
 *
 * Attribution math (whole-run, per faction):
 *   faction_drift_per_turn = (mean_qual[active@t-final] - mean_qual[active@t1]) / span
 *
 *   stayer_drift_per_turn = avg over stayers of (q_final - q_first) / span_per_formation
 *
 *   If stayer_drift_per_turn ≈ faction_drift_per_turn  → genuine per-formation growth
 *   If stayer_drift_per_turn ≪ faction_drift_per_turn  → survivorship-dominant
 *   If stayer_drift_per_turn  > faction_drift_per_turn  → growth offset by low-quality newcomers
 *
 * Determinism: sorted faction iteration, sorted formation iteration via
 * strictCompare, numeric-ascending turn iteration, no Math.random, no Date.now.
 *
 * Usage:
 *   node tools/diagnostics/officer_quality_growth_trace.cjs <run_dir> [--json]
 *
 * Exit codes:
 *   0 — emitted attribution report
 *   1 — missing run_dir or required artifacts
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['HRHB', 'RBiH', 'RS']; // canonical sorted iteration order

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
}

function fail(msg) {
    process.stderr.write(`officer_quality_growth_trace: ${msg}\n`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = { runDir: null, json: false };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--json') args.json = true;
        else if (!args.runDir) args.runDir = a;
    }
    if (!args.runDir) fail('usage: <run_dir> [--json]');
    return args;
}

function loadTemporalLog(runDir) {
    const p = path.join(runDir, 'brigade_temporal_log.jsonl');
    if (!fs.existsSync(p)) fail(`missing: ${p}`);
    const text = fs.readFileSync(p, 'utf8');
    const rows = [];
    for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        let row;
        try { row = JSON.parse(t); } catch { continue; }
        if (typeof row.turn !== 'number') continue;
        if (typeof row.faction !== 'string') continue;
        if (typeof row.brigade_id !== 'string') continue;
        rows.push(row);
    }
    return rows;
}

/**
 * Build per-formation trajectory: { brigade_id -> { faction, firstTurn, lastActiveTurn,
 * firstQuality, lastActiveQuality, activeAtT1, activeAtTFinal } }
 *
 * Quality is only counted from rows where status === 'active' AND officer_quality is a number.
 * lastActiveTurn/lastActiveQuality track the latest turn at which the formation was active
 * (so dropouts capture their AT-DROPOUT quality, not a stale post-destruction value).
 */
function buildPerFormation(rows, tFirst, tFinal) {
    const traj = new Map();
    const sortedRows = rows.slice().sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return strictCompare(a.brigade_id, b.brigade_id);
    });

    for (const r of sortedRows) {
        const id = r.brigade_id;
        const isActive = r.status === 'active';
        const q = typeof r.officer_quality === 'number' ? r.officer_quality : null;
        if (!traj.has(id)) {
            traj.set(id, {
                faction: r.faction,
                firstActiveTurn: null,
                firstActiveQuality: null,
                lastActiveTurn: null,
                lastActiveQuality: null,
                activeAtT1: false,
                activeAtTFinal: false,
                everActive: false,
            });
        }
        const t = traj.get(id);
        if (isActive) t.everActive = true;
        if (isActive && q !== null) {
            if (t.firstActiveTurn === null) {
                t.firstActiveTurn = r.turn;
                t.firstActiveQuality = q;
            }
            t.lastActiveTurn = r.turn;
            t.lastActiveQuality = q;
        }
        if (r.turn === tFirst && isActive) t.activeAtT1 = true;
        if (r.turn === tFinal && isActive) t.activeAtTFinal = true;
    }
    return traj;
}

function sortedFormationIds(traj) {
    return Array.from(traj.keys()).sort(strictCompare);
}

function meanOf(values) {
    if (!values.length) return null;
    let s = 0;
    for (const v of values) s += v;
    return s / values.length;
}

function attributePerFaction(traj, tFirst, tFinal) {
    const span = Math.max(1, tFinal - tFirst);
    const out = {};
    for (const f of FACTIONS) {
        const ids = sortedFormationIds(traj).filter(id => traj.get(id).faction === f);
        const t1Active = []; // {id, q}
        const tFinalActive = []; // {id, q}
        const stayers = []; // {id, qFirst, qLast, span_per_formation}
        const dropouts = []; // {id, qLastActive, lastActiveTurn}
        const newcomers = []; // {id, qFirstActive, firstActiveTurn, qLast}

        for (const id of ids) {
            const t = traj.get(id);
            if (t.activeAtT1 && t.firstActiveQuality !== null) t1Active.push({ id, q: t.firstActiveQuality });
            if (t.activeAtTFinal && t.lastActiveQuality !== null) tFinalActive.push({ id, q: t.lastActiveQuality });

            if (t.activeAtT1 && t.activeAtTFinal) {
                if (t.firstActiveQuality !== null && t.lastActiveQuality !== null) {
                    const s = Math.max(1, t.lastActiveTurn - t.firstActiveTurn);
                    stayers.push({
                        id,
                        qFirst: t.firstActiveQuality,
                        qLast: t.lastActiveQuality,
                        deltaPerTurn: (t.lastActiveQuality - t.firstActiveQuality) / s,
                    });
                }
            } else if (t.activeAtT1 && !t.activeAtTFinal && t.lastActiveQuality !== null) {
                dropouts.push({
                    id,
                    qLastActive: t.lastActiveQuality,
                    lastActiveTurn: t.lastActiveTurn,
                });
            } else if (!t.activeAtT1 && t.activeAtTFinal && t.firstActiveQuality !== null && t.lastActiveQuality !== null) {
                newcomers.push({
                    id,
                    qFirstActive: t.firstActiveQuality,
                    firstActiveTurn: t.firstActiveTurn,
                    qLast: t.lastActiveQuality,
                });
            }
        }

        const meanT1 = meanOf(t1Active.map(x => x.q));
        const meanTFinal = meanOf(tFinalActive.map(x => x.q));
        const factionDriftPerTurn = (meanT1 !== null && meanTFinal !== null)
            ? (meanTFinal - meanT1) / span
            : null;

        const stayerDeltas = stayers.map(s => s.deltaPerTurn);
        const meanStayerDrift = meanOf(stayerDeltas);
        const meanStayerQFirst = meanOf(stayers.map(s => s.qFirst));
        const meanStayerQLast = meanOf(stayers.map(s => s.qLast));

        const meanDropoutQ = meanOf(dropouts.map(d => d.qLastActive));
        const meanNewcomerQFirst = meanOf(newcomers.map(n => n.qFirstActive));
        const meanNewcomerQLast = meanOf(newcomers.map(n => n.qLast));

        // Attribution decomposition: faction_drift = stayer_growth_share + cohort_turnover_share
        // where stayer_growth_share = (n_stayers * mean_stayer_drift * span) / (n_tFinal_active * span)
        //                           = (n_stayers / n_tFinal_active) * mean_stayer_drift
        // and cohort_turnover_share = factionDriftPerTurn - stayer_growth_share
        const nStayers = stayers.length;
        const nTFinalActive = tFinalActive.length;
        const stayerGrowthShare = (meanStayerDrift !== null && nTFinalActive > 0)
            ? (nStayers / nTFinalActive) * meanStayerDrift
            : null;
        const cohortTurnoverShare = (factionDriftPerTurn !== null && stayerGrowthShare !== null)
            ? factionDriftPerTurn - stayerGrowthShare
            : null;

        const survivorshipPct = (factionDriftPerTurn !== null && cohortTurnoverShare !== null && factionDriftPerTurn !== 0)
            ? 100 * cohortTurnoverShare / factionDriftPerTurn
            : null;
        const growthPct = (factionDriftPerTurn !== null && stayerGrowthShare !== null && factionDriftPerTurn !== 0)
            ? 100 * stayerGrowthShare / factionDriftPerTurn
            : null;

        out[f] = {
            n_active_at_t_first: t1Active.length,
            n_active_at_t_final: tFinalActive.length,
            n_stayers: nStayers,
            n_dropouts: dropouts.length,
            n_newcomers: newcomers.length,
            mean_quality_t_first: meanT1,
            mean_quality_t_final: meanTFinal,
            faction_drift_per_turn: factionDriftPerTurn,
            mean_stayer_q_first: meanStayerQFirst,
            mean_stayer_q_last: meanStayerQLast,
            mean_stayer_drift_per_turn: meanStayerDrift,
            mean_dropout_q_last_active: meanDropoutQ,
            mean_newcomer_q_first_active: meanNewcomerQFirst,
            mean_newcomer_q_last: meanNewcomerQLast,
            stayer_growth_share_per_turn: stayerGrowthShare,
            cohort_turnover_share_per_turn: cohortTurnoverShare,
            growth_pct_of_faction_drift: growthPct,
            survivorship_pct_of_faction_drift: survivorshipPct,
        };
    }
    return out;
}

function fmt(x, digits) {
    if (x === null || x === undefined || Number.isNaN(x)) return 'n/a';
    if (typeof x !== 'number') return String(x);
    if (Math.abs(x) < 0.0001 && x !== 0) return x.toExponential(2);
    return x.toFixed(digits);
}

function emitText(args, attribution, tFirst, tFinal) {
    const lines = [];
    lines.push('Officer Quality Growth-Path Trace');
    lines.push('==================================');
    lines.push(`Run dir:           ${args.runDir}`);
    lines.push(`First turn (tF):   ${tFirst}`);
    lines.push(`Final turn (tL):   ${tFinal}`);
    lines.push(`Span (tL - tF):    ${tFinal - tFirst} turns`);
    lines.push('');
    lines.push('Per-faction whole-run attribution');
    lines.push('---------------------------------');
    lines.push('');

    const cols = [
        'faction', 'n@t1', 'n@tL', 'stayers', 'dropout', 'newcom',
        'meanQ@t1', 'meanQ@tL', 'fct Δ/turn',
        'stayer Δ/turn', 'dropout Q@last', 'newcomer Q@first', 'newcomer Q@last',
        'growth %', 'surv %',
    ];
    lines.push(cols.join('\t'));
    for (const f of FACTIONS) {
        const a = attribution[f];
        const row = [
            f,
            a.n_active_at_t_first,
            a.n_active_at_t_final,
            a.n_stayers,
            a.n_dropouts,
            a.n_newcomers,
            fmt(a.mean_quality_t_first, 4),
            fmt(a.mean_quality_t_final, 4),
            fmt(a.faction_drift_per_turn, 6),
            fmt(a.mean_stayer_drift_per_turn, 6),
            fmt(a.mean_dropout_q_last_active, 4),
            fmt(a.mean_newcomer_q_first_active, 4),
            fmt(a.mean_newcomer_q_last, 4),
            fmt(a.growth_pct_of_faction_drift, 1),
            fmt(a.survivorship_pct_of_faction_drift, 1),
        ];
        lines.push(row.join('\t'));
    }

    lines.push('');
    lines.push('Interpretation key');
    lines.push('------------------');
    lines.push('  faction Δ/turn       — whole-run mean officer_quality change per turn (active formations)');
    lines.push('  stayer Δ/turn        — mean per-formation Δ/turn for formations active at BOTH t1 and tL');
    lines.push('  dropout Q@last       — mean officer_quality at the LAST active turn for formations that were active at t1 but NOT at tL');
    lines.push('  newcomer Q@first     — mean officer_quality at the FIRST active turn for formations active at tL but NOT t1');
    lines.push('  newcomer Q@last      — mean officer_quality at tL for the same newcomers');
    lines.push('  growth %             — (n_stayers / n@tL) × stayer_Δ as % of faction Δ; per-formation growth share');
    lines.push('  surv %               — 100 - growth %; cohort-turnover share (dropouts low, newcomers high, etc.)');
    lines.push('');
    lines.push('  growth ≫ 0  AND  growth % ≈ 100  →  defect is in per-brigade growth code');
    lines.push('  growth ≈ 0  AND  surv  % ≈ 100  →  metric artifact: faction-mean is dominated by who survives');
    lines.push('  mixed                            →  both contributors; report relative magnitudes');
    return lines.join('\n');
}

function main() {
    const args = parseArgs(process.argv);
    const rows = loadTemporalLog(args.runDir);
    if (!rows.length) fail('no rows parsed from brigade_temporal_log.jsonl');
    let tFirst = Infinity;
    let tFinal = -Infinity;
    for (const r of rows) {
        if (r.turn < tFirst) tFirst = r.turn;
        if (r.turn > tFinal) tFinal = r.turn;
    }
    const traj = buildPerFormation(rows, tFirst, tFinal);
    const attribution = attributePerFaction(traj, tFirst, tFinal);
    if (args.json) {
        const out = { run_dir: args.runDir, t_first: tFirst, t_final: tFinal, factions: attribution };
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    } else {
        process.stdout.write(emitText(args, attribution, tFirst, tFinal) + '\n');
    }
}

main();
