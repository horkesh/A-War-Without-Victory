/**
 * Opt-in `dispatcher_decision` observation of the ACTUAL terminal `evaluateSectorMarch` exit.
 *
 * Production paths only: `generateAllBotOrdersOsid` -> `evaluateSectorMarch`. Each scenario is run twice
 * on a fresh state (topic off, topic on). Required contract:
 *  - topic off: no `sector_march` field anywhere and no observation work;
 *  - topic on: IDENTICAL generated orders and identical real serialized canonical state;
 *  - the recorded exit equals the branch that actually produced the order (march exits carry the same
 *    destination as the generated column march; `*_false` exits generate no order and the evaluator
 *    result is false), and a local lambda that returned false never leaves its own label;
 *  - the observation is a detached copy (mutating it never reaches live state).
 * Exits not constructed here (enclave defend exits, retroactive tooth eviction, tooth fallthrough) are
 * listed in the 188 checkpoint rather than fabricated.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import type { GameState } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => setTopics(undefined));

const CORPS = 'arbih_test_corps';
const ENCLAVE_HOME = 'op:srebrenica:srebrenica_2';
const OUTSIDE_FRONT = 'op:a_outside:front';

function brigade(id: string, location: string, overrides: Record<string, unknown> = {}) {
    return {
        id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: CORPS,
        location_osid: location, personnel: 1000, cohesion: 70, morale: 70, experience: 0.5,
        posture: 'defend', equipment: {}, ...overrides,
    };
}

function sector(id: string, friendly: string[], assigned: string[], reserve: string[] = []) {
    return {
        sector_id: id, corps_id: CORPS, faction: 'RBiH', opposing_factions: ['RS'],
        edge_ids: friendly.map((osid) => `${osid}__X`), length_edges: friendly.length,
        territory_osids: friendly, assigned_brigade_ids: assigned, reserve_brigade_ids: reserve,
        rear_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 1000,
        sector_stance: 'defend', stance_source: 'bot',
        sub_segments: [{
            sub_segment_id: `sub:${id}`, edge_ids: friendly.map((osid) => `${osid}__X`),
            friendly_osids: friendly, enemy_osids: ['X'], primary_brigade_ids: assigned,
            length_edges: friendly.length,
        }],
    };
}

interface Scenario {
    formations: Record<string, unknown>;
    sectors: Record<string, unknown>;
    directive?: Record<string, unknown>;
    movementOrders?: Record<string, unknown>;
    operations?: unknown[];
    edges?: Array<{ a: string; b: string }>;
    controllers?: Record<string, string>;
}

function makeState(s: Scenario): GameState {
    return {
        meta: { turn: 155, phase: 'war', seed: 'sector-march-observer' },
        political: {
            political_controllers: { A: 'RBiH', B: 'RBiH', C: 'RBiH', Z: 'RBiH', X: 'RS', ...(s.controllers ?? {}) }, control_events: [],
        },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: s.formations,
            corps_command: {
                [CORPS]: {
                    command_span: 3, subordinate_count: 3, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'balanced', active_operations: s.operations ?? [],
                    directive: {
                        assigned_front_ids: ['front:b', 'front:c'], offensive_targets: [],
                        hold_osids: [], avoid_osids: [], max_attackers_per_target: 1,
                        reserve_fraction: 0, min_attack_outcome: 'repulsed', aggression_modifier: 0,
                        ...(s.directive ?? {}),
                    },
                },
            },
            corps_front_sectors: s.sectors,
            brigade_attack_orders: {}, brigade_movement_orders: s.movementOrders ?? {}, brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

const BASE_EDGES = [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'B', b: 'X' }, { a: 'C', b: 'X' }];

function generate(state: GameState, edges: Array<{ a: string; b: string }> = BASE_EDGES) {
    return generateAllBotOrdersOsid(state, ['RBiH'], {
        edges: edges as any,
        reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
    }, {});
}

const FRONT_BC = sector('sector:s1', ['B', 'C'], ['b1']);

const SCENARIOS: Array<{
    name: string;
    build: () => Scenario;
    expectExit: string;
    expectObservation: Record<string, unknown>;
    destination?: string;
    /** Defend exits: sector_march is the first handler, returns true, selects no destination and generates no column march. */
    defend?: boolean;
}> = [
    {
        name: 'enclave brigade whose scoped front has no same-enclave OSID defends in place',
        build: () => ({
            formations: { b1: brigade('b1', ENCLAVE_HOME, { home_osid: ENCLAVE_HOME, tags: ['enclave'] }) },
            sectors: { 'sector:s1': sector('sector:s1', [OUTSIDE_FRONT], ['b1']) },
            edges: [{ a: ENCLAVE_HOME, b: OUTSIDE_FRONT }],
            controllers: { [ENCLAVE_HOME]: 'RBiH', [OUTSIDE_FRONT]: 'RBiH' },
        }),
        expectExit: 'enclave_no_front_target_defend',
        expectObservation: { loc_in_scoped_front: false, scoped_front_size: 1, allowed_front_size: null, evaluator_result: true, selected_destination: null },
        defend: true,
    },
    {
        name: 'fixed-home (not enclave-tagged) brigade whose scoped front lies outside the movement enclave has an empty allowed set',
        build: () => ({
            formations: { b1: brigade('b1', ENCLAVE_HOME, { home_osid: ENCLAVE_HOME, tags: ['placement:fixed_home_osid'] }) },
            sectors: { 'sector:s1': sector('sector:s1', [OUTSIDE_FRONT], ['b1']) },
            edges: [{ a: ENCLAVE_HOME, b: OUTSIDE_FRONT }],
            controllers: { [ENCLAVE_HOME]: 'RBiH', [OUTSIDE_FRONT]: 'RBiH' },
        }),
        expectExit: 'allowed_front_empty_defend',
        expectObservation: { loc_in_scoped_front: false, scoped_front_size: 1, allowed_front_size: 0, evaluator_result: true, selected_destination: null },
        defend: true,
    },
    {
        name: 'active enclave brigade with no sector and no operation commitment defends in place (final enclave guard)',
        build: () => ({
            formations: { b1: brigade('b1', ENCLAVE_HOME, { home_osid: ENCLAVE_HOME, tags: ['enclave'] }) },
            sectors: {},
            edges: [{ a: ENCLAVE_HOME, b: OUTSIDE_FRONT }],
            controllers: { [ENCLAVE_HOME]: 'RBiH', [OUTSIDE_FRONT]: 'RBiH' },
        }),
        expectExit: 'enclave_final_defend',
        expectObservation: { assigned_sector_id: null, operation_commitment: false, evaluator_result: true, selected_destination: null },
        defend: true,
    },
    {
        name: 'tooth-blocked: off-front brigade scoped to a risky sole-OSID tooth falls through false with no safe reroute',
        build: () => ({
            formations: { b1: brigade('b1', 'A', { assigned_sub_segment_id: 'sub:sector:s1' }) },
            sectors: { 'sector:s1': sector('sector:s1', ['B'], ['b1']) },
            edges: [{ a: 'A', b: 'B' }, { a: 'B', b: 'X' }, { a: 'B', b: 'X2' }, { a: 'B', b: 'X3' }],
            controllers: { X2: 'RS', X3: 'RS' },
        }),
        expectExit: 'fallthrough_false',
        expectObservation: {
            tooth_blocked: true, routine_scope_source: 'assigned_sub_segment', routine_scope_restricted: true,
            loc_in_scoped_front: false, scoped_front_size: 1, evaluator_result: false, selected_destination: null,
        },
    },
    {
        name: 'scoped sector-front march (no reassignment)',
        build: () => ({ formations: { b1: brigade('b1', 'A') }, sectors: { 'sector:s1': FRONT_BC } }),
        expectExit: 'scoped_front_march',
        expectObservation: {
            operation_commitment: false, reassignment_order_present: false, assigned_sector_id: 'sector:s1',
            is_reserve: false, loc_in_scoped_front: false, scoped_front_size: 2, allowed_front_size: 2,
            selected_destination: 'B', selected_destination_in_scoped_front: true, evaluator_result: true,
        },
        destination: 'B',
    },
    {
        name: 'explicit reassignment to the SAME sector id',
        build: () => ({
            formations: { b1: brigade('b1', 'A') }, sectors: { 'sector:s1': FRONT_BC },
            directive: { sector_reassignment_orders: [{ brigade_id: 'b1', to_sector_id: 'sector:s1' }] },
        }),
        expectExit: 'explicit_reassignment_march',
        expectObservation: {
            reassignment_order_present: true, reassignment_to_sector_id: 'sector:s1', reassignment_target_found: true,
            selected_destination: 'B', evaluator_result: true,
        },
        destination: 'B',
    },
    {
        name: 'pending home return (reserve with a home-bound order)',
        build: () => ({
            formations: { b1: brigade('b1', 'A', { home_osid: 'A' }), b2: brigade('b2', 'B') },
            sectors: { 'sector:s1': sector('sector:s1', ['B', 'C'], ['b2'], ['b1']) },
            movementOrders: { b1: { destination_sids: ['A'] } },
        }),
        expectExit: 'pending_home_return_false',
        expectObservation: { is_reserve: true, evaluator_result: false },
    },
    {
        name: 'reserve one hop behind the front stays put',
        build: () => ({
            formations: { b1: brigade('b1', 'A'), b2: brigade('b2', 'B') },
            sectors: { 'sector:s1': sector('sector:s1', ['B', 'C'], ['b2'], ['b1']) },
        }),
        expectExit: 'reserve_near_front_stay_false',
        expectObservation: { is_reserve: true, loc_in_scoped_front: false, evaluator_result: false },
    },
    {
        name: 'trap remediation reroutes within the corps front',
        build: () => ({
            formations: { b1: brigade('b1', 'A'), b2: brigade('b2', 'C') },
            sectors: {
                'sector:s1': sector('sector:s1', ['Z'], ['b1']),
                'sector:s2': sector('sector:s2', ['B', 'C'], ['b2']),
            },
        }),
        expectExit: 'trap_corps_front_reroute',
        expectObservation: {
            assigned_sector_id: 'sector:s1', loc_in_scoped_front: false, scoped_front_size: 1,
            selected_destination: 'B', selected_destination_in_scoped_front: false, evaluator_result: true,
        },
        destination: 'B',
    },
    {
        name: 'on the front with nothing to do falls through false',
        build: () => ({ formations: { b1: brigade('b1', 'B') }, sectors: { 'sector:s1': FRONT_BC } }),
        expectExit: 'fallthrough_false',
        expectObservation: { loc_in_scoped_front: true, evaluator_result: false, selected_destination: null },
    },
    {
        name: 'active operation commitment skips sector march',
        build: () => ({
            formations: { b1: brigade('b1', 'A') }, sectors: { 'sector:s1': FRONT_BC },
            operations: [{
                name: 'Operation Observer', type: 'sector_attack', phase: 'execution',
                participating_brigades: ['b1'], objectives: ['X'],
            }],
        }),
        expectExit: 'fallthrough_false',
        expectObservation: { operation_commitment: true, assigned_sector_id: null, evaluator_result: false },
    },
    {
        name: 'retroactive tooth on a risky sole-OSID sub-segment is evicted to a safe front OSID',
        build: () => ({
            formations: { b1: brigade('b1', 'B'), b2: brigade('b2', 'C') },
            sectors: {
                'sector:s1': sector('sector:s1', ['B'], ['b1']),
                'sector:s2': sector('sector:s2', ['C', 'D'], ['b2']),
            },
            edges: [
                { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'B', b: 'X' }, { a: 'B', b: 'X2' }, { a: 'B', b: 'X3' },
                { a: 'C', b: 'X' }, { a: 'C', b: 'D' },
            ],
            controllers: { D: 'RBiH', X2: 'RS', X3: 'RS' },
        }),
        expectExit: 'retroactive_tooth_evict_march',
        expectObservation: {
            loc_in_scoped_front: true, scoped_front_size: 1, selected_destination: 'C',
            selected_destination_in_scoped_front: false, evaluator_result: true,
        },
        destination: 'C',
    },
    {
        name: 'overstacked front OSID redistributes to a lighter front OSID',
        build: () => ({
            formations: { b1: brigade('b1', 'B'), b2: brigade('b2', 'B'), b3: brigade('b3', 'B') },
            sectors: { 'sector:s1': sector('sector:s1', ['B', 'C'], ['b1', 'b2', 'b3']) },
        }),
        expectExit: 'overstack_redistribution_march',
        expectObservation: {
            loc_in_scoped_front: true, selected_destination: 'C', selected_destination_in_scoped_front: true,
            evaluator_result: true,
        },
        destination: 'C',
    },
];

function runPair(build: () => Scenario) {
    const edges = build().edges;
    const offState = makeState(build());
    setTopics(undefined);
    const off = generate(offState, edges);
    const onState = makeState(build());
    setTopics('dispatcher_decision');
    const on = generate(onState, edges);
    setTopics(undefined);
    return { off, on, offState, onState };
}

describe('dispatcher_decision sector_march observation', () => {
    for (const scenario of SCENARIOS) {
        it(`${scenario.name}: records the actual terminal exit without changing orders or state`, () => {
            const { off, on, offState, onState } = runPair(scenario.build);
            // topic off: absent everywhere
            expect((off as any).dispatcher_decision_details).toBeUndefined();
            expect(JSON.stringify(off)).not.toContain('"sector_march":');
            // topic on: identical orders (details are the only added key) and identical real serialized state
            const { dispatcher_decision_details: details, ...onBase } = on as any;
            expect(onBase).toEqual(off);
            expect(serializeState(onState)).toBe(serializeState(offState));
            const detail = details.find((entry: any) => entry.formation_id === 'b1');
            expect(detail).toBeDefined();
            const observation = detail.sector_march;
            expect(observation).toBeDefined();
            expect(observation.exit).toBe(scenario.expectExit);
            expect(observation).toEqual(expect.objectContaining(scenario.expectObservation));
            // branch/output consistency
            const output = detail.final_generated_output;
            if (scenario.defend) {
                expect(observation.evaluator_result).toBe(true);
                expect(observation.selected_destination).toBeNull();
                expect(detail.first_handler).toBe('sector_march');
                expect(output.column_march_destination_osid).toBeNull();
                expect(output.postures).toContain('defend');
            } else if (scenario.destination !== undefined) {
                expect(output.column_march_destination_osid).toBe(scenario.destination);
                expect(observation.selected_destination).toBe(scenario.destination);
                expect(observation.evaluator_result).toBe(true);
                expect(detail.first_handler).toBe('sector_march');
            } else {
                // A false exit means sector_march generated nothing; a LATER evaluator may still emit an order
                // (the active-operation participant is marched by the attack evaluator), so only the evaluator
                // result, the absent selection and the first handler are asserted.
                expect(observation.evaluator_result).toBe(false);
                expect(observation.selected_destination).toBeNull();
                expect(detail.first_handler).not.toBe('sector_march');
                expect(output).toBeDefined();
            }
        });
    }

    it('keeps the observation a detached copy: mutating it never reaches live state or a rerun', () => {
        const build = SCENARIOS.find((entry) => entry.expectExit === 'scoped_front_march')!.build;
        const first = runPair(build);
        const before = serializeState(first.onState);
        const detail = (first.on as any).dispatcher_decision_details.find((entry: any) => entry.formation_id === 'b1');
        detail.sector_march.exit = 'scoped_front_march_MUTATED';
        detail.sector_march.selected_destination = 'MUTATED';
        expect(serializeState(first.onState)).toBe(before);
        const second = runPair(build);
        const rerun = (second.on as any).dispatcher_decision_details.find((entry: any) => entry.formation_id === 'b1');
        expect(rerun.sector_march.exit).toBe('scoped_front_march');
        expect(rerun.sector_march.selected_destination).toBe('B');
    });

    it('never labels a local lambda that returned false: reassignment present but unusable falls to the real exit', () => {
        // Reassignment names a sector that does not exist: the explicit-reassignment lambda returns false,
        // so the terminal exit must be the later scoped-front march, not an explicit-reassignment label.
        const { on } = runPair(() => ({
            formations: { b1: brigade('b1', 'A') }, sectors: { 'sector:s1': FRONT_BC },
            directive: { sector_reassignment_orders: [{ brigade_id: 'b1', to_sector_id: 'sector:missing' }] },
        }));
        const observation = (on as any).dispatcher_decision_details.find((entry: any) => entry.formation_id === 'b1').sector_march;
        expect(observation.exit).toBe('scoped_front_march');
        expect(observation.reassignment_order_present).toBe(true);
        expect(observation.reassignment_target_found).toBe(false);
    });
});

describe('dispatcher_decision sector_march observation: insertion-order equivalence', () => {
    const reverseRecord = <T,>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).reverse());
    const normalise = (result: any) => {
        const { dispatcher_decision_details: details, ...orders } = result;
        const observations = [...details]
            .sort((a: any, b: any) => (a.formation_id < b.formation_id ? -1 : a.formation_id > b.formation_id ? 1 : 0))
            .map((entry: any) => [entry.formation_id, entry.first_handler, entry.final_generated_output, entry.sector_march ?? null]);
        return { orders, observations };
    };

    it.each([
        ['trap reroute (two sectors)', SCENARIOS.find((entry) => entry.expectExit === 'trap_corps_front_reroute')!],
        ['overstack redistribution (three brigades)', SCENARIOS.find((entry) => entry.expectExit === 'overstack_redistribution_march')!],
    ])('%s: reversed formation/sector insertion order gives identical orders and observations', (_label, scenario) => {
        const forward = scenario.build();
        const reversed = scenario.build();
        reversed.formations = reverseRecord(reversed.formations as Record<string, unknown>);
        reversed.sectors = reverseRecord(reversed.sectors as Record<string, unknown>);
        expect(Object.keys(reversed.formations)).not.toEqual(Object.keys(forward.formations));
        setTopics('dispatcher_decision');
        const a = normalise(generate(makeState(forward), forward.edges));
        const b = normalise(generate(makeState(reversed), reversed.edges));
        setTopics(undefined);
        expect(b).toEqual(a);
        expect(a.observations.some((row: any) => row[3] !== null)).toBe(true);
    });
});
