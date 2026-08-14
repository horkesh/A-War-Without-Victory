/**
 * `npm run test:baselines` must report EVERY failure, not abort on the first.
 *
 * THE DEFECT (2026-08-14): compareAgainstBaselines threw on the first mismatch. The manifest holds
 * four scenarios in file order — apr1992_188w, apr1992_52w, baseline_ops_4w, noop_4w — and 52w has
 * been red since 2026-08-12 (bisected to b9da847f1, the veto fix). Because 52w sits second, the
 * last two were never reached: measured, their `_baseline_tmp` artifacts were last written
 * 2026-08-11 while 188w and 52w were re-run 2026-08-14. Four scenarios in the manifest, one live
 * gate in practice. The same masking applied per artifact — 52w drifts on 7 of 8, but only
 * `activity_summary.json` was ever named because it sorts first, which is how a broad behavioural
 * drift got mistaken for a single-file problem.
 *
 * These tests drive the REAL aggregation path via an injected hasher, so they cost nothing (a real
 * 188w run is ~6 minutes). The injected seam is the point: it is the difference between testing
 * that the pure differ works and testing that the CALLER collects instead of failing fast.
 *
 * Determinism: pure functions over fixed hash maps; no scenario runs, no clock, no RNG.
 */
import { describe, expect, it } from 'vitest';
import {
    BaselineRegressionError,
    compareAgainstBaselines,
    diffScenarioHashes,
    formatFailureSummary,
    type BaselineManifest,
    type ScenarioBaselineEntry,
    type ScenarioHasher,
} from '../tools/scenario_runner/run_baseline_regression.js';

/** Run the comparison expecting failure, and hand back the STRUCTURED list (not the prose). */
async function collectFailures(
    manifest: BaselineManifest,
    hasher: ScenarioHasher
): Promise<BaselineRegressionError> {
    try {
        await compareAgainstBaselines(manifest, hasher);
    } catch (err) {
        if (err instanceof BaselineRegressionError) return err;
        throw err;
    }
    throw new Error('expected compareAgainstBaselines to throw, but it resolved');
}

/** `${scenario}/${artifact}` pairs — the identity a last-only collector cannot reproduce. */
function pairs(err: BaselineRegressionError): string[] {
    return err.failures.map(f => `${f.scenario_id}/${f.artifact ?? '(run)'}`);
}

const ARTIFACTS = ['a.json', 'b.json', 'c.json', 'd.json'];

function entry(id: string, hashes: Record<string, string>): ScenarioBaselineEntry {
    return { id, scenario_path: `data/scenarios/${id}.json`, weeks: 4, expected_files: [], hashes };
}

/** Expected hashes: every artifact pinned to `good`. */
function allGood(id: string): ScenarioBaselineEntry {
    return entry(id, Object.fromEntries(ARTIFACTS.map(a => [a, `good-${a}`])));
}

function hashes(over: Record<string, string> = {}): Record<string, string> {
    return { ...Object.fromEntries(ARTIFACTS.map(a => [a, `good-${a}`])), ...over };
}

function manifestOf(...scenarios: ScenarioBaselineEntry[]): BaselineManifest {
    return { schema_version: 1, artifacts: ARTIFACTS.slice(), scenarios };
}

/** Hasher that never runs a scenario; returns whatever the table says for each scenario id. */
function fakeHasher(
    table: Record<string, Record<string, string> | Error>,
    calls: string[] = []
): ScenarioHasher {
    return async (scenarioPath) => {
        const id = scenarioPath.replace('data/scenarios/', '').replace('.json', '');
        calls.push(id);
        const v = table[id];
        if (v instanceof Error) throw v;
        return { hashes: v ?? {}, runDir: `/tmp/${id}` };
    };
}

describe('diffScenarioHashes — every mismatching artifact, not just the first', () => {
    it('reports ALL mismatches in one scenario', () => {
        const failures = diffScenarioHashes(
            allGood('s1'),
            ARTIFACTS,
            hashes({ 'a.json': 'drift-a', 'c.json': 'drift-c', 'd.json': 'drift-d' }),
            '/tmp/s1'
        );
        // A collector that keeps only the first OR only the last yields 1 and fails here.
        expect(failures).toHaveLength(3);
        expect(failures.map(f => f.artifact)).toEqual(['a.json', 'c.json', 'd.json']);
        expect(failures.every(f => f.kind === 'mismatch')).toBe(true);
    });

    it('distinguishes a missing artifact from a drifted one', () => {
        const actual = hashes({ 'b.json': 'drift-b' });
        delete actual['a.json'];
        const failures = diffScenarioHashes(allGood('s1'), ARTIFACTS, actual, '/tmp/s1');
        expect(failures.map(f => [f.artifact, f.kind])).toEqual([
            ['a.json', 'missing_artifact'],
            ['b.json', 'mismatch'],
        ]);
    });

    it('returns nothing when everything matches, and ignores unpinned artifacts', () => {
        expect(diffScenarioHashes(allGood('s1'), ARTIFACTS, hashes(), '/tmp/s1')).toEqual([]);
        // An artifact absent from the manifest's hashes is not pinned and must not be reported.
        const partial = entry('s1', { 'a.json': 'good-a.json' });
        expect(diffScenarioHashes(partial, ARTIFACTS, { 'a.json': 'good-a.json' }, '/tmp/s1')).toEqual([]);
    });
});

describe('compareAgainstBaselines — one failing scenario must not mask the others', () => {
    it('CHECKS EVERY SCENARIO even when an early one fails', async () => {
        const calls: string[] = [];
        const hasher = fakeHasher({
            s1: hashes(),
            s2: hashes({ 'a.json': 'drift' }), // fails, and used to abort the whole run
            s3: hashes(),
            s4: hashes({ 'b.json': 'drift' }), // never reached under fail-fast
        }, calls);

        const err = await collectFailures(
            manifestOf(allGood('s1'), allGood('s2'), allGood('s3'), allGood('s4')),
            hasher
        );

        // THE ANTI-MASKING ASSERTIONS: every scenario ran, and the late failure is reported.
        expect(calls).toEqual(['s1', 's2', 's3', 's4']);
        expect(pairs(err)).toEqual(['s2/a.json', 's4/b.json']);
    });

    it('names EVERY failing scenario and EVERY failing artifact in one message', async () => {
        const hasher = fakeHasher({
            s1: hashes(),
            s2: hashes({ 'a.json': 'drift-a', 'c.json': 'drift-c' }),
            s3: hashes(),
            s4: hashes({ 'b.json': 'drift-b' }),
        });

        const err = await collectFailures(
            manifestOf(allGood('s1'), allGood('s2'), allGood('s3'), allGood('s4')),
            hasher
        );

        // STRUCTURAL, not prose: three failures across two scenarios, with s2 contributing TWO.
        // A collector that keeps only the first or only the last per scenario yields 2, not 3.
        expect(pairs(err)).toEqual(['s2/a.json', 's2/c.json', 's4/b.json']);
        expect(err.failures).toHaveLength(3);

        const message = err.message;
        expect(message).toContain('3 failures across 2 scenarios');
        expect(message).toContain('s2: 2 failures');
        expect(message).toContain('s4: 1 failure');
        for (const needle of ['drift-a', 'drift-c', 'drift-b']) {
            expect(message, `summary must name ${needle}`).toContain(needle);
        }
        // The passing scenarios must not appear in the tally.
        expect(message).not.toContain('s1: ');
        expect(message).not.toContain('s3: ');
    });

    it('a scenario whose RUN throws is recorded, and later scenarios are still checked', async () => {
        const calls: string[] = [];
        const hasher = fakeHasher({
            s1: new Error('scenario file is broken'),
            s2: hashes({ 'a.json': 'drift' }),
        }, calls);

        const err = await collectFailures(manifestOf(allGood('s1'), allGood('s2')), hasher);

        expect(calls).toEqual(['s1', 's2']);
        expect(pairs(err)).toEqual(['s1/(run)', 's2/a.json']);
        expect(err.failures[0].kind).toBe('run_error');
        expect(err.failures[1].kind).toBe('mismatch');

        const message = err.message;
        expect(message).toContain('Baseline run FAILED: scenario=s1');
        expect(message).toContain('scenario file is broken');
        expect(message).toContain('Baseline mismatch: scenario=s2');
        expect(message).toContain('2 failures across 2 scenarios');
    });

    it('still RESOLVES when everything matches (the gate must not fail open or closed wrongly)', async () => {
        const hasher = fakeHasher({ s1: hashes(), s2: hashes() });
        await expect(
            compareAgainstBaselines(manifestOf(allGood('s1'), allGood('s2')), hasher)
        ).resolves.toBeUndefined();
    });
});

describe('formatFailureSummary', () => {
    it('counts per scenario and lists every failure line', () => {
        const msg = formatFailureSummary([
            { kind: 'mismatch', scenario_id: 'z', artifact: 'a.json', expected: 'e1', actual: 'a1', run_dir: '/z' },
            { kind: 'mismatch', scenario_id: 'a', artifact: 'b.json', expected: 'e2', actual: 'a2', run_dir: '/a' },
            { kind: 'mismatch', scenario_id: 'a', artifact: 'c.json', expected: 'e3', actual: 'a3', run_dir: '/a' },
        ]);
        expect(msg).toContain('3 failures across 2 scenarios');
        // Tally is sorted by scenario id so the report is stable regardless of manifest order.
        expect(msg.indexOf('a: 2 failures')).toBeLessThan(msg.indexOf('z: 1 failure'));
        for (const needle of ['a.json', 'b.json', 'c.json', 'a1', 'a2', 'a3']) {
            expect(msg).toContain(needle);
        }
    });

    it('singularises a lone failure', () => {
        const msg = formatFailureSummary([
            { kind: 'mismatch', scenario_id: 's', artifact: 'a.json', expected: 'e', actual: 'a', run_dir: '/s' },
        ]);
        expect(msg).toContain('1 failure across 1 scenario.');
    });
});
