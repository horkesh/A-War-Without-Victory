/**
 * Sector invariant assertions and reachability guards.
 *
 * These are diagnostic rails, not hard-stop enforcement. They surface broken
 * sector truth loudly, but they do not currently throw or rewrite state.
 */

import type {
    CorpsFrontSector,
    FormationId,
    FormationState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getSectorComponent } from './sector_utils.js';

/**
 * Assert that every assigned/reserve brigade can physically reach its sector
 * through contiguous friendly territory (same connected component).
 *
 * This is the single diagnostic sink for the reachability invariant inside the
 * sector pipeline. All assignment paths should flow through here before sectors
 * are returned to consumers, but the function currently logs rather than throws.
 *
 * Logs violations as console.error. Sectors remain usable - the brigade still
 * cannot physically reach its sector, and downstream guards
 * (filterReachableReassignmentOrders) can catch the same mismatch for march orders.
 */
export function assertBrigadeReachability(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    componentOf: Map<string, number>,
): void {
    const violations: string[] = [];
    for (const sec of sectors) {
        const secComp = getSectorComponent(sec, componentOf);
        if (secComp === -1) continue; // sector has no mapped OSIDs - skip
        const allBids = [
            ...sec.assigned_brigade_ids,
            ...(sec.reserve_brigade_ids ?? []),
        ];
        for (const bid of allBids) {
            const f = formations[bid];
            if (!f || !f.location_osid) continue;
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            if (brigComp !== secComp) {
                violations.push(
                    `${bid} (at ${f.location_osid}, comp ${brigComp}) -> ${sec.sector_id} (comp ${secComp})`
                );
            }
        }
    }
    if (violations.length > 0) {
        console.error(
            `SECTOR REACHABILITY INVARIANT VIOLATION: ${violations.length} brigade(s) assigned to unreachable sectors:\n  ${violations.join('\n  ')}`
        );
    }
}

/**
 * INVARIANT: No dissolved/inactive brigade may appear in any sector.
 *
 * Checks all assigned_brigade_ids and reserve_brigade_ids for:
 *   - Formation exists in formations record
 *   - f.status === 'active'
 *   - f.lifecycle_status is NOT 'destroyed' or 'disbanded'
 *
 * Logs violations as console.error. Sectors remain usable - downstream combat
 * logic may ignore inactive formations, but their presence in a sector is still
 * a bug that must be surfaced.
 */
export function assertSectorBrigadesActive(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
): void {
    const violations: string[] = [];
    for (const sec of sectors) {
        const allBids = [
            ...sec.assigned_brigade_ids,
            ...(sec.reserve_brigade_ids ?? []),
        ].sort(strictCompare);
        for (const bid of allBids) {
            const f = formations[bid];
            if (!f) {
                violations.push(
                    `${bid} in ${sec.sector_id}: formation not found in formations record`
                );
                continue;
            }
            if (f.status !== 'active') {
                violations.push(
                    `${bid} in ${sec.sector_id}: status='${f.status}' (expected 'active')`
                );
            } else if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded') {
                // Invariant: destroyed/disbanded must not have status='active'
                violations.push(
                    `${bid} in ${sec.sector_id}: status='active' but lifecycle_status='${f.lifecycle_status}'`
                );
            }
        }
    }
    if (violations.length > 0) {
        console.error(
            `SECTOR BRIGADE STATUS INVARIANT VIOLATION: ${violations.length} inactive/dissolved brigade(s) found in sectors:\n  ${violations.join('\n  ')}`
        );
    }
}

/**
 * Validate that a set of sector reassignment orders only move brigades
 * to sectors they can physically reach. Call this from directive generation
 * (bot_corps_directives.ts) before issuing march orders.
 *
 * Returns the filtered list of valid orders (invalid orders are dropped
 * with a console.warn).
 */
export function filterReachableReassignmentOrders(
    orders: Array<{ brigade_id: string; to_sector_id: string }>,
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    componentOf: Map<string, number>,
): Array<{ brigade_id: string; to_sector_id: string }> {
    const sectorMap = new Map<string, CorpsFrontSector>();
    for (const s of sectors) sectorMap.set(s.sector_id, s);

    return orders.filter(order => {
        const sec = sectorMap.get(order.to_sector_id);
        if (!sec) return false;
        const f = formations[order.brigade_id];
        if (!f || !f.location_osid) return false;
        const secComp = getSectorComponent(sec, componentOf);
        const brigComp = componentOf.get(f.location_osid) ?? -2;
        if (brigComp !== secComp) {
            console.warn(
                `[filterReachableReassignmentOrders] Dropped unreachable order: ${order.brigade_id} (comp ${brigComp}) -> ${order.to_sector_id} (comp ${secComp})`
            );
            return false;
        }
        return true;
    });
}
