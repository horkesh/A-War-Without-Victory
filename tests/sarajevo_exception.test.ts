import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { updateSarajevoState } from '../src/state/sarajevo_exception.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

test('updateSarajevoState derives siege status from OSID supply — adequate', () => {
    const state: GameState = {
  schema_version: 1,
  meta: { turn: 12, seed: 'sarajevo-test', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
        'op:centar_sarajevo:radava': 'RBiH',
        'op:centar_sarajevo:sarajevo_dio_centar_sajarevo': 'RBiH'
    }
  } as any,
        displacement: {} as any
    };

    const supplyByOsid: SupplyStateByOsidReport = {
        schema: 1,
        turn: 12,
        factions: [
            {
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:centar_sarajevo:radava', state: 'adequate' },
                    { osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', state: 'adequate' }
                ]
            }
        ]
    };

    const sarajevo = updateSarajevoState(state, supplyByOsid);
    assert.strictEqual(sarajevo.siege_status, 'OPEN');
    assert.strictEqual(sarajevo.internal_supply, 1);
    assert.strictEqual(sarajevo.settlement_ids.length, 2);
});

test('updateSarajevoState derives BESIEGED when supply is critical', () => {
    const state: GameState = {
  schema_version: 1,
  meta: { turn: 12, seed: 'sarajevo-test', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
        'op:centar_sarajevo:radava': 'RBiH',
        'op:novo_sarajevo:lukavica': 'RBiH'
    }
  } as any,
        displacement: {} as any
    };

    const supplyByOsid: SupplyStateByOsidReport = {
        schema: 1,
        turn: 12,
        factions: [
            {
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:centar_sarajevo:radava', state: 'critical' },
                    { osid: 'op:novo_sarajevo:lukavica', state: 'critical' }
                ]
            }
        ]
    };

    const sarajevo = updateSarajevoState(state, supplyByOsid);
    assert.strictEqual(sarajevo.siege_status, 'BESIEGED');
    assert.strictEqual(sarajevo.internal_supply, 0);
});

test('updateSarajevoState derives PARTIAL when supply is strained', () => {
    const state: GameState = {
  schema_version: 1,
  meta: { turn: 12, seed: 'sarajevo-test', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
        'op:centar_sarajevo:radava': 'RBiH'
    }
  } as any,
        displacement: {} as any
    };

    const supplyByOsid: SupplyStateByOsidReport = {
        schema: 1,
        turn: 12,
        factions: [
            {
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:centar_sarajevo:radava', state: 'strained' }
                ]
            }
        ]
    };

    const sarajevo = updateSarajevoState(state, supplyByOsid);
    assert.strictEqual(sarajevo.siege_status, 'PARTIAL');
    assert.strictEqual(sarajevo.internal_supply, 0.5);
});

test('updateSarajevoState returns BESIEGED when no supply report', () => {
    const state: GameState = {
  schema_version: 1,
  meta: { turn: 5, seed: 'sarajevo-test', phase: 'war' },
  factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
        'op:centar_sarajevo:radava': 'RBiH'
    }
  } as any,
        displacement: {} as any
    };

    const sarajevo = updateSarajevoState(state, undefined);
    assert.strictEqual(sarajevo.siege_status, 'BESIEGED');
    assert.strictEqual(sarajevo.internal_supply, 0);
});
