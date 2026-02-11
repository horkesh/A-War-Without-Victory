#!/usr/bin/env node
/**
 * Phase H1.8: One-bit intent probe comparator CLI.
 * Runs baseline (probe_intent stripped) and probe (honor probe_intent), writes probe_compare.json and probe_compare.md.
 */


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runProbeCompare } from '../../src/scenario/scenario_runner.js';
import { join } from 'node:path';


const DEFAULT_SCENARIO = join(process.cwd(), 'data', 'scenarios', 'noop_52w_probe_intent.json');
const DEFAULT_OUT = join(process.cwd(), 'runs_probe');

function parseArgs(): { scenario: string; out: string } {
  const args = process.argv.slice(2);
  let scenario = DEFAULT_SCENARIO;
  let out = DEFAULT_OUT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[++i].startsWith('/') || /^[A-Za-z]:/.test(args[i]) ? args[i] : join(process.cwd(), args[i]);
    } else if (args[i] === '--out' && args[i + 1]) {
      out = args[++i].startsWith('/') || /^[A-Za-z]:/.test(args[i]) ? args[i] : join(process.cwd(), args[i]);
    }
  }
  return { scenario, out };
}

async function main(): Promise<void> {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    process.stderr.write(formatMissingRemediation(prereq));
    process.exit(1);
  }

  const { scenario, out } = parseArgs();
  const result = await runProbeCompare({ scenarioPath: scenario, outDirBase: out });

  process.stdout.write(`baseline: ${result.baselineOutDir}\n`);
  process.stdout.write(`probe: ${result.probeOutDir}\n`);
  process.stdout.write(`probe_compare.json: ${result.paths.probe_compare_json}\n`);
  process.stdout.write(`probe_compare.md: ${result.paths.probe_compare_md}\n`);
  for (const c of result.compareResult.conclusion) {
    process.stdout.write(`conclusion: ${c}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
