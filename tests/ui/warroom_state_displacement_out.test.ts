import { describe, expect, it } from 'vitest';

import type { GameState } from '../../src/state/game_state.js';
import { capturePreviousTurnSnapshot } from '../../src/ui/warroom/data/warroom_state.js';

/**
 * `political_controllers` is keyed by OSID (`op:<municipality>:<name>`); `displacement_state` by
 * municipality id. The snapshot used to look the municipality id up in the controllers directly,
 * which always missed, so every faction's displaced-out total stayed empty.
 */
function makeState(): GameState {
  const dispRow = (munId: string, out: number) => ({
    mun_id: munId,
    original_population: 100000,
    displaced_out: out,
    displaced_in: 0,
    lost_population: 0,
    last_updated_turn: 9,
  });
  return {
    meta: { turn: 9, phase: 'war' },
    factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    military: {},
    political: {
      political_controllers: {
        'op:prijedor:a': 'RS',
        'op:prijedor:b': 'RS',
        'op:zvornik:a': 'RS',
        'op:zvornik:b': 'RBiH',
        'op:zvornik:c': 'RS',
        'op:tuzla:a': 'RBiH',
        'op:mostar:a': 'HRHB',
        'op:gacko:a': null,
      },
    },
    displacement: {
      displacement_state: {
        prijedor: dispRow('prijedor', 1000),
        zvornik: dispRow('zvornik', 250),
        tuzla: dispRow('tuzla', 40),
        mostar: dispRow('mostar', 7),
        gacko: dispRow('gacko', 500),
        // no OSIDs in the controllers at all: nobody to attribute it to
        nowhere: dispRow('nowhere', 9999),
      },
    },
  } as unknown as GameState;
}

describe('previous-turn snapshot displacement-out totals', () => {
  it('attributes each municipality to the majority holder of its OSIDs', () => {
    const snapshot = capturePreviousTurnSnapshot(makeState());
    // RS: prijedor 1000 + zvornik 250 (2 of 3 OSIDs). RBiH: tuzla 40. HRHB: mostar 7.
    expect(snapshot.displacementOutTotals).toEqual({ RS: 1250, RBiH: 40, HRHB: 7 });
  });

  it('leaves out municipalities nobody holds or that have no OSIDs', () => {
    const totals = capturePreviousTurnSnapshot(makeState()).displacementOutTotals;
    // gacko is held by no faction (null), nowhere has no controllers: neither is attributed.
    expect(Object.values(totals).reduce((a, b) => a + b, 0)).toBe(1297);
  });

  it('is deterministic', () => {
    const a = capturePreviousTurnSnapshot(makeState());
    const b = capturePreviousTurnSnapshot(makeState());
    expect(JSON.stringify(a.displacementOutTotals)).toBe(JSON.stringify(b.displacementOutTotals));
  });

  it('is empty when the save has no displacement state', () => {
    const state = makeState();
    delete (state.displacement as { displacement_state?: unknown }).displacement_state;
    expect(capturePreviousTurnSnapshot(state).displacementOutTotals).toEqual({});
  });
});
