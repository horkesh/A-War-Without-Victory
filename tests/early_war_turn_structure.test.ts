/**
 * War turn structure tests after two-phase migration.
 * - runTurn executes war pipeline phases in deterministic order.
 * - Legacy phase-i subphases are not part of default war runTurn path.
 */

import { expect, test } from 'vitest';
import { runTurn } from '../src/sim/turn_pipeline.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
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

test('war formation-spawn phase consumes eligible directive pools', async () => {
    const state = statePhaseI();
    state.political.political_controllers ??= {};
    state.political.political_controllers['op:MUN_A:center'] = 'RBiH';
    state.military.formation_spawn_directive = { kind: 'brigade' };
    state.military.militia_pools = {
        'MUN_A:RBiH': {
            mun_id: 'MUN_A',
            faction: 'RBiH',
            available: 1600,
            committed: 0,
            exhausted: 0,
            fatigue: 0,
            updated_turn: 10,
        },
    } as any;
    const report: any = {};
    const phase = warPhases.find((candidate) => candidate.name === 'formation-spawn');
    expect(phase).toBeDefined();

    await phase!.run({
        state,
        report,
        input: {
            seed: 'smoke-fixture',
        },
    } as any);

    expect(report.formation_spawn?.formations_created).toBe(1);
    expect(Object.values(state.military.formations ?? {}).some((f: any) =>
        f.faction === 'RBiH'
        && f.kind === 'brigade'
        && f.location_osid === 'op:MUN_A:center'
        && f.tags?.includes('generated_phase_i0')
        && f.tags?.includes('mun:MUN_A'))).toBe(true);
    expect(state.military.militia_pools?.['MUN_A:RBiH']?.available).toBe(800);
    expect(state.military.militia_pools?.['MUN_A:RBiH']?.committed).toBe(800);
});
