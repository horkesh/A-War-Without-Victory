/**
 * Phase 1.3: Validate apr1992 ethnic initialization anchors for split behavior.
 * Uses apr1992_4w (ethnic settlement init) and compares deterministic municipal majorities.
 */

import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_init_control_apr1992');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

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

    await ensureRemoved(BASE_OUT);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });

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

    await ensureRemoved(BASE_OUT);
});
