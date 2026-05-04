#!/usr/bin/env node
/**
 * Reconstitution 188w Verification Checkpoints — Audit-only post-processor.
 *
 * Reads `<run_dir>/brigade_temporal_log.jsonl` and emits per-faction averages of
 * officer_quality + personnel + their per-turn rate-of-change at exactly the
 * checkpoint turns the LANE-NIGHTSHIFT-RECONSTITUTION-188W-VERIFICATION lane
 * requires:
 *
 *   t0   (baseline)
 *   t52  (pre-bend — VRS / HRHB still in unchanged 1.0× / 0.75× bands)
 *   t78  (mid-bend — VRS in 0.85× band; HRHB in 0.65× band)
 *   t104 (post-bend onset — VRS in 0.65× band; HRHB in 0.50× band)
 *   t188 (final — VRS in 0.45× band; HRHB in 0.50× band)
 *
 * Also emits the per-turn rate-of-change *between* each adjacent pair of
 * checkpoints, to make it easy to read whether the late-war arc actually bends.
 *
 * Determinism contract: faction iteration via canonical sorted order, turn
 * iteration via numeric ascending, no Math.random / Date.now / locale-sort.
 *
 * Usage:
 *   node tools/diagnostics/reconstitution_188w_checkpoints.cjs <run_dir> [--json]
 *
 * Exit codes:
 *   0 — emitted checkpoint table
 *   1 — missing run_dir or required artifacts
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['HRHB', 'RBiH', 'RS']; // canonical sorted iteration order
const CHECKPOINT_TURNS = [0, 52, 78, 104, 188];
const METRICS = ['officer_quality', 'personnel'];

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
            bucket = {
                turn,
                faction: fac,
                count: 0,
                sums: { officer_quality: 0, personnel: 0 },
                counts: { officer_quality: 0, personnel: 0 },
            };
            byTurnFaction.set(key, bucket);
        }
        bucket.count += 1;
        for (const m of METRICS) {
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
                turnRow[fac] = { count: 0, officer_quality: null, personnel: null };
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

/**
 * Find the closest trajectory row at-or-before a given checkpoint turn.
 * Mirrors the snapshotOfficerQuality semantics in force_quality_trajectory.cjs.
 */
function rowAtOrBefore(trajectory, target) {
    let chosen = null;
    for (const r of trajectory) {
        if (r.turn <= target) {
            if (chosen === null || r.turn > chosen.turn) chosen = r;
        }
    }
    return chosen;
}

function buildCheckpointTable(trajectory) {
    const cells = [];
    for (const t of CHECKPOINT_TURNS) {
        const row = rowAtOrBefore(trajectory, t);
        const cell = {
            checkpoint_turn: t,
            observed_turn: row ? row.turn : null,
            by_faction: {},
        };
        for (const fac of FACTIONS) {
            const f = row && row[fac] ? row[fac] : null;
            cell.by_faction[fac] = {
                count: f ? f.count : 0,
                officer_quality: f && typeof f.officer_quality === 'number' ? f.officer_quality : null,
                personnel: f && typeof f.personnel === 'number' ? f.personnel : null,
            };
        }
        cells.push(cell);
    }
    // Per-faction rate of change between adjacent checkpoints.
    const rates = [];
    for (let i = 1; i < cells.length; i += 1) {
        const prev = cells[i - 1];
        const cur = cells[i];
        const span = (cur.observed_turn ?? cur.checkpoint_turn) - (prev.observed_turn ?? prev.checkpoint_turn);
        const rate = {
            from_turn: prev.observed_turn,
            to_turn: cur.observed_turn,
            span_turns: span,
            by_faction: {},
        };
        for (const fac of FACTIONS) {
            const a = prev.by_faction[fac];
            const b = cur.by_faction[fac];
            const dq = a.officer_quality !== null && b.officer_quality !== null
                ? b.officer_quality - a.officer_quality : null;
            const dp = a.personnel !== null && b.personnel !== null
                ? b.personnel - a.personnel : null;
            rate.by_faction[fac] = {
                d_officer_quality: dq,
                d_officer_quality_per_turn: dq !== null && span > 0 ? dq / span : null,
                d_personnel: dp,
                d_personnel_per_turn: dp !== null && span > 0 ? dp / span : null,
            };
        }
        rates.push(rate);
    }
    return { cells, rates };
}

function buildReport(runDir) {
    const tempLogPath = path.join(runDir, 'brigade_temporal_log.jsonl');
    const summaryPath = path.join(runDir, 'run_summary.json');
    if (!fs.existsSync(tempLogPath)) {
        return { error: 'MISSING_BRIGADE_TEMPORAL_LOG', path: tempLogPath };
    }
    let summary = null;
    if (fs.existsSync(summaryPath)) {
        try {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        } catch {
            summary = null;
        }
    }
    const rows = readJsonlLines(tempLogPath);
    const trajectory = aggregateByTurn(rows);
    const { cells, rates } = buildCheckpointTable(trajectory);
    return {
        run_dir: path.basename(runDir),
        run_hash: summary && summary.final_state_hash ? summary.final_state_hash : null,
        weeks: summary && summary.weeks ? summary.weeks : null,
        trajectory_turns: trajectory.length,
        first_turn: trajectory.length > 0 ? trajectory[0].turn : null,
        last_turn: trajectory.length > 0 ? trajectory[trajectory.length - 1].turn : null,
        checkpoints: cells,
        rates_between_checkpoints: rates,
    };
}

function fmt(n, digits) {
    if (n === null || n === undefined) return 'n/a';
    return n.toFixed(digits);
}

function buildMarkdown(report) {
    const lines = [];
    lines.push(`# Reconstitution 188w Checkpoint Audit — ${report.run_dir}`);
    lines.push('');
    lines.push(`Run hash: \`${report.run_hash || 'n/a'}\` — weeks: ${report.weeks ?? 'n/a'} — trajectory turns: ${report.trajectory_turns} (first=${report.first_turn}, last=${report.last_turn})`);
    lines.push('');
    lines.push('## Per-Faction Snapshots at Checkpoints');
    lines.push('');
    lines.push('| Checkpoint | Observed turn | Faction | active brigades | officer_quality | personnel (avg/brigade) |');
    lines.push('|---|---|---|---|---|---|');
    for (const c of report.checkpoints) {
        for (const fac of FACTIONS) {
            const cell = c.by_faction[fac];
            lines.push(
                `| t${c.checkpoint_turn} | ${c.observed_turn === null ? 'n/a' : 't' + c.observed_turn} | ${fac} | ${cell.count} | ${fmt(cell.officer_quality, 4)} | ${fmt(cell.personnel, 1)} |`
            );
        }
    }
    lines.push('');
    lines.push('## Rate of Change Between Adjacent Checkpoints');
    lines.push('');
    lines.push('| From | To | Span | Faction | Δ officer_quality | Δ oq/turn | Δ personnel | Δ pers/turn |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const r of report.rates_between_checkpoints) {
        for (const fac of FACTIONS) {
            const c = r.by_faction[fac];
            lines.push(
                `| t${r.from_turn} | t${r.to_turn} | ${r.span_turns} | ${fac} | ${fmt(c.d_officer_quality, 4)} | ${fmt(c.d_officer_quality_per_turn, 6)} | ${fmt(c.d_personnel, 1)} | ${fmt(c.d_personnel_per_turn, 3)} |`
            );
        }
    }
    return lines.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        process.stderr.write('Usage: reconstitution_188w_checkpoints.cjs <run_dir> [--json]\n');
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
    buildCheckpointTable,
    buildReport,
    buildMarkdown,
    rowAtOrBefore,
    FACTIONS,
    METRICS,
    CHECKPOINT_TURNS,
};
