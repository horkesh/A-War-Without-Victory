import { describe, expect, it } from 'vitest';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
} from '../../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState, OperationOpportunityProposalView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 24,
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
    proposal_id: 'opp_alpha',
    opportunity_id: 'sana_95',
    display_name: 'Sana 95',
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 24,
    expires_turn: 25,
    review_id: 'review_alpha',
    description: 'Staff believes the window is open.',
    recommendation: 'Authorize if reserves are ready.',
    proposed_action: 'OPPORTUNITY:opp_alpha',
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
    headline: 'One exposed sector requires attention.',
    territory: {
      territoryPercent: 42,
      settlementsControlled: 100,
      settlementsTotal: 240,
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
      adequateCount: 10,
      strainedCount: 2,
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
        id: 'front-exposed',
        severity: 'critical',
        text: '1 exposed front sector requires attention.',
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
    label: 'Turn 24',
    turn: 24,
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

const severityRank: Record<PresidentialDecisionRoomCard['severity'], number> = {
  blocking: 0,
  critical: 1,
  warning: 2,
  info: 3,
};

describe('buildPresidentialDecisionRoomView', () => {
  it('builds deterministic severity-sorted priority cards from existing player-facing read models', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 3,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 1,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [
        makeOpportunity({ proposal_id: 'opp_beta', opportunity_id: 'beta_window', display_name: 'Beta Window', expires_turn: 30 }),
        makeOpportunity({ proposal_id: 'opp_alpha', opportunity_id: 'alpha_window', display_name: 'Alpha Window', expires_turn: 30 }),
      ],
      operationalSitrep: makeSitrep(),
      commandBriefing: {
        headline: 'Critical command alert.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'briefing:zeta',
            kind: 'command',
            severity: 'critical',
            title: 'Corps command strain rising',
            detail: 'Staff reports command friction around the main effort.',
            target: { type: 'corps', corpsId: 'arbih_3rd_corps' },
          },
        ],
      },
      latestTurnSummary: makeSummary({
        turn: 24,
        territory_net: { RBiH: -1 },
        displacement_total: 1500,
        formation_destructions: [
          { formation_id: 'arbih_lost', formation_name: 'Lost Brigade', faction: 'RBiH' },
        ],
      }),
      turnSummaries: [
        makeSummary({ turn: 23, territory_net: { RBiH: 2 } }),
      ],
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });

    expect(second.cards.map((card) => card.id)).toEqual(first.cards.map((card) => card.id));
    expect(first.cards.map((card) => severityRank[card.severity])).toEqual(
      [...first.cards.map((card) => severityRank[card.severity])].sort((a, b) => a - b),
    );
    expect(first.cards[0]).toMatchObject({
      id: 'review:pending',
      category: 'decision',
      severity: 'blocking',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(first.cards.find((card) => card.id === 'opportunity:opp_alpha')?.sortKey).toBeLessThan(
      first.cards.find((card) => card.id === 'opportunity:opp_beta')?.sortKey ?? Number.POSITIVE_INFINITY,
    );
    expect(first.cards.map((card) => card.id)).toContain('turn:24:hard-turn');
    expect(first.cards.map((card) => card.id)).toContain('sitrep:front-exposed');
    expect(first.cards.map((card) => card.id)).toContain('briefing:briefing:zeta');
  });

  it('routes cards to existing owners instead of duplicating inbox, records, cost, or Chronicle data', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 0,
        eventDecisionCount: 0,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [makeOpportunity()],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 24,
        territory_net: { RBiH: 1 },
        displacement_total: 1000,
      }),
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.find((card) => card.id === 'review:pending')).toMatchObject({
      sourceOwner: 'Presidential review queue',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(view.cards.find((card) => card.id === 'opportunity:opp_alpha')).toMatchObject({
      sourceOwner: 'Operation opportunity dossiers',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(view.cards.find((card) => card.id === 'turn:24:hard-turn')).toMatchObject({
      sourceOwner: 'Turn Aftermath records',
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
    expect(view.cards.find((card) => card.id === 'campaign-cost')).toMatchObject({
      sourceOwner: 'Active campaign cost',
      navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    });
    expect(view.cards.find((card) => card.id === 'chronicle:review-memory')).toMatchObject({
      sourceOwner: 'Chronicle',
      navigationTarget: { kind: 'chronicle' },
    });
  });

  it('groups source handoffs by existing inspection surface without creating a new owner', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [
        makeOpportunity({ proposal_id: 'opp_beta', display_name: 'Beta Window', expires_turn: 30 }),
        makeOpportunity({ proposal_id: 'opp_alpha', display_name: 'Alpha Window', expires_turn: 24 }),
      ],
      operationalSitrep: makeSitrep(),
      commandBriefing: {
        headline: 'Critical command alert.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'briefing:zeta',
            kind: 'command',
            severity: 'critical',
            title: 'Corps command strain rising',
            detail: 'Staff reports command friction around the main effort.',
            target: { type: 'corps', corpsId: 'arbih_3rd_corps' },
          },
        ],
      },
      latestTurnSummary: makeSummary({
        turn: 24,
        territory_net: { RBiH: -1 },
        displacement_total: 1600,
      }),
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    const byId = Object.fromEntries(first.sourceHandoffs.map((handoff) => [handoff.id, handoff]));

    expect(second.sourceHandoffs).toEqual(first.sourceHandoffs);
    expect(first.sourceHandoffs.map((handoff) => handoff.id)).toEqual([
      'army-hq-briefing',
      'army-hq-summary',
      'army-hq-corps-briefings',
      'turn-aftermath-records',
      'army-hq-records-aftermath',
      'chronicle',
    ]);
    expect(byId['army-hq-briefing']).toMatchObject({
      label: 'Army HQ Briefing',
      count: 3,
      urgentCount: 2,
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'opportunity:opp_beta'],
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(byId['turn-aftermath-records']).toMatchObject({
      label: 'Turn Aftermath Records',
      cardIds: ['turn:24:hard-turn'],
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
    expect(byId.chronicle).toMatchObject({
      label: 'Chronicle',
      cardIds: ['chronicle:review-memory'],
      navigationTarget: { kind: 'chronicle' },
    });
  });

  it('builds deterministic priority lenses over the same card archive', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 0,
        eventDecisionCount: 0,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [
        makeOpportunity({ proposal_id: 'opp_beta', display_name: 'Beta Window', expires_turn: 30 }),
        makeOpportunity({ proposal_id: 'opp_alpha', display_name: 'Alpha Window', expires_turn: 25 }),
      ],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 24,
        territory_net: { RBiH: 1 },
        displacement_total: 1000,
      }),
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const lensIds = view.lenses.map((lens) => lens.id);
    const byId = Object.fromEntries(view.lenses.map((lens) => [lens.id, lens]));

    expect(lensIds[0]).toBe('all');
    expect(lensIds).toContain('decision');
    expect(lensIds).toContain('opportunity');
    expect(lensIds).toContain('operational');
    expect(lensIds).toContain('turn');
    expect(lensIds).toContain('cost');
    expect(lensIds).toContain('memory');
    expect(byId.all).toMatchObject({
      count: view.cards.length,
      topCardId: view.cards[0]?.id,
      navigationTarget: view.cards[0]?.navigationTarget,
    });
    expect(byId.opportunity).toMatchObject({
      count: 2,
      topCardId: 'opportunity:opp_alpha',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(byId.turn).toMatchObject({
      topCardId: 'turn:24:hard-turn',
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
  });

  it('builds command-loop question lanes from the same priority card archive', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 1,
      },
      operationOpportunityProposals: [
        makeOpportunity({ proposal_id: 'opp_beta', display_name: 'Beta Window', expires_turn: 30 }),
        makeOpportunity({ proposal_id: 'opp_alpha', display_name: 'Alpha Window', expires_turn: 24 }),
      ],
      operationalSitrep: makeSitrep(),
      commandBriefing: {
        headline: 'Critical command alert.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'briefing:zeta',
            kind: 'command',
            severity: 'critical',
            title: 'Corps command strain rising',
            detail: 'Staff reports command friction around the main effort.',
            target: { type: 'corps', corpsId: 'arbih_3rd_corps' },
          },
        ],
      },
      latestTurnSummary: makeSummary({
        turn: 24,
        territory_net: { RBiH: -1 },
        displacement_total: 1600,
      }),
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    const byId = Object.fromEntries(first.commandQuestions.map((question) => [question.id, question]));

    expect(first.commandQuestions.map((question) => question.id)).toEqual([
      'urgent',
      'pending',
      'fronts',
      'inspect',
      'advance',
    ]);
    expect(second.commandQuestions).toEqual(first.commandQuestions);
    expect(byId.urgent).toMatchObject({
      label: 'Urgent',
      count: 5,
      urgentCount: 5,
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'sitrep:front-exposed'],
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(byId.pending).toMatchObject({
      label: 'Decisions',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'opportunity:opp_beta'],
    });
    expect(byId.fronts).toMatchObject({
      label: 'Fronts',
      cardIds: ['sitrep:front-exposed', 'briefing:briefing:zeta'],
      navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
    });
    expect(byId.inspect.cardIds).toEqual(first.inspectNext.map((card) => card.id));
    expect(byId.advance).toMatchObject({
      label: 'Advance',
      headline: 'Review before advance',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'sitrep:front-exposed', 'turn:24:hard-turn'],
    });
  });

  it('marks what should be reviewed before advancing without blocking beyond existing systems', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        presidentialReviewQueue: {
          pendingCount: 2,
          criticalCount: 1,
          eventDecisionCount: 1,
          commandInterpretationCount: 0,
          personnelDirectiveCount: 0,
          operationOpportunityCount: 1,
        },
        operationOpportunityProposals: [makeOpportunity({ expires_turn: 24 })],
        operationalSitrep: makeSitrep(),
        latestTurnSummary: makeSummary({
          turn: 24,
          displacement_total: 1400,
        }),
      }),
    });

    expect(view.advanceReadiness.items.map((item) => item.id)).toEqual([
      'review:pending',
      'opportunity:opp_alpha',
      'sitrep:front-exposed',
      'turn:24:hard-turn',
    ]);
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(true);
  });

  it('returns a safe empty state when no player faction is loaded', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        player_faction: null,
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

    expect(view.hasPlayerFaction).toBe(false);
    expect(view.cards).toEqual([]);
    expect(view.lenses).toEqual([]);
    expect(view.commandQuestions).toEqual([]);
    expect(view.sourceHandoffs).toEqual([]);
    expect(view.emptyState).toBe('No player faction loaded.');
  });
});
