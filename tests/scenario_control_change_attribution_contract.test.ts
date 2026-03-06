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
        control_change_attribution?: { total_changes: number };
    });
    assert.ok(rows.some((row) => row.control_change_attribution !== undefined), 'weekly_report.jsonl must carry control_change_attribution rows');

    await ensureRemoved(BASE_OUT);
});
