import { describe, expect, it, vi } from 'vitest';
import { startDesktopSession } from '../src/ui/map/hooks/useDesktopSession.js';

describe('desktop session sync', () => {
  it('bootstraps from current desktop state and subscribes updates', async () => {
    const loadSaveIfChanged = vi.fn().mockResolvedValue(true);
    const setLoadError = vi.fn();
    let callback: ((stateJson: unknown) => void) | undefined;

    const stop = startDesktopSession({
      ipc: {
        isAvailable: true,
        getCurrentGameState: vi.fn().mockResolvedValue({ meta: { turn: 2, phase: 'war' }, formations: {}, political_controllers: {} }),
        setGameStateUpdatedCallback: vi.fn().mockImplementation((cb: ((stateJson: unknown) => void) | null) => {
          if (typeof cb === 'function') callback = cb;
        }),
      },
      loadSaveIfChanged,
      setLoadError,
    });

    await Promise.resolve();
    expect(loadSaveIfChanged).toHaveBeenCalledTimes(1);
    expect(callback).not.toBeNull();

    if (callback) callback({ meta: { turn: 3, phase: 'war' }, formations: {}, political_controllers: {} });
    await Promise.resolve();
    expect(loadSaveIfChanged).toHaveBeenCalledTimes(2);
    expect(setLoadError).not.toHaveBeenCalled();

    stop();
  });

  it('unsubscribes update callback on cleanup', () => {
    const setGameStateUpdatedCallback = vi.fn();
    const stop = startDesktopSession({
      ipc: {
        isAvailable: true,
        getCurrentGameState: vi.fn().mockResolvedValue(null),
        setGameStateUpdatedCallback,
      },
      loadSaveIfChanged: vi.fn().mockResolvedValue(false),
      setLoadError: vi.fn(),
    });
    stop();
    expect(setGameStateUpdatedCallback).toHaveBeenLastCalledWith(null);
  });

  it('ignores stale bootstrap result after a live update arrives first', async () => {
    const loadSaveIfChanged = vi.fn().mockResolvedValue(true);
    const setLoadError = vi.fn();
    let callback: ((stateJson: unknown) => void) | undefined;
    let resolveBootstrap: ((state: unknown) => void) | undefined;
    const bootstrapPromise = new Promise<unknown>((resolve) => {
      resolveBootstrap = resolve;
    });

    const stop = startDesktopSession({
      ipc: {
        isAvailable: true,
        getCurrentGameState: vi.fn().mockReturnValue(bootstrapPromise),
        setGameStateUpdatedCallback: vi.fn().mockImplementation((cb: ((stateJson: unknown) => void) | null) => {
          if (typeof cb === 'function') callback = cb;
        }),
      },
      loadSaveIfChanged,
      setLoadError,
    });

    if (callback) callback({ meta: { turn: 7, phase: 'war' }, formations: {}, political_controllers: {} });
    await Promise.resolve();
    if (resolveBootstrap) resolveBootstrap({ meta: { turn: 6, phase: 'war' }, formations: {}, political_controllers: {} });
    await Promise.resolve();
    await Promise.resolve();

    expect(loadSaveIfChanged).toHaveBeenCalledTimes(1);
    expect(loadSaveIfChanged.mock.calls[0]?.[0]).toEqual({
      meta: { turn: 7, phase: 'war' },
      formations: {},
      political_controllers: {},
    });
    expect(setLoadError).not.toHaveBeenCalled();
    stop();
  });

  it('surfaces startup getCurrentGameState failures through loadError', async () => {
    const setLoadError = vi.fn();
    const stop = startDesktopSession({
      ipc: {
        isAvailable: true,
        getCurrentGameState: vi.fn().mockRejectedValue(new Error('boot-failed')),
        setGameStateUpdatedCallback: vi.fn(),
      },
      loadSaveIfChanged: vi.fn().mockResolvedValue(false),
      setLoadError,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(setLoadError).toHaveBeenCalledWith('boot-failed');
    stop();
  });
});
