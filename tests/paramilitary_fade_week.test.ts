import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PARAMILITARY_FADE_WEEK } from '../src/state/formation_constants.js';

describe('paramilitary fade week', () => {
    it('uses week 28 for the BB1 ARBiH absorption midpoint', () => {
        expect(PARAMILITARY_FADE_WEEK).toBe(28);

        const source = readFileSync(resolve(process.cwd(), 'src/state/formation_constants.ts'), 'utf8');
        expect(source).toContain('BB1 p.166-168');
    });
});
