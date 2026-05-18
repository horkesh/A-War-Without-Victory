# Autonomous RC Evidence Bundle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Assemble a release-candidate evidence bundle from existing validations and templates without claiming operator-only release gates are complete.

**Architecture:** RC evidence is a bundle of pointers, command outputs, hashes, known issues, and gate status. Code changes are out of scope unless evidence collection reveals a concrete release blocker.

**Tech Stack:** Existing npm build/test scripts, release templates, Markdown reports, package artifact hash commands.

---

## Task 1 - RC Gate Inventory

**Files:**

- Read: `docs/plans/2026-05-17-gold-gate-launch-day-plan.md`
- Read: `docs/plans/2026-05-17-clean-vm-cosmetic-finalization-plan.md`
- Read: `docs/plans/2026-05-17-external-playtest-readiness-plan.md`
- Create: `docs/40_reports/release/YYYYMMDD_RC_EVIDENCE_BUNDLE.md`

**Steps:**

1. List every RC gate.
2. Mark each as repo-verifiable, operator-only, historian/user-gated, or not yet prepared.
3. Link existing evidence templates/reports.
4. Do not mark operator-only gates complete.

## Task 2 - Command Evidence Section

If the user wants fresh RC evidence, run:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:map:build`
- `npm.cmd run desktop:release:check` if available/current
- package smoke commands only if artifacts and time budget are available

Record exact results. If commands are not run, label them "not freshly run in this bundle."

## Task 3 - Artifact And Hash Section

**Steps:**

1. Inventory current build/package artifact paths.
2. If artifacts exist, record size and SHA-256.
3. If artifacts are stale/missing, mark "operator/build required" instead of inventing paths.
4. Link clean-VM and playtest templates.

## Task 4 - Known Issues And Waivers

**Steps:**

1. Pull known residuals from roadmap/backlog.
2. Classify P0/P1/P2.
3. For any waiver, require owner, evidence reviewed, expiry, player visibility, and rollback implication.
4. Do not create waivers without user approval.

## Validation

- `git diff --check -- docs/40_reports/release docs/plans/MASTER_ROADMAP.md docs/PROJECT_LEDGER.md`

If scripts/docs changed beyond the bundle:

- `npm.cmd run typecheck`
- focused tests as needed

## Stop Gates

- Stop before claiming gold/RC readiness without fresh gate evidence.
- Stop before clean-VM, store, playtest, SmartScreen, registry, AppData, outreach, or privacy claims without operator proof.
- Stop if launch copy/legal/privacy decisions are missing.

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the RC evidence worker for AWWV. Assemble a release-candidate evidence bundle from current repo truth and clearly separate repo-verified gates from operator-only gates.

### 2. Canon references

Read the gold gate, clean-VM, external playtest, marketing/store, and telemetry/crash-reporting plans plus current roadmap/backlog.

### 3. Determinism and ledger constraints

No fabricated evidence. Stable sorted tables. Ledger entry required if the bundle becomes an accepted release artifact.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop for operator-only evidence claims or launch/legal/privacy decisions.

### 5. Output format and validation

Report bundle path, gates marked repo-verified/operator-only/gated, commands run, artifacts hashed, known issues, and blockers to RC claim.

