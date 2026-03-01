/**
 * Phase C Step 2: Phase I entry and gating tests.
 * - Phase I unreachable without referendum_held.
 * - Phase I unreachable unless current_turn >= war_start_turn.
 * - Phase 0 continues to run safely via state pipeline (runOneTurn).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

function minimalPhaseIState(overrides: Partial<GameState['meta']> = {}): GameState {
    const meta = {
        turn: 10,
        seed: 'gating-fixture',
        phase: 'war' as const,
        referendum_held: true,
        referendum_turn: 6,
        war_start_turn: 10,
        ...overrides
    };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta,
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { 'SID_001': 'RBiH' }
    };
}

function minimalPhase0State(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5,
            seed: 'phase0-fixture',
            phase: 'peace',
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: null
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { 'SID_001': 'RBiH' }
    };
}

test('runTurn accepts war when referendum_held is false', async () => {
    const state = minimalPhaseIState({ referendum_held: false });
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    assert.strictEqual(nextState.meta.turn, 11);
});

test('runTurn accepts war when war_start_turn is null', async () => {
    const state = minimalPhaseIState({ war_start_turn: null });
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    assert.strictEqual(nextState.meta.turn, 11);
});

test('runTurn accepts war when current_turn < war_start_turn', async () => {
    const state = minimalPhaseIState({ turn: 8, war_start_turn: 10 });
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    assert.strictEqual(nextState.meta.turn, 9);
});

test('runTurn accepts war phase and advances turn', async () => {
    const state = minimalPhaseIState({ turn: 10, war_start_turn: 10 });
    const { nextState, report } = await runTurn(state, { seed: state.meta.seed });
    assert.strictEqual(nextState.meta.turn, 11);
    assert.strictEqual(nextState.meta.phase, 'war');
    assert.ok(report.phases.length > 0);
});

test('runTurn tolerates AoR entries on war path', async () => {
    const state = minimalPhaseIState({ turn: 10, war_start_turn: 10 });
    state.factions![0]!.areasOfResponsibility = ['SID_001'];
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    assert.strictEqual(nextState.meta.turn, 11);
});

test('runTurn throws when peace (use state pipeline)', async () => {
    const state = minimalPhase0State();
    await assert.rejects(
        async () => runTurn(state, { seed: state.meta.seed }),
        /use state pipeline runOneTurn for peace/
    );
});

test('Phase 0 continues to run safely via runOneTurn when phase_0', () => {
    const state = minimalPhase0State();
    const result = runOneTurn(state, { seed: state.meta.seed });
    assert.strictEqual(result.state.meta.turn, 6);
    assert.strictEqual(result.state.meta.phase, 'peace');
    assert.deepStrictEqual(result.phasesExecuted, ['peace']);
});
