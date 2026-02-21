/**
 * Phase D0.9 Step 2: Phase I → Phase II transition tests.
 * - Case A: transition criteria not met → stays phase_i across N turns.
 * - Case B: criteria met → becomes phase_ii deterministically at the correct turn boundary.
 * - Case C: once phase_ii, Phase I phases are no longer executed (full pipeline runs).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    applyPhaseIToPhaseIITransition,
    isPhaseIITransitionEligible,
    JNA_ASSET_TRANSFER_COMPLETE_THRESHOLD,
    JNA_WITHDRAWAL_COMPLETE_THRESHOLD,
    MIN_OPPOSING_EDGES,
    PERSIST_TURNS
} from '../src/sim/phase_transitions/phase_i_to_phase_ii.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function basePhaseIState(opts: {
    turn: number;
    war_start_turn: number;
    withdrawal_progress?: number;
    asset_transfer_rs?: number;
    transition_begun?: boolean;
    phase_i_opposing_edges_streak?: number;
}): GameState {
    const jnaBegun = opts.transition_begun ?? true;
    const streak = opts.phase_i_opposing_edges_streak ?? 0;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: opts.turn,
            seed: 'transition-test',
            phase: 'phase_i',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: opts.war_start_turn,
            phase_i_opposing_edges_streak: streak
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
                declaration_turn: 1
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
        political_controllers: { s1: 'RBiH', s2: 'RS', s3: 'HRHB' },
        municipalities: { MUN_A: { stability_score: 60 }, MUN_B: { stability_score: 60 }, MUN_C: { stability_score: 60 } },
        phase_i_consolidation_until: {},
        phase_i_militia_strength: {
            MUN_A: { RBiH: 50, RS: 50, HRHB: 10 },
            MUN_B: { RBiH: 50, RS: 50, HRHB: 10 },
            MUN_C: { RBiH: 50, RS: 50, HRHB: 10 }
        },
        phase_i_jna: {
            transition_begun: jnaBegun,
            withdrawal_progress: opts.withdrawal_progress ?? 0,
            asset_transfer_rs: opts.asset_transfer_rs ?? 0
        }
    };
}

test('isPhaseIITransitionEligible: false when phase not phase_i', () => {
    const state = basePhaseIState({
        turn: 30,
        war_start_turn: 10,
        withdrawal_progress: 1,
        asset_transfer_rs: 1
    });
    state.meta.phase = 'phase_ii';
    assert.strictEqual(isPhaseIITransitionEligible(state), false);
});

test('isPhaseIITransitionEligible: false when opposing-edges streak < PERSIST_TURNS', () => {
    const state = basePhaseIState({
        turn: 20,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: 2
    });
    assert.ok(2 < PERSIST_TURNS);
    assert.strictEqual(isPhaseIITransitionEligible(state), false);
});

test('isPhaseIITransitionEligible: false when JNA withdrawal not complete', () => {
    const state = basePhaseIState({
        turn: 25,
        war_start_turn: 10,
        withdrawal_progress: 0.9,
        asset_transfer_rs: 1
    });
    assert.ok(0.9 < JNA_WITHDRAWAL_COMPLETE_THRESHOLD);
    assert.strictEqual(isPhaseIITransitionEligible(state), false);
});

test('isPhaseIITransitionEligible: false when JNA asset transfer not complete', () => {
    const state = basePhaseIState({
        turn: 25,
        war_start_turn: 10,
        withdrawal_progress: 1,
        asset_transfer_rs: 0.85
    });
    assert.ok(0.85 < JNA_ASSET_TRANSFER_COMPLETE_THRESHOLD);
    assert.strictEqual(isPhaseIITransitionEligible(state), false);
});

test('isPhaseIITransitionEligible: true when streak >= PERSIST_TURNS and JNA complete', () => {
    const state = basePhaseIState({
        turn: 12,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: PERSIST_TURNS
    });
    assert.strictEqual(isPhaseIITransitionEligible(state), true);
});

test('applyPhaseIToPhaseIITransition: no-op when not eligible (streak < PERSIST_TURNS)', () => {
    const state = basePhaseIState({
        turn: 15,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: 1
    });
    const out = applyPhaseIToPhaseIITransition(state);
    assert.strictEqual(out, state);
    assert.strictEqual(state.meta.phase, 'phase_i');
});

test('applyPhaseIToPhaseIITransition: transitions to phase_ii when eligible', () => {
    const state = basePhaseIState({
        turn: 12,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: PERSIST_TURNS
    });
    const out = applyPhaseIToPhaseIITransition(state);
    assert.strictEqual(out, state);
    assert.strictEqual(state.meta.phase, 'phase_ii');
    assert.ok(state.phase_ii_supply_pressure && typeof state.phase_ii_supply_pressure === 'object');
    assert.ok(state.phase_ii_exhaustion && typeof state.phase_ii_exhaustion === 'object');
});

test('Case A: no opposing-edge persistence — stays phase_i', async () => {
    const state = basePhaseIState({
        turn: 10,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: 0
    });
    const edges: { a: string; b: string }[] = [];
    for (let i = 0; i < 5; i++) {
        const { nextState } = await runTurn(state, { seed: 'case-a', settlementEdges: edges });
        assert.strictEqual(nextState.meta.phase, 'phase_i', `after ${i + 1} turns should still be phase_i (no opposing edges)`);
        state.meta = { ...nextState.meta };
        state.phase_i_jna = nextState.phase_i_jna ? { ...nextState.phase_i_jna } : undefined;
    }
});

test('Case B: opposing edges persist PERSIST_TURNS and JNA complete — transitions to phase_ii', async () => {
    const warStart = 10;
    const state = basePhaseIState({
        turn: warStart + 5,
        war_start_turn: warStart,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: PERSIST_TURNS - 1
    });
    const controllers: Record<string, string> = {};
    for (let i = 1; i <= 30; i++) {
        controllers[`s${i}`] = i % 2 === 1 ? 'RBiH' : 'RS';
    }
    state.political_controllers = controllers;
    const edges: { a: string; b: string }[] = [];
    for (let i = 1; i < 30; i++) {
        edges.push({ a: `s${i}`, b: `s${i + 1}` });
    }
    assert.ok(edges.length >= MIN_OPPOSING_EDGES);
    const { nextState, report } = await runTurn(state, { seed: 'case-b', settlementEdges: edges });
    assert.strictEqual(nextState.meta.phase, 'phase_ii', 'should transition when streak reaches PERSIST_TURNS and JNA complete');
    assert.ok(report.phases.some((p) => p.name.startsWith('phase-i-')), 'Phase I phases ran this turn');
});

test('Case C: once phase_ii, Phase I phases are no longer executed', async () => {
    const state = basePhaseIState({
        turn: 12,
        war_start_turn: 10,
        withdrawal_progress: 0.95,
        asset_transfer_rs: 0.9,
        phase_i_opposing_edges_streak: PERSIST_TURNS
    });
    applyPhaseIToPhaseIITransition(state);
    assert.strictEqual(state.meta.phase, 'phase_ii');

    const { report } = await runTurn(state, { seed: 'case-c', settlementEdges: [{ a: 's1', b: 's2' }] });
    const names = report.phases.map((p) => p.name);
    assert.ok(!names.every((n) => n.startsWith('phase-i-')), 'should not run only Phase I phases');
    assert.ok(names.includes('phase-ii-consolidation') || names.includes('supply-resolution'), 'full pipeline runs');
});
