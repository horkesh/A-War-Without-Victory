/**
 * Phase C Step 1: Phase I state schema extension tests.
 * - Schema validation accepts Phase I fields (phase_i_consolidation_until, phase_i_militia_strength,
 *   phase_i_control_strain, phase_i_jna, phase_i_alliance_rbih_hrhb).
 * - Serialization round-trip preserves Phase I state and remains deterministic.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState, PhaseIJNAState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState with Phase I fields present. Includes all fields that migration defaults so round-trip is byte-identical. */
function phaseIGameStateFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'phase-i-fixture',
            phase: 'phase_i',
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
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
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
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
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
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
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
        political_controllers: { 'SID_001': 'RBiH', 'SID_002': 'RS' },
        municipalities: {
            'MUN_001': { stability_score: 70 },
            'MUN_002': { stability_score: 50 }
        },
        phase_i_consolidation_until: { 'MUN_001': 14 },
        phase_i_militia_strength: {
            'MUN_001': { RBiH: 60, RS: 20, HRHB: 10 },
            'MUN_002': { RBiH: 30, RS: 55, HRHB: 15 }
        },
        phase_i_control_strain: { 'MUN_001': 5, 'MUN_002': 12 },
        phase_i_jna: {
            transition_begun: true,
            withdrawal_progress: 0.25,
            asset_transfer_rs: 0.2
        } as PhaseIJNAState,
        phase_i_alliance_rbih_hrhb: 0.5,
        phase_i_displacement_initiated: {}
    };
}

test('validateGameStateShape returns ok for GameState with Phase I fields', () => {
    const state = phaseIGameStateFixture();
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with only some Phase I fields', () => {
    const state = phaseIGameStateFixture();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.phase_i_militia_strength;
    delete stateObj.phase_i_alliance_rbih_hrhb;
    const result = validateGameStateShape(stateObj);
    assert.strictEqual(result.ok, true);
});

test('validateGameStateShape rejects phase_i_jna when transition_begun is not boolean', () => {
    const state = phaseIGameStateFixture();
    state.phase_i_jna!.transition_begun = 1 as unknown as boolean;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('phase_i_jna')));
});

test('validateGameStateShape rejects phase_i_jna when withdrawal_progress out of range', () => {
    const state = phaseIGameStateFixture();
    state.phase_i_jna!.withdrawal_progress = 1.5;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('withdrawal_progress')));
});

test('validateGameStateShape rejects phase_i_alliance_rbih_hrhb when out of [-1, 1]', () => {
    const state = phaseIGameStateFixture();
    state.phase_i_alliance_rbih_hrhb = 1.5;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('phase_i_alliance_rbih_hrhb')));
});

test('Phase I state serialization round-trip preserves Phase I fields', () => {
    const original = phaseIGameStateFixture();
    const payload = serializeState(original);
    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.phase_i_consolidation_until, { 'MUN_001': 14 });
    assert.ok(hydrated.phase_i_militia_strength);
    assert.strictEqual(hydrated.phase_i_militia_strength!['MUN_001'].RBiH, 60);
    assert.strictEqual(hydrated.phase_i_militia_strength!['MUN_001'].RS, 20);
    assert.deepStrictEqual(hydrated.phase_i_control_strain, { 'MUN_001': 5, 'MUN_002': 12 });
    assert.strictEqual(hydrated.phase_i_jna!.transition_begun, true);
    assert.strictEqual(hydrated.phase_i_jna!.withdrawal_progress, 0.25);
    assert.strictEqual(hydrated.phase_i_jna!.asset_transfer_rs, 0.2);
    assert.strictEqual(hydrated.phase_i_alliance_rbih_hrhb, 0.5);
});

test('Phase I state serialize → deserialize → serialize yields identical string', () => {
    const original = phaseIGameStateFixture();
    const once = serializeState(original);
    const hydrated = deserializeState(once);
    const twice = serializeState(hydrated);
    assert.strictEqual(once, twice, 'Round-trip must produce byte-identical serialized output');
});

test('serializeGameState produces identical string when called twice with Phase I state', () => {
    const state = phaseIGameStateFixture();
    const a = serializeGameState(state);
    const b = serializeGameState(state);
    assert.strictEqual(a, b, 'Two serializations of same state must be byte-identical');
});
