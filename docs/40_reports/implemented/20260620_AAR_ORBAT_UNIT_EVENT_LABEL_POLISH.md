# AAR / ORBAT Unit-Event Label Polish

**Date:** 2026-06-20
**Type:** UI/read-model copy polish

## Summary

Closed a reachable raw-copy leak in Army HQ Records AAR unit events and ORBAT expanded brigade details.

- AAR arc transitions now render authored player-facing labels such as `Garrison duty` and `Blooded in combat` instead of engine arc ids.
- AAR decoration awards now render faction decoration names such as `Slavna` instead of `tier 1` / `tier_1`.
- ORBAT expanded brigade arc badges now use the same player-safe narrative-arc labels.
- Unknown decoration tiers fall back to neutral `Campaign distinction` copy rather than echoing an internal tier id.

## Verification

- Red proof first failed in `tests/ui/operation_aar_records_review.test.ts` on visible `tier 1`, `garrison`, and `bloodied` copy.
- `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot` passed 14/14 after the fix.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 206/206.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.

## Determinism / Scope

UI/read-model rendering and focused tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, randomness, or packaged installer artifact changed.
