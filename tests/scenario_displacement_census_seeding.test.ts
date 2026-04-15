/**
 * Displacement census seeding: when scenario has War phase (or Peace phase) and census is available,
 * initial state must have displacement_state seeded from 1991 census (original_population per mun),
 * not default 10,000.
 */

import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { createStateFromScenario } from '../src/scenario/scenario_runner.js';

test('War phase scenario with census seeds displacement_state from 1991 population', { timeout: 30000 }, async () => {
    const baseDir = process.cwd();
    const prereq = checkDataPrereqs({ baseDir });
    if (!prereq.ok) {
        return;
    }

    const scenarioPath = join(baseDir, 'data', 'scenarios', 'apr1992_definitive_52w.json');
    const state = await createStateFromScenario(scenarioPath, baseDir, { initialStateOnly: true });

    const displacementState = state.displacement.displacement_state;
    expect(displacementState).toBeDefined();

    const censusPath = join(baseDir, 'data', 'derived', 'municipality_population_1991.json');
    const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as {
        by_mun1990_id?: Record<string, { total: number }>;
        by_municipality_id?: Record<string, { total: number; mun1990_id?: string }>;
    };
    const byMun = censusRaw.by_mun1990_id ?? {};
    const byNumeric = censusRaw.by_municipality_id ?? {};
    const flat: Record<string, number> = {};
    for (const [key, value] of Object.entries(byMun)) {
        if (value?.total != null) flat[key] = value.total;
    }
    if (Object.keys(flat).length === 0) {
        for (const value of Object.values(byNumeric)) {
            if (value?.mun1990_id != null && typeof value.total === 'number') flat[value.mun1990_id] = value.total;
        }
    }

    const sampleMunId = Object.keys(flat).sort((a, b) => a.localeCompare(b))[0];
    const expectedTotal = flat[sampleMunId];
    expect(Object.keys(flat).length).toBeGreaterThan(0);
    expect(expectedTotal).toBeGreaterThan(0);

    const displacement = displacementState![sampleMunId];
    expect(displacement).toBeDefined();
    expect(displacement.original_population).toBe(expectedTotal);
});
