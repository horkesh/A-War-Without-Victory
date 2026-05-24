# BCS War Cost Divergence Notes Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `WarCostSummary` historical divergence-note display

## Summary

`WarCostSummary` now localizes known generated historical divergence-note shapes through the existing English/BCS substrate while preserving raw source-authored notes as fallback.

This is presentation-only. It does not change `compareToHistorical(...)`, divergence-note generation, Cost Ledger data, verdict scoring, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `warCost.divergence.*` message keys to the English/BCS dictionaries.
- Added `formatHistoricalDivergenceNote(...)` to localize known generated duration notes and known Srebrenica comparison notes.
- Kept unknown authored notes unchanged.
- Scoped the first UI proof to the `WarCostSummary` section; the follow-up CinematicVerdict comparison path is tracked in `20260523_BCS_CINEMATIC_VERDICT_COMPARISON_LOCALIZATION.md`.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered `War lasted 6 weeks longer` in the War Cost section.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Helper contract: `npx.cmd vitest run tests\ui\war_cost_summary.test.ts --reporter=dot` passed 13/13.

## Remaining Work

Localization still needs smaller slices for Cost Ledger finding prose, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
