import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('GUI audit Batch H command briefing banner contract', () => {
    it('keeps the command briefing banner out of the top-center counter field', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('data-testid="command-briefing-banner"');
        expect(source).toContain('md:left-auto');
        expect(source).toContain('w-[min(32rem,calc(100vw-22rem))]');
        expect(source).not.toContain('left-[19rem] right-4');
    });

    it('uses opaque high-contrast backing and headline text', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('bg-red-950/95');
        expect(source).toContain('bg-panel-bg/95');
        expect(source).toContain('text-text-primary');
        expect(source).not.toContain('bg-red-950/30');
        expect(source).not.toContain('text-text-secondary');
    });

    it('routes command targets through shell navigation helpers instead of stale selected-army state', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('inspectOnField');
        expect(source).toContain('openArmyHQBriefingForCorps');
        expect(source).toContain("openArmyHQTab(useGameStore.getState(), 'summary')");
        expect(source).toContain("openArmyHQTab(useGameStore.getState(), officerTargetTab(item.target.officerFocus))");
        expect(source).toContain("kind: 'field-operation'");
        expect(source).toContain("kind: 'field-sector'");
        expect(source).toContain("kind: 'field-settlement'");
        expect(source).not.toContain('setSelectedArmyId');
        expect(source).not.toContain('setSelectedOperationKey');
        expect(source).not.toContain('setSelectedCorpsFrontSectorId');
        expect(source).not.toContain('setSelectedOsid');
    });
});
