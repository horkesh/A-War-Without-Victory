/**
 * Phase D Step 1: War phase state schema extension tests.
 * - Schema validation accepts War phase fields (war_supply_pressure, war_exhaustion, war_exhaustion_local).
 * - Serialization round-trip preserves War phase state and remains deterministic.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState with War phase fields present. Includes all War phase fields that migration defaults for round-trip. */
function warPhaseGameStateFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'phase-ii-fixture',
            phase: 'war',
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
        war_supply_pressure: { RBiH: 25, RS: 30, HRHB: 15 },
        war_exhaustion: { RBiH: 12, RS: 18, HRHB: 10 },
        war_exhaustion_local: { 'SID_001': 2, 'SID_002': 3 }
    };
}

test('validateGameStateShape returns ok for GameState with War phase fields', () => {
    const state = warPhaseGameStateFixture();
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with only some War phase fields', () => {
    const state = warPhaseGameStateFixture();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.war_exhaustion_local;
    const result = validateGameStateShape(stateObj);
    assert.strictEqual(result.ok, true);
});

test('validateGameStateShape rejects war_supply_pressure when value out of [0, 100]', () => {
    const state = warPhaseGameStateFixture();
    state.political.war_supply_pressure!['RBiH'] = 150;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('war_supply_pressure')));
});

test('validateGameStateShape rejects war_exhaustion when value negative', () => {
    const state = warPhaseGameStateFixture();
    state.political.war_exhaustion!['RS'] = -1;
    const result = validateGameStateShape(state);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('war_exhaustion')));
});

test('War phase state serialization round-trip preserves War phase fields', () => {
    const original = warPhaseGameStateFixture();
    const payload = serializeState(original);
    const hydrated = deserializeState(payload);

    assert.deepStrictEqual(hydrated.political.war_supply_pressure, { RBiH: 25, RS: 30, HRHB: 15 });
    assert.deepStrictEqual(hydrated.political.war_exhaustion, { RBiH: 12, RS: 18, HRHB: 10 });
    assert.deepStrictEqual(hydrated.political.war_exhaustion_local, { 'SID_001': 2, 'SID_002': 3 });
});

test('War phase state serialization reaches deterministic fixed-point after migration defaults', () => {
    const original = warPhaseGameStateFixture();
    const once = serializeState(original);
    const hydrated = deserializeState(once);
    const twice = serializeState(hydrated);
    const thrice = serializeState(deserializeState(twice));
    assert.strictEqual(twice, thrice, 'Serialized output must be byte-identical once migration defaults are materialized');
});

test('serializeGameState produces identical string when called twice with War phase state', () => {
    const state = warPhaseGameStateFixture();
    const a = serializeGameState(state);
    const b = serializeGameState(state);
    assert.strictEqual(a, b, 'Two serializations of same state must be byte-identical');
});
