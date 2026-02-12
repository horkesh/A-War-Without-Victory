import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { OobBrigade } from '../src/scenario/oob_loader.js';
import { accrueRecruitmentResources, runOngoingRecruitment } from '../src/sim/recruitment_turn.js';
import { initializeRecruitmentResources } from '../src/sim/recruitment_engine.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

function makeState(): GameState {
  const poolKey = militiaPoolKey('zenica', 'RBiH');
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 4, seed: 'test', phase: 'phase_ii' },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 60, legitimacy: 60, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        embargo_profile: {
          heavy_equipment_access: 1,
          ammunition_resupply_rate: 1,
          maintenance_capacity: 1,
          smuggling_efficiency: 0,
          external_pipeline_status: 1
        }
      }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {
      [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 4 }
    },
    political_controllers: {
      s1: 'RBiH'
    },
    displacement_state: {
      zenica: {
        mun_id: 'zenica',
        original_population: 1000,
        displaced_out: 0,
        displaced_in: 0,
        lost_population: 0,
        last_updated_turn: 4
      }
    },
    production_facilities: {
      pf_zenica: {
        facility_id: 'pf_zenica',
        name: 'Zenica Foundry',
        municipality_id: 'zenica',
        type: 'heavy_equipment',
        base_capacity: 5,
        current_condition: 1,
        required_inputs: { electricity: true, raw_materials: true, skilled_labor: true }
      }
    },
    recruitment_state: initializeRecruitmentResources(
      ['RBiH'],
      { RBiH: 10 },
      { RBiH: 10 },
      { RBiH: 1 },
      { RBiH: 2 },
      1
    )
  };
}

describe('accrueRecruitmentResources', () => {
  test('accrues capital and equipment from trickle + production/population inputs', () => {
    const state = makeState();
    const settlements = new Map([
      [
        's1',
        {
          sid: 's1',
          name: 'S1',
          source_id: 's1',
          source: 'test',
          mun: 'zenica',
          mun_code: 'zenica',
          mun1990_id: 'zenica'
        }
      ]
    ]);
    const accrual = accrueRecruitmentResources(state, settlements, {
      schema: 1,
      turn: 4,
      by_municipality: [{ mun_id: 'zenica', capacity: 1, controlling_faction_id: 'RBiH' }]
    });
    assert.ok(accrual);
    assert.strictEqual(accrual!.by_faction.length, 1);
    assert.strictEqual(accrual!.by_faction[0]!.capital_delta, 2);
    assert.strictEqual(accrual!.by_faction[0]!.equipment_delta, 16);
    assert.strictEqual(state.recruitment_state!.recruitment_capital.RBiH.points, 12);
    assert.strictEqual(state.recruitment_state!.equipment_pools.RBiH.points, 26);
  });
});

describe('runOngoingRecruitment', () => {
  test('applies per-faction recruit cap deterministically', () => {
    const state = makeState();
    const brigades: OobBrigade[] = [
      {
        id: 'b1',
        faction: 'RBiH',
        name: 'B1',
        home_mun: 'zenica',
        kind: 'brigade',
        manpower_cost: 800,
        capital_cost: 10,
        default_equipment_class: 'light_infantry',
        priority: 1,
        mandatory: false,
        available_from: 0,
        max_personnel: 3000
      },
      {
        id: 'b2',
        faction: 'RBiH',
        name: 'B2',
        home_mun: 'zenica',
        kind: 'brigade',
        manpower_cost: 800,
        capital_cost: 10,
        default_equipment_class: 'light_infantry',
        priority: 2,
        mandatory: false,
        available_from: 0,
        max_personnel: 3000
      }
    ];
    const report = runOngoingRecruitment(
      state,
      [],
      brigades,
      new Map([['s1', 'zenica']]),
      { zenica: 's1' }
    );
    assert.ok(report);
    assert.strictEqual(report!.elective_recruited, 1);
    assert.strictEqual(report!.actions.length, 1);
    assert.ok(state.formations['b1'] || state.formations['b2']);
  });
});
