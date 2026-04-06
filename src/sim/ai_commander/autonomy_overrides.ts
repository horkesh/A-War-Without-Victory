/**
 * v0.8.4 Phase B: Pure helpers for per-decision autonomy overrides.
 * Mutates state.meta.autonomy_overrides only. Deterministic — no Math.random(), no Date.now().
 */

import type { GameState, FactionId, AutonomyOverride } from '../../state/game_state.js';

/** Ensure the autonomy_overrides array exists on state.meta. */
function ensureOverrides(state: GameState): AutonomyOverride[] {
    if (!state.meta.autonomy_overrides) {
        state.meta.autonomy_overrides = [];
    }
    return state.meta.autonomy_overrides;
}

/**
 * Records a player override of a specific AI decision this turn.
 * Idempotent: replaces any existing override for the same target_id.
 */
export function applyAutonomyOverride(
    state: GameState,
    override: {
        level: 'army' | 'corps' | 'event';
        target_id: string;
        faction: FactionId;
    }
): void {
    const overrides = ensureOverrides(state);
    // Remove any existing override for the same target_id (idempotent upsert)
    const filtered = overrides.filter(o => o.target_id !== override.target_id);
    filtered.push({
        turn: state.meta.turn,
        level: override.level,
        target_id: override.target_id,
        faction: override.faction,
    });
    state.meta.autonomy_overrides = filtered;
}

/**
 * Removes all overrides for a specific target_id.
 */
export function clearAutonomyOverride(state: GameState, targetId: string): void {
    const overrides = ensureOverrides(state);
    state.meta.autonomy_overrides = overrides.filter(o => o.target_id !== targetId);
}

/**
 * Returns the active override for a given target_id, or undefined.
 */
export function getAutonomyOverride(
    state: GameState,
    targetId: string
): AutonomyOverride | undefined {
    return (state.meta.autonomy_overrides ?? []).find(o => o.target_id === targetId);
}
