import assert from 'node:assert';
import path from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadOperationalData } from '../src/data/operational_data.js';
import { buildScenarioStartupState } from '../src/scenario/scenario_runner.js';
import { loadScenario } from '../src/scenario/scenario_loader.js';

test('apr1992 definitive must-hold references live corps ids and real operational osids', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    const scenarioPath = path.resolve(process.cwd(), 'data/scenarios/apr1992_definitive_40w.json');
    const scenario = await loadScenario(scenarioPath);
    const startup = await buildScenarioStartupState(scenario, process.cwd());
    const operationalData = await loadOperationalData(process.cwd());
    const liveCorpsIds = new Set(Object.keys(startup.state.military.corps_command ?? {}));
    const realOsids = new Set(operationalData.operationalToCanonical.keys());

    for (const [corpsId, osids] of Object.entries(scenario.must_hold_osids_by_corps ?? {})) {
        assert.ok(liveCorpsIds.has(corpsId), `must_hold references unknown corps "${corpsId}"`);
        for (const osid of osids) {
            assert.ok(realOsids.has(osid), `must_hold references unknown OSID "${osid}"`);
        }
    }
});
