import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tactical map build warning contracts', () => {
  it('aliases Node child_process for browser-only loaders.gl re-exports', () => {
    const config = readFileSync(resolve('src/ui/map/vite.config.ts'), 'utf8');

    expect(config).toContain("'child_process'");
    expect(config).toContain('browserChildProcessShim');
  });

  it('uses explicit Rollup chunk boundaries for the tactical map bundle', () => {
    const config = readFileSync(resolve('src/ui/map/vite.config.ts'), 'utf8');

    expect(config).toContain('manualChunks');
    expect(config).toContain('vendor-maplibre');
    expect(config).toContain('feature-warroom-ui');
    // ONE army_hq chunk, and it must STAY one.
    //
    // This test previously required four: feature-army-hq{,-records,-operations,-forces}.
    // That layout split one directory across chunks by FILENAME, which produced a
    // circular chunk dependency and a TDZ crash -- the tactical map rendered a blank
    // screen on launch (fixed 2026-08-27 by collapsing them). The old assertions
    // therefore pinned the broken arrangement in place.
    //
    // Two of them had also stopped testing anything: this contract greps the config
    // TEXT, so `-forces` and `-operations` were still satisfied by the explanatory
    // COMMENT left behind by the fix. A string-presence check cannot tell code from
    // prose, so assert on the returned chunk names specifically.
    expect(config).toContain("return 'feature-army-hq'");
    expect(config).not.toContain("return 'feature-army-hq-records'");
    expect(config).not.toContain("return 'feature-army-hq-operations'");
    expect(config).not.toContain("return 'feature-army-hq-forces'");
    expect(config).toContain('feature-chronicle');
    expect(config).not.toContain("return 'feature-command-ui'");
    expect(config).toContain('map-rendering');
    expect(config).toContain('map-sim');
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
