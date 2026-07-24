import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('scenario runner report truth', () => {
    it('emits the early-war persistence note only before any war week has completed', () => {
        const source = readFileSync(resolve('src/scenario/scenario_runner.ts'), 'utf8');
        expect(source).toContain("state.meta.phase === 'war' && attackResolutionSummary.weeks_at_war === 0");
    });
});
