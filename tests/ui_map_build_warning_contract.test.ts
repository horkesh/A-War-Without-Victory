import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tactical map build warning contracts', () => {
  it('aliases Node child_process for browser-only loaders.gl re-exports', () => {
    const config = readFileSync(resolve('src/ui/map/vite.config.ts'), 'utf8');

    expect(config).toContain("'child_process'");
    expect(config).toContain('browserChildProcessShim');
  });

  /**
   * SUPERSEDED 2026-08-29. This used to require explicit chunk boundaries for app
   * source — feature-army-hq{,-records,-operations,-forces}, feature-warroom-ui,
   * feature-chronicle, map-rendering, map-sim — to keep any single chunk under the
   * size warning limit.
   *
   * Those boundaries cut through a strongly-connected set of modules and produced a
   * CYCLIC chunk graph: 26 cycles across 30 chunks. ES module init order then broke
   * and the production bundle threw "Cannot access 'ir' before initialization" before
   * React mounted, so the packaged desktop app fell back to its legacy recovery menu.
   * A warning-free build is not worth a bundle that does not run.
   *
   * The contract is now the inverse for app source: manual chunks are for leaves only
   * — third-party packages and large static JSON — which cannot import back into app
   * code and so cannot form a cycle. tools/ui/check_chunk_cycles.cjs enforces the
   * real invariant on the build output and runs inside desktop:release:check.
   */
  it('manually chunks only leaves, never app source', () => {
    const config = readFileSync(resolve('src/ui/map/vite.config.ts'), 'utf8');

    expect(config).toContain('manualChunks');
    // Vendor and static-data boundaries are still pinned: these are safe leaves.
    expect(config).toContain('vendor-maplibre');
    expect(config).toContain('vendor-react');
    expect(config).toContain('event-catalog-');
    expect(config).toContain('codex-essay-index');

    // App-source chunk names must not come back. Strip comments first so the
    // rationale above cannot satisfy or trip these checks.
    const code = config.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const forbidden of [
      'feature-army-hq',
      'feature-warroom-ui',
      'feature-chronicle',
      'feature-ops-planning',
      'map-rendering',
      'map-geometry',
      'map-sim',
    ]) {
      expect(code, `${forbidden} is an app-source chunk and must not be manually named`).not.toContain(forbidden);
    }
  });

  it('keeps minimap map-data helpers as static imports', () => {
    const minimap = readFileSync(resolve('src/ui/map/components/Minimap.tsx'), 'utf8');

    expect(minimap).toContain("from '../data/DataLoader'");
    expect(minimap).toContain("from '../map/builders/buildControlGeoJSON'");
    expect(minimap).toContain("from '../map/builders/buildFrontLinesGeoJSON'");
    expect(minimap).not.toMatch(/import\(['"]\.\.\/data\/DataLoader['"]\)/);
    expect(minimap).not.toMatch(/import\(['"]\.\.\/map\/builders\/buildControlGeoJSON['"]\)/);
    const viewport = readFileSync(resolve('src/ui/map/components/TacticalMapViewport.tsx'), 'utf8');
    expect(viewport).toContain('minimapMounted && (');
    expect(viewport).not.toMatch(/import\(['"]\.\/Minimap['"]\)/);
    expect(minimap).not.toMatch(/import\(['"]\.\.\/map\/builders\/buildFrontLinesGeoJSON['"]\)/);
  });
});
