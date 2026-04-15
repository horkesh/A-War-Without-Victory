/**
 * Tests for troop balancing (emergent growth via pool mechanics) and lifecycle events.
 */

import { describe, expect, it } from 'vitest';
import {
    VRS_EQUIPMENT_DECAY_START_WEEK,
    VRS_EQUIPMENT_DECAY_RATE,
    VRS_EQUIPMENT_DECAY_FLOOR,
    MAX_BRIGADE_PERSONNEL,
} from '../src/state/formation_constants.js';
import { reinforceBrigadesFromPools } from '../src/sim/formation_spawn.js';
import { processLifecycleEvents, type LifecycleEventDef } from '../src/sim/formation_lifecycle_events.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

function makeState(formations: Record<string, Partial<FormationState>>, overrides?: Partial<GameState>): GameState {
    const fullFormations: Record<string, FormationState> = {};
    const overrideMilitary = (overrides?.military ?? {}) as Record<string, unknown>;
    const overridePolitical = (overrides?.political ?? {}) as Record<string, unknown>;
    const topLevelOverrides = Object.fromEntries(
        Object.entries(overrides ?? {}).filter(([key]) => key !== 'military' && key !== 'political'),
    );
    for (const [id, formation] of Object.entries(formations)) {
        fullFormations[id] = {
            id,
            faction: 'RBiH',
            name: 'Test',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1500,
            kind: 'brigade',
            ...formation,
        } as FormationState;
    }

    return {
        meta: { turn: 10, phase: 'war', start_year: 1992, recruitment_mode: 'player_choice' },
        factions: [
            { id: 'RBiH', pool_scale: 0.18 },
            { id: 'RS', pool_scale: 0.25 },
            { id: 'HRHB', pool_scale: 2.1 },
        ],
        ...topLevelOverrides,
        military: {
            formations: fullFormations,
            ...overrideMilitary,
        } as any,
        political: {
            political_controllers: {},
            ...overridePolitical,
        } as any,
    } as unknown as GameState;
}

describe('emergent growth - no hardcoded ceilings', () => {
    it('reinforcement works without ceiling gating - pool availability is the limiter', () => {
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 1500, tags: ['mun:sarajevo_centar'] },
        });
        state.military.militia_pools = {
            'sarajevo_centar:RBiH': {
                mun_id: 'sarajevo_centar',
                faction: 'RBiH',
                available: 200,
                committed: 0,
                exhausted: 0,
                updated_turn: 10,
            },
        } as any;

        const report = reinforceBrigadesFromPools(state);
        expect(report.formations_reinforced).toBe(1);
        expect(report.manpower_added).toBeGreaterThan(0);
        expect(report.manpower_added).toBeLessThanOrEqual(200);
    });

    it('reinforcement is limited by pool availability, not by faction total', () => {
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 2500, tags: ['mun:sarajevo_centar'] },
        });
        state.military.militia_pools = {
            'sarajevo_centar:RBiH': {
                mun_id: 'sarajevo_centar',
                faction: 'RBiH',
                available: 100,
                committed: 150000,
                exhausted: 0,
                updated_turn: 10,
            },
        } as any;

        const report = reinforceBrigadesFromPools(state);
        expect(report.formations_reinforced).toBe(1);
        expect(report.manpower_added).toBeGreaterThan(0);
    });

    it('reinforcement stops when pool is empty', () => {
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 1500, tags: ['mun:sarajevo_centar'] },
        });
        state.military.militia_pools = {
            'sarajevo_centar:RBiH': {
                mun_id: 'sarajevo_centar',
                faction: 'RBiH',
                available: 0,
                committed: 5000,
                exhausted: 0,
                updated_turn: 10,
            },
        } as any;

        const report = reinforceBrigadesFromPools(state);
        expect(report.formations_reinforced).toBe(0);
        expect(report.manpower_added).toBe(0);
    });

    it('reinforcement stops at MAX_BRIGADE_PERSONNEL', () => {
        const state = makeState({
            b1: { faction: 'RS', personnel: MAX_BRIGADE_PERSONNEL, tags: ['mun:banja_luka'] },
        });
        state.military.militia_pools = {
            'banja_luka:RS': {
                mun_id: 'banja_luka',
                faction: 'RS',
                available: 5000,
                committed: 0,
                exhausted: 0,
                updated_turn: 10,
            },
        } as any;

        const report = reinforceBrigadesFromPools(state);
        expect(report.formations_reinforced).toBe(0);
    });
});

describe('VRS equipment decay constants', () => {
    it('decay starts at week 26', () => {
        expect(VRS_EQUIPMENT_DECAY_START_WEEK).toBe(26);
    });

    it('decay rate is 0.5% per week', () => {
        expect(VRS_EQUIPMENT_DECAY_RATE).toBe(0.005);
    });

    it('decay floor is 60%', () => {
        expect(VRS_EQUIPMENT_DECAY_FLOOR).toBe(0.60);
    });

    it('at full decay duration, floor is respected', () => {
        let equipment = 1.0;
        for (let week = 0; week < 80; week++) {
            equipment = Math.max(VRS_EQUIPMENT_DECAY_FLOOR, equipment - VRS_EQUIPMENT_DECAY_RATE);
        }
        expect(equipment).toBe(VRS_EQUIPMENT_DECAY_FLOOR);
    });
});

describe('lifecycle events', () => {
    it('territory_loss trigger disbands formation when mun lost', () => {
        const state = makeState(
            {
                hvo_derventa: { faction: 'HRHB', personnel: 1200 },
            },
            {
                political: {
                    political_controllers: {
                        'op:derventa:derventa_2': 'RS',
                        'op:derventa:derventa_3': 'RS',
                    },
                } as any,
            },
        );

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell to VRS',
        }];

        const fired = processLifecycleEvents(state, events);
        expect(fired).toBe(1);
        expect(state.military.formations!['hvo_derventa'].status).toBe('inactive');
        expect(state.military.formations!['hvo_derventa'].lifecycle_status).toBe('destroyed');
        expect(state.military.formations!['hvo_derventa'].personnel).toBe(0);
    });

    it('territory_loss trigger does not fire when faction still controls OSIDs', () => {
        const state = makeState(
            {
                hvo_derventa: { faction: 'HRHB', personnel: 1200 },
            },
            {
                political: {
                    political_controllers: {
                        'op:derventa:derventa_2': 'HRHB',
                        'op:derventa:derventa_3': 'RS',
                    },
                } as any,
            },
        );

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell to VRS',
        }];

        const fired = processLifecycleEvents(state, events);
        expect(fired).toBe(0);
        expect(state.military.formations!['hvo_derventa'].status).toBe('active');
    });

    it('merge event transfers personnel to target', () => {
        const state = makeState({
            source: { faction: 'RBiH', personnel: 500 },
            target: { faction: 'RBiH', personnel: 1800 },
        });

        const events: LifecycleEventDef[] = [{
            type: 'merge',
            formation_id: 'source',
            trigger_condition: 'week',
            trigger_turn: 5,
            target_id: 'target',
            reason: 'Reorg',
        }];

        const fired = processLifecycleEvents(state, events);
        expect(fired).toBe(1);
        expect(state.military.formations!['source'].status).toBe('inactive');
        expect(state.military.formations!['source'].lifecycle_status).toBe('merged');
        expect(state.military.formations!['target'].personnel).toBe(2300);
    });

    it('week trigger does not fire before turn', () => {
        const state = makeState({
            source: { faction: 'RBiH', personnel: 500 },
            target: { faction: 'RBiH', personnel: 1800 },
        });
        state.meta!.turn = 3;

        const events: LifecycleEventDef[] = [{
            type: 'merge',
            formation_id: 'source',
            trigger_condition: 'week',
            trigger_turn: 5,
            target_id: 'target',
            reason: 'Reorg',
        }];

        const fired = processLifecycleEvents(state, events);
        expect(fired).toBe(0);
    });

    it('already disbanded formations are skipped', () => {
        const state = makeState(
            {
                hvo_derventa: { faction: 'HRHB', personnel: 0, status: 'inactive', lifecycle_status: 'destroyed' },
            },
            {
                political: {
                    political_controllers: {},
                } as any,
            },
        );

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell',
        }];

        const fired = processLifecycleEvents(state, events);
        expect(fired).toBe(0);
    });
});
