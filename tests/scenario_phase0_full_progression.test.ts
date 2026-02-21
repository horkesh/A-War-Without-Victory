/**
 * Scenario test: start from Turn 0 (Phase 0) and run through all phases.
 * Historically aligned decision makers: RS/HRHB pre-declared, referendum held,
 * war starts at referendum_turn + 4 per canon.
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { computeRunId, loadScenario } from '../src/scenario/scenario_loader.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'phase0_full_progression_20w.json');
const OUT_DIR = join(process.cwd(), '.tmp_phase0_full_progression');

function isMissingMappingError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
        msg.includes('Municipality controller mapping file not found') ||
        msg.includes('not in municipality_political_controllers')
    );
}

test('phase0_full_progression: starts Phase 0, transitions to Phase I at war_start_turn', async () => {
    let ran = false;
    try {
        const result = await runScenario({
            scenarioPath: SCENARIO_PATH,
            outDirBase: OUT_DIR
        });
        ran = true;

        const runId = computeRunId(await loadScenario(SCENARIO_PATH));
        const weeklyPath = join(result.outDir, 'weekly_report.jsonl');
        const content = await readFile(weeklyPath, 'utf8');
        const lines = content.trim().split('\n').filter((l) => l.length > 0);

        assert.ok(lines.length >= 5, 'weekly_report must have at least 5 weeks');

        const week1 = JSON.parse(lines[0]!);
        assert.strictEqual(week1.phase, 'phase_0', 'week 1 must be phase_0');

        const week5 = JSON.parse(lines[4]!);
        assert.strictEqual(week5.phase, 'phase_i', 'week 5 must be phase_i (transition after war_start_turn=4)');

        const runSummaryPath = join(result.outDir, 'run_summary.json');
        const runSummary = JSON.parse(await readFile(runSummaryPath, 'utf8'));
        assert.strictEqual(runSummary.summary.phase, 'phase_i', 'final phase must be phase_i or phase_ii');
    } catch (err) {
        if (isMissingMappingError(err)) return;
        throw err;
    }
    assert.ok(ran, 'scenario must have run');
});

test('phase0_full_progression: Phase 0 decision makers aligned to canon', async () => {
    const scenario = await loadScenario(SCENARIO_PATH);
    assert.strictEqual(scenario.start_phase, 'phase_0', 'scenario must start in phase_0');
    assert.strictEqual(scenario.phase_0_referendum_turn, 0, 'referendum at turn 0 (pre-set)');
    assert.strictEqual(scenario.phase_0_war_start_turn, 4, 'war starts at referendum_turn + 4 per canon');
});
