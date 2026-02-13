import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TEST_DIR = join(ROOT, 'tests');
const DEFAULT_CHUNK_SIZE = 20;

function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listTsFiles(full));
      continue;
    }
    if (extname(full) === '.ts') out.push(full);
  }
  return out;
}

function isVitestFile(path) {
  return /from\s+['"]vitest['"]/.test(readFileSync(path, 'utf8'));
}

function parseChunkSize(value) {
  if (value == null || value === '') return DEFAULT_CHUNK_SIZE;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_CHUNK_SIZE;
}

function parseArgs(argv) {
  const out = { chunkSize: undefined, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--chunk-size') {
      const next = argv[i + 1];
      if (next == null) {
        throw new Error('Missing value for --chunk-size');
      }
      out.chunkSize = parseChunkSize(next);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
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

if (cli.help) {
  process.stdout.write(
    [
      'Usage: node tools/test/run_node_tests.mjs [--chunk-size <n>]',
      '',
      'Options:',
      `  --chunk-size <n>   Number of test files per chunk (default: ${DEFAULT_CHUNK_SIZE})`,
      '                     Fallback env var: NODE_TEST_CHUNK_SIZE',
      '  -h, --help         Show this help'
    ].join('\n') + '\n'
  );
  process.exit(0);
}

const files = listTsFiles(TEST_DIR)
  .filter((f) => !isVitestFile(f))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.error('No node:test files found in tests/');
  process.exit(1);
}

const CHUNK_SIZE = cli.chunkSize ?? parseChunkSize(process.env.NODE_TEST_CHUNK_SIZE);
const totalChunks = Math.ceil(files.length / CHUNK_SIZE);
const tsxCli = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

if (!existsSync(tsxCli)) {
  console.error(`Missing tsx CLI at ${tsxCli}. Run npm install.`);
  process.exit(1);
}

const suiteStart = Date.now();
process.stdout.write(
  `run_node_tests: ${files.length} node:test files, chunk_size=${CHUNK_SIZE}, chunks=${totalChunks}\n`
);

for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  const chunk = files.slice(i, i + CHUNK_SIZE);
  const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
  const first = basename(chunk[0]);
  const last = basename(chunk[chunk.length - 1]);
  const chunkStart = Date.now();
  process.stdout.write(
    `run_node_tests: chunk ${chunkIndex}/${totalChunks} (${chunk.length} files) ${first} -> ${last}\n`
  );

  const result = spawnSync(process.execPath, [tsxCli, '--test', ...chunk], {
    stdio: 'inherit',
    shell: false
  });
  const chunkElapsedMs = Date.now() - chunkStart;

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) {
    process.stderr.write(
      `run_node_tests: chunk ${chunkIndex}/${totalChunks} failed after ${chunkElapsedMs}ms\n`
    );
    process.exit(result.status ?? 1);
  }
  process.stdout.write(
    `run_node_tests: chunk ${chunkIndex}/${totalChunks} passed in ${chunkElapsedMs}ms\n`
  );
}

const suiteElapsedMs = Date.now() - suiteStart;
process.stdout.write(`run_node_tests: all chunks passed in ${suiteElapsedMs}ms\n`);

process.exit(0);
