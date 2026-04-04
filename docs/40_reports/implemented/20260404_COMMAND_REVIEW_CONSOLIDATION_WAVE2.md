# Command Review Consolidation Wave 2
**Date:** 2026-04-04  
**Status:** IMPLEMENTED  
**Wave:** 9 (Command Authority test block)

## What Was Done

Extended command-relationship visibility from executing/recovery ops (Wave 1) to completed operations in `OperationHistoryPanel`.

### Task 1 — OutcomeCategoryBadge on completed op cards

- Replaced the generic `⚠ Override` badge (lines ~163–169 of `OperationHistoryPanel.tsx`) with a three-tier `OutcomeCategoryBadge` component defined locally (not exported from `OperationsSection.tsx` — avoids cross-component coupling).
- Three tiers:
  - `ordinary_compliance` → null (silence=healthy, no badge)
  - `reluctant_compliance` → dim amber "Approved Against Recommendation"
  - `direct_intervention` → bold amber "⚠ Direct Intervention"
- CA cost (when present) moved to a separate sibling span below the badge.

### Task 2 — Command Record narrative tightened

The expanded Command Record block (lines ~213–239) now distinguishes all three tiers:
- `direct_intervention`: "Direct Intervention" label (not "overrode command chain")
- `reluctant_compliance`: "Approved Against Recommendation" label (new tier, was invisible before)
- `ordinary_compliance`: "Approved" (was already correct)
- Institutional strain note updated: "Direct Intervention contributed to command strain" (not "Presidential override")

### Task 3 — `buildOperationTrendSummary()` in command_strain.ts

Pure helper appended after `deriveStanceInterpretation`. Accepts a minimal subset of CompletedOp fields. Iterates via `deriveOperationOutcomeCategory` — no duplication of category logic. Returns `OperationTrendSummary` with `trendNotice: null` when all ops are ordinary compliance (silence=healthy).

### Task 4 — Trend summary header in history tab

Small amber notice rendered above the op-card list when `trendNotice !== null`:
```
Command relationship: 2 Direct Interventions, 1 Reluctant Compliance
```
Silence=healthy: renders nothing when all ops are ordinary compliance. No modal, no drill-down.

### Task 5 — Wave 9 test block (7 cases)

Added `describe('Wave 9: Command Review Consolidation Wave 2', ...)` to `tests/command_authority.test.ts`. All 7 cases pass. Full suite: 168/168 in `command_authority.test.ts`.

## Files Changed

- `src/ui/map/components/OperationHistoryPanel.tsx` — OutcomeCategoryBadge, trend header, tightened Command Record narrative
- `src/ui/map/data/command_strain.ts` — `OperationTrendSummary` interface + `buildOperationTrendSummary()` exported
- `tests/command_authority.test.ts` — Wave 9 block (7 tests), import updated

## Verification

- `npx tsc --noEmit` — clean
- `vitest run tests/command_authority.test.ts` — 168/168
- `desktop:map:build` — clean (8.45s)
- Full suite: 20 pre-existing failures in unrelated files (brigade_posture, commander_override, corps_front_sector_corps_ownership, desktop_pmtiles, war_phase_step_order, engine_honesty_legacy_contracts) — none caused by this wave

## Canonical Owner

`src/ui/map/data/command_strain.ts` owns all outcome-category derivation logic. `OperationHistoryPanel.tsx` owns completed-op display. No sim changes, no schema changes.

## Required Completion Block

```
Canonical owner: src/ui/map/data/command_strain.ts (deriveOperationOutcomeCategory, buildOperationTrendSummary)
Demoted path: generic "⚠ Override" badge removed from OperationHistoryPanel completed-op cards
Player-visible truth: three-tier badge on every completed op card; trend line in history tab header
Canonical UI surface: OperationHistoryPanel (history tab)
Done means: tsc clean, 168/168 Wave 1–9 tests, build clean, silence=healthy preserved
```
