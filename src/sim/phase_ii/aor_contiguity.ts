/**
 * AoR Contiguity Utilities.
 *
 * Reusable functions for checking and repairing brigade and corps AoR contiguity.
 * Used by corps-directed AoR assignment and rebalancing.
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type { FactionId, FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getFormationCorpsId } from './corps_sector_partition.js';

export interface ContiguityResult {
    /** Whether the settlement set forms a single connected component. */
    contiguous: boolean;
    /** Connected components, largest first, sorted by min SID for determinism. */
    components: SettlementId[][];
}

export interface RepairResult {
    /** Settlements kept (largest contiguous component containing HQ or most front-active). */
    kept: SettlementId[];
    /** Orphan settlements to be reassigned to adjacent brigades. */
    orphans: SettlementId[];
}

/**
 * Check if a brigade's settlement set is contiguous on the adjacency graph.
 *
 * Uses BFS within the settlement set, restricted to the sub-graph.
 * Returns components sorted largest-first, then by minimum SID.
 */
export function checkBrigadeContiguity(
    settlements: SettlementId[],
    adj: Map<SettlementId, Set<SettlementId>>
): ContiguityResult {
    if (settlements.length <= 1) {
        return { contiguous: true, components: settlements.length === 0 ? [] : [settlements.slice()] };
    }

    const memberSet = new Set(settlements);
    const visited = new Set<SettlementId>();
    const components: SettlementId[][] = [];

    // Process settlements in sorted order for determinism
    const sorted = settlements.slice().sort(strictCompare);

    for (const seed of sorted) {
        if (visited.has(seed)) continue;

        // BFS from seed, restricted to member settlements
        const component: SettlementId[] = [];
        const queue: SettlementId[] = [seed];
        visited.add(seed);

        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];
            component.push(current);
            const neighbors = adj.get(current);
            if (!neighbors) continue;
            // Sort neighbors for determinism
            const sortedNeighbors = Array.from(neighbors).sort(strictCompare);
            for (const n of sortedNeighbors) {
                if (!memberSet.has(n) || visited.has(n)) continue;
                visited.add(n);
                queue.push(n);
            }
        }

        component.sort(strictCompare);
        components.push(component);
    }

    // Sort components: largest first, then by minimum SID for determinism
    components.sort((a, b) => {
        if (a.length !== b.length) return b.length - a.length;
        return strictCompare(a[0], b[0]);
    });

    return {
        contiguous: components.length <= 1,
        components,
    };
}

/**
 * Check if removing a settlement from the set would break contiguity.
 *
 * Single BFS from any remaining settlement; if it can reach all others,
 * the set remains contiguous. O(n) per call.
 */
export function wouldRemainContiguous(
    settlements: SettlementId[],
    sidToRemove: SettlementId,
    adj: Map<SettlementId, Set<SettlementId>>
): boolean {
    if (settlements.length <= 2) {
        // Removing from a set of 1 leaves empty (trivially contiguous).
        // Removing from a set of 2 leaves 1 (trivially contiguous).
        return true;
    }

    const remaining = settlements.filter((s) => s !== sidToRemove);
    if (remaining.length <= 1) return true;

    const memberSet = new Set(remaining);
    const visited = new Set<SettlementId>();
    // Start BFS from the first remaining settlement (sorted for determinism)
    const seed = remaining.sort(strictCompare)[0];
    const queue: SettlementId[] = [seed];
    visited.add(seed);

    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        const neighbors = adj.get(current);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!memberSet.has(n) || visited.has(n)) continue;
            visited.add(n);
            queue.push(n);
        }
    }

    return visited.size === remaining.length;
}

/**
 * Repair discontiguous AoR: keep the best connected component,
 * return orphan islands for reassignment.
 *
 * "Best" = component containing HQ, or if no HQ, component with the most
 * front-active settlements, or if tied, the largest component.
 */
export function repairContiguity(
    _brigadeId: FormationId,
    settlements: SettlementId[],
    hqSid: SettlementId | undefined,
    frontActive: Set<SettlementId>,
    adj: Map<SettlementId, Set<SettlementId>>
): RepairResult {
    const { contiguous, components } = checkBrigadeContiguity(settlements, adj);

    if (contiguous || components.length <= 1) {
        return { kept: settlements.slice(), orphans: [] };
    }

    // Score each component: prefer HQ-containing, then most front-active, then largest
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const hasHq = hqSid != null && comp.includes(hqSid);
        const frontCount = comp.filter((sid) => frontActive.has(sid)).length;
        // Score: HQ presence = 1_000_000, front count * 1000, then size
        const score = (hasHq ? 1_000_000 : 0) + frontCount * 1000 + comp.length;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }

    const kept = components[bestIdx];
    const orphans: SettlementId[] = [];
    for (let i = 0; i < components.length; i++) {
        if (i !== bestIdx) orphans.push(...components[i]);
    }
    orphans.sort(strictCompare);

    return { kept, orphans };
}

// --- Corps-level contiguity ---

export interface CorpsContiguityResult {
    corpsId: FormationId;
    /** Whether the corps' non-enclave settlements form a single connected component. */
    contiguous: boolean;
    /** Connected components, largest first (from checkBrigadeContiguity). */
    components: SettlementId[][];
    /** Settlements in non-largest components (to be reassigned). */
    orphans: SettlementId[];
}

/**
 * Check if a corps' effective AoR (union of subordinate brigade settlements)
 * is contiguous on the settlement adjacency graph.
 *
 * Delegates to checkBrigadeContiguity (generic connected-component detector).
 * The caller is responsible for excluding enclave settlements before calling.
 */
export function checkCorpsContiguity(
    corpsId: FormationId,
    settlements: SettlementId[],
    adj: Map<SettlementId, Set<SettlementId>>
): CorpsContiguityResult {
    const { contiguous, components } = checkBrigadeContiguity(settlements, adj);

    if (contiguous || components.length <= 1) {
        return { corpsId, contiguous: true, components, orphans: [] };
    }

    // Keep largest component (already sorted largest-first by checkBrigadeContiguity)
    const orphans: SettlementId[] = [];
    for (let i = 1; i < components.length; i++) {
        orphans.push(...components[i]);
    }
    orphans.sort(strictCompare);

    return { corpsId, contiguous: false, components, orphans };
}

/**
 * Repair discontiguous corps AoR by reassigning orphan settlements to
 * an adjacent brigade of a different corps (same faction).
 *
 * For each orphan settlement, searches adjacent settlements in the graph
 * for a brigade belonging to a different corps of the same faction.
 * Falls back to null (unassigned) if no valid target found.
 *
 * Mutates state.brigade_aor in place. Returns count of reassignments.
 */
export function repairCorpsContiguity(
    state: GameState,
    faction: FactionId,
    corpsId: FormationId,
    orphans: SettlementId[],
    adj: Map<SettlementId, Set<SettlementId>>
): number {
    const brigadeAor = state.brigade_aor;
    if (!brigadeAor) return 0;
    const formations = state.formations ?? {};

    let reassigned = 0;

    for (const sid of orphans) {
        const neighbors = adj.get(sid);
        if (!neighbors) {
            brigadeAor[sid] = null;
            reassigned++;
            continue;
        }

        let targetBrigade: FormationId | null = null;
        for (const nSid of Array.from(neighbors).sort(strictCompare)) {
            const nBrigade = brigadeAor[nSid];
            if (!nBrigade) continue;
            const nFormation = formations[nBrigade];
            if (!nFormation || nFormation.faction !== faction) continue;
            const nCorpsId = getFormationCorpsId(nFormation);
            if (nCorpsId === corpsId) continue; // must be a different corps
            targetBrigade = nBrigade;
            break;
        }

        brigadeAor[sid] = targetBrigade ?? null;
        reassigned++;
    }

    return reassigned;
}
