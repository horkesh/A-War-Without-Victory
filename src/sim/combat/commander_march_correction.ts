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
        let s = friendlyByFaction.get(controller as FactionId);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(controller as FactionId, s); }
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

        // Already at a valid front position — no correction needed
        if (frontOsids.includes(loc)) continue;

        // Check if there's a march order pointing to wrong destination
        const order = moveOrders[bid];
        if (!order) continue;
        const dest = order.destination_sids?.[0];
        if (!dest) continue;
        if (frontOsids.includes(dest)) continue; // Destination already correct

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
        };
    }
}
