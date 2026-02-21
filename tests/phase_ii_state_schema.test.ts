/**
 * Phase D Step 1: Phase II state schema extension tests.
 * - Schema validation accepts Phase II fields (phase_ii_supply_pressure, phase_ii_exhaustion, phase_ii_exhaustion_local).
 * - Serialization round-trip preserves Phase II state and remains deterministic.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState with Phase II fields present. Includes all Phase II fields that migration defaults for round-trip. */
function phaseIIGameStateFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'phase-ii-fixture',
            phase: 'phase_ii',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            outcome: undefined
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 70,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 8 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 100,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'HRHB',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 4 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 40,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
        ceasefire: {},
        negotiation_ledger: [],
        supply_rights: { corridors: [] },
        political_controllers: { 'SID_001': 'RBiH', 'SID_002': 'RS', 'SID_003': 'HRHB' },
        municipalities: {},
        phase_ii_supply_pressure: { RBiH: 25, RS: 30, HRHB: 15 },
        phase_ii_exhaustion: { RBiH: 12, RS: 18, HRHB: 10 },
        phase_ii_exhaustion_local: { 'SID_001': 2, 'SID_002': 3 }
    };
}

test('validateGameStateShape returns ok for GameState with Phase II fields', () => {
    const state = phaseIIGameStateFixture();
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with only some Phase II fields', () => {
    const state = phaseIIGameStateFixture();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.phase_ii_exhaustion_local;
    const result = validateGameStateShape(stateObj);
    assert.strictEqual(result.ok, true);
});

test('validateGameStateShape rejects phase_ii_supply_pressure when value out of [0, 100]', () => {
    const state = phaseIIGameStateFixture();
    state.phase_ii_supply_pressure!['RBiH'] = 150;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('phase_ii_supply_pressure')));
});

test('validateGameStateShape rejects phase_ii_exhaustion when value negative', () => {
    const state = phaseIIGameStateFixture();
    state.phase_ii_exhaustion!['RS'] = -1;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('phase_ii_exhaustion')));
});

test('Phase II state serialization round-trip preserves Phase II fields', () => {
    const original = phaseIIGameStateFixture();
    const payload = serializeState(original);
    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.phase_ii_supply_pressure, { RBiH: 25, RS: 30, HRHB: 15 });
    assert.deepStrictEqual(hydrated.phase_ii_exhaustion, { RBiH: 12, RS: 18, HRHB: 10 });
    assert.deepStrictEqual(hydrated.phase_ii_exhaustion_local, { 'SID_001': 2, 'SID_002': 3 });
});

test('Phase II state serialize → deserialize → serialize yields identical string', () => {
    const original = phaseIIGameStateFixture();
    const once = serializeState(original);
    const hydrated = deserializeState(once);
    const twice = serializeState(hydrated);
    assert.strictEqual(once, twice, 'Round-trip must produce byte-identical serialized output');
});

test('serializeGameState produces identical string when called twice with Phase II state', () => {
    const state = phaseIIGameStateFixture();
    const a = serializeGameState(state);
    const b = serializeGameState(state);
    assert.strictEqual(a, b, 'Two serializations of same state must be byte-identical');
});
