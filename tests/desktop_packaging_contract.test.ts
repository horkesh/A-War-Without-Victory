import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

type PackageJson = {
    scripts?: Record<string, string>;
    build?: {
        appId?: string;
        productName?: string;
        directories?: { output?: string };
        files?: string[];
        extraResources?: Array<{ from?: string; to?: string; filter?: string[] }>;
        win?: { target?: string[]; signAndEditExecutable?: boolean };
    };
};

async function readPackageJson(): Promise<PackageJson> {
    return JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson;
}

test('package.json exposes one canonical packaged-desktop command that inherits the release guard', async () => {
    const packageJson = await readPackageJson();

    assert.strictEqual(
        packageJson.scripts?.['desktop:package:dir'],
        'npm run desktop:release:check && electron-builder --dir --publish never',
        'desktop packaging should transitively enforce the canonical desktop release check path',
    );
});

test('electron-builder config matches the packaged runtime resource contract', async () => {
    const packageJson = await readPackageJson();
    const build = packageJson.build;
    const extraResources = build?.extraResources ?? [];
    const electronMainSource = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');
    const packagedFiles = build?.files ?? [];
    const localDesktopCjsDeps = Array.from(new Set(
        Array.from(
            electronMainSource.matchAll(/require\('\.\/([^']+\.cjs)'\)/g),
            (match) => `src/desktop/${match[1]}`,
        ),
    )).sort();

    assert.strictEqual(build?.appId, 'com.awwv.desktop');
    assert.strictEqual(build?.productName, 'A War Without Victory');
    assert.strictEqual(build?.directories?.output, 'dist-packaged');
    assert.strictEqual(
        build?.win?.signAndEditExecutable,
        false,
        'bounded dir-target packaging should stay explicitly unsigned instead of depending on Windows sign/edit helper downloads',
    );
    // Per LANE-NIGHTSHIFT-PLATFORM-PACKAGING-GROUNDWORK (v0.9.5 prep):
    // 'nsis' added to Win build targets for unsigned NSIS installer
    // groundwork. signAndEditExecutable: false above remains binding.
    assert.deepStrictEqual(build?.win?.target, ['dir', 'nsis']);
    assert.deepStrictEqual(
        packagedFiles,
        [
            'package.json',
            'src/desktop/electron-main.cjs',
            'src/desktop/preload.cjs',
            'src/desktop/autonomy_ipc_contract.cjs',
            'src/desktop/command_strain.cjs',
            'src/desktop/convoy_ipc_contract.cjs',
            'src/desktop/officer_decision_history.cjs',
            'src/desktop/player_visible_state.cjs',
            'src/desktop/settings_store.cjs',
            'src/desktop/author_op_staging.cjs',
            'src/desktop/op_halt.cjs',
            'src/desktop/op_directive_staging.cjs',
            'src/desktop/municipality_support_staging.cjs',
            'src/desktop/co_replacement.cjs',
            'src/desktop/front_visit_contract.cjs',
            'src/desktop/address_nation_contract.cjs',
            'src/desktop/decorate_unit_contract.cjs',
        ],
        'packaged desktop should ship the Electron entrypoints and any local main-process CJS helpers that electron-main.cjs requires from app.asar',
    );
    assert.deepStrictEqual(
        localDesktopCjsDeps,
        packagedFiles.filter((file) => file.startsWith('src/desktop/') && file.endsWith('.cjs') && file !== 'src/desktop/electron-main.cjs' && file !== 'src/desktop/preload.cjs').sort(),
        'every local main-process CJS helper required by electron-main.cjs should be included in packaged app files',
    );

    assert.deepStrictEqual(
        extraResources.map((entry) => [entry.from, entry.to]),
        [
            ['dist/desktop', 'dist/desktop'],
            ['dist/tactical-map', 'app'],
            ['dist/warroom', 'app/warroom'],
            ['data/derived', 'data/derived'],
            ['data/source', 'data/source'],
            ['data/ui', 'data/ui'],
            ['data/scenarios/events', 'data/scenarios/events'],
            ['assets', 'assets'],
        ],
        'extraResources should mirror the packaged resources layout assumed by electron-main.cjs (data/scenarios/events ships so loadEventDefinitionsFromDir resolves on Advance Turn in a packaged build)',
    );

    const startupSnapshotEntry = extraResources.find((entry) => entry.from === 'data/derived');
    assert.ok(startupSnapshotEntry, 'packaged resources should include derived data, including the baked startup snapshot');
    // LANE-V094-INSTALLER-BLOAT-TRIM-PHASE-2 widened this filter from
    // ['**/*'] to include two negative patterns trimming runtime-orphan
    // bloat from the NSIS installer (see
    // docs/40_reports/implemented/20260505_V094_INSTALLER_BLOAT_TRIM_PHASE_2.md):
    //   !**/_debug/** — phaseD0-F4 / phase3a_ab_harness build-time outputs (~398MB)
    //   !**/municipalities_mun1990_viewer_v1.geojson — build-only viewer geojson (~322MB)
    // Both paths verified zero src/ runtime references.
    const derivedFilter = startupSnapshotEntry?.filter ?? [];
    assert.ok(
        derivedFilter.includes('**/*'),
        'derived data filter must include "**/*" as the base inclusion to ship runtime tiles, operational geojson, and startup snapshot',
    );
    assert.ok(
        derivedFilter.includes('!**/_debug/**'),
        'derived data filter must exclude "**/_debug/**" — phaseD0-F4 / phase3a_ab_harness build-only outputs are runtime-orphan',
    );
    assert.ok(
        derivedFilter.includes('!**/municipalities_mun1990_viewer_v1.geojson'),
        'derived data filter must exclude "**/municipalities_mun1990_viewer_v1.geojson" — build-only viewer geojson with .gz companion is runtime-orphan',
    );
});
