import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import {
  renderBalancedVitestConfig,
  runVitestChild,
} from '../../../tools/test/run_vitest_balanced.mjs';

test('runs an expected failing nested child without explicit receipt ownership', async () => {
  const root = process.cwd();
  const fixtureOutputRoot = process.env.AWWV_VITEST_FIXTURE_OUTPUT_ROOT;
  if (!fixtureOutputRoot) {
    throw new Error('AWWV_VITEST_FIXTURE_OUTPUT_ROOT is required for retained nested fixture output');
  }
  const generatedRoot = join(fixtureOutputRoot, 'nested-child');
  mkdirSync(generatedRoot, { recursive: true });
  const config = join(generatedRoot, 'nested.config.mjs');
  writeFileSync(
    config,
    renderBalancedVitestConfig([
      'tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts',
    ]).replace(
      '../../tools/test/discover_test_files.mjs',
      pathToFileURL(join(root, 'tools/test/discover_test_files.mjs')).href,
    ),
    'utf8',
  );
  const status = await runVitestChild(
    join(root, 'node_modules', 'vitest', 'vitest.mjs'),
    config,
    ['--reporter=dot', '--silent'],
    root,
  );
  expect(status).toBe(1);
}, 20_000);
