import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

const RESEARCH_ROOTS = [
    'data/derived/scenario/baseline_ops_sensitivity',
    'data/derived/scenario/baseline_ops_sensitivity_run2',
    'data/derived/scenario/recruitment_test_matrix_2026_02_11',
    'data/derived/scenario/sweeps',
] as const;

const EXPECTED_NEGATIVE_FILTERS = RESEARCH_ROOTS.map(
    (root) => `!${root.replace('data/derived/', '')}/**`,
);

const strictCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

test('release resources retain production inputs while excluding the four reviewed research roots', () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
        build?: { extraResources?: Array<{ from?: string; to?: string; filter?: string[] }> };
    };
    const resources = packageJson.build?.extraResources ?? [];
    const resource = (from: string) => resources.find((entry) => entry.from === from);

    // Positive controls come first: the release must still copy every supported
    // runtime family before the narrow research-only negatives are evaluated.
    assert.deepEqual(resource('dist/desktop'), {
        from: 'dist/desktop',
        to: 'dist/desktop',
        filter: ['desktop_sim.cjs'],
    });
    assert.deepEqual(resource('dist/tactical-map'), {
        from: 'dist/tactical-map',
        to: 'app',
        filter: ['**/*'],
    });
    assert.deepEqual(resource('dist/warroom'), {
        from: 'dist/warroom',
        to: 'app/warroom',
        filter: ['**/*'],
    });
    assert.ok(resource('data/derived')?.filter?.includes('**/*'));
    assert.ok(resource('data/source')?.filter?.includes('**/*'));
    assert.deepEqual(resource('data/ui'), {
        from: 'data/ui',
        to: 'data/ui',
        filter: ['**/*'],
    });
    assert.deepEqual(resource('data/scenarios/events'), {
        from: 'data/scenarios/events',
        to: 'data/scenarios/events',
        filter: ['**/*'],
    });
    assert.ok(resource('assets')?.filter?.includes('**/*'));

    const requiredSourceFiles = [
        'assets/ui/icons/icon_warning.svg',
        'data/derived/census_rolled_up_wgs84.json',
        'data/derived/municipality_hq_settlement.json',
        'data/derived/municipality_population_1991.json',
        'data/derived/operational/operational_settlements.geojson',
        'data/derived/settlement_ethnicity_data.json',
        'data/derived/settlements_wgs84_1990.geojson',
        'data/derived/startup/apr_1992_initial_save.json',
        'data/derived/terrain/settlements_terrain_scalars.json',
        'data/derived/tiles/osm.pmtiles',
        'data/scenarios/events/consequences.json',
        'data/scenarios/events/war_1992.json',
        'data/scenarios/events/war_1992_hrhb_summer.json',
        'data/scenarios/events/war_1993.json',
        'data/scenarios/events/war_1994.json',
        'data/scenarios/events/war_1995.json',
        'data/source/municipalities_1990_registry_110.json',
        'data/source/oob_brigades.json',
        'data/source/settlements_initial_master.json',
        'data/ui/hq_hrhb_clickable_regions.json',
        'data/ui/hq_rbih_clickable_regions.json',
        'data/ui/hq_rs_clickable_regions.json',
        'src/ui/map/public/font/Open Sans Bold/0-255.pbf',
        'src/ui/map/public/font/Open Sans Bold/256-511.pbf',
    ].sort(strictCompare);
    for (const relativePath of requiredSourceFiles) {
        assert.ok(existsSync(join(root, relativePath)), `missing positive release input: ${relativePath}`);
    }

    const trackedResearchPaths = execFileSync(
        'git',
        ['ls-files', '-z', '--', ...RESEARCH_ROOTS],
        { cwd: root, encoding: 'utf8' },
    ).split('\0').filter(Boolean).sort(strictCompare);
    const trackedResearchBytes = trackedResearchPaths.reduce(
        (total, relativePath) => total + statSync(join(root, relativePath)).size,
        0,
    );
    assert.equal(trackedResearchPaths.length, 239, 'all reviewed research source files must remain tracked');
    assert.equal(trackedResearchBytes, 53_031_799, 'reviewed research source bytes must remain intact');

    const derivedFilters = resource('data/derived')?.filter ?? [];
    for (const negativeFilter of EXPECTED_NEGATIVE_FILTERS) {
        assert.ok(
            derivedFilters.includes(negativeFilter),
            `data/derived release filter must exclude ${negativeFilter}`,
        );
    }
});
