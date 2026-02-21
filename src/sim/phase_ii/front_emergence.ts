/**
 * Phase D Step 2/3: Front emergence and stabilization for Phase II (Mid-War).
 * Fronts are derived from settlement-level interaction: opposing control adjacency.
 * Stability (fluid / static / oscillating) is derived from segment active_streak (Phase D Step 3).
 * No geometry created; fronts are non-geometric descriptors only (Engine Invariants §6, §13.1).
 */

import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState, PhaseIIFrontDescriptor, PhaseIIFrontStability } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Turns of sustained opposing control before a front segment is considered static (Engine Invariants §6). */
export const STABILIZATION_TURNS = 4;

/**
 * Derive front stability from segment active_streak and max_active_streak.
 * Static: all edges in front have active_streak >= STABILIZATION_TURNS.
 * Oscillating: any edge has active_streak === 1 and max_active_streak > 1 (returned to active after inactivity).
 * Fluid: otherwise.
 */
export function deriveFrontStability(
    edgeIds: string[],
    segments: Record<string, { active_streak?: number; max_active_streak?: number }>
): PhaseIIFrontStability {
    if (edgeIds.length === 0) return 'fluid';
    let minStreak = Number.MAX_SAFE_INTEGER;
    let hasOscillating = false;
    for (const eid of edgeIds) {
        const seg = segments[eid];
        const streak = Number.isInteger(seg?.active_streak) ? seg!.active_streak! : 0;
        const maxStreak = Number.isInteger(seg?.max_active_streak) ? seg!.max_active_streak! : 0;
        minStreak = Math.min(minStreak, streak);
        if (streak === 1 && maxStreak > 1) hasOscillating = true;
    }
    if (hasOscillating) return 'oscillating';
    if (minStreak >= STABILIZATION_TURNS) return 'static';
    return 'fluid';
}

/**
 * Detect Phase II fronts from settlement-level interaction.
 * - Runs only when meta.phase === 'phase_ii'. Returns [] otherwise (no fronts before Phase II).
 * - Fronts are derived from opposing political control across settlement adjacency edges.
 * - No geometry created; returns descriptors with edge_ids only.
 * - Deterministic: stable sort by edge_id and side-pair.
 */
export function detectPhaseIIFronts(
    state: GameState,
    settlementEdges: EdgeRecord[]
): PhaseIIFrontDescriptor[] {
    if (state.meta.phase !== 'phase_ii') {
        return [];
    }

    const frontEdges = computeFrontEdges(state, settlementEdges);
    if (frontEdges.length === 0) {
        return [];
    }

    // Group by normalized side-pair (deterministic key)
    const byPair = new Map<string, typeof frontEdges>();
    for (const fe of frontEdges) {
        const sideA = fe.side_a ?? '';
        const sideB = fe.side_b ?? '';
        const pairKey = sideA < sideB ? `${sideA}--${sideB}` : `${sideB}--${sideA}`;
        if (!byPair.has(pairKey)) {
            byPair.set(pairKey, []);
        }
        byPair.get(pairKey)!.push(fe);
    }

    const turn = state.meta.turn;
    const segments = state.front_segments ?? {};
    const descriptors: PhaseIIFrontDescriptor[] = [];

    const pairKeys = Array.from(byPair.keys()).sort(strictCompare);
    for (const pairKey of pairKeys) {
        const edges = byPair.get(pairKey)!;
        const edgeIds = edges.map((e) => e.edge_id).sort(strictCompare);
        const createdTurn =
            edgeIds.length > 0
                ? Math.min(
                    ...edgeIds.map((eid) => (segments[eid]?.created_turn != null ? segments[eid].created_turn! : turn))
                )
                : turn;
        const id = `F_${pairKey}_${edgeIds[0] ?? 'none'}`;
        const stability = deriveFrontStability(edgeIds, segments);
        descriptors.push({
            id,
            edge_ids: edgeIds,
            created_turn: createdTurn,
            stability
        });
    }

    return descriptors;
}
