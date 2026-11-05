import { useEffect, useMemo } from 'react';
import {
  installAudioGestureUnlockListeners,
  playAmbientBed,
  playMusic,
  stopAmbientBed,
  stopMusic,
} from '../audio/audio_engine.js';
import {
  applyAudioPreferences,
  loadAudioPreferences,
} from '../audio/audio_preferences.js';
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
  const chronicleOpen = useGameStore((state) => state.chronicleOpen);
  const armyHQOpen = useGameStore((state) => state.armyHQOpen);
  const armyHQTab = useGameStore((state) => state.armyHQTab);
  const archiveOpen = chronicleOpen || (armyHQOpen && armyHQTab === 'records');
  const bedId = useMemo(() => selectAmbientBed(appScreen, archiveOpen), [appScreen, archiveOpen]);

  useEffect(() => {
    applyAudioPreferences(loadAudioPreferences());
    void playMusic('menu_theme');
    return () => stopMusic();
  }, []);

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
      void playMusic('menu_theme');
      if (bedId) void playAmbientBed(bedId);
    }, true);
  }, [bedId]);

  return null;
}
