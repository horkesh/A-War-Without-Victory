import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { discoverTests } from './discover_test_files.mjs';
import { renderAliasEntryLines, renderSetupFilesLine } from './vitest_shared_config.mjs';

const ROOT = process.cwd();
const VITEST_CLI = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const GENERATED_CONFIG_DIR = '.tmp_vitest_slice';
const GENERATED_CONFIG_FILE = join(GENERATED_CONFIG_DIR, 'vitest.slice.config.mjs');
const VALID_SLICES = new Set(['fast', 'scenario']);

function parseArgs(argv) {
  const out = { slice: undefined, listOnly: false, passthrough: [] };
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
    if (out.slice == null) {
      out.slice = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!VALID_SLICES.has(out.slice)) {
    throw new Error(`Usage: node tools/test/run_vitest_slice.mjs <fast|scenario> [--list] [-- <vitest args...>]`);
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

export function writeVitestSliceConfig(root, files) {
  const include = files.map((file) => toPosixPath(relative(root, file)));
  const configPath = join(root, GENERATED_CONFIG_FILE);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    [
      "import { defineConfig } from 'vitest/config';",
      "import { join } from 'node:path';",
      "import { discoverTests, toRepoRelative } from '../tools/test/discover_test_files.mjs';",
      '',
      'const rootDir = process.cwd();',
      'const rootModules = join(rootDir, \'node_modules\');',
      'const discovered = discoverTests(rootDir);',
      'const environmentMatchGlobs = discovered.jsdomVitestFiles.map((file) => [',
      '  toRepoRelative(rootDir, [file])[0],',
      "  'jsdom',",
      ']);',
      '',
      'export default defineConfig({',
      '  resolve: {',
      '    alias: {',
      // From tools/test/vitest_shared_config.mjs. This list previously omitted
      // maplibre-gl and the @deck.gl/* family, so vi.mock('maplibre-gl') resolved a
      // different module id than the component's own import, the real module loaded, and
      // every jsdom suite touching the map crashed on window.URL.createObjectURL.
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

export function runVitestSlice(argv, root = ROOT) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  if (!existsSync(VITEST_CLI)) {
    console.error(`Missing vitest CLI at ${VITEST_CLI}. Run npm install.`);
    return 1;
  }

  const discovered = discoverTests(root);
  const files = cli.slice === 'scenario' ? discovered.scenarioVitestFiles : discovered.fastVitestFiles;

  if (files.length === 0) {
    console.error(`No ${cli.slice} vitest files found in tests/.`);
    return 1;
  }

  if (cli.listOnly) {
    process.stdout.write(`${cli.slice} vitest files (${files.length})\n`);
    for (const file of files) {
      process.stdout.write(`${toPosixPath(relative(root, file))}\n`);
    }
    return 0;
  }

  writeVitestSliceConfig(root, files);

  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, ...buildVitestSliceArgs(root, files, cli.passthrough)],
    {
      stdio: 'inherit',
      shell: false,
    }
  );

  if (result.error) {
    console.error(result.error);
    return 1;
  }

  return result.status ?? 1;
}

const thisFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (thisFile === invokedFile) {
  process.exit(runVitestSlice(process.argv.slice(2)));
}
