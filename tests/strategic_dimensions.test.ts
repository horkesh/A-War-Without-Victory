import { describe, it, expect } from 'vitest';
import {
    initializeStrategicDimensions,
    applyDimensionShift,
    getDimensionEffective,
    updateBaseValue,
    DIMENSION_IDS,
    DIMENSION_WEIGHTS,
    computeNegotiatingCapital,
    computeDimensionBaseValues,
} from '../src/sim/events/strategic_dimensions.js';

describe('strategic dimensions', () => {
    it('initializes all 6 dimensions for all 3 factions at 50/0/50', () => {
        const dims = initializeStrategicDimensions();
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            for (const dim of DIMENSION_IDS) {
                expect(dims[faction][dim].base_value).toBe(50);
                expect(dims[faction][dim].event_modifier).toBe(0);
                expect(dims[faction][dim].effective_value).toBe(50);
            }
        }
    });

    it('applies positive shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 15);
        expect(dims['RS']['military_credibility'].event_modifier).toBe(15);
        expect(dims['RS']['military_credibility'].effective_value).toBe(65);
    });

    it('applies negative shift correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -20);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-20);
        expect(dims['RS']['international_standing'].effective_value).toBe(30);
    });

    it('clamps effective_value to 0-100', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -80);
        expect(dims['RS']['international_standing'].effective_value).toBe(0);
        applyDimensionShift(dims, 'RBiH', 'international_standing', 80);
        expect(dims['RBiH']['international_standing'].effective_value).toBe(100);
    });

    it('accumulates multiple shifts', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'international_standing', -10);
        applyDimensionShift(dims, 'RS', 'international_standing', -5);
        expect(dims['RS']['international_standing'].event_modifier).toBe(-15);
        expect(dims['RS']['international_standing'].effective_value).toBe(35);
    });

    it('getDimensionEffective reads correctly', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'HRHB', 'patron_confidence', 10);
        expect(getDimensionEffective(dims, 'HRHB', 'patron_confidence')).toBe(60);
    });

    it('getDimensionEffective returns 50 for unknown faction', () => {
        const dims = initializeStrategicDimensions();
        expect(getDimensionEffective(dims, 'UNKNOWN', 'military_credibility')).toBe(50);
    });

    it('updateBaseValue recalculates effective', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 10);
        updateBaseValue(dims, 'RS', 'military_credibility', 70);
        expect(dims['RS']['military_credibility'].base_value).toBe(70);
        expect(dims['RS']['military_credibility'].effective_value).toBe(80);
    });

    it('updateBaseValue clamps', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'RS', 'military_credibility', 30);
        updateBaseValue(dims, 'RS', 'military_credibility', 90);
        expect(dims['RS']['military_credibility'].effective_value).toBe(100);
    });

    it('applyDimensionShift ignores unknown faction', () => {
        const dims = initializeStrategicDimensions();
        applyDimensionShift(dims, 'UNKNOWN', 'military_credibility', 10);
        expect(dims['UNKNOWN']).toBeUndefined();
    });
});

describe('computeNegotiatingCapital', () => {
    it('returns weighted sum of effective values', () => {
        const store = initializeStrategicDimensions();
        // All dimensions at 50 → composite = 50 (weights sum to 1.0)
        expect(computeNegotiatingCapital(store, 'RS')).toBeCloseTo(50, 1);
    });

    it('weights military_credibility higher for RS than RBiH', () => {
        expect(DIMENSION_WEIGHTS.RS.military_credibility).toBeGreaterThan(DIMENSION_WEIGHTS.RBiH.military_credibility);
    });

    it('weights international_standing higher for RBiH than RS', () => {
        expect(DIMENSION_WEIGHTS.RBiH.international_standing).toBeGreaterThan(DIMENSION_WEIGHTS.RS.international_standing);
    });

    it('faction weights sum to 1.0', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            const sum = Object.values(DIMENSION_WEIGHTS[faction]).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        }
    });

    it('returns 50 for unknown faction', () => {
        const store = initializeStrategicDimensions();
        expect(computeNegotiatingCapital(store, 'UNKNOWN')).toBe(50);
    });

    it('reflects dimension shifts in composite', () => {
        const store = initializeStrategicDimensions();
        applyDimensionShift(store, 'RS', 'military_credibility', 20);
        // RS mil_cred weight = 0.25, shift = +20 → composite = 50 + 20*0.25 = 55
        expect(computeNegotiatingCapital(store, 'RS')).toBeCloseTo(55, 1);
    });
});

describe('computeDimensionBaseValues', () => {
    it('computes territorial_legitimacy from territory percentage', () => {
        const store = initializeStrategicDimensions();
        const mockState = {
            military: { negotiation: { capital: { RS: { territory_controlled_pct: 49 } } }, formations: {} },
            political: {},
        };
        computeDimensionBaseValues(store, mockState, 'RS');
        expect(store.RS.territorial_legitimacy.base_value).toBeCloseTo(58.8, 0);
    });

    it('negotiating_leverage derives from mil+terr+patron', () => {
        const store = initializeStrategicDimensions();
        // Set known base values that won't be overwritten by computeDimensionBaseValues
        updateBaseValue(store, 'RS', 'military_credibility', 60);
        updateBaseValue(store, 'RS', 'territorial_legitimacy', 80);
        updateBaseValue(store, 'RS', 'patron_confidence', 40);
        // Provide state that won't change the first 5 dimensions (empty caps)
        const mockState = {
            military: { negotiation: { capital: { RS: { territory_controlled_pct: 80 / 1.2 } }, patron_relationships: { RS: { support_level: 40 } } }, formations: {} },
            political: {},
        };
        computeDimensionBaseValues(store, mockState, 'RS');
        // leverage = (mil_eff + terr_eff + pat_eff) / 3
        // After recomputation, terr = 80/1.2*1.2=80, patron=40, mil depends on ops/cas
        // mil has no ops data → opsRate=0.5 → 0.5*50 + min(1,3)*8.33 = 25+8.33 = 33.3
        // leverage = (33.3 + 80 + 40) / 3 ≈ 51.1
        expect(store.RS.negotiating_leverage.base_value).toBeGreaterThan(40);
        expect(store.RS.negotiating_leverage.base_value).toBeLessThan(60);
    });

    it('ignores unknown faction', () => {
        const store = initializeStrategicDimensions();
        computeDimensionBaseValues(store, {} as any, 'UNKNOWN');
        // No crash, no change
        expect(store.RS.military_credibility.base_value).toBe(50);
    });
});
