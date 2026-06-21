# Map Overlay Timing Lifecycle Guard

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Removed the duplicate-prone dev-console timer that spanned MapContainer front and deferred formation overlay work.
- Added a small dev-timer helper that gives overlapping timers unique labels and makes `end()` idempotent.
- Split MapContainer overlay timing into control, front, and deferred-formation chunks so cancellable idle work cannot leave an open timer.
- When cleanup cancels deferred overlay work, the applied overlay state is marked stale so the next effect pass can rebuild instead of treating a partial overlay as complete.

## Changes Made
- Added `src/ui/map/map/overlayTiming.ts`.
- Replaced raw `console.time('[MapContainer] overlay front+formations')` / `console.timeEnd(...)` with `createDevTimer(...)`.
- Wrapped control/front timing in local `try/finally` blocks.
- Started and ended deferred-formation timing inside the scheduled callback itself.
- Reset `appliedStateRef.current` when deferred overlay work is canceled during effect cleanup.

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\map_overlay_timing_contract.test.ts --pool=forks --reporter=dot` failed before implementation because `overlayTiming.js` did not exist.
- Red proof: the same test failed before the cleanup guard because the deferred-overlay cleanup block did not mark `appliedStateRef.current = null`.
- Green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\map_overlay_timing_contract.test.ts --pool=forks --reporter=dot` passed 4/4.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed; evidence contained `recordsAarFormationLinkLiveProof`, `presidentialInboxRoutingLiveProof`, and `serverPortCleanupVerified`, and no `Timer '[MapContainer] overlay front+formations' already exists` warning.
- `.tmp_live_surface_browser_sweep` was removed after evidence inspection.

## Determinism / Scope
- UI map instrumentation/lifecycle/test/docs only.
- No map data, geometry builders, rendering style contracts, simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, randomness, timestamps, packaged installer artifact, or persisted output ordering changed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/map/overlayTiming.ts` | Added idempotent unique-label dev timer helper. |
| `src/ui/map/map/MapContainer.tsx` | Split overlay timing into balanced chunks and reset stale applied state when deferred work is canceled. |
| `tests/ui/map_overlay_timing_contract.test.ts` | Pins timer helper behavior, MapContainer source contract, and deferred cleanup stale-state guard. |
