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
const METRICS = ['cohesion', 'fatigue', 'morale', 'personnel']; // sorted

// Doctrinal arc per CALIBRATION_MASTER.md. `direction` describes the canonical sign of
// (late_window - early_window): negative = degrade, positive = improve.
const DOCTRINAL_ARC = {
    HRHB: { cohesion: -1, morale: -1, fatigue: 1, personnel: -1 },
    RBiH: { cohesion: 1, morale: 1, fatigue: 1, personnel: 1 },
    RS: { cohesion: -1, morale: -1, fatigue: 1, personnel: -1 },
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
            bucket = { turn, faction: fac, count: 0, sums: { cohesion: 0, fatigue: 0, morale: 0, personnel: 0 } };
            byTurnFaction.set(key, bucket);
        }
        bucket.count += 1;
        for (const m of METRICS) {
            const v = Number(r[m]);
            if (Number.isFinite(v)) bucket.sums[m] += v;
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
                avgs[m] = bucket.sums[m] / bucket.count;
            }
            turnRow[fac] = avgs;
        }
        trajectory.push(turnRow);
    }
    return trajectory;
}

function classifyDirection(observedDelta, canonicalSign) {
    // Threshold for noise floor. Differences within +/- 0.5 (raw units) treated as flat.
    const noise = 0.5;
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
            const divergence_class = classifyDirection(delta, canonicalSign);
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
    return {
        run_dir: path.basename(runDir),
        run_hash: summary && summary.final_state_hash ? summary.final_state_hash : null,
        weeks: summary && summary.weeks ? summary.weeks : null,
        baseline_status: baselineStatus,
        trajectory_turns: trajectory.length,
        verdicts,
        top_10_divergences: top10,
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
    DOCTRINAL_ARC,
    FACTIONS,
    METRICS,
};
