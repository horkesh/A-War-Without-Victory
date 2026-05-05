import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

/**
 * LANE-V094-INSTALLER-BLOAT-TRIM contract tests.
 *
 * These pin the v0.9.5 installer-bloat-trim deliverables. NSIS first-real-build
 * shipped at 1338MB; ~650MB was clear-cut waste in extraResources. This lane
 * tightens per-entry filter arrays to drop:
 *   - data/source/osm/*.osm.pbf (149MB) — raw OSM extract, build-only
 *   - data/source/historical data/*.pdf (21MB) — research source PDFs
 *   - data/source/*.zip (~10MB) — source archives with unzipped JSON companions
 *   - data/source/*.ts (negligible) — TypeScript code (loaders, schemas)
 *   - data/source/_inputs/, dem/, geo/ subtrees — derivation inputs
 *   - assets/raw_sora/ + **\/*.psd (30MB) — Photoshop source files
 *
 * Out-of-scope (deferred follow-up): data/derived/_debug/** (~313MB) and
 * data/derived/municipalities_mun1990_viewer_v1.geojson (322MB duplicate of
 * .gz). The predecessor desktop_packaging_contract.test.ts pins
 * data/derived's filter to ['**\/*'] exactly, blocking direct exclusion in
 * this lane. Documented in
 * docs/40_reports/implemented/20260505_V094_INSTALLER_BLOAT_TRIM.md.
 *
 * Verification is static config inspection only (matches sibling lanes —
 * actually invoking electron-builder is slow and host-dependent).
 */

type ExtraResource = { from?: string; to?: string; filter?: string[] };
type PackageJson = {
    build?: {
        extraResources?: ExtraResource[];
    };
};

function readPackageJson(): PackageJson {
    return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson;
}

function findEntry(extras: ExtraResource[], from: string): ExtraResource {
    const entry = extras.find((e) => e.from === from);
    if (!entry) {
        throw new Error(`extraResources entry with from='${from}' not found`);
    }
    return entry;
}

function isExcluded(filter: string[] | undefined, pattern: string): boolean {
    if (!filter) return false;
    return filter.includes(`!${pattern}`);
}

test('T1: data/source extraResources filter has bloat-exclusion patterns', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];
    const sourceEntry = findEntry(extras, 'data/source');
    const filter = sourceEntry.filter ?? [];

    assert.ok(
        filter.includes('**/*'),
        `data/source filter must include '**/*' as the base inclusion. Got: ${JSON.stringify(filter)}`,
    );
    assert.ok(
        filter.length > 1,
        `data/source filter must have exclusion patterns beyond '**/*'. Got: ${JSON.stringify(filter)}`,
    );
    const negativePatterns = filter.filter((p) => p.startsWith('!'));
    assert.ok(
        negativePatterns.length >= 5,
        `data/source filter must have at least 5 negative patterns to trim known bloat. Got: ${JSON.stringify(negativePatterns)}`,
    );
});

test('T2: data/source raw OSM PBF (149MB) is excluded', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];
    const sourceEntry = findEntry(extras, 'data/source');
    const filter = sourceEntry.filter ?? [];

    // Either the explicit osm/ subtree or **/*.pbf wildcard (or both) must be excluded.
    const osmExcluded = isExcluded(filter, 'osm/**') || isExcluded(filter, '**/*.pbf');
    assert.ok(
        osmExcluded,
        `data/source/osm/bosnia-herzegovina-latest.osm.pbf (149MB) must be excluded via 'osm/**' or '**/*.pbf' negative pattern. Got: ${JSON.stringify(filter)}`,
    );
});

test('T3: data/source historical-data PDFs (21MB+) are excluded', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];
    const sourceEntry = findEntry(extras, 'data/source');
    const filter = sourceEntry.filter ?? [];

    const pdfExcluded = isExcluded(filter, 'historical data/**') || isExcluded(filter, '**/*.pdf');
    assert.ok(
        pdfExcluded,
        `data/source/historical data/Balkan_BattlegroundsI.pdf (21MB) must be excluded via 'historical data/**' or '**/*.pdf' negative pattern. Got: ${JSON.stringify(filter)}`,
    );
});

test('T4: assets entry excludes raw_sora/ and PSD source files (30MB)', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];
    const assetsEntry = findEntry(extras, 'assets');
    const filter = assetsEntry.filter ?? [];

    assert.ok(
        filter.includes('**/*'),
        `assets filter must include '**/*' as the base inclusion. Got: ${JSON.stringify(filter)}`,
    );
    const rawSoraExcluded = isExcluded(filter, 'raw_sora/**');
    const psdExcluded = isExcluded(filter, '**/*.psd');
    assert.ok(
        rawSoraExcluded,
        `assets/raw_sora/ (Photoshop source tree) must be excluded via '!raw_sora/**'. Got: ${JSON.stringify(filter)}`,
    );
    assert.ok(
        psdExcluded,
        `assets/**/*.psd (Photoshop source files) must be excluded via '!**/*.psd'. Got: ${JSON.stringify(filter)}`,
    );
});

test('T5: data/source source archives (.zip) and code (.ts) are excluded', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];
    const sourceEntry = findEntry(extras, 'data/source');
    const filter = sourceEntry.filter ?? [];

    assert.ok(
        isExcluded(filter, '**/*.zip'),
        `data/source/*.zip archives (have unzipped JSON companions) must be excluded. Got: ${JSON.stringify(filter)}`,
    );
    assert.ok(
        isExcluded(filter, '**/*.ts'),
        `data/source/*.ts source files (census-loader.ts, settlement.ts — code, not data) must be excluded. Got: ${JSON.stringify(filter)}`,
    );
});

test('T6: required runtime resources remain included (not blanket-excluded)', () => {
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];

    // data/derived must remain ['**/*'] so the runtime can fetch:
    //   - tiles/osm.pmtiles (438MB, served by PMTilesProtocol)
    //   - operational/operational_settlements.geojson (DataLoader.ts)
    //   - operational/operational_political_control.json
    //   - operational/operational_contact_graph.json
    //   - operational/canonical_to_operational_map.json
    //   - terrain/settlements_terrain_scalars.json
    //   - startup/apr_1992_initial_save.json (electron-main.cjs:782)
    //   - latest_run_final_save.json
    const derivedEntry = findEntry(extras, 'data/derived');
    assert.deepStrictEqual(
        derivedEntry.filter,
        ['**/*'],
        'data/derived filter must remain ["**/*"] (predecessor contract pin); _debug/ exclusion is deferred follow-up.',
    );

    // data/source must still include political-controller, OOB, and census files
    // referenced by scenario loaders. The bloat-exclusion filter targets specific
    // subtrees and extensions, not the whole tree, so root JSON files survive.
    const sourceEntry = findEntry(extras, 'data/source');
    const sourceFilter = sourceEntry.filter ?? [];
    assert.ok(sourceFilter.includes('**/*'), 'data/source must still match **/* to ship runtime political-controller, OOB, and census JSON');
    assert.ok(!isExcluded(sourceFilter, '**/*.json'), 'JSON files in data/source must NOT be blanket-excluded (oob_brigades.json, oob_corps.json, master_census_clean.json, municipalities_1990_initial_political_controllers*.json, municipality_political_controllers.json all runtime).');
    assert.ok(!isExcluded(sourceFilter, 'calibration/**'), 'data/source/calibration/ must remain — painted_control_jan1993.json is read by anomaly_checks_extended.ts (PAINTED_CONTROL_PATH).');
    assert.ok(!isExcluded(sourceFilter, 'boundaries/**'), 'data/source/boundaries/ must remain — bih_adm3_1990.geojson is fetched by tactical map style (awwv_map_style.json) and painter.html.');

    // assets/crests, assets/ui — must still ship for warroom and tactical map
    const assetsEntry = findEntry(extras, 'assets');
    const assetsFilter = assetsEntry.filter ?? [];
    assert.ok(assetsFilter.includes('**/*'), 'assets must still match **/* to ship runtime crests, ui, and processed images');
    assert.ok(!isExcluded(assetsFilter, 'crests/**'), 'assets/crests/ must remain (used by warroom for faction crests/flags).');
    assert.ok(!isExcluded(assetsFilter, 'ui/**'), 'assets/ui/ must remain (used by tactical map and warroom for UI iconography).');
    assert.ok(!isExcluded(assetsFilter, '**/*.webp'), 'WebP runtime crest/flag images must NOT be blanket-excluded.');
});

test('T7: predecessor desktop_packaging_contract.test.ts invariants remain green', () => {
    // This test mirrors the load-bearing pinned shape in
    // desktop_packaging_contract.test.ts (lines 75-95). If this passes, the
    // predecessor's full extraResources contract (from/to pair list and the
    // strict ['**/*'] filter on data/derived) is still honored by the
    // package.json this lane modifies.
    const pkg = readPackageJson();
    const extras = pkg.build?.extraResources ?? [];

    assert.deepStrictEqual(
        extras.map((entry) => [entry.from, entry.to]),
        [
            ['dist/desktop', 'dist/desktop'],
            ['dist/tactical-map', 'app'],
            ['dist/warroom', 'app/warroom'],
            ['data/derived', 'data/derived'],
            ['data/source', 'data/source'],
            ['data/ui', 'data/ui'],
            ['assets', 'assets'],
        ],
        'extraResources [from,to] pair list must remain identical to the predecessor contract pin.',
    );

    const derivedEntry = findEntry(extras, 'data/derived');
    assert.deepStrictEqual(
        derivedEntry.filter,
        ['**/*'],
        "data/derived filter must remain ['**/*'] — predecessor pin in desktop_packaging_contract.test.ts.",
    );
});
