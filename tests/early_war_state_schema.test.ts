/**
 * Phase C Step 1: Peace phase state schema extension tests.
 * - Schema validation accepts Peace phase fields (war_consolidation_until, war_militia_strength,
 *   war_control_strain, war_jna, war_alliance_rbih_hrhb).
 * - Serialization round-trip preserves Peace phase state and remains deterministic.
 */

import { expect, test } from 'vitest';
import type { GameState, JNATransitionState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

/** Minimal valid GameState with Peace phase fields present. Includes all fields that migration defaults so round-trip is byte-identical. */
function peacePhaseGameStateFixture(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'phase-i-fixture',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            outcome: undefined,
            player_faction: 'RBiH',
        } as any,
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
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            'MUN_001': { RBiH: 60, RS: 20, HRHB: 10 },
            'MUN_002': { RBiH: 30, RS: 55, HRHB: 15 }
        },
    war_jna: {
            transition_begun: true,
            withdrawal_progress: 0.25,
            asset_transfer_rs: 0.2
        } as JNATransitionState
  } as any,
  political: {
    negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
    ceasefire: {},
    negotiation_ledger: [],
    supply_rights: { corridors: [] },
    political_controllers: { 'SID_001': 'RBiH', 'SID_002': 'RS' },
    municipalities: {
            'MUN_001': { stability_score: 70 },
            'MUN_002': { stability_score: 50 }
        },
    war_consolidation_until: { 'MUN_001': 14 },
    war_control_strain: { 'MUN_001': 5, 'MUN_002': 12 },
    war_alliance_rbih_hrhb: 0.5
  } as any,
  displacement: {
    war_displacement_initiated: {}
  } as any,
};
}

test('validateGameStateShape returns ok for GameState with Peace phase fields', () => {
    const state = peacePhaseGameStateFixture();
    const result = validateGameStateShape(state);
    expect(result.ok).toBe(true);
});

test('validateGameStateShape returns ok for GameState with only some Peace phase fields', () => {
    const state = peacePhaseGameStateFixture();
    const stateObj = state as unknown as Record<string, unknown>;
    delete stateObj.war_militia_strength;
    delete stateObj.war_alliance_rbih_hrhb;
    const result = validateGameStateShape(stateObj);
    expect(result.ok).toBe(true);
});

test('validateGameStateShape rejects war_jna when transition_begun is not boolean', () => {
    const state = peacePhaseGameStateFixture();
    state.military.war_jna!.transition_begun = 1 as unknown as boolean;
    const result = validateGameStateShape(state);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('war_jna'))).toBeTruthy();
});

test('validateGameStateShape rejects war_jna when withdrawal_progress out of range', () => {
    const state = peacePhaseGameStateFixture();
    state.military.war_jna!.withdrawal_progress = 1.5;
    const result = validateGameStateShape(state);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('withdrawal_progress'))).toBeTruthy();
});

test('validateGameStateShape rejects war_alliance_rbih_hrhb when out of [-1, 1]', () => {
    const state = peacePhaseGameStateFixture();
    state.political.war_alliance_rbih_hrhb = 1.5;
    const result = validateGameStateShape(state);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('war_alliance_rbih_hrhb'))).toBeTruthy();
});

test('Peace phase state serialization round-trip preserves Peace phase fields', () => {
    const original = peacePhaseGameStateFixture();
    const payload = serializeState(original);
    const hydrated = deserializeState(payload);

    expect(hydrated.political.war_consolidation_until).toEqual({ 'MUN_001': 14 });
    expect(hydrated.military.war_militia_strength).toBeTruthy();
    expect(hydrated.military.war_militia_strength!['MUN_001'].RBiH).toBe(60);
    expect(hydrated.military.war_militia_strength!['MUN_001'].RS).toBe(20);
    expect(hydrated.political.war_control_strain).toEqual({ 'MUN_001': 5, 'MUN_002': 12 });
    expect(hydrated.military.war_jna!.transition_begun).toBe(true);
    expect(hydrated.military.war_jna!.withdrawal_progress).toBe(0.25);
    expect(hydrated.military.war_jna!.asset_transfer_rs).toBe(0.2);
    expect(hydrated.political.war_alliance_rbih_hrhb).toBe(0.5);
});

test('Peace phase state serialization reaches deterministic fixed-point after migration defaults', () => {
    const original = peacePhaseGameStateFixture();
    const once = serializeState(original);
    const hydrated = deserializeState(once);
    const twice = serializeState(hydrated);
    const thrice = serializeState(deserializeState(twice));
    expect(twice).toBe(thrice);
});

test('serializeGameState produces identical string when called twice with Peace phase state', () => {
    const state = peacePhaseGameStateFixture();
    const a = serializeGameState(state);
    const b = serializeGameState(state);
    expect(a).toBe(b);
});
