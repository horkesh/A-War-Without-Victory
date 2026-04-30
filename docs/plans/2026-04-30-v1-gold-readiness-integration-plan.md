# v1.0 Gold Readiness Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the older checklist-only gold plan with a current integration plan that gates v1.0 on coherent v0.9 closure, playability, packaging, accessibility, and release evidence.

**Architecture:** v1.0 is not a feature milestone. It is the integration gate after v0.9.0-v0.9.5. This plan consumes the milestone plans and verifies they work together as one shipped product.

**Tech Stack:** Electron, TypeScript, React, scenario runner, packaged runtime probe, documentation and release artifacts.

---

## Supersedes / Corrects

`docs/plans/2026-03-16-v1.0.0-gold.md` remains useful as a launch-day checklist, but its post-1.0 table is stale and conflicts with the current Master Roadmap. The Master Roadmap is authoritative for post-1.0 ordering.

## Inputs

- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
- `docs/plans/2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md`
- `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md`
- `docs/plans/2026-04-06-v093-performance-accessibility-plan.md`
- `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md`
- `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md`
- `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md`
- `docs/plans/2026-04-30-v09-formation-life-believability-plan.md`

## Task 1: Build Gold Gate Matrix

**Files:**
- Create: `docs/40_reports/implemented/YYYYMMDD_V1_GOLD_GATE_MATRIX.md`
- Modify: `docs/plans/MASTER_ROADMAP.md` if status drift is found

**Steps:**
1. List every v1.0 shipped feature from the Master Roadmap.
2. Map each feature to its owning milestone plan.
3. Mark each as `closed`, `open`, `blocked`, or `planned but unstarted`.
4. Identify any shipped feature with no plan or no proof.
5. Verification: no v1.0 claim lacks an owner plan.

## Task 2: Define Release-Candidate Proof Bar

**Files:**
- Modify: `docs/plans/2026-04-06-v095-platform-packaging-store-plan.md`
- Modify: `docs/plans/2026-03-16-v0.9.0-final-qa.md`
- Reference: `package.json`

**Steps:**
1. Define the final verification bar: typecheck, full Vitest suite, scenario slice, baseline regression, 188w/200w proof, desktop package probe, accessibility smoke, save/load continuation, and first-session walkthrough.
2. Mark which proof belongs before RC and which belongs on launch day.
3. Verification: release checklist distinguishes engineering proof from marketing/store tasks.

## Task 3: First-Session Product Proof

**Files:**
- Reference: `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md`
- Reference: `docs/plans/2026-04-30-v09-presidential-campaign-loop-closure-plan.md`
- Create: `docs/40_reports/implemented/YYYYMMDD_FIRST_SESSION_PRODUCT_PROOF.md`

**Steps:**
1. Start a clean campaign from the packaged or canonical desktop path.
2. Play or simulate the first 10 turns.
3. Verify onboarding, command review literacy, map inspection, turn result, save/load, and route back to Warroom.
4. Verification: report names every confusion point and classifies it as tutorial, UX, or bug.

## Task 4: Release Content Freeze

**Files:**
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Reference: `data/scenarios/events/*.json`
- Reference: `data/scenarios/essays/*`

**Steps:**
1. Freeze event, essay, Codex, tutorial, and localization scope.
2. Separate v1.0-required content from post-1.0 content.
3. Verify sensitive-history sign-off for final shipped sensitive surfaces.
4. Verification: no new content enters after freeze without explicit release-manager approval.

## Done Means

- v1.0 has one current integration gate.
- Older launch checklist is classified as supporting, not authoritative.
- All v1.0 features map to a milestone plan and a proof surface.
