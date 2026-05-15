# Formation-Life Warning Classification

**Date:** 2026-05-15
**Lane:** v0.9 formation-life believability, Task 1
**Run:** `data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40`
**Final hash:** `0cb626c032204372`
**Result:** No hard sector-truth failures; gameplay believability warnings remain concentrated in active-never-fights and far-from-home live ownership.

## Why This Lane Now

The real V8 profile shows commander/bot-order CPU is now second-tier compared with sector reconstruction, map/front graph work, and replay serialization. Continuing CPU micro-optimization would mostly chase local labels. `MASTER_ROADMAP.md` still identifies formation-life believability as partial, so the next product lane is to classify those warnings and assign owners.

## Inputs

```powershell
node tools/diagnose_run.cjs data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40
node tools/validate_run_consistency.cjs data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40
```

Additional inspected artifacts:

- `run_summary.json`
- `final_save.json`
- `operation_aars.json`
- `activity_summary.json`

## Validation Snapshot

- `diagnose_run.cjs`: 0 errors, 29 warnings.
- `validate_run_consistency.cjs`: PASS.
- Brigade assignment: 0 unresolved.
- Physical sector ownership: 0 false owners.
- Sector geometry: 0 disconnected sectors.
- Empty contested sectors: 0.
- Undefended front subsegments: 0.
- Adjacent uncontested territory: 0.
- Sector floor shortfalls: 0 missed legal donors; `sector:vrs_herzegovina:1` remains below floor with no legal same-corps donor.

## Warning Families

| Family | Evidence | Classification | Owner |
|---|---:|---|---|
| Active-never-fights | 78 active brigades with live sector/loan ownership and 0 battles after 40 turns | Mixed product concern; must split quiet-but-valid reserve/garrison cases from live-front inert cases before changing behavior | Detector interpretation first, then commander stance/target scoring if live-front cases remain |
| Far-from-home live ownership | 20/217 eligible brigades more than 6 hops from home with live sector/loan ownership | Commander doctrine and formation lifecycle issue, not sector-truth failure | Commander assignment/reposition path plus `formation_lifecycle` return/loan semantics |
| Brigade drift | 28 active non-militia/non-paramilitary brigades more than 4 hops from home in `diagnose_run` | Same owner family as far-from-home, with some possible historical redeployments | Commander assignment/reposition path; scenario data only when historical redeployment is proven |
| Corps out-of-area | 4 corps above 60 percent outside home municipality: `hvo_southeast_herzegovina`, `hvo_tomislavgrad`, `vrs_1st_krajina`, `vrs_sarajevo_romanija` | Aggregate symptom of far-from-home/sector ownership, not a separate fix surface | Same as drift/far-from-home |
| Operation zero eligible execution | `Operacija Strijela` failed with 0 attacks; brigades never reached staging | Commander operation execution/staging issue | `commander/plan`, operation staging, and sector offensive execution |
| HRHB/HVO offensive emergence | HRHB `Operation Jackal` had force ratio about 2.45, 9 brigades, 0 attacks, `recovery_reason: political_blocked` | Needs design/canon review before changing gates | Political war-state gate and commander launch policy |
| Frontline density imbalance | 1 sector: `sector:arbih_1st_corps:1` at 0.3x RBiH median | Commander assignment/sector stance issue if repeated | Sector assignment and stance balancing |
| Stranded pool | `vlasenica:RBiH` has 600 available, 0 committed | Formation spawn/pool ownership issue | Militia pool and formation spawning owner |

## Representative Formation Traces

| Formation | Current state |
|---|---|
| `arbih_102nd_motorized` | RBiH 1st Corps, sector front at `op:pale:podgrab`, home `op:hadzici:binjezevo`, no active operation |
| `arbih_120th_liberation_black_swans` | RBiH General Staff, sector front under `sector:arbih_2nd_corps:4`, home `op:kakanj:brnjic_2`, no active operation |
| `arbih_330th_liberation` | RBiH 3rd Corps, sector front at Maglaj, home Zenica, no active operation |
| `arbih_441st_vitezka_mountain` | RBiH 4th Corps, sector reserve near Hadzici, home Mostar, no active operation |
| `hrhb_iroki_brijeg_brigade` | HRHB Southeast Herzegovina, sector front at Stolac, home Listica, no active operation |
| `rs_11th_dubica_infantry` | VRS 1st Krajina, sector front near Donji Vakuf, home Bosanska Dubica, no active operation |
| `rs_16th_krajina_motorized` | VRS 1st Krajina, sector reserve near Donji Vakuf, home Prijedor, no active operation |

The common pattern is live sector ownership without an operation participant record. That makes report/anomaly suppression the wrong fix.

## Canonical Owners

- Sector assignment and sector balancing own live sector/reserve ownership.
- Commander plan and operation execution own operation launches, staging failure, and zero-attack operations.
- `formation_lifecycle` owns return, loan, reclassification, and dissolution semantics once the commander path decides a formation should not remain deployed.
- Militia pool and formation spawn logic owns stranded pool conversion.
- Anomaly wording owns only the distinction between quiet-valid cases and live-front inert cases; it must not hide unresolved owner behavior.

## Safe Next Packet

The safest next implementation packet is `Active-Never-Fights Interpretation`.

Scope:

- Split the 78 `brigade_never_fights` cases into rear reserve, sector front, sector rear, loan, garrison/cold-front, and operation participant categories using existing final-save state.
- Update the detector/report wording only after the split proves which cases are expected quiet sectors.
- If a live-front subset remains, trace target scoring, stance, and lack of enemy pressure before changing commander behavior.

Acceptance:

- No change to sector ownership, battle resolution, political controllers, or save schema in the classification slice.
- Report should no longer treat quiet reserves and live-front inert brigades as the same product concern.
- Any behavior change after classification requires a fresh 40w hash/gates proof.

## Needs Design Or Canon Review

- Changing `political_blocked` HRHB/HVO operation gates, including `Operation Jackal`.
- Reclassifying elite/general-staff far-from-home deployments as canonical historical redeployments.
- Adding cross-corps loan/return semantics that alter command authority or sector ownership.
- Weakening drift/far-from-home detectors before owner behavior is understood.
