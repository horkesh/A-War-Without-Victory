// @vitest-environment jsdom

/**
 * Regression guard for the convergence P1 (PR #326): when the Army-HQ Stand-Down
 * button was removed, the Decision Room's stop-op path had to actually be REACHABLE
 * for a real executing operation. The original briefing-derived path never fired —
 * `toTargetView` (src/ui/shared/command_briefing_views.ts) collapses operation targets
 * to corps/enclave/settlement/none and the sim briefing carries no per-op (corpsId,
 * opName) pair, so `addBriefingCards` never emitted a `stop_op` directive. The fix adds
 * a dedicated executing-operations → stop_op card source keyed off `state.operations`.
 *
 * This test proves, end to end, that a save with an executing op surfaces a `stop_op`
 * directive in the Decision Room AND that issuing it fires `stageOpHaltOrder` with the
 * RAW engine op name the IPC expects.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import type { LoadedGameState, OperationView } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { useGameStore } from '../../src/ui/map/store/gameStore';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 24,
    battles: [],
    territory_net: {},
    notable_flips: [],
    displacement_total: 0,
    displacement_by_ethnicity: {},
    decoration_awards: [],
    arc_transitions: [],
    formation_spawns: [],
    formation_destructions: [],
    supply_deltas: {},
    heavy_munitions_deltas: {},
    movements: [],
    supply_transitions: [],
    events_fired: [],
    notable_events: [],
    ...overrides,
  } as TurnSummary;
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  const latestTurnSummary = makeSummary();
  return {
    label: 'Turn 24',
    turn: 24,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary,
    turnSummaries: [latestTurnSummary],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function makeOp(overrides: Partial<OperationView> = {}): OperationView {
  return {
    corps_id: 'arbih_3rd_corps',
    corps_name: '3rd Corps',
    faction: 'RBiH',
    name: 'op_breakthrough', // RAW engine name (IPC join key)
    display_name: 'Operation Breakthrough', // player-safe caption
    type: 'offensive',
    phase: 'execution',
    participating_brigade_count: 3,
    started_turn: 20,
    ...overrides,
  } as OperationView;
}

const baseDirectiveGameState = {
  turn: 24,
  phase: 'war',
  formations: [
    { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
  ],
  commandAuthority: { current: 60, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
  namedOfficerData: [],
} as unknown as LoadedGameState;

function installIpc(overrides: Record<string, unknown> = {}) {
  const bridge = {
    stageOpHaltOrder: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
  Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
  return bridge;
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'awwv');
  useGameStore.setState(useGameStore.getInitialState());
  vi.restoreAllMocks();
});

describe('Decision Room stop-op reachability for executing operations', () => {
  it('emits a reachable stop_op directive for each player-faction executing op', () => {
    const state = makeState({
      operations: [makeOp()],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:stop-op:arbih_3rd_corps:op_breakthrough');

    expect(card).toBeDefined();
    expect(card?.category).toBe('command');
    // The directive carries the RAW engine name in the payload (IPC join key), not the
    // player-safe display name — that is what stageOpHaltOrder expects.
    expect(card?.directive).toEqual({
      lever: 'stop_op',
      corpsId: 'arbih_3rd_corps',
      cost: 25,
      payload: { corpsId: 'arbih_3rd_corps', opName: 'op_breakthrough' },
    });
  });

  it('does not emit stop_op for non-executing or enemy-faction ops', () => {
    const state = makeState({
      operations: [
        makeOp({ name: 'op_planning', phase: 'planning' }),
        makeOp({ name: 'op_recovery', phase: 'recovery' }),
        makeOp({
          corps_id: 'vrs_1st_corps', corps_name: '1st Krajina Corps', faction: 'RS',
          name: 'op_enemy', phase: 'execution',
        }),
        makeOp({ name: 'op_live', phase: 'execution' }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const stopOpCards = view.cards.filter((c) => c.id.startsWith('command:stop-op:'));

    expect(stopOpCards.map((c) => c.id)).toEqual(['command:stop-op:arbih_3rd_corps:op_live']);
    expect(view.cards.find((c) => c.id === 'command:stop-op:vrs_1st_corps:op_enemy')).toBeUndefined();
  });

  it('orders multiple executing-op stop_op cards deterministically', () => {
    const state = makeState({
      operations: [
        makeOp({ corps_id: 'arbih_b_corps', name: 'op_z', phase: 'execution' }),
        makeOp({ corps_id: 'arbih_b_corps', name: 'op_a', phase: 'execution' }),
        makeOp({ corps_id: 'arbih_a_corps', name: 'op_m', phase: 'execution' }),
      ],
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    const ids = first.cards.filter((c) => c.id.startsWith('command:stop-op:')).map((c) => c.id);

    expect(ids).toEqual([
      'command:stop-op:arbih_a_corps:op_m',
      'command:stop-op:arbih_b_corps:op_a',
      'command:stop-op:arbih_b_corps:op_z',
    ]);
    // Stable across rebuilds.
    expect(second.cards.map((c) => c.id)).toEqual(first.cards.map((c) => c.id));
  });

  it('emits no stop_op cards when there is no player faction', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({ player_faction: null, operations: [makeOp()] }),
    });
    expect(view.hasPlayerFaction).toBe(false);
    expect(view.cards).toEqual([]);
  });

  it('END TO END: issuing the executing-op stop_op directive fires stageOpHaltOrder', async () => {
    // 1. The Decision Room view-model surfaces a stop_op directive for the live op.
    const state = makeState({ operations: [makeOp()] });
    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:stop-op:arbih_3rd_corps:op_breakthrough');
    expect(card?.directive?.lever).toBe('stop_op');

    // 2. Feeding that directive into the DirectiveCard and pressing Issue halts the op.
    const { stageOpHaltOrder } = installIpc();
    render(React.createElement(DirectiveCard, { directive: card!.directive!, gameState: baseDirectiveGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(stageOpHaltOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        opName: 'op_breakthrough',
      });
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });
});
