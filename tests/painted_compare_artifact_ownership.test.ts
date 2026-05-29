import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const PAINTED_COMPARE_ROOT = 'tools/diagnostics/_phase5a_painted_compares';
const PAINTED_COMPARE_PATTERN = `${PAINTED_COMPARE_ROOT}/*.txt`;
const EXPECTED_ARTIFACTS = [
    'painted_104w_apr1994.txt',
    'painted_156w_apr1995.txt',
    'painted_183w_apr1995.txt',
    'painted_188w_oct1995.txt',
    'painted_40w_jan1993.txt',
].map((name) => `${PAINTED_COMPARE_ROOT}/${name}`);

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('painted compare diagnostics are committed static artifacts with documented ownership', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, rawDataReport, freshDeltaReport] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'diagnostics', '_force_quality_post_phase4_runs.md'), 'utf8'),
        readFile(
            join(repoRoot, 'docs', '40_reports', 'audits', '20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md'),
            'utf8',
        ),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc, PAINTED_COMPARE_PATTERN);
    assert.ok(ownershipRow, 'ownership matrix should include the committed painted-compare diagnostics row');
    assert.ok(
        ownershipRow.includes('node tools/compare_painted_vs_sim.cjs'),
        'ownership row should name the painted-vs-sim compare owner command',
    );
    assert.ok(
        ownershipRow.includes('tests/painted_compare_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('Committed Phase 5a diagnostics'),
        'ownership row should classify painted compares as committed diagnostics',
    );
    assert.ok(
        ownershipRow.includes('Not transient while committed'),
        'ownership row should explicitly distinguish these artifacts from transient run output',
    );

    const { stdout } = await execFileAsync('git', ['ls-files', '--', `${PAINTED_COMPARE_ROOT}/*.txt`], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const trackedArtifacts = stdout.trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepStrictEqual(trackedArtifacts, EXPECTED_ARTIFACTS, 'painted compare tracked filenames should stay fixed');

    for (const artifact of EXPECTED_ARTIFACTS) {
        const artifactName = artifact.slice(`${PAINTED_COMPARE_ROOT}/`.length);
        assert.ok(rawDataReport.includes(artifactName), `raw-data report should list ${artifactName}`);
    }

    assert.ok(
        rawDataReport.includes('Painted compares:** `tools/diagnostics/_phase5a_painted_compares/painted_<window>_<target>.txt`'),
        'raw-data report should name the painted-compare output pattern',
    );
    assert.ok(
        freshDeltaReport.includes('tools/diagnostics/_phase5a_painted_compares/'),
        'fresh-delta report should cite the painted-compare diagnostics directory',
    );
    assert.ok(
        freshDeltaReport.includes('all four `tools/compare_painted_vs_sim.cjs` commands'),
        'fresh-delta report should document parent-side command rerun verification for the analyzed compares',
    );
});
