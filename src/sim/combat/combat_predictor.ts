/**
 * OSID-native combat outcome predictor — read-only.
 *
 * Mirrors the power/outcome logic in attack_resolution_osid.ts but does NOT mutate state.
 * Used by bot brigade AIs to decide whether an attack is worth committing to.
 *
 * FOG OF WAR: The predictor intentionally underestimates enemy strength.
 * Commanders don't know exact enemy power before engaging. After a failed
 * attack (tracked via last_retreat_from), the fog lifts for that target.
 *
 * Actual combat resolution in attack_resolution_osid.ts uses REAL values.
 * The predictor's optimistic bias means some attacks will fail, and brigades
 * learn through the retreat mechanic.
 *
 * Deterministic: no randomness, no timestamps.
 * Canon: BOT_AI_DESIGN_SPEC.md §3.1.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import {
    buildOsidAdjacency,
    type Osid
} from './osid_adjacency.js';

// ── Shared combat math ──────────────────────────────────────────────────
import {
    type CombatOutcome,
    MORALE_RESIST_FLOOR,
    BASE_ATTACKER_LOSS_RATE,
    BASE_DEFENDER_LOSS_RATE,
    MILITIA_DEFENSE_RATIO,
    COORDINATION_PENALTY_2,
    COORDINATION_PENALTY_3PLUS,
    STACKING_DEFENDER_SUPPORT,
    MAX_ENTRENCHMENT,
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
    COHESION_ATTACKER,
    COHESION_DEFENDER,
    getArtillerySuppression,
    classifyOutcome,
    computeAttackerPower,
    computeDefenderPower,
    buildTerrainMultByOsid,
} from './combat_math.js';

// Backward-compat re-export
export type PredictedOutcome = CombatOutcome;
export type { CombatOutcome };

// ═══════════════════════════════════════════════════════════════════════════
// Predictor-only constants
// ═══════════════════════════════════════════════════════════════════════════

/** Direct defenders: bot can roughly see troop presence but not exact strength. */
const FOG_DIRECT_VISIBILITY = 0.85;
/** After failing an attack (retreat), fog lifts — brigade learned enemy strength. */
const FOG_AFTER_RETREAT_VISIBILITY = 0.95;

/** Predicted outcome → numeric score for bot target scoring. */
export const OUTCOME_SCORE: Record<CombatOutcome, number> = {
    decisive_victory: 100,
    victory: 80,
    costly_victory: 40,
    stalemate: 18,
    repulsed: -50,
    catastrophic: -200
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CombatPrediction {
    attacker_power: number;
    defender_power: number;
    power_ratio: number;
    predicted_outcome: CombatOutcome;
    expected_attacker_casualties: number;
    expected_defender_casualties: number;
    attacker_casualty_percent: number;
    defender_casualty_percent: number;
    net_cohesion_attacker: number;
    net_cohesion_defender: number;
    defender_entrenchment: number;
    defender_terrain_mult: number;
    is_counter_attack_opportunity: boolean;
    overextension_risk: number;
    defender_has_brigade: boolean;
    defender_disrupted: boolean;
    defender_cohesion: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain cache (public API for consumers)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build defender terrain multiplier cache. Call once per turn.
 * Delegates to shared buildTerrainMultByOsid.
 */
export function buildTerrainCache(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    return buildTerrainMultByOsid(reverseMap, terrainData);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Predict combat outcome for an attacker brigade vs a target OSID.
 *
 * Uses the same formulas as attack_resolution_osid.ts but with FOG OF WAR:
 * defender power is discounted because commanders don't know exact enemy strength.
 *
 * @param attackerPosture — override posture to use for attack power ('attack' or 'probe')
 * @param additionalAttackers — other brigades joining the attack (coordination penalty applies)
 */
export function predictCombatOutcome(
    state: GameState,
    attackerId: FormationId,
    targetOsid: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainMultByOsid: Record<string, number>,
    attackerPosture?: string,
    additionalAttackers?: FormationId[],
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null
): CombatPrediction | null {
    const attacker = state.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return null;

    const attackerLoc = attacker.location_osid;
    if (!attackerLoc) return null;

    const neighbors = adjacency.get(attackerLoc) ?? [];
    if (!neighbors.includes(targetOsid)) return null;

    const attackerFaction = attacker.faction as FactionId;

    const allAttackerIds = [attackerId, ...(additionalAttackers ?? [])];
    const attackerFormations = allAttackerIds
        .map(id => state.formations?.[id])
        .filter((f): f is FormationState => f != null && f.status === 'active');
    if (attackerFormations.length === 0) return null;

    const defenderFormations = (Object.values(state.formations ?? {}) as FormationState[])
        .filter(f => f.status === 'active' && f.location_osid === targetOsid && f.faction !== attackerFaction)
        .sort((a, b) => strictCompare(a.id, b.id));

    const controller = getPoliticalControllerOSID(state, targetOsid, reverseMap);
    const isEnemyControlled = controller !== null && controller !== attackerFaction;

    let defenderPower: number;
    let defenderFormation: FormationState | null = null;
    let defenderHasBrigade = false;
    let defenderDisrupted = false;
    let defenderCohesion = 60;
    const artSuppression = getArtillerySuppression(attackerFormations);

    // Fog of war: did this brigade previously fail at this target?
    const currentTurn = state.meta?.turn ?? 0;
    const retreatInfo = (attacker as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from;
    const repulseInfo = (attacker as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from;
    const learnedFromTarget =
        (retreatInfo != null && retreatInfo.osid === targetOsid && currentTurn - retreatInfo.turn <= 3) ||
        (repulseInfo != null && repulseInfo.osid === targetOsid && currentTurn - repulseInfo.turn <= 3);

    if (defenderFormations.length > 0) {
        defenderHasBrigade = true;
        const powers = defenderFormations.map(d => computeDefenderPower(state, d, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid));
        const sorted = defenderFormations.map((d, i) => ({ f: d, p: powers[i]! })).sort((a, b) => b.p - a.p);
        defenderPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
        const fogMult = learnedFromTarget ? FOG_AFTER_RETREAT_VISIBILITY : FOG_DIRECT_VISIBILITY;
        defenderPower *= fogMult;
        defenderFormation = sorted[0]!.f;
        defenderDisrupted = ((defenderFormation as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0 || defenderFormation.disrupted === true;
        defenderCohesion = defenderFormation.cohesion ?? 60;
    } else if (isEnemyControlled) {
        const pop = osidPopulationMap?.get(targetOsid) ?? 5000;
        defenderPower = pop * MILITIA_DEFENSE_RATIO * 0.25;
    } else {
        return null;
    }

    const coordPenalty = attackerFormations.length >= 3 ? COORDINATION_PENALTY_3PLUS
        : attackerFormations.length === 2 ? COORDINATION_PENALTY_2 : 1.0;
    const targetSlope = slopeByOsid?.[targetOsid] ?? 0;
    const seasonal = getSeasonalModifiers(currentTurn, state.meta?.scenario_start_date, targetSlope);
    // Predictor default: 'attack' posture (if no override provided, assume attack intent).
    // Resolver default: 'defend' (formation.posture is always set for ordered brigades).
    const effectivePosture = attackerPosture ?? 'attack';
    const attackerPower = attackerFormations.reduce(
        (s, a) => s + computeAttackerPower(state, a, supplyStateByOsid, effectivePosture), 0
    ) * coordPenalty * seasonal.attack_mult;
    defenderPower *= seasonal.defense_mult;

    const powerRatio = defenderPower <= 0 ? 10 : attackerPower / defenderPower;
    let predicted = classifyOutcome(powerRatio);

    // Morale resistance: downgrade costly_victory to stalemate if defender morale is high
    const defenderMorale = defenderFormation?.morale ?? 60;
    if (predicted === 'costly_victory' && defenderMorale >= MORALE_RESIST_FLOOR) {
        predicted = 'stalemate';
    }

    const personnelAttacker = attackerFormations.reduce((s, a) => s + (a.personnel ?? 0), 0);
    const personnelDefender = defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
    const baseAttCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[predicted] ?? 1);
    const baseDefCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[predicted] ?? 1);
    const expectedAttCas = Math.max(0, Math.round(baseAttCas));
    const expectedDefCas = Math.max(0, Math.round(baseDefCas));

    const defEntTurns = defenderFormation
        ? Math.min(MAX_ENTRENCHMENT, (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns ?? 0)
        : 0;

    const isCounterAttack = false;

    const targetNeighbors = adjacency.get(targetOsid) ?? [];
    let enemyAdj = 0;
    for (const n of targetNeighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c !== null && c !== attackerFaction) enemyAdj++;
    }

    return {
        attacker_power: attackerPower,
        defender_power: defenderPower,
        power_ratio: powerRatio,
        predicted_outcome: predicted,
        expected_attacker_casualties: expectedAttCas,
        expected_defender_casualties: expectedDefCas,
        attacker_casualty_percent: personnelAttacker > 0 ? expectedAttCas / personnelAttacker : 0,
        defender_casualty_percent: personnelDefender > 0 ? expectedDefCas / personnelDefender : 0,
        net_cohesion_attacker: COHESION_ATTACKER[predicted] ?? 0,
        net_cohesion_defender: COHESION_DEFENDER[predicted] ?? 0,
        defender_entrenchment: defEntTurns,
        defender_terrain_mult: terrainMultByOsid[targetOsid] ?? 1.0,
        is_counter_attack_opportunity: isCounterAttack,
        overextension_risk: enemyAdj,
        defender_has_brigade: defenderHasBrigade,
        defender_disrupted: defenderDisrupted,
        defender_cohesion: defenderCohesion
    };
}

/**
 * Convenience: predict outcome for every adjacent enemy OSID.
 * Returns array sorted by power_ratio descending (best opportunities first).
 */
export function predictAllAdjacentTargets(
    state: GameState,
    attackerId: FormationId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainMultByOsid: Record<string, number>,
    attackerPosture?: string,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null
): Array<{ osid: Osid; prediction: CombatPrediction }> {
    const attacker = state.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return [];
    const loc = attacker.location_osid;
    if (!loc) return [];
    const factionId = attacker.faction as FactionId;

    const neighbors = adjacency.get(loc) ?? [];
    const results: Array<{ osid: Osid; prediction: CombatPrediction }> = [];

    for (const n of neighbors) {
        const controller = getPoliticalControllerOSID(state, n, reverseMap);
        if (controller === null || controller === factionId) continue;
        const pred = predictCombatOutcome(state, attackerId, n, adjacency, reverseMap, terrainMultByOsid, attackerPosture, undefined, supplyStateByOsid, osidPopulationMap, slopeByOsid);
        if (pred) results.push({ osid: n, prediction: pred });
    }

    results.sort((a, b) => {
        if (b.prediction.power_ratio !== a.prediction.power_ratio) return b.prediction.power_ratio - a.prediction.power_ratio;
        return strictCompare(a.osid, b.osid);
    });

    return results;
}
