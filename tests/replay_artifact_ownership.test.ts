import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const REPLAY_JSONL = 'runs/<scenario_run>/replay.jsonl';
const REPLAY_SEQUENCE_JSONL = 'runs/<scenario_run>/replay_sequence.jsonl';
const REPLAY_SAVE_SEQUENCE = 'runs/<scenario_run>/replay_save_sequence.json';
const REPLAY_SAVE_MANIFEST = 'runs/<scenario_run>/replay_save_manifest.json';
const REPLAY_TIMELINE = 'runs/<scenario_run>/replay_timeline.json';
const RUNS_WILDCARD = 'runs/<scenario_run>/...';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('replay sidecar generated artifact ownership stays documented and untracked', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, scenarioRunner] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'src', 'scenario', 'scenario_runner.ts'), 'utf8'),
    ]);

    for (const artifact of [REPLAY_JSONL, REPLAY_SAVE_SEQUENCE, REPLAY_SAVE_MANIFEST, RUNS_WILDCARD]) {
        const row = findOwnershipRow(ownershipDoc, artifact);
        assert.ok(row, `ownership matrix should keep the existing replay sidecar row for ${artifact}`);
        assert.ok(row.includes('Transient'), `${artifact} should remain classified as transient run output`);
    }

    const sequenceRow = findOwnershipRow(ownershipDoc, REPLAY_SEQUENCE_JSONL);
    assert.ok(sequenceRow, 'ownership matrix should include replay_sequence.jsonl');
    assert.ok(sequenceRow.includes('scenario runner'), 'replay_sequence.jsonl row should name the scenario runner owner');
    assert.ok(sequenceRow.includes('video replay'), 'replay_sequence.jsonl row should name the video replay path');
    assert.ok(sequenceRow.includes('Do not commit'), 'replay_sequence.jsonl should not be committed');
    assert.ok(sequenceRow.includes('Transient'), 'replay_sequence.jsonl should be a transient run-output sidecar');

    const timelineRow = findOwnershipRow(ownershipDoc, REPLAY_TIMELINE);
    assert.ok(timelineRow, 'ownership matrix should include replay_timeline.json');
    assert.ok(timelineRow.includes('scenario runner'), 'replay_timeline.json row should name the scenario runner owner');
    assert.ok(timelineRow.includes('video replay'), 'replay_timeline.json row should name the video replay path');
    assert.ok(timelineRow.includes('emitWeeklySavesForVideo'), 'replay_timeline.json row should document video weekly-save gating');
    assert.ok(timelineRow.includes('Do not commit'), 'replay_timeline.json should not be committed');
    assert.ok(timelineRow.includes('Transient'), 'replay_timeline.json should be a transient run-output sidecar');

    assert.match(
        scenarioRunner,
        /const replaySequencePath = join\(outDir, 'replay_sequence\.jsonl'\);/,
        'scenario runner should declare the replay_sequence.jsonl sidecar path',
    );
    assert.match(
        scenarioRunner,
        /replaySequenceStream\.write\(JSON\.stringify\(replayFrameRow\) \+ '\\n'\);/,
        'scenario runner should stream replay_sequence.jsonl rows',
    );
    assert.match(
        scenarioRunner,
        /replaySequenceStream\.on\('finish', resolve\)\.on\('error', reject\);/,
        'scenario runner should wait for replay_sequence.jsonl finalization before consuming it',
    );
    assert.match(
        scenarioRunner,
        /streamFinalizeReplaySaveSequenceFromJsonl\(\s*outDir,\s*replaySequencePath,\s*\)/,
        'replay save finalizer should consume replay_sequence.jsonl by path',
    );
    assert.match(
        scenarioRunner,
        /if \(emitWeeklySavesForVideo\) \{\s+replayTimelinePath = join\(outDir, 'replay_timeline\.json'\);/,
        'replay_timeline.json should be gated by emitWeeklySavesForVideo',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', 'runs'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'runs/ should have no committed run artifacts');
});
