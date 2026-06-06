// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Chronicle Route')).toBeTruthy();
    expect(screen.getByText('Filed to Chronicle')).toBeTruthy();
  });

  it('opens Chronicle from Chronicle-filed decision records', () => {
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

    expect(useGameStore.getState().chronicleOpen).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Open Chronicle' }));
    expect(useGameStore.getState().chronicleOpen).toBe(true);
  });

  it('renders patron defiance material receipts as Records-filed consequences', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        rawGameState: {
          military: {
            patron_defiance_supply_cuts: [
              { faction: 'RS', turn: 44, cut_fraction: 0.35, support_after: 0.45 },
            ],
          },
        } as any,
      } as Partial<LoadedGameState>),
    });

    render(React.createElement(DecisionConsequenceRecordsPanel));

    expect(screen.getByText('Patron defiance supply cut')).toBeTruthy();
    expect(screen.getByText('Material support reduced')).toBeTruthy();
    expect(screen.getByText('Serbia cut 35% of material support for VRS; support after cut 45%.')).toBeTruthy();
    expect(screen.getByText(/Patron relations \/ Turn 44/)).toBeTruthy();
    expect(screen.getByText('Filed to Records')).toBeTruthy();
    expect(screen.getByText('Review in Records')).toBeTruthy();
  });

  it('keeps decision consequence panel copy localized', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    setLocale('bcs', undefined);
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

    try {
      render(React.createElement(DecisionConsequenceRecordsPanel));

      expect(screen.getByRole('region', { name: 'Zapisi posljedica odluka' })).toBeTruthy();
      expect(screen.getByText('Posljedice odluka')).toBeTruthy();
      expect(screen.getByText('Put Hronike')).toBeTruthy();
      expect(screen.getByText('Arhivirano u: Hronika')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Otvori Hroniku' })).toBeTruthy();
    } finally {
      setLocale('en', undefined);
    }
  });
});
