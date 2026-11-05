# First-39 stranded-brigade retained-state diagnosis

## Fact

The retained final save reproduces the health result exactly: 13 versus the 40-week-band maximum of 3. `tools/engine_health_gate.cjs:100-134,591` counts every alive formation whose `stranded_status` is `holding` or `reconnected`, excluding only current active-operation participants. It does **not** inspect readiness, assignment, movement, supply, graph distance, or corps-sector membership.

The 13 final IDs are:

- RBiH: `arbih_1st_cerska`, `arbih_1st_kamenica`, `arbih_246th_vitezka_mountain`.
- HRHB: `hrhb_94th_brigade`, `hrhb_95th_brigade`, `hrhb_ban_jelai_brigade`, `hrhb_jure_franceti_brigade`, `hrhb_kiseljak_brigade`, `hrhb_kreevo_brigade`, `hrhb_stjepan_tomaevi_brigade`, `hrhb_travnik_brigade`, `hrhb_vitezovi_brigade_vitez`, `hvo_nikola_subic_zrinski_brigade`.

None is forming or currently operation-owned. Twelve are sector-assigned (9 front, 3 rear); `hrhb_travnik_brigade` is unassigned. Twelve are on critical-supply OSIDs that are already in their own corps' sector territory (raw and friendly distance 0). Canonical lifecycle nevertheless returns unreachable immediately for critical supply (`stranded_brigade_lifecycle.ts:116-136`), explicitly preventing a pocket's sector from self-certifying reachability. Travnik is strained, raw distance 2, with no friendly path. `hrhb_vitezovi_brigade_vitez` is also in transit with two turns remaining; health still counts it.

Retained progression is not a one-save artifact: w15=13, w16=12, final=13. The final RBiH three were operation participants through turn 15 and holding from turn 17; nine final HVO records were holding from turn 1 and Nikola from turn 2.

## Inference

This is mostly a persisted supply-isolation/lifecycle signal, but “stranded” is not equivalent to “uncommanded”: sector building admits every active line formation by location (`sector_building.ts:63-100,651-659`), then syncs those rosters back into formation assignments (`corps_front_sectors.ts:773-774`; `brigade_assignment.ts:2691-2790`). Only the unresolved-warning collector excludes `holding` (`corps_front_sectors.ts:1140-1170`). That creates a real ownership mismatch: lifecycle may hold a brigade while final sector truth still commands it. Nothing here proves the removed extra helper's teleportation was correct.

## Unrecorded / smallest next question

The saves do not identify the exact phase that first reassigns each holding brigade or whether sector assignment is intended as display truth versus command authority. Before any production change, answer: **after lifecycle classification, should a critical-supply `holding` brigade remain eligible for final sector assignment, and if yes, which owner reconnects/clears it or excludes it from the health definition while an orderly withdrawal is active?**

Evidence: `probe.stdout.json`; command/inputs/exit/hash: `receipt.json`; stderr was empty. Probe was read-only over retained JSON and advanced no engine state.
