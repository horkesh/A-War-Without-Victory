import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../src/ui/map/data/presidentialDecisionRoom.js';
import { openPresidentialDecisionRoomNavigationTarget } from '../src/ui/map/utils/presidentialDecisionRoomNavigation.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import type { TurnSummary } from '../src/state/turn_summary.js';
import type { ShellNavigationState } from '../src/ui/map/utils/shellNavigation.js';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function makeTurnSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
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

function makeLoadedState(): LoadedGameState {
  const latestTurnSummary = makeTurnSummary({
    turn: 24,
    territory_net: { RBiH: -1 },
    displacement_total: 1800,
    formation_destructions: [
      { formation_id: 'arbih_lost', formation_name: 'Lost Brigade', faction: 'RBiH' },
    ],
  });
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
    turnSummaries: [latestTurnSummary],
    player_faction: 'RBiH',
    presidentialReviewQueue: {
      pendingCount: 1,
      criticalCount: 1,
      eventDecisionCount: 1,
      commandInterpretationCount: 0,
      personnelDirectiveCount: 0,
      operationOpportunityCount: 0,
    },
    operationalSitrep: {
      headline: 'Front alert.',
      territory: { territoryPercent: 44, settlementsControlled: 110, settlementsTotal: 250 },
      front: { engagedCount: 5, exposedCount: 2, edges: [] },
      readiness: { weakestBrigades: [], encircledCount: 0 },
      sustainment: {
        adequateCount: 8,
        strainedCount: 3,
        criticalCount: 1,
        collapsedMunicipalities: [],
        activeHostileTakeoverTimers: 0,
        activeCamps: 0,
      },
      operations: { activeCount: 1, corps: [] },
      alerts: [{ id: 'front-critical', severity: 'critical', text: 'Two exposed fronts require command review.' }],
    },
  } as LoadedGameState;
}

function createNavigationState(): ShellNavigationState & { calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = [];
  return {
    loadedGameState: { player_faction: 'RBiH' },
    calls,
    setSelectedArmyId: (id) => { calls.push(['setSelectedArmyId', id]); },
    setArmyHQOpen: (open) => { calls.push(['setArmyHQOpen', open]); },
    setArmyHQTab: (tab) => { calls.push(['setArmyHQTab', tab]); },
    setArmyHQRecordsSubTab: (subTab) => { calls.push(['setArmyHQRecordsSubTab', subTab]); },
    setArmyHQExpandedCorpsId: (id) => { calls.push(['setArmyHQExpandedCorpsId', id]); },
    setFocusedAftermathTurn: (turn) => { calls.push(['setFocusedAftermathTurn', turn]); },
    setCodexOpen: (open) => { calls.push(['setCodexOpen', open]); },
    setChronicleOpen: (open) => { calls.push(['setChronicleOpen', open]); },
  };
}

describe('Presidential Decision Room wiring', () => {
  it('keeps the Chief of Staff report before the decision-room synthesis in Army HQ briefing', () => {
    const armyHq = read('../src/ui/map/components/army_hq/ArmyHQModal.tsx');

    expect(armyHq).toContain('PresidentialDecisionRoomPanel');
    expect(armyHq.indexOf('<ChiefOfStaffBriefing')).toBeLessThan(
      armyHq.indexOf('<PresidentialDecisionRoomPanel'),
    );
    expect(armyHq.indexOf('<PresidentialDecisionRoomPanel')).toBeLessThan(
      armyHq.indexOf('<PresidentialAttentionPanel'),
    );
  });

  it('keeps decision-room synthesis in a pure UI read-model module', () => {
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('buildPresidentialDecisionRoomView');
    expect(model).toContain('LoadedGameState');
    expect(model).toContain('buildTurnAftermathRecordViews');
    expect(model).toContain('buildTurnAftermathCampaignCost');
    expect(model).not.toMatch(/from ['"].*src\/sim\/combat/);
    expect(model).not.toMatch(/from ['"].*combat\//);
    expect(model).not.toContain('Math.random');
    expect(model).not.toContain('Date.now');
    expect(model).not.toContain('new Date');
    expect(model).not.toContain('performance.now');
    expect(model).not.toContain('crypto.randomUUID');
    expect(model).not.toContain('localeCompare');
  });

  it('routes card actions through canonical shell navigation helpers', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const router = read('../src/ui/map/utils/presidentialDecisionRoomNavigation.ts');

    expect(panel).toContain('buildPresidentialDecisionRoomView');
    expect(panel).toContain('openPresidentialDecisionRoomNavigationTarget');
    expect(router).toContain('openArmyHQTab');
    expect(router).toContain('openArmyHQRecordsSubTab');
    expect(router).toContain('openArmyHQAftermathRecord');
    expect(router).toContain('openArmyHQBriefingForCorps');
    expect(router).toContain('openChronicle');
    expect(panel).not.toContain('setArmyHQTab');
    expect(panel).not.toContain('setArmyHQRecordsSubTab');
    expect(panel).not.toContain('setChronicleOpen(true)');
  });

  it("keeps the President's Desk overlay clear of the persistent top toolbar", () => {
    const shell = read('../src/ui/map/components/presidential_desk/PresidentDeskShell.tsx');

    expect(shell).toContain('top-[var(--awwv-toolbar-clearance,5.5rem)]');
    expect(shell).toContain('data-testid="desk-close-overlay"');
  });

  it("uses the shared presidential blocker model for the President's Desk advance status", () => {
    const shell = read('../src/ui/map/components/presidential_desk/PresidentDeskShell.tsx');

    expect(shell).toContain("from '../../data/presidentialBlockers'");
    expect(shell).toContain('derivePresidentialBlockers(state, osidNameMap).length > 0');
    expect(shell).not.toContain('hasBlockingItems(items)');
  });

  it('lets App-owned Decision Room navigation open counter-offer modals', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const app = read('../src/ui/map/App.tsx');

    expect(panel).toContain('onNavigateTarget?:');
    expect(panel).toContain('navigateTarget(dossier.navigationTarget)');
    expect(panel).toContain('navigateTarget(handoff.navigationTarget)');
    expect(app).toContain('const openDecisionRoomTarget =');
    expect(app).toContain("if (target.kind === 'counter-offer')");
    expect(app).toContain('setSelectedCounterOfferId(target.counterOfferId)');
    expect(app).toContain("if (target.kind === 'enclave-dashboard')");
    expect(app).toContain('setEnclaveDashboardOpen(true)');
    expect(app).toContain('<PresidentialDecisionRoomPanel onNavigateTarget={openDecisionRoomTarget} />');
    expect(app).toContain('<ArmyHQModal onDecisionRoomNavigateTarget={openDecisionRoomTarget} />');
  });

  it('does not let the generic Decision Room helper claim App-owned counter-offer targets', () => {
    const navState = createNavigationState();

    expect(openPresidentialDecisionRoomNavigationTarget({
      kind: 'counter-offer',
      counterOfferId: 'offer_1',
    }, navState)).toBe(false);
    expect(navState.calls).toEqual([]);
  });

  it('renders priority lenses as local filters over the Decision Room card list', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');

    expect(panel).toContain('useState');
    expect(panel).toContain('activeLens');
    expect(panel).toContain('setActiveLens');
    expect(panel).toContain('view.lenses.map');
    expect(panel).toContain('filteredCards');
    expect(panel).toContain("lens.id === 'all'");
  });

  it('keeps advanced decision-room telemetry behind an explicit progressive-disclosure control', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');

    expect(panel).toContain('showAdvanced');
    expect(panel).toContain('setShowAdvanced');
    expect(panel).toContain("t('decisionRoom.viewAdvanced')");
    expect(panel).toContain("t('decisionRoom.hideAdvanced')");
    expect(panel).toContain('data-testid="decision-room-advanced"');
    expect(panel).toContain('{showAdvanced && view.lenses.length > 0');
    expect(panel).toContain('{showAdvanced && (');
  });

  it('renders command-loop lanes without creating another queue owner', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('commandQuestions');
    expect(model).toContain('buildCommandQuestions');
    expect(panel).toContain('CommandQuestionLane');
    expect(panel).toContain('view.commandQuestions.map');
    expect(panel).toContain("t('decisionRoom.commandLoop')");
    expect(panel).toContain('navigateTarget(question.navigationTarget)');
    expect(panel).not.toContain('commandLoopQueue');
  });

  it('renders product-loop handoffs without creating another history owner', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('loopSteps');
    expect(model).toContain('buildLoopSteps');
    expect(model).toContain('buildReportLoopStep');
    expect(model).toContain('buildCostLoopStep');
    expect(model).toContain('buildJudgeLoopStep');
    expect(panel).toContain('ProductLoopStep');
    expect(panel).toContain('view.loopSteps.map');
    expect(panel).toContain("t('decisionRoom.productLoop')");
    expect(panel).toContain('navigateTarget(step.navigationTarget)');
    expect(panel).not.toContain('productLoopQueue');
    expect(panel).not.toContain('historyOwner');
    expect(model).not.toContain('productLoopLedger');
  });

  it('renders source handoffs as grouped shell routes without creating another records owner', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('sourceHandoffs');
    expect(model).toContain('buildPresidentialDecisionRoomSourceHandoffs');
    expect(panel).toContain('SourceHandoffLink');
    expect(panel).toContain('view.sourceHandoffs.map');
    expect(panel).toContain("t('decisionRoom.sourceHandoffs')");
    expect(panel).toContain('navigateTarget(handoff.navigationTarget)');
    expect(panel).not.toContain('sourceHandoffQueue');
    expect(panel).not.toContain('sourceHandoffLedger');
  });

  it('renders a selected priority dossier over the existing card archive', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');

    expect(model).toContain('activeDossier');
    expect(model).toContain('buildActiveDossier');
    expect(model).toContain('selectedCardId');
    expect(panel).toContain('activeCardId');
    expect(panel).toContain('setActiveCardId');
    expect(panel).toContain('PriorityDossier');
    expect(panel).toContain('view.activeDossier');
    expect(panel).toContain('onSelectCard');
    expect(panel).toContain("t('decisionRoom.priorityDossier')");
    expect(panel).not.toContain('priorityDossierQueue');
    expect(panel).not.toContain('priorityDossierLedger');
  });

  it('does not import or expose sensitive-history/combat-lane internals', () => {
    const panel = read('../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx');
    const model = read('../src/ui/map/data/presidentialDecisionRoom.ts');
    const combined = `${panel}\n${model}`;

    expect(combined).not.toMatch(/src\/sim\/combat|sim\\combat|pre_planned_operations|triggered|rupture|drina|srebrenica/i);
    expect(combined).not.toContain('OPPORTUNITY_CATALOG');
    expect(combined).not.toContain('late_war');
  });

  it('opens Decision Room source handoff targets on their existing owner surfaces', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeLoadedState() });
    const handoffs = Object.fromEntries(view.sourceHandoffs.map((handoff) => [handoff.id, handoff]));

    const summaryState = createNavigationState();
    expect(openPresidentialDecisionRoomNavigationTarget(handoffs['army-hq-summary'].navigationTarget, summaryState)).toBe(true);
    expect(summaryState.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'summary'],
    ]);

    const turnRecordState = createNavigationState();
    expect(openPresidentialDecisionRoomNavigationTarget(handoffs['turn-aftermath-records'].navigationTarget, turnRecordState)).toBe(true);
    expect(turnRecordState.calls).toEqual([
      ['setSelectedArmyId', 'RBiH'],
      ['setArmyHQOpen', true],
      ['setArmyHQRecordsSubTab', 'aftermath'],
      ['setFocusedAftermathTurn', 24],
      ['setChronicleOpen', false],
    ]);

    const chronicleState = createNavigationState();
    expect(openPresidentialDecisionRoomNavigationTarget(handoffs.chronicle.navigationTarget, chronicleState)).toBe(true);
    expect(chronicleState.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', true],
    ]);
  });
});
