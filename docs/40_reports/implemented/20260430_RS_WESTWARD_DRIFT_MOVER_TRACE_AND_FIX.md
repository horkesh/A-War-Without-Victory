# RS Drina/Herzegovina Westward-Drift Mover — Trace and Bounded Fix

**Date:** 2026-04-30
**Predecessor:** `docs/40_reports/implemented/20260430_LONG_RUN_BELIEVABILITY_PACKET.md` (Issue 3 Case C, Issue 5 Goražde)
**Source plan:** `docs/plans/2026-04-30-v09-formation-life-believability-plan.md`

**Pre-fix evidence run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1585`, hash `288a1fdc92162594`
**Comparison run:** `runs/apr1992_definitive_188w__c35fff9119f1a06b__w188_n1576`, hash `c35fff9119f1a06b`
**Post-fix runs:** appended after validation completes.

## TL;DR

**Owner identified:** `src/sim/combat/brigade_reconstitution.ts` `findRefugeeMunicipality` Path B. When a brigade's home OSID falls, the helper places the reconstituted brigade at the largest displacement-receiving municipality, regardless of corps territory. Banja Luka is the dominant RS displacement destination (de facto capital, large pool), so any vrs_drina/vrs_herzegovina brigade whose home falls eventually gets reconstituted at `op:banja_luka:banja_luka_2` — which is `vrs_1st_krajina` territory.

**Fix shipped (bounded):** A same-corps territory gate in `findRefugeeMunicipality` — refugee placement must land in an OSID owned by the brigade's own corps via `corps_front_sectors[*].territory_osids`. If no candidate qualifies, the brigade stays destroyed (historically accurate when corps territory is fully overrun — corps disband, units do not teleport to a foreign corps's HQ).

**Not done:** This packet does not touch the underlying RBiH-overgain in DRINA/HERZEGOVINA. It only blocks the cross-corps drift cascade that amplifies it.

---

## Required-task checklist (per prompt)

| Task | Done? | Evidence |
|---|---|---|
| 1. Confirm repo truth | ✓ | `git status` shows main, prior-packet edits uncommitted (expected for Codex review). `dist-packaged/` untracked, untouched. |
| 2. Week-by-week trace for 5 brigades | ✓ | `turn_summaries[*].movements` + `turn_summaries[*].formation_destructions` + final_save fields (`stranded_status`, `stranded_since_turn`, `last_reachable_turn`, `destruction_turn`). |
| 3. Identify owner | ✓ | `brigade_reconstitution.ts:findRefugeeMunicipality` (line 139), called from `reconstituteBrigades` (line 257). |
| 4. n1576 vs n1585 comparison | ✓ | All 6 brigades had `stranded_status: undefined` in n1576; all 6 are `stranded_status: 'collapsed'` in n1585. The trigger is increased RBiH territorial control in DRINA/HERZEGOVINA breaking BFS reachability for `stranded_brigade_lifecycle`. |
| 5. Owner classification | ✓ | **Owner bug.** `findRefugeeMunicipality` does not constrain refugee placement to the brigade's own corps territory. |
| 6. Implement bounded fix | ✓ | Same-corps territory gate in `findRefugeeMunicipality`; cross-corps placement refused; brigade stays destroyed if no qualifying same-corps refugee muni. |
| 7. Focused regression tests | ✓ | `tests/brigade_reconstitution_corps_territory.test.ts` — 4 tests covering the n1585 artifact case, foreign-corps refusal, same-corps positive case (Srebrenica→Tuzla pattern), and Path A preservation. |

---

## Brigade trace

### Sequence pattern (all 6 brigades)

1. Brigade fights/operates in home zone (vrs_drina or vrs_herzegovina territory).
2. RBiH captures Drina/Herzegovina territory progressively. Home OSID flips to RBiH.
3. `stranded_brigade_lifecycle.canReachCorpsSectorFront` BFS fails — brigade flagged `stranded_status='holding'` after `last_reachable_turn`.
4. Cohesion drops below `STRANDED_COLLAPSE_COHESION=10` OR brigade holds for `STRANDED_MAX_HOLD_TURNS=12`.
5. `stranded_brigade_lifecycle` collapses brigade: `status='inactive'`, `lifecycle_status='destroyed'`, `destruction_turn=t`.
6. `RECONSTITUTION_DELAY_TURNS=5` turns later, `reconstituteBrigades` runs.
7. `homeOsidControlled === false` → Path B: `findRefugeeMunicipality()` is called.
8. Helper scans `displacement_event_log` for largest RS arrivals from the brigade's home_mun.
9. Banja Luka wins (RS de facto capital, dominant displacement recipient, large pool).
10. **No corps-territory gate applied** — brigade reactivated at `op:banja_luka:banja_luka_2` with `corps_id` unchanged. Brigade now sits in `vrs_1st_krajina` territory, breaking sector ownership.
11. Brigade fights battles around Banja Luka, takes casualties, repeats steps 3-10 (multiple dissolution events), eventually destroyed permanently.

### Trace table (n1585)

| Brigade | Corps | Home | Last reachable | Stranded since | First MOVE event | Final loc | Final destruction |
|---|---|---|---|---|---|---|---|
| `rs_ajnie_brigade` | vrs_herzegovina | `op:cajnice:cajnice_2` | t101 | t106 | t106 cajnice→banja_luka | banja_luka | t171 |
| `rs_foa_brigade` | vrs_herzegovina | `op:foca:foca_3` | t92 | t97 | t97 foca→banja_luka | banja_luka | t174 |
| `rs_visegrad_brigade` | vrs_drina | `op:visegrad:visegrad_2` | t106 | t113 | t113 visegrad→banja_luka | banja_luka | t174 |
| `rs_kalinovik_brigade` | vrs_herzegovina | `op:kalinovik:kalinovik_2` | t87 | t92 | t92 kalinovik→banja_luka, t129 banja_luka→teslic | teslic | t174 |
| `rs_1st_birac` | vrs_drina | `op:zvornik:gornji_sepak_2` | t96 | t101 | t101 zvornik→banja_luka | banja_luka | active at end (mor=0) |
| `rs_5th_podrinje` | vrs_drina | `op:vlasenica:sebiocina` | t106 | t112 | t112 bratunac→banja_luka | banja_luka | active at end (mor=0) |

Each MOVE event corresponds to a Path B reconstitution: it lands precisely `RECONSTITUTION_DELAY_TURNS=5` turns after the prior destruction-turn (within deterministic ordering).

`rs_kalinovik_brigade`'s second MOVE (banja_luka→teslic at t129) is a second-cycle reconstitution: after t104 destruction at banja_luka, displacement evidence by then flowed cajnice→teslic (smaller volume, but qualifying), and Teslić was RS-controlled with adequate pool. Teslić is in `vrs_1st_krajina` territory too, so the artifact persists but with a different destination.

### n1576 vs n1585 (same brigades, same hash environment)

| Brigade | n1576 status | n1576 location | n1576 stranded | n1585 status | n1585 location | n1585 stranded |
|---|---|---|---|---|---|---|
| `rs_ajnie_brigade` | active | `op:cajnice:cajnice_2` | undefined | inactive (destroyed) | banja_luka | collapsed (since t106) |
| `rs_foa_brigade` | active | `op:foca:prevrac` | undefined | inactive (destroyed) | banja_luka | collapsed (since t97) |
| `rs_visegrad_brigade` | active | `op:visegrad:zlijeb` | undefined | inactive (destroyed) | banja_luka | collapsed (since t113) |
| `rs_kalinovik_brigade` | active | `op:kalinovik:vlaholje` | undefined | inactive (destroyed) | teslic | collapsed (since t92) |
| `rs_1st_birac` | active | `op:zvornik:rastosnica_2` | undefined | active | banja_luka | collapsed (since t101) |
| `rs_5th_podrinje` | active | `op:sekovici:udbina_2` | undefined | active | banja_luka | collapsed (since t112) |

Why the change between n1576 and n1585? The two runs have **different territorial outcomes**: n1585 has more RBiH penetration into DRINA/HERZEGOVINA (the broader 78.7% vs 81%-ish n1576 area-match, with DRINA at 67.0% / HERZEGOVINA at 58.0% in n1585). When more home OSIDs fall to RBiH, more brigades trigger the stranded → reconstitute → cross-corps cascade. The reconstitution helper itself is the same in both runs; the trigger threshold (territorial loss) changes.

The fix removes the cross-corps amplification regardless of the underlying territorial trigger.

---

## Goražde siege erosion explanation

Pre-fix, the `diagnose_run.cjs` siege check `Gorazde (Herzegovina+Drina)` requires ≥2 brigades from `vrs_herzegovina+vrs_drina` near `gorazde/foca/cajnice/kalinovik/rogatica/visegrad`.

| Run | Brigades near target | Composition | Status |
|---|---|---|---|
| n1576 | 4 | rs_ajnie@cajnice, rs_foa@foca, rs_kalinovik@kalinovik, rs_visegrad@visegrad | OK ✓ |
| n1585 (pre-fix) | 1 | rs_1st_podrinje@rogatica | ERROR ✗ |

Pre-fix, the same 4 brigades that maintained Goražde siege presence in n1576 entered the stranded → reconstitute → cross-corps cascade. They ended up at Banja Luka, where they fought CB battles, took casualties, and were destroyed.

Post-fix, when the cross-corps cascade is blocked: brigades whose home is lost AND whose corps territory has no displacement-evidence-supported alternative will stay destroyed. They will not appear at Banja Luka. The Goražde detector's "near target" count will track real corps-side strength rather than artifactual cross-corps placements.

The fix does NOT directly add brigades to Goražde — it removes the cross-corps drift that was depleting the corps. Whether the post-fix run improves the detector to 2/2 depends on whether the underlying RBiH-overgain in DRINA still destroys all 4 brigades at home; if so, the detector still fires (correctly — those brigades were genuinely overrun). The acceptance target is "improves toward 2/2 without harming 40w determinism" — the fix removes the cross-corps cascade noise; territorial truth determines the residual.

---

## Files changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_reconstitution.ts` | Added `corpsTerritoryOsids(state, corpsId)` helper. Added optional `corpsId` parameter to `findRefugeeMunicipality`. Added same-corps territory gate inside the candidate loop: refugee placement OSID must be in `corpsTerritoryOsids(corpsId)` or the candidate is skipped. Call site in `reconstituteBrigades` passes `corpsId`. Comments explicitly cross-reference n1582-n1585 evidence and the historical "Srebrenica→Tuzla" precedent. |
| `tests/brigade_reconstitution_corps_territory.test.ts` | New file with 4 focused tests: (1) regression — vrs_herzegovina brigade + foreign banja_luka sector + no same-corps territory → no reconstitution; (2) own-corps gate even when displacement points elsewhere — same-corps territory exists at trebinje, no displacement-evidence cajnice→trebinje, only cajnice→banja_luka in evidence → reconstitution refused; (3) same-corps positive — trebinje territory + displacement-evidence cajnice→trebinje → reconstitutes at trebinje; (4) Path A preserved — home OSID still RS-controlled with adequate pool → reconstitutes at home. |
| `working-on.md` | Continuation notes: trace table, pattern explanation, bounded-fix description. |
| `docs/PROJECT_LEDGER.md` | Behavioral-change entry (this report). |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Reusable lesson on the movement-owner rule (refugee placement constrained by corps territory). |
| `docs/40_reports/implemented/20260430_RS_WESTWARD_DRIFT_MOVER_TRACE_AND_FIX.md` | This report. |

## Validation summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `vitest tests/brigade_reconstitution_corps_territory.test.ts` (5 tests) | PASS |
| Targeted vitest (9 suites: probe + sector_offensive_idle_recovery + scenario_operation_diagnostics + integration_anomaly + operation_completion_truth + operation_progress_replacement_truth + multi_axis_operations + army_reserve_system + new reconstitution suite) | **94/94 PASS** |
| Fresh 40w n1586 hash | `2bcbd32d224c2a52` (changed from pre-fix `4f872fcd535b6e98` because one HRHB stranded brigade now stays destroyed instead of cross-corps reconstituting; territorial 91.3%/93.3% — slight improvement vs pre-fix 91.2%/93.2%, no regression) |
| Fresh 188w n1587 hash | `09fc9beb9f0004c3` |
| 188w `compare_painted_vs_sim` | **80.5% area-weighted (+1.8pp vs 78.7% pre-fix)**, 83.3% count (+2.7pp). RS=−66 (vs −77), RBiH=+67 (vs +95), HRHB=−1 (vs −18). All three faction deltas closer to painted. |
| 188w `diagnose_run` Goražde siege check | 1/2 (ERROR persists) — soft target NOT met. Underlying DRINA/HERZEGOVINA RBiH-overgain destroys home OSIDs, not cross-corps drift. Separate calibration issue. |
| 188w `diagnose_run` total | 1 ERROR + **32 warnings (vs 55 pre-fix — 42% reduction)** |
| 188w `validate_run_consistency` | **18 failures (vs 27 pre-fix)**. **Undefended Front Subsegments: 0 (vs 5 — RESOLVED)**. **Adjacent Uncontested Territory: 0 (vs 13 — RESOLVED)**. Persistent: 11 below-floor sector notes with no legal same-corps donor — sectors no longer masked by cross-corps drift. |
| 188w probe `objective_capture_count` rows across all 188 weeks | **0** (prior packet's fix still intact, no regression) |

## Acceptance targets revisited

| Target | Pre-fix (n1585) | Post-fix (n1587) | Verdict |
|---|---|---|---|
| Goražde siege check | 1/2 (ERROR) | 1/2 (ERROR) | ❌ Soft target NOT met. Underlying DRINA/HERZEGOVINA RBiH-overgain destroys vrs_herzegovina/vrs_drina brigades' home OSIDs; cross-corps drift was a downstream artifact, not the cause. Resolves only with broader DRINA/HERZEGOVINA territorial calibration (separate packet). |
| 40w determinism | hash `4f872fcd535b6e98`, 91.2%/93.2% | hash `2bcbd32d224c2a52`, **91.3%/93.3%** | ⚠️ Hash differs (`hrhb_travnik_brigade` post-w35 destroyed in stranded lifecycle now stays destroyed rather than cross-corps reconstituting). Territorial outcomes are slight improvements, no regression. Determinism property holds (same code → same hash). |
| Probe-capture counter | 0 (n1585) | **0** (n1587) | ✅ No regression on prior packet's fix. |
| Orasje (`orasje`, `donja_mahala`, `ostra_luka`) | HRHB held | HRHB held | ✅ No regression. |
| Washington Agreement | t90 | t90 (deterministic outcome, governed by alliance system) | ✅ No regression. |
| 188w area-weighted | 78.7% | **80.5%** (+1.8pp) | ✅ Improvement (faction deltas all closer to painted). |
| 188w validate_run_consistency | 27 failures | **18 failures**; undefended subsegments 5→0, adjacent-uncontested 13→0 | ✅ Major improvement — two whole failure categories RESOLVED. |
| 188w diagnose_run warnings | 55 | **32** (−42%) | ✅ Significant improvement. |

## Determinism statement

- The `corpsTerritoryOsids` helper iterates `corps_front_sectors` keys; iteration order does not affect the returned `Set<string>` membership (the set is queried via `.has()`).
- `findFriendlyOsidInMunicipality` collects qualifying OSIDs into a list, sorts via `strictCompare`, and returns the first. Adding the optional `allowedOsids` filter narrows the collected list before sorting; the sort+pick step is unchanged, so determinism is preserved across calls with the same inputs.
- The same-corps gate is now applied at OSID-selection time inside `findFriendlyOsidInMunicipality` (filter → sort → first-qualifying), which closes the false-negative case where a mixed municipality had a foreign-corps alphabetical-first OSID but a later same-corps OSID.
- No randomness, no timestamps, no `Date.now()`.
- **40w hash is expected to differ from pre-fix** (`2bcbd32d224c2a52` vs `4f872fcd535b6e98`) because the cross-corps reconstitution gate now refuses one HRHB stranded brigade in 40w that previously cross-corps-reconstituted; territorial outcomes are slight improvements (91.3% / 93.3% vs 91.2% / 93.2%). **Same-code reruns remain deterministic** (the hash is a pure function of inputs and code; only the active fix changed the hash, not any nondeterministic source).

## STOP-AND-ASK decisions surfaced

1. **Underlying RBiH-overgain in DRINA/HERZEGOVINA** is not addressed by this fix. The territorial cascade (Foča/Čajniče falling to RBiH) is the real driver; this fix only blocks the artifactual amplifier downstream. Long-term Goražde siege health depends on calibrating DRINA/HERZEGOVINA territorial outcomes, which is broader calibration work outside this packet.
2. **Cross-corps absorption (28th Division → 2nd Corps after Srebrenica)** is now blocked even when historically accurate. The current fix dissolves brigades when corps territory is fully overrun rather than absorbing them into another corps. Future enhancement: when a brigade has no same-corps territory available, allow Path C: reassign `corps_id` to the corps whose territory the largest displacement destination falls in. This requires sign-off from `/historian` + `/game-designer` before implementation; out of scope here.
3. **Refugee placement still uses displacement_event_log scan.** This packet does not change which munis are considered, only filters them by corps territory. If the displacement_event_log itself shows historically wrong patterns (e.g., Drina refugees flowing to Banja Luka instead of east toward RS heartland), that's a separate displacement-system question.
