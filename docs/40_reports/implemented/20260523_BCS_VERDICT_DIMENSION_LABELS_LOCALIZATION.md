# BCS Verdict Dimension-Label Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` capital-dimension labels

## Summary

The rich verdict screen now localizes known negotiating-capital dimension labels by stable dimension ID while preserving source-provided labels as fallback for unknown dimensions.

This is presentation-only. It does not change verdict scoring, dimension scores, grades, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `verdict.dimension.*` message keys to the English/BCS dictionaries.
- Added a local `formatDimensionLabel(...)` helper that maps known `DimensionGrade.dimension` IDs to localized labels.
- Preserved `dg.label` fallback for unknown/source-expanded dimension IDs.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered `Military Credibility`.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Compatibility contract: `npx.cmd vitest run tests\ui\endgame_presentation_proof.test.ts --reporter=dot` passed 29/29.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, source-provided package/institution label mapping, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
