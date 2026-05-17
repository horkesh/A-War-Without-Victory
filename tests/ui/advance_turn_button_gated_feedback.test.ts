// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { PresidentialToolbar } from '../../src/ui/map/components/PresidentialToolbar.js';
import { WarroomStatusBar } from '../../src/ui/map/components/warroom/WarroomStatusBar.js';
import { advanceTurnAndSync } from '../../src/ui/map/desktop/orderActions.js';

vi.mock('../../src/ui/map/desktop/orderActions.js', () => ({
  advanceTurnAndSync: vi.fn(async () => undefined),
}));

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
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
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RS',
    ...overrides,
  } as LoadedGameState;
}

function setLoadedState(state: LoadedGameState) {
  useGameStore.setState({
    loadedGameState: state,
    advanceTurnPending: false,
    osidDisplayNames: null,
    loadError: null,
  });
}

function installIpcBridge() {
  Object.defineProperty(window, 'awwv', {
    configurable: true,
    value: {
      advanceTurn: vi.fn(async () => ({ ok: true, stateJson: JSON.stringify(makeState({ turn: 41 })) })),
    },
  });
}

describe('ADVANCE_TURN gated feedback', () => {
  beforeEach(() => {
    installIpcBridge();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { awwv?: unknown }).awwv;
    useGameStore.setState({
      loadedGameState: null,
      advanceTurnPending: false,
      osidDisplayNames: null,
      loadError: null,
    });
  });

  it('toolbar explains a pending-decision block and opens the existing advance review path instead of advancing', () => {
    setLoadedState(makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(PresidentialToolbar, {
      pendingReviews: 2,
      pressureWarning: false,
    }));

    const button = screen.getByRole('button', { name: /resolve 2 pending decisions to continue/i });
    expect(button.getAttribute('title')).toContain('Resolve 2 pending decisions to continue');

    fireEvent.click(button);

    expect(advanceTurnAndSync).not.toHaveBeenCalled();
    expect(useGameStore.getState().advanceTurnPending).toBe(true);
  });

  it('toolbar keeps the normal advance action when the pre-advance gate is clear', () => {
    setLoadedState(makeState());

    render(createElement(PresidentialToolbar, {
      pendingReviews: 0,
      pressureWarning: false,
    }));

    fireEvent.click(screen.getByRole('button', { name: /advance turn/i }));

    expect(advanceTurnAndSync).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });

  it('Warroom ADVANCE routes a blocked turn to the Decision Room callback when available', () => {
    const onReviewPriorities = vi.fn();
    setLoadedState(makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(WarroomStatusBar, { onReviewPriorities }));

    const button = screen.getByRole('button', { name: /resolve 2 pending decisions to continue/i });
    expect(button.getAttribute('title')).toContain('Decision Room');

    fireEvent.click(button);

    expect(onReviewPriorities).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });
});
