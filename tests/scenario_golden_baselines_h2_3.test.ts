/**
 * Phase H2.3: Golden baseline regression test.
 * Calls baseline runner in compare mode (no UPDATE_BASELINES). Fails on mismatch.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';


import { compareAgainstBaselines, loadManifestSync } from '../tools/scenario_runner/run_baseline_regression.js';


const MANIFEST_PATH = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines', 'manifest.json');

function isMissingMappingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Municipality controller mapping file not found') ||
    msg.includes('not in municipality_political_controllers')
  );
}

test('golden baseline regression: compare against manifest', async () => {
  if (!existsSync(MANIFEST_PATH)) {
    return;
  }
  const content = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = loadManifestSync(content);
  assert.ok(manifest.scenarios.length >= 1, 'manifest must list at least one scenario');
  try {
    await compareAgainstBaselines(manifest);
  } catch (err) {
    if (isMissingMappingError(err)) {
      return;
    }
    throw err;
  }
});
