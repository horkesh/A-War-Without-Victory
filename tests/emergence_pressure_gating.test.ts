/**
 * Phase E1.1: Phase E pressure update gating tests.
 * - Calling sim pipeline in peace phase does not run Phase E pressure update (no phase_e_pressure_update effect).
 * - Calling in war phase runs exactly one phase-e-pressure-update per turn and report is present when edges exist.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPeaceState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'gating-i',
            phase: 'peace',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 5 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: { MUN_A: { RBiH: 30, RS: 60, HRHB: 10 }, MUN_B: { RBiH: 25, RS: 70, HRHB: 5 } }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
}

function minimalPhaseIIState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 20,
            seed: 'gating-ii',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
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

test('peace runTurn is rejected (war pipeline only)', async () => {
    const state = minimalPeaceState();
    const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];
    await assert.rejects(
        () => runTurn(state, { seed: 'gating-i', settlementEdges: edges }),
        /unsupported lifecycle phase "peace"; expected 'war'/
    );
});

test('phase_ii runTurn includes phase-e-pressure-update and runs exactly once per turn', async () => {
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
