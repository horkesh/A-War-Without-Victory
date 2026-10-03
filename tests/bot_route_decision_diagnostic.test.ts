import { afterEach, describe, expect, it } from 'vitest';

import { createBotOrderDiagnosticsSnapshot } from '../src/scenario/combat_causality.js';
import { attachBotOrderDiagnosticsToWeeklyReport, buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import type { GameState } from '../src/state/game_state.js';
import { stableStringify } from '../src/utils/stable_json.js';

function setReasonCodes(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => setReasonCodes(undefined));

function makeState(withRoute = true): GameState {
    const controllers: Record<string, string> = { A: 'RBiH', X: 'RS' };
    if (withRoute) {
        controllers.B = 'RBiH';
        controllers.C = 'RBiH';
    }
    return {
        meta: { turn: 138, phase: 'war', seed: '737th-shaped-route-receipt' },
        political: { political_controllers: controllers, control_events: [] },
        factions: [],
        displacement: {
            settlement_displacement: {}, municipality_displacement: {}, displacement_state: {},
        },
        military: {
            formations: {
                arbih_3rd_corps: {
                    id: 'arbih_3rd_corps', name: '3rd Corps', faction: 'RBiH', kind: 'corps',
                    status: 'active', hq_sid: 'A', personnel: 0, cohesion: 100, morale: 100,
                    experience: 0.5, posture: 'defend', equipment: {},
                },
                arbih_737th_muslim_light: {
                    id: 'arbih_737th_muslim_light', name: '737th Muslim Light', faction: 'RBiH',
                    kind: 'brigade', status: 'active', corps_id: 'arbih_3rd_corps', hq_sid: 'A',
                    location_osid: 'A', personnel: 900, cohesion: 60, morale: 60,
                    experience: 0.4, posture: 'defend', equipment: {},
                },
            },
            corps_command: {
                arbih_3rd_corps: {
                    command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [],
                    directive: {
                        assigned_front_ids: [], offensive_targets: ['X'], hold_osids: [],
                        avoid_osids: [], max_attackers_per_target: 1, reserve_fraction: 0,
                        min_attack_outcome: 'repulsed', aggression_modifier: 0,
                    },
                },
            },
            corps_front_sectors: {},
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

function generate(state: GameState, withRoute = true) {
    return generateAllBotOrdersOsid(state, ['RBiH'], {
        edges: withRoute
            ? [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'B', b: 'X' }] as any
            : [],
        reverseMap: new Map(),
        supplyStateByOsid: {} as any,
        osidPopulationMap: new Map(),
    }, {
        brigadeFilter: (formation) => formation.id === 'arbih_737th_muslim_light',
    });
}

describe('generic bot route-decision diagnostics', () => {
    it('records the chosen non-operation rule, goal and resulting pre-order destination only when enabled', () => {
        const offState = makeState();
        setReasonCodes(undefined);
        const offDiagnostics = generate(offState);
        const offSnapshot = createBotOrderDiagnosticsSnapshot(offState, offDiagnostics);

        const onState = makeState();
        setReasonCodes('route_decision');
        const onDiagnostics = generate(onState);
        const onSnapshot = createBotOrderDiagnosticsSnapshot(onState, onDiagnostics);

        expect((offDiagnostics as any).route_decision_details).toBeUndefined();
        expect((offSnapshot as any).route_decision_details).toBeUndefined();
        expect((onSnapshot as any).route_decision_details).toEqual([{
            turn: 138,
            phase: 'war',
            brigade_id: 'arbih_737th_muslim_light',
            location_osid: 'A',
            transit_status: null,
            preexisting_movement_order_destination_osid: null,
            persistent_movement_state_destination_osid: null,
            operation_name: null,
            axis_id: null,
            current_objective: null,
            rule: 'offensive_target',
            route_goal_osids: ['X'],
            outcome: 'issued',
            candidate_destination_osid: 'B',
            issued_destination_osid: 'B',
            rejection_reason: null,
        }]);
        const { route_decision_details: _onDiagnosticsReceipt, ...onBehaviorDiagnostics } = onDiagnostics;
        const { route_decision_details: _onSnapshotReceipt, ...onBehaviorSnapshot } = onSnapshot;
        expect(onBehaviorDiagnostics).toEqual(offDiagnostics);
        expect(onBehaviorSnapshot).toEqual(offSnapshot);
        expect(onState).toEqual(offState);
        expect(onState.military.brigade_movement_orders?.arbih_737th_muslim_light)
            .toEqual({ destination_sids: ['B'], owner: 'bot_discretionary' });
    });

    it('records an observable terminal no-order fallback without inventing a destination', () => {
        const state = makeState(false);
        setReasonCodes('route_decision');
        const diagnostics = generate(state, false);
        const snapshot = createBotOrderDiagnosticsSnapshot(state, diagnostics);

        expect((snapshot as any).route_decision_details).toEqual([
            expect.objectContaining({
                brigade_id: 'arbih_737th_muslim_light',
                rule: 'fallback',
                route_goal_osids: [],
                outcome: 'no_order',
                candidate_destination_osid: null,
                issued_destination_osid: null,
                rejection_reason: 'no_destination_selected',
            }),
        ]);
        expect(state.military.brigade_movement_orders).toEqual({});
    });

    it('distinguishes the turn-scoped order source from persistent movement context', () => {
        const state = makeState();
        state.military.brigade_movement_orders = {
            arbih_737th_muslim_light: { destination_sids: ['TURN_ORDER'] },
        };
        state.military.brigade_movement_state = {
            arbih_737th_muslim_light: {
                status: 'packing', stance: 'combat', destination_sids: ['PERSISTENT_DESTINATION'],
            },
        };
        setReasonCodes('route_decision');

        const snapshot = createBotOrderDiagnosticsSnapshot(state, generate(state));

        expect(snapshot.route_decision_details).toEqual([
            expect.objectContaining({
                transit_status: 'packing',
                preexisting_movement_order_destination_osid: 'TURN_ORDER',
                persistent_movement_state_destination_osid: 'PERSISTENT_DESTINATION',
            }),
        ]);
    });

    it('projects only enabled route receipts through the production weekly serialization edge', () => {
        const offState = makeState();
        setReasonCodes(undefined);
        const offSnapshot = createBotOrderDiagnosticsSnapshot(offState, generate(offState));
        const offRow = buildWeeklyReport(offState);
        attachBotOrderDiagnosticsToWeeklyReport(offRow, offSnapshot);
        expect(JSON.parse(stableStringify(offRow))).not.toHaveProperty('bot_order_diagnostics');

        const onState = makeState();
        setReasonCodes('route_decision');
        const onSnapshot = createBotOrderDiagnosticsSnapshot(onState, generate(onState));
        const onRow = buildWeeklyReport(onState);
        attachBotOrderDiagnosticsToWeeklyReport(onRow, onSnapshot);
        const serialized = JSON.parse(stableStringify(onRow));

        expect(serialized.week_index).toBe(138);
        expect(serialized.bot_order_diagnostics.movement_orders_by_brigade)
            .toEqual({ arbih_737th_muslim_light: 'B' });
        expect(serialized.bot_order_diagnostics.route_decision_details)
            .toEqual(onSnapshot.route_decision_details);
    });

    it('does not claim terminal route coverage for an active column transit skipped earlier', () => {
        const state = makeState();
        state.military.brigade_movement_state = {
            arbih_737th_muslim_light: {
                status: 'in_transit', stance: 'column', destination_sids: ['PERSISTENT_DESTINATION'],
            },
        };
        setReasonCodes('route_decision');

        const diagnostics = generate(state);
        const snapshot = createBotOrderDiagnosticsSnapshot(state, diagnostics);
        const row = buildWeeklyReport(state);
        attachBotOrderDiagnosticsToWeeklyReport(row, snapshot);

        expect(diagnostics.route_decision_details).toBeUndefined();
        expect(JSON.parse(stableStringify(row))).not.toHaveProperty('bot_order_diagnostics');
    });
});
