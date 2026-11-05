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
  isAmbientPlaybackEnabled,
  playAmbientBed,
  playCue,
  playMusic,
  resetAudioForTests,
  setAmbientPlaybackEnabled,
  setEnabled,
  unlockAudioForUserGesture,
  unmuteAudio,
} from '../../src/ui/map/audio/audio_engine.js';
import * as soundManifest from '../../src/ui/map/audio/sound_manifest.js';
import { getCueConfig } from '../../src/ui/map/audio/sound_manifest.js';
import { hasResolvedCueAsset, resolveCueAssetUrl } from '../../src/ui/map/audio/audioAssets.js';
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
  interface DeferredPlay {
    promise: Promise<void>;
    resolve: () => void;
    reject: (reason?: unknown) => void;
  }

  function createDeferredPlay(): DeferredPlay {
    let resolve!: () => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  }

  class FakeAudio {
    static instances: FakeAudio[] = [];
    static pendingPlays: DeferredPlay[] = [];
    static playMode: 'deferred' | 'resolve' | 'reject' | 'throw' = 'deferred';

    static latest(): FakeAudio {
      return FakeAudio.instances[FakeAudio.instances.length - 1]!;
    }

    src: string;
    preload = '';
    paused = true;
    ended = false;
    error: Error | null = null;
    playCallCount = 0;
    pauseCallCount = 0;
    readonly loopSetValues: boolean[] = [];
    readonly volumeSetValues: number[] = [];
    readonly currentTimeSetValues: number[] = [];

    private loopValue = false;
    private volumeValue = 0;
    private currentTimeValue = 0;

    constructor(src: string) {
      this.src = src;
      FakeAudio.instances.push(this);
    }

    get loop(): boolean {
      return this.loopValue;
    }

    set loop(value: boolean) {
      this.loopSetValues.push(value);
      this.loopValue = value;
    }

    get volume(): number {
      return this.volumeValue;
    }

    set volume(value: number) {
      this.volumeSetValues.push(value);
      this.volumeValue = value;
    }

    get currentTime(): number {
      return this.currentTimeValue;
    }

    set currentTime(value: number) {
      this.currentTimeSetValues.push(value);
      this.currentTimeValue = value;
    }

    play = vi.fn((): Promise<void> => {
      this.playCallCount += 1;
      if (FakeAudio.playMode === 'throw') {
        throw new Error('synchronous play failure');
      }
      this.paused = false;
      if (FakeAudio.playMode === 'resolve') return Promise.resolve();
      if (FakeAudio.playMode === 'reject') return Promise.reject(new Error('play rejected'));
      const deferred = createDeferredPlay();
      FakeAudio.pendingPlays.push(deferred);
      return deferred.promise;
    });

    pause = vi.fn(() => {
      this.pauseCallCount += 1;
      this.paused = true;
    });
  }

  function latestPendingPlay(): DeferredPlay {
    return FakeAudio.pendingPlays[FakeAudio.pendingPlays.length - 1]!;
  }

  async function settleLatestPlay(): Promise<void> {
    const deferred = latestPendingPlay();
    deferred.resolve();
    await deferred.promise;
  }

  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.pendingPlays = [];
    FakeAudio.playMode = 'deferred';
    resetAudioForTests();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('AudioContext', vi.fn());
    vi.stubGlobal('Audio', FakeAudio);
    window.localStorage.clear();
    useGameStore.setState(useGameStore.getInitialState());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('fresh profiles enable the bus but no cue is accepted before user gesture unlock', async () => {
    const prefs = applyAudioPreferences(loadAudioPreferences(new MemoryStorage()));

    expect(prefs).toEqual({ musicEnabled: false, musicVolume: 0.5, muted: false, masterVolume: 0.5 });
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

  it('registers and bundle-resolves the three sober ambient beds', async () => {
    for (const cueId of ['ambient_warroom', 'ambient_field', 'ambient_archive']) {
      expect(getCueConfig(cueId)).toMatchObject({
        category: 'ambient',
        loop: true,
        assetStatus: 'provided',
      });
      expect(hasResolvedCueAsset(cueId)).toBe(true);
      expect(resolveCueAssetUrl(cueId)).toMatch(/\.ogg$/u);
    }

    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await expect(playAmbientBed('ambient_warroom')).resolves.toBeUndefined();

    expect(getAudioState()).toMatchObject({
      currentAmbientId: 'ambient_warroom',
    });
    expect(getAudioState().lastResolvedAssetUrl).toMatch(/\.ogg$/u);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
  });

  it('mute silences cues and ambient beds through the same bus state', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
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

  it('applies startup preferences before gesture-unlocked ambient playback', async () => {
    setAmbientPlaybackEnabled(true);
    render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));

    expect(getAudioState()).toMatchObject({
      enabled: true,
      muted: false,
      requestedAmbientId: 'ambient_warroom',
      currentAmbientId: null,
      userGestureUnlocked: false,
    });

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    expect(getAudioState()).toMatchObject({
      enabled: true,
      muted: false,
      userGestureUnlocked: true,
      currentAmbientId: 'ambient_warroom',
    });
  });

  it('updates volume on looping-bed reentry without replaying or resetting the running element', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    expect(element.loopSetValues).toEqual([true]);
    expect(element.playCallCount).toBe(1);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(element.volumeSetValues).toHaveLength(1);

    await settleLatestPlay();

    applyAudioPreferences({ muted: false, masterVolume: 0.9 });
    await playAmbientBed('ambient_warroom');

    expect(element.loopSetValues).toEqual([true]);
    expect(element.playCallCount).toBe(1);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(element.volumeSetValues).toHaveLength(2);
    expect(element.volumeSetValues[1]).toBeCloseTo(0.9 * 0.14, 5);
  });

  it('retries a pending looping play instead of treating paused=false as success', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    expect(element.paused).toBe(false);
    expect(element.playCallCount).toBe(1);

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(FakeAudio.pendingPlays).toHaveLength(2);
  });

  it('retries after a rejected play while keeping the loop setter idempotent', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    const firstPlay = latestPendingPlay();
    firstPlay.reject(new Error('rejected play'));
    await expect(firstPlay.promise).rejects.toThrow('rejected play');

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
  });

  it('retries after a synchronous play failure', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();

    FakeAudio.playMode = 'throw';
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    expect(element.playCallCount).toBe(1);

    FakeAudio.playMode = 'deferred';
    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
  });

  it('does not let an older rejected settlement undo a newer successful play', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    const firstPlay = latestPendingPlay();
    await playAmbientBed('ambient_warroom');
    const secondPlay = latestPendingPlay();
    expect(secondPlay).not.toBe(firstPlay);

    secondPlay.resolve();
    await secondPlay.promise;

    firstPlay.reject(new Error('late rejection'));
    await expect(firstPlay.promise).rejects.toThrow('late rejection');

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
  });

  it('does not let an older successful settlement mask a newer failed play', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    const firstPlay = latestPendingPlay();
    await playAmbientBed('ambient_warroom');
    const secondPlay = latestPendingPlay();

    secondPlay.reject(new Error('newer failure'));
    await expect(secondPlay.promise).rejects.toThrow('newer failure');

    firstPlay.resolve();
    await firstPlay.promise;

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(3);
    expect(element.loopSetValues).toEqual([true]);
  });

  it('replays a looping bed when the element is paused, ended, or errored', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    await settleLatestPlay();

    element.pause();
    await playAmbientBed('ambient_warroom');
    expect(element.playCallCount).toBe(2);
    await settleLatestPlay();

    element.ended = true;
    await playAmbientBed('ambient_warroom');
    expect(element.playCallCount).toBe(3);
    await settleLatestPlay();
    element.ended = false;

    element.error = new Error('decode error');
    await playAmbientBed('ambient_warroom');
    const recovered = FakeAudio.latest();
    expect(recovered).not.toBe(element);
    expect(recovered.playCallCount).toBe(1);
    expect(recovered.loopSetValues).toEqual([true]);
  });

  it('plays conservatively when running-state fields are incomplete', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    await settleLatestPlay();
    (element as unknown as { paused: boolean | undefined }).paused = undefined;

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
  });

  it('replays when error is undefined rather than explicitly null', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    await settleLatestPlay();
    expect(element).toMatchObject({ paused: false, ended: false, error: null });

    (element as unknown as { error: Error | null | undefined }).error = undefined;

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
    expect(element.currentTimeSetValues).toEqual([]);
  });

  it('issues loop and play commands again when the loop setting changes', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    await settleLatestPlay();

    element.loop = false;
    element.loopSetValues.length = 0;

    await playAmbientBed('ambient_warroom');

    expect(element.loopSetValues).toEqual([true]);
    expect(element.playCallCount).toBe(2);
    expect(element.currentTimeSetValues).toEqual([]);
  });

  it('resets and retriggers one-shot cues without redundant loop setters', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();

    await playCue('ui_click', 1000);

    const element = FakeAudio.latest();
    expect(element.loopSetValues).toEqual([]);
    expect(element.currentTimeSetValues).toEqual([0]);
    expect(element.playCallCount).toBe(1);

    await settleLatestPlay();
    await playCue('ui_click', 1200);

    expect(element.loopSetValues).toEqual([]);
    expect(element.currentTimeSetValues).toEqual([0, 0]);
    expect(element.playCallCount).toBe(2);
  });

  it('retries ambient playback through controller pointer and keyboard gestures after a pending failure', async () => {
    setAmbientPlaybackEnabled(true);
    render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    const element = FakeAudio.latest();
    expect(element.playCallCount).toBe(1);
    expect(FakeAudio.pendingPlays).toHaveLength(1);

    latestPendingPlay().reject(new Error('pointer play failed'));
    await expect(FakeAudio.pendingPlays[0]!.promise).rejects.toThrow('pointer play failed');

    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();

    expect(element.playCallCount).toBe(2);
    expect(element.loopSetValues).toEqual([true]);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(element.pauseCallCount).toBe(0);
    expect(FakeAudio.pendingPlays).toHaveLength(2);
  });

  it('does not reissue commands on a second gesture when the ambient bed is already successfully running', async () => {
    setAmbientPlaybackEnabled(true);
    render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    const element = FakeAudio.latest();
    expect(element.playCallCount).toBe(1);
    await settleLatestPlay();

    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();

    expect(element.playCallCount).toBe(1);
    expect(element.loopSetValues).toEqual([true]);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(element.pauseCallCount).toBe(0);
    expect(element.paused).toBe(false);
    expect(element.volumeSetValues).toHaveLength(1);
    expect(element.volumeSetValues[0]).toBeCloseTo(0.5 * 0.14, 5);
  });

  it('stops the old bed on surface change, starts the new bed, and stops on a null surface', async () => {
    setAmbientPlaybackEnabled(true);
    const view = render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    const warroom = FakeAudio.latest();
    expect(warroom.playCallCount).toBe(1);
    expect(warroom.volumeSetValues[0]).toBeCloseTo(0.5 * 0.14, 5);
    await settleLatestPlay();

    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));

    const field = FakeAudio.latest();
    expect(field).not.toBe(warroom);
    expect(warroom.pauseCallCount).toBe(1);
    expect(warroom.playCallCount).toBe(1);
    expect(field.playCallCount).toBe(1);
    expect(field.loopSetValues).toEqual([true]);
    expect(field.currentTimeSetValues).toEqual([]);
    expect(field.volumeSetValues[0]).toBeCloseTo(0.5 * 0.12, 5);
    await settleLatestPlay();

    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));

    expect(field.pauseCallCount).toBe(1);
    expect(field.playCallCount).toBe(1);
    expect(warroom.pauseCallCount).toBe(1);
    expect(getAudioState().currentAmbientId).toBeNull();
  });

  it('allows the controller bed to resume after mute and unmute with exact command counts', async () => {
    setAmbientPlaybackEnabled(true);
    render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    const element = FakeAudio.latest();
    expect(element.playCallCount).toBe(1);
    await settleLatestPlay();

    applyAudioPreferences({ muted: true, masterVolume: 0.5 });

    expect(element.playCallCount).toBe(1);
    expect(element.pauseCallCount).toBe(1);
    expect(getAudioState()).toMatchObject({ muted: true, currentAmbientId: null });

    applyAudioPreferences({ muted: false, masterVolume: 0.5 });

    expect(element.playCallCount).toBe(1);
    expect(element.pauseCallCount).toBe(1);

    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();

    expect(element.playCallCount).toBe(2);
    expect(element.pauseCallCount).toBe(1);
    expect(element.loopSetValues).toEqual([true]);
    expect(element.currentTimeSetValues).toEqual([]);
    expect(element.volumeSetValues).toHaveLength(3);
    expect(element.volumeSetValues[1]).toBe(0);
    expect(element.volumeSetValues[2]).toBeCloseTo(0.5 * 0.14, 5);
    expect(getAudioState()).toMatchObject({ muted: false, currentAmbientId: 'ambient_warroom' });
  });

  it('keeps ambient playback gated off by default and restores the gate on test reset', () => {
    expect(getAudioState().ambientPlaybackEnabled).toBe(false);
    expect(isAmbientPlaybackEnabled()).toBe(false);

    setAmbientPlaybackEnabled(true);
    expect(getAudioState().ambientPlaybackEnabled).toBe(true);
    expect(isAmbientPlaybackEnabled()).toBe(true);

    resetAudioForTests();
    expect(getAudioState().ambientPlaybackEnabled).toBe(false);
    expect(isAmbientPlaybackEnabled()).toBe(false);
  });

  it('blocks both ambient entry points before resolution or Audio construction', async () => {
    const resolveSpy = vi.spyOn(soundManifest, 'resolveCuePlaybackUrl');
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    unlockAudioForUserGesture();

    await playCue('ambient_warroom', 1000);
    await playAmbientBed('ambient_field');

    expect(resolveSpy).not.toHaveBeenCalled();
    expect(FakeAudio.instances).toHaveLength(0);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: false,
      acceptedCueCount: 0,
      lastCueId: null,
      lastResolvedAssetUrl: null,
      currentAmbientId: null,
      requestedAmbientId: 'ambient_field',
    });

    setAmbientPlaybackEnabled(true);
    await playCue('ambient_warroom', 1000);

    expect(resolveSpy).toHaveBeenCalledWith('ambient_warroom');
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.latest().src).toMatch(/ambient_warroom.*\.ogg$/u);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: true,
      acceptedCueCount: 1,
      lastCueId: 'ambient_warroom',
      currentAmbientId: null,
    });
  });

  it('keeps all beds silent across settings, gesture, and surface changes without changing global audio', async () => {
    const resolveSpy = vi.spyOn(soundManifest, 'resolveCuePlaybackUrl');
    const prefs = applyAudioPreferences(loadAudioPreferences(new MemoryStorage()));
    expect(prefs).toEqual({ musicEnabled: false, musicVolume: 0.5, muted: false, masterVolume: 0.5 });

    for (const bedId of ['ambient_warroom', 'ambient_field', 'ambient_archive'] as const) {
      await playAmbientBed(bedId);
      expect(getAudioState().requestedAmbientId).toBe(bedId);
    }

    setEnabled(true);
    unmuteAudio();
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    unlockAudioForUserGesture();
    expect(isAmbientPlaybackEnabled()).toBe(false);

    const view = render(React.createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));
    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));
    useGameStore.setState({ chronicleOpen: true });
    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'game' }));
    view.rerender(React.createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
    await Promise.resolve();

    expect(resolveSpy).not.toHaveBeenCalled();
    expect(FakeAudio.instances).toHaveLength(0);
    expect(getAudioState()).toMatchObject({
      enabled: true,
      muted: false,
      ambientPlaybackEnabled: false,
      currentAmbientId: null,
      requestedAmbientId: 'ambient_archive',
    });
  });

  it('pauses every cached ambient bed on disable while leaving UI, music, and stinger playback untouched', async () => {
    const originalResolveCuePlaybackUrl = soundManifest.resolveCuePlaybackUrl;
    vi.spyOn(soundManifest, 'resolveCuePlaybackUrl').mockImplementation((id) => {
      if (id === 'menu_theme' || id === 'stinger_dayton_ceasefire') {
        return `/test/${id}.ogg`;
      }
      return originalResolveCuePlaybackUrl(id);
    });
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();

    await playCue('ambient_warroom', 1000);
    await playAmbientBed('ambient_field');
    await playCue('ambient_archive', 1000);
    await playCue('ui_click', 1000);
    applyAudioPreferences({ muted: false, masterVolume: 0.5, musicEnabled: true });
    await playMusic('menu_theme');
    await playCue('stinger_dayton_ceasefire', 1000);

    const ambientElements = FakeAudio.instances.filter((element) => /ambient_(warroom|field|archive)/u.test(element.src));
    const uiElement = FakeAudio.instances.find((element) => element.src.includes('ui_click'))!;
    const musicElement = FakeAudio.instances.find((element) => element.src.includes('menu_theme'))!;
    const stingerElement = FakeAudio.instances.find((element) => element.src.includes('stinger_dayton_ceasefire'))!;
    expect(ambientElements).toHaveLength(3);
    expect(uiElement.playCallCount).toBe(1);
    expect(musicElement.playCallCount).toBe(1);
    expect(stingerElement.playCallCount).toBe(1);
    expect(getAudioState().currentMusicId).toBe('menu_theme');

    setAmbientPlaybackEnabled(false);

    for (const element of ambientElements) {
      expect(element.pauseCallCount).toBe(1);
    }
    expect(uiElement.pauseCallCount).toBe(0);
    expect(musicElement.pauseCallCount).toBe(0);
    expect(stingerElement.pauseCallCount).toBe(0);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: false,
      currentAmbientId: null,
      currentMusicId: 'menu_theme',
      lastCueId: 'stinger_dayton_ceasefire',
    });
  });

  it('makes repeated disable idempotent and supports explicit re-enable with retry', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0.5 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();
    await playAmbientBed('ambient_warroom');

    const element = FakeAudio.latest();
    expect(element.playCallCount).toBe(1);

    setAmbientPlaybackEnabled(false);
    expect(element.pauseCallCount).toBe(1);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: false,
      currentAmbientId: null,
    });

    setAmbientPlaybackEnabled(false);
    expect(element.pauseCallCount).toBe(1);
    expect(isAmbientPlaybackEnabled()).toBe(false);

    setAmbientPlaybackEnabled(true);
    expect(element.playCallCount).toBe(1);
    expect(getAudioState().currentAmbientId).toBeNull();

    await playAmbientBed('ambient_warroom');

    expect(element.playCallCount).toBe(2);
    expect(element.pauseCallCount).toBe(1);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: true,
      currentAmbientId: 'ambient_warroom',
    });
  });

  it('does not treat zero volume as the ambient playback gate', async () => {
    applyAudioPreferences({ muted: false, masterVolume: 0 });
    setAmbientPlaybackEnabled(true);
    unlockAudioForUserGesture();

    await playAmbientBed('ambient_warroom');

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.latest().playCallCount).toBe(1);
    expect(FakeAudio.latest().volume).toBe(0);
    expect(getAudioState()).toMatchObject({
      ambientPlaybackEnabled: true,
      currentAmbientId: 'ambient_warroom',
    });
  });
});
