/**
 * Phase E Step 5: Rear Political Control Zone (RPCZ) detection.
 * RPCZs are settlements outside all brigade AoRs; they retain political control, do not generate/absorb
 * pressure, do not require military responsibility, and do not experience control drift due to absence
 * of formations (Engine Invariants §9.4).
 * 
 * Per ROADMAP Phase E §3 and Systems Manual §2.1:
 * - Rear zones behind stabilized fronts with reduced contestation
 * - Authority stabilizing effects only (no control flips)
 * - RPCZs are derived; not serialized as geometry
 * 
 * Scope: Spatial & Interaction only (no Phase O concepts).
 */


import type { GameState, PhaseERearZoneDescriptor } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFrontActiveSettlements } from './aor_instantiation.js';
import { getEligiblePressureEdges } from './pressure_eligibility.js';


/**
 * Derive Rear Political Control Zones (RPCZs) from political control and front-active settlements.
 * Returns PhaseERearZoneDescriptor (derived; not serialized per Engine Invariants §13.1).
 * 
 * Rules:
 * - Rear zone = settlement with political control (non-null) that is NOT front-active
 * - Front-active = settlement on at least one pressure-eligible edge
 * - Rear zones are stable: do not generate/absorb pressure, do not require AoR assignment,
 *   do not experience control drift due to absence of formations
 * - Rear zones have authority stabilizing effects only (no control flips)
 * 
 * @param state - Game state (read-only for RPCZ derivation)
 * @param edges - Settlement adjacency edges (contact graph)
 * @returns PhaseERearZoneDescriptor (settlement_ids: settlements in rear)
 */
export function deriveRearPoliticalControlZones(
    state: GameState,
    edges: ReadonlyArray<{ a: string; b: string }>
): PhaseERearZoneDescriptor {
    const result: PhaseERearZoneDescriptor = { settlement_ids: [] };

    // Phase E only runs in phase_ii
    if (state.meta?.phase !== 'phase_ii') {
        return result;
    }

    const pc = state.political_controllers ?? {};
    const controlledSettlements = Object.keys(pc)
        .filter((sid) => pc[sid] !== null && pc[sid] !== undefined)
        .sort(strictCompare);

    if (controlledSettlements.length === 0) {
        return result;
    }

    // Get front-active settlements (on pressure-eligible edges)
    const eligible = getEligiblePressureEdges(state, edges);
    const frontActive = getFrontActiveSettlements(eligible);

    // Rear zone = controlled settlement NOT in front-active set
    const rearSettlements = controlledSettlements.filter((sid) => !frontActive.has(sid));
    result.settlement_ids = rearSettlements;

    return result;
}

/**
 * Check if a settlement is in a Rear Political Control Zone.
 * 
 * @param settlementId - Settlement SID
 * @param rearZone - PhaseERearZoneDescriptor from deriveRearPoliticalControlZones
 * @returns true if settlement is in rear zone
 */
export function isSettlementInRearZone(
    settlementId: string,
    rearZone: PhaseERearZoneDescriptor
): boolean {
    return rearZone.settlement_ids.includes(settlementId);
}

/**
 * Compute authority stabilization factor for rear zones (read-only; no state mutation).
 * Rear zones have reduced contestation and authority volatility.
 * Returns a multiplier [0, 1] where lower = more stable (less authority degradation).
 * 
 * This is a read-only helper for future authority/exhaustion systems; it does NOT modify
 * state.municipalities or faction.profile.authority.
 * 
 * @param settlementId - Settlement SID
 * @param rearZone - PhaseERearZoneDescriptor
 * @returns Stabilization factor [0, 1]; lower = more stable
 */
export function getRearZoneAuthorityStabilizationFactor(
    settlementId: string,
    rearZone: PhaseERearZoneDescriptor
): number {
    // Rear zones have reduced authority volatility: stabilization factor 0.5 (50% reduction in degradation)
    // Front-active zones have no stabilization: factor 1.0 (full degradation)
    return isSettlementInRearZone(settlementId, rearZone) ? 0.5 : 1.0;
}
