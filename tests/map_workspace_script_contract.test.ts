import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

type PackageJson = {
    scripts?: Record<string, string>;
};

function readPackageJson(path: string): PackageJson {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
}

test('root map scripts route through the map workspace Vite entrypoint', () => {
    const rootPkg = readPackageJson(join(process.cwd(), 'package.json'));
    const mapPkg = readPackageJson(join(process.cwd(), 'src', 'ui', 'map', 'package.json'));

    assert.strictEqual(mapPkg.scripts?.dev, 'vite', 'map workspace owns the Vite dev command');
    assert.strictEqual(mapPkg.scripts?.build, 'tsc -b && vite build', 'map workspace owns the Vite build command');
    assert.strictEqual(
        rootPkg.scripts?.['dev:map'],
        'node src/ui/map/node_modules/vite/bin/vite.js --config src/ui/map/vite.config.ts --host 127.0.0.1',
        'documented root dev:map command must not depend on a root .bin vite shim',
    );
    assert.strictEqual(
        rootPkg.scripts?.['desktop:map:build'],
        'node src/ui/map/node_modules/vite/bin/vite.js build --config src/ui/map/vite.config.ts',
        'desktop map build must use the workspace-local Vite entrypoint without changing release typecheck scope',
    );
    assert.strictEqual(
        rootPkg.scripts?.['warroom:build'],
        'node node_modules/vite/bin/vite.js build --config src/ui/warroom/vite.config.ts && tsx tools/ui/warroom_stage_assets.ts',
        'Warroom build must not depend on a PATH-provided Vite shim on Windows',
    );
});

test('Warroom Vite build declares browser-safe warning boundaries', () => {
    const config = readFileSync(join(process.cwd(), 'src', 'ui', 'warroom', 'vite.config.ts'), 'utf8');

    assert.match(
        config,
        /browserChildProcessShim/,
        'Warroom build must alias child_process to the browser shim so loaders.gl worker helpers do not warn',
    );
    assert.match(
        config,
        /\{\s*find:\s*'node:child_process',\s*replacement:\s*browserChildProcessShim\s*\}/,
        'Warroom build must cover node:child_process imports as well as child_process',
    );
    assert.match(
        config,
        /chunkSizeWarningLimit:\s*900/,
        'Warroom build should set an explicit chunk warning limit for its shared player-safe text chunk',
    );
});

test('tactical map build keeps geometry builders out of the interactive map chunk', () => {
    const config = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'vite.config.ts'), 'utf8');

    assert.match(
        config,
        /normalized\.includes\('\/src\/ui\/map\/map\/builders\/'\).*return 'map-geometry'/,
        'GeoJSON builders must have a stable chunk separate from the interactive map shell',
    );
    assert.match(
        config,
        /normalized\.endsWith\('\/src\/ui\/map\/map\/generateFactionBorders\.ts'\).*return 'map-geometry'/,
        'the front-line geometry helper must stay with its builder chunk to prevent a circular chunk edge',
    );
    assert.match(
        config,
        /chunkSizeWarningLimit:\s*1200/,
        'the tactical map warning boundary must not be raised to hide oversized chunks',
    );
});
