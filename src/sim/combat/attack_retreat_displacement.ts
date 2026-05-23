/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Execution-Only
 * DOMAIN:    Combat retreat & displacement — formation repositioning after combat
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Nothing strategic — resolves retreats and displacements forced by combat
 * WRITES:    location_osid (defender retreat, displacement), disrupted_turns, cohesion
 * READS:     political_controllers, adjacency, enclave membership, terrain scalars
 * MUST NOT:  issue march orders — only resolve positions forced by battle outcome
 *
 * UPSTREAM:  attack_resolution_osid.ts (combat outcomes trigger retreat/displacement)
 * DOWNSTREAM: political_controllers (reads), brigade_dissolution (inactive on total loss)
 *
 * TRUTH INVARIANTS:
 * - Deterministic: sorted formation IDs and OSID iteration; no Math.random()
 * - Never writes brigade_movement_orders — only location_osid and retreat/advance state
 * - Brigades are NEVER destroyed by retreat — worst case inactive with minimal personnel
 *
 * MOVEMENT TIER: T4 — Combat Consequence (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getTerrainScalarsForSid } from '../../map/terrain_scalars.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import {
    buildOsidAdjacency,
    munFromOsid,
    type Osid
} from './osid_adjacency.js';
import { getEnclaveCapitalOsid, isEnclaveBrigade, isOsidInSameEnclave } from './enclave_resilience.js';
import { removeFromActiveOperation } from './brigade_dissolution.js';
import { getCorpsHqOsid } from './corps_front_sectors.js';
import type { CombatOutcome } from './combat_math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Disruption turns applied to a brigade that is routed to its corps HQ after defending a lost sector OSID. */
export const SECTOR_ROUT_DISRUPTED_TURNS = 4;
/** Cohesion loss on rout to corps HQ. */
export const SECTOR_ROUT_COHESION_LOSS = 30;
/** Personnel fraction retained after rout (0.7 = 30% additional loss). */
export const SECTOR_ROUT_PERSONNEL_RETAIN = 0.7;

/** Max BFS hops when searching for nearest friendly OSID during emergency retreat. */
export const EMERGENCY_RETREAT_BFS_MAX_HOPS = 8;

/** Personnel retain fraction for emergency long-distance retreat (e.g. displaced from behind enemy lines). */
export const EMERGENCY_RETREAT_PERSONNEL_RETAIN = 0.60;
/** Cohesion loss on emergency retreat. */
export const EMERGENCY_RETREAT_COHESION_LOSS = 20;
/** Disruption turns on emergency retreat. */
export const EMERGENCY_RETREAT_DISRUPTED_TURNS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// Defeat/displacement helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Zero entrenchment and defense streak after displacement or defeat. */
export function resetFormationEntrenchment(f: FormationState): void {
    (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
    (f as { defense_streak?: number }).defense_streak = 0;
}

/** Apply standard defeat penalties to a displaced defender: reset entrenchment, record retreat origin, and optionally set disrupted turns. */
export function applyDefeatPenalties(
    f: FormationState,
    targetOsid: string,
    turn: number,
    outcome: CombatOutcome,
): void {
    resetFormationEntrenchment(f);
    (f as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
        osid: targetOsid, turn,
    };
    if (outcome === 'decisive_victory') (f as { disrupted_turns?: number }).disrupted_turns = 2;
    else if (outcome === 'victory') (f as { disrupted_turns?: number }).disrupted_turns = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Build average slope index per OSID for seasonal terrain interaction. */
export function buildSlopeByOsid(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    const out: Record<string, number> = {};
    if (!terrainData?.by_sid) return out;
    const osids = Array.from(reverseMap.keys()).sort(strictCompare);
    for (const osid of osids) {
        const sids = reverseMap.get(osid) ?? [];
        if (sids.length === 0) { out[osid] = 0; continue; }
        let sum = 0;
        for (const sid of sids) {
            const t = getTerrainScalarsForSid(terrainData, sid);
            sum += t.slope_index;
        }
        out[osid] = sum / sids.length;
    }
    return out;
}

/**
 * Find friendly adjacent OSIDs for retreat. Sorted deterministically:
 * fewer enemy neighbors first, then by OSID name.
 */
/**
 * BFS distance from an OSID to a target through friendly territory.
 * Returns hop count, or Infinity if unreachable.
 */
export function bfsDistanceToCapital(
    from: Osid,
    target: Osid,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    factionId: FactionId,
    reverseMap: OperationalToCanonicalReverseMap
): number {
    if (from === target) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    let dist = 0;
    while (frontier.length > 0 && dist < 50) {
        dist++;
        const next: Osid[] = [];
        for (const osid of frontier) {
            for (const n of (adjacency.get(osid) ?? [])) {
                if (visited.has(n)) continue;
                visited.add(n);
                if (n === target) return dist;
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                if (c === factionId) next.push(n);
            }
        }
        frontier = next;
    }
    return Infinity;
}

export function getFriendlyRetreatDestinations(
    state: GameState,
    formation: FormationState,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    const loc = (formation as { location_osid?: string }).location_osid;
    const factionId = formation.faction;
    if (!loc) return [];
    const neighbors = adjacency.get(loc) ?? [];
    let friendly: Osid[] = [];
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c === factionId) friendly.push(n);
    }

    // Enclave retreat gravity: brigades in enclaves prefer retreating toward the capital.
    // BB2 p.479: beaten units fell back concentrically toward Goražde town.
    const capitalOsid = getEnclaveCapitalOsid(loc);
    if (capitalOsid) {
        // Enclave-tagged brigades MUST NOT retreat outside their enclave.
        // Without this filter, brigades drift out through temporary corridors
        // and end up 100km from their pocket (e.g., Goražde brigades in Visoko).
        if (isEnclaveBrigade(formation)) {
            friendly = friendly.filter(f => isOsidInSameEnclave(loc, f));
        }

        // Pre-compute BFS distance to capital for each candidate
        const distCache = new Map<string, number>();
        for (const f of friendly) {
            distCache.set(f, bfsDistanceToCapital(f, capitalOsid, adjacency, state, factionId, reverseMap));
        }
        friendly.sort((a, b) => {
            const dA = distCache.get(a) ?? Infinity;
            const dB = distCache.get(b) ?? Infinity;
            if (dA !== dB) return dA - dB; // Closer to capital = better
            // Tie-break: fewer enemy neighbors = safer
            const aAdj = (adjacency.get(a) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            const bAdj = (adjacency.get(b) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            if (aAdj !== bAdj) return aAdj - bAdj;
            return strictCompare(a, b);
        });
    } else {
        // Non-enclave: original logic (fewest enemy neighbors first)
        friendly.sort((a, b) => {
            const aAdj = (adjacency.get(a) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            const bAdj = (adjacency.get(b) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            if (aAdj !== bAdj) return aAdj - bAdj;
            return strictCompare(a, b);
        });
    }
    return friendly;
}

/**
 * Find any friendly OSID for a faction as an emergency retreat destination.
 * Priority: home_osid → fallback_osid → BFS nearest (8 hops) → corps HQ → any friendly.
 * BFS step keeps enclave brigades in their pocket instead of teleporting to corps HQ.
 */
export function allocateIntegerByWeights(
    ids: string[],
    total: number,
    weightById: Map<string, number>
): Map<string, number> {
    const out = new Map<string, number>();
    if (total <= 0 || ids.length === 0) return out;
    const sorted = [...ids].sort(strictCompare);
    const totalWeight = sorted.reduce((s, id) => s + Math.max(0, weightById.get(id) ?? 0), 0);
    if (totalWeight <= 0) {
        // If no brigade has defensive weight, attribute all to deterministic primary.
        out.set(sorted[0]!, total);
        return out;
    }
    let assigned = 0;
    const remainderOrder: Array<{ id: string; rem: number }> = [];
    for (const id of sorted) {
        const raw = total * (Math.max(0, weightById.get(id) ?? 0) / totalWeight);
        const whole = Math.floor(raw);
        out.set(id, whole);
        assigned += whole;
        remainderOrder.push({ id, rem: raw - whole });
    }
    remainderOrder.sort((a, b) => (b.rem - a.rem) || strictCompare(a.id, b.id));
    let left = total - assigned;
    for (let i = 0; i < remainderOrder.length && left > 0; i++) {
        const id = remainderOrder[i]!.id;
        out.set(id, (out.get(id) ?? 0) + 1);
        left--;
    }
    return out;
}

export function findEmergencyRetreatOsid(
    state: GameState,
    formation: FormationState,
    reverseMap: OperationalToCanonicalReverseMap,
    adjacency?: Map<Osid, Osid[]>,
    sourceOsid?: string,
    friendlyOsids?: Set<string>
): string | null {
    const factionId = formation.faction;
    const pc = state.political?.political_controllers ?? {};

    // Build friendly set and connected components for reachability checks
    const friendly = friendlyOsids ?? buildFriendlySet(pc, factionId);
    const componentOf = adjacency ? buildFriendlyComponentsLocal(adjacency, friendly) : new Map<string, number>();

    const origin = sourceOsid ?? (formation as { location_osid?: string }).location_osid;
    const originComponent = origin ? componentOf.get(origin) : undefined;

    /** Check if a candidate OSID is reachable from origin through friendly territory. */
    const isReachable = (osid: string): boolean => {
        if (originComponent === undefined) return true; // no adjacency → can't verify, allow
        const comp = componentOf.get(osid);
        return comp !== undefined && comp === originComponent;
    };

    // 1. Try home_osid (must be friendly AND reachable)
    const homeOsid = (formation as { home_osid?: string }).home_osid;
    if (homeOsid && friendly.has(homeOsid) && isReachable(homeOsid)) {
        return homeOsid;
    }

    // 2. Try fallback_osid (must be friendly AND reachable)
    const fallbackOsid = (formation as { fallback_osid?: string }).fallback_osid;
    if (fallbackOsid && friendly.has(fallbackOsid) && isReachable(fallbackOsid)) {
        return fallbackOsid;
    }

    // 3. BFS from current location through friendly territory only.
    //    Keeps enclave brigades inside their pocket instead of teleporting to corps HQ.
    //    BB2 p.479: beaten units fell back concentrically toward Goražde town.
    if (adjacency && origin) {
        const visited = new Set<string>([origin]);
        let frontier = [origin as Osid];
        for (let hop = 0; hop < EMERGENCY_RETREAT_BFS_MAX_HOPS && frontier.length > 0; hop++) {
            const next: Osid[] = [];
            for (const curr of frontier) {
                for (const n of (adjacency.get(curr) ?? [])) {
                    if (visited.has(n)) continue;
                    visited.add(n);
                    if (friendly.has(n)) {
                        return n;
                    }
                    // Do NOT expand through enemy territory
                }
            }
            frontier = next;
        }
    }

    // 4. Try corps HQ (must be reachable)
    const hqOsid = getCorpsHqOsid(state, formation);
    if (hqOsid && friendly.has(hqOsid) && isReachable(hqOsid)) {
        return hqOsid;
    }

    // 5. Same connected component fallback (sorted for determinism)
    if (originComponent !== undefined) {
        const compOsids = Array.from(componentOf.entries())
            .filter(([, comp]) => comp === originComponent)
            .map(([osid]) => osid)
            .sort(strictCompare);
        for (const osid of compOsids) {
            if (friendly.has(osid)) return osid;
        }
    }

    // 6. Largest friendly component fallback
    const largestComp = findLargestComponent(componentOf);
    if (largestComp !== -1) {
        const compOsids = Array.from(componentOf.entries())
            .filter(([, comp]) => comp === largestComp)
            .map(([osid]) => osid)
            .sort(strictCompare);
        for (const osid of compOsids) {
            if (friendly.has(osid)) return osid;
        }
    }

    // 7. Any friendly OSID (sorted for determinism) — absolute last resort
    const osids = Object.keys(pc).sort(strictCompare);
    for (const osid of osids) {
        if (pc[osid] === factionId) return osid;
    }

    return null;
}

/** Build a Set of OSIDs controlled by a faction from political_controllers. */
export function buildFriendlySet(
    pc: Record<string, string | null>,
    factionId: string
): Set<string> {
    const result = new Set<string>();
    for (const osid of Object.keys(pc)) {
        if (pc[osid] === factionId) result.add(osid);
    }
    return result;
}

/**
 * BFS connected components through friendly-only territory.
 * Returns Map<osid, componentIndex>. Deterministic via strictCompare sort.
 */
export function buildFriendlyComponentsLocal(
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): Map<string, number> {
    const componentOf = new Map<string, number>();
    let nextComponent = 0;
    const sorted = Array.from(friendlyOsids).sort(strictCompare);
    for (const seed of sorted) {
        if (componentOf.has(seed)) continue;
        const comp = nextComponent++;
        const queue = [seed];
        componentOf.set(seed, comp);
        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++]!;
            for (const n of (adjacency.get(curr as Osid) ?? [])) {
                if (componentOf.has(n)) continue;
                if (!friendlyOsids.has(n)) continue;
                componentOf.set(n, comp);
                queue.push(n);
            }
        }
    }
    return componentOf;
}

/** Find the component index with the most OSIDs. Returns -1 if empty. */
export function findLargestComponent(componentOf: Map<string, number>): number {
    if (componentOf.size === 0) return -1;
    const counts = new Map<number, number>();
    for (const comp of componentOf.values()) {
        counts.set(comp, (counts.get(comp) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = 0;
    // Deterministic: iterate sorted component indices
    const compIndices = Array.from(counts.keys()).sort((a, b) => a - b);
    for (const comp of compIndices) {
        const c = counts.get(comp) ?? 0;
        if (c > bestCount) { bestCount = c; best = comp; }
    }
    return best;
}

/** Options for force retreat penalty overrides. */
export interface ForceRetreatOptions {
    personnelRetain?: number;
    cohesionLoss?: number;
    disruptedTurns?: number;
    adjacency?: Map<Osid, Osid[]>;
    friendlyOsids?: Set<string>;
}

/**
 * Force-retreat a formation to a friendly OSID with heavy penalties.
 * Never destroys the brigade — worst case it goes to reserve status with minimal personnel.
 */
export function forceRetreatWithPenalties(
    state: GameState,
    formation: FormationState,
    reverseMap: OperationalToCanonicalReverseMap,
    sourceOsid: string,
    opts?: ForceRetreatOptions
): void {
    const personnelRetain = opts?.personnelRetain ?? EMERGENCY_RETREAT_PERSONNEL_RETAIN;
    const cohesionLoss = opts?.cohesionLoss ?? EMERGENCY_RETREAT_COHESION_LOSS;
    const disruptedTurns = opts?.disruptedTurns ?? EMERGENCY_RETREAT_DISRUPTED_TURNS;
    const dest = findEmergencyRetreatOsid(state, formation, reverseMap, opts?.adjacency, sourceOsid, opts?.friendlyOsids);
    const f = formation as FormationState & { location_osid?: string; disrupted_turns?: number; last_retreat_from?: { osid: string; turn: number } };
    resetFormationEntrenchment(formation);
    f.disrupted_turns = disruptedTurns;
    formation.cohesion = Math.max(0, (formation.cohesion ?? 60) - cohesionLoss);
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, Math.floor((formation.personnel ?? 0) * personnelRetain));
    if (dest != null) {
        f.location_osid = dest;
        f.last_retreat_from = { osid: sourceOsid, turn: state.meta?.turn ?? 0 };
    } else {
        // Absolute last resort: no friendly territory exists at all — brigade disperses
        // This should only happen if the entire faction's territory is lost
        f.location_osid = undefined;
        removeFromActiveOperation(state, formation.id, formation.corps_id);
        formation.status = 'inactive';
        formation.destruction_turn = state.meta?.turn ?? 0;
    }
}

/**
 * Displace any active formation that has location_osid in an OSID not controlled by its faction.
 * Used after attack resolution (and optionally at end of turn) to enforce invariant: no brigade in enemy territory.
 * Brigades are NEVER destroyed — they retreat with penalties.
 */
export function displaceFormationsInEnemyTerritory(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    preComputedAdjacency?: ReadonlyMap<string, readonly string[]>,
): void {
    const adjacency = (preComputedAdjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    const pc = state.political?.political_controllers ?? {};
    // Lazy per-faction friendly sets
    const friendlyCache = new Map<string, Set<string>>();
    const getFriendly = (fac: string): Set<string> => {
        let s = friendlyCache.get(fac);
        if (!s) { s = buildFriendlySet(pc, fac); friendlyCache.set(fac, s); }
        return s;
    };
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        const factionId = f.faction;
        if (getPoliticalControllerOSID(state, loc, reverseMap) === factionId) continue;
        const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
        const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
        const dest = retreatDests[0];
        if (dest != null) {
            // Adjacent friendly OSID — simple displacement, no penalties
            otherFormation.location_osid = dest;
            resetFormationEntrenchment(otherFormation);
        } else {
            // No adjacent friendly — emergency retreat with penalties
            forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency, friendlyOsids: getFriendly(factionId) });
        }
    }
}

export function applyPersonnelLoss(formation: FormationState, loss: number): void {
    if (typeof formation.personnel !== 'number') return;
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, formation.personnel - loss);
}
