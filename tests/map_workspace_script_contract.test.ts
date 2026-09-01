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

test('tactical map build leaves app source unchunked so the chunk graph stays acyclic', () => {
    const config = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'vite.config.ts'), 'utf8');

    // INVERTED DELIBERATELY (2026-09-01). This test used to require a manual
    // 'map-geometry' chunk for /src/ui/map/map/builders/. ccc98891f removed that chunk
    // BECAUSE it shipped a broken app: the tactical map's modules form a strongly
    // connected component (army_hq, map-rendering, map-geometry, warroom all import one
    // another), so a manual chunk cutting through it produced 26 chunk cycles and a
    // production bundle that threw "Cannot access 'ir' before initialization" before
    // React could mount — the packaged desktop fell back to its legacy recovery menu.
    // Dev never saw it because dev does not chunk-split.
    //
    // Restoring the old assertion would reintroduce that crash, so the contract is now
    // the opposite one: app source must NOT be manually chunked. Only leaves that cannot
    // import back into app source (vendor packages, large static JSON) may be named.
    assert.doesNotMatch(
        config,
        /manualChunks[\s\S]*normalized\.includes\('\/src\/ui\/map\/(?!.*node_modules)/,
        'app source must not be manually chunked — it cuts the SCC and produces a cyclic chunk graph',
    );
    assert.match(
        config,
        /Rollup's automatic chunking keeps modules that are cyclic in the same chunk/,
        'the rationale for leaving app source unchunked must stay documented next to the code',
    );
    assert.match(
        config,
        /check_chunk_cycles\.cjs/,
        'vite.config must point at the cycle checker that guards this invariant',
    );
    assert.match(
        config,
        /chunkSizeWarningLimit:\s*3000/,
        'the tactical map warning boundary must match the unchunked build (raised from 1200 when source-level manualChunks were removed)',
    );
});
