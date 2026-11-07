import { useEffect, useMemo, useRef } from 'react';
import {
  installAudioGestureUnlockListeners,
  playAmbientBed,
  setMusicSurface,
  retryRequestedMusic,
  stopAmbientBed,
  stopMusic,
} from '../audio/audio_engine.js';
import {
  applyAudioPreferences,
  connectNativeAudioPreferences,
  loadAudioPreferences,
} from '../audio/audio_preferences.js';
import { useIPC } from '../desktop/useIPC.js';
import { useGameStore } from '../store/gameStore.js';

type AppAudioSurface = 'mainMenu' | 'game' | 'warroom';
type AmbientBedId = 'ambient_warroom' | 'ambient_field' | 'ambient_archive';

export interface AudioSurfaceBedControllerProps {
  appScreen: AppAudioSurface;
}

function selectAmbientBed(
  appScreen: AppAudioSurface,
  archiveOpen: boolean,
): AmbientBedId | null {
  if (appScreen === 'warroom') return 'ambient_warroom';
  if (appScreen !== 'game') return null;
  return archiveOpen ? 'ambient_archive' : 'ambient_field';
}

function requestAmbientBedPlayback(bedId: AmbientBedId): void {
  void playAmbientBed(bedId);
}

export function AudioSurfaceBedController({ appScreen }: AudioSurfaceBedControllerProps) {
  const ipc = useIPC();
  // The opening request belongs to this controller, not to changing room beds.
  const startsInOpening = useRef(appScreen === 'mainMenu' && useGameStore.getState().loadedGameState === null);
  const chronicleOpen = useGameStore((state) => state.chronicleOpen);
  const armyHQOpen = useGameStore((state) => state.armyHQOpen);
  const armyHQTab = useGameStore((state) => state.armyHQTab);
  const archiveOpen = chronicleOpen || (armyHQOpen && armyHQTab === 'records');
  const bedId = useMemo(() => selectAmbientBed(appScreen, archiveOpen), [appScreen, archiveOpen]);

  useEffect(() => {
    const disconnect = ipc.isAvailable ? connectNativeAudioPreferences(ipc) : undefined;
    if (!ipc.isAvailable) applyAudioPreferences(loadAudioPreferences());
    return () => {
      disconnect?.();
      stopMusic();
    };
  }, [ipc]);

  useEffect(() => {
    setMusicSurface(appScreen === 'mainMenu' ? 'mainMenu' : 'campaign', startsInOpening.current);
  }, [appScreen]);

  useEffect(() => {
    if (!bedId) {
      stopAmbientBed();
      return;
    }
    requestAmbientBedPlayback(bedId);
    return () => stopAmbientBed(bedId);
  }, [bedId]);

  useEffect(() => {
    return installAudioGestureUnlockListeners(undefined, () => {
      // Keep the current in-memory choice: denied persistence must not undo
      // a preference the player just changed in Settings.
      retryRequestedMusic();
      if (bedId) void playAmbientBed(bedId);
    }, true);
  }, [bedId]);

  return null;
}
