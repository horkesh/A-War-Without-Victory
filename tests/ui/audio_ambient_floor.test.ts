// @vitest-environment jsdom

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAudioPreferences,
  loadAudioPreferences,
} from '../../src/ui/map/audio/audio_preferences.js';
import {
  getAudioState,
  playAmbientBed,
  playCue,
  resetAudioForTests,
  unlockAudioForUserGesture,
} from '../../src/ui/map/audio/audio_engine.js';
import { getCueConfig } from '../../src/ui/map/audio/sound_manifest.js';
import { AudioSurfaceBedController } from '../../src/ui/map/components/AudioSurfaceBedController.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('WP-8 ambient audio floor', () => {
  beforeEach(() => {
    class FakeAudio {
      src: string;
      preload = '';
      loop = false;
      volume = 0;
      currentTime = 0;

      constructor(src: string) {
        this.src = src;
      }

      play = vi.fn(() => Promise.resolve());
      pause = vi.fn();
    }
    resetAudioForTests();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('AudioContext', vi.fn());
    vi.stubGlobal('Audio', FakeAudio);
    useGameStore.setState(useGameStore.getInitialState());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('fresh profiles enable the bus but no cue is accepted before user gesture unlock', async () => {
    const prefs = applyAudioPreferences(loadAudioPreferences(new MemoryStorage()));

    expect(prefs).toEqual({ muted: false, masterVolume: 0.5 });
    expect(getAudioState()).toMatchObject({ enabled: true, muted: false, userGestureUnlocked: false });

    await playCue('ui_click', 1000);
    expect(getAudioState().acceptedCueCount).toBe(0);

    unlockAudioForUserGesture();
    await playCue('ui_click', 1100);
    expect(getAudioState()).toMatchObject({
      acceptedCueCount: 1,
      lastCueId: 'ui_click',
      userGestureUnlocked: true,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
  });

  it('registers sober placeholder ambient beds that can no-op without assets', async () => {
    expect(getCueConfig('ambient_warroom')).toMatchObject({
      category: 'ambient',
      loop: true,
      assetStatus: 'missing_placeholder',
    });
    expect(getCueConfig('ambient_field')).toMatchObject({
      category: 'ambient',
      loop: true,
      assetStatus: 'missing_placeholder',
    });
    expect(getCueConfig('ambient_archive')).toMatchObject({
      category: 'ambient',
      loop: true,
      assetStatus: 'missing_placeholder',
    });

    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    unlockAudioForUserGesture();
    await expect(playAmbientBed('ambient_warroom')).resolves.toBeUndefined();

    expect(getAudioState()).toMatchObject({
      currentAmbientId: 'ambient_warroom',
      lastResolvedAssetUrl: null,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
  });

  it('mute silences cues and ambient beds through the same bus state', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');
    applyAudioPreferences({ muted: true, masterVolume: 0.5 });
    await playCue('ui_click', 1000);
    await playAmbientBed('ambient_field');

    expect(getAudioState()).toMatchObject({
      muted: true,
      acceptedCueCount: 0,
      currentAmbientId: null,
    });
  });

  it('selects the room, field, and archive beds from the active surface', () => {
    const view = render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));
    expect(getAudioState().requestedAmbientId).toBe('ambient_warroom');

    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));
    expect(getAudioState().requestedAmbientId).toBe('ambient_field');

    useGameStore.setState({ chronicleOpen: true });
    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));
    expect(getAudioState().requestedAmbientId).toBe('ambient_archive');

    useGameStore.setState({ chronicleOpen: false, armyHQOpen: true, armyHQTab: 'records' });
    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));
    expect(getAudioState().requestedAmbientId).toBe('ambient_archive');
  });
});
