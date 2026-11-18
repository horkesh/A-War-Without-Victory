import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeNegotiationBreakdown } from '../src/sim/negotiation/compute_capital.js';
import { initializeNegotiationState } from '../src/sim/negotiation/initialize_negotiation_state.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { DIMENSION_WEIGHTS, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';

// Immutable provenance fixture: exact bytes copied from commit
// b371adc3e0935825649e5eda4e6bbd45a44a359d at
// data/derived/startup/apr_1992_initial_save.json (the mutable derived startup
// must not feed these historical byte expectations).
const NEGOTIATION_FIXTURE_PATH = 'tests/fixtures/negotiation/b371_apr1992_initial_save.json';
const NEGOTIATION_FIXTURE_SHA256 = '413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1';

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
        const startupBytes = readFileSync(NEGOTIATION_FIXTURE_PATH);
        expect(createHash('sha256').update(startupBytes).digest('hex')).toBe(NEGOTIATION_FIXTURE_SHA256);
        const startup = startupBytes.toString('utf8');
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
        // Digests re-pinned 2026-11-18 for save schema v42 (§6 E4, after main's v41): the only byte
        // change from main's v41 pins is schema_version 41 -> 42 (verified by setting that field back
        // to 41 and reproducing every v41 digest). Main's v41 pins (§6 E2) re-pinned main's v40 pins
        // the same way; v40 (September 1991 peace start retired) dropped meta.peace_war_start_control_path.
        const cases: Array<[string, (state: GameState) => void, string, string]> = [
            ['absent', (state) => { delete state.military.negotiation; }, '6c0047fb34690bf99295e88d299a92bcf5be17295549b3a6355bb2f555f51a46', '27dc8b6ffb787fac005c5c443447acf080b801c8bf2983ec589b53a0bf6b2311'],
            ['empty', (state) => { state.military.negotiation = { capital: {}, patron_relationships: {}, peace_plan_history: [] }; }, '6c0047fb34690bf99295e88d299a92bcf5be17295549b3a6355bb2f555f51a46', '27dc8b6ffb787fac005c5c443447acf080b801c8bf2983ec589b53a0bf6b2311'],
            ['complete', (state) => { state.military.negotiation = complete(); }, '6c0047fb34690bf99295e88d299a92bcf5be17295549b3a6355bb2f555f51a46', '27dc8b6ffb787fac005c5c443447acf080b801c8bf2983ec589b53a0bf6b2311'],
            ['missing_entry', (state) => { const n = complete() as any; delete n.capital.HRHB; delete n.patron_relationships.RS; state.military.negotiation = n; }, '6c0047fb34690bf99295e88d299a92bcf5be17295549b3a6355bb2f555f51a46', '27dc8b6ffb787fac005c5c443447acf080b801c8bf2983ec589b53a0bf6b2311'],
            // sentinel:final re-pinned 2026-11-17 for §6 E3a1 D2: computeNegotiationBreakdown no
            // longer writes international_standing (the old second writer set RBiH's base to
            // clamp(50 − 7 × 10) = 0 here). computeDimensionBaseValues is now the single base
            // writer, so RBiH's standing stays at its initialized 50/0/50 (asserted below).
            // The v42 value reproduces main's v41 pin (52ccac6b…/42cd2f6a…) with schema_version set back to 41.
            ['sentinel', (state) => { const n = complete() as any; n.capital.RBiH.war_crimes_events = 7; n.capital.RBiH.war_crimes_events_emergent = 11; n.pending_offer = { sentinel: true }; state.military.negotiation = n; }, '1b3e497db43d4c16b1d3dccde99cb70d0c6d1fca46ec4f722d2212e4d912d157', 'd5344d2a7d2db5f194222c5515b028c57999837295deb8696af090e969802094'],
            ['extra_key', (state) => { const n = complete() as any; n.capital.EXTRA = { keep: 'capital' }; n.patron_relationships.EXTRA = { keep: 'patron' }; n.forward_compatible = { keep: true }; state.military.negotiation = n; }, '51a8bfd57e1299d4c4fa91e067ae2c1c78d5332f205022da9c0e7708e979e757', '4adf7e2c58576844f6aaa244e8dd1b0691a2ceb632f0fd08660ff9ca96dddd0b'],
            ['partial_dimensions', (state) => { const n = complete() as any; n.strategic_dimensions = { RBiH: { internal_cohesion: { base_value: 9, event_modifier: 4, effective_value: 13 } } }; state.military.negotiation = n; }, '5c045a562d1ff87bb1e01f8be12feb2cc41eb1d55d5e1cdb18b04eb6c221c553', '40081e7cdde803591e024c0388e3dee0088ef39edc96e0e27c02b3394172f47e'],
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
            if (name === 'sentinel') {
                expect(final.military.negotiation!.strategic_dimensions!.RBiH.international_standing)
                    .toEqual({ base_value: 50, event_modifier: 0, effective_value: 50 });
            }
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

    it('records an enclave as lost when another faction holds its capital (RD run review, 2026-11-07)', () => {
        const state = makeState({
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RS',
                    'op:rogatica:zepa_2': 'RS',
                    'op:gorazde:gorazde_2': 'RBiH',
                    'op:centar_sarajevo:centar_sarajevo': 'RBiH',
                },
            },
        } as unknown as Partial<GameState>);
        computeNegotiationBreakdown(state);
        const cap = state.military.negotiation!.capital.RBiH;
        expect(cap.enclaves_lost).toEqual(['srebrenica', 'zepa']);
        expect(cap.enclaves_held).toEqual(['sarajevo', 'gorazde', 'bihac']);
    });
});
