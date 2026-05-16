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

  it('drives front-edge hover from the canonical map-level feature query when the cursor is over a selectable front hit', () => {
    vi.useFakeTimers();
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void>();
    const onFrontEdgeHover = vi.fn();
    const onSectorHover = vi.fn();
    const setFilter = vi.fn();
    const features: TestFeature[] = [
      {
        layer: { id: 'sector-fill' },
        properties: { osid: 'op:foca:donje_zesce', sector_id: 'sector:vrs_herzegovina:0' },
      },
      {
        layer: { id: 'sector-edge-hit-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
          sector_id: 'sector:vrs_herzegovina:0',
          corps_id: 'vrs_herzegovina',
        },
      },
    ];
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') {
          mapHandlers.set(event, layerOrHandler as (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => features,
      setFilter,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeHover,
      onSectorHover,
    });

    mapHandlers.get('mousemove')?.({
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
      lngLat: { lng: 18, lat: 44 },
    });
    vi.advanceTimersByTime(301);

    expect(onSectorHover).toHaveBeenCalledWith('sector:vrs_herzegovina:0', { x: 10, y: 10 });
    expect(onFrontEdgeHover).toHaveBeenCalledWith('op:foca:donje_zesce__op:foca:mazlina:RS', { x: 10, y: 10 });
    expect(setFilter).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('rescues front hover from a nearby selectable sector surface even when the exact point misses', () => {
    vi.useFakeTimers();
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void>();
    const onFrontEdgeHover = vi.fn();
    const onSectorHover = vi.fn();
    const queryRenderedFeatures = vi.fn((geometry?: unknown) => {
      if (Array.isArray(geometry) && Array.isArray(geometry[0])) {
        return [{
          layer: { id: 'sector-edge-hit-pos' },
          properties: {
            edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
            sector_id: 'sector:vrs_herzegovina:0',
          },
        }];
      }
      return [];
    });
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') {
          mapHandlers.set(event, layerOrHandler as (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures,
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeHover,
      onSectorHover,
    });
    mapHandlers.get('mousemove')?.({
      point: { x: 15, y: 25 },
      originalEvent: { clientX: 15, clientY: 25 },
      lngLat: { lng: 18, lat: 44 },
    });
    vi.advanceTimersByTime(301);

    expect(queryRenderedFeatures).toHaveBeenCalledTimes(2);
    expect(onSectorHover).toHaveBeenCalledWith('sector:vrs_herzegovina:0', { x: 15, y: 25 });
    expect(onFrontEdgeHover).toHaveBeenCalledWith('op:foca:donje_zesce__op:foca:mazlina:RS', { x: 15, y: 25 });
    vi.useRealTimers();
  });

  it('does not clear the front tooltip when hover lands on a highlight-only sector feature', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void>();
    const onFrontEdgeHover = vi.fn();
    const onSectorHover = vi.fn();
    const setFilter = vi.fn();
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const features: TestFeature[] = [{
      layer: { id: 'front-edges-highlight-pos' },
      properties: { sector_id: 'sector:arbih_1st_corps:4' },
    }];
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') {
          mapHandlers.set(event, layerOrHandler as (e: MapLayerMouseEvent & { lngLat?: { lng: number; lat: number } }) => void);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => features,
      setFilter,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeHover,
      onSectorHover,
    });
    mapHandlers.get('mousemove')?.({
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
      lngLat: { lng: 18, lat: 44 },
    });

    expect(onSectorHover).toHaveBeenCalledWith('sector:arbih_1st_corps:4', { x: 10, y: 10 });
    expect(onFrontEdgeHover).not.toHaveBeenCalled();
    expect(setFilter).toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('registers direct click handlers for sector glow layers and keeps hover map-level', () => {
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
    expect(onCalls.some(([event, layer]) => event === 'mousemove' && layer === 'sector-edge-glow-pos')).toBe(false);
    expect(onCalls.some(([event, layer]) => event === 'mouseleave' && layer === 'sector-edge-glow-pos')).toBe(false);
    expect(onCalls.some(([event, layer]) => event === 'click' && layer === 'sector-edge-glow-neg')).toBe(true);
    expect(onCalls.some(([event, layer]) => event === 'mousemove' && layer === 'sector-edge-glow-neg')).toBe(false);
    expect(onCalls.some(([event, layer]) => event === 'mouseleave' && layer === 'sector-edge-glow-neg')).toBe(false);
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

  it('recovers direct front-line clicks when MapLibre delivers the non-selectable faction side first', () => {
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const wrongSide: TestFeature = {
      layer: { id: 'front-edges-hover-neg' },
      properties: {
        edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RBiH',
      },
    };
    const selectableSide: TestFeature = {
      layer: { id: 'front-edges-hover-pos' },
      properties: {
        edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
        sector_id: 'sector:vrs_herzegovina:0',
        corps_id: 'vrs_herzegovina',
      },
    };
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => [wrongSide, selectableSide],
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick });
    layerHandlers.get('click:front-edges-hover-neg')?.({
      features: [wrongSide],
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
    });

    expect(onFrontEdgeClick).toHaveBeenCalledTimes(1);
    expect(onFrontEdgeClick).toHaveBeenCalledWith(
      'op:foca:donje_zesce__op:foca:mazlina:RS',
      expect.objectContaining({ sector_id: 'sector:vrs_herzegovina:0' }),
    );
  });

  it('ignores wrong-side front hits with no sector_id and picks the selectable sector hit instead', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const features: TestFeature[] = [
      {
        layer: { id: 'front-edges-hover-neg' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RBiH',
        },
      },
      {
        layer: { id: 'sector-edge-hit-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
          sector_id: 'sector:vrs_herzegovina:0',
          corps_id: 'vrs_herzegovina',
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
    expect(onFrontEdgeClick).toHaveBeenCalledWith(
      'op:foca:donje_zesce__op:foca:mazlina:RS',
      expect.objectContaining({ sector_id: 'sector:vrs_herzegovina:0' }),
    );
  });

  it('prioritizes an exact formation hit over selectable sector-line hits on the same click', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const onFormationClick = vi.fn();
    const features: TestFeature[] = [
      {
        layer: { id: 'formation-markers' },
        properties: { id: 'vrs_herzegovina_brigade' },
      },
      {
        layer: { id: 'sector-edge-hit-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
          sector_id: 'sector:vrs_herzegovina:0',
          corps_id: 'vrs_herzegovina',
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

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick, onFormationClick });
    mapHandlers.get('click')?.({ point: { x: 10, y: 10 }, originalEvent: { clientX: 10, clientY: 10 } });

    expect(onFormationClick).toHaveBeenCalledTimes(1);
    expect(onFormationClick).toHaveBeenCalledWith(
      'vrs_herzegovina_brigade',
      expect.objectContaining({ id: 'vrs_herzegovina_brigade' }),
      { x: 10, y: 10 },
    );
    expect(onFrontEdgeClick).not.toHaveBeenCalled();
  });

  it('does not let a nearby sector hitbox steal an exact formation click', () => {
    const mapHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFrontEdgeClick = vi.fn();
    const onFormationClick = vi.fn();
    const formationOnly: TestFeature[] = [
      {
        layer: { id: 'formation-markers' },
        properties: { id: 'vrs_herzegovina_brigade' },
      },
    ];
    const nearbyFront: TestFeature[] = [
      ...formationOnly,
      {
        layer: { id: 'sector-edge-hit-pos' },
        properties: {
          edge_id: 'op:foca:donje_zesce__op:foca:mazlina:RS',
          sector_id: 'sector:vrs_herzegovina:0',
          corps_id: 'vrs_herzegovina',
        },
      },
    ];
    const queryRenderedFeatures = vi.fn((geometry?: unknown) => {
      if (Array.isArray(geometry) && Array.isArray(geometry[0])) return nearbyFront;
      return formationOnly;
    });
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'function') mapHandlers.set(event, layerOrHandler);
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures,
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFrontEdgeClick, onFormationClick });
    mapHandlers.get('click')?.({ point: { x: 10, y: 10 }, originalEvent: { clientX: 10, clientY: 10 } });

    expect(queryRenderedFeatures.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(onFormationClick).toHaveBeenCalledTimes(1);
    expect(onFormationClick).toHaveBeenCalledWith(
      'vrs_herzegovina_brigade',
      expect.objectContaining({ id: 'vrs_herzegovina_brigade' }),
      { x: 10, y: 10 },
    );
    expect(onFrontEdgeClick).not.toHaveBeenCalled();
  });

  it('does not suppress OSID hover when only a non-selectable front hit is present', () => {
    vi.useFakeTimers();
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onOsidHover = vi.fn();
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures: () => [
        {
          layer: { id: 'front-edges-hover-neg' },
          properties: { edge_id: 'op:test:a__op:test:b:RBiH' },
        },
      ],
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onOsidHover });
    layerHandlers.get('mousemove:osid-control-fill')?.({
      features: [{ layer: { id: 'osid-control-fill' }, properties: { osid: 'op:test:a' } }],
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
    });

    vi.advanceTimersByTime(300);
    expect(onOsidHover).toHaveBeenCalledWith('op:test:a', { x: 10, y: 10 });
    vi.useRealTimers();
  });

  it('suppresses OSID hover when a selectable front hit exists only in the nearby rescue radius', () => {
    vi.useFakeTimers();
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onOsidHover = vi.fn();
    const queryRenderedFeatures = vi.fn((geometry?: unknown) => {
      if (Array.isArray(geometry) && Array.isArray(geometry[0])) {
        return [{
          layer: { id: 'sector-edge-hit-pos' },
          properties: { edge_id: 'op:test:a__op:test:b:RS', sector_id: 'sector:test:0' },
        }];
      }
      return [];
    });
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures,
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onOsidHover });
    layerHandlers.get('mousemove:osid-control-fill')?.({
      features: [{ layer: { id: 'osid-control-fill' }, properties: { osid: 'op:test:a' } }],
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
    });

    vi.advanceTimersByTime(300);
    expect(onOsidHover).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('suppresses formation hover when a selectable front hit exists only in the nearby rescue radius', () => {
    vi.useFakeTimers();
    const layerHandlers = new Map<string, (e: MapLayerMouseEvent) => void>();
    const onFormationHover = vi.fn();
    const queryRenderedFeatures = vi.fn((geometry?: unknown) => {
      if (Array.isArray(geometry) && Array.isArray(geometry[0])) {
        return [{
          layer: { id: 'sector-edge-hit-pos' },
          properties: { edge_id: 'op:test:a__op:test:b:RS', sector_id: 'sector:test:0' },
        }];
      }
      return [];
    });
    const mockMap = {
      on: (event: string, layerOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerOrHandler === 'string' && handler) {
          layerHandlers.set(`${event}:${layerOrHandler}`, handler);
        }
      },
      off: () => {},
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: () => {}, removeEventListener: () => {} }),
      getLayer: () => true,
      queryRenderedFeatures,
      setFilter: () => {},
    };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], { onFormationHover });
    layerHandlers.get('mousemove:formation-markers')?.({
      features: [{ layer: { id: 'formation-markers' }, properties: { id: 'brig:test' } }],
      point: { x: 10, y: 10 },
      originalEvent: { clientX: 10, clientY: 10 },
    });

    vi.advanceTimersByTime(300);
    expect(onFormationHover).toHaveBeenCalledWith(null, null);
    expect(onFormationHover).not.toHaveBeenCalledWith('brig:test', { x: 10, y: 10 });
    vi.useRealTimers();
  });

  it('deckHandledFormationClick guard prevents MapLibre front-edge fallthrough', () => {
    const clickHandlers: Record<string, (e: MapLayerMouseEvent) => void> = {};
    const noop = () => {};
    const mockMap = {
      on: (event: string, layerIdOrHandler: string | ((e: MapLayerMouseEvent) => void), handler?: (e: MapLayerMouseEvent) => void) => {
        if (typeof layerIdOrHandler === 'string' && handler) {
          clickHandlers[`${event}:${layerIdOrHandler}`] = handler;
        } else if (typeof layerIdOrHandler === 'function') {
          clickHandlers[event] = layerIdOrHandler;
        }
      },
      off: noop,
      getCanvas: () => ({ style: { cursor: '' }, addEventListener: noop, removeEventListener: noop }),
      getLayer: (id: string) => {
        // Only front-edge layers exist; formation-markers is hidden (deckFormationCounters=true)
        if (id === 'front-edges-hover-pos') return { id };
        return undefined;
      },
      queryRenderedFeatures: (_point: unknown, opts?: { layers?: string[] }) => {
        const layers = opts?.layers ?? [];
        if (layers.includes('front-edges-hover-pos')) {
          return [{ layer: { id: 'front-edges-hover-pos' }, properties: { sector_id: 'sector:test:0', edge_id: 'e1' } }];
        }
        return [];
      },
      setFilter: noop,
    };

    const onFrontEdgeClick = vi.fn();
    const onFormationClick = vi.fn();
    const guardRef = { current: false };

    useMapInteractions(mockMap as unknown as Parameters<typeof useMapInteractions>[0], {
      onFrontEdgeClick,
      onFormationClick,
      deckHandledFormationClick: guardRef,
    });

    const handleMapClick = clickHandlers['click'];
    expect(handleMapClick).toBeDefined();

    // Simulate: Deck.gl handled a formation click (guard is set)
    guardRef.current = true;
    handleMapClick!({
      features: [{ layer: { id: 'front-edges-hover-pos' }, properties: { sector_id: 'sector:test:0', edge_id: 'e1' } }],
      point: { x: 100, y: 100 },
    });

    // Front-edge click should NOT have fired — guard consumed the click
    expect(onFrontEdgeClick).not.toHaveBeenCalled();
    expect(guardRef.current).toBe(false); // guard consumed

    // Without guard: front-edge click SHOULD fire
    guardRef.current = false;
    handleMapClick!({
      features: [{ layer: { id: 'front-edges-hover-pos' }, properties: { sector_id: 'sector:test:0', edge_id: 'e1' } }],
      point: { x: 100, y: 100 },
    });
    expect(onFrontEdgeClick).toHaveBeenCalledTimes(1);
  });
});
