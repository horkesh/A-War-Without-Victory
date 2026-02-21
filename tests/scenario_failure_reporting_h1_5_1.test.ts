/**
 * Phase H1.5.1: Failure reporting — run_meta.json and failure_report.* on early crash.
 * Phase H1.5.2: Use err.out_dir, avoid "exactly one subdir" for robustness to leftover dirs / parallel runs.
 * Does not depend on missing prereqs; forces a controlled failure via injectFailureAfterRunMeta.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_failure_h1_5_1');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('failure after run_meta: run_meta.json and failure_report.* exist', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_OUT);

    const controlledMessage = 'controlled failure h1_5_1';
    try {
        await runScenario({
            scenarioPath: SCENARIO_PATH,
            outDirBase: BASE_OUT,
            injectFailureAfterRunMeta: () => {
                throw new Error(controlledMessage);
            }
        });
        assert.fail('runScenario should throw');
    } catch (err) {
        assert(err && (err as Error & { out_dir?: string }).out_dir, 'expected out_dir on error');
        const e = err as Error & { out_dir: string; run_id?: string };
        const outDir = e.out_dir;
        assert.strictEqual(e.run_id?.includes('noop_4w'), true);

        const runMetaPath = join(outDir, 'run_meta.json');
        const failureTxtPath = join(outDir, 'failure_report.txt');
        const failureJsonPath = join(outDir, 'failure_report.json');

        assert(existsSync(runMetaPath), 'run_meta.json should exist');
        assert(existsSync(failureTxtPath), 'failure_report.txt should exist');
        assert(existsSync(failureJsonPath), 'failure_report.json should exist');

        const runMeta = JSON.parse(await readFile(runMetaPath, 'utf8')) as {
            scenario_id: string;
            run_id: string;
            weeks: number;
            scenario_path: string;
            out_dir: string;
        };
        assert.strictEqual(runMeta.scenario_id, 'noop_4w');
        assert.strictEqual(runMeta.weeks, 4);
        assert(runMeta.run_id.length > 0);

        const txt = await readFile(failureTxtPath, 'utf8');
        assert(txt.includes('SCENARIO RUN FAILED'));
        assert(txt.includes(runMeta.run_id));
        assert(txt.includes(controlledMessage));
        assert(!txt.includes('timestamp') && !txt.match(/\d{4}-\d{2}-\d{2}T/), 'no timestamps in failure_report.txt');

        const failureJson = JSON.parse(await readFile(failureJsonPath, 'utf8')) as {
            run_id: string;
            scenario_id: string;
            weeks: number;
            error_name: string;
            error_message: string;
            stack: string | null;
        };
        assert.strictEqual(failureJson.scenario_id, 'noop_4w');
        assert(failureJson.error_message.includes(controlledMessage), 'failure_report.json error_message includes controlled message');
        if (e.run_id) {
            assert.strictEqual(failureJson.run_id, e.run_id, 'failure_report.json run_id matches error.run_id');
        }
    } finally {
        await ensureRemoved(BASE_OUT);
    }
});
