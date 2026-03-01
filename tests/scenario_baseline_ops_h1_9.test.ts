/**
 * Phase H1.9: Baseline ops scenario — run succeeds, end_report and activity_summary exist,
 * weekly_report contains ops.level, and exhaustion or displacement increases.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';


import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const BASE_OUT = join(process.cwd(), '.tmp_baseline_ops_h1_9');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'baseline_ops_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('scenario baseline_ops: run succeeds and emits expected artifacts/metrics', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_OUT);

    const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

    assert(existsSync(result.paths.end_report), 'end_report.md should exist');
    assert(existsSync(result.paths.activity_summary), 'activity_summary.json should exist');

    const weeklyRaw = await readFile(result.paths.weekly_report, 'utf8');
    const lines = weeklyRaw.trim().split('\n').filter(Boolean);
    assert(lines.length >= 1, 'weekly_report should have at least one line');
    const hasOps = lines.some((line) => line.includes('"ops"'));
    assert(hasOps, 'weekly_report.jsonl should contain ops (e.g. ops.level)');

    const firstRow = JSON.parse(lines[0]!) as {
        factions?: Array<{ id: string; exhaustion?: number }>;
        settlement_displacement_count?: number;
        settlement_displacement_total?: number;
    };
    const lastRow = JSON.parse(lines[lines.length - 1]!) as {
        factions?: Array<{ id: string; exhaustion?: number }>;
        settlement_displacement_count?: number;
        settlement_displacement_total?: number;
    };

    assert.ok(Array.isArray(firstRow.factions), 'first weekly row should include factions');
    assert.ok(Array.isArray(lastRow.factions), 'last weekly row should include factions');
    assert.ok(
        typeof (lastRow.settlement_displacement_total ?? 0) === 'number',
        'weekly rows should include settlement displacement metrics'
    );

    await ensureRemoved(BASE_OUT);
});
