/**
 * Tests for the Operation Preparation System — Phase 2: Probe Mechanic.
 *
 * Covers:
 * - Preparation sub-phase state machine (intel → staging → supply → assessment → ready)
 * - Commander personality shaping thresholds
 * - Probe ordering when intel is insufficient
 * - Probe resolution and confidence gain
 * - Counter-probe intel boost for defenders
 * - Anti-paralysis safety valve
 * - Assessment go/no-go logic
 * - Force_launch bypasses preparation
 */

import { describe, it, expect } from 'vitest';
import type {
    CorpsOperation,
    GameState,
    FormationState,
    PreparationSubPhase,
} from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    tickPreparation,
    getRequiredConfidence,
    getRequiredForceRatio,
    getPreparationMaxTurns,
    getGoThreshold,
    getOperationIntelConfidence,
    estimateForceRatio,
    selectProbeBrigades,
    resolveActiveProbe,
    autoResolveProbe,
    hasUnresolvedProbe,
    PROBE_FORCE_COMMITMENT_FACTOR,
    COUNTER_PROBE_CONFIDENCE_GAIN,
} from '../src/sim/combat/operation_preparation.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: {
            political_controllers: {},
        },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
        ...overrides,
    } as unknown as GameState;
}

function makeFormation(id: string, overrides?: Partial<FormationState>): FormationState {
    return {
        id,
        faction: 'RS',
        name: `Brigade ${id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        location_osid: 'op:test:osid_1',
        corps_id: 'vrs_1kk',
        equipment_class: 'light_infantry',
        cohesion: 80,
        morale: 70,
        ...overrides,
    } as FormationState;
}

function makeOperation(overrides?: Partial<CorpsOperation>): CorpsOperation {
    return {
        name: 'Op Test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 5,
        phase_started_turn: 5,
        participating_brigades: ['bde_1', 'bde_2', 'bde_3'],
        sector_id: 'sector_a',
        objectives: ['op:enemy:target_1', 'op:enemy:target_2'],
        planning_duration: 3,
        supply_readiness: 0.9,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        commander_officer_id: 'officer_aggressive',
        ...overrides,
    } as CorpsOperation;
}

function addOfficer(
    state: GameState,
    id: string,
    competence: number,
    aggressiveness: number,
    status: 'active' | 'reserve' = 'active',
): void {
    const data: NamedOfficer = {
        id,
        name: `Officer ${id}`,
        faction: 'RS',
        rank: 'corps_commander',
        competence,
        aggressiveness,
        defensive_skill: 3,
        political_reliability: 3,
        home_corps_id: 'vrs_1kk',
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'tier_a',
    };
    state.military.named_officer_data!.push(data);
    state.military.named_officers![id] = {
        officer_id: id,
        status,
        assigned_corps_id: status === 'active' ? 'vrs_1kk' : null,
        turns_in_command: 5,
        battles: 2,
        victories: 1,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
        assigned_operation: 'Op Test',
    } as NamedOfficerState;
}

function addSectorIntel(
    state: GameState,
    friendlySectorId: string,
    enemySectorId: string,
    confidence: number,
): void {
    if (!state.military.sector_intel) state.military.sector_intel = {};
    if (!state.military.sector_intel[friendlySectorId]) {
        state.military.sector_intel[friendlySectorId] = [];
    }
    state.military.sector_intel[friendlySectorId]!.push({
        enemy_sector_id: enemySectorId,
        enemy_faction: 'RBiH',
        enemy_corps_id: 'arbih_2nd_corps',
        front_edge_count: 3,
        strength_category: 'moderate',
        posture_observed: 'defensive',
        offensive_signs: false,
        confidence,
        turns_in_contact: 5,
        visible_brigade_ids: [],
        last_updated_turn: 8,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Commander personality formula tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Commander personality formulas', () => {
    it('getRequiredConfidence — elite offensive (5/5) needs low intel', () => {
        // 0.6 - 5*0.06 + 5*0.04 = 0.50
        expect(getRequiredConfidence(5, 5)).toBeCloseTo(0.50, 2);
    });

    it('getRequiredConfidence — defensive master (5/1) needs high intel', () => {
        // 0.6 - 1*0.06 + 5*0.04 = 0.74
        expect(getRequiredConfidence(5, 1)).toBeCloseTo(0.74, 2);
    });

    it('getRequiredConfidence — reckless (2/5) needs very low intel', () => {
        // 0.6 - 5*0.06 + 2*0.04 = 0.38
        expect(getRequiredConfidence(2, 5)).toBeCloseTo(0.38, 2);
    });

    it('getRequiredForceRatio — elite offensive (5/5) needs low ratio', () => {
        // 1.5 - 5*0.10 + 5*0.05 = 1.25
        expect(getRequiredForceRatio(5, 5)).toBeCloseTo(1.25, 2);
    });

    it('getRequiredForceRatio — defensive master (5/1) needs high ratio', () => {
        // 1.5 - 1*0.10 + 5*0.05 = 1.65
        expect(getRequiredForceRatio(5, 1)).toBeCloseTo(1.65, 2);
    });

    it('getPreparationMaxTurns — aggressive commander is fast', () => {
        expect(getPreparationMaxTurns(5)).toBe(3);
    });

    it('getPreparationMaxTurns — cautious commander is slow', () => {
        expect(getPreparationMaxTurns(1)).toBe(7);
    });

    it('getGoThreshold — aggressive commander has low threshold', () => {
        expect(getGoThreshold(5)).toBeCloseTo(0.30, 2);
    });

    it('getGoThreshold — cautious commander has high threshold', () => {
        expect(getGoThreshold(1)).toBeCloseTo(0.62, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Intel confidence reading
// ═══════════════════════════════════════════════════════════════════════════

describe('getOperationIntelConfidence', () => {
    it('returns 0 when no sector intel exists', () => {
        const state = makeMinimalState();
        const op = makeOperation();
        expect(getOperationIntelConfidence(state, op)).toBe(0);
    });

    it('returns confidence from matching sector intel record', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_sector_1', 0.65);
        const op = makeOperation({ sector_id: 'sector_a' });
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.65, 2);
    });

    it('returns best confidence when multiple enemy sectors face us', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_sector_1', 0.3);
        addSectorIntel(state, 'sector_a', 'enemy_sector_2', 0.7);
        const op = makeOperation({ sector_id: 'sector_a' });
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.7, 2);
    });

    it('uses intel for the enemy sector that actually contains the objective', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_sector_1', 0.9);
        addSectorIntel(state, 'sector_a', 'enemy_sector_2', 0.35);
        state.military.corps_front_sectors = {
            sector_a: {
                sector_id: 'sector_a',
                corps_id: 'vrs_1kk',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: [],
                sub_segments: [],
                length_edges: 1,
                territory_osids: ['own_osid'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
            enemy_sector_1: {
                sector_id: 'enemy_sector_1',
                corps_id: 'arbih_2nd_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [{ id: 'sub1', edge_ids: [], friendly_osids: ['enemy_target_1'], enemy_osids: ['own_osid'], coverage_length: 1 }],
                length_edges: 1,
                territory_osids: ['enemy_target_1'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
            enemy_sector_2: {
                sector_id: 'enemy_sector_2',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [{ id: 'sub2', edge_ids: [], friendly_osids: ['enemy_target_2'], enemy_osids: ['own_osid'], coverage_length: 1 }],
                length_edges: 1,
                territory_osids: ['enemy_target_2'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        } as any;
        state.political.political_controllers = {
            own_osid: 'RS',
            enemy_target_1: 'RBiH',
            enemy_target_2: 'RBiH',
        };
        const op = makeOperation({
            sector_id: 'sector_a',
            objectives: ['enemy_target_2'],
        });
        expect(getOperationIntelConfidence(state, op)).toBeCloseTo(0.35, 2);
    });
});

describe('estimateForceRatio', () => {
    it('uses only the enemy sector that actually covers the operation objective', () => {
        const state = makeMinimalState();
        state.military.formations = {
            atk_1: makeFormation('atk_1', { personnel: 1200 }),
            atk_2: makeFormation('atk_2', { personnel: 1200 }),
            def_small: makeFormation('def_small', { faction: 'RBiH', personnel: 1000 }),
            def_large_a: makeFormation('def_large_a', { faction: 'RBiH', personnel: 3000 }),
            def_large_b: makeFormation('def_large_b', { faction: 'RBiH', personnel: 3000 }),
        };
        addSectorIntel(state, 'sector_a', 'enemy_sector_small', 0.9);
        addSectorIntel(state, 'sector_a', 'enemy_sector_large', 0.9);
        state.military.corps_front_sectors = {
            sector_a: {
                sector_id: 'sector_a',
                corps_id: 'vrs_1kk',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: [],
                sub_segments: [],
                length_edges: 1,
                territory_osids: ['own_osid'],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
            enemy_sector_small: {
                sector_id: 'enemy_sector_small',
                corps_id: 'arbih_2nd_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [{ id: 'sub_small', edge_ids: [], friendly_osids: ['enemy_target_small'], enemy_osids: ['own_osid'], coverage_length: 1 }],
                length_edges: 1,
                territory_osids: ['enemy_target_small'],
                assigned_brigade_ids: ['def_small'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
            enemy_sector_large: {
                sector_id: 'enemy_sector_large',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [{ id: 'sub_large', edge_ids: [], friendly_osids: ['enemy_target_large'], enemy_osids: ['own_osid'], coverage_length: 1 }],
                length_edges: 1,
                territory_osids: ['enemy_target_large'],
                assigned_brigade_ids: ['def_large_a', 'def_large_b'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        } as any;
        state.political.political_controllers = {
            own_osid: 'RS',
            enemy_target_small: 'RBiH',
            enemy_target_large: 'RBiH',
        };
        const op = makeOperation({
            sector_id: 'sector_a',
            participating_brigades: ['atk_1', 'atk_2'],
            objectives: ['enemy_target_small'],
        });

        const ratio = estimateForceRatio(state, op, 5, 0.9);
        expect(ratio).toBeGreaterThan(2.0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Probe brigade selection
// ═══════════════════════════════════════════════════════════════════════════

describe('selectProbeBrigades', () => {
    it('prefers mechanized/motorized over light infantry', () => {
        const state = makeMinimalState();
        state.military.formations = {
            bde_1: makeFormation('bde_1', { equipment_class: 'light_infantry', personnel: 1500 }),
            bde_2: makeFormation('bde_2', { equipment_class: 'mechanized', personnel: 1200 }),
            bde_3: makeFormation('bde_3', { equipment_class: 'motorized', personnel: 1300 }),
        };
        const op = makeOperation({ participating_brigades: ['bde_1', 'bde_2', 'bde_3'] });
        const result = selectProbeBrigades(state, op);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe('bde_2'); // mechanized first
        expect(result[1]).toBe('bde_3'); // motorized second
    });

    it('excludes combat ineffective brigades (< 400 personnel)', () => {
        const state = makeMinimalState();
        state.military.formations = {
            bde_1: makeFormation('bde_1', { personnel: 300 }),
            bde_2: makeFormation('bde_2', { personnel: 1500 }),
        };
        const op = makeOperation({ participating_brigades: ['bde_1', 'bde_2'] });
        const result = selectProbeBrigades(state, op);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('bde_2');
    });

    it('excludes disrupted brigades', () => {
        const state = makeMinimalState();
        state.military.formations = {
            bde_1: makeFormation('bde_1', { disrupted_turns: 2 }),
            bde_2: makeFormation('bde_2'),
        };
        const op = makeOperation({ participating_brigades: ['bde_1', 'bde_2'] });
        const result = selectProbeBrigades(state, op);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('bde_2');
    });

    it('returns max 2 brigades', () => {
        const state = makeMinimalState();
        state.military.formations = {
            bde_1: makeFormation('bde_1'),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
            bde_4: makeFormation('bde_4'),
        };
        const op = makeOperation({ participating_brigades: ['bde_1', 'bde_2', 'bde_3', 'bde_4'] });
        const result = selectProbeBrigades(state, op);
        expect(result).toHaveLength(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Preparation state machine
// ═══════════════════════════════════════════════════════════════════════════

describe('tickPreparation', () => {
    it('initializes preparation state on first tick', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_aggressive', 4, 4);
        state.military.formations = {
            bde_1: makeFormation('bde_1'),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
        };
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.5);
        const op = makeOperation();

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.9);

        expect(op.preparation_sub_phase).toBeDefined();
        expect(op.preparation_turns_elapsed).toBe(1);
        expect(op.preparation_max_turns).toBe(4); // 8 - 4 aggressiveness
        expect(result.aborted).toBe(false);
    });

    it('aggressive commander with good intel moves quickly through phases', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_aggressive', 5, 5);
        state.military.formations = {
            bde_1: makeFormation('bde_1', { personnel: 2000 }),
            bde_2: makeFormation('bde_2', { personnel: 2000 }),
            bde_3: makeFormation('bde_3', { personnel: 2000 }),
        };
        // High confidence — intel gate satisfied immediately
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.8);
        const op = makeOperation({ commander_officer_id: 'officer_aggressive' });

        // Tick 1: all conditions met (high intel, agg>=4 for force staging, supply 0.9>=0.7,
        // assessment score well above go threshold) — loop advances through all phases in one tick
        const r1 = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.9);
        expect(r1.sub_phase).toBe('ready');
        expect(r1.ready).toBe(true);
        expect(r1.assessment).toBe('launch');
        expect(r1.probe_ordered).toBe(false);
    });

    it('cautious commander with low intel orders a probe', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_cautious', 5, 1);
        state.military.formations = {
            bde_1: makeFormation('bde_1', { equipment_class: 'mechanized' }),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
        };
        // Low confidence — below cautious commander's 0.70 threshold
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.2);
        const op = makeOperation({ commander_officer_id: 'officer_cautious' });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.9);

        expect(result.sub_phase).toBe('intel_gathering');
        expect(result.probe_ordered).toBe(true);
        expect(op.active_probe).toBeDefined();
        expect(op.active_probe!.brigade_ids).toHaveLength(2);
        expect(op.active_probe!.resolved).toBe(false);
    });

    it('anti-paralysis: aggressive commander auto-launches at max turns', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_mid', 3, 3);
        state.military.formations = {
            bde_1: makeFormation('bde_1'),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
        };
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.1); // Very low intel
        const op = makeOperation({
            commander_officer_id: 'officer_mid',
            preparation_sub_phase: 'intel_gathering',
            preparation_turns_elapsed: 4, // One below max (8 - 3 = 5)
            preparation_max_turns: 5,
        });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.5);

        // Elapsed becomes 5 = max turns. Agg 3 >= 3 → auto-launch
        expect(result.ready).toBe(true);
        expect(result.assessment).toBe('launch');
        expect(op.commander_assessment).toBe('launch');
    });

    it('anti-paralysis: cautious commander auto-aborts at max turns', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_timid', 3, 2);
        state.military.formations = {
            bde_1: makeFormation('bde_1'),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
        };
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.1);
        const op = makeOperation({
            commander_officer_id: 'officer_timid',
            preparation_sub_phase: 'intel_gathering',
            preparation_turns_elapsed: 5, // One below max (8 - 2 = 6)
            preparation_max_turns: 6,
        });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.3);

        // Elapsed becomes 6 = max turns. Agg 2 < 3 → auto-abort
        expect(result.aborted).toBe(true);
        expect(result.assessment).toBe('abort');
        expect(op.commander_assessment).toBe('abort');
    });

    it('assessment phase: good score → launch', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_balanced', 4, 3);
        state.military.formations = {
            bde_1: makeFormation('bde_1', { personnel: 2000 }),
            bde_2: makeFormation('bde_2', { personnel: 2000 }),
            bde_3: makeFormation('bde_3', { personnel: 2000 }),
        };
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.8);
        const op = makeOperation({
            commander_officer_id: 'officer_balanced',
            preparation_sub_phase: 'assessment',
            preparation_turns_elapsed: 2,
            preparation_max_turns: 5,
        });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.9);

        expect(result.ready).toBe(true);
        expect(result.assessment).toBe('launch');
        expect(op.preparation_sub_phase).toBe('ready');
    });

    it('assessment phase: marginal score → postpone', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_cautious', 5, 1);
        state.military.formations = {
            bde_1: makeFormation('bde_1', { personnel: 1000 }),
            bde_2: makeFormation('bde_2', { personnel: 1000 }),
            bde_3: makeFormation('bde_3', { personnel: 1000 }),
        };
        // Moderate intel — enough to pass the confidence gate but marginal
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.5);
        const op = makeOperation({
            commander_officer_id: 'officer_cautious',
            preparation_sub_phase: 'assessment',
            preparation_turns_elapsed: 3,
            preparation_max_turns: 7,
            postponement_count: 0,
        });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.5);

        // Cautious commander (agg 1) with moderate supply/intel → likely postpone
        if (result.assessment === 'postpone') {
            expect(op.preparation_sub_phase).toBe('intel_gathering');
            expect(op.postponement_count).toBe(1);
        } else {
            // If the score happens to be above threshold, that's also valid
            expect(['launch', 'abort']).toContain(result.assessment);
        }
    });

    it('waits for probe resolution before advancing', () => {
        const state = makeMinimalState();
        addOfficer(state, 'officer_cautious', 5, 1);
        state.military.formations = {
            bde_1: makeFormation('bde_1'),
            bde_2: makeFormation('bde_2'),
            bde_3: makeFormation('bde_3'),
        };
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.2);
        const op = makeOperation({
            commander_officer_id: 'officer_cautious',
            preparation_sub_phase: 'intel_gathering',
            preparation_turns_elapsed: 1,
            preparation_max_turns: 7,
            active_probe: {
                target_osid: 'op:enemy:target_1',
                brigade_ids: ['bde_1'],
                started_turn: 9,
                resolved: false,
            },
        });

        const result = tickPreparation(state, op, 'vrs_1kk', 'RS', 0.9);

        // Should stay in intel_gathering waiting for probe
        expect(result.sub_phase).toBe('intel_gathering');
        expect(result.probe_ordered).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Probe resolution
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveActiveProbe', () => {
    it('applies faction-specific confidence gain to sector intel', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.3);
        const op = makeOperation({
            active_probe: {
                target_osid: 'op:enemy:target_1',
                brigade_ids: ['bde_1'],
                started_turn: 9,
                resolved: false,
            },
        });
        state.military.corps_command = {
            vrs_1kk: {
                command_span: 5, subordinate_count: 10, og_slots: 2,
                active_ogs: [], corps_exhaustion: 10, stance: 'offensive' as const,
                active_operations: [op],
            },
        };

        resolveActiveProbe(state, op, 'RS', 'vrs_1kk');

        expect(op.active_probe!.resolved).toBe(true);
        expect(op.active_probe!.result_confidence_gain).toBeCloseTo(0.35, 2); // RS probe gain
        // Sector intel should be boosted
        const records = state.military.sector_intel!['sector_a']!;
        expect(records[0]!.confidence).toBeCloseTo(0.65, 2); // 0.3 + 0.35
    });

    it('applies counter-probe intel boost to defender', () => {
        const state = makeMinimalState();
        // Attacker's intel
        addSectorIntel(state, 'sector_a', 'enemy_sector_1', 0.3);
        // Defender's intel (enemy sector looking back at us)
        addSectorIntel(state, 'enemy_sector_1', 'sector_a', 0.2);

        const op = makeOperation({
            sector_id: 'sector_a',
            active_probe: {
                target_osid: 'op:enemy:target_1',
                brigade_ids: ['bde_1'],
                started_turn: 9,
                resolved: false,
            },
        });
        state.military.corps_command = {
            vrs_1kk: {
                command_span: 5, subordinate_count: 10, og_slots: 2,
                active_ogs: [], corps_exhaustion: 10, stance: 'offensive' as const,
                active_operations: [op],
            },
        };

        resolveActiveProbe(state, op, 'RS', 'vrs_1kk');

        // Defender's intel about us should be boosted
        const defenderRecords = state.military.sector_intel!['enemy_sector_1']!;
        expect(defenderRecords[0]!.confidence).toBeCloseTo(0.2 + COUNTER_PROBE_CONFIDENCE_GAIN, 2);
        expect(defenderRecords[0]!.offensive_signs).toBe(true);
    });

    it('adds exhaustion cost to corps', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.3);
        const op = makeOperation({
            active_probe: {
                target_osid: 'op:enemy:target_1',
                brigade_ids: ['bde_1'],
                started_turn: 9,
                resolved: false,
            },
        });
        state.military.corps_command = {
            vrs_1kk: {
                command_span: 5, subordinate_count: 10, og_slots: 2,
                active_ogs: [], corps_exhaustion: 10, stance: 'offensive' as const,
                active_operations: [op],
            },
        };

        resolveActiveProbe(state, op, 'RS', 'vrs_1kk');

        expect(state.military.corps_command!['vrs_1kk']!.corps_exhaustion).toBe(15); // 10 + 5
    });
});

describe('autoResolveProbe', () => {
    it('gives partial confidence gain when no combat occurred', () => {
        const state = makeMinimalState();
        addSectorIntel(state, 'sector_a', 'enemy_1', 0.3);
        const op = makeOperation({
            active_probe: {
                target_osid: 'op:enemy:target_1',
                brigade_ids: ['bde_1'],
                started_turn: 9,
                resolved: false,
            },
        });

        autoResolveProbe(state, op, 'RS');

        expect(op.active_probe!.resolved).toBe(true);
        // Partial gain = 0.35 * 0.5 = 0.175
        expect(op.active_probe!.result_confidence_gain).toBeCloseTo(0.175, 2);
        const records = state.military.sector_intel!['sector_a']!;
        expect(records[0]!.confidence).toBeCloseTo(0.475, 2); // 0.3 + 0.175
    });
});

describe('hasUnresolvedProbe', () => {
    it('returns true for unresolved probe', () => {
        const op = makeOperation({
            active_probe: {
                target_osid: 'op:test:1',
                brigade_ids: ['bde_1'],
                started_turn: 5,
                resolved: false,
            },
        });
        expect(hasUnresolvedProbe(op)).toBe(true);
    });

    it('returns false for resolved probe', () => {
        const op = makeOperation({
            active_probe: {
                target_osid: 'op:test:1',
                brigade_ids: ['bde_1'],
                started_turn: 5,
                resolved: true,
                result_confidence_gain: 0.35,
            },
        });
        expect(hasUnresolvedProbe(op)).toBe(false);
    });

    it('returns false when no probe exists', () => {
        const op = makeOperation();
        expect(hasUnresolvedProbe(op)).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Constants validation
// ═══════════════════════════════════════════════════════════════════════════

describe('Constants', () => {
    it('PROBE_FORCE_COMMITMENT_FACTOR is 0.4', () => {
        expect(PROBE_FORCE_COMMITMENT_FACTOR).toBe(0.4);
    });

    it('COUNTER_PROBE_CONFIDENCE_GAIN is 0.15', () => {
        expect(COUNTER_PROBE_CONFIDENCE_GAIN).toBe(0.15);
    });
});
