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
            expect(['cohesion', 'fatigue', 'morale', 'personnel']).toContain(v.metric);
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
});
