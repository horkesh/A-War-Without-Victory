/**
 * Territorial-package → real-area resolver (Comprehensive Dayton, D1, owner ruling
 * Opt 2b).
 *
 * Replaces the fabricated `estimatePackageTerritoryPct` hardcoded table in
 * dayton_negotiation.ts with a deterministic resolver that maps each territorial
 * package's `osid_keywords` onto the canonical per-OSID area data in
 * `data/derived/operational/osid_areas.json` and returns the package's share of
 * total BiH area as a percentage.
 *
 * Matching: an OSID key (e.g. "op:gorazde:bacci") matches a keyword when the
 * keyword (e.g. "gorazde") appears as a substring of the key. Keywords are the
 * municipality/settlement fragments already curated on each package. Each OSID is
 * counted at most ONCE per package even if several keywords match it.
 *
 * Determinism: pure function over constant JSON. Sorted iteration via strictCompare,
 * no RNG/timestamps. Result is memoized per package id (the inputs never change).
 */

import { TERRITORIAL_PACKAGES } from './territorial_packages.js';
import osidAreas from '../../../data/derived/operational/osid_areas.json';
import { strictCompare } from '../../state/validateGameState.js';

interface OsidAreaData {
    total_area_km2: number;
    osid_count: number;
    areas: Record<string, number>;
}

const AREAS = osidAreas as unknown as OsidAreaData;

/** Sorted list of all OSID keys, computed once. */
const ALL_OSID_KEYS: readonly string[] = Object.keys(AREAS.areas ?? {}).sort(strictCompare);

/** Total mapped area in km² (denominator). Falls back to the summed areas. */
const TOTAL_AREA_KM2: number = (() => {
    if (typeof AREAS.total_area_km2 === 'number' && AREAS.total_area_km2 > 0) {
        return AREAS.total_area_km2;
    }
    let sum = 0;
    for (const k of ALL_OSID_KEYS) sum += AREAS.areas[k] ?? 0;
    return sum > 0 ? sum : 1;
})();

/** Municipality segments of the OSID keys (`op:<municipality>:<settlement>`). */
const MUNICIPALITY_SEGMENTS: ReadonlySet<string> = new Set(ALL_OSID_KEYS.map((k) => k.split(':')[1] ?? ''));

/**
 * Resolve the OSID keys matched by the given keywords, token by token (2026-11-07, RD):
 *  - a keyword that names a municipality matches every OSID in that municipality, and only
 *    those (so `travnik` no longer takes Novi Travnik);
 *  - any other keyword matches an OSID whose settlement segment, `_N` suffix stripped,
 *    equals it (e.g. `ustikolina`, `zepa` in Rogatica).
 * Substring matching used to let `ilidza` and `hadzici` (Sarajevo suburbs) take villages
 * of those names in Sanski Most and Ključ. Deterministic, sorted, deduplicated.
 */
export function resolveOsidsForKeywords(keywords: readonly string[]): string[] {
    const munKeywords = new Set<string>();
    const settlementKeywords = new Set<string>();
    for (const kw of keywords) {
        if (!kw) continue;
        (MUNICIPALITY_SEGMENTS.has(kw) ? munKeywords : settlementKeywords).add(kw);
    }
    const matched: string[] = [];
    for (const key of ALL_OSID_KEYS) {
        const [, mun = '', settlement = ''] = key.split(':');
        if (munKeywords.has(mun) || settlementKeywords.has(settlement.replace(/_\d+$/, ''))) matched.push(key);
    }
    return matched; // ALL_OSID_KEYS is already sorted
}

/** Sum of km² across the OSIDs matched by the given keywords. */
export function resolveAreaKm2ForKeywords(keywords: readonly string[]): number {
    let sum = 0;
    for (const key of resolveOsidsForKeywords(keywords)) {
        sum += AREAS.areas[key] ?? 0;
    }
    return sum;
}

// ── Per-package memoized area share ───────────────────────────────────────────

const packageAreaPctCache = new Map<string, number>();

/**
 * Return the percentage of total BiH area that a territorial package represents,
 * resolved from real OSID area data. 0 when the package id is unknown or no OSID
 * matches its keywords. Memoized — inputs are constant.
 */
export function getPackageAreaPct(pkgId: string): number {
    const cached = packageAreaPctCache.get(pkgId);
    if (cached !== undefined) return cached;

    const pkg = TERRITORIAL_PACKAGES.find(p => p.id === pkgId);
    if (!pkg) {
        packageAreaPctCache.set(pkgId, 0);
        return 0;
    }
    const areaKm2 = resolveAreaKm2ForKeywords(pkg.osid_keywords);
    const pct = Math.round((areaKm2 / TOTAL_AREA_KM2) * 100 * 10) / 10;
    packageAreaPctCache.set(pkgId, pct);
    return pct;
}

/** Total mapped BiH area in km² (exposed for tests / display). */
export function getTotalAreaKm2(): number {
    return TOTAL_AREA_KM2;
}
