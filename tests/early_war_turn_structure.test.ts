/**
 * War turn structure tests after two-phase migration.
 * - runTurn executes war pipeline phases in deterministic order.
 * - Legacy phase-i subphases are not part of default war runTurn path.
 */

import { expect, test } from 'vitest';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function statePhaseI(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'step9-fixture',
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
}

test('war runTurn executes expected leading phases in order', async () => {
    const state = statePhaseI();
    const { report } = await runTurn(state, { seed: 'step9-fixture' });
    const names = report.phases.map((p) => p.name);
    expect(names.length > 10).toBeTruthy();
    expect(names.slice(0, 3)).toEqual(['initialize', 'capture-aar-snapshot', 'snapshot-political-controllers']);
});

test('Peace phase runTurn leaves areasOfResponsibility empty (no AoRs in Peace phase)', async () => {
    const state = statePhaseI();
    const { nextState } = await runTurn(state, { seed: 'step9-fixture' });
    const factions = nextState.factions ?? [];
    for (const f of factions) {
        const aor = f.areasOfResponsibility ?? [];
        expect(aor.length).toBe(0);
    }
});

test('war runTurn default path does not include legacy phase-i subphases', async () => {
    const state = statePhaseI();
    const { report } = await runTurn(state, { seed: 'step9-fixture' });
    const names = report.phases.map((p) => p.name);
    expect(names.some((n) => n.startsWith('phase-i-'))).toBe(false);
});

test('war runTurn with formation_spawn_directive remains stable', async () => {
    const state = statePhaseI();
    state.military.formation_spawn_directive = {};
    const { nextState, report } = await runTurn(state, { seed: 'smoke-fixture' });
    expect(report.phases.length > 0).toBeTruthy();
    expect(nextState.military.formations != null).toBeTruthy();
});
