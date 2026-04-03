#!/usr/bin/env node
/**
 * Phase H1.3: Scenario harness preflight wrapper (check-only, no generation).
 * 1) Runs Phase H1.2 data prerequisites check.
 * 2) If OK, runs Phase H1.1 scenario harness with same args (pass-through).
 * 3) If NOT OK, exits non-zero with same remediation text.
 * Does not generate files; does not modify harness behavior; preserves exit codes.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';


const prereqResult = checkDataPrereqs();
if (!prereqResult.ok) {
  process.stderr.write(formatMissingRemediation(prereqResult));
  process.exit(1);
}

const args = process.argv.slice(2);
const repoRoot = process.cwd();
const child = spawn(
  process.execPath,
  [join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(repoRoot, 'tools', 'scenario_runner', 'run_scenario.ts'), ...args],
  {
    stdio: 'inherit',
    cwd: repoRoot
  }
);

child.on('error', (err) => {
  console.error('run_scenario_with_preflight: harness spawn failed', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
