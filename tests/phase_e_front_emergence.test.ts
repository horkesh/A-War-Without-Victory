/**
 * Phase E1.2: Front emergence tests.
 * - Fronts appear only under sustained opposing conditions (phase_ii + opposing control + pressure-eligible).
 * - No fronts without eligible pressure (same control or ineligible).
 * - Stable ordering and deterministic replay.
 * - Phase gating: runs only in phase_ii.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runTurn } from '../src/sim/turn_pipeline.js';
import { derivePhaseIIFrontsFromPressureEligible } from '../src/sim/phase_e/front_emergence.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function minimalPhaseIState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'fe-gate-i',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
      { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } }
  };
}

function minimalPhaseIIState(controllers: Record<string, string> = { S1: 'RBiH', S2: 'RS' }): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 20,
      seed: 'fe-ii',
      phase: 'phase_ii',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: controllers
  };
}

test('phase_i runTurn does not run phase-ii-front-emergence (Phase I path has no Phase II front step)', async () => {
  const state = minimalPhaseIState();
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];
  const { report } = await runTurn(state, { seed: 'fe-gate-i', settlementEdges: edges });
  const phaseNames = report.phases.map((p) => p.name);
  assert.ok(!phaseNames.includes('phase-ii-front-emergence'), 'Phase I path must not include phase-ii-front-emergence');
  assert.strictEqual(report.phase_ii_front_emergence, undefined);
});

test('phase_ii runTurn includes phase-ii-front-emergence and runs exactly once per turn', async () => {
  const state = minimalPhaseIIState();
  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const { report } = await runTurn(state, { seed: 'fe-ii', settlementEdges: edges });
  const phaseNames = report.phases.map((p) => p.name);
  const count = phaseNames.filter((n) => n === 'phase-ii-front-emergence').length;
  assert.strictEqual(count, 1, 'phase-ii-front-emergence must run exactly once per turn in phase_ii path');
  assert.ok(Array.isArray(report.phase_ii_front_emergence), 'phase_ii_front_emergence report should be an array');
});

test('derivePhaseIIFrontsFromPressureEligible: phase_i returns empty array', () => {
  const state = minimalPhaseIState();
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];
  const fronts = derivePhaseIIFrontsFromPressureEligible(state, edges);
  assert.deepStrictEqual(fronts, []);
});

test('derivePhaseIIFrontsFromPressureEligible: phase_ii + opposing control + eligible edge yields front with that edge', () => {
  const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const fronts = derivePhaseIIFrontsFromPressureEligible(state, edges);
  assert.ok(fronts.length >= 1, 'at least one front when opposing control on edge');
  const edgeIds = fronts.flatMap((f) => f.edge_ids);
  assert.ok(edgeIds.includes('S1__S2'), 'front must include edge S1__S2');
  for (const f of fronts) {
    assert.ok(f.id.startsWith('FE_'), 'descriptor id must be Phase E prefix');
    assert.strictEqual(typeof f.created_turn, 'number');
    assert.ok(['fluid', 'static', 'oscillating'].includes(f.stability));
  }
});

test('derivePhaseIIFrontsFromPressureEligible: phase_ii + same control on both ends yields no front-active edges', () => {
  const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RBiH' });
  const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
  const fronts = derivePhaseIIFrontsFromPressureEligible(state, edges);
  assert.strictEqual(fronts.length, 0, 'no front when same control on both settlements');
});

test('phase_ii_front_emergence: stable ordering and deterministic replay (same state + edges → same descriptor ids)', async () => {
  const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS', S3: 'RS', S4: 'RBiH' });
  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S2' },
    { a: 'S3', b: 'S4' }
  ];
  const { report: r1 } = await runTurn(state, { seed: 'det-fe', settlementEdges: edges });
  const { report: r2 } = await runTurn(state, { seed: 'det-fe', settlementEdges: edges });
  assert.ok(Array.isArray(r1.phase_ii_front_emergence) && Array.isArray(r2.phase_ii_front_emergence));
  const ids1 = (r1.phase_ii_front_emergence ?? []).map((f) => f.id).sort();
  const ids2 = (r2.phase_ii_front_emergence ?? []).map((f) => f.id).sort();
  assert.deepStrictEqual(ids1, ids2, 'same inputs must produce same descriptor ids');
  const edgeIds1 = (r1.phase_ii_front_emergence ?? []).flatMap((f) => f.edge_ids).sort();
  const edgeIds2 = (r2.phase_ii_front_emergence ?? []).flatMap((f) => f.edge_ids).sort();
  assert.deepStrictEqual(edgeIds1, edgeIds2, 'same inputs must produce same edge_ids');
});
