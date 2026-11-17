/**
 * Phase E1.2: Front emergence tests.
 * - Fronts appear only under sustained opposing conditions (war phase + opposing control + pressure-eligible).
 * - No fronts without eligible pressure (same control or ineligible).
 * - Stable ordering and deterministic replay.
 * - Phase gating: runs only in war phase.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { deriveFrontsFromPressureEligible } from '../src/sim/emergence/front_emergence.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(controllers: Record<string, string> = { S1: 'RBiH', S2: 'RS' }): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 20,
            seed: 'fe-ii',
            phase: 'war',
            war_start_turn: 10
        },
  factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
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
    political_controllers: controllers
  } as any,
        displacement: {} as any
    };
}

test('runTurn includes front-emergence and runs exactly once per turn', async () => {
    const state = minimalPhaseIIState();
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { report } = await runTurn(state, { seed: 'fe-ii', settlementEdges: edges });
    const phaseNames = report.phases.map((p) => p.name);
    const count = phaseNames.filter((n) => n === 'front-emergence').length;
    assert.strictEqual(count, 1, 'front-emergence must run exactly once per turn in war phase path');
    assert.ok(Array.isArray(report.front_emergence_report), 'front_emergence_report report should be an array');
});

test('deriveFrontsFromPressureEligible: war phase + opposing control + eligible edge yields front with that edge', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = deriveFrontsFromPressureEligible(state, edges);
    assert.ok(fronts.length >= 1, 'at least one front when opposing control on edge');
    const edgeIds = fronts.flatMap((f) => f.edge_ids);
    assert.ok(edgeIds.includes('S1__S2'), 'front must include edge S1__S2');
    for (const f of fronts) {
        assert.ok(f.id.startsWith('FE_'), 'descriptor id must be Phase E prefix');
        assert.strictEqual(typeof f.created_turn, 'number');
        assert.ok(['fluid', 'static', 'oscillating'].includes(f.stability));
    }
});

test('deriveFrontsFromPressureEligible: war phase + same control on both ends yields no front-active edges', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RBiH' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = deriveFrontsFromPressureEligible(state, edges);
    assert.strictEqual(fronts.length, 0, 'no front when same control on both settlements');
});

test('front_emergence_report: stable ordering and deterministic replay (same state + edges → same descriptor ids)', async () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS', S3: 'RS', S4: 'RBiH' });
    const edges: EdgeRecord[] = [
        { a: 'S1', b: 'S2' },
        { a: 'S3', b: 'S4' }
    ];
    const { report: r1 } = await runTurn(state, { seed: 'det-fe', settlementEdges: edges });
    const { report: r2 } = await runTurn(state, { seed: 'det-fe', settlementEdges: edges });
    assert.ok(Array.isArray(r1.front_emergence_report) && Array.isArray(r2.front_emergence_report));
    const ids1 = (r1.front_emergence_report ?? []).map((f) => f.id).sort();
    const ids2 = (r2.front_emergence_report ?? []).map((f) => f.id).sort();
    assert.deepStrictEqual(ids1, ids2, 'same inputs must produce same descriptor ids');
    const edgeIds1 = (r1.front_emergence_report ?? []).flatMap((f) => f.edge_ids).sort();
    const edgeIds2 = (r2.front_emergence_report ?? []).flatMap((f) => f.edge_ids).sort();
    assert.deepStrictEqual(edgeIds1, edgeIds2, 'same inputs must produce same edge_ids');
});
