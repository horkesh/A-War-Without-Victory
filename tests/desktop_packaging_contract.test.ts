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
        build?.files,
        ['package.json', 'src/desktop/electron-main.cjs', 'src/desktop/preload.cjs'],
        'packaged desktop should only ship the Electron entrypoints from app.asar; runtime bundles belong in extraResources',
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
