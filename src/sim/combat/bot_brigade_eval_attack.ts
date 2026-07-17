import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { botOrdersPerfTime } from './_perf_profile_bot_orders.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { getAdjacentEnemyOsids } from './bot_brigade_context.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findNearestFriendlyOsidDestination } from './bot_brigade_context.js';
import { predictAllAdjacentTargets, predictCombatOutcome } from './combat_predictor.js';
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
import { countFactionBrigadesAtOsid, getCorpsBrigadeCountAtOsid } from './bot_brigade_context.js';
import type { Osid } from './osid_adjacency.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';
import { effectivePersonnel } from './tactical_group_personnel.js';
import type { BrigadePosture, FactionId, FormationState, GameState } from '../../state/game_state.js';
import { findSubSegmentForOsid } from './corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../../state/game_state.js';
import { isFriendlyFaction, isRbihHrhbCombatEnabled } from '../early_war/alliance_update.js';
import { assignedBrigadeNotOnSectorFrontOsids } from './bot_brigade_eval_front.js';
import {
    MAX_SECTOR_COUNTER_ATTACKS_PER_TURN,
    COUNTER_ATTACK_MIN_PERSONNEL,
    COUNTER_ATTACK_MIN_COHESION,
    COUNTER_ATTACK_MAX_HOPS,
    COUNTER_ATTACK_RETREAT_WINDOW,
} from './bot_constants.js';

const HOME_DEFENSE_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval';
const DEFENSIVE_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval';
const SECTOR_ATTACK_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval';
const SECTOR_ATTACK_DIRECT_OBJECTIVE_PREDICT_PROFILE_PREFIX =
    'bot_orders.executeFactionDirectives.eval.sectorAttack.executionDirectObjective.predictCombatOutcome';

function homeDefenseProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${HOME_DEFENSE_PROFILE_PREFIX}${labelSuffix}`, fn);
}

function defensiveProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${DEFENSIVE_PROFILE_PREFIX}${labelSuffix}`, fn);
}

function sectorAttackProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${SECTOR_ATTACK_PROFILE_PREFIX}${labelSuffix}`, fn);
}

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
import { MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { countAxisConcentrationSupport } from './corps_operation_helpers.js';

export function evaluateHomeDefense(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, loc, adjacency, result, isActiveSectorOperationParticipant, graphAnalysis, adjEnemy } = ctx;

    // --- Home-ground brigades: defend or counterattack only, never attack ---
    if (brigade.home_defense_active === true && !isActiveSectorOperationParticipant) {
        // Deep-rear home defense brigades (no enemy adjacent, 2+ hops from front)
        // should NOT be trapped here — they must march toward the front via
        // evaluateInteriorMovement instead of sitting idle in the rear.
        if (adjEnemy.length === 0) {
            const shouldFallThroughToInterior = homeDefenseProfileTime('.homeDefense.deepRearNearFront', () => {
                const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
                if (osidAnalysis && osidAnalysis.enemy_neighbors.length > 0) return false;
                const neighbors = adjacency.get(loc as Osid) ?? [];
                const nearFront = neighbors.some(n => {
                    const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                    return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                });
                return !nearFront;
            });
            if (shouldFallThroughToInterior) return false; // deep rear - fall through to interior movement
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
    const { brigade, state, loc, brigadeSupplyState, isActiveSectorOperationParticipant, result } = ctx;
    if (brigadeSupplyState === 'critical') {
        // Operation participants at critical supply still need to reposition —
        // let them through to evaluateSectorAttack which handles movement-toward-approach.
        // They won't attack (combat predictor penalizes critical supply), but they can march.
        if (isActiveSectorOperationParticipant) return false;
        // Line brigades off their sector front must reach the front before sitting in defend.
        if (assignedBrigadeNotOnSectorFrontOsids(state, brigade, loc, ctx.assignedSectorFrontOsids)) return false;
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }
    return false;
}

function buildObjectivePathDistances(
    state: GameState,
    faction: FactionId,
    currentObjective: Osid,
    objectiveController: FactionId | null,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): Map<Osid, number> {
    const distances = new Map<Osid, number>();
    if (objectiveController === null) return distances;
    distances.set(currentObjective, 0);
    const queue: Osid[] = [currentObjective];
    for (let index = 0; index < queue.length; index += 1) {
        const osid = queue[index]!;
        const distance = distances.get(osid)!;
        const neighbors = [...getTacticalAdjacentOsids(state, osid, adjacency)].sort(strictCompare);
        for (const neighbor of neighbors) {
            if (distances.has(neighbor)) continue;
            const controller = getPoliticalControllerOSID(state, neighbor, reverseMap);
            const pathAllowed = controller === objectiveController
                || (controller !== null && isFriendlyFaction(controller, faction, state));
            if (!pathAllowed) continue;
            distances.set(neighbor, distance + 1);
            queue.push(neighbor);
        }
    }
    return distances;
}

function wasRecentlyRepulsedFromTarget(
    brigade: FormationState,
    targetOsid: string,
    currentTurn: number,
    cooldownTurns = COUNTER_ATTACK_RETREAT_WINDOW,
): boolean {
    const repulseInfo = (brigade as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from;
    return repulseInfo?.osid === targetOsid
        && repulseInfo.turn >= currentTurn - cooldownTurns;
}

export function evaluateSectorAttack(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, activeOp, isActiveSectorOperationParticipant, loc, faction, adjacency, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, officerCombatLookup, getOfficerCombatLookup } = ctx;

    // Combat ineffective gate: brigades below minimum personnel (500) defend only.
    // A sub-battalion unit cannot execute an attack — it needs to reconstitute.
    // Uses MIN_ATTACK_PERSONNEL from formation_constants (canonical single source).
    // NOTE: the local constant was previously 400 — unified to 500 to match MIN_ATTACK_PERSONNEL.
    const offAssignedFront = sectorAttackProfileTime('.sectorAttack.offAssignedFront', () =>
        !isActiveSectorOperationParticipant &&
        assignedBrigadeNotOnSectorFrontOsids(state, brigade, loc, ctx.assignedSectorFrontOsids)
    );
    if (offAssignedFront) {
        return false;
    }
    if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    if (isActiveSectorOperationParticipant && (activeOp?.type === 'sector_attack' || activeOp?.type === 'probe')) {
        if (activeOp.phase === 'planning') {
            const planningApproachOsids = sectorAttackProfileTime(
                '.sectorAttack.planningApproaches',
                () => getSectorOffensiveApproachOsids(
                    state,
                    activeOp,
                    faction,
                    adjacency,
                    reverseMap,
                    brigade.id,
                )
            );
            if (planningApproachOsids.size > 0 && !planningApproachOsids.has(loc)) {
                // Not at an approach OSID — march toward one
                const nearestApproach = sectorAttackProfileTime(
                    '.sectorAttack.planningApproachPath',
                    () => findNearestFriendlyOsidDestination(
                        state,
                        faction,
                        loc,
                        adjacency,
                        reverseMap,
                        planningApproachOsids
                    )
                );
                if (nearestApproach) {
                    result.column_march_orders[brigade.id] = nearestApproach;
                }
            } else if (planningApproachOsids.size === 0) {
                // No approach OSIDs found — fall back to staging area
                sectorAttackProfileTime('.sectorAttack.planningApproachPath', () => {
                    const axisStaging = getBrigadeAxis(activeOp, brigade.id)?.staging_osid ?? activeOp.staging_osid;
                    if (axisStaging && loc !== axisStaging) {
                        const nearestStaging = findNearestFriendlyOsidDestination(
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
                });
            }
            // else: already at an approach OSID — stay in position
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }

        if (activeOp.phase === 'recovery') {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }

        if (activeOp.phase === 'execution') {
            const currentObjective = getSectorOffensiveCurrentObjective(activeOp, brigade.id);
            // Skip objective if controlled by own faction OR by an allied faction.
            // Allied capture counts as mission success — advance to next objective.
            const objController = currentObjective ? getPoliticalControllerOSID(state, currentObjective, reverseMap) : null;
            const objCapturedByFriendly = objController === faction
                || (objController != null && isFriendlyFaction(objController, faction, state));
            if (!currentObjective || objCapturedByFriendly) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }

            const tacticallyAdjacentToObjective = sectorAttackProfileTime(
                '.sectorAttack.executionTacticalAdjacency',
                () => getTacticalAdjacentOsids(state, loc as Osid, adjacency).includes(currentObjective)
            );
            const avoidedOsidsForFaction = state.meta?.avoided_osids_by_faction?.[faction];
            const directObjectiveAttack = tacticallyAdjacentToObjective
                ? sectorAttackProfileTime('.sectorAttack.executionDirectObjective', () => {
                    const skipDirectObjective = sectorAttackProfileTime(
                        '.sectorAttack.executionDirectObjective.gates',
                        () => {
                            if (avoidedOsidsForFaction?.includes(currentObjective as string)) return true;
                            if (objController === null || objController === faction) return true;
                            if ((faction === 'HRHB' || faction === 'RBiH') && !isRbihHrhbCombatEnabled(state)) {
                                const alliedOpponent = faction === 'HRHB' ? 'RBiH' : 'HRHB';
                                if (objController === alliedOpponent) return true;
                            }
                            return false;
                        },
                    );
                    if (skipDirectObjective) return undefined;
                    const prediction = sectorAttackProfileTime(
                        '.sectorAttack.executionDirectObjective.predict',
                        () => {
                            const combatOfficerLookup = getOfficerCombatLookup?.() ?? officerCombatLookup;
                            return predictCombatOutcome(
                                state,
                                brigade.id,
                                currentObjective as Osid,
                                adjacency,
                                reverseMap,
                                terrainCache,
                                'attack',
                                undefined,
                                supplyStateByOsid,
                                osidPopulationMap,
                                undefined,
                                ethnicMap,
                                SECTOR_ATTACK_DIRECT_OBJECTIVE_PREDICT_PROFILE_PREFIX,
                                combatOfficerLookup,
                            );
                        },
                    );
                    return prediction ? { osid: currentObjective as Osid, prediction } : undefined;
                })
                : undefined;
            const alreadyAssigned = chosenTargets.get(currentObjective) ?? 0;
            if (directObjectiveAttack) {
                const probeThreshold = getSectorOffensiveProbeThreshold(activeOp, brigade.id);
                const predictedOutcome = directObjectiveAttack.prediction.predicted_outcome;
                const axisBrigades = getBrigadeAxis(activeOp, brigade.id)?.assigned_brigades
                    ?? activeOp.participating_brigades ?? [];
                // R13b op-level concentration: count same-axis op-mates within 2 hops
                // of the objective with distance weighting (1-hop=1.0, 2-hop=0.5,
                // floored). Replaces prior tactical-adjacency check which excluded
                // op-mates staged 2+ hops away (e.g. HV phantoms at livno/duvno
                // staging for drvar/glamoc objectives, where Mistral 1/2/SM ops
                // never accumulated >1 supporter and concentratedOutcome stayed null).
                const adjacentOperationParticipants = sectorAttackProfileTime(
                    '.sectorAttack.executionAdjacentParticipants',
                    () => countAxisConcentrationSupport(
                        state,
                        axisBrigades,
                        new Set([brigade.id]),
                        adjacency,
                        currentObjective as Osid,
                    )
                );
                const additionalAttackers = Math.max(alreadyAssigned, adjacentOperationParticipants);
                const concentratedOutcome = additionalAttackers > 0
                    ? estimateConcentratedOutcome(
                        directObjectiveAttack.prediction.power_ratio,
                        additionalAttackers
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
            if (tacticallyAdjacentToObjective) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }

            // ── March toward objective first ─────────────────────────
            // Brigades follow orders: column-march toward a friendly OSID adjacent
            // to the objective. Use column_march_orders (sets brigade_movement_state
            // in_transit) so the stall detector (anyMoved) can see the movement.
            // movement_orders (1-hop regular move) is invisible to anyMoved and causes
            // the idle_execution_turn_streak to accumulate incorrectly — leading to
            // premature axis stall before brigades reach attack position (#34 root cause).
            const objectiveApproachOsids = sectorAttackProfileTime(
                '.sectorAttack.executionApproachOsids',
                () => getSectorOffensiveApproachOsids(
                    state,
                    activeOp,
                    faction,
                    adjacency,
                    reverseMap,
                    brigade.id,
                )
            );
            objectiveApproachOsids.delete(loc);
            if (objectiveApproachOsids.size > 0) {
                // Use Destination (actual target OSID) so the Dijkstra path covers all hops.
                // findNearestFriendlyOsidInSet returns only the first step — passing a 1-hop
                // destination to column_march_orders would stop the column after 1 hop.
                const approachDest = sectorAttackProfileTime(
                    '.sectorAttack.executionApproachPath',
                    () => findNearestFriendlyOsidDestination(
                        state,
                        faction,
                        loc,
                        adjacency,
                        reverseMap,
                        objectiveApproachOsids
                    )
                );
                if (approachDest) {
                    result.column_march_orders[brigade.id] = approachDest;
                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                    return true;
                }
            }

            // ── Attack through: last resort when march path blocked ──
            // No friendly path to objective — must fight through enemy
            // territory to open a route. Only attack intermediates held
            // by the SAME faction as the objective.
            // Scenario avoid-list: don't attack historically excluded OSIDs even
            // as attack-through intermediaries (e.g. Brčko city center — VRS held
            // the corridor but not the city core; without this, operation brigades
            // sweep through avoided OSIDs opportunistically).
            const objectiveController = getPoliticalControllerOSID(state, currentObjective, reverseMap);
            const objectivePathDistances = sectorAttackProfileTime(
                '.sectorAttack.executionObjectivePathDistances',
                () => buildObjectivePathDistances(
                    state,
                    faction,
                    currentObjective,
                    objectiveController,
                    adjacency,
                    reverseMap,
                )
            );
            const locObjectiveDistance = objectivePathDistances.get(loc as Osid);
            const allTargets = sectorAttackProfileTime(
                '.sectorAttack.executionPredictTargets',
                () => predictAllAdjacentTargets(
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
                )
            );
            // Alliance filter: HRHB must not attack RBiH targets (and vice versa)
            // when combat is not enabled (allied OR mobilizing). Applies to attack-through fallback.
            const targets = (faction === 'HRHB' || faction === 'RBiH') && !isRbihHrhbCombatEnabled(state)
                ? allTargets.filter(t => {
                    const tc = getPoliticalControllerOSID(state, t.osid, reverseMap);
                    return tc !== (faction === 'HRHB' ? 'RBiH' : 'HRHB');
                })
                : allTargets;
            const { intermediateTargets, bestIntermediate } = sectorAttackProfileTime(
                '.sectorAttack.executionIntermediateTargets',
                () => {
                    const _avoidedOsids = state.meta?.avoided_osids_by_faction?.[faction];
                    const filteredIntermediateTargets = (objectiveController
                        ? targets.filter(t => getPoliticalControllerOSID(state, t.osid, reverseMap) === objectiveController)
                        : targets).filter(t => {
                            if (_avoidedOsids?.includes(t.osid)) return false;
                            const targetDistance = objectivePathDistances.get(t.osid);
                            return targetDistance !== undefined
                                && locObjectiveDistance !== undefined
                                && targetDistance < locObjectiveDistance;
                        });
                    const intermediateThreshold = getSectorOffensiveProbeThreshold(activeOp, brigade.id);
                    const best = filteredIntermediateTargets.find((t) => {
                        const alreadyAt = chosenTargets.get(t.osid) ?? 0;
                        if (alreadyAt >= MAX_ATTACKERS_PER_TARGET) return false;
                        return isOutcomeSufficientForAttack(t.prediction.predicted_outcome, intermediateThreshold);
                    });
                    return { intermediateTargets: filteredIntermediateTargets, bestIntermediate: best };
                }
            );
            if (intermediateTargets.length > 0) {
                if (bestIntermediate) {
                    const attackPosture: BrigadePosture = (brigade.cohesion ?? 0) >= 60 ? 'assault' : 'attack';
                    result.posture_orders.push({ brigade_id: brigade.id, posture: attackPosture });
                    result.attack_orders[brigade.id] = bestIntermediate.osid;
                    result.attack_scores[brigade.id] = 800;
                    chosenTargets.set(bestIntermediate.osid, (chosenTargets.get(bestIntermediate.osid) ?? 0) + 1);
                    return true;
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
    min_attack_outcome: 'costly_victory' as const,
    aggression_modifier: 0,
};

/**
 * BFS from source OSIDs up to maxHops, returning enemy-controlled OSIDs found.
 * Only traverses through the adjacency graph — does not filter by faction during traversal.
 * Deterministic: sorted iteration at each BFS level.
 */
export function getEnemyOsidsWithinHops(
    sourceOsids: string[],
    maxHops: number,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    faction: FactionId,
): Set<string> {
    const enemyOsids = new Set<string>();
    const visited = new Set<string>(sourceOsids);
    let frontier = [...sourceOsids].sort(strictCompare);

    for (let hop = 0; hop < maxHops; hop++) {
        const nextFrontier: string[] = [];
        for (const osid of frontier) {
            const neighbors = adjacency.get(osid as Osid) ?? [];
            for (const n of neighbors) {
                if (visited.has(n)) continue;
                visited.add(n);
                const controller = (state.political.political_controllers ?? {})[n] as string | undefined;
                if (controller && controller !== faction) {
                    enemyOsids.add(n);
                }
                // Continue BFS through both friendly and enemy territory
                nextFrontier.push(n);
            }
        }
        frontier = nextFrontier.sort(strictCompare);
    }

    return enemyOsids;
}

export function evaluateDefensive(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsStance, counterAttackTarget, adjEnemy, directive, faction, isAlliedWithRBiH, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result, adjacency, loc, graphAnalysis, sectorRecentRetreats, sectorCounterAttackCount } = ctx;

    // --- Rule 4: Defensive stance → defend, with retreat-based counter-attack only ---

    if (corpsStance === 'defensive') {
        // Deep-rear brigades should march toward front, not sit idle in defensive
        if (adjEnemy.length === 0) {
            const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
            if (!osidAnalysis || osidAnalysis.enemy_neighbors.length === 0) {
                const neighbors = adjacency.get(loc as Osid) ?? [];
                const nearFront = defensiveProfileTime('.defensive.deepRearNearFront', () => neighbors.some(n => {
                    const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                    return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                }));
                if (!nearFront) return false; // deep rear — fall through to interior movement
            }
        }

        const disruptedTurns = (brigade as { disrupted_turns?: number }).disrupted_turns ?? 0;
        const effDir = directive ?? effectiveDirectiveDefault;
        const maxAtt = effDir.max_attackers_per_target;

        // ── Self-retreat counter-attack (score 1000) ────────────────────
        // Only allow counter-attack if THIS brigade retreated from an adjacent OSID last turn
        // AND the brigade is not disrupted (routed brigades can't counter-attack)
        if (counterAttackTarget && adjEnemy.includes(counterAttackTarget) && disruptedTurns === 0) {
            const targets = defensiveProfileTime(
                '.defensive.selfRetreatPredictTargets',
                () => predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap)
            );
            const counter = targets.find(t => t.osid === counterAttackTarget &&
                (chosenTargets.get(t.osid) ?? 0) < maxAtt &&
                isOutcomeSufficientForAttack(t.prediction.predicted_outcome, 'costly_victory'));
            if (counter) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = counter.osid;
                result.attack_scores[brigade.id] = 1000; // Counter-attack: high priority
                chosenTargets.set(counter.osid, (chosenTargets.get(counter.osid) ?? 0) + 1);
                // Increment sector counter-attack count for cap enforcement
                const sectorId = defensiveProfileTime(
                    '.defensive.selfRetreatSectorLookup',
                    () => findBrigadeSectorId(state, brigade)
                );
                if (sectorId) {
                    sectorCounterAttackCount.set(sectorId, (sectorCounterAttackCount.get(sectorId) ?? 0) + 1);
                }
                return true;
            }
        }

        // ── Broadened sector counter-attack (score 950) ─────────────────
        // When ANY brigade in the same sector retreated recently, other healthy
        // brigades on that sector's front can counter-attack adjacent enemy OSIDs
        // within COUNTER_ATTACK_MAX_HOPS of the retreated-from OSID.
        if (disruptedTurns === 0
            && adjEnemy.length > 0
            && (brigade.personnel ?? 0) >= COUNTER_ATTACK_MIN_PERSONNEL
            && (brigade.cohesion ?? 0) >= COUNTER_ATTACK_MIN_COHESION
        ) {
            const sectorId = defensiveProfileTime(
                '.defensive.sectorCounterAttackSectorLookup',
                () => findBrigadeSectorId(state, brigade)
            );
            if (sectorId) {
                const sectorRetreats = sectorRecentRetreats.get(sectorId);
                const sectorCount = sectorCounterAttackCount.get(sectorId) ?? 0;
                if (sectorRetreats && sectorRetreats.length > 0
                    && sectorCount < MAX_SECTOR_COUNTER_ATTACKS_PER_TURN
                ) {
                    const candidateTargets = defensiveProfileTime('.defensive.sectorCounterAttackCollectTargets', () => {
                        // Find enemy OSIDs within COUNTER_ATTACK_MAX_HOPS of any retreat OSID
                        const retreatOsids = sectorRetreats.map(r => r.osid);
                        const enemyTargetOsids = getEnemyOsidsWithinHops(
                            retreatOsids,
                            COUNTER_ATTACK_MAX_HOPS,
                            adjacency,
                            state,
                            faction,
                        );

                        // Filter to only adjacent enemy OSIDs that are within range
                        return adjEnemy
                            .filter(e => enemyTargetOsids.has(e))
                            .sort(strictCompare);
                    });

                    if (candidateTargets.length > 0) {
                        const targets = defensiveProfileTime(
                            '.defensive.sectorCounterAttackPredictTargets',
                            () => predictAllAdjacentTargets(
                                state, brigade.id, adjacency, reverseMap, terrainCache,
                                'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap,
                            )
                        );

                        // Find best target among candidates with sufficient predicted outcome
                        let bestTarget: typeof targets[number] | null = null;
                        let bestRatio = -Infinity;
                        const currentTurn = state.meta?.turn ?? 0;
                        for (const candidate of candidateTargets) {
                            if (wasRecentlyRepulsedFromTarget(brigade, candidate, currentTurn)) continue;
                            const t = targets.find(p => p.osid === candidate);
                            if (!t) continue;
                            if ((chosenTargets.get(t.osid) ?? 0) >= maxAtt) continue;
                            if (!isOutcomeSufficientForAttack(t.prediction.predicted_outcome, 'costly_victory')) continue;
                            if (t.prediction.power_ratio > bestRatio) {
                                bestRatio = t.prediction.power_ratio;
                                bestTarget = t;
                            }
                        }

                        if (bestTarget) {
                            result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                            result.attack_orders[brigade.id] = bestTarget.osid;
                            result.attack_scores[brigade.id] = 950; // Below self-retreat (1000)
                            chosenTargets.set(bestTarget.osid, (chosenTargets.get(bestTarget.osid) ?? 0) + 1);
                            sectorCounterAttackCount.set(sectorId, sectorCount + 1);
                            return true;
                        }
                    }
                }
            }
        }

        // Fill adjacent front gaps even in defensive stance
        const defHere = defensiveProfileTime(
            '.defensive.frontGapCountHere',
            () => ctx.corpsBrigadeCountsByOsid
                ? getCorpsBrigadeCountAtOsid(ctx.corpsBrigadeCountsByOsid, null, loc)
                : countFactionBrigadesAtOsid(state, faction, loc)
        );
        if (defHere >= 2) {
            const gap = defensiveProfileTime(
                '.defensive.frontGapSearch',
                () => findAdjacentFrontGap(state, loc, faction, adjacency, reverseMap, graphAnalysis)
            );
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

// ═══════════════════════════════════════════════════════════════════════════
// Phase C: Sub-segment targeting — find weakest sub-segment for bot AI
// ═══════════════════════════════════════════════════════════════════════════

/** Bonus applied to attack target scores when the target OSID is in the weakest sub-segment. */
export const WEAK_SUBSEGMENT_SCORE_BONUS = 50;

/**
 * Find the weakest sub-segment in a sector by estimated defense strength.
 *
 * Gap sub-segments (no assigned brigades) are automatically weakest.
 * Otherwise, defense strength = sum of primary_brigade_ids' personnel.
 * Returns null if the sector has no sub-segments.
 *
 * Deterministic: on tie, returns the sub-segment with the lowest sub_segment_id.
 */
export function findWeakestSubSegment(
    sector: CorpsFrontSector,
    formations: Record<string, FormationState | undefined>
): CorpsFrontSubSegment | null {
    if (sector.sub_segments.length === 0) return null;

    let weakest: CorpsFrontSubSegment | null = null;
    let weakestStrength = Infinity;

    for (const ss of sector.sub_segments) {
        // Gap sub-segments are automatically weakest
        if (ss.gap) {
            if (weakest === null || !weakest.gap ||
                ss.sub_segment_id < weakest.sub_segment_id) {
                weakest = ss;
                weakestStrength = 0;
            }
            continue;
        }

        // Already found a gap — skip non-gap sub-segments
        if (weakest?.gap) continue;

        // Estimate defense strength as sum of primary brigade personnel.
        // Phase 0 (ADR-0005): home-availability read — a defender that lent personnel to a TG
        // is weaker on its own sub-segment. Flag-off: effectivePersonnel === personnel.
        let strength = 0;
        for (const bid of ss.primary_brigade_ids) {
            const f = formations[bid];
            if (f && f.status === 'active') {
                strength += effectivePersonnel(f);
            }
        }

        if (strength < weakestStrength ||
            (strength === weakestStrength && weakest !== null &&
             ss.sub_segment_id < weakest.sub_segment_id)) {
            weakest = ss;
            weakestStrength = strength;
        }
    }

    return weakest;
}

/** Edges per brigade above which a sub-segment is considered overstretched. */
const OVERSTRETCHED_EDGES_PER_BRIGADE = 6;

/**
 * Score bonus for attack targets in the weakest sub-segment of the defending sector.
 * Returns WEAK_SUBSEGMENT_SCORE_BONUS if the target OSID is in the weakest sub-segment,
 * doubled if that sub-segment is overstretched (too many edges per brigade).
 * This is a soft preference (additive bonus), not a hard filter.
 */
export function getWeakSubSegmentBonus(
    targetOsid: string,
    defendingSector: CorpsFrontSector | undefined,
    formations: Record<string, FormationState | undefined>
): number {
    if (!defendingSector) return 0;
    const weakest = findWeakestSubSegment(defendingSector, formations);
    if (!weakest) return 0;
    if (weakest.enemy_osids.includes(targetOsid)) {
        // Overstretched sub-segments (too many edges per brigade) are extra vulnerable
        const edgesPerBrigade = weakest.primary_brigade_ids.length > 0
            ? weakest.length_edges / weakest.primary_brigade_ids.length
            : Infinity;
        return edgesPerBrigade > OVERSTRETCHED_EDGES_PER_BRIGADE
            ? WEAK_SUBSEGMENT_SCORE_BONUS * 2
            : WEAK_SUBSEGMENT_SCORE_BONUS;
    }
    return 0;
}
