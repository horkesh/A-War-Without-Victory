import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/ui/rs_turn104_priority_projection.json';
import { deriveInboxItems, type InboxItem } from '../../src/ui/map/data/inboxItems.js';
import { derivePresidentialCommandCategoryCounts } from '../../src/ui/map/data/presidentialCategories.js';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview.js';
import { buildWarroomPriorityDocketView } from '../../src/ui/map/data/warroomPriorityDocket.js';
import { DecisionCard } from '../../src/ui/map/components/presidential_desk/DecisionCard.js';
import { DeskPacket } from '../../src/ui/map/components/presidential_desk/DeskPacket.js';
import { InboxCard } from '../../src/ui/map/components/PresidentialInbox.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeOpportunity(
  proposalId: string,
  reviewId: string,
  expiresTurn: number,
  faction: 'RBiH' | 'RS' | 'HRHB' = 'RS',
) {
  return {
    proposal_id: proposalId,
    opportunity_id: `window-${proposalId}`,
    display_name: `Window ${proposalId}`,
    faction,
    status: 'eligible_pending_review' as const,
    eligibility_turn: 40,
    expires_turn: expiresTurn,
    review_id: reviewId,
    description: 'Staff reports an operational window.',
    recommendation: 'Review the filed dossier.',
    proposed_action: `OPPORTUNITY:${proposalId}`,
    required_axes_green: 1,
    required_axes_total: 1,
    optional_axes_green: 0,
    optional_axes_total: 0,
    prerequisite_axes: [],
    force_quality_traits: [],
    objectives: [],
    staging: [],
    redirect_variants: [],
    available_actions: [],
  };
}

function makeTurn104State(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: '4 Apr 1994 (war)',
    turn: fixture.turn,
    phase: fixture.phase,
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
    player_faction: fixture.playerFaction,
    commandAuthority: fixture.commandAuthority,
    pendingCounterOffers: fixture.pendingCounterOffers,
    commandBriefing: fixture.commandBriefing,
    ...overrides,
  } as LoadedGameState;
}

function makeInboxItem(overrides: Partial<InboxItem>): InboxItem {
  const id = overrides.id ?? 'test-item';
  const priorityBand = overrides.priorityBand ?? 'recommended';
  return {
    type: 'reserve_request',
    severity: 'urgent',
    title: 'Staff request',
    subtitle: 'A filed request awaits review.',
    action: 'army_reserve',
    priority: 20,
    ...overrides,
    id,
    priorityBand,
    priorityModel: overrides.priorityModel ?? {
      id,
      priorityBand,
      blocker: priorityBand === 'required',
      urgency: priorityBand === 'required' ? 0 : 1_000_000,
      source: { id },
      deadlineTurn: null,
      recommendedDestination: 'army-hq',
    },
  };
}

describe('shared presidential priority contract', () => {
  it('projects identical band totals at the turn-104 Decision Room, Command Surface, Desk review, and Advance docket', () => {
    const state = makeTurn104State();
    const decisionRoom = buildPresidentialDecisionRoomView({ state });
    const categories = derivePresidentialCommandCategoryCounts(decisionRoom);
    const deskReview = buildPreAdvanceCommandReviewView({ state });
    const advance = buildWarroomPriorityDocketView({ state });
    const expected = { required: 2, recommended: 3, monitor: 9, record: 0 };
    const categoryTotals = categories.reduce(
      (sum, category) => ({
        required: sum.required + category.priorityCounts.required,
        recommended: sum.recommended + category.priorityCounts.recommended,
        monitor: sum.monitor + category.priorityCounts.monitor,
        record: sum.record + category.priorityCounts.record,
      }),
      { required: 0, recommended: 0, monitor: 0, record: 0 },
    );

    expect(decisionRoom.metrics.priorityCounts).toEqual(expected);
    expect(categoryTotals).toEqual(expected);
    expect(deskReview.metrics.priorityCounts).toEqual(expected);
    expect(advance.metrics.priorityCounts).toEqual(expected);
  });

  it('classifies a critical briefing with no presidential lever as monitor without changing the blocker set', () => {
    const state = makeTurn104State();
    const decisionRoom = buildPresidentialDecisionRoomView({ state });
    const enclave = decisionRoom.cards.find((card) => card.sourceIds?.includes('hum-enclave-srebrenica'));
    const deskReview = buildPreAdvanceCommandReviewView({ state });

    expect(enclave).toMatchObject({ severity: 'critical', priorityBand: 'monitor' });
    expect(deskReview.blockingDecisionCount).toBe(2);
  });

  it('keeps a historical operation authorization required', () => {
    const state = makeTurn104State({
      pendingCounterOffers: [],
      commandBriefing: undefined,
      pendingProposalReviews: [{
        id: 'historical_op_cerska',
        turn: 40,
        faction: 'RS',
        domain: 'ops',
        description: 'Authorize Operation Cerska-Kamenica.',
        proposed_action: 'HISTORICAL_OP:triggered:vrs_drina:Operation Cerska-Kamenica',
      }],
    });
    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.find((card) => card.id === 'command:review-proposal:historical_op_cerska'))
      .toMatchObject({ priorityBand: 'required', severity: 'blocking' });
  });

  it('attaches the shared vocabulary to Inbox rows instead of deriving priority from severity alone', () => {
    const items = deriveInboxItems(makeTurn104State(), null);

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.priorityBand != null)).toBe(true);
    expect(items.find((item) => item.id === 'sit:date:104')).toMatchObject({ priorityBand: 'record' });
  });

  it('renders the shared bands on Desk and Inbox cards instead of the retired urgency vocabulary', () => {
    const recommended = makeInboxItem({ severity: 'urgent', priorityBand: 'recommended' });
    const deskCard = renderToStaticMarkup(React.createElement(DecisionCard, {
      item: recommended,
      onAction: () => {},
    }));
    const inboxCard = renderToStaticMarkup(React.createElement(InboxCard, {
      item: recommended,
      onClick: () => {},
    }));

    for (const html of [deskCard, inboxCard]) {
      expect(html).toContain('Recommended');
      expect(html).toContain('data-priority-band="recommended"');
      expect(html).not.toMatch(/>Urgent<|>URGENT</);
    }
  });

  it('partitions the Desk required section by shared band, not legacy severity', () => {
    const html = renderToStaticMarkup(React.createElement(DeskPacket, {
      items: [
        makeInboxItem({ id: 'required', severity: 'info', priorityBand: 'required' }),
        makeInboxItem({ id: 'monitor', severity: 'blocking', priorityBand: 'monitor', action: 'none' }),
      ],
      onAction: () => {},
    }));

    expect(html).toMatch(/Required<\/div><div[^>]*>1<\/div>/);
    expect(html).toContain('data-priority-band="required"');
    expect(html).toContain('data-priority-band="monitor"');
  });

  it('preserves every grouped required event identity without promoting unrelated review work', () => {
    const pendingEventDecisions = ['event-a', 'event-b'].map((event_id) => ({
      event_id,
      event_title: event_id,
      turn_fired: 12,
      faction: 'RS',
      requires_player_response: true,
      response_options: [{ id: 'ack', label: 'Acknowledge', effects: [] }],
    }));
    const view = buildPresidentialDecisionRoomView({
      state: makeTurn104State({
        pendingCounterOffers: [],
        commandBriefing: undefined,
        pendingEventDecisions,
        pendingOfficerEvents: [
          {
            event_id: 'command-a', type: 'order_pushback', faction: 'RS', turn: 12,
            officer_id: 'co-a', officer_name: 'Commanding officer', officer_competence: 3,
            officer_aggressiveness: 3, officer_defensive_skill: 3, acknowledged: false,
            reason: 'Requests revised orders.',
          },
          {
            event_id: 'personnel-a', type: 'officer_available', faction: 'RS', turn: 12,
            officer_id: 'officer-a', officer_name: 'Staff officer', officer_competence: 3,
            officer_aggressiveness: 3, officer_defensive_skill: 3, acknowledged: false,
          },
        ],
        presidentialReviewQueue: {
          pendingCount: 4,
          criticalCount: 2,
          eventDecisionCount: 2,
          commandInterpretationCount: 1,
          personnelDirectiveCount: 1,
          operationOpportunityCount: 0,
        },
      }),
    });

    expect(view.cards.find((card) => card.id === 'review:pending')).toMatchObject({
      priorityBand: 'required',
      countWeight: 2,
      sourceIds: ['event-a', 'event-b'],
    });
    expect(view.cards.find((card) => card.id === 'pushback:player-army-co')).toMatchObject({
      priorityBand: 'recommended',
      countWeight: 1,
      sourceIds: ['command-a'],
    });
    expect(view.cards.find((card) => card.id === 'review:pending:personnel')).toMatchObject({
      priorityBand: 'recommended',
      countWeight: 1,
      sourceIds: ['personnel-a'],
    });
    expect(view.cards.find((card) => card.id === 'review:pending:open-work')).toBeUndefined();
    expect(view.metrics.priorityCounts.required).toBe(2);
    expect(view.metrics.priorityCounts.recommended).toBeGreaterThanOrEqual(2);
  });

  it('orders the same active dossiers identically on Inbox, Desk, toolbar, and Decision Room from deadline truth', () => {
    const state = makeTurn104State({
      turn: 40,
      pendingCounterOffers: [],
      commandBriefing: undefined,
      pendingProposalReviews: [
        {
          id: 'review-a-late', turn: 40, faction: 'RS', domain: 'ops',
          description: 'Late window.', proposed_action: 'OPPORTUNITY:a-late',
        },
        {
          id: 'review-z-soon', turn: 40, faction: 'RS', domain: 'ops',
          description: 'Soon window.', proposed_action: 'OPPORTUNITY:z-soon',
        },
      ],
      operationOpportunityProposals: [
        makeOpportunity('a-late', 'review-a-late', 48),
        makeOpportunity('z-soon', 'review-z-soon', 41),
      ],
    });
    const expected = ['opportunity:z-soon', 'opportunity:a-late'];
    const inbox = deriveInboxItems(state, null).filter((item) => item.id.startsWith('opportunity:'));
    const decisionRoom = buildPresidentialDecisionRoomView({ state });
    const desk = buildPreAdvanceCommandReviewView({ state });
    const toolbar = buildWarroomPriorityDocketView({ state, limit: 8 });
    const opportunityIds = (rows: readonly { id: string }[]) => rows
      .filter((row) => row.id.startsWith('opportunity:'))
      .map((row) => row.id);

    expect(opportunityIds(inbox)).toEqual(expected);
    expect(opportunityIds(decisionRoom.cards)).toEqual(expected);
    expect(opportunityIds(desk.items)).toEqual(expected);
    expect(opportunityIds(toolbar.items)).toEqual(expected);

    for (const id of expected) {
      const inboxModel = (inbox.find((row) => row.id === id) as any)?.priorityModel;
      const decisionModel = (decisionRoom.cards.find((row) => row.id === id) as any)?.priorityModel;
      expect(inboxModel).toEqual(decisionModel);
      expect(inboxModel).toMatchObject({
        blocker: false,
        source: { id: id.slice('opportunity:'.length) },
        recommendedDestination: 'decision-room',
      });
      expect(inboxModel.deadlineTurn).toBe(id.endsWith('z-soon') ? 41 : 48);
    }
  });

  it('keeps foreign-faction opportunity dossiers outside every presidential surface', () => {
    const state = makeTurn104State({
      turn: 40,
      pendingCounterOffers: [],
      commandBriefing: undefined,
      pendingProposalReviews: [{
        id: 'review-own', turn: 40, faction: 'RS', domain: 'ops',
        description: 'Own window.', proposed_action: 'OPPORTUNITY:own',
      }],
      operationOpportunityProposals: [
        makeOpportunity('own', 'review-own', 41, 'RS'),
        makeOpportunity('foreign', 'review-foreign', 40, 'RBiH'),
      ],
    });

    const ids = buildPresidentialDecisionRoomView({ state }).cards.map((card) => card.id);
    expect(ids).toContain('opportunity:own');
    expect(ids).not.toContain('opportunity:foreign');
  });
});
