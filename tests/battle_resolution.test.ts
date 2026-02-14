/**
 * Tests for Phase II battle resolution engine.
 * Covers: combat power, terrain, casualties, outcomes, snap events, casualty ledger, determinism.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState, FormationState, FactionId, FormationId, SettlementId } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData, TerrainScalars } from '../src/map/terrain_scalars.js';
import { resolveBattleOrders, computeTerrainModifier } from '../src/sim/phase_ii/battle_resolution.js';
import { resolveAttackOrders } from '../src/sim/phase_ii/resolve_attack_orders.js';
import { initializeCasualtyLedger, getFactionTotalCasualties } from '../src/state/casualty_ledger.js';

// --- Helpers ---

function makeFormation(overrides: Partial<FormationState> & { id: string; faction: string }): FormationState {
  return {
    name: overrides.id,
    created_turn: 0,
    status: 'active',
    assignment: null,
    personnel: 2000,
    readiness: 'active',
    cohesion: 70,
    experience: 0.5,
    posture: 'attack',
    composition: {
      infantry: 800,
      tanks: 10,
      artillery: 8,
      aa_systems: 2,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    },
    ...overrides
  };
}

function makeEdges(): EdgeRecord[] {
  return [
    { a: 'S1', b: 'S2' },
    { a: 'S2', b: 'S3' },
    { a: 'S3', b: 'S4' },
    { a: 'S1', b: 'S3' }
  ];
}

function makeTerrain(overrides: Partial<Record<string, Partial<TerrainScalars>>>): TerrainScalarsData {
  const bySid: Record<string, TerrainScalars> = {};
  for (const [sid, vals] of Object.entries(overrides)) {
    bySid[sid] = {
      road_access_index: vals?.road_access_index ?? 0.5,
      river_crossing_penalty: vals?.river_crossing_penalty ?? 0,
      elevation_mean_m: vals?.elevation_mean_m ?? 200,
      elevation_stddev_m: vals?.elevation_stddev_m ?? 10,
      slope_index: vals?.slope_index ?? 0.1,
      terrain_friction_index: vals?.terrain_friction_index ?? 0.1
    };
  }
  return { by_sid: bySid };
}

function makeState(
  formations: Record<FormationId, FormationState>,
  pc: Record<SettlementId, FactionId>,
  aor: Record<SettlementId, FormationId | null>,
  orders: Record<FormationId, SettlementId>
): GameState {
  return {
    schema_version: 1,
    meta: { turn: 10, seed: 'test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations,
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: pc,
    brigade_aor: aor,
    brigade_attack_orders: orders
  };
}

// --- Tests ---

test('battle resolution: attacker wins on open terrain with superior force', () => {
  const attacker = makeFormation({
    id: 'F_RS_0001', faction: 'RS',
    personnel: 2500, posture: 'attack',
    composition: {
      infantry: 800, tanks: 40, artillery: 30, aa_systems: 5,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    }
  });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH',
    personnel: 1500, posture: 'defend',
    composition: {
      infantry: 950, tanks: 3, artillery: 8, aa_systems: 1,
      tank_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 },
      artillery_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 }
    }
  });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH', 'S3': 'RS' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001', 'S3': 'F_RS_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges = makeEdges();
  const terrain = makeTerrain({ 'S2': { slope_index: 0.1, river_crossing_penalty: 0 } });
  const munMap = new Map([['S1', 'test_mun'], ['S2', 'test_mun'], ['S3', 'test_mun']]);

  const report = resolveBattleOrders(state, edges, terrain, munMap);

  assert.strictEqual(report.battles_fought, 1);
  assert.strictEqual(report.flips_applied, 1);
  assert.strictEqual(report.battles[0].outcome === 'attacker_victory' || report.battles[0].outcome === 'pyrrhic_victory', true);
  assert.strictEqual(report.battles[0].settlement_flipped, true);
  assert.strictEqual(state.political_controllers!['S2'], 'RS');

  // Both sides took casualties
  assert.ok(report.total_attacker_casualties.killed + report.total_attacker_casualties.wounded > 0);
  assert.ok(report.total_defender_casualties.killed + report.total_defender_casualties.wounded > 0);
});

test('battle resolution: defender holds with terrain advantage', () => {
  const attacker = makeFormation({
    id: 'F_RS_0001', faction: 'RS',
    personnel: 1800, posture: 'attack',
    composition: {
      infantry: 800, tanks: 15, artillery: 10, aa_systems: 2,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    }
  });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH',
    personnel: 1800, posture: 'defend',
    cohesion: 80,
    composition: {
      infantry: 950, tanks: 3, artillery: 8, aa_systems: 1,
      tank_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 },
      artillery_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 }
    }
  });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  // Defender has strong terrain: river + mountain + friction
  const terrain = makeTerrain({
    'S2': { slope_index: 0.8, river_crossing_penalty: 0.7, terrain_friction_index: 0.6 }
  });
  const munMap = new Map([['S1', 'test_mun'], ['S2', 'test_mun']]);

  const report = resolveBattleOrders(state, edges, terrain, munMap);

  assert.strictEqual(report.battles_fought, 1);
  // With heavy terrain bonuses, roughly equal forces → defender should hold
  assert.strictEqual(report.battles[0].settlement_flipped, false);
  assert.ok(report.battles[0].outcome === 'stalemate' || report.battles[0].outcome === 'defender_victory');
});

test('battle resolution: terrain modifier computation', () => {
  const terrain = makeTerrain({
    'S_river': { river_crossing_penalty: 1.0, slope_index: 0, terrain_friction_index: 0, road_access_index: 1.0 },
    'S_mountain': { river_crossing_penalty: 0, slope_index: 1.0, terrain_friction_index: 0.8, road_access_index: 0.2 }
  });
  const munMap = new Map<string, string>([['S_river', 'test_mun'], ['S_mountain', 'test_mun']]);

  const riverTerrain = computeTerrainModifier(terrain, 'S_river', munMap);
  // River: 1.0 * 0.40 = 0.40 bonus, road = 0.85 + 0.15*1.0 = 1.0
  assert.ok(riverTerrain.river_crossing_penalty > 0.3);
  assert.ok(riverTerrain.composite > 1.0);

  const mountainTerrain = computeTerrainModifier(terrain, 'S_mountain', munMap);
  // Slope: 1.0 * 0.30 = 0.30, friction: 0.8 * 0.20 = 0.16, road: 0.85 + 0.15*0.2 = 0.88
  assert.ok(mountainTerrain.elevation_advantage > 0.2);
  assert.ok(mountainTerrain.terrain_friction_bonus > 0.1);
  // Composite = (1 + 0.30 + 0.16) * 0.88 ≈ 1.28
  assert.ok(mountainTerrain.composite > 1.2);
});

test('battle resolution: urban defense bonus for Sarajevo', () => {
  const terrain = makeTerrain({
    'S_sarajevo': { river_crossing_penalty: 0.3, slope_index: 0.4, terrain_friction_index: 0.3, road_access_index: 0.8 }
  });
  // Map to Sarajevo core municipality
  const munMap = new Map([['S_sarajevo', 'centar_sarajevo']]);
  const mod = computeTerrainModifier(terrain, 'S_sarajevo', munMap);
  assert.strictEqual(mod.urban_defense_bonus, 0.40);
  assert.ok(mod.composite > 1.4); // Should be substantial with urban + river + slope
});

test('battle resolution: casualty ledger tracks cumulative losses', () => {
  const attacker = makeFormation({
    id: 'F_RS_0001', faction: 'RS', personnel: 2500, posture: 'attack',
    composition: {
      infantry: 800, tanks: 40, artillery: 30, aa_systems: 5,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    }
  });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1500, posture: 'defend',
    composition: {
      infantry: 950, tanks: 3, artillery: 8, aa_systems: 1,
      tank_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 },
      artillery_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 }
    }
  });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const terrain = makeTerrain({});
  const munMap = new Map([['S1', 'test_mun'], ['S2', 'test_mun']]);

  resolveBattleOrders(state, edges, terrain, munMap);

  // Casualty ledger should exist and have entries
  assert.ok(state.casualty_ledger);
  const rsTotal = getFactionTotalCasualties(state.casualty_ledger!, 'RS');
  const rbihTotal = getFactionTotalCasualties(state.casualty_ledger!, 'RBiH');
  assert.ok(rsTotal > 0, `RS should have casualties, got ${rsTotal}`);
  assert.ok(rbihTotal > 0, `RBiH should have casualties, got ${rbihTotal}`);

  // Check per-formation tracking
  const rsLedger = state.casualty_ledger!['RS'];
  assert.ok(rsLedger.per_formation['F_RS_0001']);
  assert.ok(rsLedger.per_formation['F_RS_0001'].killed >= 0);
});

test('battle resolution: equipment losses reduce brigade composition', () => {
  const attacker = makeFormation({
    id: 'F_RS_0001', faction: 'RS', personnel: 2500, posture: 'attack',
    composition: {
      infantry: 800, tanks: 40, artillery: 30, aa_systems: 5,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    }
  });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 2000, posture: 'defend',
    composition: {
      infantry: 950, tanks: 10, artillery: 15, aa_systems: 2,
      tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
      artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 }
    }
  });

  const startAttackerTanks = 40;
  const startDefenderTanks = 10;

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x']]));

  // After battle, equipment should be reduced or same (tanks may be lost)
  const aTanks = state.formations['F_RS_0001'].composition!.tanks;
  const dTanks = state.formations['F_RBiH_0001'].composition!.tanks;
  assert.ok(aTanks <= startAttackerTanks, `Attacker tanks should not increase: ${aTanks}`);
  assert.ok(dTanks <= startDefenderTanks, `Defender tanks should not increase: ${dTanks}`);
});

test('battle resolution: undefended settlement falls with minimal casualties', () => {
  const attacker = makeFormation({ id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack' });

  const state = makeState(
    { 'F_RS_0001': attacker },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const report = resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x']]));

  assert.strictEqual(report.battles_fought, 1);
  assert.strictEqual(report.flips_applied, 1);
  assert.strictEqual(state.political_controllers!['S2'], 'RS');
  // Minimal attacker casualties for undefended
  assert.ok(report.total_attacker_casualties.killed + report.total_attacker_casualties.wounded <= 5);
  // Rear-cleanup / undefended: defender side still gets tracked casualties (militia/rear security)
  const defenderTotal = report.total_defender_casualties.killed + report.total_defender_casualties.wounded;
  assert.ok(defenderTotal >= 1, `undefended defender should have at least 1 casualty tracked, got ${defenderTotal}`);
});

test('battle resolution: determinism — identical inputs produce identical outputs', () => {
  const makeTestState = () => {
    const attacker = makeFormation({
      id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack',
      composition: {
        infantry: 800, tanks: 20, artillery: 15, aa_systems: 3,
        tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
      }
    });
    const defender = makeFormation({
      id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1800, posture: 'defend',
      composition: {
        infantry: 950, tanks: 5, artillery: 10, aa_systems: 1,
        tank_condition: { operational: 0.7, degraded: 0.2, non_operational: 0.1 },
        artillery_condition: { operational: 0.7, degraded: 0.2, non_operational: 0.1 }
      }
    });
    return makeState(
      { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
      { 'S1': 'RS', 'S2': 'RBiH' },
      { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
      { 'F_RS_0001': 'S2' }
    );
  };

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const terrain = makeTerrain({ 'S2': { slope_index: 0.3, river_crossing_penalty: 0.2 } });
  const munMap = new Map([['S1', 'test_mun'], ['S2', 'test_mun']]);

  const state1 = makeTestState();
  const report1 = resolveBattleOrders(state1, edges, terrain, munMap);

  const state2 = makeTestState();
  const report2 = resolveBattleOrders(state2, edges, terrain, munMap);

  assert.deepStrictEqual(report1.battles_fought, report2.battles_fought);
  assert.deepStrictEqual(report1.flips_applied, report2.flips_applied);
  assert.deepStrictEqual(report1.total_attacker_casualties, report2.total_attacker_casualties);
  assert.deepStrictEqual(report1.total_defender_casualties, report2.total_defender_casualties);
  assert.strictEqual(report1.battles[0].outcome, report2.battles[0].outcome);
  assert.strictEqual(report1.battles[0].power_ratio, report2.battles[0].power_ratio);
});

test('battle resolution: backward compatibility via resolveAttackOrders wrapper', () => {
  const attacker = makeFormation({
    id: 'F_RS_0001', faction: 'RS', personnel: 2500, posture: 'attack',
    composition: {
      infantry: 800, tanks: 40, artillery: 30, aa_systems: 5,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    }
  });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1500, posture: 'defend'
  });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];

  // Call without terrain (backward compat)
  const report = resolveAttackOrders(state, edges);

  assert.ok(typeof report.orders_processed === 'number');
  assert.ok(typeof report.casualty_attacker === 'number');
  assert.ok(typeof report.casualty_defender === 'number');
  assert.ok(Array.isArray(report.details));
  assert.ok(report.battle_report); // New field present
  assert.ok(report.battle_report!.battles.length > 0);
});

test('battle resolution: snap event — ammo crisis when unsupplied 4+ turns', () => {
  const attacker = makeFormation({ id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack' });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 2000, posture: 'defend',
    cohesion: 60,
    ops: { last_supplied_turn: 5 } as any // turn 10 - 5 = 5 turns unsupplied
  });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const report = resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x']]));

  const battle = report.battles[0];
  const ammoCrisis = battle.snap_events.find(e => e.type === 'ammo_crisis');
  assert.ok(ammoCrisis, 'ammo_crisis snap event should fire');
});

test('battle resolution: snap event — last stand when surrounded with cohesion >= 40', () => {
  const attacker = makeFormation({ id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack' });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1500, posture: 'defend',
    cohesion: 60
  });

  // S2 is surrounded by RS-controlled S1, S3, S4
  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH', 'S3': 'RS', 'S4': 'RS' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001', 'S3': 'F_RS_0001', 'S4': 'F_RS_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S2' },
    { a: 'S2', b: 'S3' },
    { a: 'S2', b: 'S4' }
  ];
  const report = resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x'], ['S3', 'x'], ['S4', 'x']]));

  const battle = report.battles[0];
  const lastStand = battle.snap_events.find(e => e.type === 'last_stand');
  assert.ok(lastStand, 'last_stand snap event should fire when surrounded with cohesion >= 40');
});

test('battle resolution: snap event — surrender cascade when surrounded + low cohesion + unsupplied', () => {
  const attacker = makeFormation({ id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack' });
  const defender = makeFormation({
    id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1500, posture: 'defend',
    cohesion: 10, // below 15
    ops: { last_supplied_turn: 7 } as any // turn 10 - 7 = 3 turns unsupplied (>=2)
  });

  // S2 surrounded
  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH', 'S3': 'RS' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001', 'S3': 'F_RS_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' }];
  const report = resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x'], ['S3', 'x']]));

  const battle = report.battles[0];
  const surrender = battle.snap_events.find(e => e.type === 'surrender_cascade');
  assert.ok(surrender, 'surrender_cascade snap event should fire');
  // Large number of captured
  assert.ok(battle.casualties.defender.missing_captured > battle.casualties.defender.killed,
    'In surrender, captured should exceed killed');
});

test('battle resolution: no attack orders → no battles', () => {
  const state = makeState({}, {}, {}, {});
  const report = resolveBattleOrders(state, [], makeTerrain({}), new Map());
  assert.strictEqual(report.battles_fought, 0);
  assert.strictEqual(report.flips_applied, 0);
});

test('casualty ledger: initialize and accumulate', () => {
  const ledger = initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']);

  assert.ok(ledger['RS']);
  assert.ok(ledger['RBiH']);
  assert.ok(ledger['HRHB']);
  assert.strictEqual(ledger['RS'].killed, 0);
  assert.strictEqual(getFactionTotalCasualties(ledger, 'RS'), 0);
});

test('battle resolution: battle report contains all expected fields', () => {
  const attacker = makeFormation({ id: 'F_RS_0001', faction: 'RS', personnel: 2000, posture: 'attack' });
  const defender = makeFormation({ id: 'F_RBiH_0001', faction: 'RBiH', personnel: 1500, posture: 'defend' });

  const state = makeState(
    { 'F_RS_0001': attacker, 'F_RBiH_0001': defender },
    { 'S1': 'RS', 'S2': 'RBiH' },
    { 'S1': 'F_RS_0001', 'S2': 'F_RBiH_0001' },
    { 'F_RS_0001': 'S2' }
  );

  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const report = resolveBattleOrders(state, edges, makeTerrain({}), new Map([['S1', 'x'], ['S2', 'x']]));
  const b = report.battles[0];

  // Structural checks
  assert.strictEqual(b.turn, 10);
  assert.strictEqual(b.attacker_brigade, 'F_RS_0001');
  assert.strictEqual(b.defender_brigade, 'F_RBiH_0001');
  assert.strictEqual(b.attacker_faction, 'RS');
  assert.strictEqual(b.defender_faction, 'RBiH');
  assert.strictEqual(b.location, 'S2');
  assert.ok(b.attacker_power.total_combat_power > 0);
  assert.ok(b.defender_power!.total_combat_power > 0);
  assert.ok(typeof b.power_ratio === 'number');
  assert.ok(['attacker_victory', 'defender_victory', 'stalemate', 'pyrrhic_victory'].includes(b.outcome));
  assert.ok(typeof b.terrain_modifiers.composite === 'number');
  assert.ok(Array.isArray(b.snap_events));

  // Casualty breakdown has all categories
  assert.ok(typeof b.casualties.attacker.killed === 'number');
  assert.ok(typeof b.casualties.attacker.wounded === 'number');
  assert.ok(typeof b.casualties.attacker.missing_captured === 'number');
  assert.ok(typeof b.casualties.attacker.tanks_lost === 'number');
  assert.ok(typeof b.casualties.attacker.artillery_lost === 'number');
});
