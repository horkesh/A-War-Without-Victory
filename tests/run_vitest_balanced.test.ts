import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { VITEST_ALIASED_PACKAGES, VITEST_SETUP_FILE } from '../tools/test/vitest_shared_config.mjs';
import { join } from 'node:path';
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
    const root = process.cwd();
    const generatedRoot = join(root, '.tmp_vitest_balanced_test', String(process.pid));
    const configPath = join(generatedRoot, 'deliberate-failure.config.mjs');
    mkdirSync(generatedRoot, { recursive: true });
    try {
      writeFileSync(configPath, renderBalancedVitestConfig([
        'tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts',
      ]), 'utf8');
      const status = await runVitestChild(
        join(root, 'node_modules', 'vitest', 'vitest.mjs'),
        configPath,
        ['--reporter=dot', '--silent'],
        root,
      );
      expect(status).toBe(1);
    } finally {
      rmSync(generatedRoot, { recursive: true, force: true });
    }
  }, 30_000);

  it('returns failure when a planned worker child fails', async () => {
    const root = process.cwd();
    const status = await runBalancedVitest(['--shards=1'], root, {
      inventory: [{ file: 'tests/run_vitest_balanced.test.ts', durationMs: 1, serial: false, reasons: [] }],
      runVitestChild: async () => 1,
    });
    expect(status).toBe(1);
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

    it('keeps maplibre-gl and the deck.gl family in the shared list', () => {
        // Named explicitly: these are the ones whose absence produced a silent,
        // shard-dependent crash rather than a clear failure.
        for (const pkg of ['maplibre-gl', '@deck.gl/core', '@deck.gl/extensions', '@deck.gl/layers', '@deck.gl/mapbox']) {
            expect(VITEST_ALIASED_PACKAGES).toContain(pkg);
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
