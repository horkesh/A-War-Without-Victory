import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

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
 *   2. The slice config had silently drifted from the root aliases. The root workspace
 *      lock now owns map/Deck identity directly; React/Zustand singleton and mock
 *      aliases remain shared here.
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
];

/**
 * The node_modules directory that holds `anchorPackage`, found the way Node's own
 * resolution walks: the first `node_modules` at or above `rootDir` that contains
 * `<anchorPackage>/package.json`.
 *
 * In the main checkout and in CI this is exactly `<rootDir>/node_modules`, so behaviour
 * there is unchanged. A git worktree under `.claude/worktrees/` usually has no
 * node_modules of its own; Node walks up to the main checkout's copy, but the old literal
 * `join(rootDir, 'node_modules')` aliased React to a directory that did not exist, so
 * every UI test failed with "Failed to resolve react" (2026-11-12). The walk only reads;
 * it never creates or removes links. When nothing is found it falls back to
 * `<rootDir>/node_modules`, so the failure message stays the familiar one.
 */
export function resolveRootModules(rootDir, anchorPackage = 'react') {
    const start = resolve(rootDir);
    let dir = start;
    for (;;) {
        const candidate = join(dir, 'node_modules');
        if (existsSync(join(candidate, anchorPackage, 'package.json'))) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return join(start, 'node_modules');
        dir = parent;
    }
}

/** The vitest CLI entrypoint, found through the same walk as the aliases. */
export function resolveVitestCli(rootDir) {
    return join(resolveRootModules(rootDir, 'vitest'), 'vitest', 'vitest.mjs');
}

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
