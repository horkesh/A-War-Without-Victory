/**
 * Phase F Step 5: Capacity consequences (read-only hooks) tests.
 * - Hooks return [0, 1] capacity factors; deterministic.
 * - No control flips (hooks do not touch political_controllers).
 */

import { expect, test } from 'vitest';
import {
    buildDisplacementCapacityReport,
    getMunicipalityDisplacementFactor,
    getSettlementDisplacementFactor
} from '../src/sim/displacement_pipeline/displacement_capacity_hooks.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 25,
            seed: 'pf-cap',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
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
  displacement: {
    settlement_displacement: { S1: 0.2, S2: 0.5 },
    municipality_displacement: { MUN_A: 0.3 }
  } as any,
};
}

test('getMunicipalityDisplacementFactor returns 1 - displacement in [0, 1]', () => {
    const state = minimalPhaseIIState();
    expect(getMunicipalityDisplacementFactor(state, 'MUN_A')).toBe(0.7);
    expect(getMunicipalityDisplacementFactor(state, 'MUN_ABSENT')).toBe(1);
});

test('getSettlementDisplacementFactor returns 1 - displacement in [0, 1]', () => {
    const state = minimalPhaseIIState();
    expect(getSettlementDisplacementFactor(state, 'S1')).toBe(0.8);
    expect(getSettlementDisplacementFactor(state, 'S2')).toBe(0.5);
    expect(getSettlementDisplacementFactor(state, 'S_ABSENT')).toBe(1);
});

test('buildDisplacementCapacityReport: deterministic and no control flips', () => {
    const state = minimalPhaseIIState();
    const report = buildDisplacementCapacityReport(state);
    expect(report.municipalities_affected.includes('MUN_A')).toBeTruthy();
    expect(report.settlements_affected.includes('S1') && report.settlements_affected.includes('S2')).toBeTruthy();
    expect(report.municipality_factors['MUN_A']).toBe(0.7);
    expect(state.political.political_controllers).toEqual({ S1: 'RBiH', S2: 'RS' });
});

test('hooks return 1 when phase !== war', () => {
    const state = minimalPhaseIIState();
    state.meta!.phase = 'peace';
    expect(getMunicipalityDisplacementFactor(state, 'MUN_A')).toBe(1);
    expect(getSettlementDisplacementFactor(state, 'S1')).toBe(1);
});
