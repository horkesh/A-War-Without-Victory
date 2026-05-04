#!/usr/bin/env node
/**
 * Force Quality Trajectory Diagnostic — Read-only per-turn force-quality projection.
 *
 * Reads `<run_dir>/brigade_temporal_log.jsonl` (per-turn brigade snapshot) and aggregates
 * per-faction per-turn averages of morale, cohesion, fatigue, and personnel. Classifies the
 * trajectory of each metric over the run window against the canonical doctrinal arc named
 * in `docs/40_reports/CALIBRATION_MASTER.md`:
 *
 *   - VRS  : Professional -> Degraded   (high morale/cohesion early, declining trajectory)
 *   - RBiH : Rabble -> Professional     (lower early, rising trajectory)
 *   - HRHB : Capable Militia -> Overstretched (mid-level early, declining trajectory)
 *
 * Determinism contract: faction iteration via canonical sorted order; turn iteration via
 * numeric ascending; no Math.random, no Date.now, no locale-dependent sort, no floating
 * comparison in keys. Read-only: writes nothing back to the run dir.
 *
 * Usage:
 *   node tools/diagnostics/force_quality_trajectory.cjs <run_dir> [--json]
 *
 * Exit codes:
 *   0 — emitted trajectory
 *   1 — missing run_dir or required artifacts
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['HRHB', 'RBiH', 'RS']; // canonical sorted iteration order
const METRICS = ['cohesion', 'fatigue', 'morale', 'officer_quality', 'personnel']; // sorted

// Doctrinal arc per CALIBRATION_MASTER.md. `direction` describes the canonical sign of
// (late_window - early_window): negative = degrade, positive = improve.
//
// LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — officer_quality arc:
//   VRS: starts high (JNA inheritance), declines via casualty-driven brain drain
//   ARBiH: starts low (TO improvisation), rises via combat experience growth
//   HVO: starts mid (HV cadre), declines via overstretch + post-WA cadre loss
const DOCTRINAL_ARC = {
    HRHB: { cohesion: -1, morale: -1, fatigue: 1, officer_quality: -1, personnel: -1 },
    RBiH: { cohesion: 1, morale: 1, fatigue: 1, officer_quality: 1, personnel: 1 },
    RS: { cohesion: -1, morale: -1, fatigue: 1, officer_quality: -1, personnel: -1 },
};

// LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — noise floor per metric.
// officer_quality is a [0, 1] scalar — its noise floor is far smaller than morale's
// 0..100 scale. classifyDirection consumes this map.
const METRIC_NOISE_FLOOR = {
    cohesion: 0.5,
    fatigue: 0.5,
    morale: 0.5,
    officer_quality: 0.01,
    personnel: 0.5,
};

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJsonlLines(p) {
    const raw = fs.readFileSync(p, 'utf8');
    const out = [];
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        out.push(JSON.parse(trimmed));
    }
    return out;
}

function aggregateByTurn(rows) {
    const byTurnFaction = new Map();
    for (const r of rows) {
        if (!r || r.kind !== 'brigade') continue;
        if (r.status !== 'active') continue;
        const turn = Number(r.turn);
        if (!Number.isFinite(turn)) continue;
        const fac = r.faction;
        if (!FACTIONS.includes(fac)) continue;
        const key = `${turn}|${fac}`;
        let bucket = byTurnFaction.get(key);
        if (!bucket) {
            // Per-metric counts so officer_quality (which is optional on the row
            // schema; only emitted when the formation carries the field) does not
            // contaminate other metrics' averages with zeros for legacy rows.
            bucket = {
                turn,
                faction: fac,
                count: 0,
                sums: { cohesion: 0, fatigue: 0, morale: 0, officer_quality: 0, personnel: 0 },
                counts: { cohesion: 0, fatigue: 0, morale: 0, officer_quality: 0, personnel: 0 },
            };
            byTurnFaction.set(key, bucket);
        }
        bucket.count += 1;
        for (const m of METRICS) {
            // `officer_quality` is conditionally present on the row (Gap 1 emit
            // only attaches when FormationState.officer_quality is a number).
            // Skip rows that don't carry the field for that metric so the
            // average reflects the population that actually has it.
            if (r[m] === undefined || r[m] === null) continue;
            const v = Number(r[m]);
            if (Number.isFinite(v)) {
                bucket.sums[m] += v;
                bucket.counts[m] += 1;
            }
        }
    }
    const turns = new Set();
    for (const b of byTurnFaction.values()) turns.add(b.turn);
    const sortedTurns = Array.from(turns).sort((a, b) => a - b);
    const trajectory = [];
    for (const turn of sortedTurns) {
        const turnRow = { turn };
        for (const fac of FACTIONS) {
            const bucket = byTurnFaction.get(`${turn}|${fac}`);
            if (!bucket || bucket.count === 0) {
                turnRow[fac] = { count: 0 };
                continue;
            }
            const avgs = { count: bucket.count };
            for (const m of METRICS) {
                const c = bucket.counts[m];
                avgs[m] = c > 0 ? bucket.sums[m] / c : null;
            }
            turnRow[fac] = avgs;
        }
        trajectory.push(turnRow);
    }
    return trajectory;
}

function classifyDirection(observedDelta, canonicalSign, metric) {
    // Threshold for noise floor. Differences within +/- noise (raw units) treated as flat.
    // officer_quality is on a [0,1] scale and uses a much smaller floor than
    // the 0..100 morale/cohesion scales (see METRIC_NOISE_FLOOR).
    const noise = (metric && METRIC_NOISE_FLOOR[metric]) || 0.5;
    if (Math.abs(observedDelta) < noise) {
        return canonicalSign === 0 ? 'matches' : 'drifting_away';
    }
    const observedSign = observedDelta > 0 ? 1 : -1;
    if (canonicalSign === 0) return 'drifting_away';
    if (observedSign === canonicalSign) {
        return Math.abs(observedDelta) >= noise * 4 ? 'matches' : 'trending_correctly';
    }
    return 'inverse';
}

function classifyTrajectory(trajectory) {
    if (trajectory.length < 2) return [];
    const earlyWindow = Math.max(1, Math.floor(trajectory.length * 0.1));
    const lateWindow = Math.max(1, Math.floor(trajectory.length * 0.1));
    const earlyRows = trajectory.slice(0, earlyWindow);
    const lateRows = trajectory.slice(trajectory.length - lateWindow);
    const verdicts = [];
    for (const fac of FACTIONS) {
        for (const m of METRICS) {
            const earlyVals = [];
            const lateVals = [];
            for (const r of earlyRows) {
                const v = r[fac] && r[fac][m];
                if (typeof v === 'number') earlyVals.push(v);
            }
            for (const r of lateRows) {
                const v = r[fac] && r[fac][m];
                if (typeof v === 'number') lateVals.push(v);
            }
            if (earlyVals.length === 0 || lateVals.length === 0) continue;
            const earlyMean = earlyVals.reduce((a, b) => a + b, 0) / earlyVals.length;
            const lateMean = lateVals.reduce((a, b) => a + b, 0) / lateVals.length;
            const delta = lateMean - earlyMean;
            const canonicalSign = (DOCTRINAL_ARC[fac] && DOCTRINAL_ARC[fac][m]) || 0;
            const divergence_class = classifyDirection(delta, canonicalSign, m);
            verdicts.push({
                faction: fac,
                metric: m,
                early_mean: earlyMean,
                late_mean: lateMean,
                delta,
                canonical_sign: canonicalSign,
                divergence_class,
            });
        }
    }
    verdicts.sort((a, b) => {
        const c = strictCompare(a.faction, b.faction);
        if (c !== 0) return c;
        return strictCompare(a.metric, b.metric);
    });
    return verdicts;
}

function topDivergences(verdicts, n) {
    const order = { inverse: 0, drifting_away: 1, trending_correctly: 2, matches: 3 };
    const sorted = verdicts.slice().sort((a, b) => {
        const oa = order[a.divergence_class];
        const ob = order[b.divergence_class];
        if (oa !== ob) return oa - ob;
        const m = Math.abs(b.delta) - Math.abs(a.delta);
        if (m !== 0) return m;
        const c = strictCompare(a.faction, b.faction);
        if (c !== 0) return c;
        return strictCompare(a.metric, b.metric);
    });
    return sorted.slice(0, n);
}

/**
 * LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — for each requested
 * checkpoint turn, report the per-faction officer_quality average plus the
 * direction-class vs the doctrinal sign relative to the very first turn that
 * carries officer_quality data. Returns null per cell when the metric was not
 * emitted on that (turn, faction) cohort. Faction-agnostic: works with any
 * canonical faction id present in the trajectory.
 */
function snapshotOfficerQuality(trajectory, checkpointTurns) {
    if (!Array.isArray(trajectory) || trajectory.length === 0) return [];
    // First-turn-with-data per faction (avoids null pollution at t=0 when
    // formations have not yet had officer_quality initialized by the engine).
    const firstByFaction = {};
    for (const r of trajectory) {
        for (const fac of FACTIONS) {
            if (firstByFaction[fac] !== undefined) continue;
            const v = r[fac] && typeof r[fac].officer_quality === 'number' ? r[fac].officer_quality : null;
            if (v !== null) firstByFaction[fac] = { turn: r.turn, value: v };
        }
    }
    const byTurn = new Map();
    for (const r of trajectory) byTurn.set(r.turn, r);
    const snapshots = [];
    for (const t of checkpointTurns) {
        // Find the closest turn at-or-before t (run may not contain exact turn).
        let row = null;
        let chosenTurn = null;
        for (const r of trajectory) {
            if (r.turn <= t) {
                if (chosenTurn === null || r.turn > chosenTurn) {
                    chosenTurn = r.turn;
                    row = r;
                }
            }
        }
        if (!row) continue;
        const cell = { checkpoint_turn: t, observed_turn: chosenTurn, by_faction: {} };
        for (const fac of FACTIONS) {
            const v = row[fac] && typeof row[fac].officer_quality === 'number' ? row[fac].officer_quality : null;
            const ref = firstByFaction[fac];
            const canonicalSign = (DOCTRINAL_ARC[fac] && DOCTRINAL_ARC[fac].officer_quality) || 0;
            let divergence_class = null;
            let delta_vs_first = null;
            if (v !== null && ref) {
                delta_vs_first = v - ref.value;
                divergence_class = classifyDirection(delta_vs_first, canonicalSign, 'officer_quality');
            }
            cell.by_faction[fac] = {
                officer_quality: v,
                first_observed: ref ? ref.value : null,
                first_observed_turn: ref ? ref.turn : null,
                delta_vs_first,
                canonical_sign: canonicalSign,
                divergence_class,
            };
        }
        snapshots.push(cell);
    }
    return snapshots;
}

/**
 * LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — per-faction
 * officer_quality rate of change (delta per turn) over the whole run.
 * Compares the casualty-driven path's net effect against the expected
 * direction. Returns mean per-turn delta and the cumulative end-vs-start.
 */
function officerQualityRateOfChange(trajectory) {
    const out = {};
    for (const fac of FACTIONS) {
        const points = [];
        for (const r of trajectory) {
            const v = r[fac] && typeof r[fac].officer_quality === 'number' ? r[fac].officer_quality : null;
            if (v !== null) points.push({ turn: r.turn, value: v });
        }
        if (points.length < 2) {
            out[fac] = {
                turns_observed: points.length,
                first_value: points.length === 1 ? points[0].value : null,
                last_value: points.length === 1 ? points[0].value : null,
                mean_delta_per_turn: null,
                total_delta: null,
                canonical_sign: (DOCTRINAL_ARC[fac] && DOCTRINAL_ARC[fac].officer_quality) || 0,
                divergence_class: null,
            };
            continue;
        }
        const first = points[0];
        const last = points[points.length - 1];
        const total_delta = last.value - first.value;
        const span_turns = last.turn - first.turn;
        const mean_delta_per_turn = span_turns > 0 ? total_delta / span_turns : 0;
        const canonical_sign = (DOCTRINAL_ARC[fac] && DOCTRINAL_ARC[fac].officer_quality) || 0;
        out[fac] = {
            turns_observed: points.length,
            first_value: first.value,
            first_turn: first.turn,
            last_value: last.value,
            last_turn: last.turn,
            mean_delta_per_turn,
            total_delta,
            canonical_sign,
            divergence_class: classifyDirection(total_delta, canonical_sign, 'officer_quality'),
        };
    }
    return out;
}

function buildReport(runDir) {
    const tempLogPath = path.join(runDir, 'brigade_temporal_log.jsonl');
    const summaryPath = path.join(runDir, 'run_summary.json');
    if (!fs.existsSync(tempLogPath)) {
        return { error: `MISSING_BRIGADE_TEMPORAL_LOG`, path: tempLogPath };
    }
    let summary = null;
    if (fs.existsSync(summaryPath)) {
        try {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        } catch {
            summary = null;
        }
    }
    const baselinePath = path.join(__dirname, '..', '..', 'data', 'reference', 'historical_baseline.json');
    let baselineStatus = 'BASELINE_MISSING';
    if (fs.existsSync(baselinePath)) {
        baselineStatus = 'BASELINE_PRESENT_DOCTRINAL_ONLY';
    }
    const rows = readJsonlLines(tempLogPath);
    const trajectory = aggregateByTurn(rows);
    const verdicts = classifyTrajectory(trajectory);
    const top10 = topDivergences(verdicts, 10);
    // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — officer_quality
    // is only emitted after the Gap 1 commit (0bd5a938). Older runs simply
    // lack the field and snapshots/rate will surface that as null cells.
    const officerSnapshots = snapshotOfficerQuality(trajectory, [40, 100, 180]);
    const officerRate = officerQualityRateOfChange(trajectory);
    return {
        run_dir: path.basename(runDir),
        run_hash: summary && summary.final_state_hash ? summary.final_state_hash : null,
        weeks: summary && summary.weeks ? summary.weeks : null,
        baseline_status: baselineStatus,
        trajectory_turns: trajectory.length,
        verdicts,
        top_10_divergences: top10,
        officer_quality_snapshots: officerSnapshots,
        officer_quality_rate_of_change: officerRate,
    };
}

function buildMarkdown(report) {
    const lines = [];
    lines.push(`# Force Quality Trajectory Audit — ${report.run_dir}`);
    lines.push('');
    lines.push(`Run hash: \`${report.run_hash || 'n/a'}\` — weeks: ${report.weeks || 'n/a'} — baseline: ${report.baseline_status}`);
    lines.push('');
    lines.push('## Top 10 Divergences');
    lines.push('');
    lines.push('| Rank | Faction | Metric | Early mean | Late mean | Delta | Canonical sign | Verdict |');
    lines.push('|---|---|---|---|---|---|---|---|');
    let rank = 1;
    for (const v of report.top_10_divergences) {
        lines.push(`| ${rank} | ${v.faction} | ${v.metric} | ${v.early_mean.toFixed(2)} | ${v.late_mean.toFixed(2)} | ${v.delta.toFixed(2)} | ${v.canonical_sign} | ${v.divergence_class} |`);
        rank += 1;
    }
    lines.push('');
    lines.push('## Full Verdict Set');
    lines.push('');
    lines.push('| Faction | Metric | Early mean | Late mean | Delta | Canonical sign | Verdict |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const v of report.verdicts) {
        lines.push(`| ${v.faction} | ${v.metric} | ${v.early_mean.toFixed(2)} | ${v.late_mean.toFixed(2)} | ${v.delta.toFixed(2)} | ${v.canonical_sign} | ${v.divergence_class} |`);
    }
    lines.push('');
    lines.push('Verdict legend: `matches` = direction agrees and magnitude is meaningful; `trending_correctly` = direction agrees but magnitude is weak; `drifting_away` = canonical sign is non-zero but observed delta is flat; `inverse` = observed delta is opposite the doctrinal arc. Read-only audit; no fix proposals.');
    // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — officer_quality sections
    if (Array.isArray(report.officer_quality_snapshots) && report.officer_quality_snapshots.length > 0) {
        lines.push('');
        lines.push('## Officer Quality Snapshots (t40 / t100 / t180)');
        lines.push('');
        lines.push('| Checkpoint | Observed turn | Faction | officer_quality | First observed | Δ vs first | Canon sign | Verdict |');
        lines.push('|---|---|---|---|---|---|---|---|');
        for (const s of report.officer_quality_snapshots) {
            for (const fac of FACTIONS) {
                const cell = s.by_faction[fac];
                const oq = cell.officer_quality;
                const fv = cell.first_observed;
                const dv = cell.delta_vs_first;
                lines.push(
                    `| t${s.checkpoint_turn} | t${s.observed_turn} | ${fac} | ` +
                    `${oq === null ? 'n/a' : oq.toFixed(4)} | ` +
                    `${fv === null ? 'n/a' : fv.toFixed(4)} | ` +
                    `${dv === null ? 'n/a' : dv.toFixed(4)} | ` +
                    `${cell.canonical_sign} | ${cell.divergence_class || 'n/a'} |`
                );
            }
        }
    }
    if (report.officer_quality_rate_of_change) {
        lines.push('');
        lines.push('## Officer Quality Rate of Change (whole-run)');
        lines.push('');
        lines.push('| Faction | First (turn) | Last (turn) | Total Δ | Mean Δ/turn | Canon sign | Verdict |');
        lines.push('|---|---|---|---|---|---|---|');
        for (const fac of FACTIONS) {
            const r = report.officer_quality_rate_of_change[fac];
            if (!r) continue;
            const fv = r.first_value === null ? 'n/a' : `${r.first_value.toFixed(4)} (t${r.first_turn})`;
            const lv = r.last_value === null ? 'n/a' : `${r.last_value.toFixed(4)} (t${r.last_turn})`;
            const td = r.total_delta === null ? 'n/a' : r.total_delta.toFixed(4);
            const md = r.mean_delta_per_turn === null ? 'n/a' : r.mean_delta_per_turn.toFixed(6);
            lines.push(`| ${fac} | ${fv} | ${lv} | ${td} | ${md} | ${r.canonical_sign} | ${r.divergence_class || 'n/a'} |`);
        }
    }
    return lines.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        process.stderr.write('Usage: force_quality_trajectory.cjs <run_dir> [--json]\n');
        process.exit(1);
    }
    const wantJson = args.includes('--json');
    const runDir = args.filter((a) => !a.startsWith('--'))[0];
    if (!runDir) {
        process.stderr.write('Missing <run_dir> argument.\n');
        process.exit(1);
    }
    const report = buildReport(runDir);
    if (report.error) {
        process.stderr.write(`ERROR: ${report.error} (${report.path})\n`);
        process.exit(1);
    }
    if (wantJson) {
        process.stdout.write(JSON.stringify(report, null, 2));
        process.stdout.write('\n');
    } else {
        process.stdout.write(buildMarkdown(report));
        process.stdout.write('\n');
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    aggregateByTurn,
    classifyDirection,
    classifyTrajectory,
    topDivergences,
    buildReport,
    buildMarkdown,
    snapshotOfficerQuality,
    officerQualityRateOfChange,
    DOCTRINAL_ARC,
    FACTIONS,
    METRICS,
    METRIC_NOISE_FLOOR,
};
