/**
 * Phase H2.4: Determinism test for harness bots (use_harness_bots).
 * Same scenario (noop_4w_bots) run twice => identical key artifacts.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';


import { computeRunId, loadScenario } from '../src/scenario/scenario_loader.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_bots.json');
const OUT_A = join(process.cwd(), '.tmp_scenario_bots_h2_4_a');
const OUT_B = join(process.cwd(), '.tmp_scenario_bots_h2_4_b');

function isMissingMappingError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
        msg.includes('Municipality controller mapping file not found') ||
        msg.includes('not in municipality_political_controllers')
    );
}

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('scenario bots determinism: noop_4w_bots run twice yields identical key artifacts', async () => {
    await ensureRemoved(OUT_A);
    await ensureRemoved(OUT_B);

    const scenario = await loadScenario(SCENARIO_PATH);
    const run_id = computeRunId(scenario);

    let ranA = false;
    let ranB = false;
    try {
        await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A, bot_diagnostics: true });
        ranA = true;
        await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_B, bot_diagnostics: true });
        ranB = true;
    } catch (err) {
        if (isMissingMappingError(err)) {
            return;
        }
        throw err;
    }

    if (!ranA || !ranB) return;

    const artifacts = ['final_save.json', 'weekly_report.jsonl', 'control_events.jsonl', 'formation_delta.json', 'activity_summary.json', 'control_delta.json', 'bot_diagnostics.json'];
    for (const name of artifacts) {
        const bytesA = await readFile(join(OUT_A, run_id, name), 'utf8');
        const bytesB = await readFile(join(OUT_B, run_id, name), 'utf8');
        assert.strictEqual(bytesA, bytesB, `${name} must be byte-identical across two runs`);
    }

    await ensureRemoved(OUT_A);
    await ensureRemoved(OUT_B);
});

test('scenario bots run summary includes deterministic benchmark evaluation contract', async () => {
    await ensureRemoved(OUT_A);
    const scenario = await loadScenario(SCENARIO_PATH);
    const run_id = computeRunId(scenario);

    try {
        await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A, use_smart_bots: true });
    } catch (err) {
        if (isMissingMappingError(err)) return;
        throw err;
    }

    const summaryRaw = await readFile(join(OUT_A, run_id, 'run_summary.json'), 'utf8');
    const summary = JSON.parse(summaryRaw) as {
        bot_benchmark_evaluation?: {
            evaluated: number;
            passed: number;
            failed: number;
            not_reached: number;
            results: Array<{ faction: string; turn: number; status: string }>;
        };
    };

    const evalBlock = summary.bot_benchmark_evaluation;
    assert.ok(evalBlock, 'run_summary.json must include bot_benchmark_evaluation');
    assert.ok(Array.isArray(evalBlock.results), 'bot benchmark results must be an array');
    for (let i = 1; i < evalBlock.results.length; i += 1) {
        const a = evalBlock.results[i - 1]!;
        const b = evalBlock.results[i]!;
        const orderA = `${a.turn}\t${a.faction}`;
        const orderB = `${b.turn}\t${b.faction}`;
        assert.ok(orderA <= orderB, 'bot benchmark results must be stable-sorted by turn then faction');
    }

    await ensureRemoved(OUT_A);
});
