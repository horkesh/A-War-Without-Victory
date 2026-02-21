/**
 * Phase C Step 4: Early war control change system tests.
 * - No control flips before war_start_turn (Phase I path not run; gating in phase_i_entry_gating.test.ts).
 * - Control flips only under authorized early war conditions (war active, eligible, trigger met).
 * - Control flips do not modify authority (faction profile unchanged).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runControlFlip } from '../src/sim/phase_i/control_flip.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function stateWithTwoAdjacentMuns(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'control-flip-fixture',
            phase: 'phase_i',
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
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            s1: 'RBiH',
            s2: 'RS'
        },
        municipalities: {
            MUN_A: { stability_score: 30 },
            MUN_B: { stability_score: 70 }
        },
        phase_i_consolidation_until: {},
        phase_i_militia_strength: {
            MUN_A: { RBiH: 25, RS: 60, HRHB: 10 },
            MUN_B: { RBiH: 20, RS: 80, HRHB: 5 }
        }
    };
}

test('runControlFlip with no graph does not throw and reports zero flips when no settlementsByMun', () => {
    const state = stateWithTwoAdjacentMuns();
    const report = runControlFlip({ state, turn: 10 });
    assert.strictEqual(report.flips.length, 0);
    assert.strictEqual(report.municipalities_evaluated, 2);
});

test('runControlFlip with war inactive reports zero flips', () => {
    const state = stateWithTwoAdjacentMuns();
    state.factions!.find((f) => f.id === 'RS')!.declared = false;
    const report = runControlFlip({ state, turn: 10 });
    assert.strictEqual(report.flips.length, 0);
});

test('runControlFlip before war_start_turn reports zero flips', () => {
    const state = stateWithTwoAdjacentMuns();
    state.meta.war_start_turn = 10;
    const report = runControlFlip({ state, turn: 8 });
    assert.strictEqual(report.flips.length, 0);
    assert.strictEqual(report.municipalities_evaluated, 0);
});

test('runControlFlip does not modify faction profile (authority) when flips occur', () => {
    const state = stateWithTwoAdjacentMuns();
    const rbihAuthorityBefore = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const rsAuthorityBefore = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
    runControlFlip({ state, turn: 10 });
    const rbihAuthorityAfter = state.factions!.find((f) => f.id === 'RBiH')!.profile.authority;
    const rsAuthorityAfter = state.factions!.find((f) => f.id === 'RS')!.profile.authority;
    assert.strictEqual(rbihAuthorityAfter, rbihAuthorityBefore, 'Control flip must not change RBiH authority');
    assert.strictEqual(rsAuthorityAfter, rsAuthorityBefore, 'Control flip must not change RS authority');
});

test('runControlFlip with consolidation set skips that municipality', () => {
    const state = stateWithTwoAdjacentMuns();
    state.phase_i_consolidation_until = { MUN_A: 20 };
    const report = runControlFlip({ state, turn: 10 });
    assert.strictEqual(report.flips.length, 0);
});

test('Phase I runTurn keeps control-flip phase but applies no flips', async () => {
    const state = stateWithTwoAdjacentMuns();
    const { report } = await runTurn(state, { seed: state.meta.seed });
    assert.ok(report.phase_i_control_flip);
    assert.strictEqual(report.phase_i_control_flip!.municipalities_evaluated, 0);
    assert.deepStrictEqual(report.phase_i_control_flip!.flips, []);
    assert.deepStrictEqual(report.phase_i_control_flip!.control_events, []);
    assert.ok(report.phases.some((p) => p.name === 'phase-i-control-flip'));
});

test('No control flips before war_start_turn: Phase I path not executed (gating)', async () => {
    const state = stateWithTwoAdjacentMuns();
    state.meta.turn = 8;
    state.meta.war_start_turn = 10;
    await assert.rejects(
        async () => runTurn(state, { seed: state.meta.seed }),
        /Phase I requires referendum_held/
    );
});

test('large-settlement resistance: mun in LARGE_SETTLEMENT_MUN_IDS with zero defender militia does not flip', () => {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'large-mun-fixture', phase: 'phase_i', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
        political_controllers: { sid_sarajevo: 'RBiH', sid_other: 'RS' },
        municipalities: {
            centar_sarajevo: { stability_score: 30 },
            other_mun: { stability_score: 50 }
        },
        phase_i_consolidation_until: {},
        phase_i_militia_strength: {
            centar_sarajevo: { RBiH: 0, RS: 80, HRHB: 0 },
            other_mun: { RBiH: 0, RS: 80, HRHB: 0 }
        }
    };
    const settlements = new Map([
        ['sid_sarajevo', { sid: 'sid_sarajevo', mun1990_id: 'centar_sarajevo', mun_code: 'centar_sarajevo' } as any],
        ['sid_other', { sid: 'sid_other', mun1990_id: 'other_mun', mun_code: 'other_mun' } as any]
    ]);
    const edges = [{ a: 'sid_sarajevo', b: 'sid_other' }];

    const report = runControlFlip({ state, turn: 10, settlements, edges });

    const flippedLarge = report.flips.some((f) => f.mun_id === 'centar_sarajevo');
    assert.strictEqual(flippedLarge, false, 'centar_sarajevo (large settlement) with zero defender militia must not flip in one turn');
});

test('B4 coercion: coercion_pressure_by_municipality reduces flip threshold so flip outcome can differ', () => {
    const baseState: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'coercion-fixture', phase: 'phase_i', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
        political_controllers: { s_a: 'RBiH', s_b: 'RS' },
        municipalities: {
            MUN_A: { stability_score: 30 },
            MUN_B: { stability_score: 70 }
        },
        phase_i_consolidation_until: {},
        phase_i_militia_strength: {
            MUN_A: { RBiH: 40, RS: 0, HRHB: 0 },
            MUN_B: { RBiH: 0, RS: 20, HRHB: 0 }
        }
    };
    const settlements = new Map([
        ['s_a', { sid: 's_a', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s_b', { sid: 's_b', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);
    const edges = [{ a: 's_a', b: 's_b' }];
    const input = { turn: 10, settlements, edges };

    const reportWithout = runControlFlip({ state: { ...baseState }, ...input });
    const reportWith = runControlFlip({
        state: { ...baseState, coercion_pressure_by_municipality: { MUN_A: 1 } },
        ...input
    });

    const flipsWithout = reportWithout.flips.filter((f) => f.mun_id === 'MUN_A');
    const flipsWith = reportWith.flips.filter((f) => f.mun_id === 'MUN_A');
    assert.ok(flipsWithout.length !== flipsWith.length, 'Coercion must change flip outcome for MUN_A');
    assert.strictEqual(reportWith.municipalities_evaluated, 2);
});

test('runControlFlip militaryActionOnly branch disables militia-only flips without adjacent brigades', () => {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'military-action-only-fixture', phase: 'phase_i', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 0 }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { s_a: 'RBiH', s_b: 'RS' },
        municipalities: {
            MUN_A: { stability_score: 20 },
            MUN_B: { stability_score: 70 }
        },
        phase_i_consolidation_until: {},
        phase_i_militia_strength: {
            MUN_A: { RBiH: 0, RS: 0, HRHB: 0 },
            MUN_B: { RBiH: 0, RS: 90, HRHB: 0 }
        }
    };
    const settlements = new Map([
        ['s_a', { sid: 's_a', mun1990_id: 'MUN_A', mun_code: 'MUN_A' } as any],
        ['s_b', { sid: 's_b', mun1990_id: 'MUN_B', mun_code: 'MUN_B' } as any]
    ]);
    const edges = [{ a: 's_a', b: 's_b' }];

    const militiaDriven = runControlFlip({ state: structuredClone(state), turn: 10, settlements, edges });
    assert.ok(
        militiaDriven.flips.some((f) => f.mun_id === ('MUN_A' as MunicipalityId)),
        'baseline militia-pressure branch should flip MUN_A in this fixture'
    );

    const militaryActionOnly = runControlFlip({
        state: structuredClone(state),
        turn: 10,
        settlements,
        edges,
        militaryActionOnly: true
    });
    assert.ok(
        !militaryActionOnly.flips.some((f) => f.mun_id === ('MUN_A' as MunicipalityId)),
        'military-action-only branch should not flip without adjacent brigade attack strength'
    );
});
