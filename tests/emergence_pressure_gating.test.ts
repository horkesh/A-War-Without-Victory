/**
 * Phase E1.1: Phase E pressure update gating tests.
 * - Calling in war phase runs exactly one phase-e-pressure-update per turn and report is present when edges exist.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 20,
            seed: 'gating-ii',
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
    political_controllers: { S1: 'RBiH', S2: 'RS' }
  } as any,
        displacement: {} as any
    };
}

test('phase_ii runTurn includes phase-e-pressure-update and runs exactly once per turn', async () => { // legacy-phase-term-ok
    const state = minimalPhaseIIState();
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { report } = await runTurn(state, { seed: 'gating-ii', settlementEdges: edges });
    const phaseNames = report.phases.map((p) => p.name);
    const count = phaseNames.filter((n) => n === 'phase-e-pressure-update').length;
    assert.strictEqual(count, 1, 'phase-e-pressure-update must run exactly once per turn in war phase path');
    assert.ok(report.phase_e_pressure_update !== undefined, 'phase_e_pressure_update report should be present');
    assert.strictEqual(typeof report.phase_e_pressure_update.applied, 'boolean');
    assert.strictEqual(typeof report.phase_e_pressure_update.stats.nodes_with_outflow, 'number');
});
