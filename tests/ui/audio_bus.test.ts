import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getAudioState,
    isAudioEnabled,
    playCue,
    resetAudioForTests,
    setEnabled,
    setVolume,
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

    it('records requested cues only after explicit enablement but still performs no playback IO', async () => {
        setEnabled(true);
        await playCue('peace_plan_offered');

        expect(isAudioEnabled()).toBe(true);
        expect(getAudioState().lastCueId).toBe('peace_plan_offered');
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(globalThis.AudioContext).not.toHaveBeenCalled();
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
