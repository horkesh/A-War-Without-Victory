/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Command intent reconciliation (pre-T3) and repair (T6)
 * DOMAIN:    March correction — reconciles proved stale operation intent and repairs invalid destinations
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Pre-T3 command ownership may replace one proved stale operation destination;
 *            T6 repair may correct a destination outside its assigned sub-segment
 * WRITES:    brigade_movement_orders (recomputed BFS path), deletes invalid movement_state
 * READS:     assigned_sub_segment_id → sub-segment friendly_osids, current march destination
 * MUST NOT:  issue new strategic intent — only fix march destinations that violate T1 assignment
 *
 * UPSTREAM:  commander_loop.ts (T1 sets assigned_sub_segment_id as authority)
 * DOWNSTREAM: osid_column_movement.ts (executes corrected march), brigade_movement_orders.ts
 *
 * TRUTH INVARIANTS:
 * - assigned_sub_segment_id is live authority, not harmless residue (napkin 2026-04-03)
 * - Respects connected-component boundaries (principle #2 — no cross-component correction)
 * - Runs after generate-bot-corps-orders and Phase B (distribute-brigades-to-front)
 *
 * MOVEMENT TIERS: T2 command-owner reconciliation before T3 consumption; unchanged T6 repair
 *                 (March Correction) (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Commander march correction — overrides wrong-destination march orders.
 *
 * The corps commander is the authority on where brigades should be.
 * Each brigade has assigned_sub_segment_id. Its valid destinations are
 * that sub-segment's friendly_osids. Any march order pointing outside
 * that set is overridden here.
 *
 * Runs after generate-bot-corps-orders, after Phase B (distribute-brigades-to-front).
 * The commander sees everything and corrects wrong orders.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no timestamps.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { bfsDistance } from './sector_utils.js';
import { strictCompare } from '../../state/validateGameState.js';
import { createColumnMovementOrder } from './brigade_movement_order_helpers.js';
import {
    isDestinationInRoutineScope,
    isDestinationAuthorizedByOperation,
    isMovementAuthorizedByCorpsReassignment,
    resolveRoutineMovementScope,
} from './brigade_routine_scope.js';
import { getSectorOffensiveApproachOsids } from './operation_approach_osids.js';
import { findNearestFriendlyOsidDestination } from './bot_brigade_context.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import type { Osid } from './osid_adjacency.js';
import {
    emitReconciliationWriteRecord,
    isReasonCodeTopicEnabled,
    sortedIds,
} from './reason_code_debug.js';

const RECONCILIATION_GUARDS = [
    'order_present',
    'formation_present',
    'formation_eligible',
    'owner_column',
    'active_transit_absent',
    'reserve_membership_absent',
    'destination_present',
    'location_present',
    'effective_corps_present',
    'unique_membership',
    'membership_host_matches_effective_corps',
    'participating',
    'operation_phase_active',
    'unique_axis',
    'destination_not_staging',
    'destination_not_operation_authorized',
    'destination_not_reassignment_authorized',
    'destination_not_routine_authorized',
    'prior_objective_unique',
    'current_index_after_prior',
    'current_index_in_range',
    'capture_prefix_complete',
    'prior_objective_friendly',
    'approaches_nonempty',
    'replacement_present',
    'replacement_changed',
    'replacement_in_approaches',
    'replacement_authorized',
] as const;

type ReconciliationGuard = typeof RECONCILIATION_GUARDS[number];
type ReconciliationObserver = {
    turn: number;
    candidate_ordinal: number;
    brigade_id: string;
    guards: Record<ReconciliationGuard, boolean | 'NOT_REACHED'>;
    old_order: Record<string, unknown> | null;
    [key: string]: unknown;
};

function movementOrderTuple(order: NonNullable<GameState['military']['brigade_movement_orders']>[string] | undefined): Record<string, unknown> | null {
    if (!order) return null;
    return {
        owner: order.owner ?? null,
        stance: order.stance ?? null,
        destination_sids: [...(order.destination_sids ?? [])],
    };
}

function beginReconciliationCandidate(
    turn: number,
    candidateOrdinal: number,
    brigadeId: string,
    order: NonNullable<GameState['military']['brigade_movement_orders']>[string] | undefined,
): ReconciliationObserver {
    return {
        turn,
        candidate_ordinal: candidateOrdinal,
        brigade_id: brigadeId,
        guards: Object.fromEntries(RECONCILIATION_GUARDS.map((guard) => [guard, 'NOT_REACHED'])) as ReconciliationObserver['guards'],
        old_order: movementOrderTuple(order),
    };
}

function finishReconciliationCandidate(observer: ReconciliationObserver, actualExit: string): void {
    emitReconciliationWriteRecord({
        kind: 'candidate_terminal',
        actual_exit: actualExit,
        ...observer,
    });
}

/**
 * Reconcile a pending operation march that still targets a proved-completed objective.
 *
 * This is a command-owner prepass for T3. It does not create strategic intent: a candidate
 * must carry the exact live operation, axis, loan and completed-prefix proof described below.
 * Every ambiguous or independently authorized order is preserved.
 */
export function reconcileStaleOperationMarchOrders(
    state: GameState,
    adjacency: Map<string, string[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): void {
    const formations = state.military.formations ?? {};
    const orders = state.military.brigade_movement_orders;
    const observe = isReasonCodeTopicEnabled('reconciliation_write');
    const turn = state.meta?.turn ?? 0;
    if (observe) {
        emitReconciliationWriteRecord({
            kind: 'call_start',
            turn,
            order_count: orders ? Object.keys(orders).length : 0,
        });
    }
    if (!orders) {
        if (observe) emitReconciliationWriteRecord({ kind: 'call_terminal', turn, actual_exit: 'no_orders', candidate_count: 0 });
        return;
    }

    const orderedBrigadeIds = Object.keys(orders).sort(strictCompare);
    for (let candidateOrdinal = 0; candidateOrdinal < orderedBrigadeIds.length; candidateOrdinal += 1) {
        const brigadeId = orderedBrigadeIds[candidateOrdinal]!;
        const order = orders[brigadeId];
        const formation = formations[brigadeId];
        const observer = observe ? beginReconciliationCandidate(turn, candidateOrdinal, brigadeId, order) : undefined;
        if (observer) observer.guards.order_present = order != null;
        if (!order) { if (observer) finishReconciliationCandidate(observer, 'order_missing'); continue; }
        if (observer) observer.guards.formation_present = formation != null;
        if (!formation) { if (observer) finishReconciliationCandidate(observer, 'formation_missing'); continue; }
        const formationEligible = isEligibleOperationFormation(formation);
        if (observer) observer.guards.formation_eligible = formationEligible;
        if (!formationEligible) { if (observer) finishReconciliationCandidate(observer, 'formation_ineligible'); continue; }
        const ownerColumn = order.owner === 'bot_discretionary' && order.stance === 'column';
        if (observer) observer.guards.owner_column = ownerColumn;
        if (!ownerColumn) { if (observer) finishReconciliationCandidate(observer, 'order_owner_or_stance'); continue; }
        const activeTransitAbsent = !state.military.brigade_movement_state?.[brigadeId];
        if (observer) observer.guards.active_transit_absent = activeTransitAbsent;
        if (!activeTransitAbsent) { if (observer) finishReconciliationCandidate(observer, 'active_transit'); continue; }
        const reserveMembershipAbsent = !Object.values(state.military.corps_front_sectors ?? {})
            .some((sector) => sector.reserve_brigade_ids?.includes(brigadeId as FormationId));
        if (observer) observer.guards.reserve_membership_absent = reserveMembershipAbsent;
        if (!reserveMembershipAbsent) { if (observer) finishReconciliationCandidate(observer, 'reserve_membership'); continue; }

        const destination = order.destination_sids?.[0];
        const location = formation.location_osid;
        if (observer) observer.guards.destination_present = Boolean(destination);
        if (!destination) { if (observer) finishReconciliationCandidate(observer, 'destination_missing'); continue; }
        if (observer) observer.guards.location_present = Boolean(location);
        if (!location) { if (observer) finishReconciliationCandidate(observer, 'location_missing'); continue; }

        const loan = formation.elite_loan_state;
        const effectiveCorps = loan?.on_loan ? loan.loaned_to_corps : formation.corps_id;
        if (observer) {
            observer.loan = loan ? {
                on_loan: loan.on_loan,
                loaned_to_corps: loan.loaned_to_corps ?? null,
            } : null;
            observer.effective_corps = effectiveCorps ?? null;
            observer.location = location;
            observer.destination = destination;
            observer.guards.effective_corps_present = Boolean(effectiveCorps);
        }
        if (!effectiveCorps) { if (observer) finishReconciliationCandidate(observer, 'effective_corps_missing'); continue; }
        const memberships: Array<{
            hostCorpsId: string;
            operation: CorpsOperation;
            axes: OperationAxis[];
            participating: boolean;
        }> = [];
        const commands = state.military.corps_command ?? {};
        for (const hostCorpsId of Object.keys(commands).sort(strictCompare)) {
            for (const operation of commands[hostCorpsId]?.active_operations ?? []) {
                const axes = (operation.axes ?? []).filter((axis) =>
                    axis.assigned_brigades.includes(brigadeId as FormationId));
                const participating = operation.participating_brigades.includes(brigadeId as FormationId);
                if (participating || axes.length > 0) {
                    memberships.push({ hostCorpsId, operation, axes, participating });
                }
            }
        }
        if (observer) {
            observer.memberships = memberships.map((entry) => ({
                host_corps_id: entry.hostCorpsId,
                operation: {
                    name: entry.operation.name,
                    type: entry.operation.type,
                    phase: entry.operation.phase,
                    started_turn: entry.operation.started_turn,
                },
                participating: entry.participating,
                axes: entry.axes.map((candidateAxis) => ({
                    axis_id: candidateAxis.axis_id,
                    current_objective_index: candidateAxis.current_objective_index,
                    objective_capture_count: candidateAxis.objective_capture_count,
                })).sort((a, b) => strictCompare(a.axis_id, b.axis_id)),
            })).sort((a, b) => strictCompare(a.host_corps_id, b.host_corps_id)
                || strictCompare(a.operation.name, b.operation.name));
            observer.guards.unique_membership = memberships.length === 1;
        }
        if (memberships.length !== 1) { if (observer) finishReconciliationCandidate(observer, 'membership_count'); continue; }
        const membership = memberships[0]!;
        const hostMatches = membership.hostCorpsId === effectiveCorps;
        if (observer) observer.guards.membership_host_matches_effective_corps = hostMatches;
        if (!hostMatches) { if (observer) finishReconciliationCandidate(observer, 'membership_host'); continue; }
        if (observer) observer.guards.participating = membership.participating;
        if (!membership.participating) { if (observer) finishReconciliationCandidate(observer, 'not_participating'); continue; }
        const operation = membership.operation;
        const activePhase = operation.phase === 'planning' || operation.phase === 'execution';
        if (observer) observer.guards.operation_phase_active = activePhase;
        if (!activePhase) { if (observer) finishReconciliationCandidate(observer, 'operation_phase'); continue; }
        const axes = membership.axes;
        if (observer) observer.guards.unique_axis = axes.length === 1;
        if (axes.length !== 1) { if (observer) finishReconciliationCandidate(observer, 'axis_count'); continue; }
        const axis = axes[0]!;
        if (observer) {
            observer.selected_operation = {
                name: operation.name,
                type: operation.type,
                phase: operation.phase,
                started_turn: operation.started_turn,
            };
            observer.selected_axis = {
                axis_id: axis.axis_id,
                objectives: [...axis.objectives],
                current_objective_index: axis.current_objective_index,
                objective_capture_count: axis.objective_capture_count,
                staging_osid: axis.staging_osid ?? null,
            };
        }

        const destinationNotStaging = axis.staging_osid !== destination;
        if (observer) observer.guards.destination_not_staging = destinationNotStaging;
        if (!destinationNotStaging) { if (observer) finishReconciliationCandidate(observer, 'staging_destination'); continue; }
        const destinationOperationAuthorized = isDestinationAuthorizedByOperation(state, brigadeId, destination, adjacency, reverseMap);
        if (observer) observer.guards.destination_not_operation_authorized = !destinationOperationAuthorized;
        if (destinationOperationAuthorized) { if (observer) finishReconciliationCandidate(observer, 'operation_authorized_destination'); continue; }
        const destinationReassignmentAuthorized = isMovementAuthorizedByCorpsReassignment(state, formation, destination, adjacency, reverseMap);
        if (observer) observer.guards.destination_not_reassignment_authorized = !destinationReassignmentAuthorized;
        if (destinationReassignmentAuthorized) { if (observer) finishReconciliationCandidate(observer, 'reassignment_authorized_destination'); continue; }
        const routineScope = resolveRoutineMovementScope(state, formation, 'routing');
        const destinationRoutineAuthorized = routineScope.restricted && isDestinationInRoutineScope(routineScope, destination);
        if (observer) observer.guards.destination_not_routine_authorized = !destinationRoutineAuthorized;
        if (destinationRoutineAuthorized) { if (observer) finishReconciliationCandidate(observer, 'routine_authorized_destination'); continue; }

        const priorMatches = axis.objectives.reduce<number[]>((matches, objective, index) => {
            if (objective === destination) matches.push(index);
            return matches;
        }, []);
        if (observer) observer.guards.prior_objective_unique = priorMatches.length === 1;
        if (priorMatches.length !== 1) { if (observer) finishReconciliationCandidate(observer, 'prior_objective_count'); continue; }
        const priorIndex = priorMatches[0]!;
        const currentIndex = axis.current_objective_index;
        const currentAfterPrior = currentIndex > priorIndex;
        if (observer) observer.guards.current_index_after_prior = currentAfterPrior;
        if (!currentAfterPrior) { if (observer) finishReconciliationCandidate(observer, 'current_not_after_prior'); continue; }
        const currentInRange = currentIndex < axis.objectives.length;
        if (observer) observer.guards.current_index_in_range = currentInRange;
        if (!currentInRange) { if (observer) finishReconciliationCandidate(observer, 'current_index_out_of_range'); continue; }
        const capturePrefixComplete = axis.objective_capture_count >= currentIndex;
        if (observer) observer.guards.capture_prefix_complete = capturePrefixComplete;
        if (!capturePrefixComplete) { if (observer) finishReconciliationCandidate(observer, 'capture_prefix_incomplete'); continue; }
        const oldController = getPoliticalControllerOSID(state, destination, reverseMap);
        const priorFriendly = isFriendlyFaction(oldController, formation.faction, state);
        if (observer) {
            observer.old_controller = oldController ?? null;
            observer.guards.prior_objective_friendly = priorFriendly;
        }
        if (!priorFriendly) { if (observer) finishReconciliationCandidate(observer, 'prior_objective_not_friendly'); continue; }

        const currentObjective = axis.objectives[currentIndex]!;
        const currentAxis = {
            ...axis,
            objectives: [currentObjective],
            current_objective_index: 0,
            preserve_objective_sequence: true,
        };
        const currentObjectiveOperation = {
            ...operation,
            axes: (operation.axes ?? []).map((candidateAxis) =>
                candidateAxis === axis ? currentAxis : candidateAxis),
        };
        const approaches = getSectorOffensiveApproachOsids(
            state,
            currentObjectiveOperation,
            formation.faction,
            adjacency as Map<Osid, Osid[]>,
            reverseMap,
            brigadeId as FormationId,
        );
        if (observer) {
            observer.approaches = sortedIds([...approaches]);
            observer.guards.approaches_nonempty = approaches.size > 0;
        }
        if (approaches.size === 0) { if (observer) finishReconciliationCandidate(observer, 'approaches_empty'); continue; }
        const replacement = findNearestFriendlyOsidDestination(
            state,
            formation.faction as FactionId,
            location as Osid,
            adjacency as Map<Osid, Osid[]>,
            reverseMap,
            approaches,
        );
        if (observer) {
            observer.replacement = replacement ?? null;
            observer.guards.replacement_present = Boolean(replacement);
        }
        if (!replacement) { if (observer) finishReconciliationCandidate(observer, 'replacement_missing'); continue; }
        const replacementChanged = replacement !== destination;
        if (observer) observer.guards.replacement_changed = replacementChanged;
        if (!replacementChanged) { if (observer) finishReconciliationCandidate(observer, 'replacement_unchanged'); continue; }
        const replacementInApproaches = approaches.has(replacement);
        if (observer) observer.guards.replacement_in_approaches = replacementInApproaches;
        if (!replacementInApproaches) { if (observer) finishReconciliationCandidate(observer, 'replacement_not_approach'); continue; }
        const replacementAuthorized = isDestinationAuthorizedByOperation(state, brigadeId, replacement, adjacency, reverseMap);
        if (observer) observer.guards.replacement_authorized = replacementAuthorized;
        if (!replacementAuthorized) { if (observer) finishReconciliationCandidate(observer, 'replacement_not_authorized'); continue; }

        if (observer) observer.immediate_before_write = movementOrderTuple(orders[brigadeId]);
        orders[brigadeId] = {
            ...order,
            ...createColumnMovementOrder(replacement),
            owner: order.owner,
        };
        if (observer) {
            observer.new_order = movementOrderTuple(orders[brigadeId]);
            observer.actual_after_write = movementOrderTuple(orders[brigadeId]);
            finishReconciliationCandidate(observer, 'replaced');
        }
    }
    if (observe) emitReconciliationWriteRecord({
        kind: 'call_terminal',
        turn,
        actual_exit: 'completed',
        candidate_count: orderedBrigadeIds.length,
    });
}

export function correctMarchOrders(state: GameState, adjacency: Map<string, string[]>): void {
    const formations = state.military.formations ?? {};
    const moveOrders = state.military.brigade_movement_orders ?? {};
    const moveStates = state.military.brigade_movement_state ?? {};

    // Build friendly OSID set per faction for BFS pathing
    const friendlyByFaction = new Map<FactionId, Set<string>>();
    const pc = state.political?.political_controllers ?? {};
    for (const [osid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        let s = friendlyByFaction.get(controller);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(controller, s); }
        s.add(osid);
    }

    for (const [bid, f] of Object.entries(formations).sort(([a], [b]) => strictCompare(a, b))) {
        if (!f || f.status === 'inactive') continue;
        // Shared authority decision: only a valid assigned sub-segment restricts routine scope.
        const scope = resolveRoutineMovementScope(state, f, 'correction');
        if (!scope.restricted) continue;
        const frontOsids = scope.destinations;

        const loc = f.location_osid;
        if (!loc) continue;

        // Being on the assigned front only proves the current location is valid;
        // a stale order can still drag the brigade away next turn.
        const atAssignedFront = frontOsids.has(loc);

        // Check if there's a march order pointing to wrong destination
        const order = moveOrders[bid];
        if (!order) continue;
        const dest = order.destination_sids?.[0];
        if (!dest) continue;
        if (frontOsids.has(dest)) continue; // Destination already correct
        if (isDestinationAuthorizedByOperation(state, bid, dest, adjacency)
            || isMovementAuthorizedByCorpsReassignment(state, f, dest, adjacency)) continue;
        if (atAssignedFront) {
            delete state.military.brigade_movement_orders?.[bid];
            continue;
        }

        // Wrong destination — find nearest front OSID by BFS and override
        const factionFriendly = friendlyByFaction.get(f.faction);
        const sortedFrontOsids = [...frontOsids].sort(strictCompare);

        let bestOsid = sortedFrontOsids[0]!;
        let bestDist = bfsDistance(loc, bestOsid, adjacency, factionFriendly);

        for (const osid of sortedFrontOsids.slice(1)) {
            const d = bfsDistance(loc, osid, adjacency, factionFriendly);
            if (d < bestDist || (d === bestDist && strictCompare(osid, bestOsid) < 0)) {
                bestDist = d;
                bestOsid = osid;
            }
        }

        if (bestDist === Infinity) continue; // Unreachable — leave order as-is

        // Override the march order
        if (!state.military.brigade_movement_orders) state.military.brigade_movement_orders = {};
        state.military.brigade_movement_orders[bid] = createColumnMovementOrder(bestOsid);
    }
}

/**
 * Cancel in-transit movement states whose destination falls outside the brigade's
 * assigned sub-segment friendly_osids, then issue a corrected march order.
 *
 * Must run AFTER correctMarchOrders so the new order is set in the same pass.
 * osid-column-movement (step 576) runs the NEXT turn and will consume the new order.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no timestamps.
 */
export function correctTransitStates(state: GameState, adjacency: Map<string, string[]>): void {
    const formations = state.military.formations ?? {};
    const moveStates = state.military.brigade_movement_state ?? {};

    // Build friendly OSID set per faction for BFS pathing
    const friendlyByFaction = new Map<string, Set<string>>();
    const pc = state.political?.political_controllers ?? {};
    for (const [osid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        let s = friendlyByFaction.get(controller);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(controller, s); }
        s.add(osid);
    }

    for (const [bid, f] of Object.entries(formations).sort(([a], [b]) => strictCompare(a, b))) {
        if (!f || f.status === 'inactive') continue;
        const scope = resolveRoutineMovementScope(state, f, 'correction');
        if (!scope.restricted) continue;
        const frontOsids = scope.destinations;

        // Only act on brigades currently in transit
        const transitState = moveStates[bid];
        if (!transitState || transitState.status !== 'in_transit') continue;

        // Dated historical concentrations can begin while their operation is
        // still queued behind another authored operation. They outrank the
        // brigade's routine front assignment until that concentration ends.
        if (transitState.owner === 'authored_preplanned') continue;

        const loc = f.location_osid;
        if (!loc) continue;

        const transitDest = transitState.destination_sids?.[0];
        if (!transitDest) continue;
        const brigadeAlreadyAtValidFront = frontOsids.has(loc);
        if (frontOsids.has(transitDest)) {
            // Destination is in assigned front OSIDs, but check if it is now an isolated island.
            // A corridor collapse can leave the destination with 0 friendly-controlled neighbors;
            // continuing transit would strand the brigade on an unreachable island.
            const destNeighbors = adjacency.get(transitDest) ?? [];
            const destIsIsolated = !destNeighbors.some(n => pc[n] === f.faction);
            if (!destIsIsolated) continue; // Destination is reachable — leave transit intact
            // Destination became isolated — fall through to cancel + re-route below
        }

        // Wrong transit destination — cancel transit state first, then issue corrected order
        if (
            brigadeAlreadyAtValidFront
            && !frontOsids.has(transitDest)
            && (isDestinationAuthorizedByOperation(state, bid, transitDest, adjacency)
                || isMovementAuthorizedByCorpsReassignment(state, f, transitDest, adjacency))
        ) {
            continue;
        }

        if (brigadeAlreadyAtValidFront && !frontOsids.has(transitDest)) {
            delete moveStates[bid];
            delete state.military.brigade_movement_orders?.[bid];
            continue;
        }

        delete moveStates[bid];
        if (state.military.brigade_movement_orders?.[bid]) {
            delete state.military.brigade_movement_orders[bid];
        }

        // If the brigade is already sitting on one of its valid front OSIDs, the truthful
        // correction is to stop the stale transit and hold the current line position.
        if (brigadeAlreadyAtValidFront) continue;

        const factionFriendly = friendlyByFaction.get(f.faction);
        const sortedFrontOsids = [...frontOsids].sort(strictCompare);

        let bestOsid = sortedFrontOsids[0]!;
        let bestDist = bfsDistance(loc, bestOsid, adjacency, factionFriendly);

        for (const osid of sortedFrontOsids.slice(1)) {
            const d = bfsDistance(loc, osid, adjacency, factionFriendly);
            if (d < bestDist || (d === bestDist && strictCompare(osid, bestOsid) < 0)) {
                bestDist = d;
                bestOsid = osid;
            }
        }

        if (bestDist === Infinity) continue; // Unreachable — leave cancelled, no new order

        // Issue corrected march order (consumed by osid-column-movement next turn)
        if (!state.military.brigade_movement_orders) state.military.brigade_movement_orders = {};
        state.military.brigade_movement_orders[bid] = createColumnMovementOrder(bestOsid);
    }
}
