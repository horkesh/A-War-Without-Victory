import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const THIS_TEST = 'tests/map_derived_artifact_ownership.test.ts';

const EXPECTED_GEOREF_FILES = [
    'data/derived/georef/adm3_crosswalk_candidates.json',
    'data/derived/georef/adm3_crosswalk_final.json',
    'data/derived/georef/adm3_world_centroids.json',
    'data/derived/georef/audit_georef_report.json',
    'data/derived/georef/audit_georef_report.txt',
    'data/derived/georef/svg_municipality_centroids.json',
    'data/derived/georef/svg_to_world_transform.json',
    'data/derived/georef/world_to_svg_transform.json',
];

const EXPECTED_OPERATIONAL_FILES = [
    'data/derived/operational/canonical_to_operational_map.json',
    'data/derived/operational/forest_osids.json',
    'data/derived/operational/operational_contact_graph.json',
    'data/derived/operational/operational_initial_master.json',
    'data/derived/operational/operational_political_control.json',
    'data/derived/operational/operational_settlements.geojson',
    'data/derived/operational/osid_areas.json',
    'data/derived/operational/triple_junctions.json',
    'data/derived/operational/urban_osids.json',
];

const EXPECTED_MUNICIPALITY_AUDIT_FILES = [
    'data/derived/municipality_audit/border_id_diagnostic.csv',
    'data/derived/municipality_audit/border_id_diagnostic.json',
    'data/derived/municipality_audit/municipalities_zero_settlements.csv',
    'data/derived/municipality_audit/municipality_geometry_failures_diagnostic.csv',
    'data/derived/municipality_audit/municipality_geometry_failures_diagnostic.json',
    'data/derived/municipality_audit/settlement_muni_alignment_report.json',
    'data/derived/municipality_audit/settlements_missing_muni_ref.csv',
    'data/derived/municipality_audit/settlements_unknown_muni_ref.csv',
];

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

async function trackedFiles(repoRoot: string, root: string): Promise<string[]> {
    const { stdout } = await execFileAsync('git', ['ls-files', '--', root], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    return stdout.trim().split(/\r?\n/).filter(Boolean).sort();
}

function assertRetainedMapArtifactRow(row: string | undefined, artifact: string): asserts row is string {
    assert.ok(row, `ownership matrix should include ${artifact}`);
    assert.ok(row.includes(THIS_TEST), `${artifact} row should name this guard`);
    assert.ok(row.includes('Committed retained'), `${artifact} row should classify retained committed evidence`);
    assert.ok(row.includes('Not transient while committed'), `${artifact} row should not classify retained evidence as scratch output`);
}

test('georef, operational, and municipality audit artifacts have retained ownership rows', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, mapBuildSystem, mapToolsReadme, packageJson] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'docs', '20_engineering', 'MAP_BUILD_SYSTEM.md'), 'utf8'),
        readFile(join(repoRoot, 'tools', 'map', 'README.md'), 'utf8'),
        readFile(join(repoRoot, 'package.json'), 'utf8'),
    ]);

    const georefRow = findOwnershipRow(ownershipDoc, 'data/derived/georef/');
    const operationalRow = findOwnershipRow(ownershipDoc, 'data/derived/operational/');
    const municipalityAuditRow = findOwnershipRow(ownershipDoc, 'data/derived/municipality_audit/');

    assertRetainedMapArtifactRow(georefRow, 'data/derived/georef/');
    assertRetainedMapArtifactRow(operationalRow, 'data/derived/operational/');
    assertRetainedMapArtifactRow(municipalityAuditRow, 'data/derived/municipality_audit/');

    assert.ok(georefRow.includes('phase_h6_0_build_svg_to_world_georef.ts'), 'georef row should cite H6.0 georef owner');
    assert.ok(georefRow.includes('phase_h6_12_build_world_to_svg_transform.ts'), 'georef row should cite H6.12 inverse transform owner');
    assert.ok(georefRow.includes('map:contracts:validate'), 'georef row should cite map contract validation');

    assert.ok(operationalRow.includes('map:derive:operational-settlements'), 'operational row should cite settlement owner');
    assert.ok(operationalRow.includes('map:derive:operational-osid-first'), 'operational row should cite OSID-first owner');
    assert.ok(operationalRow.includes('map:derive:operational-initial-master'), 'operational row should cite initial master owner');

    assert.ok(municipalityAuditRow.includes('audit:muni:diagnose-borders'), 'municipality audit row should cite border diagnostic owner');
    assert.ok(municipalityAuditRow.includes('audit:settlements:muni'), 'municipality audit row should cite settlement alignment owner');
    assert.ok(municipalityAuditRow.includes('map:extract:muni:drzava'), 'municipality audit row should cite geometry failure diagnostic owner');

    assert.deepStrictEqual(await trackedFiles(repoRoot, 'data/derived/georef'), EXPECTED_GEOREF_FILES);
    assert.deepStrictEqual(await trackedFiles(repoRoot, 'data/derived/operational'), EXPECTED_OPERATIONAL_FILES);
    assert.deepStrictEqual(await trackedFiles(repoRoot, 'data/derived/municipality_audit'), EXPECTED_MUNICIPALITY_AUDIT_FILES);

    assert.ok(mapBuildSystem.includes('georef remains in `data/derived/georef/` for A1 TPS projection'));
    assert.ok(mapBuildSystem.includes('npm run map:derive:operational-settlements'));
    assert.ok(mapBuildSystem.includes('npm run map:derive:operational-osid-first'));
    assert.ok(mapBuildSystem.includes('npm run map:derive:operational-initial-master'));
    assert.ok(mapToolsReadme.includes('npm run audit:muni:diagnose-borders'));
    assert.ok(mapToolsReadme.includes('npm run audit:settlements:muni'));
    assert.ok(mapToolsReadme.includes('municipality_geometry_failures_diagnostic.json'));
    assert.ok(packageJson.includes('"map:extract:muni:drzava"'));
});
