#!/usr/bin/env node
/**
 * Phase H1.1: Headless scenario harness CLI.
 * Run N weekly turns; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * Phase H1.2: Fails early if data prerequisites are missing (same remediation as sim:data:check).
 * --map: copy final_save.json to data/derived/latest_run_final_save.json and print tactical map instructions.
 * --video: emit weekly save artifacts and replay_timeline.json for tactical map replay/export.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';


function parseArgs(): {
  scenario: string;
  weeks?: number;
  out: string;
  postureAllPushAndApplyBreaches: boolean;
  map: boolean;
  video: boolean;
} {
  const args = process.argv.slice(2);
  let scenario = '';
  let weeks: number | undefined;
  let out = 'runs';
  let postureAllPushAndApplyBreaches = false;
  let map = false;
  let video = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[++i];
    } else if (args[i] === '--weeks' && args[i + 1]) {
      weeks = parseInt(args[++i], 10);
    } else if (args[i] === '--out' && args[i + 1]) {
      out = args[++i];
    } else if (args[i] === '--posture-all-push' || args[i] === '--all-attack') {
      postureAllPushAndApplyBreaches = true;
    } else if (args[i] === '--map') {
      map = true;
    } else if (args[i] === '--video') {
      video = true;
    }
  }
  if (!scenario) {
    process.stderr.write(
      'Usage: run_scenario.ts --scenario <path> [--weeks <n>] [--out <dir>] [--posture-all-push] [--map] [--video]\n'
    );
    process.exit(1);
  }
  return { scenario, weeks, out, postureAllPushAndApplyBreaches, map, video };
}

async function main(): Promise<void> {
  const { scenario, weeks, out, postureAllPushAndApplyBreaches, map: enableMap, video } = parseArgs();

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
    postureAllPushAndApplyBreaches,
    emitWeeklySavesForVideo: video
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
  if (result.paths.replay_timeline) {
    process.stdout.write(`       ${result.paths.replay_timeline}\n`);
  }
  if (result.paths.weekly_saves && result.paths.weekly_saves.length > 0) {
    for (const p of result.paths.weekly_saves) {
      process.stdout.write(`       ${p}\n`);
    }
  }
  process.stdout.write(`final_state_hash: ${result.final_state_hash}\n`);

  if (enableMap) {
    const derivedDir = join(process.cwd(), 'data', 'derived');
    await mkdir(derivedDir, { recursive: true });
    const destPath = join(derivedDir, 'latest_run_final_save.json');
    await copyFile(result.paths.final_save, destPath);
    process.stdout.write('\n--- Tactical map viewer ---\n');
    process.stdout.write('Final state copied to: data/derived/latest_run_final_save.json\n');
    process.stdout.write('To view on map:\n');
    process.stdout.write('  1) npm run dev:map\n');
    process.stdout.write('  2) Open http://localhost:3001/tactical_map.html\n');
    process.stdout.write('  3) In "Dataset" choose "Latest run" or use "Load state file" and select the file above.\n');
    if (video && result.paths.replay_timeline) {
      process.stdout.write(`  4) Click "Load replay..." and choose: ${result.paths.replay_timeline}\n`);
    }
    process.stdout.write('---\n');
  }
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
