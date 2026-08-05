import { describe, expect, it, vi } from 'vitest';
import {
  additionalCameraPadding,
  cameraOffsetForPadding,
  hasUsableMapCanvas,
  safeScalarMapPadding,
  releaseMapWebGlContext,
  releaseStandaloneDeckWebGlContext,
  isTacticalMapStateReady,
  createRetainedMapStyleReadiness,
  createRetainedRevisionCommitTracker,
} from '../../src/ui/map/map/mapContextLifecycle.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('map context lifecycle', () => {
  it('clamps scalar fit padding to the live canvas and rejects zero-size canvases', () => {
    expect(safeScalarMapPadding({ clientWidth: 120, clientHeight: 80 }, 80)).toBe(39);
    expect(safeScalarMapPadding({ clientWidth: 500, clientHeight: 300 }, 60)).toBe(60);
    expect(safeScalarMapPadding({ clientWidth: 0, clientHeight: 300 }, 60)).toBeNull();
    expect(hasUsableMapCanvas({
      clientWidth: 500,
      clientHeight: 300,
      getBoundingClientRect: () => ({ width: 0, height: 0 }),
    })).toBe(false);
  });

  it('converts asymmetric UI padding to a transient camera offset', () => {
    expect(cameraOffsetForPadding({ top: 40, right: 20, bottom: 10, left: 100 })).toEqual([40, 15]);
  });

  it('passes only padding not already applied to the map camera', () => {
    expect(additionalCameraPadding(
      { top: 124, right: 420, bottom: 184, left: 380 },
      { top: 124, right: 420, bottom: 184, left: 380 },
    )).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(additionalCameraPadding(
      { top: 140, right: 440, bottom: 184, left: 400 },
      { top: 124, right: 420, bottom: 200, left: 380 },
    )).toEqual({ top: 16, right: 20, bottom: 0, left: 20 });
    expect(additionalCameraPadding(
      { top: 140, right: 440, bottom: 184, left: 400 },
      { left: 380 },
    )).toEqual({ top: 140, right: 440, bottom: 184, left: 20 });
  });

  it('detaches live map refs before finalizing WebGL owners', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'map', 'MapContainer.tsx'), 'utf8');
    const cleanup = source.slice(
      source.indexOf('return () => {\n      initCancelled = true;'),
      source.indexOf('  }, [mapInitAttempt, onGraphicsController]);'),
    );

    expect(cleanup.indexOf('deckOverlayRef.current = null;')).toBeLessThan(cleanup.indexOf('releaseStandaloneDeckWebGlContext'));
    expect(cleanup.indexOf('mapRef.current = null;')).toBeLessThan(cleanup.indexOf('releaseMapWebGlContext'));
  });

  it('retains all three graphics owners through warm navigation and releases only on viewport teardown', () => {
    const app = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'App.tsx'), 'utf8');
    const viewport = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'components', 'TacticalMapViewport.tsx'), 'utf8');
    const map = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'map', 'MapContainer.tsx'), 'utf8');
    const minimap = readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'components', 'Minimap.tsx'), 'utf8');

    expect(app).toMatch(/<CampaignTacticalViewportOwner[\s\S]*loaded=\{loadedGameState !== null && appScreen !== 'mainMenu'\}/);
    expect(viewport).toContain('active={active}');
    expect(viewport).toContain('<Minimap active={interactionReady}');
    expect(map).toContain('releaseStandaloneDeckWebGlContext(deckOverlay)');
    expect(map).toContain('releaseMapWebGlContext(mapToRelease)');
    expect(minimap).toContain('releaseMapWebGlContext(map)');
    expect(map).not.toMatch(/active[\s\S]{0,160}releaseMapWebGlContext/);
    expect(minimap).not.toMatch(/active[\s\S]{0,160}releaseMapWebGlContext/);
  });

  it('reports readiness only when the painted map belongs to the current turn', () => {
    expect(isTacticalMapStateReady(false, null, 1, null, 'a')).toBe(false);
    expect(isTacticalMapStateReady(true, null, 1, null, 'a')).toBe(false);
    expect(isTacticalMapStateReady(true, 1, 2, 'a', 'a')).toBe(false);
    expect(isTacticalMapStateReady(true, 2, 2, 'a', 'b')).toBe(false);
    expect(isTacticalMapStateReady(true, 2, 2, 'b', 'b')).toBe(true);
  });

  it('retains initial style readiness across warm navigation and invalidates it only for replacement', () => {
    const readiness = createRetainedMapStyleReadiness();

    expect(readiness.loaded).toBe(false);
    readiness.markLoaded();
    expect(readiness.loaded).toBe(true);

    // A warm hide/reveal performs no lifecycle action, so readiness remains reusable.
    expect(readiness.loaded).toBe(true);

    readiness.invalidateForReplacement();
    expect(readiness.loaded).toBe(false);
    readiness.markLoaded();
    expect(readiness.loaded).toBe(true);
  });

  it('reapplies an in-flight revision cancelled after its first frame, then commits only after render', () => {
    const tracker = createRetainedRevisionCommitTracker<string>();
    const firstAttempt = tracker.begin('turn-1');

    expect(tracker.shouldApply('turn-1')).toBe(true);
    expect(tracker.isInFlight(firstAttempt)).toBe(true);
    tracker.cancel(firstAttempt);
    expect(tracker.isInFlight(firstAttempt)).toBe(false);
    expect(tracker.shouldApply('turn-1')).toBe(true);

    const resumedAttempt = tracker.begin('turn-1');
    expect(tracker.commit(resumedAttempt)).toBe(true);
    expect(tracker.shouldApply('turn-1')).toBe(false);
  });

  it('keeps a fully rendered revision committed across a warm hide/reveal', () => {
    const tracker = createRetainedRevisionCommitTracker<string>();
    const attempt = tracker.begin('turn-1');

    expect(tracker.commit(attempt)).toBe(true);
    tracker.cancel(attempt);
    expect(tracker.shouldApply('turn-1')).toBe(false);

    const staleAttempt = tracker.begin('turn-2');
    const replacementAttempt = tracker.begin('turn-3');
    expect(tracker.commit(staleAttempt)).toBe(false);
    expect(tracker.commit(replacementAttempt)).toBe(true);
    expect(tracker.shouldApply('turn-3')).toBe(false);
  });

  it('removes the map and explicitly releases its WebGL context', () => {
    const loseContext = vi.fn();
    const remove = vi.fn();
    const getContext = vi.fn(() => ({ getExtension: () => ({ loseContext }), isContextLost: () => false }));
    const map = {
      getCanvas: () => ({ getContext }),
      remove,
    };

    releaseMapWebGlContext(map as never);

    expect(remove).toHaveBeenCalledOnce();
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('does not lose an already-lost context twice', () => {
    const loseContext = vi.fn();
    const map = {
      getCanvas: () => ({
        getContext: () => ({ getExtension: () => ({ loseContext }), isContextLost: () => true }),
      }),
      remove: vi.fn(),
    };

    releaseMapWebGlContext(map as never);

    expect(loseContext).not.toHaveBeenCalled();
  });

  it('finalizes and explicitly releases a standalone Deck context', () => {
    const loseContext = vi.fn();
    const finalize = vi.fn();
    const overlay = {
      getCanvas: () => ({
        getContext: () => ({ getExtension: () => ({ loseContext }), isContextLost: () => false }),
      }),
      finalize,
    };

    releaseStandaloneDeckWebGlContext(overlay as never);

    expect(finalize).toHaveBeenCalledOnce();
    expect(loseContext).toHaveBeenCalledOnce();
  });
});
