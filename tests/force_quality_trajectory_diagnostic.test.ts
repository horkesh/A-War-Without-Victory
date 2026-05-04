import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const TOOL = resolve(REPO_ROOT, 'tools/diagnostics/force_quality_trajectory.cjs');
const RUNS_DIR = resolve(REPO_ROOT, 'runs');

function findLatest188wRun(): string | null {
    if (!existsSync(RUNS_DIR)) return null;
    const candidates = readdirSync(RUNS_DIR).filter((d) => d.startsWith('apr1992_definitive_188w__'));
    if (candidates.length === 0) return null;
    let best: { path: string; mtime: number } | null = null;
    for (const c of candidates) {
        const full = join(RUNS_DIR, c);
        try {
            const stat = statSync(full);
            if (!stat.isDirectory()) continue;
            const tlog = join(full, 'brigade_temporal_log.jsonl');
            if (!existsSync(tlog)) continue;
            // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — only pick
            // completed runs (run_summary.json present). An in-flight 188w run
            // appends to brigade_temporal_log.jsonl across test invocations,
            // breaking the deterministic-output gate. Filtering by completion
            // makes the test robust to concurrent background smokes.
            const summary = join(full, 'run_summary.json');
            if (!existsSync(summary)) continue;
            if (!best || stat.mtimeMs > best.mtime) best = { path: full, mtime: stat.mtimeMs };
        } catch {
            continue;
        }
    }
    return best ? best.path : null;
}

const runDir = findLatest188wRun();
const HAS_RUN = runDir !== null;

describe('force_quality_trajectory diagnostic', () => {
    it.skipIf(!HAS_RUN)('emits valid output schema with required fields', () => {
        const out = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const report = JSON.parse(out);
        expect(report.run_dir).toBeTypeOf('string');
        expect(report.baseline_status).toMatch(/^BASELINE_/);
        expect(report.trajectory_turns).toBeGreaterThan(0);
        expect(Array.isArray(report.verdicts)).toBe(true);
        expect(Array.isArray(report.top_10_divergences)).toBe(true);
        for (const v of report.verdicts) {
            expect(['HRHB', 'RBiH', 'RS']).toContain(v.faction);
            // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — officer_quality
            // joins the canonical metric set after Gap 1's per-turn observability.
            expect(['cohesion', 'fatigue', 'morale', 'officer_quality', 'personnel']).toContain(v.metric);
            expect(['matches', 'trending_correctly', 'drifting_away', 'inverse']).toContain(v.divergence_class);
        }
    });

    it.skipIf(!HAS_RUN)('is deterministic — two invocations produce byte-identical output', () => {
        const a = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const b = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        expect(a).toEqual(b);
    });

    it.skipIf(!HAS_RUN)('is read-only — does not mutate the run directory', () => {
        const tlog = join(runDir!, 'brigade_temporal_log.jsonl');
        const before = statSync(tlog).mtimeMs;
        const beforeContent = readFileSync(tlog, 'utf8').slice(0, 1024);
        execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const after = statSync(tlog).mtimeMs;
        const afterContent = readFileSync(tlog, 'utf8').slice(0, 1024);
        expect(after).toEqual(before);
        expect(afterContent).toEqual(beforeContent);
    });

    // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE — officer_quality
    // consumption tests. Faction-agnostic: assert schema contracts, not arc
    // direction (the report consumer interprets sign vs canonical).
    it.skipIf(!HAS_RUN)('emits officer_quality snapshots and rate-of-change shape', () => {
        const out = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const report = JSON.parse(out);
        // Snapshots: array of three checkpoint cells (40, 100, 180), each with
        // by_faction map keyed by canonical faction ids.
        expect(Array.isArray(report.officer_quality_snapshots)).toBe(true);
        if (report.officer_quality_snapshots.length > 0) {
            for (const cell of report.officer_quality_snapshots) {
                expect(typeof cell.checkpoint_turn).toBe('number');
                expect(typeof cell.observed_turn).toBe('number');
                expect(typeof cell.by_faction).toBe('object');
                for (const fac of ['HRHB', 'RBiH', 'RS']) {
                    expect(cell.by_faction[fac]).toBeDefined();
                    const c = cell.by_faction[fac];
                    // officer_quality may be null pre-Gap-1 (legacy fixtures).
                    expect(c.officer_quality === null || typeof c.officer_quality === 'number').toBe(true);
                    expect(c.canonical_sign === 0 || c.canonical_sign === 1 || c.canonical_sign === -1).toBe(true);
                    if (c.divergence_class !== null) {
                        expect(['matches', 'trending_correctly', 'drifting_away', 'inverse']).toContain(c.divergence_class);
                    }
                }
            }
        }
        // Rate-of-change: object keyed by canonical faction ids. Per-faction
        // record carries either populated values or null cells.
        expect(typeof report.officer_quality_rate_of_change).toBe('object');
        for (const fac of ['HRHB', 'RBiH', 'RS']) {
            const r = report.officer_quality_rate_of_change[fac];
            expect(r).toBeDefined();
            expect(typeof r.turns_observed).toBe('number');
            expect(r.canonical_sign === 0 || r.canonical_sign === 1 || r.canonical_sign === -1).toBe(true);
            // mean_delta_per_turn either null (no data) or finite number.
            expect(r.mean_delta_per_turn === null || Number.isFinite(r.mean_delta_per_turn)).toBe(true);
        }
    });

    it.skipIf(!HAS_RUN)('officer_quality snapshots are deterministic across invocations', () => {
        const a = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const b = execFileSync('node', [TOOL, runDir!, '--json'], { encoding: 'utf8' });
        const ra = JSON.parse(a);
        const rb = JSON.parse(b);
        expect(JSON.stringify(ra.officer_quality_snapshots)).toEqual(
            JSON.stringify(rb.officer_quality_snapshots),
        );
        expect(JSON.stringify(ra.officer_quality_rate_of_change)).toEqual(
            JSON.stringify(rb.officer_quality_rate_of_change),
        );
    });
});
