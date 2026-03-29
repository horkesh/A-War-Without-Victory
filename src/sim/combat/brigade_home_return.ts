/**
 * Periodic return-to-home mechanism for displaced brigades.
 * Identifies brigades far from home municipality with no active operation,
 * and issues column march orders toward home.
 *
 * Runs every RETURN_CHECK_INTERVAL turns as a pipeline step.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no timestamps.
 */

import type { CorpsCommandState, FormationId, FormationState, GameState, OperationAxis, SettlementId } from '../../state/game_state.js';
import type { TurnContext } from '../turn_pipeline_types.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Only check every N turns (not every turn — avoids oscillation with garrison-fill). */
export const RETURN_CHECK_INTERVAL = 4;

/** Min BFS hops from home municipality before triggering return. */
export const RETURN_DISPLACEMENT_THRESHOLD = 3;

/** Max column march distance per return order. */
export const RETURN_MAX_MARCH_HOPS = 4;

/** Max brigades that can be returning simultaneously per corps. */
export const RETURN_MAX_PER_CORPS = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReturnMarchOrder {
    brigade_id: FormationId;
    target_osid: string;
    home_municipality: string;
    current_municipality: string;
    hops: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract municipality from OSID like "op:zenica:zenica_2" → "zenica". */
function municipalityFromOsid(osid: string): string {
    return osid.split(':')[1] ?? '';
}

/**
 * BFS from `start` through friendly territory toward any OSID in `targetMunicipality`.
 * Returns { distance, path } where path is the full BFS path from start to a home OSID.
 * Returns null if unreachable within MAX search depth.
 */
function bfsTowardHome(
    start: string,
    targetMunicipality: string,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): { distance: number; path: string[] } | null {
    if (municipalityFromOsid(start) === targetMunicipality) return null; // already home
    const visited = new Map<string, string | null>(); // osid → parent
    visited.set(start, null);
    const queue: Array<{ osid: string; depth: number }> = [{ osid: start, depth: 0 }];
    let head = 0;
    const maxDepth = 20; // generous cap — most maps are well under this

    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        if (depth >= maxDepth) continue;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            visited.set(n, osid);
            if (municipalityFromOsid(n) === targetMunicipality) {
                // Reconstruct path
                const path: string[] = [n];
                let cur: string | null = n;
                while (cur !== null) {
                    const parent: string | null = visited.get(cur) ?? null;
                    if (parent !== null) path.push(parent);
                    cur = parent;
                }
                path.reverse(); // start → ... → home
                return { distance: depth + 1, path };
            }
            queue.push({ osid: n, depth: depth + 1 });
        }
    }

    return null; // no path through friendly territory
}

function bfsDistanceToAny(
    start: string,
    targets: Set<string>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>
): number | null {
    if (targets.has(start)) return 0;
    const visited = new Set<string>([start]);
    const queue: Array<{ osid: string; depth: number }> = [{ osid: start, depth: 0 }];
    let head = 0;
    const maxDepth = 20;
    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        if (depth >= maxDepth) continue;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            if (targets.has(n)) return depth + 1;
            visited.add(n);
            queue.push({ osid: n, depth: depth + 1 });
        }
    }
    return null;
}

/**
 * Check if a brigade is participating in an active operation.
 * Mirrors the logic in compute_home_defense.ts and brigade_front_distribution.ts.
 */
function isOperationParticipant(state: GameState, brigadeId: FormationId): boolean {
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid as FormationId]!;
        if (f.kind !== 'corps_asset') continue;
        const op = (f as unknown as Partial<CorpsCommandState>).active_operation;
        if (!op) continue;
        if (op.axes) {
            if (op.axes.some((a: OperationAxis) => a.assigned_brigades?.includes(brigadeId))) return true;
        }
        // Check flat participating_brigades
        if (op.participating_brigades?.includes(brigadeId)) return true;
    }
    // Also check corps_command active operations
    const corpsCmd = state.military.corps_command;
    if (corpsCmd) {
        for (const cid of Object.keys(corpsCmd)) {
            const cmd = corpsCmd[cid];
            const op = cmd?.active_operation;
            if (!op || op.phase !== 'execution') continue;
            if (op.axes) {
                if (op.axes.some((a: OperationAxis) => a.assigned_brigades?.includes(brigadeId))) return true;
            }
            if (op.participating_brigades?.includes(brigadeId)) return true;
        }
    }
    return false;
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Compute return march orders for displaced brigades of a given faction.
 * Returns orders sorted by distance DESC, then brigade_id ASC (deterministic).
 * Caps at RETURN_MAX_PER_CORPS per corps.
 */
export function computeReturnMarches(
    state: GameState,
    faction: string,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): ReturnMarchOrder[] {
    const formations = state.military.formations ?? {};
    const existingOrders = state.military.brigade_movement_orders ?? {};
    const lineAssigned = new Set<string>();
    /** Brigades assigned to tiny pocket sectors (< 3 territory OSIDs) should NOT be exempt
     *  from home return — they're stuck in ad-hoc pockets, not real front assignments. */
    const tinyPocketLineAssigned = new Set<string>();
    const corpsFrontTargets = new Map<string, Set<string>>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        const isTinyPocket = (sector.territory_osids?.length ?? 0) < 3;
        for (const bid of sector.assigned_brigade_ids ?? []) {
            lineAssigned.add(bid);
            if (isTinyPocket) tinyPocketLineAssigned.add(bid);
        }
        const set = corpsFrontTargets.get(sector.corps_id) ?? new Set<string>();
        for (const ss of sector.sub_segments ?? []) {
            for (const osid of ss.friendly_osids ?? []) set.add(osid);
        }
        corpsFrontTargets.set(sector.corps_id, set);
    }

    // Collect candidates
    const candidates: Array<ReturnMarchOrder & { corps_id: string }> = [];

    const sortedIds = Object.keys(formations).sort(strictCompare);
    for (const id of sortedIds) {
        const f = formations[id as FormationId]!;

        // Only active brigades of this faction
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;
        // Line-assigned brigades are expected to stay with their sector front,
        // not get periodic home-return pulls — UNLESS they're in a tiny pocket
        // sector (< 3 territory OSIDs) that isn't strategically valuable.
        if (lineAssigned.has(id) && !tinyPocketLineAssigned.has(id)) continue;

        // Skip if no location or no home
        const loc = f.location_osid;
        const homeOsid = f.home_osid;
        if (!loc || !homeOsid) continue;

        // Skip if already in home municipality
        const homeMun = municipalityFromOsid(homeOsid);
        const currentMun = municipalityFromOsid(loc);
        if (currentMun === homeMun) continue;

        // Skip if in active operation
        if (isOperationParticipant(state, id as FormationId)) continue;

        // Skip if disrupted
        if ((f.disrupted_turns ?? 0) > 0) continue;

        // Skip if combat ineffective
        if ((f.personnel ?? 1000) < 400) continue;

        // Skip if already has pending movement orders
        if (existingOrders[id as FormationId]) continue;

        // Skip if no corps (unattached)
        const corpsId = f.corps_id;
        if (!corpsId) continue;
        const corpsFrontSet = corpsFrontTargets.get(corpsId);
        if (corpsFrontSet && corpsFrontSet.size > 0) {
            const distToCorpsFront = bfsDistanceToAny(loc, corpsFrontSet, adjacency, friendlyOsids);
            if (distToCorpsFront != null) continue;
        }

        // BFS toward home municipality through friendly territory
        const result = bfsTowardHome(loc, homeMun, adjacency, friendlyOsids);
        if (!result) continue;
        if (result.distance <= RETURN_DISPLACEMENT_THRESHOLD) continue;

        // Target = partial march toward home (RETURN_MAX_MARCH_HOPS along path)
        const pathIdx = Math.min(RETURN_MAX_MARCH_HOPS, result.path.length - 1);
        const targetOsid = result.path[pathIdx]!;

        candidates.push({
            brigade_id: id as FormationId,
            target_osid: targetOsid,
            home_municipality: homeMun,
            current_municipality: currentMun,
            hops: result.distance,
            corps_id: corpsId,
        });
    }

    // Sort: distance DESC, then brigade_id ASC (deterministic)
    candidates.sort((a, b) => {
        if (b.hops !== a.hops) return b.hops - a.hops;
        return strictCompare(a.brigade_id, b.brigade_id);
    });

    // Cap per corps
    const corpsCount = new Map<string, number>();
    const orders: ReturnMarchOrder[] = [];

    for (const c of candidates) {
        const count = corpsCount.get(c.corps_id) ?? 0;
        if (count >= RETURN_MAX_PER_CORPS) continue;
        corpsCount.set(c.corps_id, count + 1);
        orders.push({
            brigade_id: c.brigade_id,
            target_osid: c.target_osid,
            home_municipality: c.home_municipality,
            current_municipality: c.current_municipality,
            hops: c.hops,
        });
    }

    return orders;
}

// ── Pipeline step ─────────────────────────────────────────────────────────────

/**
 * Pipeline step: evaluate and issue return-to-home column march orders for
 * displaced brigades. Only runs every RETURN_CHECK_INTERVAL turns.
 */
export function evaluateHomeReturn(
    state: GameState,
    adjacency: Map<string, string[]>,
): void {
    const turn = state.meta?.turn ?? 0;
    if (turn % RETURN_CHECK_INTERVAL !== 0) return;

    const pc = state.political?.political_controllers;
    if (!pc) return;

    // Process each faction
    const factions = ['RBiH', 'RS', 'HRHB'];
    for (const faction of factions) {
        // Build friendly OSID set for this faction
        const friendlyOsids = new Set<string>();
        for (const osid of Object.keys(pc).sort(strictCompare)) {
            if (pc[osid] === faction) friendlyOsids.add(osid);
        }

        const orders = computeReturnMarches(state, faction, adjacency, friendlyOsids);

        // Issue column march orders (same pattern as brigade_front_distribution.ts)
        for (const order of orders) {
            if (!state.military.brigade_movement_orders) {
                state.military.brigade_movement_orders = {};
            }
            state.military.brigade_movement_orders![order.brigade_id] = {
                destination_sids: [order.target_osid as SettlementId],
                stance: 'column',
            } as { destination_sids: SettlementId[] };
        }
    }
}
