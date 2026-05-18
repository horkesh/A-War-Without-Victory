# Autonomous Product Polish And Assets Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use ui-ux-developer for UI polish and frontend-design for visual implementation work.

**Goal:** Route remaining product polish, asset, onboarding, soundscape, trailer/press-kit, and first-impression work into substantial autonomous lanes.

**Architecture:** Product polish must consume current game truth and existing surfaces. Claude may implement UI polish, evidence capture, deterministic asset manifests, and draft collateral. Public-facing marketing claims, final art direction, third-party assets, and publication require user/operator approval.

**Tech Stack:** React/Vite UI, CSS, existing image/audio asset directories, browser/visual evidence scripts, Markdown launch docs.

---

## Global Rules

- Start with `git status --short --branch`.
- Do not add copyrighted or externally sourced assets without license/provenance.
- Generated or placeholder assets must be clearly marked as drafts unless accepted by the user.
- Respect reduced-motion settings for animation.
- UI changes need keyboard access, compact copy, and visual evidence when layout-sensitive.

## PPA-1 - Warroom Hero Ambient Motion

**Objective:** Add subtle, reduced-motion-safe Warroom ambient polish only if it improves the first viewport without obscuring game information.

**Likely files:**

- `src/ui/map/components/Warroom*`
- `src/ui/map/styles/`
- existing visual tests/scripts

**Tasks:**

1. Audit current Warroom first viewport and reduced-motion gates.
2. Add a small deterministic animation or static art treatment using existing assets/CSS where possible.
3. Respect `prefers-reduced-motion` and in-game reduce-motion controls.
4. Capture desktop and mobile evidence.

**Validation:**

- focused UI tests if available
- `npm.cmd run typecheck`
- `npm.cmd run desktop:map:build`
- browser/visual evidence
- `git diff --check`

## PPA-2 - Soundscape Readiness And Cue Map

**Objective:** Prepare soundscape integration without requiring final audio assets.

**Tasks:**

1. Inventory existing audio preference/stub work.
2. Draft deterministic cue map: event key, category, volume class, cooldown, reduced-motion/accessibility interaction, and asset placeholder.
3. Add tests only if wiring non-playing cue metadata into UI/settings.
4. Do not add final audio files unless supplied/approved.

**Validation:**

- focused settings/audio tests if code changes
- docs-only check if packet only

## PPA-3 - Side Picker And First-Run Validation

**Objective:** Improve or prove first-run side selection/onboarding clarity without reopening closed emoji/overlay blockers.

**Tasks:**

1. Run current shell/onboarding tests and inspect visual evidence gaps.
2. Add browser capture script or screenshots for side picker, opening brief, and first Decision Room entry.
3. Fix only concrete layout, label, keyboard, or continuity defects.
4. Keep faction-selection content concise and source-grounded.

**Validation:**

- shell/onboarding UI tests
- browser/visual evidence
- `npm.cmd run desktop:map:build`
- `git diff --check`

## PPA-4 - Press Kit / Trailer Evidence Prep

**Objective:** Prepare repo-side capture lists and claim traceability for future press/trailer work.

**Tasks:**

1. Build a shot list mapped to implemented evidence: side picker, Warroom, Decision Room, map modes, Army HQ Records, Chronicle, verdict, replay.
2. Link each claim to a report/test/proof artifact.
3. Mark any shot needing real gameplay capture, final art, or operator publication as pending.
4. Do not publish or claim external marketing completion.

**Validation:**

- docs path scan
- `git diff --check`

## PPA-5 - High Concept One-pager

**Objective:** Draft a traceable High Concept one-pager that describes the current product without overclaiming launch evidence.

**Tasks:**

1. Use only implemented features and current roadmap truth.
2. Separate "playable now", "repo-supported pending operator evidence", and "future/gated".
3. Link claims to master docs/reports.
4. Keep sensitive-history framing careful and non-promotional.

**Validation:**

- docs-only diff check

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the autonomous AWWV product polish/assets worker. Execute one substantial lane from `docs/plans/2026-05-18-autonomous-product-polish-and-assets-bank.md`, prioritizing evidence-backed UI polish over speculative assets.

### 2. Canon references

Read `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/GAME_STATE_RATING_MASTER.md`, `docs/plans/2026-05-17-soundscape-integration-plan.md`, `docs/plans/2026-05-17-marketing-store-launch-plan.md`, and current implemented reports for any claimed feature.

### 3. Determinism and ledger constraints

UI polish must not change sim output. Any generated asset or collateral must have clear provenance and draft/approved status. Update implemented reports and ledger after validation.

### 4. STOP AND ASK triggers

Stop for final marketing/publication claims, third-party asset licensing uncertainty, final audio assets, sensitive-history promotional wording, store/trailer publication, or design direction that conflicts with current GUI master.

### 5. Output format and validation

Report lane, files changed, visual evidence, tests/build commands, asset provenance, docs/ledger updates, pending user/operator approvals, and next polish lane.
