import { describe, it, expect, vi } from 'vitest';
import { useMapInteractions } from '../src/ui/map/map/useMapInteractions.js';

type TestFeature = { layer?: { id: string }; properties?: Record<string, unknown> };
type MapLayerMouseEvent = {
  features?: TestFeature[];
  originalEvent?: { clientX: number; clientY: number };
  point?: { x: number; y: number };
};

describe('useMapInteractions', () => {
  it('returns undefined when map is null', () => {
    const cleanup = useMapInteractions(null, {});
    expect(cleanup).toBeUndefined();
  });

  it('registers click/mousemove/mouseleave for osid-density-fill and sector-fill and returns cleanup', () => {
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
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      setFeatureState: noop,
    };

    const cleanup = useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {});

    const densityOn = onCalls.filter(([, layer]) => layer === 'osid-density-fill');
    expect(densityOn.length).toBe(3);
    expect(densityOn.map(([e]) => e).sort()).toEqual(['click', 'mouseleave', 'mousemove']);

    const sectorOn = onCalls.filter(([, layer]) => layer === 'sector-fill');
    expect(sectorOn.length).toBe(3);
    expect(sectorOn.map(([e]) => e).sort()).toEqual(['click', 'mouseleave', 'mousemove']);

    expect(typeof cleanup).toBe('function');

    cleanup!();

    const densityOff = offCalls.filter(([, layer]) => layer === 'osid-density-fill');
    expect(densityOff.length).toBe(3);

    const sectorOff = offCalls.filter(([, layer]) => layer === 'sector-fill');
    expect(sectorOff.length).toBe(3);
  });

  it('selects a sector when the top front-line hit is the white highlight layer without edge_id', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const features: TestFeature[] = [
      {
        layer: { id: 'front-edges-highlight-pos' },
        properties: { sector_id: 'sector:arbih_1st_corps:4', corps_id: 'arbih_1st_corps' },
      },
      {
        layer: { id: 'front-edges-hover-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina',
          sector_id: 'sector:arbih_1st_corps:4',
          corps_id: 'arbih_1st_corps',
        },
      },
    ];
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') mapHandlers.set(event, layerOrHandler);
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => features,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick });
    mapHandlers.get('click')?.({ point: { x: 10, y: 10 }, originalEvent: { clientX: 10, clientY: 10 } });

    expect(onFrontEdgeClick).toHaveBeenCalledTimes(1);
    expect(onFrontEdgeClick.mock.calls[0]?.[1]).toMatchObject({
      sector_id: 'sector:arbih_1st_corps:4',
    });
  });

  it('prioritizes sector-line hits over polygon fills even when queryRenderedFeatures returns fill first', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const onOsidClick = vi.fn();
    const features: TestFeature[] = [
      {
        layer: { id: 'sector-fill' },
        properties: { osid: 'op:foca:donje_zesce', sector_id: 'sector:arbih_1st_corps:4' },
      },
      {
        layer: { id: 'front-edges-hover-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina',
          sector_id: 'sector:arbih_1st_corps:4',
          corps_id: 'arbih_1st_corps',
        },
      },
    ];
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') mapHandlers.set(event, layerOrHandler);
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => features,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick, onOsidClick });
    mapHandlers.get('click')?.({ point: { x: 10, y: 10 }, originalEvent: { clientX: 10, clientY: 10 } });

    expect(onFrontEdgeClick).toHaveBeenCalledTimes(1);
    expect(onOsidClick).not.toHaveBeenCalled();
  });

  it('does not clear the front tooltip when hover lands on a highlight-only sector feature', () => {
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeHover = vi.fn();
    const onSectorHover = vi.fn();
    const setFilter = vi.fn();
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => [],
      setFilter,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeHover,
      onSectorHover,
    });
    layerHandlers.get('mousemove:front-edges-highlight-pos')?.({
      features: [{
        layer: { id: 'front-edges-highlight-pos' },
        properties: { sector_id: 'sector:arbih_1st_corps:4' },
      }],
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
    });

    expect(onSectorHover).toHaveBeenCalledWith('sector:arbih_1st_corps:4', { x: 10, y: 10 });
    expect(onFrontEdgeHover).not.toHaveBeenCalled();
    expect(setFilter).toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('registers direct click/mousemove handlers for sector glow layers', () => {
    const onCalls: Array<[string, string, (e: MapLayerMouseEvent) => void]> = [];
    const mockMap = {
      on: (event: string, layerId: string, handler: (e: MapLayerMouseEvent) => void) => {
        onCalls.push([event, layerId, handler]);
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => [],
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeClick: () => {},
      onFrontEdgeHover: () => {},
    });

    expect(onCalls.some(([event, layer]) => event === 'click' && layer === 'sector-edge-glow-pos')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'mousemove' && layer === 'sector-edge-glow-pos')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'mouseleave' && layer === 'sector-edge-glow-pos')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'click' && layer === 'sector-edge-glow-neg')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'mousemove' && layer === 'sector-edge-glow-neg')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'mouseleave' && layer === 'sector-edge-glow-neg')).toBe(true);
  });

  it('treats sector glow clicks as valid sector-line clicks even without edge_id', () => {
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => [],
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick });
    layerHandlers.get('click:sector-edge-glow-pos')?.({
      features: [{
        layer: { id: 'sector-edge-glow-pos' },
        properties: { sector_id: 'sector:arbih_1st_corps:4' },
      }],
    });

    expect(onFrontEdgeClick).toHaveBeenCalledTimes(1);
    expect(onFrontEdgeClick).toHaveBeenCalledWith('', { sector_id: 'sector:arbih_1st_corps:4' });
  });
});
