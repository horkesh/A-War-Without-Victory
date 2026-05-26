import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const ROOTS = ['baseline_ops_sensitivity', 'baseline_ops_sensitivity_run2'] as const;
const RUN_FOLDERS = [
    'run_all_front_active_26w_x0_25',
    'run_all_front_active_26w_x0_5',
    'run_all_front_active_26w_x1',
    'run_all_front_active_26w_x2',
    'run_all_front_active_26w_x4',
].sort();
const RUN_ARTIFACTS = [
    'activity_summary.json',
    'control_delta.json',
    'end_report.md',
    'final_save.json',
    'initial_save.json',
    'replay.jsonl',
    'run_meta.json',
    'run_summary.json',
    'sensitivity_run_metrics.json',
    'weekly_report.jsonl',
].sort();

async function listRelativeFiles(root: string): Promise<string[]> {
    const base = join(process.cwd(), 'data', 'derived', 'scenario', root);
    const files = ['baseline_ops_sensitivity_report.json'];
    for (const runFolder of RUN_FOLDERS) {
        const names = (await readdir(join(base, runFolder))).sort();
        assert.deepStrictEqual(names, RUN_ARTIFACTS, `${root}/${runFolder} artifact set should stay fixed`);
        for (const name of names) {
            files.push(`${runFolder}/${name}`);
        }
    }
    return files.sort();
}

async function readArtifact(root: string, relativePath: string): Promise<string> {
    return readFile(join(process.cwd(), 'data', 'derived', 'scenario', root, relativePath), 'utf8');
}

test('baseline ops sensitivity committed artifacts have explicit ownership and retained run2 proof', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, packageRaw, cliSource, producerSource] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'package.json'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'scenario_runner', 'run_baseline_ops_sensitivity.ts'), 'utf8'),
        readFile(join(repoRoot, 'src', 'scenario', 'baseline_ops_sensitivity.ts'), 'utf8'),
    ]);

    const ownershipRow = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith('| `data/derived/scenario/baseline_ops_sensitivity*/`'));
    assert.ok(ownershipRow, 'ownership docs should include the baseline ops sensitivity artifact tree row');
    assert.ok(
        ownershipRow.includes('npm.cmd run sim:scenario:baseline-ops:sensitivity'),
        'ownership row should name the owner command',
    );
    assert.ok(
        ownershipRow.includes('tests/h1_11_baseline_ops_sensitivity.test.ts'),
        'ownership row should name the behavior/determinism validation',
    );
    assert.ok(
        ownershipRow.includes('tests/baseline_ops_sensitivity_artifact_ownership.test.ts'),
        'ownership row should name this ownership validation',
    );
    assert.ok(
        ownershipRow.includes('`baseline_ops_sensitivity_run2` is retained byte-identity evidence'),
        'ownership row should classify the retained run2 tree',
    );

    const packageJson = JSON.parse(packageRaw) as { scripts?: Record<string, string> };
    assert.strictEqual(
        packageJson.scripts?.['sim:scenario:baseline-ops:sensitivity'],
        'tsx tools/scenario_runner/run_baseline_ops_sensitivity.ts',
    );
    assert.match(
        cliSource,
        /const DEFAULT_OUT = join\(process\.cwd\(\), 'data', 'derived', 'scenario', 'baseline_ops_sensitivity'\);/,
        'CLI default output should be the primary committed sensitivity tree',
    );

    assert.match(producerSource, /stableStringify\(metrics, 2\)/, 'per-run metrics should use stable JSON');
    assert.match(producerSource, /stableStringify\(report, 2\)/, 'aggregated report should use stable JSON');
    assert.doesNotMatch(producerSource, /\bDate\.now\s*\(|\bnew\s+Date\s*\(|\bMath\.random\s*\(/);

    const scenarioDerivedEntries = (await readdir(join(repoRoot, 'data', 'derived', 'scenario'), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('baseline_ops_sensitivity'))
        .map((entry) => entry.name)
        .sort();
    assert.deepStrictEqual(
        scenarioDerivedEntries,
        [...ROOTS].sort(),
        'only the documented primary and retained run2 sensitivity trees should be committed',
    );

    const [primaryFiles, run2Files] = await Promise.all(ROOTS.map((root) => listRelativeFiles(root)));
    assert.deepStrictEqual(run2Files, primaryFiles, 'retained run2 tree should mirror the primary tree shape');

    for (const relativePath of primaryFiles) {
        const [primaryRaw, run2Raw] = await Promise.all(ROOTS.map((root) => readArtifact(root, relativePath)));
        if (relativePath.endsWith('/run_meta.json')) {
            const primaryMeta = JSON.parse(primaryRaw) as Record<string, unknown>;
            const run2Meta = JSON.parse(run2Raw) as Record<string, unknown>;
            assert.notStrictEqual(primaryMeta.out_dir, run2Meta.out_dir, `${relativePath} out_dir should identify each retained tree`);
            delete primaryMeta.out_dir;
            delete run2Meta.out_dir;
            assert.deepStrictEqual(run2Meta, primaryMeta, `${relativePath} should only differ by out_dir`);
        } else {
            assert.strictEqual(run2Raw, primaryRaw, `${relativePath} should be byte-identical across retained runs`);
        }
    }
});
