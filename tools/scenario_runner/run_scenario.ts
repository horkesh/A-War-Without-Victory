#!/usr/bin/env node
/**
 * Phase H1.1: Headless scenario harness CLI.
 * Run N weekly turns; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * Phase H1.2: Fails early if data prerequisites are missing (same remediation as sim:data:check).
 * --map: copy final_save.json to data/derived/latest_run_final_save.json and print tactical map instructions.
 * --video: emit weekly save artifacts and replay_timeline.json for tactical map replay/export.
 * --full-replay-save-sequence: emit replay_sequence.jsonl and replay_save_sequence.json full-state payloads.
 * --unique: append timestamp to run directory so each run creates a new folder (no overwrite).
 * --timing-json: emit timing.json with wall-clock benchmark buckets.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';
import { dumpBotOrdersPerfProfile } from '../../src/sim/combat/_perf_profile_bot_orders_node.js';
import { setEnablePhase3A } from '../../src/sim/pressure/phase3a_pressure_eligibility.js';
import { setEnablePhase3ADiffusion } from '../../src/sim/pressure/phase3a_pressure_diffusion.js';
import { setEnablePhase3B } from '../../src/sim/pressure/phase3b_pressure_exhaustion.js';
import { setEnablePhase3C } from '../../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import { setEnablePhase3D } from '../../src/sim/collapse/phase3d_collapse_resolution.js';

/**
 * Collapse-pipeline enable gate (DEFAULT OFF — matches the per-phase feature flags).
 *
 * The Phase 3A→3D pressure/collapse pipeline is gated entirely by the runtime
 * setEnablePhase3*() flags (all default false). The scenario runner has no other
 * enable surface, so this CLI honors a single env var `COLLAPSE_PIPELINE_ENABLE=true`
 * (or `=1`) that flips the WHOLE dependency chain on together — 3A eligibility (builds
 * the effective pressure edges), 3A diffusion, 3B exhaustion coupling (needs 3A edges),
 * 3C exhaustion→collapse gating (returns `phase3b_exhaustion_disabled` if 3B is off),
 * and 3D collapse resolution (returns `phase3c_eligibility_disabled` if 3C is off).
 *
 * §6: the genocide-rupture floor is protected at the engine level by Phase 3D's G1
 * enclave guard (isPhase3DEnclaveGuarded → all 9 ENCLAVE_DEFINITIONS OSIDs), not here.
 *
 * Determinism: the env var is read ONCE at process start (no per-turn read, no clock,
 * no RNG). When unset/false this is a strict no-op (the flags stay at their false
 * defaults) so a normal calibration run is byte-identical to before this change.
 */
function applyCollapsePipelineEnableFromEnv(): boolean {
  const raw = (process.env.COLLAPSE_PIPELINE_ENABLE ?? '').trim().toLowerCase();
  const enabled = raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes';
  if (!enabled) return false;
  setEnablePhase3A(true);
  setEnablePhase3ADiffusion(true);
  setEnablePhase3B(true);
  setEnablePhase3C(true);
  setEnablePhase3D(true);
  return true;
}

/** Default scenario when user asks to "run scenarios" without specifying one (historical 52w, full OOB). */
const DEFAULT_SCENARIO = 'data/scenarios/apr1992_historical_52w.json';

export async function copyFinalSaveToLatestRun(finalSavePath: string, repoRoot: string): Promise<string> {
  const derivedDir = join(repoRoot, 'data', 'derived');
  await mkdir(derivedDir, { recursive: true });
  const destPath = join(derivedDir, 'latest_run_final_save.json');
  await copyFile(finalSavePath, destPath);
  return destPath;
}

function parseArgs(): {
  scenario: string;
  weeks?: number;
  out: string;
  continueSave?: string;
  continueWeek?: number;
  postureAllPushAndApplyBreaches: boolean;
  map: boolean;
  video: boolean;
  fullReplaySaveSequence: boolean;
  unique: boolean;
  timingJson: boolean;
} {
  const args = process.argv.slice(2);
  let scenario = '';
  let weeks: number | undefined;
  let out = 'runs';
  let continueSave: string | undefined;
  let continueWeek: number | undefined;
  let postureAllPushAndApplyBreaches = false;
  let map = false;
  let video = false;
  let fullReplaySaveSequence = false;
  let unique = false;
  let timingJson = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scenario' && args[i + 1]) {
      scenario = args[++i];
    } else if (args[i] === '--weeks' && args[i + 1]) {
      weeks = parseInt(args[++i], 10);
    } else if (args[i] === '--out' && args[i + 1]) {
      out = args[++i];
    } else if (args[i] === '--continue-save' && args[i + 1]) {
      continueSave = args[++i];
    } else if (args[i] === '--continue-week' && args[i + 1]) {
      continueWeek = parseInt(args[++i], 10);
    } else if (args[i] === '--posture-all-push' || args[i] === '--all-attack') {
      postureAllPushAndApplyBreaches = true;
    } else if (args[i] === '--map') {
      map = true;
    } else if (args[i] === '--video') {
      video = true;
    } else if (args[i] === '--full-replay-save-sequence') {
      fullReplaySaveSequence = true;
    } else if (args[i] === '--unique') {
      unique = true;
    } else if (args[i] === '--timing-json') {
      timingJson = true;
    }
  }
  if (!scenario) {
    scenario = DEFAULT_SCENARIO;
  }
  return { scenario, weeks, out, continueSave, continueWeek, postureAllPushAndApplyBreaches, map, video, fullReplaySaveSequence, unique, timingJson };
}

async function main(): Promise<void> {
  const {
    scenario,
    weeks,
    out,
    continueSave,
    continueWeek,
    postureAllPushAndApplyBreaches,
    map: enableMap,
    video,
    fullReplaySaveSequence,
    unique,
    timingJson,
  } = parseArgs();

  const prereqResult = checkDataPrereqs();
  if (!prereqResult.ok) {
    process.stderr.write(formatMissingRemediation(prereqResult));
    process.exitCode = 1;
    return;
  }

  const collapseEnabled = applyCollapsePipelineEnableFromEnv();
  if (collapseEnabled) {
    process.stdout.write('collapse_pipeline: ENABLED (3A+3A-diffusion+3B+3C+3D via COLLAPSE_PIPELINE_ENABLE)\n');
  }

  const result = await runScenario({
    scenarioPath: scenario,
    outDirBase: out,
    weeksOverride: weeks,
    resumeFromSavePath: continueSave,
    resumeFromWeekIndex: continueWeek,
    postureAllPushAndApplyBreaches,
    emitWeeklySavesForVideo: video,
    replayPayloadMode: fullReplaySaveSequence ? 'full' : 'manifest_only',
    uniqueRunFolder: unique,
    emitTimingJson: timingJson
  });
  process.stdout.write(`outDir: ${result.outDir}\n`);
  process.stdout.write(`paths: ${result.paths.initial_save}\n`);
  process.stdout.write(`       ${result.paths.final_save}\n`);
  process.stdout.write(`       ${result.paths.weekly_report}\n`);
  if (result.paths.replay) process.stdout.write(`       ${result.paths.replay}\n`);
  process.stdout.write(`       ${result.paths.run_summary}\n`);
  process.stdout.write(`       ${result.paths.control_delta}\n`);
  process.stdout.write(`       ${result.paths.end_report}\n`);
  process.stdout.write(`       ${result.paths.activity_summary}\n`);
  process.stdout.write(`       ${result.paths.formation_delta}\n`);
  if (result.paths.timing_json) {
    process.stdout.write(`       ${result.paths.timing_json}\n`);
  }
  if (result.paths.replay_timeline) {
    process.stdout.write(`       ${result.paths.replay_timeline}\n`);
  }
  if (result.paths.weekly_saves && result.paths.weekly_saves.length > 0) {
    for (const p of result.paths.weekly_saves) {
      process.stdout.write(`       ${p}\n`);
    }
  }
  process.stdout.write(`final_state_hash: ${result.final_state_hash}\n`);
  const botOrdersPerfPath = dumpBotOrdersPerfProfile();
  if (botOrdersPerfPath) {
    process.stdout.write(`bot_orders_perf_profile: ${botOrdersPerfPath}\n`);
  }

  if (enableMap) {
    await copyFinalSaveToLatestRun(result.paths.final_save, process.cwd());
    process.stdout.write('\n--- Tactical map viewer ---\n');
    process.stdout.write('Final state copied to: data/derived/latest_run_final_save.json\n');
    process.stdout.write('To view on map:\n');
    process.stdout.write('  1) npm run dev:map\n');
    process.stdout.write('  2) Open http://localhost:3001/map_hoi.html\n');
    process.stdout.write('  3) In "Dataset" choose "Latest run" or use "Load state file" and select the file above.\n');
    if (video && result.paths.replay_timeline) {
      process.stdout.write(`  4) Click "Load replay..." and choose: ${result.paths.replay_timeline}\n`);
    }
    process.stdout.write('---\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    const withRunDir = err as Error & { run_id?: string; out_dir?: string };
    if (withRunDir?.out_dir) {
      process.stderr.write(`Run failed. See ${withRunDir.out_dir}/failure_report.txt\n`);
    } else {
      console.error('run_scenario failed', err);
    }
    process.exitCode = 1;
  });
}
