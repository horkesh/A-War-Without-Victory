import { describe, expect, it } from 'vitest';

import { BRCKO_CONTROLLER_ID } from '../src/state/brcko.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import { validateState } from '../src/validate/validate.js';

function createTestState(turn = 5): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn, seed: 'test', phase: 'war' } as any,
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
        areasOfResponsibility: ['sid1', 'sid2'],
        supply_sources: [],
        negotiation: { pressure: 5, last_change_turn: 3, capital: 10, spent_total: 0, last_capital_change_turn: null },
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
        areasOfResponsibility: ['sid3', 'sid4'],
        supply_sources: [],
        negotiation: { pressure: 15, last_change_turn: 4, capital: 5, spent_total: 0, last_capital_change_turn: null },
      },
    ] as any,
    military: {
      formations: {},
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
    } as any,
    political: {
      negotiation_ledger: [],
      political_controllers: {},
    } as any,
    displacement: {} as any,
  } as GameState;
}

describe('end state', () => {
  it('defaults to undefined and survives canonical save/load without migration noise', () => {
    const state = createTestState();

    expect(state.political.end_state).toBeUndefined();

    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized);
    expect(deserialized.political.end_state).toBeUndefined();
  });

  it('validates bad political.end_state fields deterministically', () => {
    const state = createTestState();

    state.political.end_state = { kind: 'invalid', treaty_id: 't1', since_turn: 5 } as any;
    let issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'end_state.kind.invalid')).toBe(true);

    state.political.end_state = { kind: 'peace_treaty', treaty_id: '', since_turn: 5 } as any;
    issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'end_state.treaty_id.invalid')).toBe(true);

    state.political.end_state = { kind: 'peace_treaty', treaty_id: 't1', since_turn: -1 } as any;
    issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'end_state.since_turn.invalid')).toBe(true);

    state.political.end_state = { kind: 'peace_treaty', treaty_id: 't1', since_turn: 10 } as any;
    issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'end_state.since_turn.future')).toBe(true);

    state.political.end_state = { kind: 'peace_treaty', treaty_id: 't1', since_turn: 5, note: '   ' } as any;
    issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'end_state.note.empty')).toBe(true);
  });

  it('rejects Brcko controller overrides when no end_state exists', () => {
    const state = createTestState();
    state.political.control_overrides = {
      sid1: {
        side: BRCKO_CONTROLLER_ID,
        kind: 'treaty_transfer',
        treaty_id: 't1',
        since_turn: 5,
      },
    } as any;

    const issues = validateState(state);
    expect(issues.some((issue) => issue.code === 'brcko_controller_without_end_state')).toBe(true);
  });

  it('short-circuits the turn pipeline when end_state already exists', async () => {
    const state = createTestState();
    state.political.end_state = {
      kind: 'peace_treaty',
      treaty_id: 'test_treaty',
      since_turn: 5,
    };

    const initialFrontSegments = JSON.stringify(state.military.front_segments);
    const initialFrontPressure = JSON.stringify(state.military.front_pressure);
    const initialTurn = state.meta.turn;

    const { nextState, report } = await runTurn(state, {
      seed: 'test_seed',
      settlementEdges: [] as any,
    });

    expect(report.end_state_active).toBe(true);
    expect(nextState.meta.turn).toBe(initialTurn + 1);
    expect(JSON.stringify(nextState.military.front_segments)).toBe(initialFrontSegments);
    expect(JSON.stringify(nextState.military.front_pressure)).toBe(initialFrontPressure);
    expect(report.phases).toHaveLength(1);
    expect(report.phases[0]?.name).toBe('end_state_active');
  });

  it('runs the normal turn pipeline when end_state is absent', async () => {
    const state = createTestState();
    const initialTurn = state.meta.turn;

    const { nextState, report } = await runTurn(state, {
      seed: 'test_seed',
      settlementEdges: [] as any,
    });

    expect(report.end_state_active).toBeUndefined();
    expect(nextState.meta.turn).toBe(initialTurn + 1);
    expect(report.phases.length).toBeGreaterThan(1);
  });
});
