/**
 * Browser APIs jsdom does not implement, but that our UI dependencies call at
 * *module-evaluation* time — before any test body can install them.
 *
 * maplibre-gl's entry module runs, at import:
 *
 *   if (typeof window !== 'undefined') {
 *     maplibregl.setWorkerUrl(window.URL.createObjectURL(new Blob([worker])));
 *   }
 *
 * jsdom has no URL.createObjectURL, so importing it in a jsdom suite throws
 * "TypeError: window.URL.createObjectURL is not a function" during collection and
 * fails the whole file. A `vi.mock('maplibre-gl', ...)` does not always save the
 * suite: as vitest.config.ts documents, a nested src/ui/map/node_modules copy can
 * resolve to a different module id than the mocked bare specifier, so the real
 * module still loads.
 *
 * Until 2026-09-01 this was masked by an accident. The ONLY definition of
 * createObjectURL in the repo lived inside a single test body of
 * tests/ui/ops_planning_target_discovery.test.ts, set on the shared jsdom
 * `window.URL` with `configurable: true` and never restored. Any suite that ran
 * after it in the same worker inherited the polyfill; any suite that ran before
 * it crashed. With `fileParallelism: false` the order was stable enough to hide
 * this, but CI runs the sharded runner, where adding ANY new test file
 * redistributes files across shards and can separate the two — which is exactly
 * how tests/ui/map_production_graphics_cleanup.test.ts started failing while
 * passing in isolation.
 *
 * Installing the polyfill here makes every jsdom suite self-sufficient: no suite
 * depends on another suite's leaked global, and shard composition stops being
 * load-bearing. Definitions are additive and skipped when a real implementation
 * exists, so a suite that installs its own stub still wins.
 */
if (typeof window !== 'undefined' && typeof window.URL !== 'undefined') {
    if (typeof window.URL.createObjectURL !== 'function') {
        Object.defineProperty(window.URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: () => 'blob:awwv-jsdom-polyfill',
        });
    }
    if (typeof window.URL.revokeObjectURL !== 'function') {
        Object.defineProperty(window.URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: () => undefined,
        });
    }
}
