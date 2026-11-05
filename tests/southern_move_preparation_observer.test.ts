import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';
import {
    autoResolveProbe,
    resolveActiveProbe,
    tickPreparation,
} from '../src/sim/combat/operation_preparation.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import {
    resetReasonCodeTopicCacheForTests,
    SOUTHERN_MOVE_PREPARATION_PREFIX,
} from '../src/sim/combat/reason_code_debug.js';
import { serializeState } from '../src/state/serialize.js';

const TOPIC = 'southern_move_preparation';
const CORPS = 'hvo_tomislavgrad';

function setTopic(value?: string): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setTopic();
    vi.restoreAllMocks();
});

function brigade(id: string, location = 'op:test:home'): FormationState {
    return {
        id, name: id, faction: 'HRHB', corps_id: CORPS, kind: 'brigade', status: 'active',
        created_turn: 0, assignment: null, personnel: 1500, cohesion: 80, morale: 75,
        equipment_class: 'light_infantry', location_osid: location,
    } as FormationState;
}

function operation(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Operation Southern Move', type: 'sector_attack', phase: 'planning',
        started_turn: 182, phase_started_turn: 182, planning_duration: 3,
        participating_brigades: ['b1', 'b2', 'b3'], sector_id: 'own_now',
        objectives: ['op:test:objective'], supply_readiness: 0.9, momentum: 0,
        failure_count: 0, consecutive_failures_on_current: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        ...overrides,
    } as CorpsOperation;
}

function stateWith(op = operation(), turn = 183): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'southern-move-observer' },
        political: { political_controllers: { 'op:test:home': 'HRHB', 'op:test:objective': 'RS' }, control_events: [] },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: {
                [CORPS]: { ...brigade(CORPS), kind: 'corps' },
                b1: brigade('b1'), b2: brigade('b2'), b3: brigade('b3'),
            },
            corps_command: {
                [CORPS]: {
                    command_span: 5, subordinate_count: 3, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [op],
                },
            },
            corps_front_sectors: {
                own_now: {
                    sector_id: 'own_now', corps_id: CORPS, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: ['edge:front'], territory_osids: ['op:test:home'], assigned_brigade_ids: ['b1', 'b2', 'b3'],
                    reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1, density: 3, threat_ratio: 1,
                    defensive_power: 100, sector_stance: 'defend', stance_source: 'bot', sub_segments: [],
                },
                enemy_now: {
                    sector_id: 'enemy_now', corps_id: 'vrs_enemy', faction: 'RS', opposing_factions: ['HRHB'],
                    edge_ids: ['edge:front'], territory_osids: ['op:test:objective'], assigned_brigade_ids: [],
                    reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1, density: 0, threat_ratio: 1,
                    defensive_power: 100, sector_stance: 'defend', stance_source: 'bot', sub_segments: [],
                },
            },
            sector_intel: {
                old_own: [{ enemy_sector_id: 'old_enemy', enemy_faction: 'RS', enemy_corps_id: 'vrs_enemy', front_edge_count: 1,
                    strength_category: 'moderate', posture_observed: 'defensive', offensive_signs: false, confidence: 0.3,
                    turns_in_contact: 3, visible_brigade_ids: [], last_updated_turn: 180,
                    estimated_strength: 1000, own_stable_key: `${CORPS}|edge:own`, enemy_stable_key: 'vrs_enemy|edge:enemy' }],
                old_enemy: [{ enemy_sector_id: 'old_own', enemy_faction: 'HRHB', enemy_corps_id: CORPS, front_edge_count: 1,
                    strength_category: 'dense', posture_observed: 'offensive_prep', offensive_signs: false, confidence: 0.9,
                    turns_in_contact: 3, visible_brigade_ids: [], last_updated_turn: 180,
                    estimated_strength: 4000, own_stable_key: 'vrs_enemy|edge:enemy', enemy_stable_key: `${CORPS}|edge:own` }],
            },
            named_officers: {}, named_officer_data: [], opsec_sectors: [], brigade_attack_orders: {}, brigade_movement_orders: {},
        },
    } as unknown as GameState;
}

function capture(run: () => unknown): { result: unknown; rows: any[] } {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => lines.push(String(line)));
    const result = run();
    const rows = lines
        .filter((line) => line.startsWith(`${SOUTHERN_MOVE_PREPARATION_PREFIX} `))
        .map((line) => JSON.parse(line.slice(SOUTHERN_MOVE_PREPARATION_PREFIX.length + 1)));
    return { result, rows };
}

describe('Southern Move preparation stdout observer', () => {
    it('is silent by default and preserves the exact returned value and real serialized state when enabled', () => {
        const make = () => stateWith(operation({ is_pre_planned: true }));
        const offState = make();
        setTopic();
        const off = capture(() => tickPreparation(offState, offState.military.corps_command![CORPS]!.active_operations[0]!, CORPS, 'HRHB', 0.9));
        expect(off.rows).toEqual([]);

        const onState = make();
        setTopic(TOPIC);
        const on = capture(() => tickPreparation(onState, onState.military.corps_command![CORPS]!.active_operations[0]!, CORPS, 'HRHB', 0.9));
        expect(on.result).toEqual(off.result);
        expect(serializeState(onState)).toBe(serializeState(offState));
        expect(on.rows).toHaveLength(1);
        expect(on.rows[0]).toEqual(expect.objectContaining({ event: 'tick_return', return_path: 'pre_planned', turn: 183 }));
        expect(on.rows[0]).not.toHaveProperty('required_confidence');
    });

    it('includes turn 188 and excludes turn 189 without changing returned values or serialized state', () => {
        const make = (turn: number) => stateWith(operation({ is_pre_planned: true }), turn);
        const offState = make(188);
        setTopic();
        const off = capture(() => advanceSectorOffensives(offState));
        expect(off.rows).toEqual([]);

        const onState = make(188);
        setTopic(TOPIC);
        const on = capture(() => advanceSectorOffensives(onState));
        expect(on.result).toEqual(off.result);
        expect(serializeState(onState)).toBe(serializeState(offState));
        expect(on.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ event: 'caller_start', turn: 188 }),
            expect.objectContaining({ event: 'tick_return', turn: 188 }),
            expect.objectContaining({ event: 'caller_end', turn: 188 }),
        ]));

        expect(capture(() => advanceSectorOffensives(make(189))).rows).toEqual([]);
    });

    it('records only reached tick locals for pending, normal, and both anti-paralysis returns', () => {
        const cases = [
            { path: 'pending_probe', op: operation({ preparation_sub_phase: 'intel_gathering', preparation_turns_elapsed: 1, preparation_max_turns: 6,
                active_probe: { target_osid: 'op:test:objective', brigade_ids: ['b1'], started_turn: 182, resolved: false } }), supply: 0.9 },
            { path: 'normal', op: operation({ preparation_sub_phase: 'ready', preparation_turns_elapsed: 1, preparation_max_turns: 6 }), supply: 0.9 },
            { path: 'anti_paralysis_launch', op: operation({ preparation_sub_phase: 'intel_gathering', preparation_turns_elapsed: 5, preparation_max_turns: 6 }), supply: 0.9 },
            { path: 'anti_paralysis_abort', op: operation({ preparation_sub_phase: 'intel_gathering', preparation_turns_elapsed: 5, preparation_max_turns: 6 }), supply: 0.1 },
        ];
        setTopic(TOPIC);
        for (const item of cases) {
            const state = stateWith(item.op);
            const { rows } = capture(() => tickPreparation(state, item.op, CORPS, 'HRHB', item.supply));
            const row = rows.at(-1);
            expect(row.return_path).toBe(item.path);
            expect(row).toHaveProperty('initial_confidence');
            expect(row).toHaveProperty('required_confidence');
            expect(row).toHaveProperty('returned_intel_confidence');
        }
    });

    it('records actual real, reciprocal, and auto probe writes with stored stable keys, clamp, and no fabricated writes', () => {
        const op = operation({ active_probe: { target_osid: 'op:test:objective', brigade_ids: ['b1'], started_turn: 182, resolved: false } });
        const state = stateWith(op);
        setTopic(TOPIC);
        const { rows } = capture(() => resolveActiveProbe(state, op, 'HRHB', CORPS));
        const writes = rows.filter((row) => row.event === 'probe_write');
        expect(writes.map((row) => row.entrypoint)).toEqual(['real_probe', 'counter_probe']);
        expect(writes[0]).toEqual(expect.objectContaining({
            own_stable_key: `${CORPS}|edge:front`, enemy_stable_key: 'vrs_enemy|edge:front',
            record_enemy_sector_id: 'enemy_now', before: 0.15, gain: 0.35, after: 0.5, clamped: false,
        }));
        expect(writes[1]).toEqual(expect.objectContaining({
            own_stable_key: 'vrs_enemy|edge:front', enemy_stable_key: `${CORPS}|edge:front`,
            record_enemy_sector_id: 'own_now', before: 0.3, gain: 0.15, clamped: false,
        }));
        expect(writes[1].after).toBeCloseTo(0.45, 12);
        expect(state.military.sector_intel!.old_own![0]!.confidence).toBe(0.3);
        expect(state.military.sector_intel!.old_enemy![0]!.confidence).toBe(0.9);

        const autoOp = operation({ active_probe: { target_osid: 'op:test:objective', brigade_ids: ['b1'], started_turn: 182, resolved: false } });
        const autoState = stateWith(autoOp);
        const autoRows = capture(() => autoResolveProbe(autoState, autoOp, 'HRHB', CORPS)).rows;
        const autoWrites = autoRows.filter((row) => row.event === 'probe_write');
        expect(autoWrites).toHaveLength(1);
        expect(autoWrites[0]).toEqual(expect.objectContaining({
            entrypoint: 'auto_probe', own_stable_key: `${CORPS}|edge:front`,
            enemy_stable_key: 'vrs_enemy|edge:front', record_enemy_sector_id: 'enemy_now',
            before: 0.15, gain: 0.175, clamped: false,
        }));
        expect(autoWrites[0].after).toBeCloseTo(0.325, 12);
        expect(autoState.military.sector_intel!.old_own![0]!.confidence).toBe(0.3);
        expect(autoState.military.sector_intel!.old_enemy![0]!.confidence).toBe(0.9);
        expect(capture(() => autoResolveProbe(autoState, autoOp, 'HRHB', CORPS)).rows).toEqual([
            expect.objectContaining({ event: 'probe_return', entrypoint: 'auto_probe', outcome: 'already_resolved', write_count: 0 }),
        ]);
    });

    it('emits caller start/end inventories and tick-called versus not-reached without calling execution operations', () => {
        const make = () => {
            const planning = operation({ is_pre_planned: true });
            const execution = operation({ phase: 'execution', started_turn: 181 });
            const state = stateWith(planning);
            state.military.corps_command![CORPS]!.active_operations.push(execution);
            return state;
        };
        const offState = make();
        setTopic();
        const off = capture(() => advanceSectorOffensives(offState));
        expect(off.rows).toEqual([]);
        const state = make();
        setTopic(TOPIC);
        const { result, rows } = capture(() => advanceSectorOffensives(state));
        expect(result).toEqual(off.result);
        expect(serializeState(state)).toBe(serializeState(offState));
        expect(rows[0]).toEqual(expect.objectContaining({ event: 'caller_start', turn: 183 }));
        expect(rows[0].operation_inventory).toHaveLength(2);
        expect(rows[0].operation_inventory[0].operation_index).toBe(0);
        expect(rows[0].operation_inventory[1].operation_index).toBe(1);
        expect(rows.at(-1)).toEqual(expect.objectContaining({ event: 'caller_end', turn: 183 }));
        const outcomes = rows.filter((row) => row.event === 'caller_outcome');
        expect(outcomes).toEqual(expect.arrayContaining([
            expect.objectContaining({ operation_index: 0, outcome: 'tick_called' }),
            expect.objectContaining({ operation_index: 1, outcome: 'not_reached' }),
        ]));
    });

    it('reports no-credit and no-pending terminals and retains legacy positional fallback', () => {
        setTopic(TOPIC);
        const noCreditOp = operation({ active_probe: { target_osid: 'op:test:objective', brigade_ids: ['b1'], started_turn: 182, resolved: false } });
        const noCreditState = stateWith(noCreditOp);
        noCreditState.military.corps_front_sectors!.own_now!.edge_ids = ['edge:not-facing'];
        const noCreditRows = capture(() => autoResolveProbe(noCreditState, noCreditOp, 'HRHB', CORPS)).rows;
        expect(noCreditRows).toEqual([
            expect.objectContaining({ event: 'probe_return', entrypoint: 'auto_probe', outcome: 'resolved_no_credit', write_count: 0 }),
        ]);

        const legacyOp = operation({ sector_id: 'own_now', active_probe: { target_osid: 'op:test:objective', brigade_ids: ['b1'], started_turn: 182, resolved: false } });
        const legacyState = stateWith(legacyOp);
        const legacy = {
            ...legacyState.military.sector_intel!.old_own![0]!,
            enemy_sector_id: 'enemy_now',
            confidence: 0.3,
        };
        delete legacy.own_stable_key;
        delete legacy.enemy_stable_key;
        legacyState.military.sector_intel = { own_now: [legacy] };
        const legacyRows = capture(() => autoResolveProbe(legacyState, legacyOp, 'HRHB', CORPS)).rows;
        expect(legacyRows).toEqual(expect.arrayContaining([
            expect.objectContaining({
                event: 'probe_write', entrypoint: 'auto_probe', record_enemy_sector_id: 'enemy_now',
                before: 0.3, gain: 0.175,
            }),
            expect.objectContaining({ event: 'probe_return', outcome: 'resolved_with_writes', write_count: 1 }),
        ]));
        expect(legacyRows.find((row) => row.event === 'probe_write')!.after).toBeCloseTo(0.475, 12);

        const noPending = operation();
        expect(capture(() => resolveActiveProbe(stateWith(noPending), noPending, 'HRHB', CORPS)).rows).toEqual([
            expect.objectContaining({ event: 'probe_return', entrypoint: 'real_probe', outcome: 'no_pending_probe', write_count: 0 }),
        ]);
    });

    it('rejects wrong topic, name, faction, corps, and turn without stdout', () => {
        const cases: Array<[string, GameState]> = [
            ['wrong topic', stateWith()],
            ['name', stateWith(operation({ name: 'Operation Southern Move II' }))],
            ['faction', stateWith()],
            ['corps', stateWith()],
            ['turn', stateWith(operation(), 182)],
        ];
        for (const [kind, state] of cases) {
            if (kind === 'wrong topic') setTopic('mistral_tg_activation');
            else setTopic(TOPIC);
            if (kind === 'faction') state.military.formations![CORPS]!.faction = 'RS';
            if (kind === 'corps') {
                state.military.corps_command!.other = state.military.corps_command![CORPS]!;
                delete state.military.corps_command![CORPS];
            }
            const rows = capture(() => advanceSectorOffensives(state)).rows;
            if (kind === 'name' || kind === 'corps') {
                expect(rows, kind).toEqual([
                    expect.objectContaining({ event: 'caller_start', eligible_count: 0, operation_inventory: [] }),
                    expect.objectContaining({ event: 'caller_end', eligible_count: 0, operation_inventory: [] }),
                ]);
            } else {
                expect(rows, kind).toEqual([]);
            }
        }
    });
});
