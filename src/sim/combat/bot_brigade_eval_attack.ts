import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { getAdjacentEnemyOsids } from './bot_brigade_context.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findNearestFriendlyOsidInSet } from './bot_brigade_context.js';
import { predictAllAdjacentTargets } from './combat_predictor.js';
import {
    scoreTargetFromDirective,
    estimateConcentratedOutcome,
    isOutcomeSufficientForAttack,
    outcomeRank,
    outcomeFromRank,
    MAX_ATTACKERS_PER_TARGET,
    OUTCOME_RANK,
} from './bot_brigade_targeting.js';
import { getAttackerSupplyPenalty, getRsVsHrhbPenalty } from './bot_brigade_supply_ethnic.js';
import { findAdjacentFrontGap } from './bot_brigade_movement_ai.js';
import { countFactionBrigadesAtOsid } from './bot_brigade_context.js';
import type { Osid } from './osid_adjacency.js';
import type { BrigadePosture } from '../../state/game_state.js';

// The following functions are assumed to be exported/accessible from bot_brigade_ai_osid or another common file.
// We will import them appropriately. For now, I'll import from bot_brigade_ai_osid if needed, but they are pure.
// Oh wait, some are local functions inside bot_brigade_ai_osid.ts that need to be moved or exported.
// I will just copy them here if they are small, or import them if they are exported.
import {
    getSectorOffensiveCurrentObjective,
    getSectorOffensiveApproachOsids,
    getSectorOffensiveProbeThreshold,
    applySectorOffensiveDirectiveOverride,
    getBrigadeAxis
} from './bot_brigade_ai_osid.js'; // Will need to export these from bot_brigade_ai_osid.ts

export function evaluateHomeDefense(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, cmd, loc, faction, adjacency, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, isActiveSectorOperationParticipant, graphAnalysis, adjEnemy } = ctx;

    // --- Home-ground brigades: defend or counterattack only, never attack ---
    if (brigade.home_defense_active === true && !isActiveSectorOperationParticipant) {
        // Deep-rear home defense brigades (no enemy adjacent, 2+ hops from front)
        // should NOT be trapped here — they must march toward the front via
        // evaluateInteriorMovement instead of sitting idle in the rear.
        if (adjEnemy.length === 0) {
            const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
            if (!osidAnalysis || osidAnalysis.enemy_neighbors.length === 0) {
                const neighbors = adjacency.get(loc as Osid) ?? [];
                const nearFront = neighbors.some(n => {
                    const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                    return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                });
                if (!nearFront) return false; // deep rear — fall through to interior movement
            }
        }
        if ((brigade.counterattack_window_turns ?? 0) > 0) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'counterattack' });
        } else {
            // Home defense: defend in place. Attacks only through operations.
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        }
        return true;
    }
    return false;
}

export function evaluateSupplyGate(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, brigadeSupplyState, result } = ctx;
    if (brigadeSupplyState === 'critical') {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }
    return false;
}

export function evaluateSectorAttack(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, activeOp, isActiveSectorOperationParticipant, loc, faction, adjacency, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result } = ctx;

    const activeOp15 = activeOp;
    if (isActiveSectorOperationParticipant && activeOp15?.type === 'sector_attack') {
        if (activeOp15.phase === 'planning') {
            const planningApproachOsids = getSectorOffensiveApproachOsids(
                state,
                activeOp15,
                faction,
                adjacency,
                reverseMap,
                brigade.id,
            );
            if (planningApproachOsids.size > 0 && !planningApproachOsids.has(loc)) {
                // Not at an approach OSID — march toward one
                const nearestApproach = findNearestFriendlyOsidInSet(
                    state,
                    faction,
                    loc,
                    adjacency,
                    reverseMap,
                    planningApproachOsids
                );
                if (nearestApproach) {
                    result.column_march_orders[brigade.id] = nearestApproach;
                }
            } else if (planningApproachOsids.size === 0) {
                // No approach OSIDs found — fall back to staging area
                const axisStaging = getBrigadeAxis(activeOp15, brigade.id)?.staging_osid ?? activeOp15.staging_osid;
                if (axisStaging && loc !== axisStaging) {
                    const nearestStaging = findNearestFriendlyOsidInSet(
                        state,
                        faction,
                        loc,
                        adjacency,
                        reverseMap,
                        new Set([axisStaging])
                    );
                    if (nearestStaging) {
                        result.column_march_orders[brigade.id] = nearestStaging;
                    }
                }
            }
            // else: already at an approach OSID — stay in position
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }

        if (activeOp15.phase === 'recovery') {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }

        if (activeOp15.phase === 'execution') {
            const currentObjective = getSectorOffensiveCurrentObjective(activeOp15, brigade.id);
            if (!currentObjective || getPoliticalControllerOSID(state, currentObjective, reverseMap) === faction) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }

            const targets = predictAllAdjacentTargets(
                state,
                brigade.id,
                adjacency,
                reverseMap,
                terrainCache,
                'attack',
                supplyStateByOsid,
                osidPopulationMap,
                undefined,
                ethnicMap
            );
            const directObjectiveAttack = targets.find((t) => t.osid === currentObjective);
            const alreadyAssigned = chosenTargets.get(currentObjective) ?? 0;
            if (directObjectiveAttack) {
                const probeThreshold = getSectorOffensiveProbeThreshold(activeOp15, brigade.id);
                const predictedOutcome = directObjectiveAttack.prediction.predicted_outcome;
                const axisBrigades = getBrigadeAxis(activeOp15, brigade.id)?.assigned_brigades
                    ?? activeOp15.participating_brigades ?? [];
                const adjacentOperationParticipants = axisBrigades.filter((brigadeId) => {
                    const participant = state.military.formations?.[brigadeId];
                    if (!participant?.location_osid || participant.status !== 'active') return false;
                    return (adjacency.get(participant.location_osid) ?? []).includes(currentObjective);
                }).length;
                const concentratedOutcome = adjacentOperationParticipants > 1
                    ? estimateConcentratedOutcome(
                        directObjectiveAttack.prediction.power_ratio,
                        Math.max(alreadyAssigned + 1, adjacentOperationParticipants) - 1
                    )
                    : null;
                const canDirectAttackObjective =
                    isOutcomeSufficientForAttack(predictedOutcome, probeThreshold) ||
                    (concentratedOutcome != null &&
                        isOutcomeSufficientForAttack(concentratedOutcome, probeThreshold));
                if (canDirectAttackObjective && brigade.corps_id) {
                    result.eligible_attackers_by_corps[brigade.corps_id] =
                        (result.eligible_attackers_by_corps[brigade.corps_id] ?? 0) + 1;
                }
                if (canDirectAttackObjective && alreadyAssigned < MAX_ATTACKERS_PER_TARGET) {
                    const attackPosture: BrigadePosture = (brigade.cohesion ?? 0) >= 60 ? 'assault' : 'attack';
                    result.posture_orders.push({ brigade_id: brigade.id, posture: attackPosture });
                    result.attack_orders[brigade.id] = currentObjective;
                    result.attack_scores[brigade.id] = 900;
                    chosenTargets.set(currentObjective, alreadyAssigned + 1);
                    return true;
                }
            }

            // ── Attack through: fight toward objective ─────────────────
            // If not adjacent to objective, attack the best adjacent enemy
            // OSID to open a path. Real armies fight through intermediate
            // positions — they don't sit idle waiting for a clear approach.
            if (targets.length > 0) {
                const probeThreshold = getSectorOffensiveProbeThreshold(activeOp15, brigade.id);
                // Prefer targets closer to the objective (on the path)
                const bestIntermediate = targets.find((t) => {
                    const alreadyAt = chosenTargets.get(t.osid) ?? 0;
                    if (alreadyAt >= MAX_ATTACKERS_PER_TARGET) return false;
                    return isOutcomeSufficientForAttack(t.prediction.predicted_outcome, probeThreshold);
                });
                if (bestIntermediate) {
                    const attackPosture: BrigadePosture = (brigade.cohesion ?? 0) >= 60 ? 'assault' : 'attack';
                    result.posture_orders.push({ brigade_id: brigade.id, posture: attackPosture });
                    result.attack_orders[brigade.id] = bestIntermediate.osid;
                    result.attack_scores[brigade.id] = 800; // Slightly below direct objective attack (900)
                    chosenTargets.set(bestIntermediate.osid, (chosenTargets.get(bestIntermediate.osid) ?? 0) + 1);
                    return true;
                }
            }

            // No attackable targets — try to march toward approach position
            const objectiveApproachOsids = getSectorOffensiveApproachOsids(
                state,
                activeOp15,
                faction,
                adjacency,
                reverseMap,
                brigade.id,
            );
            objectiveApproachOsids.delete(loc);
            if (objectiveApproachOsids.size > 0) {
                const approachStep = findNearestFriendlyOsidInSet(
                    state,
                    faction,
                    loc,
                    adjacency,
                    reverseMap,
                    objectiveApproachOsids
                );
                if (approachStep) {
                    result.movement_orders[brigade.id] = approachStep;
                }
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }

    return false;
}

export function evaluateReorganize(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, adjEnemy, directive, state, faction, result, chosenTargets, graphAnalysis, loc, adjacency } = ctx;
    // --- Rule 3: Corps stance reorganize → rest, defend in place ---
    if (corpsStance === 'reorganize') {
        // Deep-rear brigades should march toward front, not sit idle in reorganize
        if (adjEnemy.length === 0) {
            const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
            if (!osidAnalysis || osidAnalysis.enemy_neighbors.length === 0) {
                const neighbors = adjacency.get(loc as Osid) ?? [];
                const nearFront = neighbors.some(n => {
                    const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                    return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                });
                if (!nearFront) return false; // deep rear — fall through to interior movement
            }
        }
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }
    return false;
}

import { findBrigadeSectorId } from './bot_brigade_context.js';
import type { PredictedOutcome } from './combat_predictor.js';

const effectiveDirectiveDefault: import('../../state/game_state.js').CorpsDirective = {
    assigned_front_ids: [],
    offensive_targets: [],
    hold_osids: [],
    avoid_osids: [],
    max_attackers_per_target: 2,
    reserve_fraction: 0.2,
    min_attack_outcome: 'stalemate' as const,
    aggression_modifier: 0,
};

export function evaluateDefensive(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, counterAttackTarget, adjEnemy, directive, faction, isAlliedWithRBiH, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, adjacency, loc, graphAnalysis } = ctx;

    // --- Rule 4: Defensive stance → defend, with retreat-based counter-attack only ---

    if (corpsStance === 'defensive') {
        // Deep-rear brigades should march toward front, not sit idle in defensive
        if (adjEnemy.length === 0) {
            const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
            if (!osidAnalysis || osidAnalysis.enemy_neighbors.length === 0) {
                const neighbors = adjacency.get(loc as Osid) ?? [];
                const nearFront = neighbors.some(n => {
                    const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                    return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                });
                if (!nearFront) return false; // deep rear — fall through to interior movement
            }
        }
        // Only allow counter-attack if THIS brigade retreated from an adjacent OSID last turn
        // AND the brigade is not disrupted (routed brigades can't counter-attack)
        const disruptedTurns = (brigade as { disrupted_turns?: number }).disrupted_turns ?? 0;
        if (counterAttackTarget && adjEnemy.includes(counterAttackTarget) && disruptedTurns === 0) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap);
            const effDir = directive ?? effectiveDirectiveDefault;
            const maxAtt = effDir.max_attackers_per_target;
            const counter = targets.find(t => t.osid === counterAttackTarget &&
                (chosenTargets.get(t.osid) ?? 0) < maxAtt &&
                isOutcomeSufficientForAttack(t.prediction.predicted_outcome, 'costly_victory'));
            if (counter) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = counter.osid;
                result.attack_scores[brigade.id] = 1000; // Counter-attack: high priority
                chosenTargets.set(counter.osid, (chosenTargets.get(counter.osid) ?? 0) + 1);
                return true;
            }
        }
        // Fill adjacent front gaps even in defensive stance
        const defHere = countFactionBrigadesAtOsid(state, faction, loc);
        if (defHere >= 2) {
            const gap = findAdjacentFrontGap(state, loc, faction, adjacency, reverseMap, graphAnalysis);
            if (gap) {
                result.movement_orders[brigade.id] = gap;
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }
        }
        // Defensive stance, no attack — dig_in if cohesion sufficient
        if ((brigade.cohesion ?? 0) >= 20) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'dig_in' });
        } else {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        }
        return true;
    }

    return false;
}

export function evaluateOffensive(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, adjEnemy, result } = ctx;

    // ── Ops-only attack doctrine ──────────────────────────────────────────
    // Brigades NEVER attack independently. All attacks go through operations
    // (handled by evaluateSectorAttack). This function only handles non-op
    // brigades in offensive/balanced stance: they defend on the front line
    // and wait for the corps to assign them to an operation.
    //
    // The sole brigade-level exception is counter-attacks, handled in
    // evaluateDefensive() — a brigade that lost a position last turn may
    // counter-attack to retake it.

    if (corpsStance !== 'offensive' && corpsStance !== 'balanced') return false;
    if (adjEnemy.length === 0) return false;

    // Offensive/balanced brigade on the front with no active op: defend in place.
    // High cohesion → dig in for better entrenchment.
    if ((brigade.cohesion ?? 0) >= 40) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'dig_in' });
    } else {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
    }
    return true;
}
