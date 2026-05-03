import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Army HQ / presidential review coherence', () => {
  it('routes the tactical toolbar through one canonical pending review signal', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('pendingReviews: number;');
    expect(source).toContain("{pendingReviews} {pendingReviews === 1 ? 'REVIEW' : 'REVIEWS'}");
    expect(source).not.toContain("{pendingReviews +");
    expect(source).not.toContain('OfficerEventBadge');
    expect(source).not.toContain('pendingOfficerEvents: boolean;');
    expect(source).not.toContain('pendingDecisions: number;');
  });

  it('gives reserve pressure one distinct army-level toolbar signal without folding it into presidential review', () => {
    const source = readFileSync(
      new URL('../src/ui/map/components/PresidentialToolbar.tsx', import.meta.url),
      'utf8',
    );

    expect(source).toContain('reserveAttention?: {');
    expect(source).toContain('leadCriticalReason?: string;');
    expect(source).toContain('getArmyReserveToolbarSignal');
    expect(source).toContain('reserveSignal.label');
    expect(source).not.toContain("{pendingReviews +");
  });

  it('makes Army HQ briefing explicitly own the live military review queue', () => {
    const modalSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/ArmyHQModal.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const adapterSource = readFileSync(
      new URL('../src/ui/map/data/GameStateAdapter.ts', import.meta.url),
      'utf8',
    );

    expect(modalSource).toContain('PresidentialAttentionPanel');
    expect(panelSource).toContain('PRESIDENTIAL ATTENTION');
    expect(panelSource).toContain('This queue owns live military review work. Situation briefing below is context, not the action queue.');
    expect(adapterSource).toContain('operationOpportunityCount');
    expect(panelSource).toContain('reviewQueue?.operationOpportunityCount');
    expect(panelSource).not.toContain('+ opportunityDossierCount');
    expect(panelSource).toContain('Presidential Decisions');
    expect(panelSource).toContain('OperationOpportunityDossierPanel');
    expect(panelSource).toContain('Command Reactions');
    expect(panelSource).toContain('Personnel Directives');
  });

  it('keeps reserve requests outside presidential review and makes the handoff explicit', () => {
    const modalSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/ArmyHQModal.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const adapterSource = readFileSync(
      new URL('../src/ui/map/data/GameStateAdapter.ts', import.meta.url),
      'utf8',
    );

    expect(adapterSource).toContain('deriveArmyReserveQueue');
    expect(panelSource).toContain('Army Reserve Requests');
    expect(panelSource).toContain('getArmyReserveAttentionSummary');
    expect(panelSource).toContain('Open Reserve Desk');
    expect(modalSource).toContain('setSelectedArmyHqId');
  });

  it('keys Warroom review signaling from the canonical presidential review queue', () => {
    // Post-Warroom-React-migration ownership boundary: WarroomStatusBar takes
    // `pendingReviews` as a prop; the canonical wiring lives at the caller
    // (App.tsx) which reads `loadedGameState.presidentialReviewQueue.pendingCount`.
    // The previous direct-read pattern was retired in the React migration.
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    expect(appSource).toContain('loadedGameState?.presidentialReviewQueue?.pendingCount');
    expect(appSource).not.toContain('loadedGameState.pendingEventDecisions?.length');
  });

  /**
   * Cluster C: Review/Action-Family Ownership Boundary.
   *
   * Presidential event decisions have ONE execution owner:
   * - PresidentialAttentionPanel (inside Army HQ briefing) calls
   *   ipc.respondToEventDecision. It is the sole surface for decision execution,
   *   officer acknowledgement, and replacement acceptance.
   *
   * App.tsx owns inbox NAVIGATION routing only. Inbox 'event_modal' clicks
   * route the president to Army HQ briefing via openArmyHQTab(gs, 'briefing');
   * App.tsx no longer calls ipc.respondToEventDecision and no longer pushes
   * decision events into the EventModal queue.
   *
   * EventModal remains for non-decision fired-event display (acknowledgement
   * flash with auto-dismiss). It no longer owns event decisions.
   */
  it('PresidentialAttentionPanel is the sole execution owner for presidential event decisions', () => {
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );
    const eventModalSource = readFileSync(
      new URL('../src/ui/map/components/EventModal.tsx', import.meta.url),
      'utf8',
    );

    // Panel is the sole execution surface for all three presidential families.
    expect(panelSource).toContain('handleDecisionResponse');
    expect(panelSource).toContain('handleAcknowledgeOfficerEvent');
    expect(panelSource).toContain('handleAcceptReplacement');
    expect(panelSource).toContain('ipc.respondToEventDecision');
    expect(panelSource).toContain('ipc.acknowledgeOfficerEvent');
    expect(panelSource).toContain('ipc.acceptOfficerReplacement');

    // App.tsx executes none of the three families.
    expect(appSource).not.toContain('respondToEventDecision');
    expect(appSource).not.toContain('handleAcceptReplacement');
    expect(appSource).not.toContain('handleAcknowledgeOfficerEvent');

    // EventModal no longer has a decision-response execution seam.
    expect(eventModalSource).not.toContain('onDecisionResponse');
  });

  it('Inbox onAction routes navigation only — event_modal lands on the sole executor', () => {
    const appSource = readFileSync(
      new URL('../src/ui/map/App.tsx', import.meta.url),
      'utf8',
    );

    // Inbox onAction signature preserved for identity routing.
    expect(appSource).toContain("onAction={(action, itemId)");
    expect(appSource).toContain("action === 'army_reserve'");
    expect(appSource).toContain("action === 'army_hq_personnel'");
    expect(appSource).toContain("action === 'event_modal'");
    expect(appSource).toContain("action === 'army_hq_opportunity'");
    expect(appSource).toContain("action === 'peace_plan_modal'");
    expect(appSource).toContain("action === 'autonomy_panel'");

    // event_modal routes to Army HQ briefing — where PresidentialAttentionPanel
    // renders and executes. Routing is navigation only; no IPC here.
    expect(appSource).toContain("openArmyHQTab(gs, 'briefing')");
  });

  it('keeps opportunity decisions on the Army HQ briefing surface, not generic autonomy cards', () => {
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx', import.meta.url),
      'utf8',
    );
    const dossierSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx', import.meta.url),
      'utf8',
    );
    const dossierDataSource = readFileSync(
      new URL('../src/ui/map/data/operationOpportunityDossiers.ts', import.meta.url),
      'utf8',
    );
    const inboxSource = readFileSync(
      new URL('../src/ui/map/data/inboxItems.ts', import.meta.url),
      'utf8',
    );

    expect(dossierSource).toContain('operationOpportunityProposals');
    expect(dossierSource).toContain('Operational Opportunities');
    expect(dossierSource).toContain('Force Quality');
    expect(dossierSource).toContain('Map Footprint');
    expect(dossierSource).toContain('setOperationTargetOsids');
    expect(dossierSource).toContain('redirectVariantId');
    expect(dossierDataSource).toContain('force_quality_traits');
    expect(dossierDataSource).toContain('redirect_variants');
    expect(dossierSource).toContain('ipc.resolveOperationOpportunityDecision');
    expect(dossierDataSource).toContain("label: 'Delay'");
    expect(dossierDataSource).toContain("label: 'Redirect'");
    expect(dossierDataSource).toContain("label: 'Under-resource'");
    expect(inboxSource).toContain('operation_opportunity');
    expect(inboxSource).toContain('army_hq_opportunity');
  });
});
