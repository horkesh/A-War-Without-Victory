/**
 * Shared utility functions for bot corps AI modules.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import {
    COHESION_HEALTHY_THRESHOLD,
    PERSONNEL_HEALTHY_THRESHOLD,
} from './bot_constants.js';
import { buildOsidAdjacency } from './osid_adjacency.js';

/** Assess supply health of a corps by checking supply state of subordinate brigades. */
export function assessCorpsSupplyHealth(
    subordinates: FormationState[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null
): { adequate_fraction: number; strained_fraction: number; critical_fraction: number } {
    if (!supplyByOsid?.factions || subordinates.length === 0) {
        return { adequate_fraction: 1, strained_fraction: 0, critical_fraction: 0 };
    }
    const fac = supplyByOsid.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return { adequate_fraction: 1, strained_fraction: 0, critical_fraction: 0 };

    const osidState = new Map<string, SupplyStateLevel>();
    for (const e of fac.by_osid) osidState.set(e.osid, e.state);

    let adequate = 0, strained = 0, critical = 0;
    for (const b of subordinates) {
        const st = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        switch (st) {
            case 'adequate': adequate++; break;
            case 'strained': strained++; break;
            case 'critical': critical++; break;
        }
    }
    const total = subordinates.length;
    return {
        adequate_fraction: adequate / total,
        strained_fraction: strained / total,
        critical_fraction: critical / total,
    };
}

/** Get all active corps for a faction, sorted by ID.
 *  Checks both state.formations (for corps with kind==='corps') AND
 *  state.corps_command keys (for corps that only exist as references
 *  from brigade corps_id — common when corps formations aren't loaded).
 */
export function getFactionCorps(state: GameState, faction: FactionId): FormationState[] {
    const formations = state.military.formations ?? {};
    const result: FormationState[] = [];
    const seenIds = new Set<string>();

    // 1. Real corps formations in state.formations
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'corps') continue;
        result.push(f);
        seenIds.add(id);
    }

    // 2. Corps that exist only in corps_command (discovered from brigade corps_id refs)
    if (state.military.corps_command) {
        for (const cid of Object.keys(state.military.corps_command).sort(strictCompare)) {
            if (seenIds.has(cid)) continue;

            // Determine faction from subordinate brigades
            const subs = getCorpsSubordinates(state, cid);
            if (subs.length === 0) continue;
            if (subs[0].faction !== faction) continue;

            // Derive home municipality tag from most common subordinate location
            const munCounts = new Map<string, number>();
            for (const b of subs) {
                const osid = b.location_osid;
                if (!osid) continue;
                // Extract municipality from OSID: "op:municipality:slug" -> "municipality"
                const parts = osid.split(':');
                if (parts.length >= 2) {
                    const mun = parts[1];
                    munCounts.set(mun, (munCounts.get(mun) ?? 0) + 1);
                }
            }
            let homeMun: string | null = null;
            let maxCount = 0;
            for (const [mun, count] of [...munCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
                if (count > maxCount) { maxCount = count; homeMun = mun; }
            }

            const tags: string[] = [];
            if (homeMun) tags.push(`mun:${homeMun}`);

            // Synthesize a minimal FormationState
            result.push({
                id: cid,
                faction,
                kind: 'corps',
                status: 'active',
                tags,
            } as FormationState);
            seenIds.add(cid);
        }
    }

    return result;
}

/** Get active brigades subordinate to a given corps. */
export function getCorpsSubordinates(state: GameState, corpsId: FormationId): FormationState[] {
    const formations = state.military.formations ?? {};
    const result: FormationState[] = [];
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;
        if (f.corps_id !== corpsId) continue;
        result.push(f);
    }
    return result;
}

/** Compute average personnel fraction for a set of brigades. */
export function averagePersonnelFraction(brigades: FormationState[]): number {
    if (brigades.length === 0) return 0;
    let sum = 0;
    for (const b of brigades) sum += (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
    return sum / brigades.length;
}

/** Compute average cohesion for a set of brigades. */
export function averageCohesion(brigades: FormationState[]): number {
    if (brigades.length === 0) return 0;
    let sum = 0;
    for (const b of brigades) sum += b.cohesion ?? 60;
    return sum / brigades.length;
}

/** Count how many brigades are "healthy" (personnel > 70%, cohesion > 50). */
export function countHealthyBrigades(brigades: FormationState[]): number {
    let count = 0;
    for (const b of brigades) {
        const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
        const coh = b.cohesion ?? 60;
        if (persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD) count++;
    }
    return count;
}

/** Sort brigades by personnel descending, then by ID for deterministic tie-breaking. */
export function sortByPersonnelDesc(brigades: FormationState[]): FormationState[] {
    return [...brigades].sort((a, b) => {
        const pDiff = (b.personnel ?? 0) - (a.personnel ?? 0);
        if (pDiff !== 0) return pDiff;
        return strictCompare(a.id, b.id);
    });
}

/** Get the home municipality of a corps (from tags or home_mun). */
export function getCorpsHomeMun(corps: FormationState): string | null {
    if (!corps.tags) return null;
    for (const tag of corps.tags) {
        if (tag.startsWith('mun:')) return tag.slice(4);
    }
    return null;
}

/** Compute a simple sector threat ratio for a corps' area.
 *  Uses OSID-based brigade locations instead of legacy AoR.
 *  Counts enemies at corps positions AND adjacent OSIDs (the actual threat). */
export function computeSectorThreat(
    state: GameState,
    subordinates: FormationState[],
    edges: EdgeRecord[]
): number {
    if (subordinates.length === 0) return 1.0;
    const faction = subordinates[0]?.faction;
    if (!faction) return 1.0;

    // Collect OSIDs where this corps' brigades are stationed
    const corpsOsids = new Set<string>();
    for (const b of subordinates) {
        if (b.location_osid) corpsOsids.add(b.location_osid);
    }
    if (corpsOsids.size === 0) return 1.0;

    // Expand to include adjacent OSIDs — enemies there are the actual threat
    const adjacency = buildOsidAdjacency(edges);
    const threatZone = new Set<string>(corpsOsids);
    for (const osid of corpsOsids) {
        const neighbors = adjacency.get(osid);
        if (neighbors) {
            for (const n of neighbors) threatZone.add(n);
        }
    }

    // Count friendly vs enemy personnel
    // Friendly: only at corps positions. Enemy: anywhere in threat zone.
    const formations = state.military.formations ?? {};
    let ourPersonnel = 0;
    let enemyPersonnel = 0;
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (f.status !== 'active' || !f.location_osid) continue;
        if (f.faction === faction) {
            if (corpsOsids.has(f.location_osid)) {
                ourPersonnel += f.personnel ?? 0;
            }
        } else {
            if (threatZone.has(f.location_osid)) {
                enemyPersonnel += f.personnel ?? 0;
            }
        }
    }

    if (ourPersonnel <= 0) return enemyPersonnel > 0 ? 2.0 : 1.0;
    return enemyPersonnel / ourPersonnel;
}
