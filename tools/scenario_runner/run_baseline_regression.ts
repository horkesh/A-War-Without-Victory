/**
 * Phase H2.3: Golden baseline regression for scenario harness.
 * Compares run artifacts (SHA256) to committed baselines. Default: fail on mismatch.
 * Baseline updates only when UPDATE_BASELINES=1.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { loadScenario } from '../../src/scenario/scenario_loader.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';
import { stableStringify } from '../../src/utils/stable_json.js';


/** Artifacts to baseline (sorted; hashes only; no paths in content). end_report.md is deterministic (no timestamps, stable ordering). */
const ARTIFACTS = [
    'activity_summary.json',
    'control_delta.json',
    'end_report.md',
    'formation_delta.json',
    'final_save.json',
    'run_summary.json',
    'watched_operations.json',
    'weekly_report.jsonl'
].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const BASELINES_DIR = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines');
const MANIFEST_PATH = join(BASELINES_DIR, 'manifest.json');
const BASE_TMP = join(process.cwd(), 'data', 'derived', 'scenario', '_baseline_tmp');

/**
 * Baseline scenarios: noop_4w (quick sanity), baseline_ops_4w (displacement activity).
 * No existing scenario sets war/declared so Phase I control flips do not occur; document gap. // legacy-phase-term-ok
 */
const DEFAULT_SCENARIOS: Array<{ id: string; scenario_path: string; weeks?: number }> = [
    { id: 'noop_4w', scenario_path: 'data/scenarios/noop_4w.json', weeks: 4 },
    { id: 'baseline_ops_4w', scenario_path: 'data/scenarios/baseline_ops_4w.json', weeks: 4 },
    { id: 'apr1992_52w', scenario_path: 'data/scenarios/apr1992_definitive_52w.json', weeks: 52 }
];

export interface ScenarioBaselineEntry {
    id: string;
    scenario_path: string;
    weeks: number;
    expected_files: string[];
    hashes: Record<string, string>;
}

export interface BaselineManifest {
    schema_version: number;
    artifacts: string[];
    scenarios: ScenarioBaselineEntry[];
}

function sha256Hex(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

async function hashFileIfPresent(dir: string, name: string): Promise<string | null> {
    const path = join(dir, name);
    if (!existsSync(path)) return null;
    const buf = await readFile(path);
    return sha256Hex(buf);
}

/**
 * Run one scenario into a temp dir and hash all baseline artifacts.
 */
export async function runScenarioAndHash(
    scenarioPath: string,
    outDir: string,
    artifactNames: string[]
): Promise<{ hashes: Record<string, string>; runDir: string }> {
    const result = await runScenario({
        scenarioPath: join(process.cwd(), scenarioPath),
        outDirBase: join(outDir, '_dummy'),
        outDirOverride: outDir
    });
    const hashes: Record<string, string> = {};
    for (const name of artifactNames.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        const h = await hashFileIfPresent(result.outDir, name);
        if (h != null) hashes[name] = h;
    }
    return { hashes, runDir: result.outDir };
}

/**
 * NOTE (2026-08-14) — `scenarios` keeps FILE ORDER; only `artifacts` and `expected_files` are
 * sorted. That was a live hazard while compareAgainstBaselines threw on the first mismatch: the
 * 188w entry is checked today only because it happens to sit first in the file, and a manual
 * manifest reorder or an id rename would have moved it behind the failing `apr1992_52w` entry and
 * made the 188w fingerprint INERT with no error to say so.
 *
 * Collecting all failures removes the hazard, so this is left as-is deliberately rather than
 * sorted — sorting `scenarios` here would change which entry runs first and is not needed once
 * every entry is always reached. Recorded so the ordering is understood as incidental, not relied
 * upon.
 */
export function loadManifestSync(content: string): BaselineManifest {
    const raw = JSON.parse(content) as unknown;
    if (typeof raw !== 'object' || raw === null) throw new Error('manifest.json: invalid root');
    const m = raw as Record<string, unknown>;
    if (!Array.isArray(m.artifacts)) throw new Error('manifest.json: missing or invalid artifacts');
    if (!Array.isArray(m.scenarios)) throw new Error('manifest.json: missing or invalid scenarios');
    return {
        schema_version: (m.schema_version as number) ?? 1,
        artifacts: (m.artifacts as string[]).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        scenarios: (m.scenarios as ScenarioBaselineEntry[]).map((s) => ({
            ...s,
            expected_files: (s.expected_files ?? []).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
            hashes: s.hashes && typeof s.hashes === 'object' ? { ...s.hashes } : {}
        }))
    };
}

/**
 * One reason a scenario failed its baseline check.
 *
 * `run_error` carries no hashes — the scenario never got far enough to produce any.
 */
export interface BaselineFailure {
    kind: 'mismatch' | 'missing_artifact' | 'run_error';
    scenario_id: string;
    /** Artifact name; null for a `run_error`, which is not attributable to one artifact. */
    artifact: string | null;
    expected: string | null;
    actual: string | null;
    run_dir: string | null;
}

function formatFailure(f: BaselineFailure): string {
    if (f.kind === 'run_error') {
        return [
            `Baseline run FAILED: scenario=${f.scenario_id}`,
            `  error: ${f.actual ?? '(unknown)'}`
        ].join('\n');
    }
    return [
        `Baseline mismatch: scenario=${f.scenario_id} artifact=${f.artifact}`,
        `  expected: ${f.expected}`,
        `  actual:   ${f.actual}`,
        `  run dir:  ${f.run_dir}`
    ].join('\n');
}

/**
 * Aggregate report. Leads with a per-scenario tally so a broad drift is not mistaken for a
 * single-file problem — the exact misreading that happened when `apr1992_52w` was reported as an
 * `activity_summary.json` issue while it was in fact drifting on 7 of its 8 artifacts, that file
 * being merely alphabetically first.
 */
export function formatFailureSummary(failures: readonly BaselineFailure[]): string {
    const byScenario = new Map<string, number>();
    for (const f of failures) {
        byScenario.set(f.scenario_id, (byScenario.get(f.scenario_id) ?? 0) + 1);
    }
    const tally = [...byScenario.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([id, n]) => `  ${id}: ${n} failure${n === 1 ? '' : 's'}`)
        .join('\n');
    return [
        `Baseline regression FAILED: ${failures.length} failure${failures.length === 1 ? '' : 's'} ` +
        `across ${byScenario.size} scenario${byScenario.size === 1 ? '' : 's'}.`,
        tally,
        '',
        ...failures.map(formatFailure)
    ].join('\n');
}

/**
 * Carries the STRUCTURED failure list alongside the formatted message.
 *
 * Without this, the only way to assert "all failures were collected" is to string-match the
 * prose, which is brittle and easy to satisfy accidentally. Callers and tests should read
 * `.failures`; the message stays human-facing.
 */
export class BaselineRegressionError extends Error {
    readonly failures: readonly BaselineFailure[];
    constructor(failures: readonly BaselineFailure[]) {
        super(formatFailureSummary(failures));
        this.name = 'BaselineRegressionError';
        this.failures = failures;
    }
}

/**
 * Pure per-scenario comparison — every mismatching artifact, not just the first.
 *
 * Exported so the aggregation can be tested without paying for scenario runs (188w alone is
 * ~6 minutes).
 */
export function diffScenarioHashes(
    entry: ScenarioBaselineEntry,
    artifacts: readonly string[],
    actualHashes: Record<string, string>,
    runDir: string
): BaselineFailure[] {
    const failures: BaselineFailure[] = [];
    for (const name of artifacts) {
        const expected = entry.hashes[name];
        if (expected == null) continue;
        const actual = actualHashes[name];
        if (actual == null) {
            failures.push({
                kind: 'missing_artifact',
                scenario_id: entry.id,
                artifact: name,
                expected,
                actual: '(file missing)',
                run_dir: runDir
            });
            continue;
        }
        if (actual !== expected) {
            failures.push({
                kind: 'mismatch',
                scenario_id: entry.id,
                artifact: name,
                expected,
                actual,
                run_dir: runDir
            });
        }
    }
    return failures;
}

/** Injectable for tests; production always uses runScenarioAndHash. */
export type ScenarioHasher = (
    scenarioPath: string,
    outDir: string,
    artifactNames: string[]
) => Promise<{ hashes: Record<string, string>; runDir: string }>;

/**
 * Compare current run hashes to manifest. Collects EVERY failure and throws ONCE at the end.
 *
 * WHY NOT FAIL FAST (2026-08-14). This threw on the first mismatch, and that abort was hiding two
 * of the four manifest scenarios. `apr1992_52w` has been red since 2026-08-12 (bisected to
 * b9da847f1, the veto fix), and because it sits second in the manifest, `baseline_ops_4w` and
 * `noop_4w` were never reached — their `_baseline_tmp` artifacts were last written 2026-08-11
 * while 188w and 52w were re-run the same day. Four scenarios in the manifest, one live gate in
 * practice. The same masking applied one level down, per artifact: 52w drifts on 7 of 8 artifacts
 * but only `activity_summary.json` was ever named, purely because it sorts first.
 *
 * A scenario whose RUN throws is likewise recorded and iteration continues — otherwise a broken
 * scenario file masks the rest exactly as a mismatch did.
 *
 * This also removes a latent hazard in loadManifestSync (see the note there): with fail-fast, a
 * manifest reorder could push the 188w fingerprint behind a failing entry and silently make it
 * inert. Do NOT "optimise" this back into an early throw.
 */
export async function compareAgainstBaselines(
    manifest: BaselineManifest,
    hasher: ScenarioHasher = runScenarioAndHash
): Promise<void> {
    await mkdir(BASE_TMP, { recursive: true });
    const failures: BaselineFailure[] = [];
    for (const entry of manifest.scenarios) {
        const outDir = join(BASE_TMP, entry.id);
        let actualHashes: Record<string, string>;
        let runDir: string;
        try {
            const res = await hasher(entry.scenario_path, outDir, manifest.artifacts.slice());
            actualHashes = res.hashes;
            runDir = res.runDir;
        } catch (err) {
            failures.push({
                kind: 'run_error',
                scenario_id: entry.id,
                artifact: null,
                expected: null,
                actual: err instanceof Error ? err.message : String(err),
                run_dir: null
            });
            continue;
        }
        failures.push(...diffScenarioHashes(entry, manifest.artifacts, actualHashes, runDir));
    }
    if (failures.length > 0) {
        throw new BaselineRegressionError(failures);
    }
}

/**
 * Build or update manifest from current runs. Use when UPDATE_BASELINES=1.
 */
export async function updateBaselines(manifest: BaselineManifest | null): Promise<BaselineManifest> {
    const scenariosToRun =
        manifest?.scenarios ??
        (await Promise.all(
            DEFAULT_SCENARIOS.map(async (s) => {
                const sc = await loadScenario(join(process.cwd(), s.scenario_path));
                return {
                    id: s.id,
                    scenario_path: s.scenario_path,
                    weeks: s.weeks ?? sc.weeks,
                    expected_files: ARTIFACTS.slice(),
                    hashes: {} as Record<string, string>
                };
            })
        ));
    const resolved: ScenarioBaselineEntry[] = [];
    await mkdir(BASE_TMP, { recursive: true });
    for (const entry of scenariosToRun) {
        const weeks = typeof entry.weeks === 'number' ? entry.weeks : (await loadScenario(join(process.cwd(), entry.scenario_path))).weeks;
        const outDir = join(BASE_TMP, entry.id);
        const { hashes } = await runScenarioAndHash(entry.scenario_path, outDir, ARTIFACTS);
        const hashesSorted: Record<string, string> = {};
        for (const k of Object.keys(hashes).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
            hashesSorted[k] = hashes[k];
        }
        resolved.push({
            id: entry.id,
            scenario_path: entry.scenario_path,
            weeks,
            expected_files: ARTIFACTS.slice(),
            hashes: hashesSorted
        });
    }
    resolved.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return {
        schema_version: 1,
        artifacts: ARTIFACTS.slice(),
        scenarios: resolved
    };
}

async function main(): Promise<void> {
    const prereqResult = checkDataPrereqs();
    if (!prereqResult.ok) {
        process.stderr.write(formatMissingRemediation(prereqResult));
        process.exitCode = 1;
        return;
    }
    const updateBaselinesEnv = process.env.UPDATE_BASELINES === '1';
    let manifest: BaselineManifest | null = null;
    if (existsSync(MANIFEST_PATH)) {
        const content = await readFile(MANIFEST_PATH, 'utf8');
        manifest = loadManifestSync(content);
    }
    if (updateBaselinesEnv) {
        const next = await updateBaselines(manifest);
        await mkdir(BASELINES_DIR, { recursive: true });
        await writeFile(MANIFEST_PATH, stableStringify(next, 2) + '\n', 'utf8');
        process.stdout.write(`Updated ${MANIFEST_PATH}\n`);
        return;
    }
    if (!manifest || manifest.scenarios.length === 0) {
        process.stderr.write(
            `No manifest at ${MANIFEST_PATH}. Run with UPDATE_BASELINES=1 to create baselines.\n`
        );
        process.exitCode = 1;
        return;
    }
    await compareAgainstBaselines(manifest);
    process.stdout.write('Baseline regression: all scenarios match.\n');
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
