import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import {
    DISSOLUTION_COHESION_THRESHOLD,
    DISSOLUTION_MORALE_THRESHOLD,
    DISSOLUTION_PERSONNEL_THRESHOLD,
} from '../src/sim/combat/brigade_dissolution.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_formation_integrity');

describe('formation integrity (40w)', () => {
    let state: GameState;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
    }, 600_000);

    it('every active physical combat formation has exact-faction-controlled location_osid', () => {
        if (skipped) return;
        const controllers = state.political.political_controllers ?? {};
        const formations = state.military.formations ?? {};
        const violations: string[] = [];
        const nonSpatialKinds = new Set(['corps', 'corps_asset', 'army_hq']);

        for (const [id, fm] of Object.entries(formations)) {
            if (fm.status !== 'active') continue;
            if (nonSpatialKinds.has(fm.kind ?? 'brigade')) continue;
            if (!fm.location_osid) {
                violations.push(`${id} (${fm.faction}) has no location_osid`);
                continue;
            }

            const controller = controllers[fm.location_osid];
            if (controller !== fm.faction) {
                violations.push(`${id} (${fm.faction}) at ${fm.location_osid} controlled by ${controller ?? 'null'}`);
            }
        }

        expect(violations).toEqual([]);
    });

    it('no formation has negative personnel', () => {
        if (skipped) return;
        const formations = state.military.formations ?? {};

        for (const [id, fm] of Object.entries(formations)) {
            if (fm.personnel === undefined) continue;
            expect(fm.personnel, `${id} personnel`).toBeGreaterThanOrEqual(0);
        }
    });

    it('no active brigade meets its canonical dissolution criteria', () => {
        if (skipped) return;
        const formations = state.military.formations ?? {};
        const violations: string[] = [];

        for (const [id, fm] of Object.entries(formations) as Array<[string, FormationState]>) {
            if (fm.status !== 'active' || fm.kind !== 'brigade') continue;

            const personnel = fm.personnel ?? 1000;
            const cohesion = fm.cohesion ?? 60;
            const morale = fm.morale ?? 60;
            let criteriaCount = 0;
            if (personnel < DISSOLUTION_PERSONNEL_THRESHOLD) criteriaCount++;
            if (cohesion <= DISSOLUTION_COHESION_THRESHOLD) criteriaCount++;
            if (morale <= DISSOLUTION_MORALE_THRESHOLD) criteriaCount++;

            const requiredCriteria = fm.tags?.includes('enclave') ? 3 : 2;
            if (criteriaCount >= requiredCriteria) {
                violations.push(
                    `${id}: personnel=${personnel}, cohesion=${cohesion}, morale=${morale} (${criteriaCount}/3 criteria met)`,
                );
            }
        }

        expect(violations).toEqual([]);
    });

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });
});
