import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const TARGETS = [
    'src/ui/map/components/OperationBriefingModal.tsx',
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
});
