import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoverTests, toRepoRelative } from './discover_test_files.mjs';

function strictCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export const DEFAULT_UNMEASURED_DURATION_MS = 1_000;

/**
 * Conservative static classification. A false positive costs parallelism; a false
 * negative can corrupt another test's evidence, so ambiguous shared-state patterns stay
 * serial until a narrower test proves isolation.
 */
export function classifyTestSource(_file, source) {
  const reasons = [];
  const hasWriteCall = /\b(?:appendFile|copyFile|mkdir|rename|rm|unlink|writeFile)(?:Sync)?\s*\(/.test(source);
  if (hasWriteCall && /data[\\/]derived[\\/]latest_run_final_save\.json/.test(source)) {
    reasons.push('tracked-derived-write');
  }
  if (/\b(?:readdir|readdirSync)\s*\([\s\S]{0,200}?['"]runs['"]/.test(source)) {
    reasons.push('ambient-runs-read');
  }
  if (/(?:delete\s+process\.env(?:\.|\[)|process\.env(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[^\]]+\])\s*=)/.test(source)) {
    reasons.push('environment-mutation');
  }
  if (/\.listen\s*\(\s*\d{2,5}\b|--port(?:=|\s+)\d{2,5}\b|strictPort\s*:\s*true/.test(source)) {
    reasons.push('fixed-port');
  }
  reasons.sort(strictCompare);
  return { serial: reasons.length > 0, reasons };
}

export function buildTestInventory(rootDir, durationsByFile = {}) {
  const files = toRepoRelative(rootDir, discoverTests(rootDir).vitestFiles).sort(strictCompare);
  return files.map((file) => {
    const source = readFileSync(resolve(rootDir, file), 'utf8');
    const hazard = classifyTestSource(file, source);
    const measured = durationsByFile[file];
    const durationMs = Number.isFinite(measured) && measured > 0
      ? measured
      : DEFAULT_UNMEASURED_DURATION_MS;
    return { file, durationMs, ...hazard };
  });
}

export function balanceTestFiles(rows, shardCount) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error('shard count must be a positive integer');
  }
  const shards = Array.from({ length: shardCount }, (_, index) => ({
    index,
    totalDurationMs: 0,
    files: [],
  }));
  const ordered = [...rows].sort((left, right) =>
    right.durationMs - left.durationMs || strictCompare(left.file, right.file));
  for (const row of ordered) {
    const target = [...shards].sort((left, right) =>
      left.totalDurationMs - right.totalDurationMs || left.index - right.index)[0];
    target.files.push(row.file);
    target.totalDurationMs += row.durationMs;
  }
  return shards;
}

export function serializeInventory(rows) {
  const ordered = [...rows].sort((left, right) => strictCompare(left.file, right.file));
  return `${JSON.stringify({
    schema_version: 1,
    file_count: ordered.length,
    serial_count: ordered.filter((row) => row.serial).length,
    files: ordered,
  }, null, 2)}\n`;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/tools/test/test_suite_inventory.mjs')) {
  const rootDir = process.cwd();
  const inventory = buildTestInventory(rootDir, {});
  process.stdout.write(serializeInventory(inventory));
}
