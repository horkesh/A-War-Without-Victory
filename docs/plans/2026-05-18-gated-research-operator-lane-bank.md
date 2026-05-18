# Gated Research and Operator Support Lane Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:verification-before-completion before every handoff.

**Goal:** Give Claude substantial non-code or low-risk support work that advances gated backlog items without pretending user-only, historian-only, or operator-only evidence is complete.

**Architecture:** These lanes produce audits, rosters, matrices, templates, diagnostics, and evidence packets. They do not author sensitive prose, claim external validation, edit FORAWWV, or ratify open design questions.

**Tech Stack:** Markdown reports, existing data files, existing diagnostics/tests if needed. No network or external publication unless the user explicitly asks.

---

## Global Gated-Work Rules

- Every lane begins with a gate statement: what can be done autonomously and what remains blocked.
- Use "support-only" or "roster-lock" wording when no implementation can be honestly claimed.
- Do not fill sensitive content with fallback prose.
- Do not claim clean-VM, playtest, store, press, translation quality, or historian sign-off.
- Update backlog docs so gated items stop resurfacing as ordinary code work.

## Stop Gates

Stop if asked to edit `docs/10_canon/FORAWWV.md`, ratify Open Design Questions, publish marketing/store material, claim clean-VM evidence, write sensitive real-person bios, or author atrocity/detention/enclave prose without sign-off.

---

## GR-1 - Notification Sensitive-Content Review Prep

**Objective:** Advance remaining Phase D notification content by classifying work and adding guardrails, not by writing unsafe copy.

**Sources:**

- `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`
- residual gate audit

**Tasks:**

1. Inventory the remaining 20 rows / 102 missing recipient blocks.
2. Classify each as safe, historian-required, narrative-tone-required, Washington-timing, late-war-outcome, or mixed-sensitive.
3. Add or update tests that prevent generic fallback prose and hidden-truth leakage.
4. Only author safe non-sensitive rows if the source plan explicitly allows it and citations/source fields already exist.

**Validation:**

- `npm.cmd run typecheck` if tests/code changed
- focused notification/content tests
- `git diff --check`

---

## GR-2 - Officer Mini-Bios Sensitive Roster Lock

**Objective:** Produce a reviewable roster and source-gap matrix for sensitive officer bios without authoring final sensitive bios.

**Tasks:**

1. Inventory officers with missing or first-pass bios.
2. Flag sensitive names and required reviewer role.
3. Identify existing cited sources and source gaps.
4. Produce an audit report under `docs/40_reports/audits/`.
5. Update backlog queue to show what is blocked vs safe.

**Forbidden:** Do not write final bios for sensitive personnel.

**Validation:** `git diff --check`.

---

## GR-3 - Missing 1992 Foundation Essays Roster Lock

**Objective:** Turn "13 missing 1992 essays" into a concrete roster with citation requirements and sensitivity flags.

**Sources:**

- `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md`
- essay index under `data/scenarios/essays/`

**Tasks:**

1. Identify missing essay IDs/topics from current essay index and roadmap.
2. Classify each by sensitivity and source requirement.
3. Identify which can be drafted later with existing sources and which need historian dispatch.
4. Produce a roster-lock audit report.

**Forbidden:** Do not write final essay bodies in this lane.

**Validation:** `git diff --check`.

---

## GR-4 - BCS Localization Extraction Audit

**Objective:** Advance localization by measuring extraction coverage and terminology-review needs without claiming translation quality.

**Sources:**

- `docs/plans/2026-05-17-bcs-localization-plan.md`
- older localization plan

**Tasks:**

1. Inventory high-traffic hard-coded UI strings.
2. Identify existing locale tables and fallback behavior.
3. Produce an extraction matrix by surface.
4. Add a diagnostic/test only if there is an existing i18n substrate to measure.
5. Create a terminology review checklist for native-speaker review.

**Forbidden:** Do not claim BCS translation quality or mass-translate sensitive content.

**Validation:** typecheck/tests only if code changed; always `git diff --check`.

---

## GR-5 - Soundscape Asset and Cue Readiness

**Objective:** Advance soundscape integration only as optional asset/cue readiness.

**Sources:**

- `docs/plans/2026-05-17-soundscape-kickoff-audio-stub-plan.md`
- `docs/plans/2026-05-17-soundscape-integration-plan.md`

**Tasks:**

1. Inventory current audio setting/stub state.
2. Create or update cue manifest requirements if missing.
3. Add tests for optional/no-audio fallback if the substrate exists.
4. Do not add real audio assets unless they already exist and are licensed/approved.

**Validation:**

- `npm.cmd run typecheck` if code changed
- focused audio/settings tests if touched
- `npm.cmd run desktop:map:build`
- `git diff --check`

---

## GR-6 - Operator Evidence Packet Refresh

**Objective:** Keep clean-VM, external playtest, launch-day, and marketing evidence packets ready for the human operator.

**Sources:**

- `docs/50_launch/release/launch_day_automation_template.md`
- clean-VM evidence template
- external playtest dry-run template
- marketing/store launch plan

**Tasks:**

1. Verify templates reference current commands, paths, and version.
2. Add "operator must fill" placeholders where evidence is missing.
3. Ensure no template claims SmartScreen, Settings -> Apps, `%APPDATA%`, registry, outreach, or response triage completion.
4. Update backlog status to support-only if stale rows treat this as code work.

**Validation:** `git diff --check`; script dry-run only if the lane edits scripts.

---

## GR-7 - PR and Merge Evidence Pack

**Objective:** Prepare a reviewer-friendly summary for the large branch without pushing or creating a PR unless the user asks.

**Tasks:**

1. Summarize commits since origin/main by category: sim/output, UI, tests, docs, generated artifacts.
2. Gather latest verification commands and hashes from ledger/reports.
3. Produce a draft PR body under `docs/40_reports/audits/` or `docs/50_launch/release/`.
4. Include known residual risks and operator-only gaps.

**Forbidden:** Do not push, open PR, squash, or merge unless the user explicitly asks.

**Validation:** `git diff --check`.

---

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the gated-research/operator-support worker for AWWV. Execute `docs/plans/2026-05-18-gated-research-operator-lane-bank.md` one lane at a time, producing audits, matrices, templates, and guardrails without crossing user-only or historian-only gates.

### 2. Canon references

Read the lane source docs, `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`, `docs/40_reports/CONSOLIDATED_BACKLOG.md`, and `docs/plans/MASTER_ROADMAP.md`. For sensitive-history lanes, also read the sensitive-history design gate and existing cited reports.

### 3. Determinism and ledger constraints

No timestamps, randomness, or nondeterministic generated ordering. Sort rosters and matrices stably. Update `docs/PROJECT_LEDGER.md` for accepted docs/output changes and use implemented/audit reports as appropriate.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop for FORAWWV edits, Open Design Question ratification, clean-VM/playtest/store evidence claims, or sensitive prose without sign-off.

### 5. Output format and validation

Report gate statement, changed files, exact validation commands, what remains blocked, whether committed, and next safe gated lane.

