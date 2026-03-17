import { describe, it, expect } from 'vitest';
import type { GameState, FormationState } from '../src/state/game_state.js';
import type { TheaterAssessment, CorpsAssessment } from '../src/sim/combat/army_hq_gathering_types.js';
import {
    getGatheringCadence,
    shouldGather,
    canCorpsAttendGathering,
    assessTheater,
    generateCampaignPlan,
    generateSynchronizedOperations,
    generateSyncOperationOverrides,
} from '../src/sim/combat/army_hq_gathering.js';
import { PLAN_VALIDITY_BUFFER, SYNC_MIN_BRIGADES } from '../src/sim/combat/army_hq_gathering_constants.js';

// ── Factory ──────────────────────────────────────────────────────────────────

function makeMinimalState(overrides: {
    turn?: number;
    lastGathering?: Record<string, number>;
    formations?: Record<string, Partial<FormationState>>;
    firedEventIds?: string[];
} = {}): GameState {
    const formations: Record<string, FormationState> = {};
    if (overrides.formations) {
        for (const [id, partial] of Object.entries(overrides.formations)) {
            formations[id] = {
                id,
                faction: 'RS',
                name: id,
                created_turn: 0,
                status: 'active',
                assignment: null,
                personnel: 2000,
                corps_id: 'vrs_1st_krajina',
                ...partial,
            } as unknown as FormationState;
        }
    }

    return {
        meta: { turn: overrides.turn ?? 0 } as GameState['meta'],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            last_gathering_turn: overrides.lastGathering,
        } as unknown as GameState['military'],
        political: {
            fired_event_ids: overrides.firedEventIds ?? [],
        } as unknown as GameState['political'],
        factions: {} as GameState['factions'],
        map: {} as GameState['map'],
        displacement: {} as GameState['displacement'],
        economy: {} as GameState['economy'],
    } as unknown as GameState;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getGatheringCadence', () => {
    it('VRS cadence is always 8', () => {
        expect(getGatheringCadence('RS', 10)).toBe(8);
        expect(getGatheringCadence('RS', 100)).toBe(8);
    });

    it('HRHB cadence is always 10', () => {
        expect(getGatheringCadence('HRHB', 10)).toBe(10);
        expect(getGatheringCadence('HRHB', 100)).toBe(10);
    });

    it('ARBiH cadence is 14 early war, 10 mid-war, 8 late war', () => {
        expect(getGatheringCadence('RBiH', 20)).toBe(14);
        expect(getGatheringCadence('RBiH', 50)).toBe(10);
        expect(getGatheringCadence('RBiH', 90)).toBe(8);
    });
});

describe('shouldGather', () => {
    it('VRS gathers at turn 8 (first gathering)', () => {
        const state = makeMinimalState({ turn: 8 });
        const result = shouldGather(state, 'RS', 8);
        expect(result.gather).toBe(true);
        expect(result.reason).toBe('regular_cadence');
    });

    it('VRS does not gather at turn 7', () => {
        const state = makeMinimalState({ turn: 7 });
        const result = shouldGather(state, 'RS', 7);
        expect(result.gather).toBe(false);
    });

    it('regular cadence resets after gathering', () => {
        // Last gathering at turn 10, cadence 8 → next at turn 18
        const state = makeMinimalState({
            turn: 18,
            lastGathering: { RS: 10 },
        });
        expect(shouldGather(state, 'RS', 18).gather).toBe(true);
        expect(shouldGather(state, 'RS', 17).gather).toBe(false);
    });

    it('emergency: corps strength collapse triggers gathering', () => {
        // Last gathering 5 turns ago (> EMERGENCY_COOLDOWN of 4)
        const state = makeMinimalState({
            turn: 15,
            lastGathering: { RS: 10 },
            formations: {
                bde_1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 300, status: 'active' },
                bde_2: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 400, status: 'active' },
                bde_3: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 350, status: 'active' },
            },
        });
        const result = shouldGather(state, 'RS', 15);
        expect(result.gather).toBe(true);
        expect(result.reason).toBe('corps_strength_collapse');
    });

    it('emergency cooldown: no emergency within 4 turns of last gathering', () => {
        // Last gathering 2 turns ago (< EMERGENCY_COOLDOWN)
        const state = makeMinimalState({
            turn: 12,
            lastGathering: { RS: 10 },
            formations: {
                bde_1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 300, status: 'active' },
                bde_2: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 400, status: 'active' },
            },
        });
        const result = shouldGather(state, 'RS', 12);
        expect(result.gather).toBe(false);
    });

    it('emergency event triggers gathering', () => {
        const state = makeMinimalState({
            turn: 15,
            lastGathering: { RS: 10 },
            firedEventIds: ['operation_storm_1995'],
        });
        const result = shouldGather(state, 'RS', 15);
        expect(result.gather).toBe(true);
        expect(result.reason).toBe('emergency_event');
    });
});

describe('canCorpsAttendGathering', () => {
    it('ARBiH 1st Corps returns radio early, full after tunnel', () => {
        const stateEarly = makeMinimalState({ turn: 30 });
        expect(canCorpsAttendGathering('arbih_1st_corps', 'RBiH', stateEarly)).toBe('radio');

        const stateLate = makeMinimalState({ turn: 70 });
        expect(canCorpsAttendGathering('arbih_1st_corps', 'RBiH', stateLate)).toBe('full');
    });

    it('ARBiH 5th Corps always returns radio (Bihać pocket)', () => {
        const state = makeMinimalState({ turn: 50 });
        expect(canCorpsAttendGathering('arbih_5th_corps', 'RBiH', state)).toBe('radio');
    });

    it('VRS corps always return full', () => {
        const state = makeMinimalState({ turn: 30 });
        expect(canCorpsAttendGathering('vrs_1st_krajina', 'RS', state)).toBe('full');
        expect(canCorpsAttendGathering('vrs_drina', 'RS', state)).toBe('full');
        expect(canCorpsAttendGathering('vrs_sarajevo_romanija', 'RS', state)).toBe('full');
    });
});

// ── Theater Assessment ──────────────────────────────────────────────────────

/** Extended factory for assessTheater tests. */
function makeTheaterState(overrides: {
    turn?: number;
    formations?: Record<string, Partial<FormationState>>;
    corpsCommand?: Record<string, { corps_exhaustion?: number; active_operation?: unknown }>;
    generalSupplyReserve?: Record<string, number>;
} = {}): GameState {
    const formations: Record<string, FormationState> = {};
    if (overrides.formations) {
        for (const [id, partial] of Object.entries(overrides.formations)) {
            formations[id] = {
                id,
                faction: 'RS',
                name: id,
                created_turn: 0,
                status: 'active',
                assignment: null,
                personnel: 2000,
                corps_id: 'vrs_1st_krajina',
                ...partial,
            } as unknown as FormationState;
        }
    }

    return {
        meta: { turn: overrides.turn ?? 10 } as GameState['meta'],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            corps_command: overrides.corpsCommand ?? {},
            general_supply_reserve: overrides.generalSupplyReserve ?? {},
        } as unknown as GameState['military'],
        political: {
            fired_event_ids: [],
        } as unknown as GameState['political'],
        factions: {} as GameState['factions'],
        map: {} as GameState['map'],
        displacement: {} as GameState['displacement'],
        economy: {} as GameState['economy'],
    } as unknown as GameState;
}

describe('assessTheater', () => {
    it('correctly classifies corps strength', () => {
        const state = makeTheaterState({
            formations: {
                bde_1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 1800, status: 'active' },
                bde_2: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 1600, status: 'active' },
                bde_3: { faction: 'RS', corps_id: 'vrs_drina', personnel: 400, status: 'active' },
                bde_4: { faction: 'RS', corps_id: 'vrs_drina', personnel: 350, status: 'active' },
            },
        });
        const assessment = assessTheater(state, 'RS');
        expect(assessment.corps_assessments).toHaveLength(2);

        const krajina = assessment.corps_assessments.find(c => c.corps_id === 'vrs_1st_krajina')!;
        const drina = assessment.corps_assessments.find(c => c.corps_id === 'vrs_drina')!;

        // Average 1700 → fortress
        expect(krajina.strength_class).toBe('fortress');
        expect(krajina.available_brigades).toBe(2);

        // Average 375 → thin
        expect(drina.strength_class).toBe('thin');
        expect(drina.available_brigades).toBe(2);
    });

    it('flags corps with high exhaustion', () => {
        const state = makeTheaterState({
            formations: {
                bde_1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 1000, status: 'active' },
            },
            corpsCommand: {
                vrs_1st_krajina: { corps_exhaustion: 65 },
            },
        });
        const assessment = assessTheater(state, 'RS');
        const krajina = assessment.corps_assessments.find(c => c.corps_id === 'vrs_1st_krajina')!;
        expect(krajina.exhaustion).toBe(65);
    });

    it('territory trend: gaining when mostly strong, losing when mostly thin', () => {
        // All strong → gaining
        const strongState = makeTheaterState({
            formations: {
                bde_a1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 1600, status: 'active' },
                bde_b1: { faction: 'RS', corps_id: 'vrs_drina', personnel: 1500, status: 'active' },
                bde_c1: { faction: 'RS', corps_id: 'vrs_sarajevo_romanija', personnel: 1800, status: 'active' },
            },
        });
        expect(assessTheater(strongState, 'RS').territory_trend).toBe('gaining');

        // All thin → losing
        const weakState = makeTheaterState({
            formations: {
                bde_a2: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 250, status: 'active' },
                bde_b2: { faction: 'RS', corps_id: 'vrs_drina', personnel: 280, status: 'active' },
                bde_c2: { faction: 'RS', corps_id: 'vrs_sarajevo_romanija', personnel: 200, status: 'active' },
            },
        });
        expect(assessTheater(weakState, 'RS').territory_trend).toBe('losing');
    });

    it('supply status derived from general_supply_reserve', () => {
        const makeWithSupply = (reserve: number) => makeTheaterState({
            formations: { bde_1: { faction: 'RS', corps_id: 'vrs_1st_krajina', personnel: 1000, status: 'active' } },
            generalSupplyReserve: { RS: reserve },
        });

        expect(assessTheater(makeWithSupply(80), 'RS').supply_status).toBe('abundant');
        expect(assessTheater(makeWithSupply(50), 'RS').supply_status).toBe('adequate');
        expect(assessTheater(makeWithSupply(30), 'RS').supply_status).toBe('strained');
        expect(assessTheater(makeWithSupply(10), 'RS').supply_status).toBe('critical');
    });

    it('excluded corps still assessed with strength data', () => {
        // arbih_general_staff is excluded for RBiH
        const state = makeTheaterState({
            formations: {
                bde_1: { faction: 'RBiH', corps_id: 'arbih_general_staff', personnel: 1200, status: 'active' },
                bde_2: { faction: 'RBiH', corps_id: 'arbih_2nd_corps', personnel: 1000, status: 'active' },
            },
        });
        const assessment = assessTheater(state, 'RBiH');
        const staff = assessment.corps_assessments.find(c => c.corps_id === 'arbih_general_staff')!;
        expect(staff).toBeDefined();
        expect(staff.attendance).toBe('excluded');
        expect(staff.strength_class).toBe('strong');
        expect(staff.available_brigades).toBe(1);
    });
});

// ── Campaign Plan Generation ────────────────────────────────────────────────

/** Helper to build a CorpsAssessment for plan generation tests. */
function makeCorpsAssessment(overrides: Partial<CorpsAssessment> & { corps_id: string }): CorpsAssessment {
    return {
        attendance: 'full',
        strength_class: 'strong',
        exhaustion: 10,
        has_active_op: false,
        recent_territory_change: 0,
        sector_threat_avg: 0.5,
        available_brigades: 5,
        officer_competence: 3.0,
        ...overrides,
    };
}

/** Helper to build a TheaterAssessment for plan generation tests. */
function makeAssessment(overrides: Partial<TheaterAssessment> & { corps_assessments: CorpsAssessment[] }): TheaterAssessment {
    return {
        territory_trend: 'stable',
        supply_status: 'adequate',
        manpower_status: 'adequate',
        weakest_enemy_front: null,
        strongest_threat: null,
        ...overrides,
    };
}

describe('generateCampaignPlan', () => {
    it('VRS early war: at least one primary corps', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, strength_class: 'strong' }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 4, strength_class: 'adequate' }),
                makeCorpsAssessment({ corps_id: 'vrs_sarajevo_romanija', available_brigades: 3, strength_class: 'adequate' }),
            ],
        });
        const state = makeMinimalState({ turn: 10 });
        const plan = generateCampaignPlan(state, 'RS', assessment, 10, 'regular_cadence', false);

        const primaryCorps = plan.front_priorities.filter(p => p.role === 'primary');
        expect(primaryCorps.length).toBeGreaterThanOrEqual(1);
    });

    it('VRS late war with high exhaustion: shifts to general_defensive', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', exhaustion: 55, strength_class: 'thin', available_brigades: 3 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', exhaustion: 60, strength_class: 'thin', available_brigades: 2 }),
                makeCorpsAssessment({ corps_id: 'vrs_sarajevo_romanija', exhaustion: 50, strength_class: 'thin', available_brigades: 2 }),
            ],
            territory_trend: 'losing',
            manpower_status: 'critical',
        });
        const state = makeMinimalState({ turn: 60 });
        const plan = generateCampaignPlan(state, 'RS', assessment, 60, 'regular_cadence', false);

        expect(plan.doctrine_override!.army_stance).toBe('general_defensive');
        expect(plan.doctrine_override!.aggression_modifier).toBeLessThan(0);
    });

    it('ARBiH early war: no primary corps', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'arbih_1st_corps', available_brigades: 8, strength_class: 'strong' }),
                makeCorpsAssessment({ corps_id: 'arbih_2nd_corps', available_brigades: 6, strength_class: 'strong' }),
                makeCorpsAssessment({ corps_id: 'arbih_3rd_corps', available_brigades: 5, strength_class: 'adequate' }),
            ],
        });
        const state = makeMinimalState({ turn: 20 });
        const plan = generateCampaignPlan(state, 'RBiH', assessment, 20, 'regular_cadence', false);

        const primaryCorps = plan.front_priorities.filter(p => p.role === 'primary');
        expect(primaryCorps.length).toBe(0);
    });

    it('ARBiH mid-war: max one primary', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'arbih_1st_corps', available_brigades: 10, strength_class: 'fortress' }),
                makeCorpsAssessment({ corps_id: 'arbih_2nd_corps', available_brigades: 8, strength_class: 'fortress' }),
                makeCorpsAssessment({ corps_id: 'arbih_3rd_corps', available_brigades: 7, strength_class: 'strong' }),
            ],
        });
        const state = makeMinimalState({ turn: 50 });
        const plan = generateCampaignPlan(state, 'RBiH', assessment, 50, 'regular_cadence', false);

        const primaryCorps = plan.front_priorities.filter(p => p.role === 'primary');
        expect(primaryCorps.length).toBe(1);
    });

    it('plan validity matches cadence + buffer', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 5 }),
            ],
        });
        const state = makeMinimalState({ turn: 16 });
        const plan = generateCampaignPlan(state, 'RS', assessment, 16, 'regular_cadence', false);

        // RS cadence=8, PLAN_VALIDITY_BUFFER=2 → valid_until = 16 + 8 + 2 = 26
        expect(plan.valid_until_turn).toBe(16 + getGatheringCadence('RS', 16) + PLAN_VALIDITY_BUFFER);
    });

    it('excluded corps receive contain role', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'arbih_general_staff', attendance: 'excluded', available_brigades: 3 }),
                makeCorpsAssessment({ corps_id: 'arbih_2nd_corps', available_brigades: 6, strength_class: 'strong' }),
            ],
        });
        const state = makeMinimalState({ turn: 50 });
        const plan = generateCampaignPlan(state, 'RBiH', assessment, 50, 'regular_cadence', false);

        const staff = plan.front_priorities.find(p => p.corps_id === 'arbih_general_staff')!;
        expect(staff.role).toBe('contain');
        expect(staff.suggested_stance).toBe('defensive');
        expect(plan.excluded_corps).toContain('arbih_general_staff');
    });

    it('corps with active successful op retains primary', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({
                    corps_id: 'vrs_1st_krajina',
                    available_brigades: 8,
                    strength_class: 'fortress',
                    has_active_op: true,
                }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 4, strength_class: 'adequate' }),
            ],
        });
        const state = makeMinimalState({ turn: 10 });
        const plan = generateCampaignPlan(state, 'RS', assessment, 10, 'regular_cadence', false);

        const krajina = plan.front_priorities.find(p => p.corps_id === 'vrs_1st_krajina')!;
        expect(krajina.role).toBe('primary');
    });

    it('all corps exhausted: doctrine forces balanced, negative aggression', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', exhaustion: 55, available_brigades: 4 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', exhaustion: 50, available_brigades: 3 }),
                makeCorpsAssessment({ corps_id: 'vrs_sarajevo_romanija', exhaustion: 45, available_brigades: 3 }),
            ],
            territory_trend: 'stable',
            supply_status: 'adequate',
            manpower_status: 'adequate',
        });
        // Turn > 52 so VRS early war override doesn't apply
        const state = makeMinimalState({ turn: 60 });
        const plan = generateCampaignPlan(state, 'RS', assessment, 60, 'regular_cadence', false);

        expect(plan.doctrine_override!.army_stance).toBe('balanced');
        expect(plan.doctrine_override!.aggression_modifier).toBeLessThan(0);
    });
});

// ── Synchronized Operations ──────────────────────────────────────────────

describe('synchronized operations', () => {
    it('two primary/secondary corps produce a SynchronizedOperation', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 5, sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        expect(result).toHaveLength(1);
        expect(result[0]!.participants).toHaveLength(2);
        expect(result[0]!.name).toContain('sync_');
    });

    it('solo corps produces no sync ops', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        expect(result).toHaveLength(0);
    });

    it('excluded corps cannot participate', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 5, attendance: 'excluded', sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        expect(result).toHaveLength(0);
    });

    it('corps below SYNC_MIN_BRIGADES excluded', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 2, sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        expect(result).toHaveLength(0);
    });

    it('max 2 synchronized operations per gathering', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_2nd_krajina', available_brigades: 5, sector_threat_avg: 0.4 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 5, sector_threat_avg: 0.4 }),
                makeCorpsAssessment({ corps_id: 'vrs_sarajevo_romanija', available_brigades: 5, sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_2nd_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
            { corps_id: 'vrs_sarajevo_romanija', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        expect(result.length).toBeLessThanOrEqual(2);
    });

    it('launch window start is currentTurn + 3', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 5, sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 20);
        expect(result[0]!.launch_window_start).toBe(23);
    });

    it('main effort assigned to stronger corps', () => {
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 10, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 4, sector_threat_avg: 0.4 }),
            ],
        });
        const priorities = [
            { corps_id: 'vrs_1st_krajina', role: 'primary' as const, suggested_stance: 'offensive' as const },
            { corps_id: 'vrs_drina', role: 'secondary' as const, suggested_stance: 'balanced' as const },
        ];
        const result = generateSynchronizedOperations(assessment, priorities, 10);
        const mainEffort = result[0]!.participants.find(p => p.role === 'main_effort')!;
        expect(mainEffort.corps_id).toBe('vrs_1st_krajina');
    });

    it('generateSyncOperationOverrides creates ArmyHQOverride entries', () => {
        const state = makeMinimalState({ turn: 10 });
        const assessment = makeAssessment({
            corps_assessments: [
                makeCorpsAssessment({ corps_id: 'vrs_1st_krajina', available_brigades: 6, sector_threat_avg: 0.5 }),
                makeCorpsAssessment({ corps_id: 'vrs_drina', available_brigades: 5, sector_threat_avg: 0.4 }),
            ],
        });
        const plan = generateCampaignPlan(state, 'RS', assessment, 10, 'regular_cadence', false);

        // Plan should have sync ops since both corps are primary/secondary and in contact
        expect(plan.synchronized_operations.length).toBeGreaterThanOrEqual(1);

        generateSyncOperationOverrides(state, 'RS', plan);

        expect(state.military.army_hq_overrides).toBeDefined();
        expect(state.military.army_hq_overrides!.length).toBeGreaterThanOrEqual(2);

        const override = state.military.army_hq_overrides![0]!;
        expect(override.type).toBe('offensive');
        expect(override.issued_turn).toBe(10);
        expect(override.max_brigades).toBe(12);
        expect(override.reason).toContain('Synchronized operation');
    });
});
