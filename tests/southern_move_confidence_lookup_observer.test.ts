import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CorpsOperation, FormationState, GameState, SectorIntelRecord } from '../src/state/game_state.js';
import { tickPreparation } from '../src/sim/combat/operation_preparation.js';
import {
    resetReasonCodeTopicCacheForTests,
    SOUTHERN_MOVE_CONFIDENCE_LOOKUP_PREFIX,
} from '../src/sim/combat/reason_code_debug.js';
import { serializeState } from '../src/state/serialize.js';

const TOPIC = 'southern_move_confidence_lookup';
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

function formation(id: string): FormationState {
    return {
        id, name: id, faction: 'HRHB', corps_id: CORPS, kind: id === CORPS ? 'corps' : 'brigade',
        status: 'active', created_turn: 0, assignment: null, personnel: 1500, cohesion: 80,
        morale: 75, equipment_class: 'light_infantry', location_osid: 'op:home',
    } as FormationState;
}

function operation(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Operation Southern Move', type: 'sector_attack', phase: 'planning',
        started_turn: 182, phase_started_turn: 182, planning_duration: 6,
        participating_brigades: ['b1'], sector_id: 'own_now', objectives: ['op:objective'],
        supply_readiness: 0.9, momentum: 0, failure_count: 0,
        consecutive_failures_on_current: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0, is_pre_planned: true,
        ...overrides,
    } as CorpsOperation;
}

function record(overrides: Partial<SectorIntelRecord> = {}): SectorIntelRecord {
    return {
        enemy_sector_id: 'enemy_old', enemy_faction: 'RS', enemy_corps_id: 'vrs_enemy',
        front_edge_count: 1, strength_category: 'moderate', posture_observed: 'defensive',
        offensive_signs: false, confidence: 0.4, turns_in_contact: 3,
        visible_brigade_ids: [], last_updated_turn: 182,
        own_stable_key: `${CORPS}|edge:own`, enemy_stable_key: 'vrs_enemy|edge:enemy',
        ...overrides,
    };
}

function stateWith(op = operation(), turn = 183): GameState {
    return {
        meta: { turn, phase: 'war', seed: 'confidence-observer' },
        political: {
            political_controllers: { 'op:home': 'HRHB', 'op:objective': 'RS', 'op:other': 'RS' },
            control_events: [],
        },
        factions: [],
        displacement: { settlement_displacement: {}, municipality_displacement: {}, displacement_state: {} },
        military: {
            formations: { [CORPS]: formation(CORPS), b1: formation('b1') },
            corps_command: {
                [CORPS]: {
                    command_span: 5, subordinate_count: 1, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [op],
                },
            },
            corps_front_sectors: {
                own_now: {
                    sector_id: 'own_now', corps_id: CORPS, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: ['edge:own'], territory_osids: ['op:home'], assigned_brigade_ids: ['b1'],
                    reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1, density: 1,
                    threat_ratio: 1, defensive_power: 100, sector_stance: 'defend', stance_source: 'bot',
                    sub_segments: [],
                },
                enemy_now: {
                    sector_id: 'enemy_now', corps_id: 'vrs_enemy', faction: 'RS', opposing_factions: ['HRHB'],
                    edge_ids: ['edge:enemy'], territory_osids: ['op:objective'], assigned_brigade_ids: [],
                    reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1, density: 0,
                    threat_ratio: 1, defensive_power: 100, sector_stance: 'defend', stance_source: 'bot',
                    sub_segments: [],
                },
            },
            sector_intel: { old_own: [record()] }, named_officers: {}, named_officer_data: [],
            opsec_sectors: [], brigade_attack_orders: {}, brigade_movement_orders: {},
        },
    } as unknown as GameState;
}

function capture(run: () => unknown): { result: unknown; rows: any[] } {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => lines.push(String(line)));
    const result = run();
    return {
        result,
        rows: lines
            .filter(line => line.startsWith(`${SOUTHERN_MOVE_CONFIDENCE_LOOKUP_PREFIX} `))
            .map(line => JSON.parse(line.slice(SOUTHERN_MOVE_CONFIDENCE_LOOKUP_PREFIX.length + 1))),
    };
}

function tick(state: GameState, faction: 'HRHB' | 'RS' = 'HRHB', corpsId = CORPS): unknown {
    const op = state.military.corps_command![CORPS]!.active_operations[0]!;
    return tickPreparation(state, op, corpsId, faction, 0.9, undefined, undefined, undefined, 0);
}

describe('Southern Move confidence lookup stdout observer', () => {
    it('is default-off, exactly selected, and preserves returned values and serialized state through the real tick', () => {
        const make = (overrides: Partial<CorpsOperation> = {}, turn = 183) => stateWith(operation(overrides), turn);
        const offState = make();
        setTopic();
        const off = capture(() => tick(offState));
        expect(off.rows).toEqual([]);

        const onState = make();
        setTopic(TOPIC);
        const on = capture(() => tick(onState));
        expect(on.result).toEqual(off.result);
        expect(serializeState(onState)).toBe(serializeState(offState));
        expect(on.rows).toHaveLength(1);
        expect(on.rows[0]).toEqual(expect.objectContaining({
            event: 'confidence_lookup', lookup_call: 'pre_planned', operation_index: 0,
            operation_name: 'Operation Southern Move', faction: 'HRHB', corps_id: CORPS, turn: 183,
            return_branch: 'objective_filtered_best', returned_confidence: 0.4,
        }));

        for (const candidate of [
            make({ name: 'Operation Southern Move II' }), make({}, 182), make({}, 189),
        ]) expect(capture(() => tick(candidate)).rows).toEqual([]);
        expect(capture(() => tick(make(), 'RS')).rows).toEqual([]);
        expect(capture(() => tick(make(), 'HRHB', 'other_corps')).rows).toEqual([]);
        setTopic('southern_move_preparation');
        expect(capture(() => tick(make())).rows).toEqual([]);
    });

    it('includes turn 188 and excludes turn 189 without changing returned values or serialized state', () => {
        const make = (turn: number) => stateWith(operation(), turn);
        const offState = make(188);
        setTopic();
        const off = capture(() => tick(offState));
        expect(off.rows).toEqual([]);

        const onState = make(188);
        setTopic(TOPIC);
        const on = capture(() => tick(onState));
        expect(on.result).toEqual(off.result);
        expect(serializeState(onState)).toBe(serializeState(offState));
        expect(on.rows.length).toBeGreaterThan(0);
        expect(on.rows.every((row) => row.turn === 188)).toBe(true);

        expect(capture(() => tick(make(189))).rows).toEqual([]);
    });

    it('labels initial and current reads and emits deterministic detached scalar snapshots', () => {
        const make = () => stateWith(operation({
            is_pre_planned: false, preparation_sub_phase: 'intel_gathering',
            preparation_turns_elapsed: 0, preparation_max_turns: 6,
        }));
        setTopic(TOPIC);
        const aState = make();
        const a = capture(() => tick(aState));
        const b = capture(() => tick(make()));
        expect(a.rows.map(row => row.lookup_call)).toEqual(['initial', 'current']);
        expect(a.rows).toEqual(b.rows);
        const snapshot = JSON.stringify(a.rows);
        aState.military.sector_intel!.old_own![0]!.confidence = 0.99;
        aState.military.corps_front_sectors!.enemy_now!.sector_id = 'mutated';
        expect(JSON.stringify(a.rows)).toBe(snapshot);
    });

    it('reports missing operation sector, intel collection, and selected records as distinct reached returns', () => {
        setTopic(TOPIC);
        const missingSector = stateWith(operation({ sector_id: undefined }));
        const missingIntel = stateWith();
        delete (missingIntel.military as { sector_intel?: unknown }).sector_intel;
        const missingOwnSector = stateWith();
        delete missingOwnSector.military.corps_front_sectors!.own_now;
        missingOwnSector.military.sector_intel = { own_now: [record({ own_stable_key: undefined })] };
        const missingRecords = stateWith();
        missingRecords.military.sector_intel = { unrelated: [record({ own_stable_key: 'other|edge' })] };

        expect(capture(() => tick(missingSector)).rows[0]).toEqual(expect.objectContaining({
            return_branch: 'missing_operation_sector', returned_confidence: 0,
            own_record_selection_mode: 'not_reached', candidates: [],
        }));
        expect(capture(() => tick(missingIntel)).rows[0]).toEqual(expect.objectContaining({
            return_branch: 'missing_sector_intel', returned_confidence: 0,
            own_record_selection_mode: 'not_reached', candidates: [],
        }));
        expect(capture(() => tick(missingOwnSector)).rows[0]).toEqual(expect.objectContaining({
            return_branch: 'objective_filtered_best', operation_sector_id: 'own_now',
            own_record_selection_mode: 'missing_sector_positional', own_sector_id: null,
            own_sector_stable_key: null,
        }));
        expect(capture(() => tick(missingRecords)).rows[0]).toEqual(expect.objectContaining({
            return_branch: 'no_records', returned_confidence: 0,
            own_record_selection_mode: 'unkeyed_fallback', candidates: [],
        }));
    });

    it('reports no-objective and unmapped-objective fallbacks without claiming matcher evaluation', () => {
        setTopic(TOPIC);
        const noObjectives = stateWith(operation({ objectives: [] }));
        noObjectives.military.sector_intel!.old_own!.push(record({ enemy_sector_id: 'other', confidence: 0.7 }));
        const noObjectiveRow = capture(() => tick(noObjectives)).rows[0];
        expect(noObjectiveRow).toEqual(expect.objectContaining({
            return_branch: 'no_objectives_best', returned_confidence: 0.7,
        }));
        expect(noObjectiveRow.objective_mappings).toEqual([]);
        expect(noObjectiveRow.candidates.map((candidate: any) => candidate.objective_match)).toEqual([null, null]);

        const unmapped = stateWith(operation({ objectives: ['op:unknown'] }));
        const unmappedRow = capture(() => tick(unmapped)).rows[0];
        expect(unmappedRow).toEqual(expect.objectContaining({
            return_branch: 'unmapped_objectives_best', returned_confidence: 0.4,
        }));
        expect(unmappedRow.objective_mappings).toEqual([
            { objective_osid: 'op:unknown', controller: null, sector_id: null, sector_stable_key: null },
        ]);
        expect(unmappedRow.candidates[0].objective_match).toBeNull();
    });

    it('reports stable rekey, unkeyed fallback, and edgeless positional record selection from the actual getter', () => {
        setTopic(TOPIC);
        const stable = capture(() => tick(stateWith())).rows[0];
        expect(stable).toEqual(expect.objectContaining({
            own_record_selection_mode: 'stable', own_sector_id: 'own_now',
            own_sector_stable_key: `${CORPS}|edge:own`,
        }));
        expect(stable.candidates[0]).toEqual(expect.objectContaining({ source_intel_key: 'old_own' }));

        const legacyState = stateWith();
        const legacy = record({ own_stable_key: undefined, enemy_stable_key: undefined, enemy_sector_id: 'enemy_now' });
        legacyState.military.sector_intel = { own_now: [legacy] };
        const legacyRow = capture(() => tick(legacyState)).rows[0];
        expect(legacyRow.own_record_selection_mode).toBe('unkeyed_fallback');
        expect(legacyRow.candidates[0]).toEqual(expect.objectContaining({ source_intel_key: 'own_now', objective_match: true }));

        const edgelessState = stateWith();
        edgelessState.military.corps_front_sectors!.own_now!.edge_ids = [];
        edgelessState.military.sector_intel = { own_now: [record({ own_stable_key: undefined, enemy_sector_id: 'enemy_now' })] };
        const edgelessRow = capture(() => tick(edgelessState)).rows[0];
        expect(edgelessRow).toEqual(expect.objectContaining({
            own_record_selection_mode: 'edgeless_positional', own_sector_stable_key: null,
        }));
    });

    it('reports actual rejected and mixed objective matcher verdicts without crediting positive rejected confidence', () => {
        setTopic(TOPIC);
        const rejectedState = stateWith();
        rejectedState.military.sector_intel = {
            old_own: [record({ confidence: 0.95, enemy_stable_key: 'vrs_other|edge:other' })],
        };
        const rejected = capture(() => tick(rejectedState)).rows[0];
        expect(rejected.returned_confidence).toBe(0);
        expect(rejected.candidates).toEqual([
            expect.objectContaining({ confidence: 0.95, objective_match: false }),
        ]);

        const mixedState = stateWith();
        mixedState.military.sector_intel = {
            old_own: [
                record({ confidence: 0.95, enemy_stable_key: 'vrs_other|edge:other' }),
                record({ confidence: 0.6 }),
                record({ confidence: 0.5, enemy_stable_key: undefined, enemy_sector_id: 'enemy_now' }),
            ],
        };
        const mixed = capture(() => tick(mixedState)).rows[0];
        expect(mixed.returned_confidence).toBe(0.6);
        expect(mixed.candidates.map((candidate: any) => candidate.objective_match)).toEqual([false, true, true]);
        expect(mixed.objective_mappings).toEqual([
            { objective_osid: 'op:objective', controller: 'RS', sector_id: 'enemy_now', sector_stable_key: 'vrs_enemy|edge:enemy' },
        ]);
    });
});
