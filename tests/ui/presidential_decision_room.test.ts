import { afterEach, describe, expect, it } from 'vitest';
import {
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
} from '../../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState, OperationOpportunityProposalView, PlayerDecisionSummaryView } from '../../src/ui/map/data/types.js';
import type { OperationalSitrepView } from '../../src/ui/shared/operational_sitrep_views.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

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
    expect(loopsById.execute.label).toBe('Izvrsi');
    expect(loopsById.cost.summary).toContain('stavke cijene');
    expect(loopsById.report.summary).toContain('zapisana poteza');
    expect(handoffsById['army-hq-briefing'].label).toBe('Brifing Staba armije');
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
        pendingParamilitaryRequests: [
          { faction: 'RS', strength: 600, target_osid: 'op:zvornik:zvornik_2', estimated_civilian_risk: 42, mode: 'offensive' },
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

    expect(cardsById['review:pending'].title).toBe('Predsjednicki pregledi na cekanju');
    expect(cardsById['review:pending'].sourceOwner).toBe('Predsjednicki red pregleda');
    expect(cardsById['review:pending'].evidence).toContain('2 na cekanju');
    expect(cardsById['paramilitary:pending'].title).toBe('Odobrenje paravojske na cekanju');
    expect(cardsById['paramilitary:pending'].evidence).toContain('rizik ratnih zlocina');
    expect(cardsById['manifest:peace_plan'].title).toBe('Odgovor na mirovni plan na cekanju');
    expect(cardsById['sitrep:front-exposed'].title).toBe('Operativni SITREP');
    expect(cardsById['chronicle:review-memory'].title).toBe('Pamcenje Hronike azurirano');
    expect(cardsById['review:pending'].title).not.toBe('Presidential reviews pending');
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
      navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
    });
    expect(byId.inspect).toMatchObject({
      label: 'Inspect',
      count: first.inspectNext.length,
      navigationTarget: first.inspectNext[0]?.navigationTarget,
    });
    expect(byId.decide).toMatchObject({
      label: 'Decide',
      cardIds: ['review:pending', 'opportunity:opp_alpha'],
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    });
    expect(byId.execute).toMatchObject({
      label: 'Execute',
      headline: 'Review before advance',
      cardIds: ['review:pending', 'opportunity:opp_alpha', 'sitrep:front-exposed', 'turn:24:hard-turn'],
    });
    expect(byId.report).toMatchObject({
      label: 'Report',
      navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    });
    expect(byId.cost).toMatchObject({
      label: 'Cost',
      navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    });
    expect(byId.judge).toMatchObject({
      label: 'Judge',
      navigationTarget: { kind: 'chronicle' },
    });
    expect(byId.next).toMatchObject({
      label: 'Next',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
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

    expect(view.advanceReadiness.blockedByExistingSystems).toBe(true);
    expect(view.advanceReadiness.headline).toBe('Review before advance');
    expect(view.cards.find((card) => card.id === 'review:pending')).toBeUndefined();
    expect(view.metrics.pendingReviews).toBe(5);
    expect(view.cards.map((card) => card.id)).toContain('manifest:peace_plan');
    expect(view.cards.map((card) => card.id)).toContain('manifest:dayton_negotiation');
    expect(view.cards.map((card) => card.id)).toContain('manifest:convoy_decision');
    expect(view.advanceReadiness.items.map((item) => item.id)).toContain('manifest:peace_plan');
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
        id: 'army-hq-briefing',
        cardIds: ['review:pending', 'opportunity:opp_alpha', 'opportunity:opp_beta'],
      },
      relatedCardIds: ['opportunity:opp_alpha', 'opportunity:opp_beta'],
      advanceSensitive: true,
      advanceLabel: 'Review before advance',
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
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
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: 24 },
    });
    expect(fallbackView.activeDossier?.cardId).toBe(defaultView.cards[0]?.id);
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
