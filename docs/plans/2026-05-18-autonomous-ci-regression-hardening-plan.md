# Autonomous CI Regression Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the fast-suite and scenario regression gates harder to stale-drift after large autonomous batches.

**Architecture:** This plan extends the existing CI/test feedback-loop work with post-Batch-36 lessons: full fast-suite failures can hide behind focused green runs, docs-truth tests must be re-authored rather than skipped, and generated artifacts need explicit builder ownership. CI/test hardening should add signal without weakening release gates.

**Tech Stack:** Vitest, npm scripts, GitHub Actions, TypeScript fixtures, Markdown diagnostics.

---

## Task 1 - Fast-Suite Drift Taxonomy

**Files:**

- Create: `docs/40_reports/audits/YYYYMMDD_FAST_SUITE_DRIFT_TAXONOMY.md`

**Steps:**

1. Review Batch 36 report.
2. Classify stale failures by fixture drift, schema drift, generated artifact drift, docs-truth drift, and behavior expectation drift.
3. For each class, document the right fix and the forbidden shortcut.
4. Add a reviewer checklist for future Claude handoffs.

## Task 2 - Docs-Truth No-Skip Guard

**Objective:** Prevent stale docs-truth tests from being silenced with `it.skip`.

**Possible files:**

- Existing test tooling under `tools/test/`
- New test under `tests/`

**Steps:**

1. Search for `it.skip` and `describe.skip` in docs-truth tests.
2. Add a static test that fails if `tests/docs_*truth*.test.ts` contains `.skip(` without an allowlisted explanation.
3. Keep the allowlist empty unless Codex/user approves.

**Validation:**

- `npx.cmd vitest run <new-test> --reporter=dot`
- `npm.cmd test` if test harness risk is nontrivial

## Task 3 - Generated Artifact Ownership Matrix

**Objective:** Make it clear which command owns each committed generated artifact touched by tests.

**Files:**

- Create or update a docs matrix under `docs/20_engineering/` or `docs/40_reports/audits/`.

**Rows to include initially:**

- `data/derived/startup/apr_1992_initial_save.json`
- `tools/diagnostics/output/save_migration_drift.json`
- baseline regression artifacts
- visual validation artifacts

**Columns:**

- artifact
- owner command
- validation command
- commit policy
- transient/run-output policy

## Task 4 - Optional Scripted Pre-Merge Gate

**Objective:** Add a single local command that runs the known merge gate in order, if no equivalent exists.

**Steps:**

1. Inspect `package.json` for existing pre-merge/release scripts.
2. If missing, propose or add a script such as:
   - typecheck
   - fast test
   - baselines
   - desktop map build
   - diff check cannot live inside npm reliably, so document separately if needed.
3. Do not make CI slower unless the script is local-only or clearly justified.

## Validation

- `npm.cmd run typecheck` if code/scripts changed
- focused tests for new static guards
- `git diff --check`

## Stop Gates

- Stop if the hardening would skip, weaken, or rename existing release gates.
- Stop if a generated artifact owner is unclear.
- Stop if CI changes require GitHub credentials or remote execution.

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the CI/regression-hardening worker for AWWV. Implement the post-Batch-36 safeguards that prevent focused-green/full-red drift from recurring.

### 2. Canon references

Read Batch 36 report, existing CI feedback-loop plan/report, package scripts, workflow files, and relevant tests.

### 3. Determinism and ledger constraints

No nondeterministic test ordering or timestamped generated content. Stable sorted matrices. Ledger entry required for new process gates.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop if an existing gate would be weakened.

### 5. Output format and validation

Report new guards/docs, commands run, whether full `npm.cmd test` was run, and remaining CI risks.

