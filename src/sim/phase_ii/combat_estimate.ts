/**
 * Read-only combat power estimation for pre-attack casualty forecasting.
 * Extracted from battle_resolution.ts logic — does NOT mutate state.
 *
 * Used by bot brigade AI to evaluate whether an attack is worth the cost
 * before issuing the order.
 *
 * Deterministic: no randomness, no side effects.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import type {
    BrigadePosture,
    FormationState,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import { computeTerrainModifier } from './battle_resolution.js';
import { getBrigadeAoRSettlements, getSettlementGarrison } from './brigade_aor.js';
import { computeEquipmentMultiplier } from './equipment_effects.js';
import { computeResilienceModifier } from './faction_resilience.js';

// --- Constants (mirrored from battle_resolution.ts) ---

const POSTURE_PRESSURE_MULT: Record<BrigadePosture, number> = {
    defend: 0.3, probe: 0.7, attack: 1.5, elastic_defense: 0.2, consolidation: 0.6
};

const POSTURE_DEFENSE_MULT: Record<BrigadePosture, number> = {
    defend: 1.5, probe: 1.0, attack: 0.5, elastic_defense: 1.2, consolidation: 1.1
};

const READINESS_MULT: Record<string, number> = {
    active: 1.0, overextended: 0.5, degraded: 0.2, forming: 0
};

const EXPERIENCE_MULT_BASE = 0.6;
const EXPERIENCE_MULT_SCALE = 0.8;
const ATTACKER_VICTORY_THRESHOLD = 1.3;
const BASE_CASUALTY_PER_INTENSITY = 20;
const MIN_CASUALTIES_PER_BATTLE = 5;

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

export interface AttackEstimate {
    /** Expected attacker casualties as fraction of brigade personnel. */
    expected_loss_fraction: number;
    /** Probability of winning (power ratio >= threshold). Deterministic estimate, not random. */
    win_probability: number;
    /** Raw power ratio estimate. */
    power_ratio: number;
}

/**
 * Estimate the cost and probability of success for an attack on a target settlement.
 * Returns a deterministic estimate based on current state — no mutations.
 */
export function estimateAttackCost(
    state: GameState,
    brigade: FormationState,
    targetSid: SettlementId,
    edges: EdgeRecord[],
    terrainData: TerrainScalarsData | null,
    settlementToMun: Map<string, string>
): AttackEstimate {
    const fallback: AttackEstimate = { expected_loss_fraction: 0.5, win_probability: 0.0, power_ratio: 0 };

    // Attacker power estimate
    const aorSids = getBrigadeAoRSettlements(state, brigade.id);
    if (aorSids.length === 0) return fallback;

    const posture = brigade.posture ?? 'attack';
    const exp = brigade.experience ?? 0;
    const experienceMult = EXPERIENCE_MULT_BASE + EXPERIENCE_MULT_SCALE * clamp(exp, 0, 1);
    const cohesionMult = (brigade.cohesion ?? 60) / 100;
    const postureMult = POSTURE_PRESSURE_MULT[posture];
    const readinessMult = READINESS_MULT[brigade.readiness ?? 'active'] ?? 1.0;
    const equipMult = computeEquipmentMultiplier(brigade, posture);
    const resilienceMult = computeResilienceModifier(state, brigade.faction as any, brigade);

    const brigadePersonnel = brigade.personnel ?? 0;
    const density = aorSids.length > 0 ? brigadePersonnel / aorSids.length : 0;
    const attackerPower = density * experienceMult * cohesionMult * postureMult
        * readinessMult * equipMult * resilienceMult;

    // Defender power estimate
    const defenderGarrison = getSettlementGarrison(state, targetSid, edges);
    let defenderPower = defenderGarrison;

    if (defenderPower > 0) {
        // Approximate defender multipliers (assume defend posture, active readiness)
        const defPostureMult = POSTURE_DEFENSE_MULT['defend'];

        // Terrain modifier
        let terrainMult = 1.0;
        if (terrainData) {
            const terrain = computeTerrainModifier(terrainData, targetSid, settlementToMun);
            terrainMult = terrain.composite;
        }

        defenderPower = defenderGarrison * defPostureMult * terrainMult;
    }

    // Power ratio
    const powerRatio = defenderPower <= 0
        ? (attackerPower > 0 ? 10.0 : 0)
        : attackerPower / defenderPower;

    // Win probability (deterministic approximation based on power ratio)
    let winProb: number;
    if (powerRatio >= ATTACKER_VICTORY_THRESHOLD * 1.5) {
        winProb = 0.95;
    } else if (powerRatio >= ATTACKER_VICTORY_THRESHOLD) {
        winProb = 0.6 + 0.35 * ((powerRatio - ATTACKER_VICTORY_THRESHOLD) / (ATTACKER_VICTORY_THRESHOLD * 0.5));
    } else if (powerRatio >= ATTACKER_VICTORY_THRESHOLD * 0.8) {
        winProb = 0.3 + 0.3 * ((powerRatio - ATTACKER_VICTORY_THRESHOLD * 0.8) / (ATTACKER_VICTORY_THRESHOLD * 0.2));
    } else {
        winProb = Math.max(0, powerRatio / ATTACKER_VICTORY_THRESHOLD * 0.3);
    }

    // Expected loss fraction estimate
    const intensity = Math.min(attackerPower, defenderPower);
    const intensityFactor = Math.max(0.1, intensity / 500);
    const baseCas = BASE_CASUALTY_PER_INTENSITY * intensityFactor;
    const attackerCas = Math.max(MIN_CASUALTIES_PER_BATTLE, baseCas * (1 / Math.max(0.5, powerRatio)));
    const lossFraction = brigadePersonnel > 0 ? attackerCas / brigadePersonnel : 1.0;

    return {
        expected_loss_fraction: Math.min(1.0, lossFraction),
        win_probability: clamp(winProb, 0, 1),
        power_ratio: powerRatio
    };
}
