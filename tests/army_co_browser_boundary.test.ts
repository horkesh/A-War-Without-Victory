import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
    return readFileSync(resolve(path), 'utf8');
}

describe('Army CO browser module boundary', () => {
    it('keeps Node-only roster loading out of renderer-reachable simulation modules', () => {
        const browserArmyModules = [
            'src/sim/combat/army_co_lifecycle.ts',
            'src/sim/combat/army_co_roster_data.ts',
        ];
        const rendererReachable = [
            ...browserArmyModules,
            'src/sim/combat/officer_system.ts',
            'src/sim/turn_phases/war_phases.ts',
        ];

        for (const path of rendererReachable) {
            const contents = source(path);
            expect(contents, path).not.toMatch(/from\s+['"]node:/);
            expect(contents, path).not.toMatch(/from\s+['"](?:node:)?(?:fs|path)['"]/);
            expect(contents, path).not.toMatch(/require\(\s*['"](?:node:)?(?:fs|path)['"]\s*\)/);
            expect(contents, path).not.toMatch(
                /from\s+['"][^'"]*army_co_roster_loader(?:\.js)?['"]/
            );
        }

        for (const path of browserArmyModules) {
            expect(source(path), path).not.toMatch(/\bprocess\s*\./);
        }
    });

    it('keeps filesystem access isolated in the Node-only loader', () => {
        const loader = source('src/sim/combat/army_co_roster_loader.ts');
        expect(loader).toContain("from 'node:fs'");
        expect(loader).toContain("from 'node:path'");
    });
});
