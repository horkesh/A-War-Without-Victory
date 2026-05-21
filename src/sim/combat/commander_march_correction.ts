/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Repair
 * DOMAIN:    March correction — fixes invalid march destinations post-decision
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether a brigade's current march destination is outside its assigned sub-segment
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
 * MOVEMENT TIER: T6 — Repair (March Correction) (see MOVEMENT_AUTHORITY.md)
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

import type { FactionId, GameState, SettlementId } from '../../state/game_state.js';
import { bfsDistance } from './sector_utils.js';
import { strictCompare } from '../../state/validateGameState.js';

export function correctMarchOrders(state: GameState, adjacency: Map<string, string[]>): void {
    const formations = state.military.formations ?? {};
    const moveOrders = state.military.brigade_movement_orders ?? {};
    const moveStates = state.military.brigade_movement_state ?? {};
    const sectors = state.military.corps_front_sectors ?? {};

    // Build sub-segment lookup: sub_segment_id → friendly_osids
    const subSegFrontOsids = new Map<string, string[]>();
    for (const sector of Object.values(sectors)) {
        for (const ss of sector.sub_segments ?? []) {
            if (ss.friendly_osids.length > 0) {
                subSegFrontOsids.set(ss.sub_segment_id, ss.friendly_osids);
            }
        }
    }

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
        const ssId = f.assigned_sub_segment_id;
        if (!ssId) continue;

        const frontOsids = subSegFrontOsids.get(ssId);
        if (!frontOsids || frontOsids.length === 0) continue;

        const loc = f.location_osid;
        if (!loc) continue;

        // Being on the assigned front only proves the current location is valid;
        // a stale order can still drag the brigade away next turn.
        const atAssignedFront = frontOsids.includes(loc);

        // Check if there's a march order pointing to wrong destination
        const order = moveOrders[bid];
        if (!order) continue;
        const dest = order.destination_sids?.[0];
        if (!dest) continue;
        if (frontOsids.includes(dest)) continue; // Destination already correct
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
        state.military.brigade_movement_orders[bid] = {
            destination_sids: [bestOsid as SettlementId],
            stance: 'column',
        } as { destination_sids: SettlementId[] };
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
    const sectors = state.military.corps_front_sectors ?? {};

    // Build sub-segment lookup: sub_segment_id → friendly_osids
    const subSegFrontOsids = new Map<string, string[]>();
    for (const sector of Object.values(sectors)) {
        for (const ss of sector.sub_segments ?? []) {
            if (ss.friendly_osids.length > 0) {
                subSegFrontOsids.set(ss.sub_segment_id, ss.friendly_osids);
            }
        }
    }

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
        const ssId = f.assigned_sub_segment_id;
        if (!ssId) continue;

        const frontOsids = subSegFrontOsids.get(ssId);
        if (!frontOsids || frontOsids.length === 0) continue;

        // Only act on brigades currently in transit
        const transitState = moveStates[bid];
        if (!transitState || transitState.status !== 'in_transit') continue;

        const loc = f.location_osid;
        if (!loc) continue;

        const transitDest = transitState.destination_sids?.[0];
        if (!transitDest) continue;
        const brigadeAlreadyAtValidFront = frontOsids.includes(loc);
        if (frontOsids.includes(transitDest)) {
            // Destination is in assigned front OSIDs, but check if it is now an isolated island.
            // A corridor collapse can leave the destination with 0 friendly-controlled neighbors;
            // continuing transit would strand the brigade on an unreachable island.
            const destNeighbors = adjacency.get(transitDest) ?? [];
            const destIsIsolated = !destNeighbors.some(n => pc[n] === f.faction);
            if (!destIsIsolated) continue; // Destination is reachable — leave transit intact
            // Destination became isolated — fall through to cancel + re-route below
        }

        // Wrong transit destination — cancel transit state first, then issue corrected order
        if (brigadeAlreadyAtValidFront && !frontOsids.includes(transitDest)) {
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
        state.military.brigade_movement_orders[bid] = {
            destination_sids: [bestOsid as SettlementId],
            stance: 'column',
        } as { destination_sids: SettlementId[] };
    }
}
