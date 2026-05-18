# Batch 11 Intel Execution Friction

Date: 2026-05-18

## Result

Implemented a narrow deterministic execution-friction slice for stale sector intel in OSID attack resolution.

## Behavior

- Added `getIntelExecutionFrictionMultipliers(...)` in `combat_math.ts`.
- Attack resolution now derives attacker confidence from the attacking sector's `sector_intel` record for the defending sector, preferring the target OSID's optional `osid_confidence` when present.
- Stale or missing attacker intel applies a bounded attacker power multiplier from `0.85` at confidence `0` to `1.0` at confidence `1`.
- If the defending sector is currently listed in `opsec_sectors`, defender power receives a bounded `1.08` multiplier for the same battle.
- No randomness, clock reads, schema migration, hidden-truth UI exposure, or ordering changes were added. Sector lookup order is explicitly sorted.

## Files

- `src/sim/combat/combat_math.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `tests/attack_resolution_osid_intel_friction.test.ts`

## Verification

- Red test observed first in the resolver-level regression: stale and fresh intel initially produced identical `power_ratio`, and the pure helper export was absent.
- `npx.cmd vitest run tests\attack_resolution_osid_intel_friction.test.ts tests\sector_intel.test.ts tests\sector_offensive.test.ts --reporter=dot`
  - Passed: 3 files, 33 tests.
- `npm.cmd run typecheck`
  - Passed.
- `rg -n "Math\.random|Date\.now|new Date|performance\.now" src\sim\combat\attack_resolution_osid.ts src\sim\combat\combat_math.ts tests\attack_resolution_osid_intel_friction.test.ts`
  - No executable nondeterministic calls found; only an existing header comment mentions `Math.random`.
- Parent integration verification:
  - `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/sector_intel.test.ts tests/sector_offensive.test.ts tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot` passed: 6 files / 53 tests.
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run sim:scenario:run:40w` produced n1887 hash `38fcfed23b5b5c11`, 27/27 anchors, and 6/6 bot benchmarks.
  - `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1887` passed.

## Hash Risk

This is simulation-affecting by design. Parent integration re-anchored the active 40w proof from n1886 `bc4e06185d3145aa` to n1887 `38fcfed23b5b5c11` with anchors and benchmarks still green. Runs with full combat-refreshed confidence on the target OSID keep multiplier `1.0` and should remain closer to prior behavior.

## Deferred

- No separate readiness gate was added; this slice affects execution-time combat resolution only.
- No casualty-only ambush event or UI-facing battle annotation was added. That can be layered later if the AAR/report schema accepts an optional public friction tag.
- OPSEC only affects battles while the defending sector is still present in `state.military.opsec_sectors`; broader defender surprise modeling remains a follow-up.
