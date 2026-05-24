# BCS Verdict Outcome-Class Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` outcome-class badges

## Summary

The rich verdict screen now renders outcome-class labels through the existing English/BCS localization substrate in its faction tabs and selected-faction report badge.

This is presentation-only. It does not change verdict scoring, outcome classification, faction grades, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Reused the existing `verdict.outcome.*` English/BCS message keys.
- Routed `VerdictScreen.formatOutcomeClass(...)` through `t(...)` instead of its local hardcoded English label map.
- Left outcome-class styling and source verdict data unchanged.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered two `Survival` badges.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Compatibility pack: `npx.cmd vitest run tests\ui\endgame_presentation_proof.test.ts tests\ui\verdict_share_summary.test.ts --reporter=dot` passed 32/32.

## Remaining Work

Verdict localization still needs smaller slices for condemnation notice prose, Cost Ledger finding prose, historical divergence-note prose, source-provided dimension/package/institution label mapping, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
