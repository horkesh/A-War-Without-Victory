import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageMunicipalitySupportOrderOnState } = require('../src/desktop/municipality_support_staging.cjs') as {
  stageMunicipalitySupportOrderOnState: (state: any, payload: any) => { ok: boolean; error?: string };
};

function makeState(overrides: Record<string, unknown> = {}): any {
  return {
    meta: { turn: 12, player_faction: 'RBiH' },
    military: {
      militia_pools: {
        'gorazde:RBiH': { mun_id: 'gorazde', faction: 'RBiH', available: 100 },
      },
    },
    ...overrides,
  };
}

describe('municipality support desktop staging contract', () => {
  it('stages support orders under military.municipality_support_orders for the sim and UI read model', () => {
    const state = makeState();

    const res = stageMunicipalitySupportOrderOnState(state, {
      faction: 'RBiH',
      munId: 'gorazde',
      type: 'weapons_shipment',
    });

    expect(res.ok).toBe(true);
    expect(state.military.municipality_support_orders).toEqual({
      RBiH: {
        faction: 'RBiH',
        mun_id: 'gorazde',
        type: 'weapons_shipment',
        staged_turn: 12,
      },
    });
    expect(state.municipality_support_orders).toBeUndefined();
  });

  it('rejects support for a non-player faction without mutating state', () => {
    const state = makeState();

    const res = stageMunicipalitySupportOrderOnState(state, {
      faction: 'RS',
      munId: 'gorazde',
      type: 'staff_priority',
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Can only stage municipality support for the current player faction');
    expect(state.military.municipality_support_orders).toBeUndefined();
    expect(state.municipality_support_orders).toBeUndefined();
  });

  it('rejects unsupported faction/type/pool combinations without mutating state', () => {
    const invalidFaction = makeState();
    expect(stageMunicipalitySupportOrderOnState(invalidFaction, {
      faction: 'JNA',
      munId: 'gorazde',
      type: 'weapons_shipment',
    }).error).toBe('Invalid faction: JNA');
    expect(invalidFaction.military.municipality_support_orders).toBeUndefined();

    const invalidType = makeState();
    expect(stageMunicipalitySupportOrderOnState(invalidType, {
      faction: 'RBiH',
      munId: 'gorazde',
      type: 'staff_priority',
    }).error).toBe('Invalid municipality support type for RBiH: staff_priority');
    expect(invalidType.military.municipality_support_orders).toBeUndefined();

    const noPool = makeState();
    expect(stageMunicipalitySupportOrderOnState(noPool, {
      faction: 'RBiH',
      munId: 'tuzla',
      type: 'weapons_shipment',
    }).error).toBe('No RBiH militia pool found for municipality tuzla');
    expect(noPool.military.municipality_support_orders).toBeUndefined();
  });
});
