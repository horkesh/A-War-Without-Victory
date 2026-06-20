// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReserveRequestModal } from '../../src/ui/map/components/ReserveRequestModal.js';
import { OfficerMatterModal } from '../../src/ui/map/components/OfficerMatterModal.js';
import { IntelligenceBriefModal } from '../../src/ui/map/components/IntelligenceBriefModal.js';
import { CounterOfferModal } from '../../src/ui/map/components/CounterOfferModal.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

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

afterEach(() => cleanup());

describe('decision family modals', () => {
  it('surfaces reserve requests as a presidential modal with localized purpose copy and an explicit pool handoff', () => {
    const onOpenReservePanel = vi.fn();

    const { container, rerender } = render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-1',
      state: makeState({
        formations: [{ id: 'drina_corps', name: 'Drina Corps' }] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-1',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'offensive_support',
          purpose: 'offensive',
          priority: 80,
          severityBand: 'critical',
          travel_hops: 2,
          description: 'Drina Corps requests reinforcement for the active line.',
          suggested_brigade_id: null,
          turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel,
    }));

    expect(screen.getByRole('dialog', { name: 'Reserve request' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Army HQ Request' }).getAttribute('src')).toContain('decision_header_military_staff');
    expect(screen.getByText(/Drina Corps is asking for a reserve commitment/)).toBeTruthy();
    expect(screen.getByText('Offensive')).toBeTruthy();
    expect(container.textContent).not.toContain('offensive_support');
    expect(screen.queryByText('offensive')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open reserve pool' }));

    expect(onOpenReservePanel).toHaveBeenCalledOnce();

    rerender(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-2',
      state: makeState({
        formations: [{ id: 'drina_corps', name: 'Drina Corps' }] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-2',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'defensive_gap',
          priority: 70,
          severityBand: 'routine',
          travel_hops: 1,
          description: 'Drina Corps requests reinforcement for an exposed sector.',
          suggested_brigade_id: null,
          turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel,
    }));

    expect(screen.getByText('Defensive Gap')).toBeTruthy();
    expect(container.textContent).not.toContain('defensive_gap');
  });

  it('surfaces officer matters without raw commander stat notation', () => {
    const { container } = render(React.createElement(OfficerMatterModal, {
      itemId: 'officer:evt-1',
      state: makeState({
        pendingOfficerEvents: [{
          event_id: 'evt-1',
          type: 'order_pushback',
          faction: 'RS',
          turn: 1,
          officer_id: 'officer-1',
          officer_name: 'Gen. Staff Officer',
          officer_competence: 4,
          officer_aggressiveness: 3,
          officer_defensive_skill: 4,
          acknowledged: false,
          reason: 'The commander asks for clarification before committing reserves.',
        }],
      }),
      onClose: vi.fn(),
      onOpenPersonnel: vi.fn(),
    }));

    expect(screen.getByRole('dialog', { name: 'Personnel matter' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Personnel Office' }).getAttribute('src')).toContain('decision_header_personnel');
    expect(screen.getByText('Gen. Staff Officer')).toBeTruthy();
    expect(screen.getByText('Command objection')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bC:\d|\bA:\d|pending_required_decisions/);
    expect(container.textContent).not.toMatch(/order pushback|order_pushback|replacement suggested|replacement_suggested/i);
  });

  it('requires intelligence briefs to be opened and acknowledged as a readable brief', () => {
    render(React.createElement(IntelligenceBriefModal, {
      notificationId: 'intel:intel-1',
      state: makeState({
        pendingEventNotifications: [{
          notification_id: 'intel-1',
          event_id: 'event-1',
          source_faction: 'RS',
          target_faction: 'RS',
          response_id: 'noted',
          surfaced_on_turn: 1,
          headline: 'Border movement reported',
          body: 'Staff reports enemy movement near the assigned sector.',
          consumed: false,
        }],
      }),
      onClose: vi.fn(),
    }));

    expect(screen.getByRole('dialog', { name: 'Border movement reported' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Intelligence Channel' }).getAttribute('src')).toContain('decision_header_intelligence');
    expect(screen.getByText('Staff reports enemy movement near the assigned sector.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeTruthy();
  });

  it('opens counter-offers as a focused presidential negotiation modal', async () => {
    const submitCounterOffer = vi.fn(async () => ({ ok: true, counter_offer_id: 'PLAYER_001' }));
    Object.defineProperty(window, 'awwv', {
      value: { submitCounterOffer },
      configurable: true,
    });
    const onClose = vi.fn();

    render(React.createElement(CounterOfferModal, {
      offerId: 'counter-offer:HRHB_001',
      state: makeState({
        pendingCounterOffers: [{
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
        }],
      }),
      onClose,
    }));

    expect(screen.getByRole('dialog', { name: 'Counter-offer from Croatian Republic of Herzeg-Bosnia' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Negotiation channel' }).getAttribute('src')).toContain('decision_header_counter_offer');
    expect(screen.getByText('Owen-Stoltenberg Plan')).toBeTruthy();
    // Split columns label the share by the resolved political faction name
    // (no raw faction slug headline).
    expect(screen.getByText('Republic of Bosnia and Herzegovina')).toBeTruthy();
    expect(screen.queryByText('RBiH')).toBeNull();
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText('BB1 p.49')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Submit as counter-proposal' }));

    await waitFor(() => expect(submitCounterOffer).toHaveBeenCalledWith({
      parentOfferId: 'owen_stoltenberg',
      planId: 'owen_stoltenberg',
      response: 'conditional_accept',
      proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
      rider: 'withdraw territorial concessions',
    }));
    delete (window as unknown as { awwv?: unknown }).awwv;
  });

  it('hides unknown counter-offer response and institutional ids behind neutral labels', () => {
    const { container } = render(React.createElement(CounterOfferModal, {
      offerId: 'counter-offer:RS_002',
      state: makeState({
        pendingCounterOffers: [{
          id: 'RS_002',
          author: 'RS',
          parentOfferId: 'peace_plan',
          planId: 'peace_plan',
          planName: 'Peace proposal',
          chainDepth: 2,
          createdTurn: 70,
          response: 'surprise_counter_offer' as never,
          proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
          institutionalModel: 'union_3_republics_extra',
          sourceCitation: '',
        }],
      }),
      onClose: vi.fn(),
    }));

    expect(screen.getByText('Unspecified response')).toBeTruthy();
    expect(screen.getByText('Unspecified institutional model')).toBeTruthy();
    expect(container.textContent).not.toMatch(/surprise[_ ]counter[_ ]offer|union[_ ]3[_ ]republics[_ ]extra/i);
  });
});
