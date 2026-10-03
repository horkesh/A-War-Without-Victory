import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

import { createBotOrderDiagnosticsSnapshot } from '../src/scenario/combat_causality.js';
import { attachBotOrderDiagnosticsToWeeklyReport, buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import type { GameState } from '../src/state/game_state.js';
import { stableStringify } from '../src/utils/stable_json.js';

const require = createRequire(import.meta.url);
const { analyzeRows } = require('../tools/diagnostics/bot_dispatcher_decision_coverage.cjs') as {
    analyzeRows: (rows: unknown[], options: Record<string, unknown>) => any;
};

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => setTopics(undefined));

function formation(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active',
        corps_id: 'arbih_test_corps', location_osid: 'A', personnel: 1000,
        cohesion: 70, morale: 70, experience: 0.5, posture: 'defend', equipment: {},
        ...overrides,
    };
}

function makeState(): GameState {
    return {
        meta: { turn: 138, phase: 'war', seed: 'dispatcher-receipt' },
        political: { political_controllers: { A: 'RBiH', B: 'RBiH', C: 'RBiH', X: 'RS' }, control_events: [] },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: {
                z_filtered: formation('z_filtered'),
                a_sector_march: formation('a_sector_march'),
                b_inactive: formation('b_inactive', { status: 'inactive' }),
                c_unsupported: formation('c_unsupported', { kind: 'corps' }),
                d_missing_location: formation('d_missing_location', { location_osid: undefined }),
                e_other_faction: formation('e_other_faction', { faction: 'RS' }),
            },
            corps_command: {
                arbih_test_corps: {
                    command_span: 2, subordinate_count: 2, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [],
                    directive: {
                        assigned_front_ids: ['front:z', 'front:a'], offensive_targets: ['X'],
                        hold_osids: [], avoid_osids: [], max_attackers_per_target: 1,
                        reserve_fraction: 0, min_attack_outcome: 'repulsed', aggression_modifier: 0,
                    },
                },
            },
            corps_front_sectors: {
                'sector:test': {
                    sector_id: 'sector:test', corps_id: 'arbih_test_corps', faction: 'RBiH',
                    opposing_factions: ['RS'], edge_ids: ['B__X', 'C__X'], length_edges: 2,
                    territory_osids: ['B', 'C'], assigned_brigade_ids: ['a_sector_march'],
                    reserve_brigade_ids: [], rear_brigade_ids: [], density: 1,
                    threat_ratio: 1, defensive_power: 1000, sector_stance: 'defend', stance_source: 'bot',
                    sub_segments: [{ sub_segment_id: 'sub:test', edge_ids: ['B__X', 'C__X'], friendly_osids: ['B', 'C'], enemy_osids: ['X'], primary_brigade_ids: ['a_sector_march'], length_edges: 2 }],
                },
            },
            brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

function generate(state: GameState, filter: (formation: any) => boolean) {
    return generateAllBotOrdersOsid(state, ['RBiH'], {
        edges: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'B', b: 'X' }, { a: 'C', b: 'X' }] as any,
        reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
    }, { brigadeFilter: filter });
}

function makeCounterattackCapState(): GameState {
    const counterattacker = (id: string, location: string, target: string) => ({
        id, name: id, kind: 'brigade', faction: 'RS', status: 'active', corps_id: 'vrs_test',
        posture: 'defend', cohesion: 70, morale: 70, personnel: 1000, equipment: {},
        location_osid: location, last_retreat_from: { osid: target, turn: 2 },
    });
    return {
        meta: { turn: 3, phase: 'war', seed: 'dispatcher-cap-boundaries' },
        political: {
            political_controllers: { F1: 'RS', F2: 'RS', T1: 'RBiH', T2: 'RBiH', E1: 'RS', E2: 'RS' },
            control_events: [],
        },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: {
                rs_counter_a: counterattacker('rs_counter_a', 'F1', 'T1'),
                rs_counter_b: counterattacker('rs_counter_b', 'F2', 'T2'),
            },
            corps_command: {
                vrs_test: { stance: 'defensive', active_operations: [], corps_exhaustion: 0 },
            },
            brigade_attack_orders: {}, brigade_movement_orders: {}, brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

describe('bot dispatcher decision observation', () => {
    it('retains the legacy no-op behavior for null formation-map entries', () => {
        const state = makeState();
        state.military.formations = { null_entry: null as any };
        setTopics('dispatcher_decision');
        const diagnostics = generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [], reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        });
        expect(diagnostics.dispatcher_decision_details).toEqual([]);
    });

    it('observes actual eligibility, one filter call, first handler, ordering and default-off preservation', () => {
        const offState = makeState();
        const offCalls: string[] = [];
        setTopics(undefined);
        const off = generate(offState, (candidate) => { offCalls.push(candidate.id); return candidate.id !== 'z_filtered'; });

        const onState = makeState();
        const onCalls: string[] = [];
        setTopics('dispatcher_decision');
        const on = generate(onState, (candidate) => { onCalls.push(candidate.id); return candidate.id !== 'z_filtered'; });

        expect((off as any).dispatcher_decision_details).toBeUndefined();
        expect(offCalls).toEqual(['a_sector_march', 'z_filtered']);
        expect(onCalls).toEqual(offCalls);
        const details = (on as any).dispatcher_decision_details;
        expect(details.map((entry: any) => entry.formation_id)).toEqual([
            'a_sector_march', 'b_inactive', 'c_unsupported', 'd_missing_location', 'e_other_faction', 'z_filtered',
        ]);
        expect(details.find((entry: any) => entry.formation_id === 'a_sector_march')).toEqual(expect.objectContaining({
            pass: 'bot_dispatcher', scope: 'replace', caller_filter: 'accepted', eligibility: 'eligible',
            first_handler: 'sector_march',
            pre_cap_output: expect.objectContaining({ column_march_destination_osid: 'B' }),
            final_generated_output: expect.objectContaining({ column_march_destination_osid: 'B' }),
        }));
        expect(details.find((entry: any) => entry.formation_id === 'z_filtered')).toEqual(expect.objectContaining({ caller_filter: 'rejected', eligibility: 'caller_filter_rejected', first_handler: null }));
        expect(details.find((entry: any) => entry.formation_id === 'b_inactive').eligibility).toBe('inactive');
        expect(details.find((entry: any) => entry.formation_id === 'c_unsupported').eligibility).toBe('unsupported_kind');
        expect(details.find((entry: any) => entry.formation_id === 'd_missing_location').eligibility).toBe('missing_location');
        expect(details.find((entry: any) => entry.formation_id === 'e_other_faction').eligibility).toBe('faction_not_requested');
        const { dispatcher_decision_details: _details, ...onBase } = on as any;
        expect(onBase).toEqual(off);
        expect(onState).toEqual(offState);
    });

    it('keeps generated merge output distinct from retained snapshot truth', () => {
        const edges = [{ a: 'F1', b: 'T1' }, { a: 'T1', b: 'E1' }] as any;
        const offState = makeCounterattackCapState();
        offState.military.formations = { rs_counter_a: offState.military.formations!.rs_counter_a! };
        offState.military.brigade_attack_orders = { rs_counter_a: 'MANUAL' as any };
        setTopics(undefined);
        const off = generateAllBotOrdersOsid(offState, ['RS'], {
            edges,
            reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        }, { mergeWithExistingOrders: true });

        const state = makeCounterattackCapState();
        state.military.formations = { rs_counter_a: state.military.formations!.rs_counter_a! };
        state.military.brigade_attack_orders = { rs_counter_a: 'MANUAL' as any };
        setTopics('dispatcher_decision');
        const diagnostics = generateAllBotOrdersOsid(state, ['RS'], {
            edges,
            reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        }, { mergeWithExistingOrders: true });

        const snapshot = createBotOrderDiagnosticsSnapshot(state, diagnostics);
        const detail = snapshot.dispatcher_decision_details![0]!;

        expect(detail).toEqual(expect.objectContaining({
            formation_id: 'rs_counter_a', scope: 'merge', eligibility: 'eligible',
            caller_filter: 'not_present',
            pre_cap_output: expect.objectContaining({ attack_target_osid: 'T1' }),
            final_generated_output: expect.objectContaining({ attack_target_osid: 'T1' }),
            snapshot_output: expect.objectContaining({ attack_target_osid: 'MANUAL' }),
        }));
        const { dispatcher_decision_details: _details, ...onBase } = diagnostics;
        expect(onBase).toEqual(off);
        expect(state).toEqual(offState);
    });

    it('separates real counterattack pre-cap output from final generated and snapshot truth', () => {
        const edges = [
            { a: 'F1', b: 'T1' }, { a: 'T1', b: 'E1' },
            { a: 'F2', b: 'T2' }, { a: 'T2', b: 'E2' },
        ] as any;
        const offState = makeCounterattackCapState();
        setTopics(undefined);
        const off = generateAllBotOrdersOsid(offState, ['RS'], {
            edges, reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        });

        const onState = makeCounterattackCapState();
        setTopics('dispatcher_decision');
        const on = generateAllBotOrdersOsid(onState, ['RS'], {
            edges, reverseMap: new Map(), supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        });
        const snapshot = createBotOrderDiagnosticsSnapshot(onState, on);
        const details = snapshot.dispatcher_decision_details!;

        expect(details.filter((entry) => entry.pre_cap_output.attack_target_osid !== null)).toHaveLength(2);
        expect(details.filter((entry) => entry.final_generated_output.attack_target_osid !== null)).toHaveLength(1);
        expect(details.filter((entry) => entry.snapshot_output?.attack_target_osid !== null)).toHaveLength(1);
        expect(details).toContainEqual(expect.objectContaining({
            pre_cap_output: expect.objectContaining({ attack_target_osid: expect.any(String) }),
            final_generated_output: expect.objectContaining({ attack_target_osid: null }),
            snapshot_output: expect.objectContaining({ attack_target_osid: null }),
        }));
        const { dispatcher_decision_details: _details, ...onBase } = on;
        expect(onBase).toEqual(off);
        expect(onState).toEqual(offState);
    });

    it('records active-column skip and projects final snapshot truth through a real weekly JSON roundtrip', () => {
        const state = makeState();
        state.military.formations = { a_sector_march: state.military.formations!.a_sector_march! };
        state.military.brigade_movement_state = {
            a_sector_march: { status: 'in_transit', stance: 'column', destination_sids: ['B'] },
        } as any;
        setTopics('dispatcher_decision');
        const diagnostics = generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [{ a: 'A', b: 'B' }] as any, reverseMap: new Map(),
            supplyStateByOsid: {} as any, osidPopulationMap: new Map(),
        });
        const snapshot = createBotOrderDiagnosticsSnapshot(state, diagnostics);
        const row = buildWeeklyReport(state);
        attachBotOrderDiagnosticsToWeeklyReport(row, snapshot);
        const serialized = JSON.parse(stableStringify(row));

        expect(serialized.bot_order_diagnostics.dispatcher_decision_details).toEqual([
            expect.objectContaining({
                turn: 138, formation_id: 'a_sector_march', first_handler: 'active_column_skip',
                transit_status: 'in_transit', transit_stance: 'column',
                persistent_destination_osids: ['B'], snapshot_output: expect.objectContaining({ movement_destination_osid: 'in_transit' }),
            }),
        ]);
        const consumer = analyzeRows([serialized], {
            formations: ['a_sector_march'],
            expectedBoundaries: [{ formation: 'a_sector_march', turn: 138, key: 'a_sector_march:138' }],
            turnMin: 138,
            turnMax: 138,
        });
        expect(consumer).toEqual(expect.objectContaining({
            receipts_seen: 1,
            missing_requested_formations: [],
            missing_expected_boundaries: [],
            inconsistencies: [],
        }));
    });
});
