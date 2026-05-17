#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const CHECKED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.cjs',
  '.mjs',
  '.json',
  '.md',
  '.css',
  '.html',
  '.yml',
  '.yaml',
  '.sh',
]);

function parseArgs(argv) {
  return {
    stdin: argv.includes('--stdin'),
  };
}

function extensionOf(path) {
  const lower = path.toLowerCase();
  const index = lower.lastIndexOf('.');
  return index >= 0 ? lower.slice(index) : '';
}

function isCheckedPath(path) {
  if (!path || path.startsWith('node_modules/') || path.startsWith('dist/')) {
    return false;
  }
  return CHECKED_EXTENSIONS.has(extensionOf(path));
}

function parseEolRows(output) {
  const violations = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const tabIndex = line.indexOf('\t');
    if (tabIndex < 0) continue;
    const metadata = line.slice(0, tabIndex);
    const path = line.slice(tabIndex + 1).trim();
    if (!metadata.includes('w/mixed') || !isCheckedPath(path)) continue;
    violations.push(path);
  }
  violations.sort((a, b) => a.localeCompare(b, 'en'));
  return violations;
}

function readEolOutput(options) {
  if (options.stdin) {
    return readFileSync(0, 'utf8');
  }
  const result = spawnSync('git', ['ls-files', '--eol'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ls-files --eol exited with status ${result.status}`);
  }
  return result.stdout;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const output = readEolOutput(options);
  const violations = parseEolRows(output);
  if (violations.length > 0) {
    process.stderr.write(`EOL policy check failed: ${violations.length} tracked text file(s) have mixed working-tree line endings.\n`);
    for (const path of violations) {
      process.stderr.write(`- ${path}\n`);
    }
    process.stderr.write('\nHeal with a clean/stashed tree, then run: git add --renormalize <scoped paths>\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('EOL policy check passed: no mixed working-tree line endings in tracked text files.\n');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}

module.exports = { parseEolRows };
