/**
 * Phase 1.3: Validate apr1992 ethnic initialization anchors for split behavior.
 * Uses apr1992_4w (ethnic settlement init) and compares deterministic municipal majorities.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_init_control_apr1992');

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('init_control apr1992 ethnic: zvornik majority is RBiH, bijeljina majority is RS', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    const graph = await loadSettlementGraph();
    const sidToMun = new Map<string, string>();
    for (const [sid, rec] of graph.settlements) {
        if (!rec.mun1990_id) continue;
        sidToMun.set(sid, rec.mun1990_id);
    }

    await ensureRemoved(BASE_OUT);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });

    assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
    const initialContent = await readFile(result.paths.initial_save, 'utf8');
    const state = JSON.parse(initialContent) as { political_controllers?: Record<string, string | null> };
    const pc = state.political_controllers ?? {};
    const expectedByMun: Record<string, string> = {
        zvornik: 'RBiH',
        bijeljina: 'RS'
    };
    const targetMuns = ['zvornik', 'bijeljina'];
    const countsByMun = new Map<string, Map<string, number>>();
    for (const [sid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        const mun = sidToMun.get(sid);
        if (!mun || !targetMuns.includes(mun)) continue;
        const munCounts = countsByMun.get(mun) ?? new Map<string, number>();
        munCounts.set(controller, (munCounts.get(controller) ?? 0) + 1);
        countsByMun.set(mun, munCounts);
    }
    for (const mun of targetMuns) {
        const munCounts = countsByMun.get(mun);
        assert(munCounts != null && munCounts.size > 0, `${mun} should have initialized settlements`);
        const sortedControllers = Array.from(munCounts.keys()).sort(strictCompare);
        let bestController = sortedControllers[0];
        let bestCount = munCounts.get(bestController) ?? 0;
        for (const controller of sortedControllers) {
            const count = munCounts.get(controller) ?? 0;
            if (count > bestCount) {
                bestController = controller;
                bestCount = count;
            }
        }
        assert.strictEqual(
            bestController,
            expectedByMun[mun],
            `${mun} majority controller should match ethnic-init anchor`
        );
    }

    await ensureRemoved(BASE_OUT);
});
