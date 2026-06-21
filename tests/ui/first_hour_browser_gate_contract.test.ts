import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('first-hour browser QA gate contract', () => {
  it('exposes an npm script for the non-destructive first-hour browser gate', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['qa:first-hour:browser']).toBe('node tools/ui/first_hour_browser_gate.cjs');
  });

  it('pins the requested first-hour browser invariants in the gate tool', () => {
    const tool = read('tools/ui/first_hour_browser_gate.cjs');

    expect(tool).toContain('.tmp_first_hour_browser_gate');
    expect(tool).toContain('consoleMessages');
    expect(tool).toContain('assertNoConsoleErrors');
    expect(tool).toContain('WAR HAS STARTED');
    expect(tool).toContain('WAR BEGINS');
    expect(tool).toContain('President of the Presidency of the Republic of Bosnia and Herzegovina');
    expect(tool).toContain('What Is Bosnia?');
    expect(tool).toContain('deskBlockedWhileDecisionActive');
    expect(tool).toContain('Decision consequence records');
    expect(tool).toContain('War Chronicle');
    expect(tool).toContain('rawFirstHourLabelsAbsentByFaction');
    expect(tool).toContain('serverPortCleanupVerified');
    expect(tool).toContain('rbih_state_identity');
    expect(tool).toContain('turn_fired');
    expect(tool).toContain('response_id');
    expect(tool).toContain("responseId: 'civic'");
    expect(tool).toContain("responseId: 'all_six'");
    expect(tool).toContain("responseId: 'croat_republic'");
    expect(tool).toContain('data-testid="event-decision-response"');
    expect(tool).toContain('data-event-id="${flow.eventId}"');
    expect(tool).toContain('data-response-id="${flow.responseId}"');
    expect(tool).toContain('FACTION_OPENING_FLOWS');
    expect(tool).toContain("faction: 'RBiH'");
    expect(tool).toContain("faction: 'RS'");
    expect(tool).toContain("faction: 'HRHB'");
    expect(tool).toContain('main-menu-faction-${flow.faction}');
    expect(tool).toContain('assertToolbarRoutesDisabled');
    expect(tool).toContain('toolbarLockWhileDecisionActive');
    expect(tool).toContain('allFactionFoundationalFlows');
    expect(tool).toContain('rs_strategic_goals');
    expect(tool).toContain('hrhb_political_goal');
    expect(tool).toContain('The Assembly Speaks');
    expect(tool).toContain('What Is Herceg-Bosna?');
    expect(tool).toContain('verifyDecisionRecordsAndChronicle(page, summary, flow)');
    expect(tool).toContain('assertTurnZeroRecordsProvenanceCounts');
    expect(tool).toContain('turnZeroRecordsProvenanceCountsByFaction');
    expect(tool).toContain('records-subtab-${id}');
    expect(tool).toContain('receiptChecksByFaction');
    expect(tool).not.toContain('receiptCheck: false');
    expect(tool).not.toContain('verifyRbihRecordsAndChronicle');
  });
});

describe('live surface browser sweep contract', () => {
  it('exposes an npm script for the non-destructive live surface browser sweep', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['qa:live-surface:browser']).toBe('node tools/ui/live_surface_browser_sweep.cjs');
  });

  it('pins the requested live surface browser invariants in the sweep tool', () => {
    const tool = read('tools/ui/live_surface_browser_sweep.cjs');

    expect(tool).toContain('.tmp_live_surface_browser_sweep');
    expect(tool).toContain('consoleMessages');
    expect(tool).toContain('assertNoConsoleErrors');
    expect(tool).toContain('WAR HAS STARTED');
    expect(tool).toContain('WAR BEGINS');
    expect(tool).toContain('Civic multi-ethnic republic');
    expect(tool).toContain('LIVE_SURFACES');
    expect(tool).toContain('Desk');
    expect(tool).toContain('War Map');
    expect(tool).toContain('Army HQ');
    expect(tool).toContain('Records');
    expect(tool).toContain('Chronicle');
    expect(tool).toContain('Codex');
    expect(tool).toContain('Latest Decision');
    expect(tool).toContain('data-testid="codex-panel"');
    expect(tool).toContain('assertSingleShellSurface');
    expect(tool).toContain('assertNoRawTechnicalTokens');
    expect(tool).toContain("label: 'OSID'");
    expect(tool).toContain("label: 'ATK'");
    expect(tool).toContain("label: 'raw planning ids'");
    expect(tool).toContain('runOwnerJourneyDrilldown');
    expect(tool).toContain('ownerJourneyDrilldown');
    expect(tool).toContain('runArmyHqInternalDrilldown');
    expect(tool).toContain('armyHqInternalDrilldown');
    expect(tool).toContain('army_hq_internal_summary');
    expect(tool).toContain('army_hq_internal_personnel');
    expect(tool).toContain('army_hq_internal_corps_card');
    expect(tool).toContain('army-hq-opening-command-provenance');
    expect(tool).toContain('data-commander-source="opening_read_model"');
    expect(tool).toContain('runArmyHqPersonnelBrigadeLiveProof');
    expect(tool).toContain('armyHqPersonnelBrigadeLiveProof');
    expect(tool).toContain('personnel-orbat-brigade-link');
    expect(tool).toContain('runArmyHqSectorFrontSegmentLiveProof');
    expect(tool).toContain('armyHqSectorFrontSegmentLiveProof');
    expect(tool).toContain('army-hq-sector-frontage');
    expect(tool).toContain('army-hq-sector-inspect');
    expect(tool).toContain('army_hq_sector_inspect_on_field_live_proof');
    expect(tool).toContain('armyHqSectorInspectOnFieldLiveProof');
    expect(tool).toContain('runMapContextMenuLiveProof');
    expect(tool).toContain('mapContextMenuLiveProof');
    expect(tool).toContain('map_context_menu_live_proof');
    expect(tool).toContain('map-context-menu-action-');
    expect(tool).toContain('dom-contextmenu');
    expect(tool).toContain('dev-seam');
    expect(tool).toContain('runRecordsAarFormationLinkLiveProof');
    expect(tool).toContain('recordsAarFormationLinkLiveProof');
    expect(tool).toContain('runBattleMarkerLiveProof');
    expect(tool).toContain('battleMarkerLiveProof');
    expect(tool).toContain('battle_marker_live_proof');
    expect(tool).toContain('battleMarkerOsids');
    expect(tool).toContain('buildRecordsAarLiveProofFixtureState');
    expect(tool).toContain('apr_1992_initial_save.json');
    expect(tool).toContain("op:gradacac:donja_tramosnica_2");
    expect(tool).toContain("arbih_213th_vitezka_mountain");
    expect(tool).toContain("rs_1st_birac");
    expect(tool).toContain('loadRecordsAarLiveProofFixture');
    expect(tool).toContain('handleManualSaveLoad');
    expect(tool).toContain('fixtureBattleSelector');
    expect(tool).toContain('fixtureAttackerLinkSelector');
    expect(tool).toContain('clickedFormationId');
    expect(tool).not.toContain('skipped:no-visible-aar-battle-row');
    expect(tool).not.toContain('skipped:no-visible-aar-formation-link');
    expect(tool.indexOf('await runArchiveInboxDrilldown(page, summary);')).toBeLessThan(
      tool.indexOf('await loadOperationOpportunityLiveProofFixture(page, summary);'),
    );
    expect(tool.indexOf('await runCodexInternalDrilldown(page, summary);')).toBeLessThan(
      tool.indexOf('await loadOperationOpportunityLiveProofFixture(page, summary);'),
    );
    expect(tool.indexOf('await loadOperationOpportunityLiveProofFixture(page, summary);')).toBeLessThan(
      tool.indexOf('await runPresidentialInboxRoutingLiveProof(page, summary);'),
    );
    expect(tool.indexOf('await runPresidentialInboxRoutingLiveProof(page, summary);')).toBeLessThan(
      tool.indexOf('await loadRecordsAarLiveProofFixture(page, summary);'),
    );
    expect(tool.indexOf('await runCodexInternalDrilldown(page, summary);')).toBeLessThan(
      tool.indexOf('await loadRecordsAarLiveProofFixture(page, summary);'),
    );
    expect(tool.indexOf('await loadRecordsAarLiveProofFixture(page, summary);')).toBeLessThan(
      tool.indexOf('await runRecordsAarFormationLinkLiveProof(page, summary);'),
    );
    expect(tool).toContain('aar-battle-row');
    expect(tool).toContain('aar-formation-link');
    expect(tool).toContain('runArchiveInboxDrilldown');
    expect(tool).toContain('archiveChronicleToRecordsDrilldown');
    expect(tool).toContain('archiveRecordsDecisionToChronicleDrilldown');
    expect(tool).toContain('presidentialInboxVisible');
    expect(tool).toContain('runPresidentialInboxRoutingLiveProof');
    expect(tool).toContain('presidentialInboxRoutingLiveProof');
    expect(tool).toContain('presidentialInboxRoutingLiveProof: false');
    expect(tool).toContain('buildOperationOpportunityLiveProofFixtureState');
    expect(tool).toContain('loadOperationOpportunityLiveProofFixture');
    expect(tool).toContain('operation_opportunities');
    expect(tool).toContain('live_window');
    expect(tool).toContain('data-inbox-action="decision_room"');
    expect(tool).toContain('data-inbox-item-type="operation_opportunity"');
    expect(tool).toContain('desk-card-operation_opportunity');
    expect(tool).toContain('desk-card-action');
    expect(tool).toContain('warroom-decision-room-host');
    expect(tool).toContain('presidential-decision-room');
    expect(tool).toContain('decision-room-priority-card-opportunity:${OPPORTUNITY_LIVE_FIXTURE_ID}');
    expect(tool).toContain('inbox_routing_decision_room');
    expect(tool).toContain('inbox_routing_desk_card_operation_opportunity');
    expect(tool).toContain('runOperationOpportunityLedgerLiveProof');
    expect(tool).toContain('operationOpportunityLedgerLiveProof');
    expect(tool).toContain('operation_opportunity_ledger_live_proof');
    expect(tool).toContain('opportunity-ledger-record');
    expect(tool).toContain('data-proposal-id="${OPPORTUNITY_LIVE_FIXTURE_ID}"');
    expect(tool).toContain('deskRecordsRoute');
    expect(tool).toContain('chronicle-open-record');
    expect(tool).toContain("chronicleRecordTarget === 'decision'");
    expect(tool).toContain('records-content');
    expect(tool).toContain('decision-consequence-open-chronicle');
    expect(tool).not.toContain('skipped:no-chronicle-target');
    expect(tool).toContain('presidential-inbox');
    expect(tool).toContain('president-desk-shell');
    expect(tool).toContain('desk-action-records');
    expect(tool).toContain('runCodexInternalDrilldown');
    expect(tool).toContain('codexInternalDrilldown');
    expect(tool).toContain('codexInternalDrilldown: false');
    expect(tool).toContain('await runCodexInternalDrilldown(page, summary);');
    expect(tool).toContain('codex_internal_selected_essay');
    expect(tool).toContain('codex-essay-row');
    expect(tool).toContain('codex-selected-essay');
    expect(tool).toContain('codex-selected-essay-body');
    expect(tool).toContain('activateVisibleControl');
    expect(tool).toContain('clickFirstSectorWithVisibleFormation');
    expect(tool).toContain('No visible Corps Front brigade rows with settlement locations found after inspecting');
    expect(tool).toContain('owner_journey_decision_room');
    expect(tool).toContain('owner_journey_sector_overview');
    expect(tool).toContain('owner_journey_formation_detail');
    expect(tool).toContain('owner_journey_settlement_detail');
    expect(tool).toContain('owner_journey_records_tabs');
    expect(tool).toContain('data-testid="desk-open-command-surface"');
    expect(tool).toContain('toolbar-route-desk');
    expect(tool).toContain('toolbar-route-war-map');
    expect(tool).toContain('[data-testid="tactical-map"]');
    expect(tool).not.toContain('main[aria-label^="Tactical map"]');
    expect(tool).toContain('toolbar-route-records');
    expect(tool).toContain('data-testid="codex-close"');
    expect(tool).toContain('data-testid="command-card-strip-close"');
    expect(tool).toContain('data-testid="warroom-decision-room-close"');
    expect(tool).toContain('data-testid="command-card-cat_war_direction"');
    expect(tool).toContain('data-testid="oob-section-sectors-toggle"');
    expect(tool).toContain('data-testid="oob-sector-row"');
    expect(tool).toContain('data-testid="corps-front-brigade-row"');
    expect(tool).toContain('data-location-osid');
    expect(tool).toContain('data-testid="formation-detail-panel"');
    expect(tool).toContain('data-testid="formation-location-link"');
    expect(tool).toContain('records-subtab-');
    expect(tool).toContain('records-subtab-aftermath');
    expect(tool).toContain('records-subtab-aar');
    expect(tool).toContain('data-selected="true"');
    expect(tool).toContain('convoy_decision');
    expect(tool).toContain('Expires T');
    expect(tool).toContain('op:');
    expect(tool).toContain('.json');
    expect(tool).toContain('waitForPortClosed');
  });

  it('pins live-owner journey selector hooks in the map UI', () => {
    expect(read('src/ui/map/components/MainMenu.tsx')).toContain('data-testid={`main-menu-faction-${faction}`}');
    expect(read('src/ui/map/components/SidePickerOverlay.tsx')).toContain('data-testid={`side-picker-faction-${faction}`}');
    expect(read('src/ui/map/components/PresidentialToolbar.tsx')).toContain('data-testid="toolbar-route-desk"');
    expect(read('src/ui/map/components/PresidentialToolbar.tsx')).toContain('data-testid="toolbar-route-war-map"');
    expect(read('src/ui/map/components/PresidentialToolbar.tsx')).toContain('data-testid="toolbar-route-records"');
    expect(read('src/ui/map/map/MapContainer.tsx')).toContain('data-testid="tactical-map"');
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-testid="codex-close"');
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-testid="codex-essay-row"');
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-essay-id={essay.id}');
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain("data-selected={isSelected ? 'true' : 'false'}");
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-testid="codex-selected-essay"');
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-testid="codex-selected-essay-body"');
    expect(read('src/ui/map/components/warroom/CommandCardStrip.tsx')).toContain('data-testid="command-card-strip-close"');
    expect(read('src/ui/map/App.tsx')).toContain('data-testid="warroom-decision-room-close"');
    expect(read('src/ui/map/components/OOBSidebar.tsx')).toContain('testId="oob-section-sectors-toggle"');
    expect(read('src/ui/map/components/OOBSidebar.tsx')).toContain('data-testid="oob-sector-row"');
    expect(read('src/ui/map/components/OOBSidebar.tsx')).toContain('data-selected={selectedCorpsFrontSectorId === sector.sector_id');
    expect(read('src/ui/map/components/CorpsFrontPanel.tsx')).toContain('data-testid="corps-front-brigade-row"');
    expect(read('src/ui/map/components/CorpsFrontPanel.tsx')).toContain('data-formation-id={f.id}');
    expect(read('src/ui/map/components/CorpsFrontPanel.tsx')).toContain('data-location-osid={f.location_osid ?? undefined}');
    expect(read('src/ui/map/components/FormationDetail.tsx')).toContain('data-testid="formation-detail-panel"');
    expect(read('src/ui/map/components/FormationDetail.tsx')).toContain('idPrefix="formation-detail"');
    expect(read('src/ui/map/components/FormationDetail.tsx')).toContain('data-testid="formation-location-link"');
    expect(read('src/ui/map/components/FormationDetail.tsx')).toContain("kind: 'field-formation-at-settlement'");
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain('data-testid={`records-subtab-${id}`}');
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain("data-selected={subTab === id ? 'true' : 'false'}");
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain('data-testid="records-content"');
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain('data-testid="records-archive-summary"');
    expect(read('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx')).toContain('data-testid="decision-consequence-records-panel"');
    expect(read('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx')).toContain('data-testid="decision-consequence-record"');
    expect(read('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx')).toContain('data-record-target={record.recordTarget}');
    expect(read('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx')).toContain('data-testid="decision-consequence-open-chronicle"');
    expect(read('src/ui/map/components/EventDecisionModal.tsx')).toContain('data-testid="event-decision-response"');
    expect(read('src/ui/map/components/EventDecisionModal.tsx')).toContain('data-event-id={decision.event_id}');
    expect(read('src/ui/map/components/EventDecisionModal.tsx')).toContain('data-response-id={option.id}');
    expect(read('src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx')).toContain('data-testid="opportunity-ledger-record"');
    expect(read('src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx')).toContain('data-proposal-id={record.proposal_id}');
    expect(read('src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx')).toContain('data-status={record.status}');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-testid="chronicle-overlay"');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-testid="chronicle-close"');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-testid={`chronicle-filter-${filter.id}`}');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-testid="chronicle-dossier-entry"');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-testid="chronicle-open-record"');
    expect(read('src/ui/map/components/chronicle/ChronicleOverlay.tsx')).toContain('data-decision-record-id={entry.metadata?.decisionRecordId ?? undefined}');
    expect(read('src/ui/map/i18n/messages.en.ts')).toContain("'chronicle.openDecisionRecord': 'Open Decision Record'");
    expect(read('src/ui/map/components/PresidentialInbox.tsx')).toContain('data-testid="presidential-inbox"');
    expect(read('src/ui/map/components/PresidentialInbox.tsx')).toContain('data-testid="presidential-inbox-card"');
    expect(read('src/ui/map/components/PresidentialInbox.tsx')).toContain("onAction('decision_room', 'opening-brief:desk')");
    expect(read('src/ui/map/components/PresidentialInbox.tsx')).toContain('data-inbox-action={item.action}');
    expect(read('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx')).toContain('data-testid="president-desk-shell"');
    expect(read('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx')).toContain('data-testid="desk-action-records"');
    expect(read('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx')).toContain('data-testid="army-hq-corps-card"');
    expect(read('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx')).toContain('data-testid="army-hq-corps-card-detail"');
    expect(read('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx')).toContain('data-commander-source={data.commanderDisplay?.source ?? \'none\'}');
    expect(read('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx')).toContain('data-testid="army-hq-opening-command-provenance"');
    expect(read('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx')).toContain("t('commanderDisplay.openingCommand')");
    expect(read('src/ui/map/components/army_hq/PersonnelContent.tsx')).toContain('data-testid="personnel-orbat-brigade-link"');
    expect(read('src/ui/map/components/army_hq/PersonnelContent.tsx')).toContain('data-command-id={command.id}');
    expect(read('src/ui/map/components/army_hq/PersonnelContent.tsx')).toContain('data-command-kind={command.kind}');
    expect(read('src/ui/map/components/army_hq/PersonnelContent.tsx')).toContain('data-formation-id={b.id}');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-testid="army-hq-sector-row"');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-testid="army-hq-sector-frontage"');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-testid="army-hq-sector-inspect"');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-sector-id={sector.sector_id}');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-corps-id={corpsId}');
    expect(read('src/ui/map/components/army_hq/SectorsSection.tsx')).toContain('data-front-segments={sector.length_edges}');
    expect(read('src/ui/map/components/army_hq/OrbatSection.tsx')).toContain('data-testid="army-hq-formation-inspect"');
    expect(read('src/ui/map/components/army_hq/OrbatSection.tsx')).toContain('data-formation-id={b.id}');
    expect(read('src/ui/map/components/army_hq/OrbatSection.tsx')).toContain('data-corps-id={corpsId}');
    expect(read('src/ui/map/components/AARPanel.tsx')).toContain('data-testid="aar-battle-row"');
    expect(read('src/ui/map/components/AARPanel.tsx')).toContain('data-testid="aar-formation-link"');
  });
});

describe('browser QA CI wiring contract', () => {
  it('runs first-hour and live-surface browser gates in the required full-suite job', () => {
    const workflow = read('.github/workflows/full-suite-and-fingerprint.yml');

    const fullSuiteJobStart = workflow.indexOf('  full-suite:');
    const structuralFingerprintStart = workflow.indexOf('  structural-fingerprint:');
    const fullSuiteJob = workflow.slice(fullSuiteJobStart, structuralFingerprintStart);
    expect(fullSuiteJob).toContain('lfs: true');
    expect(workflow).toContain('name: First-hour browser gate');
    expect(workflow).toContain('run: npm run qa:first-hour:browser');
    expect(workflow).toContain('name: Live surface browser gate');
    expect(workflow).toContain('run: npm run qa:live-surface:browser');
    expect(workflow).toContain('name: Install Puppeteer Chrome for browser gates');
    expect(workflow).toContain('run: npx puppeteer browsers install chrome');

    const fullSuiteStart = workflow.indexOf('name: Full vitest suite');
    const chromeInstallStart = workflow.indexOf('name: Install Puppeteer Chrome for browser gates');
    const firstHourStart = workflow.indexOf('name: First-hour browser gate');
    const liveSurfaceStart = workflow.indexOf('name: Live surface browser gate');
    const skippedStart = workflow.indexOf('name: No relevant changes');
    expect(chromeInstallStart).toBeGreaterThan(fullSuiteStart);
    expect(firstHourStart).toBeGreaterThan(chromeInstallStart);
    expect(liveSurfaceStart).toBeGreaterThan(firstHourStart);
    expect(skippedStart).toBeGreaterThan(liveSurfaceStart);

    const chromeInstallBlock = workflow.slice(chromeInstallStart, firstHourStart);
    const firstHourBlock = workflow.slice(firstHourStart, liveSurfaceStart);
    const liveSurfaceBlock = workflow.slice(liveSurfaceStart, skippedStart);
    expect(chromeInstallBlock).toContain("if: steps.changes.outputs.relevant == 'true'");
    expect(firstHourBlock).toContain("if: steps.changes.outputs.relevant == 'true'");
    expect(liveSurfaceBlock).toContain("if: steps.changes.outputs.relevant == 'true'");
  });
});
