# Army-HQ Elite Loan Deployment - n1842 H5

**Date:** 2026-05-16
**Run evidence:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/`; post-fix verification `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/`
**Source track:** `docs/plans/2026-05-16-engine-health-n1842-plan.md` H5
**Status:** IMPLEMENTED - VERIFIED IN n1844

## Summary

- `deployEliteLoan(...)` now issues a concrete column movement order when an army-HQ elite/general-staff reserve is loaned to a field corps.
- The destination prefers active operation axis staging, then threatened target-corps sector evidence, then nearest target-corps sector.
- Brigade-assignment unresolved warning logic now suppresses movement-owned loaned elites only when a valid column deployment order exists; malformed or unrelated orders still remain honest unresolved evidence.

## Changes Made

### Deployment Orders

`src/sim/combat/army_reserve_system.ts` now clears stale return marches on loan redeployment and calls deployment-order logic after opening the loan episode. The order targets the receiving corps rather than the source army-HQ/main-staff owner.

Target choice is deliberately bounded:

- Active operation axis staging when an execution operation has axis staging evidence.
- Target-corps sector evidence when no active op staging is available.
- Nearest target-corps sector by adjacency when no threatened-sector cue is available.

### Sector Assignment Boundary

`src/sim/combat/brigade_assignment.ts` continues to exempt idle army-HQ/main-staff elites from sector assignment until loaned. Once loaned, the effective corps becomes `elite_loan_state.loaned_to_corps`, so the brigade can enter the receiving corps's sector system after arrival.

Movement-owned warning suppression is narrow: a loaned elite with a valid column deployment order to the receiving sector/op staging is not logged as fallen through while it is marching. A loaned elite with a non-column or otherwise ownerless movement order is still reported unresolved.

## Scenario Results

Post-fix 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844` completed with final hash `ccd3f9f770052614`.

Acceptance evidence:

- Final save `military.unresolved_sector_brigades` is `[]`.
- `arbih_guards_brigade` has no pending movement order or movement state at final save.
- `arbih_guards_brigade` is assigned to `sector:arbih_1st_corps:8` as `role: reserve` while loaned to `arbih_1st_corps`.
- `npm.cmd run sim:scenario:audit-sectors -- --save runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json` returns `ok: true`, `saved_unresolved: 0`, and zero saved/rebuilt unresolved sector brigades.

This verifies the original H5 `arbih_guards_brigade` fall-through is closed. n1844 still surfaces other formation-health issues, including `hrhb_vitezovi_brigade_vitez` in enemy territory during the run log; those are separate follow-up lanes.

## Verification

Known focused coverage from the implementation wave:

- `tests/army_reserve_system.test.ts` verifies `deployEliteLoan(...)` issues column deployment orders to receiving corps sectors.
- The same suite verifies operation-axis staging is preferred over generic sector evidence.
- The all-elite case table covers ARBiH Guards, Black Swans, VRS Guards, VRS 65th Protection, and HVO guard brigades.
- The unresolved-warning tests verify valid column deployment suppresses fall-through reporting, malformed movement ownership does not, and the brigade is synchronized into the receiving corps sector after column arrival.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/army_reserve_system.ts` | Concrete deployment-order target selection for loaned army-HQ elites |
| `src/sim/combat/brigade_assignment.ts` | Loaned elites use receiving corps for sector placement; movement-owned unresolved suppression |
| `tests/army_reserve_system.test.ts` | Deployment-order, all-elite, suppression, and arrival/assignment coverage |

## Next Steps

- If an elite remains unresolved after a valid deployment order has completed, treat it as a new receiving-sector truth issue rather than reopening army-HQ loan issuance.
