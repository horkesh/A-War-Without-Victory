import { describe, expect, it } from 'vitest';

import { runTurn } from '../src/sim/turn_pipeline.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';

const baseState: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
        turn: 0,
        seed: 'initial-seed',
        phase: 'war',
        referendum_held: true,
        referendum_turn: 0,
        war_start_turn: 0
    },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {} as any, displacement: {} as any
};

describe('runTurn determinism', () => {
  it('is deterministic for same state and seed', async () => {
    const seed = 'deterministic-seed';

    const first = await runTurn(baseState, { seed });
    const second = await runTurn(baseState, { seed });

    expect(first.nextState).toEqual(second.nextState);
    expect(first.report).toEqual(second.report);
    expect(baseState.meta.turn, 'input state must remain unchanged').toBe(0);
  });

  it('records the opening Cutileiro disposition through the real first-turn pipeline', async () => {
    const state = structuredClone(baseState);
    const profile = {
      authority: 50,
      legitimacy: 50,
      control: 50,
      logistics: 50,
      exhaustion: 0,
    };
    state.factions = [
      { id: 'RBiH', areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null, profile: { ...profile } },
      { id: 'RS', areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0, profile: { ...profile } },
      { id: 'HRHB', areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null, profile: { ...profile } },
    ] as GameState['factions'];

    const result = await runTurn(state, { seed: 'cutileiro-first-turn' });
    const history = result.nextState.military.negotiation?.peace_plan_history ?? [];

    expect(history).toContainEqual(expect.objectContaining({
      plan_id: 'cutileiro',
      turn_offered: 0,
      responses: {
        RBiH: 'rejected',
        RS: 'accepted',
        HRHB: 'accepted',
      },
      resolved: true,
    }));
  });
});
