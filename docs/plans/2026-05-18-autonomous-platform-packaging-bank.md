# Autonomous Platform Packaging Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use build-engineer for build script or packaging changes.

**Goal:** Prepare and harden repo-owned platform/release packaging work while clearly separating operator-only proof.

> **Paused 2026-06-23:** Owner direction keeps installer/package work out of the active engineering queue until the live first-hour/command-map experience is satisfactory. This bank is retained as a support-only checklist for future reactivation; do not execute packaging lanes or refresh installer artifacts from this plan during command-surface polish.

**Architecture:** Claude owns scripts, manifests, docs, deterministic packaging smoke support, and tests. Claude does not own certificates, real clean-VM proof, store uploads, SmartScreen reputation, native macOS signing/notarization, or public release publication unless the user supplies the environment and explicitly asks.

**Tech Stack:** Electron/Vite/electron-builder, Node packaging smoke scripts, Vitest, release docs/templates.

---

## Global Rules

- Start with `git status --short --branch`.
- Do not change package metadata, signing config, or auto-update endpoint without explicit scope.
- Any generated manifest must use sorted fields and stable hashes only.
- Keep operator-only evidence labeled as pending.
- Never claim clean-VM, store, signing, or public launch completion from dev-host runs.
- Follow `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`: prefer Microsoft Store MSIX for Windows trust/install UX when feasible; use Azure Artifact Signing / Trusted Signing for direct Windows distribution if eligible; do not buy or recommend EV solely for SmartScreen.

## PPB-1 - Reproducible Build Evidence Support

**Objective:** Improve deterministic build evidence capture for reviewer/operator use.

**Likely files:**

- `tools/build/`
- `tests/desktop_packaging_targets.test.ts`
- `docs/40_reports/release/`
- `docs/50_launch/release/`

**Tasks:**

1. Inventory current Windows/Linux packaging smoke outputs.
2. Add stable manifest fields only if missing from operator templates.
3. Test JSON shape, sorted artifact order, hash presence, and copy-ready release-log rows.
4. Document exact manual steps still required for cross-machine proof.

**Validation:**

- packaging tests
- `node --check` for changed scripts
- `git diff --check`

## PPB-2 - Clean-VM Evidence Packet Refresh

**Objective:** Refresh clean-VM evidence templates so an operator can run them without interpretation.

**Tasks:**

1. Verify templates list SmartScreen, Settings -> Apps, AppData persistence, and NSIS uninstall registry checks.
2. Add missing placeholders for artifact hash, OS build, screenshot path, result, and operator initials.
3. Add a "not repo-proven" statement to prevent false closure.

**Validation:**

- docs-only diff check

## PPB-3 - Code Signing / macOS / Auto-update Decision Packet

**Objective:** Prepare the decision packet for signing, dmg/notarization, and update-channel work.

**Tasks:**

1. Inventory existing electron-builder config and packaging scripts.
2. Compare Microsoft Store MSIX, signed NSIS/direct download, Steam, and GOG needs against the adopted research baseline.
3. List required secrets/certificates/accounts and where they would enter config.
4. Identify repo changes that can be done before secrets exist.
5. Do not commit placeholder secrets, endpoints, or fake signing claims.

**Validation:**

- docs-only unless config changes are explicitly authorized
- `git diff --check`

## PPB-4 - Release Artifact Index

**Objective:** Build or refresh a local release artifact index that helps review without publishing.

**Tasks:**

1. Link current reports, build hashes, known issues, RC evidence, and operator-pending rows.
2. Keep distribution approval false unless user/operator evidence exists.
3. Cross-link the RC evidence bundle plan.

**Validation:**

- docs path scan
- `git diff --check`

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the AWWV platform packaging support worker. Packaging and installer work are paused until the live first-hour/command-surface experience is owner-approved; only update repo-owned checklists, templates, dry-run evidence manifests, or documentation rows from `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md`, and do not claim operator-only evidence.

### 2. Canon references

Read `docs/plans/MASTER_ROADMAP.md` packaging rows, `docs/plans/2026-05-17-clean-vm-cosmetic-finalization-plan.md`, `docs/plans/2026-05-17-gold-gate-launch-day-plan.md`, and existing release templates.

### 3. Determinism and ledger constraints

Build evidence manifests must be stable, sorted, and hash-based. Update release docs and ledger after validation. Do not include timestamps unless they are operator-entered fields in templates, not generated committed artifacts.

### 4. STOP AND ASK triggers

Stop for certificates/secrets, public endpoints, store uploads, real clean-VM proof, macOS signing/notarization, auto-update publication, or package metadata changes outside the prompt.

### 5. Output format and validation

Report lane, files changed, scripts/tests run, generated artifacts changed, operator-only rows still pending, docs/ledger updates, and next packaging lane.
