import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { discoverTests } from './discover_test_files.mjs';

const ROOT = process.cwd();
const VITEST_CLI = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
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

let cli;
try {
  cli = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (!existsSync(VITEST_CLI)) {
  console.error(`Missing vitest CLI at ${VITEST_CLI}. Run npm install.`);
  process.exit(1);
}

const discovered = discoverTests(ROOT);
const files = cli.slice === 'scenario' ? discovered.scenarioVitestFiles : discovered.fastVitestFiles;

if (files.length === 0) {
  console.error(`No ${cli.slice} vitest files found in tests/.`);
  process.exit(1);
}

if (cli.listOnly) {
  process.stdout.write(`${cli.slice} vitest files (${files.length})\n`);
  for (const file of files) {
    process.stdout.write(`${relative(ROOT, file).replaceAll('\\', '/')}\n`);
  }
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [VITEST_CLI, 'run', ...files, ...cli.passthrough],
  {
    stdio: 'inherit',
    shell: false,
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
