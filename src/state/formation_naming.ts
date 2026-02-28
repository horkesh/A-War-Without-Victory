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
 * - Brigade fallback: "<faction> <mun_id> Brigade <ordinal>" (unchanged)
 */

import { MIN_BATTALION_THRESHOLD } from './formation_constants.js';
import type { FactionId } from './game_state.js';
import type { OobBrigade } from '../scenario/oob_loader.js';

/**
 * Returns a stable formation name for (faction, mun_id, kind, ordinal).
 *
 * For kind === 'militia' (TO detachments / battalions):
 *   - If personnel >= MIN_BATTALION_THRESHOLD (500): "TO Bn <mun_id>"
 *   - Otherwise: "TO <mun_id>"
 *
 * For kind === 'brigade':
 *   - Fallback: "<faction> <mun_id> Brigade <ordinal>"
 *
 * No cross-faction name reuse. For historical names use OOB init (init_formations_oob).
 *
 * @param personnel - Optional; used to distinguish detachment vs battalion for militia kind.
 */
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
 * Matches a historical OOB brigade name for (faction, home_mun, ordinal).
 *
 * Filters oobBrigades by faction and home_mun, sorts by id (deterministic),
 * and returns the name of the ordinal-th entry (1-based).
 *
 * Step 17 (displaced-origin): when origin_mun is provided and differs from home_mun,
 * first tries to match by origin_mun; if no candidates found, falls back to home_mun.
 *
 * Returns null when no matching OOB entry exists.
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
    // Step 17: displaced-origin — try origin_mun first
    if (origin_mun && origin_mun !== home_mun) {
        const byCandidatesOrigin = oobBrigades
            .filter(b => b.faction === faction && b.home_mun === origin_mun)
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        if (byCandidatesOrigin.length > 0) {
            if (ordinal <= byCandidatesOrigin.length) {
                return byCandidatesOrigin[ordinal - 1].name;
            }
            return null;
        }
        // No candidates by origin_mun — fall through to home_mun
    }

    const candidates = oobBrigades
        .filter(b => b.faction === faction && b.home_mun === home_mun)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    if (ordinal <= candidates.length) {
        return candidates[ordinal - 1].name;
    }
    return null;
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
