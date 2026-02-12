import assert from 'node:assert';
import { test, describe } from 'node:test';
import type { GameState, FormationState, MilitiaPoolState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { OobBrigade, OobCorps } from '../src/scenario/oob_loader.js';
import { RECRUITMENT_DEFAULTS } from '../src/state/recruitment_types.js';
import {
  initializeRecruitmentResources,
  recruitBrigade,
  applyRecruitment,
  runBotRecruitment,
  isEmergentFormationSuppressed
} from '../src/sim/recruitment_engine.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type { EquipmentClass } from '../src/state/recruitment_types.js';

function makeBrigade(overrides: Partial<OobBrigade> & Pick<OobBrigade, 'id' | 'faction' | 'name' | 'home_mun'>): OobBrigade {
  return {
    kind: 'brigade',
    ...RECRUITMENT_DEFAULTS,
    ...overrides
  };
}

function makeState(overrides?: Partial<GameState>): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'test' },
    factions: [
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: {},
    ...overrides
  };
}

describe('initializeRecruitmentResources', () => {
  test('creates default resources for all factions', () => {
    const resources = initializeRecruitmentResources(['RBiH', 'RS', 'HRHB']);
    assert.strictEqual(resources.recruitment_capital.RS.points, 250);
    assert.strictEqual(resources.recruitment_capital.RBiH.points, 150);
    assert.strictEqual(resources.recruitment_capital.HRHB.points, 100);
    assert.strictEqual(resources.equipment_pools.RS.points, 300);
    assert.strictEqual(resources.equipment_pools.RBiH.points, 60);
    assert.strictEqual(resources.equipment_pools.HRHB.points, 120);
  });

  test('allows scenario overrides', () => {
    const resources = initializeRecruitmentResources(
      ['RBiH', 'RS'],
      { RBiH: 200, RS: 300 },
      { RBiH: 100, RS: 400 }
    );
    assert.strictEqual(resources.recruitment_capital.RBiH.points, 200);
    assert.strictEqual(resources.recruitment_capital.RS.points, 300);
    assert.strictEqual(resources.equipment_pools.RBiH.points, 100);
    assert.strictEqual(resources.equipment_pools.RS.points, 400);
  });

  test('stores per-turn trickles and per-turn recruit cap', () => {
    const resources = initializeRecruitmentResources(
      ['RBiH', 'RS'],
      undefined,
      undefined,
      { RBiH: 2, RS: 1 },
      { RBiH: 3, RS: 4 },
      1
    );
    assert.strictEqual(resources.recruitment_capital_trickle?.RBiH, 2);
    assert.strictEqual(resources.equipment_points_trickle?.RS, 4);
    assert.strictEqual(resources.max_recruits_per_faction_per_turn, 1);
  });
});

describe('recruitBrigade', () => {
  test('succeeds when all resources available', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const hq: Record<string, string> = { zenica: 's1' };
    const resources = initializeRecruitmentResources(['RBiH']);
    const brigade = makeBrigade({
      id: 'arbih_7th_muslim',
      faction: 'RBiH',
      name: '7th Muslim',
      home_mun: 'zenica',
      default_equipment_class: 'mountain'
    });

    const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, hq);
    assert.strictEqual(result.success, true);
    assert.ok(result.formation);
    assert.strictEqual(result.formation!.name, '7th Muslim');
    assert.ok(result.formation!.composition);
    assert.strictEqual(result.formation!.composition!.artillery, 2); // mountain template
    assert.strictEqual(result.action!.equipment_spent, 5); // mountain cost
  });

  test('fails when no control', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RS' }, // RS controls, not RBiH
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH']);
    const brigade = makeBrigade({ id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica' });

    const result = recruitBrigade(state, brigade, 'light_infantry', resources, sidToMun, {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'no_control');
  });

  test('fails when not enough capital', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 5 }); // only 5 capital
    const brigade = makeBrigade({ id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica', capital_cost: 10 });

    const result = recruitBrigade(state, brigade, 'light_infantry', resources, sidToMun, {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'no_capital');
  });

  test('fails when not enough equipment', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 200 }, { RBiH: 3 }); // only 3 equipment
    const brigade = makeBrigade({
      id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica',
      default_equipment_class: 'mountain' // costs 5
    });

    const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'no_equipment');
  });
});

describe('applyRecruitment', () => {
  test('deducts resources and creates formation', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH']);
    const brigade = makeBrigade({
      id: 'arbih_7th',
      faction: 'RBiH',
      name: '7th Muslim',
      home_mun: 'zenica',
      default_equipment_class: 'mountain'
    });

    const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, { zenica: 's1' });
    assert.strictEqual(result.success, true);

    applyRecruitment(state, result, resources);

    // Check formation created
    assert.ok(state.formations!['arbih_7th']);
    assert.strictEqual(state.formations!['arbih_7th'].name, '7th Muslim');

    // Check resources deducted
    assert.strictEqual(resources.recruitment_capital.RBiH.points, 150 - 10); // default capital_cost
    assert.strictEqual(resources.equipment_pools.RBiH.points, 60 - 5); // mountain cost
    assert.strictEqual(state.militia_pools![poolKey]!.available, 2000 - 800); // default manpower_cost

    // Check tracking
    assert.ok(resources.recruited_brigade_ids.includes('arbih_7th'));
  });
});

describe('runBotRecruitment', () => {
  test('recruits brigades for faction with available resources', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH']);
    const corps: OobCorps[] = [];
    const brigades: OobBrigade[] = [
      makeBrigade({ id: 'b1', faction: 'RBiH', name: 'First', home_mun: 'zenica', priority: 1 }),
      makeBrigade({ id: 'b2', faction: 'RBiH', name: 'Second', home_mun: 'zenica', priority: 2 }),
      makeBrigade({ id: 'b3', faction: 'RBiH', name: 'Third', home_mun: 'zenica', priority: 3 })
    ];

    const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

    assert.strictEqual(report.elective_recruited, 3);
    assert.ok(state.formations!['b1']);
    assert.ok(state.formations!['b2']);
    assert.ok(state.formations!['b3']);
  });

  test('mandatory brigades are recruited at zero cost', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 }); // zero capital/equip
    const corps: OobCorps[] = [];
    const brigades: OobBrigade[] = [
      makeBrigade({
        id: 'b1', faction: 'RBiH', name: 'Mandatory Unit', home_mun: 'zenica',
        mandatory: true, default_equipment_class: 'mechanized'
      })
    ];

    const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

    assert.strictEqual(report.mandatory_recruited, 1);
    assert.ok(state.formations!['b1']);
    // Capital and equipment should not have been charged
    assert.strictEqual(resources.recruitment_capital.RBiH.points, 0);
    assert.strictEqual(resources.equipment_pools.RBiH.points, 0);
  });

  test('bot downgrades equipment when points scarce', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    // Only 3 equipment points -- not enough for mountain (5) or motorized (20)
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 100 }, { RBiH: 3 });
    const corps: OobCorps[] = [];
    const brigades: OobBrigade[] = [
      makeBrigade({
        id: 'b1', faction: 'RBiH', name: 'Motor Unit', home_mun: 'zenica',
        default_equipment_class: 'motorized' // costs 20, should downgrade
      })
    ];

    const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

    assert.strictEqual(report.elective_recruited, 1);
    // Should have been downgraded to light_infantry (cost 0)
    const action = report.actions.find(a => a.brigade_id === 'b1');
    assert.ok(action);
    assert.strictEqual(action!.equipment_class, 'light_infantry');
    assert.strictEqual(action!.equipment_spent, 0);
  });

  test('respects available_from turn gate', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      meta: { turn: 4, seed: 'test' },
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 4 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 200 }, { RBiH: 100 });
    const report = runBotRecruitment(
      state,
      [],
      [
        makeBrigade({ id: 'b_early', faction: 'RBiH', name: 'Early', home_mun: 'zenica', available_from: 0, priority: 1 }),
        makeBrigade({ id: 'b_late', faction: 'RBiH', name: 'Late', home_mun: 'zenica', available_from: 8, priority: 2 })
      ],
      resources,
      sidToMun,
      { zenica: 's1' }
    );
    assert.ok(state.formations['b_early']);
    assert.ok(!state.formations['b_late']);
    assert.strictEqual(report.elective_recruited, 1);
  });

  test('respects per-faction elective recruit cap', () => {
    const poolKey = militiaPoolKey('zenica', 'RBiH');
    const state = makeState({
      political_controllers: { s1: 'RBiH' },
      militia_pools: {
        [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 10000, committed: 0, exhausted: 0, updated_turn: 0 }
      }
    });
    const sidToMun = new Map([['s1', 'zenica']]);
    const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 500 }, { RBiH: 500 });
    const report = runBotRecruitment(
      state,
      [],
      [
        makeBrigade({ id: 'b1', faction: 'RBiH', name: 'One', home_mun: 'zenica', priority: 1 }),
        makeBrigade({ id: 'b2', faction: 'RBiH', name: 'Two', home_mun: 'zenica', priority: 2 }),
        makeBrigade({ id: 'b3', faction: 'RBiH', name: 'Three', home_mun: 'zenica', priority: 3 })
      ],
      resources,
      sidToMun,
      { zenica: 's1' },
      { includeCorps: false, includeMandatory: false, maxElectivePerFaction: 1 }
    );
    assert.strictEqual(report.elective_recruited, 1);
    assert.strictEqual(report.actions.length, 1);
  });
});

describe('isEmergentFormationSuppressed', () => {
  test('returns false when no recruitment state', () => {
    const state = makeState();
    assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RBiH'), false);
  });

  test('returns true when recruited brigade exists in municipality', () => {
    const state = makeState({
      formations: {
        b1: {
          id: 'b1', faction: 'RBiH', name: 'Test', created_turn: 0,
          status: 'active', assignment: null, kind: 'brigade',
          tags: ['mun:zenica']
        }
      },
      recruitment_state: {
        recruitment_capital: {},
        equipment_pools: {},
        recruited_brigade_ids: ['b1']
      }
    });
    assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RBiH'), true);
    assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RS'), false);
    assert.strictEqual(isEmergentFormationSuppressed(state, 'tuzla', 'RBiH'), false);
  });
});
