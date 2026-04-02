/**
 * Legacy brigade-derived pressure computation.
 *
 * This module is still wired into the war pipeline, but it is currently a
 * dormant compatibility layer: front-edge deltas resolve to zero while the
 * real front-pressure truth lives elsewhere. Keep that fact explicit so future
 * work does not mistake this file for the active pressure owner.
 *
 * Deterministic: no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    BrigadePosture,
    FormationId,
    FormationState,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import { computeBrigadeDensity } from './brigade_aor_legacy.js';
import { computeEquipmentMultiplier } from './equipment_effects.js';
import { computeResilienceModifier } from './faction_resilience.js';

// --- Posture multipliers ---

const POSTURE_PRESSURE_MULT: Record<BrigadePosture, number> = {
    hold: 0.20,
    defend: 0.35,
    defend_at_all_costs: 0.10,
    elastic_defense: 0.15,
    counterattack: 1.20,
    dig_in: 0.10,
    attack: 1.50,
    assault: 2.00,
};

const POSTURE_DEFENSE_MULT: Record<BrigadePosture, number> = {
    hold: 1.20,
    defend: 1.40,
    defend_at_all_costs: 1.60,
    elastic_defense: 1.10,
    counterattack: 1.15,
    dig_in: 1.35,
    attack: 0.80,
    assault: 0.60,
};

const READINESS_MULT: Record<string, number> = {
    active: 1.0,
    overextended: 0.5,
    degraded: 0.2,
    forming: 0
};

// --- Pressure computation ---

export interface BrigadePressureResult {
    /** Pressure per front edge. Key: edge_id (a:b sorted). */
    edge_pressure: Record<string, { side_a_pressure: number; side_b_pressure: number; delta: number }>;
    /** Per-brigade raw pressure output. */
    brigade_pressure: Record<FormationId, number>;
}

function edgeId(a: SettlementId, b: SettlementId): string {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Compute raw pressure output for a single brigade.
 */
export function computeBrigadeRawPressure(
    state: GameState,
    brigade: FormationState,
    edges?: EdgeRecord[]
): number {
    const posture = brigade.posture ?? 'defend';
    const density = computeBrigadeDensity(state, brigade.id, edges);
    const postureMult = POSTURE_PRESSURE_MULT[posture];
    const readinessMult = READINESS_MULT[brigade.readiness ?? 'active'] ?? 1.0;
    const cohesionFactor = (brigade.cohesion ?? 60) / 100;
    const suppliedTurn = brigade.ops?.last_supplied_turn;
    const supplyFactor = (suppliedTurn !== null && suppliedTurn !== undefined &&
        state.meta.turn - suppliedTurn <= 2) ? 1.0 : 0.4;
    const equipmentMult = computeEquipmentMultiplier(brigade, posture);
    const resilienceMult = computeResilienceModifier(state, brigade.faction, brigade);
    const disruptionMult = brigade.disrupted ? 0.5 : 1.0;

    return density * postureMult * readinessMult * cohesionFactor *
        supplyFactor * equipmentMult * resilienceMult * disruptionMult;
}

/**
 * Compute defensive strength for a single brigade.
 */
export function computeBrigadeDefense(
    state: GameState,
    brigade: FormationState,
    activeStreak: number,
    edges?: EdgeRecord[]
): number {
    const posture = brigade.posture ?? 'defend';
    const density = computeBrigadeDensity(state, brigade.id, edges);
    const defenseMult = POSTURE_DEFENSE_MULT[posture];
    const readinessMult = READINESS_MULT[brigade.readiness ?? 'active'] ?? 1.0;
    const cohesionFactor = (brigade.cohesion ?? 60) / 100;
    const suppliedTurn = brigade.ops?.last_supplied_turn;
    const supplyFactor = (suppliedTurn !== null && suppliedTurn !== undefined &&
        state.meta.turn - suppliedTurn <= 2) ? 1.0 : 0.4;
    const equipmentMult = computeEquipmentMultiplier(brigade, posture);
    const resilienceMult = computeResilienceModifier(state, brigade.faction, brigade);

    // Front hardening: static fronts are harder to break
    const hardeningBonus = Math.min(0.5, activeStreak * 0.05);

    return density * defenseMult * readinessMult * cohesionFactor *
        supplyFactor * equipmentMult * resilienceMult * (1 + hardeningBonus);
}

/**
 * Compute brigade-derived pressure for all front edges.
 *
 * Current contract: returns a structurally valid zero-delta report so older
 * pipeline steps can execute without mutating live front-pressure truth.
 */
export function computeBrigadePressureByEdge(
    state: GameState,
    frontEdges: Array<{ a: SettlementId; b: SettlementId }>,
    _allEdges?: EdgeRecord[]
): BrigadePressureResult {
    const result: BrigadePressureResult = { edge_pressure: {}, brigade_pressure: {} };
    const pc = state.political.political_controllers ?? {};
    const frontSegments = state.military.front_segments ?? {};

    for (const edge of frontEdges) {
        const controlA = pc[edge.a];
        const controlB = pc[edge.b];
        if (!controlA || !controlB || controlA === controlB) continue;

        const eid = edgeId(edge.a, edge.b);
        const segment = frontSegments[eid];
        const streak = segment?.active_streak ?? 0;
        void streak; // streak retained for future use

        // brigade_aor is never populated; pressure comes from OSID-based systems
        const sideAPressure = 0;
        const sideBPressure = 0;
        const delta = 0;

        result.edge_pressure[eid] = {
            side_a_pressure: sideAPressure,
            side_b_pressure: sideBPressure,
            delta
        };
    }

    return result;
}

/**
 * Apply brigade-derived pressure to the front_pressure state.
 * Called from the turn pipeline when War phase is active and brigade_aor exists.
 */
export function applyBrigadePressureToState(
    state: GameState,
    edges: EdgeRecord[]
): void {
    const pc = state.political.political_controllers ?? {};

    // Collect front edges
    const frontEdges: Array<{ a: SettlementId; b: SettlementId }> = [];
    for (const edge of edges) {
        const controlA = pc[edge.a];
        const controlB = pc[edge.b];
        if (controlA && controlB && controlA !== controlB) {
            frontEdges.push(edge);
        }
    }

    const pressureResult = computeBrigadePressureByEdge(state, frontEdges, edges);

    // Update front_pressure state
    if (!state.military.front_pressure) state.military.front_pressure = {};
    for (const [eid, pressure] of Object.entries(pressureResult.edge_pressure)) {
        const existing = state.military.front_pressure[eid];
        if (existing) {
            existing.value += Math.round(pressure.delta);
            existing.max_abs = Math.max(existing.max_abs, Math.abs(existing.value));
            existing.last_updated_turn = state.meta.turn;
        } else {
            state.military.front_pressure[eid] = {
                edge_id: eid,
                value: Math.round(pressure.delta),
                max_abs: Math.abs(Math.round(pressure.delta)),
                last_updated_turn: state.meta.turn
            };
        }
    }
}
