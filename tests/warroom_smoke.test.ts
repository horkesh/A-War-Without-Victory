/**
 * Warroom smoke: desk_map click path invokes tactical-map handler without crash.
 * Phase E Trust-and-Baseline — automated “load warroom → select map” path.
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

  it('desk_map click invokes tactical map open handler via Operational Situation modal (peace phase)', async () => {
    const manager = new ClickableRegionManager();
    const openHandler = vi.fn();
    manager.setTacticalMapOpenHandler(openHandler);
    
    // Mock ModalManager
    const modalManager = {
        showModal: vi.fn((element: HTMLElement) => {
            // Simulate clicking the button in the modal
            setTimeout(() => {
                const btn = element.querySelector('#wr-btn-open-map-situ') as HTMLButtonElement;
                if (btn) btn.click();
            }, 10);
        }),
        hideModal: vi.fn()
    } as unknown as ModalManager;
    manager.setModalManager(modalManager);

    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    const gameState = { meta: { phase: 'war', turn: 1 }, factions: [{ id: 'RBiH' }] };
    manager.onClick(200, 200, gameState);

    expect(modalManager.showModal).toHaveBeenCalledTimes(1);
    
    // Wait for the simulated click to fire
    await new Promise(r => setTimeout(r, 50));
    expect(openHandler).toHaveBeenCalledTimes(1);
  });

  it('click outside desk_map does not invoke modal or tactical map handler', async () => {
    const manager = new ClickableRegionManager();
    const openHandler = vi.fn();
    manager.setTacticalMapOpenHandler(openHandler);
    
    const modalManager = { showModal: vi.fn() } as unknown as ModalManager;
    manager.setModalManager(modalManager);

    await manager.loadRegions('/data/ui/hq_clickable_regions.json');

    manager.onClick(10, 10, { meta: { phase: 'peace', turn: 1 } });

    expect(modalManager.showModal).not.toHaveBeenCalled();
    expect(openHandler).not.toHaveBeenCalled();
  });
});

