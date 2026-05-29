import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const PMTILES_ARTIFACTS = [
    'data/derived/tiles/hillshade.pmtiles',
    'data/derived/tiles/osm.pmtiles',
    'data/derived/tiles/terrain.pmtiles',
] as const;

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('terrain PMTiles generated artifact ownership stays documented, tracked, binary, and consumer-guarded', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, consumerGuard] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'tests', 'desktop_pmtiles_protocol_route.test.ts'), 'utf8'),
    ]);

    for (const artifact of PMTILES_ARTIFACTS) {
        const row = findOwnershipRow(ownershipDoc, artifact);
        assert.ok(row, `ownership matrix should include ${artifact}`);
        assert.ok(row.includes('terrain/tile build pipeline'), `${artifact} row should name the terrain/tile pipeline owner`);
        assert.ok(row.includes('tests/desktop_pmtiles_protocol_route.test.ts'), `${artifact} row should name the desktop PMTiles consumer guard`);
        assert.ok(row.includes('Committed'), `${artifact} should remain a committed generated tile artifact`);
        assert.ok(!row.includes('Do not commit'), `${artifact} should not be classified as a transient sidecar`);
    }

    const { stdout: trackedStdout } = await execFileAsync('git', ['ls-files', ...PMTILES_ARTIFACTS], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const trackedFiles = new Set(trackedStdout.trim().split(/\r?\n/).filter(Boolean));
    for (const artifact of PMTILES_ARTIFACTS) {
        assert.ok(trackedFiles.has(artifact), `${artifact} should be tracked by git`);
    }

    const { stdout: attrStdout } = await execFileAsync(
        'git',
        ['check-attr', 'filter', 'diff', 'merge', 'text', '--', ...PMTILES_ARTIFACTS],
        { cwd: repoRoot, encoding: 'utf8' },
    );
    for (const artifact of PMTILES_ARTIFACTS) {
        assert.match(attrStdout, new RegExp(`${artifact}: filter: lfs`), `${artifact} should use the LFS filter`);
        assert.match(attrStdout, new RegExp(`${artifact}: diff: lfs`), `${artifact} should use the LFS diff driver`);
        assert.match(attrStdout, new RegExp(`${artifact}: merge: lfs`), `${artifact} should use the LFS merge driver`);
        assert.match(attrStdout, new RegExp(`${artifact}: text: unset`), `${artifact} should be treated as binary`);
    }

    assert.ok(
        consumerGuard.includes('rewritePmtilesUrlsForRuntime'),
        'desktop PMTiles route guard should continue to test runtime PMTiles URL rewriting',
    );
    assert.ok(
        consumerGuard.includes('serves range responses for derived PMTiles files'),
        'desktop PMTiles route guard should continue to test range responses for PMTiles consumers',
    );
    assert.ok(
        consumerGuard.includes('sample.pmtiles'),
        'desktop PMTiles route guard should continue to exercise a PMTiles route path',
    );
});
