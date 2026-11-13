/**
 * Shared displacement loss parameters (canon: same policy as displacement.ts).
 * Single source for displacement_takeover (and formerly minority_flight, removed 2026-06-09).
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

// Flight abroad (F4, RF-3 Historian seat 2026-11-14). Share of each people's displaced who
// ended up abroad. ICTY OTP demographic report (Tabeau, Bijak et al., 2003, 47 municipalities,
// OSCE voters register 1997-98, minimums after early returns): Muslims 48%, Croats 78%,
// Serbs 23% (a floor; FRY excluded Serbs from Serb-held areas). Host-country build-up at
// Dayton: ~1.2M abroad (Germany ~320k, ~60% Muslim; FRY ~250k, mostly Serb; Croatia ~170k).
// Bosniaks were the largest group abroad, about 45-55% of all those abroad.

/** Serbs: ~30% of displaced leave BiH (range 0.25-0.40; ICTY OTP floor 0.23). */
export const FLEE_ABROAD_FRACTION_RS = 0.30;

/** Croats: ~40% leave BiH, mostly to Croatia (range 0.30-0.55; ICTY OTP 0.78 for Croats from Serb-held municipalities). */
export const FLEE_ABROAD_FRACTION_HRHB = 0.40;

/**
 * Bosniaks: ~40% leave BiH, to Western Europe and Croatia (range 0.30-0.50; ICTY OTP 0.48).
 * Was 0.0 ("no external state to flee to"), which made Bosniaks the people least likely to
 * leave the country (realism audit F4).
 */
export const FLEE_ABROAD_FRACTION_RBIH = 0.40;

// Sealed pockets: nobody leaves a besieged pocket for abroad (Srebrenica, Žepa, Goražde, the
// Bihać pocket, Sarajevo after mid-1992). The siege path in displacement.ts books its
// departures with no flight abroad; they go to own-side territory (F4, 2026-11-14).

/** Flee-abroad fraction for an ethnicity-aligned faction. */
export function getFactionFleeAbroadFraction(faction: FactionId): number {
    if (faction === 'RS') return FLEE_ABROAD_FRACTION_RS;
    if (faction === 'HRHB') return FLEE_ABROAD_FRACTION_HRHB;
    return FLEE_ABROAD_FRACTION_RBIH;
}
