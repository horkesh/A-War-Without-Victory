import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const REPLAY_SAVE_SEQUENCE = 'runs/<scenario_run>/replay_save_sequence.json';
const REPLAY_SAVE_MANIFEST = 'runs/<scenario_run>/replay_save_manifest.json';
const OWNERSHIP_TEST = 'tests/replay_save_finalizer_artifact_ownership.test.ts';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('replay save finalizer sidecars keep explicit static ownership', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, finalizerSource, scenarioRunnerSource] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'src', 'scenario', 'replay_save_emit.ts'), 'utf8'),
        readFile(join(repoRoot, 'src', 'scenario', 'scenario_runner.ts'), 'utf8'),
    ]);

    const sequenceRow = findOwnershipRow(ownershipDoc, REPLAY_SAVE_SEQUENCE);
    assert.ok(sequenceRow, 'ownership matrix should include replay_save_sequence.json');
    assert.ok(sequenceRow.includes('streamFinalizeReplaySaveSequenceFromJsonl'), 'sequence row should name the streaming finalizer owner');
    assert.ok(sequenceRow.includes(OWNERSHIP_TEST), 'sequence row should cite this focused ownership test');
    assert.ok(sequenceRow.includes('Do not commit'), 'sequence row should forbid committing the sidecar');
    assert.ok(sequenceRow.includes('Transient'), 'sequence row should classify the sidecar as transient');

    const manifestRow = findOwnershipRow(ownershipDoc, REPLAY_SAVE_MANIFEST);
    assert.ok(manifestRow, 'ownership matrix should include replay_save_manifest.json');
    assert.ok(manifestRow.includes('replay save finalizer manifest writer'), 'manifest row should name the manifest writer owner');
    assert.ok(manifestRow.includes(OWNERSHIP_TEST), 'manifest row should cite this focused ownership test');
    assert.ok(manifestRow.includes('Do not commit'), 'manifest row should forbid committing the sidecar');
    assert.ok(manifestRow.includes('Transient'), 'manifest row should classify the sidecar as transient');

    assert.match(
        finalizerSource,
        /const sequencePath = join\(outDir, 'replay_save_sequence\.json'\);/,
        'replay save finalizer should own the consolidated sequence path',
    );
    assert.match(
        finalizerSource,
        /const manifestPath = join\(outDir, 'replay_save_manifest\.json'\);/,
        'replay save finalizer should own the sparse manifest path',
    );
    assert.match(
        finalizerSource,
        /await writeReplaySaveManifest\(outDir, summaries\);/,
        'streaming finalizer should emit the sparse manifest next to the sequence',
    );
    assert.match(
        scenarioRunnerSource,
        /const replaySaveSequencePath = emitFullReplayPayload[^]*streamFinalizeReplaySaveSequenceFromJsonl\(\s*outDir,\s*replaySequencePath,\s*\)[^]*: '';/,
        'scenario runner should finalize replay_save_sequence.json from replay_sequence.jsonl only in full replay mode',
    );
    assert.match(
        scenarioRunnerSource,
        /writeReplaySaveManifest\(outDir, replayManifestSummaries\)/,
        'scenario runner should write the sparse manifest directly in default manifest-only mode',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', 'runs'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'runs/ should have no committed replay save sidecars');
});
