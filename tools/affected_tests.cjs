#!/usr/bin/env node
/**
 * Which test files reference the files this branch changed.
 *
 * WHY THIS EXISTS. Running the whole suite locally before every push duplicates twenty minutes of
 * work CI is about to do anyway, so the right local gate is "everything the change can actually
 * reach". Choosing that set BY HAND failed twice in one session, both times the same way:
 *
 *   - The font branch changed `src/ui/map/styles/globals.css` and a task manifest listed that path,
 *     so `tests/task_manifests.test.ts` went red in CI. That failure skipped the scenarios job,
 *     which correctly refused to let engine-health-188w report green.
 *   - The date branch edited a plan under `docs/plans/`, and `tests/plan_index.test.ts` derives an
 *     index from those plans. Red in CI again.
 *
 * Both misses were tests that consume DATA OR DOCS, not code. A grep for the source files I had
 * edited could not find them, because they do not name the source files — they name the directory
 * the data lives in. Doing it by eye means remembering that fact every time. This does not.
 *
 * It is a SUPERSET heuristic, deliberately: a test is included if it mentions a changed path, its
 * IMMEDIATE parent directory, or its basename. Over-inclusion costs a few seconds of test time;
 * under-inclusion is what put main at risk twice.
 *
 * IT IS NOT A SUBSTITUTE FOR CI. It answers "what should I run before pushing", not "is this
 * change safe". A test that reaches the change through three layers of imports without naming any
 * of them is invisible here and will be caught by the full suite in CI, which is where that job
 * belongs.
 *
 * Usage:
 *   node tools/affected_tests.cjs                  # list them, with why
 *   node tools/affected_tests.cjs <base-ref>       # default base is origin/main
 *   node tools/affected_tests.cjs --run            # RUN them, in chunks
 *   node tools/affected_tests.cjs --command        # print a command (small sets only)
 *
 * PREFER `--run`. `--command` printed an 8,532-character command line on its first real use and
 * Windows refused it outright — "The command line is too long", cmd.exe's 8,191-char limit, with
 * no test output and a bare exit 1 that looked exactly like a test failure. A selector whose
 * output cannot be executed is shelfware, so `--run` spawns the runner in chunks and fails if any
 * chunk fails.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_ROOT = 'tests';

/** Paths whose changes say nothing about which tests to run. */
const IGNORED = [
  /^logs\//,
  /^docs\/PROJECT_LEDGER/,
  /\.(png|jpg|jpeg|gif|webp|woff2?|ttf|otf|pdf)$/i,
];

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function changedFiles(baseRef, repoRoot = REPO_ROOT) {
  const out = execFileSync('git', ['-C', repoRoot, 'diff', '--name-only', `${baseRef}...HEAD`], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  const staged = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain', '--untracked-files=all'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  const working = staged.split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);

  const all = new Set([...out.split('\n').filter(Boolean), ...working]);
  return [...all].filter((file) => !IGNORED.some((pattern) => pattern.test(file))).sort(strictCompare);
}

function testFiles(repoRoot = REPO_ROOT) {
  const found = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.test\.[cm]?tsx?$/.test(entry.name)) {
        found.push(path.relative(repoRoot, full).replaceAll('\\', '/'));
      }
    }
  };
  visit(path.join(repoRoot, TEST_ROOT));
  return found.sort(strictCompare);
}

/**
 * Every string that would make a test "about" this file.
 *
 * The parent directory is the load-bearing part — it is how a data-driven test names its inputs.
 * A test that reads a whole directory says `docs/plans`, never the individual plan that changed.
 */
function needlesFor(file) {
  // THE IMMEDIATE PARENT ONLY. The first version walked every ancestor, which added `src/ui/map`
  // and matched 546 of ~600 test files — a "targeted" set that is the whole suite is not an answer,
  // it is the question restated. The immediate parent is specific enough to mean something
  // (`docs/plans`, `src/ui/map/components/warroom`) and is how data-driven tests name their inputs.
  //
  // No extensionless basename either: `globals`, `README` and `types` match half the repo.
  const needles = new Set([file, path.basename(file)]);
  const parent = path.dirname(file).replaceAll('\\', '/');
  if (parent.includes('/')) needles.add(parent);
  return [...needles].filter((needle) => needle.length >= 6);
}

/**
 * Scripts under tools/ and scripts/, with their text.
 *
 * ONE HOP OF INDIRECTION, and it is the hop that matters. `tests/plan_index.test.ts` never
 * mentions `docs/plans` — it requires `tools/derive_plan_index.cjs`, and the SCRIPT knows the
 * path. A pure path-grep from changed file to test therefore missed the exact failure this tool
 * was written for. So a changed path first pulls in any script that names it, and those scripts
 * are then matched against the tests like any other changed file.
 *
 * One hop, not a transitive closure: two hops through a repo this size pulls in everything, and a
 * "targeted" set that is the whole suite answers nothing.
 */
function helperScripts(repoRoot = REPO_ROOT) {
  const found = new Map();
  for (const root of ['tools', 'scripts']) {
    const base = path.join(repoRoot, root);
    if (!fs.existsSync(base)) continue;
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (/\.([cm]?js|ts)$/.test(entry.name)) {
          const rel = path.relative(repoRoot, full).replaceAll('\\', '/');
          try {
            found.set(rel, fs.readFileSync(full, 'utf8'));
          } catch {
            // Unreadable file: skip it rather than abort the whole listing.
          }
        }
      }
    };
    visit(base);
  }
  return found;
}

function affected(baseRef, repoRoot = REPO_ROOT) {
  const changed = changedFiles(baseRef, repoRoot);
  const tests = testFiles(repoRoot);
  const hits = new Map();

  // Expand the changed set by one hop through the scripts that consume those paths.
  const helpers = helperScripts(repoRoot);
  const reached = new Map();
  for (const file of changed) {
    for (const needle of needlesFor(file)) {
      for (const [script, text] of helpers) {
        if (changed.includes(script)) continue;
        if (text.includes(needle)) reached.set(script, file);
      }
    }
  }

  // A changed test always runs itself.
  for (const file of changed) {
    if (/\.test\.[cm]?tsx?$/.test(file) && fs.existsSync(path.join(repoRoot, file))) {
      hits.set(file, new Set(['(changed)']));
    }
  }

  const sources = new Map(tests.map((test) => [test, fs.readFileSync(path.join(repoRoot, test), 'utf8')]));
  const searchSet = [
    ...changed.map((file) => [file, file]),
    ...[...reached].map(([script, via]) => [script, `${via} → ${script}`]),
  ];

  for (const [file, reason] of searchSet) {
    for (const needle of needlesFor(file)) {
      for (const [test, text] of sources) {
        if (!text.includes(needle)) continue;
        if (!hits.has(test)) hits.set(test, new Set());
        hits.get(test).add(reason);
      }
    }
  }

  return { changed, reached, tests: [...hits.keys()].sort(strictCompare), why: hits };
}

function main() {
  const args = process.argv.slice(2);
  const wantCommand = args.includes('--command');
  const baseRef = args.find((arg) => !arg.startsWith('--')) ?? 'origin/main';

  const { changed, tests, why } = affected(baseRef);

  if (changed.length === 0) {
    console.error(`no changes vs ${baseRef}`);
    process.exit(0);
  }

  if (wantCommand) {
    if (tests.length === 0) {
      console.error('no test file references any changed path — run the full suite');
      console.log('npm run test:vitest');
      process.exit(0);
    }
    const command = `npm run test:vitest -- ${tests.join(' ')}`;
    // cmd.exe caps a command line at 8191 characters, and npm shells through it. Printing a
    // longer one hands back something that dies with "The command line is too long" and a bare
    // exit 1 -- indistinguishable from a test failure. Say so instead of emitting it.
    if (command.length > 7500) {
      console.error(`${tests.length} test files is ${command.length} characters — too long for a `
        + 'single command line on Windows (8191 limit). Use --run, which chunks it.');
      process.exit(2);
    }
    console.log(command);
    process.exit(0);
  }

  if (args.includes('--run')) {
    if (tests.length === 0) {
      console.error('no test file references any changed path — running the full suite instead');
      const full = spawnSync('npm', ['run', 'test:vitest'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true });
      process.exit(full.status ?? 1);
    }

    // 30 files per chunk keeps each command near 1.5KB, well inside every platform's limit.
    const CHUNK = 30;
    const chunks = [];
    for (let i = 0; i < tests.length; i += CHUNK) chunks.push(tests.slice(i, i + CHUNK));

    console.error(`running ${tests.length} affected test file(s) in ${chunks.length} chunk(s)\n`);
    const failed = [];
    for (const [index, chunk] of chunks.entries()) {
      console.error(`--- chunk ${index + 1}/${chunks.length} (${chunk.length} files) ---`);
      const result = spawnSync('npm', ['run', 'test:vitest', '--', ...chunk], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        shell: true,
      });
      if (result.status !== 0) failed.push(index + 1);
    }

    if (failed.length > 0) {
      console.error(`\nFAILED in chunk(s): ${failed.join(', ')}`);
      process.exit(1);
    }
    console.error(`\nall ${tests.length} affected test file(s) passed`);
    process.exit(0);
  }

  console.error(`${changed.length} changed file(s) vs ${baseRef}; ${tests.length} test file(s) reference them:\n`);
  for (const test of tests) {
    const reasons = [...why.get(test)].sort(strictCompare).slice(0, 3).join(', ');
    console.error(`  ${test}\n      via ${reasons}`);
  }
  console.error('\nSUPERSET heuristic, and not a substitute for CI: a test that reaches the change');
  console.error('only through imports names none of these paths and will not appear here.');
  process.exit(0);
}

if (require.main === module) main();

module.exports = { affected, changedFiles, testFiles, needlesFor };
