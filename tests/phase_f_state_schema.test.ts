/**
 * Phase F Step 1: Phase F displacement state schema extension tests.
 * - Schema validation accepts Phase F fields (settlement_displacement, settlement_displacement_started_turn, municipality_displacement).
 * - Serialization round-trip preserves Phase F state and remains deterministic.
 * - Denylisted derived fields remain rejected (covered by game_state_no_derived_fields.test.ts).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState with Phase F displacement fields present. */
function phaseFGameStateFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 30,
            seed: 'phase-f-fixture',
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
        settlement_displacement: { 'SID_001': 0.2, 'SID_002': 0.5 },
        settlement_displacement_started_turn: { 'SID_001': 25, 'SID_002': 28 },
        municipality_displacement: { 'MUN_A': 0.3, 'MUN_B': 0.4 }
    };
}

test('validateGameStateShape returns ok for GameState with Phase F fields', () => {
    const state = phaseFGameStateFixture();
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with only some Phase F fields', () => {
    const state = phaseFGameStateFixture();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.settlement_displacement_started_turn;
    const result = validateGameStateShape(stateObj);
    assert.strictEqual(result.ok, true);
});

test('validateGameStateShape rejects settlement_displacement when value out of [0, 1]', () => {
    const state = phaseFGameStateFixture();
    state.settlement_displacement!['SID_001'] = 1.5;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('settlement_displacement')));
});

test('validateGameStateShape rejects municipality_displacement when value out of [0, 1]', () => {
    const state = phaseFGameStateFixture();
    state.municipality_displacement!['MUN_A'] = -0.1;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('municipality_displacement')));
});

test('Phase F state serialization round-trip preserves Phase F fields', () => {
    const original = phaseFGameStateFixture();
    const payload = serializeState(original);
    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.settlement_displacement, { 'SID_001': 0.2, 'SID_002': 0.5 });
    assert.deepStrictEqual(hydrated.settlement_displacement_started_turn, { 'SID_001': 25, 'SID_002': 28 });
    assert.deepStrictEqual(hydrated.municipality_displacement, { 'MUN_A': 0.3, 'MUN_B': 0.4 });
});

test('Phase F state serialize → deserialize → serialize yields identical string', () => {
    const original = phaseFGameStateFixture();
    const once = serializeState(original);
    const hydrated = deserializeState(once);
    const twice = serializeState(hydrated);
    assert.strictEqual(once, twice, 'Round-trip must produce byte-identical serialized output');
});

test('serializeGameState produces identical string when called twice with Phase F state', () => {
    const state = phaseFGameStateFixture();
    const a = serializeGameState(state);
    const b = serializeGameState(state);
    assert.strictEqual(a, b, 'Two serializations of same state must be byte-identical');
});
