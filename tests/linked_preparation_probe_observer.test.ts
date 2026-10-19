import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CorpsOperation, FormationState, GameState, OperationAxis } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { advanceSectorOffensives, updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    createLinkedPreparationProbe,
    recordLinkedPreparationProbeOrderOpportunity,
    resolveLinkedPreparationProbeBattle,
    settleLinkedPreparationProbeOnRecovery,
} from '../src/sim/combat/operation_preparation.js';
import {
    resetReasonCodeTopicCacheForTests,
    SOUTHERN_MOVE_PREPARATION_PREFIX,
} from '../src/sim/combat/reason_code_debug.js';

const CORPS = 'hvo_tomislavgrad';
const TARGET = 'op:test:target';
const APPROACH = 'op:test:approach';
const ADJACENCY = new Map<string, string[]>([[APPROACH, [TARGET]], [TARGET, [APPROACH]]]);

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'HRHB', kind: 'brigade', name: id, status: 'active', personnel: 1_000,
        cohesion: 80, morale: 80, fatigue: 0, corps_id: CORPS, location_osid: APPROACH,
        posture: 'attack', ...overrides,
    } as FormationState;
}

function axis(): OperationAxis {
    return {
        axis_id: 'parent_axis', name: 'Parent axis', assigned_brigades: ['b1', 'b2', 'b3'],
        objectives: [TARGET], current_objective_index: 0, status: 'executing', failure_count: 0,
        consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
    };
}

function fixture(overrides: Partial<CorpsOperation> = {}): { state: GameState; parent: CorpsOperation } {
    const parent: CorpsOperation = {
        name: 'Operation Southern Move', type: 'sector_attack', phase: 'planning', started_turn: 182,
        phase_started_turn: 182, participating_brigades: ['b1', 'b2', 'b3'], sector_id: 'sector:test',
        objectives: [TARGET], planning_duration: 4, minimum_viable_participants: 1,
        preparation_probe_delivery: 'subordinate', preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 1, preparation_max_turns: 4, axes: [axis()],
        active_probe: { target_osid: TARGET, brigade_ids: ['b2', 'b1'], started_turn: 183, resolved: false },
        ...overrides,
    };
    const state = {
        schema_version: 34,
        meta: { turn: 183, phase: 'war', player_faction: 'HRHB', seed: 'observer' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }],
        military: {
            formations: {
                [CORPS]: { ...brigade(CORPS), kind: 'corps', corps_id: undefined },
                b1: brigade('b1'), b2: brigade('b2'), b3: brigade('b3'),
            },
            corps_command: {
                [CORPS]: { command_span: 5, subordinate_count: 3, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 10, stance: 'offensive', active_operations: [parent] },
            },
            sector_intel: {
                'sector:test': [{ enemy_sector_id: 'sector:enemy', enemy_faction: 'RS', enemy_corps_id: 'enemy_corps',
                    front_edge_count: 1, turns_in_contact: 1, strength_category: 'unknown', posture_observed: 'unknown',
                    offensive_signs: false, visible_brigade_ids: [], confidence: 0.2, last_updated_turn: 182,
                    sources: ['passive_contact'] }],
            },
            corps_front_sectors: {
                'sector:test': { sector_id: 'sector:test', corps_id: CORPS, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1, territory_osids: [APPROACH],
                    assigned_brigade_ids: ['b1', 'b2', 'b3'], reserve_brigade_ids: [], density: 1,
                    threat_ratio: 1, defensive_power: 1, sector_stance: 'active_defense', stance_source: 'bot' },
                'sector:enemy': { sector_id: 'sector:enemy', corps_id: 'enemy_corps', faction: 'RS', opposing_factions: ['HRHB'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1, territory_osids: [TARGET],
                    assigned_brigade_ids: [], reserve_brigade_ids: [], density: 1, threat_ratio: 1,
                    defensive_power: 1, sector_stance: 'defend', stance_source: 'bot' },
            },
            war_front_edges_osid: [{ edge_id: 'edge:test', a: APPROACH, b: TARGET, side_a: 'HRHB', side_b: 'RS' }],
        },
        political: { political_controllers: { [APPROACH]: 'HRHB', [TARGET]: 'RS' } },
        displacement: {},
    } as unknown as GameState;
    return { state, parent };
}

function observerRows(logs: string[]): Array<Record<string, unknown>> {
    return logs.filter((line) => line.startsWith(`${SOUTHERN_MOVE_PREPARATION_PREFIX} `))
        .map((line) => JSON.parse(line.slice(SOUTHERN_MOVE_PREPARATION_PREFIX.length + 1)) as Record<string, unknown>);
}

const LINKED_EVENTS = new Set([
    'linked_probe_created', 'linked_probe_execution', 'linked_probe_order_opportunity',
    'probe_return', 'linked_probe_recovery',
]);

function linkedRows(logs: string[]): Array<Record<string, unknown>> {
    return observerRows(logs).filter((row) => LINKED_EVENTS.has(String(row.event))
        && (row.event !== 'probe_return' || row.linked_probe_receipt !== undefined));
}

function withObserver(enabled: boolean, run: (logs: string[]) => void): void {
    const previous = process.env.AWWV_DEBUG_REASON_CODES;
    if (enabled) process.env.AWWV_DEBUG_REASON_CODES = 'southern_move_preparation';
    else delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((line?: unknown) => logs.push(String(line)));
    try { run(logs); } finally {
        spy.mockRestore();
        if (previous === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
        else process.env.AWWV_DEBUG_REASON_CODES = previous;
        resetReasonCodeTopicCacheForTests();
    }
}

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
});

describe('linked preparation-probe stdout observer', () => {
    it('records the real creation, execution, winning order, contact, and recovery lifecycle once', () => {
        withObserver(true, (logs) => {
            const { state, parent } = fixture();
            const child = createLinkedPreparationProbe(state, CORPS, parent)!;
            state.military.formations!.enemy_corps = {
                ...brigade('enemy_corps'), faction: 'RS', kind: 'corps', corps_id: undefined,
            };
            state.military.formations!.enemy_brigade = {
                ...brigade('enemy_brigade'), faction: 'RS', corps_id: 'enemy_corps',
                location_osid: TARGET, personnel: 400, cohesion: 50, morale: 50, posture: 'defend',
            };
            state.military.corps_front_sectors!['sector:enemy']!.assigned_brigade_ids = ['enemy_brigade'];
            for (const brigadeId of ['b1', 'b2'] as const) {
                (state.military.formations![brigadeId] as FormationState & { equipment: Record<string, number> }).equipment = {
                    infantry: 1_000, tanks: 10, artillery: 5, air_defense: 0,
                };
            }
            state.meta.turn = 184;
            advanceSectorOffensives(state, null, undefined, ADJACENCY);
            expect(child.phase).toBe('execution');
            generateAllBotOrdersOsid(state, ['HRHB'], { edges: [{ a: APPROACH, b: TARGET }] as never,
                adjacency: ADJACENCY, reverseMap: new Map(), supplyStateByOsid: {} as never,
                osidPopulationMap: new Map() });
            const report = resolveAttackOrdersOsid(state, [] as never, new Map(), undefined, undefined,
                undefined, undefined, ADJACENCY);
            const battle = report.battles.find((row) => row.target_osid === TARGET)!;
            expect(battle).toBeDefined();
            updateSectorOffensiveResults(state);
            expect(child.phase).toBe('recovery');
            expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('already_restored');

            const rows = linkedRows(logs);
            expect(rows.map((row) => row.event)).toEqual([
                'linked_probe_created', 'linked_probe_execution', 'linked_probe_order_opportunity',
                'probe_return', 'linked_probe_recovery',
            ]);
            expect(rows.every((row) => row.operation_name === parent.name && row.corps_id === CORPS)).toBe(true);
            expect(rows[0]).toMatchObject({ parent_operation_started_turn: 182, child_operation_name: child.name,
                child_operation_started_turn: 183, child_axis_id: child.axes![0]!.axis_id,
                brigade_ids: ['b1', 'b2'], target_osid: TARGET });
            expect(rows[2]).toMatchObject({ brigade_ids: [expect.any(String)], order_opportunity_turn: 184 });
            expect(rows[3]).toMatchObject({ entrypoint: 'real_probe', linked_probe_receipt: {
                child_operation_name: child.name, brigade_ids: ['b1', 'b2'], battle_id: battle.battle_id, target_osid: TARGET,
            } });
            expect(rows[4]).toMatchObject({ outcome: 'restored_real_contact', order_opportunity_turn: 184 });
        });
    });

    it('is byte-neutral when disabled and emits no rows outside the persisted parent selector', () => {
        const run = (enabled: boolean, parentOverrides: Partial<CorpsOperation> = {}) => {
            let bytes = Buffer.alloc(0); let rowCount = 0;
            withObserver(enabled, (logs) => {
                const { state, parent } = fixture(parentOverrides);
                const child = createLinkedPreparationProbe(state, CORPS, parent)!;
                state.meta.turn = 184;
                advanceSectorOffensives(state, null, undefined, ADJACENCY);
                recordLinkedPreparationProbeOrderOpportunity(state, 'b1', TARGET);
                resolveLinkedPreparationProbeBattle(state, CORPS, child, TARGET, ['b1'], '184:battle');
                settleLinkedPreparationProbeOnRecovery(state, CORPS, child);
                bytes = Buffer.from(serializeGameState(state));
                rowCount = linkedRows(logs).length;
            });
            return { bytes, rowCount };
        };
        const off = run(false);
        const on = run(true);
        expect(off.bytes.equals(on.bytes)).toBe(true);
        expect(off.rowCount).toBe(0);
        expect(on.rowCount).toBe(5);
        expect(run(true, { name: 'Preparation Probe: Operation Southern Move' }).rowCount).toBe(0);
        withObserver(true, (logs) => {
            const { state, parent } = fixture();
            state.meta.turn = 182;
            createLinkedPreparationProbe(state, CORPS, parent);
            expect(linkedRows(logs)).toEqual([]);
        });
        withObserver(true, (logs) => {
            const { state, parent } = fixture();
            state.military.formations![CORPS]!.faction = 'RS';
            createLinkedPreparationProbe(state, CORPS, parent);
            expect(linkedRows(logs)).toEqual([]);
        });
        withObserver(true, (logs) => {
            const { state, parent } = fixture();
            state.military.formations!.other_corps = { ...state.military.formations![CORPS]!, id: 'other_corps' };
            state.military.corps_command!.other_corps = state.military.corps_command![CORPS]!;
            delete state.military.corps_command![CORPS];
            createLinkedPreparationProbe(state, 'other_corps', parent);
            expect(linkedRows(logs)).toEqual([]);
        });
    });

    it('distinguishes a winning same-target merge from a losing merge and never fabricates contact', () => {
        withObserver(true, (winningLogs) => {
            const { state, parent } = fixture();
            const child = createLinkedPreparationProbe(state, CORPS, parent)!;
            state.meta.turn = 184;
            advanceSectorOffensives(state, null, undefined, ADJACENCY);
            expect(recordLinkedPreparationProbeOrderOpportunity(state, 'b1', TARGET)).toBe(true);
            expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('restored_no_contact');
            const rows = linkedRows(winningLogs);
            expect(rows.filter((row) => row.event === 'linked_probe_order_opportunity')).toHaveLength(1);
            expect(rows.filter((row) => row.event === 'probe_return')).toEqual([
                expect.objectContaining({ entrypoint: 'auto_probe', linked_probe_receipt: expect.objectContaining({
                    terminal_reason: expect.any(String),
                }) }),
            ]);
            expect(rows.some((row) => (row.linked_probe_receipt as Record<string, unknown> | undefined)?.battle_id)).toBe(false);
        });

        withObserver(true, (losingLogs) => {
            const { state, parent } = fixture();
            const child = createLinkedPreparationProbe(state, CORPS, parent)!;
            state.meta.turn = 184;
            advanceSectorOffensives(state, null, undefined, ADJACENCY);
            state.military.brigade_attack_orders = { b1: TARGET, b2: TARGET };
            generateAllBotOrdersOsid(state, ['HRHB'], { edges: [{ a: APPROACH, b: TARGET }] as never,
                adjacency: ADJACENCY, reverseMap: new Map(), supplyStateByOsid: {} as never,
                osidPopulationMap: new Map() }, { mergeWithExistingOrders: true });
            expect(child.preparation_probe_link!.order_opportunity_turn).toBeUndefined();
            expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('restored_no_opportunity');
            const rows = linkedRows(losingLogs);
            expect(rows.some((row) => row.event === 'linked_probe_order_opportunity')).toBe(false);
            expect(rows.some((row) => row.event === 'probe_return')).toBe(false);
            expect(rows.at(-1)).toMatchObject({ event: 'linked_probe_recovery', outcome: 'restored_no_opportunity',
                order_opportunity_turn: null });
        });
    });

    it('does not invent a terminal receipt after the exact parent is deleted', () => {
        withObserver(true, (logs) => {
            const { state, parent } = fixture();
            const child = createLinkedPreparationProbe(state, CORPS, parent)!;
            state.military.corps_command![CORPS]!.active_operations = [child];
            expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('parent_missing');
            expect(linkedRows(logs).map((row) => row.event)).toEqual(['linked_probe_created']);
        });
    });
});
