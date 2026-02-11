/**
 * Phase 4: Injected settlement graph parity.
 * runTurn(state, { seed, settlementGraph }) must produce the same nextState as
 * runTurn(state, { seed }) when settlementGraph is the graph from loadSettlementGraph().
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runTurn } from '../src/sim/turn_pipeline.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function minimalPhaseIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'injected-graph-parity',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      },
      {
        id: 'HRHB',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
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
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: {
      MUN_A: { RBiH: 30, RS: 60, HRHB: 10 },
      MUN_B: { RBiH: 25, RS: 70, HRHB: 5 }
    }
  };
}

test('Phase I: injected settlementGraph produces same nextState as loadSettlementGraph path', async () => {
  const graph = await loadSettlementGraph();
  const seed = 'injected-graph-parity';
  const initial = minimalPhaseIState();
  const stateA = cloneState(initial);
  const stateB = cloneState(initial);

  const { nextState: nextA } = await runTurn(stateA, { seed, settlementGraph: graph });
  const { nextState: nextB } = await runTurn(stateB, { seed });

  assert.strictEqual(nextA.meta.turn, nextB.meta.turn, 'meta.turn must match');
  assert.strictEqual(nextA.meta.phase, nextB.meta.phase, 'meta.phase must match');

  const keysA = Object.keys(nextA.political_controllers ?? {}).sort((a, b) => a.localeCompare(b));
  const keysB = Object.keys(nextB.political_controllers ?? {}).sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(keysA, keysB, 'political_controllers keys must match');

  for (const k of keysA) {
    assert.strictEqual(
      (nextA.political_controllers as Record<string, string | null>)[k],
      (nextB.political_controllers as Record<string, string | null>)[k],
      `political_controllers[${k}] must match`
    );
  }

  const formationsA = Object.keys(nextA.formations ?? {}).sort((a, b) => a.localeCompare(b));
  const formationsB = Object.keys(nextB.formations ?? {}).sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(formationsA, formationsB, 'formation ids must match');
});
