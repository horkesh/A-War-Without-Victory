# Codex Panel Calendar Copy

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Normal Codex surfaces now render decision and unlock timing as calendar dates instead of raw week labels.

## Player Impact

- Turn-gated essay lock hints render `Unlocks from {date}` instead of `Unlocks from week {turn}`.
- Dilemma Spine branch timing renders `{date}` instead of `(W{turn})`.
- Distance from History divergence rows render `{date}` instead of `W{turn}`.
- The diagnostic Unlock State section remains gated behind `diagMode` and keeps internal metadata out of normal Codex copy.

## Verification

- Red focused regression failed on intended raw-copy leaks: `Unlocks from week 12`, `(W39)`, and `W39`.
- `npx.cmd vitest run tests/ui/codex_panel_unlock_state.test.ts --reporter=dot` passed 13/13.
- Adjacent Codex pack `npx.cmd vitest run tests/ui/codex_panel_unlock_state.test.ts tests/ui/dilemma_spine.test.ts tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` passed 66/66.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 107/107.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.
- `git diff --check` passed.

## Scope

UI/read-model copy, existing Codex i18n templates, tests, and docs only. BCS template edits only replace the turn placeholder with date placeholder for parity; no native-language LQA is claimed. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
