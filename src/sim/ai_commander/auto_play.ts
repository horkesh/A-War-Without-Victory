/**
 * Auto-play orchestrator — AI commands all three factions.
 *
 * Crown jewel feature: Claude vs Claude vs Claude.
 * Requires API key with sufficient budget (~$5-15/game).
 *
 * Config modes:
 * - instant: as fast as API allows (calibration/testing)
 * - paced: 2s delay between turns (spectating)
 *
 * All AI decisions logged to decision_log for post-game review.
 * Cadet mode: auto-play uses formula bot (no API cost).
 */

import type { GameState } from '../../state/game_state.js';

export interface AutoPlayConfig {
    /** AI model tier for decision quality. */
    modelTier: 'commander' | 'officer' | 'recruit';
    /** Speed: instant (max throughput) or paced (spectating). */
    speed: 'instant' | 'paced';
    /** Maximum turns to auto-play. Null = play to completion. */
    maxTurns: number | null;
    /** Use formula bot instead of AI (Cadet mode — no API cost). */
    cadetMode: boolean;
}

export interface AutoPlayState {
    active: boolean;
    config: AutoPlayConfig;
    turnsCompleted: number;
    paused: boolean;
}

/**
 * Create initial auto-play state.
 */
export function createAutoPlayState(config: AutoPlayConfig): AutoPlayState {
    return {
        active: true,
        config,
        turnsCompleted: 0,
        paused: false,
    };
}

/**
 * Check if auto-play should continue.
 */
export function shouldContinueAutoPlay(
    autoPlay: AutoPlayState,
    state: GameState,
): boolean {
    if (!autoPlay.active || autoPlay.paused) return false;
    if (state.meta?.game_over) return false;
    if (autoPlay.config.maxTurns !== null && autoPlay.turnsCompleted >= autoPlay.config.maxTurns) return false;
    return true;
}

export const DEFAULT_AUTO_PLAY_CONFIG: AutoPlayConfig = {
    modelTier: 'commander',
    speed: 'paced',
    maxTurns: null,
    cadetMode: true,
};
