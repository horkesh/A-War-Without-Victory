# HRHB Cohesion Floor and 65th Protection Tagging Verification

**Date:** 2026-05-18
**Result:** Stale / already closed; no runtime data change made.

## Summary
- Verified the HRHB cohesion floor cleanup is already present in `data/scenarios/timelines/apr1992.json`: the HRHB floor is `[[0,40],[52,40],[53,30]]`, with no remaining `50` value.
- Verified the 65th Protection Motorized Regiment is already modeled as VRS Main Staff elite reserve truth: `RS`, `vrs_main_staff`, `motorized`, `is_elite: true`, no `garrison` flag, and no RBiH identity.
- No production data/config/code changes were made because both rows are stale relative to current source and latest-run state.

## Evidence

### HRHB Cohesion Floor
Current source:
- `data/scenarios/timelines/apr1992.json`
- `cohesion_floor.HRHB = [[0,40],[52,40],[53,30]]`
- JSON scan result: `hasHrhbFloor50 = false`

Runtime consumer path remains the existing deterministic timeline lookup:
- `src/sim/combat/faction_progression.ts`
- `getFactionCohesionFloor(...)` reads `timeline.cohesion_floor[faction]` before falling back to hardcoded defaults.
- `resolveCohesionBound(...)` / `interpolateKeyframeCurve(...)` provide deterministic keyframe interpolation.

Conclusion: the requested `50 -> 25-30` cleanup is already closed at `30`.

### 65th Protection Motorized Regiment
Current source OOB:
- `data/source/oob_brigades.json`
- `id: rs_65th_protection_motorized_regiment`
- `faction: RS`
- `corps: vrs_main_staff`
- `default_equipment_class: motorized`
- `is_elite: true`
- `initial_cohesion: 72`
- `initial_officer_quality: 0.85`
- no `garrison` flag

Current corps source:
- `data/source/oob_corps.json`
- `vrs_main_staff` is `faction: RS`, `kind: army_hq`, `hq_mun: han_pijesak`.

Latest-run state evidence:
- `data/derived/latest_run_final_save.json`
- `rs_65th_protection_motorized_regiment.faction = RS`
- `corps_id = vrs_main_staff`
- `elite_loan_state` exists
- `garrison = null`
- tags include `corps:vrs_main_staff`, `equip:motorized`, `mun:han_pijesak`, `placement:fixed_home_osid`

Existing focused contracts already cover this identity/use path:
- `tests/army_reserve_system.test.ts` includes `rs_65th_protection_motorized_regiment` as `RS`, `vrs_main_staff`.
- `tests/brigade_stacking_sector_truth.test.ts` includes the 65th as an `RS` rear brigade under `vrs_main_staff`.

Conclusion: no RBiH or static HQ-security misclassification remains in current source/state.

## Files Changed
| File | Change |
|------|--------|
| `docs/40_reports/implemented/20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md` | Added stale/already-closed verification report. |

## Determinism
No simulation behavior, ordering, serialization, or scenario input changed. This is documentation-only evidence capture.
