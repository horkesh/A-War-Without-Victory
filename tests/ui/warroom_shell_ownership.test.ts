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

        expect(app).toContain("{appScreen === 'game' && <MapModeLegend />}");
        expect(app).toContain("{appScreen === 'game' && <Minimap />}");
        expect(app).toContain("{appScreen === 'game' && (");
        expect(app).toContain('<BottomStatusStrip eventCatalog={eventCatalogFull} />');
    });

    it('offers Warroom return for browser Warroom-launched Army HQ sessions', () => {
        expect(shouldShowWarroomReturn('?view=warroom', false)).toBe(true);
        expect(shouldShowWarroomReturn('?embedded=1', false)).toBe(true);
        expect(shouldShowWarroomReturn('', true)).toBe(true);
        expect(shouldShowWarroomReturn('', false)).toBe(false);
    });

    it('keeps one explicit Army HQ close control while retaining Field and Warroom exits', () => {
        const modal = read('src/ui/map/components/army_hq/ArmyHQModal.tsx');
        const closeLabels = modal.match(/aria-label=\{t\('armyHq\.close'\)\}/g) ?? [];

        expect(closeLabels).toHaveLength(1);
        expect(modal).toContain("aria-label={t('armyHq.dismissBackdrop')}");
        expect(modal).toContain('FIELD');
        expect(modal).toContain('WARROOM');
        expect(modal).toContain('shouldShowWarroomReturn');
    });

    it('deduplicates repeated Decision Room lane headlines', () => {
        const source = read('src/ui/map/data/presidentialDecisionRoom.ts');

        expect(source).toContain('dedupeCommandQuestionHeadlines');
        expect(source).toContain('seenHeadlines');
    });

    it('routes the Warroom diplomacy telephone through the Warroom overlay dispatcher', () => {
        expect(regionToShellHandoff('diplomatic_telephone')).toEqual({ kind: 'warroom-overlay', surface: 'diplomacy' });
    });

    it('routes Intelligence, Staff, and Faction through native Warroom preview overlays', () => {
        expect(regionToShellHandoff('intelligence_journal')).toEqual({ kind: 'warroom-overlay', surface: 'intelligence' });
        expect(regionToShellHandoff('desk_radio')).toEqual({ kind: 'warroom-overlay', surface: 'intelligence' });
        expect(regionToShellHandoff('commander_coatrack')).toEqual({ kind: 'warroom-overlay', surface: 'staff' });
        expect(regionToShellHandoff('wall_flag_area')).toEqual({ kind: 'warroom-overlay', surface: 'faction' });
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
        expect(drillIn).toContain("openArmyHQRecordsSubTab(useGameStore.getState(), 'aar')");
        expect(drillIn).toContain("openArmyHQTab(useGameStore.getState(), 'summary')");
        expect(drillIn).not.toContain("surface === 'diplomacy'");
        expect(drillIn).not.toContain("surface === 'chronicle'");
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

    it('routes the Warroom Chronicle hotspot to ChronicleOverlay instead of Authored Choices', () => {
        const app = read('src/ui/map/App.tsx');
        const routeStart = app.indexOf("if (surface === 'chronicle') {");
        const routeEnd = app.indexOf('\n    setWarroomDeskOpen(false);', routeStart);

        expect(routeStart).toBeGreaterThanOrEqual(0);
        expect(routeEnd).toBeGreaterThan(routeStart);

        const chronicleRoute = app.slice(routeStart, routeEnd);
        expect(chronicleRoute).toContain('openChronicle(useGameStore.getState())');
        expect(chronicleRoute).toContain('setIsDecisionHistoryOpen(false)');
        expect(chronicleRoute).not.toContain('setIsDecisionHistoryOpen(true)');
    });
});
