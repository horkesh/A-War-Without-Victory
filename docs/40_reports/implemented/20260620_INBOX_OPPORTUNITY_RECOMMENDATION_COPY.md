# Inbox Opportunity Recommendation Copy

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Presidential Inbox operation-opportunity cards now render staff recommendations as player-facing copy instead of raw proposal enums.
- `approve` is displayed as `Staff recommends authorization.` on the inbox card while the underlying proposal id remains unchanged.

## Changes Made
- Added an opportunity-recommendation label map in `src/ui/map/data/inboxItems.ts`.
- Kept the existing operation-title split behavior, but now derives the opportunity subtitle from `proposed_value` when the value is known.
- Unknown/future proposal values retain the existing description fallback.

## Tests
- Updated `tests/ui/inbox_items.test.ts` to reject visible `approve` in the operation-opportunity inbox subtitle.
- Ran the existing raw-copy fallback test pack alongside the inbox regression.

## Verification
- Red proof: focused inbox test first failed on `staff recommendation: approve`.
- Focused green: `npm.cmd exec -- vitest run tests/ui/inbox_items.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 38/38.
- Typecheck: `npm.cmd run typecheck` passed.

## Scope / Determinism
- UI/read-model copy, tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.
