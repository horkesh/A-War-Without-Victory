/**
 * Single place for deep-cloning GameState (structuredClone with JSON fallback).
 * Used by turn pipelines and browser runners to avoid mutating input state.
 */

import type { GameState } from './game_state.js';

export function cloneGameState(state: GameState): GameState {
    if (typeof globalThis.structuredClone === 'function') {
        try {
            return globalThis.structuredClone(state);
        } catch {
            // Large late-run GameStates can trip DataCloneError/OOM in structuredClone.
            // GameState is JSON-serializable by contract, so fall back to the deterministic path.
        }
    }
    return JSON.parse(JSON.stringify(state)) as GameState;
}
