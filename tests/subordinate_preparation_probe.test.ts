import { describe, expect, it } from 'vitest';
import type { CorpsOperation, FormationState, GameState, OperationAxis } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { assertOperationLifecycle } from '../src/sim/combat/assert_operation_lifecycle.js';
import { buildCorpsOperation, getOperationSlotUsage, hasAvailableSlot } from '../src/sim/combat/corps_operation_helpers.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../src/sim/combat/operation_opportunities.js';
import { SOUTHERN_MOVE_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import * as operationPreparation from '../src/sim/combat/operation_preparation.js';
import {
    autoResolveProbe,
    createLinkedPreparationProbe,
    recordLinkedPreparationProbeOrderOpportunity,
    resolveLinkedPreparationProbeBattle,
    settleLinkedPreparationProbeOnRecovery,
    tickPreparation,
} from '../src/sim/combat/operation_preparation.js';
import { advanceSectorOffensives, updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';

const CORPS = 'test_corps';
const TARGET = 'op:test:target';
const ADJACENCY = new Map<string, string[]>([
    ['op:test:approach', [TARGET]],
    [TARGET, ['op:test:approach']],
]);

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: 'HRHB',
        kind: 'brigade',
        name: id,
        status: 'active',
        personnel: 1_000,
        cohesion: 80,
        morale: 80,
        fatigue: 0,
        corps_id: CORPS,
        location_osid: 'op:test:approach',
        ...overrides,
    } as FormationState;
}

function parentOperation(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Renamed parent operation',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 10,
        phase_started_turn: 10,
        participating_brigades: ['b1', 'b2', 'b3'],
        sector_id: 'sector:test',
        objectives: [TARGET],
        planning_duration: 4,
        minimum_viable_participants: 1,
        preparation_probe_delivery: 'subordinate',
        preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 1,
        preparation_max_turns: 4,
        axes: [{
            ...axis(),
            axis_id: 'parent_axis',
            assigned_brigades: ['b1', 'b2', 'b3'],
        }],
        active_probe: {
            target_osid: TARGET,
            brigade_ids: ['b2', 'b1'],
            started_turn: 12,
            resolved: false,
        },
        ...overrides,
    };
}

function stateWithParent(parent = parentOperation()): GameState {
    return {
        schema_version: 34,
        meta: { turn: 12, phase: 'war', player_faction: 'HRHB', seed: '1' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }] as GameState['factions'],
        military: {
            formations: {
                [CORPS]: { ...brigade(CORPS), kind: 'corps', corps_id: undefined },
                b1: brigade('b1'),
                b2: brigade('b2'),
                b3: brigade('b3'),
            },
            corps_command: {
                [CORPS]: {
                    command_span: 5,
                    subordinate_count: 3,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 10,
                    stance: 'offensive',
                    active_operations: [parent],
                },
            },
            sector_intel: {
                'sector:test': [{
                    enemy_sector_id: 'sector:enemy',
                    enemy_faction: 'RS',
                    enemy_corps_id: 'enemy_corps',
                    front_edge_count: 1,
                    turns_in_contact: 1,
                    strength_category: 'unknown',
                    posture_observed: 'unknown',
                    offensive_signs: false,
                    visible_brigade_ids: [],
                    confidence: 0.2,
                    last_updated_turn: 11,
                    sources: ['passive_contact'],
                }],
            },
            corps_front_sectors: {
                'sector:test': {
                    sector_id: 'sector:test', corps_id: CORPS, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1,
                    territory_osids: ['op:test:approach'], assigned_brigade_ids: ['b1', 'b2', 'b3'],
                    reserve_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 1,
                    sector_stance: 'active_defense', stance_source: 'bot',
                },
                'sector:enemy': {
                    sector_id: 'sector:enemy', corps_id: 'enemy_corps', faction: 'RS', opposing_factions: ['HRHB'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1,
                    territory_osids: [TARGET], assigned_brigade_ids: [], reserve_brigade_ids: [],
                    density: 1, threat_ratio: 1, defensive_power: 1, sector_stance: 'defend', stance_source: 'bot',
                },
            },
            war_front_edges_osid: [{
                edge_id: 'edge:test', a: 'op:test:approach', b: TARGET,
                side_a: 'HRHB', side_b: 'RS',
            }],
        } as unknown as GameState['military'],
        political: { political_controllers: { [TARGET]: 'RS', 'op:test:approach': 'HRHB' } } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

function axis(): OperationAxis {
    return {
        axis_id: 'test_axis',
        name: 'Test axis',
        assigned_brigades: ['b1'],
        objectives: ['op:test:target'],
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    };
}

describe('subordinate preparation-probe capability admission', () => {
    it('authors subordinate delivery only on Southern Move', () => {
        expect(SOUTHERN_MOVE_95_OPPORTUNITY).toMatchObject({
            preparation_probe_delivery: 'subordinate',
        });
        expect(OPERATION_OPPORTUNITY_CATALOG
            .filter((def) => def.opportunity_id !== SOUTHERN_MOVE_95_OPPORTUNITY.opportunity_id)
            .every((def) => !Object.prototype.hasOwnProperty.call(def, 'preparation_probe_delivery')))
            .toBe(true);
    });

    it('persists an explicit capability while leaving an absent definition byte-shape absent', () => {
        const optedIn = buildCorpsOperation({
            name: 'Renamed late operation',
            staging_osid: 'op:test:approach',
            preparation_probe_delivery: 'subordinate',
        } as Parameters<typeof buildCorpsOperation>[0], [axis()], ['b1'], 77, false);
        const ordinary = buildCorpsOperation({
            name: 'Operation Southern Move',
            staging_osid: 'op:test:approach',
        }, [axis()], ['b1'], 186, false);

        expect(optedIn).toMatchObject({ preparation_probe_delivery: 'subordinate' });
        expect(Object.prototype.hasOwnProperty.call(ordinary, 'preparation_probe_delivery')).toBe(false);
    });

    it('rejects an unknown persisted capability value', () => {
        const state = {
            schema_version: 34,
            meta: { turn: 77, phase: 'war', player_faction: 'HRHB', seed: '1' },
            factions: [{ id: 'HRHB' }],
            military: {
                formations: {},
                corps_command: {
                    test_corps: {
                        active_operations: [{
                            ...buildCorpsOperation({
                                name: 'Malformed operation',
                                staging_osid: 'op:test:approach',
                            }, [axis()], ['b1'], 77, false),
                            preparation_probe_delivery: 'unknown-mode',
                        }],
                    },
                },
            },
            political: {},
            displacement: {},
        } as unknown as GameState;

        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect(result.ok ? [] : result.errors).toContain(
            "military.corps_command.test_corps.active_operations[0].preparation_probe_delivery must be 'subordinate' when present",
        );
    });

    it('exposes the linked-child lifecycle only through an explicit API', () => {
        expect(typeof (operationPreparation as Record<string, unknown>).createLinkedPreparationProbe).toBe('function');
        expect(typeof (operationPreparation as Record<string, unknown>).settleLinkedPreparationProbeOnRecovery).toBe('function');
        expect(typeof (operationPreparation as Record<string, unknown>).recordLinkedPreparationProbeOrderOpportunity).toBe('function');
        expect(typeof (operationPreparation as Record<string, unknown>).resolveLinkedPreparationProbeBattle).toBe('function');
    });
});

describe('opted-in subordinate preparation-probe lifecycle', () => {
    it('materializes from the real opted-in preparation tick without name or date checks', () => {
        const parent = parentOperation({
            name: 'Semantically opted in after a rename',
            started_turn: 2,
            phase_started_turn: 2,
            active_probe: undefined,
            preparation_turns_elapsed: 0,
        });
        const state = stateWithParent(parent);
        state.meta.turn = 7;

        const result = tickPreparation(state, parent, CORPS, 'HRHB', 0.9);
        const operations = state.military.corps_command![CORPS]!.active_operations;

        expect(result.probe_ordered).toBe(true);
        expect(operations).toHaveLength(2);
        expect(operations[1]!.preparation_probe_link).toMatchObject({
            parent_operation_name: parent.name,
            parent_started_turn: 2,
            request_started_turn: 7,
        });
        expect(parent.active_probe).toMatchObject({ resolved: false });
    });

    it('keeps the absent-capability legacy request and auto-resolution path unchanged', () => {
        const parent = parentOperation({
            preparation_probe_delivery: undefined,
            active_probe: undefined,
            preparation_turns_elapsed: 0,
        });
        delete parent.preparation_probe_delivery;
        const state = stateWithParent(parent);

        const result = tickPreparation(state, parent, CORPS, 'HRHB', 0.9);

        expect(result.probe_ordered).toBe(true);
        expect(parent.active_probe).toMatchObject({ target_osid: TARGET, resolved: false });
        expect(state.military.corps_command![CORPS]!.active_operations).toEqual([parent]);
        expect(Object.prototype.hasOwnProperty.call(parent, 'preparation_probe_delivery')).toBe(false);

        state.meta.turn += 1;
        autoResolveProbe(state, parent, 'HRHB', CORPS);
        expect(parent.active_probe).toMatchObject({ resolved: true });
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(10);
    });

    it('atomically admits a sorted child and shares only the exact parent slot', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);

        const child = createLinkedPreparationProbe(state, CORPS, parent);

        expect(child).not.toBeNull();
        expect(child!.participating_brigades).toEqual(['b1', 'b2']);
        expect(child!.preparation_probe_link).toEqual({
            parent_operation_name: parent.name,
            parent_started_turn: parent.started_turn,
            request_started_turn: 12,
            target_osid: TARGET,
            source_axes: [
                { brigade_id: 'b1', axis_id: 'parent_axis' },
                { brigade_id: 'b2', axis_id: 'parent_axis' },
            ],
        });
        expect(parent.participating_brigades).toEqual(['b3']);
        expect(parent.axes?.[0]?.assigned_brigades).toEqual(['b3']);
        expect(getOperationSlotUsage(state.military.corps_command![CORPS]!)).toBe(1);
        expect(hasAvailableSlot(state.military.corps_command![CORPS]!, 12)).toBe(false);
        expect(assertOperationLifecycle(state)).toEqual([]);
    });

    it('refuses absent capability, a violated parent floor, a missing source axis, and a cross-operation commitment without mutation', () => {
        const cases: Array<(parent: CorpsOperation, state: GameState) => void> = [
            (parent) => { delete parent.preparation_probe_delivery; },
            (parent) => { parent.minimum_viable_participants = 2; },
            (parent) => { parent.axes![0]!.assigned_brigades = ['b3']; },
            (parent, state) => {
                state.military.corps_command!.other_corps = {
                    command_span: 1, subordinate_count: 1, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive',
                    active_operations: [parentOperation({
                        name: 'Conflict', started_turn: 11, active_probe: undefined,
                        participating_brigades: ['b1'],
                        axes: [{ ...axis(), axis_id: 'conflict', assigned_brigades: ['b1'] }],
                    })],
                };
            },
        ];

        for (const arrange of cases) {
            const parent = parentOperation();
            const state = stateWithParent(parent);
            arrange(parent, state);
            const before = serializeGameState(state);
            expect(createLinkedPreparationProbe(state, CORPS, parent)).toBeNull();
            expect(serializeGameState(state)).toBe(before);
        }
    });

    it('restores exact ownership idempotently and leaves a newer request untouched', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.phase = 'execution';
        child.preparation_probe_link!.entered_execution_turn = 13;
        child.preparation_probe_link!.order_opportunity_turn = 13;
        parent.active_probe = {
            target_osid: TARGET,
            brigade_ids: ['b1', 'b2'],
            started_turn: 15,
            resolved: false,
        };

        expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('restored_real_contact');
        expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('already_restored');
        expect(parent.participating_brigades).toEqual(['b1', 'b2', 'b3']);
        expect(parent.axes?.[0]?.assigned_brigades).toEqual(['b1', 'b2', 'b3']);
        expect(parent.active_probe).toMatchObject({ started_turn: 15, resolved: false });
    });

    it('charges the deferred parent clock exactly once at each planning, execution, and recovery visit', () => {
        const parent = parentOperation({ preparation_turns_elapsed: 1, preparation_max_turns: 10 });
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        const requestIdentity = `${parent.active_probe!.started_turn}:${parent.active_probe!.target_osid}`;

        for (const [turn, phase] of [[13, 'planning'], [14, 'execution']] as const) {
            child.phase = phase;
            child.phase_started_turn = turn;
            state.meta.turn = turn;
            const before = parent.preparation_turns_elapsed;
            advanceSectorOffensives(state, null);
            expect(parent.preparation_turns_elapsed).toBe((before ?? 0) + 1);
            expect(`${parent.active_probe!.started_turn}:${parent.active_probe!.target_osid}`).toBe(requestIdentity);
            expect(parent.active_probe!.resolved).toBe(false);
        }

        child.phase = 'recovery';
        child.phase_started_turn = 15;
        child.preparation_probe_link!.restored_to_parent = true;
        parent.participating_brigades = ['b1', 'b2', 'b3'];
        parent.axes![0]!.assigned_brigades = ['b1', 'b2', 'b3'];
        state.meta.turn = 15;
        const beforeRecovery = parent.preparation_turns_elapsed;
        advanceSectorOffensives(state, null);
        expect(parent.preparation_turns_elapsed).toBe((beforeRecovery ?? 0) + 1);
        expect(`${parent.active_probe!.started_turn}:${parent.active_probe!.target_osid}`).toBe(requestIdentity);
        expect(parent.active_probe!.resolved).toBe(false);
    });

    it('credits one exact-target battle from a selected executing contributor and charges once', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.phase = 'execution';
        child.phase_started_turn = 13;
        child.preparation_probe_link!.entered_execution_turn = 13;
        state.meta.turn = 13;

        expect(recordLinkedPreparationProbeOrderOpportunity(state, 'b1', 'wrong-target')).toBe(false);
        expect(recordLinkedPreparationProbeOrderOpportunity(state, 'b1', TARGET)).toBe(true);
        expect(child.preparation_probe_link!.order_opportunity_turn).toBe(13);
        expect(resolveLinkedPreparationProbeBattle(state, CORPS, child, 'wrong-target', ['b1'], '13:wrong')).toBe(false);
        expect(resolveLinkedPreparationProbeBattle(state, CORPS, child, TARGET, ['b3'], '13:wrong-owner')).toBe(false);
        expect(parent.active_probe!.resolved).toBe(false);

        expect(resolveLinkedPreparationProbeBattle(state, CORPS, child, TARGET, ['b1'], '13:battle')).toBe(true);
        expect(parent.active_probe).toMatchObject({ resolved: true, result_confidence_gain: 0.35 });
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(15);
        expect(resolveLinkedPreparationProbeBattle(state, CORPS, child, TARGET, ['b2'], '13:battle')).toBe(false);
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(15);
    });

    it('settles no-opportunity recovery with zero credit through the canonical result owner', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.phase = 'execution';
        child.phase_started_turn = 13;
        child.preparation_probe_link!.entered_execution_turn = 13;
        state.meta.turn = 13;

        updateSectorOffensiveResults(state);

        expect(child.phase).toBe('recovery');
        expect(child.preparation_probe_link).toMatchObject({ restored_to_parent: true });
        expect(child.preparation_probe_link!.order_opportunity_turn).toBeUndefined();
        expect(parent.participating_brigades).toEqual(['b1', 'b2', 'b3']);
        expect(parent.active_probe).toMatchObject({ resolved: true, result_confidence_gain: 0 });
        expect(state.military.sector_intel!['sector:test']![0]!.confidence).toBe(0.2);
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(10);
    });

    it('uses the existing partial auto-resolution only after a genuine winning order opportunity', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.phase = 'execution';
        child.preparation_probe_link!.entered_execution_turn = 13;
        state.meta.turn = 13;
        expect(recordLinkedPreparationProbeOrderOpportunity(state, 'b1', TARGET)).toBe(true);

        expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('restored_no_contact');
        expect(parent.active_probe).toMatchObject({ resolved: true, result_confidence_gain: 0.175 });
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(10);
    });

    it('uses ordinary one-turn planning, winning-order generation, and battle resolution end to end', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
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
            const formation = state.military.formations![brigadeId]!;
            (formation as FormationState & { equipment: Record<string, number> }).equipment = {
                infantry: 1_000, tanks: 10, artillery: 5, air_defense: 0,
            };
            formation.posture = 'attack';
        }

        state.meta.turn = 13;
        advanceSectorOffensives(state, null, undefined, ADJACENCY);
        expect(child.phase).toBe('execution');
        expect(child.preparation_probe_link).toMatchObject({ entered_execution_turn: 13 });
        expect(parent.phase).toBe('planning');
        expect(parent.active_probe?.resolved).toBe(false);

        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges: [{ a: 'op:test:approach', b: TARGET }] as never,
            adjacency: ADJACENCY,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        });
        expect(Object.values(state.military.brigade_attack_orders ?? {})).toContain(TARGET);
        expect(child.preparation_probe_link).toMatchObject({ order_opportunity_turn: 13 });

        const exhaustionBefore = state.military.corps_command![CORPS]!.corps_exhaustion;
        const report = resolveAttackOrdersOsid(
            state,
            [] as never,
            new Map(),
            undefined,
            undefined,
            undefined,
            undefined,
            ADJACENCY,
        );
        expect(report.battles.some((battle) => battle.target_osid === TARGET)).toBe(true);
        expect(parent.active_probe).toMatchObject({ resolved: true });
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(exhaustionBefore + 5);
    });

    it('does not credit a generated same-target order that loses the authoritative merge', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
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
            const formation = state.military.formations![brigadeId]!;
            (formation as FormationState & { equipment: Record<string, number> }).equipment = {
                infantry: 1_000, tanks: 10, artillery: 5, air_defense: 0,
            };
            formation.posture = 'attack';
        }

        state.meta.turn = 13;
        advanceSectorOffensives(state, null, undefined, ADJACENCY);
        expect(child.phase).toBe('execution');
        state.military.brigade_attack_orders = { b1: TARGET, b2: TARGET };

        generateAllBotOrdersOsid(state, ['HRHB'], {
            edges: [{ a: 'op:test:approach', b: TARGET }] as never,
            adjacency: ADJACENCY,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        }, { mergeWithExistingOrders: true });

        expect(state.military.brigade_attack_orders).toMatchObject({ b1: TARGET, b2: TARGET });
        expect(child.preparation_probe_link!.order_opportunity_turn).toBeUndefined();
        const exhaustionBeforeRecovery = state.military.corps_command![CORPS]!.corps_exhaustion;
        expect(settleLinkedPreparationProbeOnRecovery(state, CORPS, child)).toBe('restored_no_opportunity');
        expect(parent.active_probe).toMatchObject({ resolved: true, result_confidence_gain: 0 });
        expect(state.military.sector_intel!['sector:test']![0]!.confidence).toBe(0.2);
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(exhaustionBeforeRecovery);
    });

    it('round-trips the optional capability and link while legacy shape remains absent', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const legacy = parentOperation({ preparation_probe_delivery: undefined });
        delete legacy.preparation_probe_delivery;
        const legacyState = stateWithParent(legacy);
        const legacyBytes = serializeGameState(legacyState);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        const serialized = serializeGameState(state);
        const parsed = JSON.parse(serialized) as GameState;

        expect(validateGameStateShape(parsed)).toEqual({ ok: true });
        expect(serializeGameState(parsed)).toBe(serialized);
        expect(parsed.military.corps_command![CORPS]!.active_operations[1]!.preparation_probe_link)
            .toEqual(child.preparation_probe_link);
        expect(legacyBytes).not.toContain('preparation_probe_delivery');
        expect(legacyBytes).not.toContain('preparation_probe_link');
    });

    it('rejects a forged persisted child link whose source ownership does not match its participants', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.preparation_probe_link!.source_axes = [{ brigade_id: 'b1', axis_id: 'parent_axis' }];

        const result = validateGameStateShape(state);

        expect(result.ok).toBe(false);
        expect(result.ok ? [] : result.errors).toContain(
            `military.corps_command.${CORPS}.active_operations[1].preparation_probe_link.source_axes brigade ids must equal the child participants`,
        );
    });

    it('archives a completed child without a second exhaustion charge or return march', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;
        child.phase = 'recovery';
        child.phase_started_turn = 12;
        child.recovery_reason = 'probe_complete';
        child.preparation_probe_link!.restored_to_parent = true;
        parent.participating_brigades = ['b1', 'b2', 'b3'];
        parent.axes![0]!.assigned_brigades = ['b1', 'b2', 'b3'];
        state.meta.turn = 14;

        advanceSectorOffensives(state, null);

        expect(state.military.corps_command![CORPS]!.active_operations).toEqual([parent]);
        expect(state.military.corps_command![CORPS]!.corps_exhaustion).toBe(9);
        expect(state.operation_history).toHaveLength(1);
        expect(state.operation_history![0]).toMatchObject({
            operation_id: `${CORPS}:${child.name}:t${child.started_turn}`,
            type: 'probe',
            total_attacks: 0,
            preparation_probe_parent_operation_id: `${CORPS}:${parent.name}:t${parent.started_turn}`,
        });
        expect(state.military.brigade_movement_orders).toBeUndefined();
    });
});
