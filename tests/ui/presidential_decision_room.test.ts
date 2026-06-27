import { afterEach, describe, expect, it } from 'vitest';
import {
  buildPresidentialDecisionRoomSourceHandoffs,
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
} from '../../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState, OperationOpportunityProposalView, PlayerDecisionSummaryView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

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

function makePlayerDecisionSummary(overrides: Partial<PlayerDecisionSummaryView> = {}): PlayerDecisionSummaryView {
  return {
    totalCount: 5,
    blockingCount: 3,
    families: [
      { id: 'peace_plan', count: 1, gatePolicy: 'modal_required' },
      { id: 'dayton_negotiation', count: 1, gatePolicy: 'modal_required' },
      { id: 'convoy_decision', count: 1, gatePolicy: 'modal_required' },
      { id: 'reserve_request', count: 1, gatePolicy: 'advisory' },
      { id: 'officer_event', count: 1, gatePolicy: 'advisory' },
    ],
    ...overrides,
  };
}

const severityRank: Record<PresidentialDecisionRoomCard['severity'], number> = {
  blocking: 0,
  critical: 1,
  warning: 2,
  info: 3,
};

describe('buildPresidentialDecisionRoomView', () => {
  afterEach(() => {
    setLocale('en');
  });

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
      navigationTarget: { kind: 'inbox' },
    });
    expect(first.cards.find((card) => card.id === 'opportunity:opp_alpha')?.sortKey).toBeLessThan(
      first.cards.find((card) => card.id === 'opportunity:opp_beta')?.sortKey ?? Number.POSITIVE_INFINITY,
    );
    expect(first.cards.map((card) => card.id)).toContain('turn:24:hard-turn');
    expect(first.cards.map((card) => card.id)).toContain('sitrep:front-exposed');
    expect(first.cards.map((card) => card.id)).toContain('briefing:briefing:zeta');
  });

  it('ignores stale manifest blocking summaries when no live inbox items remain', () => {
    const state = makeState({
      playerDecisionSummary: makePlayerDecisionSummary({
        totalCount: 1,
        blockingCount: 1,
        families: [
          { id: 'peace_plan', count: 1, blockingCount: 1, gatePolicy: 'modal_required' },
        ],
      }),
      pendingEventDecisions: [],
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.map((card) => card.id)).not.toContain('manifest:peace_plan');
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(false);
    expect(view.advanceReadiness.headline).toBe('Clear to advance');
    expect(view.metrics.pendingReviews).toBe(0);
  });

  it('routes briefing operation, sector, and settlement cards to tactical field inspection targets', () => {
    const state = makeState({
      commandBriefing: {
        headline: 'Field command priorities.',
        criticalCount: 1,
        pendingCount: 3,
        items: [
          {
            id: 'briefing:operation',
            kind: 'command',
            severity: 'critical',
            title: 'Operation window',
            detail: 'Inspect the operation in the field view.',
            target: { type: 'operation', operationKey: 'arbih_3rd_corps|op_alpha' },
          },
          {
            id: 'briefing:sector',
            kind: 'command',
            severity: 'warning',
            title: 'Sector pressure',
            detail: 'Inspect the sector in the field view.',
            target: { type: 'sector', sectorId: 'sector_tuzla' },
            corpsId: 'arbih_3rd_corps',
          },
          {
            id: 'briefing:settlement',
            kind: 'field_reports',
            severity: 'info',
            title: 'Settlement report',
            detail: 'Inspect the settlement in the field view.',
            target: { type: 'settlement', osid: 'tuzla_1' },
          },
        ],
      },
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.find((card) => card.id === 'briefing:briefing:operation')).toMatchObject({
      actionLabel: 'Inspect Operation',
      navigationTarget: { kind: 'field', target: { kind: 'field-operation', operationKey: 'arbih_3rd_corps|op_alpha' } },
    });
    expect(view.cards.find((card) => card.id === 'briefing:briefing:sector')).toMatchObject({
      actionLabel: 'Inspect Sector',
      navigationTarget: { kind: 'field', target: { kind: 'field-sector-in-corps', sectorId: 'sector_tuzla', corpsId: 'arbih_3rd_corps' } },
    });
    expect(view.cards.find((card) => card.id === 'briefing:briefing:settlement')).toMatchObject({
      navigationTarget: { kind: 'field', target: { kind: 'field-settlement', osid: 'tuzla_1' } },
      sourceLabel: 'Field reports',
      evidence: ['Field reports'],
    });
    expect(view.cards.find((card) => card.id === 'briefing:briefing:settlement')?.sourceLabel).not.toBe('Field Reports');
    expect(view.cards.find((card) => card.id === 'briefing:briefing:settlement')?.sourceLabel).not.toBe('field_reports');
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
      navigationTarget: { kind: 'inbox' },
    });
    expect(view.cards.find((card) => card.id === 'opportunity:opp_alpha')).toMatchObject({
      sourceOwner: 'Operation opportunity dossiers',
      navigationTarget: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:opp_alpha' },
      sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(view.cards.find((card) => card.id === 'turn:24:hard-turn')).toMatchObject({
      sourceOwner: 'Turn Aftermath records',
      navigationTarget: { kind: 'decision-room', lens: 'turn', cardId: 'turn:24:hard-turn' },
      sourceHandoffTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
    expect(view.cards.find((card) => card.id === 'campaign-cost')).toMatchObject({
      sourceOwner: 'Active campaign cost',
      navigationTarget: { kind: 'decision-room', lens: 'cost', cardId: 'campaign-cost' },
      sourceHandoffTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    });
    expect(view.cards.find((card) => card.id === 'chronicle:review-memory')).toMatchObject({
      sourceOwner: 'Chronicle',
      navigationTarget: { kind: 'chronicle' },
    });
  });

  it('does not treat turn-zero setup summaries as filed war records', () => {
    const setupSummary = makeSummary({
      turn: 0,
      territory_net: { RBiH: -8 },
      displacement_total: 1200,
      notable_flips: [
        { osid: 'op:test:setup', mun_id: 'test', from: 'RS', to: 'RBiH', significance: 'generic' },
      ],
    });
    const state = makeState({
      turn: 0,
      latestTurnSummary: setupSummary,
      turnSummaries: [setupSummary],
      operationalSitrep: undefined,
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.some((card) => card.category === 'turn')).toBe(false);
    expect(view.cards.some((card) => card.category === 'cost')).toBe(false);
    expect(view.cards.some((card) => card.category === 'memory')).toBe(false);
    expect(view.lenses.some((lens) => lens.id === 'turn' || lens.id === 'cost' || lens.id === 'memory')).toBe(false);
    expect(view.sourceHandoffs.some((handoff) => handoff.id === 'chronicle' || handoff.id.startsWith('army-hq-records'))).toBe(false);
    const loopsById = Object.fromEntries(view.loopSteps.map((step) => [step.id, step]));
    expect(loopsById.report).toMatchObject({
      count: 0,
      urgentCount: 0,
      navigationTarget: { kind: 'none' },
      unavailableReason: 'No current item is available for this action.',
    });
    expect(loopsById.cost).toMatchObject({
      count: 0,
      urgentCount: 0,
      navigationTarget: { kind: 'none' },
      unavailableReason: 'No current item is available for this action.',
    });
    expect(loopsById.judge).toMatchObject({
      count: 0,
      urgentCount: 0,
      navigationTarget: { kind: 'none' },
      unavailableReason: 'No current item is available for this action.',
    });
    expect(`${loopsById.report.summary} ${loopsById.cost.summary} ${loopsById.judge.summary}`).not.toContain('recorded turn');
  });

  it('does not treat setup-control summaries after turn zero as filed war records', () => {
    const setupSummary = makeSummary({
      turn: 1,
      territory_net: { RBiH: -8 },
      displacement_total: 1200,
      notable_flips: [
        { osid: 'op:test:setup', mun_id: 'test', from: 'RS', to: 'RBiH', significance: 'generic' },
      ],
      mechanism: 'setup_control',
    } as Partial<TurnSummary> & { mechanism: string });
    const state = makeState({
      turn: 1,
      latestTurnSummary: setupSummary,
      turnSummaries: [setupSummary],
      operationalSitrep: undefined,
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.some((card) => card.category === 'turn')).toBe(false);
    expect(view.cards.some((card) => card.category === 'cost')).toBe(false);
    expect(view.cards.some((card) => card.category === 'memory')).toBe(false);
    const loopsById = Object.fromEntries(view.loopSteps.map((step) => [step.id, step]));
    expect(loopsById.report).toMatchObject({
      count: 0,
      urgentCount: 0,
      navigationTarget: { kind: 'none' },
    });
  });

  it('keeps quiet loop fallbacks on presidential surfaces instead of Army HQ primary routes', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        commandBriefing: undefined,
        operationalSitrep: undefined,
      }),
    });
    const loopsById = Object.fromEntries(view.loopSteps.map((step) => [step.id, step]));

    expect(loopsById.brief.navigationTarget).toEqual({ kind: 'decision-room', lens: 'briefing' });
    expect(loopsById.decide.navigationTarget).toEqual({ kind: 'inbox' });
    expect(loopsById.next.navigationTarget.kind).toBe('decision-room');
    expect(view.loopSteps
      .filter((step) => step.navigationTarget.kind === 'none')
      .map((step) => step.unavailableReason))
      .toEqual([
        'No current item is available for this action.',
        'No current item is available for this action.',
        'No current item is available for this action.',
        'No current item is available for this action.',
      ]);
    expect(view.nextOrders.find((order) => order.navigationTarget.kind === 'none')?.unavailableReason).toBe('No current item is available for this action.');
    const disabledQuestions = view.commandQuestions.filter((question) => question.navigationTarget.kind === 'none');
    expect(disabledQuestions.length).toBeGreaterThan(0);
    expect(disabledQuestions.map((question) => question.unavailableReason))
      .toEqual(disabledQuestions.map(() => 'No current item is available for this action.'));
    expect(view.loopSteps.map((step) => step.navigationTarget.kind)).not.toContain('army-hq-tab');
    expect(view.loopSteps.map((step) => step.navigationTarget.kind)).not.toContain('army-hq-records');
  });

  it('routes peace-plan briefing cards to the inbox owner instead of generic Army HQ briefing', () => {
    const state = makeState({
      commandBriefing: {
        headline: 'Peace plan requires response.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'dip-peace-plan',
            kind: 'diplomatic',
            severity: 'critical',
            title: 'Peace plan requires response',
            detail: 'A peace plan has been proposed.',
            actionLabel: 'Review Plan',
            target: { type: 'peace_plan', peacePlanId: 'vance_owen', label: 'Peace plan' },
          },
        ],
      },
    });

    const view = buildPresidentialDecisionRoomView({ state });

    expect(view.cards.find((card) => card.id === 'briefing:dip-peace-plan')).toMatchObject({
      actionLabel: 'Review Plan',
      navigationTarget: { kind: 'inbox' },
    });
  });

  it('localizes peace-plan briefing action labels in BCS mode', () => {
    setLocale('bcs');
    const state = makeState({
      commandBriefing: {
        headline: 'Peace plan requires response.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'dip-peace-plan',
            kind: 'diplomatic',
            severity: 'critical',
            title: 'Peace plan requires response',
            detail: 'A peace plan has been proposed.',
            actionLabel: 'Review Plan',
            target: { type: 'peace_plan', peacePlanId: 'vance_owen', label: 'Peace plan' },
          },
        ],
      },
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((entry) => entry.id === 'briefing:dip-peace-plan');

    expect(card?.actionLabel).toBe('Pregledaj plan');
    expect(card?.actionLabel).not.toBe('Review Plan');
  });

  it('localizes command briefing collector fallback titles and details in BCS mode', () => {
    setLocale('bcs');
    const state = makeState({
      commandBriefing: {
        headline: '2 items of note.',
        criticalCount: 0,
        pendingCount: 2,
        items: [
          {
            id: 'mil-disrupted',
            kind: 'military',
            category: 'military',
            briefingCategory: 'disrupted_brigades',
            severity: 'warning',
            title: '4 brigades disrupted',
            detail: '4 brigades are disrupted and combat-ineffective.',
            target: { type: 'none' },
          },
          {
            id: 'cmd-order-interpretations',
            kind: 'command',
            category: 'command',
            briefingCategory: 'order_interpretations',
            severity: 'warning',
            title: '2 order interpretations pending',
            detail: 'Army command has proposed an autonomous operation. Review before advancing.',
            actionLabel: 'Review Interpretations',
            target: { type: 'officer_events', officerFocus: 'interpretations', label: 'Officer interpretations' },
          },
        ],
      },
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const copy = view.cards.map((card) => `${card.title} ${card.explanation} ${card.actionLabel} ${card.evidence.join(' ')}`).join('\n');

    expect(copy).toContain('4 brigade su dezorganizovane');
    expect(copy).toContain('4 brigade su dezorganizovane i borbeno neefikasne.');
    expect(copy).toContain('2 tumačenja naredbi na čekanju');
    expect(copy).toContain('Komanda armije predložila je autonomnu operaciju. Pregledajte prije nastavka poteza.');
    expect(copy).toContain('Pregledaj tumačenja');
    expect(copy).not.toContain('4 brigades disrupted');
    expect(copy).not.toContain('Army command has proposed an autonomous operation');
    expect(copy).not.toContain('Review Interpretations');
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
      'presidential-inbox',
      'army-hq-briefing',
      'army-hq-summary',
      'army-hq-corps-briefings',
      'turn-aftermath-records',
      'army-hq-records-aftermath',
      // The always-present front-visit Command & Personnel card (info severity)
      // handoffs after the warning/critical surfaces, before the chronicle.
      'army-hq-personnel',
      'chronicle',
    ]);
    expect(byId['presidential-inbox']).toMatchObject({
      label: "President's Desk",
      count: 1,
      urgentCount: 1,
      cardIds: ['review:pending'],
      navigationTarget: { kind: 'inbox' },
    });
    expect(byId['army-hq-briefing']).toMatchObject({
      label: 'Army HQ Briefing',
      count: 2,
      urgentCount: 1,
      cardIds: ['opportunity:opp_alpha', 'opportunity:opp_beta'],
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

  it('labels Decision Records as their own source handoff instead of Opportunity Records', () => {
    const card: PresidentialDecisionRoomCard = {
      id: 'decision-record-card',
      category: 'memory',
      severity: 'info',
      title: 'Decision filed',
      explanation: 'A presidential decision has been filed to records.',
      sourceOwner: 'Decision consequences',
      sourceLabel: 'Decision record',
      actionLabel: 'Open Records',
      evidence: [],
      navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'decisions' },
      sortKey: 10,
    };

    const handoffs = buildPresidentialDecisionRoomSourceHandoffs([card]);

    expect(handoffs).toEqual([
      expect.objectContaining({
        id: 'army-hq-records-decisions',
        label: 'Army HQ Decision Records',
        actionLabel: 'Open Records',
        navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'decisions' },
        cardIds: ['decision-record-card'],
      }),
    ]);
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
      navigationTarget: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:opp_alpha' },
    });
    expect(byId.turn).toMatchObject({
      topCardId: 'turn:24:hard-turn',
      navigationTarget: { kind: 'decision-room', lens: 'turn', cardId: 'turn:24:hard-turn' },
    });
  });

  it('routes enclave briefing cards to the dedicated enclave dashboard target', () => {
    const state = makeState({
      commandBriefing: {
        headline: 'Enclave pressure rising.',
        criticalCount: 1,
        pendingCount: 1,
        items: [
          {
            id: 'enclave-crisis',
            kind: 'humanitarian',
            severity: 'critical',
            title: 'Enclave crisis',
            detail: 'Staff reports a cut-off enclave under humanitarian pressure.',
            actionLabel: 'Review enclaves',
            target: { type: 'enclaves' },
          },
        ],
      },
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((entry) => entry.id === 'briefing:enclave-crisis');

    expect(card).toMatchObject({
      category: 'briefing',
      actionLabel: 'Review enclaves',
      navigationTarget: { kind: 'enclave-dashboard' },
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
      navigationTarget: { kind: 'inbox' },
    });
    expect(byId.pending).toMatchObject({
      label: 'Decisions',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'opportunity:opp_beta'],
    });
    expect(byId.fronts).toMatchObject({
      label: 'Fronts',
      cardIds: ['sitrep:front-exposed', 'briefing:briefing:zeta'],
      navigationTarget: { kind: 'decision-room', lens: 'operational', cardId: 'sitrep:front-exposed' },
    });
    expect(byId.inspect.cardIds).toEqual(first.inspectNext.map((card) => card.id));
    expect(byId.advance).toMatchObject({
      label: 'Advance',
      headline: 'Review before advance',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'sitrep:front-exposed', 'turn:24:hard-turn'],
    });
  });

  it('builds an ordered next-orders agenda that separates act, inspect, and monitor work', () => {
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
        makeOpportunity({ proposal_id: 'opp_alpha', display_name: 'Alpha Window', expires_turn: 24 }),
      ],
      operationalSitrep: makeSitrep(),
      latestTurnSummary: makeSummary({
        turn: 24,
        displacement_total: 1400,
      }),
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });

    expect(first.nextOrders.map((order) => order.role)).toEqual(['act', 'inspect', 'monitor']);
    expect(first.nextOrders[0]).toMatchObject({
      id: 'act:review:pending',
      label: 'Act',
      headline: 'Presidential reviews pending',
      instruction: 'Resolve this before advancing the turn.',
      cardId: 'review:pending',
      navigationTarget: { kind: 'inbox' },
    });
    expect(first.nextOrders[1]).toMatchObject({
      label: 'Inspect',
      instruction: 'Open the named surface to understand the staff evidence.',
    });
    expect(first.nextOrders[2]).toMatchObject({
      role: 'monitor',
      label: 'Monitor',
      headline: 'Review before advance',
      instruction: 'Watch this before ending the turn.',
    });
    expect(second.nextOrders).toEqual(first.nextOrders);
  });

  it('localizes Decision Room lane, loop, lens, and source-handoff chrome in BCS mode', () => {
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
      operationOpportunityProposals: [makeOpportunity({ expires_turn: 24 })],
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
      turnSummaries: [makeSummary({ turn: 23, territory_net: { RBiH: 1 } })],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const questionsById = Object.fromEntries(view.commandQuestions.map((question) => [question.id, question]));
    const loopsById = Object.fromEntries(view.loopSteps.map((step) => [step.id, step]));
    const handoffsById = Object.fromEntries(view.sourceHandoffs.map((handoff) => [handoff.id, handoff]));

    expect(view.lenses.map((lens) => lens.label)).toContain('Sve');
    expect(view.lenses.map((lens) => lens.label)).toContain('Prilika');
    expect(questionsById.urgent.label).toBe('Hitno');
    expect(questionsById.pending.label).toBe('Odluke');
    expect(questionsById.advance.summary).toContain('stavke za napredovanje');
    expect(loopsById.brief.label).toBe('Brifing');
    expect(loopsById.execute.label).toBe('Izvrši');
    expect(loopsById.cost.summary).toContain('stavke cijene');
    expect(loopsById.report.summary).toContain('zapisana poteza');
    expect(handoffsById['army-hq-briefing'].label).toBe('Brifing Štaba armije');
    expect(handoffsById['presidential-inbox'].label).toBe('Predsjednički sto');
    expect(handoffsById['presidential-inbox'].label).not.toBe('Presidential Inbox');
    expect(handoffsById['turn-aftermath-records'].label).toBe('Zapisi posljedica poteza');
    expect(handoffsById.chronicle.actionLabel).toBe('Otvori Hroniku');
    expect(view.commandQuestions.map((question) => question.label)).not.toContain('Urgent');
    expect(view.loopSteps.map((step) => step.label)).not.toContain('Execute');
  });

  it('localizes Decision Room generated decision card prose in BCS mode', () => {
    setLocale('bcs');
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        presidentialReviewQueue: {
          pendingCount: 2,
          criticalCount: 1,
          eventDecisionCount: 1,
          commandInterpretationCount: 1,
          personnelDirectiveCount: 0,
          operationOpportunityCount: 1,
        },
        playerDecisionSummary: makePlayerDecisionSummary(),
        pendingPeacePlan: {
          planId: 'vance_owen',
          planName: 'Vance-Owen Peace Plan',
          narrative: 'International mediators have presented a proposal.',
          turnOffered: 24,
          proposedSplit: { RBiH: 0, RS: 0, HRHB: 0 },
          institutionalModel: 'cantons',
          botResponses: {},
        },
        pendingConvoyDecisions: [
          { id: 'convoy_srebrenica', target_enclave: 'srebrenica', route_faction: 'RBiH', supply_amount: 20 },
        ],
        pendingParamilitaryRequests: [
          { faction: 'RBiH', strength: 600, target_osid: 'op:zvornik:zvornik_2', estimated_civilian_risk: 42, mode: 'offensive' },
        ],
        operationalSitrep: makeSitrep(),
        latestTurnSummary: makeSummary({
          turn: 24,
          territory_net: { RBiH: -1 },
          displacement_total: 1600,
        }),
        turnSummaries: [makeSummary({ turn: 23, territory_net: { RBiH: 1 } })],
      }),
    });

    const cardsById = Object.fromEntries(view.cards.map((card) => [card.id, card]));

    expect(cardsById['review:pending'].sourceLabel).toBe('Predsjednički sto');
    expect(cardsById['paramilitary:pending'].actionLabel).toBe('Pregledaj raspoređivanje');
    expect(cardsById['manifest:peace_plan'].sourceLabel).toBe('Mirovni prijedlog');
    expect(cardsById['manifest:peace_plan'].actionLabel).toBe('Otvori sto');
    expect(cardsById['manifest:convoy_decision'].sourceLabel).toBe('Pregled konvoja');
    expect(cardsById['manifest:convoy_decision'].actionLabel).toBe('Otvori sto');
    expect(Object.values(cardsById).map((card) => `${card.sourceLabel} ${card.actionLabel}`).join('\n'))
      .not.toMatch(/Presidential Inbox|Diplomatic channel|Humanitarian channel|Review deployment|Review proposal|Review convoy/);

    expect(cardsById['review:pending'].title).toBe('Predsjednički pregledi na čekanju');
    expect(cardsById['review:pending'].sourceOwner).toBe('Predsjednički red pregleda');
    expect(cardsById['review:pending'].evidence).toContain('2 na čekanju');
    expect(cardsById['paramilitary:pending'].title).toBe('Odobrenje paravojske na čekanju');
    expect(cardsById['paramilitary:pending'].evidence).toContain('rizik ratnih zločina');
    expect(cardsById['manifest:peace_plan'].title).toBe('Odgovor na mirovni plan na čekanju');
    expect(cardsById['sitrep:front-exposed'].title).toBe('Operativni izvjestaj');
    expect(cardsById['chronicle:review-memory'].title).toBe('Pamćenje Hronike ažurirano');
    expect(cardsById['review:pending'].title).not.toBe('Presidential reviews pending');
  });

  it('filters pending paramilitary requests to the player faction', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        player_faction: 'RBiH',
        pendingParamilitaryRequests: [
          { faction: 'RS', strength: 600, target_osid: 'op:zvornik:zvornik_2', estimated_civilian_risk: 42, mode: 'offensive' },
          { faction: 'RBiH', strength: 150, target_osid: 'op:sarajevo:stari_grad', estimated_civilian_risk: 12, mode: 'rear_pocket' },
        ],
      }),
    });

    const card = view.cards.find((entry) => entry.id === 'paramilitary:pending');
    expect(card).toBeDefined();
    expect(card?.evidence).toContain('1 deployment request');
    expect(card?.evidence).toContain('estimated strength 150');
    expect(card?.evidence.join('\n')).not.toContain('600');
  });

  it('opens operation opportunity cards on the Decision Room opportunity lens', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        operationOpportunityProposals: [makeOpportunity({ proposal_id: 'opp_alpha' })],
      }),
    });

    const card = view.cards.find((entry) => entry.id === 'opportunity:opp_alpha');
    expect(card).toMatchObject({
      category: 'opportunity',
      actionLabel: 'Review Dossier',
      navigationTarget: {
        kind: 'decision-room',
        lens: 'opportunity',
        cardId: 'opportunity:opp_alpha',
      },
    });
  });

  it('dates operation opportunity review windows with calendar copy instead of raw turns', () => {
    const expiresTurn = 24;
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        operationOpportunityProposals: [makeOpportunity({ proposal_id: 'opp_alpha', expires_turn: expiresTurn })],
      }),
    });

    const card = view.cards.find((entry) => entry.id === 'opportunity:opp_alpha');

    expect(card?.evidence).toContain(`Review by ${turnToDateString(expiresTurn)}`);
    expect(card?.evidence.join('\n')).not.toMatch(/\bExpires\s+T\d+\b/);
  });

  it('renders sparse operation opportunity axis readiness as unreported evidence', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        operationOpportunityProposals: [makeOpportunity({
          proposal_id: 'opp_sparse',
          required_axes_green: undefined,
          required_axes_total: 2,
          optional_axes_green: undefined,
          optional_axes_total: 1,
        })],
      }),
    });

    const card = view.cards.find((entry) => entry.id === 'opportunity:opp_sparse');
    const evidence = card?.evidence.join('\n') ?? '';
    expect(evidence).toContain('Required axes unreported');
    expect(evidence).toContain('Optional axes unreported');
    expect(evidence).not.toContain('0/2 required axes');
    expect(evidence).not.toContain('0/1 optional axes');
  });

  it('dates hard-turn source labels with calendar copy instead of raw turns', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        latestTurnSummary: makeSummary({
          turn: 24,
          territory_net: { RBiH: -1 },
          displacement_total: 1600,
        }),
      }),
    });

    const card = view.cards.find((entry) => entry.id === 'turn:24:hard-turn');
    expect(card?.title).toContain(turnToDateString(24));
    expect(card?.sourceLabel).toBe(turnToDateString(24));
    expect(card?.sourceLabel).not.toBe('Turn 24');
  });

  it('dates report-loop fallback headlines with calendar copy instead of raw turns', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        latestTurnSummary: makeSummary({ turn: 24 }),
        turnSummaries: [makeSummary({ turn: 24 })],
      }),
    });

    const report = view.loopSteps.find((step) => step.id === 'report');
    expect(report?.headline).toBe(`Latest turn record: ${turnToDateString(24)}`);
    expect(report?.headline).not.toContain('T24');
  });

  it('builds the full presidential product loop as handoffs to existing owners', () => {
    const state = makeState({
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
      turnSummaries: [makeSummary({ turn: 23, territory_net: { RBiH: 1 } })],
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    const byId = Object.fromEntries(first.loopSteps.map((step) => [step.id, step]));

    expect(second.loopSteps).toEqual(first.loopSteps);
    expect(first.loopSteps.map((step) => step.id)).toEqual([
      'brief',
      'inspect',
      'decide',
      'execute',
      'report',
      'cost',
      'judge',
      'next',
    ]);
    expect(byId.brief).toMatchObject({
      label: 'Brief',
      count: 2,
      navigationTarget: { kind: 'decision-room', lens: 'operational', cardId: 'sitrep:front-exposed' },
    });
    expect(byId.inspect).toMatchObject({
      label: 'Inspect',
      count: first.inspectNext.length,
      navigationTarget: first.inspectNext[0]?.navigationTarget,
    });
    expect(byId.decide).toMatchObject({
      label: 'Decide',
      cardIds: ['review:pending', 'opportunity:opp_alpha'],
      navigationTarget: { kind: 'inbox' },
    });
    expect(byId.execute).toMatchObject({
      label: 'Execute',
      headline: 'Review before advance',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'sitrep:front-exposed', 'turn:24:hard-turn'],
    });
    expect(byId.report).toMatchObject({
      label: 'Report',
      navigationTarget: { kind: 'decision-room', lens: 'turn', cardId: 'turn:24:hard-turn' },
      sourceHandoffTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
    expect(byId.cost).toMatchObject({
      label: 'Cost',
      navigationTarget: { kind: 'decision-room', lens: 'cost', cardId: 'campaign-cost' },
      sourceHandoffTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    });
    expect(byId.judge).toMatchObject({
      label: 'Judge',
      navigationTarget: { kind: 'chronicle' },
    });
    expect(byId.next).toMatchObject({
      label: 'Next',
      navigationTarget: { kind: 'inbox' },
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

  it('uses the manifest summary to block advance for modal-required decisions without treating advisory families as blockers', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        playerDecisionSummary: makePlayerDecisionSummary(),
        pendingConvoyDecisions: [
          { id: 'convoy_srebrenica', target_enclave: 'srebrenica', route_faction: 'RBiH', supply_amount: 20 },
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

    expect(view.advanceReadiness.blockedByExistingSystems).toBe(true);
    expect(view.advanceReadiness.headline).toBe('Review before advance');
    expect(view.cards.find((card) => card.id === 'review:pending')).toBeUndefined();
    expect(view.metrics.pendingReviews).toBe(3);
    expect(view.cards.map((card) => card.id)).toContain('manifest:peace_plan');
    expect(view.cards.map((card) => card.id)).toContain('manifest:dayton_negotiation');
    expect(view.cards.map((card) => card.id)).toContain('manifest:convoy_decision');
    expect(view.advanceReadiness.items.map((item) => item.id)).toContain('manifest:peace_plan');
  });

  it('does not block advance for unresolved convoy decisions owned by another route faction', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        playerDecisionSummary: {
          totalCount: 0,
          blockingCount: 0,
          families: [],
        },
        pendingConvoyDecisions: [
          {
            id: 'convoy_foreign',
            target_enclave: 'Srebrenica',
            route_faction: 'RS',
            supply_amount: 20,
          },
        ],
      } as Partial<LoadedGameState>),
    });

    expect(view.cards.map((card) => card.id)).not.toContain('manifest:convoy_decision');
    expect(view.advanceReadiness.items.map((item) => item.id)).not.toContain('manifest:convoy_decision');
  });

  it('weights grouped modal cards across metrics, lenses, handoffs, questions, and loop steps', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        pendingConvoyDecisions: [
          { id: 'convoy_gorazde', target_enclave: 'Gorazde', route_faction: 'RBiH', supply_amount: 20 },
          { id: 'convoy_srebrenica', target_enclave: 'Srebrenica', route_faction: 'RBiH', supply_amount: 25 },
        ],
      } as Partial<LoadedGameState>),
    });

    const convoyCard = view.cards.find((card) => card.id === 'manifest:convoy_decision');
    expect(convoyCard?.countWeight).toBe(2);
    expect(view.metrics.pendingReviews).toBe(2);
    expect(view.lenses.find((lens) => lens.id === 'decision')?.count).toBe(2);
    expect(view.sourceHandoffs.find((handoff) => handoff.id === 'presidential-inbox')?.count).toBe(2);
    expect(view.commandQuestions.find((question) => question.id === 'pending')?.count).toBe(2);
    expect(view.loopSteps.find((step) => step.id === 'decide')?.count).toBe(2);
  });

  it('falls back to pending modal blockers when player decision summary is absent', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        player_faction: 'RBiH',
        playerDecisionSummary: undefined,
        pendingConvoyDecisions: [
          {
            id: 'convoy_rbih',
            target_enclave: 'Gorazde',
            route_faction: 'RBiH',
            supply_amount: 20,
          },
        ],
        pendingDayton: {
          territorialPackages: [],
          institutionalPackages: [],
          factionCapital: {},
          patronOverride: {},
        },
      } as Partial<LoadedGameState>),
    });

    expect(view.cards.map((card) => card.id)).toContain('manifest:convoy_decision');
    expect(view.cards.map((card) => card.id)).toContain('manifest:dayton_negotiation');
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(true);
  });

  it('offers Chronicle memory when a filed decision receipt exists without a narrated turn record', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        firedEvents: [
          {
            id: 'rbih_state_identity',
            title: 'What Is Bosnia?',
            turn: 0,
            narrative: 'Filed in the campaign record.',
            category: 'political',
            effects: [{ kind: 'decision', description: 'Recorded choice: Civic multi-ethnic republic' }],
            isDecision: true,
          },
        ],
      } as Partial<LoadedGameState>),
    });

    const chronicleCard = view.cards.find((card) => card.id === 'chronicle:review-memory');
    expect(chronicleCard).toMatchObject({
      category: 'memory',
      navigationTarget: { kind: 'chronicle' },
    });
  });

  it('does not offer Chronicle memory for Records-only decision receipts', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        latestTurnSummary: null,
        turnSummaries: [],
        reserveRequestHistory: [{
          request_id: 'reserve-record-1',
          turn: 12,
          faction: 'RBiH',
          corps_id: 'arbih_1st_corps',
          brigade_id: null,
          outcome: 'declined',
          reason: 'defensive_gap',
          decided_by: 'player',
          purpose: 'defensive',
          why_needed: 'Reserve requested for a defensive gap.',
          how_to_use: 'Hold the sector line.',
        }],
      } as Partial<LoadedGameState>),
    });

    expect(view.cards.some((card) => card.id === 'chronicle:review-memory')).toBe(false);
  });

  it('builds a deterministic priority dossier for the top card by default', () => {
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
      latestTurnSummary: makeSummary({
        turn: 24,
        displacement_total: 1400,
      }),
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });

    expect(first.activeDossier).toMatchObject({
      cardId: 'review:pending',
      title: 'Presidential reviews pending',
      sourceOwner: 'Presidential review queue',
      sourceHandoff: {
        id: 'presidential-inbox',
        cardIds: ['review:pending'],
      },
      relatedCardIds: [],
      advanceSensitive: true,
      advanceLabel: 'Review before advance',
      navigationTarget: { kind: 'inbox' },
    });
    expect(second.activeDossier).toEqual(first.activeDossier);
  });

  it('honors an explicit priority dossier card id without changing the card archive', () => {
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
        territory_net: { RBiH: -1 },
        displacement_total: 1800,
      }),
    });

    const defaultView = buildPresidentialDecisionRoomView({ state });
    const selectedView = buildPresidentialDecisionRoomView({
      state,
      selectedCardId: 'turn:24:hard-turn',
    });
    const fallbackView = buildPresidentialDecisionRoomView({
      state,
      selectedCardId: 'missing-card',
    });

    expect(selectedView.cards.map((card) => card.id)).toEqual(defaultView.cards.map((card) => card.id));
    expect(selectedView.activeDossier).toMatchObject({
      cardId: 'turn:24:hard-turn',
      sourceOwner: 'Turn Aftermath records',
      sourceHandoff: {
        id: 'turn-aftermath-records',
        cardIds: ['turn:24:hard-turn'],
      },
      relatedCardIds: [],
      advanceSensitive: true,
      navigationTarget: { kind: 'decision-room', lens: 'turn', cardId: 'turn:24:hard-turn' },
    });
    expect(fallbackView.cards.map((card) => card.id)).toEqual(defaultView.cards.map((card) => card.id));
    expect(fallbackView.activeDossier).toBeNull();
  });

  it('populates an authorize-op directive (cost 0) on an opportunity card with an enabled approve action', () => {
    const state = makeState({
      operationOpportunityProposals: [
        makeOpportunity({
          proposal_id: 'opp_authorize',
          display_name: 'Authorize Window',
          expires_turn: 30,
          available_actions: [{ id: 'approve', label: 'Authorize', enabled: true }],
        }),
        makeOpportunity({
          proposal_id: 'opp_no_action',
          display_name: 'No Action Window',
          expires_turn: 30,
          available_actions: [{ id: 'approve', label: 'Authorize', enabled: false }],
        }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const authorizeCard = view.cards.find((card) => card.id === 'opportunity:opp_authorize');
    const noActionCard = view.cards.find((card) => card.id === 'opportunity:opp_no_action');

    expect(authorizeCard?.directive).toEqual({
      lever: 'authorize_op',
      cost: 0,
      payload: { reviewId: 'review_alpha', proposalId: 'opp_authorize' },
    });
    expect(noActionCard).toMatchObject({
      actionLabel: 'Review Dossier',
      navigationTarget: {
        kind: 'decision-room',
        lens: 'opportunity',
        cardId: 'opportunity:opp_no_action',
      },
      sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    // A disabled approve action keeps the card reviewable but carries no issue directive.
    expect(noActionCard?.directive).toBeUndefined();
  });

  it('does not expose authorize-op directives when the opportunity review id is missing', () => {
    const state = makeState({
      operationOpportunityProposals: [
        makeOpportunity({
          proposal_id: 'opp_missing_review',
          review_id: undefined,
          display_name: 'Missing Review Window',
          expires_turn: 30,
          available_actions: [{ id: 'approve', label: 'Authorize', enabled: true }],
        }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((entry) => entry.id === 'opportunity:opp_missing_review');

    expect(card).toBeTruthy();
    expect(card?.directive).toBeUndefined();
  });

  it('renders opportunity recommendation enums as staff copy instead of raw ids', () => {
    const state = makeState({
      operationOpportunityProposals: [
        makeOpportunity({
          proposal_id: 'opp_approve',
          recommendation: 'approve',
          description: 'Fallback staff detail.',
        }),
        makeOpportunity({
          proposal_id: 'opp_under_resource',
          display_name: 'Reduced Resources',
          recommendation: 'under_resource',
          description: 'Fallback staff detail.',
        }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const approveCard = view.cards.find((entry) => entry.id === 'opportunity:opp_approve');
    const underResourceCard = view.cards.find((entry) => entry.id === 'opportunity:opp_under_resource');

    expect(approveCard?.explanation).toBe('Staff recommends authorization.');
    expect(underResourceCard?.explanation).toBe('Staff recommends authorization with reduced resources.');
    expect(approveCard?.explanation).not.toBe('approve');
    expect(underResourceCard?.explanation).not.toBe('under_resource');
  });

  it('populates a stop-op directive (cost 25) for a player-faction executing operation', () => {
    // The stop-op lever is keyed off the live operation list (`state.operations`), NOT
    // the briefing target — the briefing pipeline never carries a per-operation
    // (corpsId, opName) pair (see addStopOpDirectiveCards / addBriefingCards). The raw
    // engine name lands in the payload; the player-safe display name is the caption.
    const state = makeState({
      operations: [
        {
          corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH',
          name: 'operation_breakthrough', display_name: 'Operation Breakthrough',
          type: 'offensive', phase: 'execution', participating_brigade_count: 3, started_turn: 20,
        },
        {
          corps_id: 'arbih_2nd_corps', corps_name: '2nd Corps', faction: 'RBiH',
          name: 'operation_staging', display_name: 'Operation Staging',
          type: 'offensive', phase: 'planning', participating_brigade_count: 2, started_turn: 22,
        },
      ] as LoadedGameState['operations'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const opCard = view.cards.find(
      (card) => card.id === 'command:stop-op:arbih_3rd_corps:operation_breakthrough',
    );

    expect(opCard?.directive).toEqual({
      lever: 'stop_op',
      corpsId: 'arbih_3rd_corps',
      cost: 25,
      payload: { corpsId: 'arbih_3rd_corps', opName: 'operation_breakthrough' },
    });
    // A non-executing (planning) operation carries no stop-op directive.
    expect(
      view.cards.find((card) => card.id === 'command:stop-op:arbih_2nd_corps:operation_staging'),
    ).toBeUndefined();
  });

  it('propagates a directive through buildActiveDossier for the selected card', () => {
    const state = makeState({
      operationOpportunityProposals: [
        makeOpportunity({
          proposal_id: 'opp_authorize',
          display_name: 'Authorize Window',
          expires_turn: 30,
          available_actions: [{ id: 'approve', label: 'Authorize', enabled: true }],
        }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state, selectedCardId: 'opportunity:opp_authorize' });

    expect(view.activeDossier?.cardId).toBe('opportunity:opp_authorize');
    expect(view.activeDossier?.directive).toEqual({
      lever: 'authorize_op',
      cost: 0,
      payload: { reviewId: 'review_alpha', proposalId: 'opp_authorize' },
    });
  });

  it('leaves directive undefined on cards without lever context (additive / flag-off safe)', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 0,
        eventDecisionCount: 0,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
      operationalSitrep: makeSitrep(),
    });

    const view = buildPresidentialDecisionRoomView({ state });
    expect(view.cards.find((card) => card.id === 'review:pending')?.directive).toBeUndefined();
    expect(view.cards.find((card) => card.id === 'sitrep:front-exposed')?.directive).toBeUndefined();
  });

  it('populates a replace-co directive (cost 25) for a player corps with an eligible serving CO', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
        { id: 'arbih_3rd_brigade', faction: 'RBiH', name: '3rd Brigade', kind: 'brigade' },
        { id: 'vrs_1st_corps', faction: 'RS', name: '1st Krajina Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        {
          id: 'arbih_co', name: 'Serving CO', faction: 'RBiH', rank: 'corps_commander',
          competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
          origin: 'authored', status: 'active', assigned_corps_id: 'arbih_3rd_corps',
          acting_commander: false, turns_in_command: 8, battles: 2, victories: 1,
        },
        {
          id: 'vrs_co', name: 'Enemy CO', faction: 'RS', rank: 'corps_commander',
          competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
          origin: 'authored', status: 'active', assigned_corps_id: 'vrs_1st_corps',
          acting_commander: false, turns_in_command: 8, battles: 2, victories: 1,
        },
      ] as LoadedGameState['namedOfficerData'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:replace-co:arbih_3rd_corps');

    expect(card?.category).toBe('command');
    expect(card?.directive).toEqual({
      lever: 'replace_co',
      corpsId: 'arbih_3rd_corps',
      cost: 25,
      payload: { corpsId: 'arbih_3rd_corps' },
    });
    // Enemy-faction corps and the player's brigade never get a replace-co card.
    expect(view.cards.find((c) => c.id === 'command:replace-co:vrs_1st_corps')).toBeUndefined();
    expect(view.cards.find((c) => c.id === 'command:replace-co:arbih_3rd_brigade')).toBeUndefined();
  });

  it('keeps Decision Room command cards in the command lens while preserving Army HQ source handoffs', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        {
          id: 'arbih_co', name: 'Serving CO', faction: 'RBiH', rank: 'corps_commander',
          competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
          origin: 'authored', status: 'active', assigned_corps_id: 'arbih_3rd_corps',
          acting_commander: false, turns_in_command: 8, battles: 2, victories: 1,
        },
      ] as LoadedGameState['namedOfficerData'],
      operations: [
        {
          name: 'operation_breakthrough',
          display_name: 'Operation Breakthrough',
          corps_id: 'arbih_3rd_corps',
          corps_name: '3rd Corps',
          faction: 'RBiH',
          phase: 'execution',
        },
      ] as LoadedGameState['operations'],
      pendingOfficerEvents: [
        {
          event_id: 'pushback_1',
          type: 'order_refused',
          faction: 'RBiH',
          turn: 24,
          officer_id: 'arbih_co',
          officer_name: 'Serving CO',
          officer_competence: 0.6,
          officer_aggressiveness: 0.5,
          officer_defensive_skill: 0.5,
          corps_name: '3rd Corps',
          acknowledged: false,
          reason: 'Refuses the directive as infeasible.',
        },
      ] as LoadedGameState['pendingOfficerEvents'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const stopOp = view.cards.find((c) => c.id === 'command:stop-op:arbih_3rd_corps:operation_breakthrough');
    const replaceCo = view.cards.find((c) => c.id === 'command:replace-co:arbih_3rd_corps');
    const pushback = view.cards.find((c) => c.id === 'pushback:player-army-co');

    expect(stopOp?.navigationTarget).toEqual({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'command:stop-op:arbih_3rd_corps:operation_breakthrough',
    });
    expect(stopOp?.sourceHandoffTarget).toEqual({
      kind: 'army-hq-corps-briefing',
      corpsId: 'arbih_3rd_corps',
    });
    expect(replaceCo?.navigationTarget).toEqual({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'command:replace-co:arbih_3rd_corps',
    });
    expect(replaceCo?.sourceHandoffTarget).toEqual({ kind: 'army-hq-tab', tab: 'personnel' });
    expect(pushback?.navigationTarget).toEqual({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'pushback:player-army-co',
    });
    expect(pushback?.sourceHandoffTarget).toEqual({ kind: 'army-hq-tab', tab: 'briefing' });
    expect(view.advanceReadiness.items.find((item) => item.id === 'pushback:player-army-co')?.navigationTarget).toEqual({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'pushback:player-army-co',
    });
  });

  it('routes command-only review aggregates to the Decision Room command card instead of the Desk', () => {
    const state = makeState({
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 0,
        eventDecisionCount: 0,
        commandInterpretationCount: 1,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
      pendingOfficerEvents: [
        {
          event_id: 'pushback_1',
          type: 'order_pushback',
          faction: 'RBiH',
          turn: 24,
          officer_id: 'arbih_co',
          officer_name: 'Serving CO',
          acknowledged: false,
          reason: 'Pushes back on the directive.',
        },
      ] as LoadedGameState['pendingOfficerEvents'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const review = view.cards.find((c) => c.id === 'review:pending');

    expect(review?.navigationTarget).toEqual({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'pushback:player-army-co',
    });
    expect(review?.sourceHandoffTarget).toEqual({ kind: 'army-hq-tab', tab: 'briefing' });
    expect(review?.actionLabel).toBe('Review Pushback');
    expect(review?.navigationTarget).not.toEqual({ kind: 'inbox' });
  });

  it('omits a replace-co card when the corps CO is only an acting commander', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_5th_corps', faction: 'RBiH', name: '5th Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        {
          id: 'arbih_acting', name: 'Acting CO', faction: 'RBiH', rank: 'corps_commander',
          competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
          origin: 'authored', status: 'active', assigned_corps_id: 'arbih_5th_corps',
          acting_commander: true, turns_in_command: 1, battles: 0, victories: 0,
        },
      ] as LoadedGameState['namedOfficerData'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    expect(view.cards.find((c) => c.id === 'command:replace-co:arbih_5th_corps')).toBeUndefined();
  });

  it('populates an elite-deploy directive (cost 25) carrying requestId + brigadeId for a player reserve request', () => {
    const state = makeState({
      pendingReserveRequests: [
        {
          request_id: 'reserve_alpha',
          corps_id: 'arbih_3rd_corps',
          faction: 'RBiH',
          reason: 'sector_threat',
          priority: 80,
          severityBand: 'critical',
          travel_hops: 3,
          description: 'A sector is buckling.',
          suggested_brigade_id: 'elite_guards',
          turn_requested: 24,
        },
        {
          request_id: 'reserve_beta',
          corps_id: 'arbih_2nd_corps',
          faction: 'RBiH',
          reason: 'defensive_gap',
          priority: 40,
          severityBand: 'routine',
          travel_hops: 1,
          description: 'No brigade named.',
          suggested_brigade_id: null,
          turn_requested: 24,
        },
        {
          request_id: 'reserve_enemy',
          corps_id: 'vrs_1st_corps',
          faction: 'RS',
          reason: 'sector_threat',
          priority: 90,
          severityBand: 'critical',
          travel_hops: 2,
          description: 'Enemy request.',
          suggested_brigade_id: 'vrs_guards',
          turn_requested: 24,
        },
      ] as LoadedGameState['pendingReserveRequests'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const alpha = view.cards.find((c) => c.id === 'command:elite-deploy:reserve_alpha');
    const beta = view.cards.find((c) => c.id === 'command:elite-deploy:reserve_beta');

    expect(alpha).toMatchObject({
      category: 'command',
      navigationTarget: {
        kind: 'decision-room',
        lens: 'command',
        cardId: 'command:elite-deploy:reserve_alpha',
      },
      sourceHandoffTarget: { kind: 'army-hq-tab', tab: 'personnel' },
    });
    expect(alpha?.directive).toEqual({
      lever: 'elite_deploy',
      corpsId: 'arbih_3rd_corps',
      cost: 25,
      payload: { requestId: 'reserve_alpha', brigadeId: 'elite_guards' },
    });
    // A request with no suggested brigade remains a staff-selection matter in Army Reserve.
    expect(beta).toBeUndefined();
    // Enemy-faction reserve requests never surface to the player.
    expect(view.cards.find((c) => c.id === 'command:elite-deploy:reserve_enemy')).toBeUndefined();
  });

  it('resolves the elite-deploy card title to the corps display name, not the raw corps id', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_1st_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      pendingReserveRequests: [
        {
          request_id: 'reserve_alpha',
          corps_id: 'arbih_1st_corps',
          faction: 'RBiH',
          reason: 'sector_threat',
          priority: 80,
          severityBand: 'critical',
          travel_hops: 3,
          description: 'A sector is buckling.',
          suggested_brigade_id: 'elite_guards',
          turn_requested: 24,
        },
      ] as LoadedGameState['pendingReserveRequests'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:elite-deploy:reserve_alpha');

    expect(card?.title).toContain('1st Corps');
    expect(card?.title).not.toContain('arbih_1st_corps');
    expect(card?.evidence.join(' ')).toContain('Sector Threat');
    expect(card?.evidence.join(' ')).not.toContain('sector_threat');
  });

  it('always emits a single front-visit directive card (cost 10, availability gated in the component)', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState() });
    const card = view.cards.find((c) => c.id === 'command:front-visit');

    expect(card?.category).toBe('command');
    expect(card?.directive).toEqual({
      lever: 'front_visit',
      cost: 10,
      payload: {},
    });
    // The front-visit directive targets no corps (it targets a front).
    expect(card?.directive?.corpsId).toBeUndefined();
  });

  it('routes Command & Personnel cards into the command lens deterministically', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_1st_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        {
          id: 'arbih_co1', name: 'CO One', faction: 'RBiH', rank: 'corps_commander',
          competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
          origin: 'authored', status: 'active', assigned_corps_id: 'arbih_1st_corps',
          acting_commander: false, turns_in_command: 8, battles: 2, victories: 1,
        },
      ] as LoadedGameState['namedOfficerData'],
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    const commandLens = first.lenses.find((lens) => lens.id === 'command');

    expect(commandLens).toBeDefined();
    // replace-co + front-visit both land in the command lens.
    expect(commandLens?.count).toBeGreaterThanOrEqual(2);
    expect(second.cards.map((c) => c.id)).toEqual(first.cards.map((c) => c.id));
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
    expect(view.activeDossier).toBeNull();
    expect(view.emptyState).toBe('No player faction loaded.');
  });
});

describe('buildPresidentialDecisionRoomView — proactive force-launch (override silence)', () => {
  afterEach(() => {
    setLocale('en');
  });

  const PROACTIVE_FORCE_LAUNCH_COST = 25;

  function makeRawWithHeldPlan(params: {
    playerFaction: string | null;
    planStatus?: string;
    proposedAction?: string;
  }): LoadedGameState {
    const officer = {
      id: 'off_1',
      name: 'General Delic',
      faction: 'RBiH',
      rank: 'general',
      status: 'active',
      assigned_corps_id: 'arbih_1st_corps',
    };
    const rawGameState = {
      meta: { player_faction: params.playerFaction },
      military: {
        formations: {
          arbih_1st_corps: { id: 'arbih_1st_corps', name: '1st Corps', faction: 'RBiH', kind: 'corps' },
        },
        named_officers: {
          off_1: officer,
        },
        corps_command: {
          arbih_1st_corps: {
            commander_state: {
              last_plan_reason: 'Holding for reserves.',
              current_plan: {
                plan_id: 'plan_alpha',
                status: params.planStatus ?? 'ready',
                objective_description: 'Operation Held Alpha',
              },
            },
          },
        },
      },
    };
    const pendingProposalReviews = params.proposedAction
      ? [
          {
            id: 'rev_1',
            turn: 24,
            faction: 'RBiH',
            domain: 'ops',
            description: 'Approve held plan',
            proposed_action: params.proposedAction,
          },
        ]
      : [];
    return makeState({
      player_faction: params.playerFaction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawGameState: rawGameState as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      namedOfficerData: [officer as any],
      pendingProposalReviews,
    });
  }

  it('emits a proactive force_launch directive for a held-ready plan with PROACTIVE_FORCE_LAUNCH_COST', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeRawWithHeldPlan({ playerFaction: 'RBiH' }),
    });

    const card = view.cards.find(
      (c) => c.id === 'command:proactive-force-launch:arbih_1st_corps:plan_alpha',
    );
    expect(card).toBeDefined();
    expect(card?.directive).toMatchObject({
      lever: 'force_launch',
      corpsId: 'arbih_1st_corps',
      cost: PROACTIVE_FORCE_LAUNCH_COST,
      // planId routes DirectiveCard through proactiveForceLaunchOp (held-plan path, 25 CA).
      payload: { opName: 'Operation Held Alpha', planId: 'plan_alpha' },
    });
    // Distinct title from the proposal-override card.
    expect(card?.title).toContain('unrequested');
  });

  it('does NOT emit a proactive card for a plan that already has a proposal-override card', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeRawWithHeldPlan({
        playerFaction: 'RBiH',
        proposedAction: 'APPROVE_OP:arbih_1st_corps:plan_alpha',
      }),
    });

    expect(
      view.cards.find(
        (c) => c.id === 'command:proactive-force-launch:arbih_1st_corps:plan_alpha',
      ),
    ).toBeUndefined();

    const reviewCard = view.cards.find((c) => c.id === 'command:review-proposal:rev_1');
    expect(reviewCard?.title).toContain('Operations');
    expect(reviewCard?.evidence.join(' ')).toContain('Operations');
    expect(`${reviewCard?.title} ${reviewCard?.evidence.join(' ')}`).not.toMatch(/\bops\b|Ops/);
  });

  it('emits no proactive cards when there is no player faction', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeRawWithHeldPlan({ playerFaction: null }),
    });

    expect(
      view.cards.filter((c) => c.id.startsWith('command:proactive-force-launch:')),
    ).toEqual([]);
  });

  it('emits no proactive card when the plan is not held at ready', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeRawWithHeldPlan({ playerFaction: 'RBiH', planStatus: 'drafting' }),
    });

    expect(
      view.cards.filter((c) => c.id.startsWith('command:proactive-force-launch:')),
    ).toEqual([]);
  });
});
