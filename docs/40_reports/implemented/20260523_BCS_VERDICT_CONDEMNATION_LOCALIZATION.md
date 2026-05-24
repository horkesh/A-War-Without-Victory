# BCS Verdict Condemnation Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` condemnation notice body text

## Summary

The rich verdict screen now renders known condemnation notice body text through the existing English/BCS localization substrate.

This is presentation-only. It localizes existing notice categories and does not add new sensitive-history facts, condemnation categories, verdict scoring logic, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `verdict.condemnation.*` message keys to the English/BCS dictionaries.
- Routed `formatCondemnationFlag(...)` through the message substrate for known flags.
- Preserved the existing unknown-flag fallback that replaces underscores with spaces.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered `Condemned for genocide`.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Compatibility contract: `npx.cmd vitest run tests\ui\endgame_presentation_proof.test.ts --reporter=dot` passed 29/29.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, source-provided dimension/package/institution label mapping, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
