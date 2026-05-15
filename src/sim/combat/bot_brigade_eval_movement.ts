import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, isMovementDestinationRisky } from './bot_brigade_context.js';
import { issueInteriorMovement, findNearestOffensiveTarget } from './bot_brigade_movement_ai.js';
import { botOrdersPerfTime } from './_perf_profile_bot_orders.js';

const INTERIOR_MOVEMENT_PROFILE_PREFIX = 'bot_orders.executeFactionDirectives.eval.interiorMovement';

function interiorMovementProfileTime<T>(labelSuffix: string, fn: () => T): T {
    return botOrdersPerfTime(`${INTERIOR_MOVEMENT_PROFILE_PREFIX}${labelSuffix}`, fn);
}

/**
 * OWNERSHIP: Canonical
 * DOMAIN: Interior reposition evaluation - rear-area brigade movement
 *
 * DECIDES: Whether a rear-area brigade should move toward the front or a priority sector
 * WRITES: brigade_movement_orders (rear-area repositioning)
 * READS: brigade location, sector assignment, front state, directive.priority_sector_id
 * MUST NOT: move a brigade cross-component (Codex principle #2 - connected-component boundary)
 *
 * UPSTREAM: commander_loop.ts directive (priority_sector_id)
 * DOWNSTREAM: osid_column_movement.ts (column march), brigade_movement_orders.ts (single-hop)
 *
 * TRUTH INVARIANTS:
 * - Respects connected-component boundaries (no cross-faction-graph movement)
 * - Only moves brigades already inside their assigned sector's component
 *
 * MOVEMENT TIER: T2 - Tactical Routing (Interior Reposition) (see MOVEMENT_AUTHORITY.md)
 */
export function evaluateInteriorMovement(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, directive, result, columnAssignments } = ctx;

    // First: if directive has a priority sector, march toward it (offensive concentration).
    if (interiorMovementProfileTime('.prioritySector', () => {
        if (!directive?.priority_sector_id) return false;
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
        return false;
    })) return true;

    if (interiorMovementProfileTime('.offensiveTarget', () => {
        if (!directive || directive.offensive_targets.length === 0) return false;
        const targetSet = new Set(directive.offensive_targets);
        const directiveTarget = findNearestOffensiveTarget(state, faction, loc, targetSet, adjacency, reverseMap, 30);
        if (directiveTarget) {
            if (!isMovementDestinationRisky(directiveTarget, graphAnalysis)) {
                result.movement_orders[brigade.id] = directiveTarget;
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
        return false;
    })) return true;

    const effectiveCorpsId = brigade.elite_loan_state?.on_loan && brigade.elite_loan_state.loaned_to_corps
        ? brigade.elite_loan_state.loaned_to_corps
        : brigade.corps_id;
    if (interiorMovementProfileTime('.ownCorpsFront', () => {
        if (brigade.assignment || !effectiveCorpsId || !state.military.corps_front_sectors) return false;
        const ownCorpsFrontOsids = new Set<string>();
        let insideOwnCorpsTerritory = false;
        for (const sector of Object.values(state.military.corps_front_sectors)) {
            if (sector.corps_id !== effectiveCorpsId) continue;
            if (sector.territory_osids.includes(loc)) insideOwnCorpsTerritory = true;
            for (const subSegment of sector.sub_segments ?? []) {
                for (const osid of subSegment.friendly_osids ?? []) ownCorpsFrontOsids.add(osid);
            }
        }
        if (insideOwnCorpsTerritory && ownCorpsFrontOsids.size > 0) {
            if (!ownCorpsFrontOsids.has(loc)) {
                const dest = findNearestFriendlyOsidInSet(
                    state, faction, loc, adjacency, reverseMap, ownCorpsFrontOsids,
                );
                if (dest && !isMovementDestinationRisky(dest, graphAnalysis)) {
                    result.movement_orders[brigade.id] = dest;
                }
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
        return false;
    })) return true;

    interiorMovementProfileTime('.fallback', () => {
        issueInteriorMovement(brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, result,
            ['undefended', 'critical', 'threatened', 'active'], columnAssignments);
    });

    return true; // interior movement is the final fallback for unhandled brigades.
}
