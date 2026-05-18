# Autonomous Content Codex Arc Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use historian when a task requires historical interpretation, citations, or sensitive-history judgment.

**Goal:** Turn remaining content/Codex/narrative roadmap work into safe autonomous packets: rosters, source matrices, deterministic read-model wiring, and gated prose prep.

**Architecture:** Content work must separate deterministic runtime structures from authored historical prose. Claude may implement safe read-model plumbing and non-sensitive roster/test scaffolding. Sensitive recipient text, foreword prose, new historical claims, and final essay wording require the relevant gate.

**Tech Stack:** Markdown reports, event/Codex data files, TypeScript read models, Vitest, existing notification and Codex tests.

---

## Global Rules

- Start with `git status --short --branch`.
- Do not invent citations or historical claims.
- Keep runtime text deterministic and source-grounded.
- Do not put sensitive-history prose into event notifications without historian/narrative approval.
- Tests should pin unlock conditions, faction visibility, stable ordering, and fallback behavior.
- Follow `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`: sensitive prose needs source-backed facts, historian verdict, narrative/tone verdict, and user final approval before implementation.

## CCA-1 - Notification Residual Review Prep

**Objective:** Convert the remaining Phase D notification residuals into review-ready packets without authoring gated final prose.

**Sources:**

- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
- `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`

**Tasks:**

1. Recount missing rows/blocks from source data.
2. Classify each residual row as historian-required, narrative-tone, Washington-timing, late-war-outcome, or mixed-sensitive front-visit.
3. Prepare per-row source notes, intended recipients, and required reviewer decision.
4. Add no fallback prose unless the row is explicitly safe and already approved by existing plan scope.

**Validation:**

- notification static tests if data changes
- docs path scan
- `git diff --check`

## CCA-2 - Dynamic Codex And Essay Breadth Packet

**Objective:** Prepare or implement safe deterministic Codex breadth improvements where source packets already exist.

**Likely files:**

- `src/ui/map/data/codex*`
- Codex essay/event data found with `rg "dynamic_sections|ghost_when|Codex" src docs tests`
- relevant Codex tests

**Tasks:**

1. Inventory missing essays/dynamic sections against existing Cost Ledger/milestone/source packets.
2. Mark each candidate as safe wiring, needs prose review, or needs new historical source.
3. For safe wiring only, add tests before implementation.
4. Keep ghost/unlock visibility player-safe and deterministic.

**Validation:**

- focused Codex tests
- `npm.cmd run typecheck`
- `git diff --check`

## CCA-3 - OOB / OSID / Officer Attribution Prep

**Objective:** Prepare attribution matrices for brigade/OOB/OSID tooltips and officer mini-bios.

**Tasks:**

1. Inventory current OOB, brigade, officer, and OSID source fields.
2. Identify entries with missing or ambiguous attribution.
3. Create a review packet listing safe tooltip fields and blocked entries.
4. Implement UI only where attribution is already present and tests can prove no hidden enemy truth leak.

**Validation:**

- focused UI/read-model tests if code changes
- `npm.cmd run typecheck`
- `git diff --check`

## CCA-4 - Downstream Consequence Arc Prep

**Objective:** Prepare deterministic downstream arc candidates for major decision families without shipping unreviewed arcs.

**Tasks:**

1. Inventory existing consequence substrates and reader coverage.
2. Map candidate arcs to existing facts/tokens vs new authored effects.
3. For existing-token arcs, propose safe read-model/test additions.
4. For new sensitive arcs, stop at a decision packet.

**Validation:**

- consequence/Codex tests if code changes
- docs-only validation for packets

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the autonomous AWWV content/Codex worker. Execute one substantial safe lane from `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md`, preferring preparation packets when review gates are closed.

### 2. Canon references

Read the relevant event/Codex reports, `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`, `docs/40_reports/CONSOLIDATED_BACKLOG.md`, and current source data before editing.

### 3. Determinism and ledger constraints

Any runtime content must be deterministic, sorted, faction-visible, and test-pinned. Update implemented report and ledger after validation. Do not use generated prose as final sensitive-history content.

### 4. STOP AND ASK triggers

Stop for missing citations, sensitive-history prose, new historical claims, historian/narrative review requirements, hidden-truth visibility risk, or new consequence effects not backed by current canon.

### 5. Output format and validation

Report lane, safe-vs-gated classification, files changed, tests run, docs/ledger updates, blocked rows requiring review, and next recommended content lane.
