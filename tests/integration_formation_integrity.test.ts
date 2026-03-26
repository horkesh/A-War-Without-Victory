import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { GameState, FormationState, FactionId } from '../src/state/game_state.js';
import {
    DISSOLUTION_PERSONNEL_THRESHOLD,
    DISSOLUTION_COHESION_THRESHOLD,
    DISSOLUTION_MORALE_THRESHOLD,
} from '../src/sim/combat/brigade_dissolution.js';

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

    it('no active brigade has location_osid in enemy territory (>5%)', () => {
        if (skipped) return;
        const controllers = (state as any).political.political_controllers;
        const formations = (state as any).military.formations;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if (!fm.location_osid) continue;

            const controller = controllers[fm.location_osid];
            if (!controller) continue; // uncontrolled is OK

            const faction = fm.faction as FactionId;
            // Same faction = friendly. Also check alliance (RBiH+HRHB allied when alliance > 0)
            const alliance = (state as any).political.war_alliance_rbih_hrhb ?? 1;
            const isFriendly =
                controller === faction ||
                (alliance > 0 && (
                    (faction === 'RBiH' && controller === 'HRHB') ||
                    (faction === 'HRHB' && controller === 'RBiH')
                ));

            if (!isFriendly) {
                violations.push(`${id} (${faction}) at ${fm.location_osid} controlled by ${controller}`);
            }
        }

        // Allow small number of transient violations (operations in progress)
        // but flag if more than 5% of brigades are in enemy territory
        const totalActive = Object.values(formations)
            .filter((f: any) => f.status === 'active' && f.kind === 'brigade')
            .length;
        const violationRate = violations.length / Math.max(totalActive, 1);
        expect(violationRate,
            `${violations.length}/${totalActive} brigades in enemy territory: ${violations.slice(0, 5).join(', ')}`
        ).toBeLessThan(0.05);
    });

    it('no formation has negative personnel', () => {
        if (skipped) return;
        const formations = (state as any).military.formations;

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.personnel === undefined) continue; // corps may not track personnel directly
            expect(fm.personnel, `${id} personnel`).toBeGreaterThanOrEqual(0);
        }
    });

    it('no active non-enclave brigade meets 2-of-3 dissolution criteria', () => {
        if (skipped) return;
        const formations = (state as any).military.formations;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if ((fm as any).is_enclave) continue; // enclave brigades have higher bar

            const personnel = fm.personnel ?? 1000;
            const cohesion = fm.cohesion ?? 60;
            const morale = fm.morale ?? 60;

            let criteriaCount = 0;
            if (personnel < DISSOLUTION_PERSONNEL_THRESHOLD) criteriaCount++;
            if (cohesion <= DISSOLUTION_COHESION_THRESHOLD) criteriaCount++;
            if (morale <= DISSOLUTION_MORALE_THRESHOLD) criteriaCount++;

            if (criteriaCount >= 2) {
                violations.push(
                    `${id}: personnel=${personnel}, cohesion=${cohesion}, morale=${morale} (${criteriaCount}/3 criteria met)`
                );
            }
        }

        expect(violations, `Brigades meeting dissolution criteria but still active`).toEqual([]);
    });

    it('all active brigades have location_osid that exists in political_controllers or is null', () => {
        if (skipped) return;
        const formations = (state as any).military.formations;
        const controllers = (state as any).political.political_controllers;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if (fm.location_osid === null || fm.location_osid === undefined) continue;

            if (!(fm.location_osid in controllers)) {
                violations.push(`${id} at unknown OSID: ${fm.location_osid}`);
            }
        }

        expect(violations).toEqual([]);
    });

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });
});
