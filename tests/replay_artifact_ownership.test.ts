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
    assert.ok(sequenceRow.includes('full replay payload mode'), 'replay_sequence.jsonl row should name the opt-in full replay path');
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
        /const replaySequencePath = emitFullReplayPayload \? join\(outDir, 'replay_sequence\.jsonl'\) : '';/,
        'scenario runner should gate the replay_sequence.jsonl sidecar path on full replay mode',
    );
    assert.match(
        scenarioRunner,
        /if \(replaySequenceStream\) \{[^]*replaySequenceStream\.write\(JSON\.stringify\(replayFrameRow\) \+ '\\n'\);[^]*\}/,
        'scenario runner should stream replay_sequence.jsonl rows only when full replay mode opens the stream',
    );
    assert.match(
        scenarioRunner,
        /if \(replaySequenceStream\) \{[^]*replaySequenceStream\.on\('finish', resolve\)\.on\('error', reject\);[^]*\}/,
        'scenario runner should wait for replay_sequence.jsonl finalization only before consuming an opt-in stream',
    );
    assert.match(
        scenarioRunner,
        /emitFullReplayPayload[^]*streamFinalizeReplaySaveSequenceFromJsonl\(\s*outDir,\s*replaySequencePath,\s*\)/,
        'replay save finalizer should consume replay_sequence.jsonl by path only in full replay mode',
    );
    assert.match(
        scenarioRunner,
        /if \(emitWeeklySavesForVideo\) \{\s+replayTimelinePath = join\(outDir, 'replay_timeline\.json'\);/,
        'replay_timeline.json should be gated by emitWeeklySavesForVideo',
    );

    // Source-anchor the replay.jsonl emitter (the --video weekly-save replay
    // sidecar). Its owner is mapped in the matrix, but unlike its siblings the
    // actual emit call site was previously unverified — pin path gating, stream
    // open, and the per-turn write so a refactor cannot silently re-own it.
    assert.match(
        scenarioRunner,
        /const replayPath = emitWeeklySavesForVideo \? join\(outDir, 'replay\.jsonl'\) : null;/,
        'replay.jsonl path should be gated by emitWeeklySavesForVideo and owned by the scenario runner',
    );
    assert.match(
        scenarioRunner,
        /const replayStream = replayPath\s*\?[^]*createWriteStream\(replayPath, \{ flags: 'w' \}\)[^]*: null;/,
        'replay.jsonl stream should open only when the video weekly-save path is set',
    );
    assert.match(
        scenarioRunner,
        /if \(replayStream\) \{[^]*replayStream\.write\(stableStringify\(replayLine\) \+ '\\n'\);[^]*\}/,
        'replay.jsonl rows should stream only when the video weekly-save stream is open',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', 'runs'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    assert.strictEqual(stdout.trim(), '', 'runs/ should have no committed run artifacts');
});
