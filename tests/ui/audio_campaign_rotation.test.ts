// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CAMPAIGN_MUSIC_IDS, createMusicShuffleBag } from '../../src/ui/map/audio/music_shuffle_bag';
import * as bus from '../../src/ui/map/audio/audio_engine';
import { applyAudioPreferences, saveAudioPreferences } from '../../src/ui/map/audio/audio_preferences';
import { AudioSurfaceBedController } from '../../src/ui/map/components/AudioSurfaceBedController';
import { useGameStore } from '../../src/ui/map/store/gameStore';

class FakeAudio extends EventTarget {
  static elements: FakeAudio[] = [];
  static defer = false;
  static unsupported = false;
  static pending: Array<{ resolve: () => void; reject: () => void }> = [];
  preload = ''; loop = false; volume = 0; currentTime = 0;
  paused = true; ended = false; error: Error | null = null;
  play = vi.fn(() => {
    this.paused = false; this.ended = false;
    if (FakeAudio.unsupported) return Promise.reject(Object.assign(new Error('unsupported'), { name: 'NotSupportedError' }));
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
const menu = () => FakeAudio.elements.find(audio => audio.src.includes('what_remains_of_home.ogg'))!;
beforeEach(() => {
  FakeAudio.unsupported = false; bus.resetAudioForTests(); FakeAudio.elements = []; FakeAudio.pending = []; FakeAudio.defer = false;
  vi.stubGlobal('Audio', FakeAudio); window.localStorage.clear(); saveAudioPreferences(preferences);
  useGameStore.setState({ loadedGameState: null });
});
afterEach(() => { cleanup(); bus.resetAudioForTests(); vi.unstubAllGlobals(); window.localStorage.clear(); });

const campaignSlugs = ['a_country_before_dawn', 'lines_on_paper', 'the_long_winter', 'no_answer_on_the_radio', 'the_life_we_remember', 'a_table_for_strangers', 'what_the_maps_cannot_show', 'after_the_guns'];
const current = () => FakeAudio.elements.find(audio => audio.src.includes(bus.getAudioState().requestedMusicId!.replace('campaign_', '')))!;
const campaignId = () => {
  const id = bus.getAudioState().requestedMusicId;
  expect(id).toMatch(/^campaign_/);
  return id!;
};
const mountGame = async () => {
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'game' }));
  expect(FakeAudio.elements).toHaveLength(0);
  fireEvent.pointerDown(window); await flush(); return view;
};
it('mounted game traverses all eight once per shuffled cycle without a boundary repeat', async () => {
  await mountGame(); const ids: string[] = [];
  for (let n = 0; n < 24; n++) {
    ids.push(campaignId());
    expect(current().loop).toBe(false);
    expect(current().paused).toBe(false);
    expect(FakeAudio.elements.filter(a => !a.paused)).toHaveLength(1);
    current().finish(); await flush();
  }
  for (let n = 0; n < 24; n += 8) expect(new Set(ids.slice(n, n + 8)).size).toBe(8);
  expect(ids.every((id, n) => n === 0 || id !== ids[n - 1])).toBe(true);
  expect(new Set(ids.slice(0, 8))).toEqual(new Set(campaignSlugs.map(s => 'campaign_' + s)));
});
it('keeps campaign position across room/archive, gestures, mute and music opt-out', async () => {
  const view = await mountGame(); const id = campaignId(); const audio = current(); audio.currentTime = 72;
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));
  useGameStore.setState({ chronicleOpen: true });
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'game' }));
  fireEvent.keyDown(window); await flush();
  expect(audio.play).toHaveBeenCalledTimes(1);
  applyAudioPreferences({ ...preferences, muted: true });
  audio.finish(); await flush(); expect(campaignId()).toBe(id);
  audio.ended = false;
  applyAudioPreferences(preferences); await flush(); expect(audio.currentTime).toBe(72);
  applyAudioPreferences({ ...preferences, musicEnabled: false });
  applyAudioPreferences(preferences); await flush();
  expect(campaignId()).toBe(id); expect(audio.currentTime).toBe(72); expect(audio.paused).toBe(false);
});
it('finishes an audible opening into campaign and returns to calm menu without replaying opening', async () => {
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  fireEvent.pointerDown(window); await flush(); opening().currentTime = 20;
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'game' }));
  expect(bus.getAudioState().requestedMusicId).toBe('opening_titles');
  opening().finish(); await flush(); const id = campaignId(); const audio = current(); audio.currentTime = 24;
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); await flush();
  expect(menu().paused).toBe(false); expect(audio.paused).toBe(true);
  audio.finish(); await flush(); expect(bus.getAudioState().requestedMusicId).toBe('menu_theme');
  audio.ended = false;
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'warroom' })); await flush();
  expect(campaignId()).toBe(id); expect(audio.currentTime).toBe(24); expect(menu().paused).toBe(true);
});
it('skips an unheard opening and starts campaign after later opt-in', async () => {
  saveAudioPreferences({ ...preferences, musicEnabled: false });
  const view = render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'warroom' }));
  fireEvent.pointerDown(window); applyAudioPreferences(preferences); await flush();
  campaignId(); expect(opening()).toBeUndefined(); expect(menu()).toBeUndefined();
});
it('retries autoplay rejection on a gesture without consuming a second track or duplicating pending plays', async () => {
  FakeAudio.defer = true; await mountGame(); const id = campaignId(); const audio = current();
  fireEvent.keyDown(window); expect(audio.play).toHaveBeenCalledTimes(1);
  FakeAudio.pending[0].reject(); await flush();
  expect(campaignId()).toBe(id); fireEvent.keyDown(window); expect(audio.play).toHaveBeenCalledTimes(2);
  FakeAudio.pending[1].resolve(); await flush(); expect(campaignId()).toBe(id);
});
it('bounds decode failures to all eight and ignores stale error/end events', async () => {
  await mountGame(); const ids = new Set<string>();
  for (let n = 0; n < 8; n++) {
    ids.add(campaignId()); const audio = current();
    audio.error = new Error('decode'); audio.dispatchEvent(new Event('error')); await flush();
    audio.finish(); await flush();
  }
  expect(ids.size).toBe(8); expect(FakeAudio.elements).toHaveLength(8);
  expect(bus.getAudioState().requestedMusicId).toBeNull();
  fireEvent.keyDown(window); await flush(); expect(FakeAudio.elements).toHaveLength(8);
  expect(FakeAudio.elements.every(a => a.paused)).toBe(true);
});
it('cancels pending campaign ownership on menu switch/unmount and contains late completion after remount', async () => {
  FakeAudio.defer = true; const view = await mountGame(); const audio = current();
  view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  FakeAudio.pending[0].resolve(); await flush(); expect(audio.paused).toBe(true);
  audio.finish(); expect(bus.getAudioState().requestedMusicId).toBe('menu_theme');
  view.unmount();
  const next = render(createElement(AudioSurfaceBedController, { appScreen: 'game' }));
  const request = bus.getAudioState().requestedMusicId;
  FakeAudio.pending[1].resolve(); await flush(); expect(menu().paused).toBe(true);
  menu().finish(); expect(bus.getAudioState().requestedMusicId).toBe(request);
  next.unmount(); FakeAudio.pending[2].resolve(); await flush();
  expect(FakeAudio.elements.every(a => a.paused)).toBe(true);
});

it('uses injected renderer randomness and avoids a repeated boundary even with identical shuffles', () => {
  const random = vi.fn(() => .999);
  const next = createMusicShuffleBag(CAMPAIGN_MUSIC_IDS, random);
  expect(random).not.toHaveBeenCalled();
  const ids = Array.from({ length: 24 }, () => next());
  for (let i = 0; i < 24; i += 8) expect(new Set(ids.slice(i, i + 8))).toEqual(new Set(CAMPAIGN_MUSIC_IDS));
  expect(ids[8]).not.toBe(ids[7]); expect(ids[16]).not.toBe(ids[15]);
  expect(random).toHaveBeenCalledTimes(21);
});

it('ignores former-owner campaign events after remounting the same requested track', async () => {
  const first = await mountGame(); const old = current(); const id = campaignId();
  first.unmount();
  render(createElement(AudioSurfaceBedController, { appScreen: 'game' })); await flush();
  expect(campaignId()).toBe(id);
  old.finish(); old.error = new Error('late decode'); old.dispatchEvent(new Event('error')); await flush();
  expect(campaignId()).toBe(id);
});

it('treats unsupported-codec play rejections as bounded media failures rather than autoplay denial', async () => {
  FakeAudio.unsupported = true; await mountGame();
  for (let n = 0; n < 10; n++) await flush();
  expect(FakeAudio.elements).toHaveLength(8);
  expect(bus.getAudioState().requestedMusicId).toBeNull();
  fireEvent.keyDown(window); await flush(); expect(FakeAudio.elements).toHaveLength(8);
});

for (const eventType of ['ended', 'error']) {
  it(`ignores a queued former-surface ${eventType} notification after resuming healthy campaign media`, async () => {
    const view = await mountGame(); const audio = current(); const id = campaignId(); audio.currentTime = 48;
    view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' })); await flush();
    view.rerender(createElement(AudioSurfaceBedController, { appScreen: 'game' })); await flush();
    expect(current()).toBe(audio); expect(audio.currentTime).toBe(48);
    expect(audio.ended).toBe(false); expect(audio.error).toBeNull(); expect(audio.paused).toBe(false);
    // An event queued by the former owner arrives after healthy reacquisition;
    // unlike finish(), notification delivery does not mutate current media state.
    audio.dispatchEvent(new Event(eventType)); await flush();
    expect(campaignId()).toBe(id); expect(current()).toBe(audio); expect(audio.currentTime).toBe(48);
  });
}
