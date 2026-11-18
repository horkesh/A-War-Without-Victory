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
    expect(first.tone).toBe('attention');
    expect(first.headline).toBe('Recommended before advance');
    expect(first.blockingDecisionCount).toBe(0);
    // The header counts the listed rows by tier (not band totals over every card).
    expect(first.summary).toBe('1 advance item: 0 required, 1 recommended');
    expect(first.items.map((item) => item.id)).toEqual([
      'opportunity:opp_docket',
    ]);
    expect(first.items[0]).toMatchObject({
      category: 'opportunity',
      severity: 'critical',
      actionLabel: 'Review Dossier',
      navigationTarget: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:opp_docket' },
    });
    expect(first.sourceHandoffs.map((handoff) => handoff.id)).toEqual([
      'army-hq-briefing',
    ]);
    expect(first.sourceHandoffSummary).toBe('1 source handoff');
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
    expect(view.summary).toBe('0 advance items: 0 required, 0 recommended');
    expect(view.items).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.sourceHandoffSummary).toBe('0 source handoffs');
    expect(view.canOpenBoard).toBe(true);
  });

  it('counts a grouped decision card as one row, and its decisions as pending reviews', () => {
    const view = buildWarroomPriorityDocketView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        // F1i (2026-11-16): convoys are retired; two required event decisions form the grouped
        // presidential-review card instead.
        presidentialReviewQueue: {
          pendingCount: 2,
          criticalCount: 0,
          eventDecisionCount: 2,
          commandInterpretationCount: 0,
          personnelDirectiveCount: 0,
          operationOpportunityCount: 0,
        },
        pendingEventDecisions: [
          { event_id: 'evt_a', event_title: 'Event A', turn_fired: 41, faction: 'RBiH', requires_player_response: true, response_options: [] },
          { event_id: 'evt_b', event_title: 'Event B', turn_fired: 41, faction: 'RBiH', requires_player_response: true, response_options: [] },
        ] as unknown as LoadedGameState['pendingEventDecisions'],
      }),
    });

    expect(view.metrics.pendingReviews).toBe(2);
    expect(view.metrics.priorityCounts.required).toBe(2);
    // The chip's number is the rows the list shows (one grouped review card); the two event
    // decisions still weigh on the pending-review count.
    expect(view.items).toHaveLength(1);
    expect(view.metrics.advanceReviewCount).toBe(1);
    expect(view.summary).toBe('1 advance item: 1 required, 0 recommended');
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
    expect(view.sourceHandoffSummary).toBe('0 source handoffs');
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

    expect(view.summary).toBe('1 stavka za napredovanje: 0 obavezno, 1 preporučeno');
    expect(view.sourceHandoffSummary).toBe('1 izvorni prijenos');
    expect(view.openBoardLabel).toBe('Otvori sobu odluka');
    expect(view.statusLabel).toBe('Pregled prije napredovanja');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('advance items');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('source handoffs');
    expect(view.summary + view.sourceHandoffSummary + view.openBoardLabel).not.toContain('Open Desk');
  });
});
