import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const FORCE_QUALITY_PATTERN = 'tools/diagnostics/_force_quality_*.md';
const EXPECTED_ARTIFACTS = [
    'tools/diagnostics/_force_quality_phase5b_tier1.md',
    'tools/diagnostics/_force_quality_post_phase4_metrics.md',
    'tools/diagnostics/_force_quality_post_phase4_runs.md',
    'tools/diagnostics/_force_quality_run_output.md',
];

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('force-quality diagnostics are committed retained evidence with documented ownership', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, tier1, postPhase4Runs, postPhase4Metrics, runOutput] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'diagnostics', '_force_quality_phase5b_tier1.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'diagnostics', '_force_quality_post_phase4_runs.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'diagnostics', '_force_quality_post_phase4_metrics.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'diagnostics', '_force_quality_run_output.md'), 'utf8'),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc, FORCE_QUALITY_PATTERN);
    assert.ok(ownershipRow, 'ownership matrix should include the committed force-quality diagnostics row');
    assert.ok(
        ownershipRow.includes('tests/force_quality_diagnostic_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('Committed retained force-quality diagnostic evidence'),
        'ownership row should classify force-quality markdown as retained diagnostic evidence',
    );
    assert.ok(
        ownershipRow.includes('not current calibration truth'),
        'ownership row should avoid overclaiming retained diagnostics as current calibration truth',
    );
    assert.ok(
        ownershipRow.includes('Not transient while committed'),
        'ownership row should explicitly distinguish these artifacts from transient run output',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', '--', FORCE_QUALITY_PATTERN], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const trackedArtifacts = stdout.trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepStrictEqual(trackedArtifacts, EXPECTED_ARTIFACTS, 'force-quality tracked filenames should stay fixed');

    assert.ok(tier1.includes('_force_quality_post_phase4_runs.md'), 'Tier 1 synthesis should cite the post-Phase-4 runs report');
    assert.ok(
        tier1.includes('_force_quality_post_phase4_metrics.md'),
        'Tier 1 synthesis should cite the post-Phase-4 metrics report',
    );
    assert.ok(
        tier1.includes('Raw data: `_force_quality_post_phase4_runs.md`, `_force_quality_post_phase4_metrics.md`'),
        'Tier 1 synthesis should classify the post-Phase-4 files as raw data',
    );

    assert.ok(
        postPhase4Runs.includes('**Status:** Raw data only. No analysis.'),
        'post-Phase-4 runs report should classify itself as raw data',
    );
    assert.ok(
        postPhase4Runs.includes('**Companion file:** `tools/diagnostics/_force_quality_post_phase4_metrics.md`'),
        'post-Phase-4 runs report should cite the companion metrics file',
    );
    assert.ok(
        postPhase4Runs.includes('**Painted compares:** `tools/diagnostics/_phase5a_painted_compares/painted_<window>_<target>.txt`'),
        'post-Phase-4 runs report should cite the related painted-compare evidence pattern',
    );

    for (const markdown of [postPhase4Metrics, runOutput]) {
        assert.ok(
            markdown.includes('# Force-Quality Audit Metrics (read-only extraction)'),
            'metrics artifacts should identify themselves as read-only extractions',
        );
        assert.ok(markdown.includes('final_state_hash'), 'metrics artifacts should retain source run hash context');
        assert.ok(markdown.includes('#### 1. Officer quality'), 'metrics artifacts should retain force-quality section context');
        assert.ok(markdown.includes('#### 4-7. Operations'), 'metrics artifacts should retain operation-window section context');
    }
});
