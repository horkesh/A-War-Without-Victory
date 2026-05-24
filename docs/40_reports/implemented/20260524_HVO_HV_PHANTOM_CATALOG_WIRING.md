# HVO/HV 1995 Phantom Catalog Wiring + OSID Location Fix

**Date:** 2026-05-24
**Branch:** `claude/calibration-historical-army-arc-2026-05-24`
**Lane:** calibration / historical army arc / HVO-HV operations
**Status:** Implementation-complete; HRHB OSID-shortfall residue deferred.

## Summary

The 2026-05-23 HV expeditionary phantom packet (8 new `hv_*_1995` defs spawning at turn 150, withdrawing at turn 188) shipped mechanically but had no consumer in the operation opportunity catalog. Of the 8 phantoms, 0 entered any operation AAR `participating_brigades` list in the pre-edit n2009 188w run.

This lane (a) wires 3 of the 8 phantoms into existing fall-1995 HVO axes, (b) corrects an invalid `location_osid` shared by 2 phantoms, and (c) preserves the byte-identical OSID political_controllers state of the n2009 main-HEAD baseline. **It does not move the HRHB OSID gap (-21 vs painted oct1995); that requires combat-effectiveness work outside the catalog layer.**

## Pre-edit Diagnostic (n2009)

- **Run:** `runs/apr1992_definitive_188w__b9af2327fe0c3c10__w188_n2009`, `final_state_hash: dad09d050b76f32c`, match_ratio 0.797753, 27/27 anchors, 5/6 benchmarks (RS `consolidate_gains` t40 dev −0.054 / tol 0.050 — pre-existing on main).
- **HV 1995 phantom absorption:** 0 of 8 in any AAR. All spawn at t150 and idle through withdrawal at t188.
- **HRHB shortfall geography:** 86/107 painted (−21). 32 of 35 misses (91%) cluster in the Western Bosnia Mistral / Southern Move target band (jajce 7, mrkonjic_grad 6, sipovo 5, bosansko_grahovo 4, titov_drvar 3, glamoc 2).
- **Operation lifecycle in n2009:**
  - `mistral_1_95`: launched t160-175, 0/5 obj captured (only 2 brigades).
  - `mistral_2_95`: launched t175-182, 0/13 obj captured (uses permanent-pool `hv_4th_guards_split`, not any 1995 phantom).
  - `southern_move_95`: never launched (staging_access blocked by Šipovo not HRHB-held).
  - `jajce_95`: never launched.

Source diagnostic packet: scenario-creator-runner-tester analysis on n2009.

## OSID Data Bug Discovery

`op:tomislavgrad:tomislavgrad_2` does NOT exist in `data/derived/operational/osid_areas.json`. The canonical OSID is `op:duvno:tomislavgrad_2` (Duvno = pre-1990 municipality name for Tomislavgrad). Production code references the bad OSID in:

| Location | Owner | Lane disposition |
|---|---|---|
| `src/sim/combat/jna_phantom_brigades.ts:367` (`hv_7th_guards_brigade_1995.location_osid`) | HV 1995 phantom packet | **Fixed in this lane** |
| `src/sim/combat/jna_phantom_brigades.ts:404` (`hv_141st_reserve_brigade_1995.location_osid`) | HV 1995 phantom packet | **Fixed in this lane** |
| `src/sim/combat/hv_integration.ts:90` (`hv_7th_guards_varazdin.location_osid`) | permanent HV 1994 integration pool | Deferred — touches different subsystem |
| `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:97` (`KUPRES_CINCAR_STAGING_TOMISLAVGRAD`) | Cincar 94 catalog | Deferred — touching this would shift Cincar's launch behavior; needs separate calibration cycle |
| `tests/operation_opportunities_central_bosnia_catalog.test.ts:75` | test contract | Deferred — must update in lockstep with the Cincar catalog fix |

## Edits Applied (6 in 2 files)

### `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`

1. `mistral_1_glamoc.brigades` += `hv_7th_hgr_1995` (Mistral 1's Glamoč Shoulder axis). Placed on glamoc instead of grahovo to avoid extending Mistral 1's execution past Mistral 2's t175 launch — preserves Mistral 2's recovery → `operation_history` archive cleanup.
2. `mistral_drvar_grahovo.brigades` += `hv_112th_infantry_1995` (Mistral 2's Drvar/Grahovo axis, both `MISTRAL_AXES` and variant `MISTRAL_DRVAR_GRAHOVO_AXIS`).
3. `southern_move_mrkonjic.brigades` += `hv_134th_hgr_1995` (Southern Move's Mrkonjić Grad axis).

### `src/sim/combat/jna_phantom_brigades.ts`

4. `hv_7th_guards_brigade_1995.location_osid`: `op:tomislavgrad:tomislavgrad_2` → `op:duvno:tomislavgrad_2`.
5. `hv_141st_reserve_brigade_1995.location_osid`: same correction.

All 3 phantom additions are **same-corps fit** (axis host `hvo_tomislavgrad` matches phantom `corps_id`), avoiding the cross-corps reconciler-drain question raised by the existing `southern_move_mrkonjic` axis's 2 pre-existing cross-corps phantoms.

## Post-edit Outcome (n2)

- **Run:** `runs/apr1992_definitive_188w__b9af2327fe0c3c10__w188_n2`, `final_state_hash: 4e0c20cc47f2ae0f`.
- **match_ratio: 0.797753** (unchanged).
- **HRHB sim count: 86/107 painted** (unchanged).
- **Anchors: 27/27** (unchanged).
- **Benchmarks: 5/6** (same pre-existing RS `consolidate_gains` regression).
- **712/712 OSID political_controllers byte-identical to n2009.**
- **Phantom absorption:** 2 of 3 newly-wired phantoms now in AARs (`hv_7th_hgr_1995` in Mistral 1's glamoc axis, `hv_112th_infantry_1995` in Mistral 2's drvar_grahovo axis). `hv_134th_hgr_1995` remains wired in Southern Move but Southern Move did not launch because Šipovo is still RS-held (chain dependency unresolved).
- **Mistral 2 AAR archive restored:** present in `operation_history` (was lost in an intermediate run state when Mistral 1 extension delayed the archive flush past scenario end).
- **Mistral 1 end-turn:** t169 in n2 (was t175 in n2009, t176 in an intermediate run). Faster failure recovery, cleaner pool handoff to Mistral 2.
- **Side-effect:** `rs_17th_klju_light_infantry` destroyed in n2 but active in n2009. No OSID-control consequence.

## Verification

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run tests/operation_opportunities_catalog.test.ts tests/sector_offensive_idle_recovery.test.ts tests/jna_phantom_brigades.test.ts --reporter=dot`: 71/71 PASS.
- 40w canary pre-edit ≡ post-edit: byte-identical `7dab9e30e1f196d2` (phantoms spawn t150 outside 40w window).
- `npm run sim:scenario:run:default` (52w): covered by `test:baselines`.
- `node tools/diagnose_run.cjs runs/.../n2`: 0 errors, 29 drift warnings (typical late-war pattern).
- `node tools/validate_run_consistency.cjs runs/.../n2`: 9 FAILs ALL pre-existing eastern Bosnia / intel-system; categorically outside lane scope.
- `git diff --check`: clean.
- `npm run test:baselines`: "Baseline regression: all scenarios match."

## Sacred-rule Compliance

- Canonical faction IDs only (RBiH / RS / HRHB); HV phantoms remain HRHB-attached.
- No initial OSID overrides; control unchanged from n2009.
- No `avoided_osids_by_faction`.
- Determinism preserved: catalog brigade lists are static arrays sorted via `strictCompare` at runtime; no `Math.random`, no `Date.now`.
- Ops-only attacks doctrine unchanged.
- `hvo_main_staff` not used as launcher; Mistral 1, Mistral 2, Southern Move all hosted on `hvo_tomislavgrad`.
- `docs/10_canon/FORAWWV.md` not edited.

## Calibration Posture

This is a **catalog hygiene + audit-trail patch, not a calibration win.** match_ratio is unchanged. The HRHB OSID gap (−21) remains.

The root cause of the gap is op-effectiveness: Mistral 1 + Mistral 2 launch but capture 0 of their combined 18 western-Bosnia objectives. The brigade pool is now correctly sized (with phantoms), but the predicted attacker-vs-defender power balance at battle resolution is insufficient to flip Sipovo / Drvar / Grahovo / Jajce OSIDs. That is a defender-power / equipment-asymmetry / Lanchester-concentration question, not a catalog question.

## Deferred Follow-up Lanes

1. **Cross-corps phantom re-homing.** 5 of 8 HV 1995 phantoms remain unwired because they have `corps_id` (`hvo_southeast_herzegovina`, `hvo_central_bosnia`) that don't match any 1995 op axis host. The architectural decision (re-home them to `hvo_tomislavgrad` in `jna_phantom_brigades.ts` vs leave them as cross-corps and accept reconciler behavior vs author a new launcher) needs historical/canon review.
2. **Mistral 1 + Mistral 2 combat effectiveness.** Both launch and execute but capture 0 objectives. Investigation needed on defender_power evaluators, equipment_quality_modifier application, force concentration, and whether the late-war VRS Krajina collapse arc is being captured at the right magnitude.
3. **Southern Move chain dependency.** `southern_move_95.staging_access` requires `op:sipovo:sipovo_2` and `op:sipovo:pribeljci_2` HRHB-held, which requires Mistral 2 to capture them, which requires #2 above.
4. **Remaining 3 `op:tomislavgrad:tomislavgrad_2` bad-OSID references** (`hv_integration.ts:90`, `operation_opportunity_catalog_central_bosnia.ts:97`, `tests/operation_opportunities_central_bosnia_catalog.test.ts:75`) need a careful follow-up batch because the Cincar catalog reference is the staging_osid of an active op and changing it may shift Cincar's launch behavior materially.

## Sources

- Pre-edit diagnostic: scenario-creator-runner-tester run on `runs/apr1992_definitive_188w__b9af2327fe0c3c10__w188_n2009`.
- Operations-expert change-spec: same role, focused implementation-spec dispatch.
- Mistral 2 root-cause analysis: scenario-creator-runner-tester deep-dive on n1 (intermediate 5-edit run).
- HVO research dispatches: `docs/40_reports/proposals/20260523_RESEARCH_HVO_1994_OPS.md`, `_HVO_MISTRAL_2_OOB.md`, `_HVO_SOUTHERN_MOVE_AND_ENCLAVES.md`, `_HV_EXPEDITIONARY_GHOST_DESIGN.md`.
- HVO catalog synthesis: `docs/40_reports/proposals/20260523_HVO_CATALOG_SYNTHESIS.md` (mostly already shipped in 2026-05-23 catalog work; this lane delivers the phantom-absorption gap).
