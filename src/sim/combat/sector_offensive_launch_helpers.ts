import type {
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { isFriendlyFaction as isFriendlyFactionCtrl } from '../early_war/alliance_update.js';
import {
    computeAttackerPower,
    getArtillerySuppression,
    rankDefendersByPower,
    VICTORY_THRESHOLD_COSTLY,
} from './combat_math.js';
import { predictAllAdjacentTargets, type PredictedOutcome } from './combat_predictor.js';
import { estimateConcentratedOutcome, isOutcomeSufficientForAttack } from './bot_brigade_targeting.js';
import { findSectorForEnemyOsid } from './corps_front_sectors.js';
import { MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { getAllAxisObjectives, getCurrentLaunchObjectives, isMultiAxis } from './sector_offensive_axis_helpers.js';

export type LaunchFeasibilityBlocker =
    | 'no_enemy_objective'
    | 'no_attacker_power'
    | 'defender_power_too_high';

export interface LaunchFeasibilityResult {
    feasible: boolean;
    ratio: number;
    attackerPower: number;
    defenderPower: number;
    blocker?: LaunchFeasibilityBlocker;
}

export function getEquipmentOffensivePriority(equipmentClass: string | undefined): number {
    switch (equipmentClass) {
        case 'mechanized': return 3;
        case 'motorized': return 2;
        case 'mountain': return 1;
        default: return 0;
    }
}

export function resolveEquipmentClass(f: { equipment_class?: string; tags?: string[] }): string | undefined {
    if (f.equipment_class) return f.equipment_class;
    const tag = f.tags?.find(t => t.startsWith('equip:'));
    return tag ? tag.slice(6) : undefined;
}

export function evaluateLaunchFeasibility(
    state: GameState,
    attackerBrigadeIds: FormationId[],
    objectives: string[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null,
    terrainMultByOsid?: Record<string, number>,
): LaunchFeasibilityResult {
    const formations = state.military.formations ?? {};
    const attackerIds = [...attackerBrigadeIds].sort(strictCompare);
    const attackers: FormationState[] = [];
    for (const bid of attackerIds) {
        const formation = formations[bid];
        if (!formation || formation.status !== 'active') continue;
        if ((formation.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((formation.disrupted_turns ?? 0) > 0) continue;
        attackers.push(formation);
    }

    if (attackers.length === 0) {
        return {
            feasible: false,
            ratio: 0,
            attackerPower: 0,
            defenderPower: 0,
            blocker: 'no_attacker_power',
        };
    }

    const terrainCache = terrainMultByOsid ?? {};
    const sortedObjectives = [...objectives].sort(strictCompare);
    let sawEnemyObjective = false;
    let best: LaunchFeasibilityResult | null = null;

    for (const obj of sortedObjectives) {
        const pc = state.political?.political_controllers ?? {};
        const defenderFaction = pc[obj];
        if (!defenderFaction || defenderFaction === faction) continue;
        sawEnemyObjective = true;

        const sector = findSectorForEnemyOsid(state, obj, defenderFaction);
        const targetTerrainMult = terrainCache[obj] ?? 1.0;
        let attackerPower = 0;
        for (const attacker of attackers) {
            attackerPower += computeAttackerPower(
                state,
                attacker,
                supplyByOsid,
                'attack',
                targetTerrainMult,
                obj,
            );
        }

        if (attackerPower <= 0) {
            const candidate: LaunchFeasibilityResult = {
                feasible: false,
                ratio: 0,
                attackerPower,
                defenderPower: 0,
                blocker: 'no_attacker_power',
            };
            if (!best || candidate.ratio > best.ratio) best = candidate;
            continue;
        }

        if (!sector) {
            return {
                feasible: true,
                ratio: Number.POSITIVE_INFINITY,
                attackerPower,
                defenderPower: 0,
            };
        }

        const defenders: FormationState[] = [];
        for (const defBid of [...(sector.assigned_brigade_ids ?? [])].sort(strictCompare)) {
            const defender = formations[defBid];
            if (!defender || defender.status !== 'active') continue;
            defenders.push(defender);
        }

        if (defenders.length === 0) {
            return {
                feasible: true,
                ratio: Number.POSITIVE_INFINITY,
                attackerPower,
                defenderPower: 0,
            };
        }

        const artSuppression = getArtillerySuppression(attackers, faction, state);
        const noEthnicBonus = (_defender: FormationState) => 0;
        const { totalPower: defenderPower } = rankDefendersByPower(
            defenders,
            state,
            obj,
            terrainCache,
            artSuppression,
            supplyByOsid,
            noEthnicBonus,
        );

        if (defenderPower <= 0) {
            return {
                feasible: true,
                ratio: Number.POSITIVE_INFINITY,
                attackerPower,
                defenderPower,
            };
        }

        const ratio = attackerPower / defenderPower;
        const candidate: LaunchFeasibilityResult = ratio >= VICTORY_THRESHOLD_COSTLY
            ? { feasible: true, ratio, attackerPower, defenderPower }
            : { feasible: false, ratio, attackerPower, defenderPower, blocker: 'defender_power_too_high' };
        if (!best || candidate.ratio > best.ratio) best = candidate;
        if (candidate.feasible) return candidate;
    }

    if (!sawEnemyObjective) {
        return {
            feasible: false,
            ratio: 0,
            attackerPower: 0,
            defenderPower: 0,
            blocker: 'no_enemy_objective',
        };
    }

    return best ?? {
        feasible: false,
        ratio: 0,
        attackerPower: 0,
        defenderPower: 0,
        blocker: 'defender_power_too_high',
    };
}

export function checkLaunchFeasibility(
    state: GameState,
    attackerBrigadeIds: FormationId[],
    objectives: string[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null,
    terrainMultByOsid?: Record<string, number>,
): boolean {
    return evaluateLaunchFeasibility(
        state,
        attackerBrigadeIds,
        objectives,
        faction,
        supplyByOsid,
        terrainMultByOsid,
    ).feasible;
}

export function buildOsidAdjacencyFromFrontEdges(state: GameState): Map<string, string[]> {
    const frontEdges = state.military.war_front_edges_osid ?? [];
    const adj = new Map<string, string[]>();
    for (const fe of frontEdges) {
        if (!fe.a || !fe.b) continue;
        let listA = adj.get(fe.a);
        if (!listA) { listA = []; adj.set(fe.a, listA); }
        if (!listA.includes(fe.b)) listA.push(fe.b);
        let listB = adj.get(fe.b);
        if (!listB) { listB = []; adj.set(fe.b, listB); }
        if (!listB.includes(fe.a)) listB.push(fe.a);
    }
    return adj;
}

export function isStagingCorridorSafe(
    staging: string,
    mainBody: Set<string>,
    friendlySet: Set<string>,
    adj: Map<string, readonly string[]>,
): boolean {
    if (mainBody.has(staging)) return true;

    const parent = new Map<string, string | null>();
    parent.set(staging, null);
    const queue: string[] = [staging];
    let head = 0;
    let target: string | null = null;
    while (head < queue.length) {
        const curr = queue[head++]!;
        if (mainBody.has(curr) && curr !== staging) {
            target = curr;
            break;
        }
        for (const nb of adj.get(curr) ?? []) {
            if (parent.has(nb)) continue;
            if (!friendlySet.has(nb)) continue;
            parent.set(nb, curr);
            queue.push(nb);
        }
    }
    if (!target) return false;

    const path: string[] = [];
    let node: string | null = target;
    while (node !== null) {
        path.push(node);
        node = parent.get(node) ?? null;
    }
    path.reverse();
    const intermediates = path.slice(1, path.length - 1);
    if (intermediates.length === 0) return true;

    for (const blocked of intermediates) {
        const visited = new Set<string>([staging, blocked]);
        const q: string[] = [staging];
        let h = 0;
        let found = false;
        while (h < q.length) {
            const c = q[h++]!;
            if (mainBody.has(c) && c !== staging) { found = true; break; }
            for (const nb of adj.get(c) ?? []) {
                if (visited.has(nb)) continue;
                if (!friendlySet.has(nb)) continue;
                visited.add(nb);
                q.push(nb);
            }
        }
        if (!found) return false;
    }
    return true;
}

export function collectSectorSubsegmentApproachOsids(
    state: GameState,
    corpsId: FormationId,
    objectives: string[]
): Set<string> {
    const approachOsids = new Set<string>();
    if (!state.military.corps_front_sectors || objectives.length === 0) return approachOsids;
    const objectiveSet = new Set(objectives);
    for (const sector of Object.values(state.military.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            const touchesObjective = subSegment.enemy_osids.some((osid) => objectiveSet.has(osid));
            if (!touchesObjective) continue;
            for (const osid of subSegment.friendly_osids) {
                approachOsids.add(osid);
            }
        }
    }
    return approachOsids;
}

export function collectObjectiveApproachOsids(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    objectives: string[]
): Set<string> {
    const adjacency = buildOsidAdjacencyFromFrontEdges(state);
    if (adjacency.size > 0) {
        const graphApproachOsids = new Set<string>();
        for (const objective of objectives) {
            for (const neighbor of adjacency.get(objective) ?? []) {
                const controller = getPoliticalControllerOSID(state, neighbor, undefined);
                if (controller === faction || isFriendlyFactionCtrl(controller, faction, state)) {
                    graphApproachOsids.add(neighbor);
                }
            }
            if (graphApproachOsids.size > 0) {
                break;
            }
        }
        return graphApproachOsids;
    }

    return collectSectorSubsegmentApproachOsids(state, corpsId, objectives);
}

// LANE-2026-05-02-IN-TRANSIT-PREDICTOR: shared predicate.
// A brigade is "committed-in-transit toward a relevant destination" when its
// `brigade_movement_state.status === 'in_transit'` AND any of its
// `destination_sids` is in the relevance set. The relevance set is supplied by
// the caller (axis approach OSIDs for readiness; objective-adjacent OSIDs for
// the opening-attack feasibility gate). Faction-agnostic; reads only existing
// state shape. Preserves the `prestageBrigadesForTriggeredOp` overwrite
// contract from commit `98446604` — this helper does not mutate any movement
// state, it only reclassifies skip semantics for participants the engine has
// already committed to the operation.
//
// LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: exported so the
// `estimateForceRatio` caller in `operation_preparation.ts` can gate the
// per-formation supply-context override on the same predicate. Single source
// of truth — duplicating the predicate would risk drift (per determinism-
// auditor recommendation).
export function isCommittedInTransitTo(
    state: GameState,
    brigadeId: FormationId,
    relevantOsids: ReadonlySet<string>,
): boolean {
    const movement = state.military.brigade_movement_state?.[brigadeId];
    if (movement?.status !== 'in_transit') return false;
    const dests = movement.destination_sids ?? [];
    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: scan all of destination_sids per
    // determinism-auditor recommendation — `[0]`-only depends on whether `[0]`
    // is "next hop" or "final destination" and could brittle under future route
    // planners; `.some()` is order-agnostic-result and stays correct.
    for (const dest of dests) {
        if (relevantOsids.has(dest)) return true;
    }
    return false;
}

export function areParticipantsReadyForExecution(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    operation: CorpsOperation
): boolean {
    if (isMultiAxis(operation) && operation.axes) {
        let readyAxisCount = 0;
        for (const axis of operation.axes) {
            const currentObjective = axis.objectives[axis.current_objective_index ?? 0];
            if (typeof currentObjective !== 'string' || currentObjective.length === 0) continue;
            const axisApproachOsids = collectObjectiveApproachOsids(state, corpsId, faction, [currentObjective]);
            if (axisApproachOsids.size === 0) {
                // Phase C diagnostic (Late-War Operation Combat Delivery mega-lane):
                // mark axis as front-unreachable at launch. Write-only — silent-skip
                // behavior preserved (op still launches on other axes; this axis
                // stays in 'executing' but never attacks). Persisted to AxisAAR.
                axis.unreachable_at_launch = true;
                continue;
            }

            for (const brigadeId of axis.assigned_brigades) {
                const brigade = state.military.formations?.[brigadeId];
                if (!brigade || brigade.status !== 'active') continue;
                if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
                if ((brigade.disrupted_turns ?? 0) > 0) continue;
                const movementState = state.military.brigade_movement_state?.[brigadeId];
                if (movementState?.status === 'in_transit') {
                    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: a brigade en-route
                    // to a relevant approach OSID is committed to this op and
                    // counts as ready. Pre-fix: every in_transit brigade was
                    // silently skipped, defeating the planning_duration grace.
                    if (!isCommittedInTransitTo(state, brigadeId, axisApproachOsids)) continue;
                    readyAxisCount += 1;
                    break;
                }
                const location = brigade.location_osid;
                if (typeof location !== 'string' || location.length === 0) continue;
                if (!axisApproachOsids.has(location)) continue;
                readyAxisCount += 1;
                break;
            }
        }
        return readyAxisCount > 0;
    }

    const objectiveApproachOsids = collectObjectiveApproachOsids(
        state,
        corpsId,
        faction,
        getCurrentLaunchObjectives(operation),
    );
    let eligibleParticipantCount = 0;
    for (const brigadeId of operation.participating_brigades ?? []) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((brigade.disrupted_turns ?? 0) > 0) continue;
        const movementState = state.military.brigade_movement_state?.[brigadeId];
        if (movementState?.status === 'in_transit') {
            // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: as multi-axis branch above.
            // In-transit-to-unrelated still does not count (relevance check fails).
            if (!isCommittedInTransitTo(state, brigadeId, objectiveApproachOsids)) continue;
            eligibleParticipantCount += 1;
            continue;
        }
        const location = brigade.location_osid;
        if (typeof location !== 'string' || location.length === 0) return false;
        eligibleParticipantCount += 1;
        if (objectiveApproachOsids.has(location)) continue;
        return false;
    }
    return eligibleParticipantCount > 0;
}

export function getPlanningAttackThreshold(op: CorpsOperation): PredictedOutcome {
    return op.min_attack_outcome ?? 'costly_victory';
}

// LANE-2026-05-02-IN-TRANSIT-PREDICTOR: helper — set of OSIDs adjacent to the
// objective per front-edge adjacency. The adjacency map is bidirectional
// (see `buildOsidAdjacencyFromFrontEdges`), so neighbors-of-objective is the
// canonical set of "adjacent" OSIDs for the opening-attack feasibility gate.
function objectiveAdjacentOsids(
    adjacency: Map<string, string[]>,
    objective: string,
): Set<string> {
    return new Set(adjacency.get(objective) ?? []);
}

// LANE-2026-05-02-IN-TRANSIT-PREDICTOR: count brigades whose CURRENT
// `location_osid` is adjacent to `objective`. This is the staged-adjacent
// count used to drive the concentrated-outcome stack size in
// `axisHasExecutableOpeningAttack` (only physically present brigades
// concentrate; en-route brigades cannot pile on yet).
export function countAdjacentStagedParticipants(
    state: GameState,
    brigadeIds: FormationId[],
    adjacency: Map<string, string[]>,
    objective: string,
): number {
    const adjacentSet = objectiveAdjacentOsids(adjacency, objective);
    let count = 0;
    for (const brigadeId of brigadeIds) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade?.location_osid || brigade.status !== 'active') continue;
        if (adjacentSet.has(brigade.location_osid)) count += 1;
    }
    return count;
}

// LANE-2026-05-02-IN-TRANSIT-PREDICTOR: count brigades that ARE eligible to
// satisfy the opening-attack feasibility gate. Includes (a) brigades currently
// at an objective-adjacent OSID AND (b) brigades committed-in-transit toward
// an objective-adjacent OSID per existing `brigade_movement_state` truth.
// Used only for the `<= 0` early-exit gate; the concentrated-outcome stack
// uses the staged-only count above (per QA T6b semantic split — en-route
// brigades raise the gate but cannot inflate the predicted concentrated
// outcome until they arrive).
export function countAdjacentGateParticipants(
    state: GameState,
    brigadeIds: FormationId[],
    adjacency: Map<string, string[]>,
    objective: string,
): number {
    const adjacentSet = objectiveAdjacentOsids(adjacency, objective);
    let count = 0;
    for (const brigadeId of brigadeIds) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const loc = brigade.location_osid;
        if (loc && adjacentSet.has(loc)) {
            count += 1;
            continue;
        }
        if (isCommittedInTransitTo(state, brigadeId, adjacentSet)) count += 1;
    }
    return count;
}

export function axisHasExecutableOpeningAttack(
    state: GameState,
    faction: FactionId,
    objective: string | undefined,
    brigadeIds: FormationId[],
    adjacency: Map<string, string[]>,
    threshold: PredictedOutcome,
): boolean {
    if (typeof objective !== 'string' || objective.length === 0) return false;

    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: gate count includes brigades
    // committed-in-transit toward objective-adjacent OSIDs. Pre-fix the gate
    // saw only currently-adjacent brigades and silent-skipped en-route
    // participants, defeating the planning_duration grace window.
    const gateAdjacent = countAdjacentGateParticipants(state, brigadeIds, adjacency, objective);
    if (gateAdjacent <= 0) return false;

    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: concentrated stack is staged-only.
    // En-route brigades raise the gate (above) but do not concentrate combat
    // power until they physically arrive at an adjacent OSID — keeping this
    // count at staged-only avoids fantasy-ratio inflation in
    // `estimateConcentratedOutcome(...)`.
    const stagedAdjacent = countAdjacentStagedParticipants(state, brigadeIds, adjacency, objective);

    for (const brigadeId of brigadeIds) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.faction !== faction || brigade.status !== 'active') continue;
        if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((brigade.disrupted_turns ?? 0) > 0) continue;

        const directObjectiveAttack = predictAllAdjacentTargets(
            state,
            brigadeId,
            adjacency,
            undefined as unknown as OperationalToCanonicalReverseMap,
            {},
            'attack',
        ).find((target) => target.osid === objective);
        if (!directObjectiveAttack) continue;

        const concentratedOutcome = stagedAdjacent > 1
            ? estimateConcentratedOutcome(directObjectiveAttack.prediction.power_ratio, stagedAdjacent - 1)
            : null;
        if (
            isOutcomeSufficientForAttack(directObjectiveAttack.prediction.predicted_outcome, threshold)
            || (concentratedOutcome != null && isOutcomeSufficientForAttack(concentratedOutcome, threshold))
        ) {
            return true;
        }
    }

    return false;
}

export function hasExecutableOpeningAttack(
    state: GameState,
    faction: FactionId,
    op: CorpsOperation,
): boolean {
    const adjacency = buildOsidAdjacencyFromFrontEdges(state);
    if (adjacency.size === 0) {
        return true;
    }
    const threshold = getPlanningAttackThreshold(op);

    if (isMultiAxis(op) && op.axes) {
        return op.axes.some((axis) => axisHasExecutableOpeningAttack(
            state,
            faction,
            axis.objectives[axis.current_objective_index ?? 0],
            axis.assigned_brigades,
            adjacency,
            threshold,
        ));
    }

    return axisHasExecutableOpeningAttack(
        state,
        faction,
        op.objectives?.[op.current_objective_index ?? 0],
        op.participating_brigades ?? [],
        adjacency,
        threshold,
    );
}

export function computeSupplyReadiness(
    state: GameState,
    participatingBrigades: FormationId[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null
): number {
    if (!state.meta?.supply_reserves_enabled) return 1.0;
    if (!supplyByOsid?.factions || participatingBrigades.length === 0) return 1.0;
    const fac = supplyByOsid.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return 1.0;
    const osidState = new Map<string, SupplyStateLevel>();
    for (const e of fac.by_osid) osidState.set(e.osid, e.state);

    const reserveLevel = state.meta?.supply_reserves_enabled
        ? ((state.military.general_supply_reserve as Record<string, number> | undefined)?.[faction] ?? 100)
        : 100;

    let score = 0;
    for (const bid of participatingBrigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        const rawSt = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        const st = state.meta?.supply_reserves_enabled
            ? getEffectiveSupplyState(rawSt, reserveLevel)
            : rawSt;
        score += st === 'adequate' ? 1.0 : st === 'strained' ? 0.5 : 0.0;
    }
    return participatingBrigades.length > 0 ? score / participatingBrigades.length : 1.0;
}

export function hasEligibleAttackersForLaunch(
    formations: GameState['military']['formations'],
    brigadeIds: FormationId[],
): boolean {
    for (const id of brigadeIds) {
        const f = formations?.[id];
        if (!f) continue;
        if (f.status !== 'active') continue;
        if ((f.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        return true;
    }
    return false;
}

export function getMomentumAggressionBonus(momentum: number): number {
    if (momentum >= 3) return 0.15;
    if (momentum >= 2) return 0.10;
    if (momentum >= 1) return 0.05;
    return 0;
}

export function getMomentumMinOutcome(momentum: number, base: string): string {
    const rank: Record<string, number> = {
        decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1
    };
    const baseRank = rank[base] ?? 2;
    if (momentum >= 3 && baseRank > 2) return 'stalemate';
    if (momentum >= 2 && baseRank > 3) return 'costly_victory';
    if (momentum >= 1 && baseRank > 4) return 'victory';
    return base;
}
