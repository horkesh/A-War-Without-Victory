/**
 * Phase C Step 7: Displacement initiation hooks tests.
 * - Deterministic hook creation when control flip report has flips and hostile share > 0.30 (stub).
 * - No modification to displacement_state or population totals.
 * - Same municipality not hooked twice (idempotent per mun).
 */

import { expect, test } from 'vitest';
import type { ControlFlipReport } from '../src/sim/early_war/control_flip.js';
import { runDisplacementHooks } from '../src/sim/early_war/displacement_hooks.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithPhaseI(overrides?: { war_displacement_initiated?: Record<string, number> }): GameState {
    const s: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'disp-hooks-fixture',
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
            MUN_A: { RBiH: 25, RS: 60, HRHB: 10 },
            MUN_B: { RBiH: 20, RS: 80, HRHB: 5 }
        }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: {
            MUN_A: { stability_score: 40 },
            MUN_B: { stability_score: 50 }
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
    if (overrides?.war_displacement_initiated !== undefined) {
        s.displacement.war_displacement_initiated = overrides.war_displacement_initiated as Record<MunicipalityId, number>;
    }
    return s;
}

test('runDisplacementHooks with no flips returns empty report', () => {
    const state = stateWithPhaseI();
    const controlFlipReport: ControlFlipReport = { flips: [], municipalities_evaluated: 0, control_events: [] };
    const report = runDisplacementHooks(state, 10, controlFlipReport, undefined);
    expect(report.hooks_created).toBe(0);
    expect(report.by_mun.length).toBe(0);
    expect(state.displacement.war_displacement_initiated === undefined).toBe(true);
});

test('runDisplacementHooks with flips creates hooks and report is deterministic by mun_id', () => {
    const state = stateWithPhaseI();
    const controlFlipReport: ControlFlipReport = {
        flips: [
            { mun_id: 'MUN_B' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' },
            { mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }
        ],
        municipalities_evaluated: 2,
        control_events: []
    };
    const report = runDisplacementHooks(state, 10, controlFlipReport, undefined);
    expect(report.hooks_created).toBe(2);
    expect(report.by_mun.length).toBe(2);
    expect(report.by_mun[0].mun_id).toBe('MUN_A');
    expect(report.by_mun[0].initiated_turn).toBe(10);
    expect(report.by_mun[1].mun_id).toBe('MUN_B');
    expect(report.by_mun[1].initiated_turn).toBe(10);
    expect(state.displacement.war_displacement_initiated!['MUN_A']).toBe(10);
    expect(state.displacement.war_displacement_initiated!['MUN_B']).toBe(10);
});

test('runDisplacementHooks does not modify displacement_state or population totals', () => {
    const state = stateWithPhaseI();
    state.displacement.displacement_state = {
        MUN_A: {
            mun_id: 'MUN_A' as MunicipalityId,
            original_population: 1000,
            displaced_out: 0,
            displaced_in: 0,
            lost_population: 0,
            last_updated_turn: 9
        }
    };
    const controlFlipReport: ControlFlipReport = {
        flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
        municipalities_evaluated: 1,
        control_events: []
    };
    runDisplacementHooks(state, 10, controlFlipReport, undefined);
    expect(state.displacement.displacement_state !== undefined).toBeTruthy();
    expect(state.displacement.displacement_state!['MUN_A'].original_population).toBe(1000);
    expect(state.displacement.displacement_state!['MUN_A'].displaced_out).toBe(0);
    expect(state.displacement.displacement_state!['MUN_A'].displaced_in).toBe(0);
    expect(state.displacement.displacement_state!['MUN_A'].lost_population).toBe(0);
});

test('runDisplacementHooks does not create duplicate hook for same municipality', () => {
    const state = stateWithPhaseI({ war_displacement_initiated: { MUN_A: 9 } });
    const controlFlipReport: ControlFlipReport = {
        flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
        municipalities_evaluated: 1,
        control_events: []
    };
    const report = runDisplacementHooks(state, 10, controlFlipReport, undefined);
    expect(report.hooks_created).toBe(0);
    expect(report.by_mun.length).toBe(0);
    expect(state.displacement.war_displacement_initiated!['MUN_A']).toBe(9);
});

test('war runTurn default path omits phase_i displacement hooks report', async () => { // legacy-phase-term-ok
    const state = stateWithPhaseI();
    const { report } = await runTurn(state, { seed: 'disp-hooks-fixture' });
    expect(report.displacement_hooks).toBe(undefined);
    expect(report.phases.some((p) => p.name === 'phase-i-displacement-hooks')).toBe(false);
});

test('runDisplacementHooks skips hook when hostile share from census <= 0.30', () => {
    const state = stateWithPhaseI();
    const controlFlipReport: ControlFlipReport = {
        flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
        municipalities_evaluated: 1,
        control_events: []
    };
    // MUN_A has very low Bosniak share (0.15) -> hostile share 0.15 <= 0.30 -> no hook
    const population1991ByMun = {
        MUN_A: { total: 10000, bosniak: 1500, serb: 8000, croat: 400, other: 100 }
    };
    const report = runDisplacementHooks(state, 10, controlFlipReport, population1991ByMun);
    expect(report.hooks_created).toBe(0);
    expect(report.by_mun.length).toBe(0);
});

test('runDisplacementHooks creates hook when hostile share from census > 0.30', () => {
    const state = stateWithPhaseI();
    const controlFlipReport: ControlFlipReport = {
        flips: [{ mun_id: 'MUN_A' as MunicipalityId, from_faction: 'RBiH', to_faction: 'RS' }],
        municipalities_evaluated: 1,
        control_events: []
    };
    // MUN_A has high Bosniak share (0.50) -> hostile share 0.50 > 0.30 -> hook
    const population1991ByMun = {
        MUN_A: { total: 10000, bosniak: 5000, serb: 4000, croat: 800, other: 200 }
    };
    const report = runDisplacementHooks(state, 10, controlFlipReport, population1991ByMun);
    expect(report.hooks_created).toBe(1);
    expect(report.by_mun[0].mun_id).toBe('MUN_A');
});
