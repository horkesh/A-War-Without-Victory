/**
 * Shared displacement loss parameters (canon: same policy as displacement.ts).
 * Single source for displacement_takeover and minority_flight.
 */

import type { FactionId } from './game_state.js';

/** Fraction of displaced population killed (all ethnicities). */
export const DISPLACEMENT_KILLED_FRACTION = 0.10;

/** Serbs: ~30% of displaced leave BiH (Serbia to flee to). */
export const FLEE_ABROAD_FRACTION_RS = 0.30;

/** Croats: ~25% leave BiH (Croatia to flee to). */
export const FLEE_ABROAD_FRACTION_HRHB = 0.25;

/** Bosniaks: no external state to flee to. */
export const FLEE_ABROAD_FRACTION_RBIH = 0.0;

/** Flee-abroad fraction for an ethnicity-aligned faction. */
export function getFactionFleeAbroadFraction(faction: FactionId): number {
    if (faction === 'RS') return FLEE_ABROAD_FRACTION_RS;
    if (faction === 'HRHB') return FLEE_ABROAD_FRACTION_HRHB;
    return FLEE_ABROAD_FRACTION_RBIH;
}
