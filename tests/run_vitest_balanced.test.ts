import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

describe('generated balanced config mirrors the root vitest config', () => {
    // The sharded runner REPLACES vitest.config.ts with a generated one, so anything the
    // root config installs must be repeated in the generated config or it silently does
    // not apply to CI. On 2026-09-01 the jsdom createObjectURL polyfill was added to the
    // root config only; the Full Suite happened to pass on shard luck while Baseline
    // Regression stayed red with the exact failure the polyfill was meant to fix.
    const generated = renderBalancedVitestConfig(['tests/example.test.ts']);
    const rootConfig = readFileSync(join(process.cwd(), 'vitest.config.ts'), 'utf8');

    it('installs the jsdom browser polyfills the root config installs', () => {
        expect(rootConfig).toContain('tools/test/jsdom_browser_polyfills.ts');
        expect(generated).toContain('tools/test/jsdom_browser_polyfills.ts');
        expect(generated).toContain('setupFiles');
    });

    it('keeps every resolve alias the root config pins', () => {
        // Dual-copy hazards (react, maplibre-gl, @deck.gl/*) are only neutralised if BOTH
        // configs alias them to the root node_modules.
        for (const pkg of [
            'react-dom/server', 'react-dom/client', 'react-dom', 'react',
            'use-sync-external-store', 'zustand', 'maplibre-gl',
            '@deck.gl/core', '@deck.gl/extensions', '@deck.gl/layers', '@deck.gl/mapbox',
        ]) {
            expect(rootConfig, `root config must alias ${pkg}`).toContain(`'${pkg}'`);
            expect(generated, `generated config must alias ${pkg}`).toContain(`'${pkg}'`);
        }
    });

    it('keeps the serial execution guarantees the root config sets', () => {
        for (const option of ['fileParallelism: false', 'minWorkers: 1', 'maxWorkers: 1']) {
            expect(rootConfig).toContain(option);
            expect(generated).toContain(option);
        }
    });
});
