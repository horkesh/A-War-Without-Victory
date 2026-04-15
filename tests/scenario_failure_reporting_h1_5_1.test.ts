import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_failure_h1_5_1');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('scenario failure reporting h1.5.1', () => {
  it('writes run_meta.json and failure_report.* after an early controlled crash', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
      return;
    }

    await ensureRemoved(BASE_OUT);

    const controlledMessage = 'controlled failure h1_5_1';
    try {
      await runScenario({
        scenarioPath: SCENARIO_PATH,
        outDirBase: BASE_OUT,
        injectFailureAfterRunMeta: () => {
          throw new Error(controlledMessage);
        },
        consoleDiagnostics: false,
      });
      throw new Error('runScenario should throw');
    } catch (err) {
      expect(err && (err as Error & { out_dir?: string }).out_dir).toBeTruthy();
      const e = err as Error & { out_dir: string; run_id?: string };
      const outDir = e.out_dir;

      expect(e.run_id?.includes('noop_4w')).toBe(true);

      const runMetaPath = join(outDir, 'run_meta.json');
      const failureTxtPath = join(outDir, 'failure_report.txt');
      const failureJsonPath = join(outDir, 'failure_report.json');

      expect(existsSync(runMetaPath)).toBe(true);
      expect(existsSync(failureTxtPath)).toBe(true);
      expect(existsSync(failureJsonPath)).toBe(true);

      const runMeta = JSON.parse(await readFile(runMetaPath, 'utf8')) as {
        scenario_id: string;
        run_id: string;
        weeks: number;
        scenario_path: string;
        out_dir: string;
      };
      expect(runMeta.scenario_id).toBe('noop_4w');
      expect(runMeta.weeks).toBe(4);
      expect(runMeta.run_id.length > 0).toBe(true);

      const txt = await readFile(failureTxtPath, 'utf8');
      expect(txt.includes('SCENARIO RUN FAILED')).toBe(true);
      expect(txt.includes(runMeta.run_id)).toBe(true);
      expect(txt.includes(controlledMessage)).toBe(true);
      expect(txt.includes('timestamp')).toBe(false);
      expect(/\d{4}-\d{2}-\d{2}T/.test(txt)).toBe(false);

      const failureJson = JSON.parse(await readFile(failureJsonPath, 'utf8')) as {
        run_id: string;
        scenario_id: string;
        weeks: number;
        error_name: string;
        error_message: string;
        stack: string | null;
      };
      expect(failureJson.scenario_id).toBe('noop_4w');
      expect(failureJson.error_message.includes(controlledMessage)).toBe(true);
      if (e.run_id) {
        expect(failureJson.run_id).toBe(e.run_id);
      }
    } finally {
      await ensureRemoved(BASE_OUT);
    }
  }, 20_000);
});
