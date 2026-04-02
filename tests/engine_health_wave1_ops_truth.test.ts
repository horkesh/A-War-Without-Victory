import { describe, expect, it } from 'vitest';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { evaluateSectorOffensiveLaunch } from '../src/sim/combat/sector_offensive.js';

function makeMinimalState(turn: number, formations: Record<string, Partial<FormationState>>): GameState {
  const fmts: Record<string, FormationState> = {};
  for (const [id, partial] of Object.entries(formations)) {
    fmts[id] = {
      id,
      name: id,
      faction: 'RS' as FactionId,
      kind: 'brigade',
      status: 'active',
      personnel: 2000,
      location_osid: 'op:test:1',
      ...partial,
    } as FormationState;
  }
  return {
    meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
    factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
    military: {
      formations: fmts,
      corps_command: {},
      corps_front_sectors: {},
    } as any,
    political: {
      political_controllers: {},
    } as any,
  } as GameState;
}

describe('engine health wave 1 ops truth', () => {
  it('rejects launches that become unviable after enclave participant trimming', () => {
    const state = makeMinimalState(5, {
      b1: { corps_id: 'corps_1' as any, location_osid: 'op:gorazde:1', personnel: 5000, tags: ['enclave:gorazde'], equipment_class: 'mechanized' as any },
      b2: { corps_id: 'corps_1' as any, location_osid: 'op:main:2', personnel: 900 },
      b3: { corps_id: 'corps_1' as any, location_osid: 'op:main:3', personnel: 900 },
    });
    state.political = {
      political_controllers: {
        'op:e:1': 'RBiH',
      },
    } as any;
    state.military.corps_front_sectors = {
      'sector:corps_1:0': {
        sector_id: 'sector:corps_1:0',
        corps_id: 'corps_1',
        faction: 'RS',
        sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'] }],
        territory_osids: ['op:a:1', 'op:a:2', 'op:a:3'],
      },
      enemy_sector_1: {
        sector_id: 'enemy_sector_1',
        corps_id: 'enemy_corps',
        faction: 'RBiH',
        sub_segments: [{ friendly_osids: ['op:e:1'], enemy_osids: ['op:a:1'] }],
        territory_osids: ['op:e:1'],
        assigned_brigade_ids: ['d1', 'd2'],
      },
    } as any;
    state.military.formations.d1 = {
      id: 'd1',
      name: 'd1',
      faction: 'RBiH' as FactionId,
      kind: 'brigade',
      status: 'active',
      personnel: 2200,
      location_osid: 'op:e:1',
    } as any;
    state.military.formations.d2 = {
      id: 'd2',
      name: 'd2',
      faction: 'RBiH' as FactionId,
      kind: 'brigade',
      status: 'active',
      personnel: 2200,
      location_osid: 'op:e:1',
    } as any;

    const op = evaluateSectorOffensiveLaunch(
      state,
      'corps_1',
      'sector:corps_1:0',
      'RS' as FactionId,
      ['b1', 'b2', 'b3'],
      ['op:e:1'],
      ['op:e:1'],
      null,
    );

    expect(op).toBeNull();
  });
});
