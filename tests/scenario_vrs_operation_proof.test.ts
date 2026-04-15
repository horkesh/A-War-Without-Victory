import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_A = join(process.cwd(), '.tmp_scenario_vrs_operation_proof_a');
const BASE_B = join(process.cwd(), '.tmp_scenario_vrs_operation_proof_b');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_vrs_operation_proof_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

type ProofRunSummary = {
    phase_ii_attack_resolution?: {
        orders_by_faction?: Record<string, number>;
        orders_processed?: number;
        weeks_with_orders?: number;
    };
};

type ProofOperationAar = {
    faction?: string;
    total_attacks?: number;
    objectives_captured?: string[];
};

function getProgressedOperationAars(aars: ProofOperationAar[]): ProofOperationAar[] {
    return aars.filter((aar) =>
        aar.faction === 'RS'
        && (aar.total_attacks ?? 0) > 0
        && (aar.objectives_captured?.length ?? 0) > 0
    );
}

test('proof scenario: VRS operation produces combat, progress, and deterministic final state', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);

    const resultA = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_A });
    const resultB = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_B });

    const runSummary = JSON.parse(await readFile(resultA.paths.run_summary, 'utf8')) as ProofRunSummary;
    const operationAarsA = JSON.parse(await readFile(resultA.paths.operation_aars, 'utf8')) as ProofOperationAar[];
    const finalSaveA = await readFile(resultA.paths.final_save, 'utf8');
    const finalSaveB = await readFile(resultB.paths.final_save, 'utf8');

    assert.ok((runSummary.phase_ii_attack_resolution?.orders_by_faction?.RS ?? 0) > 0, 'proof scenario should emit RS attack orders');
    assert.ok((runSummary.phase_ii_attack_resolution?.orders_processed ?? 0) > 0, 'proof scenario should resolve at least one attack order');
    assert.ok((runSummary.phase_ii_attack_resolution?.weeks_with_orders ?? 0) > 0, 'proof scenario should have at least one combat week');

    const progressedOperations = getProgressedOperationAars(operationAarsA);
    assert.ok(progressedOperations.length > 0, 'at least one VRS operation AAR should record both attacks and captured objectives');

    assert.strictEqual(finalSaveA, finalSaveB, 'proof scenario final_save.json must be byte-identical across two runs');

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);
}, 30_000);
