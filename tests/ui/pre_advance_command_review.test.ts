import { afterEach, describe, expect, it } from 'vitest';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview.js';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState, OperationOpportunityProposalView, PlayerDecisionSummaryView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 31,
    battles: [],
    territory_net: {},
    notable_flips: [],
    displacement_total: 0,
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
    notable_events: [],
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<OperationOpportunityProposalView> = {}): OperationOpportunityProposalView {
  return {
    proposal_id: 'opp_pre_advance',
    opportunity_id: 'pre_advance_window',
    display_name: 'Pre-Advance Window',
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 31,
    expires_turn: 31,
    review_id: 'review_pre_advance',
    description: 'Staff believes the operation window is closing.',
    recommendation: 'Review before ending the turn.',
    proposed_action: 'OPPORTUNITY:opp_pre_advance',
    required_axes_green: 1,
    required_axes_total: 2,
    optional_axes_green: 1,
    optional_axes_total: 1,
    prerequisite_axes: [],
    force_quality_traits: [],
    objectives: [],
    staging: [],
    redirect_variants: [],
    available_actions: [],
    ...overrides,
  };
}

function makeSitrep(overrides: Partial<OperationalSitrepView> = {}): OperationalSitrepView {
  return {
    headline: 'Front alert.',
    territory: {
      territoryPercent: 44,
      settlementsControlled: 110,
      settlementsTotal: 250,
    },
    front: {
      engagedCount: 5,
      exposedCount: 2,
      edges: [],
    },
    readiness: {
      weakestBrigades: [],
      encircledCount: 0,
    },
    sustainment: {
      adequateCount: 8,
      strainedCount: 3,
      criticalCount: 1,
      collapsedMunicipalities: [],
      activeHostileTakeoverTimers: 0,
      activeCamps: 0,
    },
    operations: {
      activeCount: 1,
      corps: [],
    },
    alerts: [
      {
        id: 'front-critical',
        severity: 'critical',
        text: 'Two exposed fronts require command review.',
      },
    ],
    ...overrides,
  };
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  const latestTurnSummary = overrides.latestTurnSummary === undefined
    ? makeSummary()
    : overrides.latestTurnSummary;
  return {
    label: 'Turn 31',
    turn: 31,
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
    latestTurnSummary,
    turnSummaries: latestTurnSummary ? [latestTurnSummary] : [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function makePlayerDecisionSummary(overrides: Partial<PlayerDecisionSummaryView> = {}): PlayerDecisionSummaryView {
  return {
    totalCount: 6,
    blockingCount: 4,
    families: [
      { id: 'peace_plan', count: 1, gatePolicy: 'modal_required' },
      { id: 'dayton_negotiation', count: 1, gatePolicy: 'modal_required' },
      { id: 'paramilitary_request', count: 1, gatePolicy: 'hard_block' },
      { id: 'convoy_decision', count: 1, gatePolicy: 'modal_required' },
      { id: 'reserve_request', count: 1, gatePolicy: 'advisory' },
      { id: 'officer_event', count: 1, gatePolicy: 'advisory' },
    ],
    ...overrides,
  };
}

describe('buildPreAdvanceCommandReviewView', () => {
  afterEach(() => {
    setLocale('en');
  });

  it('projects the Advance Clearance list with direct Desk routing for presidential decisions', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [makeOpportunity()],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 31,
        displacement_total: 1600,
      }),
    });

    const view = buildPreAdvanceCommandReviewView({ state });

    expect(view.status).toBe('review');
    expect(view.headline).toBe('Recommended before advance');
    expect(view.canReviewPriorities).toBe(true);
    expect(view.metrics).toMatchObject({
      priorityCounts: { required: 0, recommended: 5, monitor: 1, record: 3 },
      pendingReviews: 2,
      opportunities: 1,
      advanceReviewCount: 2,
    });
    expect(view.items.map((item) => item.id)).toEqual([
      'opportunity:opp_pre_advance',
      'review:pending',
    ]);
    expect(view.items[0]).toMatchObject({
      severity: 'critical',
      category: 'opportunity',
      actionLabel: 'Review Dossier',
      sourceOwner: 'Operation opportunity dossiers',
      navigationTarget: { kind: 'decision-room' },
    });
    expect(view.items.find((item) => item.id === 'review:pending')).toMatchObject({
      severity: 'blocking',
      category: 'decision',
      actionLabel: "Open President's Desk",
      sourceOwner: 'Presidential review queue',
      navigationTarget: { kind: 'inbox' },
    });
    expect(view.items.find((item) => item.id === 'opportunity:opp_pre_advance')).toMatchObject({
      actionLabel: 'Review Dossier',
      navigationTarget: {
        kind: 'decision-room',
        lens: 'opportunity',
        cardId: 'opportunity:opp_pre_advance',
      },
      sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(view.sourceHandoffs.map((handoff) => handoff.id)).toEqual([
      'army-hq-briefing',
      'presidential-inbox',
    ]);
    expect(view.sourceHandoffs[0]).toMatchObject({
      label: 'Army HQ Briefing',
      count: 1,
      cardIds: ['opportunity:opp_pre_advance'],
    });
    expect(view.sourceHandoffs[1]).toMatchObject({
      label: "President's Desk",
      count: 1,
      cardIds: ['review:pending'],
    });
  });

  it('returns a quiet clear state when no player-facing review items exist', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
      }),
    });

    expect(view.status).toBe('clear');
    expect(view.headline).toBe('Clear to advance');
    expect(view.items).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.metrics.advanceReviewCount).toBe(0);
    expect(view.canReviewPriorities).toBe(true);
  });

  it('blocks advance when paramilitary requests are pending', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RS', strength: 600, target_osid: 'op:zvornik:zvornik_2', estimated_civilian_risk: 42, mode: 'offensive' },
          { faction: 'RBiH', strength: 150, target_osid: 'op:bijeljina:bijeljina_2', estimated_civilian_risk: 11 },
        ],
      }),
    });

    expect(view.status).toBe('blocked');
    expect(view.blockingDecisionCount).toBe(1);
    expect(view.items[0]).toMatchObject({
      id: 'paramilitary:pending',
      severity: 'blocking',
      category: 'decision',
      actionLabel: 'Review paramilitary',
      navigationTarget: { kind: 'inbox' },
    });
  });

  it('does not block advance for already-decided paramilitary request rows', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RBiH', strength: 150, target_osid: 'op:bijeljina:bijeljina_2', estimated_civilian_risk: 11, decision: 'allow' },
          { faction: 'RBiH', strength: 90, target_osid: 'op:brcko:brcko_2', estimated_civilian_risk: 8, decision: 'deny' },
          { faction: 'RBiH', strength: 80, target_osid: 'op:doboj:doboj_2', estimated_civilian_risk: 6, decision: 'regular' },
        ],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
    expect(view.items.find((item) => item.id === 'paramilitary:pending')).toBeUndefined();
  });

  it.each(['always_allow', 'always_deny'] as const)(
    'does not block advance for pending paramilitary rows governed by %s standing policy',
    (paramilitaryPolicy) => {
      const view = buildPreAdvanceCommandReviewView({
        state: makeState({
          player_faction: 'RBiH',
          paramilitaryPolicy,
          pendingParamilitaryRequests: [
            {
              faction: 'RBiH',
              strength: 150,
              target_osid: 'op:bijeljina:bijeljina_2',
              estimated_civilian_risk: 11,
            },
          ],
          latestTurnSummary: null,
          turnSummaries: [],
        } as Partial<LoadedGameState>),
      });

      expect(view.blockingDecisionCount).toBe(0);
      expect(view.status).toBe('clear');
      expect(view.items.find((item) => item.id === 'paramilitary:pending')).toBeUndefined();
    },
  );

  it('does not count foreign pending event decisions in legacy fallback blocking counts', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        presidentialReviewQueue: undefined,
        pendingEventDecisions: [
          {
            event_id: 'rs_only',
            event_title: 'RS Only',
            turn_fired: 1,
            faction: 'RS',
            response_options: [{ id: 'a', label: 'A', effects: [] }],
          },
        ],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
  });

  it('does not count advisory player event decisions in legacy fallback blocking counts', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        presidentialReviewQueue: undefined,
        pendingEventDecisions: [
          {
            event_id: 'advisory_rbih',
            event_title: 'Advisory RBiH',
            turn_fired: 1,
            faction: 'RBiH',
            requires_player_response: false,
            response_options: [{ id: 'a', label: 'A', effects: [] }],
          },
        ],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
  });

  it('does not let stale review queue event counts invent fallback blockers', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        presidentialReviewQueue: {
          pendingCount: 1,
          criticalCount: 1,
          eventDecisionCount: 1,
          commandInterpretationCount: 0,
          personnelDirectiveCount: 0,
          operationOpportunityCount: 0,
        },
        pendingEventDecisions: [],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
    expect(view.items.map((item) => item.id)).not.toContain('review:pending');
  });

  it('counts player convoy decisions as fallback blockers when the manifest summary is absent', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        presidentialReviewQueue: undefined,
        pendingConvoyDecisions: [
          {
            id: 'convoy_rbih',
            target_enclave: 'gorazde',
            route_faction: 'RBiH',
            supply_amount: 18,
          },
          {
            id: 'convoy_rs',
            target_enclave: 'srebrenica',
            route_faction: 'RS',
            supply_amount: 12,
          },
        ],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(1);
    expect(view.status).toBe('blocked');
    expect(view.headline).toBe('Review before advance');
  });

  it('does not count answered convoy decisions as fallback blockers', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        presidentialReviewQueue: undefined,
        pendingConvoyDecisions: [
          {
            id: 'convoy_answered',
            target_enclave: 'gorazde',
            route_faction: 'RBiH',
            supply_amount: 18,
            decision: 'allow',
          },
        ],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
  });

  it('does not let stale manifest summary counts block advance without live blockers', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        playerDecisionSummary: makePlayerDecisionSummary({ blockingCount: 4 }),
        presidentialReviewQueue: undefined,
        pendingParamilitaryRequests: [],
        pendingConvoyDecisions: [
          {
            id: 'convoy_answered',
            target_enclave: 'srebrenica',
            route_faction: 'RBiH',
            supply_amount: 20,
            decision: 'allow',
          },
        ],
        pendingDayton: undefined,
        pendingPeacePlan: undefined,
        pendingReserveRequests: [],
        pendingOfficerEvents: [],
        pendingEventDecisions: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.status).toBe('clear');
    expect(view.blockingDecisionCount).toBe(0);
  });

  it('requires unresolved historical operation authorization before advance', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        player_faction: 'RS',
        pendingProposalReviews: [
          {
            id: 'historical_op_drina',
            turn: 0,
            faction: 'RS',
            domain: 'ops',
            description: 'Authorize Operation Drina.',
            proposed_action: 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina',
          },
        ],
        pendingEventDecisions: [],
        latestTurnSummary: null,
        turnSummaries: [],
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(1);
    expect(view.status).toBe('blocked');
    expect(view.headline).toBe('Review before advance');
    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toMatchObject({
      id: 'command:review-proposal:historical_op_drina',
      severity: 'blocking',
      title: 'Operation Drina',
      actionLabel: 'Authorize before advance',
    });
  });

  it('does not count counter-offers addressed to another faction as pre-advance blockers', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        pendingCounterOffers: [
          {
            id: 'HRHB_FOREIGN',
            author: 'HRHB',
            targetFaction: 'RS',
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
      } as Partial<LoadedGameState>),
    });

    expect(view.blockingDecisionCount).toBe(0);
    expect(view.status).toBe('clear');
  });

  it('preserves Decision Room source targets in pre-advance review rows', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [makeOpportunity()],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 31,
        displacement_total: 1600,
      }),
    });

    const decisionRoom = buildPresidentialDecisionRoomView({ state });
    const review = buildPreAdvanceCommandReviewView({ state });
    const sourceTargetsById = Object.fromEntries(
      decisionRoom.advanceReadiness.items.map((item) => [item.id, item.navigationTarget]),
    );

    expect(review.items.map((item) => [item.id, item.navigationTarget])).toEqual(
      review.items.map((item) => [item.id, sourceTargetsById[item.id]]),
    );
    expect(review.items.map((item) => [item.id, item.navigationTarget.kind])).toEqual([
      ['opportunity:opp_pre_advance', 'decision-room'],
      ['review:pending', 'inbox'],
    ]);
    expect(review.sourceHandoffs.map((handoff) => [handoff.id, handoff.navigationTarget])).toEqual([
      ['army-hq-briefing', { kind: 'army-hq-tab', tab: 'briefing' }],
      ['presidential-inbox', { kind: 'inbox' }],
    ]);
  });

  it('never treats retained aftermath records as pre-advance obligations', () => {
    const state = makeState({
      latestTurnSummary: makeSummary({
        turn: 31,
        displacement_total: 1600,
      }),
      turnSummaries: [makeSummary({
        turn: 31,
        displacement_total: 1600,
      })],
    });

    const unreviewed = buildPreAdvanceCommandReviewView({ state });
    const reviewed = buildPreAdvanceCommandReviewView({
      state,
      reviewedAftermathTurn: 31,
    });

    expect(unreviewed.items.map((item) => item.id)).not.toContain('turn:31:hard-turn');
    expect(reviewed.items.map((item) => item.id)).not.toContain('turn:31:hard-turn');
    expect(reviewed.sourceHandoffs.map((handoff) => handoff.id))
      .not.toContain('turn-aftermath-records');
    expect(reviewed.metrics.hardTurns).toBe(1);
    expect(reviewed.metrics.advanceReviewCount).toBe(0);
    expect(reviewed.status).toBe('clear');
  });

  it('returns a safe unavailable state when no campaign is loaded', () => {
    const view = buildPreAdvanceCommandReviewView({ state: null });

    expect(view.status).toBe('unavailable');
    expect(view.headline).toBe('No state loaded');
    expect(view.items).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.canReviewPriorities).toBe(false);
  });

  it('localizes advance readiness headlines in BCS mode', () => {
    setLocale('bcs');

    const clearView = buildPreAdvanceCommandReviewView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
      }),
    });
    const reviewView = buildPreAdvanceCommandReviewView({
      state: makeState({
        presidentialReviewQueue: {
          pendingCount: 1,
          criticalCount: 1,
          eventDecisionCount: 1,
          commandInterpretationCount: 0,
          personnelDirectiveCount: 0,
          operationOpportunityCount: 0,
        },
      }),
    });
    const unavailableView = buildPreAdvanceCommandReviewView({ state: null });

    expect(clearView.headline).toBe('Spremno za napredovanje');
    expect(reviewView.headline).toBe('Preporuceno prije napredovanja');
    expect(unavailableView.headline).toBe('Nema učitanog stanja');
  });
});
