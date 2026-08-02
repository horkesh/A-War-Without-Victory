import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    LOCALIZATION_EVIDENCE_SURFACES,
    LOCALIZATION_EVIDENCE_VIEWPORTS,
    buildLocalizationJourneyCases,
} from '../../tools/ui/localization_viewport_contract.js';

describe('R7 locale surface evidence contract', () => {
    function collectSources(directory: string, filePattern: RegExp): string[] {
        return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) return collectSources(path, filePattern);
            return filePattern.test(entry.name) ? [path.replace(/\\/g, '/')] : [];
        });
    }

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
        expect(liveHarness).toMatch(/\[data-testid="main-menu-faction-RBiH"\]/);
        expect(liveHarness).toMatch(/\[data-testid="war-start-splash-acknowledge"\]/);
        expect(liveHarness).toMatch(/\[data-testid="peace-war-briefing-begin"\]/);
        expect(liveHarness).toMatch(/\[data-testid="presidential-inbox-opening-brief-open-desk"\]/);
        expect(liveHarness).toMatch(/\[data-testid="event-decision-response"\]\[data-response-id="civic"\]/);
        expect(liveHarness).not.toMatch(/waitForVisibleText\(page, 'A WAR WITHOUT VICTORY'\)/);
        expect(liveHarness).not.toMatch(/clickByText\(page, 'Republic of Bosnia and Herzegovina'\)/);
        expect(liveHarness).not.toMatch(/waitForVisibleText\(page, 'WAR HAS STARTED'\)/);
        expect(liveHarness).not.toMatch(/await (?:waitForVisibleText|clickByText|clickFirstMatchingText)\(page/);
        expect(liveHarness).toContain('[data-testid="desk-consequence-strip"][data-has-filed-record="false"]');
    });

    it('routes the named player-facing core number surfaces through the locale helper', () => {
        const files = [
            'src/ui/map/components/AARPanel.tsx',
            'src/ui/map/components/BrigadeRow.tsx',
            'src/ui/map/components/SettlementDetailContent.tsx',
            'src/ui/map/components/VerdictScreen.tsx',
            'src/ui/map/components/OperationHistoryPanel.tsx',
            'src/ui/map/components/army_hq/OperationsSection.tsx',
        ];
        for (const file of files) {
            const source = readFileSync(file, 'utf8');
            expect(source, file).toContain('formatLocalizedNumber');
            expect(source, file).not.toMatch(/\.toLocaleString\(\)/);
        }
    });

    it('keeps the legacy bcs setter out of ordinary tests', () => {
        const legacySetter = /setLocale\s*\(\s*['"]bcs['"](?:\s*,|\s*\))/;
        const legacySetterOwners = collectSources('tests', /\.test\.tsx?$/)
            .filter((file) => legacySetter.test(readFileSync(file, 'utf8')));

        expect(legacySetterOwners).toEqual(['tests/ui_i18n.test.ts']);
        const compatibilitySource = readFileSync('tests/ui_i18n.test.ts', 'utf8');
        expect(compatibilitySource.match(/setLocale\s*\(\s*['"]bcs['"]/g)).toHaveLength(1);
    });

    it('pins the exact locale-formatting source census', () => {
        const files = collectSources('src/ui/map', /\.tsx?$/);
        expect(files.length).toBeGreaterThan(0);
        const sources = files.map((file) => readFileSync(file, 'utf8'));
        const count = (pattern: RegExp) => sources.reduce(
            (total, source) => total + (source.match(pattern)?.length ?? 0),
            0,
        );

        expect(count(/\.toLocaleString\(\)/g)).toBe(47);
        expect(count(/\.toLocaleString\((?!\))/g) + count(/Intl\.NumberFormat\(/g)).toBe(20);
        expect(count(/formatLocalizedNumber\(/g)).toBe(51);
    });
});
