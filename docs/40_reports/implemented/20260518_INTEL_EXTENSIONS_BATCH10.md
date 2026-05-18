# Intel Extensions Batch 10

**Date:** 2026-05-18
**Baseline:** `ca29abf6 feat(roadmap): close ninth backlog execution batch`
**Result:** First bounded intel extension slice implemented and tested

## Summary
- Added optional JSON-safe per-OSID confidence entries to `SectorIntelRecord`, sorted by OSID and constrained to front-visible enemy OSIDs.
- Added deterministic source blending for passive contact, patrol posture, scout-capable recon range, and combat refresh.
- Fed per-OSID confidence into commander belief strength and confidence estimates without exposing hidden enemy truth.

## Changes Made

### Sector Intel State
- `src/state/game_state.ts` adds `SectorIntelSource` and `SectorIntelOsidConfidence`.
- `SectorIntelRecord.osid_confidence` is optional for backward compatibility with existing saves and fixtures.

### Sector Intel Derivation
- `src/sim/combat/sector_intel.ts` now emits sorted front-visible enemy OSID confidence entries.
- Passive contact always contributes `passive_contact`.
- Screening and active-defense sector stances contribute `patrol`.
- Recon range `>= 2` contributes `scout`.
- Combat refresh sets the engaged defender OSID to confidence `1` with source `combat`.

### Commander Belief
- `src/sim/combat/commander/belief.ts` uses per-OSID confidence, when present, to bound fresh strength estimates.
- Existing records without `osid_confidence` retain legacy strength behavior.

## Files Changed

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Optional per-OSID intel confidence/source types |
| `src/sim/combat/sector_intel.ts` | Sorted OSID confidence derivation and combat source refresh |
| `src/sim/combat/sector_intel_constants.ts` | Source confidence bonus constants |
| `src/sim/combat/commander/belief.ts` | Confidence-bounded belief estimates |
| `tests/sector_intel.test.ts` | Red/green tests for sorted OSID confidence and source blending |
| `tests/commander/commander_belief_layer.test.ts` | Red/green test for belief-side confidence bounding |

## Deferred Tasks
- Stale-intel launch/execution penalties remain deferred because they require deeper hooks in `sector_offensive.ts` and/or `attack_resolution_osid.ts`, which are outside this slice's write scope.
- Surprise/ambush execution friction remains deferred for the same reason and should stay deterministic if implemented later.
- Player-facing/read-model documentation was not updated because this slice does not expose the new fields through UI or player-visible adapters.

## Parent Integration Evidence
- `npm.cmd run typecheck` passed.
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/sector_intel.test.ts tests/commander/commander_belief_layer.test.ts --reporter=dot` passed (3 files / 41 tests).
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `npm.cmd run sim:scenario:run:40w` produced n1886 final hash `bc4e06185d3145aa`, 27/27 anchors, and 6/6 bot benchmarks.
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1886` passed.

The 40w hash moves by design from n1885 `42607f83870e01d5` because per-OSID intel confidence is now serialized into `state.military.sector_intel` and feeds commander belief. Treat n1886 as the active Batch 10 40w proof.
