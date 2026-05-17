import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runScenario } from '../src/scenario/scenario_runner.js';
import { getSarajevoSiegeParams } from '../src/sim/combat/sarajevo_siege_params.js';
import { deserializeState } from '../src/state/serialize.js';

describe('Sarajevo override regression scenario', () => {
    it('runs deterministically and exercises the defense-bonus override during the siege', async () => {
        const outDirBase = join('data', 'derived', 'scenario', '_sarajevo_override_test');
        const base = await runScenario({
            scenarioPath: 'data/scenarios/apr1992_phase_ii_4w.json',
            outDirBase,
            outDirOverride: join(outDirBase, 'base'),
            consoleDiagnostics: false,
        });
        const overrideA = await runScenario({
            scenarioPath: 'data/scenarios/regression/sarajevo_override_defense_bonus_050.json',
            outDirBase,
            outDirOverride: join(outDirBase, 'override_a'),
            consoleDiagnostics: false,
        });
        const overrideB = await runScenario({
            scenarioPath: 'data/scenarios/regression/sarajevo_override_defense_bonus_050.json',
            outDirBase,
            outDirOverride: join(outDirBase, 'override_b'),
            consoleDiagnostics: false,
        });

        const finalSave = deserializeState(readFileSync(join(overrideA.outDir, 'final_save.json'), 'utf8'));

        expect(overrideA.final_state_hash).toBe(overrideB.final_state_hash);
        expect(overrideA.final_state_hash).not.toBe(base.final_state_hash);
        expect(finalSave.political.sarajevo_state?.siege_status).toBe('BESIEGED');
        expect(getSarajevoSiegeParams(finalSave).defense_bonus).toBe(0.5);
    }, 120_000);
});
