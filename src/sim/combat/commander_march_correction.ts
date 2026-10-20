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
    if (!orders) return;

    for (const brigadeId of Object.keys(orders).sort(strictCompare)) {
        const order = orders[brigadeId];
        const formation = formations[brigadeId];
        if (!order || !formation || !isEligibleOperationFormation(formation)) continue;
        if (order.owner !== 'bot_discretionary' || order.stance !== 'column') continue;
        if (state.military.brigade_movement_state?.[brigadeId]) continue;
        if (Object.values(state.military.corps_front_sectors ?? {})
            .some((sector) => sector.reserve_brigade_ids?.includes(brigadeId as FormationId))) continue;

        const destination = order.destination_sids?.[0];
        const location = formation.location_osid;
        if (!destination || !location) continue;

        const loan = formation.elite_loan_state;
        const effectiveCorps = loan?.on_loan ? loan.loaned_to_corps : formation.corps_id;
        if (!effectiveCorps) continue;
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
        if (memberships.length !== 1) continue;
        const membership = memberships[0]!;
        if (membership.hostCorpsId !== effectiveCorps || !membership.participating) continue;
        const operation = membership.operation;
        if (operation.phase !== 'planning' && operation.phase !== 'execution') continue;
        const axes = membership.axes;
        if (axes.length !== 1) continue;
        const axis = axes[0]!;

        if (axis.staging_osid === destination) continue;
        if (isDestinationAuthorizedByOperation(state, brigadeId, destination, adjacency, reverseMap)) continue;
        if (isMovementAuthorizedByCorpsReassignment(state, formation, destination, adjacency, reverseMap)) continue;
        const routineScope = resolveRoutineMovementScope(state, formation, 'routing');
        if (routineScope.restricted && isDestinationInRoutineScope(routineScope, destination)) continue;

        const priorMatches = axis.objectives.reduce<number[]>((matches, objective, index) => {
            if (objective === destination) matches.push(index);
            return matches;
        }, []);
        if (priorMatches.length !== 1) continue;
        const priorIndex = priorMatches[0]!;
        const currentIndex = axis.current_objective_index;
        if (currentIndex <= priorIndex || currentIndex >= axis.objectives.length) continue;
        if (axis.objective_capture_count < currentIndex) continue;
        const oldController = getPoliticalControllerOSID(state, destination, reverseMap);
        if (!isFriendlyFaction(oldController, formation.faction, state)) continue;

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
        if (approaches.size === 0) continue;
        const replacement = findNearestFriendlyOsidDestination(
            state,
            formation.faction as FactionId,
            location as Osid,
            adjacency as Map<Osid, Osid[]>,
            reverseMap,
            approaches,
        );
        if (!replacement || replacement === destination || !approaches.has(replacement)) continue;
        if (!isDestinationAuthorizedByOperation(state, brigadeId, replacement, adjacency, reverseMap)) continue;

        orders[brigadeId] = {
            ...order,
            ...createColumnMovementOrder(replacement),
            owner: order.owner,
        };
    }
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
