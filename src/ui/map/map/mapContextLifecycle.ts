interface CanvasSize {
  clientWidth: number;
  clientHeight: number;
  getBoundingClientRect?: () => Pick<DOMRect, 'width' | 'height'>;
}

interface CameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function additionalCameraPadding(
  requested: CameraPadding,
  alreadyApplied: Partial<CameraPadding>,
): CameraPadding {
  return {
    top: Math.max(0, requested.top - (alreadyApplied.top ?? 0)),
    right: Math.max(0, requested.right - (alreadyApplied.right ?? 0)),
    bottom: Math.max(0, requested.bottom - (alreadyApplied.bottom ?? 0)),
    left: Math.max(0, requested.left - (alreadyApplied.left ?? 0)),
  };
}

interface ReleasableMapContext {
  getCanvas(): HTMLCanvasElement;
  remove(): void;
}

interface ReleasableDeckOverlay {
  getCanvas(): HTMLCanvasElement | null;
  finalize(): void;
}

/** Imperative graphics-only surface used by the retained tactical viewport. */
export interface TacticalMapGraphicsController {
  resize(): void;
  triggerRepaint(): void;
  onceRender(listener: () => void): () => void;
  stop(): void;
}

export interface TacticalMapRenderedRevision {
  turn: number;
  fingerprint: string;
}

export interface RetainedMapStyleReadiness {
  readonly loaded: boolean;
  markLoaded(): void;
  invalidateForReplacement(): void;
}

/** Tracks the one-time style lifecycle independently from transient source loading. */
export function createRetainedMapStyleReadiness(): RetainedMapStyleReadiness {
  let loaded = false;
  return {
    get loaded() {
      return loaded;
    },
    markLoaded() {
      loaded = true;
    },
    invalidateForReplacement() {
      loaded = false;
    },
  };
}

export interface RetainedRevisionCommitTracker<Revision> {
  shouldApply(revision: Revision): boolean;
  begin(revision: Revision): number;
  isInFlight(token: number): boolean;
  commit(token: number): boolean;
  cancel(token: number): void;
  reset(): void;
}

/** Commits a retained map revision only after its final rendered frame. */
export function createRetainedRevisionCommitTracker<Revision>(
  isSameRevision: (left: Revision, right: Revision) => boolean = Object.is,
): RetainedRevisionCommitTracker<Revision> {
  let committed: Revision | null = null;
  let inFlight: { token: number; revision: Revision } | null = null;
  let nextToken = 1;
  return {
    shouldApply(revision) {
      return committed == null || !isSameRevision(committed, revision);
    },
    begin(revision) {
      const token = nextToken;
      nextToken += 1;
      inFlight = { token, revision };
      return token;
    },
    isInFlight(token) {
      return inFlight?.token === token;
    },
    commit(token) {
      if (inFlight?.token !== token) return false;
      committed = inFlight.revision;
      inFlight = null;
      return true;
    },
    cancel(token) {
      if (inFlight?.token === token) inFlight = null;
    },
    reset() {
      committed = null;
      inFlight = null;
    },
  };
}

export function safeScalarMapPadding(canvas: CanvasSize, requestedPadding: number): number | null {
  const rect = canvas.getBoundingClientRect?.();
  const width = rect?.width ?? canvas.clientWidth;
  const height = rect?.height ?? canvas.clientHeight;
  if (width <= 2 || height <= 2) return null;
  const maximum = Math.max(0, Math.floor((Math.min(width, height) - 2) / 2));
  return Math.min(Math.max(0, requestedPadding), maximum);
}

export function hasUsableMapCanvas(canvas: CanvasSize): boolean {
  return safeScalarMapPadding(canvas, 0) != null;
}

export function cameraOffsetForPadding(padding: CameraPadding): [number, number] {
  return [
    (padding.left - padding.right) / 2,
    (padding.top - padding.bottom) / 2,
  ];
}

export function isTacticalMapStateReady(
  mapRenderReady: boolean,
  renderedTurn: number | null,
  currentTurn: number | null | undefined,
  renderedRevision: string | null,
  currentRevision: string | null,
): boolean {
  return mapRenderReady
    && renderedTurn != null
    && currentTurn != null
    && renderedTurn === currentTurn
    && renderedRevision != null
    && currentRevision != null
    && renderedRevision === currentRevision;
}

export function releaseMapWebGlContext(map: ReleasableMapContext): void {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let loseContext: (() => void) | undefined;
  try {
    const canvas = map.getCanvas();
    gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null;
    loseContext = extension?.loseContext?.bind(extension);
  } catch {
    // Cleanup must still remove the map when a test double or retired canvas has no context.
  }
  map.remove();
  if (!gl?.isContextLost()) loseContext?.();
}

export function releaseStandaloneDeckWebGlContext(overlay: ReleasableDeckOverlay): void {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let loseContext: (() => void) | undefined;
  try {
    const canvas = overlay.getCanvas();
    gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null;
    const extension = gl?.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null;
    loseContext = extension?.loseContext?.bind(extension);
  } catch {
    // Finalization must still run when an overlay has not finished initializing.
  }
  overlay.finalize();
  if (!gl?.isContextLost()) loseContext?.();
}
