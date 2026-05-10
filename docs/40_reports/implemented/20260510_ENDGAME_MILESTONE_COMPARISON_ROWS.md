# Endgame Milestone Comparison Rows

**Date:** 2026-05-10  
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison  
**Scope:** Product/UI contract slice

## Summary

`VerdictScreen` now renders a deterministic **Milestone Comparison** section below the existing War Cost / Historical Comparison block. The surface consumes optional `historicalComparison.milestone_comparison` rows when present, sorted by historical week and stable id. Older saves still get a truthful `War Duration` row derived from `costLedger.war_duration_weeks` and `historicalComparison.duration_delta_weeks`.

This closes the obvious player-facing milestone-week UX gap without changing simulation writers, scoring, termination, rupture triggers, or save production.

## Implementation

- Added `MilestoneComparison` and `MilestoneComparisonStatus` to `ComparisonResult`.
- Added pure `buildMilestoneComparisonRows(...)` composition in `VerdictScreen.tsx`.
- Added `EndgameMilestoneComparison` rendering with historical week, player week, delta, status, and source summary columns.
- Preserved older-save compatibility through a duration-only fallback row.

## Tests

- Red-first tests proved the helper and mounted UI were missing.
- Focused green suite:
  - `tests/ui/endgame_presentation_proof.test.ts`
  - `tests/ui/endgame_verdict_screen_mount.test.ts`

## Canon Posture

Ring 2 downstream reflection only. Milestone rows are not score inputs, player levers, optimization targets, or canon-event writers. Wording remains under `SENSITIVE_HISTORY_DESIGN_GATE.md` endgame constraints.

## Follow-Up

Broader v0.9.1 work is now narrower: authored historical milestone data should populate `milestone_comparison` beyond the duration fallback, and dynamic Codex authored coverage still needs expansion.
