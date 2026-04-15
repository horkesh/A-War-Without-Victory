/**
 * Tests for WIA trickleback: wounded return to formations when out of combat.
 */

import { expect, test } from 'vitest';
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
        ...overrides,
    };
}

test('WIA trickleback: out-of-combat brigade receives wounded back', () => {
    const brigade = makeBrigade('brigade_1', { personnel: 2000, wounded_pending: 200 });
    const state: GameState = {
        meta: { turn: 5, phase: 'war', seed: 'test' },
        factions: [{ id: 'RS' }],
        military: {
            formations: { brigade_1: brigade },
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    expect(report.formations_returned).toBe(1);
    expect(report.personnel_returned).toBe(WIA_TRICKLE_RATE);
    expect(brigade.personnel).toBe(2000 + WIA_TRICKLE_RATE);
    expect(brigade.wounded_pending).toBe(200 - WIA_TRICKLE_RATE);
});

test('WIA trickleback: in-combat brigade does not receive wounded back', () => {
    const attacking = makeBrigade('brigade_attack', { posture: 'attack', wounded_pending: 150, personnel: 1800 });
    const disrupted = makeBrigade('brigade_disrupted', { disrupted: true, wounded_pending: 100, personnel: 1900 });
    const state: GameState = {
        meta: { turn: 5, phase: 'war', seed: 'test' },
        factions: [{ id: 'RS' }],
        military: {
            formations: { brigade_attack: attacking, brigade_disrupted: disrupted },
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    expect(report.formations_returned).toBe(0);
    expect(report.personnel_returned).toBe(0);
    expect(attacking.personnel).toBe(1800);
    expect(attacking.wounded_pending).toBe(150);
    expect(disrupted.personnel).toBe(1900);
    expect(disrupted.wounded_pending).toBe(100);
});

test('WIA trickleback: personnel cap at MAX_BRIGADE_PERSONNEL', () => {
    const nearCap = MAX_BRIGADE_PERSONNEL - 30;
    const brigade = makeBrigade('brigade_cap', { posture: 'defend', personnel: nearCap, wounded_pending: 200 });
    const state: GameState = {
        meta: { turn: 5, phase: 'war', seed: 'test' },
        factions: [{ id: 'RS' }],
        military: {
            formations: { brigade_cap: brigade },
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as unknown as GameState;

    const report = applyWiaTrickleback(state);

    expect(report.formations_returned).toBe(1);
    expect(report.personnel_returned).toBe(30);
    expect(brigade.personnel).toBe(MAX_BRIGADE_PERSONNEL);
    expect(brigade.wounded_pending).toBe(200 - 30);
});
