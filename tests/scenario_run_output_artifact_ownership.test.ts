import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const RUNS_ROOT = 'runs';
const RUNS_MATRIX_KEY = 'runs/<scenario_run>/...';
const OWNERSHIP_TEST = 'tests/scenario_run_output_artifact_ownership.test.ts';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('scenario run output catch-all remains transient and untracked by default', async () => {
    const repoRoot = process.cwd();
    const [gitignore, ownershipDoc] = await Promise.all([
        readFile(join(repoRoot, '.gitignore'), 'utf8'),
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
    ]);

    assert.match(gitignore, /^runs\/$/m, 'gitignore should ignore scenario run output directories');

    const ownershipRow = findOwnershipRow(ownershipDoc, RUNS_MATRIX_KEY);
    assert.ok(ownershipRow, 'ownership matrix should include the scenario run-output catch-all row');
    assert.ok(
        ownershipRow.includes('npm.cmd run sim:scenario:run:*'),
        'run-output catch-all row should name the scenario run owner command family',
    );
    assert.ok(
        ownershipRow.includes(OWNERSHIP_TEST),
        'run-output catch-all row should cite this focused static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('Default transient'),
        'run-output catch-all row should classify scenario run outputs as transient by default',
    );
    assert.ok(ownershipRow.includes('Do not commit'), 'run-output catch-all row should forbid committing run outputs');
    assert.ok(
        ownershipRow.includes('always transient'),
        'run-output catch-all row should state that scenario run outputs are always transient',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', RUNS_ROOT], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'runs/ should have no committed scenario run output artifacts');
});
