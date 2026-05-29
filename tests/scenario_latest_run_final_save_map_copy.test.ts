import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { copyFinalSaveToLatestRun } from '../tools/scenario_runner/run_scenario.js';

describe('scenario runner latest-run final-save map copy', () => {
  it('copies final_save.json bytes into a temp repo root latest_run_final_save.json', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'awwv-latest-run-final-save-'));
    try {
      const sourcePath = join(repoRoot, 'final_save.json');
      const sourceBytes = Buffer.from('{"meta":{"turn":40},"payload":["bytes preserved"]}\n', 'utf8');
      await writeFile(sourcePath, sourceBytes);

      const destPath = await copyFinalSaveToLatestRun(sourcePath, repoRoot);
      const copiedBytes = await readFile(destPath);

      expect(destPath).toBe(join(repoRoot, 'data', 'derived', 'latest_run_final_save.json'));
      expect(copiedBytes.equals(sourceBytes)).toBe(true);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
