import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

const LATEST_RUN_FINAL_SAVE = 'data/derived/latest_run_final_save.json';
const VALIDATION_TEST = 'tests/scenario_latest_run_final_save_map_copy.test.ts';
const OWNERSHIP_TEST = 'tests/scenario_latest_run_final_save_artifact_ownership.test.ts';

test('latest-run final-save artifact ownership stays aligned across docs, scripts, and copy helper', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, packageJsonRaw, runnerSource] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'package.json'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'scenario_runner', 'run_scenario.ts'), 'utf8'),
    ]);

    const ownershipRow = ownershipDoc
        .split(/\r?\n/)
        .find((line) => line.startsWith('| `data/derived/latest_run_final_save.json`'));
    assert.ok(ownershipRow, 'ownership docs should include latest-run final-save row');
    assert.ok(ownershipRow.includes('npm.cmd run sim:scenario:run:40w'));
    assert.ok(ownershipRow.includes('sim:scenario:run:default'));
    assert.ok(ownershipRow.includes(VALIDATION_TEST));
    assert.ok(ownershipRow.includes(OWNERSHIP_TEST));
    assert.ok(ownershipRow.includes('Default: transient'));
    assert.ok(ownershipRow.includes('paired ledger entry'));

    const packageJson = JSON.parse(packageJsonRaw) as { scripts: Record<string, string> };
    assert.match(
        packageJson.scripts['sim:scenario:run:40w'],
        /run_scenario_with_preflight\.ts --scenario data\/scenarios\/apr1992_definitive_40w\.json --unique --map --out runs/,
    );
    assert.match(
        packageJson.scripts['sim:scenario:run:default'],
        /run_scenario_with_preflight\.ts --scenario data\/scenarios\/apr1992_definitive_52w\.json --unique --map --out runs/,
    );

    assert.match(
        runnerSource,
        /export async function copyFinalSaveToLatestRun\(finalSavePath: string, repoRoot: string\): Promise<string>/,
    );
    assert.match(runnerSource, /const derivedDir = join\(repoRoot, 'data', 'derived'\);/);
    assert.match(runnerSource, /const destPath = join\(derivedDir, 'latest_run_final_save\.json'\);/);
    assert.match(runnerSource, /await copyFile\(finalSavePath, destPath\);/);
    assert.match(runnerSource, /if \(enableMap\) \{\s+await copyFinalSaveToLatestRun\(result\.paths\.final_save, process\.cwd\(\)\);/);
    assert.ok(ownershipRow.includes(LATEST_RUN_FINAL_SAVE));
});
