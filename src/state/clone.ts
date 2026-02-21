/**
 * Single place for deep-cloning GameState (structuredClone with JSON fallback).
 * Used by turn pipelines and browser runners to avoid mutating input state.
 */

import type { GameState } from './game_state.js';

export function cloneGameState(state: GameState): GameState {
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(state);
    }
    return JSON.parse(JSON.stringify(state)) as GameState;
}
