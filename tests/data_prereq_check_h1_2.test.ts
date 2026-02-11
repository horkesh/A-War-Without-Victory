/**
 * Phase H1.2: Data prerequisites checker tests.
 * (A) When required files exist: checkDataPrereqs().ok === true
 * (B) When a required file is absent: ok === false and includes expected prereq_id
 * Uses baseDir override to avoid depending on real repo files.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { checkDataPrereqs, formatMissingRemediation } from '../src/data_prereq/check_data_prereqs.js';

const TMP_BASE = join(process.cwd(), '.tmp_data_prereq_h1_2');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('data prereq check: when all required files exist, ok is true', async () => {
  const baseDir = join(TMP_BASE, 'all_present');
  await ensureRemoved(baseDir);

  await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
  await mkdir(join(baseDir, 'data', 'derived'), { recursive: true });
  await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');
  await writeFile(join(baseDir, 'data/derived/settlements_index.json'), '{}', 'utf8');
  await writeFile(join(baseDir, 'data/derived/settlement_edges.json'), '{}', 'utf8');

  const result = checkDataPrereqs({ baseDir });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.missing.length, 0);

  await ensureRemoved(baseDir);
});

test('data prereq check: when controller mapping is absent, returns prereq_id municipality_controller_mapping', async () => {
  const baseDir = join(TMP_BASE, 'missing_controller');
  await ensureRemoved(baseDir);

  await mkdir(join(baseDir, 'data', 'derived'), { recursive: true });
  await writeFile(join(baseDir, 'data/derived/settlements_index.json'), '{}', 'utf8');
  await writeFile(join(baseDir, 'data/derived/settlement_edges.json'), '{}', 'utf8');
  // Do not create data/source/municipality_political_controllers.json

  const result = checkDataPrereqs({ baseDir });
  assert.strictEqual(result.ok, false);
  const controllerMissing = result.missing.find((m) => m.prereq_id === 'municipality_controller_mapping');
  assert(controllerMissing, 'missing should include municipality_controller_mapping');
  assert(controllerMissing!.missing_paths.includes('data/source/municipality_political_controllers.json'));

  await ensureRemoved(baseDir);
});

test('data prereq check: when settlement graph files are absent, returns prereq_id settlement_graph', async () => {
  const baseDir = join(TMP_BASE, 'missing_graph');
  await ensureRemoved(baseDir);

  await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
  await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');
  // Do not create settlements_index.json or settlement_edges.json

  const result = checkDataPrereqs({ baseDir });
  assert.strictEqual(result.ok, false);
  const graphMissing = result.missing.find((m) => m.prereq_id === 'settlement_graph');
  assert(graphMissing, 'missing should include settlement_graph');
  assert(graphMissing!.missing_paths.includes('data/derived/settlements_index.json'));
  assert(graphMissing!.missing_paths.includes('data/derived/settlement_edges.json'));
  assert.strictEqual(graphMissing!.missing_paths.length, 2);

  await ensureRemoved(baseDir);
});

test('data prereq formatMissingRemediation includes To fix and commands', async () => {
  const baseDir = join(TMP_BASE, 'format_test');
  await ensureRemoved(baseDir);
  await mkdir(join(baseDir, 'data', 'source'), { recursive: true });
  await writeFile(join(baseDir, 'data/source/municipality_political_controllers.json'), '{}', 'utf8');

  const result = checkDataPrereqs({ baseDir });
  assert.strictEqual(result.ok, false);
  const formatted = formatMissingRemediation(result);
  assert(formatted.includes('MISSING DATA PREREQUISITES:'));
  assert(formatted.includes('To fix:'));
  assert(formatted.includes('npm run map:build'));

  await ensureRemoved(baseDir);
});
