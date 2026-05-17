# VRS 1st Krajina Teslic Drifter Classification - n1842 H3

**Date:** 2026-05-16
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/`
**Source track:** `docs/plans/2026-05-16-engine-health-n1842-plan.md` H3
**Status:** CLOSED - REPORT-ONLY

## Verdict

The three brigades named in H3 are not one shared "Teslic drifter" bug.

- `rs_1st_novigrad_infantry` is not a Teslic drifter. It ends at its home OSID, `op:bosanski_novi:matavazi_2`, and is retained as rear sector coverage in `sector:vrs_1st_krajina:6`.
- `rs_2nd_tesli_light_infantry` is not a drifter. It remains in Teslic for the full run, near its home OSID `op:teslic:buletic_2`, and is retained as rear sector coverage in `sector:vrs_1st_krajina:7`.
- `vrs_1st_laktasi` is the only true relocation case. It is a live same-corps `vrs_1st_krajina` redeployment from the Banja Luka / Gradiska area to Teslic by turn 35. If that redeployment is undesirable, it is a design/calibration question about 1st Krajina sector redeployment behavior, not a broken cross-corps drift bug.

## Final-save Evidence

Final save inspection found:

| Brigade | Final location | Home OSID | Final sector membership | Personnel | Morale | Cohesion |
|---|---|---|---|---:|---:|---:|
| `rs_1st_novigrad_infantry` | `op:bosanski_novi:matavazi_2` | `op:bosanski_novi:matavazi_2` | `sector:vrs_1st_krajina:6` rear | 2000 | 12 | 20 |
| `rs_2nd_tesli_light_infantry` | `op:teslic:teslic_2` | `op:teslic:buletic_2` | `sector:vrs_1st_krajina:7` rear | 1041 | 20 | 20 |
| `vrs_1st_laktasi` | `op:teslic:buletic_2` | `op:laktasi:laktasi_2` | `sector:vrs_1st_krajina:7` rear | 1226 | 19 | 20 |

The final-save sector memberships are rear-sector ownership, not missing-sector state.

## Temporal-log Evidence

`brigade_temporal_log.jsonl` was inspected for all 188 rows per brigade.

| Brigade | Rows | Location changes | Turns with sector_id | Turns with sub-segment | Active op IDs |
|---|---:|---:|---:|---:|---|
| `rs_1st_novigrad_infantry` | 188 | 2 | 186 | 0 | none |
| `rs_2nd_tesli_light_infantry` | 188 | 1 | 188 | 34 | none |
| `vrs_1st_laktasi` | 188 | 12 | 188 | 8 | none |

Key movement traces:

- `rs_1st_novigrad_infantry`: `op:bosanska_krupa:ivanjska_2` at turn 1, then home `op:bosanski_novi:matavazi_2` from turn 3 through turn 188.
- `rs_2nd_tesli_light_infantry`: `op:teslic:teslic_2` from turn 1 through turn 188.
- `vrs_1st_laktasi`: moves through `vrs_1st_krajina` sectors, reaches `op:teslic:donji_ruzevic` at turn 27, and reaches `op:teslic:buletic_2` at turn 35 through turn 188.

The low morale/cohesion values are consistent with the broader n1842 end-report warning that `vrs_1st_krajina` has a late-war morale-collapse cluster. They do not prove assignment corruption.

## Classification

| Brigade | Classification | Follow-up |
|---|---|---|
| `rs_1st_novigrad_infantry` | Home/rear sector coverage, not drifter | None from H3 |
| `rs_2nd_tesli_light_infantry` | Local Teslic rear sector coverage, not drifter | None from H3 |
| `vrs_1st_laktasi` | Same-corps redeployment to Teslic | Optional design/calibration review if 1st Krajina should avoid this transfer |

## Decision

- No code change.
- Do not classify H3 as a runtime defect.
- Do not hand this to formation-life as a bugfix requirement.
- If future design wants to constrain `vrs_1st_laktasi`, open a bounded calibration/design lane for same-corps redeployment preferences rather than a "drifter" fix.

