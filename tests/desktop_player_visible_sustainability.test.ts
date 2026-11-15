import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { deriveMunicipalityControllerByOsid } from '../src/ui/warroom/data/war_data_extractor.js';
import type { GameState } from '../src/state/game_state.js';

const require = createRequire(import.meta.url);

type Projector = {
  projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

const { projectPlayerVisibleState } = require('../src/desktop/player_visible_state.cjs') as Projector;

const row = (munId: string, score: number, collapsed = false) => ({
  mun_id: munId,
  collapsed,
  is_surrounded: false,
  last_updated_turn: 12,
  sustainability_score: score,
  unsupplied_turns: collapsed ? 6 : 0,
});

/**
 * Two RS municipalities (one majority-held), one RBiH, one HRHB and one contested municipality
 * whose OSIDs split 2:1 for RBiH. `sustainability_state` is keyed by municipality, the controllers
 * by OSID (`op:<municipality>:<name>`), the shape that bit F1e and the displacement snapshot.
 */
function makeState(playerFaction: string | undefined): Record<string, any> {
  return {
    schema_version: 34,
    meta: { turn: 12, phase: 'war', player_faction: playerFaction },
    factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
    military: { formations: {} },
    political: {
      political_controllers: {
        'op:prijedor:a': 'RS',
        'op:prijedor:b': 'RS',
        'op:zvornik:a': 'RS',
        'op:zvornik:b': 'RBiH',
        'op:zvornik:c': 'RS',
        'op:tuzla:a': 'RBiH',
        'op:tuzla:b': 'RBiH',
        'op:mostar:a': 'HRHB',
        'op:bihac:a': 'RBiH',
        'op:bihac:b': 'RBiH',
        'op:bihac:c': 'RS',
        'op:novi_grad:a': null,
      },
    },
    displacement: {
      displacement_state: {},
      sustainability_state: {
        prijedor: row('prijedor', 82),
        zvornik: row('zvornik', 24),
        tuzla: row('tuzla', 55),
        mostar: row('mostar', 12, true),
        bihac: row('bihac', 40),
        novi_grad: row('novi_grad', 70),
      },
    },
  };
}

describe('player-visible municipal sustainability', () => {
  it('projects only the municipalities the player holds, never the opponents', () => {
    const projected = projectPlayerVisibleState(makeState('RS'));
    const ss = projected.displacement.sustainability_state;

    expect(Object.keys(ss)).toEqual(['prijedor', 'zvornik']);
    expect(ss.zvornik.sustainability_score).toBe(24);
    expect(ss.prijedor.collapsed).toBe(false);

    const serialized = JSON.stringify(projected.displacement.sustainability_state);
    for (const hidden of ['tuzla', 'mostar', 'bihac', 'novi_grad']) {
      expect(serialized).not.toContain(hidden);
    }
  });

  it('follows the player: the same save projects the other side\'s own municipalities', () => {
    const rbih = projectPlayerVisibleState(makeState('RBiH')).displacement.sustainability_state;
    expect(Object.keys(rbih)).toEqual(['bihac', 'tuzla']);
    const hrhb = projectPlayerVisibleState(makeState('HRHB')).displacement.sustainability_state;
    expect(Object.keys(hrhb)).toEqual(['mostar']);
    expect(hrhb.mostar.collapsed).toBe(true);
  });

  it('projects nothing without a player faction', () => {
    const projected = projectPlayerVisibleState(makeState(undefined));
    expect(projected.displacement.sustainability_state).toEqual({});
  });

  it('picks the same holder as the sitrep\'s own-municipality rule', () => {
    const raw = makeState('RS');
    const holders = deriveMunicipalityControllerByOsid(raw as unknown as GameState);
    for (const faction of ['RS', 'RBiH', 'HRHB']) {
      const projected = projectPlayerVisibleState(makeState(faction)).displacement.sustainability_state;
      const expected = Object.keys(raw.displacement.sustainability_state)
        .filter((munId) => holders.get(munId) === faction)
        .sort();
      expect(Object.keys(projected).sort()).toEqual(expected);
    }
  });

  it('is detached from the canonical state and deterministic', () => {
    const raw = makeState('RS');
    const first = projectPlayerVisibleState(raw);
    const second = projectPlayerVisibleState(raw);
    expect(JSON.stringify(first.displacement)).toBe(JSON.stringify(second.displacement));

    first.displacement.sustainability_state.prijedor.sustainability_score = 1;
    expect(raw.displacement.sustainability_state.prijedor.sustainability_score).toBe(82);
  });

  it('tolerates a save with no sustainability_state', () => {
    const raw = makeState('RS');
    delete raw.displacement.sustainability_state;
    expect(projectPlayerVisibleState(raw).displacement.sustainability_state).toEqual({});
  });
});
