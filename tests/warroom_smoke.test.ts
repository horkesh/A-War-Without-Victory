/**
 * Warroom smoke: desk_map click path invokes map scene handler without crash.
 * Phase E Trust-and-Baseline — automated "load warroom → select map" path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClickableRegionManager } from '../src/ui/warroom/ClickableRegionManager.js';
import { ModalManager } from '../src/ui/warroom/components/ModalManager.js';

vi.mock('../src/ui/warroom/data/war_data_extractor.js', () => ({
    extractWarData: vi.fn(() => ({
        date: 'Test Date',
        ownForces: { totalPersonnel: 100, formationDetails: [], totalBrigades: 10 },
        ownSupply: { criticalCount: 0 },
        brigadeMovement: { encircled: [] },
        ownCorpsOps: [],
        stress: { attacksConducted: 0, frontlineBreaches: 0, hqRelocations: 0, routedBrigades: 0, cutOffBrigades: 0, starvingBrigades: 0 },
        overall: { totalBrigades: 10, totalManpower: 100, totalReserves: 0 }
    }))
}));

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

  it('desk_map click opens tactical map directly (war phase)', async () => {
    const manager = new ClickableRegionManager();
    const tacticalMapHandler = vi.fn();
    manager.setTacticalMapOpenHandler(tacticalMapHandler);

    const modalManager = {
        showModal: vi.fn(),
        hideModal: vi.fn()
    } as unknown as ModalManager;
    manager.setModalManager(modalManager);

    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    const gameState = { meta: { phase: 'war', turn: 1 }, factions: [{ id: 'RBiH' }] };
    manager.onClick(200, 200, gameState);

    // Should open tactical map directly, not via modal
    expect(tacticalMapHandler).toHaveBeenCalledTimes(1);
    expect(modalManager.showModal).not.toHaveBeenCalled();
  });

  it('click outside desk_map does not invoke modal or map handler', async () => {
    const manager = new ClickableRegionManager();
    const mapSceneHandler = vi.fn();
    manager.setMapSceneOpenHandler(mapSceneHandler);

    const modalManager = { showModal: vi.fn() } as unknown as ModalManager;
    manager.setModalManager(modalManager);

    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    manager.onClick(10, 10, { meta: { phase: 'peace', turn: 1 } });

    expect(modalManager.showModal).not.toHaveBeenCalled();
    expect(mapSceneHandler).not.toHaveBeenCalled();
  });
});
