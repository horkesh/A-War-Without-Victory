/**
 * The `game_over` cue is owned by the Verdict screen: it plays once when the
 * verdict (or its fallback) opens, and again only if the screen closed in between.
 * GameOverModal used to call it; that modal is gone and the cue had no caller.
 *
 * Playback goes through `playCue`, so the audio settings stay in charge: a disabled
 * or muted bus, a locked bus (no user gesture yet) and the volume sliders all apply.
 */
import { useEffect, useRef } from 'react';
import { playCue } from './audio_engine';

export const GAME_OVER_CUE_ID = 'game_over';

export interface GameOverCueLatch {
    /** `open` is whether the verdict surface is showing. Returns true when the cue was requested. */
    notify(open: boolean): boolean;
}

export function createGameOverCueLatch(play: (id: string) => unknown = playCue): GameOverCueLatch {
    let played = false;
    return {
        notify(open: boolean): boolean {
            if (!open) {
                played = false;
                return false;
            }
            if (played) return false;
            played = true;
            void play(GAME_OVER_CUE_ID);
            return true;
        },
    };
}

export function useGameOverCue(open: boolean): void {
    const latch = useRef<GameOverCueLatch | null>(null);
    if (latch.current === null) latch.current = createGameOverCueLatch();
    useEffect(() => {
        latch.current?.notify(open);
    }, [open]);
}
