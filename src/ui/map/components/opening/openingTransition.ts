export type OpeningPhase = 'idle' | 'push' | 'masked' | 'resolve';
export type OpeningScene = 'neutral' | 'RBiH' | 'RS' | 'HRHB';

export interface OpeningTransitionState {
  displayedScene: OpeningScene;
  requestedScene: OpeningScene;
  token: number;
  phase: OpeningPhase;
  reducedMotion: boolean;
}

export interface OpeningSceneLoadHandlers {
  ready: () => void;
  fail: () => void;
}

/** Returns a cleanup function which cancels or detaches the pending decode. */
export type OpeningSceneLoader = (
  scene: OpeningScene,
  handlers: OpeningSceneLoadHandlers,
) => () => void;

export const OPENING_TRANSITION_TIMINGS = {
  push: 340,
  masked: 280,
  resolve: 480,
  reduced: 155,
} as const;

type OpeningTransitionEvent =
  | { type: 'request'; scene: OpeningScene; token: number }
  | { type: 'phase'; phase: Exclude<OpeningPhase, 'idle' | 'push'>; token: number }
  | { type: 'settle'; token: number }
  | { type: 'abort'; token: number }
  | { type: 'reduced-motion'; reducedMotion: boolean };

export function createInitialOpeningTransitionState(
  reducedMotion: boolean,
): OpeningTransitionState {
  return {
    displayedScene: 'neutral',
    requestedScene: 'neutral',
    token: 0,
    phase: 'idle',
    reducedMotion,
  };
}

/** Pure presentation reducer. Token checks make stale async work inert. */
export function openingTransitionReducer(
  state: OpeningTransitionState,
  event: OpeningTransitionEvent,
): OpeningTransitionState {
  switch (event.type) {
    case 'request':
      return {
        ...state,
        requestedScene: event.scene,
        token: event.token,
        phase: event.scene === state.displayedScene ? 'idle' : 'push',
      };
    case 'phase':
      return event.token === state.token ? { ...state, phase: event.phase } : state;
    case 'settle':
      return event.token === state.token
        ? { ...state, displayedScene: state.requestedScene, phase: 'idle' }
        : state;
    case 'abort':
      return {
        ...state,
        requestedScene: state.displayedScene,
        token: event.token,
        phase: 'idle',
      };
    case 'reduced-motion':
      return { ...state, reducedMotion: event.reducedMotion };
  }
}

interface OpeningTransitionControllerOptions {
  loadScene: OpeningSceneLoader;
  reducedMotion?: boolean;
}

export interface OpeningTransitionController {
  getState: () => OpeningTransitionState;
  getFailedScene: () => OpeningScene | null;
  subscribe: (listener: () => void) => () => void;
  request: (scene: OpeningScene) => void;
  cancel: () => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  dispose: () => void;
}

export function createOpeningTransitionController({
  loadScene,
  reducedMotion = false,
}: OpeningTransitionControllerOptions): OpeningTransitionController {
  let state = createInitialOpeningTransitionState(reducedMotion);
  let failedScene: OpeningScene | null = null;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let releaseLoad: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const reduce = (event: OpeningTransitionEvent) => {
    const next = openingTransitionReducer(state, event);
    if (next !== state) {
      state = next;
      emit();
    }
  };
  const clearWork = () => {
    if (timer !== null) {
      const timerToClear = timer;
      timer = null;
      clearTimeout(timerToClear);
    }
    const release = releaseLoad;
    releaseLoad = null;
    release?.();
  };
  const schedule = (token: number, delay: number, work: () => void) => {
    timer = setTimeout(() => {
      timer = null;
      if (!disposed && token === state.token) work();
    }, delay);
  };

  const request = (scene: OpeningScene) => {
    if (disposed) return;
    const token = state.token + 1;
    state = { ...state, token };
    clearWork();
    failedScene = null;
    reduce({ type: 'request', scene, token });
    if (scene === state.displayedScene) return;

    let decoded = false;
    let pushElapsed = state.reducedMotion;
    let loaderAttached = false;
    let loadSettled = false;

    const detachLoader = () => {
      if (!loaderAttached) return;
      loaderAttached = false;
      const release = releaseLoad;
      releaseLoad = null;
      release?.();
    };
    const beginHandoff = () => {
      if (!decoded || !pushElapsed || disposed || token !== state.token) return;
      detachLoader();
      if (state.reducedMotion) {
        reduce({ type: 'phase', phase: 'resolve', token });
        schedule(token, OPENING_TRANSITION_TIMINGS.reduced, () => {
          reduce({ type: 'settle', token });
        });
        return;
      }
      reduce({ type: 'phase', phase: 'masked', token });
      schedule(token, OPENING_TRANSITION_TIMINGS.masked, () => {
        reduce({ type: 'phase', phase: 'resolve', token });
        schedule(token, OPENING_TRANSITION_TIMINGS.resolve, () => {
          reduce({ type: 'settle', token });
        });
      });
    };
    const handlers: OpeningSceneLoadHandlers = {
      ready: () => {
        if (disposed || token !== state.token || loadSettled) return;
        loadSettled = true;
        decoded = true;
        if (loaderAttached) beginHandoff();
      },
      fail: () => {
        if (disposed || token !== state.token || loadSettled) return;
        loadSettled = true;
        clearWork();
        failedScene = scene;
        reduce({ type: 'abort', token });
      },
    };
    releaseLoad = loadScene(scene, handlers);
    loaderAttached = true;
    if (state.phase === 'idle' || token !== state.token) {
      detachLoader();
      return;
    }
    beginHandoff();

    if (!state.reducedMotion) {
      schedule(token, OPENING_TRANSITION_TIMINGS.push, () => {
        pushElapsed = true;
        beginHandoff();
      });
    }
  };

  const cancel = () => {
    if (disposed) return;
    const token = state.token + 1;
    state = { ...state, token };
    clearWork();
    failedScene = null;
    reduce({ type: 'abort', token });
  };

  const setReducedMotion = (value: boolean) => {
    if (disposed || value === state.reducedMotion) return;
    const pendingScene = state.requestedScene;
    const wasActive = state.phase !== 'idle';
    const token = state.token + 1;
    state = { ...state, token };
    clearWork();
    reduce({ type: 'abort', token });
    reduce({ type: 'reduced-motion', reducedMotion: value });
    if (wasActive && pendingScene !== state.displayedScene) request(pendingScene);
  };

  return {
    getState: () => state,
    getFailedScene: () => failedScene,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    request,
    cancel,
    setReducedMotion,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      state = { ...state, token: state.token + 1 };
      clearWork();
      listeners.clear();
    },
  };
}
