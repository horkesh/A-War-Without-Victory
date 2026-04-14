import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_INTERACTION_LAYER_IDS,
  getDynamicInteractionLayerSignature,
  getPresentDynamicInteractionLayerIds,
  shouldScheduleInteractionRetry,
} from '../src/ui/map/map/dynamicInteractionLayers.js';

function createMockMap(activeLayerIds: string[]) {
  const layers = new Set(activeLayerIds);
  return {
    getLayer(layerId: string) {
      return layers.has(layerId) ? { id: layerId } : undefined;
    },
  };
}

describe('dynamic interaction layers', () => {
  it('reports only present dynamic interaction layers in canonical order', () => {
    const map = createMockMap([
      'sector-edge-glow-pos',
      'sector-edge-hit-neg',
      'front-edges-hover-pos',
      'front-edges-highlight-neg',
      'sector-demarcation-lines-hit',
    ]);

    expect(getPresentDynamicInteractionLayerIds(map as never)).toEqual([
      'front-edges-hover-pos',
      'front-edges-highlight-neg',
      'sector-edge-glow-pos',
      'sector-edge-hit-neg',
      'sector-demarcation-lines-hit',
    ]);
  });

  it('produces a stable signature for the currently materialized interaction surface', () => {
    const map = createMockMap([
      DYNAMIC_INTERACTION_LAYER_IDS[8],
      DYNAMIC_INTERACTION_LAYER_IDS[0],
      DYNAMIC_INTERACTION_LAYER_IDS[6],
    ]);

    expect(getDynamicInteractionLayerSignature(map as never)).toBe(
      'front-edges-hover-pos|sector-edge-hit-pos|sector-demarcation-lines-hit',
    );
  });

  it('keeps retrying only while no dynamic interaction layer exists', () => {
    const emptyMap = createMockMap([]);
    const readyMap = createMockMap(['front-edges-hover-neg']);

    expect(shouldScheduleInteractionRetry(emptyMap as never, 0)).toBe(true);
    expect(shouldScheduleInteractionRetry(emptyMap as never, 19)).toBe(true);
    expect(shouldScheduleInteractionRetry(emptyMap as never, 20)).toBe(false);
    expect(shouldScheduleInteractionRetry(readyMap as never, 0)).toBe(false);
  });
});
