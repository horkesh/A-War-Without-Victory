import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const DEBUG_ARTIFACT_ROOT = 'data/derived/_debug';
const DEBUG_ARTIFACT_PATTERN = `${DEBUG_ARTIFACT_ROOT}/**`;

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('data derived debug artifacts are transient and untracked by default', async () => {
    const repoRoot = process.cwd();
    const [gitignore, ownershipDoc] = await Promise.all([
        readFile(join(repoRoot, '.gitignore'), 'utf8'),
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
    ]);

    assert.match(
        gitignore,
        /^data\/derived\/_debug\/$/m,
        'gitignore should cover the transient data/derived/_debug/ artifact tree',
    );

    const ownershipRow = findOwnershipRow(ownershipDoc, DEBUG_ARTIFACT_PATTERN);
    assert.ok(ownershipRow, 'ownership matrix should include data/derived/_debug/**');
    assert.ok(
        ownershipRow.includes('Owner varies by diagnostic script'),
        'debug artifact row should state that ownership varies by diagnostic script',
    );
    assert.ok(
        ownershipRow.includes('Default transient'),
        'debug artifact row should classify outputs as transient by default',
    );
    assert.ok(
        ownershipRow.includes('No committed files'),
        'debug artifact row should state that no files are committed under data/derived/_debug/',
    );
    assert.ok(
        ownershipRow.includes('Do not commit'),
        'debug artifact row should make do-not-commit semantics explicit',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', DEBUG_ARTIFACT_ROOT], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'data/derived/_debug should have no tracked files');
});
