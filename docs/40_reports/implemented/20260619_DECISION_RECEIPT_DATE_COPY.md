# Decision Receipt Date Copy

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Decision consequence receipt surfaces now render decision timing as calendar dates instead of raw turn/week wording.

## Player Impact

- Army HQ Records -> Decision Consequences now labels each receipt with `turnToDateString(record.turn)` instead of `Turn {n}`.
- The Decision Consequences summary now says `Latest Filing` and shows the latest receipt date instead of `Latest Turn` plus a raw number.
- Chronicle confirmed consequence receipts now say the originating decision happened on the calendar date instead of `at week {n}`.

## Verification

- Red regression: `npm.cmd run test:ui -- tests/ui/decision_consequence_records_panel.test.ts tests/ui/chronicle_decision_ledger.test.ts` failed on the intended raw-copy defects (`Latest Turn`, `Turn 8` / `Turn 44`, and `at week 8`).
- Green focused pack: `npx.cmd vitest run tests/ui/decision_consequence_records_panel.test.ts tests/ui/chronicle_decision_ledger.test.ts` passed 11/11.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 107/107.
- `npm.cmd run qa:first-hour:browser` passed and verified port 3237 cleanup.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.
- `git diff --check` passed.

## Scope

UI/read-model copy, existing i18n label text, tests, and docs only. The BCS summary label was changed only to keep the existing localized surface from saying "latest turn"; it still needs normal native-speaker LQA before any production-quality BCS claim. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
