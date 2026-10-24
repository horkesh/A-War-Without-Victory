import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeNegotiationBreakdown } from '../src/sim/negotiation/compute_capital.js';
import { initializeNegotiationState } from '../src/sim/negotiation/initialize_negotiation_state.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { DIMENSION_WEIGHTS, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
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
    it('matches the immutable b371 legacy prelude and final canonical-byte matrix', () => {
        const startup = readFileSync('data/derived/startup/apr_1992_initial_save.json', 'utf8');
        const digest = (value: string) => createHash('sha256').update(value).digest('hex');
        const complete = () => ({
            capital: { RBiH: createEmptyCapital(), RS: createEmptyCapital(), HRHB: createEmptyCapital() },
            patron_relationships: {
                RBiH: createDefaultPatronRelationship('RBiH'),
                RS: createDefaultPatronRelationship('RS'),
                HRHB: createDefaultPatronRelationship('HRHB'),
            },
            peace_plan_history: [],
            strategic_dimensions: initializeStrategicDimensions(),
        });
        const cases: Array<[string, (state: GameState) => void, string, string]> = [
            ['absent', (state) => { delete state.military.negotiation; }, '7276b261009c9ff9599ea34c2d2a2a246d08ed08ac9ed1d01cf85b0230c8c8b0', 'ae2ee8e40a7f4110d369ee97f7b87d8376a4b058275d17468f1fa6de7b494553'],
            ['empty', (state) => { state.military.negotiation = { capital: {}, patron_relationships: {}, peace_plan_history: [] }; }, '7276b261009c9ff9599ea34c2d2a2a246d08ed08ac9ed1d01cf85b0230c8c8b0', 'ae2ee8e40a7f4110d369ee97f7b87d8376a4b058275d17468f1fa6de7b494553'],
            ['complete', (state) => { state.military.negotiation = complete(); }, '7276b261009c9ff9599ea34c2d2a2a246d08ed08ac9ed1d01cf85b0230c8c8b0', 'ae2ee8e40a7f4110d369ee97f7b87d8376a4b058275d17468f1fa6de7b494553'],
            ['missing_entry', (state) => { const n = complete() as any; delete n.capital.HRHB; delete n.patron_relationships.RS; state.military.negotiation = n; }, '7276b261009c9ff9599ea34c2d2a2a246d08ed08ac9ed1d01cf85b0230c8c8b0', 'ae2ee8e40a7f4110d369ee97f7b87d8376a4b058275d17468f1fa6de7b494553'],
            ['sentinel', (state) => { const n = complete() as any; n.capital.RBiH.war_crimes_events = 7; n.capital.RBiH.war_crimes_events_emergent = 11; n.pending_offer = { sentinel: true }; state.military.negotiation = n; }, '76b1b864fba31de6943d9ba92dc8953637252b9ccd4643eb5da12906fd793976', '1d66f5abfb9ad968943ece46003818105adf5efd04e7d6e4b80282bb3cc76672'],
            ['extra_key', (state) => { const n = complete() as any; n.capital.EXTRA = { keep: 'capital' }; n.patron_relationships.EXTRA = { keep: 'patron' }; n.forward_compatible = { keep: true }; state.military.negotiation = n; }, '32af20a4870f70647263226c4d77e6c266b2a6f21042333815446d88fcf054d3', '309d766d28e91dee4115a69e076af77c498a5cd64cd1989fafd292ee039c78cd'],
            ['partial_dimensions', (state) => { const n = complete() as any; n.strategic_dimensions = { RBiH: { internal_cohesion: { base_value: 9, event_modifier: 4, effective_value: 13 } } }; state.military.negotiation = n; }, '9b5e14afb9f0f7666865e14cf08ec82cca11b87cf652fa2928bb08d2996072d6', 'd5bdb0a72a6b75d53ce940bd1df3ecdbc3503b6e857890ab1463131a709c93be'],
        ];
        for (const [name, arrange, preludeDigest, finalDigest] of cases) {
            const input = deserializeState(startup);
            arrange(input);
            const prelude = deserializeState(serializeState(input));
            initializeNegotiationState(prelude);
            expect(digest(serializeState(prelude)), `${name}:prelude`).toBe(preludeDigest);
            const final = deserializeState(serializeState(input));
            computeNegotiationBreakdown(final);
            expect(digest(serializeState(final)), `${name}:final`).toBe(finalDigest);
        }
        const malformed = deserializeState(startup);
        (malformed.military as any).negotiation = { capital: null, patron_relationships: {}, peace_plan_history: [] };
        expect(() => computeNegotiationBreakdown(malformed)).toThrow();
    });
    it('characterizes the legacy initialization prelude across compatibility shapes', () => {
        const absent = makeState();
        computeNegotiationBreakdown(absent);
        expect(Object.keys(absent.military.negotiation!.capital)).toEqual(['RBiH', 'RS', 'HRHB']);
        expect(Object.keys(absent.military.negotiation!.patron_relationships)).toEqual(['RBiH', 'RS', 'HRHB']);
        expect(Object.keys(absent.military.negotiation!.strategic_dimensions!)).toEqual(['RBiH', 'RS', 'HRHB']);

        const empty = makeState({ military: { formations: {}, negotiation: {
            capital: {}, patron_relationships: {}, peace_plan_history: [],
        } } as any });
        const emptyNegotiation = empty.military.negotiation;
        computeNegotiationBreakdown(empty);
        expect(empty.military.negotiation).toBe(emptyNegotiation);
        expect(Object.keys(empty.military.negotiation!.capital)).toEqual(['RBiH', 'RS', 'HRHB']);

        const sentinelCapital = createEmptyCapital() as any;
        sentinelCapital.war_crimes_events = 7;
        sentinelCapital.forward_compatible = { retained: true };
        const partialDimensions = { RBiH: { internal_cohesion: { base_value: 9, event_modifier: 4, effective_value: 13 } } } as any;
        const rich = makeState({ military: { formations: {}, negotiation: {
            capital: { RBiH: sentinelCapital, EXTRA: { keep: 'capital' } },
            patron_relationships: { RBiH: createDefaultPatronRelationship('RBiH'), EXTRA: { keep: 'patron' } },
            peace_plan_history: [],
            strategic_dimensions: partialDimensions,
            forward_compatible: { keep: true },
        } } as any });
        const negotiationRef = rich.military.negotiation!;
        const capitalRef = negotiationRef.capital;
        const patronRef = negotiationRef.patron_relationships;
        computeNegotiationBreakdown(rich);
        expect(rich.military.negotiation).toBe(negotiationRef);
        expect(negotiationRef.capital).toBe(capitalRef);
        expect(negotiationRef.patron_relationships).toBe(patronRef);
        expect(negotiationRef.capital.RBiH).toBe(sentinelCapital);
        expect((negotiationRef.capital as any).EXTRA).toEqual({ keep: 'capital' });
        expect((negotiationRef.patron_relationships as any).EXTRA).toEqual({ keep: 'patron' });
        expect(negotiationRef.strategic_dimensions).toBe(partialDimensions);
        expect((negotiationRef as any).forward_compatible).toEqual({ keep: true });
        expect(sentinelCapital.war_crimes_events).toBe(7);
        expect(sentinelCapital.forward_compatible).toEqual({ retained: true });

        const malformed = makeState({ military: { formations: {}, negotiation: {
            capital: null, patron_relationships: {}, peace_plan_history: [],
        } } as any });
        expect(() => computeNegotiationBreakdown(malformed)).toThrow();
    });
    it('initializes negotiation state with all 3 factions', () => {
        const state = makeState();
        computeNegotiationBreakdown(state);

        expect(state.military.negotiation).toBeDefined();
        expect(state.military.negotiation!.capital.RBiH).toBeDefined();
        expect(state.military.negotiation!.capital.RS).toBeDefined();
        expect(state.military.negotiation!.capital.HRHB).toBeDefined();
    });

    it('initializes patron relationships', () => {
        const state = makeState();
        computeNegotiationBreakdown(state);

        const neg = state.military.negotiation!;
        expect(neg.patron_relationships.RS.patron_id).toBe('serbia');
        expect(neg.patron_relationships.HRHB.patron_id).toBe('croatia');
        expect(neg.patron_relationships.RBiH.patron_id).toBe('international_community');
    });

    it('raw breakdown fields are populated', () => {
        const state = makeState();
        computeNegotiationBreakdown(state);

        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            const cap = state.military.negotiation!.capital[faction];
            expect(cap.territory_controlled_pct).toBeGreaterThanOrEqual(0);
            expect(cap.territory_controlled_km2).toBeGreaterThanOrEqual(0);
            expect(cap.operations_launched).toBeGreaterThanOrEqual(0);
            expect(cap.war_crimes_events).toBeGreaterThanOrEqual(0);
        }
    });

    it('preserves existing negotiation state on subsequent calls', () => {
        const state = makeState();
        computeNegotiationBreakdown(state);

        state.military.negotiation!.peace_plan_history.push({
            plan_id: 'test_plan',
            turn_offered: 5,
            responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
            resolved: true,
        });

        computeNegotiationBreakdown(state);

        expect(state.military.negotiation!.peace_plan_history).toHaveLength(1);
        expect(state.military.negotiation!.peace_plan_history[0].plan_id).toBe('test_plan');
    });

    it('dimension weights sum to 1.0 for each faction', () => {
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            const weights = DIMENSION_WEIGHTS[faction];
            const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        }
    });

    it('empty breakdown has zero defaults for raw fields', () => {
        const cap = createEmptyCapital();
        expect(cap.territory_controlled_pct).toBe(0);
        expect(cap.territory_controlled_km2).toBe(0);
        expect(cap.operations_launched).toBe(0);
        expect(cap.war_crimes_events).toBe(0);
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

    it('raw casualty data reflects brigade history', () => {
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

        computeNegotiationBreakdown(state);

        const rbih = state.military.negotiation!.capital.RBiH;
        const rs = state.military.negotiation!.capital.RS;
        expect(rbih.military_casualties_inflicted).toBeGreaterThan(rs.military_casualties_inflicted);
    });

    it('counts operation AARs instead of brigade attacker participations', () => {
        const state = makeState({
            military: {
                formations: {
                    brig_1: {
                        faction: 'RBiH',
                        kind: 'brigade',
                        brigade_history: { battles_as_attacker: 12, victories: 8 },
                    },
                    brig_2: {
                        faction: 'RBiH',
                        kind: 'brigade',
                        brigade_history: { battles_as_attacker: 9, victories: 4 },
                    },
                },
            } as any,
            operation_history: [
                { operation_id: 'rbih-success', faction: 'RBiH', outcome: 'success' },
                { operation_id: 'rbih-partial', faction: 'RBiH', outcome: 'partial' },
                { operation_id: 'rs-success', faction: 'RS', outcome: 'success' },
            ] as any,
        });

        computeNegotiationBreakdown(state);

        expect(state.military.negotiation!.capital.RBiH.operations_launched).toBe(2);
        expect(state.military.negotiation!.capital.RBiH.operations_successful).toBe(1);
        expect(state.military.negotiation!.capital.RS.operations_launched).toBe(1);
        expect(state.military.negotiation!.capital.RS.operations_successful).toBe(1);
    });
});
