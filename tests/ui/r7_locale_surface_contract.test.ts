import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
    LOCALIZATION_EVIDENCE_SURFACES,
    LOCALIZATION_EVIDENCE_VIEWPORTS,
    buildLocalizationJourneyCases,
} from '../../tools/ui/localization_viewport_contract.js';

describe('R7 locale surface evidence contract', () => {
    it('owns all required surfaces at all three deterministic viewport sizes', () => {
        expect(LOCALIZATION_EVIDENCE_SURFACES).toEqual([
            'Desk',
            'Decision Room',
            'Army HQ',
            'Map',
            'Records',
            'Codex',
            'Chronicle',
            'Endgame',
        ]);
        expect(LOCALIZATION_EVIDENCE_VIEWPORTS).toEqual([
            { width: 1366, height: 768 },
            { width: 1920, height: 1080 },
            { width: 3440, height: 1440 },
        ]);
        expect(buildLocalizationJourneyCases('qps')).toHaveLength(24);
        expect(buildLocalizationJourneyCases('qps')).toEqual(buildLocalizationJourneyCases('qps'));
    });

    it('keeps bcs out of canonical production locale comparisons', () => {
        const files = [
            'src/ui/map/components/GameOverModal.tsx',
            'src/ui/map/components/OperationsPanel.tsx',
            'src/ui/map/components/ParamilitaryReviewModal.tsx',
            'src/ui/map/components/codex/codexEssayResolver.ts',
            'src/ui/map/components/ops_modal/BrigadeCard.tsx',
            'src/ui/map/data/formationNameLocalizations.ts',
            'src/ui/map/data/ghostEntryProse.ts',
            'src/ui/map/data/inboxItems.ts',
            'src/ui/map/data/refugeeFlow.ts',
            'src/ui/map/utils/formatters.ts',
        ];
        for (const file of files) {
            const source = readFileSync(file, 'utf8');
            expect(source, file).not.toMatch(/locale\s*[!=]==?\s*['"]bcs['"]/);
        }
    });

    it('lets browser journeys select bs or non-persisted qps through the URL contract', () => {
        const main = readFileSync('src/ui/map/main.tsx', 'utf8');
        const liveHarness = readFileSync('tools/ui/live_surface_browser_sweep.cjs', 'utf8');

        expect(main).toMatch(/get\('locale'\)/);
        expect(main).toMatch(/setQaLocale\('qps'\)/);
        expect(main).toMatch(/requestedLocale === 'en'/);
        expect(main).toMatch(/setLocale\(requestedLocale/);
        expect(liveHarness).toMatch(/\['en', 'bs', 'bcs', 'qps'\]\.includes\(LOCALE\)/);
        expect(liveHarness).toMatch(/searchParams\.set\('locale', LOCALE\)/);
    });
});
