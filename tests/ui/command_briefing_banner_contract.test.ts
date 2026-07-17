import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('GUI audit Batch H command briefing banner contract', () => {
    it('mounts Command Briefing only through the shared base-inbox ownership policy', () => {
        const source = readFileSync('src/ui/map/App.tsx', 'utf8');

        expect(source).toContain('shouldRenderCommandBriefing');
        expect(source).toContain('const commandBriefingVisible = shouldRenderCommandBriefing({');
        expect(source).toContain('panel: railState.panel');
        expect(source).toContain('recruitmentOpen,');
        expect(source).toContain('autonomyOpen,');
        expect(source).toContain('const onboardingOverlayOpen =');
        expect(source).toContain('onboardingOverlayOpen ||');
        expect(source).toContain('fullOverlayOpen: commandBriefingFullOverlayOpen');
        expect(source).toContain('{commandBriefingVisible && (');
    });

    it('centers the command briefing below the army crest without entering side rails', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('data-testid="command-briefing-banner"');
        expect(source).toContain('left-1/2');
        expect(source).toContain('-translate-x-1/2');
        expect(source).toContain('w-[min(34rem,calc(100vw-48rem))]');
        expect(source).toContain('max-[1100px]:w-[min(34rem,calc(100vw-2rem))]');
        expect(source).not.toContain('md:right-5');
        expect(source).not.toContain('md:left-auto');
        expect(source).not.toContain('left-[19rem] right-4');
    });

    it('uses opaque high-contrast backing and headline text', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('bg-red-950/95');
        expect(source).toContain('bg-panel-bg/95');
        expect(source).toContain('text-text-primary');
        expect(source).toContain('{visibleItems.length}');
        expect(source).toContain('text-xs font-mono font-semibold text-text-primary');
        expect(source).toContain('text-xs font-mono font-bold uppercase tracking-wider');
        expect(source).toContain('isCommandBriefingItemCurrent');
        expect(source).toContain('visibleItems');
        expect(source).toContain('{visibleItems.map((item) => {');
        expect(source).not.toContain('bg-red-950/30');
        expect(source).not.toContain('text-text-secondary');
        expect(source).not.toContain('text-[10px] font-mono font-semibold text-text-primary');
        expect(source).not.toContain('text-[8px] font-mono font-bold uppercase tracking-wider');
        expect(source).not.toContain('{commandBriefing.items.map((item) => {');
    });

    it('defaults to a compact non-blocking summary and expands only on request', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('const [expanded, setExpanded] = useState(false)');
        expect(source).toContain('data-testid="command-briefing-toggle"');
        expect(source).toContain('data-testid="command-briefing-dismiss"');
        expect(source).toContain('{expanded && (');
        expect(source).toContain('setExpanded(false)');
    });

    it('routes command targets through shell navigation helpers instead of stale selected-army state', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

        expect(source).toContain('inspectOnField');
        expect(source).toContain('openArmyHQBriefingForCorps');
        expect(source).toContain('setIsOperationsPanelOpen(true)');
        expect(source).toContain("item.briefingCategory === 'active_operations'");
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
