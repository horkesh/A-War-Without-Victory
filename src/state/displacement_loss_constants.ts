/**
 * Shared displacement loss parameters (canon: same policy as displacement.ts).
 * Single source for displacement_takeover and minority_flight.
 */

import type { FactionId } from './game_state.js';

/** Default fraction of displaced population killed.
 * Only applies to first displacement; re-displacement is pass-through (0 casualties). */
export const DISPLACEMENT_KILLED_FRACTION = 0.04;

/** RS civilian departure from RBiH/HRHB was mostly voluntary flight (~1% lethality).
 * Historical: sim was producing ~10,860 RS civ killed vs ~4k actual (n159 audit B2). */
export const DISPLACEMENT_KILLED_FRACTION_RS_FROM_NON_RS = 0.01;

/** Per-context kill fraction: RS civilians displaced by non-RS controllers get 1%,
 * all other combinations keep the default 4%. */
export function getDisplacementKillFraction(displacedFaction: FactionId, controllerFaction: FactionId): number {
    if (displacedFaction === 'RS' && controllerFaction !== 'RS') return DISPLACEMENT_KILLED_FRACTION_RS_FROM_NON_RS;
    return DISPLACEMENT_KILLED_FRACTION;
}

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
