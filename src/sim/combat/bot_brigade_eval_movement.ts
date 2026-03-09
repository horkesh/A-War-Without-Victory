import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, isMovementDestinationRisky } from './bot_brigade_context.js';
import { issueInteriorMovement } from './bot_brigade_movement_ai.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { Osid } from './osid_adjacency.js';

export function evaluateInteriorMovement(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, directive, result, columnAssignments } = ctx;

    // --- Rule 7: Interior — move toward front, preferring offensive targets ---
    // First: if directive has a priority sector, march toward it (offensive concentration).
    if (directive?.priority_sector_id) {
        const prioritySec = state.military.corps_front_sectors?.[directive.priority_sector_id];
        if (prioritySec) {
            const priorityOsids = new Set<string>();
            for (const ss of prioritySec.sub_segments) {
                for (const o of ss.friendly_osids) priorityOsids.add(o);
            }
            if (!priorityOsids.has(loc)) {
                const dest = findNearestFriendlyOsidInSet(
                    state, faction, loc, adjacency, reverseMap, priorityOsids
                );
                if (dest && !isMovementDestinationRisky(dest, graphAnalysis)) {
                    result.movement_orders[brigade.id] = dest;
                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                    return true;
                }
            }
        }
    }
    if (directive && directive.offensive_targets.length > 0) {
        // BFS through friendly territory toward nearest offensive_target neighbor
        const targetSet = new Set(directive.offensive_targets);
        const visited = new Set<Osid>([loc]);
        const queue: Array<{ osid: Osid; firstStep: Osid }> = [];
        for (const n of (adjacency.get(loc) ?? [])) {
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl === faction) {
                visited.add(n);
                queue.push({ osid: n, firstStep: n });
            }
        }
        let directiveTarget: Osid | null = null;
        let idx = 0;
        let maxSearch = 30;
        while (idx < queue.length && maxSearch > 0) {
            const cur = queue[idx++]!;
            const neighbors = adjacency.get(cur.osid) ?? [];
            if (neighbors.some(n => targetSet.has(n))) {
                directiveTarget = cur.firstStep;
                break;
            }
            maxSearch--;
            for (const n of neighbors) {
                if (visited.has(n)) continue;
                const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
                if (ctrl === faction) {
                    visited.add(n);
                    queue.push({ osid: n, firstStep: cur.firstStep });
                }
            }
        }
        if (directiveTarget) {
            if (!isMovementDestinationRisky(directiveTarget, graphAnalysis)) {
                result.movement_orders[brigade.id] = directiveTarget;
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }
    // Fallback: standard interior movement toward nearest front
    issueInteriorMovement(brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, result,
        ['undefended', 'critical', 'threatened', 'active'], columnAssignments);
        
    return true; // interior movement is the final fallback for unhandled brigades (though technically they just move and we process next)
}
