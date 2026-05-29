import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const BASELINE_ARTIFACTS = [
    'activity_summary.json',
    'control_delta.json',
    'end_report.md',
    'final_save.json',
    'formation_delta.json',
    'run_summary.json',
    'watched_operations.json',
    'weekly_report.jsonl',
].sort();

function parseRunnerArtifactDefaults(source: string): string[] {
    const match = source.match(/const ARTIFACTS = \[([\s\S]*?)\]\.sort/);
    assert.ok(match, 'run_baseline_regression.ts should define ARTIFACTS defaults');
    return Array.from(match[1].matchAll(/'([^']+)'/g), (artifactMatch) => artifactMatch[1]).sort();
}

test('baseline manifest hashed artifact set stays aligned across manifest, runner defaults, and docs', async () => {
    const repoRoot = process.cwd();
    const [manifestRaw, runnerSource, ownershipDoc] = await Promise.all([
        readFile(join(repoRoot, 'data', 'derived', 'scenario', 'baselines', 'manifest.json'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'scenario_runner', 'run_baseline_regression.ts'), 'utf8'),
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
    ]);

    const manifest = JSON.parse(manifestRaw) as {
        artifacts: string[];
        scenarios: Array<{
            id: string;
            expected_files: string[];
            hashes: Record<string, string>;
        }>;
    };

    assert.deepStrictEqual(manifest.artifacts.slice().sort(), BASELINE_ARTIFACTS);
    assert.deepStrictEqual(parseRunnerArtifactDefaults(runnerSource), BASELINE_ARTIFACTS);

    for (const scenario of manifest.scenarios) {
        assert.deepStrictEqual(
            scenario.expected_files.slice().sort(),
            BASELINE_ARTIFACTS,
            `${scenario.id} expected_files should match manifest artifacts`,
        );
        assert.deepStrictEqual(
            Object.keys(scenario.hashes).sort(),
            BASELINE_ARTIFACTS,
            `${scenario.id} hash keys should match manifest artifacts`,
        );
    }

    const baselineManifestOwnershipRow = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.includes('data/derived/scenario/baselines/manifest.json'));
    assert.ok(baselineManifestOwnershipRow, 'ownership docs should include the committed baseline manifest row');

    assert.ok(
        baselineManifestOwnershipRow.includes('Only `manifest.json` is committed'),
        'ownership docs should state only the baseline manifest is committed',
    );
    assert.ok(
        baselineManifestOwnershipRow.includes('hashed run outputs'),
        'ownership docs should describe manifest artifact names as hashed run outputs',
    );
    assert.ok(
        !ownershipDoc
            .split(/\r?\n/)
            .some((line) => line.startsWith('| `data/derived/scenario/baselines/<scenario>/')),
        'ownership docs should not list per-scenario baseline payload paths as committed artifacts',
    );

    for (const artifact of BASELINE_ARTIFACTS) {
        assert.ok(
            baselineManifestOwnershipRow.includes(artifact),
            `ownership docs should name hashed run artifact ${artifact}`,
        );
    }
});
