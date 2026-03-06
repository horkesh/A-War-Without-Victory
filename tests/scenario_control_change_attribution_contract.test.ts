import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_bots.json');
const BASE_OUT = join(process.cwd(), '.tmp_scenario_control_change_attribution_contract');

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

test('scenario harness emits control-change attribution and no longer writes control_events.jsonl', async () => {
    await ensureRemoved(BASE_OUT);

    let run_id: string;
    try {
        const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });
        run_id = result.run_id;
        assert.ok(!('control_events' in result.paths), 'runScenario paths must not expose obsolete control_events artifact');
    } catch (err) {
        if (isMissingMappingError(err)) {
            return;
        }
        throw err;
    }

    const outDir = join(BASE_OUT, run_id);
    assert.ok(!existsSync(join(outDir, 'control_events.jsonl')), 'obsolete control_events.jsonl artifact must not be written');

    const summaryRaw = await readFile(join(outDir, 'run_summary.json'), 'utf8');
    const summary = JSON.parse(summaryRaw) as {
        behavioral_health?: {
            valid_for_combat_calibration: boolean;
            combat_causality?: {
                valid_for_combat_calibration: boolean;
                total_battles: number;
            };
        };
        historical_fit?: {
            bot_benchmark_status?: {
                contract_valid: boolean;
            };
            override_inventory?: Array<{
                mechanism: string;
                classification: string;
                active_entries: number;
            }>;
        };
        control_change_attribution?: {
            total_changes: number;
            combat: number;
            consolidation: number;
            abandoned: number;
            init_overrides: number;
            other: number;
        };
    };
    assert.ok(summary.control_change_attribution, 'run_summary.json must include control_change_attribution');
    assert.ok(summary.behavioral_health, 'run_summary.json must include behavioral_health');
    assert.equal(
        summary.behavioral_health.valid_for_combat_calibration,
        summary.behavioral_health.combat_causality?.valid_for_combat_calibration,
        'behavioral_health should mirror the combat-causality gate'
    );
    assert.ok(summary.historical_fit, 'run_summary.json must include historical_fit');
    assert.equal(
        summary.historical_fit.bot_benchmark_status?.contract_valid,
        true,
        'historical_fit should surface benchmark contract validity'
    );
    assert.ok(Array.isArray(summary.historical_fit.override_inventory), 'historical_fit should surface override inventory');
    assert.equal(
        summary.control_change_attribution.total_changes,
        summary.control_change_attribution.combat +
            summary.control_change_attribution.consolidation +
            summary.control_change_attribution.abandoned +
            summary.control_change_attribution.init_overrides +
            summary.control_change_attribution.other,
        'control_change_attribution buckets must sum to total_changes'
    );

    const weeklyRaw = await readFile(join(outDir, 'weekly_report.jsonl'), 'utf8');
    const rows = weeklyRaw.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as {
        behavioral_health?: {
            valid_for_combat_calibration: boolean;
            control_change_attribution?: { total_changes: number };
        };
        control_change_attribution?: { total_changes: number };
    });
    assert.ok(rows.some((row) => row.control_change_attribution !== undefined), 'weekly_report.jsonl must carry control_change_attribution rows');
    assert.ok(rows.some((row) => row.behavioral_health !== undefined), 'weekly_report.jsonl must carry behavioral_health rows');
    assert.ok(
        rows.some((row) => row.behavioral_health?.control_change_attribution?.total_changes === row.control_change_attribution?.total_changes),
        'weekly behavioral_health should expose the same attribution totals as the legacy top-level field'
    );

    await ensureRemoved(BASE_OUT);
});
