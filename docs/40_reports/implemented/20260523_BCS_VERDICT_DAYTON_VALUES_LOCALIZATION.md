# BCS Verdict Dayton Value Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Rich `VerdictScreen` Dayton package, institution, and patron-override values

## Summary

The rich verdict screen now localizes known Dayton package IDs, institution keys/values, and patron override IDs through stable mappings while preserving raw source values as fallback.

This is presentation-only. It does not change Dayton negotiation data, verdict scoring, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `verdict.dayton.package.*`, `verdict.dayton.institution.*`, `verdict.dayton.institutionValue.*`, and `verdict.dayton.patronOverride.*` message keys.
- Added local Dayton value formatters in `VerdictScreen.tsx` for known fixture/live IDs.
- Preserved raw source fallback for unknown packages, institutions, values, and patron overrides.

## Verification

- Red: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` failed while BCS mode still rendered raw `package_a`.
- Green: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts --reporter=dot` passed 19/19.
- Compatibility contract: `npx.cmd vitest run tests\ui\endgame_presentation_proof.test.ts --reporter=dot` passed 29/29.

## Remaining Work

Verdict localization still needs smaller slices for Cost Ledger finding prose, historical divergence-note prose, authored verdict prose, and broader Chronicle/Army HQ/Decision Room/event prose.
