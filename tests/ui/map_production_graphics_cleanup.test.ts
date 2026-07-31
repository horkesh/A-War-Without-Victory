// @vitest-environment jsdom

import { createElement, Fragment, useLayoutEffect } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

const graphics = vi.hoisted(() => ({
  maps: [] as Array<{
    remove: ReturnType<typeof vi.fn>;
    loseContext: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    loadListeners: Set<(...args: unknown[]) => void>;
    sources: Record<string, { setData: ReturnType<typeof vi.fn> }>;
  }>,
  decks: [] as Array<{ finalize: ReturnType<typeof vi.fn>; loseContext: ReturnType<typeof vi.fn> }>,
  throwOnNextAddControl: false,
  mapLoaded: true,
}));
const settlementLoads = vi.hoisted(() => ({
  deferred: false,
  resolvers: [] as Array<(value: { type: 'FeatureCollection'; features: [] }) => void>,
}));
const transitionCounters = vi.hoisted(() => ({
  deckRelease: vi.fn(),
}));

vi.mock('../../src/ui/map/perf/mapTransitionTiming.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/ui/map/perf/mapTransitionTiming.js')>();
  return {
    ...original,
    countMapTransitionDeckRelease: transitionCounters.deckRelease,
  };
});

vi.mock('../../src/ui/map/node_modules/maplibre-gl/dist/maplibre-gl.js', () => {
  class MockMap {
    constructor() {
      const loseContext = vi.fn();
      const remove = vi.fn();
      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1024 });
      Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 768 });
      canvas.getContext = vi.fn(() => ({
        getExtension: () => ({ loseContext }),
        isContextLost: () => false,
      })) as unknown as typeof canvas.getContext;
      const addControl = vi.fn(() => {
        if (graphics.throwOnNextAddControl) {
          graphics.throwOnNextAddControl = false;
          throw new Error('addControl failed');
        }
      });
      const loadListeners = new Set<(...args: unknown[]) => void>();
      const sources = {
        'minimap-control': { setData: vi.fn() },
        'minimap-fronts': { setData: vi.fn() },
        'minimap-viewport': { setData: vi.fn() },
      };
      const on = vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
        if (eventName === 'load') loadListeners.add(listener);
      });
      const once = vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
        if (eventName === 'load') loadListeners.add(listener);
      });
      const off = vi.fn((eventName: string, listener: (...args: unknown[]) => void) => {
        if (eventName === 'load') loadListeners.delete(listener);
      });
      graphics.maps.push({ remove, loseContext, off, loadListeners, sources });
      return new Proxy({
        addControl,
        getBounds: () => ({ getWest: () => 0, getSouth: () => 0, getEast: () => 1, getNorth: () => 1 }),
        getCanvas: () => canvas,
        getCenter: () => ({ lng: 17.7, lat: 43.87 }),
        getLayer: () => undefined,
        getPadding: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
        getPitch: () => 0,
        getSource: (id: keyof typeof sources) => sources[id],
        getZoom: () => 8,
        hasImage: () => true,
        isSourceLoaded: () => false,
        loaded: () => graphics.mapLoaded,
        off,
        on,
        once,
        project: () => ({ x: 0, y: 0 }),
        remove,
        resize: vi.fn(),
        setPadding: vi.fn(),
        stop: vi.fn(),
        triggerRepaint: vi.fn(),
      }, {
        get(target, property) {
          if (property in target) return target[property as keyof typeof target];
          return vi.fn();
        },
      });
    }
  }
  return {
    default: { addProtocol: vi.fn(), Map: MockMap, NavigationControl: class MockNavigationControl {} },
    addProtocol: vi.fn(),
    Map: MockMap,
    NavigationControl: class MockNavigationControl {},
  };
});

vi.mock('../../src/ui/map/node_modules/@deck.gl/mapbox/dist/index.js', () => ({
  MapboxOverlay: class MockMapboxOverlay {
    private readonly canvas = document.createElement('canvas');
    readonly finalize = vi.fn();
    readonly loseContext = vi.fn();

    constructor() {
      this.canvas.getContext = vi.fn(() => ({
        getExtension: () => ({ loseContext: this.loseContext }),
        isContextLost: () => false,
      })) as unknown as typeof this.canvas.getContext;
      graphics.decks.push({ finalize: this.finalize, loseContext: this.loseContext });
    }

    getCanvas() {
      return this.canvas;
    }

    setProps() {}
  },
}));

vi.mock('../../src/ui/map/data/DataLoader.js', () => {
  const empty = { type: 'FeatureCollection', features: [] };
  return {
    loadOperationalSettlements: vi.fn(() => settlementLoads.deferred
      ? new Promise((resolve) => settlementLoads.resolvers.push(resolve))
      : Promise.resolve(empty)),
    loadOperationalPoliticalControl: vi.fn(async () => ({})),
    loadOsidAdjacency: vi.fn(async () => new Map()),
    loadSidToOsidMapping: vi.fn(async () => new Map()),
    loadTerrainScalars: vi.fn(async () => new Map()),
    loadCensusSettlements: vi.fn(async () => null),
  };
});

import { MapContainer } from '../../src/ui/map/map/MapContainer.js';
import { Minimap } from '../../src/ui/map/components/Minimap.js';

beforeEach(() => {
  graphics.maps.length = 0;
  graphics.decks.length = 0;
  graphics.throwOnNextAddControl = false;
  graphics.mapLoaded = true;
  settlementLoads.deferred = false;
  settlementLoads.resolvers.length = 0;
  transitionCounters.deckRelease.mockClear();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  useGameStore.setState({ loadedGameState: null, lastLoadedStateFingerprint: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('production tactical graphics cleanup', () => {
  it('releases the production MapContainer, Minimap, and Deck owners exactly once', async () => {
    const view = render(createElement(
      Fragment,
      null,
      createElement(MapContainer, { active: false, inputActive: false, revealPainted: false }),
      createElement(Minimap, { active: false }),
    ));

    await waitFor(() => {
      expect(graphics.maps).toHaveLength(2);
      expect(graphics.decks).toHaveLength(1);
    });

    act(() => view.unmount());

    for (const map of graphics.maps) {
      expect(map.remove).toHaveBeenCalledOnce();
      expect(map.loseContext).toHaveBeenCalledOnce();
    }
    expect(graphics.decks[0]?.finalize).toHaveBeenCalledOnce();
    expect(graphics.decks[0]?.loseContext).toHaveBeenCalledOnce();
  });

  it('fails the installed document context-menu listener closed before passive cleanup', () => {
    const commitEdgeEvents: MouseEvent[] = [];
    const CommitEdgeProbe = ({ fire }: { fire: boolean }) => {
      useLayoutEffect(() => {
        if (!fire) return;
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 0,
          clientY: 0,
        });
        document.dispatchEvent(event);
        commitEdgeEvents.push(event);
      }, [fire]);
      return null;
    };
    const view = render(createElement(
      Fragment,
      null,
      createElement(MapContainer, { active: true, inputActive: true, revealPainted: true }),
      createElement(CommitEdgeProbe, { fire: false }),
    ));

    view.rerender(createElement(
      Fragment,
      null,
      createElement(MapContainer, { active: true, inputActive: false, revealPainted: true }),
      createElement(CommitEdgeProbe, { fire: true }),
    ));

    expect(commitEdgeEvents).toHaveLength(1);
    expect(commitEdgeEvents[0]?.defaultPrevented).toBe(false);
  });

  it('releases a constructed Deck owner exactly once when MapLibre addControl throws', async () => {
    graphics.throwOnNextAddControl = true;
    const view = render(createElement(MapContainer, {
      active: false,
      inputActive: false,
      revealPainted: false,
    }));

    await waitFor(() => expect(graphics.decks).toHaveLength(1));

    expect(graphics.decks[0]?.finalize).toHaveBeenCalledOnce();
    expect(graphics.decks[0]?.loseContext).toHaveBeenCalledOnce();
    expect(transitionCounters.deckRelease).toHaveBeenCalledOnce();
    act(() => view.unmount());
    expect(graphics.decks[0]?.finalize).toHaveBeenCalledOnce();
    expect(graphics.decks[0]?.loseContext).toHaveBeenCalledOnce();
    expect(transitionCounters.deckRelease).toHaveBeenCalledOnce();
  });

  it('discards a stale settlement load after the campaign revision changes', async () => {
    settlementLoads.deferred = true;
    const stateA = {
      turn: 1,
      controlBySettlement: {},
      war_alliance_rbih_hrhb: false,
    } as unknown as LoadedGameState;
    const stateB = {
      turn: 2,
      controlBySettlement: {},
      war_alliance_rbih_hrhb: false,
    } as unknown as LoadedGameState;
    useGameStore.setState({ loadedGameState: stateA, lastLoadedStateFingerprint: 'campaign-a' });
    render(createElement(Minimap, { active: true }));
    await waitFor(() => expect(settlementLoads.resolvers).toHaveLength(1));
    const minimap = graphics.maps[0]!;

    act(() => useGameStore.setState({
      loadedGameState: stateB,
      lastLoadedStateFingerprint: 'campaign-b',
    }));
    await waitFor(() => expect(settlementLoads.resolvers).toHaveLength(2));

    act(() => settlementLoads.resolvers[0]!({ type: 'FeatureCollection', features: [] }));
    await Promise.resolve();
    expect(minimap.sources['minimap-control'].setData).not.toHaveBeenCalled();
    expect(minimap.sources['minimap-fronts'].setData).not.toHaveBeenCalled();

    act(() => settlementLoads.resolvers[1]!({ type: 'FeatureCollection', features: [] }));
    await waitFor(() => expect(minimap.sources['minimap-control'].setData).toHaveBeenCalledOnce());
    expect(minimap.sources['minimap-fronts'].setData).toHaveBeenCalledOnce();
  });

  it('removes pending load listeners and makes captured callbacks inert on teardown', () => {
    graphics.mapLoaded = false;
    useGameStore.setState({
      loadedGameState: {
        turn: 1,
        controlBySettlement: {},
        war_alliance_rbih_hrhb: false,
      } as unknown as LoadedGameState,
      lastLoadedStateFingerprint: 'campaign-a',
      mapViewport: { bounds: [16, 42, 19, 45], center: [17.5, 43.5], zoom: 7 },
    });
    const view = render(createElement(Minimap, { active: true }));
    const minimap = graphics.maps[0]!;
    const capturedLoadListeners = Array.from(minimap.loadListeners);
    expect(capturedLoadListeners.length).toBeGreaterThanOrEqual(3);

    act(() => view.unmount());
    expect(minimap.loadListeners).toHaveLength(0);
    expect(minimap.off).toHaveBeenCalled();

    for (const listener of capturedLoadListeners) listener();
    expect(minimap.sources['minimap-control'].setData).not.toHaveBeenCalled();
    expect(minimap.sources['minimap-fronts'].setData).not.toHaveBeenCalled();
    expect(minimap.sources['minimap-viewport'].setData).not.toHaveBeenCalled();
  });

  it('discards an in-flight settlement load that resolves after teardown', async () => {
    settlementLoads.deferred = true;
    useGameStore.setState({
      loadedGameState: {
        turn: 1,
        controlBySettlement: {},
        war_alliance_rbih_hrhb: false,
      } as unknown as LoadedGameState,
      lastLoadedStateFingerprint: 'campaign-a',
    });
    const view = render(createElement(Minimap, { active: true }));
    await waitFor(() => expect(settlementLoads.resolvers).toHaveLength(1));
    const minimap = graphics.maps[0]!;

    act(() => view.unmount());
    act(() => settlementLoads.resolvers[0]!({ type: 'FeatureCollection', features: [] }));
    await Promise.resolve();

    expect(minimap.sources['minimap-control'].setData).not.toHaveBeenCalled();
    expect(minimap.sources['minimap-fronts'].setData).not.toHaveBeenCalled();
  });
});
