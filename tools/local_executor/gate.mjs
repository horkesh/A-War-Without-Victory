#!/usr/bin/env node
/**
 * Acceptance gate for local-model executor work.
 *
 * WHY THIS EXISTS
 *   A local model's failure mode in this repo is not bad TypeScript — it is plausible work
 *   that is silently wrong. Measured on this machine on 2026-09-10: asked for a deterministic
 *   comparator, a 30B model returned `a.id.localeCompare(b.id)`. That is locale-dependent,
 *   which violates the repo's first sacred rule, and it looked MORE professional than the
 *   correct answer. No unit test would have caught it.
 *
 *   So the executor never certifies itself. The planner declares which tests constitute
 *   acceptance; this script runs them and everything the repo already knows how to check.
 *
 * USAGE
 *   node tools/local_executor/gate.mjs --tests tests/a.test.ts,tests/b.test.ts
 *   npm run gate:local -- --tests tests/foo.test.ts
 *
 * EXIT CODES
 *   0  every check passed
 *   1  a check failed (message names which)
 *   2  the gate was invoked wrongly (no tests declared) — NOT a pass
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const testArg = args.includes('--tests') ? args[args.indexOf('--tests') + 1] : '';
const allowTestEdits = args.includes('--allow-test-edits');

const failures = [];
const notes = [];

/** Run a command, returning its OWN exit code. Never read a pipeline's status. */
function run(label, cmd, cmdArgs) {
  process.stdout.write(`\n── ${label}\n`);
  try {
    execFileSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
    return true;
  } catch (error) {
    failures.push(`${label} (exit ${error.status ?? 'unknown'})`);
    return false;
  }
}

/**
 * Run git with an ARGUMENT ARRAY, never an interpolated shell string — file paths come
 * from git output and must not be able to reach a shell.
 */
function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function gitLines(gitArgs) {
  return git(gitArgs).split('\n').map((l) => l.trim()).filter(Boolean);
}

// ── 0. The gate must be told what acceptance means. ────────────────────────────
if (!testArg) {
  console.error(
    '\nREFUSING: no --tests declared.\n' +
    'The planner names the test files that constitute acceptance; the executor may not\n' +
    'choose its own oracle. A gate with nothing to prove is not a passing gate.\n',
  );
  process.exit(2);
}
const testFiles = testArg.split(',').map((t) => t.trim()).filter(Boolean);
const missing = testFiles.filter((t) => !existsSync(t));
if (missing.length > 0) {
  console.error(`\nREFUSING: declared test file(s) do not exist: ${missing.join(', ')}\n`);
  process.exit(2);
}

// ── 1. Tests must not be edited to make themselves pass. ───────────────────────
// This repo has many source-string assertion tests; "fix the test" is the tempting
// wrong move and the one that quietly destroys the safety net.
const changedTests = gitLines(['diff', '--name-only', 'HEAD', '--', 'tests/']);
if (changedTests.length > 0) {
  if (allowTestEdits) {
    notes.push(`test files changed WITH --allow-test-edits (planner-authorised): ${changedTests.join(', ')}`);
  } else {
    failures.push(
      `tests/ was modified without --allow-test-edits: ${changedTests.join(', ')}\n` +
      '      If the test is genuinely wrong, the PLANNER decides that, not the executor.',
    );
  }
}

// ── 2. Determinism: the repo's first sacred rule. ──────────────────────────────
// Banned in all of src/, comments included. Checked on changed files only, so the
// executor is judged on its own work rather than pre-existing history.
const changedSrc = gitLines(['diff', '--name-only', 'HEAD', '--', 'src/']).filter((f) => /\.(ts|tsx|cjs|mjs|js)$/.test(f));
for (const file of changedSrc) {
  const body = git(['diff', '-U0', 'HEAD', '--', file]);
  const added = body.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const banned = [
    [/Math\.random/, 'Math.random'],
    [/Date\.now/, 'Date.now'],
    [/new Date\(\s*\)/, 'new Date()'],
    [/\.localeCompare\(/, '.localeCompare() — locale-dependent; use strictCompare'],
  ];
  for (const [pattern, name] of banned) {
    if (added.some((l) => pattern.test(l))) {
      failures.push(`determinism: ${file} adds ${name}`);
    }
  }
}
if (changedSrc.length > 0) {
  notes.push(`determinism scan covered ${changedSrc.length} changed src file(s)`);
} else {
  notes.push('determinism scan: no changed src files');
}

// ── 3. The repo's own mechanical checks. ───────────────────────────────────────
run('typecheck (tsc --noEmit)', 'npx', ['tsc', '--noEmit']);
run(`declared tests (${testFiles.length})`, 'npx', ['vitest', 'run', ...testFiles, '--reporter=basic']);
run('open-gates register', 'node', ['tools/validate_open_gates.cjs']);

// ── Verdict ────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(68));
for (const note of notes) console.log(`note: ${note}`);
if (failures.length === 0) {
  console.log('GATE PASS — all declared checks green.');
  console.log('='.repeat(68));
  process.exit(0);
}
console.log(`GATE FAIL — ${failures.length} problem(s):`);
for (const failure of failures) console.log(`  - ${failure}`);
console.log('='.repeat(68));
process.exit(1);
