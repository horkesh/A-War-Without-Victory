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

/**
 * Resolve the set of OSID keys whose key contains any of the given keywords.
 * Deterministic, sorted, deduplicated.
 */
export function resolveOsidsForKeywords(keywords: readonly string[]): string[] {
    const matched = new Set<string>();
    const sortedKeywords = [...keywords].sort(strictCompare);
    for (const key of ALL_OSID_KEYS) {
        for (const kw of sortedKeywords) {
            if (kw && key.includes(kw)) {
                matched.add(key);
                break;
            }
        }
    }
    return [...matched].sort(strictCompare);
}

/** Sum of km² across the OSIDs matched by the given keywords. */
export function resolveAreaKm2ForKeywords(keywords: readonly string[]): number {
    let sum = 0;
    for (const key of resolveOsidsForKeywords(keywords)) {
        sum += AREAS.areas[key] ?? 0;
    }
    return sum;
}

/**
 * The OSIDs a package covers. An explicit `osids` list WINS over `osid_keywords`
 * — a painted piece names its settlements, so it cannot pick up a same-named
 * village in another municipality the way substring matching does. Unknown ids
 * are dropped here rather than silently contributing 0 km², and
 * `territorial_package_osids.test.ts` fails the build if any package names one,
 * so a stale id is caught at test time instead of quietly shrinking a package.
 */
export function resolveOsidsForPackage(pkg: {
    osids?: readonly string[];
    osid_keywords?: readonly string[];
}): string[] {
    if (pkg.osids && pkg.osids.length > 0) {
        return [...new Set(pkg.osids.filter((o) => AREAS.areas[o] !== undefined))].sort(strictCompare);
    }
    return resolveOsidsForKeywords(pkg.osid_keywords ?? []);
}

/** Sum of km² across the OSIDs a package covers (explicit list or keywords). */
export function resolveAreaKm2ForPackage(pkg: {
    osids?: readonly string[];
    osid_keywords?: readonly string[];
}): number {
    let sum = 0;
    for (const key of resolveOsidsForPackage(pkg)) sum += AREAS.areas[key] ?? 0;
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
    const areaKm2 = resolveAreaKm2ForPackage(pkg);
    // THREE decimals, not one. The painted pieces are deliberately small — the
    // Sarajevo airport strip is 91.1 km² = 0.177% of BiH — and one-decimal
    // rounding turned that into 0.2% while anything under 0.05% became 0.0%,
    // i.e. free to demand. The negotiation prices ground; it must not price a
    // real piece at nothing.
    const pct = Math.round((areaKm2 / TOTAL_AREA_KM2) * 100 * 1000) / 1000;
    packageAreaPctCache.set(pkgId, pct);
    return pct;
}

/** Total mapped BiH area in km² (exposed for tests / display). */
export function getTotalAreaKm2(): number {
    return TOTAL_AREA_KM2;
}
