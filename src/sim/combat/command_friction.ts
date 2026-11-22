/**
 * Phase D Step 6 / D0.9.1: Command friction for War phase (Mid-War).
 * Semantic: command_friction_multiplier >= 1; higher = more friction = worse execution.
 * Deterministic: identical state + inputs → same multiplier; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Friction contribution per point of faction exhaustion. */
const FRICTION_PER_EXHAUSTION = 0.01;

/** Maximum multiplier (cap so deltas remain bounded). */
const MAX_MULTIPLIER = 10;

/**
 * Compute command friction multiplier for a faction in War phase.
 * Returns a value >= 1; higher = more friction = worse execution.
 * Only meaningful when meta.phase === 'war'; returns 1 otherwise.
 * Deterministic: same state + factionId → same result.
 */
export function getCommandFrictionMultiplier(
    state: GameState,
    factionId: FactionId,
    _settlementEdges: EdgeRecord[]
): number {
    if (state.meta.phase !== 'war') {
        return 1;
    }

    const exhaustion = (state.political.war_exhaustion ?? {})[factionId] ?? 0;

    const raw = 1 + exhaustion * FRICTION_PER_EXHAUSTION;
    return Math.max(1, Math.min(MAX_MULTIPLIER, raw));
}

// The settlementEdges parameter is kept for call-site compatibility; the former
// front-edge friction term was always 0 in a campaign and was retired 2026-11-22
// (dead code; hash unchanged).

/**
 * Compute command friction multipliers for all factions (deterministic order).
 * All returned values are >= 1; higher = more friction.
 */
export function getCommandFrictionMultipliers(
    state: GameState,
    settlementEdges: EdgeRecord[]
): Record<FactionId, number> {
    const out: Record<FactionId, number> = {};
    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    for (const fid of factionIds) {
        out[fid] = getCommandFrictionMultiplier(state, fid, settlementEdges);
    }
    return out;
}

