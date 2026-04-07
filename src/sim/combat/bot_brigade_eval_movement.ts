import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, isMovementDestinationRisky } from './bot_brigade_context.js';
import { issueInteriorMovement, findNearestOffensiveTarget } from './bot_brigade_movement_ai.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { Osid } from './osid_adjacency.js';

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Interior reposition evaluation — rear-area brigade movement
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether a rear-area brigade should move toward the front or a priority sector
 * WRITES:    brigade_movement_orders (rear-area repositioning)
 * READS:     brigade location, sector assignment, front state, directive.priority_sector_id
 * MUST NOT:  move a brigade cross-component (Codex principle #2 — connected-component boundary)
 *
 * UPSTREAM:  commander_loop.ts directive (priority_sector_id)
 * DOWNSTREAM: osid_column_movement.ts (column march), brigade_movement_orders.ts (single-hop)
 *
 * TRUTH INVARIANTS:
 * - Respects connected-component boundaries (no cross-faction-graph movement)
 * - Only moves brigades already inside their assigned sector's component
 *
 * MOVEMENT TIER: T2 — Tactical Routing (Interior Reposition) (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

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
        const targetSet = new Set(directive.offensive_targets);
        // BFS through friendly territory toward nearest offensive_target neighbor
        const directiveTarget = findNearestOffensiveTarget(state, faction, loc, targetSet, adjacency, reverseMap, 30);
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
