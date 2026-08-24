import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverTests, toRepoRelative } from '../tools/test/discover_test_files.mjs';
import {
  balanceTestFiles,
  buildTestInventory,
  classifyTestSource,
  serializeInventory,
} from '../tools/test/test_suite_inventory.mjs';

describe('test-suite hazard inventory', () => {
  it('routes a deliberately shared tracked-file writer into the serial lane', () => {
    const hazard = classifyTestSource(
      'tests/shared_writer.test.ts',
      "writeFileSync('data/derived/latest_run_final_save.json', payload);",
    );
    expect(hazard.serial).toBe(true);
    expect(hazard.reasons).toContain('tracked-derived-write');
  });

  it('classifies ambient run discovery, environment mutation, and fixed ports', () => {
    expect(classifyTestSource('a.ts', "readdirSync(join(process.cwd(), 'runs'))").reasons)
      .toContain('ambient-runs-read');
    expect(classifyTestSource('b.ts', 'process.env.FLAG = value').reasons)
      .toContain('environment-mutation');
    expect(classifyTestSource('c.ts', 'server.listen(3002)').reasons)
      .toContain('fixed-port');
  });

  it('keeps a pure assertion eligible for isolated parallel execution', () => {
    expect(classifyTestSource('pure.test.ts', 'expect(add(1, 2)).toBe(3)'))
      .toEqual({ serial: false, reasons: [] });
  });

  it('discovers every Vitest file exactly once in strict path order', () => {
    const root = process.cwd();
    const expected = toRepoRelative(root, discoverTests(root).vitestFiles);
    const inventory = buildTestInventory(root, {});
    expect(inventory.map((row) => row.file)).toEqual([...expected].sort());
    expect(new Set(inventory.map((row) => row.file)).size).toBe(expected.length);
  });

  it('gives unprofiled files a realistic deterministic weight', () => {
    const inventory = buildTestInventory(process.cwd(), {});
    expect(new Set(inventory.map((row) => row.durationMs))).toEqual(new Set([1_000]));
  });
});

describe('duration-balanced shards', () => {
  it('is independent of input order and assigns every file once', () => {
    const rows = [
      { file: 'tests/slow.test.ts', durationMs: 100, serial: false, reasons: [] },
      { file: 'tests/b.test.ts', durationMs: 40, serial: false, reasons: [] },
      { file: 'tests/a.test.ts', durationMs: 40, serial: false, reasons: [] },
      { file: 'tests/tiny.test.ts', durationMs: 1, serial: false, reasons: [] },
    ];
    const forward = balanceTestFiles(rows, 2);
    const reverse = balanceTestFiles([...rows].reverse(), 2);
    expect(reverse).toEqual(forward);
    expect(forward.flatMap((shard) => shard.files).sort()).toEqual(rows.map((row) => row.file).sort());
    expect(forward.map((shard) => shard.totalDurationMs)).toEqual([100, 81]);
  });

  it('rejects invalid shard counts instead of silently dropping work', () => {
    expect(() => balanceTestFiles([], 0)).toThrow(/positive integer/);
  });
});

describe('inventory source is deterministic', () => {
  it('serializes rows byte-identically regardless of caller order', () => {
    const rows = [
      { file: 'tests/z.test.ts', durationMs: 2, serial: false, reasons: [] },
      { file: 'tests/a.test.ts', durationMs: 1, serial: true, reasons: ['fixed-port'] },
    ];
    expect(serializeInventory(rows)).toBe(serializeInventory([...rows].reverse()));
    expect(serializeInventory(rows)).toMatch(/^\{\n  "schema_version": 1,/);
  });

  it('contains no random or wall-clock ordering input', () => {
    const source = readFileSync(join(process.cwd(), 'tools/test/test_suite_inventory.mjs'), 'utf8');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('mtime');
  });
});
