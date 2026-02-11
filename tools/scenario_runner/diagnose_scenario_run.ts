#!/usr/bin/env node
/**
 * Phase H1.5.1: Diagnose scenario run — runs a short scenario and reports outDir and emitted files.
 * No bash required; prereq check first; on failure prints path to failure_report.txt.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';


const DEFAULT_SCENARIO = 'data/scenarios/noop_4w.json';
const OUT_DIR_BASE = 'runs';

function parseArgs(): { scenarioPath: string } {
  const args = process.argv.slice(2);
  let scenarioPath = DEFAULT_SCENARIO;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenarioPath = args[++i];
      break;
    }
  }
  return { scenarioPath };
}

async function main(): Promise<void> {
  const { scenarioPath } = parseArgs();

  const prereqResult = checkDataPrereqs();
  if (!prereqResult.ok) {
    process.stderr.write(formatMissingRemediation(prereqResult));
    process.exit(1);
  }

  try {
    const result = await runScenario({
      scenarioPath,
      outDirBase: OUT_DIR_BASE
    });
    process.stdout.write(`outDir: ${result.outDir}\n`);
    const names = await readdir(result.outDir);
    names.sort((a, b) => a.localeCompare(b));
    process.stdout.write(`files: ${names.join(', ')}\n`);
  } catch (err: unknown) {
    const withRunDir = err as Error & { run_id?: string; out_dir?: string };
    if (withRunDir?.out_dir) {
      process.stderr.write(`Run failed. See ${withRunDir.out_dir}/failure_report.txt\n`);
    } else {
      console.error('diagnose_scenario_run failed', err);
    }
    process.exit(1);
  }
}

main();
