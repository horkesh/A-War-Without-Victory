# Forced-Operation Receipt Recommendation Copy

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Turn Aftermath forced-operation receipts now render the commander recommendation actually stored on the forced operation receipt instead of always saying the commander recommended abort.

## Player Impact

- A force-launched operation over a `postpone` assessment now says the commander recommended waiting.
- A force-launched operation over an `abort` assessment still says the commander recommended abort.
- Legacy records without a no-go snapshot fall back to neutral command-record wording.

## Verification

- Red/green regression: `npx.cmd vitest run tests/ui/turn_aftermath_modal_i18n.test.ts`
- Focused pack: `npx.cmd vitest run tests/ui/turn_aftermath_modal_i18n.test.ts tests/ui/forced_op_receipts.test.ts`

## Scope

UI/read-model copy and tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
