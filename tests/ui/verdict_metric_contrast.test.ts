import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// R8 dry run (RBiH, Verdict): the Focus / Outcome / Cost Signal values drew in the tone accent on
// the metric card, and the catastrophic accent read 3.6:1, under the 4.5:1 floor for 19px text.
const source = readFileSync(join(__dirname, '../../src/ui/map/components/verdict/CinematicVerdict.tsx'), 'utf8');

function luminance(hex: string): number {
    const channel = (offset: number) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(foreground: string, background: string): number {
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

describe('Verdict metric colour contrast', () => {
    it('keeps every tone accent at 4.5:1 or better on the metric card', () => {
        const card = /bg-\[(#[0-9a-fA-F]{6})\] px-4 py-3/.exec(source)?.[1];
        expect(card).toBeTruthy();
        const block = /const TONE_ACCENT[^{]*\{([^}]*)\}/.exec(source)?.[1] ?? '';
        const accents = [...block.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)].map((match) => ({ tone: match[1], hex: match[2] }));
        expect(accents.map((entry) => entry.tone).sort()).toEqual(['catastrophic', 'early_peace', 'pyrrhic', 'somber']);
        for (const { tone, hex } of accents) {
            expect(contrast(hex, card as string), `${tone} ${hex} on ${card}`).toBeGreaterThanOrEqual(4.5);
        }
    });
});
