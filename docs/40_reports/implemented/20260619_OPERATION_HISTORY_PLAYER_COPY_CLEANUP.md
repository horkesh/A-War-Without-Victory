# Operation History Player Copy Cleanup

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Army HQ Records -> Operation History now renders operation timing and fallback detail as player-facing staff copy instead of raw week labels or enum/debug identifiers.

## Player Impact

- Completed-operation cards render calendar date ranges instead of `W{start}-W{end}`.
- Active-operation cards render `Since {date}` instead of `Since W{turn}`.
- Weekly operation rows render calendar dates instead of `W{turn}`.
- Grade-factor and notable-event fallbacks use player-safe labels or neutral copy instead of raw underscore identifiers.
- Commander assessment rows use readable recommendation labels instead of raw `launch` / `postpone` / `abort` values.

## Verification

- Red focused regression failed on the intended raw-copy leaks: raw completed-operation week range, raw active `Since W` copy, raw grade-factor labels, and raw notable-event ids.
- `npx.cmd vitest run tests/ui/operation_aar_records_review.test.ts` passed 11/11.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 107/107.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.
- `git diff --check` passed.

## Scope

UI/read-model copy, existing Operation History i18n templates, tests, and docs only. BCS template edits remove raw week prefixes for parity, but no native-language LQA is claimed. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
