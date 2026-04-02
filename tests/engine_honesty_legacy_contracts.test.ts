import { describe, expect, it } from 'vitest';
import { isSectorAssignmentExemptCorpsId } from '../src/sim/combat/corps_front_sectors_constants.js';
import { applyBrigadeRepositionOrders } from '../src/sim/combat/apply_brigade_reposition.js';
import type { GameState } from '../src/state/game_state.js';

describe('engine honesty legacy contracts', () => {
  it('treats only army-HQ reserve corps ids as sector-assignment exempt', () => {
    expect(isSectorAssignmentExemptCorpsId('arbih_general_staff')).toBe(true);
    expect(isSectorAssignmentExemptCorpsId('vrs_main_staff')).toBe(true);
    expect(isSectorAssignmentExemptCorpsId('hvo_main_staff')).toBe(true);

    expect(isSectorAssignmentExemptCorpsId('arbih_3rd_corps')).toBe(false);
    expect(isSectorAssignmentExemptCorpsId('vrs_1st_krajina')).toBe(false);
    expect(isSectorAssignmentExemptCorpsId(null)).toBe(false);
  });

  it('consumes legacy brigade reposition orders without mutating formation truth', () => {
    const state = {
      military: {
        brigade_reposition_orders: {
          b1: { destination_sids: ['osid:foo'] },
        },
        formations: {
          b1: {
            id: 'b1',
            faction: 'RBiH',
            kind: 'brigade',
            status: 'active',
            location_osid: 'osid:bar',
          },
        },
      },
    } as unknown as GameState;

    applyBrigadeRepositionOrders(state, []);

    expect(state.military.brigade_reposition_orders).toBeUndefined();
    expect(state.military.formations.b1.location_osid).toBe('osid:bar');
  });
});
