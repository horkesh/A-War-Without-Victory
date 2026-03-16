import { describe, it, expect } from 'vitest';
import {
    interpolateBaseline,
    preseedNegotiationCapital,
    preseedPatronRelationship,
    preseedScenarioState,
} from '../src/scenario/scenario_preseeding.js';
import type { GameState } from '../src/state/game_state.js';

describe('interpolateBaseline', () => {
    const baselines = [
        { week: 0, value: 10 },
        { week: 20, value: 30 },
        { week: 100, value: 90 },
    ];

    it('returns exact value at anchor points', () => {
        expect(interpolateBaseline(baselines, 0)).toBe(10);
        expect(interpolateBaseline(baselines, 20)).toBe(30);
        expect(interpolateBaseline(baselines, 100)).toBe(90);
    });

    it('returns midpoint between two anchors', () => {
        // Midpoint between w0(10) and w20(30) at w10 = 20
        expect(interpolateBaseline(baselines, 10)).toBe(20);
        // Midpoint between w20(30) and w100(90) at w60 = 60
        expect(interpolateBaseline(baselines, 60)).toBe(60);
    });

    it('clamps below first anchor', () => {
        expect(interpolateBaseline(baselines, -10)).toBe(10);
        expect(interpolateBaseline(baselines, -100)).toBe(10);
    });

    it('clamps above last anchor', () => {
        expect(interpolateBaseline(baselines, 150)).toBe(90);
        expect(interpolateBaseline(baselines, 999)).toBe(90);
    });

    it('handles single-element baselines', () => {
        expect(interpolateBaseline([{ week: 50, value: 42 }], 0)).toBe(42);
        expect(interpolateBaseline([{ week: 50, value: 42 }], 100)).toBe(42);
    });

    it('handles empty baselines', () => {
        expect(interpolateBaseline([], 50)).toBe(0);
    });
});

describe('preseedNegotiationCapital', () => {
    it('RS at week 0: military_position is 35', () => {
        const cap = preseedNegotiationCapital('RS', 0);
        expect(cap.military_position).toBeCloseTo(35, 1);
    });

    it('RS at week 26: military_position is 67', () => {
        const cap = preseedNegotiationCapital('RS', 26);
        expect(cap.military_position).toBeCloseTo(67, 1);
    });

    it('RS at week 13: military_position is midpoint ~51', () => {
        const cap = preseedNegotiationCapital('RS', 13);
        // Midpoint between w0(35) and w26(67) = 51
        expect(cap.military_position).toBeCloseTo(51, 0);
    });

    it('RBiH at week 52: military_effectiveness is 45', () => {
        const cap = preseedNegotiationCapital('RBiH', 52);
        expect(cap.military_effectiveness).toBeCloseTo(45, 1);
    });

    it('RBiH at week 0: humanitarian_standing is 50', () => {
        const cap = preseedNegotiationCapital('RBiH', 0);
        expect(cap.humanitarian_standing).toBeCloseTo(50, 1);
    });

    it('HRHB at week 78: political_cohesion is 40', () => {
        const cap = preseedNegotiationCapital('HRHB', 78);
        expect(cap.political_cohesion).toBeCloseTo(40, 1);
    });

    it('all values within 0-100 for all factions at various weeks', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            for (const week of [0, 13, 26, 52, 78, 104, 130, 156, 170, 188, 200]) {
                const cap = preseedNegotiationCapital(faction, week);
                expect(cap.military_position).toBeGreaterThanOrEqual(0);
                expect(cap.military_position).toBeLessThanOrEqual(100);
                expect(cap.humanitarian_standing).toBeGreaterThanOrEqual(0);
                expect(cap.humanitarian_standing).toBeLessThanOrEqual(100);
                expect(cap.international_credibility).toBeGreaterThanOrEqual(0);
                expect(cap.international_credibility).toBeLessThanOrEqual(100);
                expect(cap.military_effectiveness).toBeGreaterThanOrEqual(0);
                expect(cap.military_effectiveness).toBeLessThanOrEqual(100);
                expect(cap.political_cohesion).toBeGreaterThanOrEqual(0);
                expect(cap.political_cohesion).toBeLessThanOrEqual(100);
            }
        }
    });

    it('throws for unknown faction', () => {
        expect(() => preseedNegotiationCapital('UNKNOWN', 0)).toThrow();
    });
});

describe('preseedPatronRelationship', () => {
    it('RS at week 0: override ~12, support ~80', () => {
        const patron = preseedPatronRelationship('RS', 0);
        expect(patron.override_authority).toBeCloseTo(12, 1);
        expect(patron.support_level).toBeCloseTo(80, 1);
    });

    it('RS at week 104: override ~45, support ~50', () => {
        const patron = preseedPatronRelationship('RS', 104);
        expect(patron.override_authority).toBeCloseTo(45, 1);
        expect(patron.support_level).toBeCloseTo(50, 1);
    });

    it('HRHB at week 130: override ~75', () => {
        const patron = preseedPatronRelationship('HRHB', 130);
        expect(patron.override_authority).toBeCloseTo(75, 1);
    });

    it('RBiH at week 52: override ~22, support ~50', () => {
        const patron = preseedPatronRelationship('RBiH', 52);
        expect(patron.override_authority).toBeCloseTo(22, 1);
        expect(patron.support_level).toBeCloseTo(50, 1);
    });

    it('interpolates between anchors', () => {
        // RS override midpoint between w0(12) and w40(18) at w20 = 15
        const patron = preseedPatronRelationship('RS', 20);
        expect(patron.override_authority).toBeCloseTo(15, 0);
    });
});

describe('preseedScenarioState', () => {
    function makeMinimalState(): GameState {
        return {
            military: {},
        } as unknown as GameState;
    }

    it('initializes negotiation state if not present', () => {
        const state = makeMinimalState();
        preseedScenarioState(state, 0);
        expect(state.military.negotiation).toBeDefined();
        expect(state.military.negotiation!.capital).toBeDefined();
        expect(state.military.negotiation!.patron_relationships).toBeDefined();
    });

    it('seeds all 3 factions', () => {
        const state = makeMinimalState();
        preseedScenarioState(state, 52);
        const neg = state.military.negotiation!;
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            expect(neg.capital[faction]).toBeDefined();
            expect(neg.patron_relationships[faction]).toBeDefined();
        }
    });

    it('writes correct capital values at week 0', () => {
        const state = makeMinimalState();
        preseedScenarioState(state, 0);
        const rsCapital = state.military.negotiation!.capital['RS'];
        expect(rsCapital.military_position).toBeCloseTo(35, 1);
        expect(rsCapital.humanitarian_standing).toBeCloseTo(40, 1);
        expect(rsCapital.international_credibility).toBeCloseTo(40, 1);
        expect(rsCapital.military_effectiveness).toBeCloseTo(70, 1);
        expect(rsCapital.political_cohesion).toBeCloseTo(70, 1);
    });

    it('writes correct patron values at week 0', () => {
        const state = makeMinimalState();
        preseedScenarioState(state, 0);
        const rsPatron = state.military.negotiation!.patron_relationships['RS'];
        expect(rsPatron.override_authority).toBeCloseTo(12, 1);
        expect(rsPatron.support_level).toBeCloseTo(80, 1);
        expect(rsPatron.patron_id).toBe('serbia');
    });

    it('preserves non-baseline fields on existing capital', () => {
        const state = makeMinimalState();
        preseedScenarioState(state, 0);
        // Non-baseline fields should remain at defaults from createEmptyCapital
        const rsCapital = state.military.negotiation!.capital['RS'];
        expect(rsCapital.territory_controlled_pct).toBe(0);
        expect(rsCapital.refugees_created).toBe(0);
        expect(rsCapital.enclaves_held).toEqual([]);
    });
});
