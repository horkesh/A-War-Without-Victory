import { describe, expect, it } from 'vitest';
import { buildPreAdvanceCommandReviewView } from '../../src/ui/map/data/preAdvanceCommandReview.js';
import type { LoadedGameState, OperationOpportunityProposalView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

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

describe('buildPreAdvanceCommandReviewView', () => {
  it('projects the Decision Room advance-readiness list for the turn confirmation flow', () => {
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
      actionLabel: 'Review Queue',
      sourceOwner: 'Presidential review queue',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(view.items.find((item) => item.id === 'turn:31:hard-turn')).toMatchObject({
      actionLabel: 'Open Turn Record',
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 31 },
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
    expect(view.metrics.advanceReviewCount).toBe(0);
    expect(view.canReviewPriorities).toBe(true);
  });

  it('returns a safe unavailable state when no campaign is loaded', () => {
    const view = buildPreAdvanceCommandReviewView({ state: null });

    expect(view.status).toBe('unavailable');
    expect(view.headline).toBe('No state loaded');
    expect(view.items).toEqual([]);
    expect(view.canReviewPriorities).toBe(false);
  });
});
