// @vitest-environment jsdom
// The operation briefing must survive the way App.tsx hosts it: the wrapper keeps
// OperationBriefingModal mounted (isOpen=false) while operationBriefingContext is
// null, then re-renders the SAME instance once a context is set. A hook placed
// after the modal's early `return null` makes that second render call more hooks
// than the first, and React throws "Rendered more hooks than during the previous
// render". Every earlier test mounted the modal with a context already set, so
// none saw the crash that hit every live open.
//
// The crash fix is commit 9b7d9da1a (operations surfaces, #570): no hooks after
// the early return.
import { createElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OperationBriefingModal } from '../../src/ui/map/components/OperationBriefingModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState, OperationView } from '../../src/ui/map/data/types.js';

const CORPS_ID = 'arbih_3rd_corps';
const OP_NAME = 'operation_null_context_slug';

function operation(): OperationView {
  return {
    corps_id: CORPS_ID,
    corps_name: '3rd Corps',
    faction: 'RBiH',
    name: OP_NAME,
    display_name: 'Operation Null Context',
    type: 'sector_attack',
    phase: 'planning',
    commander_assessment: 'postpone',
    force_ratio_estimate: 2,
    objectives: ['op:test:objective'],
    current_objective_index: 0,
    participating_brigade_count: 1,
    participating_brigade_ids: ['arbih_brigade'],
    started_turn: 3,
  };
}

function loadedState(): LoadedGameState {
  return {
    label: 'test',
    turn: 8,
    phase: 'war',
    formations: [
      { id: CORPS_ID, faction: 'RBiH', name: '3rd Corps', kind: 'corps', readiness: 'ready', status: 'active', cohesion: 75, fatigue: 0, createdTurn: 0, tags: [], personnel: 9000, commandStrain: 0.4 },
    ],
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
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    operations: [operation()],
    corpsFrontSectors: [],
    namedOfficerData: [],
  } as unknown as LoadedGameState;
}

/** Mirrors OperationBriefingModalWrapper in App.tsx (minus IPC). */
function Host() {
  const ctx = useGameStore((s) => s.operationBriefingContext);
  if (!ctx) return createElement(OperationBriefingModal, { isOpen: false, onClose: () => {} });
  return createElement(OperationBriefingModal, { isOpen: true, onClose: () => {}, commandBridgeAvailable: false });
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: loadedState(),
    operationBriefingContext: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('OperationBriefingModal hosted like App.tsx', () => {
  it('renders nothing while the context is null', () => {
    const { container } = render(createElement(Host));
    expect(container.textContent).toBe('');
  });

  it('opens from a null context without a hooks-order error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(createElement(Host));

    act(() => {
      useGameStore.setState({ operationBriefingContext: { corpsId: CORPS_ID, operationName: OP_NAME } });
    });

    const hookErrors = consoleError.mock.calls.filter((args) => args.some((a) => String(a).includes('more hooks')));
    expect(hookErrors).toEqual([]);
    expect(container.textContent).toContain('Operation Null Context');
  });
});
