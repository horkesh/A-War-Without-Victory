import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_4W = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_roundtrip');

async function cleanup(dir: string) {
    if (existsSync(dir)) await rm(dir, { recursive: true });
}

describe('scenario round-trip', () => {
    it('4w scenario run produces final_save.json with expected properties', async () => {
        await cleanup(OUT_DIR);
        const result = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_DIR });

        const finalJson = await readFile(result.paths.final_save, 'utf8');
        const state = JSON.parse(finalJson);

        // Meta
        expect(state.meta).toBeDefined();
        expect(state.meta.turn).toBe(4);
        expect(state.meta.phase).toBe('war');
        expect(typeof state.meta.seed).toBe('string');

        // Factions
        expect(state.factions).toBeInstanceOf(Array);
        expect(state.factions.length).toBeGreaterThanOrEqual(3);
        const factionIds = state.factions.map((f: any) => f.id);
        expect(factionIds).toContain('RBiH');
        expect(factionIds).toContain('RS');
        expect(factionIds).toContain('HRHB');

        // Political controllers exist
        expect(state.political.political_controllers).toBeDefined();
        expect(Object.keys(state.political.political_controllers).length).toBeGreaterThan(0);

        // Military formations exist
        expect(state.military.formations).toBeDefined();
        expect(Object.keys(state.military.formations).length).toBeGreaterThan(0);

        // Schema version
        expect(state.schema_version).toBeDefined();
        expect(typeof state.schema_version).toBe('number');

        await cleanup(OUT_DIR);
    }, { timeout: 120_000 });

    it('serialize -> deserialize round-trip preserves state identity', async () => {
        await cleanup(OUT_DIR);
        const result = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_DIR });
        const finalJson = await readFile(result.paths.final_save, 'utf8');

        // Parse the state
        const state = JSON.parse(finalJson);

        // Re-serialize with the same serializer used by scenario runner
        const { serializeGameState } = await import('../src/state/serializeGameState.js');
        const reserialized = serializeGameState(state, 2);

        // Parse both and deep-compare
        const original = JSON.parse(finalJson);
        const roundTripped = JSON.parse(reserialized);

        expect(roundTripped.meta).toEqual(original.meta);
        expect(roundTripped.factions).toEqual(original.factions);
        expect(roundTripped.political.political_controllers)
            .toEqual(original.political.political_controllers);
        expect(Object.keys(roundTripped.military.formations).sort())
            .toEqual(Object.keys(original.military.formations).sort());

        await cleanup(OUT_DIR);
    }, { timeout: 120_000 });

    it('same scenario run twice yields identical final_save hash', async () => {
        const OUT_A = join(process.cwd(), '.tmp_integration_det_a');
        const OUT_B = join(process.cwd(), '.tmp_integration_det_b');
        await cleanup(OUT_A);
        await cleanup(OUT_B);

        const resultA = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_A });
        const resultB = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_B });

        expect(resultA.final_state_hash).toBe(resultB.final_state_hash);

        const bytesA = await readFile(resultA.paths.final_save, 'utf8');
        const bytesB = await readFile(resultB.paths.final_save, 'utf8');
        expect(bytesA).toBe(bytesB);

        await cleanup(OUT_A);
        await cleanup(OUT_B);
    }, { timeout: 240_000 });
});
