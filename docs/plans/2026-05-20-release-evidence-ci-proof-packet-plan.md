# Release Evidence CI Proof Packet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a repeatable proof packet before large merge waves or release-candidate claims, consolidating local checks, GitHub Actions status, baseline hashes, generated-artifact ownership, and operator-only evidence.

**Architecture:** Separate repo-verifiable evidence from operator-only release evidence. The packet records exact commands, hashes, run ids, dirty generated artifacts, and CI URLs without claiming clean-VM, installer, or store outcomes that were not actually run.

**Tech Stack:** Git, GitHub Actions via `gh`, npm scripts, baseline runner, release docs under `docs/50_launch/` and `docs/40_reports/release/`.

---

## Source Docs

- `docs/40_reports/release/20260519_RC_EVIDENCE_BUNDLE.md`
- `docs/40_reports/release/20260519_RELEASE_ARTIFACT_INDEX.md`
- `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`
- `docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md`
- `docs/50_launch/release/checklist.md`
- `docs/50_launch/release/launch_day_automation_template.md`
- `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`

## Scope

In scope:
- Proof-packet template and first filled packet for current main.
- Local command matrix.
- GitHub Actions run id matrix.
- Baseline hash matrix.
- Dirty generated-artifact ownership statement.
- Operator-only evidence checklist.

Out of scope:
- Running clean-VM checks.
- Signing installers.
- Opening a release.
- Editing release binaries.
- Changing CI workflows unless a failing check requires a separate fix plan.

## Task 1: Create The Proof Packet Template

**Files:**
- Create: `docs/40_reports/release/YYYYMMDD_RELEASE_EVIDENCE_CI_PROOF_PACKET.md`

**Required sections:**
1. Git fingerprint:
   - branch
   - `HEAD`
   - `origin/main`
   - ahead/behind state
   - dirty files
2. Local verification:
   - command
   - result
   - run timestamp
   - relevant counts
3. GitHub Actions:
   - workflow name
   - run id
   - status
   - conclusion
   - commit hash
4. Baseline evidence:
   - accepted 40w run/hash
   - accepted 52w or 188w run/hash where relevant
   - `npm.cmd run test:baselines` result
5. Generated artifact ownership:
   - files intentionally dirty
   - files refreshed and committed
   - files ignored or debug-only
6. Operator-only evidence:
   - clean VM install
   - SmartScreen UX
   - store packaging
   - external playtest artifacts

## Task 2: Define Local Command Matrix

**Minimum commands before major merge wave:**

```powershell
git status --short --branch
npm.cmd run typecheck
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
npm.cmd run test:baselines
npm.cmd run desktop:map:build
git diff --check
```

**Add when touched:**
- UI changes: focused UI/adapter tests and browser/visual evidence when applicable.
- Sim/state changes: focused sim tests plus baseline run.
- Release packaging changes: `npm.cmd run desktop:release:check`.
- Docs-only changes: `git diff --check` and link validation if available.

**Acceptance:** The packet makes clear which commands are required, optional, skipped, and why.

## Task 3: Capture GitHub Actions Status

**Commands:**

```powershell
gh run list --branch main --limit 10
gh run view <run-id> --log-failed
```

**Rules:**
- Do not claim CI is green until Actions are completed successfully.
- If Actions are pending, state "pending" with run ids.
- If Actions fail, stop release/merge proof and route to CI triage.

## Task 4: Capture Generated Artifact Ownership

**Known transient examples:**
- `.claude/settings.local.json`
- `data/derived/latest_run_final_save.json`

**Rules:**
- If dirty generated data is intentionally transient, list it as unstaged and excluded.
- If generated data is part of a fixture refresh, list the command that produced it and the tests that consume it.
- Never mix transient generated output into a release proof commit without an explicit owner.

## Task 5: Fill The Current Packet

**Steps:**
1. Use current main after the latest accepted push.
2. Run the required local matrix.
3. Record current Actions status.
4. Record current accepted baseline hashes from `MASTER_ROADMAP.md`.
5. Record any skipped commands with reasons.
6. Append docs-only ledger entry.

**Verification:**

```powershell
git diff --check
```

## Stop Gates

- Stop if working tree has unclassified source changes.
- Stop if local typecheck or baselines fail.
- Stop if GitHub Actions fail.
- Stop if proof would claim operator-only evidence that has not been run.
- Stop if generated artifact ownership is ambiguous.
