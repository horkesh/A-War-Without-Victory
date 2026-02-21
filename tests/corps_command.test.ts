/**
 * Tests for Phase II corps command layer (Stage 5) and operational groups (Stage 6).
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
} from '../src/sim/phase_ii/corps_command.js';
import {
    activateOGs,
    computeOGPressureBonus,
    updateOGLifecycle,
    validateOGOrder
} from '../src/sim/phase_ii/operational_groups.js';
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
        meta: { turn: 20, seed: 'corps-test', phase: 'phase_ii' } as any,
        factions: [
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            'rs-corps-1': makeCorps('rs-corps-1', 'RS'),
            'rs-brig-1': brig1,
            'rs-brig-2': brig2
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS' },
        brigade_aor: { S1: 'rs-brig-1', S2: 'rs-brig-1', S3: 'rs-brig-2', S4: 'rs-brig-2' }
    } as GameState;
}

describe('corps command - initializeCorpsCommand', () => {
    it('creates CorpsCommandState for corps formations', () => {
        const state = makeCorpsState();

        initializeCorpsCommand(state);

        expect(state.corps_command).toBeDefined();
        expect(state.corps_command!['rs-corps-1']).toBeDefined();
        expect(state.corps_command!['rs-corps-1'].stance).toBe('balanced');
        expect(state.corps_command!['rs-corps-1'].subordinate_count).toBe(2);
        expect(state.corps_command!['rs-corps-1'].active_ogs).toEqual([]);
        expect(state.corps_command!['rs-corps-1'].corps_exhaustion).toBe(0);
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
        state.corps_command!['rs-corps-1'].stance = 'reorganize';

        // Set brigades to attack posture initially
        state.formations['rs-brig-1'].posture = 'attack';
        state.formations['rs-brig-2'].posture = 'attack';
        state.formations['rs-brig-1'].cohesion = 50;
        state.formations['rs-brig-2'].cohesion = 50;

        applyCorpsEffects(state);

        // Reorganize forces posture to 'defend'
        expect(state.formations['rs-brig-1'].posture).toBe('defend');
        expect(state.formations['rs-brig-2'].posture).toBe('defend');

        // Reorganize adds +2 cohesion recovery
        expect(state.formations['rs-brig-1'].cohesion).toBe(52);
        expect(state.formations['rs-brig-2'].cohesion).toBe(52);
    });
});

describe('corps command - advanceOperations', () => {
    it('transitions planning -> execution -> recovery -> complete', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Start an operation in planning phase at turn 20
        state.corps_command!['rs-corps-1'].active_operation = {
            name: 'Test Op',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 20,
            phase_started_turn: 20,
            participating_brigades: ['rs-brig-1', 'rs-brig-2']
        };

        // Advance 3 turns (planning duration = 3) -> should transition to execution
        state.meta.turn = 23;
        advanceOperations(state);
        expect(state.corps_command!['rs-corps-1'].active_operation!.phase).toBe('execution');
        expect(state.corps_command!['rs-corps-1'].active_operation!.phase_started_turn).toBe(23);

        // Advance 4 turns (execution duration = 4) -> should transition to recovery
        state.meta.turn = 27;
        advanceOperations(state);
        expect(state.corps_command!['rs-corps-1'].active_operation!.phase).toBe('recovery');
        expect(state.corps_command!['rs-corps-1'].active_operation!.phase_started_turn).toBe(27);

        // Advance 3 turns (recovery duration = 3) -> should complete (null)
        state.meta.turn = 30;
        advanceOperations(state);
        expect(state.corps_command!['rs-corps-1'].active_operation).toBeNull();
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

        state.og_orders = [
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
        expect(state.formations[ogId]).toBeDefined();
        expect(state.formations[ogId].kind).toBe('og');
        expect(state.formations[ogId].personnel).toBe(600);
        expect(state.formations[ogId].faction).toBe('RS');

        // Donor personnel deducted
        expect(state.formations['rs-brig-1'].personnel).toBe(700);
        expect(state.formations['rs-brig-2'].personnel).toBe(700);

        // Registered with corps
        expect(state.corps_command!['rs-corps-1'].active_ogs).toContain(ogId);

        // Orders cleared
        expect(state.og_orders).toEqual([]);
    });
});

describe('operational groups - updateOGLifecycle', () => {
    it('dissolves OG when cohesion < 15 and returns personnel to donors', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Manually create an OG
        const ogId = 'og-rs-corps-1-t20';
        state.formations[ogId] = {
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
        state.corps_command!['rs-corps-1'].active_ogs = [ogId];
        state.brigade_aor!['S3'] = ogId;

        const dissolved = updateOGLifecycle(state);

        expect(dissolved).toContain(ogId);
        expect(state.formations[ogId].status).toBe('inactive');

        // Personnel returned to donor brigades (300 each for 2 brigades from 600 total)
        // Original was 1000 each, so now 1000 + 300 = 1300
        expect(state.formations['rs-brig-1'].personnel).toBe(1300);
        expect(state.formations['rs-brig-2'].personnel).toBe(1300);

        // Removed from corps active_ogs
        expect(state.corps_command!['rs-corps-1'].active_ogs).not.toContain(ogId);

        // AoR assignment cleared
        expect(state.brigade_aor!['S3']).toBeNull();
    });

    it('dissolves OG when duration exceeded', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        const ogId = 'og-rs-corps-1-t15';
        state.formations[ogId] = {
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
        state.corps_command!['rs-corps-1'].active_ogs = [ogId];

        // Turn 20, created at 15 -> 5 turns active, max_dur = 5 -> should dissolve (>= maxDur)
        state.meta.turn = 20;

        const dissolved = updateOGLifecycle(state);

        expect(dissolved).toContain(ogId);
        expect(state.formations[ogId].status).toBe('inactive');
    });
});

describe('operational groups - computeOGPressureBonus', () => {
    it('returns 1.3 when OG covers an edge settlement', () => {
        const state = makeCorpsState();
        initializeCorpsCommand(state);

        // Create OG assigned to S3
        const ogId = 'og-rs-corps-1-t20';
        state.formations[ogId] = {
            id: ogId,
            faction: 'RS',
            name: 'OG test',
            created_turn: 20,
            status: 'active',
            assignment: null,
            kind: 'og',
            personnel: 600,
            cohesion: 70,
            hq_sid: 'S3',
            tags: ['corps:rs-corps-1', 'og_max_dur:5'],
            posture: 'attack',
            corps_id: 'rs-corps-1'
        };
        state.brigade_aor!['S3'] = ogId;

        // Edge S3:S4 should have OG bonus because S3 is assigned to an OG
        const bonus = computeOGPressureBonus(state, 'S3:S4');
        expect(bonus).toBe(1.3);
    });

    it('returns 1.0 when no OG covers the edge', () => {
        const state = makeCorpsState();

        const bonus = computeOGPressureBonus(state, 'S1:S2');
        expect(bonus).toBe(1.0);
    });
});
