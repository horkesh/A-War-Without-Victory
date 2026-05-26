import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const SWEEP_RELATIVE_ROOT = 'data/derived/scenario/sweeps/h2_4/h2_4_sweep';
const AGGREGATE_SCENARIOS = [
    'apr1992_4w',
    'baseline_ops_4w',
    'noop_13w',
    'noop_4w',
    'noop_4w_bots',
    'noop_4w_probe_intent',
].sort();
const RETAINED_RUN_DIRS = [
    'baseline_ops_26w',
    'baseline_ops_52w',
    'noop_52w',
    'noop_52w_probe_intent',
].sort();
const RUN_ARTIFACTS = [
    'activity_summary.json',
    'control_delta.json',
    'control_events.jsonl',
    'end_report.md',
    'final_save.json',
    'formation_delta.json',
    'initial_save.json',
    'replay.jsonl',
    'run_meta.json',
    'run_summary.json',
    'weekly_report.jsonl',
].sort();

async function readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path, 'utf8')) as T;
}

test('H2.4 scenario sweep committed artifact ownership stays aligned across docs, script, and tree shape', async () => {
    const repoRoot = process.cwd();
    const sweepRoot = join(repoRoot, ...SWEEP_RELATIVE_ROOT.split('/'));
    const [ownershipDoc, packageRaw, sweepSource, aggregateRaw, aggregateMd] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'package.json'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'scenario_runner', 'run_scenario_sweep_h2_4.ts'), 'utf8'),
        readFile(join(sweepRoot, 'aggregate_summary.json'), 'utf8'),
        readFile(join(sweepRoot, 'aggregate_summary.md'), 'utf8'),
    ]);

    const ownershipRow = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith(`| \`${SWEEP_RELATIVE_ROOT}/\``));
    assert.ok(ownershipRow, 'ownership docs should include the committed H2.4 sweep tree row');
    assert.ok(
        ownershipRow.includes('npm.cmd run sim:scenario:sweep'),
        'ownership row should name the sweep owner command',
    );
    assert.ok(
        ownershipRow.includes('tests/scenario_sweep_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('tests/scenario_harness_contracts.test.ts'),
        'ownership row should name the H2.4 scenario harness validation',
    );
    assert.ok(
        ownershipRow.includes('retained run directories'),
        'ownership row should classify retained run directories outside aggregate_summary',
    );

    const packageJson = JSON.parse(packageRaw) as { scripts?: Record<string, string> };
    assert.strictEqual(
        packageJson.scripts?.['sim:scenario:sweep'],
        'tsx tools/scenario_runner/run_scenario_sweep_h2_4.ts',
    );

    assert.match(sweepSource, /const SWEEP_ID = 'h2_4_sweep';/);
    assert.match(
        sweepSource,
        /const SWEEPS_BASE = join\(process\.cwd\(\), 'data', 'derived', 'scenario', 'sweeps', 'h2_4'\);/,
    );
    assert.match(sweepSource, /stableStringify\(summary, 2\) \+ '\\n'/);
    assert.doesNotMatch(sweepSource, /\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bMath\.random\s*\(/);

    const h24Dirs = (await readdir(join(repoRoot, 'data', 'derived', 'scenario', 'sweeps', 'h2_4'), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    assert.deepStrictEqual(h24Dirs, ['h2_4_sweep'], 'H2.4 should have one committed sweep_id directory');

    const rootEntries = (await readdir(sweepRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    const rootFiles = rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    const runDirs = rootEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    assert.deepStrictEqual(rootFiles, ['aggregate_summary.json', 'aggregate_summary.md']);
    assert.deepStrictEqual(runDirs, [...AGGREGATE_SCENARIOS, ...RETAINED_RUN_DIRS].sort());

    const aggregate = JSON.parse(aggregateRaw) as {
        sweep_id: string;
        scenario_count: number;
        scenarios: Array<{ scenario_id: string; run_dir: string; run_id: string; weeks: number }>;
    };
    assert.strictEqual(aggregate.sweep_id, 'h2_4_sweep');
    assert.strictEqual(aggregate.scenario_count, aggregate.scenarios.length);
    assert.deepStrictEqual(aggregate.scenarios.map((row) => row.scenario_id).sort(), AGGREGATE_SCENARIOS);

    for (const scenarioId of AGGREGATE_SCENARIOS) {
        assert.ok(aggregateMd.includes(`## ${scenarioId}`), `aggregate markdown should include ${scenarioId}`);
        assert.ok(
            aggregate.scenarios.some((row) => row.run_dir.replaceAll('\\', '/').endsWith(`${SWEEP_RELATIVE_ROOT}/${scenarioId}`)),
            `aggregate JSON should point at ${scenarioId}`,
        );
    }

    for (const runDir of runDirs) {
        const files = (await readdir(join(sweepRoot, runDir))).sort();
        assert.deepStrictEqual(files, RUN_ARTIFACTS, `${runDir} artifact set should stay fixed`);

        const [runMeta, runSummary] = await Promise.all([
            readJson<{ scenario_id: string; run_id: string; weeks: number }>(join(sweepRoot, runDir, 'run_meta.json')),
            readJson<{ scenario_id: string; run_id: string; weeks: number }>(join(sweepRoot, runDir, 'run_summary.json')),
        ]);
        assert.strictEqual(runMeta.scenario_id, runDir, `${runDir} run_meta scenario_id should match directory`);
        assert.strictEqual(runSummary.scenario_id, runDir, `${runDir} run_summary scenario_id should match directory`);
        assert.strictEqual(runSummary.run_id, runMeta.run_id, `${runDir} run_id should match across metadata`);
        assert.strictEqual(runSummary.weeks, runMeta.weeks, `${runDir} weeks should match across metadata`);
    }
});
