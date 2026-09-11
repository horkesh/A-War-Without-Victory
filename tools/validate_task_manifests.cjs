#!/usr/bin/env node
/**
 * Validate the task manifests under docs/plans/tasks/.
 *
 * The rules come from `docs/plans/tasks/FORMAT.md`, which records where each came from. The two
 * that matter most were taken from SWE-bench, because both cover failures this repo has actually
 * had:
 *
 *   fails_now      A task that WRITES code must name a test that currently FAILS. SWE-bench
 *                  excludes any instance without such a transition, on the grounds that a test
 *                  which already passes cannot demonstrate the change worked. It is this repo's
 *                  "prove it fires by mutation" rule under another name.
 *
 *   must_not_break A task that writes code must name what has to keep passing. The repeated
 *                  failure here is a change that satisfies its own test and breaks a neighbour —
 *                  the CI install-contract test, inbox_dedup, and main going red twice.
 *
 * A READ-ONLY task (empty `edit`) is exempt from both: it changes nothing, so there is nothing to
 * regress and no failing test to flip. It must instead say how its output gets checked.
 *
 * Staleness is checked from `base_commit`: if a file the manifest names has changed since, the
 * manifest may be describing code that no longer exists.
 *
 * Usage:
 *   node tools/validate_task_manifests.cjs           exit 1 on any error
 *   node tools/validate_task_manifests.cjs --list    print every task and its status
 *
 * Deterministic: sorted output, no wall clock.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DIR = 'docs/plans/tasks';
const KINDS = ['extract', 'table', 'wiring', 'logic', 'prose', 'other'];
const STATUSES = ['open', 'blocked', 'done'];

function strictCompare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function manifestPaths(repoRoot = REPO_ROOT) {
  const dir = path.join(repoRoot, DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.yml'))
    .sort(strictCompare)
    .map((name) => `${DIR}/${name}`);
}

function load(relPath, repoRoot = REPO_ROOT) {
  // JSON_SCHEMA deliberately: it admits only null/bool/number/string, so no YAML tag can
  // construct a typed object. These files are data; nothing in them is ever evaluated.
  return yaml.load(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'), { schema: yaml.JSON_SCHEMA });
}

/** Files changed since `base_commit`, or null if git cannot answer. */
function changedSince(baseCommit, repoRoot = REPO_ROOT) {
  try {
    const out = execFileSync('git', ['-C', repoRoot, 'diff', '--name-only', `${baseCommit}..HEAD`], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
    return new Set(out.split('\n').filter(Boolean));
  } catch (error) {
    return null;
  }
}

function validateManifest(relPath, repoRoot = REPO_ROOT) {
  const errors = [];
  const push = (message) => errors.push(`${relPath}: ${message}`);

  let manifest;
  try {
    manifest = load(relPath, repoRoot);
  } catch (error) {
    return [`${relPath}: does not parse — ${error.message}`];
  }

  if (manifest.version !== 2) push(`version must be 2, got ${JSON.stringify(manifest.version)}`);

  // PRESENCE, not truthiness. Testing `!value` reported a field as missing when it held the
  // number 0 — an all-digit commit SHA parses as a number, and the negative test caught the
  // validator rejecting a perfectly valid manifest. A falsy value that is present is present.
  const isPresent = (value) => value !== undefined && value !== null && String(value).trim() !== '';
  for (const field of ['owning_plan', 'base_commit', 'lane', 'gate']) {
    if (!isPresent(manifest[field])) push(`missing required field \`${field}\``);
  }
  if (manifest.owning_plan && !fs.existsSync(path.join(repoRoot, manifest.owning_plan))) {
    push(`owning_plan \`${manifest.owning_plan}\` does not exist`);
  }

  // Required and non-empty: a manifest claiming everything is delegable is the claim to prevent.
  if (!Array.isArray(manifest.not_delegable) || manifest.not_delegable.length === 0) {
    push('not_delegable must be a non-empty list — name the judgement work this does not cover');
  }

  const changed = manifest.base_commit ? changedSince(manifest.base_commit, repoRoot) : null;

  if (!Array.isArray(manifest.tasks) || manifest.tasks.length === 0) {
    push('tasks must be a non-empty list');
    return errors.sort(strictCompare);
  }

  const seen = new Set();
  for (const task of manifest.tasks) {
    const label = task && task.id ? task.id : '(missing id)';
    if (!task || typeof task !== 'object') { push('a task entry is not an object'); continue; }
    if (!task.id) push('a task has no id');
    if (seen.has(task.id)) push(`${label}: duplicate id`);
    seen.add(task.id);

    if (!KINDS.includes(task.kind)) push(`${label}: kind must be one of ${KINDS.join(' | ')}`);
    if (!STATUSES.includes(task.status)) push(`${label}: status must be one of ${STATUSES.join(' | ')}`);
    if (!task.change || String(task.change).trim().length < 20) {
      push(`${label}: change must describe the work, not be a placeholder`);
    }
    if (!Array.isArray(task.edit)) push(`${label}: edit must be a list (use [] for read-only)`);
    if (!Array.isArray(task.read)) push(`${label}: read must be a list`);
    if (!Array.isArray(task.out_of_scope)) push(`${label}: out_of_scope must be a list`);

    for (const file of [...(task.edit ?? []), ...(task.read ?? [])]) {
      if (!fs.existsSync(path.join(repoRoot, file))) {
        push(`${label}: names \`${file}\`, which does not exist`);
      } else if (changed && changed.has(file)) {
        push(`${label}: \`${file}\` changed since base_commit — manifest may be stale, re-derive it`);
      }
    }

    const writes = Array.isArray(task.edit) && task.edit.length > 0;
    const blocked = task.status === 'blocked';

    if (writes && !blocked) {
      // The SWE-bench rule. A task that changes code without a currently-failing test cannot
      // demonstrate anything, and a task with no regression set is how a neighbour gets broken.
      if (!Array.isArray(task.fails_now) || task.fails_now.length === 0) {
        push(`${label}: edits code but names no fails_now test — a test that already passes cannot show the change worked`);
      }
      if (!Array.isArray(task.must_not_break) || task.must_not_break.length === 0) {
        push(`${label}: edits code but names no must_not_break tests — this repo's commonest failure is passing your own test and breaking a neighbour`);
      }
      for (const test of [...(task.fails_now ?? []), ...(task.must_not_break ?? [])]) {
        if (!fs.existsSync(path.join(repoRoot, test))) push(`${label}: test \`${test}\` does not exist`);
      }
    } else if (!blocked && !task.read_only_acceptance) {
      push(`${label}: read-only tasks must say how the output is checked (read_only_acceptance)`);
    }
  }

  return errors.sort(strictCompare);
}

function main() {
  const args = process.argv.slice(2);
  const paths = manifestPaths();

  if (paths.length === 0) {
    console.log('task manifests: none yet');
    process.exit(0);
  }

  if (args.includes('--list')) {
    for (const relPath of paths) {
      const manifest = load(relPath);
      console.log(`${relPath}  (lane ${manifest.lane}, gate ${manifest.gate})`);
      for (const task of manifest.tasks ?? []) {
        const writes = (task.edit ?? []).length > 0 ? 'writes' : 'read-only';
        console.log(`  [${String(task.status).padEnd(7)}] ${String(task.kind).padEnd(7)} ${writes.padEnd(9)} ${task.id}`);
      }
    }
    process.exit(0);
  }

  const errors = paths.flatMap((relPath) => validateManifest(relPath));
  if (errors.length > 0) {
    console.error(`task manifests: ${errors.length} error(s)`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const tasks = paths.reduce((sum, relPath) => sum + (load(relPath).tasks ?? []).length, 0);
  console.log(`task manifests: OK — ${paths.length} manifest(s), ${tasks} task(s)`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { manifestPaths, load, validateManifest, changedSince, KINDS, STATUSES, DIR };
