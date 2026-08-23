import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { balanceTestFiles, buildTestInventory } from './test_suite_inventory.mjs';

function strictCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const PARTITIONABLE_TEST_FILES = new Set([
  'tests/sector_partition_buildCorpsFrontSectors_integration.test.ts',
]);

export function deterministicShardValues(total, shardIndex, shardCount) {
  if (!Number.isInteger(total) || total < 0) throw new Error('total must be a non-negative integer');
  if (!Number.isInteger(shardCount) || shardCount < 1) throw new Error('shard count must be a positive integer');
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error('shard index must be an integer within the shard count');
  }
  return Array.from({ length: total }, (_, value) => value)
    .filter((value) => value % shardCount === shardIndex);
}

export function partitionInventory(inventory, shardCount) {
  const partitionedFiles = inventory
    .filter((row) => PARTITIONABLE_TEST_FILES.has(row.file))
    .map((row) => row.file)
    .sort(strictCompare);
  const serialFiles = inventory
    .filter((row) => row.serial && !PARTITIONABLE_TEST_FILES.has(row.file))
    .map((row) => row.file)
    .sort(strictCompare);
  const safeRows = inventory.filter((row) => !row.serial && !PARTITIONABLE_TEST_FILES.has(row.file));
  return {
    parallelShards: balanceTestFiles(safeRows, shardCount),
    serialFiles,
    partitionedFiles,
  };
}

export function aggregateChildStatuses(statuses) {
  if (statuses.length === 0) throw new Error('at least one child status is required');
  return statuses.every((status) => status === 0) ? 0 : 1;
}

export function buildWorkerPlans(plan, shardCount) {
  return plan.parallelShards
    .map((shard) => ({
      shardIndex: shard.index,
      files: [...shard.files, ...plan.partitionedFiles].sort(strictCompare),
    }))
    .filter((worker) => worker.files.length > 0)
    .map((worker) => ({ ...worker, shardCount }));
}

export function filterInventoryByPattern(inventory, pattern) {
  let matcher;
  try {
    matcher = new RegExp(pattern);
  } catch (error) {
    throw new Error(`invalid match pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
  return inventory.filter((row) => matcher.test(row.file)).sort((a, b) => strictCompare(a.file, b.file));
}

function toPosixPath(value) {
  return value.replaceAll('\\', '/');
}

export function renderBalancedVitestConfig(files) {
  return [
    "import { defineConfig } from 'vitest/config';",
    "import { join } from 'node:path';",
    "import { discoverTests, toRepoRelative } from '../../tools/test/discover_test_files.mjs';",
    '',
    'const rootDir = process.cwd();',
    "const rootModules = join(rootDir, 'node_modules');",
    'const discovered = discoverTests(rootDir);',
    'const environmentMatchGlobs = discovered.jsdomVitestFiles.map((file) => [',
    '  toRepoRelative(rootDir, [file])[0],',
    "  'jsdom',",
    ']);',
    '',
    'export default defineConfig({',
    '  resolve: { alias: {',
    "    'react/jsx-runtime': join(rootModules, 'react/jsx-runtime'),",
    "    'react/jsx-dev-runtime': join(rootModules, 'react/jsx-dev-runtime'),",
    "    'react-dom/server': join(rootModules, 'react-dom/server'),",
    "    'react-dom/client': join(rootModules, 'react-dom/client'),",
    "    'react-dom': join(rootModules, 'react-dom'),",
    "    'react': join(rootModules, 'react'),",
    "    'use-sync-external-store/shim/with-selector': join(rootModules, 'use-sync-external-store/shim/with-selector'),",
    "    'use-sync-external-store/shim': join(rootModules, 'use-sync-external-store/shim'),",
    "    'use-sync-external-store': join(rootModules, 'use-sync-external-store'),",
    "    'zustand': join(rootModules, 'zustand'),",
    "    'maplibre-gl': join(rootModules, 'maplibre-gl'),",
    "    '@deck.gl/core': join(rootModules, '@deck.gl/core'),",
    "    '@deck.gl/extensions': join(rootModules, '@deck.gl/extensions'),",
    "    '@deck.gl/layers': join(rootModules, '@deck.gl/layers'),",
    "    '@deck.gl/mapbox': join(rootModules, '@deck.gl/mapbox'),",
    '  } },',
    '  test: {',
    `    include: ${JSON.stringify([...files].sort(strictCompare), null, 6)},`,
    '    globals: false,',
    "    environment: 'node',",
    '    environmentMatchGlobs,',
    '    testTimeout: 120_000,',
    '    fileParallelism: false,',
    '    minWorkers: 1,',
    '    maxWorkers: 1,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = { shards: 4, listOnly: false, match: null, passthrough: [] };
  let passthrough = false;
  for (const arg of argv) {
    if (passthrough) {
      parsed.passthrough.push(arg);
    } else if (arg === '--') {
      passthrough = true;
    } else if (arg === '--list') {
      parsed.listOnly = true;
    } else if (arg.startsWith('--shards=')) {
      parsed.shards = Number.parseInt(arg.slice('--shards='.length), 10);
    } else if (arg.startsWith('--match=')) {
      parsed.match = arg.slice('--match='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(parsed.shards) || parsed.shards < 1 || parsed.shards > 16) {
    throw new Error('--shards must be an integer from 1 through 16');
  }
  return parsed;
}

function runChild(vitestCli, configPath, passthrough, root, env = process.env) {
  return new Promise((resolveStatus) => {
    const child = spawn(process.execPath, [
      vitestCli,
      'run',
      '--config',
      toPosixPath(relative(root, configPath)),
      ...passthrough,
    ], { cwd: root, env, stdio: 'inherit', shell: false });
    child.once('error', () => resolveStatus(1));
    child.once('exit', (code) => resolveStatus(code ?? 1));
  });
}

export async function runBalancedVitest(argv, root = process.cwd()) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  const vitestCli = join(root, 'node_modules', 'vitest', 'vitest.mjs');
  if (!existsSync(vitestCli)) {
    console.error(`Missing vitest CLI at ${vitestCli}. Run npm install.`);
    return 1;
  }
  const durationPath = join(root, 'tools', 'test', 'test_duration_baseline.json');
  const durationDocument = JSON.parse(readFileSync(durationPath, 'utf8'));
  const discoveredInventory = buildTestInventory(root, durationDocument.durations_ms ?? {});
  let inventory = discoveredInventory;
  if (cli.match !== null) {
    try {
      inventory = filterInventoryByPattern(discoveredInventory, cli.match);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }
  if (inventory.length === 0) {
    console.error('No Vitest files matched the requested inventory.');
    return 1;
  }
  const plan = partitionInventory(inventory, cli.shards);
  if (cli.listOnly) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return 0;
  }

  const generatedRoot = join(root, '.tmp_vitest_balanced', String(process.pid));
  mkdirSync(generatedRoot, { recursive: true });
  try {
    const workerConfigs = buildWorkerPlans(plan, cli.shards).map((worker) => {
      const path = join(generatedRoot, `worker-${worker.shardIndex}.config.mjs`);
      writeFileSync(path, renderBalancedVitestConfig(worker.files), 'utf8');
      return { path, ...worker };
    });
    console.log(
      `[balanced-vitest] workers=${workerConfigs.length}; `
      + `partitioned files=${plan.partitionedFiles.length}; serial files=${plan.serialFiles.length}`,
    );
    const statuses = await Promise.all(workerConfigs.map(({ path, shardIndex }) => runChild(
        vitestCli,
        path,
        cli.passthrough,
        root,
        {
          ...process.env,
          AWWV_PROPERTY_SHARD_INDEX: String(shardIndex),
          AWWV_PROPERTY_SHARD_COUNT: String(cli.shards),
        },
      )));
    if (plan.serialFiles.length > 0) {
      const serialConfig = join(generatedRoot, 'serial.config.mjs');
      writeFileSync(serialConfig, renderBalancedVitestConfig(plan.serialFiles), 'utf8');
      statuses.push(await runChild(vitestCli, serialConfig, cli.passthrough, root));
    }
    return aggregateChildStatuses(statuses);
  } finally {
    const resolvedGenerated = resolve(generatedRoot);
    const expectedParent = `${resolve(root, '.tmp_vitest_balanced')}${sep}`;
    if (resolvedGenerated.startsWith(expectedParent)) {
      rmSync(resolvedGenerated, { recursive: true, force: true });
    }
  }
}

const thisFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (thisFile === invokedFile) {
  process.exitCode = await runBalancedVitest(process.argv.slice(2));
}
