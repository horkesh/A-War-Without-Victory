# Autonomous Canon Design Decision Prep Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use canon-compliance-reviewer for any packet touching historical outcomes, victory/framing, or sensitive-history treatment.

**Goal:** Prepare decision packets for remaining user/canon/historian gates without crossing those gates.

**Architecture:** This is a support-only lane bank. Claude may inventory evidence, draft options, list code/docs impacted by each decision, and prepare acceptance criteria. Claude must not edit `FORAWWV.md`, settle Open Design Questions, alter sensitive-history outcomes, or ship new canon rulings.

**Tech Stack:** Markdown decision packets, existing audits/reports, `rg`, current tests for affected systems where useful.

---

## Global Rules

- Start with `git status --short --branch`.
- Do not edit `FORAWWV.md`.
- Separate facts from recommendations.
- Every packet must end with "Decision needed" and concrete options.
- If current code already closed a supposed gap, mark it verified-stale with evidence instead of inventing work.
- Follow `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` for FORAWWV, Open Design Question, sensitive-history, historian-approval, and localization gates.

## CDP-1 - Open Design Question Ratification Packet

**Objective:** Prepare a fresh packet for unresolved Open Design Questions and map each question to current code truth.

**Sources:**

- `docs/plans/2026-04-30-roadmap-open-design-questions-resolution-plan.md`
- `docs/plans/MASTER_ROADMAP.md`
- relevant 2026-05-17/18 implemented reports

**Tasks:**

1. Inventory all open questions still referenced by roadmap/backlog docs.
2. Classify each as implemented, verified-stale, still user-only, historian-only, or operator-only.
3. For still-open questions, produce options, impacted files, tests required if accepted, and "do nothing" consequence.
4. Update no canon file except a new audit/decision-prep report.

**Validation:**

- path/reference scan for all packet links
- `git diff --check`

## CDP-2 - FORAWWV Panel Sign-Off Packet

**Objective:** Produce a panel sign-off packet of proposed canon questions/edits without touching the manual.

**Tasks:**

1. Identify current docs/code claims that depend on manual alignment.
2. Draft a table: topic, current repo behavior, manual section to review, proposed wording direction, risk if unchanged.
3. Flag any contradiction as a user decision, not an agent fix.
4. Do not modify `FORAWWV.md`.

**Validation:**

- `git diff --check`
- prove `git diff -- FORAWWV.md` is empty

## CDP-3 - Sensitive-History Treatment And Foreword Prep

**Objective:** Prepare the evidence and option set for a future Codex/foreword treatment note.

**Tasks:**

1. Inventory existing sensitive-history safeguards, verdict wording, Cost Ledger framing, and hidden/outcome gates.
2. Identify where public-safe framing exists and where it is missing.
3. Draft options for foreword scope and placement.
4. Do not author final foreword prose unless the user explicitly asks.

**Validation:**

- docs-only diff check
- no runtime/source changes unless Codex explicitly expands scope

## CDP-4 - RS Strategic Goals / HRHB / Enclave Gate Packet

**Objective:** Prepare packets for known gated decision areas, including RS Strategic Goals section 6 audit questions and HRHB/enclave outcome boundaries.

**Tasks:**

1. Gather current implementation reports and tests.
2. Identify what is already verified and what remains blocked by design selection.
3. Prepare acceptance criteria for any future implementation lane.
4. Explicitly state that no code change is authorized by this packet.

**Validation:**

- `git diff --check`

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the autonomous AWWV canon-decision preparation worker. Execute one or more support-only packets from `docs/plans/2026-05-18-autonomous-canon-design-decision-prep-bank.md`.

### 2. Canon references

Read `docs/plans/MASTER_ROADMAP.md`, `docs/plans/2026-04-30-roadmap-open-design-questions-resolution-plan.md`, relevant implemented reports, and any named canon docs. Do not edit `FORAWWV.md`.

### 3. Determinism and ledger constraints

Docs-only unless Codex explicitly changes scope. If you add audit reports or decision packets, update roadmap/ledger references after validation.

### 4. STOP AND ASK triggers

Stop before editing `FORAWWV.md`, choosing among design options, authoring final sensitive-history prose, changing outcomes, relaxing tests, or claiming historian/user approval.

### 5. Output format and validation

Report packet(s), files changed, decisions still needed, commands run, confirmation that `FORAWWV.md` is untouched, and next implementable lane after decisions.
