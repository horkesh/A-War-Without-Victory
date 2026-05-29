import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

// Top-level transient scenario-scratch family. The trailing `_*` glob is anchored
// to the level immediately under `scenario/`, so it matches only top-level
// `_`-prefixed scratch dirs and does NOT reach tracked nested evidence such as
// `recruitment_test_matrix_*/_tmp*`.
const SCRATCH_PATHSPEC = 'data/derived/scenario/_*';
const SCRATCH_MATRIX_KEY = 'data/derived/scenario/_*/...';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('scenario transient scratch artifacts are transient and untracked by default', async () => {
    const repoRoot = process.cwd();
    const [gitignore, ownershipDoc] = await Promise.all([
        readFile(join(repoRoot, '.gitignore'), 'utf8'),
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
    ]);

    assert.match(
        gitignore,
        /^data\/derived\/scenario\/_\*\/$/m,
        'gitignore should cover the transient data/derived/scenario/_*/ scratch family',
    );

    const ownershipRow = findOwnershipRow(ownershipDoc, SCRATCH_MATRIX_KEY);
    assert.ok(ownershipRow, 'ownership matrix should include data/derived/scenario/_*/...');
    assert.ok(
        ownershipRow.includes('Owner varies by scenario diagnostic'),
        'scratch row should state that ownership varies by scenario diagnostic / temp run',
    );
    assert.ok(
        ownershipRow.includes('Default transient'),
        'scratch row should classify outputs as transient by default',
    );
    assert.ok(
        ownershipRow.includes('No committed files'),
        'scratch row should state that no files are committed under data/derived/scenario/_*',
    );
    assert.ok(
        ownershipRow.includes('Do not commit'),
        'scratch row should make do-not-commit semantics explicit',
    );

    // Top-level-anchored pathspec: the `_*` glob matches only top-level scratch dirs.
    // It must NOT reach tracked nested evidence (recruitment_test_matrix_*/_tmp*),
    // which intentionally stays tracked.
    const { stdout } = await execFileAsync('git', ['ls-files', SCRATCH_PATHSPEC], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'top-level data/derived/scenario/_* should have no tracked files');
});
