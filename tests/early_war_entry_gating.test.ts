/**
 * War-phase entry: runTurn runs every war-phase state, whatever war_start_turn says.
 * The peace phase (and its state pipeline runOneTurn) was retired at schema v41;
 * the peace-only gating cases left with it.
 */

import { expect, test } from 'vitest';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIState(overrides: Partial<GameState['meta']> = {}): GameState {
    const meta = {
        turn: 10,
        seed: 'gating-fixture',
        phase: 'war' as const,
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
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { 'SID_001': 'RBiH' }
  } as any,
        displacement: {} as any
    };
}

test('runTurn accepts war when war_start_turn is null', async () => {
    const state = minimalPhaseIState({ war_start_turn: null });
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    expect(nextState.meta.turn).toBe(11);
});

test('runTurn accepts war when current_turn < war_start_turn', async () => {
    const state = minimalPhaseIState({ turn: 8, war_start_turn: 10 });
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    expect(nextState.meta.turn).toBe(9);
});

test('runTurn accepts war phase and advances turn', async () => {
    const state = minimalPhaseIState({ turn: 10, war_start_turn: 10 });
    const { nextState, report } = await runTurn(state, { seed: state.meta.seed });
    expect(nextState.meta.turn).toBe(11);
    expect(nextState.meta.phase).toBe('war');
    expect(report.phases.length > 0).toBeTruthy();
});

test('runTurn tolerates AoR entries on war path', async () => {
    const state = minimalPhaseIState({ turn: 10, war_start_turn: 10 });
    state.factions![0]!.areasOfResponsibility = ['SID_001'];
    const { nextState } = await runTurn(state, { seed: state.meta.seed });
    expect(nextState.meta.turn).toBe(11);
});

test('runTurn rejects a state that carries no war phase', async () => {
    const state = minimalPhaseIState();
    delete (state.meta as { phase?: string }).phase;
    await expect(runTurn(state, { seed: state.meta.seed })).rejects.toThrow(/unsupported lifecycle phase/);
});
