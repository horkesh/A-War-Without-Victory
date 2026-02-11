#!/usr/bin/env node
/**
 * Phase H1.1: Headless scenario harness CLI.
 * Run N weekly turns; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * Phase H1.2: Fails early if data prerequisites are missing (same remediation as sim:data:check).
 */


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';


function parseArgs(): { scenario: string; weeks?: number; out: string; postureAllPushAndApplyBreaches: boolean } {
  const args = process.argv.slice(2);
  let scenario = '';
  let weeks: number | undefined;
  let out = 'runs';
  let postureAllPushAndApplyBreaches = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[++i];
    } else if (args[i] === '--weeks' && args[i + 1]) {
      weeks = parseInt(args[++i], 10);
    } else if (args[i] === '--out' && args[i + 1]) {
      out = args[++i];
    } else if (args[i] === '--posture-all-push' || args[i] === '--all-attack') {
      postureAllPushAndApplyBreaches = true;
    }
  }
  if (!scenario) {
    process.stderr.write(
      'Usage: run_scenario.ts --scenario <path> [--weeks <n>] [--out <dir>] [--posture-all-push]\n'
    );
    process.exit(1);
  }
  return { scenario, weeks, out, postureAllPushAndApplyBreaches };
}

async function main(): Promise<void> {
  const { scenario, weeks, out, postureAllPushAndApplyBreaches } = parseArgs();

  const prereqResult = checkDataPrereqs();
  if (!prereqResult.ok) {
    process.stderr.write(formatMissingRemediation(prereqResult));
    process.exitCode = 1;
    return;
  }

  const result = await runScenario({
    scenarioPath: scenario,
    outDirBase: out,
    weeksOverride: weeks,
    postureAllPushAndApplyBreaches
  });
  process.stdout.write(`outDir: ${result.outDir}\n`);
  process.stdout.write(`paths: ${result.paths.initial_save}\n`);
  process.stdout.write(`       ${result.paths.final_save}\n`);
  process.stdout.write(`       ${result.paths.weekly_report}\n`);
  process.stdout.write(`       ${result.paths.replay}\n`);
  process.stdout.write(`       ${result.paths.run_summary}\n`);
  process.stdout.write(`       ${result.paths.control_delta}\n`);
  process.stdout.write(`       ${result.paths.end_report}\n`);
  process.stdout.write(`       ${result.paths.activity_summary}\n`);
  process.stdout.write(`       ${result.paths.control_events}\n`);
  process.stdout.write(`       ${result.paths.formation_delta}\n`);
  process.stdout.write(`final_state_hash: ${result.final_state_hash}\n`);
}

main().catch((err: unknown) => {
  const withRunDir = err as Error & { run_id?: string; out_dir?: string };
  if (withRunDir?.out_dir) {
    process.stderr.write(`Run failed. See ${withRunDir.out_dir}/failure_report.txt\n`);
  } else {
    console.error('run_scenario failed', err);
  }
  process.exitCode = 1;
});
