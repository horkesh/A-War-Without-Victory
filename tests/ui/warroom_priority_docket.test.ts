import { describe, expect, it } from 'vitest';
import { buildWarroomPriorityDocketView } from '../../src/ui/map/data/warroomPriorityDocket.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { LoadedGameState, OperationOpportunityProposalView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 41,
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
    proposal_id: 'opp_docket',
    opportunity_id: 'docket_window',
    display_name: 'Docket Window',
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 41,
    expires_turn: 41,
    review_id: 'review_docket',
    description: 'Staff reports a closing operation window.',
    recommendation: 'Review before ending the turn.',
    proposed_action: 'OPPORTUNITY:opp_docket',
    required_axes_green: 1,
    required_axes_total: 2,
    optional_axes_green: 0,
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
    headline: 'Front warning.',
    territory: {
      territoryPercent: 44,
      settlementsControlled: 120,
      settlementsTotal: 260,
    },
    front: {
      engagedCount: 4,
      exposedCount: 1,
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
        text: 'An exposed front requires review.',
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
    label: 'Turn 41',
    turn: 41,
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

function makeConvoyDecision(id: string) {
  return {
    id,
    target_enclave: id === 'convoy_a' ? 'Gorazde' : 'Srebrenica',
    route_faction: 'RBiH' as const,
    supply_amount: 20,
  };
}

describe('buildWarroomPriorityDocketView', () => {
  it('projects the top pre-advance priorities into a deterministic Warroom docket', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      pendingEventDecisions: [],
      operationOpportunityProposals: [makeOpportunity()],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 41,
        displacement_total: 1800,
      }),
    });

    const first = buildWarroomPriorityDocketView({ state, limit: 3 });
    const second = buildWarroomPriorityDocketView({ state, limit: 3 });

    expect(second.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    expect(first.status).toBe('review');
    expect(first.statusLabel).toBe('Review before advance');
    expect(first.statusLabel).not.toBe(first.status);
    expect(first.tone).toBe('danger');
    expect(first.headline).toBe('Recommended before advance');
    expect(first.blockingDecisionCount).toBe(0);
    expect(first.summary).toBe('4 advance items / 4 urgent / 2 pending');
    expect(first.items.map((item) => item.id)).toEqual([
      'review:pending',
      'opportunity:opp_docket',
      'sitrep:front-critical',
    ]);
    expect(first.items[0]).toMatchObject({
      category: 'decision',
      severity: 'critical',
      actionLabel: "Open President's Desk",
      navigationTarget: { kind: 'inbox' },
    });
    expect(first.sourceHandoffs.map((handoff) => handoff.id)).toEqual([
      'presidential-inbox',
      'army-hq-briefing',
      'army-hq-summary',
      'turn-aftermath-records',
    ]);
    expect(first.sourceHandoffSummary).toBe('4 source handoffs / 4 urgent');
    expect(first.openBoardLabel).toBe('Open Decision Room');
  });

  it('keeps a quiet clear state available without inventing docket rows', () => {
    const view = buildWarroomPriorityDocketView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
      }),
    });

    expect(view.status).toBe('clear');
    expect(view.statusLabel).toBe('Clear to advance');
    expect(view.statusLabel).not.toBe(view.status);
    expect(view.tone).toBe('clear');
    expect(view.headline).toBe('Clear to advance');
    expect(view.summary).toBe('0 advance items / 0 urgent / 0 pending');
    expect(view.items).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.sourceHandoffSummary).toBe('0 source handoffs / 0 urgent');
    expect(view.canOpenBoard).toBe(true);
  });

  it('uses weighted grouped-decision counts in the docket summary', () => {
    const view = buildWarroomPriorityDocketView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        pendingConvoyDecisions: [
          makeConvoyDecision('convoy_a'),
          makeConvoyDecision('convoy_b'),
        ],
      }),
    });

    expect(view.metrics.pendingReviews).toBe(2);
    expect(view.metrics.urgentCount).toBe(2);
    expect(view.metrics.advanceReviewCount).toBe(2);
    expect(view.summary).toBe('2 advance items / 2 urgent / 2 pending');
  });

  it('returns a safe unavailable state when no campaign is loaded', () => {
    const view = buildWarroomPriorityDocketView({ state: null });

    expect(view.status).toBe('unavailable');
    expect(view.statusLabel).toBe('No campaign loaded');
    expect(view.statusLabel).not.toBe(view.status);
    expect(view.tone).toBe('quiet');
    expect(view.headline).toBe('No state loaded');
    expect(view.items).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.sourceHandoffSummary).toBe('0 source handoffs / 0 urgent');
    expect(view.canOpenBoard).toBe(false);
  });

  it('localizes Warroom docket summary chrome in BCS mode', () => {
    setLocale('bcs');
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      pendingEventDecisions: [],
      operationOpportunityProposals: [makeOpportunity()],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 41,
        displacement_total: 1800,
      }),
    });

    const view = buildWarroomPriorityDocketView({ state, limit: 3 });
    setLocale('en');

    expect(view.summary).toBe('4 stavke za napredovanje / 4 hitno / 2 na čekanju');
    expect(view.sourceHandoffSummary).toBe('4 izvorna prijenosa / 4 hitno');
    expect(view.openBoardLabel).toBe('Otvori sobu odluka');
    expect(view.statusLabel).toBe('Pregled prije napredovanja');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('advance items');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('source handoffs');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('Open Desk');
  });
});
