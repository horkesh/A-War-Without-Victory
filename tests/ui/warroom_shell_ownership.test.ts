import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { shouldShowWarroomReturn } from '../../src/ui/map/utils/warroomReturn.js';
import { regionToShellHandoff } from '../../src/ui/map/components/warroom/WarroomShellLayer.js';

function read(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('GUI audit Batch F Warroom shell ownership', () => {
    it('does not mount tactical chrome while the Warroom shell owns the screen', () => {
        const app = read('src/ui/map/App.tsx');

        expect(app).toContain("{appScreen === 'game' && shouldRenderMapModeLegend(railState.panel) && <MapModeLegend />}");
        expect(app).toMatch(/<CampaignTacticalViewportOwner[\s\S]*active=\{appScreen === 'game'\}[\s\S]*onInteractionReadyChange=\{setTacticalMapReadiness\}/);
        expect(app).toMatch(/loadedGameState !== null && appScreen !== 'mainMenu'/);
        expect(app).toContain("{appScreen === 'game' && (");
        expect(app).toContain('<BottomStatusStrip eventCatalog={eventCatalogFull} />');
    });

    it('offers Warroom return for browser Warroom-launched Army HQ sessions', () => {
        expect(shouldShowWarroomReturn('?view=warroom', false)).toBe(true);
        expect(shouldShowWarroomReturn('?embedded=1', false)).toBe(true);
        expect(shouldShowWarroomReturn('', true)).toBe(true);
        expect(shouldShowWarroomReturn('', false)).toBe(false);
    });

    it('keeps one explicit Army HQ close control while retaining Desk, Field, and Warroom exits', () => {
        const modal = read('src/ui/map/components/army_hq/ArmyHQModal.tsx');
        const closeLabels = modal.match(/aria-label=\{t\('armyHq\.close'\)\}/g) ?? [];

        expect(closeLabels).toHaveLength(1);
        expect(modal).toContain("aria-label={t('armyHq.dismissBackdrop')}");
        expect(modal).toContain('onReturnToDesk');
        expect(modal).toContain('data-testid="army-hq-desk-return"');
        expect(modal).toContain("t('armyHq.returnDesk')");
        expect(modal).toContain('FIELD');
        expect(modal).toContain('WARROOM');
        expect(modal).toContain('shouldShowWarroomReturn');
        expect(read('src/ui/map/App.tsx')).toContain('onReturnToDesk={openWarroomDeskFromField}');
    });

    it('keeps the Decision Room as one flat card archive instead of lane projections', () => {
        const source = read('src/ui/map/data/presidentialDecisionRoom.ts');

        expect(source).not.toContain('dedupeCommandQuestionHeadlines');
        expect(source).not.toContain('commandQuestions');
        expect(source).not.toContain('loopSteps');
        expect(source).toContain('cards: PresidentialDecisionRoomCard[]');
        expect(source).toContain('lenses: PresidentialDecisionRoomLens[]');
    });

    it('routes the Warroom diplomacy telephone through the Warroom overlay dispatcher', () => {
        expect(regionToShellHandoff('diplomatic_telephone')).toEqual({ kind: 'warroom-overlay', surface: 'diplomacy' });
    });

    it('routes Intelligence and Faction through native Warroom preview overlays while Army HQ opens directly', () => {
        expect(regionToShellHandoff('intelligence_journal')).toEqual({ kind: 'warroom-overlay', surface: 'intelligence' });
        expect(regionToShellHandoff('desk_radio')).toEqual({ kind: 'warroom-overlay', surface: 'intelligence' });
        expect(regionToShellHandoff('commander_coatrack')).toEqual({ kind: 'army-hq', tab: 'summary' });
        expect(regionToShellHandoff('wall_flag_area')).toEqual({ kind: 'warroom-overlay', surface: 'faction' });
    });

    it('keeps unknown Warroom hotspots as a no-op instead of leaving the room', () => {
        const app = read('src/ui/map/App.tsx');
        const navigateStart = app.indexOf('onNavigate={(command) => {');
        const navigateEnd = app.indexOf('\n            }}', navigateStart);

        expect(regionToShellHandoff('unknown_region')).toBeUndefined();
        expect(navigateStart).toBeGreaterThanOrEqual(0);
        expect(navigateEnd).toBeGreaterThan(navigateStart);
        expect(app.slice(navigateStart, navigateEnd)).toContain('if (!command) return;');
    });

    it('documents Warroom map hotspots separately from unknown no-op regions', () => {
        const source = read('src/ui/map/components/warroom/WarroomShellLayer.tsx');

        expect(source).toContain('War Map regions use an explicit local command; unknown regions are a no-op.');
        expect(source).not.toContain('intentionally navigate to the game view');
    });

    it('keeps event decisions as the exclusive presidential modal owner', () => {
        const app = read('src/ui/map/App.tsx');

        expect(app).toMatch(/const openWarroomDecisionRoomFromField =[\s\S]*if \(activeEventDecisionId !== null\) return false;/);
        expect(app).toMatch(/const openWarroomDecisionRoomFromField =[\s\S]*setWarroomDecisionRoomOpen\(true\);[\s\S]*return true;/);
        expect(app).toMatch(/const openWarroomDeskFromField = \(\) => \{[\s\S]*if \(activeEventDecisionId !== null\) return;/);
        expect(app).toMatch(/const openCommandCategory = \(\) => \{[\s\S]*if \(activeEventDecisionId !== null\) return;/);
        expect(app).toMatch(/const openWarroomOverlay = \(surface: WarroomOverlaySurface\) => \{[\s\S]*if \(activeEventDecisionId !== null\) return;/);
    });

    it('retires live StrategicDashboard and flat EventLog local command variants', () => {
        const navigation = read('src/ui/map/utils/warroomNavigation.ts');
        const app = read('src/ui/map/App.tsx');
        const englishMessages = read('src/ui/map/i18n/messages.en.ts');
        const bcsMessages = read('src/ui/map/i18n/messages.bcs.ts');

        expect(navigation).not.toContain("kind: 'strategic-overview'");
        expect(navigation).not.toContain("kind: 'event-log'");
        expect(app).not.toContain("command.kind === 'strategic-overview'");
        expect(app).not.toContain("command.kind === 'event-log'");
        expect(englishMessages).not.toContain('openStrategicDashboard');
        expect(bcsMessages).not.toContain('openStrategicDashboard');
    });

    it('keeps native Warroom overlay drill-ins on existing owner surfaces', () => {
        const app = read('src/ui/map/App.tsx');
        const drillInStart = app.indexOf('const openNativeWarroomOverlayDrillIn =');
        const drillInEnd = app.indexOf('\n  const openCommandStrip =', drillInStart);
        const overlayStateStart = app.indexOf('const [warroomOverlaySurface');

        expect(drillInStart).toBeGreaterThanOrEqual(0);
        expect(drillInEnd).toBeGreaterThan(drillInStart);
        expect(overlayStateStart).toBeGreaterThanOrEqual(0);

        const drillIn = app.slice(drillInStart, drillInEnd);
        const overlayState = app.slice(overlayStateStart, app.indexOf('\n', overlayStateStart));

        expect(overlayState).toContain('useState<NativeWarroomOverlaySurface | null>');
        expect(drillIn).toContain("if (surface === 'staff')");
        expect(drillIn).toContain("openArmyHQTab(useGameStore.getState(), 'personnel')");
        expect(drillIn).toContain("if (surface === 'intelligence')");
        expect(drillIn).toContain("openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath')");
        expect(drillIn).toContain("openArmyHQTab(useGameStore.getState(), 'summary')");
        expect(drillIn).not.toContain("surface === 'diplomacy'");
        expect(drillIn).not.toContain("surface === 'chronicle'");
    });

    it('routes the turn-24 staff recommendation to the live Army HQ Briefing owner', () => {
        const app = read('src/ui/map/App.tsx');
        const handlerStart = app.indexOf('const handlePresidentialInboxAction =');
        const handlerEnd = app.indexOf('\n\n  const openInboxHome =', handlerStart);
        const handler = app.slice(handlerStart, handlerEnd);

        expect(handler).toContain("if (action === 'army_hq_briefing')");
        expect(handler).toContain("openArmyHQTab(gs, 'briefing')");
        expect(handler).toContain('leaveWarroomForGame()');
    });

    it('keeps Warroom Diplomacy dismissible through the Warroom Escape stack', () => {
        const app = read('src/ui/map/App.tsx');
        const effectStart = app.indexOf("if (appScreen !== 'warroom') return undefined;");
        const effectEnd = app.indexOf('\n\n  const openReservePanelFromDesk', effectStart);

        expect(effectStart).toBeGreaterThanOrEqual(0);
        expect(effectEnd).toBeGreaterThan(effectStart);

        const effect = app.slice(effectStart, effectEnd);
        expect(effect).toContain('if (diplomacyOpen) {');
        expect(effect).toContain('setDiplomacyOpen(false);');
        expect(effect).toContain('diplomacyOpen, warroomOverlaySurface');
    });

    it('clears Warroom-local overlays before leaving the Warroom for game-owned shells', () => {
        const app = read('src/ui/map/App.tsx');

        expect(app).toContain('const leaveWarroomForGame =');
        expect(app).toMatch(/const leaveWarroomForGame = \(\) => \{[\s\S]*setWarroomDeskOpen\(false\);[\s\S]*setWarroomDecisionRoomOpen\(false\);[\s\S]*setWarroomOverlaySurface\(null\);[\s\S]*closeCommandStrip\(false\);[\s\S]*setDiplomacyOpen\(false\);[\s\S]*setSummaryOpen\(false\);[\s\S]*setAppScreen\('game'\);[\s\S]*\};/);
        expect(app).toMatch(/if \(event\.data\?\.type === 'awwv-shell:show-warroom'\) \{[\s\S]*returnToWarroomShell\(\);[\s\S]*return;[\s\S]*\}/);
        expect(app).toMatch(/const applyShellCommand = \(command: ShellHandoffCommand\): boolean => applyShellHandoffCommand\(\{[\s\S]*\.\.\.useGameStore\.getState\(\),[\s\S]*advanceTurnNow: \(\) => advanceTurnAndSync\(\{[\s\S]*\.\.\.getTurnAftermathAdvanceDeps\(\),[\s\S]*\}, command\);/);
        expect(app).toMatch(/const handled = applyShellCommand\(command\);[\s\S]*if \(!handled\) return;[\s\S]*leaveWarroomForGame\(\);/);
        expect(app).toMatch(/applyShellCommand\(command\);[\s\S]*if \(!warroomCommandStaysInRoom\(command\)\) \{[\s\S]*leaveWarroomForGame\(\);[\s\S]*\}/);
        expect(app).not.toContain("onOpenMap={() => setAppScreen('game')}");
        expect(app).not.toContain("onOpenDesk={() => setAppScreen('warroom')}");
    });

    it('clears tactical inspection overlays before opening Desk or Decision Room from the field', () => {
        const app = read('src/ui/map/App.tsx');
        const briefing = read('src/ui/map/components/CommandBriefingLayer.tsx');
        const helperStart = app.indexOf('const clearTacticalInspectionOverlays = () => {');
        const helperEnd = app.indexOf('\n  const openWarroomDecisionRoomFromField =', helperStart);
        const decisionStart = app.indexOf('const openWarroomDecisionRoomFromField =');
        const decisionEnd = app.indexOf('\n\n  const reviewPreAdvancePriorities', decisionStart);
        const deskStart = app.indexOf('const openWarroomDeskFromField = () => {');
        const deskEnd = app.indexOf('\n  const openCommandCategory =', deskStart);

        expect(helperStart).toBeGreaterThanOrEqual(0);
        expect(helperEnd).toBeGreaterThan(helperStart);
        expect(decisionStart).toBeGreaterThanOrEqual(0);
        expect(decisionEnd).toBeGreaterThan(decisionStart);
        expect(deskStart).toBeGreaterThanOrEqual(0);
        expect(deskEnd).toBeGreaterThan(deskStart);

        const helper = app.slice(helperStart, helperEnd);
        expect(helper).toContain('gs.setSelectedFormationId(null);');
        expect(helper).toContain('gs.setExpandedStackOsid(null);');
        expect(helper).toContain('gs.clearTooltipTarget();');
        expect(helper).toContain('setTurnAftermathOpen(false);');
        expect(helper).toContain('suppressCommandBriefingForCurrentTurn();');

        expect(app.slice(decisionStart, decisionEnd)).toContain('clearTacticalInspectionOverlays();');
        expect(app.slice(deskStart, deskEnd)).toContain('clearTacticalInspectionOverlays();');
        expect(app).toContain('const [commandBriefingSuppressedTurn, setCommandBriefingSuppressedTurn]');
        expect(app).toContain('suppressedTurn={commandBriefingSuppressedTurn}');
        expect(briefing).toContain('suppressedTurn?: number | null;');
        expect(briefing).toContain('if (turn != null && suppressedTurn === turn) return null;');
    });

    it('clears stack expansion, tooltips, and aftermath when field toolbar routes away', () => {
        const toolbar = read('src/ui/map/components/PresidentialToolbar.tsx');
        const clearStart = toolbar.indexOf('const clearFieldPanels = useCallback(() => {');
        const clearEnd = toolbar.indexOf('\n\n    const handleOpenDesk', clearStart);

        expect(clearStart).toBeGreaterThanOrEqual(0);
        expect(clearEnd).toBeGreaterThan(clearStart);

        const clearFieldPanels = toolbar.slice(clearStart, clearEnd);
        expect(clearFieldPanels).toContain('gs.setExpandedStackOsid(null);');
        expect(clearFieldPanels).toContain('gs.clearTooltipTarget();');
        expect(clearFieldPanels).toContain('setTurnAftermathOpen(false);');
    });

    it('routes Warroom-hosted Decision Room non-local targets through the visible shell handoff path', () => {
        const app = read('src/ui/map/App.tsx');
        const hostStart = app.indexOf('{warroomDecisionRoomOpen && (');
        const hostEnd = app.indexOf('\n        </div>', hostStart);

        expect(hostStart).toBeGreaterThanOrEqual(0);
        expect(hostEnd).toBeGreaterThan(hostStart);

        const host = app.slice(hostStart, hostEnd);
        expect(host).toMatch(/<PresidentialDecisionRoomPanel[\s\S]*onNavigateTarget=\{reviewPreAdvanceTarget\}[\s\S]*onInspectFieldPlan=\{inspectFieldOperationPlanFromDossier\}[\s\S]*\/>/);
        expect(host).not.toContain('<PresidentialDecisionRoomPanel onNavigateTarget={openDecisionRoomTarget} />');
    });

    it('routes Warroom-hosted Decision Room chrome through i18n keys', () => {
        const app = read('src/ui/map/App.tsx');
        const hostStart = app.indexOf('{warroomDecisionRoomOpen && (');
        const hostEnd = app.indexOf('\n        </div>', hostStart);

        expect(hostStart).toBeGreaterThanOrEqual(0);
        expect(hostEnd).toBeGreaterThan(hostStart);

        const host = app.slice(hostStart, hostEnd);
        expect(host).toContain("{t('warroomDecisionRoom.host.aria')}");
        expect(host).toContain("{t('warroomDecisionRoom.host.eyebrow')}");
        expect(host).toContain("{t('warroomDecisionRoom.host.title')}");
        expect(host).toContain("{t('warroomDecisionRoom.host.closeAria')}");
        expect(host).toContain("{t('warroomDecisionRoom.host.close')}");
        expect(host).not.toContain('aria-label="Warroom Decision Room"');
        expect(host).not.toContain('>Command Surface</div>');
        expect(host).not.toContain('>Decision Room</h2>');
        expect(host).not.toContain('aria-label="Close Decision Room"');
        expect(host).not.toContain('>Close</button>');
    });

    it('keeps Desk-local Command Surface mutually exclusive with the Desk overlay', () => {
        const app = read('src/ui/map/App.tsx');
        const openCommandStripStart = app.indexOf('const openCommandStrip =');
        const openCommandStripEnd = app.indexOf('\n  const closeCommandStrip =', openCommandStripStart);

        expect(openCommandStripStart).toBeGreaterThanOrEqual(0);
        expect(openCommandStripEnd).toBeGreaterThan(openCommandStripStart);
        expect(app.slice(openCommandStripStart, openCommandStripEnd)).toContain('setWarroomDeskOpen(false);');
    });

    it('routes Authored Choices shortcuts to the Records archive spine', () => {
        const app = read('src/ui/map/App.tsx');

        expect(app).not.toContain('const openDecisionHistoryOverlay =');
        expect(app).not.toContain('DecisionHistoryOverlay');
        expect(app).toMatch(/e\.key === 'e'[\s\S]*openArmyHQRecordsSubTab\(useGameStore\.getState\(\), 'decisions'\)/);
        expect(app).toMatch(/e\.key === 'd'[\s\S]*openArmyHQRecordsSubTab\(useGameStore\.getState\(\), 'decisions'\)/);
        expect(app).toMatch(/<TacticalInputOwners[\s\S]*active=\{tacticalMapInteractionReady\}[\s\S]*onShellKeyDown=\{handleTacticalShellKeyDown\}/);
    });

    it('returns presidential inbox handoffs to the Desk owner instead of the map inbox rail', () => {
        const app = read('src/ui/map/App.tsx');
        const inboxStart = app.indexOf('const openInboxHome = () => {');
        const inboxEnd = app.indexOf('\n  useEffect(() => {', inboxStart);

        expect(inboxStart).toBeGreaterThanOrEqual(0);
        expect(inboxEnd).toBeGreaterThan(inboxStart);

        const inboxRoute = app.slice(inboxStart, inboxEnd);
        expect(inboxRoute).toContain('openWarroomDeskFromField();');
        expect(inboxRoute).toContain('setWarroomDecisionRoomOpen(false);');
        expect(inboxRoute).not.toContain("setAppScreen('game');");
        expect(inboxRoute).toContain('gs.setFocusedAftermathTurn(null);');
        expect(inboxRoute).toContain('gs.setFocusedOperationHistoryId(null);');
        expect(inboxRoute).toContain('gs.setFocusedDecisionConsequenceId(null);');
    });

    it('routes officer command-review inbox items to the Decision Room command card', () => {
        const app = read('src/ui/map/App.tsx');
        const handlerStart = app.indexOf('const handlePresidentialInboxAction =');
        const handlerEnd = app.indexOf('\n  const openInboxHome =', handlerStart);

        expect(handlerStart).toBeGreaterThanOrEqual(0);
        expect(handlerEnd).toBeGreaterThan(handlerStart);

        const handler = app.slice(handlerStart, handlerEnd);
        expect(handler).toContain("if (itemId.startsWith('opportunity:'))");
        expect(handler).toContain("openWarroomDecisionRoomFromField('opportunity', itemId);");
        expect(handler).toContain("if (itemId.startsWith('officer:'))");
        expect(handler).toContain("openWarroomDecisionRoomFromField('command', 'pushback:player-army-co');");
        expect(handler).toContain("itemId === 'opening-brief:desk' || itemId === 'empty:desk' || itemId.startsWith('sit:')");
        expect(handler).toContain('openWarroomDeskFromField();');
        expect(handler).toContain("openWarroomDecisionRoomFromField('all', itemId);");
        expect(handler.indexOf("if (itemId.startsWith('opportunity:'))")).toBeLessThan(
            handler.indexOf("if (itemId.startsWith('officer:'))"),
        );
    });

    it('routes the Warroom Chronicle hotspot to ChronicleOverlay instead of Authored Choices', () => {
        const app = read('src/ui/map/App.tsx');
        const routeStart = app.indexOf("if (surface === 'chronicle') {");
        const routeEnd = app.indexOf('\n    setWarroomDeskOpen(false);', routeStart);

        expect(routeStart).toBeGreaterThanOrEqual(0);
        expect(routeEnd).toBeGreaterThan(routeStart);

        const chronicleRoute = app.slice(routeStart, routeEnd);
        expect(chronicleRoute).toContain('openChronicle(useGameStore.getState())');
        expect(chronicleRoute).not.toContain('setIsDecisionHistoryOpen');
    });
});
