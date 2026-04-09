# Split-Child Shared-Front Routing Hardening

**Date:** 2026-04-09
**Status:** COMPLETE
**Lane:** Split-child sector assignment routing

## Seam

`ensureMinimumSectorCoverage(...)` already had a territory-membership pre-pass for zero-brigade split children, but it hard-skipped brigades whose `location_osid` was also on the donor sector's frontline. That was too strict for sibling sectors created by contiguity splitting when both sectors truthfully share the same front OSID. The result was an ownership deadlock: the zero-covered child stayed empty even when a donor sector had enough frontage surplus to donate one brigade without becoming under-covered itself.

## Root Cause

- Canonical owner: `src/sim/combat/brigade_assignment.ts` `ensureMinimumSectorCoverage(...)`
- Broken rule: `donorFrontOsids.has(location_osid) => continue`
- Missing exception: shared-front overlap between sibling sectors where the donor still retains its own hostile-edge floor after one transfer

The previous Lane B fix only handled "brigade is in zero-child territory but not on donor front." It did not cover the live split-child overlap variant documented in `20260405_FRONTLINE_OCCUPANCY_DENSITY_AUDIT.md`.

## Implementation

Changed `ensureMinimumSectorCoverage(...)` so the territory-membership pre-pass now:

1. Continues to prefer ordinary territory rescues first.
2. Allows a second rescue class, `shared_front_overlap`, when:
   - the brigade is on a front OSID shared by donor and zero-child,
   - the brigade is physically in the zero-child's territory,
   - and the donor keeps at least its own hostile-edge floor after the transfer (`assigned_brigade_ids.length > max(1, length_edges)` before donation).
3. Keeps deterministic ordering by sorting rescue candidates by rescue class, donor surplus, sector id, then brigade id.

## Tests

Added a new failing-then-passing regression to `tests/sector_split_brigade_assignment.test.ts`:

- `rescues a zero-brigade shared-front child when the donor keeps its hostile-edge floor`

Existing truth-preservation and territory-reconciliation coverage stayed green.

## Verification

### Targeted subsystem verification

- `npx.cmd vitest run tests/sector_split_brigade_assignment.test.ts tests/sector_coverage_truth_preservation.test.ts tests/brigade_territory_reconciliation.test.ts`
- `npm.cmd run recovery:check`

### Full verification bar

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed.

## Scenario Proof

### Baseline

- Scenario: `npm.cmd run sim:scenario:run:40w`
- Run: `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1396`
- Final hash: `922771c94560a967`
- Key evidence:
  - `invalid_operation_count: 4`
  - `zero_eligible_attacker_operation_count: 3`
  - `brigade_far_from_home: 26/218`
  - `operation_zero_eligible_execution`: `cmd_arbih_1st_corps_t17`
  - `cross_corps_sector_assignment`: 2 brigades

### Post-fix rerun

- Scenario: `npm.cmd run sim:scenario:run:40w`
- Run: `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Final hash: `165ac7e6b2ca5ba4`
- Key evidence:
  - `invalid_operation_count: 2`
  - `zero_eligible_attacker_operation_count: 1`
  - `brigade_far_from_home: 25/218`
  - `operation_zero_eligible_execution`: `cmd_arbih_1st_corps_t18`
  - `cross_corps_sector_assignment`: 2 brigades

### Before/after difference

- `invalid_operation_count` improved from `4` to `2`
- `zero_eligible_attacker_operation_count` improved from `3` to `1`
- `brigade_far_from_home` improved from `26/218` to `25/218`
- The final state hash changed, proving the fix altered live runtime behavior rather than merely renaming diagnostics.

### Honest residuals

- This lane did **not** clear the remaining `cross_corps_sector_assignment` seam.
- This lane did **not** clear the remaining Podrinje / `arbih_224th_mountain` unresolved-routing problems.
- The final `sector:vrs_1st_krajina:8` brigade count is still `1`; this lane hardened one ownership deadlock class, not the entire first-Krajina/Drina density problem.

## Files

- `src/sim/combat/brigade_assignment.ts`
- `tests/sector_split_brigade_assignment.test.ts`

## Follow-on

Best next bounded lane: post-run harness assignment-completeness validator drift in `tools/validate_run_consistency.cjs`, which still enforces a broader "every brigade must be in a sector" doctrine than the sim actually owns.
