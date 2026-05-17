import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
    }
}

describe('scenario timing instrumentation', () => {
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
    const OUT_A = join(process.cwd(), '.tmp_scenario_timing_a');
    const OUT_B = join(process.cwd(), '.tmp_scenario_timing_b');

    it('emits opt-in timing JSON without changing deterministic run artifacts', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) return;

        await ensureRemoved(OUT_A);
        await ensureRemoved(OUT_B);

        try {
            const resultA = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase: OUT_A,
                emitTimingJson: true,
                consoleDiagnostics: false,
            });
            const resultB = await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase: OUT_B,
                consoleDiagnostics: false,
            });

            expect(resultA.paths.timing_json).toBeTruthy();
            expect(resultB.paths.timing_json).toBeUndefined();
            expect(existsSync(resultA.paths.timing_json!)).toBe(true);

            const timingRaw = await readFile(resultA.paths.timing_json!, 'utf8');
            expect(timingRaw).not.toMatch(/timestamp/i);
            expect(timingRaw).not.toMatch(/\d{4}-\d{2}-\d{2}T/);

            const timing = JSON.parse(timingRaw) as {
                schema_version?: number;
                run_id?: string;
                scenario_id?: string;
                weeks?: number;
                final_state_hash?: string;
                buckets_ms?: Record<string, number>;
                notes?: Record<string, string>;
            };

            expect(timing.schema_version).toBe(1);
            expect(timing.run_id).toBe(resultA.run_id);
            expect(timing.scenario_id).toBe('noop_4w');
            expect(timing.weeks).toBe(4);
            expect(timing.final_state_hash).toBe(resultA.final_state_hash);
            expect(Object.keys(timing.buckets_ms ?? {}).sort()).toEqual([
                'diagnostics_reporting',
                'serialization_artifacts',
                'setup',
                'simulation',
                'total',
            ]);
            for (const value of Object.values(timing.buckets_ms ?? {})) {
                expect(Number.isFinite(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
            }
            expect(timing.notes?.simulation?.toLowerCase()).toContain('turn pipeline');

            for (const artifact of ['final_save', 'weekly_report', 'run_summary', 'formation_delta'] as const) {
                const bytesA = await readFile(resultA.paths[artifact], 'utf8');
                const bytesB = await readFile(resultB.paths[artifact], 'utf8');
                expect(bytesA).toBe(bytesB);
            }
        } finally {
            await ensureRemoved(OUT_A);
            await ensureRemoved(OUT_B);
        }
    }, 60_000);
});
