# RBiH Supply Constraint Arms Embargo

**Date:** 2026-05-17
**Lane:** `LANE-V09X-EMBARGO`
**Plan:** `docs/plans/2026-05-17-rbih-supply-constraint-arms-embargo-plan.md`
**Status:** Implemented through cited scope with integrated evidence recorded.

## Change

The RBiH arms embargo is now resolved through a deterministic phase timeline in `src/state/embargo.ts` instead of a hard-coded patron-aid multiplier in `src/state/supply_reserves.ts`.

- `resolveActiveEmbargoPhase(state)` reads canonical event flags and returns the latest active phase.
- `EMBARGO_PHASE_CAPS` keeps RS and HRHB at `1.0` for every phase and applies only RBiH patron-aid throttles.
- Phase 1, 2, and 4 RBiH values are calibrated engine multipliers anchored to Historian H4's qualitative bands: `0.60`, `0.65`, and `0.80`.
- Phase 3 Black Flights and Phase 5 formal lift stay tied to their predecessor caps pending `/historian` follow-up.
- `embargo_croatia_transit_1992` now sets `embargo_croatia_transit` in the mid-1992 window from BB1 p.167 / Historian H4.
- `embargo_lifted_non_enforcement_1994` now sets `embargo_lifted` at turn 136 from BB1 p.63 / Historian H4.

The existing reserve maximum caps remain unchanged; this lane only replaces the patron-aid chokepoint throttle.

## Combat Consumer Audit

| File | Finding | Action |
| --- | --- | --- |
| `src/sim/combat/supply_condition.ts` | Reads live/fallback supply condition only; no RBiH embargo multiplier. | No edit. |
| `src/sim/combat/supply_pressure.ts` | Derives pressure from supply state/overextension; no RBiH embargo multiplier. | No edit. |
| `src/sim/combat/exhaustion.ts` | Reads live supply pressure and existing Sarajevo exhaustion asymmetry; no embargo multiplier. | No edit. |

No double-counting risk was found in the named combat consumers.

## Verification

- `npx.cmd vitest run tests\embargo_phase_resolution.test.ts tests\supply_reserves_embargo_cap.test.ts` passed: 2 files / 10 tests.
- `npx.cmd vitest run tests\embargo_phase_resolution.test.ts tests\supply_reserves_embargo_cap.test.ts tests\supply_reserves.test.ts tests\supply_reserves_phase_b.test.ts tests\embargo_profiles.test.ts` passed: 5 files / 42 tests.
- `node -e "JSON.parse(require('fs').readFileSync('data/scenarios/events/war_1994.json','utf8')); console.log('war_1994 json ok')"` passed.

- Integrated `npx.cmd tsc --noEmit --pretty false` passed during parent closeout after the B3 fixture repair.
- Integrated 40w run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1853` completed with hash `c16ba5bc33b79277`, 27/27 anchors, `diagnose_run.cjs` WARN only (0 errors / 28 warnings), and `validate_run_consistency.cjs` PASS.
- Integrated 188w run `runs\apr1992_definitive_188w__210e69404d054959__w188_n1854` completed with hash `1f81ab4263ace3e9`, 25/27 anchors (`op:ugljevik:teocak_krstac_2`, `op:brcko:brcko`), `diagnose_run.cjs` WARN only (0 errors / 29 warnings), and the same 52 consistency failures already seen in the dirty n1847 line.

## 188w Gate Finding

The Teocak/Srebrenica late-war drift is inherited from the pre-current-wave dirty n1847 artifact, not introduced by this embargo lane.

| Run | Hash | Anchor status | Srebrenica status |
| --- | --- | --- | --- |
| n1844 accepted baseline | `ccd3f9f770052614` | 26/27, failed `op:brcko:brcko` | 1/11 RS, 10/11 RBiH |
| n1847 dirty pre-wave | `4d4bd75c1c6739de` | 25/27, failed `op:ugljevik:teocak_krstac_2` and `op:brcko:brcko` | not accepted |
| n1854 integrated wave | `1f81ab4263ace3e9` | 25/27, same two failures as n1847 | 2/11 RS, 9/11 RBiH |

Two local probes confirmed attribution:

- Setting all new RBiH phase caps back to `0.60` produced n1855 with the same hash as n1854.
- Temporarily disabling the B3 `resolve-counter-offers` phase produced n1856 with the same hash as n1854.

Therefore this lane lands with a documented inherited 188w follow-up rather than a new embargo-specific sensitive-history regression.

## Stop Gates

- RS/HRHB focused reserve trajectories are byte-stable across RBiH embargo phases.
- Phase 3 and Phase 5 remain pending and unauthored because no in-repo citation unblocks them.
- Sensitive-history re-lock is recorded above. The inherited n1847/n1854 Teocak/Srebrenica condition remains a follow-up for the late-war calibration lanes; this lane does not widen that anchor set.
