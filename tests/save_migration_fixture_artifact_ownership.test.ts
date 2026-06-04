import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const OWNERSHIP_DOC = join('docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md');
const FIXTURE_DIR = 'tests/fixtures/save_migration';
const MATRIX_KEY = 'tests/fixtures/save_migration/v*.json';
const ROUND_TRIP_TEST = 'tests/save_migration_round_trip_contract.test.ts';
const DRIFT_AUDIT_TEST = 'tests/save_migration_drift_audit.test.ts';
const OWNERSHIP_TEST = 'tests/save_migration_fixture_artifact_ownership.test.ts';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('save migration fixture ownership stays aligned across docs and tracked legacy fixtures', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, fixtureNames, gitLsFiles] = await Promise.all([
        readFile(join(repoRoot, OWNERSHIP_DOC), 'utf8'),
        readdir(join(repoRoot, ...FIXTURE_DIR.split('/'))),
        execFileAsync('git', ['ls-files', '--', `${FIXTURE_DIR}/*.json`], {
            cwd: repoRoot,
            encoding: 'utf8',
        }),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc, MATRIX_KEY);
    assert.ok(ownershipRow, 'ownership matrix should include save migration fixture row');
    assert.ok(ownershipRow.includes('retained legacy migration fixtures'));
    assert.ok(ownershipRow.includes('add a new vNN fixture during a schema bump'));
    assert.ok(ownershipRow.includes('do not refresh prior fixtures in place'));
    assert.ok(ownershipRow.includes('Committed static legacy schema fixtures'));
    assert.ok(ownershipRow.includes(ROUND_TRIP_TEST));
    assert.ok(ownershipRow.includes(DRIFT_AUDIT_TEST));
    assert.ok(ownershipRow.includes(OWNERSHIP_TEST));

    const trackedFixtures = gitLsFiles.stdout.trim().split(/\r?\n/).filter(Boolean);
    const jsonFixtures = fixtureNames.filter((name) => name.endsWith('.json')).sort();

    assert.ok(trackedFixtures.length > 0, 'save migration fixtures should be tracked');
    assert.deepStrictEqual(
        trackedFixtures,
        jsonFixtures.map((name) => `${FIXTURE_DIR}/${name}`),
        'all save migration JSON fixtures should be tracked and no untracked JSON fixtures should be present',
    );

    const versionPrefixes = jsonFixtures.map((name) => {
        const match = /^v(\d{2})_.+\.json$/.exec(name);
        assert.ok(match, `fixture should use vNN_slug.json naming: ${name}`);
        return Number(match[1]);
    });

    assert.deepStrictEqual(
        versionPrefixes,
        Array.from({ length: versionPrefixes.length }, (_, index) => index + 1),
        'save migration fixture versions should be contiguous from v01',
    );
});
