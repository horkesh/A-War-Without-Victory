import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

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
        'npm run desktop:release:check && node .\\node_modules\\electron-builder\\cli.js --dir --publish never',
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
    assert.deepStrictEqual(build?.win?.target, ['dir']);
    assert.deepStrictEqual(
        packagedFiles,
        [
            'package.json',
            'src/desktop/electron-main.cjs',
            'src/desktop/preload.cjs',
            'src/desktop/autonomy_ipc_contract.cjs',
            'src/desktop/command_strain.cjs',
            'src/desktop/settings_store.cjs',
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
            ['assets', 'assets'],
        ],
        'extraResources should mirror the packaged resources layout assumed by electron-main.cjs',
    );

    const startupSnapshotEntry = extraResources.find((entry) => entry.from === 'data/derived');
    assert.ok(startupSnapshotEntry, 'packaged resources should include derived data, including the baked startup snapshot');
    assert.deepStrictEqual(
        startupSnapshotEntry?.filter,
        ['**/*'],
        'derived data should be copied deterministically without a second packaging-specific filter contract',
    );
});
