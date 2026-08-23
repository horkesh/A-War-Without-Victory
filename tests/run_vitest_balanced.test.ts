import { describe, expect, it } from 'vitest';
import {
  aggregateChildStatuses,
  deterministicShardValues,
  filterInventoryByPattern,
  partitionInventory,
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

  it('is stable when discovery order changes', () => {
    expect(partitionInventory([...inventory].reverse(), 2)).toEqual(partitionInventory(inventory, 2));
  });

  it('propagates a deliberately failing child status', () => {
    expect(aggregateChildStatuses([0, 1, 0])).toBe(1);
    expect(aggregateChildStatuses([0, 0])).toBe(0);
    expect(() => aggregateChildStatuses([])).toThrow(/at least one child/);
  });

  it('selects a bounded smoke subset without changing discovery order', () => {
    expect(filterInventoryByPattern(inventory, 'a\\.test|shared\\.test').map((row) => row.file))
      .toEqual(['tests/a.test.ts', 'tests/shared.test.ts']);
    expect(() => filterInventoryByPattern(inventory, '[')).toThrow(/invalid match pattern/);
  });
});
