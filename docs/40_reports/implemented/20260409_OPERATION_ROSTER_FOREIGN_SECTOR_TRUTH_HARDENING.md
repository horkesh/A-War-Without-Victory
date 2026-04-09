# Operation Roster Foreign-Sector Truth Hardening

**Date:** 2026-04-09
**Status:** COMPLETE
**Lane:** Engine operation roster vs foreign-sector ownership truth

## Candidate seams considered

1. Residual `cross_corps_sector_assignment` anomaly family in fresh 40-week runtime proof
2. Live operation roster drift under foreign-sector attachment
3. Remaining `arbih_717th_slavna_mountain` cross-corps ownership seam

The operation-roster seam won. It was the highest-value bounded step because `n1398` showed a concrete wrong-runtime-truth contradiction: `rs_5th_podrinje` was physically attached to `sector:vrs_1st_krajina:1` but `Operation Podrinje Sweep` still claimed it as a Drina participant across turns 5-9. That was a direct live ownership conflict, narrower and higher-value than attempting to redesign the whole residual anomaly family in one lane.

## Exact seam chosen

`src/sim/combat/final_operation_truth_reconciliation.ts` was preserving stale same-corps operation roster membership even when a brigade's only live sector claim belonged to a different corps.

That let `Operation Podrinje Sweep` keep `rs_5th_podrinje` in its participant list after the brigade had already been attached to a 1st Krajina sector. The sim therefore serialized a Drina operation roster that no longer matched live sector authority.

## Root cause

- Canonical owner after cleanup: live sector truth in `state.military.corps_front_sectors`
- Demoted path after cleanup: stale `participating_brigades` / `axis.assigned_brigades` retention based only on old roster membership plus brigade `corps_id`

The old reconciliation pass filtered participants to active formations, but it did not ask whether the brigade's current live sector claim still belonged to the operation corps. When a brigade had drifted into another same-faction corps sector, the operation roster could keep claiming it anyway.

## Implementation

Changed the operation-truth pipeline so live foreign-sector ownership outranks stale roster retention:

1. Added `buildSectorClaimsByBrigade(state)` in `src/sim/combat/final_operation_truth_reconciliation.ts` to derive deterministic brigade-to-corps sector claims from `corps_front_sectors`.
2. Updated `uniqueActiveParticipants(...)` to accept `state` and drop any brigade whose live sector claims exist but none belong to the operation corps.
3. Applied that same filtered participant set to both `operation.participating_brigades` and each `axis.assigned_brigades`, so flat and axis-level truth stay aligned.
4. Inserted a new live war-phase step, `reconcile-live-operation-truth`, in `src/sim/turn_phases/war_phases.ts` immediately before `advance-sector-offensives`, so stale rosters are cleaned during live turn processing instead of only at end-of-turn finalization.
5. Added a direct regression in `tests/final_operation_truth_reconciliation.test.ts` and updated the phase-order contract in `tests/war_phase_step_order.test.ts`.

## Tests

Added a targeted regression in `tests/final_operation_truth_reconciliation.test.ts`:

- `drops participants whose only live sector claim belongs to a different corps`

The regression proves the exact seam: a brigade still belongs administratively to one corps, but its only live sector claim belongs to another corps. Before the fix, the operation kept the brigade. After the fix, the operation and its axes both drop it.

## Verification

### Targeted verification

- `npx.cmd vitest run tests/final_operation_truth_reconciliation.test.ts`
- `npx.cmd vitest run tests/final_operation_truth_reconciliation.test.ts tests/operation_lifecycle_assertion.test.ts`
- `npx.cmd vitest run tests/war_phase_step_order.test.ts`
- `npm.cmd run sim:scenario:run:40w`

### Full verification bar

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed after the fix and the step-order contract update.

## Scenario proof

### Baseline

- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1398`
- Operation truth on turns 5-9 in `weekly_report.jsonl`:
  - `Operation Podrinje Sweep`
  - `participating_brigades`: `rs_1st_birac`, `rs_1st_bratunac`, `rs_1st_milii`, `rs_1st_podrinje`, `rs_1st_vlasenica`, `rs_5th_podrinje`
- Final save truth for `rs_5th_podrinje`:
  - `corps_id: vrs_drina`
  - `location_osid: op:mrkonjic_grad:baljvine_2`
  - `assignment: { kind: "sector", role: "front", sector_id: "sector:vrs_1st_krajina:1" }`
- Cross-corps anomaly:
  - `2 brigade(s) are assigned to sectors belonging to a different corps... arbih_717th_slavna_mountain ... rs_5th_podrinje ...`
- Combat-causality counters remained healthy:
  - `invalid_operation_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`

### Post-fix rerun

- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1399`
- Operation truth on turns 5-9 in `weekly_report.jsonl`:
  - `Operation Podrinje Sweep`
  - `participating_brigades`: `rs_1st_birac`, `rs_1st_bratunac`, `rs_1st_milii`, `rs_1st_podrinje`, `rs_1st_vlasenica`
  - `rs_5th_podrinje` is gone from the roster from turn 5 onward
- Final save truth for `rs_5th_podrinje`:
  - `corps_id: vrs_drina`
  - `location_osid: op:mrkonjic_grad:baljvine_2`
  - `assignment: null`
- Residual cross-corps anomaly:
  - `1 brigade(s) are assigned to sectors belonging to a different corps... arbih_717th_slavna_mountain ...`
- Combat-causality counters remained healthy:
  - `invalid_operation_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`

### Before/after difference

- `Operation Podrinje Sweep` stopped claiming a brigade whose only live sector ownership belonged outside Drina
- `cross_corps_sector_assignment` dropped from `2` brigades to `1`
- The remaining residual is now isolated to `arbih_717th_slavna_mountain`
- This was real hardening, not wording movement: the operation roster and axis truth now yield to live sector ownership instead of preserving stale administrative participation

## Ownership after cleanup

- Canonical owner: live same-faction sector truth from `state.military.corps_front_sectors`
- Player-visible truth after cleanup: operation views and diagnostics no longer imply that Drina still commands a brigade currently attached to 1st Krajina frontline truth
- Canonical UI surface after cleanup: unchanged downstream operation diagnostics / reports / AARs now inherit cleaner sim truth; no UI-side compensation path was added

## Files

- `src/sim/combat/final_operation_truth_reconciliation.ts`
- `src/sim/turn_phases/war_phases.ts`
- `tests/final_operation_truth_reconciliation.test.ts`
- `tests/war_phase_step_order.test.ts`

## Residual risks

- `arbih_717th_slavna_mountain` still ends `n1399` attached to `sector:arbih_1st_corps:3` while belonging to `arbih_3rd_corps`; that is now the top remaining member of this anomaly family.
- `rs_5th_podrinje` still physically sits at `op:mrkonjic_grad:baljvine_2` with no assignment in `n1399`. This lane truthfully demoted stale operation ownership, but it did not yet prove the best reassignment or recall path for that brigade.

## Follow-on

Best next bounded lane: investigate the residual `arbih_717th_slavna_mountain` foreign-sector attachment and determine whether it is a truthful enclave/loan case, a drifted brigade that should be recalled, or another stale sector-ownership leak.
