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
    expect(config).toContain('feature-command-ui');
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
