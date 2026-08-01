import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget.js';

export interface FieldOperationFocusPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type FieldOperationFocusBounds = [[number, number], [number, number]] | null;

export type FieldOperationFocusStatus = 'pending' | 'applied' | 'failed' | 'cancelled';
export type TacticalCameraOwner = 'ordinary' | 'field-operation';

export interface FieldOperationFocusReceipt {
  key: string;
  proposalId: string;
  status: FieldOperationFocusStatus;
  target: { center: [number, number]; zoom: number } | null;
  reason: string | null;
}

export interface FieldOperationSafeViewportPointDiagnostic {
  osid: string;
  x: number;
  y: number;
  inside: boolean;
}

export interface FieldOperationSafeViewportAttemptDiagnostic {
  attempt: number;
  correction:
    | { kind: 'pan'; offset: [number, number] }
    | { kind: 'zoom'; targetZoom: number }
    | null;
  points: FieldOperationSafeViewportPointDiagnostic[];
}

export interface FieldOperationFocusDiagnostics {
  requestCount: number;
  appliedCount: number;
  cancelCount: number;
  safeViewportAttempts: FieldOperationSafeViewportAttemptDiagnostic[];
  boundsSuspended: boolean;
}

export interface FieldOperationFocusCamera {
  getCanvas(): Pick<HTMLCanvasElement, 'clientWidth' | 'clientHeight' | 'width' | 'height' | 'getBoundingClientRect'>;
  getPadding(): FieldOperationFocusPadding;
  setPadding(padding: FieldOperationFocusPadding): void;
  getMaxBounds(): FieldOperationFocusBounds;
  setMaxBounds(bounds: FieldOperationFocusBounds): void;
  cameraForBounds(
    bounds: [[number, number], [number, number]],
    options: { padding: FieldOperationFocusPadding; maxZoom: number },
  ): { center?: { lng: number; lat: number } | [number, number]; zoom?: number } | null | undefined;
  getCenter(): { lng: number; lat: number } | [number, number];
  getZoom(): number;
  project(coordinate: [number, number]): { x: number; y: number };
  onceMoveEnd(listener: () => void): () => void;
  easeTo(options: {
    center: { lng: number; lat: number } | [number, number];
    zoom: number;
    duration: number;
    essential: boolean;
  }): void;
  panBy(offset: [number, number], options: { duration: number; essential: boolean }): void;
  stop(): void;
}

export interface FieldOperationFocusController {
  request(target: FieldOperationPlanTarget): FieldOperationFocusReceipt;
  cancel(key: string, reason?: string): FieldOperationFocusReceipt | null;
  clear(reason?: string): FieldOperationFocusReceipt | null;
  getReceipt(): FieldOperationFocusReceipt | null;
  getCameraOwner(): TacticalCameraOwner;
  getDiagnostics(): FieldOperationFocusDiagnostics;
  subscribe(listener: (receipt: FieldOperationFocusReceipt) => void): () => void;
}

export const ZERO_FIELD_OPERATION_PADDING: FieldOperationFocusPadding = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function fieldOperationFocusKey(target: FieldOperationPlanTarget): string {
  return [target.proposalId, ...target.objectiveOsids, ...target.stagingOsids].join('|');
}

export function fieldOperationUnionBounds(
  coordinates: readonly [number, number][],
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function isPointInsideFieldOperationSafeViewport(args: {
  point: { x: number; y: number };
  width: number;
  height: number;
  padding: FieldOperationFocusPadding;
}): boolean {
  const { point, width, height, padding } = args;
  return point.x >= padding.left
    && point.y >= padding.top
    && point.x <= width - padding.right
    && point.y <= height - padding.bottom;
}

export function expandFieldOperationSafePadding(
  padding: FieldOperationFocusPadding,
  margin: number,
): FieldOperationFocusPadding {
  const safeMargin = Number.isFinite(margin) ? Math.max(0, Math.ceil(margin)) : 0;
  return {
    top: padding.top + safeMargin,
    right: padding.right + safeMargin,
    bottom: padding.bottom + safeMargin,
    left: padding.left + safeMargin,
  };
}

/** Returns the single bounded MapLibre panBy correction for an unsafe pixel bbox. */
export function fieldOperationSafeViewportCorrection(args: {
  points: readonly { x: number; y: number }[];
  width: number;
  height: number;
  padding: FieldOperationFocusPadding;
}): [number, number] | null {
  if (args.points.length === 0) return null;
  const minX = Math.min(...args.points.map((point) => point.x));
  const maxX = Math.max(...args.points.map((point) => point.x));
  const minY = Math.min(...args.points.map((point) => point.y));
  const maxY = Math.max(...args.points.map((point) => point.y));
  const safeLeft = args.padding.left;
  const safeRight = args.width - args.padding.right;
  const safeTop = args.padding.top;
  const safeBottom = args.height - args.padding.bottom;
  if (minX >= safeLeft && maxX <= safeRight && minY >= safeTop && maxY <= safeBottom) return null;

  const contentDx = minX < safeLeft && maxX > safeRight
    ? (safeLeft + safeRight - minX - maxX) / 2
    : minX < safeLeft
      ? safeLeft - minX
      : maxX > safeRight
        ? safeRight - maxX
        : 0;
  const contentDy = minY < safeTop && maxY > safeBottom
    ? (safeTop + safeBottom - minY - maxY) / 2
    : minY < safeTop
      ? safeTop - minY
      : maxY > safeBottom
        ? safeBottom - maxY
        : 0;
  // MapLibre panBy moves projected content opposite its offset.
  return [contentDx === 0 ? 0 : -contentDx, contentDy === 0 ? 0 : -contentDy];
}

/**
 * Returns one deterministic zoom-out target for a camera whose corrective pan
 * was constrained (for example by MapLibre maxBounds). Projection scales
 * around the unpadded canvas center because the field transaction neutralizes
 * persistent camera padding before fitting.
 */
export function fieldOperationSafeViewportZoomTarget(args: {
  points: readonly { x: number; y: number }[];
  width: number;
  height: number;
  padding: FieldOperationFocusPadding;
  currentZoom: number;
}): number | null {
  if (args.points.length === 0 || !Number.isFinite(args.currentZoom)) return null;
  const pivotX = args.width / 2;
  const pivotY = args.height / 2;
  const safeLeft = args.padding.left;
  const safeRight = args.width - args.padding.right;
  const safeTop = args.padding.top;
  const safeBottom = args.height - args.padding.bottom;
  if (pivotX < safeLeft || pivotX > safeRight || pivotY < safeTop || pivotY > safeBottom) return null;

  let scale = 1;
  for (const point of args.points) {
    if (point.x < safeLeft) {
      if (point.x >= pivotX) return null;
      scale = Math.min(scale, (pivotX - safeLeft) / (pivotX - point.x));
    } else if (point.x > safeRight) {
      if (point.x <= pivotX) return null;
      scale = Math.min(scale, (safeRight - pivotX) / (point.x - pivotX));
    }
    if (point.y < safeTop) {
      if (point.y >= pivotY) return null;
      scale = Math.min(scale, (pivotY - safeTop) / (pivotY - point.y));
    } else if (point.y > safeBottom) {
      if (point.y <= pivotY) return null;
      scale = Math.min(scale, (safeBottom - pivotY) / (point.y - pivotY));
    }
  }
  if (!Number.isFinite(scale) || scale >= 1 || scale <= 0) return null;
  // Two percent deterministic slack avoids floating-point edge equality while
  // the subsequent exact projection verification remains authoritative.
  const zoomScale = Math.max(0.01, scale * 0.98);
  return args.currentZoom + Math.log2(zoomScale);
}

function cameraCenterTuple(center: { lng: number; lat: number } | [number, number]): [number, number] {
  return Array.isArray(center) ? [center[0], center[1]] : [center.lng, center.lat];
}

function cloneFieldOperationBounds(bounds: FieldOperationFocusBounds): FieldOperationFocusBounds {
  return bounds
    ? [[bounds[0][0], bounds[0][1]], [bounds[1][0], bounds[1][1]]]
    : null;
}

/**
 * Owns the complete camera transaction. Style overlays are deliberately not a
 * dependency: MapLibre may report transient source/style work while its camera
 * remains ready. Every failed transaction restores a defined prior padding.
 */
export function createFieldOperationFocusController(args: {
  camera: FieldOperationFocusCamera;
  canApply: () => boolean;
  resolveCentroid: (osid: string) => [number, number] | null;
  buildPadding: () => FieldOperationFocusPadding;
  buildRestorePadding: () => FieldOperationFocusPadding;
}): FieldOperationFocusController {
  let receipt: FieldOperationFocusReceipt | null = null;
  let cameraOwner: TacticalCameraOwner = 'ordinary';
  let requestCount = 0;
  let appliedCount = 0;
  let cancelCount = 0;
  let transactionToken = 0;
  let removeMoveEndListener: (() => void) | null = null;
  let safeViewportAttempts: FieldOperationSafeViewportAttemptDiagnostic[] = [];
  let ownedPriorMaxBounds: FieldOperationFocusBounds | undefined;
  const listeners = new Set<(nextReceipt: FieldOperationFocusReceipt) => void>();

  const publishReceipt = (nextReceipt: FieldOperationFocusReceipt) => {
    receipt = nextReceipt;
    for (const listener of listeners) listener(nextReceipt);
    return nextReceipt;
  };

  const cancelPendingMoveEnd = () => {
    removeMoveEndListener?.();
    removeMoveEndListener = null;
  };

  const restoreOrdinaryCamera = (padding = args.buildRestorePadding()) => {
    transactionToken += 1;
    cancelPendingMoveEnd();
    args.camera.stop();
    if (ownedPriorMaxBounds !== undefined) {
      const bounds = ownedPriorMaxBounds;
      ownedPriorMaxBounds = undefined;
      args.camera.setMaxBounds(bounds);
    }
    args.camera.setPadding(padding);
    cameraOwner = 'ordinary';
  };

  const failTransaction = (
    pendingReceipt: FieldOperationFocusReceipt,
    reason: string,
    priorPadding?: FieldOperationFocusPadding,
  ) => {
    restoreOrdinaryCamera(priorPadding ?? args.buildRestorePadding());
    return publishReceipt({ ...pendingReceipt, status: 'failed', target: null, reason });
  };

  return {
    request(target) {
      const key = fieldOperationFocusKey(target);
      if (receipt?.key === key && (receipt.status === 'pending' || receipt.status === 'applied')) return receipt;
      if (receipt?.key !== key && cameraOwner === 'field-operation') restoreOrdinaryCamera();
      requestCount += 1;
      safeViewportAttempts = [];
      transactionToken += 1;
      const token = transactionToken;

      const pendingReceipt = publishReceipt({
        key,
        proposalId: target.proposalId,
        status: 'pending',
        target: null,
        reason: null,
      });
      cameraOwner = 'field-operation';
      if (!args.canApply()) {
        return failTransaction(pendingReceipt, 'map-not-ready');
      }

      const requestedOsids = [...target.objectiveOsids, ...target.stagingOsids];
      const resolved = requestedOsids.map((osid) => ({ osid, coordinate: args.resolveCentroid(osid) }));
      const missing = resolved.filter((item) => item.coordinate == null).map((item) => item.osid);
      const coordinates = resolved.flatMap((item) => item.coordinate ? [item.coordinate] : []);
      const bounds = fieldOperationUnionBounds(coordinates);
      if (missing.length > 0 || !bounds) {
        return failTransaction(
          pendingReceipt,
          missing.length > 0 ? `missing-centroids:${missing.join('|')}` : 'no-focus-coordinates',
        );
      }

      const priorPadding = args.camera.getPadding();
      const fieldPadding = args.buildPadding();
      const currentTarget = () => ({
        center: cameraCenterTuple(args.camera.getCenter()),
        zoom: args.camera.getZoom(),
      });
      const verifySafeViewport = (recovery: 'pan' | 'zoom' | 'none') => {
        if (token !== transactionToken || receipt?.key !== key || receipt.status !== 'pending') return;
        removeMoveEndListener = null;
        try {
          const canvas = args.camera.getCanvas();
          const rect = canvas.getBoundingClientRect();
          const width = rect.width || canvas.clientWidth || canvas.width;
          const height = rect.height || canvas.clientHeight || canvas.height;
          const projected = resolved.flatMap((item) => item.coordinate
            ? [{ osid: item.osid, point: args.camera.project(item.coordinate) }]
            : []);
          const points = projected.map((item) => item.point);
          const panCorrection = fieldOperationSafeViewportCorrection({ points, width, height, padding: fieldPadding });
          const zoomTarget = recovery === 'zoom'
            ? fieldOperationSafeViewportZoomTarget({
              points,
              width,
              height,
              padding: fieldPadding,
              currentZoom: args.camera.getZoom(),
            })
            : null;
          const correction = recovery === 'pan' && panCorrection
            ? { kind: 'pan' as const, offset: panCorrection }
            : recovery === 'zoom' && zoomTarget != null
              ? { kind: 'zoom' as const, targetZoom: zoomTarget }
              : null;
          safeViewportAttempts.push({
            attempt: safeViewportAttempts.length + 1,
            correction,
            points: projected.map(({ osid, point }) => ({
              osid,
              x: point.x,
              y: point.y,
              inside: isPointInsideFieldOperationSafeViewport({ point, width, height, padding: fieldPadding }),
            })),
          });
          if (!panCorrection) {
            appliedCount += 1;
            publishReceipt({ ...pendingReceipt, status: 'applied', target: currentTarget(), reason: null });
            return;
          }
          if (recovery === 'none' || !correction) {
            failTransaction(pendingReceipt, 'unsafe-viewport-after-correction', priorPadding);
            return;
          }
          if (correction.kind === 'pan') {
            removeMoveEndListener = args.camera.onceMoveEnd(() => verifySafeViewport('zoom'));
            args.camera.panBy(correction.offset, { duration: 180, essential: true });
          } else {
            removeMoveEndListener = args.camera.onceMoveEnd(() => verifySafeViewport('none'));
            args.camera.easeTo({
              center: args.camera.getCenter(),
              zoom: correction.targetZoom,
              duration: 180,
              essential: true,
            });
          }
        } catch (error) {
          failTransaction(
            pendingReceipt,
            error instanceof Error ? `camera-verification-error:${error.message}` : 'camera-verification-error',
            priorPadding,
          );
        }
      };
      try {
        ownedPriorMaxBounds = cloneFieldOperationBounds(args.camera.getMaxBounds());
        args.camera.setMaxBounds(null);
        args.camera.setPadding(ZERO_FIELD_OPERATION_PADDING);
        const camera = args.camera.cameraForBounds(bounds, { padding: fieldPadding, maxZoom: 10 });
        if (!camera?.center || typeof camera.zoom !== 'number') {
          return failTransaction(pendingReceipt, 'camera-target-unavailable', priorPadding);
        }
        // Match MapLibre's own _fitInternal contract: cameraForBounds already
        // accounts for requested padding, so easeTo must not apply it again.
        removeMoveEndListener = args.camera.onceMoveEnd(() => verifySafeViewport('pan'));
        args.camera.easeTo({
          center: camera.center,
          zoom: camera.zoom,
          duration: 450,
          essential: true,
        });
        return receipt ?? pendingReceipt;
      } catch (error) {
        return failTransaction(
          pendingReceipt,
          error instanceof Error ? `camera-error:${error.message}` : 'camera-error',
          priorPadding,
        );
      }
    },
    cancel(key, reason = 'cancelled') {
      if (!receipt || receipt.key !== key) return null;
      if (cameraOwner === 'ordinary') return receipt;
      restoreOrdinaryCamera();
      cancelCount += 1;
      return publishReceipt({ ...receipt, status: 'cancelled', target: null, reason });
    },
    clear(reason = 'cleared') {
      if (!receipt) {
        if (cameraOwner === 'field-operation') restoreOrdinaryCamera();
        return null;
      }
      if (cameraOwner === 'ordinary') return receipt;
      restoreOrdinaryCamera();
      cancelCount += 1;
      return publishReceipt({ ...receipt, status: 'cancelled', target: null, reason });
    },
    getReceipt() {
      return receipt;
    },
    getCameraOwner() {
      return cameraOwner;
    },
    getDiagnostics() {
      return {
        requestCount,
        appliedCount,
        cancelCount,
        safeViewportAttempts,
        boundsSuspended: ownedPriorMaxBounds !== undefined,
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      if (receipt) listener(receipt);
      return () => listeners.delete(listener);
    },
  };
}

export function ordinaryCameraOwnsNavigation(controller: FieldOperationFocusController | null): boolean {
  return controller == null || controller.getCameraOwner() === 'ordinary';
}

export interface FieldOperationStyleLifecycle {
  isStyleLoaded(): boolean;
  on(event: 'styledata', listener: () => void): void;
  off(event: 'styledata', listener: () => void): void;
}

/** Retries overlay-only work on style lifecycle events without gating camera work. */
export function syncFieldOperationOverlayWhenStyleReady(
  lifecycle: FieldOperationStyleLifecycle,
  sync: () => void,
): () => void {
  if (lifecycle.isStyleLoaded()) {
    sync();
    return () => undefined;
  }
  const handleStyleData = () => {
    if (!lifecycle.isStyleLoaded()) return;
    lifecycle.off('styledata', handleStyleData);
    sync();
  };
  lifecycle.on('styledata', handleStyleData);
  return () => lifecycle.off('styledata', handleStyleData);
}
