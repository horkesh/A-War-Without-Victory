import { describe, expect, it } from 'vitest';

import { runTurn } from '../src/sim/turn_pipeline.js';
import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import {
  buildHistoricalDefaultDaytonProposal,
  resolveDaytonNegotiation
} from '../src/sim/negotiation/dayton_negotiation.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';

const baseState: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
        turn: 0,
        seed: 'initial-seed',
        phase: 'war',
        referendum_held: true,
        referendum_turn: 0,
        war_start_turn: 0
    },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {} as any, displacement: {} as any
};

describe('runTurn determinism', () => {
  it('is deterministic for same state and seed', async () => {
    const seed = 'deterministic-seed';

    const first = await runTurn(baseState, { seed });
    const second = await runTurn(baseState, { seed });

    expect(first.nextState).toEqual(second.nextState);
    expect(first.report).toEqual(second.report);
    expect(baseState.meta.turn, 'input state must remain unchanged').toBe(0);
  });

  it('does not let the narrated Dayton signing flag preempt the negotiation owner', async () => {
    const state: GameState = {
      ...baseState,
      meta: { ...baseState.meta, turn: 184 },
      military: {
        ...baseState.military,
        event_flags: { dayton_signed: true }
      } as any
    };

    const result = await runTurn(state, { seed: 'dayton-narrative-owner' });

    expect(result.report.phases[0]?.name).not.toBe('game_over_active');
    expect(result.report.phases.map((phase) => phase.name)).toContain('evaluate-dayton-trigger');
    expect(result.nextState.meta.turn).toBe(185);
    expect(result.nextState.meta.game_over).not.toBe(true);
    expect(result.nextState.meta.outcome).not.toBe('dayton_agreement');
  });

  it('plays the narrated ceasefire chain before opening and resolving the horizon negotiation', async () => {
    const chainIds = new Set([
      'ceasefire_1995',
      'dayton_talks_begin_1995',
      'dayton_signed_1995'
    ]);
    const eventDefinitions = loadEventDefinitions(0).filter((event) => chainIds.has(event.id));
    const initialState: GameState = {
      ...baseState,
      meta: {
        ...baseState.meta,
        turn: 180,
        player_faction: 'RBiH',
        autonomy_level: 3
      },
      military: {
        ...baseState.military,
        fired_event_ids: ['federation_ground_offensive_1995'],
        event_fire_counts: { federation_ground_offensive_1995: 1 },
        event_last_fired_turn: { federation_ground_offensive_1995: 172 },
        event_flags: {
          coha_active: false,
          coha_expired: true,
          rbih_state_identity: 'civic'
        },
        enabled_event_ids: ['dayton_talks_begin_1995'],
        pending_event_decisions: [],
        event_overflow_queue: []
      } as any
    };
    const playChain = async () => {
      let state = initialState;
      const firedInOrder: Array<{ id: string; turn: number }> = [];
      while (state.meta.turn < 188) {
        const result = await runTurn(state, {
          seed: 'dayton-narrative-chain',
          eventDefinitions,
          settlementEdges: []
        });
        firedInOrder.push(
          ...(result.report.events_fired ?? [])
            .map((event) => event.id)
            .filter((eventId) => chainIds.has(eventId))
            .map((id) => ({ id, turn: result.nextState.meta.turn }))
        );
        state = result.nextState;
      }
      return { state, firedInOrder };
    };

    const first = await playChain();
    const second = await playChain();
    const { state, firedInOrder } = first;

    expect(second).toEqual(first);

    expect(firedInOrder).toEqual([
      { id: 'ceasefire_1995', turn: 181 },
      { id: 'dayton_talks_begin_1995', turn: 184 },
      { id: 'dayton_signed_1995', turn: 185 }
    ]);
    expect(state.meta.game_over).not.toBe(true);
    expect(state.military.negotiation?.pending_dayton).toBeDefined();
    expect(state.military.negotiation?.dayton_result).toBeUndefined();

    resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());

    expect(state.meta.game_over).toBe(true);
    expect(state.meta.outcome).toBe('dayton');
    expect(state.military.negotiation?.pending_dayton).toBeUndefined();
    expect(state.military.negotiation?.dayton_result).toBeDefined();
    expect(state.meta.endgame_snapshot).toBeDefined();
    expect(state.meta.endgame_snapshot?.outcome).toBe('dayton');
  });

  it('preserves the horizon negotiation when the player rejects the narrated talks', async () => {
    const chainIds = new Set([
      'ceasefire_1995',
      'dayton_talks_begin_1995',
      'dayton_signed_1995'
    ]);
    const eventDefinitions = loadEventDefinitions(0).filter((event) => chainIds.has(event.id));
    let state: GameState = {
      ...baseState,
      meta: {
        ...baseState.meta,
        turn: 180,
        player_faction: 'RBiH',
        autonomy_level: 0
      },
      military: {
        ...baseState.military,
        fired_event_ids: ['federation_ground_offensive_1995'],
        event_fire_counts: { federation_ground_offensive_1995: 1 },
        event_last_fired_turn: { federation_ground_offensive_1995: 172 },
        event_flags: {
          coha_active: false,
          coha_expired: true,
          rbih_state_identity: 'civic'
        },
        enabled_event_ids: ['dayton_talks_begin_1995'],
        pending_event_decisions: [],
        event_overflow_queue: []
      } as any
    };

    while (state.meta.turn < 184) {
      const result = await runTurn(state, {
        seed: 'dayton-hardline-chain',
        eventDefinitions,
        settlementEdges: []
      });
      state = result.nextState;
    }
    expect(state.military.pending_event_decisions?.map((decision) => decision.event_id)).toContain(
      'dayton_talks_begin_1995'
    );
    resolveEventDecisionCore(state, 'dayton_talks_begin_1995', 'hardline');

    const firedAfterRejection: string[] = [];
    while (state.meta.turn < 188) {
      const result = await runTurn(state, {
        seed: 'dayton-hardline-chain',
        eventDefinitions,
        settlementEdges: []
      });
      firedAfterRejection.push(...(result.report.events_fired ?? []).map((event) => event.id));
      state = result.nextState;
    }

    expect(state.military.event_flags?.rbih_dayton_acceptance).toBe('hardline');
    expect(firedAfterRejection).not.toContain('dayton_signed_1995');
    expect(state.military.event_flags?.dayton_signed).not.toBe(true);
    expect(state.meta.game_over).not.toBe(true);
    expect(state.military.negotiation?.pending_dayton).toBeDefined();
  });

});
