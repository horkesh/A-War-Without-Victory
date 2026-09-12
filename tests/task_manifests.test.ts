/**
 * Task manifests carry the DELEGABLE part of a plan as data. The format and its provenance are in
 * `docs/plans/tasks/FORMAT.md`; the two rules worth restating are the ones taken from SWE-bench,
 * because both cover failures this repo has actually had.
 *
 *   fails_now       a task that WRITES code must name a test that currently FAILS. SWE-bench
 *                   excludes instances without such a transition — a test that already passes
 *                   cannot show the change worked. Same rule as "prove it fires by mutation",
 *                   reached independently elsewhere.
 *   must_not_break  it must also name what has to keep passing. The repeated failure here is a
 *                   change that satisfies its own test and breaks a neighbour: the CI
 *                   install-contract test, inbox_dedup, and main going red twice in two days.
 *
 * MOST OF THIS FILE IS NEGATIVE CASES, and that is the point. The validator's first version
 * rejected a perfectly valid manifest because it tested presence with `!value`, so a commit SHA
 * of all digits parsed as the number 0 and read as missing. That defect was found by the
 * positive control, not by any of the rejections — which is the same lesson every guard in this
 * repo has taught: a checker's false positives cost more than its misses.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const validator = require('../tools/validate_task_manifests.cjs') as {
  manifestPaths: (repoRoot?: string) => string[];
  load: (relPath: string, repoRoot?: string) => Record<string, unknown>;
  validateManifest: (relPath: string, repoRoot?: string) => string[];
  KINDS: string[];
};

let sandbox: string;

/** A manifest that is valid in every respect, used as the base for each negative case. */
function validBody(tasks: string): string {
  return `version: 2
owning_plan: docs/plans/plan.md
base_commit: 0000000000000000000000000000000000000000
lane: R7
gate: G1
not_delegable:
  - "Whether the result reads correctly — the owner's judgement, encoded by no test."
tasks:
${tasks}`;
}

function writeManifest(name: string, body: string): string {
  writeFileSync(join(sandbox, 'docs/plans/tasks', name), body);
  return `docs/plans/tasks/${name}`;
}

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'awwv-manifests-'));
  mkdirSync(join(sandbox, 'docs/plans/tasks'), { recursive: true });
  mkdirSync(join(sandbox, 'src'), { recursive: true });
  writeFileSync(join(sandbox, 'src/real.ts'), 'export const x = 1;\n');
  writeFileSync(join(sandbox, 'docs/plans/plan.md'), '# plan\n');
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const READ_ONLY_TASK = `  - id: T1
    kind: extract
    status: open
    edit: []
    read: ["src/real.ts"]
    change: "Report every exported symbol with the line it appears on."
    fails_now: []
    must_not_break: []
    out_of_scope: []
    read_only_acceptance: "Planner verifies each quote with local:verify-quotes."
`;

describe('task manifest validator — it must accept what is valid', () => {
  it('accepts a well-formed read-only manifest', () => {
    // The positive control, and the one that found the real defect: an all-digit base_commit
    // parses as a number, and presence-by-truthiness called it missing.
    const rel = writeManifest('good.yml', validBody(READ_ONLY_TASK));
    expect(validator.validateManifest(rel, sandbox)).toEqual([]);
  });

  it('accepts a falsy-but-present base_commit', () => {
    const rel = writeManifest('zero.yml', validBody(READ_ONLY_TASK).replace(
      'base_commit: 0000000000000000000000000000000000000000',
      'base_commit: 0000000000000000000000000000000000000000',
    ));
    const errors = validator.validateManifest(rel, sandbox);
    expect(errors.filter((e) => e.includes('base_commit'))).toEqual([]);
  });
});

describe('task manifest validator — it must reject what is not', () => {
  it('REJECTS a code-writing task that names no currently-failing test', () => {
    const rel = writeManifest('no_fails.yml', validBody(`  - id: T1
    kind: logic
    status: open
    edit: ["src/real.ts"]
    read: []
    change: "Change the exported constant so the dependent module compiles."
    fails_now: []
    must_not_break: ["src/real.ts"]
    out_of_scope: []
`));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/names no fails_now/);
  });

  it('REJECTS a code-writing task that names no regression set', () => {
    const rel = writeManifest('no_regress.yml', validBody(`  - id: T1
    kind: logic
    status: open
    edit: ["src/real.ts"]
    read: []
    change: "Change the exported constant so the dependent module compiles."
    fails_now: ["src/real.ts"]
    must_not_break: []
    out_of_scope: []
`));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/names no must_not_break/);
  });

  it('REJECTS a read-only task with no way to check its output', () => {
    const rel = writeManifest('no_accept.yml', validBody(`  - id: T1
    kind: extract
    status: open
    edit: []
    read: ["src/real.ts"]
    change: "Report every exported symbol with the line it appears on."
    fails_now: []
    must_not_break: []
    out_of_scope: []
`));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/read_only_acceptance/);
  });

  it('REJECTS a path that does not exist', () => {
    const rel = writeManifest('ghost.yml', validBody(READ_ONLY_TASK.replace('src/real.ts', 'src/imaginary.ts')));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/does not exist/);
  });

  it('REJECTS an empty not_delegable', () => {
    const rel = writeManifest('all_delegable.yml',
      validBody(READ_ONLY_TASK).replace(
        /not_delegable:\n  - "[^"]*"/,
        'not_delegable: []',
      ));
    expect(validator.validateManifest(rel, sandbox).join('\n'))
      .toMatch(/not_delegable must be a non-empty list/);
  });

  it('REJECTS a DIRECTORY in read — the error that cost three dispatches', () => {
    // WR01-T2 listed `tests/ui`. The dispatcher then chose files with a truncated grep and the
    // model returned four perfectly verified quotes from a test about army HQ timing copy. A
    // directory is an invitation to guess which files matter, and the guess is recorded nowhere.
    const rel = writeManifest('dir.yml', validBody(READ_ONLY_TASK.replace('src/real.ts', 'src')));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/is a DIRECTORY/);
  });

  it('REJECTS a duplicate task id', () => {
    const rel = writeManifest('dupe.yml', validBody(READ_ONLY_TASK + READ_ONLY_TASK));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/duplicate id/);
  });

  it('REJECTS an unknown kind', () => {
    const rel = writeManifest('kind.yml', validBody(READ_ONLY_TASK.replace('kind: extract', 'kind: vibes')));
    expect(validator.validateManifest(rel, sandbox).join('\n')).toMatch(/kind must be one of/);
  });
});

describe('staleness is measured against base_commit, and does not apply to finished work', () => {
  // A REAL GIT SANDBOX, because the staleness check asks git what changed and the main sandbox
  // above is not a repository — there, `changedSince` returns null and this rule never fires. A
  // test that cannot reach the code it names is worse than no test.
  let repo: string;
  let baseCommit: string;

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

  const manifestFor = (status: string): string => validBody(
    `  - id: T1\n`
    + `    kind: extract\n`
    + `    status: ${status}\n`
    + `    edit: []\n`
    + `    read:\n`
    + `      - src/real.ts\n`
    + `    change: "Report every exported symbol in the named file, verbatim."\n`
    + `    fails_now: []\n`
    + `    must_not_break: []\n`
    + `    read_only_acceptance: "Quotes verified against the source file by script."\n`
    + `    out_of_scope:\n`
    + `      - Editing anything\n`,
  );

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'awwv-stale-'));
    mkdirSync(join(repo, 'docs/plans/tasks'), { recursive: true });
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'docs/plans/plan.md'), '# plan\n');
    writeFileSync(join(repo, 'src/real.ts'), 'export const x = 1;\n');

    git('init', '-q');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    baseCommit = git('rev-parse', 'HEAD');

    // Now move the repo on, exactly as landing the work would.
    writeFileSync(join(repo, 'src/real.ts'), 'export const x = 2;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'the work lands');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('FLAGS an open task whose input moved — the manifest may be describing code that is gone', () => {
    const body = manifestFor('open').replace(
      'base_commit: 0000000000000000000000000000000000000000',
      `base_commit: ${baseCommit}`,
    );
    writeFileSync(join(repo, 'docs/plans/tasks/open.yml'), body);
    const errors = validator.validateManifest('docs/plans/tasks/open.yml', repo);
    expect(errors.join('\n')).toMatch(/changed since base_commit/);
  });

  it('does NOT flag a done task whose input moved — that is what finishing the work looks like', () => {
    // THE TIME BOMB THIS RULE SHIPPED WITH. WR01-T2 named a test file, the work landed, the file
    // changed, and CI went red on a manifest that was describing completed work perfectly
    // accurately. The check was measuring "has the repo moved on" and reporting it as "is this
    // manifest wrong". A finished task's inputs are SUPPOSED to have moved.
    const body = manifestFor('done').replace(
      'base_commit: 0000000000000000000000000000000000000000',
      `base_commit: ${baseCommit}`,
    );
    writeFileSync(join(repo, 'docs/plans/tasks/done.yml'), body);
    const errors = validator.validateManifest('docs/plans/tasks/done.yml', repo);
    expect(errors.join('\n')).not.toMatch(/changed since base_commit/);
    expect(errors).toEqual([]);
  });
});

describe('the committed manifests', () => {
  it('all validate', () => {
    const errors = validator.manifestPaths().flatMap((rel) => validator.validateManifest(rel));
    expect(errors).toEqual([]);
  });

  it('every task kind matches the ledger categories, so routing stays derivable', () => {
    for (const rel of validator.manifestPaths()) {
      const manifest = validator.load(rel) as { tasks: Array<{ id: string; kind: string }> };
      for (const task of manifest.tasks) {
        expect(validator.KINDS, `${rel} ${task.id}`).toContain(task.kind);
      }
    }
  });
});
