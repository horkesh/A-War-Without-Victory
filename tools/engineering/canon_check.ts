/**
 * Canon check: enforce code-canon gates with minimal assumptions.
 * - Runs determinism static scan test.
 * - Runs baseline regression only if baselines manifest exists.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

type Step = { name: string; args: string[] };
const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

if (!existsSync(tsxCli)) {
  throw new Error(`Missing tsx CLI at ${tsxCli}. Run npm install.`);
}

function runStep(step: Step): void {
  const result = spawnSync(process.execPath, [tsxCli, ...step.args], { stdio: 'inherit', shell: false });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

const steps: Step[] = [
  {
    name: 'determinism static scan',
    args: ['--test', 'tests/determinism_static_scan_r1_5.test.ts']
  }
];

const baselineManifest = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines', 'manifest.json');
const hasBaselines = existsSync(baselineManifest);

if (hasBaselines) {
  steps.push({
    name: 'baseline regression',
    args: ['tools/scenario_runner/run_baseline_regression.ts']
  });
} else {
  process.stdout.write('canon:check: baselines manifest missing; skipping baseline regression.\n');
}

for (const step of steps) {
  process.stdout.write(`canon:check: ${step.name}\n`);
  runStep(step);
}
