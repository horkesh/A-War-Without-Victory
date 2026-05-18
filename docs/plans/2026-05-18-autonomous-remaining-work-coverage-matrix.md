# Autonomous Remaining Work Coverage Matrix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every live remaining roadmap/backlog category routable to an autonomous lane, a gated preparation lane, or an operator-only evidence lane.

**Architecture:** This is the top-level coverage matrix for post-Batch-36 work. It does not implement features. It prevents rediscovery by naming the owner plan, whether Claude may execute it autonomously, and the stop gate that keeps canon, sensitive-history, release, and operator work from being claimed prematurely.

**Tech Stack:** Markdown planning, existing roadmap/backlog/report documents, existing Vitest/typecheck/build/scenario validation commands.

---

## Coverage Rules

1. Start with `git status --short --branch`.
2. If dirty implementation work exists, do not start a planning lane until Codex accepts or rejects that work.
3. Treat this matrix as a dispatcher over the existing lane banks; do not duplicate implementation.
4. When a lane closes, update this matrix, the dispatch index, the relevant master doc, and `docs/PROJECT_LEDGER.md`.
5. If a row says gated or operator-only, Claude may prepare evidence, inventories, packet drafts, and tests, but must not claim the gate closed.

## Remaining Work Matrix

| Remaining Work Category | Autonomous Owner Plan | Claude May Execute? | Stop Gate |
| --- | --- | --- | --- |
| Merge readiness and PR evidence for the large branch | `docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md` | Yes, evidence only | Do not push, squash, merge, or open PR without Codex/user direction. |
| Full fast-suite and generated-artifact ownership | `docs/plans/2026-05-18-autonomous-ci-regression-hardening-plan.md` | Yes | Do not skip tests or weaken guards to make CI green. |
| Sector/frontline performance residuals | `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md` | Yes | Unexpected hash drift, sensitive-history outcome drift, or unmeasured cache proposal. |
| Serialization redundant-write and artifact stability | `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md` plus `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md` | Yes | Do not remove writes until final artifact ownership is test-proven. |
| Save/load/replay equivalence and save-continue hash-chain | `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md` | Yes | Loaded-save behavior drift without explicit fixture and 40w proof. |
| Strict-null migration remaining inventory | `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md` | Yes | Any cast removal that changes behavior or requires broad type churn. |
| Supply visibility and logistics player comprehension | `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md` | Yes | New sim authority or hidden enemy truth leakage. |
| Decision Room / Army HQ pushback clarity | `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md` | Yes | New decision owner, duplicate modal, or invented command state. |
| GUI playtest D3-D7 and visual QA proof | `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md` and `docs/plans/2026-05-18-autonomous-visual-qa-evidence-plan.md` | Yes | Browser evidence unavailable for layout-sensitive claim. |
| Accessibility RC browser/axe evidence | `docs/plans/2026-05-18-autonomous-visual-qa-evidence-plan.md` | Evidence yes | Do not reopen P0 static closure unless evidence finds a real regression. |
| H1 watched-operation visibility and sensitive-history diagnostics | `docs/plans/2026-05-18-autonomous-engine-quality-lane-bank.md` | Diagnostics yes | Any new or changed sensitive-history outcome. |
| Event notification residual rows | `docs/plans/2026-05-18-gated-research-operator-lane-bank.md` and `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md` | Prep yes | Historian/narrative review required before final recipient prose. |
| Broader intel surprise/ambush design | `docs/plans/2026-05-17-intel-extensions-plan.md` and engine-quality bank | Narrow code yes | Hidden-truth UI leak, unexplained hash drift, or design expansion beyond bounded friction. |
| Dynamic Codex, essays, and downstream arcs | `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md` | Prep and safe code yes | Sensitive prose, new historical claims, or outcome framing without historian sign-off. |
| OOB/source attribution and officer/essay rosters | `docs/plans/2026-05-18-gated-research-operator-lane-bank.md` and content bank | Prep yes | Missing citation or uncertain identity match. |
| Open Design Questions, FORAWWV packet, HRHB/RS strategic-goal decisions | `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md` | Prep only | Do not edit FORAWWV or ship design outcomes without user/canon ruling. |
| Sensitive-history foreword and treatment audit | `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md` and content bank | Prep only | Requires explicit user/historian approval before final text. |
| Reproducible-build proof, signed artifacts, installer, macOS dmg, auto-update | `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md` | Repo-side support yes | Certificates, real signing, store upload, clean VM, and OS-specific proof are operator-only unless environment exists. |
| Clean-VM, external playtest, store, trailer, press-kit, launch artifacts | `docs/plans/2026-05-18-autonomous-rc-evidence-bundle-plan.md`, platform bank, product/assets bank | Prep only | Do not claim real user/VM/store/publication evidence from repo-side templates. |
| Warroom hero art, ambient motion, soundscape, side-picker polish, high-concept one-pager | `docs/plans/2026-05-18-autonomous-product-polish-and-assets-bank.md` | Mostly yes | Generated/final art, marketing claims, and audio assets need user/operator approval if they become public assets. |
| BCS localization readiness | `docs/plans/2026-05-18-gated-research-operator-lane-bank.md` | Extraction/audit yes | Native-speaker quality gate remains external. |

## Dispatch Order For Long Claude Runs

1. If merge gate is dirty or failing, repair merge readiness first.
2. If branch is clean and user is away, choose one code lane plus one support lane:
   - Code lane: sector perf, save/replay determinism, strict-null, supply visibility, Decision Room, or GUI D3-D7.
   - Support lane: content roster, canon decision packet, PR evidence, RC evidence, or platform packaging support.
3. If code work hits a stop gate, switch to preparation work rather than idling.
4. Do not split into micro-batches unless a test failure or hash drift forces a narrow repair.

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the autonomous AWWV implementation worker. Use `docs/plans/2026-05-18-autonomous-remaining-work-coverage-matrix.md` to choose a substantial remaining-work lane, then execute one coherent batch while respecting each gate.

### 2. Canon references

Read the selected owner plan, `docs/plans/MASTER_ROADMAP.md`, `docs/40_reports/CONSOLIDATED_BACKLOG.md`, `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`, and the relevant master report before editing.

### 3. Determinism and ledger constraints

No nondeterministic ordering, timestamps in committed artifacts, hidden-truth leakage, or cross-run caches. Run focused tests first, then full gates appropriate to the lane. Update implemented report, master docs, and `docs/PROJECT_LEDGER.md` only after validation.

### 4. STOP AND ASK triggers

Stop for unrelated dirty files, unexpected 40w/188w hash drift, sensitive-history outcome changes, historian-only prose, FORAWWV edits, Open Design Question decisions, clean-VM evidence, store/press publication, signing certificates, or native-speaker localization approval.

### 5. Output format and validation

Report selected row, files changed, commands run with pass/fail, proof artifacts, hash/consistency status if relevant, docs updated, commit hash or uncommitted status, blockers, and the next recommended row.
