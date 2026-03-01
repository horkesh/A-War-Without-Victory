/**
 * Shared displacement loss parameters (canon: same policy as displacement.ts).
 * Single source for displacement_takeover and minority_flight.
 */

import type { FactionId } from './game_state.js';

/** Fraction of displaced population killed (all ethnicities).
 * Historical: ~38K civilian killed across full war, ~2M total displaced ≈ 1.9%.
 * Only applies to first displacement; re-displacement is pass-through (0 casualties). */
export const DISPLACEMENT_KILLED_FRACTION = 0.02;

/** Serbs: ~30% of displaced leave BiH (Serbia to flee to). */
export const FLEE_ABROAD_FRACTION_RS = 0.30;

/** Croats: ~25% leave BiH (Croatia to flee to). */
export const FLEE_ABROAD_FRACTION_HRHB = 0.25;

/** Bosniaks: no external state to flee to. */
export const FLEE_ABROAD_FRACTION_RBIH = 0.0;

// TODO Phase F step 26: when siege_ratio >= SIEGE_RATIO_FULL for a municipality,
// override FLEE_ABROAD_FRACTION to 0 for all factions — no one can leave a fully surrounded enclave.
// Requires passing siege state into displacement calculation (src/state/displacement.ts).

/** Flee-abroad fraction for an ethnicity-aligned faction. */
export function getFactionFleeAbroadFraction(faction: FactionId): number {
    if (faction === 'RS') return FLEE_ABROAD_FRACTION_RS;
    if (faction === 'HRHB') return FLEE_ABROAD_FRACTION_HRHB;
    return FLEE_ABROAD_FRACTION_RBIH;
}
