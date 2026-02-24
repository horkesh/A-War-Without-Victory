/**
 * Fog of War classification for warroom modals.
 *
 * Three-tier visibility system:
 * - Tier 1: Own faction — full transparency, exact numbers
 * - Tier 2: Contact-revealed — partial, earned through combat or recon
 * - Tier 3: Hidden — never shown directly; hints only
 *
 * No Math.random(), no timestamps. Pure functions only.
 */

import type { FactionId } from '../../../state/game_state.js';

/** Fog tier: 1 = own (exact), 2 = contact-revealed (partial), 3 = hidden. */
export type FogTier = 1 | 2 | 3;

/** Get all enemy faction IDs (sorted for determinism). */
export function getEnemyFactions(playerFaction: FactionId, allFactionIds: FactionId[]): FactionId[] {
    return allFactionIds
        .filter(f => f !== playerFaction)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Classify a faction-level field's fog tier.
 * Own faction = Tier 1, enemy = Tier 3 (never directly revealed at faction level).
 */
export function classifyFactionFieldTier(
    fieldOwnerFaction: FactionId,
    playerFaction: FactionId
): FogTier {
    return fieldOwnerFaction === playerFaction ? 1 : 3;
}

/** Strength category thresholds aligned with brigade AoR cap. */
export function personnelToStrengthCategory(personnel: number): 'weak' | 'moderate' | 'strong' | 'fortress' {
    if (personnel < 400) return 'weak';
    if (personnel < 800) return 'moderate';
    if (personnel < 1200) return 'strong';
    return 'fortress';
}
