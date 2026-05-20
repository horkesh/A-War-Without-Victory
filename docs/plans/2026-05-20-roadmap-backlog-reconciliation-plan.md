# Roadmap Backlog Reconciliation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reconcile `MASTER_ROADMAP.md` and `CONSOLIDATED_BACKLOG.md` to the accepted strict-null and roadmap state after Batch 48 without inventing new work or changing implementation status beyond verified evidence.

**Architecture:** Treat docs reconciliation as an evidence ledger update. Read current disk state, compare roadmap/backlog claims to ledger and inventory, then edit only stale status/count text.

**Tech Stack:** Markdown docs, `tools/diagnostics/strict_null_inventory.cjs`, Git history, GitHub Actions status if needed.

---

## Source Docs

- `docs/plans/MASTER_ROADMAP.md`
- `docs/40_reports/CONSOLIDATED_BACKLOG.md`
- `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Scope

In scope:
- Strict-null status/count reconciliation through Batch 48 and the accepted AI parser lane if it has landed.
- Backlog references to stale Phase 2 remaining counts.
- Roadmap references to stale "remaining combat/UI slices" language.
- Links to newly prepared plans.
- A docs-only ledger entry.

Out of scope:
- Changing roadmap priorities.
- Marking unimplemented plans as implemented.
- Editing canon.
- Editing `FORAWWV.md`.
- Updating generated artifacts.

## Task 1: Gather Current Evidence

**Commands:**

```powershell
git status --short --branch
git log --oneline --decorate -8
node tools\diagnostics\strict_null_inventory.cjs > data\derived\_debug\strict_null_inventory_reconcile.json
gh run list --branch main --limit 6
```

**Steps:**
1. Record current `HEAD`.
2. Record accepted main tip and whether Batch 48 Actions passed or are still pending.
3. Record strict-null counts from generated inventory.
4. Record whether the AI parser schema lane has landed.

**Acceptance:** No docs edit starts until the reconciliation has current counts.

## Task 2: Reconcile Strict-Null Counts

**Files:**
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/40_reports/CONSOLIDATED_BACKLOG.md`

**Rules:**
- Use current inventory counts only.
- If AI parser has not landed, say `as_factionid_casts = 3` with two UI-literal-union retained sites and one parser schema lane pending.
- If AI parser has landed, say `as_factionid_casts = 2` with both retained in `GameStateAdapter.ts`.
- Preserve the distinction between accepted implementation and planned next phase.
- Do not claim `strictNullChecks` migration is closed while `as unknown`, `as any`, non-null assertions, or optional `GameState` fields remain.

**Acceptance:** Roadmap and backlog agree on the same strict-null floor.

## Task 3: Reconcile Linked Plan Status

**Files:**
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/40_reports/CONSOLIDATED_BACKLOG.md`

**Plans to link if present:**
- `docs/plans/2026-05-20-ai-commander-response-parser-schema-validation-plan.md`
- `docs/plans/2026-05-20-strict-null-post-factionid-roadmap.md`
- `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
- `docs/plans/2026-05-20-h1-watched-operation-visibility-refresh-plan.md`
- `docs/plans/2026-05-20-notification-sensitive-content-review-prep-plan.md`
- `docs/plans/2026-05-20-release-evidence-ci-proof-packet-plan.md`

**Rules:**
- Mark these as planning/control assets only.
- Do not mark the underlying lanes complete.
- If a plan supersedes a stale plan, say "refresh plan" rather than deleting the old context.

## Task 4: Ledger And Knowledge Update

**Files:**
- Modify: `docs/PROJECT_LEDGER.md`
- Optional: `docs/PROJECT_LEDGER_KNOWLEDGE.md`

**Steps:**
1. Add a docs-only ledger entry naming exact files reconciled.
2. State no code, canon, generated artifacts, or scenario outputs changed.
3. Update knowledge only if a durable process rule is discovered.

## Required Verification

```powershell
git diff --check
```

Optional if any markdown table generator is used:

```powershell
npm.cmd run docs:lint
```

Do not run typecheck or baselines for docs-only reconciliation.

## Stop Gates

- Stop if Batch 48 Actions are failing and reconciliation would depend on their success.
- Stop if Claude has local uncommitted source changes in the same checkout.
- Stop if current inventory counts differ from ledger in a way that cannot be explained by accepted commits.
- Stop if the edit would require changing canon or `FORAWWV.md`.
- Stop if the backlog asks for a priority decision not already made by the user.
