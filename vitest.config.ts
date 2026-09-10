import { defineConfig } from 'vitest/config';
import { join } from 'path';
import { discoverTests, toRepoRelative } from './tools/test/discover_test_files.mjs';

const rootDir = process.cwd();
const discovered = discoverTests(rootDir);
const include = toRepoRelative(rootDir, discovered.vitestFiles);
const environmentMatchGlobs: Array<[string, 'jsdom']> = discovered.jsdomVitestFiles.map((file) => [
  toRepoRelative(rootDir, [file])[0],
  'jsdom',
]);

// Prevent dual-React: UI workspace (src/ui/map/node_modules) has its own
// react, react-dom, and use-sync-external-store. Force all imports to the
// root copies so Zustand hooks and react-dom/server share one dispatcher.
const rootModules = join(rootDir, 'node_modules');

// The root workspace lock now gives maplibre-gl and the @deck.gl/* family one
// physical production/test identity. Keep the React/Zustand aliases because
// their singleton and mock identity remain part of the test contract.
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
    },
  },
  test: {
    include,
    globals: false,
    environment: 'node',
    environmentMatchGlobs,
    // Install jsdom browser polyfills before each test file's module graph is
    // evaluated. maplibre-gl calls window.URL.createObjectURL at import time, so this
    // cannot wait for a test body — see the file for the ordering accident this
    // replaces.
    setupFiles: [join(rootDir, 'tools/test/jsdom_browser_polyfills.ts')],
    testTimeout: 120_000,
    fileParallelism: false,
    minWorkers: 1,
    maxWorkers: 1,
  }
});
