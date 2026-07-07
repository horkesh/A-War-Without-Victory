#!/usr/bin/env node
/**
 * build_historical_shadow.cjs — Ghost War extractor (seed of the Ghost War capability).
 *
 * Compresses a scenario run directory into a compact "historical shadow" artifact:
 * the weekly per-OSID control trajectory + weekly cost aggregates of that run.
 * Generated from the DEFINITIVE HISTORICAL run, this artifact is the ghost the
 * player's emergent war is compared against (docs/plans/2026-07-06-ghost-war-design.md).
 *
 * Inputs (run dir):
 *   initial_save.json            required — week-0 political_controllers (OSID-keyed)
 *   save_w<N>.json               optional — weekly full-state frames (--video runs emit every week)
 *   final_save.json              required — closing state (post-reconciliation truth)
 *   run_summary.json             required — scenario_id / weeks / final_state_hash provenance
 *   weekly_report.jsonl          optional — weekly control_counts / displacement / battles
 *
 * Output: <runDir>/historical_shadow.json (or --out <path>).
 *   Deliberately a RUN-DIR diagnostics artifact, NOT data/derived/ — promotion to the
 *   data pipeline is gated on the data-pipeline-engineer consultation (design doc §5).
 *
 * Determinism: pure function of the run dir. No timestamps, no randomness; all
 * iteration and serialization key-order is sorted (stableStringify). Re-running on
 * the same run dir is byte-identical.
 *
 * Granularity honesty:
 *   weekly   — frames cover every week 1..weeks (a --video run)
 *   sparse   — some frames; flips attributed to the first frame week that observed them
 *   endpoint — no frames; single initial-vs-final diff attributed to the final week
 *
 * Canonical owner: this file. CLI: node tools/build_historical_shadow.cjs <runDir> [--out <path>]
 */
'use strict';

const { readFileSync, readdirSync, writeFileSync, existsSync } = require('node:fs');
const { join, basename } = require('node:path');

const SCHEMA_VERSION = 1;

/** JSON.stringify with recursively sorted object keys — deterministic serialization. */
function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/** Extract the canonical OSID->controller map from a serialized save. */
function controllersOf(save, label) {
    const controllers = save && save.political && save.political.political_controllers;
    if (!controllers || typeof controllers !== 'object') {
        throw new Error(`${label}: missing political.political_controllers (not a serialized GameState save?)`);
    }
    return controllers;
}

/** Diff two controller maps; returns flip rows sorted by osid. Union of keys, sorted. */
function diffControllers(prev, next, week) {
    const flips = [];
    const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)])).sort();
    for (const osid of keys) {
        const from = prev[osid] !== undefined ? prev[osid] : null;
        const to = next[osid] !== undefined ? next[osid] : null;
        if (from !== to) flips.push({ week, osid, from, to });
    }
    return flips;
}

/** List frame files as [{week, path}] sorted by week ascending. save_w<N>.json = state after week N. */
function listFrames(runDir) {
    const frames = [];
    for (const name of readdirSync(runDir)) {
        const m = /^save_w(\d+)\.json$/.exec(name);
        if (m) frames.push({ week: parseInt(m[1], 10), path: join(runDir, name) });
    }
    frames.sort((a, b) => a.week - b.week);
    return frames;
}

/** Weekly aggregates from weekly_report.jsonl (defensive: absent file/fields stay null, never 0). */
function readWeeklyAggregates(runDir) {
    const path = join(runDir, 'weekly_report.jsonl');
    if (!existsSync(path)) return [];
    const rows = [];
    for (const line of readFileSync(path, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let row;
        try {
            row = JSON.parse(trimmed);
        } catch {
            continue; // a torn line is a source gap, not a crash
        }
        // weekly_report.jsonl week_index is 1-BASED (verified live 2026-07-06: a 2-week
        // run emits week_index 1 and 2), already aligned with save_w<N> frame naming.
        const week = typeof row.week_index === 'number' ? row.week_index : null;
        if (week === null) continue;
        rows.push({
            week,
            control_counts:
                row.control_counts && typeof row.control_counts === 'object' ? row.control_counts : null,
            displaced_total:
                typeof row.settlement_displacement_total === 'number' ? row.settlement_displacement_total : null,
            battle_count: Array.isArray(row.battles) ? row.battles.length : null,
        });
    }
    rows.sort((a, b) => a.week - b.week);
    return rows;
}

/**
 * Build the historical-shadow artifact object from a run directory.
 * Pure read; does not write anything.
 */
function buildHistoricalShadow(runDir) {
    const initialSave = readJson(join(runDir, 'initial_save.json'));
    const finalSave = readJson(join(runDir, 'final_save.json'));
    const runSummaryPath = join(runDir, 'run_summary.json');
    const runSummary = existsSync(runSummaryPath) ? readJson(runSummaryPath) : {};

    const startControllers = controllersOf(initialSave, 'initial_save.json');
    const frames = listFrames(runDir);
    const weeks =
        typeof runSummary.weeks === 'number'
            ? runSummary.weeks
            : frames.length > 0
              ? frames[frames.length - 1].week
              : null;

    const flips = [];
    let prev = startControllers;
    for (const frame of frames) {
        const next = controllersOf(readJson(frame.path), basename(frame.path));
        flips.push(...diffControllers(prev, next, frame.week));
        prev = next;
    }
    // Closing diff against final_save (post-reconciliation truth). Attributed to the
    // final week; empty when the last frame already equals final state.
    const finalControllers = controllersOf(finalSave, 'final_save.json');
    const closingWeek = weeks !== null ? weeks : frames.length > 0 ? frames[frames.length - 1].week : 0;
    flips.push(...diffControllers(prev, finalControllers, closingWeek));

    let granularity = 'endpoint';
    if (frames.length > 0 && weeks !== null) {
        const frameWeeks = new Set(frames.map((f) => f.week));
        let complete = true;
        for (let w = 1; w <= weeks; w++) {
            if (!frameWeeks.has(w)) {
                complete = false;
                break;
            }
        }
        granularity = complete ? 'weekly' : 'sparse';
    }

    return {
        schema_version: SCHEMA_VERSION,
        kind: 'historical_shadow',
        source: {
            scenario_id: runSummary.scenario_id !== undefined ? runSummary.scenario_id : null,
            weeks,
            final_state_hash: runSummary.final_state_hash !== undefined ? runSummary.final_state_hash : null,
            run_dir: basename(runDir),
        },
        granularity,
        start: { controllers: startControllers },
        flips,
        weekly: readWeeklyAggregates(runDir),
    };
}

/** Build and write <runDir>/historical_shadow.json (or outPath). Returns the output path. */
function writeHistoricalShadow(runDir, outPath) {
    const artifact = buildHistoricalShadow(runDir);
    const target = outPath || join(runDir, 'historical_shadow.json');
    writeFileSync(target, stableStringify(artifact) + '\n', 'utf8');
    return { outPath: target, artifact };
}

function main() {
    const args = process.argv.slice(2);
    let runDir = null;
    let out = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--out' && args[i + 1]) out = args[++i];
        else if (!runDir) runDir = args[i];
    }
    if (!runDir) {
        process.stderr.write('Usage: node tools/build_historical_shadow.cjs <runDir> [--out <path>]\n');
        process.exitCode = 1;
        return;
    }
    const { outPath, artifact } = writeHistoricalShadow(runDir, out);
    process.stdout.write(
        `historical_shadow: ${outPath}\n` +
            `  scenario: ${artifact.source.scenario_id} weeks: ${artifact.source.weeks} granularity: ${artifact.granularity}\n` +
            `  osids: ${Object.keys(artifact.start.controllers).length} flips: ${artifact.flips.length} weekly_rows: ${artifact.weekly.length}\n`,
    );
}

module.exports = { buildHistoricalShadow, writeHistoricalShadow, stableStringify, diffControllers };

if (require.main === module) main();
