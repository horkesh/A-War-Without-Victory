import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { FactionState, GameState, PendingConvoyDecision } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
    applyHumanitarianConvoyDecisions,
    evaluateHumanitarianConvoys,
} from '../src/state/supply_reserves.js';

function makeFaction(id: FactionState['id']): FactionState {
    return {
        id,
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
    };
}

function makeConvoy(overrides: Partial<PendingConvoyDecision> = {}): PendingConvoyDecision {
    return {
        id: 'convoy:64:ENCL_alpha:RS',
        target_enclave: 'ENCL_alpha',
        route_faction: 'RS',
        supply_amount: 0.55,
        ...overrides,
    };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 64,
            seed: 'humanitarian-convoy-lifecycle-test',
            phase: 'war',
            supply_reserves_enabled: true,
            player_faction: 'RS',
            ...(overrides.meta ?? {}),
        } as GameState['meta'],
        factions: [makeFaction('HRHB'), makeFaction('RBiH'), makeFaction('RS')],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { HRHB: 30, RBiH: 20, RS: 40 },
            heavy_munitions_reserve: { HRHB: 10, RBiH: 5, RS: 20 },
            ...(overrides.military ?? {}),
        },
        political: {
            political_controllers: {
                alpha_a: 'RBiH',
                alpha_b: 'RBiH',
                beta_a: 'RBiH',
                beta_b: 'RBiH',
                route_hrhb: 'HRHB',
                route_rs: 'RS',
            },
            international_visibility_pressure: {
                sarajevo_siege_visibility: 0,
                enclave_humanitarian_pressure: 0.4,
                atrocity_visibility: 0,
                negotiation_momentum: 0,
                composite_ivp: 0.4,
                last_major_shift: null,
            },
            enclaves: [
                {
                    id: 'ENCL_alpha',
                    faction_id: 'RBiH',
                    settlement_ids: ['alpha_a', 'alpha_b'],
                    integrity: 0.4,
                    components: { supply: 0, authority: 0.5, population: 0.8, connectivity: 0.4 },
                    humanitarian_pressure: 0.5,
                    siege_duration: 6,
                    collapsed: false,
                },
                {
                    id: 'ENCL_beta',
                    faction_id: 'RBiH',
                    settlement_ids: ['beta_a', 'beta_b'],
                    integrity: 0.35,
                    components: { supply: 0, authority: 0.45, population: 0.75, connectivity: 0.4 },
                    humanitarian_pressure: 0.6,
                    siege_duration: 7,
                    collapsed: false,
                },
            ],
            ...(overrides.political ?? {}),
        },
        displacement: {
            ...(overrides.displacement ?? {}),
        },
    } as GameState;
}

const convoyEdges: EdgeRecord[] = [
    { a: 'alpha_a', b: 'route_rs' } as EdgeRecord,
    { a: 'alpha_b', b: 'route_rs' } as EdgeRecord,
    { a: 'beta_a', b: 'route_hrhb' } as EdgeRecord,
    { a: 'beta_b', b: 'route_hrhb' } as EdgeRecord,
];

describe('evaluateHumanitarianConvoys', () => {
    it('emits zero convoys when supply reserves are disabled', () => {
        const state = makeState({
            meta: {
                turn: 64,
                seed: 'humanitarian-convoy-lifecycle-test',
                phase: 'war',
                supply_reserves_enabled: false,
                player_faction: 'RS',
            } as GameState['meta'],
        });

        expect(evaluateHumanitarianConvoys(state, convoyEdges)).toEqual([]);
        expect(state.military.pending_convoy_decisions).toBeUndefined();
    });

    it('emits zero convoys when no enclave has four siege turns', () => {
        const state = makeState({
            political: {
                enclaves: [
                    {
                        id: 'ENCL_alpha',
                        faction_id: 'RBiH',
                        settlement_ids: ['alpha_a', 'alpha_b'],
                        integrity: 0.7,
                        components: { supply: 0.2, authority: 0.5, population: 0.8, connectivity: 0.4 },
                        humanitarian_pressure: 0.9,
                        siege_duration: 3,
                        collapsed: false,
                    },
                ],
            } as GameState['political'],
        });

        expect(evaluateHumanitarianConvoys(state, convoyEdges)).toEqual([]);
        expect(state.military.pending_convoy_decisions).toEqual([]);
    });

    it('emits zero convoys when no hostile faction borders the enclave', () => {
        const state = makeState({
            political: {
                political_controllers: {
                    alpha_a: 'RBiH',
                    alpha_b: 'RBiH',
                    friendly_route: 'RBiH',
                },
                enclaves: [
                    {
                        id: 'ENCL_alpha',
                        faction_id: 'RBiH',
                        settlement_ids: ['alpha_a', 'alpha_b'],
                        integrity: 0.4,
                        components: { supply: 0, authority: 0.5, population: 0.8, connectivity: 0.4 },
                        humanitarian_pressure: 0.9,
                        siege_duration: 8,
                        collapsed: false,
                    },
                ],
            } as GameState['political'],
        });
        const edges: EdgeRecord[] = [{ a: 'alpha_a', b: 'friendly_route' } as EdgeRecord];

        expect(evaluateHumanitarianConvoys(state, edges)).toEqual([]);
        expect(state.military.pending_convoy_decisions).toEqual([]);
    });

    it('emits convoys with deterministic IDs', () => {
        const state = makeState({
            political: {
                enclaves: [makeState().political.enclaves![0]],
            } as GameState['political'],
        });

        const created = evaluateHumanitarianConvoys(state, convoyEdges);

        expect(created).toEqual([
            {
                id: 'convoy:64:ENCL_alpha:RS',
                target_enclave: 'ENCL_alpha',
                route_faction: 'RS',
                supply_amount: 0.55,
            },
        ]);
    });

    it('dedupes by ID against already pending convoy decisions', () => {
        const existing = makeConvoy();
        const state = makeState({
            military: {
                pending_convoy_decisions: [existing],
            } as Partial<GameState['military']> as GameState['military'],
            political: {
                enclaves: [makeState().political.enclaves![0]],
            } as GameState['political'],
        });

        expect(evaluateHumanitarianConvoys(state, convoyEdges)).toEqual([]);
        expect(state.military.pending_convoy_decisions).toEqual([existing]);
    });

    it('sorts the resulting pending queue by ID', () => {
        const existing = makeConvoy({
            id: 'convoy:64:ZZZ_existing:RS',
            target_enclave: 'ZZZ_existing',
        });
        const state = makeState({
            military: {
                pending_convoy_decisions: [existing],
            } as Partial<GameState['military']> as GameState['military'],
        });

        evaluateHumanitarianConvoys(state, convoyEdges);

        expect(state.military.pending_convoy_decisions?.map((convoy) => convoy.id)).toEqual([
            'convoy:64:ENCL_alpha:RS',
            'convoy:64:ENCL_beta:HRHB',
            'convoy:64:ZZZ_existing:RS',
        ]);
    });
});

describe('applyHumanitarianConvoyDecisions', () => {
    it('keeps a player-route convoy with no decision pending for the next turn', () => {
        const convoy = makeConvoy({ route_faction: 'RS' });
        const state = makeState({
            military: {
                pending_convoy_decisions: [convoy],
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.pending_convoy_decisions).toEqual([convoy]);
        expect(state.military.general_supply_reserve).toEqual({ HRHB: 30, RBiH: 20, RS: 40 });
    });

    it.each([
        { composite: 0.6, expectedDecision: 'allow' as const, expectedReserve: { HRHB: 30, RBiH: 20.55, RS: 40 } },
        { composite: 0.2, expectedDecision: 'block' as const, expectedReserve: { HRHB: 30, RBiH: 20, RS: 40 } },
        { composite: 0.4, expectedDecision: 'divert' as const, expectedReserve: { HRHB: 30.275, RBiH: 20.275, RS: 40 } },
    ])('consumes a non-player-route convoy with IVP default $expectedDecision', ({ composite, expectedDecision, expectedReserve }) => {
        const state = makeState({
            military: {
                pending_convoy_decisions: [makeConvoy({ route_faction: 'HRHB', decision: undefined })],
            } as Partial<GameState['military']> as GameState['military'],
            political: {
                international_visibility_pressure: {
                    sarajevo_siege_visibility: 0,
                    enclave_humanitarian_pressure: 0,
                    atrocity_visibility: 0,
                    negotiation_momentum: 0,
                    composite_ivp: composite,
                    last_major_shift: null,
                },
            } as GameState['political'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.pending_convoy_decisions).toEqual([]);
        expect(state.military.general_supply_reserve?.HRHB).toBeCloseTo(expectedReserve.HRHB);
        expect(state.military.general_supply_reserve?.RBiH).toBeCloseTo(expectedReserve.RBiH);
        expect(state.military.general_supply_reserve?.RS).toBeCloseTo(expectedReserve.RS);
        if (expectedDecision === 'block') {
            expect(state.political.international_visibility_pressure?.enclave_humanitarian_pressure).toBeCloseTo(0.018);
            expect(state.factions.find((faction) => faction.id === 'HRHB')?.patron_state?.diplomatic_isolation).toBeCloseTo(0.03);
        }
        if (expectedDecision === 'divert') {
            expect(state.political.international_visibility_pressure?.enclave_humanitarian_pressure).toBeCloseTo(0.006);
            expect(state.factions.find((faction) => faction.id === 'HRHB')?.patron_state?.diplomatic_isolation).toBeCloseTo(0.012);
        }
    });

    it('clamps allowed convoy supply to 100 for the target enclave faction', () => {
        const state = makeState({
            military: {
                general_supply_reserve: { HRHB: 30, RBiH: 99.8, RS: 40 },
                pending_convoy_decisions: [makeConvoy({ decision: 'allow', supply_amount: 0.55 })],
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.general_supply_reserve?.RBiH).toBe(100);
        expect(state.military.pending_convoy_decisions).toEqual([]);
    });

    it('applies block pressure and route patron isolation, with HRHB route multiplier', () => {
        const state = makeState({
            military: {
                pending_convoy_decisions: [makeConvoy({ route_faction: 'HRHB', decision: 'block' })],
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.political.international_visibility_pressure?.enclave_humanitarian_pressure).toBeCloseTo(0.418);
        expect(state.factions.find((faction) => faction.id === 'HRHB')?.patron_state?.diplomatic_isolation).toBeCloseTo(0.03);
        expect(state.military.pending_convoy_decisions).toEqual([]);
    });

    it('applies divert supply split and smaller pressure and isolation deltas', () => {
        const state = makeState({
            military: {
                pending_convoy_decisions: [makeConvoy({ route_faction: 'RS', decision: 'divert' })],
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.general_supply_reserve?.RBiH).toBeCloseTo(20.275);
        expect(state.military.general_supply_reserve?.RS).toBeCloseTo(40.275);
        expect(state.political.international_visibility_pressure?.enclave_humanitarian_pressure).toBeCloseTo(0.41);
        expect(state.factions.find((faction) => faction.id === 'RS')?.patron_state?.diplomatic_isolation).toBeCloseTo(0.02);
        expect(state.military.pending_convoy_decisions).toEqual([]);
    });

    it('mutates the pending queue in place to only contain remaining player-route convoys', () => {
        const remaining = makeConvoy({ id: 'convoy:64:ENCL_alpha:RS', route_faction: 'RS' });
        const consumed = makeConvoy({ id: 'convoy:64:ENCL_beta:HRHB', target_enclave: 'ENCL_beta', route_faction: 'HRHB' });
        const state = makeState({
            military: {
                pending_convoy_decisions: [consumed, remaining],
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.pending_convoy_decisions).toEqual([remaining]);
    });

    it('files consumed convoy decisions into deterministic history records', () => {
        const state = makeState({
            military: {
                pending_convoy_decisions: [
                    makeConvoy({ id: 'convoy:64:ENCL_alpha:RS', route_faction: 'RS', decision: 'allow', supply_amount: 0.5 }),
                    makeConvoy({ id: 'convoy:64:ENCL_beta:HRHB', target_enclave: 'ENCL_beta', route_faction: 'HRHB', decision: 'block', supply_amount: 0.4 }),
                ],
                general_supply_reserve: { RBiH: 20, RS: 40 },
            } as Partial<GameState['military']> as GameState['military'],
        });

        applyHumanitarianConvoyDecisions(state);

        expect(state.military.convoy_decision_history).toEqual([
            {
                id: 'convoy:64:ENCL_alpha:RS',
                turn: 64,
                target_enclave: 'ENCL_alpha',
                route_faction: 'RS',
                target_faction: 'RBiH',
                supply_amount: 0.5,
                decision: 'allow',
                decided_by: 'player',
            },
            {
                id: 'convoy:64:ENCL_beta:HRHB',
                turn: 64,
                target_enclave: 'ENCL_beta',
                route_faction: 'HRHB',
                target_faction: 'RBiH',
                supply_amount: 0.4,
                decision: 'block',
                decided_by: 'bot',
            },
        ]);
    });

    it('early-returns without mutating IVP when the pending queue is empty', () => {
        const state = makeState({
            military: {
                pending_convoy_decisions: [],
            } as Partial<GameState['military']> as GameState['military'],
        });
        const originalIvp = state.political.international_visibility_pressure;

        applyHumanitarianConvoyDecisions(state);

        expect(state.political.international_visibility_pressure).toBe(originalIvp);
        expect(state.factions.some((faction) => faction.patron_state)).toBe(false);
    });
});

describe('humanitarian convoy lifecycle determinism', () => {
    it('produces byte-identical queues and reserve maps from cloned states', () => {
        const first = makeState();
        const second = structuredClone(first);

        evaluateHumanitarianConvoys(first, convoyEdges);
        evaluateHumanitarianConvoys(second, convoyEdges);
        first.military.pending_convoy_decisions = first.military.pending_convoy_decisions?.map((convoy) => ({
            ...convoy,
            decision: convoy.route_faction === 'RS' ? 'allow' : 'divert',
        }));
        second.military.pending_convoy_decisions = second.military.pending_convoy_decisions?.map((convoy) => ({
            ...convoy,
            decision: convoy.route_faction === 'RS' ? 'allow' : 'divert',
        }));

        applyHumanitarianConvoyDecisions(first);
        applyHumanitarianConvoyDecisions(second);

        expect(JSON.stringify(first.military.pending_convoy_decisions)).toBe(JSON.stringify(second.military.pending_convoy_decisions));
        expect(JSON.stringify(first.military.general_supply_reserve)).toBe(JSON.stringify(second.military.general_supply_reserve));
        expect(JSON.stringify(first.political.international_visibility_pressure)).toBe(JSON.stringify(second.political.international_visibility_pressure));
    });
});
