/**
 * Phase D0.9 Step 2 / D0.9.1: Phase I → Phase II transition (Phase_I_Specification_v0_3_0.md §6).
 * Deterministic, one-way, state-driven transition (no fixed elapsed-time threshold).
 * No randomness; no timestamps; no hard-coded historical dates.
 */

import { computeFrontEdges } from '../../map/front_edges.js';
import type { EdgeRecord, SettlementRecord } from '../../map/settlements.js';
import type { GameState } from '../../state/game_state.js';
import { initializeBrigadeAoR } from '../phase_ii/brigade_aor.js';
import { initializeCorpsCommand } from '../phase_ii/corps_command.js';

/** D0.9.1: Minimum opposing-control adjacency edges for front-precursor persistence. */
export const MIN_OPPOSING_EDGES = 25;

/** D0.9.1: Consecutive turns with >= MIN_OPPOSING_EDGES required before transition. */
export const PERSIST_TURNS = 4;

/** Phase I §6.1 / jna_transition.ts: JNA withdrawal complete at ≥ 0.95. */
export const JNA_WITHDRAWAL_COMPLETE_THRESHOLD = 0.95;

/** Phase I §6.1 / jna_transition.ts: VRS asset transfer complete at ≥ 0.90. */
export const JNA_ASSET_TRANSFER_COMPLETE_THRESHOLD = 0.9;

/**
 * Update Phase I opposing-edges streak from current control and edges.
 * Call once per turn during Phase I, before applying transition.
 * If opposing-control edge count >= MIN_OPPOSING_EDGES: streak += 1; else streak = 0.
 */
export function updatePhaseIOpposingEdgesStreak(state: GameState, settlementEdges: EdgeRecord[]): void {
    if (state.meta.phase !== 'phase_i') return;

    const frontEdges = computeFrontEdges(state, settlementEdges);
    const count = frontEdges.length;
    const current = state.meta.phase_i_opposing_edges_streak ?? 0;
    if (count >= MIN_OPPOSING_EDGES) {
        state.meta = { ...state.meta, phase_i_opposing_edges_streak: current + 1 };
    } else {
        state.meta = { ...state.meta, phase_i_opposing_edges_streak: 0 };
    }
}

/**
 * True when state is in phase_i and all state-driven transition conditions are met (D0.9.1).
 * - meta.phase === 'phase_i'
 * - referendum_held === true and war_start_turn defined and meta.turn >= war_start_turn
 * - JNA complete: withdrawal_progress >= 0.95 and asset_transfer_rs >= 0.9
 * - Front-precursor persistence: phase_i_opposing_edges_streak >= PERSIST_TURNS
 */
export function isPhaseIITransitionEligible(state: GameState): boolean {
    const meta = state.meta;
    if (meta.phase !== 'phase_i') return false;
    if (!meta.referendum_held) return false;

    const warStart = meta.war_start_turn;
    if (warStart == null || typeof warStart !== 'number') return false;

    const turn = meta.turn ?? 0;
    if (turn < warStart) return false;

    const jna = state.phase_i_jna;
    if (!jna?.transition_begun) return false;
    if (typeof jna.withdrawal_progress !== 'number' || jna.withdrawal_progress < JNA_WITHDRAWAL_COMPLETE_THRESHOLD)
        return false;
    if (typeof jna.asset_transfer_rs !== 'number' || jna.asset_transfer_rs < JNA_ASSET_TRANSFER_COMPLETE_THRESHOLD)
        return false;

    const streak = meta.phase_i_opposing_edges_streak ?? 0;
    if (streak < PERSIST_TURNS) return false;

    return true;
}

/**
 * Apply Phase I → Phase II transition: set meta.phase to 'phase_ii' and ensure Phase II state fields exist.
 * Idempotent when already phase_ii; no-op when not eligible. Mutates state in place; returns same state reference.
 * Deterministic, one-way (no reverting to phase_i).
 */
export function applyPhaseIToPhaseIITransition(
    state: GameState,
    edges?: EdgeRecord[],
    settlements?: Map<string, SettlementRecord>
): GameState {
    if (state.meta.phase === 'phase_ii') return state;
    if (!isPhaseIITransitionEligible(state)) return state;

    state.meta = { ...state.meta, phase: 'phase_ii' };

    if (!state.phase_ii_supply_pressure) {
        (state as GameState & { phase_ii_supply_pressure: Record<string, number> }).phase_ii_supply_pressure = {};
    }
    if (!state.phase_ii_exhaustion) {
        (state as GameState & { phase_ii_exhaustion: Record<string, number> }).phase_ii_exhaustion = {};
    }
    if (!state.phase_ii_exhaustion_local) {
        (state as GameState & { phase_ii_exhaustion_local: Record<string, number> }).phase_ii_exhaustion_local = {};
    }

    // Initialize brigade AoR (Voronoi BFS from brigade HQs)
    if (edges && edges.length > 0) {
        initializeBrigadeAoR(state, edges, settlements);
    }

    // Initialize corps command state
    initializeCorpsCommand(state);

    return state;
}
