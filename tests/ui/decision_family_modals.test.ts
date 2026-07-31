// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ReserveRequestModal } from '../../src/ui/map/components/ReserveRequestModal.js';
import { OfficerMatterModal } from '../../src/ui/map/components/OfficerMatterModal.js';
import { IntelligenceBriefModal } from '../../src/ui/map/components/IntelligenceBriefModal.js';
import { CounterOfferModal } from '../../src/ui/map/components/CounterOfferModal.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

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
  afterEach(() => setLocale('en'));

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
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByRole('dialog', { name: 'Reserve request' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Army HQ Request' }).getAttribute('src')).toContain('decision_header_military_staff');
    expect(screen.getByText(/Drina Corps is asking for a reserve commitment/)).toBeTruthy();
    expect(screen.getByText('Offensive')).toBeTruthy();
    expect(container.textContent).not.toContain('offensive_support');
    expect(screen.queryByText('offensive')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Choose from reserve pool' }));

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
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByText('Defensive Gap')).toBeTruthy();
    expect(container.textContent).not.toContain('defensive_gap');
  });

  it('routes a suggested reserve request to its Decision Room card', async () => {
    const approveReserveRequest = vi.fn(async () => ({ ok: true }));
    Object.defineProperty(window, 'awwv', {
      value: { approveReserveRequest },
      configurable: true,
    });
    const onClose = vi.fn();
    const onOpenDecisionRoomTarget = vi.fn(() => true);

    render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-accept',
      state: makeState({
        formations: [
          { id: 'drina_corps', name: 'Drina Corps' },
          { id: 'elite_1', name: '1st Guards Motorized' },
        ] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-accept',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'defensive_gap',
          purpose: 'defensive',
          priority: 80,
          severityBand: 'critical',
          travel_hops: 2,
          description: 'Drina Corps requests reinforcement.',
          suggested_brigade_id: 'elite_1',
          turn_requested: 1,
        }],
      }),
      onClose,
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget,
    }));

    const modal = screen.getByTestId('reserve-request-modal');
    expect(modal.getAttribute('data-request-id')).toBe('req-accept');
    expect(screen.getByTestId('reserve-request-close')).toBeTruthy();
    expect(screen.getByTestId('reserve-request-decline')).toBeTruthy();
    expect(screen.getByTestId('reserve-request-open-pool')).toBeTruthy();

    fireEvent.click(screen.getByTestId('reserve-request-review-suggested'));

    await waitFor(() => expect(onOpenDecisionRoomTarget).toHaveBeenCalledWith({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'command:elite-deploy:req-accept',
    }));
    expect(approveReserveRequest).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    delete (window as unknown as { awwv?: unknown }).awwv;
  });

  it('keeps the reserve request open when the Decision Room cannot take ownership', () => {
    const onClose = vi.fn();
    const onOpenDecisionRoomTarget = vi.fn(() => false);

    render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-blocked',
      state: makeState({
        formations: [
          { id: 'drina_corps', name: 'Drina Corps' },
          { id: 'elite_1', name: '1st Guards Motorized' },
        ] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-blocked',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'defensive_gap',
          purpose: 'defensive',
          priority: 80,
          severityBand: 'critical',
          travel_hops: 2,
          description: 'Drina Corps requests reinforcement.',
          suggested_brigade_id: 'elite_1',
          turn_requested: 1,
        }],
      }),
      onClose,
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget,
    }));

    fireEvent.click(screen.getByTestId('reserve-request-review-suggested'));

    expect(onOpenDecisionRoomTarget).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('reserve-request-modal')).toBeTruthy();
  });

  it('shows reserve donor truth and keeps a missing candidate visible but non-issuable', () => {
    const state = makeState({
      formations: [
        { id: 'drina_corps', name: 'Drina Corps', faction: 'RS', kind: 'corps' },
        { id: 'east_bosnia_corps', name: 'East Bosnia Corps', faction: 'RS', kind: 'corps' },
        {
          id: 'elite_1', name: '1st Guards Motorized', faction: 'RS', kind: 'brigade',
          corps_id: 'east_bosnia_corps', readiness: 'ready', location_osid: 'op:visoko:visoko_2',
        },
      ] as LoadedGameState['formations'],
      pendingReserveRequests: [{
        request_id: 'req-truth',
        corps_id: 'drina_corps',
        faction: 'RS',
        reason: 'defensive_gap',
        purpose: 'defensive',
        priority: 80,
        severityBand: 'critical',
        travel_hops: 3,
        description: 'Thin request description.',
        suggested_brigade_id: 'elite_1',
        turn_requested: 1,
      }],
    });

    const { rerender } = render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-truth',
      state,
      onClose: vi.fn(),
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByText('Candidate force').parentElement?.textContent).toContain('1st Guards Motorized');
    expect(screen.getByText('Urgency').parentElement?.textContent).toContain('Immediate Army Need');
    expect(screen.queryByText('Priority')).toBeNull();
    expect(screen.getByText('Donor command').parentElement?.textContent).toContain('East Bosnia Corps');
    expect(screen.getByText('Source position').parentElement?.textContent).not.toContain('op:visoko');
    expect(screen.getByText('Recipient sector').parentElement?.textContent).toContain('Unreported');
    expect(screen.getAllByText('about 2 weeks travel')).toHaveLength(1);
    expect(screen.getByText('Expected effect').parentElement?.textContent).not.toContain('defensive_gap');
    expect(screen.getByText('Weakened position').parentElement?.textContent).toContain('East Bosnia Corps');
    expect(screen.queryByText('Severity')).toBeNull();
    expect(screen.getByRole('button', { name: 'Decide later' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decline request' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open 1st Guards Motorized dossier' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose from reserve pool' })).toBeTruthy();

    rerender(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-missing',
      state: makeState({
        formations: [{ id: 'drina_corps', name: 'Drina Corps', faction: 'RS', kind: 'corps' }] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-missing', corps_id: 'drina_corps', faction: 'RS', reason: 'defensive_gap',
          purpose: 'defensive', priority: 80, severityBand: 'critical', travel_hops: 3,
          description: 'No staff candidate.', suggested_brigade_id: null, turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByText('No reserve formation is recommended. Open the reserve pool to evaluate available formations, or decline this request.')).toBeTruthy();
    expect(screen.getByText('Select a formation to calculate')).toBeTruthy();
    expect(screen.queryByText('Candidate force')).toBeNull();
    expect(screen.queryByText('Donor command')).toBeNull();
    expect(screen.queryByText('Source position')).toBeNull();
    expect(screen.queryByText('Weakened position')).toBeNull();
    expect(screen.queryByText('Readiness')).toBeNull();
    expect(screen.queryByRole('button', { name: /Open Unreported dossier/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose from reserve pool' })).toBeTruthy();
  });

  it('humanizes engine-style reserve candidate and donor names everywhere in the modal', () => {
    const { container } = render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-raw-names',
      state: makeState({
        formations: [
          { id: 'arbih_1st_corps', name: 'arbih_1st_corps', faction: 'RBiH', kind: 'corps' },
          { id: 'elite_internal_brigade', name: 'elite_internal_brigade', faction: 'RBiH', kind: 'brigade', corps_id: 'arbih_1st_corps' },
          { id: 'arbih_3rd_corps', name: '3rd Corps', faction: 'RBiH', kind: 'corps' },
        ] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-raw-names', corps_id: 'arbih_3rd_corps', faction: 'RBiH', reason: 'defensive_gap',
          purpose: 'defensive', priority: 80, severityBand: 'critical', travel_hops: 1,
          description: 'Reserve support requested.', suggested_brigade_id: 'elite_internal_brigade', turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(container.textContent).toContain('Elite Internal Brigade');
    expect(container.textContent).toContain('1st Corps');
    expect(container.textContent).not.toMatch(/elite_internal_brigade|arbih_1st_corps/);
  });

  it('uses high-contrast decision header treatment over bright packet images', () => {
    const source = readFileSync('src/ui/map/components/DecisionModalImageHeader.tsx', 'utf8');

    expect(source).toContain('from-black/92');
    expect(source).toContain('text-[#d8d1c3]');
    expect(source).not.toContain('from-black/82 via-black/58 to-black/18');
    expect(source).not.toContain('text-text-secondary">{description}</p>');
  });

  it('hides unknown reserve reason and purpose ids behind neutral player copy', () => {
    const { container } = render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-unknown',
      state: makeState({
        formations: [{ id: 'drina_corps', name: 'Drina Corps' }] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-unknown',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'sector_threat_urgent',
          purpose: 'flank_anchor' as never,
          priority: 64,
          severityBand: 'routine',
          travel_hops: 3,
          description: 'sector_threat_urgent raw description payload',
          suggested_brigade_id: null,
          turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByText('Reserve need recorded')).toBeTruthy();
    expect(screen.getByText('Current reserve pressure has exceeded routine army reserve handling.')).toBeTruthy();
    expect(container.textContent).not.toMatch(/sector[_ ]threat[_ ]urgent|flank[_ ]anchor|raw description payload/i);
  });

  it('uses BCS neutral reserve-copy fallbacks without exposing unknown ids', () => {
    setLocale('bcs');

    const { container } = render(React.createElement(ReserveRequestModal, {
      requestId: 'reserve:req-bcs',
      state: makeState({
        formations: [{ id: 'drina_corps', name: 'Drina Corps' }] as LoadedGameState['formations'],
        pendingReserveRequests: [{
          request_id: 'req-bcs',
          corps_id: 'drina_corps',
          faction: 'RS',
          reason: 'unknown_internal_reason',
          purpose: 'unknown_internal_purpose' as never,
          priority: 64,
          severityBand: 'routine',
          travel_hops: 3,
          description: 'unknown_internal_reason raw description payload',
          suggested_brigade_id: null,
          turn_requested: 1,
        }],
      }),
      onClose: vi.fn(),
      onOpenReservePanel: vi.fn(),
      onOpenDecisionRoomTarget: vi.fn(),
    }));

    expect(screen.getByText('Zabilježena potreba za rezervom')).toBeTruthy();
    expect(screen.getByText('Trenutni pritisak na rezervu premašuje rutinsko postupanje armijske rezerve.')).toBeTruthy();
    expect(container.textContent).not.toMatch(/unknown[_ ]internal[_ ]reason|unknown[_ ]internal[_ ]purpose|raw description payload/i);
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

  it('opens the officer matter matching the Inbox dedupe id', async () => {
    const acknowledgeOfficerEvent = vi.fn(async () => ({ ok: true }));
    Object.defineProperty(window, 'awwv', {
      value: { acknowledgeOfficerEvent },
      configurable: true,
    });
    const onClose = vi.fn();
    render(React.createElement(OfficerMatterModal, {
      itemId: 'officer:replacement_suggested:second_officer',
      state: makeState({
        pendingOfficerEvents: [
          {
            event_id: 'evt-first',
            type: 'replacement_suggested',
            faction: 'RS',
            turn: 1,
            officer_id: 'first-officer',
            officer_name: 'First Officer',
            officer_competence: 4,
            officer_aggressiveness: 3,
            officer_defensive_skill: 4,
            acknowledged: false,
            reason: 'First matter.',
          },
          {
            event_id: 'evt-second',
            type: 'replacement_suggested',
            faction: 'RS',
            turn: 1,
            officer_id: 'second-officer',
            officer_name: 'Second Officer',
            current_commander_id: 'incumbent-officer',
            current_commander_name: 'Incumbent Officer',
            officer_competence: 4,
            officer_aggressiveness: 3,
            officer_defensive_skill: 4,
            acknowledged: false,
            reason: 'Second matter.',
          },
        ],
      }),
      onClose,
      onOpenPersonnel: vi.fn(),
    }));

    expect(screen.getByText('Second Officer')).toBeTruthy();
    expect(screen.queryByText('First Officer')).toBeNull();
    expect(screen.getByText(/Historical staff recommendation: appoint Second Officer/)).toBeTruthy();
    expect(screen.getByText(/Leaving this pending keeps Incumbent Officer in command/)).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'File availability notice' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current commander' }));
    await waitFor(() => expect(acknowledgeOfficerEvent).toHaveBeenCalledWith('evt-second'));
    expect(onClose).toHaveBeenCalled();
  });

  it('routes replacement recommendations to the Briefing action that can appoint the successor', () => {
    const onOpenPersonnel = vi.fn();
    render(React.createElement(OfficerMatterModal, {
      itemId: 'officer:replacement_suggested:successor',
      state: makeState({
        pendingOfficerEvents: [{
          event_id: 'replacement-event',
          type: 'replacement_suggested',
          faction: 'RS',
          turn: 1,
          officer_id: 'successor',
          officer_name: 'Historical Successor',
          current_commander_id: 'incumbent',
          current_commander_name: 'Incumbent Commander',
          officer_competence: 4,
          officer_aggressiveness: 3,
          officer_defensive_skill: 4,
          acknowledged: false,
        }],
      }),
      onClose: vi.fn(),
      onOpenPersonnel,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Open personnel' }));

    expect(onOpenPersonnel).toHaveBeenCalledWith('briefing');
  });

  it('labels a new officer arrival as filing a notice rather than an appointment', () => {
    const onOpenPersonnel = vi.fn();
    render(React.createElement(OfficerMatterModal, {
      itemId: 'officer:arrival-event',
      state: makeState({
        pendingOfficerEvents: [{
          event_id: 'arrival-event',
          type: 'officer_available',
          faction: 'RS',
          turn: 4,
          officer_id: 'arriving-officer',
          officer_name: 'Arriving Officer',
          officer_competence: 3,
          officer_aggressiveness: 3,
          officer_defensive_skill: 3,
          acknowledged: false,
        }],
      }),
      onClose: vi.fn(),
      onOpenPersonnel,
    }));

    expect(screen.getByText(/adds Arriving Officer to the reserve pool/i)).toBeTruthy();
    expect(screen.getByText(/does not appoint or reassign anyone/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'File availability notice' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Keep current commander' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open personnel' }));
    expect(onOpenPersonnel).toHaveBeenCalledWith('personnel');
  });

  it('does not substitute the first officer matter when the requested id is stale', () => {
    const { container } = render(React.createElement(OfficerMatterModal, {
      itemId: 'officer:replacement_suggested:stale_officer',
      state: makeState({
        pendingOfficerEvents: [
          {
            event_id: 'evt-first',
            type: 'replacement_suggested',
            faction: 'RS',
            turn: 1,
            officer_id: 'first-officer',
            officer_name: 'First Officer',
            officer_competence: 4,
            officer_aggressiveness: 3,
            officer_defensive_skill: 4,
            acknowledged: false,
            reason: 'First matter.',
          },
        ],
      }),
      onClose: vi.fn(),
      onOpenPersonnel: vi.fn(),
    }));

    expect(container.textContent).toContain('The personnel matter is no longer pending.');
    expect(container.textContent).not.toContain('First Officer');
    expect(screen.getByRole('button', { name: 'Acknowledge' }).getAttribute('disabled')).not.toBeNull();
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
      parentOfferId: 'HRHB_001',
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

  it('explains stale counter-offers and keeps the submit action non-executable', () => {
    const onClose = vi.fn();
    render(React.createElement(CounterOfferModal, {
      offerId: 'counter-offer:STALE_001',
      state: makeState({ pendingCounterOffers: [] }),
      onClose,
    }));

    expect(screen.getAllByText('This counter-offer is no longer pending.').length).toBeGreaterThan(0);
    const submit = screen.getByRole('button', { name: 'Submit as counter-proposal' });
    expect(submit.getAttribute('disabled')).not.toBeNull();
    expect(submit.getAttribute('title')).toBe('This counter-offer is no longer pending.');
    expect(submit.getAttribute('aria-describedby')).toBe('counter-offer-unavailable-reason');

    fireEvent.click(screen.getByRole('button', { name: 'Review later' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
