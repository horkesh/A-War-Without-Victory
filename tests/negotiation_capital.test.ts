import { describe, it, expect } from 'vitest';
import { computeNegotiationCapital } from '../src/sim/negotiation/compute_capital.js';
import { createEmptyCapital, createDefaultPatronRelationship, CAPITAL_WEIGHTS } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        meta: { turn: 10, phase: 'war', seed: 1, date: '1992-06-15', ...(overrides.meta ?? {}) },
        factions: overrides.factions ?? [
            { id: 'RBiH' },
            { id: 'RS' },
            { id: 'HRHB' },
        ],
        military: {
            formations: overrides.military?.formations ?? {},
            ...(overrides.military ?? {}),
        },
        political: {
            political_controllers: {},
            ...(overrides.political ?? {}),
        },
        displacement: overrides.displacement ?? {},
        ...overrides,
    } as unknown as GameState;
}

describe('Negotiation Capital', () => {
    it('initializes negotiation state with all 3 factions', () => {
        const state = makeState();
        computeNegotiationCapital(state);

        expect(state.military.negotiation).toBeDefined();
        expect(state.military.negotiation!.capital.RBiH).toBeDefined();
        expect(state.military.negotiation!.capital.RS).toBeDefined();
        expect(state.military.negotiation!.capital.HRHB).toBeDefined();
    });

    it('initializes patron relationships', () => {
        const state = makeState();
        computeNegotiationCapital(state);

        const neg = state.military.negotiation!;
        expect(neg.patron_relationships.RS.patron_id).toBe('serbia');
        expect(neg.patron_relationships.HRHB.patron_id).toBe('croatia');
        expect(neg.patron_relationships.RBiH.patron_id).toBe('international_community');
    });

    it('capital dimensions are clamped 0-100', () => {
        const state = makeState();
        computeNegotiationCapital(state);

        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            const cap = state.military.negotiation!.capital[faction];
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
    });

    it('preserves existing negotiation state on subsequent calls', () => {
        const state = makeState();
        computeNegotiationCapital(state);

        state.military.negotiation!.peace_plan_history.push({
            plan_id: 'test_plan',
            turn_offered: 5,
            responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
            resolved: true,
        });

        computeNegotiationCapital(state);

        expect(state.military.negotiation!.peace_plan_history).toHaveLength(1);
        expect(state.military.negotiation!.peace_plan_history[0].plan_id).toBe('test_plan');
    });

    it('capital weights sum to 1.0 for each faction', () => {
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            const weights = CAPITAL_WEIGHTS[faction];
            const sum = Object.values(weights).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        }
    });

    it('empty capital has neutral defaults', () => {
        const cap = createEmptyCapital();
        expect(cap.humanitarian_standing).toBe(50);
        expect(cap.international_credibility).toBe(50);
        expect(cap.military_effectiveness).toBe(50);
        expect(cap.political_cohesion).toBe(50);
        expect(cap.military_position).toBe(0);
    });

    it('default patron relationships match faction expectations', () => {
        const rs = createDefaultPatronRelationship('RS');
        expect(rs.patron_id).toBe('serbia');
        expect(rs.support_level).toBe(80);
        expect(rs.override_authority).toBe(10);

        const hrhb = createDefaultPatronRelationship('HRHB');
        expect(hrhb.patron_id).toBe('croatia');
        expect(hrhb.override_authority).toBe(25);
    });

    it('military effectiveness reflects casualty ratio', () => {
        const state = makeState({
            military: {
                formations: {
                    'brig_1': {
                        faction: 'RBiH',
                        kind: 'brigade',
                        brigade_history: {
                            total_casualties_inflicted: 3000,
                            total_casualties_taken: 1500,
                            battles_as_attacker: 10,
                            victories: 7,
                        },
                    },
                    'brig_2': {
                        faction: 'RS',
                        kind: 'brigade',
                        brigade_history: {
                            total_casualties_inflicted: 1500,
                            total_casualties_taken: 3000,
                            battles_as_attacker: 10,
                            victories: 3,
                        },
                    },
                },
            } as any,
        });

        computeNegotiationCapital(state);

        const rbih = state.military.negotiation!.capital.RBiH;
        const rs = state.military.negotiation!.capital.RS;
        expect(rbih.military_effectiveness).toBeGreaterThan(rs.military_effectiveness);
    });
});
