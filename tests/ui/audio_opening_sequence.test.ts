// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as bus from '../../src/ui/map/audio/audio_engine';
import { applyAudioPreferences, saveAudioPreferences } from '../../src/ui/map/audio/audio_preferences';
import { AudioSurfaceBedController } from '../../src/ui/map/components/AudioSurfaceBedController';
import { useGameStore } from '../../src/ui/map/store/gameStore';

class FakeAudio extends EventTarget {
  static elements: FakeAudio[] = [];
  static defer = false;
  static pending: Array<{ resolve: () => void; reject: () => void }> = [];
  preload = ''; loop = false; volume = 0; currentTime = 0;
  paused = true; ended = false; error: Error | null = null;
  play = vi.fn(() => {
    this.paused = false;
    if (!FakeAudio.defer) return Promise.resolve();
    return new Promise<void>((resolve, reject) => FakeAudio.pending.push({
      resolve: () => { this.paused = false; resolve(); },
      reject: () => reject(new Error('autoplay denied')),
    }));
  });
  pause = vi.fn(() => { this.paused = true; });
  constructor(public src: string) { super(); FakeAudio.elements.push(this); }
  finish() { this.ended = true; this.paused = true; this.dispatchEvent(new Event('ended')); }
}
const preferences = { muted: false, masterVolume: .5, musicEnabled: true, musicVolume: .4 };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const opening = () => FakeAudio.elements.find(audio => audio.src.includes('opening'))!;
// Owner 2026-11-13: the menu loops Lines on Paper, not the opening's melody.
const menu = () => FakeAudio.elements.find(audio => audio.src.includes('/lines_on_paper.ogg'))!;
beforeEach(() => {
  bus.resetAudioForTests(); FakeAudio.elements = []; FakeAudio.pending = []; FakeAudio.defer = false;
  vi.stubGlobal('Audio', FakeAudio); window.localStorage.clear(); saveAudioPreferences(preferences);
  useGameStore.setState({ loadedGameState: null });
});
afterEach(() => { cleanup(); bus.resetAudioForTests(); vi.unstubAllGlobals(); window.localStorage.clear(); });
it('plays opening once, ignores gestures and rerenders, then naturally loops calm menu', async () => {
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  expect(FakeAudio.elements).toHaveLength(0);
  fireEvent.pointerDown(window); await flush();
  expect(opening()).toBeDefined(); expect(opening().loop).toBe(false);
  opening().currentTime = 12;
  fireEvent.keyDown(window); view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  expect(opening().play).toHaveBeenCalledTimes(1); expect(opening().currentTime).toBe(12);
  opening().finish(); await flush();
  expect(menu().loop).toBe(true); expect(menu().paused).toBe(false);
  fireEvent.pointerDown(window); await flush();
  expect(menu().play).toHaveBeenCalledTimes(1);
});
it('resumes opening position after mute and channel opt-out without restarting', async () => {
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window); await flush();
  opening().currentTime = 14;
  applyAudioPreferences({ ...preferences, muted: true }); expect(opening().paused).toBe(true);
  applyAudioPreferences(preferences); await flush();
  expect(opening().currentTime).toBe(14); expect(opening().paused).toBe(false);
  applyAudioPreferences({ ...preferences, musicEnabled: false });
  applyAudioPreferences(preferences); await flush();
  expect(opening().currentTime).toBe(14); expect(opening().volume).toBeCloseTo(.5 * .4 * .4);
});
it('falls through to calm on media error and ignores old opening events', async () => {
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window); await flush();
  opening().error = new Error('decode'); opening().dispatchEvent(new Event('error')); await flush();
  expect(menu().paused).toBe(false);
  opening().finish(); await flush(); expect(menu().play).toHaveBeenCalledTimes(1);
});
it('retries rejected opening on next gesture without duplicate pending requests', async () => {
  FakeAudio.defer = true;
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window);
  fireEvent.keyDown(window); expect(opening().play).toHaveBeenCalledTimes(1);
  FakeAudio.pending[0].reject(); await flush(); fireEvent.keyDown(window);
  expect(opening().play).toHaveBeenCalledTimes(2);
});
it('lets opening finish across campaign entry without replay on return', async () => {
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window); await flush();
  expect(opening()).toBeDefined(); opening().currentTime = 20;
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));
  expect(opening().paused).toBe(false); expect(menu()).toBeUndefined();
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  expect(opening().play).toHaveBeenCalledTimes(1); expect(opening().currentTime).toBe(20);
  opening().finish(); await flush(); expect(menu().paused).toBe(false);
});
it('contains late play resolution and stale end events after unmount', async () => {
  FakeAudio.defer = true;
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window);
  expect(opening()).toBeDefined(); view.unmount();
  FakeAudio.pending[0].resolve(); await flush(); expect(opening().paused).toBe(true);
  opening().finish(); expect(menu()).toBeUndefined(); expect(bus.getAudioState().requestedMusicId).toBeNull();
});
it('starts campaign directly for an existing campaign and preserves opt-in defaults', async () => {
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'game' })); fireEvent.keyDown(window); await flush();
  expect(opening()).toBeUndefined(); expect(bus.getAudioState().requestedMusicId).toMatch(/^campaign_/); view.unmount(); bus.resetAudioForTests();
  saveAudioPreferences({ ...preferences, musicEnabled: false });
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.keyDown(window);
  expect(bus.getAudioState().musicPlaybackEnabled).toBe(false);
  expect(FakeAudio.elements).toHaveLength(1);
});

it('does not resume from a late opening promise while muted', async () => {
  FakeAudio.defer = true;
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window);
  applyAudioPreferences({ ...preferences, muted: true });
  FakeAudio.pending[0].resolve(); await flush(); expect(opening().paused).toBe(true);
  opening().finish(); expect(menu()).toBeUndefined();
});
it('keeps decode failure fallback requested while muted and resumes calm on opt-in', async () => {
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window); await flush();
  applyAudioPreferences({ ...preferences, muted: true });
  opening().error = new Error('decode'); opening().dispatchEvent(new Event('error'));
  expect(bus.getAudioState().requestedMusicId).toBe('menu_theme'); expect(menu()).toBeUndefined();
  applyAudioPreferences(preferences); await flush(); expect(menu().paused).toBe(false);
});
it('contains music construction failure and keeps later gesture recovery available', async () => {
  bus.setEnabled(true); bus.setMusicPlaybackEnabled(true); bus.unlockAudioForUserGesture();
  vi.stubGlobal('Audio', class { constructor() { throw new Error('unavailable'); } });
  await expect(bus.playMusic('menu_theme')).resolves.toBeUndefined();
  vi.stubGlobal('Audio', FakeAudio); bus.retryRequestedMusic(); await flush(); expect(menu().paused).toBe(false);
});

it('skips an unheard opening when the player enters a campaign before opting in', async () => {
  saveAudioPreferences({ ...preferences, musicEnabled: false });
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); fireEvent.pointerDown(window);
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'game' }));
  applyAudioPreferences(preferences); await flush();
  expect(opening()).toBeUndefined(); expect(bus.getAudioState().requestedMusicId).toMatch(/^campaign_/);
});
