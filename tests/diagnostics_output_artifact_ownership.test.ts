import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const DIAGNOSTICS_OUTPUT_DIR = 'tools/diagnostics/output';
const SAVE_MIGRATION_DRIFT_ARTIFACT = `${DIAGNOSTICS_OUTPUT_DIR}/save_migration_drift.json`;
const SAVE_MIGRATION_DRIFT_OWNER = 'node tools/diagnostics/save_migration_drift_audit.cjs';
const SAVE_MIGRATION_DRIFT_VALIDATION = 'tests/save_migration_drift_audit.test.ts';
const DIAGNOSTICS_OUTPUT_WILDCARD = `${DIAGNOSTICS_OUTPUT_DIR}/*.json`;
const UNLISTED_DIAGNOSTIC_ARTIFACT_POLICY =
    'unlisted diagnostic artifacts must not be committed without a matrix row first';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('diagnostic output artifacts stay covered by explicit ownership or the transient wildcard policy', async () => {
    const repoRoot = process.cwd();
    const ownershipDoc = await readFile(
        join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'),
        'utf8',
    );

    const saveMigrationDriftRow = findOwnershipRow(ownershipDoc, SAVE_MIGRATION_DRIFT_ARTIFACT);
    assert.ok(saveMigrationDriftRow, 'ownership matrix should list the committed save migration drift artifact');
    assert.ok(
        saveMigrationDriftRow.includes(SAVE_MIGRATION_DRIFT_OWNER),
        'save migration drift row should name the diagnostic owner command',
    );
    assert.ok(
        saveMigrationDriftRow.includes(SAVE_MIGRATION_DRIFT_VALIDATION),
        'save migration drift row should name the validation test',
    );

    const wildcardRow = findOwnershipRow(ownershipDoc, DIAGNOSTICS_OUTPUT_WILDCARD);
    assert.ok(wildcardRow, 'ownership matrix should include a diagnostics output wildcard row');
    assert.ok(
        wildcardRow.includes('Default transient'),
        'diagnostics output wildcard row should classify unlisted JSON diagnostics as transient by default',
    );
    assert.ok(
        wildcardRow.includes(UNLISTED_DIAGNOSTIC_ARTIFACT_POLICY),
        'diagnostics output wildcard row should block committing unlisted diagnostic artifacts before a matrix row exists',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', DIAGNOSTICS_OUTPUT_DIR], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.deepStrictEqual(
        stdout.trim().split(/\r?\n/).filter(Boolean),
        [SAVE_MIGRATION_DRIFT_ARTIFACT],
        'save_migration_drift.json should be the only committed diagnostics output artifact',
    );
});
