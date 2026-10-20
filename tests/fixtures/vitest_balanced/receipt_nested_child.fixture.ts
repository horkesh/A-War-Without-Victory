import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import {
  renderBalancedVitestConfig,
  runVitestChild,
} from '../../../tools/test/run_vitest_balanced.mjs';

test('runs an expected failing nested child without explicit receipt ownership', async () => {
  const root = process.cwd();
  const generatedRoot = join(root, '.tmp_vitest_balanced_test', `nested-${process.pid}`);
  mkdirSync(generatedRoot, { recursive: true });
  const config = join(generatedRoot, 'nested.config.mjs');
  writeFileSync(config, renderBalancedVitestConfig([
    'tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts',
  ]), 'utf8');
  const status = await runVitestChild(
    join(root, 'node_modules', 'vitest', 'vitest.mjs'),
    config,
    ['--reporter=dot', '--silent'],
    root,
  );
  expect(status).toBe(1);
}, 20_000);
