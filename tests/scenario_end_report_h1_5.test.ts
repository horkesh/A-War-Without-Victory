import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_end_report_h1_5');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('scenario end report h1.5', () => {
  it('writes the end-of-run report artifacts', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
      return;
    }

    await ensureRemoved(BASE_OUT);
    await mkdir(BASE_OUT, { recursive: true });

    try {
      const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT, consoleDiagnostics: false });

      expect(existsSync(result.paths.initial_save)).toBe(true);
      expect(existsSync(result.paths.final_save)).toBe(true);
      expect(existsSync(result.paths.control_delta)).toBe(true);
      expect(existsSync(result.paths.end_report)).toBe(true);
    } finally {
      await ensureRemoved(BASE_OUT);
    }
  }, 20_000);

  it('keeps control_delta.json stable and ordered', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
      return;
    }

    await ensureRemoved(BASE_OUT);
    await mkdir(BASE_OUT, { recursive: true });

    try {
      const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT, consoleDiagnostics: false });
      const raw = await readFile(result.paths.control_delta, 'utf8');
      const delta = JSON.parse(raw) as {
        total_flips?: number;
        flips?: unknown[];
        flips_by_direction?: Array<{ from: string | null; to: string | null; count: number }>;
        flips_by_municipality?: Array<{ municipality_id: string | null; count: number }>;
        net_control_counts_before?: unknown[];
        net_control_counts_after?: unknown[];
        net_control_count_delta?: unknown[];
      };

      expect(typeof delta.total_flips).toBe('number');
      expect(Array.isArray(delta.flips)).toBe(true);
      expect(Array.isArray(delta.flips_by_direction)).toBe(true);
      expect(Array.isArray(delta.flips_by_municipality)).toBe(true);
      expect(Array.isArray(delta.net_control_counts_before)).toBe(true);
      expect(Array.isArray(delta.net_control_counts_after)).toBe(true);
      expect(Array.isArray(delta.net_control_count_delta)).toBe(true);

      for (let i = 1; i < (delta.flips_by_municipality?.length ?? 0); i += 1) {
        const a = delta.flips_by_municipality![i - 1];
        const b = delta.flips_by_municipality![i];
        expect(b.count <= a.count).toBe(true);
        if (b.count === a.count) {
          const aid = a.municipality_id ?? 'null';
          const bid = b.municipality_id ?? 'null';
          expect(aid.localeCompare(bid) <= 0).toBe(true);
        }
      }

      for (let i = 1; i < (delta.flips_by_direction?.length ?? 0); i += 1) {
        const a = delta.flips_by_direction![i - 1];
        const b = delta.flips_by_direction![i];
        const aKey = `${a.from ?? 'null'}\t${a.to ?? 'null'}`;
        const bKey = `${b.from ?? 'null'}\t${b.to ?? 'null'}`;
        expect(aKey <= bKey).toBe(true);
      }
    } finally {
      await ensureRemoved(BASE_OUT);
    }
  }, 20_000);
});
