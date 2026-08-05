import { describe, expect, it, vi } from 'vitest';
import type { FieldOperationPlanTarget } from '../../src/ui/map/utils/fieldInspectionTarget.js';
import {
  createFieldOperationFocusController,
  expandFieldOperationSafePadding,
  fieldOperationSafeViewportCorrection,
  fieldOperationSafeViewportZoomTarget,
  isPointInsideFieldOperationSafeViewport,
  ordinaryCameraOwnsNavigation,
  syncFieldOperationOverlayWhenStyleReady,
  type FieldOperationFocusCamera,
  type FieldOperationFocusBounds,
  type FieldOperationFocusPadding,
} from '../../src/ui/map/map/fieldOperationFocusController.js';

const target = (proposalId = 'review-cerska'): FieldOperationPlanTarget => ({
  kind: 'field-operation-plan',
  proposalId,
  corpsId: 'vrs_drina',
  objectiveOsids: ['north', 'south'],
  stagingOsids: ['west'],
  formationIds: [],
});

function fakeCamera(overrides: Partial<FieldOperationFocusCamera> = {}) {
  let padding: FieldOperationFocusPadding = { top: 124, right: 420, bottom: 184, left: 380 };
  let maxBounds: FieldOperationFocusBounds = [[15.45, 42.55719], [19.92, 45.270542]];
  let center: [number, number] = [18, 44];
  let zoom = 8.5;
  let moveEndListener: (() => void) | null = null;
  const calls: string[] = [];
  const fireMoveEnd = () => {
    const listener = moveEndListener;
    moveEndListener = null;
    listener?.();
  };
  const camera: FieldOperationFocusCamera = {
    getCanvas: () => ({
      clientWidth: 1386,
      clientHeight: 837,
      width: 1386,
      height: 837,
      getBoundingClientRect: () => ({ width: 1386, height: 837 }) as DOMRect,
    }),
    getPadding: () => padding,
    setPadding: (next) => { padding = next; calls.push(`padding:${JSON.stringify(next)}`); },
    getMaxBounds: () => maxBounds,
    setMaxBounds: (next) => { maxBounds = next; calls.push(`bounds:${JSON.stringify(next)}`); },
    cameraForBounds: vi.fn(() => ({ center: { lng: 18, lat: 44 }, zoom: 8.5 })),
    getCenter: () => center,
    getZoom: () => zoom,
    project: vi.fn(() => ({ x: 400, y: 300 })),
    onceMoveEnd: vi.fn((listener) => {
      moveEndListener = listener;
      return () => { if (moveEndListener === listener) moveEndListener = null; };
    }),
    easeTo: vi.fn((options) => {
      center = Array.isArray(options.center) ? options.center : [options.center.lng, options.center.lat];
      zoom = options.zoom;
      calls.push('ease');
      fireMoveEnd();
    }),
    panBy: vi.fn(() => { calls.push('pan'); fireMoveEnd(); }),
    stop: vi.fn(() => { calls.push('stop'); }),
    ...overrides,
  };
  return { camera, calls, getPadding: () => padding, getMaxBounds: () => maxBounds, fireMoveEnd };
}

function controllerFor(camera: FieldOperationFocusCamera, coordinates: Record<string, [number, number]>) {
  return createFieldOperationFocusController({
    camera,
    canApply: () => true,
    resolveCentroid: (osid) => coordinates[osid] ?? null,
    buildPadding: () => ({ top: 72, right: 388, bottom: 64, left: 24 }),
    buildRestorePadding: () => ({ top: 124, right: 420, bottom: 184, left: 380 }),
  });
}

describe('field operation focus controller', () => {
  it('applies exactly once after reveal even while style loading is transiently false', () => {
    const { camera } = fakeCamera();
    const controller = controllerFor(camera, { north: [19, 45], south: [18, 43], west: [17, 44] });

    const first = controller.request(target());
    const second = controller.request(target());

    expect(first).toMatchObject({ status: 'applied', key: 'review-cerska|north|south|west', target: { center: [18, 44], zoom: 8.5 } });
    expect(second).toBe(first);
    expect(camera.cameraForBounds).toHaveBeenCalledOnce();
    expect(camera.cameraForBounds).toHaveBeenCalledWith([[17, 43], [19, 45]], {
      padding: { top: 72, right: 388, bottom: 64, left: 24 },
      maxZoom: 10,
    });
    expect(camera.easeTo).toHaveBeenCalledOnce();
    expect(camera.easeTo).toHaveBeenCalledWith({
      center: { lng: 18, lat: 44 },
      zoom: 8.5,
      duration: 450,
      essential: true,
    });
    expect(controller.getCameraOwner()).toBe('field-operation');
    expect(ordinaryCameraOwnsNavigation(controller)).toBe(false);
  });

  it('reports missing centroids honestly and restores ordinary navigation', () => {
    const { camera, getPadding, getMaxBounds } = fakeCamera();
    const controller = controllerFor(camera, { north: [19, 45], west: [17, 44] });

    expect(controller.request(target())).toMatchObject({
      status: 'failed',
      target: null,
      reason: 'missing-centroids:south',
    });
    expect(getPadding()).toEqual({ top: 124, right: 420, bottom: 184, left: 380 });
    expect(getMaxBounds()).toEqual([[15.45, 42.55719], [19.92, 45.270542]]);
    expect(ordinaryCameraOwnsNavigation(controller)).toBe(true);
    expect(camera.easeTo).not.toHaveBeenCalled();
  });

  it('cancels on return, is idempotent per key, and reapplies a new key', () => {
    const fixture = fakeCamera();
    const { camera } = fixture;
    const controller = controllerFor(camera, { north: [19, 45], south: [18, 43], west: [17, 44] });
    const first = controller.request(target());
    expect(controller.request(target())).toBe(first);
    expect(controller.cancel(first.key, 'return-to-dossier')).toMatchObject({ status: 'cancelled', reason: 'return-to-dossier' });
    expect(ordinaryCameraOwnsNavigation(controller)).toBe(true);
    expect(fixture.getMaxBounds()).toEqual([[15.45, 42.55719], [19.92, 45.270542]]);

    expect(controller.request(target('review-prijedor'))).toMatchObject({ status: 'applied' });
    expect(camera.cameraForBounds).toHaveBeenCalledTimes(2);
    expect(fixture.getMaxBounds()).toBeNull();
  });

  it('suspends maxBounds only for field ownership and restores the exact snapshot idempotently', () => {
    const fixture = fakeCamera();
    const controller = controllerFor(fixture.camera, { north: [19, 45], south: [18, 43], west: [17, 44] });

    const applied = controller.request(target());
    expect(applied.status).toBe('applied');
    expect(controller.getCameraOwner()).toBe('field-operation');
    expect(fixture.getMaxBounds()).toBeNull();

    controller.clear('campaign-replacement');
    controller.clear('component-unmount');
    expect(controller.getCameraOwner()).toBe('ordinary');
    expect(fixture.getMaxBounds()).toEqual([[15.45, 42.55719], [19.92, 45.270542]]);
    expect(fixture.calls.filter((call) => call.startsWith('bounds:'))).toEqual([
      'bounds:null',
      'bounds:[[15.45,42.55719],[19.92,45.270542]]',
    ]);
  });

  it('restores the exact defined prior padding when camera fitting throws or returns null', () => {
    for (const cameraForBounds of [
      vi.fn(() => null),
      vi.fn(() => { throw new Error('fit failed'); }),
    ]) {
      const { camera, getPadding, getMaxBounds } = fakeCamera({ cameraForBounds });
      const controller = controllerFor(camera, { north: [19, 45], south: [18, 43], west: [17, 44] });
      expect(controller.request(target()).status).toBe('failed');
      expect(getPadding()).toEqual({ top: 124, right: 420, bottom: 184, left: 380 });
      expect(getMaxBounds()).toEqual([[15.45, 42.55719], [19.92, 45.270542]]);
      expect(camera.easeTo).not.toHaveBeenCalled();
    }
  });

  it('uses the occluder-safe viewport rather than raw canvas edges', () => {
    const padding = { top: 72, right: 388, bottom: 64, left: 24 };
    expect(isPointInsideFieldOperationSafeViewport({ point: { x: 400, y: 100 }, width: 1386, height: 837, padding })).toBe(true);
    expect(isPointInsideFieldOperationSafeViewport({ point: { x: 1100, y: 100 }, width: 1386, height: 837, padding })).toBe(false);
    expect(isPointInsideFieldOperationSafeViewport({ point: { x: 400, y: 20 }, width: 1386, height: 837, padding })).toBe(false);
  });

  it('computes the exact asymmetric Drina correction and applies it once before receipt', () => {
    const fixture = fakeCamera();
    let corrected = false;
    fixture.camera.project = vi.fn(([lng]) => {
      const initialX = lng === 19 ? -9 : lng === 18 ? 117 : 639;
      return { x: initialX + (corrected ? 33 : 0), y: 400 };
    });
    fixture.camera.panBy = vi.fn((offset) => {
      expect(offset).toEqual([-33, 0]);
      corrected = true;
      fixture.fireMoveEnd();
    });
    const controller = controllerFor(fixture.camera, { north: [19, 45], south: [18, 43], west: [17, 44] });

    expect(controller.request(target())).toMatchObject({ status: 'applied' });
    expect(fixture.camera.panBy).toHaveBeenCalledOnce();
    expect(controller.getDiagnostics()).toMatchObject({ requestCount: 1, appliedCount: 1 });
  });

  it('publishes pending until moveend verification, then applied', () => {
    const fixture = fakeCamera({ easeTo: vi.fn() });
    const controller = controllerFor(fixture.camera, { north: [19, 45], south: [18, 43], west: [17, 44] });
    const statuses: string[] = [];
    controller.subscribe((next) => statuses.push(next.status));

    expect(controller.request(target()).status).toBe('pending');
    expect(controller.getDiagnostics().appliedCount).toBe(0);
    fixture.fireMoveEnd();
    expect(controller.getReceipt()?.status).toBe('applied');
    expect(statuses).toEqual(['pending', 'applied']);
  });

  it('recovers from a maxBounds-clamped pan with one deterministic zoom-out', () => {
    const fixture = fakeCamera();
    let easeCount = 0;
    let zoomRecovered = false;
    let currentZoom = 8.5;
    fixture.camera.getZoom = () => currentZoom;
    fixture.camera.project = vi.fn(([lng]) => {
      if (lng === 19) return { x: zoomRecovered ? 930 : 1004, y: 400 };
      return { x: lng === 18 ? 500 : 200, y: 300 };
    });
    fixture.camera.panBy = vi.fn(() => fixture.fireMoveEnd());
    fixture.camera.easeTo = vi.fn((options) => {
      easeCount += 1;
      if (easeCount === 2) {
        currentZoom = options.zoom;
        zoomRecovered = true;
      }
      fixture.fireMoveEnd();
    });
    const controller = controllerFor(fixture.camera, { north: [19, 45], south: [18, 43], west: [17, 44] });

    expect(controller.request(target())).toMatchObject({ status: 'applied' });
    expect(fixture.camera.panBy).toHaveBeenCalledOnce();
    expect(fixture.camera.easeTo).toHaveBeenCalledTimes(2);
    expect(currentZoom).toBeLessThan(8.5);
    expect(controller.getDiagnostics().safeViewportAttempts.map((attempt) => attempt.correction?.kind ?? null))
      .toEqual(['pan', 'zoom', null]);
  });

  it('fails honestly and restores prior padding when bounded pan and zoom recovery are insufficient', () => {
    const fixture = fakeCamera();
    fixture.camera.project = vi.fn(() => ({ x: -100, y: 400 }));
    fixture.camera.panBy = vi.fn(() => fixture.fireMoveEnd());
    const controller = controllerFor(fixture.camera, { north: [19, 45], south: [18, 43], west: [17, 44] });

    expect(controller.request(target())).toMatchObject({ status: 'failed', reason: 'unsafe-viewport-after-correction' });
    expect(fixture.camera.panBy).toHaveBeenCalledOnce();
    expect(fixture.camera.easeTo).toHaveBeenCalledTimes(2);
    expect(fixture.getPadding()).toEqual({ top: 124, right: 420, bottom: 184, left: 380 });
    expect(fixture.getMaxBounds()).toEqual([[15.45, 42.55719], [19.92, 45.270542]]);
    expect(ordinaryCameraOwnsNavigation(controller)).toBe(true);
    const attempts = controller.getDiagnostics().safeViewportAttempts;
    expect(attempts).toHaveLength(3);
    expect(attempts.map((attempt) => attempt.correction?.kind ?? null)).toEqual(['pan', 'zoom', null]);
    expect(attempts[0]).toMatchObject({
      attempt: 1,
      correction: { kind: 'pan', offset: [-124, 0] },
    });
    expect(attempts[0]?.points[0]).toEqual({ osid: 'north', x: -100, y: 400, inside: false });
  });

  it('derives minimal panBy offsets from the exact projected bbox', () => {
    expect(fieldOperationSafeViewportCorrection({
      points: [{ x: -9, y: 618 }, { x: 117, y: 339 }, { x: 639, y: 707 }],
      width: 1386,
      height: 837,
      padding: { top: 136, right: 452, bottom: 128, left: 88 },
    })).toEqual([-97, 0]);
  });

  it('derives a deterministic zoom-out target when a fitted point cannot be panned inside', () => {
    const targetZoom = fieldOperationSafeViewportZoomTarget({
      points: [{ x: 201.5, y: 261 }, { x: 1003.8926440217315, y: 382.5 }],
      width: 1386,
      height: 837,
      padding: { top: 136, right: 452, bottom: 128, left: 88 },
      currentZoom: 8.733256991943485,
    });
    expect(targetZoom).not.toBeNull();
    expect(targetZoom!).toBeLessThan(8.4);
    expect(targetZoom!).toBeGreaterThan(8.2);
  });

  it('adds deterministic projection slack on every safe-viewport edge', () => {
    expect(expandFieldOperationSafePadding({ top: 72, right: 388, bottom: 64, left: 24 }, 64)).toEqual({
      top: 136,
      right: 452,
      bottom: 128,
      left: 88,
    });
  });

  it('retries overlay sync independently on styledata and supports unconditional cleanup', () => {
    let loaded = false;
    let listener: (() => void) | null = null;
    const sync = vi.fn();
    const lifecycle = {
      isStyleLoaded: () => loaded,
      on: vi.fn((_event: 'styledata', next: () => void) => { listener = next; }),
      off: vi.fn((_event: 'styledata', next: () => void) => { if (listener === next) listener = null; }),
    };
    const cleanup = syncFieldOperationOverlayWhenStyleReady(lifecycle, sync);
    expect(sync).not.toHaveBeenCalled();
    loaded = true;
    (listener as (() => void) | null)?.();
    expect(sync).toHaveBeenCalledOnce();
    cleanup();
    expect(lifecycle.off).toHaveBeenCalled();
  });
});
