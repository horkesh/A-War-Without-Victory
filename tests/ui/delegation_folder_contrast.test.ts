import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPLIT_BAR_COLORS } from '../../src/ui/map/dayton_conference/DelegationFolder';

// R8 polish: the delegation folder's share bar carries white labels ("RBiH 32%") on faction colours.
// The board palette gave 4.31:1 and 4.36:1; the bar now uses slightly darker tones.
const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
};
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('delegation folder share bar', () => {
    it('keeps white share labels at 4.5:1 or better on every faction segment', () => {
        for (const [faction, color] of Object.entries(SPLIT_BAR_COLORS)) {
            expect(contrastWithWhite(color), faction).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('colours the bar segments from the bar palette, not the board palette', () => {
        const source = readFileSync(join(__dirname, '../../src/ui/map/dayton_conference/DelegationFolder.tsx'), 'utf8');
        expect(source).toContain('background: SPLIT_BAR_COLORS[f]');
    });
});
