# Soundscape Kickoff and Audio Stub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare v1.0 audio work by creating the composer brief and a stubbed audio bus that can later consume real assets.

**Architecture:** Split operator-owned composer commissioning from engineering-owned audio plumbing. The first engineering pass must use silent or placeholder cues and preserve current behavior when audio is disabled.

**Tech Stack:** React/TypeScript, Web Audio or Howler.js decision, Electron asset packaging.

---

## Task 0: Inspect Existing Audio Surface

**Files:**
- Inspect: `src/ui/map/audio/sound_manifest.ts`
- Inspect: `src/ui/map/audio/audio_engine.ts`
- Inspect: `src/ui/map/components/SettingsScreen.tsx`

**Acceptance:** The plan executor records whether the repo already has a manifest/engine shape and chooses to extend it rather than create a parallel `src/ui/audio` tree.

## Task 1: Composer Brief

**Files:**
- Create: `docs/audio/2026-05-17-awwv-composer-brief.md`

**Contents:**
- Main theme requirement.
- 4-6 ambient loops by faction/phase.
- UI feedback set.
- 3-5 stingers.
- Sensitive-history audio constraints: no glorifying violence, no inflammatory nationalist cues, no national anthems.

**Acceptance:** Operator can send the brief without extra context.

## Task 2: Audio Manifest Schema

**Files:**
- Modify/create: `src/ui/map/audio/sound_manifest.ts`
- Test: `tests/ui/audio_manifest.test.ts`

**Steps:**
1. Define cue ids and categories.
2. Add test that every cue has id, category, default volume, and optional file path.

## Task 3: Stub Audio Bus

**Files:**
- Modify/create: `src/ui/map/audio/audio_engine.ts`
- Test: `tests/ui/audio_bus.test.ts`

**Steps:**
1. Implement `playCue(id)`, `setEnabled(boolean)`, `setVolume(kind, value)`.
2. Default to disabled/silent in tests.
3. No network, no timestamps, no randomness.

## Task 4: Hook Points

**Files:**
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modify: `src/ui/map/components/PeacePlanModal.tsx`
- Test: `tests/ui/audio_hook_points.test.ts`

**Acceptance:** Calls are no-op when disabled and do not break SSR/test render.

## Implementation Decision

- Prefer the existing browser-safe audio service shape if present.
- If choosing Web Audio directly, document why Howler.js was not added.
- If choosing Howler.js, update package metadata and desktop packaging evidence in the same task.
- No real audio assets are required for this stub pass; placeholder paths must fail silently.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui\audio_manifest.test.ts tests\ui\audio_bus.test.ts tests\ui\audio_hook_points.test.ts`
- `npm.cmd run desktop:map:build`

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_SOUNDSCAPE_KICKOFF_AUDIO_STUB.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Determinism: UI no-op/stub only; no sim state or save schema.

## Stop Gates And Closeout

- Stop if adding audio requires network access, runtime timestamps, randomness, or sim-state mutation.
- Stop if packaged asset paths cannot be validated in Electron.
- Before commit, run `git status --short` and stage only composer brief, audio stub, hook tests, docs, roadmap, and ledger files owned by this plan.
