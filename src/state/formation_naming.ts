/**
 * Deterministic formation naming (plan: militia_and_brigade_formation_system).
 * Historical OoB names can be added via data lookup; fallback is deterministic.
 * Never reuse another faction's historical name.
 *
 * Historical names: Formations created from OOB at Phase I entry (oob_brigades.json) get
 * historical names (e.g. "5th Kozara Light Infantry Brigade"). Emergent spawn uses this
 * fallback only. To give emergent brigades historical names would require a lookup
 * (faction, home_mun) -> name from OOB masters or a derived dataset (see docs/knowledge/
 * ARBIH, HVO, VRS_ORDER_OF_BATTLE_MASTER.md).
 *
 * Phase I Overhaul (Phase B): TO detachment and TO battalion naming added.
 * - TO Detachment: "TO <mun_id>"
 * - TO Battalion:  "TO Bn <mun_id>"
 * - Brigade fallback: "<N>st/nd/rd/th <home_mun> Brigade" (Phase D)
 */

import { MIN_BATTALION_THRESHOLD } from './formation_constants.js';
import type { FactionId } from './game_state.js';
import type { OobBrigade } from '../scenario/oob_loader.js';
import { strictCompare } from './validateGameState.js';

/**
 * Returns a standard English ordinal suffix for a positive integer.
 * 1→"st", 2→"nd", 3→"rd", 4+→"th" (handles 11–13 edge cases).
 * Deterministic, pure.
 */
function ordinalSuffix(n: number): string {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    const mod10 = n % 10;
    if (mod10 === 1) return 'st';
    if (mod10 === 2) return 'nd';
    if (mod10 === 3) return 'rd';
    return 'th';
}

/**
 * Returns a fallback brigade name when no historical OOB match exists.
 * Format: "<N>st/<N>nd/<N>rd/<N>th <home_mun> Brigade"
 * e.g. "1st bihac Brigade", "2nd travnik Brigade", "11th mostar Brigade"
 * Deterministic, pure.
 */
export function fallbackBrigadeName(home_mun: string, ordinal: number): string {
    return `${ordinal}${ordinalSuffix(ordinal)} ${home_mun} Brigade`;
}

/**
 * Finds the matching OOB brigade entry for (faction, home_mun, ordinal).
 *
 * Filters oobBrigades by faction and home_mun, sorts by id (deterministic),
 * and returns the ordinal-th entry (1-based).
 *
 * Step 17 (displaced-origin): when origin_mun is provided and differs from home_mun,
 * first tries to match by origin_mun; if no candidates found, falls back to home_mun.
 *
 * Returns null when no matching OOB entry exists for the given ordinal.
 *
 * @param faction      Faction of the formation being promoted.
 * @param home_mun     Home municipality (where formation currently operates).
 * @param ordinal      1-based position among brigades from this (faction, mun) pair.
 * @param oobBrigades  Full OOB brigade catalog.
 * @param origin_mun   Optional: displaced-origin municipality (tried first if different from home_mun).
 */
export function findMatchedOobEntry(
    faction: FactionId,
    home_mun: string,
    ordinal: number,
    oobBrigades: OobBrigade[],
    origin_mun?: string
): OobBrigade | null {
    // Step 17: displaced-origin — try origin_mun first
    if (origin_mun && origin_mun !== home_mun) {
        const originCandidates = oobBrigades
            .filter(b => b.faction === faction && b.home_mun === origin_mun)
            .sort((a, b) => strictCompare(a.id, b.id));
        if (originCandidates.length > 0) {
            return ordinal <= originCandidates.length ? originCandidates[ordinal - 1] : null;
        }
        // No candidates by origin_mun — fall through to home_mun
    }

    const candidates = oobBrigades
        .filter(b => b.faction === faction && b.home_mun === home_mun)
        .sort((a, b) => strictCompare(a.id, b.id));

    return ordinal <= candidates.length ? candidates[ordinal - 1] : null;
}

/**
 * Matches a historical OOB brigade name for (faction, home_mun, ordinal).
 *
 * Delegates to findMatchedOobEntry and returns the matched entry's name,
 * or null when no OOB entry exists for the given ordinal.
 *
 * @param faction    Faction of the formation being promoted.
 * @param home_mun   Home municipality (where formation operates / where it was spawned).
 * @param ordinal    1-based position among brigades from this (faction, mun) pair.
 * @param oobBrigades  Full OOB brigade catalog.
 * @param origin_mun   Optional: displaced-origin municipality (tried first if different from home_mun).
 */
export function matchHistoricalName(
    faction: FactionId,
    home_mun: string,
    ordinal: number,
    oobBrigades: OobBrigade[],
    origin_mun?: string
): string | null {
    return findMatchedOobEntry(faction, home_mun, ordinal, oobBrigades, origin_mun)?.name ?? null;
}

export function resolveFormationName(
    faction: FactionId,
    mun_id: string,
    kind: 'militia' | 'brigade',
    ordinal: number,
    personnel?: number
): string {
    if (kind === 'militia') {
        if (personnel !== undefined && personnel >= MIN_BATTALION_THRESHOLD) {
            return `TO Bn ${mun_id}`;
        }
        return `TO ${mun_id}`;
    }
    return `${faction} ${mun_id} Brigade ${ordinal}`;
}
