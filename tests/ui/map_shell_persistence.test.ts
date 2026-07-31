// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { createElement, useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootErrorBoundary } from '../../src/ui/map/components/RootErrorBoundary.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

const graphics = vi.hoisted(() => ({
  mainMapConstructions: vi.fn(),
  minimapConstructions: vi.fn(),
  deckConstructions: vi.fn(),
  mainMapRemove: vi.fn(),
  minimapRemove: vi.fn(),
  deckFinalize: vi.fn(),
  loseContext: vi.fn(),
  mainInputActive: vi.fn(),
  minimapInputActive: vi.fn(),
  contextMenu: vi.fn(),
  reportRenderedRevision: null as null | ((revision: { turn: number; fingerprint: string } | null) => void),
  renderListener: null as null | (() => void),
  mainResize: vi.fn(),
  minimapResize: vi.fn(),
  mainRepaint: vi.fn(),
  minimapRepaint: vi.fn(),
  mainStop: vi.fn(),
  minimapStop: vi.fn(),
}));

vi.mock('../../src/ui/map/map/MapContainer.js', () => ({
  MapContainer: ({
    inputActive,
    onRenderedRevisionChange,
    onGraphicsController,
  }: {
    inputActive: boolean;
    onRenderedRevisionChange?: (revision: { turn: number; fingerprint: string } | null) => void;
    onGraphicsController?: (controller: unknown | null) => void;
  }) => {
    graphics.reportRenderedRevision = onRenderedRevisionChange ?? null;
    graphics.mainInputActive(inputActive);
    useEffect(() => {
      graphics.mainMapConstructions();
      graphics.deckConstructions();
      const controller = {
        resize: graphics.mainResize,
        triggerRepaint: graphics.mainRepaint,
        onceRender: (listener: () => void) => {
          graphics.renderListener = listener;
          return () => {
            if (graphics.renderListener === listener) graphics.renderListener = null;
          };
        },
        stop: graphics.mainStop,
      };
      onGraphicsController?.(controller);
      return () => {
        onGraphicsController?.(null);
        onRenderedRevisionChange?.(null);
        graphics.deckFinalize();
        graphics.loseContext();
        graphics.mainMapRemove();
        graphics.loseContext();
      };
    }, []);
    return createElement('main', {
      'data-testid': 'mock-tactical-map',
      'data-input-active': inputActive,
      tabIndex: inputActive ? 0 : -1,
      onContextMenu: () => {
        if (inputActive) graphics.contextMenu();
      },
    });
  },
}));

vi.mock('../../src/ui/map/components/Minimap.js', () => ({
  Minimap: ({
    active,
    onGraphicsController,
  }: {
    active: boolean;
    onGraphicsController?: (controller: unknown | null) => void;
  }) => {
    graphics.minimapInputActive(active);
    useEffect(() => {
      graphics.minimapConstructions();
      onGraphicsController?.({
        resize: graphics.minimapResize,
        triggerRepaint: graphics.minimapRepaint,
        onceRender: () => () => undefined,
        stop: graphics.minimapStop,
      });
      return () => {
        onGraphicsController?.(null);
        graphics.minimapRemove();
        graphics.loseContext();
      };
    }, []);
    return createElement('aside', { 'data-active': active });
  },
}));

import { TacticalMapViewport } from '../../src/ui/map/components/TacticalMapViewport.js';
import {
  CampaignTacticalViewportOwner,
} from '../../src/ui/map/components/CampaignTacticalViewportOwner.js';
import {
  createCampaignReplacementCoordinator,
  runCampaignViewportReplacement,
} from '../../src/ui/map/utils/campaignViewportLifecycle.js';
import {
  isCurrentTacticalInteractionReady,
  TacticalInputOwners,
} from '../../src/ui/map/components/TacticalInputOwners.js';

function IntegratedTacticalOwnership({
  active,
  onShellKeyDown,
}: {
  active: boolean;
  onShellKeyDown: (event: KeyboardEvent) => void;
}) {
  const [readiness, setReadiness] = useState({
    ready: false,
    renderedTurn: null as number | null,
    renderedFingerprint: null as string | null,
  });
  const currentTurn = useGameStore((state) => state.loadedGameState?.turn);
  const currentFingerprint = useGameStore((state) => state.lastLoadedStateFingerprint);
  const inputActive = isCurrentTacticalInteractionReady({
    screenActive: active,
    readiness,
    currentTurn,
    currentFingerprint,
  });
  return createElement(
    'div',
    null,
    createElement(TacticalMapViewport, { active, onInteractionReadyChange: setReadiness }),
    createElement(TacticalInputOwners, { active: inputActive, onShellKeyDown }),
  );
}

let nextRafId = 1;
let pendingRafs = new Map<number, FrameRequestCallback>();

function flushNextRaf(): void {
  const next = [...pendingRafs.entries()].sort(([left], [right]) => left - right)[0];
  if (!next) throw new Error('No pending animation frame');
  pendingRafs.delete(next[0]);
  act(() => next[1](0));
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

beforeEach(() => {
  nextRafId = 1;
  pendingRafs = new Map();
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextRafId;
    nextRafId += 1;
    pendingRafs.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    pendingRafs.delete(id);
  }));
  useGameStore.setState({
    loadedGameState: { turn: 12 } as LoadedGameState,
    lastLoadedStateFingerprint: 'revision-a',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  graphics.reportRenderedRevision = null;
  graphics.renderListener = null;
  vi.unstubAllGlobals();
});

describe('campaign-scoped tactical viewport ownership', () => {
  it('keeps map, minimap, focus, and context input inert until revision plus reveal render are ready', () => {
    const interactionReady = vi.fn();
    const warroom = document.createElement('div');
    warroom.dataset.testid = 'warroom-shell';
    warroom.tabIndex = -1;
    document.body.appendChild(warroom);
    const view = render(createElement(TacticalMapViewport, {
      active: true,
      onInteractionReadyChange: interactionReady,
    }));
    const viewport = screen.getByTestId('tactical-map-viewport');
    const map = screen.getByTestId('mock-tactical-map');

    expect(viewport.inert).toBe(true);
    expect(viewport.style.pointerEvents).toBe('none');
    expect(map.getAttribute('data-input-active')).toBe('false');
    expect(map.tabIndex).toBe(-1);
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(false);
    fireEvent.contextMenu(map);
    expect(graphics.contextMenu).not.toHaveBeenCalled();

    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-a' }));
    expect(viewport.inert).toBe(true);
    expect(map.getAttribute('data-input-active')).toBe('false');

    flushNextRaf();
    flushNextRaf();
    expect(viewport.inert).toBe(true);
    expect(graphics.mainResize).toHaveBeenCalledOnce();
    expect(graphics.minimapResize).toHaveBeenCalledOnce();
    expect(graphics.mainRepaint).toHaveBeenCalledOnce();
    expect(graphics.minimapRepaint).toHaveBeenCalledOnce();

    act(() => graphics.renderListener?.());
    expect(viewport.inert).toBe(false);
    expect(viewport.style.pointerEvents).toBe('auto');
    expect(map.getAttribute('data-input-active')).toBe('true');
    expect(map.tabIndex).toBe(0);
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(true);
    fireEvent.contextMenu(map);
    expect(graphics.contextMenu).toHaveBeenCalledOnce();
    expect(interactionReady).toHaveBeenLastCalledWith({
      ready: true,
      renderedTurn: 12,
      renderedFingerprint: 'revision-a',
    });

    map.focus();
    expect(document.activeElement).toBe(map);
    view.rerender(createElement(TacticalMapViewport, {
      active: false,
      onInteractionReadyChange: interactionReady,
    }));
    expect(viewport.inert).toBe(true);
    expect(document.activeElement).toBe(warroom);
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(false);
    warroom.remove();
  });

  it('resumes the reveal sequence when hidden after its first frame and enables input only after the replacement render', () => {
    const view = render(createElement(TacticalMapViewport, { active: true }));
    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-a' }));
    flushNextRaf();

    view.rerender(createElement(TacticalMapViewport, { active: false }));
    expect(screen.getByTestId('tactical-map-viewport').inert).toBe(true);
    expect(screen.getByTestId('mock-tactical-map').getAttribute('data-input-active')).toBe('false');

    view.rerender(createElement(TacticalMapViewport, { active: true }));
    flushNextRaf();
    flushNextRaf();
    expect(screen.getByTestId('mock-tactical-map').getAttribute('data-input-active')).toBe('false');
    act(() => graphics.renderListener?.());

    expect(screen.getByTestId('tactical-map-viewport').inert).toBe(false);
    expect(screen.getByTestId('mock-tactical-map').getAttribute('data-input-active')).toBe('true');
    expect(graphics.mainMapConstructions).toHaveBeenCalledOnce();
    expect(graphics.minimapConstructions).toHaveBeenCalledOnce();
  });

  it('fails every viewport input owner closed immediately on fingerprint change and hide', () => {
    const interactionReadiness = vi.fn();
    const view = render(createElement(TacticalMapViewport, {
      active: true,
      onInteractionReadyChange: interactionReadiness,
    }));
    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-a' }));
    flushNextRaf();
    flushNextRaf();
    act(() => graphics.renderListener?.());

    expect(screen.getByTestId('mock-tactical-map').getAttribute('data-input-active')).toBe('true');
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(true);

    act(() => useGameStore.setState({ lastLoadedStateFingerprint: 'revision-b' }));

    const viewport = screen.getByTestId('tactical-map-viewport');
    const map = screen.getByTestId('mock-tactical-map');
    expect(viewport.inert).toBe(true);
    expect(viewport.style.pointerEvents).toBe('none');
    expect(map.getAttribute('data-input-active')).toBe('false');
    expect(map.tabIndex).toBe(-1);
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(false);
    fireEvent.contextMenu(map);
    expect(graphics.contextMenu).not.toHaveBeenCalled();
    expect(interactionReadiness).toHaveBeenLastCalledWith({
      ready: false,
      renderedTurn: 12,
      renderedFingerprint: 'revision-a',
    });

    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-b' }));
    expect(map.getAttribute('data-input-active')).toBe('true');
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(true);

    view.rerender(createElement(TacticalMapViewport, {
      active: false,
      onInteractionReadyChange: interactionReadiness,
    }));
    expect(viewport.inert).toBe(true);
    expect(map.getAttribute('data-input-active')).toBe('false');
    expect(graphics.minimapInputActive).toHaveBeenLastCalledWith(false);
    expect(interactionReadiness.mock.calls.at(-1)?.[0].ready).toBe(false);
  });

  it('disables both production global shortcut owners on the same fingerprint and hide edge', () => {
    const onShellKeyDown = vi.fn();
    const view = render(createElement(IntegratedTacticalOwnership, { active: true, onShellKeyDown }));
    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-a' }));
    flushNextRaf();
    flushNextRaf();
    act(() => graphics.renderListener?.());

    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: 'h' });
    expect(useGameStore.getState().mapMode).toBe('legitimacy');
    expect(onShellKeyDown).toHaveBeenCalledTimes(2);

    act(() => useGameStore.setState({
      lastLoadedStateFingerprint: 'revision-b',
      mapMode: 'political',
    }));
    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: 'h' });
    expect(useGameStore.getState().mapMode).toBe('political');
    expect(onShellKeyDown).toHaveBeenCalledTimes(2);

    act(() => graphics.reportRenderedRevision?.({ turn: 12, fingerprint: 'revision-b' }));
    fireEvent.keyDown(window, { key: 'h' });
    expect(onShellKeyDown).toHaveBeenCalledTimes(3);

    view.rerender(createElement(IntegratedTacticalOwnership, { active: false, onShellKeyDown }));
    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: 'h' });
    expect(useGameStore.getState().mapMode).toBe('political');
    expect(onShellKeyDown).toHaveBeenCalledTimes(3);
  });

  it('remounts the production campaign owner after success but preserves it after failure', async () => {
    let campaignViewportEpoch = 0;
    const view = render(createElement(CampaignTacticalViewportOwner, {
      campaignViewportEpoch,
      loaded: true,
      active: true,
    }));
    expect(graphics.mainMapConstructions).toHaveBeenCalledOnce();

    await act(async () => {
      await expect(runCampaignViewportReplacement(
        async () => 'loaded',
        () => { campaignViewportEpoch += 1; },
      )).resolves.toBe('loaded');
      view.rerender(createElement(CampaignTacticalViewportOwner, {
        campaignViewportEpoch,
        loaded: true,
        active: true,
      }));
    });
    expect(graphics.mainMapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.minimapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.mainMapRemove).toHaveBeenCalledOnce();
    expect(graphics.minimapRemove).toHaveBeenCalledOnce();
    expect(graphics.deckFinalize).toHaveBeenCalledOnce();

    await act(async () => {
      await expect(runCampaignViewportReplacement(
        async () => { throw new Error('invalid save'); },
        () => { campaignViewportEpoch += 1; },
      )).rejects.toThrow('invalid save');
      view.rerender(createElement(CampaignTacticalViewportOwner, {
        campaignViewportEpoch,
        loaded: true,
        active: true,
      }));
    });
    expect(graphics.mainMapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.minimapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.mainMapRemove).toHaveBeenCalledOnce();
    expect(graphics.minimapRemove).toHaveBeenCalledOnce();
    expect(graphics.deckFinalize).toHaveBeenCalledOnce();
  });

  it('mounts the campaign viewport only once when desktop first attaches to an existing session', async () => {
    let campaignLoaded = false;
    let campaignViewportEpoch = 0;
    const onReplacementSucceeded = vi.fn(() => {
      campaignViewportEpoch += 1;
    });
    const owner = createCampaignReplacementCoordinator(
      onReplacementSucceeded,
      () => campaignLoaded,
    );

    await owner.runReplacement(async () => {
      campaignLoaded = true;
    });

    expect(owner.appliedReservation()).toBe(1);
    expect(onReplacementSucceeded).not.toHaveBeenCalled();

    const view = render(createElement(CampaignTacticalViewportOwner, {
      campaignViewportEpoch,
      loaded: campaignLoaded,
      active: true,
    }));
    expect(graphics.mainMapConstructions).toHaveBeenCalledOnce();
    expect(graphics.minimapConstructions).toHaveBeenCalledOnce();

    await owner.runReplacement(async () => undefined);
    view.rerender(createElement(CampaignTacticalViewportOwner, {
      campaignViewportEpoch,
      loaded: campaignLoaded,
      active: true,
    }));

    expect(onReplacementSucceeded).toHaveBeenCalledOnce();
    expect(graphics.mainMapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.minimapConstructions).toHaveBeenCalledTimes(2);
  });

  it('does not advance the campaign epoch when a resolved replacement reports failure', async () => {
    const onReplacementSucceeded = vi.fn();

    await expect(runCampaignViewportReplacement(
      async () => false,
      onReplacementSucceeded,
      (result) => result,
    )).resolves.toBe(false);

    expect(onReplacementSucceeded).not.toHaveBeenCalled();
  });

  it('resets a localized map boundary only when the campaign epoch key changes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const MaybeCrash = ({ crash }: { crash: boolean }) => {
      if (crash) throw new Error('map crash');
      return createElement('div', { 'data-testid': 'healthy-map' });
    };
    const view = render(createElement(
      RootErrorBoundary,
      { zone: 'map', key: 1 },
      createElement(MaybeCrash, { crash: true }),
    ));
    expect(screen.getByTestId('root-error-boundary-map')).toBeTruthy();

    view.rerender(createElement(
      RootErrorBoundary,
      { zone: 'map', key: 1 },
      createElement(MaybeCrash, { crash: false }),
    ));
    expect(screen.queryByTestId('healthy-map')).toBeNull();

    view.rerender(createElement(
      RootErrorBoundary,
      { zone: 'map', key: 2 },
      createElement(MaybeCrash, { crash: false }),
    ));
    expect(screen.getByTestId('healthy-map')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('retains two MapLibre owners and one Deck owner across warm toggles, then releases each exactly once', () => {
    const view = render(createElement(TacticalMapViewport, { active: true }));

    expect(graphics.mainMapConstructions).toHaveBeenCalledOnce();
    expect(graphics.minimapConstructions).toHaveBeenCalledOnce();
    expect(graphics.deckConstructions).toHaveBeenCalledOnce();

    view.rerender(createElement(TacticalMapViewport, { active: false }));
    view.rerender(createElement(TacticalMapViewport, { active: true }));

    expect(graphics.mainMapConstructions).toHaveBeenCalledOnce();
    expect(graphics.minimapConstructions).toHaveBeenCalledOnce();
    expect(graphics.deckConstructions).toHaveBeenCalledOnce();
    expect(graphics.mainMapRemove).not.toHaveBeenCalled();
    expect(graphics.minimapRemove).not.toHaveBeenCalled();
    expect(graphics.deckFinalize).not.toHaveBeenCalled();
    expect(graphics.loseContext).not.toHaveBeenCalled();

    view.unmount();

    expect(graphics.mainMapRemove).toHaveBeenCalledOnce();
    expect(graphics.minimapRemove).toHaveBeenCalledOnce();
    expect(graphics.deckFinalize).toHaveBeenCalledOnce();
    expect(graphics.loseContext).toHaveBeenCalledTimes(3);
  });

  it('releases the complete graphics owner set before a campaign epoch remounts it', () => {
    const view = render(createElement(TacticalMapViewport, { active: true, key: 0 }));
    view.rerender(createElement(TacticalMapViewport, { active: true, key: 1 }));

    expect(graphics.mainMapRemove).toHaveBeenCalledOnce();
    expect(graphics.minimapRemove).toHaveBeenCalledOnce();
    expect(graphics.deckFinalize).toHaveBeenCalledOnce();
    expect(graphics.loseContext).toHaveBeenCalledTimes(3);
    expect(graphics.mainMapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.minimapConstructions).toHaveBeenCalledTimes(2);
    expect(graphics.deckConstructions).toHaveBeenCalledTimes(2);
  });

  it('uses a full-size inert hidden layer and preserves MapContainer as the sole main landmark', () => {
    const viewport = read('src/ui/map/components/TacticalMapViewport.tsx');
    const app = read('src/ui/map/App.tsx');

    expect(viewport).toContain("position: 'absolute'");
    expect(viewport).toContain('inset: 0');
    expect(viewport).toContain("visibility: active ? 'visible' : 'hidden'");
    expect(viewport).toContain("pointerEvents: interactionReady ? 'auto' : 'none'");
    expect(viewport).toContain("aria-hidden={!active}");
    expect(viewport).toContain('viewportRef.current.inert = !interactionReady;');
    expect(viewport).not.toContain("display: 'none'");
    expect(viewport).not.toContain('contentVisibility');
    expect(viewport).toMatch(/<MapContainer[\s\S]*<RootErrorBoundary zone="minimap">[\s\S]*<Minimap/);
    expect((viewport.match(/<main\s/g) ?? [])).toHaveLength(0);
    expect((app.match(/<main\s/g) ?? [])).toHaveLength(0);
  });

  it('reveals in double-frame resize-listen-repaint order before enabling current-revision input', () => {
    const viewport = read('src/ui/map/components/TacticalMapViewport.tsx');
    const firstFrame = viewport.indexOf('requestAnimationFrame(() => {');
    const secondFrame = viewport.indexOf('requestAnimationFrame(() => {', firstFrame + 1);
    const mainResize = viewport.indexOf('mainController.resize()', secondFrame);
    const minimapResize = viewport.indexOf('minimapController?.resize()', mainResize);
    const renderListener = viewport.indexOf('mainController.onceRender(', minimapResize);
    const mainRepaint = viewport.indexOf('mainController.triggerRepaint()', renderListener);
    const minimapRepaint = viewport.indexOf('minimapController?.triggerRepaint()', mainRepaint);
    const revealPaint = viewport.indexOf('setRevealPainted(true)', renderListener);

    expect(firstFrame).toBeGreaterThanOrEqual(0);
    expect(secondFrame).toBeGreaterThan(firstFrame);
    expect(mainResize).toBeGreaterThan(secondFrame);
    expect(minimapResize).toBeGreaterThan(mainResize);
    expect(renderListener).toBeGreaterThan(minimapResize);
    expect(mainRepaint).toBeGreaterThan(renderListener);
    expect(minimapRepaint).toBeGreaterThan(mainRepaint);
    expect(revealPaint).toBeGreaterThan(renderListener);
    expect(viewport).toContain('inputActive={interactionReady}');
    expect(viewport).toContain('revealPainted={revealPainted}');
  });

  it('moves focus to the opaque Warroom owner and clears transient tactical UI on hide', () => {
    const viewport = read('src/ui/map/components/TacticalMapViewport.tsx');
    const app = read('src/ui/map/App.tsx');

    expect(viewport).toContain("querySelector<HTMLElement>('[data-testid=\"warroom-shell\"]')");
    expect(viewport).toContain('activeElement.blur()');
    expect(viewport).toContain('warroom?.focus()');
    expect(viewport).toContain('clearTransientTacticalUi();');
    expect(app).toContain('data-testid="warroom-shell"');
    expect(app).toContain('tabIndex={-1}');
    expect(app).toContain('className="fixed inset-0 z-50 bg-black"');
  });

  it('gates map context menu and both global shortcut owners behind active gameplay', () => {
    const map = read('src/ui/map/map/MapContainer.tsx');
    const shortcuts = read('src/ui/map/hooks/useKeyboardShortcuts.ts');
    const app = read('src/ui/map/App.tsx');
    const inputOwners = read('src/ui/map/components/TacticalInputOwners.tsx');

    expect(map).toMatch(/if \(!inputActive\) return undefined;[\s\S]*handleDocumentContextMenu[\s\S]*if \(!inputActiveRef\.current\) return;/);
    expect(shortcuts).toContain('export function useKeyboardShortcuts(active: boolean): void');
    expect(shortcuts).toMatch(/useEffect\(\(\) => \{[\s\S]*if \(!active\) return undefined;/);
    expect(inputOwners).toContain('useKeyboardShortcuts(active);');
    expect(inputOwners).toContain('useActiveWindowKeydown(active, onShellKeyDown);');
    expect(app).toContain('<TacticalInputOwners');
  });

  it('keeps hidden updates off application RAF and bounds source polling', () => {
    const map = read('src/ui/map/map/MapContainer.tsx');

    expect(map).toContain('scheduleMapApplicationFrame(active,');
    expect(map).toContain('shouldAnimateMapPulse && active');
    expect(map).toContain('if (!active) return;');
    expect(map).toContain('SOURCE_UPDATE_POLL_MAX_ATTEMPTS');
    expect(map).toContain("setMapLoadError('Map source readiness timed out')");
    expect(map).toContain('mapRef.current?.stop();');
  });

  it('does not rebuild completed state or map-mode GeoJSON on a warm visibility-only toggle', () => {
    const map = read('src/ui/map/map/MapContainer.tsx');

    expect(map).toMatch(/const runDeferred = \(\) => \{\s*deferredOverlayHandleRef\.current = null;/);
    expect(map).toContain('scheduleMapApplicationFrame(activeRef.current,');
    expect(map).not.toContain('}, [active, mapReady, osidPropertiesMap, mapMode, loadedGameState]);');
    expect(map).not.toContain('}, [active, mapReady, mapMode, loadedGameState]);');
  });

  it('replays retained readiness milestones inside each active transition before completion', () => {
    const map = read('src/ui/map/map/MapContainer.tsx');

    expect(map).toMatch(/if \(!active\) return;[\s\S]*markMapTransition\('viewport-visible'\);[\s\S]*markMapTransition\('core-data-ready'\);[\s\S]*markMapTransition\('map-created'\);[\s\S]*markMapTransition\('style-loaded'\);/);
    expect(map).toContain('const styleReadinessRef = useRef(createRetainedMapStyleReadiness());');
    expect(map).toMatch(/styleReadinessRef\.current\.invalidateForReplacement\(\);[\s\S]*new maplibregl\.Map/);
    expect(map).toMatch(/map\.once\('style\.load', \(\) => \{[\s\S]*styleReadinessRef\.current\.markLoaded\(\);[\s\S]*if \(activeRef\.current\) markMapTransition\('style-loaded'\);/);
    expect(map).toMatch(/if \(styleReadinessRef\.current\.loaded\) markMapTransition\('style-loaded'\);/);
    expect(map).not.toMatch(/if \(map\.isStyleLoaded\(\)\) markMapTransition\('style-loaded'\);/);
    expect(map).toContain('const currentMapStateReady = active && revealPainted && styleReady && currentRevisionReady;');
    expect(map).toMatch(/if \(!active \|\| !currentRevisionReady\) return;[\s\S]*markMapTransition\('current-state-rendered'\);/);
    expect(map.indexOf("markMapTransition('current-state-rendered')"))
      .toBeLessThan(map.indexOf("markMapTransition('interactive')"));
  });
});
