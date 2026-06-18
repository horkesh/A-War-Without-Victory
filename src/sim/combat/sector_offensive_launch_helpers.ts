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
import { predictAllAdjacentTargets, type PredictedOutcome } from './combat_predictor.js';
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

// BATCH C: launch-readiness probes call `predictAllAdjacentTargets(...)` only
// to query whether the brigade has a direct-objective adjacency entry; they do
// not consult the canonical-controller fallback that the reverse map drives in
// `getPoliticalControllerOSID`. An empty map is runtime-identical to passing
// `undefined` to that optional `operationalToCanonical` parameter (Map.get
// returns undefined → null fallback). Replaces the prior placeholder cast.
const EMPTY_REVERSE_MAP: OperationalToCanonicalReverseMap = new Map();

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

function addUndirectedAdjacencyEdge(
    adjacency: Map<string, string[]>,
    a: string,
    b: string,
): void {
    const addOneWay = (from: string, to: string): void => {
        const existing = adjacency.get(from) ?? [];
        if (existing.includes(to)) return;
        adjacency.set(from, [...existing, to].sort(strictCompare));
    };
    addOneWay(a, b);
    addOneWay(b, a);
}

export function buildOpeningAttackAdjacency(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    objective: string,
    liveAdjacency: Map<string, string[]>,
    staticAdjacency?: Map<string, string[]>,
): Map<string, string[]> {
    const approachOsids = collectObjectiveApproachOsids(state, corpsId, faction, [objective], staticAdjacency);
    if (approachOsids.size === 0) return liveAdjacency;

    const liveAdjacent = objectiveAdjacentOsids(liveAdjacency, objective);
    const missingApproach = [...approachOsids].some((approach) => !liveAdjacent.has(approach));
    if (!missingApproach) return liveAdjacency;

    const merged = new Map<string, string[]>();
    for (const [osid, neighbors] of liveAdjacency) {
        merged.set(osid, [...neighbors].sort(strictCompare));
    }
    for (const approach of [...approachOsids].sort(strictCompare)) {
        addUndirectedAdjacencyEdge(merged, objective, approach);
    }
    return merged;
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
            EMPTY_REVERSE_MAP,
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

export type OpeningAttackBlocker =
    | 'participants_below_attack_floor'
    | 'no_approach_osid'
    | 'zero_eligible_axis'
    | 'insufficient_donation'
    | 'no_launch_readiness';

export interface OpeningAttackReadinessResult {
    executable: boolean;
    blocker?: OpeningAttackBlocker;
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
        if ((formation.kind ?? 'brigade') !== 'brigade') continue;
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
): OpeningAttackReadinessResult {
    const objective = axis.objectives[axis.current_objective_index ?? 0];
    if (typeof objective !== 'string' || objective.length === 0) {
        axis.launch_blocker = 'zero_eligible_axis';
        return { executable: false, blocker: 'zero_eligible_axis' };
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
    const executabilityBrigades = ENABLE_TACTICAL_GROUPS
        ? axis.assigned_brigades
        : gateBrigades;
    const openingAttackAdjacency = buildOpeningAttackAdjacency(
        state,
        corpsId,
        faction,
        objective,
        adjacency,
        staticAdjacency,
    );

    if (!axisHasExecutableOpeningAttack(
        state,
        faction,
        objective,
        executabilityBrigades,
        openingAttackAdjacency,
        threshold,
    )) {
        axis.launch_blocker = 'zero_eligible_axis';
        return { executable: false, blocker: 'zero_eligible_axis' };
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

export function evaluateOpeningAttackReadiness(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    op: CorpsOperation,
    staticAdjacency?: Map<string, string[]>,
): OpeningAttackReadinessResult {
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
        // True when any non-terminal axis has brigades mid-march (zero_eligible_axis).
        // A fast-assembling sibling must not drag a slow axis into execution before
        // its brigades reach the objective — hold until all axes are adjacent.
        let anyApproaching = false;
        for (const axis of op.axes) {
            if (axis.status === 'complete' || axis.status === 'stalled') continue;
            const result = classifyAxisOpeningAttack(state, corpsId, faction, axis, adjacency, threshold, operationStaticAdjacency, op.army_hq_op_id);
            if (result.executable) {
                anyExecutable = true;
            } else {
                if (result.blocker) blockers.push(result.blocker);
                if (result.blocker === 'zero_eligible_axis') anyApproaching = true;
            }
        }
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
    return axisHasExecutableOpeningAttack(
        state,
        faction,
        objective,
        op.participating_brigades ?? [],
        openingAttackAdjacency,
        threshold,
    )
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
