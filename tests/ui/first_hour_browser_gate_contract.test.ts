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
    expect(tool).toContain('rawFirstHourLabelsAbsent');
    expect(tool).toContain('rbih_state_identity');
    expect(tool).toContain('turn_fired');
    expect(tool).toContain('response_id');
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
    expect(tool).toContain('runOwnerJourneyDrilldown');
    expect(tool).toContain('ownerJourneyDrilldown');
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
    expect(read('src/ui/map/components/CodexPanel.tsx')).toContain('data-testid="codex-close"');
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
    expect(read('src/ui/map/components/FormationDetail.tsx')).toContain("kind: 'field-settlement'");
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain('data-testid={`records-subtab-${id}`}');
    expect(read('src/ui/map/components/army_hq/RecordsContent.tsx')).toContain("data-selected={subTab === id ? 'true' : 'false'}");
  });
});

describe('browser QA CI wiring contract', () => {
  it('runs first-hour and live-surface browser gates in the required full-suite job', () => {
    const workflow = read('.github/workflows/full-suite-and-fingerprint.yml');

    expect(workflow).toContain('name: First-hour browser gate');
    expect(workflow).toContain('run: npm run qa:first-hour:browser');
    expect(workflow).toContain('name: Live surface browser gate');
    expect(workflow).toContain('run: npm run qa:live-surface:browser');

    const fullSuiteStart = workflow.indexOf('name: Full vitest suite');
    const firstHourStart = workflow.indexOf('name: First-hour browser gate');
    const liveSurfaceStart = workflow.indexOf('name: Live surface browser gate');
    const skippedStart = workflow.indexOf('name: No relevant changes');
    expect(firstHourStart).toBeGreaterThan(fullSuiteStart);
    expect(liveSurfaceStart).toBeGreaterThan(firstHourStart);
    expect(skippedStart).toBeGreaterThan(liveSurfaceStart);

    const firstHourBlock = workflow.slice(firstHourStart, liveSurfaceStart);
    const liveSurfaceBlock = workflow.slice(liveSurfaceStart, skippedStart);
    expect(firstHourBlock).toContain("if: steps.changes.outputs.relevant == 'true'");
    expect(liveSurfaceBlock).toContain("if: steps.changes.outputs.relevant == 'true'");
  });
});
