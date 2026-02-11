#!/usr/bin/env node
/**
 * Run phase0_full_progression scenario multiple times for determinism verification.
 * Each run goes to a separate output dir. Compares final_state_hash across runs.
 */

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';

const SCENARIO_PATH = 'data/scenarios/phase0_full_progression_52w.json';
const REPEAT_COUNT = 3;
const OUT_BASE = 'runs/phase0_full_progression_repeat';

async function main(): Promise<void> {
  const prereqResult = checkDataPrereqs();
  if (!prereqResult.ok) {
    process.stderr.write(formatMissingRemediation(prereqResult));
    process.exitCode = 1;
    return;
  }

  const hashes: string[] = [];
  for (let i = 0; i < REPEAT_COUNT; i++) {
    const outDir = `${OUT_BASE}/run_${i + 1}`;
    const result = await runScenario({
      scenarioPath: SCENARIO_PATH,
      outDirBase: 'runs',
      outDirOverride: outDir,
      postureAllPushAndApplyBreaches: true
    });
    hashes.push(result.final_state_hash);
    process.stdout.write(`Run ${i + 1}: ${result.run_id}, hash=${result.final_state_hash}, outDir=${result.outDir}\n`);
  }

  const allSame = hashes.every((h) => h === hashes[0]);
  if (allSame) {
    process.stdout.write(`\nDeterminism OK: all ${REPEAT_COUNT} runs produced identical final_state_hash.\n`);
  } else {
    process.stderr.write(`\nDeterminism FAIL: hashes differ: ${hashes.join(', ')}\n`);
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error('run_phase0_repeat failed', err);
  process.exitCode = 1;
});
