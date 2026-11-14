import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// R8 dry run (RBiH, turn 187): the harness readability gate flagged the Dayton conference's
// "Round 1/2/3" marks at 11.5px. The campaign floor for essential text is 12px (.75rem at the
// 16px root), and the conference stylesheets had six rules under it.
const FLOOR_REM = 0.75;
const dir = join(__dirname, '../src/ui/map/dayton_conference');

describe('Dayton conference text floor', () => {
    it('declares no font-size under 12px (.75rem) in its stylesheets', () => {
        const sizes: Array<{ file: string; rem: number }> = [];
        for (const file of readdirSync(dir).filter((name) => name.endsWith('.css')).sort()) {
            const css = readFileSync(join(dir, file), 'utf8');
            for (const match of css.matchAll(/font-size:\s*([0-9]*\.?[0-9]+)(rem|px)/g)) {
                const value = Number(match[1]);
                sizes.push({ file, rem: match[2] === 'px' ? value / 16 : value });
            }
        }
        expect(sizes.length).toBeGreaterThan(10);
        const smallest = Math.min(...sizes.map((entry) => entry.rem));
        expect(smallest).toBeGreaterThanOrEqual(FLOOR_REM);
    });
});
