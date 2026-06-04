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

    it('routes the Warroom diplomacy telephone to a Warroom-native diplomacy overlay first', () => {
        expect(regionToShellHandoff('diplomatic_telephone')).toEqual({ kind: 'warroom-overlay', surface: 'diplomacy' });
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
});
