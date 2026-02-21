/**
 * Displacement census seeding: when scenario has Phase II (or Phase I) and census is available,
 * initial state must have displacement_state seeded from 1991 census (original_population per mun),
 * not default 10,000.
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { createStateFromScenario } from '../src/scenario/scenario_runner.js';

test('Phase II scenario with census seeds displacement_state from 1991 population', async () => {
    const baseDir = process.cwd();
    const prereq = checkDataPrereqs({ baseDir });
    if (!prereq.ok) {
        return;
    }

    const scenarioPath = join(baseDir, 'data', 'scenarios', 'apr1992_definitive_52w.json');
    const state = await createStateFromScenario(scenarioPath, baseDir, { initialStateOnly: true });

    assert(state.displacement_state != null && typeof state.displacement_state === 'object', 'displacement_state should exist');

    const censusPath = join(baseDir, 'data', 'derived', 'municipality_population_1991.json');
    const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as {
        by_mun1990_id?: Record<string, { total: number }>;
        by_municipality_id?: Record<string, { total: number; mun1990_id?: string }>;
    };
    const byMun = censusRaw.by_mun1990_id ?? {};
    const byNumeric = censusRaw.by_municipality_id ?? {};
    const flat: Record<string, number> = {};
    for (const [k, v] of Object.entries(byMun)) {
        if (v?.total != null) flat[k] = v.total;
    }
    if (Object.keys(flat).length === 0 && byNumeric) {
        for (const v of Object.values(byNumeric)) {
            if (v?.mun1990_id != null && typeof v.total === 'number') flat[v.mun1990_id] = v.total;
        }
    }

    assert(Object.keys(flat).length > 0, 'census should have at least one municipality');
    const sampleMunId = Object.keys(flat).sort((a, b) => a.localeCompare(b))[0];
    const expectedTotal = flat[sampleMunId];
    assert(Number.isFinite(expectedTotal) && expectedTotal > 0, 'sample mun should have positive total');

    const disp = state.displacement_state[sampleMunId];
    assert(disp != null, `displacement_state should have entry for ${sampleMunId}`);
    assert.strictEqual(
        disp.original_population,
        expectedTotal,
        `displacement_state[${sampleMunId}].original_population should equal census total (not default 10000)`
    );
});
