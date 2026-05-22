import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { shouldShowWarroomReturn } from '../../src/ui/map/utils/warroomReturn.js';

function read(path: string): string {
    return readFileSync(path, 'utf8');
}

describe('GUI audit Batch F Warroom shell ownership', () => {
    it('does not mount tactical chrome while the Warroom shell owns the screen', () => {
        const app = read('src/ui/map/App.tsx');

        expect(app).toContain("{appScreen === 'game' && <MapModeLegend />}");
        expect(app).toContain("{appScreen === 'game' && <Minimap />}");
        expect(app).toContain("{appScreen === 'game' && (");
        expect(app).toContain('<BottomStatusStrip />');
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
});
