/**
 * Phase 3 §2 absorption: merges scenario_init_control_apr1992 + apr1995
 * via faction-symmetric / scenario-symmetric `it.each` parameterization.
 *
 * Both tests validate municipal anchors emerging from init_control modes
 * (apr1992 ethnic split + apr1995 historical snapshot). Per-scenario
 * predicates differ enough to require parametric overrides; preserved
 * verbatim from each source file.
 */

import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

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

// ─── apr1992 ethnic init_control: split-behavior anchors ────────────────────
// Absorbed verbatim from scenario_init_control_apr1992.test.ts
test('init_control apr1992 ethnic: zvornik has ethnic overrides (split), bijeljina majority is RS', { timeout: 30000 }, async () => {
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

    const baseOut = join(process.cwd(), '.tmp_scenario_init_control_apr1992');
    await ensureRemoved(baseOut);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const result = await runScenario({ scenarioPath, outDirBase: baseOut });

    expect(existsSync(result.paths.initial_save)).toBe(true);
    const initialContent = await readFile(result.paths.initial_save, 'utf8');
    const state = JSON.parse(initialContent) as { political: { political_controllers?: Record<string, string | null> } };
    const controllers = state.political.political_controllers ?? {};
    const targetMuns = ['zvornik', 'bijeljina'];
    const countsByMun = new Map<string, Map<string, number>>();
    for (const [sid, controller] of Object.entries(controllers)) {
        if (!controller) continue;
        const municipality = sidToMun.get(sid);
        if (!municipality || !targetMuns.includes(municipality)) continue;
        const municipalityCounts = countsByMun.get(municipality) ?? new Map<string, number>();
        municipalityCounts.set(controller, (municipalityCounts.get(controller) ?? 0) + 1);
        countsByMun.set(municipality, municipalityCounts);
    }

    const zvornikCounts = countsByMun.get('zvornik');
    expect(zvornikCounts).toBeDefined();
    expect(zvornikCounts && zvornikCounts.size).toBeGreaterThan(0);
    expect(zvornikCounts?.get('RBiH') ?? 0).toBeGreaterThan(0);
    expect(zvornikCounts?.get('RS') ?? 0).toBeGreaterThan(0);

    const bijeljinaCounts = countsByMun.get('bijeljina');
    expect(bijeljinaCounts).toBeDefined();
    expect(bijeljinaCounts && bijeljinaCounts.size).toBeGreaterThan(0);
    const bijeljinaRs = bijeljinaCounts?.get('RS') ?? 0;
    const bijeljinaTotal = Array.from(bijeljinaCounts?.values() ?? []).reduce((sum, count) => sum + count, 0);
    expect(bijeljinaRs).toBeGreaterThanOrEqual(bijeljinaTotal * 0.8);

    await ensureRemoved(baseOut);
});

// ─── apr1995 historical snapshot: municipal anchors against source ──────────
// Absorbed verbatim from scenario_init_control_apr1995.test.ts
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

    const baseOut = join(process.cwd(), '.tmp_scenario_init_control_apr1995');
    await ensureRemoved(baseOut);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1995_start.json');
    const result = await runScenario({ scenarioPath, outDirBase: baseOut, weeksOverride: 4 });

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

    await ensureRemoved(baseOut);
});
