import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { getAdjacentEnemyOsids } from './bot_brigade_context.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findNearestFriendlyOsidInSet, findNearestFriendlyOsidDestination } from './bot_brigade_context.js';
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
import type { BrigadePosture, FormationState } from '../../state/game_state.js';
import { findSectorForEnemyOsid, findSubSegmentForOsid } from './corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../../state/game_state.js';
import { areRbihHrhbAllied, isFriendlyFaction, isRbihHrhbCombatEnabled } from '../early_war/alliance_update.js';
import { isEnclaveBrigade, isOsidInSameEnclave } from './enclave_resilience.js';
import { assignedBrigadeNotOnSectorFrontOsids } from './bot_brigade_eval_front.js';

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
    const { brigade, state, loc, brigadeSupplyState, isActiveSectorOperationParticipant, result } = ctx;
    if (brigadeSupplyState === 'critical') {
        // Operation participants at critical supply still need to reposition —
        // let them through to evaluateSectorAttack which handles movement-toward-approach.
        // They won't attack (combat predictor penalizes critical supply), but they can march.
        if (isActiveSectorOperationParticipant) return false;
        // Line brigades off their sector front must reach the front before sitting in defend.
        if (assignedBrigadeNotOnSectorFrontOsids(state, brigade, loc)) return false;
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }
    return false;
}

export function evaluateSectorAttack(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, activeOp, isActiveSectorOperationParticipant, loc, faction, adjacency, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, result } = ctx;

    // Combat ineffective gate: brigades below minimum personnel defend only.
    // A 300-man brigade cannot execute an attack — it needs to reconstitute.
    const COMBAT_INEFFECTIVE_PERSONNEL = 400;
    if (assignedBrigadeNotOnSectorFrontOsids(state, brigade, loc)) {
        return false;
    }
    if ((brigade.personnel ?? 0) < COMBAT_INEFFECTIVE_PERSONNEL) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    const activeOp15 = activeOp;
    if (isActiveSectorOperationParticipant && (activeOp15?.type === 'sector_attack' || activeOp15?.type === 'probe')) {
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
            // Skip objective if controlled by own faction OR by an allied faction.
            // Allied capture counts as mission success — advance to next objective.
            const objController = currentObjective ? getPoliticalControllerOSID(state, currentObjective, reverseMap) : null;
            const objCapturedByFriendly = objController === faction
                || (objController != null && isFriendlyFaction(objController, faction, state));
            if (!currentObjective || objCapturedByFriendly) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }

            const allTargets = predictAllAdjacentTargets(
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
            // Alliance filter: HRHB must not attack RBiH targets (and vice versa)
            // when combat is not enabled (allied OR mobilizing). Applies to ALL operation attack paths.
            const targets = (faction === 'HRHB' || faction === 'RBiH') && !isRbihHrhbCombatEnabled(state)
                ? allTargets.filter(t => {
                    const tc = getPoliticalControllerOSID(state, t.osid, reverseMap);
                    return tc !== (faction === 'HRHB' ? 'RBiH' : 'HRHB');
                })
                : allTargets;
            const avoidedOsidsForFaction = state.meta?.avoided_osids_by_faction?.[faction];
            const directObjectiveAttack = avoidedOsidsForFaction?.includes(currentObjective as string)
                ? undefined
                : targets.find((t) => t.osid === currentObjective);
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

            // ── March toward objective first ─────────────────────────
            // Brigades follow orders: column-march toward a friendly OSID adjacent
            // to the objective. Use column_march_orders (sets brigade_movement_state
            // in_transit) so the stall detector (anyMoved) can see the movement.
            // movement_orders (1-hop regular move) is invisible to anyMoved and causes
            // the idle_execution_turn_streak to accumulate incorrectly — leading to
            // premature axis stall before brigades reach attack position (#34 root cause).
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
                // Use Destination (actual target OSID) so the Dijkstra path covers all hops.
                // findNearestFriendlyOsidInSet returns only the first step — passing a 1-hop
                // destination to column_march_orders would stop the column after 1 hop.
                const approachDest = findNearestFriendlyOsidDestination(
                    state,
                    faction,
                    loc,
                    adjacency,
                    reverseMap,
                    objectiveApproachOsids
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
            const _avoidedOsids = state.meta?.avoided_osids_by_faction?.[faction];
            const objectiveController = getPoliticalControllerOSID(state, currentObjective, reverseMap);
            const intermediateTargets = (objectiveController
                ? targets.filter(t => getPoliticalControllerOSID(state, t.osid, reverseMap) === objectiveController)
                : targets).filter(t => !_avoidedOsids?.includes(t.osid));
            if (intermediateTargets.length > 0) {
                const intermediateThreshold = getSectorOffensiveProbeThreshold(activeOp15, brigade.id);
                const bestIntermediate = intermediateTargets.find((t) => {
                    const alreadyAt = chosenTargets.get(t.osid) ?? 0;
                    if (alreadyAt >= MAX_ATTACKERS_PER_TARGET) return false;
                    return isOutcomeSufficientForAttack(t.prediction.predicted_outcome, intermediateThreshold);
                });
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

/**
 * Uncontested occupation: a brigade adjacent to an undefended enemy OSID
 * can walk in without a formal CorpsOperation.
 *
 * "Undefended" = no enemy formations present AND no sector defense (no sector
 * brigades covering it). In the real war, abandoned territory was occupied
 * within hours to 1-2 days — no commander waits for a formal operation order.
 *
 * Guards: brigade must not be in an active operation, not disrupted, not in
 * column march. Maximum 1 uncontested occupation per brigade per turn.
 */
export function evaluateUncontestedOccupation(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, loc, faction, adjacency, state, isActiveSectorOperationParticipant, result } = ctx;

    // Early-war throttle: no uncontested occupation in first 2 weeks (deployment phase).
    // Historically, territory grab was rapid but not instantaneous — units need time to
    // deploy, establish control, and move supplies forward.
    const turn = state.meta?.turn ?? 0;
    if (turn <= 2) return false;

    // Don't interrupt active operations
    if (isActiveSectorOperationParticipant) return false;

    // Don't move disrupted or column-marching brigades
    if ((brigade as { disrupted_turns?: number }).disrupted_turns != null &&
        ((brigade as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0) return false;

    const neighbors = adjacency.get(loc) ?? [];
    const formations = state.military.formations ?? {};
    const pc = state.political.political_controllers ?? {};

    // Find adjacent enemy OSIDs that are truly undefended
    for (const n of neighbors) {
        if (!n.startsWith('op:')) continue;
        const controller = pc[n] as string | undefined;
        if (!controller || controller === faction) continue;

        // Alliance guard: HRHB/RBiH don't occupy each other's territory while allied or mobilizing
        if ((faction === 'HRHB' && controller === 'RBiH' || faction === 'RBiH' && controller === 'HRHB')
            && !isRbihHrhbCombatEnabled(state)) continue;

        // Enclave guard: enclave brigades must not expand beyond their enclave perimeter.
        // Without this, besieged ARBiH enclave brigades walk into adjacent RS positions
        // when VRS brigades sector-march away (e.g. 280th–284th recapturing obadi/vranesevici
        // from the Srebrenica pocket, undoing Ring operations).
        if (isEnclaveBrigade(brigade) && !isOsidInSameEnclave(loc as string, n)) continue;

        // Salient aversion: don't walk into undefended territory if it creates
        // an indefensible salient (>75% of neighbors are enemy after capture).
        // No commander holds one OSID deep inside enemy territory with no supply line.
        {
            const nNeighbors = adjacency.get(n as import('./osid_adjacency.js').Osid) ?? [];
            let friendlyN = 0, enemyN = 0;
            for (const nn of nNeighbors) {
                const nnCtrl = pc[nn] as string | undefined;
                if (nnCtrl === faction || nn === loc) friendlyN++; // current position counts as friendly
                else if (nnCtrl && nnCtrl !== faction) enemyN++;
            }
            const totalN = friendlyN + enemyN;
            if (totalN > 0 && enemyN / totalN >= 0.75) continue;
        }

        // NOTE: Corps operational area guard was tested (n778) but too restrictive —
        // blocked legitimate VRS advances, -0.9pp regression. The salient aversion
        // filter (Phase C) handles geometric overextension. Demographic filter (#42)
        // is the right approach for strategic scope, not municipality whitelisting.

        // Scenario avoid-list guard: historically, some OSIDs were not captured even when
        // undefended (e.g. Brčko city center — VRS held the corridor but not the city core).
        // Without this guard, brigades sweeping through during operation execution walk into
        // avoided OSIDs opportunistically, bypassing the operation-level avoid check.
        const avoidedOsids = state.meta?.avoided_osids_by_faction?.[faction];
        if (avoidedOsids?.includes(n)) continue;

        // Check: no enemy formations physically at this OSID
        let hasDefender = false;
        for (const fid of Object.keys(formations)) {
            const f = formations[fid] as FormationState | undefined;
            if (f && f.status === 'active' && f.location_osid === n && f.faction === controller) {
                hasDefender = true;
                break;
            }
        }
        if (hasDefender) continue;

        // Check: no sector covering this OSID with active brigades.
        // A sector is defended if it has ANY active brigade — assigned OR reserve.
        // Only checking assigned_brigade_ids misses sectors where all brigades are
        // in reserve (0-assigned cycle): the sector physically defends the OSID via
        // unified sector defense even without a front-line assignment.
        const sector = findSectorForEnemyOsid(state, n as Osid, controller);
        if (sector) {
            const allSectorBrigades = [...sector.assigned_brigade_ids, ...(sector.reserve_brigade_ids ?? [])];
            const sectorHasBrigades = allSectorBrigades.some(bid => {
                const f = formations[bid];
                return f != null && f.status === 'active';
            });
            if (sectorHasBrigades) continue;
        }

        // Truly undefended — walk in
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
        result.attack_orders[brigade.id] = n as Osid;
        result.attack_scores[brigade.id] = 600; // lower priority than formal ops (800/900)
        return true;
    }

    return false;
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

        // Estimate defense strength as sum of primary brigade personnel
        let strength = 0;
        for (const bid of ss.primary_brigade_ids) {
            const f = formations[bid];
            if (f && f.status === 'active') {
                strength += f.personnel ?? 0;
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
