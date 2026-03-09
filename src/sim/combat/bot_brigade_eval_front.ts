import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { findNearestFriendlyOsidInSet, findNearestFriendlyOsidDestination, isMovementDestinationRisky } from './bot_brigade_context.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findAdjacentFrontGap, computeHopsToFront, COLUMN_MARCH_MIN_HOPS, findNearestOffensiveTarget } from './bot_brigade_movement_ai.js';
import { countFactionBrigadesAtOsid, countCorpsBrigadesAtOsid, MAX_CORPS_BRIGADES_PER_OSID } from './bot_brigade_context.js';
import { issueInteriorMovement } from './bot_brigade_movement_ai.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { Osid } from './osid_adjacency.js';

export function evaluateSectorMarch(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, faction, loc, adjacency, reverseMap, isActiveSectorOperationParticipant, result, graphAnalysis } = ctx;

    // --- Sector march: brigade assigned/reserve in a sector but not on its front → column march ---
    // This overrides home defense: the corps needs this brigade at the front.
    if (state.military.corps_front_sectors && !isActiveSectorOperationParticipant) {
        let assignedSector: (typeof state.military.corps_front_sectors)[string] | null = null;
        let isReserve = false;
        for (const sid of Object.keys(state.military.corps_front_sectors).sort(strictCompare)) {
            const sec = state.military.corps_front_sectors[sid]!;
            if (sec.assigned_brigade_ids.includes(brigade.id)) {
                assignedSector = sec;
                break;
            }
            if (sec.reserve_brigade_ids.includes(brigade.id)) {
                assignedSector = sec;
                isReserve = true;
                break;
            }
        }
        if (assignedSector) {
            const frontSet = new Set<string>();
            for (const ss of assignedSector.sub_segments) {
                for (const o of ss.friendly_osids) frontSet.add(o);
            }
            if (!frontSet.has(loc)) {
                // Reserve brigades only column march if deep rear (2+ hops).
                // 1-hop reserves stay put — they're the immediate reinforcement pool.
                if (isReserve) {
                    const neighbors = adjacency.get(loc as Osid) ?? [];
                    const nearFront = neighbors.some(n => {
                        const nAnalysis = graphAnalysis.osid_analysis.get(n as Osid);
                        return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                    });
                    if (nearFront) return false; // 1-hop reserve — let later evaluations handle
                }
                // Not on sector front — column march there (use actual destination
                // for multi-hop Dijkstra pathfinding, not just first step)
                if (frontSet.size > 0) {
                    const dest = findNearestFriendlyOsidDestination(state, faction, loc, adjacency, reverseMap, frontSet);
                    if (dest) {
                        result.column_march_orders[brigade.id] = dest;
                        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

export function evaluateFrontCoverage(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, state, faction, loc, adjacency, reverseMap, graphAnalysis, directive, corpsStance, adjEnemy, result, columnAssignments } = ctx;

    // --- Rule 5b: Redeploy toward offensive target ---
    // On front but no offensive_target adjacent and there are excess brigades here:
    // Move along front toward the nearest offensive_target through friendly territory.
    if (adjEnemy.length > 0 && directive && directive.offensive_targets.length > 0 &&
        (corpsStance === 'offensive' || corpsStance === 'balanced')) {
        const redeployTargetSet = new Set(directive.offensive_targets);
        const hasAdjacentTarget = adjEnemy.some(o => redeployTargetSet.has(o));
        const factionHere = countFactionBrigadesAtOsid(state, faction, loc);
        if (!hasAdjacentTarget && factionHere >= 2) {
            // BFS through friendly territory toward nearest offensive_target neighbor
            const redeployTarget = findNearestOffensiveTarget(state, faction, loc, redeployTargetSet, adjacency, reverseMap, 6);
            if (redeployTarget) {
                if (!isMovementDestinationRisky(redeployTarget, graphAnalysis)) {
                    result.movement_orders[brigade.id] = redeployTarget;
                }
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }
        }
    }

    // --- Rule 5b2: Sector reassignment from density equalization ---
    // Corps AI issued explicit reassignment orders — this brigade should column march
    // to its assigned sector. Only act if not heavily entrenched.
    if (directive?.sector_reassignment_orders && state.military.corps_front_sectors) {
        const reassign = directive.sector_reassignment_orders.find(r => r.brigade_id === brigade.id);
        if (reassign) {
            const targetSec = state.military.corps_front_sectors[reassign.to_sector_id];
            if (targetSec) {
                const targetOsids = new Set<string>();
                for (const ss of targetSec.sub_segments) {
                    for (const o of ss.friendly_osids) targetOsids.add(o);
                }
                if (targetOsids.size > 0 && !targetOsids.has(loc)) {
                    const dest = findNearestFriendlyOsidInSet(state, faction, loc, adjacency, reverseMap, targetOsids);
                    if (dest) {
                        // Use column march for distant moves, 1-hop for adjacent
                        const hops = computeHopsToFront(loc, faction, adjacency, state, reverseMap, graphAnalysis);
                        if (hops >= COLUMN_MARCH_MIN_HOPS) {
                            result.column_march_orders[brigade.id] = dest;
                        } else {
                            result.movement_orders[brigade.id] = dest;
                        }
                        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                        return true;
                    }
                }
            }
        }
    }

    // --- Rule 5c: Reinforce under-density or empty sector ---
    // When this brigade is on a stacked front OSID (≥2 friendly brigades here) and
    // the directive flags under-density sectors, march to the nearest one.
    if (adjEnemy.length > 0 &&
        directive?.reinforce_sector_ids?.length &&
        state.military.corps_front_sectors &&
        countFactionBrigadesAtOsid(state, faction, loc) >= 2) {
        const targetOsids = new Set<string>();
        for (const sid of directive.reinforce_sector_ids) {
            const sec = state.military.corps_front_sectors[sid];
            if (!sec) continue;
            for (const ss of sec.sub_segments) {
                for (const o of ss.friendly_osids) targetOsids.add(o);
            }
        }
        if (targetOsids.size > 0 && !targetOsids.has(loc)) {
            const dest = findNearestFriendlyOsidInSet(state, faction, loc, adjacency, reverseMap, targetOsids);
            if (dest && !isMovementDestinationRisky(dest, graphAnalysis)) {
                result.movement_orders[brigade.id] = dest;
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }

    // --- Rule 6: Front coverage — fill gaps, rebalance ---
    if (adjEnemy.length > 0) {
        // On front but no viable attack: fill adjacent gaps
        const factionHere = countFactionBrigadesAtOsid(state, faction, loc);
        if (factionHere >= 2) {
            const gap = findAdjacentFrontGap(state, loc, faction, adjacency, reverseMap, graphAnalysis);
            if (gap) {
                result.movement_orders[brigade.id] = gap;
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                return true;
            }
        }
        // Corps-level rebalancing
        const corpsCount = countCorpsBrigadesAtOsid(state, faction, brigade.corps_id, loc);
        if (corpsCount > MAX_CORPS_BRIGADES_PER_OSID) {
            issueInteriorMovement(brigade, loc, faction, adjacency, state, reverseMap, graphAnalysis, result,
                ['undefended', 'critical', 'threatened'], columnAssignments);
            return true;
        }
        // On front, no viable attack, holding position.
        // Defensive corps exits early at Rule 4 with dig_in. Balanced and offensive corps use
        // 'defend' so movement lockout doesn't freeze them when repositioning is needed.
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    return false;
}
