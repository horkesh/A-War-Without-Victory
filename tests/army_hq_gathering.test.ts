import { describe, it, expect } from 'vitest';
import type { GameState, FormationState } from '../src/state/game_state.js';
import {
    getGatheringCadence,
    shouldGather,
    canCorpsAttendGathering,
    assessTheater,
} from '../src/sim/combat/army_hq_gathering.js';

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
