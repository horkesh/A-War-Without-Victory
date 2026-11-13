import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const TARGETS = [
    'src/ui/map/components/CommanderSelectionModal.tsx',
];

const LIGHT_THEME_CLASS_RE = /\b(?:bg-white|bg-neutral-(?:50|100|200)|bg-(?:amber|blue|green|red)-(?:50|100)|hover:bg-(?:amber|neutral|green|red)-(?:50|100|200|300)|border-neutral-(?:200|300|400)|border-(?:amber|blue|red)-200|text-neutral-(?:800|900|950)|text-(?:amber|blue|red)-(?:800|900))\b/;

describe('GUI audit Batch D modal palette unification', () => {
    it.each(TARGETS)('%s uses the dark panel token palette, not the old light command-card palette', (path) => {
        const source = readFileSync(path, 'utf8');

        expect(source).toContain('bg-panel-bg');
        expect(source).toContain('bg-panel-card');
        expect(source).toContain('border-panel-border');
        expect(source).toContain('text-text-primary');
        expect(source).not.toMatch(LIGHT_THEME_CLASS_RE);
    });

    // Player-surface review step 3 (2026-11-12): the operation briefing moved from the
    // panel tokens to the shared Command Surface modal panel and parts.
    it('OperationBriefingModal uses the Command Surface modal panel, not the old light palette', () => {
        const source = readFileSync('src/ui/map/components/OperationBriefingModal.tsx', 'utf8');

        expect(source).toContain('panelClassName={SURFACE_MODAL_PANEL_MEDIUM}');
        expect(source).toContain('backdropClassName={SURFACE_MODAL_BACKDROP}');
        expect(source).toContain('<SurfaceHeader');
        expect(source).toContain('<SurfaceModalFooter');
        expect(source).not.toMatch(LIGHT_THEME_CLASS_RE);
        expect(source).not.toMatch(/text-(?:neutral|amber|red|green)-[67]00\b/);
        expect(source).not.toMatch(/\btext-xs\b|backdrop-blur|amber-400/);
    });
});
