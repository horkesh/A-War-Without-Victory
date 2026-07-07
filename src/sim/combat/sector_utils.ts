/**
 * Utility functions for corps front sectors.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { strictCompare } from '../../state/validateGameState.js';
import { findConnectedComponents } from '../../utils/graph.js';
import {
    isGrazAccordsActive,
    isHerzegovinaTruceActive,
    isKiseljakExclusionActive,
    isEastHerzegovinaPair,
    GRAZ_KISELJAK_VRS_EXCLUSION,
    GRAZ_KISELJAK_HRHB_EXCLUSION,
    GRAZ_EXEMPT_RS_CORPS,
    GRAZ_EXEMPT_HRHB_CORPS,
} from '../local_truces.js';

/** Fraction of entrenchment_turns retained when a brigade is reassigned to a different sub-segment. */
export const REASSIGNMENT_ENTRENCHMENT_RETAIN = 0.3;
export type SectorDefenseByFactionAndOsid = Map<string, Map<string, CorpsFrontSector>>;

function activeAssignedDefenseCount(
    sector: Pick<CorpsFrontSector, 'assigned_brigade_ids'>,
    formations?: Record<FormationId, FormationState>,
): number {
    if (!formations) return sector.assigned_brigade_ids.length;
    let count = 0;
    for (const brigadeId of sector.assigned_brigade_ids) {
        const formation = formations[brigadeId];
        if (formation?.status === 'active') count += 1;
    }
    return count;
}

function preferLiveDefendedSector(
    current: CorpsFrontSector | undefined,
    candidate: CorpsFrontSector,
    formations?: Record<FormationId, FormationState>,
): CorpsFrontSector {
    if (!current) return candidate;
    const currentCount = activeAssignedDefenseCount(current, formations);
    const candidateCount = activeAssignedDefenseCount(candidate, formations);
    if (currentCount === 0 && candidateCount > 0) return candidate;
    return current;
}

/**
 * Partition friendly OSIDs into connected components via BFS.
 * Returns a map from OSID → component index (0-based).
 * Delegates to the generic findConnectedComponents() utility.
 */
export function buildFriendlyComponents(
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): Map<string, number> {
    const components = findConnectedComponents(
        friendlyOsids,
        osid => (adjacency.get(osid as Osid) ?? []).filter(n => friendlyOsids.has(n)),
    );
    const componentOf = new Map<string, number>();
    for (let i = 0; i < components.length; i++) {
        for (const osid of components[i]!) componentOf.set(osid, i);
    }
    return componentOf;
}

/**
 * Get the component ID for a sector (from its first territory OSID or friendly front OSID).
 * Returns -1 if sector has no OSIDs in the component map.
 */
export function getSectorComponent(sector: CorpsFrontSector, componentOf: Map<string, number>): number {
    for (const osid of sector.territory_osids) {
        const c = componentOf.get(osid);
        if (c !== undefined) return c;
    }
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) {
            const c = componentOf.get(o);
            if (c !== undefined) return c;
        }
    }
    return -1;
}

/** Collect the set of friendly-side front OSIDs for a sector. */
export function getSectorFrontOsids(sector: CorpsFrontSector): Set<string> {
    const frontSet = new Set<string>();
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) frontSet.add(o);
    }
    return frontSet;
}

/**
 * Find the sector that DEFENDS targetOsid via sector-coverage when no brigade
 * is physically there.  That is the defender-faction sector whose sub-segment
 * lists targetOsid as a **friendly** OSID (= the sector that owns the territory).
 *
 * Previous implementation searched enemy_osids, which returned the attacker's
 * sector instead of the defender's — making the predictor treat the attacker's
 * own brigades as defenders (blocking attacks against truly undefended OSIDs).
 *
 * Returns the first matching sector in deterministic sector_id order, or null.
 */
export function findSectorForEnemyOsid(
    state: GameState,
    targetOsid: string,
    defenderFaction?: string | null,
): CorpsFrontSector | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;
    const formations = state.military.formations;
    // First pass: check front-edge friendly_osids (primary — direct front defense)
    let match: CorpsFrontSector | undefined;
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        for (const sub of sector.sub_segments) {
            if (sub.friendly_osids.includes(targetOsid)) {
                match = preferLiveDefendedSector(match, sector, formations);
            }
        }
    }
    if (match) return match;

    // Second pass: check territory_osids (fallback — depth territory claimed by post-Voronoi sweep)
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        if (defenderFaction && sector.faction !== defenderFaction) continue;
        if (sector.territory_osids?.includes(targetOsid)) {
            match = preferLiveDefendedSector(match, sector, formations);
        }
    }
    return match ?? null;
}

export function buildSectorDefenseByFactionAndOsid(state: GameState): SectorDefenseByFactionAndOsid {
    const sectors = state.military.corps_front_sectors;
    const byFaction: SectorDefenseByFactionAndOsid = new Map();
    if (!sectors) return byFaction;

    const setBest = (sector: CorpsFrontSector, osid: string): void => {
        if (!sector.faction) return;
        let byOsid = byFaction.get(sector.faction);
        if (!byOsid) {
            byOsid = new Map();
            byFaction.set(sector.faction, byOsid);
        }
        byOsid.set(osid, preferLiveDefendedSector(byOsid.get(osid), sector, state.military.formations));
    };

    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        for (const sub of sector.sub_segments) {
            for (const osid of sub.friendly_osids) setBest(sector, osid);
        }
    }
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid]!;
        for (const osid of sector.territory_osids ?? []) setBest(sector, osid);
    }

    return byFaction;
}

/**
 * Get the corps HQ OSID for the brigade's corps — used as rout destination when
 * a sector-coverage defender has no valid retreat path after a flip.
 * Returns null if no corps formation is found or it has no location_osid.
 */
export function getCorpsHqOsid(
    state: GameState,
    formation: FormationState
): string | null {
    const corpsId = getFormationCorpsId(formation);
    if (!corpsId) return null;
    const corpsFormation = state.military.formations?.[corpsId];
    if (!corpsFormation) return null;
    return (corpsFormation as FormationState & { location_osid?: string }).location_osid ?? null;
}

/**
 * BFS from startOsid through friendly territory to find the nearest OSID
 * belonging to a sector. If allowedSectorIdxs is provided, only sectors
 * in that set are considered (used for corps-strict assignment).
 * Returns the sector index, or null if unreachable.
 */
export function bfsToNearestSector(
    startOsid: string,
    osidToSectorIdx: Map<string, number>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    allowedSectorIdxs?: number[]
): number | null {
    const allowed = allowedSectorIdxs ? new Set(allowedSectorIdxs) : null;

    // Quick check: already at a sector OSID?
    const direct = osidToSectorIdx.get(startOsid);
    if (direct !== undefined && (!allowed || allowed.has(direct))) return direct;

    // BFS through friendly territory (adjacency lists are pre-sorted by buildOsidAdjacency)
    const visited = new Set<string>();
    visited.add(startOsid);
    const queue: string[] = [startOsid];
    let head = 0;

    while (head < queue.length) {
        const osid = queue[head++]!;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (!friendlyOsids.has(n)) continue;
            visited.add(n);

            const sIdx = osidToSectorIdx.get(n);
            if (sIdx !== undefined && (!allowed || allowed.has(sIdx))) return sIdx;

            queue.push(n);
        }
    }

    return null; // Unreachable (enclave with no front edges)
}

/**
 * Returns the set of "unique" front OSIDs for `sector` — those that do NOT appear
 * in any other sector's sub_segments.friendly_osids.  Used by FIX 1 in
 * buildFactionSectors to distinguish OSIDs that only this sector would staff vs
 * junction OSIDs that are already covered by a sibling sector.
 *
 * If the returned set is empty, all front OSIDs are shared — fall back to the
 * original component check.
 */
export function getSectorUniqueFrontOsids(
    sector: CorpsFrontSector,
    otherSectors: CorpsFrontSector[],
): Set<string> {
    // Collect all front OSIDs that appear in OTHER sectors under construction
    const sharedPool = new Set<string>();
    for (const other of otherSectors) {
        if (other === sector) continue;
        for (const ss of other.sub_segments) {
            for (const o of ss.friendly_osids) sharedPool.add(o);
        }
    }

    // Front OSIDs of this sector not present in the shared pool are "unique"
    const unique = new Set<string>();
    for (const ss of sector.sub_segments) {
        for (const o of ss.friendly_osids) {
            if (!sharedPool.has(o)) unique.add(o);
        }
    }
    return unique;
}

/**
 * Returns true iff at least one corps brigade (identified by formation ID) can
 * reach any OSID in `targets` within `maxHops` BFS hops through `friendlyOsids`.
 *
 * Deterministic: brigade IDs are iterated in the order supplied (caller must
 * sort by strictCompare before passing).  BFS expansion is through the
 * adjacency list which is pre-sorted by buildOsidAdjacency.
 *
 * Used by FIX 1 in buildFactionSectors: if a sector's unique front OSIDs are
 * unreachable from ALL corps brigades, the sector is an unstaffable ghost and
 * should be skipped before it enters the pipeline.
 */
export function canAnyBrigadeReachAny(
    brigadeLocations: string[],
    targets: Set<string>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    maxHops: number,
): boolean {
    if (targets.size === 0 || brigadeLocations.length === 0) return false;
    const visited = new Set<string>();
    let frontier: string[] = [];

    for (const startOsid of brigadeLocations) {
        if (!startOsid) continue;
        if (targets.has(startOsid)) return true;
        if (visited.has(startOsid)) continue;
        visited.add(startOsid);
        frontier.push(startOsid);
    }

    for (let hop = 1; hop <= maxHops; hop++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const nb of adjacency.get(osid as Osid) ?? []) {
                if (visited.has(nb)) continue;
                visited.add(nb);
                // Only traverse through friendly territory
                if (!friendlyOsids.has(nb)) continue;
                if (targets.has(nb)) return true;
                next.push(nb);
            }
        }
        if (next.length === 0) break;
        frontier = next;
    }

    return false;
}

/**
 * Simple BFS distance between two OSIDs through adjacency graph.
 * When `friendlyOsids` is provided, BFS only expands through OSIDs in that set
 * (the `from` and `to` nodes are always allowed regardless).
 * This prevents pathing through enemy territory.
 */
export function bfsDistance(
    from: string,
    to: string,
    adjacency: Map<string, string[]>,
    friendlyOsids?: Set<string>,
): number {
    if (from === to) return 0;
    if (!from || !to) return Infinity;
    const visited = new Set<string>([from]);
    const queue: Array<{ osid: string; depth: number }> = [{ osid: from, depth: 0 }];
    let head = 0;
    const maxDepth = 20; // cap search depth

    while (head < queue.length) {
        const { osid, depth } = queue[head++]!;
        if (depth >= maxDepth) break;
        const neighbors = adjacency.get(osid) ?? [];
        for (const n of neighbors) {
            if (n === to) return depth + 1;
            if (visited.has(n)) continue;
            // When faction-filtering, only expand through friendly territory
            if (friendlyOsids && !friendlyOsids.has(n)) continue;
            visited.add(n);
            queue.push({ osid: n, depth: depth + 1 });
        }
    }
    return Infinity;
}

/**
 * Get sorted list of active corps formation IDs for a faction.
 */
export function getCorpsForFaction(
    formations: Record<FormationId, FormationState>,
    faction: FactionId
): FormationId[] {
    return Object.keys(formations)
        .sort(strictCompare)
        .filter(fid => {
            const f = formations[fid];
            return f && f.faction === faction && f.status === 'active'
                && (f.kind === 'corps' || f.kind === 'corps_asset');
        });
}

/**
 * Get sorted list of faction IDs in the game.
 */
export function getFactions(state: GameState): FactionId[] {
    return (state.factions ?? []).map(f => f.id).sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Cold Front Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Is this sector on a cold front (RS↔HRHB truce under Graz Accords)?
 * Simplified check for bot AI — mirrors frontline_attrition.ts isColdFront.
 * Applies to ALL RS↔HRHB fronts except Posavina exempt corps and
 * east Herzegovina before Op Jackal ends.
 *
 * Extracted from bot_corps_directives.ts for reuse by sector suppression
 * and bot stance evaluation.
 */
export function isSectorColdFront(state: GameState, sector: CorpsFrontSector): boolean {
    if (!isGrazAccordsActive(state)) return false;
    const fac = sector.faction;
    const opp = sector.opposing_factions;
    const hasRsHrhb =
        (fac === 'RS' && opp.includes('HRHB')) ||
        (fac === 'HRHB' && opp.includes('RS'));
    if (!hasRsHrhb) return false;

    // A sector that also faces a non-truce opponent (e.g. SRK facing both RBiH
    // and HRHB Kiseljak pocket) is NOT a cold front — it's an active combat zone.
    // Cold front only applies when the ONLY opponents are the truce pair (RS↔HRHB).
    const hasNonTruceFoe = fac === 'RS'
        ? opp.some(f => f !== 'HRHB')
        : opp.some(f => f !== 'RS');
    if (hasNonTruceFoe) return false;

    // Faction-level RS↔HRHB ceasefire (Herzegovina truce component)
    if (isHerzegovinaTruceActive(state)) {
        const corpsId = sector.corps_id;

        // Posavina corps are exempt (active fighting)
        if (corpsId && GRAZ_EXEMPT_RS_CORPS.has(corpsId)) return false;
        if (corpsId && GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) return false;

        // Op Jackal: east Herzegovina pair not yet frozen
        if (corpsId && isEastHerzegovinaPair(corpsId)
            && state.political.graz_east_herzegovina_active_turn == null) {
            return false;
        }

        // All other RS↔HRHB contact is cold
        return true;
    }

    // Kiseljak OSID exclusion
    if (isKiseljakExclusionActive(state)) {
        for (const ss of sector.sub_segments) {
            for (const osid of ss.friendly_osids) {
                if (GRAZ_KISELJAK_VRS_EXCLUSION.has(osid) || GRAZ_KISELJAK_HRHB_EXCLUSION.has(osid)) {
                    return true;
                }
            }
        }
    }
    return false;
}
