# Owned Branch Acceptance Execution Plan

**Date:** 2026-05-24
**Status:** ACTIVE execution-grade plan
**Owner lane:** Codex owner / branch acceptance lane
**Related command-board rows:** P0 GUI polish / presidential shell; P0 Calibration / army arc / HVO-HV operations
**Collision rules:** Do not implement in an `OWNED-ELSEWHERE` lane. Review, verify, reconcile docs/ledger, and accept or reject only after the owning branch is handed off or merged for review.
**Phase covered:** External-branch handoff intake, local verification, merge acceptance, and post-merge cleanup.
**Current next action:** Use this plan whenever GUI or calibration branch work is handed back to Codex.

## Purpose

Provide one consistent acceptance process for work produced on another active branch. The goal is to treat external-agent output as a claim set: inspect disk, verify behavior locally, identify collisions, reconcile documentation and ledger, then accept, fix, or reject with evidence.

## Non-Goals

- Do not re-author another branch's implementation while it is still owned elsewhere.
- Do not merge calibration, GUI, event, or scenario behavior without fresh proof appropriate to that lane.
- Do not resolve branch-policy questions such as squash/delete/rebase without user approval.
- Do not claim visual, historical, or calibration quality from a handoff document alone.
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
git fetch origin
git branch --list
git branch -r --list
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- this plan
- the owning branch handoff/report
- lane-specific plan or audit report referenced by the handoff

Branch collision rule:

- If the owning branch is still active and not handed off, do not merge or edit its files. Prepare questions or acceptance criteria only.

Global stop rule:

- Stop if the branch contains behavior/output changes without matching proof, sensitive-history changes without review, GUI changes without visual evidence, or calibration changes with unexplained scenario drift.

Expected commit boundary:

- One acceptance/reporting commit per branch handoff before any fix commit.
- If fixes are required, use separate commits by lane and rerun the lane gates.

## Task Boundary Rules

Allowed edits before acceptance:

- acceptance reports under `docs/40_reports/audits/` or `docs/40_reports/release/`;
- command-board status updates;
- roadmap/ledger reconciliation;
- proof packet updates.

Forbidden edits before acceptance:

- source, scenario, event, fixture, generated, or UI files owned by the other branch;
- calibration constants and catalog predicates;
- GUI shell implementation files;
- external branch history rewrites.

Scenario/hash drift:

- Allowed only when the owning calibration/engine plan expects it and explains it. Otherwise drift is a blocker.

Decision packet rule:

- If evidence is mixed, prepare an accept/fix/reject decision packet with exact blockers instead of improvising a merge.

## Phase 0 - Handoff Intake

**Owner:** Orchestrator
**Reviewers:** product-manager, ledger-process scribe

Steps:

1. Confirm current branch and dirty state.
2. Read the external handoff end-to-end.
3. List claimed commits, files, validation commands, outputs, and unresolved items.
4. Classify claimed changes by lane: GUI, calibration, engine, scenario, content, docs, generated artifacts.
5. Identify files that overlap current `main` work.

Verification:

```powershell
git status --short --branch
git log --oneline --decorate -10
```

Stop gates:

- handoff missing;
- unclear branch ownership;
- unrelated dirty files;
- claimed changes not present on disk.

## Phase 1 - Lane-Specific Verification

**Owner:** QA engineer
**Reviewers:** specialist for touched lane

Verification matrix:

| Lane | Required proof |
| --- | --- |
| GUI / Warroom / map | typecheck/build plus browser or Electron visual inspection evidence for changed surfaces. |
| Calibration / army arc / ops catalogs | scenario run, match-ratio/hash comparison, operation diagnostics, sacred-rule scan. |
| Engine/state/save | focused tests, typecheck, migration/validator tests when fields change, baseline run if output can move. |
| Event/Codex/content | event/codex focused tests, source notes for new historical claims, sensitive-history gates where applicable. |
| Localization | locale/string tests, Bosnian leakage audit, native-review gate if production quality is claimed. |
| Docs/process only | `git diff --check` and ledger/command-board consistency. |

Stop gates:

- failed required proof;
- stale proof predating relevant commits;
- generated artifacts changed without ownership;
- sacred-rule violation;
- hidden enemy truth leaked to UI.

## Phase 2 - Merge Or Reject Recommendation

**Owner:** Orchestrator
**Reviewers:** code-review, canon-compliance-reviewer when behavior/scenario changed

Output sections:

- branch and commit range;
- changed-file categories;
- validation run locally;
- validation still pending;
- docs/ledger gaps;
- merge conflicts or ownership collisions;
- recommendation: accept, accept with follow-up, fix before accept, or reject.

Verification:

```powershell
git diff --check
```

Stop gates:

- recommendation depends on unverified handoff claims;
- unresolved conflict in current branch;
- user approval required for branch deletion, squash, or destructive cleanup.

## Phase 3 - Post-Acceptance Cleanup

**Owner:** DevOps specialist
**Reviewers:** QA engineer

Steps:

1. Ensure accepted changes are on `main`.
2. Push `main`.
3. Poll CI:

```powershell
gh run list --branch main --limit 14
```

4. Update `COMMAND_BOARD.md` status for the owned-elsewhere row.
5. Record accepted proof and residual follow-ups in `docs/PROJECT_LEDGER.md`.
6. Only after green CI and user approval, clean obsolete local/remote branches if requested.

Stop gates:

- red CI;
- branch cleanup requested but not explicitly approved;
- post-merge dirty files not classified.

## Determinism and Save-Schema Gates

For accepted engine/calibration branches:

- no nondeterministic ordering in new diagnostics or persisted rows;
- save fields require migration/default/validator tests;
- scenario hash drift must be explained and recorded;
- generated baseline refresh requires an owning plan.

## UI and Player-Truth Gates

For accepted GUI branches:

- every changed player surface needs visual proof;
- read models must not expose hidden enemy truth;
- duplicate queues/resolvers are blockers;
- Bosnian localization coverage must be named for new strings.

## Historical and Sensitive-History Gates

For accepted historical branches:

- new claims require cited source notes;
- sensitive-history content needs review classification;
- atrocity or ethnic-cleansing mechanics must never be player levers;
- emergent event work should prefer live predicates over calendar rails.

## Roadmap and Ledger Closeout

Closeout must update:

- `docs/plans/COMMAND_BOARD.md`;
- the owning plan or acceptance report;
- `docs/PROJECT_LEDGER.md`;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for durable process lessons;
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` and `docs/40_reports/GAME_STATE_RATING_MASTER.md` only if status/rating changes.

## Copy-Ready Prompt

```text
Role and objective: You are the owned-branch acceptance agent for AWWV. Execute docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md against the branch named by the orchestrator. Treat the branch handoff as claims until verified locally.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, the branch handoff/report, and the lane-specific plan or audit referenced by the handoff.

Determinism and ledger constraints: Do not implement in the owned-elsewhere lane while ownership is active. Do not stage transient generated files. For behavior/output changes, require focused tests and scenario/baseline proof when output can move. Append docs/PROJECT_LEDGER.md for accepted changes or roadmap/process updates. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: unclear branch ownership, missing handoff, failed proof, stale validation, sacred-rule violation, hidden-truth leak, unexplained scenario hash drift, sensitive-history judgment, merge/delete/rebase/squash decision, or operator-only evidence being required.

Output format and validation: Report branch, commit range, changed-file categories, proof run locally with pass/fail, proof still pending, docs/ledger gaps, accept/fix/reject recommendation, CI status if pushed, and next action.
```
