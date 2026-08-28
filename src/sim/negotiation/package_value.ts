/**
 * What a territorial package is WORTH at the Dayton table.
 *
 * Deliberately separate from `package_area_resolver`. Area percentage is a
 * physical fact about territory and drives the 51/49 entity split — moving a
 * package shifts the map by exactly its area, and nothing here may change that.
 * VALUE is a different quantity: what a negotiator will spend capital on.
 *
 * Area alone prices the map backwards. Measured on the painted pieces:
 *
 *   sarajevo_corridor            0.177% of area   1.521% of people   8.6x
 *   prijedor                     0.633%           1.981%             3.1x
 *   mrkonjic_sipovo              3.133%           1.327%             0.42x
 *   srebrenica_gorazde_corridor  0.669%           0.147%             0.22x
 *
 * The Sarajevo airport strip holds 66,549 people on 91 km². Priced by area it
 * was the cheapest thing on the table and the negotiation would have handed it
 * over for nothing; priced with population it is the fourth most valuable piece
 * in the country, which is why the 1996 suburbs handover turned on it. The
 * inverse case is Mrkonjić Grad and Šipovo — the largest piece by area, and
 * mostly mountain.
 *
 * Population is the 1991 census, i.e. PRE-WAR: the people who lived there before
 * the fighting, not the post-cleansing population. That is the correct measure
 * for what a delegation believed it was bargaining over, and it deliberately
 * does not reward a faction for having emptied a place — a piece is worth what
 * it was worth in 1991 whatever happened to it since.
 *
 * Determinism: pure functions over constant JSON. Memoized; no RNG, no clock.
 */

import osidPopulation from '../../../data/derived/operational/osid_population_1991.json';
import { getPackageAreaPct, resolveOsidsForPackage } from './package_area_resolver.js';
import { TERRITORIAL_PACKAGES } from './territorial_packages.js';

interface OsidPopulationData {
    total_population_1991: number;
    osid_count: number;
    population: Record<string, number>;
}

const POP = osidPopulation as unknown as OsidPopulationData;

const TOTAL_POPULATION_1991: number = (() => {
    if (typeof POP.total_population_1991 === 'number' && POP.total_population_1991 > 0) {
        return POP.total_population_1991;
    }
    let sum = 0;
    for (const v of Object.values(POP.population ?? {})) sum += v;
    return sum > 0 ? sum : 1;
})();

/**
 * How value splits between ground and people. Both halves are real: the Dayton
 * territorial settlement was argued as a PERCENTAGE OF TERRITORY (the 51/49),
 * so area cannot be discarded — but what each delegation actually fought for
 * was towns. An even split keeps empty ground worth something and stops a city
 * from being bought for the price of a mountain.
 *
 * These are the designer's to tune. They must sum to 1.
 */
export const VALUE_AREA_WEIGHT = 0.5;
export const VALUE_POPULATION_WEIGHT = 0.5;

const populationCache = new Map<string, number>();
const valueCache = new Map<string, number>();

/** 1991 census population living inside a package. 0 for an unknown package. */
export function getPackagePopulation1991(pkgId: string): number {
    const cached = populationCache.get(pkgId);
    if (cached !== undefined) return cached;

    const pkg = TERRITORIAL_PACKAGES.find((p) => p.id === pkgId);
    if (!pkg) {
        populationCache.set(pkgId, 0);
        return 0;
    }
    let sum = 0;
    for (const osid of resolveOsidsForPackage(pkg)) sum += POP.population[osid] ?? 0;
    populationCache.set(pkgId, sum);
    return sum;
}

/** A package's share of BiH's 1991 population, as a percentage. */
export function getPackagePopulationPct(pkgId: string): number {
    const pop = getPackagePopulation1991(pkgId);
    return Math.round((pop / TOTAL_POPULATION_1991) * 100 * 1000) / 1000;
}

/**
 * A package's negotiating value: a weighted blend of its share of territory and
 * its share of the pre-war population. This is what pricing should use.
 *
 * NOT a share of anything physical — do not feed it to the entity split, which
 * takes `getPackageAreaPct`.
 */
export function getPackageValuePct(pkgId: string): number {
    const cached = valueCache.get(pkgId);
    if (cached !== undefined) return cached;

    const blended = VALUE_AREA_WEIGHT * getPackageAreaPct(pkgId)
        + VALUE_POPULATION_WEIGHT * getPackagePopulationPct(pkgId);
    const value = Math.round(blended * 1000) / 1000;
    valueCache.set(pkgId, value);
    return value;
}

/** Total 1991 population across mapped BiH (exposed for tests / display). */
export function getTotalPopulation1991(): number {
    return TOTAL_POPULATION_1991;
}
