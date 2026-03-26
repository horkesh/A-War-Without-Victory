import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { GameState, MilitiaPoolState } from '../src/state/game_state.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_pool_integrity');

describe('pool/mobilization integrity (40w)', () => {
    let state: GameState;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
    }, 600_000); // 10 min timeout for 40w scenario

    it('each faction has at least one pool with positive total', () => {
        if (skipped) return;
        const pools = (state as any).military.militia_pools;
        expect(pools).toBeDefined();

        const factionTotals: Record<string, number> = {};
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            if (!p.faction) continue;
            const total = p.available + p.committed + p.exhausted;
            factionTotals[p.faction] = (factionTotals[p.faction] ?? 0) + total;
        }

        // All three factions should have mobilized something
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            expect(factionTotals[faction] ?? 0,
                `${faction} should have positive pool total`
            ).toBeGreaterThan(0);
        }
    });

    it('no pool has negative available, committed, or exhausted', () => {
        if (skipped) return;
        const pools = (state as any).military.militia_pools;
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            expect(p.available, `${key}.available`).toBeGreaterThanOrEqual(0);
            expect(p.committed, `${key}.committed`).toBeGreaterThanOrEqual(0);
            expect(p.exhausted, `${key}.exhausted`).toBeGreaterThanOrEqual(0);
        }
    });

    it('all pool numeric fields are integers', () => {
        if (skipped) return;
        const pools = (state as any).military.militia_pools;
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            expect(Number.isInteger(p.available), `${key}.available should be integer`).toBe(true);
            expect(Number.isInteger(p.committed), `${key}.committed should be integer`).toBe(true);
            expect(Number.isInteger(p.exhausted), `${key}.exhausted should be integer`).toBe(true);
        }
    });

    it('faction exhaustion values are within [0, 1]', () => {
        if (skipped) return;
        for (const faction of state.factions) {
            expect(faction.profile.exhaustion,
                `${faction.id} exhaustion`
            ).toBeGreaterThanOrEqual(0);
            expect(faction.profile.exhaustion,
                `${faction.id} exhaustion`
            ).toBeLessThanOrEqual(1);
        }
    });

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });
});
