import type {
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
// TEMPORARY DIAGNOSTIC import — remove together with axis_readiness_debug.ts.
import { emitAxisReadinessTrace, emitOperationReadinessTrace, emitExecutabilityTrace } from './axis_readiness_debug.js';
import type { AxisReadinessDebugContext, BrigadePredictionFact } from './axis_readiness_debug.js';
// REASON-CODE INSTRUMENTATION: env-gated, inert by default. See reason_code_debug.ts.
import { isReasonCodeTopicEnabled } from './reason_code_debug.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type { OfficerCombatLookup } from './combat_math.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { isFriendlyFaction as isFriendlyFactionCtrl } from '../early_war/alliance_update.js';
import {
    computeAttackerPower,
    type DefenderPowerBreakdown,
    getArtillerySuppression,
    rankDefendersByPower,
    STACKING_DEFENDER_SUPPORT,
    VICTORY_THRESHOLD_COSTLY,
} from './combat_math.js';
import { predictAllAdjacentTargets, predictCombatOutcome, type PredictedOutcome } from './combat_predictor.js';
import { estimateConcentratedOutcome, isOutcomeSufficientForAttack } from './bot_brigade_targeting.js';
import { findSectorForEnemyOsid } from './corps_front_sectors.js';
import { MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { getAllAxisObjectives, getCurrentLaunchObjectives, isMultiAxis } from './sector_offensive_axis_helpers.js';
import { getStandingOgDefenseBrigadeIds } from './standing_og_defense.js';
import { ENABLE_TACTICAL_GROUPS, ENABLE_TG_FORMATION, DONATION_READINESS_FRACTION, DONATION_READINESS_FRACTION_HRHB, getAnchorBrigade } from './tactical_group_config.js';
// ADR-0005 v2.2c #3: donation-readiness gate recomputes the donor pool here.
import { selectDonors } from './tactical_group_selection.js';
// ADR-0005 Phase 4: phantom-aware anchor (gate must score donors against the SAME
// persistent anchor that formTgsAtReadyTransition will actually use, not a phantom).
import { resolveTgAnchor } from './tactical_group_anchor.js';
import { getOperationBrigadesAtCurrentObjective } from './corps_operation_helpers.js';

// BATCH C: launch-readiness probes call `predictAllAdjacentTargets(...)` only
// to query whether the brigade has a direct-objective adjacency entry; they do
// not consult the canonical-controller fallback that the reverse map drives in
// `getPoliticalControllerOSID`. An empty map is runtime-identical to passing
// `undefined` to that optional `operationalToCanonical` parameter (Map.get
// returns undefined → null fallback). Replaces the prior placeholder cast.
const EMPTY_REVERSE_MAP: OperationalToCanonicalReverseMap = new Map();

export interface OpeningAttackPredictionContext {
    /** Full tactical graph used by brigade order generation and reserve BFS. */
    adjacency: Map<string, string[]>;
    reverseMap: OperationalToCanonicalReverseMap;
    terrainMultByOsid: Record<string, number>;
    supplyStateByOsid?: SupplyStateByOsidReport | null;
    osidPopulationMap?: OsidPopulationMap | null;
    ethnicComposition?: OsidEthnicComposition | null;
    officerLookup?: OfficerCombatLookup;
}

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
    objectiveOsid?: string;
    primaryDefenderId?: FormationId;
    defenderIds?: FormationId[];
    defenderPowerById?: Array<{
        formationId: FormationId;
        power: number;
        stackedPower: number;
        breakdown: DefenderPowerBreakdown;
    }>;
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

        const defenderIds = getStandingOgDefenseBrigadeIds(sector);
        const defenders: FormationState[] = [];
        for (const defBid of defenderIds) {
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
        const { primary, totalPower: defenderPower, rankedDefenders } = rankDefendersByPower(
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
                objectiveOsid: obj,
                primaryDefenderId: primary.id,
                defenderIds: rankedDefenders.map((defender) => defender.id),
            };
        }

        const ratio = attackerPower / defenderPower;
        const defenderContext = {
            objectiveOsid: obj,
            primaryDefenderId: primary.id,
            defenderIds: rankedDefenders.map((defender) => defender.id),
            defenderPowerById: rankedDefenders.map((defender, index) => ({
                formationId: defender.id,
                power: defender.power,
                stackedPower: index === 0 ? defender.power : defender.power * STACKING_DEFENDER_SUPPORT,
                breakdown: defender.breakdown,
            })),
        };
        const candidate: LaunchFeasibilityResult = ratio >= VICTORY_THRESHOLD_COSTLY
            ? { feasible: true, ratio, attackerPower, defenderPower, ...defenderContext }
            : { feasible: false, ratio, attackerPower, defenderPower, blocker: 'defender_power_too_high', ...defenderContext };
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

/** Build a bidirectional OSID adjacency map from the static operational contact graph edges. */
export function buildStaticOsidAdjacency(edges: EdgeRecord[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
        if (!e.a || !e.b) continue;
        let listA = adj.get(e.a);
        if (!listA) { listA = []; adj.set(e.a, listA); }
        if (!listA.includes(e.b)) listA.push(e.b);
        if (!e.one_way) {
            let listB = adj.get(e.b);
            if (!listB) { listB = []; adj.set(e.b, listB); }
            if (!listB.includes(e.a)) listB.push(e.a);
        }
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
    objectives: string[],
    staticAdjacency?: Map<string, string[]>,
): Set<string> {
    const staticObjectiveNeighbors = new Map<string, Set<string>>();
    if (staticAdjacency) {
        for (const objective of objectives) {
            const neighbors = staticAdjacency.get(objective);
            if (neighbors && neighbors.length > 0) {
                staticObjectiveNeighbors.set(objective, new Set(neighbors));
            }
        }
    }
    const acceptsStaticApproach = (objective: string, neighbor: string): boolean => {
        const staticNeighbors = staticObjectiveNeighbors.get(objective);
        return !staticNeighbors || staticNeighbors.has(neighbor);
    };
    const adjacency = buildOsidAdjacencyFromFrontEdges(state);
    if (adjacency.size > 0) {
        const graphApproachOsids = new Set<string>();
        for (const objective of objectives) {
            for (const neighbor of adjacency.get(objective) ?? []) {
                if (!acceptsStaticApproach(objective, neighbor)) continue;
                const controller = getPoliticalControllerOSID(state, neighbor, undefined);
                if (controller === faction || isFriendlyFactionCtrl(controller, faction, state)) {
                    graphApproachOsids.add(neighbor);
                }
            }
            if (graphApproachOsids.size > 0) {
                break;
            }
        }
        // 2026-05-22 Wave 11 (proposal memo
        // docs/40_reports/proposals/20260522_WAVE_11_PHASE2_DISABLE_JAJCE_EDGES.md §"Problem 2"):
        // Sister patch to Wave 10 commit 6c7fe96e in bot_brigade_ai_osid.ts. The
        // launch-gate previously fell through to collectSectorSubsegmentApproachOsids
        // ONLY when the global front-edge graph was globally empty (adjacency.size === 0).
        // When the graph has thousands of edges overall but ZERO entries for the specific
        // objective's deep-zone neighbors (e.g. HVO–VRS Jajce / Kupres / Glamoč), the
        // helper returned an empty Set and the launch gate reported 'no_approach_osid'
        // even though the corps front sector sub-segments carry approach OSIDs the
        // engine successfully used to clear the prerequisite predicates. Per-turn brain
        // (Wave 10) and launch gate (this Wave 11) now both fall through to the
        // sub-segment scan when the graph yields nothing for the objective set.
        // Faction-symmetric; emergent (sub-segments are computed by sector reconciliation,
        // not authored); zero new constants.
        if (graphApproachOsids.size > 0) {
            return graphApproachOsids;
        }
    }

    // Path 2: sub-segment scan (original fallback — Wave 11)
    const subSegmentOsids = collectSectorSubsegmentApproachOsids(state, corpsId, objectives);
    if (subSegmentOsids.size > 0 && staticObjectiveNeighbors.size > 0) {
        for (const osid of [...subSegmentOsids]) {
            const accepted = objectives.some((objective) => acceptsStaticApproach(objective, osid));
            if (!accepted) subSegmentOsids.delete(osid);
        }
    }
    if (subSegmentOsids.size > 0 || !staticAdjacency) return subSegmentOsids;

    // Path 3: static operational graph — fallback for pre-planned ops in opening turns
    // before live front edges have formed contact near deep enemy objectives.
    const staticApproachOsids = new Set<string>();
    for (const objective of objectives) {
        for (const neighbor of staticAdjacency.get(objective) ?? []) {
            const controller = getPoliticalControllerOSID(state, neighbor, undefined);
            if (controller === faction || isFriendlyFactionCtrl(controller, faction, state)) {
                staticApproachOsids.add(neighbor);
            }
        }
        if (staticApproachOsids.size > 0) break;
    }
    return staticApproachOsids;
}

export function buildOpeningAttackAdjacency(
    _state: GameState,
    _corpsId: FormationId,
    _faction: FactionId,
    _objective: string,
    liveAdjacency: Map<string, string[]>,
    _staticAdjacency?: Map<string, string[]>,
): Map<string, string[]> {
    // Launch must be proven against the same live contact graph consumed by
    // brigade attack-order generation. Authored/static and sector-derived
    // approaches remain valid staging and routing hints, but neither is an
    // executable combat edge until the live front graph contains it.
    return liveAdjacency;
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
    operation: CorpsOperation,
    staticAdjacency?: Map<string, string[]>,
): boolean {
    const operationStaticAdjacency = operation.is_pre_planned === true ? staticAdjacency : undefined;
    if (isMultiAxis(operation) && operation.axes) {
        let readyAxisCount = 0;
        for (const axis of operation.axes) {
            const currentObjective = axis.objectives[axis.current_objective_index ?? 0];
            if (typeof currentObjective !== 'string' || currentObjective.length === 0) continue;
            const axisApproachOsids = collectObjectiveApproachOsids(state, corpsId, faction, [currentObjective], operationStaticAdjacency);
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
        operationStaticAdjacency,
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
    // TEMPORARY DIAGNOSTIC — optional; when omitted nothing is emitted and behaviour
    // is unchanged. Remove with axis_readiness_debug.ts.
    debugCtx?: AxisReadinessDebugContext,
    // REASON-CODE INSTRUMENTATION (topic `axis_reject`) — optional OUT-parameter.
    // When supplied, the per-candidate facts this function already builds for the
    // stdout probe are ALSO written here, so the caller can put them on the
    // artifact instead of requiring the reader to know which operation to filter
    // for in advance. Purely additive: when omitted, every branch below behaves
    // exactly as it does today.
    factsOut?: AxisRejectionFactsOut,
    predictionContext?: OpeningAttackPredictionContext,
): boolean {
    if (typeof objective !== 'string' || objective.length === 0) return false;
    // One array serves both consumers when both are active, so the stdout probe
    // and the artifact can never disagree about what was observed.
    const debugFacts: BrigadePredictionFact[] | undefined =
        factsOut ? factsOut.brigades : (debugCtx ? [] : undefined);

    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: gate count includes brigades
    // committed-in-transit toward objective-adjacent OSIDs. Pre-fix the gate
    // saw only currently-adjacent brigades and silent-skipped en-route
    // participants, defeating the planning_duration grace window.
    const gateAdjacent = countAdjacentGateParticipants(state, brigadeIds, adjacency, objective);
    if (factsOut) factsOut.gate_adjacent = gateAdjacent;
    if (gateAdjacent <= 0) {
        if (debugCtx && debugFacts) {
            // STATE 1 — dead axis. Emitted before the early return so the state is observable.
            emitExecutabilityTrace(state, debugCtx, objective, gateAdjacent, 0, threshold, debugFacts, false);
        }
        return false;
    }

    // LANE-2026-05-02-IN-TRANSIT-PREDICTOR: concentrated stack is staged-only.
    // En-route brigades raise the gate (above) but do not concentrate combat
    // power until they physically arrive at an adjacent OSID — keeping this
    // count at staged-only avoids fantasy-ratio inflation in
    // `estimateConcentratedOutcome(...)`.
    const stagedAdjacent = countAdjacentStagedParticipants(state, brigadeIds, adjacency, objective);
    if (factsOut) factsOut.staged_adjacent = stagedAdjacent;
    const objectiveApproaches = objectiveAdjacentOsids(adjacency, objective);

    for (const brigadeId of brigadeIds) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.faction !== faction || brigade.status !== 'active') {
            debugFacts?.push({
                id: brigadeId,
                considered: false,
                skip_reason: !brigade
                    ? 'missing'
                    : (brigade.faction !== faction ? 'wrong_faction' : 'inactive'),
            });
            continue;
        }
        if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) {
            debugFacts?.push({ id: brigadeId, considered: false, skip_reason: 'below_personnel_floor' });
            continue;
        }
        if ((brigade.disrupted_turns ?? 0) > 0) {
            debugFacts?.push({ id: brigadeId, considered: false, skip_reason: 'disrupted' });
            continue;
        }

        const stagedSupportingBrigades = predictionContext
            ? brigadeIds
                .filter((candidateId) => candidateId !== brigadeId)
                .filter((candidateId) => {
                    const candidate = state.military.formations?.[candidateId];
                    if (!candidate || candidate.faction !== faction || candidate.status !== 'active') return false;
                    if ((candidate.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
                    if ((candidate.disrupted_turns ?? 0) > 0) return false;
                    return !!candidate.location_osid && objectiveApproaches.has(candidate.location_osid);
                })
                .sort(strictCompare)
            : undefined;
        const contextualPrediction = predictionContext
            ? predictCombatOutcome(
                state,
                brigadeId,
                objective,
                predictionContext.adjacency,
                predictionContext.reverseMap,
                predictionContext.terrainMultByOsid,
                'attack',
                stagedSupportingBrigades,
                predictionContext.supplyStateByOsid,
                predictionContext.osidPopulationMap,
                undefined,
                predictionContext.ethnicComposition,
                undefined,
                predictionContext.officerLookup,
            )
            : null;
        const directObjectiveAttack = predictionContext
            ? (contextualPrediction ? { osid: objective, prediction: contextualPrediction } : undefined)
            : predictAllAdjacentTargets(
                state,
                brigadeId,
                adjacency,
                EMPTY_REVERSE_MAP,
                {},
                'attack',
            ).find((target) => target.osid === objective);
        if (!directObjectiveAttack) {
            // STATE 2 discriminator: the objective is not reachable from this
            // brigade's current position (the genuinely-marching case).
            debugFacts?.push({ id: brigadeId, considered: true, found_in_predictor: false });
            continue;
        }

        // The contextual predictor has already summed every physically staged
        // participant. The legacy band estimate remains only for callers that
        // do not provide the real combat context; applying both would count the
        // same concentration twice.
        const concentratedOutcome = !predictionContext && stagedAdjacent > 1
            ? estimateConcentratedOutcome(directObjectiveAttack.prediction.power_ratio, stagedAdjacent - 1)
            : null;
        debugFacts?.push({
            id: brigadeId,
            considered: true,
            found_in_predictor: true,
            predicted_outcome: directObjectiveAttack.prediction.predicted_outcome,
            power_ratio: directObjectiveAttack.prediction.power_ratio,
            concentrated_outcome: concentratedOutcome,
        });
        if (
            isOutcomeSufficientForAttack(directObjectiveAttack.prediction.predicted_outcome, threshold)
            || (concentratedOutcome != null && isOutcomeSufficientForAttack(concentratedOutcome, threshold))
        ) {
            if (debugCtx && debugFacts) {
                emitExecutabilityTrace(state, debugCtx, objective, gateAdjacent, stagedAdjacent, threshold, debugFacts, true);
            }
            return true;
        }
    }

    if (debugCtx && debugFacts) {
        // STATE 2 or STATE 3 — the emitter classifies from found_in_predictor.
        emitExecutabilityTrace(state, debugCtx, objective, gateAdjacent, stagedAdjacent, threshold, debugFacts, false);
    }
    return false;
}

/**
 * REASON-CODE INSTRUMENTATION (topic `axis_reject`) — mutable collector handed
 * into `axisHasExecutableOpeningAttack`. The caller allocates it only when the
 * topic is on, so a default run allocates nothing and takes no extra branch of
 * consequence.
 */
export interface AxisRejectionFactsOut {
    gate_adjacent: number;
    staged_adjacent: number;
    brigades: BrigadePredictionFact[];
}

export type OpeningAttackBlocker =
    | 'participants_below_attack_floor'
    | 'participants_below_assembly_floor'
    | 'no_approach_osid'
    | 'zero_eligible_axis'
    | 'insufficient_donation'
    | 'no_launch_readiness';

export interface OpeningAttackReadinessResult {
    executable: boolean;
    blocker?: OpeningAttackBlocker;
    /**
     * True ONLY when this axis is blocked AND at least one of its
     * executability brigades is literally on the road toward the axis's own
     * approach OSIDs (`isCommittedInTransitTo`).
     *
     * WHY THIS EXISTS (2026-08-12). The multi-axis gate used to infer
     * "brigades are still marching" from `blocker === 'zero_eligible_axis'`.
     * That blocker actually means "no assigned brigade is adjacent to the
     * objective WITH A SUFFICIENT PREDICTED OUTCOME" — which is also true when
     * the brigades have ALREADY ARRIVED and are merely too weak. In that state
     * waiting is futile and self-worsening (ambient morale/cohesion drift makes
     * the prediction monotonically worse every turn), so the operation waited
     * forever for troops that were already standing on the start line.
     * Measured at n206: the veto cost an otherwise-executable operation in 12
     * evaluations across 6 operations, earliest at t1, and `power_ratio` decayed
     * 0.334 -> 0.295 over four turns of waiting.
     */
    approaching?: boolean;
}

function hasAttackFloorParticipant(
    state: GameState,
    brigadeIds: readonly FormationId[],
): boolean {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((brigade.disrupted_turns ?? 0) > 0) continue;
        return true;
    }
    return false;
}

function isAttackFloorParticipant(state: GameState, brigadeId: FormationId): boolean {
    const brigade = state.military.formations?.[brigadeId];
    if (!brigade || brigade.status !== 'active') return false;
    if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
    if ((brigade.disrupted_turns ?? 0) > 0) return false;
    return true;
}

export function resolveOpeningAttackGateBrigades(
    state: GameState,
    axis: Pick<NonNullable<CorpsOperation['axes']>[number], 'main_brigade' | 'assigned_brigades'>,
): FormationId[] {
    const anchor = getAnchorBrigade(axis);
    if (anchor && isAttackFloorParticipant(state, anchor as FormationId)) return [anchor as FormationId];
    return [...axis.assigned_brigades]
        .filter((brigadeId): brigadeId is FormationId => isAttackFloorParticipant(state, brigadeId as FormationId))
        .sort(strictCompare);
}

const RECENT_CATASTROPHIC_OBJECTIVE_MEMORY_TURNS = 4;
const RECENT_CATASTROPHIC_OBJECTIVE_POWER_RATIO_FLOOR = 0.3;

export function hasRecentCatastrophicObjectiveMemory(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    objective: string,
    turn: number,
): boolean {
    const formations = state.military.formations ?? {};
    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[formationId];
        if (!formation || formation.faction !== faction || formation.corps_id !== corpsId) continue;
        if ((formation.kind ?? 'brigade') !== 'brigade' && formation.kind !== 'hv_phantom') continue;
        const engagements = formation.brigade_history?.engagements ?? [];
        for (const engagement of engagements) {
            if (engagement.role !== 'attacker') continue;
            if (engagement.outcome !== 'catastrophic') continue;
            if (engagement.osid !== objective) continue;
            if (typeof engagement.turn !== 'number') continue;
            if (engagement.turn >= turn) continue;
            if (turn - engagement.turn > RECENT_CATASTROPHIC_OBJECTIVE_MEMORY_TURNS) continue;
            return true;
        }
    }
    return false;
}

export function shouldStallAxisForRecentCatastrophicObjective(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    objective: string | undefined,
    brigadeIds: readonly FormationId[],
    adjacency: Map<string, string[]>,
    turn: number,
): boolean {
    if (typeof objective !== 'string' || objective.length === 0) return false;
    if (!hasRecentCatastrophicObjectiveMemory(state, corpsId, faction, objective, turn)) return false;

    let sawPrediction = false;
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.faction !== faction || brigade.status !== 'active') continue;
        if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) continue;
        if ((brigade.disrupted_turns ?? 0) > 0) continue;

        const directObjectiveAttack = predictAllAdjacentTargets(
            state,
            brigadeId,
            adjacency,
            EMPTY_REVERSE_MAP,
            {},
            'attack',
        ).find((target) => target.osid === objective);
        if (!directObjectiveAttack) continue;

        sawPrediction = true;
        const prediction = directObjectiveAttack.prediction;
        if (
            prediction.predicted_outcome !== 'catastrophic'
            || prediction.power_ratio >= RECENT_CATASTROPHIC_OBJECTIVE_POWER_RATIO_FLOOR
        ) {
            return false;
        }
    }

    return sawPrediction;
}

function rankOpeningAttackBlocker(blockers: readonly OpeningAttackBlocker[]): OpeningAttackBlocker {
    if (blockers.length === 0) return 'no_launch_readiness';
    if (blockers.every((blocker) => blocker === 'participants_below_attack_floor')) {
        return 'participants_below_attack_floor';
    }
    if (blockers.every((blocker) => blocker === 'no_approach_osid')) {
        return 'no_approach_osid';
    }
    if (blockers.includes('zero_eligible_axis')) return 'zero_eligible_axis';
    return blockers[0] ?? 'no_launch_readiness';
}

function classifyAxisOpeningAttack(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    axis: NonNullable<CorpsOperation['axes']>[number],
    adjacency: Map<string, string[]>,
    threshold: PredictedOutcome,
    staticAdjacency?: Map<string, string[]>,
    armyHqOpId?: CorpsOperation['army_hq_op_id'],
    // TEMPORARY DIAGNOSTIC — remove with axis_readiness_debug.ts.
    debugOpName?: string,
    predictionContext?: OpeningAttackPredictionContext,
    convergingBrigades?: readonly FormationId[],
): OpeningAttackReadinessResult {
    // REASON-CODE INSTRUMENTATION (topic `axis_reject`): clear any detail from a
    // PREVIOUS evaluation before this one decides anything.
    //
    // WHY, AND THIS WAS A REAL DEFECT CAUGHT IN THE FLAG-ON RUN. The detail is
    // written only on the `zero_eligible_axis` path, but `launch_blocker` is
    // rewritten by every other blocking return here AND by
    // `sector_offensive.ts` (`recent_catastrophic_losses_at_objective`). Without
    // this clear, an axis that failed on `zero_eligible_axis` in week N and on a
    // DIFFERENT blocker in week N+1 carried week N's explanation next to week
    // N+1's verdict — observed on Operation Cerska-Kamenica. A reason code that
    // explains the wrong refusal is worse than none.
    //
    // Unconditional and ungated: deleting an absent key is a no-op, so on a
    // default run — where the key is never written — this changes nothing.
    delete axis.launch_blocker_detail;
    delete axis.launch_readiness_detail;
    const objective = axis.objectives[axis.current_objective_index ?? 0];
    if (typeof objective !== 'string' || objective.length === 0) {
        axis.launch_blocker = 'zero_eligible_axis';
        // `approaching: false` is EXPLICIT, not incidental (determinism review,
        // 2026-08-12). This axis has no current objective, so there is nothing to
        // march toward and nobody can be "still arriving" — it must not hold the
        // whole operation out of execution. Before the in-transit narrowing, this
        // site DID set `anyApproaching` (the caller keyed on the blocker enum, and
        // this returns `zero_eligible_axis`), so the narrowing changed behaviour
        // here as well as at the weak-axis site. Stated outright so the next reader
        // sees a decision rather than an omitted field.
        return { executable: false, blocker: 'zero_eligible_axis', approaching: false };
    }

    const approachOsids = collectObjectiveApproachOsids(state, corpsId, faction, [objective], staticAdjacency);
    if (approachOsids.size === 0) {
        axis.unreachable_at_launch = true;
        axis.launch_blocker = 'no_approach_osid';
        return { executable: false, blocker: 'no_approach_osid' };
    }

    // TG v1 (ADR-0005): when the tactical-group flag is on, the attack-floor
    // gate is anchor-aware (main_brigade or viable assigned fallback).
    // Non-anchor brigades stay in assigned_brigades for downstream combat math
    // (existing main/support_brigades SUPPORT_POWER_MULT path is unchanged in
    // v1); they simply no longer block the planning→execution transition by
    // failing to march to the objective. ENABLE_TACTICAL_GROUPS is now ON
    // (default true), so this hybrid gate/executability split is the active behavior; the
    // current gold hashes reflect it. See src/sim/combat/tactical_group_config.ts.
    const gateBrigades = ENABLE_TACTICAL_GROUPS
        ? resolveOpeningAttackGateBrigades(state, axis)
        : axis.assigned_brigades;

    if (!hasAttackFloorParticipant(state, gateBrigades)) {
        axis.launch_blocker = 'participants_below_attack_floor';
        return { executable: false, blocker: 'participants_below_attack_floor' };
    }

    // TG-CAUSED launch regression fix (operations-expert, 2026-05-30): the anchor-only
    // narrowing above was authored so a non-anchor brigade that fails to march cannot
    // BLOCK the transition. But applying that same narrowing to the EXECUTABILITY check
    // inverts the intent: a single anchor that is not yet at/marching to an
    // objective-adjacent OSID then BLOCKS an axis whose support brigades CAN open the
    // attack — exactly the Cincar/Kupres-94 regression (opportunity ops never set
    // `main_brigade`, so the anchor defaults to authoring-order assigned_brigades[0]
    // = hrhb_kralj_petar_kreimir_iv_brigade, which alone cannot reach op:kupres:bucovaca;
    // n51 188w showed launch_blocker=zero_eligible_axis + unreachable_at_launch with a
    // healthy force_ratio 1.23 and 4 active brigades, vs flag-off SUCCESS capturing all
    // four objectives). The executability check must consider the whole assigned pool —
    // `axisHasExecutableOpeningAttack` already filters each brigade for active/personnel/
    // adjacency internally, so this only RESTORES legacy reachability semantics; it does
    // NOT let a non-anchor brigade gate the floor check (that stays anchor-aware above).
    // Flag-off: `gateBrigades` already equals `assigned_brigades`, so byte-identical.
    const axisExecutabilityBrigades = ENABLE_TACTICAL_GROUPS
        ? axis.assigned_brigades
        : gateBrigades;
    const executabilityBrigades = convergingBrigades && convergingBrigades.length > 0
        ? [...convergingBrigades]
        : axisExecutabilityBrigades;
    const openingAttackAdjacency = buildOpeningAttackAdjacency(
        state,
        corpsId,
        faction,
        objective,
        adjacency,
        staticAdjacency,
    );

    // REASON-CODE INSTRUMENTATION (topic `axis_reject`) — item 3. Allocated only
    // when the topic is on; `undefined` otherwise, which is today's exact call.
    const rejectionFacts: AxisRejectionFactsOut | undefined =
        isReasonCodeTopicEnabled('axis_reject')
            ? { gate_adjacent: 0, staged_adjacent: 0, brigades: [] }
            : undefined;
    const executable = axisHasExecutableOpeningAttack(
        state,
        faction,
        objective,
        executabilityBrigades,
        openingAttackAdjacency,
        threshold,
        // TEMPORARY DIAGNOSTIC — undefined unless a caller supplies the op name.
        debugOpName === undefined ? undefined : { opName: debugOpName, axisId: axis.axis_id },
        rejectionFacts,
        predictionContext,
    );
    if (rejectionFacts) {
        const resultState = executable
            ? 'executable'
            : (rejectionFacts.gate_adjacent <= 0
                ? 'dead_axis'
                : (rejectionFacts.brigades.some((b) => b.found_in_predictor === true)
                    ? 'present_too_weak'
                    : 'not_reachable_from_position'));
        axis.launch_readiness_detail = {
            executable,
            result_state: resultState,
            objective,
            gate_adjacent: rejectionFacts.gate_adjacent,
            staged_adjacent: rejectionFacts.staged_adjacent,
            threshold,
            brigades: [...rejectionFacts.brigades]
                .sort((a, b) => strictCompare(a.id, b.id))
                .map((f) => ({
                    id: f.id,
                    considered: f.considered,
                    skip_reason: f.skip_reason ?? null,
                    found_in_predictor: f.found_in_predictor ?? null,
                    predicted_outcome: f.predicted_outcome ?? null,
                    power_ratio: f.power_ratio ?? null,
                    concentrated_outcome: f.concentrated_outcome ?? null,
                })),
        };
    }
    if (!executable) {
        axis.launch_blocker = 'zero_eligible_axis';
        // REASON-CODE INSTRUMENTATION (topic `axis_reject`) — record WHICH predicate
        // refused, not merely that all of them did. Written after `launch_blocker` so
        // the two always agree, and only under the gate, so a default run neither
        // allocates this object nor writes it into GameState — the save hash is
        // unmoved. Brigade facts are re-sorted by id here: the loop above visits
        // `executabilityBrigades` in engine order, and an artifact must not inherit
        // an ordering promise from a caller.
        if (rejectionFacts) {
            axis.launch_blocker_detail = {
                collapsed_state: axis.launch_readiness_detail?.result_state === 'executable'
                    ? 'present_too_weak'
                    : (axis.launch_readiness_detail?.result_state ?? 'dead_axis'),
                gate_adjacent: rejectionFacts.gate_adjacent,
                staged_adjacent: rejectionFacts.staged_adjacent,
                threshold,
                // Normalised from the probe's optional-field shape to the artifact's
                // required-with-null shape. See `AxisRejectionBrigadeFact`.
                brigades: [...rejectionFacts.brigades]
                    .sort((a, b) => strictCompare(a.id, b.id))
                    .map((f) => ({
                        id: f.id,
                        considered: f.considered,
                        skip_reason: f.skip_reason ?? null,
                        found_in_predictor: f.found_in_predictor ?? null,
                        predicted_outcome: f.predicted_outcome ?? null,
                        power_ratio: f.power_ratio ?? null,
                        concentrated_outcome: f.concentrated_outcome ?? null,
                    })),
            };
        }
        // Distinguish "still marching" from "arrived but too weak". Only the
        // former justifies holding the whole operation (see `approaching` on
        // OpeningAttackReadinessResult). Reuses this axis's OWN approach set and
        // executability pool — "on the road" must mean on the road TO HERE.
        const approaching = executabilityBrigades.some(
            (brigadeId) => isCommittedInTransitTo(state, brigadeId, approachOsids),
        );
        return { executable: false, blocker: 'zero_eligible_axis', approaching };
    }

    // ADR-0005 v2.2c #3: donation-readiness gate. With TG formation on, the anchor must be
    // backed by donors pledging ≥ DONATION_READINESS_FRACTION (60%) of its personnel; otherwise
    // it is a lone-anchor suicide attack and the axis is blocked. selectDonors is recomputed here
    // (deterministic; a donor lost since planning naturally drops out) rather than reading a cached
    // op.donor_pool — functionally the same gate, no persisted schema field. Flag-off: skipped, so
    // byte-identical. The flag-on magnitude (how many ops this blocks) is validated at the 188w smoke.
    if (ENABLE_TG_FORMATION) {
        // Phase 4: score donors against the persistent anchor (phantom-filtered). An
        // all-phantom axis resolves to null → no TG forms there, so the donation gate is
        // moot; skip it (the legacy anchor-only path handles the phantom axis).
        const anchorId = resolveTgAnchor(state, axis, new Set());
        const stagingOsid = axis.staging_osid;
        if (anchorId && stagingOsid) {
            const anchorPersonnel = state.military.formations?.[anchorId]?.personnel ?? 0;
            const donors = selectDonors(state, { anchor_brigade_id: anchorId, staging_osid: stagingOsid, army_hq_op_id: armyHqOpId });
            if (donationReadinessBlocksAxis(donors, anchorPersonnel, faction)) {
                axis.launch_blocker = 'insufficient_donation';
                return { executable: false, blocker: 'insufficient_donation' };
            }
        }
    }

    delete axis.launch_blocker;
    // REASON-CODE INSTRUMENTATION (topic `axis_reject`): the detail must not outlive
    // the blocker it explains. Mirrors the `delete` above exactly. Unconditional
    // because deleting an absent key is a no-op — on a default run the key was never
    // written, so this changes nothing and serializes nothing.
    delete axis.launch_blocker_detail;
    return { executable: true };
}

/**
 * PHASE 1.5 DONOR-READINESS FALLBACK (operations-expert + sector-expert, 2026-05-30).
 *
 * Pure decision for the ADR-0005 v2.2c #3 donation-readiness gate. Returns true iff
 * the gate should BLOCK the axis with `insufficient_donation`.
 *
 * The 60% gate's real intent is to refuse an under-committed *multi-donor* TG (a lone
 * anchor masquerading as a tactical group). It must NEVER cancel an otherwise-valid
 * offensive when the corps simply has NO eligible donors to muster: an isolated /
 * encircled, donor-poor corps (e.g. the ARBiH 5th Corps in the Bihać pocket — no
 * adjacent donor corps; candidates blocked by distance / cohesion / residual-floor)
 * had its anchor-only relief / defensive ops gated out, which dropped the Bihać enclave
 * RBiH→RS wholesale (measured 188w 615→569). With zero donors no TG would form anyway
 * (`formTgsAtReadyTransition` is a no-op with an empty donor pool → legacy lone-anchor
 * combat), so blocking degrades a valid lone-anchor op into a cancellation.
 *
 * Rule:
 *   - donors.length === 0 → DO NOT block (degrade to lone-anchor, exactly as flag-off).
 *   - donors exist but pledge < readinessFraction × anchorPersonnel → BLOCK.
 *
 * Phase 1.6 HVO Mistral-2 westward-reach lever (operations-expert, 2026-05-30): the
 * readiness fraction is faction-specific. HRHB (HVO) axes use the relaxed
 * DONATION_READINESS_FRACTION_HRHB; all other factions use the standard
 * DONATION_READINESS_FRACTION. RATIONALE: the HVO Mistral-2 westward axes (Livno →
 * Drvar/Grahovo/Šipovo) stage for a long reach where BFS distance-falloff trims the few
 * eligible local donors below the 60% floor, so the gate cancelled an axis the flag-off
 * engine prosecuted. Historically the HV (Croatian Army) spearhead — absorbed into the HVO
 * anchor, no separate HV corps in OOB — supplied the westward mass, so a lower local-donor
 * floor is doctrinally correct. This is NOT force inflation (the anchor + qualifying donors
 * still fight at real strength) and NOT a new global gate or distance cap.
 *
 * Deterministic: `selectDonors` is deterministic, so `donors.length === 0` is a stable
 * function of the turn's state. Caller only invokes this under ENABLE_TG_FORMATION, so
 * flag-off never reaches it → byte-identical.
 */
export function donationReadinessBlocksAxis(
    donors: ReadonlyArray<{ personnel_lent: number }>,
    anchorPersonnel: number,
    faction?: FactionId,
): boolean {
    if (donors.length === 0) return false; // donor-poor corps: lone-anchor fallback, never block
    const donated = donors.reduce((sum, d) => sum + d.personnel_lent, 0);
    const readinessFraction = faction === 'HRHB'
        ? DONATION_READINESS_FRACTION_HRHB
        : DONATION_READINESS_FRACTION;
    return donated < readinessFraction * anchorPersonnel;
}

/**
 * Whether an authored operation has assembled the usable formations required
 * by its launch contract. Assembly measures presence and synchronization, not
 * whether every formation independently clears the generic brigade attack floor:
 * early-war enclave formations are deliberately smaller than that floor. The
 * opening-attack predictor remains authoritative for whether their combined
 * force is strong enough against the particular objective.
 */
export function hasMinimumAssembledParticipants(
    state: GameState,
    op: Pick<CorpsOperation, 'participating_brigades' | 'minimum_assembled_participants'>,
): boolean {
    if (op.minimum_assembled_participants == null) return true;
    const required = Math.max(1, Math.trunc(op.minimum_assembled_participants));
    let assembled = 0;
    for (const brigadeId of [...(op.participating_brigades ?? [])].sort(strictCompare)) {
        const brigade = state.military.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        if ((brigade.personnel ?? 0) <= 0) continue;
        if ((brigade.disrupted_turns ?? 0) > 0) continue;
        assembled += 1;
    }
    return assembled >= required;
}

export function evaluateOpeningAttackReadiness(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    op: CorpsOperation,
    staticAdjacency?: Map<string, string[]>,
    predictionContext?: OpeningAttackPredictionContext,
): OpeningAttackReadinessResult {
    if (!hasMinimumAssembledParticipants(state, op)) {
        return { executable: false, blocker: 'participants_below_assembly_floor' };
    }
    const operationStaticAdjacency = op.is_pre_planned === true ? staticAdjacency : undefined;
    const adjacency = buildOsidAdjacencyFromFrontEdges(state);
    if (adjacency.size === 0 && !isMultiAxis(op) && !operationStaticAdjacency) {
        return hasAttackFloorParticipant(state, op.participating_brigades ?? [])
            ? { executable: true }
            : { executable: false, blocker: 'participants_below_attack_floor' };
    }
    const threshold = getPlanningAttackThreshold(op);

    if (isMultiAxis(op) && op.axes) {
        const blockers: OpeningAttackBlocker[] = [];
        let anyExecutable = false;
        // True when any non-terminal axis has brigades ACTUALLY mid-march toward
        // its own approach OSIDs. A fast-assembling sibling must not drag a slow
        // axis into execution before its brigades arrive — hold while someone is
        // genuinely on the road.
        //
        // CHESTERTON'S FENCE, DO NOT REMOVE THIS GATE (commit `263569bfb`,
        // 2026-05-28): it is the ONLY wait-for-the-slow-axis mechanism at the
        // planning->execution transition, because `areParticipantsReadyForExecution`
        // returns on any ONE ready axis. It was added to stop `posavina_flank`
        // dragging `brcko_corridor` into execution mid-march — the Brcko anchor
        // whose hold was bought at `dc66c6fc0`. The 2026-08-12 change NARROWS the
        // trigger (see `approaching` on OpeningAttackReadinessResult); it does not
        // remove the wait. Brcko is safe there BY MEASUREMENT, not by construction
        // (code review, 2026-08-12 — the original wording overclaimed): anchors
        // 31/31 with `op:brcko:brcko` PASS and the corridor at 6/6 + 7/7 in the
        // 188w run. The construction guarantees nothing on its own, because
        // `approaching` tests membership in the FRIENDLY-FILTERED `approachOsids`
        // while the executability gate counts the wider
        // `liveAdjacency ∪ approachOsids`. A brigade in transit to a tile the gate
        // counts but which is enemy-held would read as not-approaching and release
        // the veto mid-march. KNOWN GAP, not yet fixed — the remedy is to compute
        // `approaching` against `objectiveAdjacentOsids(openingAttackAdjacency,
        // objective)` instead, which is already in scope. Needs its own 188w.
        // Re-measure Brcko if this gate is touched again.
        let anyApproaching = false;
        for (const axis of op.axes) {
            if (axis.status === 'complete' || axis.status === 'stalled') continue;
            const objective = axis.objectives[axis.current_objective_index ?? 0];
            const convergingBrigades = typeof objective === 'string'
                ? getOperationBrigadesAtCurrentObjective(op, objective)
                : axis.assigned_brigades;
            const result = classifyAxisOpeningAttack(
                state,
                corpsId,
                faction,
                axis,
                adjacency,
                threshold,
                operationStaticAdjacency,
                op.army_hq_op_id,
                op.name,
                predictionContext,
                convergingBrigades,
            );
            // TEMPORARY DIAGNOSTIC — see src/sim/combat/axis_readiness_debug.ts. Inert
            // unless AWWV_DEBUG_AXIS_READINESS is set; remove with that file.
            emitAxisReadinessTrace(state, corpsId, op, axis, result.executable, result.blocker);
            if (result.executable) {
                anyExecutable = true;
            } else {
                if (result.blocker) blockers.push(result.blocker);
                if (result.approaching === true) anyApproaching = true;
            }
        }
        // TEMPORARY DIAGNOSTIC — see src/sim/combat/axis_readiness_debug.ts.
        emitOperationReadinessTrace(state, corpsId, op, anyExecutable, anyApproaching);
        if (anyExecutable && !anyApproaching) return { executable: true };
        return { executable: false, blocker: rankOpeningAttackBlocker(blockers) };
    }

    const objective = op.objectives?.[op.current_objective_index ?? 0];
    if (typeof objective !== 'string' || objective.length === 0) {
        return { executable: false, blocker: 'zero_eligible_axis' };
    }
    const approachOsids = collectObjectiveApproachOsids(state, corpsId, faction, [objective], operationStaticAdjacency);
    if (approachOsids.size === 0) {
        return { executable: false, blocker: 'no_approach_osid' };
    }
    if (!hasAttackFloorParticipant(state, op.participating_brigades ?? [])) {
        return { executable: false, blocker: 'participants_below_attack_floor' };
    }
    const openingAttackAdjacency = buildOpeningAttackAdjacency(
        state,
        corpsId,
        faction,
        objective,
        adjacency,
        operationStaticAdjacency,
    );
    const singleAxisFacts: AxisRejectionFactsOut | undefined =
        isReasonCodeTopicEnabled('axis_reject')
            ? { gate_adjacent: 0, staged_adjacent: 0, brigades: [] }
            : undefined;
    const singleAxisExecutable = axisHasExecutableOpeningAttack(
        state,
        faction,
        objective,
        op.participating_brigades ?? [],
        openingAttackAdjacency,
        threshold,
        undefined,
        singleAxisFacts,
        predictionContext,
    );
    const representedAxis = op.axes?.[0];
    if (representedAxis) {
        delete representedAxis.launch_readiness_detail;
        if (singleAxisFacts) {
            representedAxis.launch_readiness_detail = {
                executable: singleAxisExecutable,
                result_state: singleAxisExecutable
                    ? 'executable'
                    : (singleAxisFacts.gate_adjacent <= 0
                        ? 'dead_axis'
                        : (singleAxisFacts.brigades.some((b) => b.found_in_predictor === true)
                            ? 'present_too_weak'
                            : 'not_reachable_from_position')),
                objective,
                gate_adjacent: singleAxisFacts.gate_adjacent,
                staged_adjacent: singleAxisFacts.staged_adjacent,
                threshold,
                brigades: [...singleAxisFacts.brigades]
                    .sort((a, b) => strictCompare(a.id, b.id))
                    .map((fact) => ({
                        id: fact.id,
                        considered: fact.considered,
                        skip_reason: fact.skip_reason ?? null,
                        found_in_predictor: fact.found_in_predictor ?? null,
                        predicted_outcome: fact.predicted_outcome ?? null,
                        power_ratio: fact.power_ratio ?? null,
                        concentrated_outcome: fact.concentrated_outcome ?? null,
                    })),
            };
        }
    }
    return singleAxisExecutable
        ? { executable: true }
        : { executable: false, blocker: 'zero_eligible_axis' };
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
