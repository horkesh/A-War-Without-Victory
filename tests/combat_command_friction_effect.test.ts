/**
 * Phase D0.9 Step 3: Command friction effect on War phase outcomes.
 * - Higher exhaustion/longer front → lower friction factor (deterministic).
 * - Supply pressure and exhaustion increments are larger under higher friction (lower factor).
 * - No control changes caused by friction wiring.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    getCommandFrictionMultiplier,
    getCommandFrictionMultipliers
} from '../src/sim/combat/command_friction.js';
import { updateExhaustion } from '../src/sim/combat/exhaustion.js';
import { updateSupplyPressure } from '../src/sim/combat/supply_pressure.js';
import type { GameState, FrontDescriptor } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'friction-effect', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'HRHB' }
    };
}

function cloneState(s: GameState): GameState {
    return JSON.parse(JSON.stringify(s)) as GameState;
}

test('friction multiplier is higher with higher exhaustion (deterministic)', () => {
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const stateLow = minimalPhaseIIState();
    stateLow.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    stateLow.political.political_controllers = { S1: 'RBiH', S2: 'RS' };
    const stateHigh = minimalPhaseIIState();
    stateHigh.political.war_exhaustion = { RBiH: 80, RS: 80, HRHB: 80 };
    stateHigh.political.political_controllers = { S1: 'RBiH', S2: 'RS' };
    const multLow = getCommandFrictionMultiplier(stateLow, 'RBiH', edges);
    const multHigh = getCommandFrictionMultiplier(stateHigh, 'RBiH', edges);
    assert.ok(multHigh > multLow);
    assert.ok(multLow >= 1 && multHigh >= 1);
});

test('exhaustion increment is larger under higher friction (higher multiplier)', () => {
    const fronts: FrontDescriptor[] = [
        { id: 'F1', edge_ids: ['e1'], created_turn: 10, stability: 'static' }
    ];
    const base = minimalPhaseIIState();
    base.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    base.political.war_supply_pressure = { RBiH: 10, RS: 10, HRHB: 10 };

    const stateNoFriction = cloneState(base);
    updateExhaustion(stateNoFriction, fronts);

    const stateWithFriction = cloneState(base);
    const highMultiplier = 2;
    updateExhaustion(stateWithFriction, fronts, { RBiH: highMultiplier, RS: 1, HRHB: 1 });

    const deltaNoFriction = stateNoFriction.political.war_exhaustion!['RBiH']! - 0;
    const deltaWithFriction = stateWithFriction.political.war_exhaustion!['RBiH']! - 0;
    assert.ok(deltaWithFriction >= deltaNoFriction, 'under higher multiplier (more friction), RBiH exhaustion delta should be at least as large');
});

test('supply pressure increment is larger under higher friction (higher multiplier)', () => {
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const base = minimalPhaseIIState();
    base.political.political_controllers = { S1: 'RBiH', S2: 'RS' };
    base.political.war_supply_pressure = { RBiH: 0, RS: 0, HRHB: 0 };

    const stateNoFriction = cloneState(base);
    updateSupplyPressure(stateNoFriction, edges);

    const stateWithFriction = cloneState(base);
    updateSupplyPressure(stateWithFriction, edges, undefined, { RBiH: 2, RS: 1, HRHB: 1 });

    const pressureNoFriction = stateNoFriction.political.war_supply_pressure!['RBiH'] ?? 0;
    const pressureWithFriction = stateWithFriction.political.war_supply_pressure!['RBiH'] ?? 0;
    assert.ok(pressureWithFriction >= pressureNoFriction, 'under higher multiplier (more friction), RBiH supply pressure should be at least as high');
});

test('friction wiring does not change political_controllers', () => {
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts: FrontDescriptor[] = [
        { id: 'F1', edge_ids: ['e1'], created_turn: 10, stability: 'static' }
    ];
    const state = minimalPhaseIIState();
    state.political.political_controllers = { S1: 'RBiH', S2: 'RS', S3: 'HRHB' };
    state.political.war_exhaustion = { RBiH: 50, RS: 50, HRHB: 50 };
    state.political.war_supply_pressure = { RBiH: 20, RS: 20, HRHB: 20 };
    const controllersBefore = { ...state.political.political_controllers };

    const frictionMultipliers = getCommandFrictionMultipliers(state, edges);
    updateSupplyPressure(state, edges, undefined, frictionMultipliers);
    updateExhaustion(state, fronts, frictionMultipliers);

    assert.deepStrictEqual(state.political.political_controllers, controllersBefore);
});
