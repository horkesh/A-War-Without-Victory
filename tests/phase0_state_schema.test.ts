/**
 * Phase B Step 1: Phase 0 state schema extension tests.
 * - Schema validation accepts Phase 0 fields (meta referendum, municipalities, faction prewar/declaration).
 * - Serialization round-trip preserves Phase 0 state.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal valid GameState with Phase 0 fields (passes validateState and validateGameStateShape). */
function phase0GameStateFixture(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 0,
      seed: 'phase0-fixture',
      phase: 'phase_0',
      referendum_held: false,
      referendum_turn: null,
      war_start_turn: null,
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
        declaration_pressure: 50,
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
    municipalities: {
      'MUN_001': {
        stability_score: 65,
        control_status: 'SECURE',
        organizational_penetration: {
          police_loyalty: 'loyal',
          to_control: 'controlled',
          sds_penetration: 10,
          patriotska_liga: 0,
          jna_presence: false
        }
      },
      'MUN_002': {
        stability_score: 45,
        control_status: 'CONTESTED',
        organizational_penetration: { police_loyalty: 'mixed', to_control: 'contested' }
      }
    }
  };
}

test('validateGameStateShape returns ok for GameState with Phase 0 meta fields', () => {
  const state = phase0GameStateFixture();
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with Phase 0 referendum_held true and referendum_turn set', () => {
  const state = phase0GameStateFixture();
  state.meta.referendum_held = true;
  state.meta.referendum_turn = 5;
  state.meta.war_start_turn = 9;
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, true, result.ok ? '' : (result as { errors: string[] }).errors.join('; '));
});

test('validateGameStateShape returns ok for GameState with Phase 0 municipalities', () => {
  const state = phase0GameStateFixture();
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, true);
  assert.ok(state.municipalities && state.municipalities['MUN_001'].stability_score === 65);
  assert.ok(state.municipalities && state.municipalities['MUN_001'].control_status === 'SECURE');
});

test('validateGameStateShape returns ok for GameState with Phase 0 faction prewar_capital and declaration fields', () => {
  const state = phase0GameStateFixture();
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, true);
  const rs = state.factions.find((f) => f.id === 'RS');
  assert.ok(rs && rs.prewar_capital === 100 && rs.declaration_pressure === 50 && rs.declared === false);
});

test('validateGameStateShape rejects meta.referendum_held when not boolean', () => {
  const state = phase0GameStateFixture();
  const meta = state.meta as unknown as Record<string, unknown>;
  meta.referendum_held = 1;
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('referendum_held')));
});

test('validateGameStateShape rejects meta.referendum_turn when not null or non-negative integer', () => {
  const state = phase0GameStateFixture();
  const meta = state.meta as unknown as Record<string, unknown>;
  meta.referendum_turn = -1;
  const result = validateGameStateShape(state);
  assert.strictEqual(result.ok, false);
  assert.ok((result as { errors: string[] }).errors.some((e) => e.includes('referendum_turn')));
});

test('Phase 0 state serialization round-trip preserves Phase 0 fields', () => {
  const original = phase0GameStateFixture();
  const payload = serializeState(original);
  const hydrated = deserializeState(payload);

  assert.strictEqual(hydrated.meta.phase, 'phase_0');
  assert.strictEqual(hydrated.meta.referendum_held, false);
  assert.strictEqual(hydrated.meta.referendum_turn, null);
  assert.strictEqual(hydrated.meta.war_start_turn, null);
  assert.strictEqual(hydrated.meta.game_over, false);
  assert.ok(hydrated.municipalities && hydrated.municipalities['MUN_001']);
  assert.strictEqual(hydrated.municipalities!['MUN_001'].stability_score, 65);
  const rs = hydrated.factions.find((f) => f.id === 'RS');
  assert.ok(rs && rs.prewar_capital === 100 && rs.declaration_pressure === 50 && rs.declared === false && rs.declaration_turn === null);
});

test('Phase 0 state serialize → deserialize → serialize yields identical string', () => {
  const original = phase0GameStateFixture();
  const once = serializeState(original);
  const hydrated = deserializeState(once);
  const twice = serializeState(hydrated);
  assert.strictEqual(once, twice, 'Round-trip must produce byte-identical serialized output');
});
