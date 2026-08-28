import { describe, expect, it } from 'vitest';

import { TERRITORIAL_PACKAGES } from '../src/sim/negotiation/territorial_packages.js';
import { getPackageAreaPct } from '../src/sim/negotiation/package_area_resolver.js';
import {
    VALUE_AREA_WEIGHT,
    VALUE_POPULATION_WEIGHT,
    getPackagePopulation1991,
    getPackagePopulationPct,
    getPackageValuePct,
    getTotalPopulation1991,
} from '../src/sim/negotiation/package_value.js';

describe('territorial package value (area + 1991 population)', () => {
    it('the population base is the 1991 census', () => {
        // BiH's 1991 census recorded 4,377,033 people; the operational rollup
        // carries 4,375,078 across 744 OSIDs. Anything far from that means the
        // derived lookup was regenerated from the wrong source.
        expect(getTotalPopulation1991()).toBeGreaterThan(4_300_000);
        expect(getTotalPopulation1991()).toBeLessThan(4_450_000);
    });

    it('the weights are a partition', () => {
        expect(VALUE_AREA_WEIGHT + VALUE_POPULATION_WEIGHT).toBeCloseTo(1, 10);
    });

    it('every package holds some pre-war population', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            expect(getPackagePopulation1991(pkg.id), pkg.id).toBeGreaterThan(0);
        }
    });

    it('value is the stated blend of area and population', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            // getPackageValuePct rounds to 3 decimals, so compare against the
            // SAME rounding — `toBeCloseTo(raw, 3)` sits exactly on the tolerance
            // boundary and fails on ties.
            const expected = Math.round(1000 * (VALUE_AREA_WEIGHT * getPackageAreaPct(pkg.id)
                + VALUE_POPULATION_WEIGHT * getPackagePopulationPct(pkg.id))) / 1000;
            expect(getPackageValuePct(pkg.id)).toBeCloseTo(expected, 6);
        }
    });

    it('a dense small piece outprices a large empty one', () => {
        // THE REASON THIS MODULE EXISTS. The Sarajevo airport strip is 91 km²
        // holding 66,549 people; Mrkonjić Grad and Šipovo is 1,608 km² of mostly
        // mountain holding 58,058. By area the mountain is worth 17x the city.
        expect(getPackageAreaPct('mrkonjic_sipovo'))
            .toBeGreaterThan(getPackageAreaPct('sarajevo_corridor'));
        expect(getPackagePopulation1991('sarajevo_corridor'))
            .toBeGreaterThan(getPackagePopulation1991('mrkonjic_sipovo'));
        // Blended, the mountain is worth 2.6x the city instead of 17.7x — the
        // city stops being nearly free without the mountain becoming worthless.
        const ratioByArea = getPackageAreaPct('mrkonjic_sipovo') / getPackageAreaPct('sarajevo_corridor');
        const ratioByValue = getPackageValuePct('mrkonjic_sipovo') / getPackageValuePct('sarajevo_corridor');
        expect(ratioByArea).toBeGreaterThan(15);
        expect(ratioByValue).toBeLessThan(3);
        expect(ratioByValue).toBeLessThan(ratioByArea / 5);
    });

    it('a city is worth more than empty ground of similar size', () => {
        // prijedor 325 km² / 86,671 people vs srebrenica_gorazde_corridor
        // 343 km² / 6,453. Nearly identical area, 13x the people.
        expect(getPackageAreaPct('srebrenica_gorazde_corridor'))
            .toBeGreaterThan(getPackageAreaPct('prijedor'));
        expect(getPackageValuePct('prijedor'))
            .toBeGreaterThan(getPackageValuePct('srebrenica_gorazde_corridor') * 3);
    });

    it('population is PRE-war, so emptying a place cannot cheapen it', () => {
        // Srebrenica–Žepa is priced on the 1991 population of the enclaves, not on
        // who was left in 1995. A model that priced the post-war population would
        // make the enclave cheaper the more completely it had been cleared —
        // exactly the incentive AWWV exists to refuse.
        expect(getPackagePopulation1991('srebrenica_area')).toBeGreaterThan(30_000);
    });
});
