import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const TERRAIN_ROOT = 'data/derived/terrain/';
const EXPECTED_TERRAIN_FILES = [
    'data/derived/terrain/contours_A1.geojson',
    'data/derived/terrain/dem_clip_h6_2.tif',
    'data/derived/terrain/dem_clip_h6_2.tif.aux.xml',
    'data/derived/terrain/dem_snapshot_audit_h6_2.json',
    'data/derived/terrain/dem_snapshot_audit_h6_2.txt',
    'data/derived/terrain/heightmap_3d_viewer.json',
    'data/derived/terrain/hillshade_bg.png',
    'data/derived/terrain/hillshade_bg.png.aux.xml',
    'data/derived/terrain/major_roads_wgs84.geojson',
    'data/derived/terrain/osm_roads_snapshot_h6_2.geojson.gz',
    'data/derived/terrain/osm_snapshot_audit_h6_2.json',
    'data/derived/terrain/osm_snapshot_audit_h6_2.txt',
    'data/derived/terrain/osm_waterways_snapshot_h6_2.geojson',
    'data/derived/terrain/osm_waterways_snapshot_h6_2.geojson.gz',
    'data/derived/terrain/settlements_terrain_scalars.json',
    'data/derived/terrain/terrain_scalars_audit_h6_8.json',
    'data/derived/terrain/terrain_scalars_audit_h6_8.txt',
    'data/derived/terrain/terrain_scalars_audit_h6_9.json',
    'data/derived/terrain/terrain_scalars_audit_h6_9.txt',
    'data/derived/terrain/terrain_scalars_viewer_overlay_h6_9.json',
];

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

test('terrain snapshot artifacts are committed retained evidence with documented ownership', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, toolchainReadme, psRunner, shRunner] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'terrain_toolchain', 'README.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'terrain_toolchain', 'run_h6_2_snapshots.ps1'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'terrain_toolchain', 'run_h6_2_snapshots.sh'), 'utf8'),
    ]);

    const row = findOwnershipRow(ownershipDoc, TERRAIN_ROOT);
    assert.ok(row, 'ownership matrix should include the terrain snapshot row');
    assert.ok(row.includes('tests/terrain_snapshot_artifact_ownership.test.ts'), 'terrain row should name this guard');
    assert.ok(row.includes('run_h6_2_snapshots.ps1'), 'terrain row should cite the PowerShell H6.2 snapshot owner');
    assert.ok(row.includes('run_h6_2_snapshots.sh'), 'terrain row should cite the shell H6.2 snapshot owner');
    assert.ok(row.includes('Committed retained terrain snapshot evidence'), 'terrain row should classify retained terrain evidence');
    assert.ok(row.includes('Not transient while committed'), 'terrain row should distinguish terrain snapshots from scratch output');
    assert.ok(row.includes('separate from PMTiles'), 'terrain row should not collapse snapshots into PMTiles package artifacts');

    const { stdout } = await execFileAsync('git', ['ls-files', '--', TERRAIN_ROOT], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const trackedFiles = stdout.trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepStrictEqual(trackedFiles, EXPECTED_TERRAIN_FILES, 'tracked terrain snapshot filenames should stay fixed');

    assert.ok(toolchainReadme.includes('Produces deterministic terrain snapshot artifacts under `data/derived/terrain/`'));
    assert.ok(toolchainReadme.includes('toolchain.tools'), 'terrain README should name audit toolchain evidence');
    assert.ok(psRunner.includes('map:snapshot:osm-terrain:h6_2'), 'PowerShell runner should retain OSM snapshot owner command');
    assert.ok(psRunner.includes('map:snapshot:dem-clip:h6_2'), 'PowerShell runner should retain DEM snapshot owner command');
    assert.ok(shRunner.includes('map:snapshot:osm-terrain:h6_2'), 'shell runner should retain OSM snapshot owner command');
    assert.ok(shRunner.includes('map:snapshot:dem-clip:h6_2'), 'shell runner should retain DEM snapshot owner command');
});
