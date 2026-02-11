/**
 * Canon check: enforce code-canon gates with minimal assumptions.
 * - Runs determinism static scan test.
 * - Runs baseline regression only if baselines manifest exists.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';




type Step = { name: string; cmd: string; args: string[] };

function runStep(step: Step): void {
  const result = spawnSync(step.cmd, step.args, { stdio: 'inherit' });
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
    cmd: 'npx',
    args: ['tsx', '--test', 'tests/determinism_static_scan_r1_5.test.ts']
  }
];

const baselineManifest = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines', 'manifest.json');
const hasBaselines = existsSync(baselineManifest);

if (hasBaselines) {
  steps.push({
    name: 'baseline regression',
    cmd: 'npx',
    args: ['tsx', 'tools/scenario_runner/run_baseline_regression.ts']
  });
} else {
  process.stdout.write('canon:check: baselines manifest missing; skipping baseline regression.\n');
}

for (const step of steps) {
  process.stdout.write(`canon:check: ${step.name}\n`);
  runStep(step);
}
