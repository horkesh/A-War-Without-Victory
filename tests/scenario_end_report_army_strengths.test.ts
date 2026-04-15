import { describe, expect, it } from 'vitest';

import { computeArmyStrengthsSummary } from '../src/scenario/scenario_end_report.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 10, seed: 'test', phase: 'war' } as any,
    factions: [
      { id: 'RBiH' },
      { id: 'RS' },
    ] as any,
    political: {} as any,
    military: {
      formations: {
        b1: {
          id: 'b1',
          faction: 'RBiH',
          name: 'B1',
          created_turn: 1,
          status: 'active',
          assignment: null,
          kind: 'brigade',
          personnel: 1000,
          cohesion: 60,
          tags: [],
          location_osid: 'op:test:s1',
        },
        b2: {
          id: 'b2',
          faction: 'RBiH',
          name: 'B2',
          created_turn: 1,
          status: 'active',
          assignment: null,
          kind: 'brigade',
          personnel: 1000,
          cohesion: 60,
          tags: [],
          location_osid: 'op:test:s2',
        },
        b3: {
          id: 'b3',
          faction: 'RS',
          name: 'B3',
          created_turn: 1,
          status: 'active',
          assignment: null,
          kind: 'brigade',
          personnel: 1000,
          cohesion: 60,
          tags: [],
          location_osid: 'op:test:s3',
        },
      } as any,
      militia_pools: {},
      brigade_front_assignment: {
        b3: 'legacy_front',
      },
      corps_front_sectors: {
        sector_1: {
          sector_id: 'sector_1',
          corps_id: 'arbih_3rd_corps',
          assigned_brigade_ids: ['b1'],
          reserve_brigade_ids: ['b2'],
          edge_ids: ['S1__S2'],
          length_edges: 1,
          posture: 'balanced',
          objective: 'hold_line',
          pressure_target: 0.5,
          last_updated_turn: 10,
        },
      },
    } as any,
    displacement: {} as any,
  } as unknown as GameState;
}

describe('scenario end report army strengths', () => {
  it('counts only live frontline-assigned brigades, excluding reserves and legacy aliases', () => {
    const summary = computeArmyStrengthsSummary(makeState());

    expect(summary.front_assignment_counts_by_faction).toEqual([
      { faction: 'RBiH', assigned_brigades: 1 },
      { faction: 'RS', assigned_brigades: 0 },
    ]);
  });
});
