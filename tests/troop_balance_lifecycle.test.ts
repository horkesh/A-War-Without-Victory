/**
 * Tests for troop balancing (faction ceilings) and lifecycle events.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    FACTION_HISTORICAL_PEAK,
    FACTION_SOFT_CAP_RATIO,
    FACTION_HARD_CAP_RATIO,
    ABOVE_SOFT_CAP_REINFORCEMENT_MULT,
    VRS_EQUIPMENT_DECAY_START_WEEK,
    VRS_EQUIPMENT_DECAY_RATE,
    VRS_EQUIPMENT_DECAY_FLOOR,
} from '../src/state/formation_constants.js';
import { getFactionTotalPersonnel, getFactionCeilingMult } from '../src/sim/formation_spawn.js';
import { processLifecycleEvents, type LifecycleEventDef } from '../src/sim/formation_lifecycle_events.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

function makeState(formations: Record<string, Partial<FormationState>>, overrides?: Partial<GameState>): GameState {
    const fullFormations: Record<string, FormationState> = {};
    for (const [id, f] of Object.entries(formations)) {
        fullFormations[id] = {
            id,
            faction: 'RBiH',
            name: 'Test',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1500,
            kind: 'brigade',
            ...f,
        } as FormationState;
    }
    return {
        meta: { turn: 10, phase: 'war', start_year: 1992, recruitment_mode: 'player_choice' },
        formations: fullFormations,
        factions: [
            { id: 'RBiH', pool_scale: 0.18 },
            { id: 'RS', pool_scale: 0.25 },
            { id: 'HRHB', pool_scale: 2.1 },
        ],
        political_controllers: {},
        ...overrides,
    } as unknown as GameState;
}

describe('faction personnel ceilings', () => {
    it('constants are correctly defined', () => {
        assert.equal(FACTION_HISTORICAL_PEAK['RBiH'], 130_000);
        assert.equal(FACTION_HISTORICAL_PEAK['RS'], 185_000);
        assert.equal(FACTION_HISTORICAL_PEAK['HRHB'], 45_000);
        assert.equal(FACTION_SOFT_CAP_RATIO, 0.85);
        assert.equal(FACTION_HARD_CAP_RATIO, 0.95);
    });

    it('getFactionTotalPersonnel sums active formations', () => {
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 2000 },
            b2: { faction: 'RBiH', personnel: 1500 },
            b3: { faction: 'RS', personnel: 3000 },
            b4: { faction: 'RBiH', personnel: 1000, status: 'inactive' },
        });
        assert.equal(getFactionTotalPersonnel(state, 'RBiH'), 3500); // only active
        assert.equal(getFactionTotalPersonnel(state, 'RS'), 3000);
    });

    it('getFactionCeilingMult returns 1.0 below soft cap', () => {
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 50000 },
        });
        assert.equal(getFactionCeilingMult(state, 'RBiH'), 1.0);
    });

    it('getFactionCeilingMult returns reduced mult between soft and hard cap', () => {
        // RBiH soft cap: 110,500. Hard cap: 123,500
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 115000 },
        });
        assert.equal(getFactionCeilingMult(state, 'RBiH'), ABOVE_SOFT_CAP_REINFORCEMENT_MULT);
    });

    it('getFactionCeilingMult returns 0 at hard cap', () => {
        // RBiH hard cap: 123,500
        const state = makeState({
            b1: { faction: 'RBiH', personnel: 125000 },
        });
        assert.equal(getFactionCeilingMult(state, 'RBiH'), 0);
    });
});

describe('VRS equipment decay constants', () => {
    it('decay starts at week 26', () => {
        assert.equal(VRS_EQUIPMENT_DECAY_START_WEEK, 26);
    });

    it('decay rate is 0.5% per week', () => {
        assert.equal(VRS_EQUIPMENT_DECAY_RATE, 0.005);
    });

    it('decay floor is 60%', () => {
        assert.equal(VRS_EQUIPMENT_DECAY_FLOOR, 0.60);
    });

    it('at full decay duration, floor is respected', () => {
        // After 80 weeks of decay (0.005 × 80 = 0.4), equipment = max(0.6, 1.0 - 0.4) = 0.6
        let equipment = 1.0;
        for (let w = 0; w < 80; w++) {
            equipment = Math.max(VRS_EQUIPMENT_DECAY_FLOOR, equipment - VRS_EQUIPMENT_DECAY_RATE);
        }
        assert.equal(equipment, VRS_EQUIPMENT_DECAY_FLOOR);
    });
});

describe('lifecycle events', () => {
    it('territory_loss trigger disbands formation when mun lost', () => {
        const state = makeState({
            hvo_derventa: { faction: 'HRHB', personnel: 1200 },
        }, {
            political_controllers: {
                'op:derventa:derventa_2': 'RS', // Derventa lost to RS
                'op:derventa:derventa_3': 'RS',
            },
        });

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell to VRS',
        }];

        const fired = processLifecycleEvents(state, events);
        assert.equal(fired, 1);
        assert.equal(state.formations!['hvo_derventa'].status, 'inactive');
        assert.equal(state.formations!['hvo_derventa'].lifecycle_status, 'destroyed');
        assert.equal(state.formations!['hvo_derventa'].personnel, 0);
    });

    it('territory_loss trigger does NOT fire when faction still controls OSIDs', () => {
        const state = makeState({
            hvo_derventa: { faction: 'HRHB', personnel: 1200 },
        }, {
            political_controllers: {
                'op:derventa:derventa_2': 'HRHB', // Still controlled
                'op:derventa:derventa_3': 'RS',
            },
        });

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell to VRS',
        }];

        const fired = processLifecycleEvents(state, events);
        assert.equal(fired, 0);
        assert.equal(state.formations!['hvo_derventa'].status, 'active');
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
        assert.equal(fired, 1);
        assert.equal(state.formations!['source'].status, 'inactive');
        assert.equal(state.formations!['source'].lifecycle_status, 'merged');
        assert.equal(state.formations!['target'].personnel, 2300);
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
        assert.equal(fired, 0);
    });

    it('already disbanded formations are skipped', () => {
        const state = makeState({
            hvo_derventa: { faction: 'HRHB', personnel: 0, status: 'inactive', lifecycle_status: 'destroyed' },
        }, {
            political_controllers: {},
        });

        const events: LifecycleEventDef[] = [{
            type: 'disband',
            formation_id: 'hvo_derventa',
            trigger_condition: 'territory_loss',
            trigger_municipality: 'derventa',
            reason: 'Derventa fell',
        }];

        const fired = processLifecycleEvents(state, events);
        assert.equal(fired, 0);
    });
});
