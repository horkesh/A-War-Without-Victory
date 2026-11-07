// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as bus from '../../src/ui/map/audio/audio_engine';
import * as manifest from '../../src/ui/map/audio/sound_manifest';
import { applyAudioPreferences, loadAudioPreferences, saveAudioPreferences } from '../../src/ui/map/audio/audio_preferences';
import { AudioSurfaceBedController } from '../../src/ui/map/components/AudioSurfaceBedController';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';
import { setLocale } from '../../src/ui/map/i18n';

class FakeAudio {
  static elements: FakeAudio[] = [];
  preload = ''; loop = false; volume = 0; currentTime = 0;
  paused = true; ended = false; error: unknown = null;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  constructor(public src: string) { FakeAudio.elements.push(this); }
}

it('stops music requested before its current ID is assigned', async () => {
  bus.setEnabled(true);
  bus.setMusicPlaybackEnabled(true);
  bus.unlockAudioForUserGesture();
  const pending = bus.playMusic('menu_theme');
  expect(FakeAudio.elements.some(element => !element.paused)).toBe(true);
  bus.stopMusic();
  await pending;
  expect(FakeAudio.elements.every(element => element.paused)).toBe(true);
  expect(bus.getAudioState().currentMusicId).toBeNull();
  expect(bus.getAudioState().requestedMusicId).toBeNull();
});

beforeEach(() => {
  bus.resetAudioForTests();
  FakeAudio.elements = [];
  vi.stubGlobal('Audio', FakeAudio);
  window.localStorage.clear();
  setLocale('en');
});
afterEach(() => { cleanup(); bus.resetAudioForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.clear(); });

it('applies volume immediately to an already playing cue and pauses on disable', async () => {
  bus.setEnabled(true); bus.unlockAudioForUserGesture();
  await bus.playCue('ui_click');
  const element = FakeAudio.elements[0];
  bus.setMasterVolume(.25);
  expect(element.volume).toBeCloseTo(.25 * .5);
  bus.setEnabled(false);
  expect(element.paused).toBe(true);
});

it('does not reset chosen channel levels when enablement is reapplied', () => {
  bus.setEnabled(true); bus.setVolume('ui', .3); bus.setEnabled(true);
  expect(bus.getAudioState().volumes.ui).toBe(.3);
});

it('pauses the old ambient element on direct bed replacement', async () => {
  bus.setEnabled(true); bus.setAmbientPlaybackEnabled(true); bus.unlockAudioForUserGesture();
  await bus.playAmbientBed('ambient_warroom');
  const previous = FakeAudio.elements[0];
  await bus.playAmbientBed('ambient_field');
  expect(previous.paused).toBe(true);
  expect(bus.getAudioState().currentAmbientId).toBe('ambient_field');
});

it('contains browser media construction failures', async () => {
  vi.stubGlobal('Audio', class { constructor() { throw new Error('Unsupported media'); } });
  bus.setEnabled(true); bus.unlockAudioForUserGesture();
  await expect(bus.playCue('ui_click')).resolves.toBeUndefined();
});

it('replaces a failed media element so a later cue can recover from decode error', async () => {
  bus.setEnabled(true); bus.unlockAudioForUserGesture();
  await bus.playCue('ui_click');
  FakeAudio.elements[0].error = new Error('decode failure');
  await bus.playCue('ui_click');
  expect(FakeAudio.elements).toHaveLength(2);
  expect(FakeAudio.elements[1].play).toHaveBeenCalledTimes(1);
});

it('uses safe defaults when browser storage access itself is denied', () => {
  const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
  try {
    expect(loadAudioPreferences()).toMatchObject({ muted: false, masterVolume: .5, musicEnabled: false, musicVolume: .5 });
    expect(() => saveAudioPreferences({ muted: true, masterVolume: .2 })).not.toThrow();
  } finally { getter.mockRestore(); }
});

it('unlocks once for the first gesture and removes both event listeners', () => {
  const target = new EventTarget(); const onUnlock = vi.fn();
  const cleanupListeners = bus.installAudioGestureUnlockListeners(target, onUnlock);
  target.dispatchEvent(new Event('keydown')); target.dispatchEvent(new Event('pointerdown'));
  expect(onUnlock).toHaveBeenCalledTimes(1); cleanupListeners();
});

it('unlocks audio from the main menu even while ambience remains disabled', () => {
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(bus.getAudioState().userGestureUnlocked).toBe(true);
  expect(bus.getAudioState().ambientPlaybackEnabled).toBe(false);
});

it('keeps requested music silent until explicit opt-in and gesture, then updates and stops it live', async () => {
  const resolveUrl = manifest.resolveCuePlaybackUrl;
  vi.spyOn(manifest, 'resolveCuePlaybackUrl').mockImplementation(id => id === 'menu_theme' ? '/audio/menu.ogg' : resolveUrl(id));
  render(createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }));
  expect(FakeAudio.elements).toHaveLength(0);
  applyAudioPreferences({ muted: false, masterVolume: .5, musicEnabled: true, musicVolume: .4 });
  expect(FakeAudio.elements).toHaveLength(0);
  fireEvent.keyDown(window, { key: 'Enter' });
  await Promise.resolve();
  const music = FakeAudio.elements.find(element => element.src.includes('opening'));
  expect(music).toBeDefined();
  expect(music!.paused).toBe(false);
  expect(music!.volume).toBeCloseTo(.5 * .4 * .4);
  applyAudioPreferences({ muted: false, masterVolume: .2, musicEnabled: true, musicVolume: .3 });
  expect(music!.volume).toBeCloseTo(.2 * .3 * .4);
  applyAudioPreferences({ muted: false, masterVolume: .2, musicEnabled: false, musicVolume: .3 });
  expect(music!.paused).toBe(true);
  expect(bus.getAudioState().ambientPlaybackEnabled).toBe(false);
});

it('persists independent music opt-in and level without changing master mute', () => {
  render(createElement(SettingsScreen, { onClose() {} }));
  const toggle = screen.getByRole('button', { name: 'Toggle background music' });
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(toggle);
  fireEvent.change(screen.getByRole('slider', { name: 'Music volume' }), { target: { value: '30' } });
  expect(loadAudioPreferences()).toMatchObject({ muted: false, musicEnabled: true, musicVolume: .3 });
});

it('does not restore a stale playing-music marker after mute during an in-flight request', async () => {
  applyAudioPreferences({ muted: false, masterVolume: .5, musicEnabled: true });
  bus.unlockAudioForUserGesture();
  const request = bus.playMusic('menu_theme');
  bus.muteAudio();
  await request;
  expect(bus.getAudioState().currentMusicId).toBeNull();
});

it('labels Settings as a dialog, contains keyboard focus and restores the opener', () => {
  const opener = document.createElement('button'); opener.textContent = 'Open settings'; document.body.append(opener); opener.focus();
  const view = render(createElement(SettingsScreen, { onClose() {} }));
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  const first = screen.getByRole('button', { name: 'Audio' });
  const last = screen.getByRole('button', { name: /^Close$/ });
  expect(document.activeElement).toBe(first);
  last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(document.activeElement).toBe(first);
  first.focus(); fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last);
  view.unmount(); expect(document.activeElement).toBe(opener); opener.remove();
});
