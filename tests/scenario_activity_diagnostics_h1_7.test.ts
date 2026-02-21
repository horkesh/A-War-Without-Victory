/**
 * Phase H1.7: Scenario activity diagnostics — activity_summary.json and "Activity over run" in end_report.
 * Asserts artifacts exist and activity_summary has expected shape; does not assert specific values.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_activity_h1_7');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
const PHASE_II_SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_phase_ii_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('scenario activity diagnostics: activity_summary.json and Activity over run in end_report', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_OUT);

    const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

    const activitySummaryPath = result.paths.activity_summary;
    assert(existsSync(activitySummaryPath), 'activity_summary.json should exist');

    const endReportPath = result.paths.end_report;
    assert(existsSync(endReportPath), 'end_report.md should exist');
    const endReportContent = await readFile(endReportPath, 'utf8');
    assert(
        endReportContent.includes('## Activity over run'),
        'end_report.md should contain header "Activity over run"'
    );

    const activitySummaryRaw = await readFile(activitySummaryPath, 'utf8');
    const activitySummary = JSON.parse(activitySummaryRaw) as {
        weeks: number;
        metrics: {
            front_active_set_size: { min: number; max: number; mean: number; nonzero_weeks: number };
            pressure_eligible_size?: { min: number; max: number; mean: number; nonzero_weeks: number } | null;
            displacement_trigger_eligible_size?: {
                min: number;
                max: number;
                mean: number;
                nonzero_weeks: number;
            } | null;
        };
        notes?: string[];
    };

    assert(typeof activitySummary.weeks === 'number', 'activity_summary.weeks should be a number');
    assert(activitySummary.metrics != null, 'activity_summary.metrics should exist');
    const m = activitySummary.metrics.front_active_set_size;
    assert(m != null, 'activity_summary.metrics.front_active_set_size should exist');
    assert(typeof m.min === 'number', 'front_active_set_size.min should be a number');
    assert(typeof m.max === 'number', 'front_active_set_size.max should be a number');
    assert(typeof m.mean === 'number', 'front_active_set_size.mean should be a number');
    assert(typeof m.nonzero_weeks === 'number', 'front_active_set_size.nonzero_weeks should be a number');

    await ensureRemoved(BASE_OUT);
});

test('phase ii run_summary includes phase_ii_attack_resolution diagnostics block', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_OUT);
    const result = await runScenario({ scenarioPath: PHASE_II_SCENARIO_PATH, outDirBase: BASE_OUT, weeksOverride: 1 });
    const runSummaryPath = result.paths.run_summary;
    assert(existsSync(runSummaryPath), 'run_summary.json should exist');

    const runSummaryRaw = await readFile(runSummaryPath, 'utf8');
    const runSummary = JSON.parse(runSummaryRaw) as {
        phase_ii_attack_resolution?: {
            weeks_with_phase_ii: number;
            weeks_with_orders: number;
            orders_processed: number;
            flips_applied: number;
            casualty_attacker: number;
            casualty_defender: number;
        };
    };

    assert(runSummary.phase_ii_attack_resolution != null, 'phase_ii_attack_resolution should exist for phase_ii scenario runs');
    const diag = runSummary.phase_ii_attack_resolution!;
    assert(typeof diag.weeks_with_phase_ii === 'number', 'weeks_with_phase_ii should be a number');
    assert(typeof diag.weeks_with_orders === 'number', 'weeks_with_orders should be a number');
    assert(typeof diag.orders_processed === 'number', 'orders_processed should be a number');
    assert(typeof diag.flips_applied === 'number', 'flips_applied should be a number');
    assert(typeof diag.casualty_attacker === 'number', 'casualty_attacker should be a number');
    assert(typeof diag.casualty_defender === 'number', 'casualty_defender should be a number');
    assert(diag.weeks_with_phase_ii >= 1, 'weeks_with_phase_ii should be >= 1');

    await ensureRemoved(BASE_OUT);
});
