/**
 * Phase D Step 6 / D0.9.1: Command friction for Phase II (Mid-War).
 * Semantic: command_friction_multiplier >= 1; higher = more friction = worse execution.
 * Deterministic: identical state + inputs → same multiplier; no randomness.
 */

import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Friction contribution per point of faction exhaustion. */
const FRICTION_PER_EXHAUSTION = 0.01;

/** Friction contribution per front edge for that faction. */
const FRICTION_PER_FRONT_EDGE = 0.02;

/** Maximum multiplier (cap so deltas remain bounded). */
const MAX_MULTIPLIER = 10;

/**
 * Compute command friction multiplier for a faction in Phase II.
 * Returns a value >= 1; higher = more friction = worse execution.
 * Only meaningful when meta.phase === 'phase_ii'; returns 1 otherwise.
 * Deterministic: same state + factionId → same result.
 */
export function getPhaseIICommandFrictionMultiplier(
    state: GameState,
    factionId: FactionId,
    settlementEdges: EdgeRecord[]
): number {
    if (state.meta.phase !== 'phase_ii') {
        return 1;
    }

    const exhaustion = (state.phase_ii_exhaustion ?? {})[factionId] ?? 0;
    const frontEdges = computeFrontEdges(state, settlementEdges);
    let frontEdgeCount = 0;
    for (const fe of frontEdges) {
        if (fe.side_a === factionId || fe.side_b === factionId) frontEdgeCount += 1;
    }

    const raw = 1 + exhaustion * FRICTION_PER_EXHAUSTION + frontEdgeCount * FRICTION_PER_FRONT_EDGE;
    return Math.max(1, Math.min(MAX_MULTIPLIER, raw));
}

/**
 * Compute command friction multipliers for all factions (deterministic order).
 * All returned values are >= 1; higher = more friction.
 */
export function getPhaseIICommandFrictionMultipliers(
    state: GameState,
    settlementEdges: EdgeRecord[]
): Record<FactionId, number> {
    const out: Record<FactionId, number> = {};
    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    for (const fid of factionIds) {
        out[fid] = getPhaseIICommandFrictionMultiplier(state, fid, settlementEdges);
    }
    return out;
}
