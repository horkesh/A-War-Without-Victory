# BCS Verdict Milestone Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` milestone-comparison chrome and fallback duration row

## Summary

The endgame milestone comparison section now renders its table title, column labels, fallback duration-row label, week labels, status labels, delta labels, and fallback duration summary through the existing English/BCS localization substrate.

This is presentation-only. It does not change milestone comparison truth, historical comparison math, Cost Ledger data, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `verdict.milestone.*` message keys to the English/BCS dictionaries.
- Routed milestone week, status, delta, fallback duration label, and fallback duration summary formatters through `t(...)`.
- Routed `EndgameMilestoneComparison` title and column labels through `t(...)`.
- Left explicit source-authored milestone labels and summaries authoritative; only the fallback duration row and shared chrome are localized.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode could not find `Poredjenje prekretnica`.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Existing pure presentation contract: `npx.cmd vitest run tests\ui\endgame_presentation_proof.test.ts --reporter=dot` passed 29/29.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\endgame_presentation_proof.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\war_cost_summary.test.ts tests\ui\settings_localization.test.ts --reporter=dot` passed 62/62 across the discovered files in that invocation.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, source-provided dimension/package/institution label mapping, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
