# Branch CI Release Hygiene Execution Plan

**Date:** 2026-05-24
**Status:** ACTIVE execution-grade plan
**Owner lane:** Codex owner / branch hygiene lane
**Related command-board row:** P0 Branch/CI/release hygiene
**Collision rules:** May run git and CI inspection commands on `main`; must not stage unrelated dirty files, rewrite another agent's branch work, or claim operator-only evidence.
**Phase covered:** Current-tip proof, CI polling, dirty-worktree reconciliation, and merge-acceptance evidence.
**Current next action:** Use Phase 0 before any substantial implementation batch and Phase 1 after every pushed commit.

## Purpose

Keep `main` clean, pushed, and truthfully reported while multiple agents work in parallel. This plan consolidates the older release evidence and merge evidence plans into the current operational proof packet for branch health.

## Non-Goals

- Do not run calibration, GUI, scenario tuning, or feature implementation here.
- Do not claim clean-VM, installer-signing, store, press, or external playtest evidence.
- Do not squash, rebase, force-push, or delete another agent branch without explicit user approval.
- Do not stage `.claude/settings.local.json` or `data/derived/latest_run_final_save.json` unless a task explicitly owns them.
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
git log --oneline -5
gh run list --branch main --limit 14
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- `docs/plans/2026-05-20-release-evidence-ci-proof-packet-plan.md`
- `docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md`
- `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`

Branch collision rule:

- If another agent branch is active, treat its work as claims until merged and verified locally. Only prepare acceptance evidence unless the user assigns the lane here.

Global stop rule:

- Stop before merging, deleting branches, or claiming green if local status, local verification, or GitHub Actions status contradicts the claim.

Expected commit boundary:

- One hygiene/proof/reporting commit per proof packet or branch-board update.

## Task Boundary Rules

Allowed edits:

- `docs/plans/COMMAND_BOARD.md`
- hygiene/proof plans under `docs/plans/`
- release/merge evidence reports under `docs/40_reports/release/` or `docs/40_reports/audits/`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` for durable process lessons only

Forbidden edits:

- runtime engine/UI/source files;
- scenario data, generated artifacts, saves, and baselines;
- external-agent owned branch content;
- operator-only evidence templates except to add repo-side instructions.

Scenario/hash drift:

- Not allowed in this lane. If a verification run changes generated artifacts, record them as transient unless the proof packet explicitly owns a fixture refresh.

Decision packet rule:

- If branch policy, merge strategy, or branch deletion requires a user preference, prepare options instead of acting.

## Phase 0 - Pre-Worktree Proof

**Owner:** Orchestrator
**Reviewers:** QA engineer, ledger-process scribe

Steps:

1. Run `git status --short --branch`.
2. Classify every dirty file as current-lane, transient, another-agent, or blocker.
3. If source changes are dirty and not current-lane, inspect enough to avoid overwriting them.
4. If `main` is behind `origin/main`, fetch/pull before work unless local dirty files block it.

Verification:

```powershell
git status --short --branch
```

Stop gates:

- unrelated source dirty file;
- branch behind remote with local edits that cannot be reconciled;
- uncommitted another-agent work in the same files.

## Phase 1 - Post-Push CI Polling

**Owner:** DevOps specialist
**Reviewers:** QA engineer

Steps:

1. Push accepted commits to `origin/main`.
2. Poll Actions:

```powershell
gh run list --branch main --limit 14
```

3. Record every in-progress, queued, failed, or successful run tied to the latest pushes.
4. If a run fails, inspect failed logs before any fix:

```powershell
gh run view <run-id> --log-failed
```

Verification:

- latest pushed commit has visible runs or propagation delay is reported;
- no green claim until all relevant runs complete successfully.

Stop gates:

- failed CI;
- run tied to a different commit than the one being reported;
- missing run after reasonable propagation delay.

## Phase 2 - Merge Or Branch Acceptance Packet

**Owner:** Orchestrator
**Reviewers:** code-review, canon-compliance-reviewer when behavior/scenario code changed

Steps:

1. Identify branch tip, base, and commit range.
2. Categorize changes into behavior/output, UI/product, data/content, tests/fixtures, docs/process, and operator support.
3. List fresh validation by command, result, and commit recency.
4. List stale validation separately.
5. List transient dirty files intentionally excluded.
6. Prepare acceptance recommendation or blockers.

Verification:

```powershell
git diff --check
```

Add only when relevant:

```powershell
npm.cmd run typecheck
npm.cmd run test:baselines
npm.cmd run desktop:map:build
npm.cmd test
```

Stop gates:

- behavior/output branch without fresh enough proof;
- unexplained scenario hash drift;
- forbidden canon/sacred-rule violation;
- operator-only evidence being treated as repo-verified.

## Phase 3 - Release Evidence Packet

**Owner:** release/DevOps specialist
**Reviewers:** QA engineer, platform-specialist

Required report fields:

- branch, `HEAD`, `origin/main`, ahead/behind state;
- dirty files and classification;
- local command matrix with pass/fail/skip reason;
- GitHub Actions run ids and status;
- baseline hash evidence if behavior/output changed;
- generated artifact ownership;
- operator-only checklist with unverified items marked pending.

Verification:

```powershell
git diff --check
```

Stop gates:

- clean-VM/signing/store/playtest evidence not actually produced;
- generated artifact ownership ambiguous;
- CI not complete but packet says green.

## Determinism and Save-Schema Gates

This lane should be docs/proof only. If verification commands produce generated saves or derived artifacts:

- do not stage them by default;
- record whether they are transient or fixture-owned;
- never refresh baselines in this lane unless a separate behavior/data plan explicitly owns the drift.

## UI and Player-Truth Gates

Not applicable unless a merged branch touches UI. In that case, the acceptance packet must name browser/Electron evidence and localization status, but implementation belongs to the relevant UI plan.

## Historical and Sensitive-History Gates

Not applicable unless a merged branch touches historical claims, events, Codex, OOB, or scenario outcomes. In that case, acceptance requires the owning plan's historian/sensitive-history gates.

## Roadmap and Ledger Closeout

Closeout must update:

- `docs/plans/COMMAND_BOARD.md` if branch or CI status changes a lane;
- this plan if the hygiene process changes;
- `docs/PROJECT_LEDGER.md` for process/reporting changes;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for durable process lessons;
- release/audit reports only when a proof packet is produced.

## Copy-Ready Prompt

```text
Role and objective: You are the branch/CI/release hygiene agent for AWWV. Execute docs/plans/2026-05-24-branch-ci-release-hygiene-execution-plan.md for the current branch state. Do not implement feature work.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, docs/plans/2026-05-20-release-evidence-ci-proof-packet-plan.md, docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md, and docs/20_engineering/CI_TRIAGE_PLAYBOOK.md before editing.

Determinism and ledger constraints: Docs/proof only unless explicitly instructed. Do not stage transient files such as .claude/settings.local.json or data/derived/latest_run_final_save.json. Do not refresh baselines or generated artifacts unless a separate owning plan requires it. Append docs/PROJECT_LEDGER.md for roadmap/process changes. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: unrelated dirty source files, failed CI, missing or stale proof, branch ownership collision, merge/delete/rebase/force-push decision, unexplained scenario hash drift, or operator-only evidence being required.

Output format and validation: Report branch state, dirty-file classification, pushed commit if any, CI run ids/status, commands run with pass/fail/skip reasons, docs changed, ledger update, and next unresolved hygiene action.
```
