import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_13w.json');
const FULL_OUT = join(process.cwd(), '.tmp_continue_from_save_full');
const SPLIT_OUT = join(process.cwd(), '.tmp_continue_from_save_split');
const RESUME_OUT = join(process.cwd(), '.tmp_continue_from_save_resume');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('scenario continue-from-save equivalence', () => {
  it('matches uninterrupted final state when resuming from a canonical weekly save', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
      return;
    }

    await ensureRemoved(FULL_OUT);
    await ensureRemoved(SPLIT_OUT);
    await ensureRemoved(RESUME_OUT);
    await mkdir(FULL_OUT, { recursive: true });
    await mkdir(SPLIT_OUT, { recursive: true });
    await mkdir(RESUME_OUT, { recursive: true });

    try {
      const fullRun = await runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: FULL_OUT,
        consoleDiagnostics: false,
      });

      const segmentedRun = await runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: SPLIT_OUT,
        emitEvery: 4,
        consoleDiagnostics: false,
      });

      const resumeSave = segmentedRun.paths.weekly_saves?.[1];
      expect(resumeSave).toBeTruthy();

      const resumedRun = await runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: RESUME_OUT,
        resumeFromSavePath: resumeSave!,
        consoleDiagnostics: false,
      });

      const [fullFinal, resumedFinal, checkpoint, resumedInitial] = await Promise.all([
        readFile(fullRun.paths.final_save, 'utf8'),
        readFile(resumedRun.paths.final_save, 'utf8'),
        readFile(resumeSave!, 'utf8'),
        readFile(resumedRun.paths.initial_save, 'utf8'),
      ]);

      expect(resumedInitial).toBe(checkpoint);
      expect(resumedRun.final_state_hash).toBe(fullRun.final_state_hash);
      expect(resumedFinal).toBe(fullFinal);
    } finally {
      await ensureRemoved(FULL_OUT);
      await ensureRemoved(SPLIT_OUT);
      await ensureRemoved(RESUME_OUT);
    }
  }, 20_000);

  it('rejects an explicit resume week that disagrees with the save turn', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
      return;
    }

    await ensureRemoved(SPLIT_OUT);
    await ensureRemoved(RESUME_OUT);
    await mkdir(SPLIT_OUT, { recursive: true });
    await mkdir(RESUME_OUT, { recursive: true });

    try {
      const segmentedRun = await runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: SPLIT_OUT,
        emitEvery: 4,
        consoleDiagnostics: false,
      });
      const resumeSave = segmentedRun.paths.weekly_saves?.[0];
      expect(resumeSave).toBeTruthy();

      await expect(runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: RESUME_OUT,
        resumeFromSavePath: resumeSave!,
        resumeFromWeekIndex: 3,
        consoleDiagnostics: false,
      })).rejects.toThrow("resumeFromWeekIndex (3) must match resumed state's meta.turn (4)");
    } finally {
      await ensureRemoved(SPLIT_OUT);
      await ensureRemoved(RESUME_OUT);
    }
  }, 20_000);
});
