import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { VITEST_ALIASED_PACKAGES, VITEST_SETUP_FILE } from '../tools/test/vitest_shared_config.mjs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  aggregateChildStatuses,
  buildWorkerPlans,
  deterministicShardValues,
  filterInventoryByPattern,
  partitionInventory,
  renderBalancedVitestConfig,
  runBalancedVitest,
  runVitestChild,
} from '../tools/test/run_vitest_balanced.mjs';

const root = process.cwd();
const retainedRunsRoot = join(
  root,
  'tmp/player-bot-capability-parity-20261024/suite-scratch-repair/runs',
);
mkdirSync(retainedRunsRoot, { recursive: true });
const fixtureOutputRoot = join(
  retainedRunsRoot,
  `run-vitest-balanced-${process.pid}-${randomUUID()}`,
);
mkdirSync(fixtureOutputRoot);

function renderRetainedVitestConfig(files: string[]): string {
  return renderBalancedVitestConfig(files).replace(
    '../../tools/test/discover_test_files.mjs',
    pathToFileURL(join(root, 'tools/test/discover_test_files.mjs')).href,
  );
}

describe('balanced Vitest execution plan', () => {
  const inventory = [
    { file: 'tests/slow.test.ts', durationMs: 100, serial: false, reasons: [] },
    { file: 'tests/shared.test.ts', durationMs: 90, serial: true, reasons: ['tracked-derived-write'] },
    { file: 'tests/b.test.ts', durationMs: 40, serial: false, reasons: [] },
    { file: 'tests/a.test.ts', durationMs: 40, serial: false, reasons: [] },
    {
      file: 'tests/sector_partition_buildCorpsFrontSectors_integration.test.ts',
      durationMs: 2000,
      serial: true,
      reasons: ['environment-mutation'],
    },
  ];

  it('keeps hazardous files serial and assigns every safe file exactly once', () => {
    const plan = partitionInventory(inventory, 2);
    expect(plan.serialFiles).toEqual(['tests/shared.test.ts']);
    expect(plan.partitionedFiles).toEqual([
      'tests/sector_partition_buildCorpsFrontSectors_integration.test.ts',
    ]);
    expect(plan.parallelShards.flatMap((shard) => shard.files).sort()).toEqual([
      'tests/a.test.ts',
      'tests/b.test.ts',
      'tests/slow.test.ts',
    ]);
  });

  it('partitions the complete deterministic value range without gaps or overlap', () => {
    const partitions = Array.from({ length: 4 }, (_, index) =>
      deterministicShardValues(100, index, 4));
    expect(partitions.flat().sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, index) => index),
    );
    expect(new Set(partitions.flat()).size).toBe(100);
    expect(() => deterministicShardValues(100, 4, 4)).toThrow(/shard index/);
  });

  it('never starts more concurrent workers than the requested shard count', () => {
    const plan = partitionInventory(inventory, 2);
    const workers = buildWorkerPlans(plan, 2);
    expect(workers).toHaveLength(2);
    expect(workers.map((worker) => worker.shardIndex)).toEqual([0, 1]);
    expect(workers.every((worker) => worker.files.includes(
      'tests/sector_partition_buildCorpsFrontSectors_integration.test.ts',
    ))).toBe(true);
    expect(workers.flatMap((worker) => worker.files).filter((file) => file === 'tests/slow.test.ts'))
      .toHaveLength(1);
  });

  it('is stable when discovery order changes', () => {
    expect(partitionInventory([...inventory].reverse(), 2)).toEqual(partitionInventory(inventory, 2));
  });

  it('propagates aggregate child status', () => {
    expect(aggregateChildStatuses([0, 1, 0])).toBe(1);
    expect(aggregateChildStatuses([0, 0])).toBe(0);
    expect(() => aggregateChildStatuses([])).toThrow(/at least one child/);
  });

  it('propagates a deliberately failing real Vitest child', async () => {
    const generatedRoot = join(fixtureOutputRoot, 'deliberate-failure');
    const configPath = join(generatedRoot, 'deliberate-failure.config.mjs');
    mkdirSync(generatedRoot, { recursive: true });
    writeFileSync(configPath, renderRetainedVitestConfig([
      'tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts',
    ]), 'utf8');
    const status = await runVitestChild(
      join(root, 'node_modules', 'vitest', 'vitest.mjs'),
      configPath,
      ['--reporter=dot', '--silent'],
      root,
    );
    expect(status).toBe(1);
  }, 30_000);

  it('returns failure when a planned worker child fails', async () => {
    const status = await runBalancedVitest(['--shards=1'], root, {
      receiptRoot: join(fixtureOutputRoot, 'planned-worker-failure-receipts'),
      inventory: [{ file: 'tests/run_vitest_balanced.test.ts', durationMs: 1, serial: false, reasons: [] }],
      runVitestChild: async () => 1,
    });
    expect(status).toBe(1);
  });

  it('allocates one create-new receipt per worker lane without filtering reporter flags', async () => {
    const receiptRoot = join(fixtureOutputRoot, 'balanced-wiring-receipts');
    const calls: Array<{ passthrough: string[]; env: NodeJS.ProcessEnv }> = [];
    const status = await runBalancedVitest([
      '--shards=2', '--', '--reporter=dot', '--silent',
    ], root, {
      receiptRoot,
      inventory: [
        { file: 'tests/a.test.ts', durationMs: 2, serial: false, reasons: [] },
        { file: 'tests/b.test.ts', durationMs: 1, serial: false, reasons: [] },
        { file: 'tests/c.test.ts', durationMs: 1, serial: true, reasons: ['fixed-port'] },
      ],
      runVitestChild: async (_cli: string, _config: string, passthrough: string[], _root: string, env: NodeJS.ProcessEnv = {}) => {
        calls.push({ passthrough, env });
        return 0;
      },
    });
    expect(status).toBe(0);
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => call.passthrough.join(' ') === '--reporter=dot --silent')).toBe(true);
    expect(new Set(calls.map((call) => call.env.AWWV_VITEST_RECEIPT_RUN_ID)).size).toBe(1);
    expect(calls.map((call) => call.env.AWWV_VITEST_RECEIPT_LANE).sort())
      .toEqual(['parallel-0', 'parallel-1', 'serial']);
    expect(calls.every((call) => existsSync(call.env.AWWV_VITEST_RECEIPT_FILE!))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(
      calls[0]!.env.AWWV_VITEST_RECEIPT_FILE!, '..', 'manifest.json',
    ), 'utf8'));
    expect(manifest).toMatchObject({
      schema: 'awwv.vitest-file-receipt-run.v1',
      planner: 'deterministic-duration-balanced-v1',
      shard_count: 2,
      selected_file_count: 3,
      partitioned_file_count: 0,
      serial_file_count: 1,
    });
    expect(manifest.plan.parallel_shards.flatMap((shard: { files: string[] }) => shard.files).sort())
      .toEqual(['tests/a.test.ts', 'tests/b.test.ts']);
    expect(manifest.plan.serial_files).toEqual(['tests/c.test.ts']);
  });

  it('fails receipt-root startup before invoking a test child', async () => {
    const occupied = join(fixtureOutputRoot, 'occupied-receipt-root');
    writeFileSync(occupied, 'not a directory', { flag: existsSync(occupied) ? 'w' : 'wx' });
    let childCalls = 0;
    const status = await runBalancedVitest(['--shards=1'], root, {
      receiptRoot: occupied,
      inventory: [{ file: 'tests/a.test.ts', durationMs: 1, serial: false, reasons: [] }],
      runVitestChild: async () => {
        childCalls += 1;
        return 0;
      },
    });
    expect(status).toBe(1);
    expect(childCalls).toBe(0);
  });

  it('selects a bounded smoke subset without changing discovery order', () => {
    expect(filterInventoryByPattern(inventory, 'a\\.test|shared\\.test').map((row) => row.file))
      .toEqual(['tests/a.test.ts', 'tests/shared.test.ts']);
    expect(() => filterInventoryByPattern(inventory, '[')).toThrow(/invalid match pattern/);
  });
});

describe('every vitest config surface stays in sync', () => {
    // THREE surfaces run tests: vitest.config.ts (direct), run_vitest_balanced.mjs
    // (sharded — Full Suite) and run_vitest_slice.mjs (fast slice — Baseline Regression).
    // The generated two REPLACE the root config, so anything installed in one has to be
    // installed in all three or it silently does not apply in CI.
    //
    // Both halves of this bit on 2026-09-01: the jsdom polyfill was added to the root
    // config only (sharded runs never got it), and the slice config had drifted so far it
    // was missing the maplibre-gl and @deck.gl/* aliases outright — which is why
    // vi.mock('maplibre-gl') never engaged and the real module crashed on
    // window.URL.createObjectURL. tools/test/vitest_shared_config.mjs is now the single
    // source; this test is what keeps it that way.
    const generatedBalanced = renderBalancedVitestConfig(['tests/example.test.ts']);
    const rootConfig = readFileSync(join(process.cwd(), 'vitest.config.ts'), 'utf8');
    const sliceRunner = readFileSync(join(process.cwd(), 'tools/test/run_vitest_slice.mjs'), 'utf8');
    const balancedRunner = readFileSync(join(process.cwd(), 'tools/test/run_vitest_balanced.mjs'), 'utf8');

    it('aliases every dual-copy hazard package on all three surfaces', () => {
        for (const pkg of VITEST_ALIASED_PACKAGES) {
            expect(rootConfig, `vitest.config.ts must alias ${pkg}`).toContain(`'${pkg}'`);
            expect(generatedBalanced, `balanced config must alias ${pkg}`).toContain(`'${pkg}'`);
        }
        // The slice runner builds its aliases from the shared list rather than repeating
        // them, which is what makes the guarantee hold rather than needing to be rechecked.
        expect(sliceRunner).toContain('renderAliasEntryLines');
    });

    it('installs the jsdom browser polyfills on all three surfaces', () => {
        expect(rootConfig).toContain(VITEST_SETUP_FILE);
        expect(generatedBalanced).toContain(VITEST_SETUP_FILE);
        expect(sliceRunner).toContain('renderSetupFilesLine');
    });

    it('installs the mandatory receipt runner on every generated balanced config', () => {
        expect(generatedBalanced).toContain("runner: join(rootDir, 'tools/test/vitest_receipt_runner.mjs')");
    });

    it('does not retain map and Deck aliases after workspace resolution is unified', () => {
        for (const pkg of ['maplibre-gl', '@deck.gl/core', '@deck.gl/extensions', '@deck.gl/layers', '@deck.gl/mapbox']) {
            expect(VITEST_ALIASED_PACKAGES).not.toContain(pkg);
            expect(rootConfig).not.toContain(`'${pkg}':`);
            expect(generatedBalanced).not.toContain(`'${pkg}':`);
        }
    });

    it('orders aliases most-specific-first so shorter keys cannot capture longer paths', () => {
        const idx = (pkg: string) => VITEST_ALIASED_PACKAGES.indexOf(pkg);
        expect(idx('react-dom/server')).toBeLessThan(idx('react-dom'));
        expect(idx('react-dom/client')).toBeLessThan(idx('react-dom'));
        expect(idx('react-dom')).toBeLessThan(idx('react'));
        expect(idx('use-sync-external-store/shim/with-selector')).toBeLessThan(idx('use-sync-external-store/shim'));
        expect(idx('use-sync-external-store/shim')).toBeLessThan(idx('use-sync-external-store'));
    });

    it('keeps the serial execution guarantees on every surface', () => {
        for (const option of ['fileParallelism: false', 'minWorkers: 1', 'maxWorkers: 1']) {
            expect(rootConfig).toContain(option);
            expect(generatedBalanced).toContain(option);
            expect(sliceRunner).toContain(option);
        }
        expect(balancedRunner).toContain('maxWorkers: 1');
    });
});
