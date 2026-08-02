import { defineConfig } from 'vitest/config';
import { join } from 'path';
import { discoverTests, toRepoRelative } from './tools/test/discover_test_files.mjs';

const rootDir = process.cwd();
const discovered = discoverTests(rootDir);
const include = toRepoRelative(rootDir, discovered.vitestFiles);
const environmentMatchGlobs = discovered.jsdomVitestFiles.map((file) => [
  toRepoRelative(rootDir, [file])[0],
  'jsdom',
]);

// Prevent dual-React: UI workspace (src/ui/map/node_modules) has its own
// react, react-dom, and use-sync-external-store. Force all imports to the
// root copies so Zustand hooks and react-dom/server share one dispatcher.
const rootModules = join(rootDir, 'node_modules');

// maplibre-gl and @deck.gl/mapbox have the same dual-dependency hazard, but
// platform-dependent: a fresh `npm install --prefix src/ui/map` on Linux CI
// creates nested src/ui/map/node_modules copies that don't exist on a
// Windows checkout with a different install history. A test file's
// `vi.mock('maplibre-gl', ...)` resolves the bare specifier relative to the
// TEST file (tests/**, outside src/ui/map -> finds the root copy), while
// MapContainer.tsx's own `import maplibregl from 'maplibre-gl'` resolves
// relative to ITS location (inside src/ui/map -> finds the nested copy when
// one exists). When both copies exist those are two different resolved
// module ids, so the mock silently never engages and the real maplibre-gl
// loads and crashes on jsdom's missing window.URL.createObjectURL -
// reproduced 2026-08-02 on Linux CI, invisible on a Windows checkout with no
// nested copy. Alias both to the root copy so there is only ever one
// resolved id, exactly like the dual-React fix above.
export default defineConfig({
  resolve: {
    alias: {
      'react/jsx-runtime': join(rootModules, 'react/jsx-runtime'),
      'react/jsx-dev-runtime': join(rootModules, 'react/jsx-dev-runtime'),
      'react-dom/server': join(rootModules, 'react-dom/server'),
      'react-dom/client': join(rootModules, 'react-dom/client'),
      'react-dom': join(rootModules, 'react-dom'),
      'react': join(rootModules, 'react'),
      'use-sync-external-store/shim/with-selector': join(rootModules, 'use-sync-external-store/shim/with-selector'),
      'use-sync-external-store/shim': join(rootModules, 'use-sync-external-store/shim'),
      'use-sync-external-store': join(rootModules, 'use-sync-external-store'),
      'zustand': join(rootModules, 'zustand'),
      'maplibre-gl': join(rootModules, 'maplibre-gl'),
      '@deck.gl/mapbox': join(rootModules, '@deck.gl/mapbox'),
    },
  },
  test: {
    include,
    globals: false,
    environment: 'node',
    environmentMatchGlobs,
    testTimeout: 120_000,
    fileParallelism: false,
    minWorkers: 1,
    maxWorkers: 1,
  }
});
