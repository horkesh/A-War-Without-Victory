/**
 * Duration-derived reporting contract (2026-09-19 retirement closeout).
 *
 * The standalone 40w scenario definitions were retired; short diagnostics now run
 * `apr1992_definitive_188w.json` with a `--weeks N` duration override. This file pins
 * the behaviour that makes that safe, WITHOUT an 188-week run:
 *
 *   1. No override keeps the existing full-duration selection:
 *      epoch = oct1995 and all four checkpoints reached.
 *   2. A 40-week override selects the jan1993 epoch and ONLY the checkpoints the run
 *      actually reaches (week 39), so a short canonical run is scored against the same
 *      reference the retired 40w fixture used.
 *   3. `runScenario` is actually wired to the overridden duration end-to-end
 *      (cheap `initialStateOnly` run; no week loop, no 188-week run).
 *
 * The functions under test are the pure selectors the runner uses:
 * `pickHistoricalReferenceKey` and `checkpointsForScenario`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadScenario } from '../src/scenario/scenario_loader.js';
import {
    checkpointsForScenario,
    pickHistoricalReferenceKey,
    runScenario,
} from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_188w.json');
const OUT_DIR = join(process.cwd(), '.tmp_duration_reporting_contract');

describe('duration-derived reporting contract', () => {
    it('no override preserves the existing full-duration selection', async () => {
        const scenario = await loadScenario(SCENARIO_PATH);

        expect(pickHistoricalReferenceKey(scenario)).toBe('oct1995');
        expect(checkpointsForScenario(scenario).map((c) => c.key)).toEqual([
            'jan1993', 'apr1994', 'apr1995', 'oct1995',
        ]);
        expect(checkpointsForScenario(scenario).map((c) => c.week)).toEqual([39, 104, 156, 188]);
    });

    it('a 40-week override selects jan1993 and only the reached checkpoint', async () => {
        const scenario = await loadScenario(SCENARIO_PATH);

        expect(pickHistoricalReferenceKey({ ...scenario, weeks: 40 })).toBe('jan1993');
        expect(checkpointsForScenario({ ...scenario, weeks: 40 }).map((c) => c.key)).toEqual(['jan1993']);
        expect(checkpointsForScenario({ ...scenario, weeks: 40 }).map((c) => c.week)).toEqual([39]);
    });

    it('maps intermediate overrides to the epoch matching the run horizon', async () => {
        const scenario = await loadScenario(SCENARIO_PATH);

        expect(pickHistoricalReferenceKey({ ...scenario, weeks: 104 })).toBe('apr1994');
        expect(checkpointsForScenario({ ...scenario, weeks: 104 }).map((c) => c.week)).toEqual([39, 104]);

        expect(pickHistoricalReferenceKey({ ...scenario, weeks: 156 })).toBe('apr1995');
        expect(checkpointsForScenario({ ...scenario, weeks: 156 }).map((c) => c.week)).toEqual([39, 104, 156]);

        expect(pickHistoricalReferenceKey({ ...scenario, weeks: 1 })).toBe('jan1993');
        expect(checkpointsForScenario({ ...scenario, weeks: 1 })).toEqual([]);
    });
});

interface RunMetaShape {
    weeks?: number;
    anchor_contract?: { epoch?: string; weeks?: number };
    provenance?: { consumed_inputs?: { files?: Array<{ path: string }> } };
}

describe('duration-override run_meta wiring (cheap initialStateOnly run)', () => {
    let meta: RunMetaShape | undefined;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
        const result = await runScenario({
            scenarioPath: SCENARIO_PATH,
            outDirBase: OUT_DIR,
            weeksOverride: 40,
            initialStateOnly: true,
        });
        meta = JSON.parse(await readFile(join(result.outDir, 'run_meta.json'), 'utf8'));
    }, 120_000);

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });

    it('reports the overridden duration and the jan1993 epoch', () => {
        if (skipped) return;
        expect(meta?.weeks).toBe(40);
        expect(meta?.anchor_contract?.weeks).toBe(40);
        expect(meta?.anchor_contract?.epoch).toBe('jan1993');
    });

    it('consumes only the scoring reference matching the overridden horizon', () => {
        if (skipped) return;
        const paths = (meta?.provenance?.consumed_inputs?.files ?? []).map((f) => f.path);
        expect(paths).toContain('data/source/calibration/painted_control_jan1993.json');
        expect(paths).not.toContain('data/source/calibration/painted_control_oct1995.json');
    });
});
