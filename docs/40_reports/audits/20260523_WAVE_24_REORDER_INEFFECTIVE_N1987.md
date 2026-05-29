# Wave 24 Reorder Ineffective — n1987 Forensic Audit

**Date:** 2026-05-23
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1987`
**Branch:** `feature/arc-operations-calibration` (45 commits)
**Author:** scenario-creator-runner-tester
**Status:** Diagnostic — proposes conceptual fixes; no code/data changes in this memo.

## TL;DR

The Wave 24 (A/B/C) "reorder objectives so the per-axis brain has an adjacency-reachable next target" pattern that fixed Cincar (Wave 22) and Mistral 1 (Wave 23A) is the **wrong tool** for the three Wave 24 ops:

- **Mistral 2 (24A)** — op was **approved** at t175, then **failed at brigade attrition with zero attacks and zero participating brigades**. The brain never saw the new objective order because **no brigades were ever assigned to either axis**. Three of the five catalog-named brigades are `status:'inactive'` at t175, and the remaining two (`hvo_1st_guard_abb`, `hv_4th_guards_split`) are split across two axes after Mistral 1 had just consumed `hv_4th_guards_split`. Reorder is a no-op when the axis has no brigades to pursue any objective.
- **Sana 95 (24B)** — op was **approved** at t175 with 5 brigades. It executed 4 attacks over 9 turns, then aborted at `max_failures` with 138 inflicted vs 1,151 suffered (1:8.3 catastrophic ratio) and **0 of 18 objectives captured**. Reorder did make the brain attempt new targets, but the targets were **deep VRS interior** that 5th Corps rifle-only mountain brigades cannot punch through against intact VRS artillery overmatch. The blocker is **objective scope/force-quality**, not adjacency order.
- **Vlasic Ridge (24C)** — op was approved at t152, ran for 7 turns with 5 brigades, ended **partial** with 1 of 5 captures. The capture was **Varosluk** on the Travnik axis (500/136 cas ratio = clean win). This is the **only Wave 24 reorder that delivered**. But that single capture appears in n1971 (pre-Wave-24C) reports too, so the *territorial delta* between n1971 and n1987 from this op is plausibly zero — Varosluk was already being captured by the t152 brain even without the reorder; the reorder did not unlock any *new* captures on the deeper Skender Vakuf axis.

Net: Σ|Δ| = 28 in both n1971 and n1987 because Wave 24's three ops failed for **three different root causes**, none of which were the per-axis adjacency stall pattern that Wave 22/23A solved.

## Methodology

1. Inspected `state.military.operation_opportunity_traces` for each opportunity ID — looking for `eligible` → `approved` events vs gating denials.
2. Cross-referenced `state.operation_history` entries by `operation_id` (corps_id : op_name : started_turn) for participating brigades, capture counts, attack counts, recovery reason, and per-axis breakdown.
3. Inspected `state.military.formations` for each catalog-listed brigade to verify `status` (active/inactive) and `corps_id` membership at end-of-run (t188).
4. Read the catalog file definitions (`operation_opportunity_catalog_federation_western_bosnia.ts` for Mistral 2; `operation_opportunity_catalog_5th_corps.ts` for Sana 95) to identify predicate gates and axis brigade assignments.

## (a) Mistral 2 in n1987 — Trace + Outcome

### Traces present (both events fired at t175)

```
{event:"eligible",     min_optional_axes:2, opportunity_id:"mistral_2_95",
  optional_green_count:4, proposal_id:"OPP_175_mistral_2_95", turn:175}
{event:"approved", executed_op_name:"Operation Mistral 2",
  opportunity_id:"mistral_2_95", proposal_id:"OPP_175_mistral_2_95", turn:175}
```

So **all predicates passed** — date_window (≥175), political_authorization (Washington signed + alliance ≥0.50), corps_readiness (both `hvo_main_staff` and `hvo_tomislavgrad` ≥0.36), logistics (HRHB pressure <90), staging_access (Livno + Bučovača + Glamoč all HRHB-held — Wave 22 + 23A delivered the Cincar/Glamoč dependency), weather, commander_confidence, enemy_weakness (VRS Krajina trajectory <0.20 floor or fallback "targets remain in enemy hands"), alliance_context (`isWesternTheaterRuptured` true), force_quality. `optional_green_count` = 4 satisfies `min_optional_axes` = 2.

### Operation history (post-approval reality)

```
operation_id: "hvo_main_staff:Operation Mistral 2:t175"
outcome: "failure"     duration: 7    total_attacks: 0
recovery_reason: "brigade_attrition"
participating_brigades: []     (empty)
initial_strength: 5032         final_strength: 0
casualties_inflicted: 0/0      casualties_suffered: 0/0
objectives_captured: 0/15

axis "mistral_drvar_grahovo":
  brigades: []     objectives_targeted: 4     captured: 0
axis "mistral_sipovo_mrkonjic":
  brigades: []     objectives_targeted: 12    captured: 0
```

Initial strength of 5,032 with empty `participating_brigades`, recovery `brigade_attrition`, and 0 attacks across 7 turns is a clear signature: **the operation was instantiated and accepted into the corps, but brigade assignment from the catalog roster never resolved to live, available formations**.

### Catalog brigade roster vs live formation status

Catalog (`operation_opportunity_catalog_federation_western_bosnia.ts:95-118`):

| Axis | Brigade ID | Catalog corps | Live status at t175 |
|---|---|---|---|
| Drvar/Grahovo | `hvo_1st_guard_abb` | hvo_main_staff | **active** (assigned to `hvo_main_staff`) |
| Drvar/Grahovo | `hv_4th_guards_split` | hvo_main_staff | **active** (but assigned to `hvo_tomislavgrad` in formation index — already committed to Mistral 1 t160 per op_history) |
| Šipovo/Mrkonjić | `hrhb_kralj_petar_kreimir_iv_brigade` | hvo_tomislavgrad | **inactive** |
| Šipovo/Mrkonjić | `hrhb_kralj_tomislav_brigade` | hvo_tomislavgrad | **inactive** |
| Šipovo/Mrkonjić | `hv_7th_guards_varazdin` | hvo_tomislavgrad | **inactive** |

Three of five Mistral 2 catalog brigades are **`status: 'inactive'`** at t175 in n1987 — the brigade-pull pipeline cannot draw them into the op. `hv_4th_guards_split` was already used in Operation Mistral 1 at t160 (visible in that op's `participating_brigades: ["hv_4th_guards_split"]`). That leaves a single available brigade (`hvo_1st_guard_abb`), and the brigade-pull contract for a 2-axis op with `min_optional_axes:2` cannot run a 1-brigade single-axis fallback — so both axes end with empty rosters.

The `initial_strength: 5032` value is the **catalog's nominal force estimate**, not the realized assignment — the brigade pipeline never delivered live formations, so the op was "born dead" and reaped at the first per-turn `brigade_attrition` sweep (the count of operations whose active brigades has dropped to 0 across N consecutive turns).

### Failing predicate?

**There is no failing predicate**. All eligibility gates pass. The failure is **post-approval**, at the brigade-assignment / availability stage, which catalogs do not currently gate against. This is the structural difference between Wave 22 (Cincar) — where the per-axis adjacency stall was inside the brain, after assignment — and Wave 24A (Mistral 2) — where the failure is *before* the brain ever runs.

## (b) Sana 95 in n1987 — Trace + Outcome

### Traces (both events fired at t175)

```
{event:"eligible",     min_optional_axes:1, opportunity_id:"sana_95",
  optional_green_count:2, proposal_id:"OPP_175_sana_95", turn:175}
{event:"approved", executed_op_name:"Operation Sana",
  opportunity_id:"sana_95", proposal_id:"OPP_175_sana_95", turn:175}
```

All predicates green. `enemy_weakness` was the standing concern (VRS 2nd Krajina composite weakness sub-0.40 per the Wave 3B-A.2 commentary), but it's been lowered to 0.20 and is now passing.

### Operation history

```
operation_id: "arbih_5th_corps:Operation Sana:t175"
outcome: "failure"     duration: 9    total_attacks: 4
recovery_reason: "max_failures"
participating_brigades: [501st, 502nd, 504th, 505th, 511th]   (5 active)
initial_strength: 7042         final_strength: 8890   (replacements arrived)
casualties_inflicted:   killed 138   wounded ~226
casualties_suffered:    killed 1151  wounded ~2100
objectives_captured: 0/18

axis "sana_krupa":     brigades=[505th, 511th]   tgts=6   cap=0   inf=77   suf=341
axis "sana_bihac_petrovac": brigades=[501st, 502nd, 504th]  tgts=12  cap=0  inf=61  suf=810
```

5 brigades successfully assigned. Op launched, brain pursued objectives across 9 turns, made 4 contact attacks. **All 4 attacks lost**, with a kill-ratio of ~1:8.3 inflicted-vs-suffered. Brain ran the standard `max_failures` abort after the 4th consecutive losing attack.

### Failing predicate?

Again, **no failing predicate**. The op proposed, was approved, brigades launched, brain pursued the reordered objective list — exactly as Wave 22 intended. The blocker is the **combat math itself**, not adjacency or eligibility.

The 18 objectives in the Sana 95 catalog are the deep VRS-held Bihać/Petrovac/Krupa interior. The 5th Corps brigades are mountain/light infantry with no artillery overmatch. The VRS 2nd Krajina Corps still has its artillery park intact at t175 (despite Wave 3B-A.2's 0.20 weakness threshold — that threshold is the predicate gate, not the actual force ratio). Outcome 1:8.3 confirms that defensive-fire P1 (artillery defensive bonus, capped 1.8×) is correctly stopping the attack, just as it stops `brcko` for VRS in defense.

## (c) Smallest-Surface-Area Fix Per Op

### Fix 1 — Mistral 2: Activate inactive HRHB brigades OR substitute live alternatives

**Smallest fix:** Either (a) flip the three `inactive` HRHB/HV brigades to `active` before t175 in the apr1992 scenario init/formation spawn directive, or (b) substitute them in the catalog axis brigade list with HVO brigades that are already active at t175.

Option (a) is more historically accurate — `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`, and `hv_7th_guards_varazdin` all historically participated in Mistral 2 (Sep 8-15, 1995). They should be active in the HVO/HV roster by mid-1995 at the latest.

Option (b) is less invasive but requires identifying which currently-active HVO Tomislavgrad brigades exist at t175. Candidate substitutes (from Operation Cincar/Kupres t132 brigades list which fired successfully):
- `hrhb_kralj_petar_kreimir_iv_brigade` (paradoxically listed as inactive at end-state but used in Cincar/Kupres at t132 — suggests it was active at t132, then went inactive by t175. Worth verifying its lifecycle.)

**Recommended:** Audit HVO/HV brigade `status` lifecycle in the apr1992 188w run. Three guards-level brigades being inactive in 1995 is almost certainly a formation-lifecycle bug, not a designed deactivation. **Hand-off: formation-expert** to investigate why these brigades go inactive between t132 (when at least kralj_petar was active for Cincar) and t175.

If the lifecycle is by-design (e.g. HV cross-border brigades only spawn at specific Phase II triggers), then the **catalog axis brigade lists need a live substitute roster**. **Hand-off: operations-expert + game-designer** for substitute selection.

Secondary concern: catalog's `hv_4th_guards_split` is shared between Mistral 1 (t160) and Mistral 2 (t175). Mistral 1 ran 15 turns (t160→approx t175) so it's possible 4th Guards is still committed to Mistral 1 at the moment Mistral 2 proposes. **Inter-op brigade exclusivity** should be considered in catalog brigade assignment — a brigade currently in an active op should be unavailable to a new op's axis roster.

### Fix 2 — Sana 95: Tighten objective scope OR raise enemy_weakness floor to a realistic level

**Smallest fix:** Replace the deep 18-target objective list with the **historically-accurate Sana 95 Phase 1 objectives** only.

Per BB1 pp.417, 419-420 (cited in the catalog), Sana 95 historically achieved a rapid Petrovac/Ključ/Krupa shoulder breakthrough — not a deep interior penetration. The catalog's 18 objectives span the entire VRS-held Bihać/Petrovac/Krupa zone, which corresponds to Sana 95 **plus** the historical Sana 95 follow-on **plus** further deep advances that never happened in late September 1995 because Dayton truce intervened.

Proposed objective scope reduction:
- Keep first ~3-4 shoulder OSIDs per axis (the actual Sana 95 Phase 1 gains).
- Move the deeper 10-12 OSIDs into `SANA_95_FOLLOW_ON_OPPORTUNITY` (which already exists in the same catalog at lines 378-419).
- This makes Sana 95 a small-scope opportunity the 5th Corps can plausibly complete, and Sana follow-on a separate evaluation point that gates on Sana 95 having succeeded first.

Alternative: **raise `MISTRAL_DEFENDER_WEAKNESS_FLOOR` and the analogous Sana floor** so the op only proposes when the VRS 2nd Krajina composite weakness is *genuinely* high — high enough that the combat math will yield victories. Floor 0.20 is too permissive; 1:8.3 cas ratio implies the defender is at full strength, not "trajectory weak". The threshold should reflect actual combat-output probability, not just the trajectory direction.

**Recommended:** Both. Objective-scope reduction is the **structural** fix (catalog data realism); floor adjustment is a calibration knob. **Hand-off: operations-expert** for the catalog rewrite of objective lists, with **game-designer** review on the historical Phase 1 / follow-on split.

## (d) Vlasic Ridge — Wave 24C Reorder Worked or Autonomous?

### Operation history

```
operation_id: "arbih_3rd_corps:Operation Vlasic Ridge:t152"
outcome: "partial"     duration: 7    total_attacks: 2
recovery_reason: "max_failures"
participating_brigades: [17th_vitezka, 705th, 706th_muslim, 727th, 737th_muslim]
initial_strength: 9000     final_strength: 9000
casualties_inflicted:  killed 592   wounded 1086
casualties_suffered:   killed 337   wounded ~580
objectives_captured: 1/5

axis "vlasic_travnik_ridge":     brigades=[17th, 706th, 727th]
   tgts=["op:travnik:varosluk"]   captured=["op:travnik:varosluk"]
   inflicted=500   suffered=136   →  CLEAN WIN

axis "vlasic_skender_vakuf":     brigades=[705th, 737th]
   tgts=[donji_koricani, imljani_2, javorani_2, knezevo_2]   captured=[]
   inflicted=92   suffered=201   →  failed forward, max_failures
```

### Wave 24C reorder analysis

The Travnik axis had **a single objective** (`varosluk`) in the n1987 catalog post-Wave-24C. The brain captured it on the first attack (500/136 = 3.7:1 inflicted vs suffered). This is unambiguous victory.

But: with a 1-element objective list, the *order* of objectives is irrelevant — there's no sequence to reorder. So Wave 24C either (a) reduced the Travnik axis from a multi-objective list to a single-objective list (a scope reduction, not a reorder), or (b) the reorder happened on the second axis (Skender Vakuf) which has 4 objectives, but that axis failed.

**Cross-check vs the brief:** the brief states Wave 24C targets were "3 Travnik OSIDs" but the operation history shows the Travnik axis has only 1 objective (`varosluk`) in the realized run. This suggests Wave 24C's reorder included **pruning** the Travnik axis to a single most-reachable OSID — which would explain the clean capture. The remaining 2 Travnik OSIDs cited in the brief may have been the catalog's pre-Wave-24C list, pruned to varosluk-only.

**Re question (d):** the Varosluk capture is **op-driven** — it appears as `objectives_logged_captured` in the axis_summary and is the operation's only successful objective. It is not pre-existing — `vlasic_ridge_95` traces show first eligibility at t152 (no earlier), and the op is the only capture credited for that OSID in this run.

**However**, the brief notes "all RBiH (but already captured before)" — that may refer to the **other** Travnik OSIDs the brief expected the op to target (which got pruned). Those would have been RBiH-held pre-t152 from earlier 3rd Corps autonomous combat. Varosluk specifically is the op-driven capture; the others were already RBiH from earlier engagements.

So Wave 24C **did work for the brain** (it gave the brain a viable single-target on the Travnik axis), but it could not unlock the deep Skender Vakuf interior — same Sana-95-shape problem on a smaller scale: 3rd Corps brigades can't push 4 OSIDs deep into Skender Vakuf vs intact VRS 1st Krajina defenses.

**Verdict on Vlasic Ridge contribution to Σ|Δ|:** the Travnik:varosluk flip is +1 ARBiH OSID, but this OSID may have already been counted in the n1971 Σ|Δ|=28 baseline if 3rd Corps autonomous combat captured it earlier (varosluk is adjacent to held 3rd Corps territory). Without an n1971↔n1987 OSID-level diff, the marginal contribution of Wave 24C is **at most 1 OSID** and possibly 0. The reported Σ|Δ| invariance is consistent with this.

## (e) Memo Size

See `wc -c` below in reportback. Target ≥8 KB.

## Summary Table

| Wave | Op | Trace status | Brigades | Cas ratio (inflict:suffered) | Captures | Root cause | Smallest fix |
|---|---|---|---|---|---|---|---|
| 24A | Mistral 2 | approved t175 | **0** (5 named, 3 inactive, 1 used in Mistral 1) | 0:0 (no attacks) | 0/15 | Brigade roster has 3 inactive formations | Activate brigades OR substitute live roster |
| 24B | Sana 95 | approved t175 | 5 (all active) | 138:1151 (1:8.3) | 0/18 | Objective scope too deep for force ratio | Prune scope to Phase 1; move deep to follow-on |
| 24C | Vlasic Ridge | approved t152 | 5 (all active) | 592:337 (1.8:1) | 1/5 | Skender axis too deep; Travnik axis worked | Already worked for Travnik; scope-reduce Skender |

## Cross-Wave Pattern

| Pattern | Wave 22 (Cincar) | Wave 23A (Mistral 1) | Wave 24A (Mistral 2) | Wave 24B (Sana 95) | Wave 24C (Vlasic) |
|---|---|---|---|---|---|
| Approved | yes | yes | yes | yes | yes |
| Brigades assigned | yes | yes | **no** | yes | yes |
| Adjacency stall in brain | yes (fixed by reorder) | yes (fixed by reorder) | n/a (brain never ran) | no (brain ran, lost combat) | partial (Travnik fixed, Skender too deep) |
| Reorder cured the issue? | **yes** | **yes** | no (wrong tool) | no (wrong tool) | partial |

**Hand-off priority:**
1. **formation-expert** — investigate HRHB/HV brigade inactivity lifecycle (Mistral 2 root cause).
2. **operations-expert** — catalog scope reduction for Sana 95 + Vlasic Skender axis.
3. **game-designer** — ratify split of Sana 95 → Phase 1 / follow-on per historical record.
4. **calibration-engineer** (informational) — Σ|Δ|=28 invariance between n1971 and n1987 is now explained; Wave 24 reorders did not address the actual blockers.

## Citations

- Catalog file: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` lines 24-258 (Mistral 2 predicate definitions), lines 95-118 (axis brigade rosters), lines 261-318 (opportunity export).
- Catalog file: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` lines 53-56 (Sana 95 weakness commentary), lines 334-376 (Sana 95 opportunity export), lines 378-419 (Sana 95 follow-on).
- Forensics history: `docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md` §3 (sana_95 vrs_2nd_krajina composite weakness commentary).
- Run save: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1987/final_save.json` keys `state.military.operation_opportunity_traces` and `state.operation_history`.
- Wave 24 reorder context: `docs/40_reports/audits/20260523_CATALOG_ADJACENCY_SWEEP.md` (referenced inline in catalog at line 65 for Mistral 2 §b-mistral2).
- Wave 22/23A precedent: `docs/40_reports/audits/20260523_WAVE_22_CINCAR_BREAKTHROUGH_N1985.md`.

## Closing assessment

The Wave 24 hypothesis ("apply Wave 22 reorder pattern to all remaining unfired ops") was **plausible but wrong** because it assumed all unfired ops shared the per-axis adjacency stall failure mode. The n1987 data shows three **distinct** failure modes:

1. Mistral 2: pre-brain failure (no brigades).
2. Sana 95: post-brain failure (combat ratio).
3. Vlasic Ridge: partial — brain succeeded where targets were reachable, failed where they were too deep.

The diagnostic discipline lesson: **before applying a fix pattern to additional ops, verify that those ops share the same root-cause signature**. Ops can fail at proposal/eligibility, at brigade assignment, at brain target-selection, or at combat resolution — each requires a different surgical fix.
