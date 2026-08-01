// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('links an authored source decision forward to its filed receipt and back', () => {
    const eventCatalog = new Map<string, any>([
      ['source-event', {
        id: 'source-event',
        title: 'Source event',
        family: 'test',
        historical_default_response_id: 'accept',
        response_options: [{
          id: 'accept',
          label: 'Accept the recommendation',
          future_consequences: [{
            label: 'Downstream consequence',
            explanation: 'The dossier predicted this consequence.',
            opens_events: ['downstream-event'],
          }],
        }],
      }],
      ['downstream-event', { id: 'downstream-event', title: 'Downstream event', response_options: [] }],
    ]);
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        rawGameState: {
          meta: { player_faction: 'RS' },
          military: {
            event_decision_log: [{
              event_id: 'source-event',
              response_id: 'accept',
              decision_source: 'player',
              faction: 'RS',
              turn: 4,
            }],
            event_causality_log: [{
              turn: 7,
              from_event: 'source-event',
              to_event: 'downstream-event',
              to_flag: null,
              kind: 'enables',
              source_response_id: 'accept',
            }],
            fired_event_ids: ['source-event', 'downstream-event'],
            event_last_fired_turn: { 'source-event': 4, 'downstream-event': 7 },
            closed_event_ids: [],
          },
        } as any,
      }),
    });

    render(React.createElement(
      DecisionConsequenceRecordsPanel as React.ComponentType<any>,
      { eventCatalog },
    ));

    const sourceRow = screen.getByTestId('decision-history-row');
    expect(sourceRow.getAttribute('data-source-record-id')).toBe('decision:source-event::accept::4');
    fireEvent.click(screen.getByText('Source event'));
    const receiptRow = screen.getByTestId('decision-history-receipt-row');
    expect(receiptRow.getAttribute('data-receipt-record-id'))
      .toBe('receipt:source-event::accept::4::downstream-event');
    expect(receiptRow.getAttribute('data-source-record-id')).toBe('decision:source-event::accept::4');
    fireEvent.click(screen.getByRole('button', { name: 'Back to source decision' }));
    expect(document.activeElement).toBe(sourceRow.querySelector('button'));
  });

  it('keeps recurring decisions, receipts, expansion, and source focus on exact decision identity', () => {
    const eventCatalog = new Map<string, any>([
      ['recurring-event', {
        id: 'recurring-event',
        title: 'Recurring staff question',
        family: 'test',
        historical_default_response_id: 'first',
        response_options: [
          {
            id: 'first',
            label: 'Choose the first course',
            future_consequences: [{
              label: 'First downstream consequence',
              explanation: 'First recurring decision promise.',
              opens_events: ['first-downstream'],
            }],
          },
          {
            id: 'second',
            label: 'Choose the second course',
            future_consequences: [{
              label: 'Second downstream consequence',
              explanation: 'Second recurring decision promise.',
              opens_events: ['second-downstream'],
            }],
          },
        ],
      }],
      ['first-downstream', { id: 'first-downstream', title: 'First downstream', response_options: [] }],
      ['second-downstream', { id: 'second-downstream', title: 'Second downstream', response_options: [] }],
    ]);
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        rawGameState: {
          meta: { player_faction: 'RS' },
          military: {
            event_decision_log: [
              { event_id: 'recurring-event', response_id: 'first', decision_source: 'player', faction: 'RS', turn: 4 },
              { event_id: 'recurring-event', response_id: 'second', decision_source: 'player', faction: 'RS', turn: 8 },
            ],
            event_causality_log: [
              { turn: 6, from_event: 'recurring-event', to_event: 'first-downstream', to_flag: null, kind: 'enables', source_response_id: 'first' },
              { turn: 10, from_event: 'recurring-event', to_event: 'second-downstream', to_flag: null, kind: 'enables', source_response_id: 'second' },
            ],
            fired_event_ids: ['recurring-event', 'first-downstream', 'second-downstream'],
            event_last_fired_turn: { 'recurring-event': 8, 'first-downstream': 6, 'second-downstream': 10 },
            closed_event_ids: [],
          },
        } as any,
      }),
    });

    render(React.createElement(
      DecisionConsequenceRecordsPanel as React.ComponentType<any>,
      { eventCatalog },
    ));

    const sourceRows = screen.getAllByTestId('decision-history-row');
    expect(sourceRows.map((row) => row.getAttribute('data-source-record-id'))).toEqual([
      'decision:recurring-event::first::4',
      'decision:recurring-event::second::8',
    ]);

    fireEvent.click(sourceRows[0]!.querySelector('button')!);
    expect(screen.getByText('First downstream consequence')).toBeTruthy();
    expect(screen.queryByText('Second downstream consequence')).toBeNull();
    expect(screen.getByTestId('decision-history-receipt-row').getAttribute('data-receipt-record-id'))
      .toBe('receipt:recurring-event::first::4::first-downstream');

    fireEvent.click(sourceRows[1]!.querySelector('button')!);
    expect(screen.queryByText('First downstream consequence')).toBeNull();
    expect(screen.getByText('Second downstream consequence')).toBeTruthy();
    expect(screen.getByTestId('decision-history-receipt-row').getAttribute('data-source-record-id'))
      .toBe('decision:recurring-event::second::8');
    fireEvent.click(screen.getByRole('button', { name: 'Back to source decision' }));
    expect(document.activeElement).toBe(sourceRows[1]!.querySelector('button'));
  });

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

  it('renders a BCS autonomy receipt from structured stance fields without English or raw tokens', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    setLocale('bcs', undefined);
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        formations: [{
          id: 'vrs_drina',
          faction: 'RS',
          name: 'Drinski korpus',
          kind: 'corps',
          readiness: 'ready',
          cohesion: 70,
          fatigue: 0,
          status: 'active',
          createdTurn: 1,
          tags: [],
        }],
        rawGameState: {
          meta: {
            player_faction: 'RS',
            proposal_decision_history: [{
              id: 'PROP_12_military_0',
              turn: 12,
              resolved_turn: 13,
              faction: 'RS',
              domain: 'military',
              description: 'Formula AI recommends Drina Corps shift from balanced to offensive.',
              proposed_action: 'SET_STANCE:vrs_drina:offensive',
              current_value: 'balanced',
              proposed_value: 'offensive',
              accepted: true,
            }],
          },
          military: {},
        } as any,
      }),
    });

    try {
      render(React.createElement(DecisionConsequenceRecordsPanel));

      expect(screen.getByText('Drinski korpus: Uravnoteženo → Ofanzivno.')).toBeTruthy();
      expect(document.body.textContent).not.toMatch(
        /Formula AI|Drina Corps|balanced|offensive|SET_STANCE|vrs_drina|PROP_12/,
      );
    } finally {
      setLocale('en', undefined);
    }
  });
});
