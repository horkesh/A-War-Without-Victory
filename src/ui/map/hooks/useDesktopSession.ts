import { useEffect } from 'react';
import { useIPC } from '../desktop/useIPC';
import type { DesktopBridgeClient } from '../desktop/types';
import { useGameStore } from '../store/gameStore';

interface DesktopSessionDeps {
  ipc: Pick<DesktopBridgeClient, 'isAvailable' | 'getCurrentGameState' | 'setGameStateUpdatedCallback'>;
  loadSaveIfChanged: (jsonOrText: unknown | string) => Promise<boolean>;
  setLoadError: (message: string | null) => void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export function startDesktopSession({
  ipc,
  loadSaveIfChanged,
  setLoadError,
}: DesktopSessionDeps): () => void {
  if (!ipc.isAvailable) return () => {};

  let disposed = false;
  let hasLiveUpdate = false;
  const applyDesktopState = async (stateJson: unknown) => {
    if (disposed || stateJson == null) return;
    try {
      await loadSaveIfChanged(stateJson);
    } catch (error) {
      if (!disposed) setLoadError(toErrorMessage(error));
    }
  };

  void ipc.getCurrentGameState().then((stateJson) => {
    // Ignore bootstrap payload if live updates already arrived.
    if (hasLiveUpdate || disposed) return;
    void applyDesktopState(stateJson);
  }).catch((error) => {
    if (!disposed) setLoadError(toErrorMessage(error));
  });

  ipc.setGameStateUpdatedCallback((stateJson) => {
    hasLiveUpdate = true;
    void applyDesktopState(stateJson);
  });

  return () => {
    disposed = true;
    ipc.setGameStateUpdatedCallback(null);
  };
}

export function useDesktopSession() {
  const ipc = useIPC();
  const loadSaveIfChanged = useGameStore((s) => s.loadSaveIfChanged);
  const setLoadError = useGameStore((s) => s.setLoadError);

  useEffect(() => {
    return startDesktopSession({
      ipc,
      loadSaveIfChanged,
      setLoadError,
    });
  }, [ipc, loadSaveIfChanged, setLoadError]);
}
