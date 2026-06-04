import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const FIXTURE_ROOT = 'tests/fixtures/fatigue_distribution/compact_run';
const EXPECTED_FIXTURE_FILES = [
    `${FIXTURE_ROOT}/replay_save_sequence.json`,
    `${FIXTURE_ROOT}/run_summary.json`,
];

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('fatigue distribution compact replay fixture has explicit artifact ownership', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, sequenceRaw, summaryRaw] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, FIXTURE_ROOT, 'replay_save_sequence.json'), 'utf8'),
        readFile(join(repoRoot, FIXTURE_ROOT, 'run_summary.json'), 'utf8'),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc, `${FIXTURE_ROOT}/`);
    assert.ok(ownershipRow, 'ownership matrix should include the compact fatigue replay fixture row');
    assert.ok(
        ownershipRow.includes('None - retained compact replay fixture'),
        'ownership row should classify the fixture as retained, not a refresh target',
    );
    assert.ok(
        ownershipRow.includes('tests/fatigue_distribution_audit_diagnostic.test.ts'),
        'ownership row should name the diagnostic consumer test',
    );
    assert.ok(
        ownershipRow.includes('tests/fatigue_distribution_replay_fixture_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('Committed compact replay fixture'),
        'ownership row should classify the compact run as a committed fixture',
    );
    assert.ok(
        ownershipRow.includes('Not transient while committed'),
        'ownership row should distinguish the fixture from transient run sidecars',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', '--', FIXTURE_ROOT], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const trackedFiles = stdout.trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepStrictEqual(trackedFiles, EXPECTED_FIXTURE_FILES, 'compact replay fixture file set should stay fixed');

    const sequence = JSON.parse(sequenceRaw) as Array<{ meta?: { turn?: unknown } }>;
    const summary = JSON.parse(summaryRaw) as { final_state_hash?: unknown; weeks?: unknown };

    assert.deepStrictEqual(sequence.map((frame) => frame.meta?.turn), [1, 2], 'fixture replay turns should stay compact');
    assert.strictEqual(summary.weeks, sequence.length, 'fixture summary week count should match replay frame count');
    assert.strictEqual(
        summary.final_state_hash,
        'compact-fatigue-fixture',
        'fixture summary should stay synthetic and not claim a scenario hash',
    );
});
