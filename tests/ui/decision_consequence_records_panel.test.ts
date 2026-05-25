// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DecisionConsequenceRecordsPanel } from '../../src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
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
    turnSummaries: [],
    ...overrides,
  } as LoadedGameState;
}

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('DecisionConsequenceRecordsPanel', () => {
  it('renders filed presidential choices in Army HQ Records', () => {
    useGameStore.setState({
      loadedGameState: makeState({
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
        ],
      }),
    });

    render(React.createElement(DecisionConsequenceRecordsPanel));

    expect(screen.getByRole('region', { name: 'Decision consequence records' })).toBeTruthy();
    expect(screen.getByText('Cabinet crisis response')).toBeTruthy();
    expect(screen.getByText('Decision recorded')).toBeTruthy();
    expect(screen.getByText(/Event decision \/ Turn 8/)).toBeTruthy();
  });
});
