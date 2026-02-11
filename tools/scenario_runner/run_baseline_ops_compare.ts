#!/usr/bin/env node
/**
 * Phase H1.9: Noop vs baseline_ops comparator CLI.
 * Runs noop_52w and baseline_ops_52w, writes ops_compare.json and ops_compare.md.
 */


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runOpsCompare } from '../../src/scenario/scenario_runner.js';
import { join } from 'node:path';


const DEFAULT_OUT = join(process.cwd(), 'runs_ops_compare');
const DEFAULT_NOOP = join(process.cwd(), 'data', 'scenarios', 'noop_52w.json');
const DEFAULT_OPS = join(process.cwd(), 'data', 'scenarios', 'baseline_ops_52w.json');

function parseArgs(): { out: string; noop: string; ops: string } {
  const args = process.argv.slice(2);
  let out = DEFAULT_OUT;
  let noop = DEFAULT_NOOP;
  let ops = DEFAULT_OPS;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      out = args[++i].startsWith('/') || /^[A-Za-z]:/.test(args[i]) ? args[i] : join(process.cwd(), args[i]);
    } else if (args[i] === '--noop' && args[i + 1]) {
      noop = args[++i].startsWith('/') || /^[A-Za-z]:/.test(args[i]) ? args[i] : join(process.cwd(), args[i]);
    } else if (args[i] === '--ops' && args[i + 1]) {
      ops = args[++i].startsWith('/') || /^[A-Za-z]:/.test(args[i]) ? args[i] : join(process.cwd(), args[i]);
    }
  }
  return { out, noop, ops };
}

async function main(): Promise<void> {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    process.stderr.write(formatMissingRemediation(prereq));
    process.exit(1);
  }

  const { out, noop, ops } = parseArgs();
  const result = await runOpsCompare({ outDirBase: out, noopScenarioPath: noop, opsScenarioPath: ops });

  process.stdout.write(`noop: ${result.noopOutDir}\n`);
  process.stdout.write(`ops: ${result.opsOutDir}\n`);
  process.stdout.write(`ops_compare.json: ${result.paths.ops_compare_json}\n`);
  process.stdout.write(`ops_compare.md: ${result.paths.ops_compare_md}\n`);
  for (const c of result.compareResult.conclusion) {
    process.stdout.write(`conclusion: ${c}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
