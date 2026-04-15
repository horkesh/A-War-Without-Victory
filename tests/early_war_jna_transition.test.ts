/**
 * Phase C Step 8: JNA transition tests.
 * - JNA starts when RS is declared (Peace phase already gated); does not start the war.
 * - Withdrawal and asset transfer advance 0.05 per turn; completion at ≥0.95 / ≥0.90.
 * - Report appears in Peace phase runTurn.
 */

import { expect, test } from 'vitest';
import { runJNATransition } from '../src/sim/early_war/jna_transition.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function statePhaseIWithRSDeclared(overrides?: { war_jna?: { transition_begun: boolean; withdrawal_progress: number; asset_transfer_rs: number } }): GameState {
    const s: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'jna-fixture',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 5
            },
            {
                id: 'HRHB',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            MUN_A: { RBiH: 30, RS: 60, HRHB: 10 },
            MUN_B: { RBiH: 25, RS: 70, HRHB: 5 }
        }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
    if (overrides?.war_jna !== undefined) {
        s.military.war_jna = overrides.war_jna;
    }
    return s;
}

test('runJNATransition starts JNA when RS declared and not yet begun', () => {
    const state = statePhaseIWithRSDeclared();
    const report = runJNATransition(state);
    expect(report.started).toBe(true);
    expect(state.military.war_jna!.transition_begun).toBe(true);
    expect(report.withdrawal_after).toBe(0.05);
    expect(report.asset_transfer_after).toBe(0.05);
    expect(report.completed).toBe(false);
});

test('runJNATransition does not start when RS not declared', () => {
    const state = statePhaseIWithRSDeclared();
    state.factions!.find((f) => f.id === 'RS')!.declared = false;
    const report = runJNATransition(state);
    expect(report.started).toBe(false);
    expect(state.military.war_jna!.transition_begun).toBe(false);
    expect(report.withdrawal_after).toBe(0);
    expect(report.asset_transfer_after).toBe(0);
});

test('runJNATransition advances 0.05 per turn when already begun', () => {
    const state = statePhaseIWithRSDeclared({
        war_jna: { transition_begun: true, withdrawal_progress: 0.1, asset_transfer_rs: 0.15 }
    });
    const report = runJNATransition(state);
    expect(report.started).toBe(false);
    expect(report.withdrawal_before).toBe(0.1);
    expect(report.withdrawal_after).toBe(0.15);
    expect(report.asset_transfer_before).toBe(0.15);
    expect(report.asset_transfer_after).toBe(0.2);
    expect(report.completed).toBe(false);
});

test('runJNATransition caps withdrawal and asset at 1', () => {
    const state = statePhaseIWithRSDeclared({
        war_jna: { transition_begun: true, withdrawal_progress: 0.98, asset_transfer_rs: 0.99 }
    });
    const report = runJNATransition(state);
    expect(report.withdrawal_after).toBe(1);
    expect(report.asset_transfer_after).toBe(1);
    expect(report.completed).toBe(true);
});

test('runJNATransition reports completed when withdrawal ≥ 0.95 and asset ≥ 0.9', () => {
    const state = statePhaseIWithRSDeclared({
        war_jna: { transition_begun: true, withdrawal_progress: 0.95, asset_transfer_rs: 0.9 }
    });
    const report = runJNATransition(state);
    expect(report.completed).toBe(true);
    expect(report.withdrawal_after).toBe(1);
    expect(report.asset_transfer_after).toBe(0.95);
});

test('war runTurn default path omits phase_i JNA transition report', async () => {
    const state = statePhaseIWithRSDeclared();
    const { report } = await runTurn(state, { seed: 'jna-fixture' });
    expect(report.war_jna_transition).toBe(undefined);
    expect(report.phases.some((p) => p.name === 'phase-i-jna-transition')).toBe(false);
});
