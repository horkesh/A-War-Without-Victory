/**
 * Phase F Step 2: Displacement trigger conditions (deterministic).
 *
 * Evaluates when a settlement accumulates displacement this turn.
 * Inputs (read-only): front-active sets (Phase E), pressure fields (state.front_pressure),
 * control state. No control-change flags in state yet; scaffold uses conflict-intensity only.
 *
 * Output: per-settlement displacement_delta (bounded), report for tests (not serialized).
 * Engine Invariants §11.3: stable ordering; no randomness; no timestamps.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFrontActiveSettlements } from '../phase_e/aor_instantiation.js';
import { getEligiblePressureEdges, toEdgeId } from '../phase_e/pressure_eligibility.js';

/** Maximum displacement delta per settlement per turn [0, 1]. Conservative cap. */
export const PHASE_F_MAX_DELTA_PER_TURN = 0.05;

/** Base delta when settlement is front-active (conflict intensity proxy). Per ROADMAP: derive from conflict intensity. */
export const PHASE_F_BASE_FRONT_ACTIVE_DELTA = 0.02;

/** Pressure scaling: extra delta per unit of max absolute pressure on incident edges (capped). */
export const PHASE_F_PRESSURE_SCALE = 0.001;

/** Max pressure contribution to delta (so total delta ≤ PHASE_F_MAX_DELTA_PER_TURN). */
export const PHASE_F_MAX_PRESSURE_CONTRIBUTION = 0.03;

export interface DisplacementTriggerReport {
    /** Settlement IDs that received a non-zero delta this turn (sorted). */
    triggered_settlements: SettlementId[];
    /** Per-settlement deltas (only entries with delta > 0). */
    deltas: Record<SettlementId, number>;
    /** Reason codes per settlement (e.g. 'front_active', 'pressure'). */
    reasons: Record<SettlementId, string[]>;
    /** Phase H1.7: Count of pressure-eligible edges (for activity diagnostics). */
    pressure_eligible_size: number;
    /** Phase H1.7: Count of front-active settlements (for activity diagnostics). */
    front_active_set_size: number;
    /** Phase H1.7: Count of settlements eligible for displacement trigger (same as front_active_set_size when phase_ii). */
    displacement_trigger_eligible_size: number;
}

/**
 * Evaluate displacement triggers for this turn.
 * Only runs when meta.phase === 'phase_ii'. Returns empty deltas otherwise.
 *
 * Deterministic: stable sort over settlement IDs; same inputs => same outputs.
 * Does not mutate state; only reads front_pressure, political_controllers, meta.
 *
 * @param state - Game state (read-only)
 * @param edges - Settlement adjacency edges (contact graph)
 * @returns Per-settlement displacement_delta (bounded [0, PHASE_F_MAX_DELTA_PER_TURN]) and report
 */
export function evaluateDisplacementTriggers(
    state: GameState,
    edges: ReadonlyArray<EdgeRecord>
): { deltas: Record<SettlementId, number>; report: DisplacementTriggerReport } {
    const deltas: Record<SettlementId, number> = {};
    const reasons: Record<SettlementId, string[]> = {};
    const triggered_settlements: SettlementId[] = [];

    const emptyReport: DisplacementTriggerReport = {
        triggered_settlements,
        deltas,
        reasons,
        pressure_eligible_size: 0,
        front_active_set_size: 0,
        displacement_trigger_eligible_size: 0
    };
    if (state.meta?.phase !== 'phase_ii') {
        return { deltas, report: emptyReport };
    }

    const eligible = getEligiblePressureEdges(state, edges);
    if (eligible.length === 0) {
        return { deltas, report: emptyReport };
    }

    const frontActive = getFrontActiveSettlements(eligible);
    const fp = state.front_pressure ?? {};

    // Stable ordering: sort settlement IDs
    const sortedSettlementIds = Array.from(frontActive).sort(strictCompare);

    for (const sid of sortedSettlementIds) {
        let delta = 0;
        const reasonList: string[] = [];

        // Front-active: base contribution (conflict intensity proxy)
        delta += PHASE_F_BASE_FRONT_ACTIVE_DELTA;
        reasonList.push('front_active');

        // Pressure: sum |value| on incident edges (bounded contribution)
        let pressureSum = 0;
        for (const e of eligible) {
            if (e.a !== sid && e.b !== sid) continue;
            const eid = toEdgeId(e.a, e.b);
            const rec = (fp as Record<string, { value?: number; max_abs?: number }>)[eid];
            const absVal = Math.abs(rec?.value ?? 0);
            pressureSum += absVal;
        }
        const pressureContribution = Math.min(
            PHASE_F_MAX_PRESSURE_CONTRIBUTION,
            pressureSum * PHASE_F_PRESSURE_SCALE
        );
        delta += pressureContribution;
        if (pressureContribution > 0) reasonList.push('pressure');

        // Cap delta
        delta = Math.min(delta, PHASE_F_MAX_DELTA_PER_TURN);
        delta = Math.max(0, delta);

        if (delta > 0) {
            deltas[sid] = delta;
            reasons[sid] = reasonList;
            triggered_settlements.push(sid);
        }
    }

    return {
        deltas,
        report: {
            triggered_settlements,
            deltas,
            reasons,
            pressure_eligible_size: eligible.length,
            front_active_set_size: frontActive.size,
            displacement_trigger_eligible_size: frontActive.size
        }
    };
}
