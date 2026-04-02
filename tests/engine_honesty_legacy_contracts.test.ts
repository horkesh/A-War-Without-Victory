import { describe, expect, it } from 'vitest';
import { validateBrigadeRepositionOrder } from '../src/desktop/desktop_sim.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { isSectorAssignmentExemptCorpsId } from '../src/sim/combat/corps_front_sectors_constants.js';
import { applyBrigadeRepositionOrders } from '../src/sim/combat/apply_brigade_reposition.js';
import { applyBrigadePressureToState } from '../src/sim/combat/brigade_pressure.js';
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

  it('rejects new brigade reposition orders at the desktop contract boundary', async () => {
    const state = {
      meta: { turn: 4 },
      military: {
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
      political: {
        political_controllers: {
          'osid:foo': 'RBiH',
        },
      },
    } as unknown as GameState;

    await expect(
      validateBrigadeRepositionOrder(state, 'b1', ['osid:foo'], 'F:\\AWWV_exec_clean'),
    ).resolves.toEqual({
      valid: false,
      error: 'Brigade reposition orders are retired; use movement or sector assignment instead',
    });
  });

  it('does not expose retired brigade reposition orders to the player shell', () => {
    const parsed = parseGameState({
      meta: { turn: 7, phase: 'war' },
      military: {
        formations: {
          b1: {
            id: 'b1',
            faction: 'RBiH',
            name: 'B1',
            kind: 'brigade',
            readiness: 'active',
            cohesion: 70,
            status: 'active',
            created_turn: 1,
            tags: [],
          },
        },
        brigade_reposition_orders: {
          b1: { settlement_ids: ['S2', 'S3'] },
        },
      } as any,
      political: {
        political_controllers: { S2: 'RBiH', S3: 'RBiH' },
      } as any,
      displacement: {
        civilian_casualties: {},
      } as any,
    });

    expect(parsed.repositionOrders).toBeUndefined();
  });

  it('keeps legacy brigade pressure as a no-op compatibility sink', () => {
    const state = {
      meta: { turn: 7 },
      military: {
        front_pressure: {
          's1:s2': {
            edge_id: 's1:s2',
            value: 4,
            max_abs: 4,
            last_updated_turn: 6,
          },
        },
      },
      political: {
        political_controllers: {
          s1: 'RBiH',
          s2: 'RS',
        },
      },
    } as unknown as GameState;

    const before = JSON.parse(JSON.stringify(state.military.front_pressure));

    applyBrigadePressureToState(state, [{ a: 's1', b: 's2' } as any]);

    expect(state.military.front_pressure).toEqual(before);
  });
});
