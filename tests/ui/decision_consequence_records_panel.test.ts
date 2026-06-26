// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DecisionConsequenceRecordsPanel } from '../../src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
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
  it('keeps Chronicle-filed presidential choices out of Army HQ Records rows', () => {
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
    expect(screen.getByText('No presidential decision consequences have been filed yet.')).toBeTruthy();
    expect(screen.queryByText('Cabinet crisis response')).toBeNull();
    expect(screen.queryByText('Decision recorded')).toBeNull();
    expect(screen.queryByText(`Event decision / ${turnToDateString(8)}`)).toBeNull();
    expect(screen.queryByText('Filed to Chronicle')).toBeNull();
  });

  it('does not expose an Army HQ action for Chronicle-filed decision records', () => {
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
    expect(screen.queryByRole('button', { name: 'Open Chronicle' })).toBeNull();
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
    expect(screen.getByText(`Patron relations / ${turnToDateString(44)}`)).toBeTruthy();
    expect(screen.queryByText(/Patron relations \/ Turn 44/)).toBeNull();
    expect(screen.getByText('Filed to Records')).toBeTruthy();
    expect(screen.getByText('Review in Records')).toBeTruthy();
  });

  it('applies the row cap after filtering out Chronicle-filed decisions', () => {
    const firedEvents = Array.from({ length: 60 }, (_, index) => ({
      id: `chronicle-decision-${index}`,
      turn: 100 + index,
      title: `Chronicle decision ${index}`,
      narrative: 'A Chronicle-targeted decision was recorded.',
      category: 'political',
      effects: [{ kind: 'authority', description: 'Authority held.' }],
      isDecision: true,
    }));
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        firedEvents,
        rawGameState: {
          military: {
            patron_defiance_supply_cuts: [
              { faction: 'RS', turn: 12, cut_fraction: 0.2, support_after: 0.6 },
            ],
          },
        } as any,
      } as Partial<LoadedGameState>),
    });

    render(React.createElement(DecisionConsequenceRecordsPanel));

    expect(screen.getByText('Patron defiance supply cut')).toBeTruthy();
    expect(screen.getByText('Filed to Records')).toBeTruthy();
    expect(screen.queryByText('Chronicle decision 59')).toBeNull();
  });

  it('focuses an older decision consequence when routed from the desk', () => {
    const reserveRequestHistory = Array.from({ length: 60 }, (_, index) => ({
      request_id: `reserve_${index.toString().padStart(2, '0')}`,
      turn: index + 1,
      faction: 'RS',
      corps_id: 'vrs_drina_corps',
      brigade_id: `reserve_brigade_${index.toString().padStart(2, '0')}`,
      outcome: 'accepted',
      reason: 'Army CO accepted: request is actionable.',
      decided_by: 'player',
      purpose: 'defensive',
      why_needed: 'Drina Corps needs a reserve to stabilize the front.',
      how_to_use: 'Anchor the weakest sector.',
    }));
    const formations = [
      {
        id: 'vrs_drina_corps',
        faction: 'RS',
        name: 'Drina Corps',
        kind: 'corps',
        readiness: 'ready',
        cohesion: 75,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
      },
      ...reserveRequestHistory.map((request, index) => ({
        id: request.brigade_id,
        faction: 'RS',
        name: `Reserve Brigade ${index.toString().padStart(2, '0')}`,
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 75,
        fatigue: 0,
        status: 'active',
        createdTurn: 1,
        tags: [],
      })),
    ];
    useGameStore.setState({
      loadedGameState: makeState({ formations, reserveRequestHistory } as Partial<LoadedGameState>),
      focusedDecisionConsequenceId: 'reserve:reserve_00',
    });

    render(React.createElement(DecisionConsequenceRecordsPanel));

    const focused = screen.getByText('Reserve Brigade 00 assigned to Drina Corps. Drina Corps needs a reserve to stabilize the front.').closest('article');
    expect(focused?.getAttribute('data-focused-decision-consequence-id')).toBe('reserve:reserve_00');
    expect(document.activeElement).toBe(focused);
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
      expect(screen.getByText('Jos nema arhiviranih posljedica predsjedničkih odluka.')).toBeTruthy();
      expect(screen.queryByText('Odluka zabilježena')).toBeNull();
      expect(screen.queryByText(`Odluka događaja / ${turnToDateString(8)}`)).toBeNull();
      expect(screen.queryByText('Arhivirano u: Hronika')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Otvori Hroniku' })).toBeNull();
      expect(screen.queryByText('Decision recorded')).toBeNull();
      expect(screen.queryByText(/Event decision \/ Turn 8/)).toBeNull();
    } finally {
      setLocale('en', undefined);
    }
  });
});
