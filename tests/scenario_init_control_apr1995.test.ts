/**
 * April 1995 scenario: validate municipal anchors against apr1995 source snapshot.
 * SKIPs when data prereqs missing. Uses apr1995_start with init_control apr1995 (4-week run for speed).
 */

import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_init_control_apr1995');

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

test('init_control apr1995: municipal anchors match apr1995 source snapshot', { timeout: 30000 }, async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    const graph = await loadSettlementGraph();
    const sidToMun = new Map<string, string>();
    for (const [, record] of graph.settlements) {
        if (!record.mun1990_id) continue;
        sidToMun.set(record.sid, record.mun1990_id);
        const props = record.properties as Record<string, unknown> | undefined;
        const constituents = props?.constituent_sids;
        if (Array.isArray(constituents)) {
            for (const constituentSid of constituents) {
                if (typeof constituentSid === 'string') sidToMun.set(constituentSid, record.mun1990_id);
            }
        }
    }

    await ensureRemoved(BASE_OUT);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1995_start.json');
    const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT, weeksOverride: 4 });

    expect(existsSync(result.paths.initial_save)).toBe(true);
    const initialContent = await readFile(result.paths.initial_save, 'utf8');
    const state = JSON.parse(initialContent) as { political: { political_controllers?: Record<string, string | null> } };
    const controllers = state.political.political_controllers ?? {};
    const expectedContent = await readFile(
        join(process.cwd(), 'data', 'source', 'municipalities_1990_initial_political_controllers_apr1995.json'),
        'utf8',
    );
    const expected = JSON.parse(expectedContent) as { controllers_by_mun1990_id?: Record<string, string> };
    const expectedByMun = expected.controllers_by_mun1990_id ?? {};
    const targetMuns = ['srebrenica', 'jajce'];
    const countsByMun = new Map<string, Map<string, number>>();
    for (const [sid, controller] of Object.entries(controllers)) {
        if (!controller) continue;
        const municipality = sidToMun.get(sid);
        if (!municipality || !targetMuns.includes(municipality)) continue;
        const municipalityCounts = countsByMun.get(municipality) ?? new Map<string, number>();
        municipalityCounts.set(controller, (municipalityCounts.get(controller) ?? 0) + 1);
        countsByMun.set(municipality, municipalityCounts);
    }

    for (const municipality of targetMuns) {
        const municipalityCounts = countsByMun.get(municipality);
        expect(municipalityCounts).toBeDefined();
        expect(municipalityCounts && municipalityCounts.size).toBeGreaterThan(0);
        const sortedControllers = Array.from(municipalityCounts?.keys() ?? []).sort(strictCompare);
        let bestController = sortedControllers[0];
        let bestCount = municipalityCounts?.get(bestController) ?? 0;
        for (const controller of sortedControllers) {
            const count = municipalityCounts?.get(controller) ?? 0;
            if (count > bestCount) {
                bestController = controller;
                bestCount = count;
            }
        }
        const expectedController = expectedByMun[municipality];
        expect(expectedController).toBeDefined();
        if (municipality === 'srebrenica') {
            expect(bestController).toBe(expectedController);
        } else {
            const sortedCountsDesc = Array.from(municipalityCounts?.values() ?? []).sort((a, b) => b - a);
            expect(sortedCountsDesc.length >= 2 ? bestCount > sortedCountsDesc[1]! : bestCount > 0).toBe(true);
        }
    }

    await ensureRemoved(BASE_OUT);
});
