# Active-Never-Fights Interpretation

**Date:** 2026-05-15
**Lane:** v0.9 formation-life believability, Task 5
**Branch/worktree:** `codex/formation-life-believability` at `.worktrees/formation-life-believability`
**Run evidence:** `F:/A-War-Without-Victory/data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40`
**Final hash:** `0cb626c032204372`

## Summary

`brigade_never_fights` is no longer one blended bucket. The detector now emits subtype-specific `info` reports for active brigades with zero battles after 10+ turns:

| Subtype | Count in retained 40w | Classification |
|---|---:|---|
| `loan` | 3 | Expected quiet or assignment-support case; not a front-inert signal by itself |
| `operation_participant` | 4 | Staging/execution owner; route to operation delivery if repeated |
| `sector_front` | 61 | Dominant live-front signal; route to commander stance, target scoring, and local pressure trace before behavior changes |
| `sector_reserve` | 3 | Quiet reserve; expected unless sector pressure says otherwise |
| `sector_rear` | 7 | Rear/garrison owner; expected unless tied to active-sector failure |

This is a detector interpretation change only. It does not alter sector ownership, movement, combat, political controllers, HRHB/HVO political gates, OOB/source data, personnel, reconstitution, save schema, or serialization.

## Representative Evidence

Read-only subtype query against the retained 40w final save produced:

```text
loan=3
operation_participant=4
sector_front=61
sector_reserve=3
sector_rear=7
```

Representative `sector_front` cases include `arbih_102nd_motorized`, `arbih_105th_motorized`, `arbih_115th_mountain`, `arbih_124th_light_king_tvrtko`, and `arbih_141st_light`. Representative operation participants are `rs_3rd_semberija_light_infantry`, `rs_igman_brigade`, `rs_ilidza_brigade`, and `rs_trnovo_brigade`.

## Owner Classification

- `sector_front`: commander stance/target scoring and enemy-pressure evaluation. This is the only subtype that should drive behavior work next.
- `operation_participant`: operation staging/execution and zero-attack operation delivery.
- `sector_reserve` / `sector_rear`: accepted quiet-sector or garrison variance until a pressure trace proves otherwise.
- `loan`: army reserve/elite loan interpretation; do not count as ordinary brigade inertia.

## Verification

```powershell
npm.cmd run test:vitest:fast -- -- tests/anomaly_detector_deployment_truth.test.ts
node tools/diagnose_run.cjs F:/A-War-Without-Victory/data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40
node tools/validate_run_consistency.cjs F:/A-War-Without-Victory/data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40
```

Results:

- Focused detector test: 4/4 passed.
- `diagnose_run.cjs`: 0 errors, 29 warnings.
- `validate_run_consistency.cjs`: PASS.

## Recommendation

Next packet should trace the 61 `sector_front` cases against sector pressure, stance, target scoring, and available objectives. Do not change `formation_lifecycle`, HRHB/HVO gates, or force-quality/personnel owners from this packet alone.
