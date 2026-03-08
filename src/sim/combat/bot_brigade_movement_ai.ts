/**
 * Bot brigade AI — movement logic (BFS, column march, interior movement).
 *
 * Extracted from bot_brigade_ai_osid.ts (behavior-preserving refactor).
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    BrigadePosture,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { Osid } from './osid_adjacency.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import { isMovementDestinationRisky, countFactionBrigadesAtOsid } from './bot_brigade_context.js';

/** Subset of OsidBotOrdersResult used by movement functions (avoids circular import). */
interface MovementOrdersAccumulator {
    posture_orders: Array<{ brigade_id: FormationId; posture: BrigadePosture }>;
    movement_orders: Record<FormationId, Osid>;
    column_march_orders: Record<FormationId, Osid>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum distance (BFS hops) from front for a brigade to use column march instead of 1-hop.
 * Lowered from 3→2: column march is more efficient than bumbling 1-hop-at-a-time because
 * it goes directly to a specific front OSID rather than just taking the nearest first step.
 * At 2 hops, column transit time ≈ 1 turn (same as 2× 1-hop), but with better targeting. */
export const COLUMN_MARCH_MIN_HOPS = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Check if OSID contains a string pattern (case-insensitive). */
export function osidContains(osid: Osid, pattern: string): boolean {
    return osid.toLowerCase().includes(pattern.toLowerCase());
}

/** Check if any array of patterns match the OSID. */
export function osidMatchesAny(osid: Osid, patterns: string[]): boolean {
    const lower = osid.toLowerCase();
    return patterns.some(p => lower.includes(p.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Front-line gap filling: find an adjacent friendly OSID that is on the front
 * (has enemy neighbors) but has NO friendly brigade ("undefended" or "critical").
 * Returns the gap OSID to move to, or null.
 *
 * Historical: all factions prioritized covering their line. Even VRS, with
 * smaller manpower, spread brigades thinly to maintain a continuous front.
 * Gaps invited enemy penetration and encirclement.
 *
 * Deterministic: sorted neighbor iteration, returns first qualifying gap.
 */
export function findAdjacentFrontGap(
    state: GameState,
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis
): Osid | null {
    const neighbors = (adjacency.get(loc) ?? []).slice().sort(strictCompare);
    for (const n of neighbors) {
        const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
        if (ctrl !== faction) continue;
        const analysis = graphAnalysis.osid_analysis.get(n);
        if (!analysis) continue;
        // Must be a front OSID (has enemy neighbors) AND undefended/critical (no or few defenders)
        if (analysis.enemy_neighbors.length > 0 &&
            (analysis.classification === 'undefended' || analysis.classification === 'critical')) {
            // Don't move to a gap if it already has a faction brigade heading there
            const factionHere = countFactionBrigadesAtOsid(state, faction, n);
            if (factionHere === 0 && !isMovementDestinationRisky(n, graphAnalysis)) return n;
        }
    }
    return null;
}

/** Find the nearest front OSID with a given classification for movement. */
export function findNearestFrontOsid(
    state: GameState,
    faction: FactionId,
    loc: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis,
    targetClassifications: string[]
): Osid | null {
    // BFS from current location through friendly territory toward front
    const controllerCache = new Map<Osid, FactionId | null>();
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; firstStep: Osid | null }> = [{ osid: loc, firstStep: null }];

    while (queue.length > 0) {
        const { osid, firstStep } = queue.shift()!;
        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);

        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);

            let ctrl = controllerCache.get(n);
            if (ctrl === undefined) {
                ctrl = getPoliticalControllerOSID(state, n, reverseMap);
                controllerCache.set(n, ctrl);
            }
            if (ctrl !== faction && ctrl !== null) continue; // Move through friendly or unoccupied

            const step = firstStep ?? n;
            const analysis = graphAnalysis.osid_analysis.get(n);
            if (analysis && targetClassifications.includes(analysis.classification)) {
                if (!isMovementDestinationRisky(n, graphAnalysis)) return step; // safe first step
            }
            queue.push({ osid: n, firstStep: step });
        }
    }
    return null;
}

/** BFS to find the nearest OSID matching a substring pattern through friendly territory.
 * Returns the FIRST STEP toward the target (for movement orders), not the target itself. */
export function findNearestOsidByPattern(
    loc: Osid,
    pattern: string,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap
): Osid | null {
    const lowerPattern = pattern.toLowerCase();
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; firstStep: Osid }> = [];

    for (const n of (adjacency.get(loc) ?? []).slice().sort(strictCompare)) {
        if (visited.has(n)) continue;
        visited.add(n);
        const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
        if (ctrl !== faction) continue;
        if (n.toLowerCase().includes(lowerPattern)) return n;
        queue.push({ osid: n, firstStep: n });
    }

    while (queue.length > 0) {
        const { osid, firstStep } = queue.shift()!;
        for (const n of (adjacency.get(osid) ?? []).slice().sort(strictCompare)) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl !== faction) continue;
            if (n.toLowerCase().includes(lowerPattern)) return firstStep;
            queue.push({ osid: n, firstStep });
        }
    }
    return null;
}

/**
 * Compute BFS hop distance from a location to the nearest front OSID.
 * Returns the number of hops, or Infinity if no front is reachable.
 */
export function computeHopsToFront(
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis
): number {
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; depth: number }> = [{ osid: loc, depth: 0 }];

    while (queue.length > 0) {
        const { osid, depth } = queue.shift()!;
        const analysis = graphAnalysis.osid_analysis.get(osid);
        // Front = any OSID with enemy neighbors (not 'interior' or 'quiet' deep)
        if (depth > 0 && analysis && analysis.enemy_neighbors.length > 0) {
            return depth;
        }

        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl !== faction) continue;
            queue.push({ osid: n, depth: depth + 1 });
        }
    }
    return Infinity;
}

/**
 * Find the actual front-line destination OSID for a column march.
 * Unlike findNearestFrontOsid (which returns the FIRST HOP), this returns
 * the actual front OSID itself — the endpoint for multi-turn column transit.
 *
 * Prefers: undefended > critical > threatened (so reinforcements fill gaps).
 * Deterministic: BFS with sorted expansion.
 */
export function findFrontDestinationForColumnMarch(
    state: GameState,
    faction: FactionId,
    loc: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis,
    assignedDests?: Map<Osid, number>
): Osid | null {
    // BFS outward through friendly territory, find closest front OSID
    // Priority: undefended first (needs reinforcement most), then critical, then threatened, then active
    // Distribution: skip destinations already assigned to ≥2 brigades (prevents stacking)
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; depth: number }> = [{ osid: loc, depth: 0 }];

    let bestTarget: Osid | null = null;
    let bestPriority = Infinity; // lower = better
    let bestDepth = Infinity;

    const classificationPriority: Record<string, number> = {
        undefended: 0,
        critical: 1,
        threatened: 2,
        active: 3
    };

    /** Max brigades that can march to the same front OSID. */
    const MAX_COLUMN_MARCH_PER_OSID = 2;

    while (queue.length > 0) {
        const { osid, depth } = queue.shift()!;

        // Early exit: if we've found a target and gone 2 BFS layers past it, stop
        // (allow some depth to find better-priority targets at similar distance)
        if (bestTarget && depth > bestDepth + 1) break;

        if (depth > 0) {
            const analysis = graphAnalysis.osid_analysis.get(osid);
            if (analysis && analysis.enemy_neighbors.length > 0) {
                // Skip salient or cut-off destinations — avoid sending brigades into risky positions
                if (isMovementDestinationRisky(osid, graphAnalysis)) continue;
                // Distribution: skip if too many brigades already assigned here
                const assigned = assignedDests?.get(osid) ?? 0;
                if (assigned >= MAX_COLUMN_MARCH_PER_OSID) {
                    continue; // Don't expand past front, but skip this full OSID
                }

                const prio = classificationPriority[analysis.classification] ?? 10;
                if (prio < bestPriority || (prio === bestPriority && strictCompare(osid, bestTarget!) < 0)) {
                    bestTarget = osid;
                    bestPriority = prio;
                    bestDepth = depth;
                }
                continue; // Don't expand past front
            }
        }

        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl !== faction && ctrl !== null) continue; // traverse friendly or unoccupied
            queue.push({ osid: n, depth: depth + 1 });
        }
    }

    // Update assignment tracker
    if (bestTarget && assignedDests) {
        assignedDests.set(bestTarget, (assignedDests.get(bestTarget) ?? 0) + 1);
    }

    return bestTarget;
}

/**
 * Shared interior-brigade movement: column march if deep, 1-hop move if close to front.
 * Returns true if an order was issued (caller should `continue`), false if nothing was done.
 *
 * Key fixes (n119):
 * - 1-hop classifications now include 'active' as fallback — brigades no longer get stuck
 *   when all front OSIDs are defended (was the primary cause of 53% RS brigades stuck in interior).
 * - Column march destination distribution via `columnAssignments` — prevents all interior
 *   brigades from converging on the same front OSID.
 */
export function issueInteriorMovement(
    brigade: FormationState,
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis,
    result: MovementOrdersAccumulator,
    oneHopClassifications: string[],
    columnAssignments?: Map<Osid, number>
): boolean {
    const hopsToFront = computeHopsToFront(loc, faction, adjacency, state, reverseMap, graphAnalysis);

    // Anti-oscillation: if brigade is only 1 hop from front but has been at this location
    // for multiple turns (entrenchment_turns > 0), use column march instead of 1-hop.
    // This prevents ping-pong between two equidistant positions.
    const useColumnMarch = hopsToFront >= COLUMN_MARCH_MIN_HOPS ||
        (hopsToFront === 1 && (brigade.entrenchment_turns ?? 0) >= 1);

    if (useColumnMarch) {
        const frontDest = findFrontDestinationForColumnMarch(state, faction, loc, adjacency, reverseMap, graphAnalysis, columnAssignments);
        if (frontDest) {
            result.column_march_orders[brigade.id] = frontDest;
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }
    // 1-hop movement: try priority classifications first, then fall back to any front OSID ('active')
    let dest = findNearestFrontOsid(state, faction, loc, adjacency, reverseMap, graphAnalysis, oneHopClassifications);
    if (!dest) {
        // Fallback: move toward ANY front OSID (including 'active' — already defended but still front)
        dest = findNearestFrontOsid(state, faction, loc, adjacency, reverseMap, graphAnalysis,
            ['undefended', 'critical', 'threatened', 'active', 'quiet']);
    }
    if (dest) result.movement_orders[brigade.id] = dest;
    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
    return true;
}
