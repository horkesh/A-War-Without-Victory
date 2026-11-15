import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleState } = require('../src/desktop/player_visible_state.cjs') as {
  projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

/**
 * The weekly dispatch names the player's lost formations. That is only safe because the
 * player-visible projection hands the renderer the player's own destructions and nobody else's,
 * and keeps a destroyed own formation (with its corps link) in the order of battle.
 */
function makeState() {
  return {
    schema_version: 34,
    meta: { turn: 21, phase: 'war', player_faction: 'RBiH' },
    factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    military: {
      formations: {
        rbih_1corps: { id: 'rbih_1corps', faction: 'RBiH', kind: 'corps', name: '1st Corps', status: 'active' },
        rbih_lost: {
          id: 'rbih_lost', faction: 'RBiH', kind: 'brigade', name: '115th Mountain Brigade',
          status: 'inactive', lifecycle_status: 'destroyed', corps_id: 'rbih_1corps',
        },
        rs_lost: {
          id: 'rs_lost', faction: 'RS', kind: 'brigade', name: 'SECRET VRS BRIGADE',
          status: 'inactive', lifecycle_status: 'destroyed', corps_id: 'rs_corps', location_osid: 'op:hidden:a',
        },
      },
    },
    political: { political_controllers: {} },
    displacement: {},
    turn_summaries: [{
      turn: 21,
      formation_destructions: [
        { formation_id: 'rbih_lost', formation_name: '115th Mountain Brigade', faction: 'RBiH' },
        { formation_id: 'rs_lost', formation_name: 'SECRET VRS BRIGADE', faction: 'RS' },
      ],
    }],
  };
}

describe('player-visible formation losses', () => {
  it('projects only the player\'s own destructions, by name', () => {
    const projected = projectPlayerVisibleState(makeState());
    const rows = projected.turn_summaries[0].formation_destructions;
    expect(rows).toEqual([
      { formation_id: 'rbih_lost', formation_name: '115th Mountain Brigade', faction: 'RBiH' },
    ]);
    expect(JSON.stringify(projected)).not.toContain('SECRET VRS BRIGADE');
  });

  it('keeps the destroyed own formation and its corps so the dispatch can name the corps', () => {
    const formations = projectPlayerVisibleState(makeState()).military.formations;
    expect(formations.rbih_lost.corps_id).toBe('rbih_1corps');
    expect(formations.rbih_1corps.name).toBe('1st Corps');
    expect(formations.rs_lost).toBeUndefined();
  });

  it('follows the player: the other side sees its own losses only', () => {
    const state = makeState();
    state.meta.player_faction = 'RS';
    const rows = projectPlayerVisibleState(state).turn_summaries[0].formation_destructions;
    expect(rows.map((row: { formation_id: string }) => row.formation_id)).toEqual(['rs_lost']);
  });
});
