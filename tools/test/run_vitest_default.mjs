#!/usr/bin/env node
/**
 * Default entry point for `npm run test:vitest`.
 *
 * WHY THIS EXISTS. The whole-suite gate has two correct ways to run and they are not
 * interchangeable:
 *
 *   - NO ARGUMENTS — "run the suite". Routes to the BALANCED runner, which is what CI's
 *     full-suite gate (.github/workflows/full-suite-and-fingerprint.yml) executes. It
 *     partitions the ~1,290 discovered files into duration-balanced shards and runs them
 *     as separate vitest processes. Each shard keeps `fileParallelism: false` and
 *     `maxWorkers: 1` internally, so the serialisation those settings exist to guarantee
 *     is preserved WITHIN a shard; the parallelism is only ACROSS shards. Measured on the
 *     stored inventory: ~7.1 min per shard against ~28.4 min summed serially, and far more
 *     than that in practice once per-file startup under `maxWorkers: 1` is included.
 *
 *   - WITH ARGUMENTS — "run these tests". Routes to plain `vitest run <args>`. It MUST NOT
 *     go through the balanced runner: that runner hands each shard an EXPLICIT file list,
 *     so a user-supplied file filter or `-t` pattern matches in at most one shard and the
 *     others exit non-zero having found no tests. Verified against
 *     `run_vitest_balanced.mjs --list`, which shows per-shard explicit `files` arrays.
 *
 * Before this dispatcher, `test:vitest` was a bare `vitest run` — the slowest path to the
 * same coverage — and CLAUDE.md pointed every reader at it. `tests/test_runner_default_contract.test.ts`
 * keeps the docs, the npm scripts and the CI workflow from drifting apart again.
 *
 * Escape hatch: `npm run test:vitest:serial` is the unsharded whole-suite run, for
 * diagnosing a suspected cross-shard interaction.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const userArgs = process.argv.slice(2);

/** Balanced sharding matches CI's full-suite gate. Keep the shard count in step with it. */
const BALANCED_ARGS = ['--shards=4', '--', '--reporter=dot', '--silent'];

function run(command, args) {
    const child = spawn(process.execPath, [command, ...args], {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
    });
    child.once('error', (error) => {
        console.error(`[test:vitest] failed to start: ${error.message}`);
        process.exit(1);
    });
    child.once('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
}

if (userArgs.length === 0) {
    run(join(here, 'run_vitest_balanced.mjs'), BALANCED_ARGS);
} else {
    // A filter was supplied: run it directly, unsharded, so every named file is reachable.
    run(join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs'), ['run', ...userArgs]);
}
