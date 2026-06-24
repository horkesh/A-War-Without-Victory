// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresidentDeskShell } from '../../src/ui/map/components/presidential_desk/PresidentDeskShell.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { t } from '../../src/ui/map/i18n/index.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
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

function renderDesk(
  props: Partial<React.ComponentProps<typeof PresidentDeskShell>> = {},
) {
  return render(React.createElement(PresidentDeskShell, {
    state: makeState(),
    osidNameMap: null,
    onAction: vi.fn(),
    onAdvance: vi.fn(),
    onOpenArmyHQ: vi.fn(),
    onOpenMap: vi.fn(),
    onOpenRecords: vi.fn(),
    onOpenChronicle: vi.fn(),
    ...props,
  }));
}

afterEach(() => cleanup());

describe('PresidentDeskShell', () => {
  it('renders blockers as the primary desk packet and opens their direct resolver', () => {
    const onAction = vi.fn();
    renderDesk({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
        ],
      }),
      osidNameMap: { bratunac_1: 'Bratunac' },
      onAction,
    });

    expect(screen.getByRole('region', { name: 'President desk' })).toBeTruthy();
    expect(screen.getAllByText('Paramilitary authorization').length).toBeGreaterThan(0);
    expect(screen.getByText('Review deployment')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Paramilitary authorization packet' }).getAttribute('src')).toContain('packet_thumb_paramilitary');

    fireEvent.click(screen.getByText('Review deployment'));

    expect(onAction).toHaveBeenCalledWith('paramilitary_review', 'paramilitary:1');
  });

  it('keeps Army HQ and map inspection as explicit handoffs, not stacked panels', () => {
    const onOpenArmyHQ = vi.fn();
    const onOpenMap = vi.fn();
    renderDesk({ onOpenArmyHQ, onOpenMap });

    fireEvent.click(screen.getByText('Call Army HQ'));
    fireEvent.click(screen.getByText('War Map'));

    expect(onOpenArmyHQ).toHaveBeenCalledOnce();
    expect(onOpenMap).toHaveBeenCalledOnce();
  });

  it('exposes stable live-browser hooks for desk shell handoffs', () => {
    const onOpenRecords = vi.fn();
    const { container } = renderDesk({ onOpenRecords });

    expect(screen.getByTestId('president-desk-shell')).toBeTruthy();
    expect(screen.getByTestId('desk-action-army-hq')).toBeTruthy();
    expect(screen.getByTestId('desk-action-war-map')).toBeTruthy();
    expect(screen.getByTestId('desk-action-advance-clearance')).toBeTruthy();

    fireEvent.click(screen.getByTestId('desk-action-records'));

    expect(onOpenRecords).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-testid="desk-consequence-strip"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="desk-consequence-open-records"]')).toBeTruthy();
  });

  it('renders the ready advance action as an advance-control, not a blocked warning', () => {
    renderDesk();

    const action = screen.getByTestId('desk-action-advance-clearance');
    expect(action.className).toContain('text-accent-gold');
    expect(action.className).not.toContain('text-red-100');
  });

  it('can close when rendered as a warroom overlay', () => {
    const onClose = vi.fn();
    renderDesk({ onClose });

    expect(screen.getByRole('dialog', { name: 'President desk' })).toBe(document.activeElement);

    fireEvent.click(screen.getByRole('button', { name: 'Close President desk overlay' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes the Warroom overlay on Escape', () => {
    const onClose = vi.fn();
    renderDesk({ onClose });

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'President desk' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render raw implementation labels in the desk packet', () => {
    const { container } = renderDesk({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
        ],
      }),
      osidNameMap: { bratunac_1: 'Bratunac' },
    });

    expect(container.textContent).not.toMatch(/pending_required_decisions/);
    expect(container.textContent).not.toMatch(/\bC:\d/);
    expect(container.textContent).not.toMatch(/\bA:\d/);
  });

  it('renders the strategic situation timing as a calendar date without raw turn copy', () => {
    const dateLabel = turnToDateString(12);
    const { container } = renderDesk({
      state: makeState({ turn: 12 }),
    });

    expect(t('desk.situation.dateTurn', { date: dateLabel, turn: 12 })).toBe(dateLabel);
    expect(container.textContent).toContain(dateLabel);
    expect(container.textContent).not.toMatch(/\b(?:turn|potez)\s*12\b/i);
  });

  it('surfaces recent decision consequences on the desk with calendar dates', () => {
    const { container } = renderDesk({
      state: makeState({
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

    expect(screen.getByText('Recent Consequences')).toBeTruthy();
    expect(screen.getByText('Decisions')).toBeTruthy();
    expect(screen.getByText('Cabinet crisis response')).toBeTruthy();
    expect(screen.getByText('Decision recorded')).toBeTruthy();
    expect(screen.getByText('Open Chronicle')).toBeTruthy();
    expect(screen.getByTestId('desk-consequence-row').getAttribute('data-record-target')).toBe('chronicle');
    expect(screen.getByRole('img', { name: 'Cabinet crisis response consequence' }).getAttribute('src')).toContain('consequence_public_pressure');
    expect(container.textContent).toContain(turnToDateString(8));
    expect(container.textContent).not.toContain('Turn 8');
  });

  it('does not label turn-zero setup summaries as filed consequences', () => {
    const { container } = renderDesk({
      state: makeState({
        turn: 0,
        latestTurnSummary: {
          turn: 0,
          battles: [{
            osid: 'op:test:setup',
            attacker_faction: 'RS',
            defender_faction: 'RBiH',
            primary_attacker_id: 'rs_setup',
            primary_defender_id: 'arbih_setup',
            all_attacker_ids: ['rs_setup'],
            outcome: 'breakthrough' as never,
            attacker_casualties: 25,
            defender_casualties: 80,
            territory_flipped: false,
            was_concentrated: false,
          }],
          territory_net: { RBiH: -4 },
          notable_flips: [],
          displacement_total: 2400,
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
          notable_events: [{ kind: 'first_battle', description: 'Scenario setup', faction: 'RBiH' }],
        },
        turnSummaries: [],
        firedEvents: [],
        rawGameState: {} as any,
      }),
    });

    expect(container.textContent).toContain('No campaign record loaded.');
    expect(container.textContent).not.toContain('Last filed record');
    expect(container.textContent).toMatch(/Battles\s*0/);
    expect(container.textContent).toMatch(/Displaced\s*0/);
    expect(container.textContent).toMatch(/Events\s*0/);
    expect(container.textContent).toMatch(/Decisions\s*0/);
    expect(container.querySelector('[data-testid="desk-consequence-row"]')).toBeNull();
  });

  it('matches Advance Clearance blocking truth for counter-offer reviews', () => {
    renderDesk({
      state: makeState({
        pendingCounterOffers: [
          {
            id: 'HRHB_001',
            author: 'HRHB',
            parentOfferId: 'owen_stoltenberg',
            planId: 'owen_stoltenberg',
            planName: 'Owen-Stoltenberg Plan',
            chainDepth: 1,
            createdTurn: 70,
            response: 'conditional_accept',
            proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
            institutionalModel: 'union_3_republics',
            sourceCitation: 'BB1 p.49',
            rider: 'withdraw territorial concessions',
          },
        ],
      }),
    });

    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(screen.queryByText('Ready')).toBeNull();
  });

  it('counts modal-required convoy decisions as required desk signatures', () => {
    const { container } = renderDesk({
      state: makeState({
        player_faction: 'RBiH',
        pendingConvoyDecisions: [
          {
            id: 'convoy_rbih',
            target_enclave: 'gorazde',
            route_faction: 'RBiH',
            supply_amount: 18,
          },
        ],
      } as Partial<LoadedGameState>),
    });

    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(container.textContent).toMatch(/Required\s*1/);
    expect(screen.queryByText('No signatures required')).toBeNull();
  });

  it('routes the blocked advance action to advance review instead of generic command cards', () => {
    const onAdvance = vi.fn();
    const onReviewAdvance = vi.fn();
    const onOpenCommandSurface = vi.fn();
    renderDesk({
      onAdvance,
      onReviewAdvance,
      onOpenCommandSurface,
      state: makeState({
        pendingCounterOffers: [
          {
            id: 'HRHB_001',
            author: 'HRHB',
            parentOfferId: 'owen_stoltenberg',
            planId: 'owen_stoltenberg',
            planName: 'Owen-Stoltenberg Plan',
            chainDepth: 1,
            createdTurn: 70,
            response: 'conditional_accept',
            proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
            institutionalModel: 'union_3_republics',
            sourceCitation: 'BB1 p.49',
            rider: 'withdraw territorial concessions',
          },
        ],
      }),
    });

    expect(screen.queryByTestId('desk-action-advance-clearance')).toBeNull();
    fireEvent.click(screen.getByTestId('desk-action-review-blockers'));

    expect(onReviewAdvance).toHaveBeenCalledOnce();
    expect(onOpenCommandSurface).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('routes desk consequence rows to their filed surface', () => {
    const onOpenRecords = vi.fn();
    const onOpenDecisionRecords = vi.fn();
    const onOpenChronicle = vi.fn();
    renderDesk({
      onOpenRecords,
      onOpenDecisionRecords,
      onOpenChronicle,
      state: makeState({
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
        rawGameState: {
          military: {
            patron_defiance_supply_cuts: [
              { faction: 'RS', turn: 9, cut_fraction: 0.25, support_after: 0.5 },
            ],
          },
        } as any,
      }),
    });

    fireEvent.click(screen.getByText('Cabinet crisis response'));
    fireEvent.click(screen.getByText('Patron defiance supply cut'));

    expect(onOpenChronicle).toHaveBeenCalledWith('event:cabinet-crisis');
    expect(onOpenDecisionRecords).toHaveBeenCalledWith('patron-defiance:RS:9:0.25:0.5');
    expect(onOpenRecords).not.toHaveBeenCalled();
  });

  it('counts all filed decision consequences while rendering only the latest rows', () => {
    renderDesk({
      state: makeState({
        firedEvents: [
          {
            id: 'oldest',
            turn: 6,
            title: 'Oldest decision',
            narrative: 'Recorded.',
            category: 'political',
            effects: [{ kind: 'authority', description: 'Recorded.' }],
            isDecision: true,
          },
          {
            id: 'middle',
            turn: 7,
            title: 'Middle decision',
            narrative: 'Recorded.',
            category: 'political',
            effects: [{ kind: 'authority', description: 'Recorded.' }],
            isDecision: true,
          },
          {
            id: 'newest',
            turn: 8,
            title: 'Newest decision',
            narrative: 'Recorded.',
            category: 'political',
            effects: [{ kind: 'authority', description: 'Recorded.' }],
            isDecision: true,
          },
        ],
      }),
    });

    expect(screen.getByText('Decisions').parentElement?.textContent).toContain('3');
    expect(screen.getAllByTestId('desk-consequence-row')).toHaveLength(2);
  });
});
