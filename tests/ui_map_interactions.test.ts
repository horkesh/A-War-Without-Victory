import { describe, it, expect } from 'vitest';
import { useMapInteractions } from '../src/ui/map/map/useMapInteractions.js';

type MapLayerMouseEvent = { features?: Array<{ properties?: Record<string, unknown> }>; originalEvent?: { clientX: number; clientY: number } };

describe('useMapInteractions', () => {
  it('returns undefined when map is null', () => {
    const cleanup = useMapInteractions(null, {});
    expect(cleanup).toBeUndefined();
  });

  it('registers click/mousemove/mouseleave for osid-density-fill and returns cleanup', () => {
    const onCalls: Array<[string, string, (e: MapLayerMouseEvent) => void]> = [];
    const offCalls: Array<[string, string, (e: MapLayerMouseEvent) => void]> = [];
    const noop = () => {};
    const mockMap = {
      on: (event: string, layerId: string, handler: (e: MapLayerMouseEvent) => void) => {
        onCalls.push([event, layerId, handler]);
      },
      off: (event: string, layerId: string, handler: (e: MapLayerMouseEvent) => void) => {
        offCalls.push([event, layerId, handler]);
      },
      getCanvas: () => ({ style: { cursor: '' } }),
      setFeatureState: noop,
    };

    const cleanup = useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {});

    const densityOn = onCalls.filter(([, layer]) => layer === 'osid-density-fill');
    expect(densityOn.length).toBe(3);
    expect(densityOn.map(([e]) => e).sort()).toEqual(['click', 'mouseleave', 'mousemove']);

    expect(typeof cleanup).toBe('function');

    cleanup!();

    const densityOff = offCalls.filter(([, layer]) => layer === 'osid-density-fill');
    expect(densityOff.length).toBe(3);
  });
});
