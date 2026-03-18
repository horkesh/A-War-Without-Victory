/**
 * Shared displacement loss parameters (canon: same policy as displacement.ts).
 * Single source for displacement_takeover and minority_flight.
 */

import type { FactionId } from './game_state.js';

/** Default fraction of displaced population killed.
 * Only applies to first displacement; re-displacement is pass-through (0 casualties).
 * n897 audit: lowered from 0.04 to 0.02 — old default was hitting HRHB civilians
 * at 4% (double Bosniak rate), producing inverted kill ratios vs history. */
export const DISPLACEMENT_KILLED_FRACTION = 0.02;

/** RS civilian departure from RBiH/HRHB was mostly voluntary flight (~1% lethality).
 * Historical: sim was producing ~10,860 RS civ killed vs ~4k actual (n159 audit B2). */
export const DISPLACEMENT_KILLED_FRACTION_RS_FROM_NON_RS = 0.01;

/** RBiH civilians displaced by RS forces — systematic ethnic cleansing.
 * Historical: ~30k Bosniak civilian deaths over full war, with the worst in 1992
 * (Prijedor, Zvornik, Foca, Visegrad). Bosniaks = ~75% of all civilian deaths.
 * n218: was 0.04 (too high at 40w). n897: raised from 0.02 to 0.04 — the original
 * n218 reduction overcompensated. 0.04 is correct because Bosniak ethnic cleansing
 * was uniquely severe. Acute events (Srebrenica-type) modeled separately. */
export const DISPLACEMENT_KILLED_FRACTION_RBIH_FROM_RS = 0.04;

/** HRHB civilians displaced by RS forces — lower than Bosniak rate.
 * Croat civilian deaths from Serb forces were proportionally much lower (~2k full war
 * vs ~30k Bosniak). Croats faced expulsion but less systematic killing. */
export const DISPLACEMENT_KILLED_FRACTION_HRHB_FROM_RS = 0.01;

/** Per-context kill fraction: models asymmetric ethnic cleansing severity.
 * RBiH displaced by RS: 4% (systematic ethnic cleansing — worst of the war)
 * HRHB displaced by RS: 1% (expulsion, not systematic killing)
 * RS displaced by non-RS: 1% (mostly voluntary flight)
 * All other combinations: 2% default (general wartime displacement) */
export function getDisplacementKillFraction(displacedFaction: FactionId, controllerFaction: FactionId): number {
    if (displacedFaction === 'RS' && controllerFaction !== 'RS') return DISPLACEMENT_KILLED_FRACTION_RS_FROM_NON_RS;
    if (displacedFaction === 'RBiH' && controllerFaction === 'RS') return DISPLACEMENT_KILLED_FRACTION_RBIH_FROM_RS;
    if (displacedFaction === 'HRHB' && controllerFaction === 'RS') return DISPLACEMENT_KILLED_FRACTION_HRHB_FROM_RS;
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
