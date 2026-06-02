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

    expect(view.status).toBe('blocked');
    expect(view.headline).toBe('Review before advance');
    expect(view.canReviewPriorities).toBe(true);
    expect(view.metrics).toMatchObject({
      urgentCount: 4,
      pendingReviews: 2,
      opportunities: 1,
      advanceReviewCount: 4,
    });
    expect(view.items.map((item) => item.id)).toEqual([
      'review:pending',
      'opportunity:opp_pre_advance',
      'sitrep:front-critical',
      'turn:31:hard-turn',
    ]);
    expect(view.items[0]).toMatchObject({
      severity: 'blocking',
      category: 'decision',
      actionLabel: 'Open Desk',
      sourceOwner: 'Presidential review queue',
      navigationTarget: { kind: 'inbox' },
    });
    expect(view.items.find((item) => item.id === 'turn:31:hard-turn')).toMatchObject({
      actionLabel: 'Open Turn Record',
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 31 },
    });
    expect(view.sourceHandoffs.map((handoff) => handoff.id)).toEqual([
      'presidential-inbox',
      'army-hq-briefing',
      'army-hq-summary',
      'turn-aftermath-records',
    ]);
    expect(view.sourceHandoffs[0]).toMatchObject({
      label: 'Presidential Inbox',
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
          { faction: 'RS', strength: 150, target_osid: 'op:bijeljina:bijeljina_2', estimated_civilian_risk: 11 },
        ],
      }),
    });

    expect(view.status).toBe('blocked');
    expect(view.blockingDecisionCount).toBe(2);
    expect(view.items[0]).toMatchObject({
      id: 'paramilitary:pending',
      severity: 'blocking',
      category: 'decision',
      actionLabel: 'Review deployment',
      navigationTarget: { kind: 'inbox' },
    });
  });

  it('uses the manifest summary for blocking counts across modal and advisory decision families', () => {
    const view = buildPreAdvanceCommandReviewView({
      state: makeState({
        playerDecisionSummary: makePlayerDecisionSummary(),
        pendingParamilitaryRequests: [
          { faction: 'RBiH', strength: 300, target_osid: 'op:zvornik:zvornik_2', estimated_civilian_risk: 21, mode: 'offensive' },
        ],
        pendingConvoyDecisions: [
          { id: 'convoy_srebrenica', target_enclave: 'srebrenica', route_faction: 'RS', supply_amount: 20 },
        ],
        pendingDayton: {
          territorialPackages: [],
          institutionalPackages: [],
          factionCapital: {},
          patronOverride: {},
        },
        pendingPeacePlan: {
          planId: 'vance_owen',
          planName: 'Vance-Owen Peace Plan',
          narrative: 'International mediators have presented a proposal.',
          turnOffered: 24,
          proposedSplit: { RBiH: 0, RS: 0, HRHB: 0 },
          institutionalModel: 'cantons',
          botResponses: {},
        },
        pendingReserveRequests: [
          {
            request_id: 'reserve_1',
            corps_id: 'arbih_3rd_corps',
            faction: 'RBiH',
            reason: 'defensive_gap',
            priority: 40,
            severityBand: 'routine',
            travel_hops: 2,
            description: 'Routine reserve request.',
            suggested_brigade_id: null,
            turn_requested: 24,
          },
        ],
        pendingOfficerEvents: [
          {
            event_id: 'officer_1',
            type: 'officer_available',
            faction: 'RBiH',
            turn: 24,
            officer_id: 'officer_new',
            officer_name: 'Staff Officer',
            officer_competence: 0.5,
            officer_aggressiveness: 0.4,
            officer_defensive_skill: 0.6,
            acknowledged: false,
          },
        ],
      } as Partial<LoadedGameState>),
    });

    expect(view.status).toBe('blocked');
    expect(view.blockingDecisionCount).toBe(4);
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
    expect(review.sourceHandoffs.map((handoff) => [handoff.id, handoff.navigationTarget])).toEqual([
      ['presidential-inbox', { kind: 'inbox' }],
      ['army-hq-briefing', { kind: 'army-hq-tab', tab: 'briefing' }],
      ['army-hq-summary', { kind: 'army-hq-tab', tab: 'summary' }],
      ['turn-aftermath-records', { kind: 'army-hq-aftermath-record', turn: 31 }],
    ]);
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
    expect(reviewView.headline).toBe('Pregled prije napredovanja');
    expect(unavailableView.headline).toBe('Nema učitanog stanja');
  });
});
