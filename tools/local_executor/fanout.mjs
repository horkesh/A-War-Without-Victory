#!/usr/bin/env node
/**
 * Run several INDEPENDENT delegations concurrently.
 *
 * WHY. Measured on this machine 2026-09-11: two requests issued together finished in 14.8s wall
 * against 27.7s of serial work — they overlapped almost completely. Most dispatches in practice
 * are independent (a test table here, a doc section there), so waiting for each in turn was
 * throwing away roughly half the wall-clock for nothing.
 *
 * WHAT THIS IS NOT. It is not an agent loop and it does not widen the executor's authority one
 * inch. Each job is still one bounded spec in, one text proposal out, written to its own file,
 * applied by nobody. Concurrency changes when the answers arrive, not who decides what they mean.
 *
 * CONCURRENCY IS CAPPED AND THAT CAP IS REAL. Slots come out of the same VRAM; past the point
 * where the model no longer fits, ollama serialises or swaps and throughput collapses. Two is
 * measured-good on 12 GB with a 9B model. Raise it only with a measurement in hand.
 *
 * Usage:
 *   node tools/local_executor/fanout.mjs jobs.json [--limit 2]
 *
 *   jobs.json is an array of argument arrays, each exactly as delegate.mjs would receive:
 *   [
 *     ["--spec", "a.md", "--out", "a.txt"],
 *     ["--spec", "b.md", "--out", "b.txt", "--schema", "s.json"]
 *   ]
 *
 * Exit code is the WORST of the jobs: one failure fails the batch, because a batch reported green
 * with a dead job inside it is the failure this repo keeps paying for.
 */

'use strict';

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const DELEGATE = join(here, 'delegate.mjs');

const args = process.argv.slice(2);
const jobsPath = args.find((arg) => !arg.startsWith('--'));
const limitArg = args.indexOf('--limit');
const limit = limitArg === -1 ? 2 : Number(args[limitArg + 1]);

if (!jobsPath) {
  console.error('usage: node tools/local_executor/fanout.mjs <jobs.json> [--limit N]');
  process.exit(2);
}
if (!existsSync(jobsPath)) {
  console.error(`REFUSING: jobs file not found: ${jobsPath}`);
  process.exit(2);
}
if (!Number.isInteger(limit) || limit < 1 || limit > 4) {
  console.error(`REFUSING: --limit must be 1..4, got "${limit}". Slots share VRAM; past the point`);
  console.error('where the model no longer fits, throughput collapses. Raise this with a measurement.');
  process.exit(2);
}

let jobs;
try {
  jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
} catch (error) {
  console.error(`REFUSING: jobs file is not valid JSON: ${error.message}`);
  process.exit(2);
}
if (!Array.isArray(jobs) || jobs.length === 0 || !jobs.every(Array.isArray)) {
  console.error('REFUSING: jobs file must be a non-empty array of argument arrays.');
  process.exit(2);
}

/** Run one delegation, resolving to its exit code. Never rejects — the batch reports every job. */
function runJob(jobArgs, index) {
  return new Promise((resolve) => {
    const label = `job ${index + 1}/${jobs.length}`;
    const child = spawn(process.execPath, [DELEGATE, ...jobArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      const status = code === 0 ? 'ok' : `FAILED (exit ${code})`;
      console.error(`\n── ${label}: ${status}`);
      for (const line of stderr.split('\n')) {
        if (/including |total input|output |shape|REFUSING|MALFORMED|REQUEST FAILED|dispatch /.test(line)) {
          console.error(`   ${line.trim()}`);
        }
      }
      resolve(code ?? 1);
    });
  });
}

const started = Date.now();
const codes = new Array(jobs.length).fill(null);
let next = 0;

async function worker() {
  for (;;) {
    const index = next;
    next += 1;
    if (index >= jobs.length) return;
    codes[index] = await runJob(jobs[index], index);
  }
}

await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, () => worker()));

const wall = ((Date.now() - started) / 1000).toFixed(1);
const failed = codes.filter((code) => code !== 0).length;
console.error(`\nfanout: ${jobs.length} job(s) at limit ${limit} in ${wall}s — ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
