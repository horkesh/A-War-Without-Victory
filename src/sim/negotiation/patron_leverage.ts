/**
 * Patron leverage at Dayton (owner ruling 2026-11-07, Pyrrhic panel; RD-PATRON-OVERRIDE).
 *
 * A patron (Belgrade over RS, Zagreb over HRHB, Washington over RBiH) can force its client to
 * accept territorial demands it refused, but only:
 *  - up to an AREA BUDGET that grows with its override authority: nothing below 75, then
 *    0.5 + 0.15 × (override − 75) percent of BiH, capped at 4.25 (RS at 78.5 ≈ 1.0%, at 90
 *    ≈ 2.75%). The patron gives up the smallest pieces first.
 *  - never on PROTECTED ground: ground the client held throughout and that was never on the Dayton table. For RS: the Banja Luka
 *    region, Prijedor, Bosanski Novi, Doboj, Bijeljina and the Posavina corridor (Brčko then
 *    goes to arbitration, as at Dayton). For HRHB: Mostar and western Herzegovina. A client
 *    never concedes protected ground voluntarily either.
 *  - never on ground taken after the player declined Dayton: at the forced table the United
 *    States is the coercing power, so Belgrade or Zagreb cannot be made to hand it over.
 *
 * Historical basis: Milošević conceded Sarajevo and the Goražde corridor but held Brčko and
 * insisted on 49% (Holbrooke, To End a War; BB1 pp.391-392); even with full authority he could
 * not move Pale in 1993 or 1994 (BB1 pp.182-183; chronology pp.23-25). No source puts
 * Prijedor, Banja Luka or Doboj on the Dayton table. Tuđman kept Mostar and western Herzegovina.
 *
 * Deterministic: constant data, sorted iteration.
 */
import type { TerritorialPackage } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPackageAreaPct, resolveOsidsForKeywords } from './package_area_resolver.js';

/** Override authority at which a patron starts forcing its client. */
export const PATRON_FORCE_THRESHOLD = 75;
const BUDGET_BASE_PCT = 0.5;
const BUDGET_PER_POINT_PCT = 0.15;
const BUDGET_MAX_PCT = 4.25;

/** Share of BiH (percent) a patron at this override authority can force its client to give up. */
export function patronAreaBudgetPct(overrideAuthority: number): number {
    if (!(overrideAuthority >= PATRON_FORCE_THRESHOLD)) return 0;
    return Math.min(BUDGET_MAX_PCT, BUDGET_BASE_PCT + BUDGET_PER_POINT_PCT * (overrideAuthority - PATRON_FORCE_THRESHOLD));
}

/** Municipalities a client never gives up, voluntarily or under patron pressure. */
export const PROTECTED_MUNICIPALITIES: Readonly<Record<string, ReadonlySet<string>>> = {
    RS: new Set([
        // Banja Luka region
        'banja_luka', 'laktasi', 'celinac',
        // Held by RS throughout the war; never on the Dayton table
        'prijedor', 'bosanski_novi', 'doboj', 'bijeljina',
        // Posavina corridor (Brčko resolves to arbitration)
        'brcko', 'bosanski_samac', 'modrica', 'derventa', 'bosanski_brod',
    ]),
    HRHB: new Set([
        // Mostar and western Herzegovina
        'mostar', 'listica', 'ljubuski', 'grude', 'posusje', 'citluk', 'capljina', 'neum',
    ]),
};

/** The OSIDs a package covers (explicit cells for captured ground, keywords for fixed packages). */
export function packageOsids(pkg: TerritorialPackage): string[] {
    return pkg.osids ? [...pkg.osids] : resolveOsidsForKeywords(pkg.osid_keywords ?? []);
}

/** Share of BiH (percent) a package covers. */
export function packageAreaPct(pkg: TerritorialPackage): number {
    return pkg.area_pct ?? getPackageAreaPct(pkg.id);
}

/** True when `holder` would never give this package up (any cell on its protected ground). */
export function isProtectedFor(pkg: TerritorialPackage, holder: string): boolean {
    const muns = PROTECTED_MUNICIPALITIES[holder];
    if (!muns) return false;
    return packageOsids(pkg).some((o) => muns.has(o.split(':')[1] ?? ''));
}

/**
 * Which refused demands a holder's patron forces through, given its budget. Candidates are
 * the refused, forceable demands (not protected, not post-decline ground); the smallest are
 * forced first while the running area stays within budget. Returns the forced ids, sorted.
 */
export function selectPatronForced(
    refused: readonly TerritorialPackage[],
    holder: string,
    overrideAuthority: number,
    isPostDeclineGround: (pkg: TerritorialPackage) => boolean,
): string[] {
    let budget = patronAreaBudgetPct(overrideAuthority);
    if (budget <= 0) return [];
    const candidates = refused
        .filter((p) => !isProtectedFor(p, holder) && !isPostDeclineGround(p))
        .map((p) => ({ id: p.id, area: packageAreaPct(p) }))
        .sort((a, b) => (a.area - b.area) || strictCompare(a.id, b.id));
    const forced: string[] = [];
    for (const c of candidates) {
        if (c.area > budget) continue;
        budget -= c.area;
        forced.push(c.id);
    }
    return forced.sort(strictCompare);
}
