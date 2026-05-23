import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('formation spawn directive narrowing', () => {
    it('does not re-read active formation spawn directives through non-null assertions', () => {
        const earlyWarPhases = readFileSync(resolve('src/sim/turn_phases/early_war_phases.ts'), 'utf8');
        const browserRunner = readFileSync(resolve('src/sim/run_early_war_browser.ts'), 'utf8');

        expect(earlyWarPhases).not.toContain('formation_spawn_directive!');
        expect(browserRunner).not.toContain('formation_spawn_directive!');
    });
});
