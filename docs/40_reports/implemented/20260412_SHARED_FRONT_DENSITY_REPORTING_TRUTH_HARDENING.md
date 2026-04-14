# Shared-Front Density Reporting Truth Hardening

**Date:** 2026-04-12
**Baseline:** `n1541` final save, hash `bac53e3038883843`
**Result:** Harness/reporting truth change only; no sim-state mutation

## Summary

- `frontline_density_imbalance` could still accuse a paper-empty sector even when every front OSID in that sector was physically covered by an active same-corps sibling-sector brigade.
- The live case was `sector:vrs_1st_krajina:4` on the Maglaj/Jablanica shared-front knot: the sector had zero own assigned brigades, but `op:maglaj:jablanica` was physically held by `rs_1st_ozren_light_infantry` as a front brigade in sibling `sector:vrs_1st_krajina:0`.
- The detector now suppresses only low-density paper-empty sectors whose front OSIDs are all physically covered by active same-corps sibling front assignments. True unique low-density frontage remains reportable.

## Changes Made

### Harness Truth

- `src/scenario/anomaly_detector.ts`
  - Added a physical same-corps sibling-coverage rule for low-density sector reports.
  - The rule only applies when the accused sector has no own assigned/reserve brigades and every friendly front OSID is occupied by an active brigade assigned as front to another sector in the same corps/faction that also claims that OSID as frontage.
  - High-density warnings and genuinely uncovered low-density sectors are unchanged.

### Regression Coverage

- `tests/frontline_density_cold_front_truth.test.ts`
  - Added a red/green regression for the Maglaj-style shared-front knot.
  - Added a counter-regression proving unique empty low-density sectors still report.

## Verification

- Red/green proof:
  - Initial targeted run failed because `sector:vrs_1st_krajina:4` was still reported.
  - Final targeted run passed.
- Targeted suite:
  - `npx.cmd vitest run tests/frontline_density_cold_front_truth.test.ts tests/anomaly_detector_deployment_truth.test.ts tests/brigade_stacking_sector_truth.test.ts`
  - Passed: 3 files, 13 tests.
- Sector/live-owner suite:
  - `npx.cmd vitest run tests/final_sector_live_owner_real_save.test.ts tests/final_sector_geometry_invariant_real_save.test.ts tests/frontline_density_cold_front_truth.test.ts tests/validate_run_consistency.test.ts`
  - Passed: 4 files, 16 tests.
- Type/build:
  - `npx.cmd tsc --noEmit -p tsconfig.json`
  - `npm.cmd run build`
  - Both passed.

## Final-Save Proof

Using `data/derived/latest_run_final_save.json` from `n1541`:

- `frontline_density_imbalance` dropped from 10 entities to 9.
- `sector:vrs_1st_krajina:4` is no longer reported.
- Direct physical audit:
  - `frontAssignedOffFrontCount = 0`
  - `nonColdFrontSectorsWithoutPhysicalFrontOwner = 0`
  - `empty_contested_sector = none`
  - `undefended_front_subsegments = none`
  - `adjacent_uncontested_territory = none`
  - `unassigned_frontline_brigades = none`

## Lessons Learned

- A sector can be paper-empty while still physically covered at a shared-front knot. Reporting must consume physical same-corps frontage truth before accusing the sector.
- Cold-front unstaffed sectors are a separate truth owner. The Vareš HRHB-RS empty sectors are Graz cold fronts, not active-sector failures.
- Remaining density warnings after this lane are force-distribution extremes, not sector ownership or geometry lies.

## Files Changed

| File | Change |
|------|--------|
| `src/scenario/anomaly_detector.ts` | Suppress low-density paper-empty shared-front false positives when same-corps sibling frontage physically covers the OSID. |
| `tests/frontline_density_cold_front_truth.test.ts` | Added shared-front suppression and unique-gap counter regressions. |

## Next Steps

- Treat the remaining `frontline_density_imbalance` entities as a force-distribution/doctrine lane, not a sector-contiguity lane.
- Keep cold-front unstaffed sectors separate from active-front ownership failures in future audits.
