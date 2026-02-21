/**
 * Tests for WIA trickleback: wounded return to formations when out of combat.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { applyWiaTrickleback } from '../src/sim/formation_spawn.js';
import { MAX_BRIGADE_PERSONNEL, WIA_TRICKLE_RATE } from '../src/state/formation_constants.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeBrigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: 'RS',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1500,
        readiness: 'active',
        posture: 'defend',
        ...overrides
    };
}

test('WIA trickleback: out-of-combat brigade receives wounded back', () => {
    const f1 = makeBrigade('brigade_1', { personnel: 2000, wounded_pending: 200 });
    const state: GameState = {
        meta: { turn: 5, phase: 'phase_ii', seed: 'test' },
        factions: [{ id: 'RS' }],
        formations: { brigade_1: f1 },
        political_controllers: {}
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    assert.strictEqual(report.formations_returned, 1);
    assert.strictEqual(report.personnel_returned, WIA_TRICKLE_RATE);
    assert.strictEqual(f1.personnel, 2000 + WIA_TRICKLE_RATE);
    assert.strictEqual(f1.wounded_pending, 200 - WIA_TRICKLE_RATE);
});

test('WIA trickleback: in-combat brigade does not receive wounded back', () => {
    const fAttack = makeBrigade('brigade_attack', { posture: 'attack', wounded_pending: 150, personnel: 1800 });
    const fDisrupted = makeBrigade('brigade_disrupted', { disrupted: true, wounded_pending: 100, personnel: 1900 });
    const state: GameState = {
        meta: { turn: 5, phase: 'phase_ii', seed: 'test' },
        factions: [{ id: 'RS' }],
        formations: { brigade_attack: fAttack, brigade_disrupted: fDisrupted },
        political_controllers: {}
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    assert.strictEqual(report.formations_returned, 0);
    assert.strictEqual(report.personnel_returned, 0);
    assert.strictEqual(fAttack.personnel, 1800);
    assert.strictEqual(fAttack.wounded_pending, 150);
    assert.strictEqual(fDisrupted.personnel, 1900);
    assert.strictEqual(fDisrupted.wounded_pending, 100);
});

test('WIA trickleback: personnel cap at MAX_BRIGADE_PERSONNEL', () => {
    const nearCap = MAX_BRIGADE_PERSONNEL - 30;
    const f = makeBrigade('brigade_cap', { posture: 'defend', personnel: nearCap, wounded_pending: 200 });
    const state: GameState = {
        meta: { turn: 5, phase: 'phase_ii', seed: 'test' },
        factions: [{ id: 'RS' }],
        formations: { brigade_cap: f },
        political_controllers: {}
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    assert.strictEqual(report.formations_returned, 1);
    assert.strictEqual(report.personnel_returned, 30);
    assert.strictEqual(f.personnel, MAX_BRIGADE_PERSONNEL);
    assert.strictEqual(f.wounded_pending, 200 - 30);
});
