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

test('init_control apr1992 ethnic: zvornik has ethnic overrides (split), bijeljina majority is RS', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    const graph = await loadSettlementGraph();
    const sidToMun = new Map<string, string>();
    for (const [_key, rec] of graph.settlements) {
        if (!rec.mun1990_id) continue;
        // Map the primary key (osid or sid) to municipality
        sidToMun.set(rec.sid, rec.mun1990_id);
        // Also map constituent canonical SIDs (from operational settlements)
        const props = rec.properties as Record<string, unknown> | undefined;
        const constituents = props?.constituent_sids;
        if (Array.isArray(constituents)) {
            for (const csid of constituents) {
                if (typeof csid === 'string') sidToMun.set(csid, rec.mun1990_id);
            }
        }
    }

    await ensureRemoved(BASE_OUT);
    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });

    assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
    const initialContent = await readFile(result.paths.initial_save, 'utf8');
    const state = JSON.parse(initialContent) as { political_controllers?: Record<string, string | null> };
    const pc = state.political_controllers ?? {};
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
    // Zvornik: historically Bosniak-majority municipality, but hybrid_1992 with 0.7 threshold
    // produces a split — some settlements override to RBiH, others stay RS (municipal default).
    // Key assertion: ethnic override IS working (both factions present), not that one faction wins.
    const zvornikCounts = countsByMun.get('zvornik');
    assert(zvornikCounts != null && zvornikCounts.size > 0, 'zvornik should have initialized settlements');
    assert(
        (zvornikCounts.get('RBiH') ?? 0) > 0 && (zvornikCounts.get('RS') ?? 0) > 0,
        `zvornik should have both RBiH and RS settlements (ethnic override active); got: ${JSON.stringify(Object.fromEntries(zvornikCounts))}`
    );

    // Bijeljina: overwhelmingly Serb municipality — should be RS majority.
    const bijelCounts = countsByMun.get('bijeljina');
    assert(bijelCounts != null && bijelCounts.size > 0, 'bijeljina should have initialized settlements');
    const bijelRs = bijelCounts.get('RS') ?? 0;
    const bijelTotal = Array.from(bijelCounts.values()).reduce((a, b) => a + b, 0);
    assert(
        bijelRs > bijelTotal * 0.8,
        `bijeljina should be overwhelmingly RS; got: ${JSON.stringify(Object.fromEntries(bijelCounts))}`
    );

    await ensureRemoved(BASE_OUT);
});
