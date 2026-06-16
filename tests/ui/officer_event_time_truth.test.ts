// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { OfficerEventBadge } from '../../src/ui/map/components/OfficerEventBadge.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
    phase: 'war',
    player_faction: 'RS',
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

describe('OfficerEventBadge player-time truth', () => {
  it('does not expose future legal outcomes in live personnel prompts', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        pendingOfficerEvents: [{
          event_id: 'evt-legal-record',
          type: 'officer_available',
          faction: 'RS',
          turn: 1,
          officer_id: 'officer-1',
          officer_name: 'Gen. Staff Officer',
          officer_competence: 4,
          officer_aggressiveness: 3,
          officer_defensive_skill: 4,
          acknowledged: false,
          war_crimes_record: {
            court: 'ICTY',
            verdict: 'convicted',
            sentence: 'Life imprisonment',
            charges: 'Genocide; crimes against humanity',
            summary: 'Convicted by the ICTY.',
          },
        }],
      }),
    });

    render(React.createElement(OfficerEventBadge));

    fireEvent.click(screen.getByRole('button', { name: /officers/i }));

    expect(screen.getByText('Gen. Staff Officer')).toBeTruthy();
    expect(document.body.textContent).not.toContain('ICTY');
    expect(document.body.textContent).not.toContain('Life imprisonment');
    expect(document.body.textContent).not.toContain('Genocide; crimes against humanity');
  });
});
