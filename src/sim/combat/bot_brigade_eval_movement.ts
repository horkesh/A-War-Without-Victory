import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, isMovementDestinationRisky } from './bot_brigade_context.js';
import { issueInteriorMovement, findNearestOffensiveTarget } from './bot_brigade_movement_ai.js';
import {
    filterOffensiveTargetsToRoutineScope,
    filterToRoutineScope,
    isDestinationInRoutineScope,
    resolveRoutineMovementScope,
} from './brigade_routine_scope.js';
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
    // Shared routine-movement scope: discretionary repositioning is limited to the assigned
    // sub-segment front. Unassigned/reserve/stale formations keep the corps-wide reach.
    const routineScope = resolveRoutineMovementScope(state, brigade);

    // First: if directive has a priority sector, march toward it (offensive concentration).
    if (interiorMovementProfileTime('.prioritySector', () => {
        if (!directive?.priority_sector_id) return false;
        const prioritySec = state.military.corps_front_sectors?.[directive.priority_sector_id];
        if (prioritySec) {
            const priorityOsids = new Set<string>();
            for (const ss of prioritySec.sub_segments) {
                for (const o of ss.friendly_osids) priorityOsids.add(o);
            }
            // NOT routine-scoped: `priority_sector_id` is the corps commander naming a sector for
            // offensive concentration — an existing higher-priority authority, like Rule 5b2 and
            // Rule 5c. Narrowing it would empty the set whenever the priority sector is not the
            // brigade's own (the normal case) and leave a full-component BFS running for nothing.
            // This rule writes a single-hop `movement_order`, which T3 never revalidates (it skips
            // anything without `stance:'column'`) and which does not survive to T6, so it needs no
            // authority exemption downstream.
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
        // Scope the ENEMY goal set by adjacency to a legally occupiable cell — never the value
        // `findNearestOffensiveTarget` returns, which is the FIRST STEP of an up-to-30-hop path.
        // Scope-checking that first step forbids every legal multi-hop journey (including a
        // brigade simply walking out of the interior toward its own assigned front) and, because
        // this block returns true regardless, also suppressed the `.ownCorpsFront` and
        // `.fallback` rules below it — freezing the formation outright.
        const targetSet = filterOffensiveTargetsToRoutineScope(
            routineScope, new Set(directive.offensive_targets), adjacency,
        );
        if (targetSet.size === 0) return false;
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
        const scopedOwnCorpsFrontOsids = filterToRoutineScope(routineScope, ownCorpsFrontOsids);
        if (insideOwnCorpsTerritory && scopedOwnCorpsFrontOsids.size > 0) {
            if (!scopedOwnCorpsFrontOsids.has(loc)) {
                const dest = findNearestFriendlyOsidInSet(
                    state, faction, loc, adjacency, reverseMap, scopedOwnCorpsFrontOsids,
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
