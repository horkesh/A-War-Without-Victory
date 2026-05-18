# Autonomous Dispatch Index Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide a stable dispatcher for choosing the next substantial Claude lane after the full fast-suite merge gate.

**Architecture:** This is a routing plan, not a code lane. It points Claude to the correct lane bank based on current branch state, dirty files, stop gates, and user availability. It prevents micro-tasking by grouping work into coherent batch-sized lanes.

**Tech Stack:** Markdown planning, existing Vitest/typecheck/build/scenario commands, existing ledger/report workflow.

---

## Dispatch Rule 0 - Always Verify The Branch State

Before choosing a lane:

1. Run `git status --short --branch`.
2. If unrelated dirty files exist, stop and report them.
3. If a Claude/external implementation is dirty, do not start a new lane until Codex accepts or rejects it.
4. If the branch has not passed `npm.cmd test` since the latest large batch, run the merge-gate validation before starting product work.

## Primary Lane Banks

Use these in order unless Codex/user gives a newer priority:

1. `docs/plans/2026-05-18-autonomous-roadmap-lane-bank.md`
   - Broad default queue.
   - Best when Claude needs many days of mixed work.
   - Starts with merge gate, then sector perf, serialization, strict-null, supply, Decision Room, GUI, endgame, onboarding, accessibility, H1, notification prep, localization, and support-only lanes.

2. `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md`
   - Use when the branch needs measurable engine quality work.
   - Best for sector perf, serialization, strict-null, H1 diagnostic/reporting, and baseline hygiene.
   - Requires 40w/consistency proof for sim-output risks.

3. `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md`
   - Use when the branch needs player-facing product lift.
   - Best for supply visibility, Decision Room pushback, GUI playtest D3-D7, progressive disclosure, verdict mobile subdivision, onboarding evidence, and accessibility RC browser proof.
   - Must not invent new sim authority.

4. `docs/plans/2026-05-18-gated-research-operator-lane-bank.md`
   - Use when code lanes are blocked or user will be away.
   - Best for notification classification, officer/essay roster locks, localization extraction audit, soundscape readiness, operator evidence support, and PR evidence pack.
   - Must not claim historian/user/operator gates are complete.

## Secondary Evidence Plans

Use these when implementation lanes need proof scaffolding, merge support, or release-candidate evidence:

1. `docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md`
   - Drafts a local PR/merge evidence packet.
   - Does not push, squash, open PRs, or merge.

2. `docs/plans/2026-05-18-autonomous-visual-qa-evidence-plan.md`
   - Builds a repeatable browser/visual evidence matrix.
   - Fixes code only if evidence finds a concrete defect.

3. `docs/plans/2026-05-18-autonomous-ci-regression-hardening-plan.md`
   - Adds post-Batch-36 regression safeguards and generated-artifact ownership docs.
   - Must not weaken existing gates.

4. `docs/plans/2026-05-18-autonomous-rc-evidence-bundle-plan.md`
   - Assembles release-candidate evidence while keeping operator-only gates separate.
   - Must not claim gold/RC readiness without fresh proof.

## Remaining-Work Coverage Plans

Use these when Codex/user asks for "all remaining work" coverage or when a primary lane blocks on a gate:

1. `docs/plans/2026-05-18-autonomous-remaining-work-coverage-matrix.md`
   - Top-level matrix routing every residual roadmap/backlog class to an autonomous, gated-prep, or operator-only owner.
   - Best first read before assigning Claude a long unattended work session.

2. `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`
   - Focused determinism bank for save-continue hash-chain, replay equivalence, and packaging-build determinism support.
   - Requires extra caution around generated artifacts and scenario hashes.

3. `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md`
   - Support-only bank for Open Design Questions, FORAWWV review packets, sensitive-history treatment, and RS/HRHB/enclave gate packets.
   - Must not edit `FORAWWV.md` or settle design questions.

4. `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md`
   - Content/Codex bank for notification residual prep, dynamic Codex breadth, attribution matrices, and downstream arc packets.
   - Must stop before unreviewed sensitive-history prose or new historical claims.

5. `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md`
   - Platform/release bank for repo-side reproducible-build support, clean-VM packet refresh, signing/macOS/auto-update decision prep, and release artifact indexing.
   - Operator-only proof stays pending.

6. `docs/plans/2026-05-18-autonomous-product-polish-and-assets-bank.md`
   - Product polish/assets bank for Warroom ambient motion, soundscape readiness, side-picker validation, press/trailer evidence prep, and High Concept one-pager.
   - Public assets and marketing claims require approval.

## Recommended Sequencing After Batch 36

If Claude asks what to do next after Batch 36:

1. If a sector-performance dirty diff exists, finish or reject that exact sector lane first.
2. Then use the engine-quality bank:
   - EQ-1 Sector split-pieces optimization.
   - EQ-2 Serialization week-39 redundant write.
   - EQ-3 Strict-null Phase 3 safe slice.
3. If engine work blocks on hash drift or sensitive-history gates, switch to the UI/product bank:
   - UI-1 Supply visibility.
   - UI-2 Decision Room pushback.
   - UI-3 GUI Playtest D3-D7.
4. If code lanes are blocked or the user is away for a long interval, switch to the gated bank:
   - GR-1 Notification sensitive-content review prep.
   - GR-2/GR-3 roster locks.
   - GR-7 PR and merge evidence pack.
5. If the user asks for all remaining work or a full-day autonomous assignment, start from the remaining-work coverage matrix and pair one code lane with one support/evidence lane.

## Merge Readiness Gate

Before suggesting merge/PR:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:map:build`
- `git diff --check`
- Verify any active 40w/consistency proof claimed by recent sim/output batches.
- Produce a concise PR evidence pack if the branch remains very large.

## Stop Gates

Stop and ask Codex/user if:

- There are unrelated dirty files.
- A 40w hash changes unexpectedly.
- A sensitive-history operation newly delivers or changes outcome.
- A lane needs historian sign-off, FORAWWV edit, Open Design Question ratification, clean-VM proof, external playtest evidence, store/press publication, or marketing claims.
- The next step would be a micro-task with no roadmap value.

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the autonomous AWWV implementation worker. Use `docs/plans/2026-05-18-autonomous-dispatch-index.md` to choose the correct lane bank, then execute one coherent batch at a time.

### 2. Canon references

Read the selected lane bank, `docs/plans/MASTER_ROADMAP.md`, `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`, and batch-specific source docs before editing.

### 3. Determinism and ledger constraints

No timestamps, randomness, nondeterministic ordering, hidden-truth leaks, or cross-run mutable caches. Update implemented reports and `docs/PROJECT_LEDGER.md` after validation. Use 40w/consistency proof for sim-output risk.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop for unexpected hash drift, sensitive-history outcomes, user-only gates, historian-only content, or operator-only evidence.

### 5. Output format and validation

Report branch state, selected lane bank, files changed, commands run with pass/fail, 40w/consistency proof if applicable, docs updates, commit hash or not committed, blockers, and next recommended lane.
