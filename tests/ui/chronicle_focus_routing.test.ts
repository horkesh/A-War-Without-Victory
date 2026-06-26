// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChronicleOverlay } from '../../src/ui/map/components/chronicle/ChronicleOverlay.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 12',
    turn: 12,
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
    turnSummaries: [
      { turn: 8, battles: [], events_fired: [], displacement_total: 0 },
      { turn: 12, battles: [], events_fired: [], displacement_total: 0 },
    ],
    firedEvents: [
      {
        id: 'cabinet-crisis',
        turn: 8,
        title: 'Cabinet crisis response',
        narrative: 'The cabinet accepted the policy line.',
        category: 'political',
        effects: [{ kind: 'authority', description: 'Authority held.' }],
        isDecision: true,
      },
      {
        id: 'aid-corridor',
        turn: 8,
        title: 'Aid corridor response',
        narrative: 'A separate decision was filed on the same date.',
        category: 'humanitarian',
        effects: [{ kind: 'humanitarian', description: 'Aid corridor held.' }],
        isDecision: true,
      },
      {
        id: 'later-decision',
        turn: 12,
        title: 'Later decision',
        narrative: 'This is newer but not the requested focus.',
        category: 'political',
        effects: [{ kind: 'authority', description: 'Later effect.' }],
        isDecision: true,
      },
    ],
    player_faction: 'RBiH',
  } as unknown as LoadedGameState;
}

beforeEach(() => {
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  };
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: makeState(),
    chronicleOpen: true,
    focusedChronicleDecisionRecordId: 'event:cabinet-crisis',
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('Chronicle focused decision routing', () => {
  it('selects and marks the Chronicle entry matching a Records decision id', async () => {
    render(React.createElement(ChronicleOverlay));

    await waitFor(() => {
      expect(screen.getAllByText(turnToDateString(8)).length).toBeGreaterThan(0);
    });

    const focused = document.querySelector('[data-focused-chronicle-decision-record-id="event:cabinet-crisis"]');
    expect(focused?.textContent).toContain('Cabinet crisis response');
    expect(focused?.textContent).not.toContain('Aid corridor response');
    expect(focused?.textContent).not.toContain('Later decision');
    expect(document.activeElement).toBe(focused);
  });

  it('keeps Chronicle-filed decision record actions inside Chronicle', async () => {
    render(React.createElement(ChronicleOverlay));

    await waitFor(() => {
      expect(screen.getAllByText(turnToDateString(8)).length).toBeGreaterThan(0);
    });

    const focused = document.querySelector('[data-focused-chronicle-decision-record-id="event:cabinet-crisis"]');
    const openButton = focused?.querySelector<HTMLElement>('[data-testid="chronicle-open-record"]');
    expect(openButton).toBeTruthy();

    fireEvent.click(openButton!);

    expect(useGameStore.getState()).toMatchObject({
      armyHQOpen: false,
      chronicleOpen: true,
      focusedChronicleDecisionRecordId: 'event:cabinet-crisis',
    });
  });
});
