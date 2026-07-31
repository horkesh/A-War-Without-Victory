/**
 * Phase C Step 4: Early war control change system tests.
 * - No control flips before war_start_turn (Peace phase path not run; gating in phase_i_entry_gating.test.ts).
 * - Control flips only under authorized early war conditions (war active, eligible, trigger met).
 * - Control flips do not modify authority (faction profile unchanged).
 */

import { expect, test } from 'vitest';
import { runControlFlip } from '../src/sim/early_war/control_flip.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithTwoAdjacentMuns(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'control-flip-fixture',
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
    political_controllers: {
            s1: 'RBiH',
            s2: 'RS'
        },
    municipalities: {
            MUN_A: { stability_score: 30 },
            MUN_B: { stability_score: 70 }
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
}

test('runControlFlip with no graph does not throw and reports zero flips when no settlementsByMun', () => {
    const state = stateWithTwoAdjacentMuns();
    const report = runControlFlip({ state, turn: 10 });
    expect(report.flips.length).toBe(0);
    expect(report.municipalities_evaluated).toBe(2);
});

test('runControlFlip with war inactive reports zero flips', () => {
    const state = stateWithTwoAdjacentMuns();
    state.factions!.find((f) => f.id === 'RS')!.declared = false;
    const report = runControlFlip({ state, turn: 10 });
    expect(report.flips.length).toBe(0);
});

test('runControlFlip before war_start_turn reports zero flips', () => {
    const state = stateWithTwoAdjacentMuns();
    state.meta.war_start_turn = 10;
    const report = runControlFlip({ state, turn: 8 });
    expect(report.flips.length).toBe(0);
    expect(report.municipalities_evaluated).toBe(0);
});

test('runControlFlip does not modify faction profile (authority) when flips occur', () => {
    const state = stateWithTwoAdjacentMuns();
    const rbihAuthorityBefore = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const rsAuthorityBefore = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
    runControlFlip({ state, turn: 10 });
    const rbihAuthorityAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const rsAuthorityAfter = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
    expect(rbihAuthorityAfter).toBe(rbihAuthorityBefore);
    expect(rsAuthorityAfter).toBe(rsAuthorityBefore);
});

test('runControlFlip with consolidation set skips that municipality', () => {
    const state = stateWithTwoAdjacentMuns();
    state.political.war_consolidation_until = { MUN_A: 20 };
    const report = runControlFlip({ state, turn: 10 });
    expect(report.flips.length).toBe(0);
});

test('war runTurn default path omits phase_i control-flip report', async () => { // legacy-phase-term-ok
    const state = stateWithTwoAdjacentMuns();
    const { report } = await runTurn(state, { seed: state.meta.seed });
    expect(report.control_flip).toBe(undefined);
    expect(report.phases.some((p) => p.name === 'phase-i-control-flip')).toBe(false);
});

test('war runTurn is not gated by war_start_turn in two-phase model', async () => {
    const state = stateWithTwoAdjacentMuns();
    state.meta.turn = 8;
    state.meta.war_start_turn = 10;
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    expect(nextState.meta.turn).toBe(9);
});

test('large-settlement resistance: mun in LARGE_SETTLEMENT_MUN_IDS with zero defender militia does not flip', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'large-mun-fixture', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
    war_militia_strength: {
            centar_sarajevo: { RBiH: 0, RS: 80, HRHB: 0 },
            other_mun: { RBiH: 0, RS: 80, HRHB: 0 }
        }
  } as any,
  political: {
    political_controllers: { sid_sarajevo: 'RBiH', sid_other: 'RS' },
    municipalities: {
            centar_sarajevo: { stability_score: 30 },
            other_mun: { stability_score: 50 }
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
    const settlements = new Map([
        ['sid_sarajevo', { sid: 'sid_sarajevo', mun1990_id: 'centar_sarajevo', mun_code: 'centar_sarajevo' } as any],
        ['sid_other', { sid: 'sid_other', mun1990_id: 'other_mun', mun_code: 'other_mun' } as any]
    ]);
    const edges = [{ a: 'sid_sarajevo', b: 'sid_other' }];

    const report = runControlFlip({ state, turn: 10, settlements, edges });

    const flippedLarge = report.flips.some((f) => f.mun_id === 'centar_sarajevo');
    expect(flippedLarge).toBe(false);
});

test('B4 coercion: coercion_pressure_by_municipality reduces flip threshold so flip outcome can differ', () => {
    const baseState: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'coercion-fixture', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
    war_militia_strength: {
            MUN_A: { RBiH: 40, RS: 0, HRHB: 0 },
            MUN_B: { RBiH: 0, RS: 20, HRHB: 0 }
        }
  } as any,
  political: {
    political_controllers: { s_a: 'RBiH', s_b: 'RS' },
    municipalities: {
            MUN_A: { stability_score: 30 },
            MUN_B: { stability_score: 70 }
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
    const settlements = new Map([
        ['s_a', { sid: 's_a', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s_b', { sid: 's_b', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);
    const edges = [{ a: 's_a', b: 's_b' }];
    const input = { turn: 10, settlements, edges };

    const reportWithout = runControlFlip({ state: baseState, ...input });
    const reportWith = runControlFlip({
        state: {
            ...baseState,
            political: {
                ...baseState.political,
                coercion_pressure_by_municipality: { MUN_A: 1 }
            } as any,
        },
        ...input
    });

    const flipsWithout = reportWithout.flips.filter((f) => f.mun_id === 'MUN_A');
    const flipsWith = reportWith.flips.filter((f) => f.mun_id === 'MUN_A');
    expect(flipsWithout.length !== flipsWith.length).toBeTruthy();
    expect(reportWith.municipalities_evaluated).toBe(2);
});

test('runControlFlip militaryActionOnly branch disables militia-only flips without adjacent brigades', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'military-action-only-fixture', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            MUN_A: { RBiH: 0, RS: 0, HRHB: 0 },
            MUN_B: { RBiH: 0, RS: 90, HRHB: 0 }
        }
  } as any,
  political: {
    political_controllers: { s_a: 'RBiH', s_b: 'RS' },
    municipalities: {
            MUN_A: { stability_score: 20 },
            MUN_B: { stability_score: 70 }
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
    const settlements = new Map([
        ['s_a', { sid: 's_a', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s_b', { sid: 's_b', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);
    const edges = [{ a: 's_a', b: 's_b' }];

    const militiaDriven = runControlFlip({ state: structuredClone(state), turn: 10, settlements, edges });
    expect(militiaDriven.flips.some((f) => f.mun_id === ('MUN_A' as MunicipalityId))).toBeTruthy();

    const militaryActionOnly = runControlFlip({
        state: structuredClone(state),
        turn: 10,
        settlements,
        edges,
        militaryActionOnly: true
    });
    expect(!militaryActionOnly.flips.some((f) => f.mun_id === ('MUN_A' as MunicipalityId))).toBeTruthy();
});

test('RS border intervention bonus applies in early-war FRY-adjacent municipalities only', () => {
    const makeState = (turn: number): GameState => ({
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn, seed: 'border-intervention-fixture', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 0 },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            bijeljina: { RBiH: 40, RS: 0, HRHB: 0 },
            src_mun: { RBiH: 0, RS: 10, HRHB: 0 },
        }
  } as any,
  political: {
    political_controllers: { s_target: 'RBiH', s_attacker: 'RS' },
    municipalities: {
            bijeljina: { stability_score: 30 },
            src_mun: { stability_score: 60 },
        },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    });
    const settlements = new Map([
        ['s_target', { sid: 's_target', mun1990_id: 'bijeljina', mun_code: 'bijeljina' } as any],
        ['s_attacker', { sid: 's_attacker', mun1990_id: 'src_mun', mun_code: 'src_mun' } as any],
    ]);
    const edges = [{ a: 's_target', b: 's_attacker' }];

    const earlyReport = runControlFlip({ state: makeState(10), turn: 10, settlements, edges });
    const lateReport = runControlFlip({ state: makeState(30), turn: 30, settlements, edges });
    const earlyFlipped = earlyReport.flips.some((f) => f.mun_id === ('bijeljina' as MunicipalityId));
    const lateFlipped = lateReport.flips.some((f) => f.mun_id === ('bijeljina' as MunicipalityId));
    expect(earlyFlipped).toBe(true);
    expect(lateFlipped).toBe(false);
});
