# Autonomous Merge PR Evidence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare a reviewer-friendly merge/PR evidence packet for the large autonomous branch without pushing, merging, or opening a PR unless the user explicitly asks.

**Architecture:** Treat the branch as a claim set that needs summarized evidence, not line-by-line persuasion. The packet should categorize commits, identify output-affecting changes, list validation proof, and surface residual risks/gates. It must be generated from local git/docs state, not from agent memory.

**Tech Stack:** Git CLI, Markdown reports, existing ledger/reports, `npm` validation commands where needed.

---

## Scope

In scope:

- Draft PR body / merge evidence report.
- Commit category summary since `origin/main`.
- Validation command matrix.
- Known residual risks and operator-only gates.
- Reviewer reading path.

Out of scope:

- Pushing the branch.
- Opening a PR.
- Squashing or rebasing commits.
- Deciding merge strategy for the user.

## Task 1 - Build The Commit Inventory

**Files:**

- Create: `docs/40_reports/audits/YYYYMMDD_BRANCH_MERGE_EVIDENCE_PACKET.md`

**Steps:**

1. Run `git status --short --branch`.
2. Stop if unrelated dirty files exist.
3. Run `git log --oneline origin/main..HEAD`.
4. Run `git diff --stat origin/main..HEAD`.
5. Categorize commits into:
   - sim/output behavior
   - UI/product
   - performance/attribution
   - tests/fixtures/generated artifacts
   - docs/plans/reports
   - operator-support-only
6. Record exact commit range and branch tip.

## Task 2 - Build The Evidence Matrix

**Steps:**

1. Read latest ledger entries and implemented reports for Batches 19+.
2. Extract only locally verifiable evidence: command, pass/fail, run id, hash, consistency result.
3. Create a table:

| Area | Evidence | Command/report | Risk |
|---|---|---|---|

4. Mark evidence as stale if it predates a later relevant change.
5. Do not claim full validation unless the command was run after the latest relevant commit.

## Task 3 - Draft The PR Body

**Output sections:**

1. Summary.
2. Major behavior/output changes.
3. Hash/determinism proof.
4. Test/build proof.
5. Generated artifacts.
6. Review guide.
7. Known residual risks.
8. Operator-only gaps.

Keep the PR body skimmable. Link detailed reports instead of pasting long tables.

## Task 4 - Optional Fresh Merge Gate

If the user asks for a merge-ready packet, run:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:map:build`
- `git diff --check`

Record exact pass/fail results in the packet.

## Validation

- `git diff --check -- docs/40_reports/audits/YYYYMMDD_BRANCH_MERGE_EVIDENCE_PACKET.md`

## Stop Gates

- Stop if branch has unrelated dirty files.
- Stop if `origin/main` is missing or stale and network fetch is unavailable.
- Stop before push/PR/merge unless user explicitly asks.
- Stop if validation evidence is insufficient for a merge-ready claim.

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the merge-evidence worker for AWWV. Produce a local PR/merge evidence packet from git, reports, and fresh validation if requested.

### 2. Canon references

Read `docs/PROJECT_LEDGER.md`, `docs/plans/MASTER_ROADMAP.md`, the latest implemented reports, and the selected branch diff.

### 3. Determinism and ledger constraints

Do not invent validation. Stable ordering is required for commit/category tables. No timestamps except the report date in the filename.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop before push, PR creation, squash, rebase, or merge.

### 5. Output format and validation

Return changed files, command outputs summarized, evidence packet path, whether fresh merge gates were run, and remaining merge blockers.

