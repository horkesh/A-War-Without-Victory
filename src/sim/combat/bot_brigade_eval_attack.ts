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
    const { brigade, cmd, loc, faction, adjacency, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, isActiveSectorOperationParticipant } = ctx;

    // --- Home-ground brigades: defend or counterattack only, never attack ---
    if (brigade.home_defense_active === true && !isActiveSectorOperationParticipant) {
        if ((brigade.counterattack_window_turns ?? 0) > 0) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'counterattack' });
        } else {
            const homeDirective = cmd?.directive ?? null;
            if (homeDirective && homeDirective.offensive_targets.length > 0) {
                const homeTargetSet = new Set(homeDirective.offensive_targets);
                const homeAdjEnemy = getAdjacentEnemyOsids(loc, faction, adjacency, state, reverseMap);
                const homeTargets = homeAdjEnemy.filter(o => homeTargetSet.has(o));
                if (homeTargets.length > 0) {
                    const predictions = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap);
                    const freeTarget = predictions.find(t =>
                        homeTargets.includes(t.osid) &&
                        !t.prediction.defender_has_brigade &&
                        (chosenTargets.get(t.osid) ?? 0) < (homeDirective.max_attackers_per_target)
                    );
                    if (freeTarget) {
                        result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                        result.attack_orders[brigade.id] = freeTarget.osid;
                        result.attack_scores[brigade.id] = 800;
                        chosenTargets.set(freeTarget.osid, (chosenTargets.get(freeTarget.osid) ?? 0) + 1);
                        return true;
                    }
                }
            }
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
                // Named operations own their brigades: allow approach movement even when
                // the intermediate front OSID is risky, otherwise execution can stall
                // one hop short of a valid objective approach position.
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
    const { brigade, corpsStance, adjEnemy, directive, state, faction, result, chosenTargets } = ctx;
    // --- Rule 3: Corps stance reorganize → rest, but grab adjacent undefended targets ---
    if (corpsStance === 'reorganize') {
        if (adjEnemy.length > 0 && directive) {
            const undefendedReorg = adjEnemy.filter(eo => {
                if (!directive.offensive_targets.includes(eo)) return false;
                const fmtsReorg = state.military.formations ?? {};
                // Order-independent: checking if any defender exists (length === 0)
                const hasDefender = Object.values(fmtsReorg).some(
                    f => f != null && f.status === 'active' &&
                        f.location_osid === eo && f.faction !== faction
                );
                return !hasDefender;
            });
            if (undefendedReorg.length > 0) {
                const target = undefendedReorg[0]!;
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = target;
                result.attack_scores[brigade.id] = 600;
                chosenTargets.set(target, (chosenTargets.get(target) ?? 0) + 1);
                return true;
            }
        }
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }
    return false;
}

export function evaluateDefensive(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, counterAttackTarget, adjEnemy, directive, faction, isAlliedWithRBiH, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, adjacency, loc, graphAnalysis } = ctx;

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

    // --- Rule 4: Defensive stance → defend, with retreat-based counter-attack only ---
    if (corpsStance === 'defensive') {
        // Only allow counter-attack if THIS brigade retreated from an adjacent OSID last turn
        if (counterAttackTarget && adjEnemy.includes(counterAttackTarget)) {
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
        // Directive offensive target (rare during defensive but possible if corps has specific targets)
        if (adjEnemy.length > 0 && directive && directive.offensive_targets.length > 0) {
            const defOffTargetSet = new Set(directive.offensive_targets);
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap);
            const maxAtt = directive.max_attackers_per_target;
            const viable = targets.find(t => {
                if ((chosenTargets.get(t.osid) ?? 0) >= maxAtt) return false;
                if (faction === 'HRHB' && isAlliedWithRBiH) {
                    const ctrl = getPoliticalControllerOSID(state, t.osid, reverseMap);
                    if (ctrl === 'RBiH') return false;
                }
                if (faction === 'RBiH' && isAlliedWithRBiH) {
                    const ctrl = getPoliticalControllerOSID(state, t.osid, reverseMap);
                    if (ctrl === 'HRHB') return false;
                }
                return defOffTargetSet.has(t.osid) &&
                    isOutcomeSufficientForAttack(t.prediction.predicted_outcome, directive.min_attack_outcome);
            });
            if (viable) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = viable.osid;
                result.attack_scores[brigade.id] = 500; // Defensive directive target: important
                chosenTargets.set(viable.osid, (chosenTargets.get(viable.osid) ?? 0) + 1);
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

// NOTE: To avoid making this file 1000 lines long, I'm exporting evaluateOffensive here as well.
import { findBrigadeSectorId } from './bot_brigade_context.js';
import type { PredictedOutcome } from './combat_predictor.js';

export function evaluateOffensive(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, brigadeSupplyState, counterAttackTarget, adjEnemy, directive, faction, isAlliedWithRBiH, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, adjacency, targetAdjacentCount, loc, corpsId } = ctx;

    if (adjEnemy.length === 0) return false;

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

    // --- Rule 5: Offensive/Balanced — evaluate attacks ---
    // Multi-sector target preference: when corps has sector_targets, override
    // offensive_targets with sector-specific targets for this brigade's sector.
    let effectiveDirective = directive ?? effectiveDirectiveDefault;
    if (directive?.sector_targets && Object.keys(directive.sector_targets).length > 0) {
        const brigadeSectorId = findBrigadeSectorId(state, brigade);
        if (brigadeSectorId && directive.sector_targets[brigadeSectorId]) {
            effectiveDirective = {
                ...directive,
                offensive_targets: directive.sector_targets[brigadeSectorId]!,
            };
        }
    }
    // Supply strained: upgrade min_attack_outcome to 'victory', no pioneer attacks
    const isSupplyStrained = brigadeSupplyState === 'strained';
    if (isSupplyStrained) {
        if ((OUTCOME_RANK[effectiveDirective.min_attack_outcome as PredictedOutcome] ?? 2) < (OUTCOME_RANK['victory'] ?? 5)) {
            effectiveDirective = { ...effectiveDirective, min_attack_outcome: 'victory' };
        }
    }
    // Sector offensive participation: override targets and thresholds
    const activeOpLater = corpsId ? state.military.corps_command?.[corpsId]?.active_operation : null;
    const isInSectorOffensive = activeOpLater?.type === 'sector_attack' &&
        (activeOpLater.participating_brigades ?? []).includes(brigade.id); // Or isOperationParticipant(activeOpLater, brigade.id)
    
    if (isInSectorOffensive && activeOpLater) {
        if (activeOpLater.phase === 'recovery') {
            // Recovery: defend by default, but still grab adjacent undefended targets.
            // A recovering brigade shouldn't ignore free territory right next door.
            const undefendedAdj = adjEnemy.filter(eo => {
                if (!directive?.offensive_targets.includes(eo)) return false;
                const fmtsAdj = state.military.formations ?? {};
                // Order-independent: checking if any defender exists (length === 0)
                const hasDefender = Object.values(fmtsAdj).some(
                    f => f != null && f.status === 'active' &&
                        f.location_osid === eo && f.faction !== faction
                );
                return !hasDefender;
            });
            if (undefendedAdj.length > 0) {
                const target = undefendedAdj[0]!;
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = target;
                result.attack_scores[brigade.id] = 800;
                chosenTargets.set(target, (chosenTargets.get(target) ?? 0) + 1);
                return true;
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
        if (activeOpLater.phase === 'execution') {
            // Named operations are sequential: participating brigades should focus on the
            // current objective, not opportunistically attack unrelated corps targets.
            effectiveDirective = applySectorOffensiveDirectiveOverride(effectiveDirective, activeOpLater, brigade.id);
            if (activeOpLater.min_attack_outcome) {
                effectiveDirective = {
                    ...effectiveDirective,
                    min_attack_outcome: activeOpLater.min_attack_outcome,
                };
            }
            if (activeOpLater.tempo === 'methodical') {
                effectiveDirective = {
                    ...effectiveDirective,
                    aggression_modifier: effectiveDirective.aggression_modifier - 0.05,
                    reserve_fraction: Math.min(0.5, effectiveDirective.reserve_fraction + 0.10),
                    min_attack_outcome: outcomeFromRank(Math.min(6, outcomeRank(effectiveDirective.min_attack_outcome) + 1)),
                };
            } else if (activeOpLater.tempo === 'all_out') {
                effectiveDirective = {
                    ...effectiveDirective,
                    aggression_modifier: effectiveDirective.aggression_modifier + 0.10,
                    reserve_fraction: Math.max(0, effectiveDirective.reserve_fraction - 0.10),
                    min_attack_outcome: outcomeFromRank(Math.max(1, outcomeRank(effectiveDirective.min_attack_outcome) - 1)),
                };
            }
            // Apply momentum bonuses (per-axis when multi-axis)
            const brigadeAxis = getBrigadeAxis(activeOpLater, brigade.id);
            const momentum = brigadeAxis ? (brigadeAxis.momentum ?? 0) : (activeOpLater.momentum ?? 0);
            if (momentum > 0) {
                const momentumAggression = momentum >= 3 ? 0.15 : momentum >= 2 ? 0.10 : 0.05;
                effectiveDirective = {
                    ...effectiveDirective,
                    aggression_modifier: effectiveDirective.aggression_modifier + momentumAggression,
                };
                // Relax min_attack_outcome based on momentum
                const rank: Record<string, number> = { decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1 };
                const baseRank = rank[effectiveDirective.min_attack_outcome] ?? 2;
                if (momentum >= 3 && baseRank > 2) {
                    effectiveDirective = { ...effectiveDirective, min_attack_outcome: 'stalemate' };
                } else if (momentum >= 2 && baseRank > 3) {
                    effectiveDirective = { ...effectiveDirective, min_attack_outcome: 'costly_victory' };
                }
            }
        }
    }
    // Cache directive arrays as Sets for O(1) lookups in hot scoring loops
    const _offensiveTargetSet = new Set(effectiveDirective.offensive_targets);
    const _holdOsidSet = new Set(effectiveDirective.hold_osids);
    const _avoidOsidSet = new Set(effectiveDirective.avoid_osids);

    // Alliance filter: don't attack allied faction's territory
    let filteredEnemy = adjEnemy;
    if (faction === 'HRHB' && isAlliedWithRBiH) {
        filteredEnemy = adjEnemy.filter(o => getPoliticalControllerOSID(state, o, reverseMap) !== 'RBiH');
    } else if (faction === 'RBiH' && isAlliedWithRBiH) {
        filteredEnemy = adjEnemy.filter(o => getPoliticalControllerOSID(state, o, reverseMap) !== 'HRHB');
    }

    if (filteredEnemy.length > 0) {
        const supplyPenalty = getAttackerSupplyPenalty(loc, faction, supplyStateByOsid);
        const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap);

        // Filter targets: respect alliance, respect avoid_osids
        const validTargets = targets.filter(t => {
            if (faction === 'HRHB' && isAlliedWithRBiH) {
                const ctrl = getPoliticalControllerOSID(state, t.osid, reverseMap);
                if (ctrl === 'RBiH') return false;
            }
            if (faction === 'RBiH' && isAlliedWithRBiH) {
                const ctrl = getPoliticalControllerOSID(state, t.osid, reverseMap);
                if (ctrl === 'HRHB') return false;
            }
            return true;
        });

        const scored = validTargets.map(t => {
            const defenderFaction = getPoliticalControllerOSID(state, t.osid, reverseMap);
            const schwerpunktBonus = activeOpLater?.schwerpunkt_osid === t.osid ? 200 : 0;
            return {
                ...t,
                finalScore: scoreTargetFromDirective(t.osid, t.prediction, effectiveDirective, faction, ethnicMap, undefined, _offensiveTargetSet, _avoidOsidSet)
                    + supplyPenalty
                    + (counterAttackTarget === t.osid ? 180 : 0) // Retreat-based counter-attack bonus
                    + schwerpunktBonus
                    + getRsVsHrhbPenalty(t.osid, faction, defenderFaction)
            };
        }).sort((a, b) => {
            if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
            return strictCompare(a.osid, b.osid);
        });

        const maxAtt = effectiveDirective.max_attackers_per_target;
        let bestTarget: typeof scored[0] | null = null;
        for (const s of scored) {
            const existing = chosenTargets.get(s.osid) ?? 0;
            if (existing >= maxAtt) continue;

            // Pioneer: directive target — attack to seed concentration.
            // Only for offensive/balanced corps stance (not defensive).
            // Bypasses finalScore filter since repulsed outcomes have negative score.
            // Adequate supply: pioneer at 'repulsed' bar (any chance is fine).
            // Strained supply: pioneer only at 'victory' bar (need decent odds).
            // Critical supply: blocked entirely by outer gate (brigade already skipped).
            if (existing === 0 && (corpsStance === 'offensive' || corpsStance === 'balanced') &&
                _offensiveTargetSet.has(s.osid)) {
                const pioneerBar = isSupplyStrained ? 'victory' : 'repulsed';
                // Standard pioneer: individual prediction sufficient
                if (isOutcomeSufficientForAttack(s.prediction.predicted_outcome, pioneerBar)) {
                    bestTarget = s;
                    break;
                }
                // Coordinated pioneer (adequate supply only): if enough allies adjacent,
                // pioneer even with weaker individual prediction.
                if (!isSupplyStrained && corpsStance === 'offensive') {
                    const adjAllies = targetAdjacentCount.get(s.osid) ?? 0;
                    if (adjAllies >= 2) {
                        const coordinated = estimateConcentratedOutcome(s.prediction.power_ratio, adjAllies - 1);
                        if (coordinated && isOutcomeSufficientForAttack(coordinated, effectiveDirective.min_attack_outcome)) {
                            bestTarget = s;
                            break;
                        }
                    }
                }
            }
            // Concentration: join an existing pioneer attack.
            // Use full concentration potential (all adjacent allies) rather than just
            // existing attackers — subsequent brigades will also join this turn.
            if (existing > 0 && effectiveDirective.offensive_targets.includes(s.osid)) {
                const adjAllies = targetAdjacentCount.get(s.osid) ?? 0;
                const thresholdRelax = activeOpLater?.schwerpunkt_osid === s.osid ? 1 : 0;
                const potentialTotal = Math.max(existing + 1 + thresholdRelax, adjAllies);
                const combined = estimateConcentratedOutcome(s.prediction.power_ratio, potentialTotal - 1);
                if (combined && isOutcomeSufficientForAttack(combined, effectiveDirective.min_attack_outcome)) {
                    bestTarget = s;
                    break;
                }
            }

            // Directive discipline: brigades only attack corps-ordered targets.
            // Counter-attacks (brigade retreated from this OSID last turn) are the sole autonomous exception.
            if (!effectiveDirective.offensive_targets.includes(s.osid) && counterAttackTarget !== s.osid) continue;

            if (s.finalScore <= 0) continue;

            // Check outcome threshold from directive
            const outcomeOk = isOutcomeSufficientForAttack(s.prediction.predicted_outcome, effectiveDirective.min_attack_outcome);
            // Counter-attack: this brigade retreated from this OSID last turn — relaxed threshold
            const isRetreatCounter = (counterAttackTarget === s.osid);

            if (outcomeOk || (isRetreatCounter && isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate'))) {
                bestTarget = s;
                break;
            }
            // Concentration: estimate combined outcome with co-attackers
            if (existing > 0) {
                const combined = estimateConcentratedOutcome(s.prediction.power_ratio, existing);
                if (combined && isOutcomeSufficientForAttack(combined, effectiveDirective.min_attack_outcome)) {
                    bestTarget = s;
                    break;
                }
            }
        }

        if (bestTarget) {
            // Assault posture: only assign when corps is offensive AND brigade cohesion is high.
            // Otherwise fall back to standard attack posture.
            const attackPosture: BrigadePosture = (corpsStance === 'offensive' && (brigade.cohesion ?? 0) >= 60)
                ? 'assault'
                : 'attack';
            result.posture_orders.push({ brigade_id: brigade.id, posture: attackPosture });
            result.attack_orders[brigade.id] = bestTarget.osid;
            result.attack_scores[brigade.id] = bestTarget.finalScore;
            chosenTargets.set(bestTarget.osid, (chosenTargets.get(bestTarget.osid) ?? 0) + 1);
            return true;
        }
    }

    // Hold brigade fallback: no viable attack found — defend at the hold position.
    // Don't redeploy or move away from a chokepoint.
    if (ctx.isHoldBrigade) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    return false;
}
