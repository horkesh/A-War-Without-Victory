/**
 * Phase C Step 3: Militia emergence tests.
 * - Emergence triggers under specified conditions (organizational penetration, declarations).
 * - Deterministic ordering for formation creation (municipalities and factions sorted).
 * - No emergence before war_start_turn (Phase I path not run; gating in phase_i_entry_gating.test.ts).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
  updateMilitiaEmergence,
  computeMilitiaStrength,
  MILITIA_STRENGTH_MIN,
  MILITIA_STRENGTH_MAX
} from '../src/sim/phase_i/militia_emergence.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { runTurn } from '../src/sim/turn_pipeline.js';

function stateWithMunicipalities(overrides: Partial<GameState['meta']> = {}): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'militia-fixture',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10,
      ...overrides
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      },
      {
        id: 'RS',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 5
      },
      {
        id: 'HRHB',
        profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
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
    political_controllers: { 'SID_001': 'RBiH', 'SID_002': 'RS' },
    municipalities: {
      MUN_A: {
        stability_score: 60,
        organizational_penetration: {
          police_loyalty: 'mixed',
          to_control: 'controlled',
          sda_penetration: 40,
          sds_penetration: 50,
          hdz_penetration: 10,
          patriotska_liga: 20,
          paramilitary_rs: 30,
          paramilitary_hrhb: 5
        }
      },
      MUN_B: {
        stability_score: 50,
        organizational_penetration: {
          police_loyalty: 'hostile',
          to_control: 'contested',
          sds_penetration: 80,
          paramilitary_rs: 60
        }
      }
    }
  };
}

test('updateMilitiaEmergence populates phase_i_militia_strength when municipalities and org penetration present', () => {
  const state = stateWithMunicipalities();
  const report = updateMilitiaEmergence(state);
  assert.ok(state.phase_i_militia_strength);
  assert.strictEqual(report.municipalities_updated, 2);
  assert.ok(state.phase_i_militia_strength!['MUN_A']);
  assert.ok(state.phase_i_militia_strength!['MUN_B']);
  const munA = state.phase_i_militia_strength!['MUN_A'];
  assert.strictEqual(typeof munA.RBiH, 'number');
  assert.strictEqual(typeof munA.RS, 'number');
  assert.strictEqual(typeof munA.HRHB, 'number');
  assert.ok(munA.RS >= MILITIA_STRENGTH_MIN && munA.RS <= MILITIA_STRENGTH_MAX);
});

test('militia strength is bounded [0, 100]', () => {
  const state = stateWithMunicipalities();
  updateMilitiaEmergence(state);
  for (const munId of Object.keys(state.phase_i_militia_strength!)) {
    const byFaction = state.phase_i_militia_strength![munId];
    for (const faction of Object.keys(byFaction)) {
      const v = byFaction[faction];
      assert.ok(v >= MILITIA_STRENGTH_MIN && v <= MILITIA_STRENGTH_MAX, `${munId}.${faction}=${v}`);
    }
  }
});

test('deterministic ordering: same state yields same report order and values', () => {
  const state = stateWithMunicipalities();
  const report1 = updateMilitiaEmergence(state);
  const state2 = stateWithMunicipalities();
  const report2 = updateMilitiaEmergence(state2);
  const munIds1 = report1.by_mun.map((m) => m.mun_id);
  const munIds2 = report2.by_mun.map((m) => m.mun_id);
  assert.deepStrictEqual(munIds1, munIds2, 'Municipality order must be deterministic (sorted)');
  assert.strictEqual(munIds1[0], 'MUN_A');
  assert.strictEqual(munIds1[1], 'MUN_B');
  assert.deepStrictEqual(state.phase_i_militia_strength, state2.phase_i_militia_strength, 'Same state must yield same strength map');
});

test('computeMilitiaStrength returns 0 when no organizational penetration', () => {
  const state = stateWithMunicipalities();
  const strength = computeMilitiaStrength(undefined, 'RS', state, 'MUN_X');
  assert.strictEqual(strength, 0);
});

test('RS declared increases militia growth; second runTurn shows higher RS strength in MUN with SDS', async () => {
  const state = stateWithMunicipalities();
  state.phase_i_militia_strength = {};
  updateMilitiaEmergence(state);
  const rsFirst = state.phase_i_militia_strength!['MUN_B']?.RS ?? 0;
  const { nextState } = await runTurn(state, { seed: state.meta.seed });
  const rsSecond = nextState.phase_i_militia_strength!['MUN_B']?.RS ?? 0;
  assert.ok(rsSecond >= rsFirst, 'RS militia in MUN_B should grow when RS declared');
});

test('Phase I runTurn includes militia emergence in report', async () => {
  const state = stateWithMunicipalities();
  const { report } = await runTurn(state, { seed: state.meta.seed });
  assert.ok(report.phase_i_militia_emergence);
  assert.strictEqual(report.phase_i_militia_emergence!.municipalities_updated, 2);
  assert.ok(report.phases.some((p) => p.name === 'phase-i-militia-emergence'));
});
