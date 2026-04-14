/**
 * Stranded brigade lifecycle owner.
 *
 * Canonical owner for same-faction unreachable brigades that are NOT in
 * hard-coded enclaves and NOT participating in active operations.
 *
 * State machine:
 *   none/undefined -> holding:      first classified as stranded
 *   holding -> holding:             still stranded, degrade cohesion/morale
 *   holding -> reconnected:         friendly path restored to same-corps sector
 *   holding -> collapsed:           cohesion <= 10 OR held 12+ turns
 *   reconnected -> none:            next turn after reconnection (clear fields)
 *   collapsed -> destroyed:         brigade dissolved (existing dissolution machinery)
 *
 * Deterministic: sorted iteration by formation ID, BFS over sorted adjacency.
 * No Math.random(), no timestamps, no Date.now().
 */

import type { GameState, FormationId, FactionId } from '../../state/game_state.js';
import { isEnclaveBrigade } from './enclave_resilience.js';
import { removeFromActiveOperation } from './brigade_dissolution.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { Osid } from './osid_adjacency.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Cohesion degradation per turn while holding (stranded). */
export const STRANDED_COHESION_DECAY = 3;

/** Morale degradation per turn while holding (stranded). */
export const STRANDED_MORALE_DECAY = 2;

/** Cohesion floor: collapse when cohesion drops to this or below. */
export const STRANDED_COLLAPSE_COHESION = 10;

/** Maximum turns a brigade can hold while stranded before collapsing. */
export const STRANDED_MAX_HOLD_TURNS = 12;

// ── Report type ──────────────────────────────────────────────────────────────

export interface StrandedBrigadeReport {
    updated: number;
    newly_stranded: string[];
    still_holding: string[];
    reconnected: string[];
    collapsed: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check whether a brigade participates in any active operation for its corps.
 * Deterministic: no iteration order dependency (checks inclusion in arrays).
 */
function isInActiveOperation(state: GameState, brigadeId: FormationId, corpsId: string | undefined | null): boolean {
    if (!corpsId) return false;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    for (const op of cmd.active_operations) {
        if (op.participating_brigades.includes(brigadeId)) return true;
    }
    return false;
}

/**
 * BFS reachability: can brigade reach any OSID in a same-corps sector's territory
 * via friendly-controlled OSIDs?
 *
 * Returns true if reachable, false if stranded.
 * Deterministic: BFS frontier sorted by strictCompare at each level.
 */
function canReachCorpsSectorFront(
    locationOsid: string,
    faction: FactionId,
    corpsId: string,
    state: GameState,
    adjacency: ReadonlyMap<Osid, readonly Osid[]>,
): boolean {
    const politicalControllers = state.political?.political_controllers;
    if (!politicalControllers) return true; // No political data = assume reachable

    const sectors = state.military.corps_front_sectors;
    if (!sectors) return true; // No sector data = assume reachable

    // Build target set: all territory OSIDs from same-corps sectors
    const targetOsids = new Set<string>();
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    for (const sid of sectorIds) {
        const sector = sectors[sid];
        if (!sector || sector.corps_id !== corpsId) continue;
        for (const osid of sector.territory_osids) {
            targetOsids.add(osid);
        }
    }

    // If no target sectors exist for this corps, brigade cannot be stranded
    // (corps has no front — entire corps is in reserve/rear)
    if (targetOsids.size === 0) return true;

    // Quick check: if location is already in a target OSID, reachable
    if (targetOsids.has(locationOsid)) return true;

    // BFS from locationOsid through friendly-controlled OSIDs
    const visited = new Set<string>();
    visited.add(locationOsid);
    let frontier = [locationOsid];

    while (frontier.length > 0) {
        const nextFrontier: string[] = [];
        for (const osid of frontier) {
            const neighbors = adjacency.get(osid as Osid) ?? [];
            for (const neighbor of neighbors) {
                if (visited.has(neighbor)) continue;
                // Only traverse through friendly-controlled territory
                const controller = politicalControllers[neighbor];
                if (controller !== faction) continue;
                visited.add(neighbor);
                if (targetOsids.has(neighbor)) return true;
                nextFrontier.push(neighbor);
            }
        }
        // Sort for deterministic BFS order
        nextFrontier.sort(strictCompare);
        frontier = nextFrontier;
    }

    return false;
}

// ── Main lifecycle function ──────────────────────────────────────────────────

/**
 * Update stranded brigade lifecycle for all factions.
 *
 * Called once per war turn, after sector partition and operation reconciliation,
 * before sector offensives advance.
 *
 * Requires: adjacency map (from SpatialContext or built from edges).
 */
export function updateStrandedBrigadeLifecycle(
    state: GameState,
    adjacency: ReadonlyMap<Osid, readonly Osid[]>,
): StrandedBrigadeReport {
    const report: StrandedBrigadeReport = {
        updated: 0,
        newly_stranded: [],
        still_holding: [],
        reconnected: [],
        collapsed: [],
    };

    const turn = state.meta?.turn ?? 0;
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f) continue;

        // --- Phase 1: Handle previously reconnected brigades (clear status) ---
        if (f.stranded_status === 'reconnected') {
            f.stranded_status = 'none';
            f.stranded_since_turn = undefined;
            f.last_reachable_turn = turn;
            // No report entry — this is silent cleanup
            continue;
        }

        // --- Phase 2: Handle collapsed brigades (dissolve) ---
        if (f.stranded_status === 'collapsed') {
            // Already processed — dissolution happened on the turn it collapsed.
            // Skip further processing.
            continue;
        }

        // --- Phase 3: Eligibility check for stranded classification ---
        // Only active field brigades
        if (f.status !== 'active') continue;
        if (f.lifecycle_status && f.lifecycle_status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        if (!f.faction) continue;

        // Exclude enclave brigades (managed by enclave_resilience.ts)
        if (isEnclaveBrigade(f)) continue;

        // Exclude brigades in active operations
        if (isInActiveOperation(state, fid, f.corps_id)) continue;

        // --- Phase 4: Reachability check ---
        const corpsId = f.corps_id;
        if (!corpsId) continue; // Unattached brigades are not subject to stranded lifecycle

        const reachable = canReachCorpsSectorFront(
            f.location_osid, f.faction, corpsId, state, adjacency,
        );

        const currentStatus = f.stranded_status ?? 'none';

        if (reachable) {
            // --- Reachable ---
            if (currentStatus === 'holding') {
                // Was stranded, now reconnected
                f.stranded_status = 'reconnected';
                f.last_reachable_turn = turn;
                report.reconnected.push(fid);
                report.updated++;
            } else {
                // Not stranded, update last reachable turn
                f.last_reachable_turn = turn;
            }
        } else {
            // --- Not reachable ---
            if (currentStatus === 'none' || currentStatus === undefined) {
                // Newly stranded
                f.stranded_status = 'holding';
                f.stranded_since_turn = turn;
                report.newly_stranded.push(fid);
                report.updated++;
            } else if (currentStatus === 'holding') {
                // Still holding — degrade
                const heldTurns = turn - (f.stranded_since_turn ?? turn);

                // Apply degradation
                const cohesion = f.cohesion ?? 50;
                const morale = f.morale ?? 50;
                f.cohesion = Math.max(0, cohesion - STRANDED_COHESION_DECAY);
                f.morale = Math.max(0, morale - STRANDED_MORALE_DECAY);

                // Check collapse conditions
                if (f.cohesion <= STRANDED_COLLAPSE_COHESION || heldTurns >= STRANDED_MAX_HOLD_TURNS) {
                    // Collapse — dissolve the brigade
                    f.stranded_status = 'collapsed';

                    // Use existing dissolution pattern
                    removeFromActiveOperation(state, fid, f.corps_id);

                    // Transfer remaining personnel to strategic reserve
                    const personnel = f.personnel ?? 0;
                    const personnelToReserve = Math.floor(personnel * 0.3); // Lower salvage rate for stranded units
                    if (state.military.strategic_reserves && f.faction) {
                        const factionReserve = state.military.strategic_reserves[f.faction];
                        if (typeof factionReserve === 'number') {
                            (state.military.strategic_reserves as Record<string, number>)[f.faction] =
                                factionReserve + personnelToReserve;
                        }
                    }

                    f.status = 'inactive';
                    f.lifecycle_status = 'destroyed';
                    f.personnel = 0;
                    f.destruction_turn = turn;

                    report.collapsed.push(fid);
                    report.updated++;
                } else {
                    report.still_holding.push(fid);
                    report.updated++;
                }
            }
        }
    }

    return report;
}
