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
});
