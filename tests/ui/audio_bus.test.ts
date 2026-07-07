import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getAudioState,
    installAudioGestureUnlockListeners,
    isAudioEnabled,
    playCue,
    resetAudioForTests,
    setEnabled,
    setVolume,
    unlockAudioForUserGesture,
} from '../../src/ui/map/audio/audio_engine.js';

describe('audio bus stub', () => {
    beforeEach(() => {
        resetAudioForTests();
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('AudioContext', vi.fn());
    });

    it('defaults to disabled and silent without touching browser audio or network APIs', async () => {
        await playCue('ui_click');

        expect(isAudioEnabled()).toBe(false);
        expect(getAudioState().lastCueId).toBeNull();
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(globalThis.AudioContext).not.toHaveBeenCalled();
    });

    it('records requested cues only after explicit enablement and user gesture unlock', async () => {
        setEnabled(true);
        await playCue('peace_plan_offered', 1000);
        expect(getAudioState().acceptedCueCount).toBe(0);

        unlockAudioForUserGesture();
        await playCue('peace_plan_offered', 1000);

        expect(isAudioEnabled()).toBe(true);
        expect(getAudioState().lastCueId).toBe('peace_plan_offered');
        expect(getAudioState().acceptedCueCount).toBe(1);
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(globalThis.AudioContext).not.toHaveBeenCalled();
    });

    it('suppresses repeated cues inside their deterministic cooldown window', async () => {
        setEnabled(true);
        unlockAudioForUserGesture();

        await playCue('stinger_dayton_ceasefire', 1000);
        await playCue('stinger_dayton_ceasefire', 1200);
        await playCue('stinger_dayton_ceasefire', 2600);

        expect(getAudioState().lastCueId).toBe('stinger_dayton_ceasefire');
        expect(getAudioState().acceptedCueCount).toBe(2);
    });

    it('can install browser gesture unlock listeners without initializing browser audio', async () => {
        setEnabled(true);
        const target = new EventTarget();
        const cleanup = installAudioGestureUnlockListeners(target);

        target.dispatchEvent(new Event('keydown'));
        await playCue('ui_click', 1000);
        cleanup();

        expect(getAudioState()).toMatchObject({
            userGestureUnlocked: true,
            lastCueId: 'ui_click',
            acceptedCueCount: 1,
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(globalThis.AudioContext).not.toHaveBeenCalled();
    });

    it('plays a resolved cue asset only after gesture unlock', async () => {
        const play = vi.fn(() => Promise.resolve());
        const pause = vi.fn();
        class FakeAudio {
            src: string;
            preload = '';
            loop = false;
            volume = 0;
            currentTime = 0;

            constructor(src: string) {
                this.src = src;
            }

            play = play;
            pause = pause;
        }
        vi.stubGlobal('Audio', FakeAudio);
        setEnabled(true);
        setVolume('master', 0.5);

        await playCue('ui_click', 1000);
        expect(play).not.toHaveBeenCalled();

        unlockAudioForUserGesture();
        await playCue('ui_click', 1000);

        expect(play).toHaveBeenCalledTimes(1);
        expect(pause).not.toHaveBeenCalled();
        expect(getAudioState()).toMatchObject({
            lastCueId: 'ui_click',
            lastResolvedAssetUrl: expect.stringContaining('ui_click'),
        });
    });

    it('clamps bus volumes deterministically by kind', () => {
        setVolume('master', 2);
        setVolume('music', -1);
        setVolume('ui', 0.25);
        setVolume('ambient', 0.5);
        setVolume('stinger', 0.75);

        expect(getAudioState().volumes).toEqual({
            master: 1,
            ui: 0.25,
            ambient: 0.5,
            music: 0,
            stinger: 0.75,
        });
    });
});
