/**
 * Phase D Step 6 / D0.9.1: Command friction for War phase (Mid-War).
 * Semantic: command_friction_multiplier >= 1; higher = more friction = worse execution.
 * Deterministic: identical state + inputs → same multiplier; no randomness.
 */

import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Friction contribution per point of faction exhaustion.
 *  R6 friction fix #2 (2026-08-06): rescaled 0.01 → 0.0001 (100×) to match the
 *  2026-05-22 war_exhaustion rescale (0–100 → 0–10000 scale) that this constant
 *  was missed by. On the 0.01 value the exhaustion term (exhaustion·0.01) hit the
 *  MAX_MULTIPLIER=10 ceiling once exhaustion exceeded ~900 (≈wk20), pinning every
 *  faction's friction at a flat 10× — washing out the front-edge/exhaustion
 *  differentiation the multiplier is meant to express and homogenising the
 *  exhaustion accumulator delta. 0.0001 restores the ORIGINAL design intent: the
 *  exhaustion term contributes 1.0 at full exhaustion (10000·0.0001), giving a
 *  multiplier that tracks exhaustion proportionally (~1.0–2.0) instead of pinning
 *  at the ceiling. Empirically verified de-pinned (per-faction mult range logged
 *  before/after in the friction-fix#2 188w run). */
const FRICTION_PER_EXHAUSTION = 0.0001;

/** Friction contribution per front edge for that faction. */
const FRICTION_PER_FRONT_EDGE = 0.02;

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
    settlementEdges: EdgeRecord[]
): number {
    if (state.meta.phase !== 'war') {
        return 1;
    }

    const exhaustion = (state.political.war_exhaustion ?? {})[factionId] ?? 0;
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

