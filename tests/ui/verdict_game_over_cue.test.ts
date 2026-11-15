// @vitest-environment jsdom

/**
 * ST3: the Verdict screen owns the `game_over` cue (GameOverModal, its old caller, was deleted).
 * It plays once when the verdict opens and goes through the audio engine, so the audio
 * settings (enabled, muted, user gesture) decide whether anything is heard.
 */
import { readFileSync } from 'node:fs';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameOverCueLatch, GAME_OVER_CUE_ID, useGameOverCue } from '../../src/ui/map/audio/gameOverCue';
import {
    getAudioState,
    muteAudio,
    resetAudioForTests,
    setEnabled,
    unlockAudioForUserGesture,
    unmuteAudio,
} from '../../src/ui/map/audio/audio_engine';
import { getCueConfig } from '../../src/ui/map/audio/sound_manifest';

class FakeAudio {
    static created = 0;
    volume = 1;
    loop = false;
    constructor(_src?: string) { FakeAudio.created += 1; }
    play(): Promise<void> { return Promise.resolve(); }
    pause(): void { /* no-op */ }
    addEventListener(): void { /* no-op */ }
    removeEventListener(): void { /* no-op */ }
}

describe('Verdict screen owns the game_over cue', () => {
    beforeEach(() => {
        resetAudioForTests();
        FakeAudio.created = 0;
        vi.stubGlobal('Audio', FakeAudio);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        resetAudioForTests();
    });

    it('the cue is registered', () => {
        expect(getCueConfig(GAME_OVER_CUE_ID)?.id).toBe('game_over');
    });

    it('plays once when the verdict opens, not on every re-render', () => {
        setEnabled(true);
        unlockAudioForUserGesture();
        const { rerender } = renderHook(({ open }) => useGameOverCue(open), { initialProps: { open: true } });
        expect(getAudioState().lastCueId).toBe('game_over');
        expect(getAudioState().acceptedCueCount).toBe(1);
        rerender({ open: true });
        rerender({ open: true });
        expect(getAudioState().acceptedCueCount).toBe(1);
    });

    it('stays silent while the verdict is not open, then plays when it opens', () => {
        setEnabled(true);
        unlockAudioForUserGesture();
        const { rerender } = renderHook(({ open }) => useGameOverCue(open), { initialProps: { open: false } });
        expect(getAudioState().acceptedCueCount).toBe(0);
        rerender({ open: true });
        expect(getAudioState().acceptedCueCount).toBe(1);
    });

    it('respects the audio settings: disabled, muted and locked buses accept nothing', () => {
        // Default: audio disabled.
        renderHook(() => useGameOverCue(true));
        expect(getAudioState().acceptedCueCount).toBe(0);

        resetAudioForTests();
        setEnabled(true);
        // Enabled, but no user gesture yet.
        renderHook(() => useGameOverCue(true));
        expect(getAudioState().acceptedCueCount).toBe(0);

        resetAudioForTests();
        setEnabled(true);
        unlockAudioForUserGesture();
        muteAudio();
        renderHook(() => useGameOverCue(true));
        expect(getAudioState().acceptedCueCount).toBe(0);
        unmuteAudio();
    });

    it('latch: replays only after the surface has closed in between', () => {
        const play = vi.fn();
        const latch = createGameOverCueLatch(play);
        expect(latch.notify(false)).toBe(false);
        expect(latch.notify(true)).toBe(true);
        expect(latch.notify(true)).toBe(false);
        expect(latch.notify(false)).toBe(false);
        expect(latch.notify(true)).toBe(true);
        expect(play).toHaveBeenCalledTimes(2);
        expect(play).toHaveBeenCalledWith('game_over');
    });

    it('VerdictScreen mounts the cue hook and waits for the Dayton signing beat', () => {
        const source = readFileSync('src/ui/map/components/VerdictScreen.tsx', 'utf8');
        expect(source).toContain("from '../audio/gameOverCue'");
        expect(source).toMatch(/useGameOverCue\(Boolean\(loadedGameState\?\.gameOver\)\s*&&\s*\(loadedGameState\?\.daytonAgreement\?\.version !== 1 \|\| signingSeen\)\)/);
    });
});
