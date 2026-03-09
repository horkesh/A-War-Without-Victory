/**
 * Warroom smoke: desk_map click path invokes tactical-map handler without crash.
 * Phase E Trust-and-Baseline — automated “load warroom → select map” path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClickableRegionManager } from '../src/ui/warroom/ClickableRegionManager.js';

const MINIMAL_REGIONS = {
  schema_version: '1',
  image_dimensions: { width: 2752, height: 1536 },
  regions: [
    {
      id: 'desk_map',
      type: 'dynamic_render',
      bounds: { x: 100, y: 100, width: 400, height: 400 },
      action: 'open_operational_map',
      hover_style: 'none',
      cursor: 'pointer',
      layer: 'desk',
    },
  ],
};

describe('Warroom smoke — select map', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((_url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MINIMAL_REGIONS),
      } as Response)
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('desk_map click invokes tactical map open handler (war phase)', async () => {
    const manager = new ClickableRegionManager();
    const openHandler = vi.fn();
    manager.setTacticalMapOpenHandler(openHandler);
    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    const gameState = { meta: { phase: 'war' } };
    manager.onClick(200, 200, gameState);

    expect(openHandler).toHaveBeenCalledTimes(1);
  });

  it('click outside desk_map does not invoke tactical map handler', async () => {
    const manager = new ClickableRegionManager();
    const openHandler = vi.fn();
    manager.setTacticalMapOpenHandler(openHandler);
    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    manager.onClick(10, 10, { meta: { phase: 'war' } });

    expect(openHandler).not.toHaveBeenCalled();
  });
});
