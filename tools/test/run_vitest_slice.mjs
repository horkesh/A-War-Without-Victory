import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { discoverTests } from './discover_test_files.mjs';
import { SECTOR_PROPERTY_TEST } from './run_vitest_balanced.mjs';
import { renderAliasEntryLines, renderSetupFilesLine, resolveVitestCli } from './vitest_shared_config.mjs';

const ROOT = process.cwd();
const GENERATED_CONFIG_DIR = '.tmp_vitest_slice';
const GENERATED_CONFIG_FILE = join(GENERATED_CONFIG_DIR, 'vitest.slice.config.mjs');
const VALID_SLICES = new Set(['fast', 'scenario']);

function parseArgs(argv) {
  const out = { slice: undefined, listOnly: false, partitionSectorProperty: false, passthrough: [] };
  let passthroughMode = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (passthroughMode) {
      out.passthrough.push(arg);
      continue;
    }
    if (arg === '--') {
      passthroughMode = true;
      continue;
    }
    if (arg === '--list') {
      out.listOnly = true;
      continue;
    }
    if (arg === '--partition-sector-property') {
      out.partitionSectorProperty = true;
      continue;
    }
    if (out.slice == null) {
      out.slice = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!VALID_SLICES.has(out.slice)) {
    throw new Error(`Usage: node tools/test/run_vitest_slice.mjs <fast|scenario> [--list] [--partition-sector-property] [-- <vitest args...>]`);
  }
  if (out.partitionSectorProperty && (out.slice !== 'fast' || out.passthrough.length > 0)) {
    throw new Error('--partition-sector-property requires the unfiltered fast slice.');
  }

  return out;
}

function toPosixPath(path) {
  return path.replaceAll('\\', '/');
}

export function buildVitestSliceArgs(root, files, passthrough) {
  return [
    'run',
    '--config',
    toPosixPath(relative(root, join(root, GENERATED_CONFIG_FILE))),
    ...passthrough,
  ];
}

export function writeVitestSliceConfig(root, files, configPath = join(root, GENERATED_CONFIG_FILE)) {
  const include = files.map((file) => toPosixPath(relative(root, file)));
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    [
      "import { defineConfig } from 'vitest/config';",
      "import { join } from 'node:path';",
      "import { discoverTests, resolveRootModules, toRepoRelative } from '../tools/test/discover_test_files.mjs';",
      '',
      'const rootDir = process.cwd();',
      'const rootModules = resolveRootModules(rootDir);',
      'const discovered = discoverTests(rootDir);',
      'const environmentMatchGlobs = discovered.jsdomVitestFiles.map((file) => [',
      '  toRepoRelative(rootDir, [file])[0],',
      "  'jsdom',",
      ']);',
      '',
      'export default defineConfig({',
      '  resolve: {',
      '    alias: {',
      // From tools/test/vitest_shared_config.mjs so singleton/mock aliases cannot
      // silently diverge between direct and sliced runs.
      ...renderAliasEntryLines('      '),
      '    },',
      '  },',
      '  test: {',
      `    include: ${JSON.stringify(include, null, 6)},`,
      '    globals: false,',
      "    environment: 'node',",
      '    environmentMatchGlobs,',
      renderSetupFilesLine('    '),
      '    testTimeout: 120_000,',
      '    fileParallelism: false,',
      '    minWorkers: 1,',
      '    maxWorkers: 1,',
      '  },',
      '});',
      '',
    ].join('\n'),
    'utf8',
  );
  return configPath;
}

export function runVitestSlice(argv, root = ROOT, runChild = spawnSync) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const vitestCli = resolveVitestCli(root);
  if (!existsSync(vitestCli)) {
    console.error(`Missing vitest CLI at ${vitestCli}. Run npm install.`);
    return 1;
  }

  const discovered = discoverTests(root);
  const files = cli.slice === 'scenario' ? discovered.scenarioVitestFiles : discovered.fastVitestFiles;

  if (files.length === 0) {
    console.error(`No ${cli.slice} vitest files found in tests/.`);
    return 1;
  }

  if (cli.partitionSectorProperty
      && (files.length < 2 || files.filter(file => toPosixPath(relative(root, file)) === SECTOR_PROPERTY_TEST).length !== 1)) {
    console.error(`Expected ${SECTOR_PROPERTY_TEST} and a serial remainder in the fast slice.`);
    return 1;
  }

  if (cli.listOnly) {
    process.stdout.write(`${cli.slice} vitest files (${files.length})\n`);
    for (const file of files) {
      process.stdout.write(`${toPosixPath(relative(root, file))}\n`);
    }
    return 0;
  }

  const runNode = (args) => {
    const result = runChild(process.execPath, args, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    if (result.error) {
      console.error(result.error);
      return 1;
    }
    return result.status ?? 1;
  };

  const passthrough = [...cli.passthrough];
  if (cli.partitionSectorProperty) {
    const exactMatch = SECTOR_PROPERTY_TEST.replaceAll('.', '\\.');
    console.log(`[fast-vitest] partitioning one property file; serial remainder has ${files.length - 1} files`);
    const status = runNode([
      join(root, 'tools', 'test', 'run_vitest_balanced.mjs'),
      '--shards=4', `--match=^${exactMatch}$`,
      '--', '--reporter=dot', '--silent',
    ]);
    if (status !== 0) return status;
    passthrough.push('--exclude', SECTOR_PROPERTY_TEST);
  }

  writeVitestSliceConfig(root, files);
  return runNode([vitestCli, ...buildVitestSliceArgs(root, files, passthrough)]);
}

const thisFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (thisFile === invokedFile) {
  process.exit(runVitestSlice(process.argv.slice(2)));
}
