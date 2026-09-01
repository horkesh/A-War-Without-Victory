/**
 * Single source of truth for the parts of the vitest config that MUST be identical
 * everywhere tests run.
 *
 * There are three config surfaces: vitest.config.ts (direct runs) and two generated
 * configs — run_vitest_balanced.mjs (sharded, used by Full Suite) and
 * run_vitest_slice.mjs (used by Baseline Regression's fast slice). The generated ones
 * REPLACE the root config rather than extending it, so anything the root config installs
 * has to be repeated in both or it silently does not apply to CI.
 *
 * That divergence caused two real CI failures on 2026-09-01:
 *   1. The jsdom createObjectURL polyfill was added to the root config only, so sharded
 *      runs never got it.
 *   2. The slice config had silently drifted and was missing the maplibre-gl and
 *      @deck.gl/* aliases entirely — the exact aliases vitest.config.ts documents at
 *      length as load-bearing. Without the maplibre alias, a test's
 *      vi.mock('maplibre-gl') resolves a different module id than the component's own
 *      import when a nested src/ui/map/node_modules copy exists, so the mock never
 *      engages, the REAL module loads, and it crashes on jsdom's missing
 *      window.URL.createObjectURL at import time.
 *
 * Keep this list ordered most-specific-first: 'react-dom/server' must precede
 * 'react-dom', which must precede 'react', or the shorter key captures the longer paths.
 *
 * tests/run_vitest_balanced.test.ts pins all three surfaces against this module.
 */

export const VITEST_ALIASED_PACKAGES = [
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-dom/server',
    'react-dom/client',
    'react-dom',
    'react',
    'use-sync-external-store/shim/with-selector',
    'use-sync-external-store/shim',
    'use-sync-external-store',
    'zustand',
    'maplibre-gl',
    '@deck.gl/core',
    '@deck.gl/extensions',
    '@deck.gl/layers',
    '@deck.gl/mapbox',
];

/** Installed before each test file's module graph is evaluated. */
export const VITEST_SETUP_FILE = 'tools/test/jsdom_browser_polyfills.ts';

/** Alias entries for a generated config, as source lines at the given indent. */
export function renderAliasEntryLines(indent) {
    return VITEST_ALIASED_PACKAGES.map((pkg) => `${indent}'${pkg}': join(rootModules, '${pkg}'),`);
}

/** The setupFiles entry for a generated config, as a source line at the given indent. */
export function renderSetupFilesLine(indent) {
    return `${indent}setupFiles: [join(rootDir, '${VITEST_SETUP_FILE}')],`;
}
