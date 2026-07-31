/**
 * Tests for War phase corps command layer (Stage 5) and operational groups (Stage 6).
 * Validates corps initialization, stance resolution, army overrides,
 * operation phase advancement, OG activation/lifecycle, and pressure bonuses.
 */
import { describe, expect, it } from 'vitest';
import {
    advanceOperations,
    applyCorpsEffects,
    getEffectiveCorpsStance,
    initializeCorpsCommand,
    setArmyStance
} from '../src/sim/combat/corps_command.js';
import {
    activateOGs,
    updateOGLifecycle,
    validateOGOrder
} from '../src/sim/combat/operational_groups.js';
import type { FactionId, FormationState, GameState, OGActivationOrder } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
    return {
        id, faction, name: `Brigade ${id}`, created_turn: 1, status: 'active',
        assignment: null, kind: 'brigade', personnel, cohesion: 60, hq_sid: hq, tags: []
    };
}

function makeCorps(id: string, faction: FactionId): FormationState {
    return {
        id, faction, name: `Corps ${id}`, created_turn: 1, status: 'active',
        assignment: null, kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: []
    };
}

/**
 * Minimal state with RS corps 'rs-corps-1' and two subordinate brigades.
 */
function makeCorpsState(): GameState {
    const brig1 = makeFormation('rs-brig-1', 'RS', 'S1', 1000);
    brig1.corps_id = 'rs-corps-1';
    const brig2 = makeFormation('rs-brig-2', 'RS', 'S2', 1000);
    brig2.corps_id = 'rs-corps-1';

    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 20, seed: 'corps-test', phase: 'war' } as any,
  factions: [
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  brigade_aor: { S1: 'rs-brig-1', S2: 'rs-brig-1', S3: 'rs-brig-2', S4: 'rs-brig-2' },
  military: {
    formations: {
            'rs-corps-1': makeCorps('rs-corps-1', 'RS'),
            'rs-brig-1': brig1,
            'rs-brig-2': brig2
        },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS' }
  } as any,
} as unknown as GameState;
}

describe('corps command - initializeCorpsCommand', () => {
    it('creates CorpsCommandState for corps formations', () => {
        const state = makeCorpsState();

        initializeCorpsCommand(state);

        expect(state.military.corps_command).toBeDefined();
        expect(state.military.corps_command!['rs-corps-1']).toBeDefined();
        expect(state.military.corps_command!['rs-corps-1'].stance).toBe('balanced');
        expect(state.military.corps_command!['rs-corps-1'].subordinate_count).toBe(2);
        expect(state.military.corps_command!['rs-corps-1'].active_ogs).toEqual([]);
        expect(state.military.corps_command!['rs-corps-1'].corps_exhaustion).toBe(0);
    });
});

describe('corps command - getEffectiveCorpsStance', () => {
    it('returns balanced by default', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        const stance = getEffectiveCorpsStance(state, 'rs-corps-1');
        expect(stance).toBe('balanced');
    });

    it('returns offensive when army stance is general_offensive', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);
        setArmyStance(state, 'RS', 'general_offensive');

        const stance = getEffectiveCorpsStance(state, 'rs-corps-1');
        expect(stance).toBe('offensive');
    });
});

describe('corps command - applyCorpsEffects', () => {
    it('with reorganize stance forces brigades to defend posture and adds cohesion recovery', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Set corps stance to reorganize
        state.military.corps_command!['rs-corps-1'].stance = 'reorganize';

        // Set brigades to attack posture initially
        state.military.formations['rs-brig-1'].posture = 'attack';
        state.military.formations['rs-brig-2'].posture = 'attack';
        state.military.formations['rs-brig-1'].cohesion = 50;
        state.military.formations['rs-brig-2'].cohesion = 50;

        applyCorpsEffects(state);

        // Reorganize forces posture to 'defend'
        expect(state.military.formations['rs-brig-1'].posture).toBe('defend');
        expect(state.military.formations['rs-brig-2'].posture).toBe('defend');

        // Reorganize adds +2 cohesion recovery
        expect(state.military.formations['rs-brig-1'].cohesion).toBe(52);
        expect(state.military.formations['rs-brig-2'].cohesion).toBe(52);
    });
});

describe('corps command - advanceOperations', () => {
    it('transitions reorganization operations planning -> execution -> recovery -> complete', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Start an operation in planning phase at turn 20
        state.military.corps_command!['rs-corps-1'].active_operations = [{
            name: 'Test Op',
            type: 'reorganization',
            phase: 'planning',
            started_turn: 20,
            phase_started_turn: 20,
            participating_brigades: ['rs-brig-1', 'rs-brig-2']
        }];

        // Advance 3 turns (planning duration = 3) -> should transition to execution
        state.meta.turn = 23;
        advanceOperations(state);
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase).toBe('execution');
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase_started_turn).toBe(23);

        // Advance 4 turns (execution duration = 4) -> should transition to recovery
        state.meta.turn = 27;
        advanceOperations(state);
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase).toBe('recovery');
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase_started_turn).toBe(27);

        // Advance 3 turns (recovery duration = 3) -> should complete (null)
        state.meta.turn = 30;
        advanceOperations(state);
        expect(state.military.corps_command!['rs-corps-1'].active_operations).toHaveLength(0);
    });

    it('leaves combat-operation lifecycle ownership to sector_offensive', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);
        state.military.corps_command!['rs-corps-1'].active_operations = [{
            name: 'Combat Op',
            type: 'general_offensive',
            phase: 'planning',
            started_turn: 20,
            phase_started_turn: 20,
            participating_brigades: ['rs-brig-1', 'rs-brig-2'],
        }];

        state.meta.turn = 40;
        advanceOperations(state);

        expect(state.military.corps_command!['rs-corps-1'].active_operations[0]).toMatchObject({
            phase: 'planning',
            phase_started_turn: 20,
        });
    });

    it('does not auto-advance sector_attack operations', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        state.military.corps_command!['rs-corps-1'].active_operations = [{
            name: 'Test Sector Op',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 20,
            phase_started_turn: 20,
            participating_brigades: ['rs-brig-1', 'rs-brig-2'],
            objectives: ['op:test:objective_a', 'op:test:objective_b'],
            current_objective_index: 0,
            planning_duration: 5,
        }];

        state.meta.turn = 23;
        advanceOperations(state);
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase).toBe('planning');
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase_started_turn).toBe(20);

        state.military.corps_command!['rs-corps-1'].active_operations[0].phase = 'execution';
        state.military.corps_command!['rs-corps-1'].active_operations[0].phase_started_turn = 23;
        state.meta.turn = 40;
        advanceOperations(state);
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase).toBe('execution');
        expect(state.military.corps_command!['rs-corps-1'].active_operations[0].phase_started_turn).toBe(23);
    });
});

describe('operational groups - validateOGOrder', () => {
    it('returns null for a valid order', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        const order: OGActivationOrder = {
            corps_id: 'rs-corps-1',
            donors: [
                { brigade_id: 'rs-brig-1', personnel_contribution: 300 },
                { brigade_id: 'rs-brig-2', personnel_contribution: 300 }
            ],
            focus_settlements: ['S3'],
            posture: 'attack',
            max_duration: 5
        };

        const result = validateOGOrder(state, order);
        expect(result).toBeNull();
    });

    it('rejects when donor retains < 200 personnel', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // rs-brig-1 has 1000 personnel, contributing 900 would leave only 100 < 200
        const order: OGActivationOrder = {
            corps_id: 'rs-corps-1',
            donors: [
                { brigade_id: 'rs-brig-1', personnel_contribution: 900 }
            ],
            focus_settlements: ['S3'],
            posture: 'attack',
            max_duration: 5
        };

        const result = validateOGOrder(state, order);
        expect(result).not.toBeNull();
        expect(result).toContain('retain only');
    });
});

describe('operational groups - activateOGs', () => {
    it('creates OG formation, deducts donor personnel, registers with corps', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        state.military.og_orders = [
            {
                corps_id: 'rs-corps-1',
                donors: [
                    { brigade_id: 'rs-brig-1', personnel_contribution: 300 },
                    { brigade_id: 'rs-brig-2', personnel_contribution: 300 }
                ],
                focus_settlements: ['S3'],
                posture: 'attack',
                max_duration: 5
            }
        ];

        const report = activateOGs(state);

        expect(report.activated.length).toBe(1);
        expect(report.rejected.length).toBe(0);

        const ogId = report.activated[0];

        // OG formation should exist
        expect(state.military.formations[ogId]).toBeDefined();
        expect(state.military.formations[ogId].kind).toBe('og');
        expect(state.military.formations[ogId].personnel).toBe(600);
        expect(state.military.formations[ogId].faction).toBe('RS');

        // Donor personnel deducted
        expect(state.military.formations['rs-brig-1'].personnel).toBe(700);
        expect(state.military.formations['rs-brig-2'].personnel).toBe(700);

        // Registered with corps
        expect(state.military.corps_command!['rs-corps-1'].active_ogs).toContain(ogId);

        // Orders cleared
        expect(state.military.og_orders).toEqual([]);
    });
});

describe('operational groups - updateOGLifecycle', () => {
    it('dissolves OG when cohesion < 15 and returns personnel to donors', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Manually create an OG
        const ogId = 'og-rs-corps-1-t20';
        state.military.formations[ogId] = {
            id: ogId,
            faction: 'RS',
            name: 'OG test',
            created_turn: 20,
            status: 'active',
            assignment: null,
            kind: 'og',
            personnel: 600,
            cohesion: 10, // below dissolve threshold of 15
            hq_sid: 'S3',
            tags: ['corps:rs-corps-1', 'og_max_dur:5'],
            posture: 'attack',
            corps_id: 'rs-corps-1'
        };
        state.military.corps_command!['rs-corps-1'].active_ogs = [ogId];

        const dissolved = updateOGLifecycle(state);

        expect(dissolved).toContain(ogId);
        expect(state.military.formations[ogId].status).toBe('inactive');

        // Personnel returned to donor brigades (300 each for 2 brigades from 600 total)
        // Original was 1000 each, so now 1000 + 300 = 1300
        expect(state.military.formations['rs-brig-1'].personnel).toBe(1300);
        expect(state.military.formations['rs-brig-2'].personnel).toBe(1300);

        // Removed from corps active_ogs
        expect(state.military.corps_command!['rs-corps-1'].active_ogs).not.toContain(ogId);
    });

    it('dissolves OG when duration exceeded', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        const ogId = 'og-rs-corps-1-t15';
        state.military.formations[ogId] = {
            id: ogId,
            faction: 'RS',
            name: 'OG test',
            created_turn: 15,
            status: 'active',
            assignment: null,
            kind: 'og',
            personnel: 500,
            cohesion: 50, // above threshold
            hq_sid: 'S3',
            tags: ['corps:rs-corps-1', 'og_max_dur:5'],
            posture: 'attack',
            corps_id: 'rs-corps-1'
        };
        state.military.corps_command!['rs-corps-1'].active_ogs = [ogId];

        // Turn 20, created at 15 -> 5 turns active, max_dur = 5 -> should dissolve (>= maxDur)
        state.meta.turn = 20;

        const dissolved = updateOGLifecycle(state);

        expect(dissolved).toContain(ogId);
        expect(state.military.formations[ogId].status).toBe('inactive');
    });
});
