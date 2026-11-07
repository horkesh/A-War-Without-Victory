import { readFileSync } from 'node:fs';
import { parse } from 'postcss';

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

    it('centers the non-blocking briefing in the logical viewport with a shared narrow-container fallback', () => {
        const source = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');
        const css = parse(readFileSync('src/ui/map/styles/globals.css', 'utf8'));
        const placement = source.match(/className=\{`(command-briefing-layer[^`]+)`\}/)?.[1] ?? '';
        const classes = placement.split(/\s+/);

        expect(source).toContain('data-testid="command-briefing-banner"');
        expect(classes).toEqual(expect.arrayContaining([
            'command-briefing-layer', 'fixed', '${topOffset}', 'left-1/2',
            '-translate-x-1/2', 'pointer-events-none',
        ]));
        expect(source).toContain("devMode ? 'top-[8.5rem]' : 'top-[7.5rem]'");
        expect(source).toContain('className={`pointer-events-auto relative');
        expect(classes).toContain('w-[min(34rem,calc(var(--interface-viewport-width,100vw)-48rem))]');
        expect(classes).toContain('max-[1100px]:w-[min(34rem,calc(var(--interface-viewport-width,100vw)-2rem))]');

        const container: Record<string, string> = {};
        css.walkRules('.interface-scale-layer', rule => {
            rule.walkDecls(declaration => { container[declaration.prop] = declaration.value; });
        });
        expect(container['container-type']).toBe('inline-size');
        expect(container['container-name']).toBe('interface-viewport');
        let narrowWidth = '';
        css.walkAtRules('container', rule => {
            if (rule.params.replace(/\s+/g, '') !== `${container['container-name']}(max-width:1100px)`) return;
            rule.walkRules('.command-briefing-layer', banner => {
                banner.walkDecls('width', declaration => { narrowWidth = declaration.value.replace(/\s+/g, ''); });
            });
        });
        expect(narrowWidth).toBe('min(34rem,calc(var(--interface-viewport-width)-2rem))');
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
