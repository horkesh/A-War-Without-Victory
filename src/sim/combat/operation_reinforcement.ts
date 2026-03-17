/**
 * Corps-wide operation reinforcement — draw brigades from surplus sectors
 * within the same corps to concentrate force for an operation.
 *
 * Design:
 * - BFS distance through friendly territory determines reachability
 * - Garrison floor prevents stripping sectors below minimum coverage
 * - Threat gate prevents pulling from sectors already under pressure
 * - Component check prevents sourcing across disconnected territory
 * - Deterministic: sorted iteration via strictCompare, no randomness
 */

import type { CorpsFrontSector, CorpsOperation, FormationId, FormationState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getSectorComponent } from './sector_utils.js';
import type { Osid } from './osid_adjacency.js';
import {
    MAX_OP_LOAN_DISTANCE,
    MAX_LOANED_PER_OP,
    SOURCE_SECTOR_MAX_THREAT,
    MIN_BRIGADES_FOR_SECTOR_ATTACK,
    LOAN_ARRIVAL_THRESHOLD,
} from './operation_reinforcement_constants.js';
import { GARRISON_BUDGET_EDGES_PER_BRIGADE } from './corps_front_sectors_constants.js';

/** Entry tracking a loaned brigade. Matches CorpsOperation.loaned_brigades element type. */
export interface LoanedBrigadeEntry {
    brigade_id: FormationId;
    source_sector_id: string;
    arrived: boolean;
}

/** Candidate with distance metadata for sorting. */
interface LoanCandidate {
    brigade_id: FormationId;
    source_sector_id: string;
    distance: number;
    personnel: number;
}

/**
 * BFS distance from startOsid to any OSID in targetOsids, traversing only
 * friendly territory. Returns hop count or Infinity if unreachable.
 */
function bfsDistanceToTargets(
    startOsid: Osid,
    targetOsids: Set<string>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): number {
    if (targetOsids.has(startOsid)) return 0;

    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: Array<{ osid: string; depth: number }> = [{ osid: startOsid, depth: 0 }];
    let head = 0;

    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        if (depth >= MAX_OP_LOAN_DISTANCE) continue; // No point searching further
        const neighbors = adjacency.get(osid as Osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            if (targetOsids.has(n)) return depth + 1;
            visited.add(n);
            queue.push({ osid: n, depth: depth + 1 });
        }
    }

    return Infinity;
}

/**
 * Collect target sector friendly OSIDs — both from sub_segments and territory_osids.
 */
function collectTargetFriendlyOsids(targetSector: CorpsFrontSector): Set<string> {
    const osids = new Set<string>();
    for (const ss of targetSector.sub_segments) {
        for (const o of ss.friendly_osids) osids.add(o);
    }
    for (const o of targetSector.territory_osids) osids.add(o);
    return osids;
}

/**
 * Compute the reinforcement pool for an operation — brigades that can be
 * loaned from other sectors within the same corps.
 *
 * @param targetSector      The sector where the operation launches
 * @param sectorBrigadeCount Number of brigades already in the target sector
 * @param otherCorpsSectors  All other sectors (caller filters to same corps)
 * @param formations         All formations keyed by ID
 * @param adjacency          OSID adjacency graph
 * @param friendlyOsids      Set of all friendly OSIDs for this faction
 * @param componentOf        OSID → component index map
 * @returns Array of LoanedBrigadeEntry for brigades that can be loaned
 */
export function computeReinforcementPool(
    targetSector: CorpsFrontSector,
    sectorBrigadeCount: number,
    otherCorpsSectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
): LoanedBrigadeEntry[] {
    // 0. No shortfall — target sector already has enough brigades
    if (sectorBrigadeCount >= MIN_BRIGADES_FOR_SECTOR_ATTACK) return [];

    // 1. Collect target sector friendly OSIDs for BFS destination
    const targetFriendlyOsids = collectTargetFriendlyOsids(targetSector);

    // 2. Get target sector component
    const targetComponent = getSectorComponent(targetSector, componentOf);

    // 3. Gather candidates from other sectors, tracking per-sector surplus
    const candidates: LoanCandidate[] = [];
    const sectorSurplus = new Map<string, number>(); // sector_id → max available

    for (const sector of otherCorpsSectors) {
        // Same corps only (caller should filter, but guard)
        if (sector.corps_id !== targetSector.corps_id) continue;

        // Skip if different component
        const sectorComponent = getSectorComponent(sector, componentOf);
        if (sectorComponent !== targetComponent) continue;

        // Skip if threat is too high
        if (sector.threat_ratio >= SOURCE_SECTOR_MAX_THREAT) continue;

        // Compute garrison budget
        const garrisonBudget = Math.ceil(sector.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
        const floor = Math.max(garrisonBudget, 1);
        const available = sector.assigned_brigade_ids.length - floor;
        if (available <= 0) continue;

        sectorSurplus.set(sector.sector_id, available);

        // Evaluate each assigned brigade (sorted for determinism)
        const sortedBrigadeIds = [...sector.assigned_brigade_ids].sort(strictCompare);

        for (const brigadeId of sortedBrigadeIds) {
            const formation = formations[brigadeId];
            if (!formation) continue;

            // Skip inactive
            if (formation.status !== 'active') continue;

            // Skip combat ineffective
            if ((formation.personnel ?? 0) < 400) continue;

            // Skip disrupted
            if ((formation.disrupted_turns ?? 0) > 0) continue;

            // BFS distance from brigade location to target sector
            const locationOsid = formation.location_osid;
            if (!locationOsid) continue;

            const distance = bfsDistanceToTargets(
                locationOsid as Osid,
                targetFriendlyOsids,
                adjacency,
                friendlyOsids,
            );

            // Skip if too far
            if (distance > MAX_OP_LOAN_DISTANCE) continue;

            candidates.push({
                brigade_id: brigadeId,
                source_sector_id: sector.sector_id,
                distance,
                personnel: formation.personnel ?? 0,
            });
        }
    }

    // 4. Sort: distance ASC, personnel DESC, brigade_id ASC
    candidates.sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.personnel !== b.personnel) return b.personnel - a.personnel; // DESC
        return strictCompare(a.brigade_id, b.brigade_id);
    });

    // 5. Greedily select up to MAX_LOANED_PER_OP, respecting per-sector surplus
    const selected: LoanedBrigadeEntry[] = [];
    const sectorTaken = new Map<string, number>();

    for (const c of candidates) {
        if (selected.length >= MAX_LOANED_PER_OP) break;

        const taken = sectorTaken.get(c.source_sector_id) ?? 0;
        const surplus = sectorSurplus.get(c.source_sector_id) ?? 0;
        if (taken >= surplus) continue;

        selected.push({
            brigade_id: c.brigade_id,
            source_sector_id: c.source_sector_id,
            arrived: false,
        });
        sectorTaken.set(c.source_sector_id, taken + 1);
    }

    return selected;
}

/**
 * Check which loaned brigades have arrived at the target sector.
 * Mutates loan.arrived in place. Returns fraction arrived (0-1).
 */
export function checkLoanedArrivals(
    op: CorpsOperation,
    formations: Record<FormationId, FormationState>,
    targetSector: CorpsFrontSector,
): number {
    const loans = op.loaned_brigades;
    if (!loans || loans.length === 0) return 0;

    // Build set of target sector OSIDs (territory + sub_segment friendly)
    const targetOsids = collectTargetFriendlyOsids(targetSector);

    let arrivedCount = 0;
    for (const loan of loans) {
        const formation = formations[loan.brigade_id];
        if (!formation) continue;

        const loc = formation.location_osid;
        if (loc && targetOsids.has(loc)) {
            loan.arrived = true;
        }

        if (loan.arrived) arrivedCount++;
    }

    return arrivedCount / loans.length;
}

/**
 * Returns true if enough loaned brigades have arrived to proceed with staging.
 */
export function areLoanedBrigadesReady(arrivalFraction: number): boolean {
    return arrivalFraction >= LOAN_ARRIVAL_THRESHOLD;
}

/**
 * Remove entries from op.loaned_brigades where the brigade is no longer active
 * (dissolved, destroyed, or missing from formations).
 */
export function cleanupDissolvedLoans(
    op: CorpsOperation,
    formations: Record<FormationId, FormationState>,
): void {
    if (!op.loaned_brigades) return;

    op.loaned_brigades = op.loaned_brigades.filter(loan => {
        const formation = formations[loan.brigade_id];
        return formation && formation.status === 'active';
    });
}
