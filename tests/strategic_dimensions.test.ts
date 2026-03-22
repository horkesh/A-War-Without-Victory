import { describe, it, expect } from 'vitest';
import {
    initializeStrategicDimensions,
    applyDimensionShift,
    getDimensionEffective,
    updateBaseValue,
    DIMENSION_IDS,
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
