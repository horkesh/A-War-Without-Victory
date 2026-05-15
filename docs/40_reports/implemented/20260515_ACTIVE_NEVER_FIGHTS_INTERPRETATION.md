# Active-Never-Fights Interpretation

**Date:** 2026-05-15
**Lane:** v0.9 formation-life believability
**Scope:** Diagnostic/report interpretation only
**Result:** `brigade_never_fights` is no longer one mixed bucket. It now emits deterministic subtype reports for loaned, active-operation, front, reserve, and rear cases.

## Why

The formation-life classification found 78 active brigades with live sector/loan ownership and zero battles after 40 turns. Treating all 78 as one product concern hid different owners:

- Live sector-front brigades may point to quiet fronts, target scoring, pressure, or stance.
- Reserve and rear brigades can be quiet-valid.
- Loaned elite/general-staff brigades belong to loan/return semantics.
- Active operation participants with zero battles belong to staging/execution.

This slice changes interpretation only. It does not move formations, change combat, change sector ownership, or weaken detectors.

## Implementation

`src/scenario/anomaly_detector.ts` now:

- Builds a deterministic active-operation participant set from sorted corps command IDs.
- Keeps the old filters: active brigade-level units only, turn >= 10, live sector or loan ownership only, and cold-front sector assignments excluded.
- Emits one `brigade_never_fights` report per subtype, in stable order:
  - `loan`
  - `operation_participant`
  - `sector_front`
  - `sector_reserve`
  - `sector_rear`
  - `sector_owned`
- Keeps severity at `info`.
- Keeps each subtype entity list sorted with `strictCompare`.

## Retained 40w Split

Applying the new detector to the retained 40w final save keeps the aggregate at 78, but splits it:

| Subtype | Count | Representative entities |
|---|---:|---|
| `loan` | 3 | `arbih_120th_liberation_black_swans`, `arbih_guards_brigade`, `rs_65th_protection_motorized_regiment` |
| `operation_participant` | 4 | `rs_3rd_semberija_light_infantry`, `rs_igman_brigade`, `rs_ilidza_brigade`, `rs_trnovo_brigade` |
| `sector_front` | 61 | `arbih_102nd_motorized`, `arbih_105th_motorized`, `arbih_115th_mountain`, `arbih_124th_light_king_tvrtko` |
| `sector_reserve` | 3 | `arbih_165th_mountain`, `arbih_7th_vitezka_muslim_liberation`, `rs_16th_krajina_motorized` |
| `sector_rear` | 7 | `arbih_123rd_light`, `arbih_131st_light`, `arbih_329th_mountain`, `rs_5th_kozara_light_infantry` |

The anomaly summary count increases because one old mixed info report becomes five info reports. Critical and warning counts are unchanged.

## Product Read

The next behavior packet should start with `sector_front` cases, not reserve/rear cases. That is the real live-front inert set. `operation_participant` is a separate staging/execution investigation. `loan` belongs to elite/general-staff loan lifecycle.

## Validation

- Red first: `npm.cmd run test:vitest:fast -- -- tests/anomaly_detector_deployment_truth.test.ts` failed because the old detector emitted one unsplit report with no subtype.
- Green focused: `npm.cmd run test:vitest:fast -- -- tests/anomaly_detector_deployment_truth.test.ts` passed 4/4 after the split.
- `npm.cmd run typecheck` passed.
- Fresh 40w scenario proof at `data/derived/_debug/active_never_fights_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40` kept final hash `0cb626c032204372`.
- `node tools/diagnose_run.cjs data/derived/_debug/active_never_fights_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40` reported 0 errors and 29 warnings.
- `node tools/validate_run_consistency.cjs data/derived/_debug/active_never_fights_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40` passed.
- New run-summary anomaly counts: 13 reports, 0 critical, 2 warning, 11 info; only the old mixed info report split into five info reports.
