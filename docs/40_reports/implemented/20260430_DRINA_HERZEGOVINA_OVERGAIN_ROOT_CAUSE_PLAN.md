# DRINA / HERZEGOVINA RBiH-Overgain — Root-Cause Trace and High-Confidence Plan (Stop-At-Plan)

**Date:** 2026-04-30
**Predecessor:** `docs/40_reports/implemented/20260430_RS_WESTWARD_DRIFT_MOVER_TRACE_AND_FIX.md` (closed cross-corps reconstitution drift)
**Source plan:** `docs/plans/2026-04-30-v09-formation-life-believability-plan.md`

**Pre-investigation evidence runs:**
- 40w n1586, hash `2bcbd32d224c2a52` (post-corps-territory-gate fix)
- 188w n1587, hash `09fc9beb9f0004c3` (post-corps-territory-gate fix)
- DRINA area match 70.6%, HERZEGOVINA area match 60.7%, Goražde siege health 1/2 (ERROR persists)

**Outcome:** Stop-at-plan. No single bounded engine fix is safe; evidence converges on a four-owner structural pattern. No code, scenario, or canon change shipped.

---

## TL;DR

The Goražde siege ERROR and the DRINA/HERZEGOVINA RBiH-overgain are the convolution of four separable owners, each requiring its own expert sign-off. None can be repaired by a single-file bounded fix without expanding scope into the broad combat/morale/operations tuning the user prompt explicitly forbids. The cross-corps drift cascade (closed in the prior packet) was the artifactual amplifier; this packet's investigation confirms that with the amplifier closed, the residual underperformance is structural and multi-owner.

This report ships:
1. OSID-level mismatch packet for DRINA + HERZEGOVINA, decomposed by mechanism family.
2. Owner-trace for the four candidate owners with file/line evidence.
3. A high-confidence implementation plan naming each owner and the required sign-off.

---

## Required-task checklist (per prompt)

| Task | Done? | Evidence |
|---|---|---|
| 1. Use post-commit baselines (40w n1586 / 188w n1587 / Goražde 1/2 / DRINA 70.6% / HERZEGOVINA 60.7%) | ✓ | All baselines re-confirmed from `runs/.../n1587/` artifacts. |
| 2. OSID-level mismatch packet for DRINA/HERZEGOVINA | ✓ | Two-family decomposition below. 28 DRINA + 31 HERZEGOVINA mismatches categorized by mechanism. |
| 3. Trace fall/survival of key RS defensive zones | ✓ | Foča / Čajniče / Kalinovik / Višegrad / Rogatica / Goražde-adjacent OSIDs traced via `political.control_events` + `formations[*].brigade_history.engagements`. |
| 4. Trace vrs_drina/vrs_herzegovina brigade fates post-corps-gate-fix | ✓ | All 17 brigades inspected. 6/8 vrs_herzegovina forward-committed via scripted ops, 1 stranded-destroyed without battles, 1 sole survivor. |
| 5. Implement bounded fix if owner clarity exists | ✗ | No single bounded owner. Evidence converges on four owners requiring four sign-offs. STOP-AT-PLAN per prompt fallback. |
| 6. STOP triggers respected | ✓ | Triggers fired: "no bounded fix is safe", "scope would expand beyond prompt objective", "proposed fix would be a global combat/morale retune". |

---

## Mismatch families (n1587 painted-vs-sim)

### Region-level summary
| Region | Count match | Area-weighted match |
|---|---|---|
| KRAJINA | 99.2% | 99.6% |
| POSAVINA_NE | 87.5% | 88.3% |
| **DRINA** | **75.0%** | **70.6%** |
| CENTRAL_CORRIDOR | 90.2% | 91.2% |
| CENTRAL_BOSNIA | 78.1% | 75.5% |
| SARAJEVO | 90.0% | 91.5% |
| **HERZEGOVINA** | **66.3%** | **60.7%** |

### Family A — initial-vs-painted mismatch (init RBiH, painted RS, no flip event)

These OSIDs already start as RBiH at turn 0 (per apr1992 census/referendum init_control) but the painted target has them as RS.

DRINA Family-A OSIDs: `op:foca:miljevina_2`, `ustikolina`, `tjentiste_2`, `patkovina`, `izbisno`; `op:cajnice:miljeno_2`; `op:kalinovik:varos_2`, `golubici_2`, `sela_2`; `op:gorazde:kolovarice`; `op:rogatica:rogatica_2`, `varosiste_2`; `op:visegrad:kamenica_2`; `op:gacko:gacko_2`; `op:bileca:zausje`.

Engine truth: per `final.political.initial_political_controllers[osid] === 'RBiH'` for all of the above. Per `final.political.control_events`, Family-A OSIDs either have no flip events at all (final = init) or have a t0/t1 combat-mechanism RBiH→RS flip plus a later RS→RBiH flip (i.e. an op like Op Visegrad/Op Herzegovina captured them at t0 but they were retaken later).

CLAUDE rules state: "**NEVER override initial OSIDs**: Initial OSID control from census/referendum is sacrosanct. Fix engine, OOB, operations, or scenario params instead." Family A is therefore out of scope for this packet — the painted-vs-init tension is structural and pre-existing, and any "fix" would violate the canon rule.

Family-A is also responsible for ~10pp of the DRINA gap and ~3-4pp of the HERZEGOVINA gap. It is not the dominant driver of the residual.

### Family B — late-war combat flips (turns 67–105)

These OSIDs flip via `mechanism='combat'` in `political.control_events` during turns 67–105 (mid-late war).

| OSID | Flip turn | Mechanism | Comment |
|---|---|---|---|
| op:kalinovik:obalj | 67 | combat | RBiH from gorazde direction |
| op:nevesinje:nevesinje_2 | 78 | combat | Nevesinje town falls |
| op:kalinovik:kalinovik_2 | 78 | combat | Brigade home falls |
| op:gacko:gacko_2 | 81 | combat | (init RBiH; this is the second flip RS→RBiH after t0 RBiH→RS) |
| op:gacko:avtovac_2 | 82 | combat | Brigade home falls |
| op:bileca:korita | 83 | combat | rs_2nd_herzegovina_light_infantry home |
| op:bileca:zausje | 85 | combat | (second flip after t0; dups as Family A) |
| op:bileca:bileca_2 | 86 | combat | Brigade home falls |
| op:ljubinje:ljubinje_2 | 88 | combat | Deep rear fall |
| op:trebinje:bihovo_2 | 89 | combat | Brigade home falls |
| op:trebinje:trebinje_2 | 90 | consolidation | Cascades after bihovo_2 |
| op:foca:brod_3 | 91 | combat | |
| op:kalinovik:vlaholje | 91 | combat | |
| op:foca:prevrac | 105 | combat | |

These are real engine flips. None are operation-driven — the `operation_aars.json` (25 ops total in n1587) contains no RBiH operation targeting Foča / Kalinovik / Bileća / Gacko / Trebinje / Nevesinje / Ljubinje. The flips happen via standard combat path (`attack_resolution_osid.ts:802` writes mechanism='combat' for non-op brigade attacks).

### Goražde siege detector context

`tools/diagnose_run.cjs` Gorazde detector requires ≥2 brigades from `vrs_herzegovina+vrs_drina` near `gorazde/foca/cajnice/kalinovik/rogatica/visegrad`. Post-fix n1587 detector reads 1/2.

Final-state location of vrs_herzegovina+vrs_drina brigades:
- Sole survivor in cluster: `rs_trebinje_brigade` @ `op:trebinje:trebimlja_2` — but trebimlja_2 is far south (Trebinje), not in the detector's whitelist.
- Active but far from cluster (DRINA, in vrs_drina territory): `rs_1st_birac` (pobudje_2), `rs_1st_bratunac` (osmace_2), `rs_1st_milii` (seher_2), `rs_1st_podrinje` (rogatica:pljesevica) — `rs_1st_podrinje` IS in the detector range (rogatica), so it counts as 1.
- Six of seven Herzegovina home brigades destroyed t52–t94. Two of seven Drina brigades destroyed.

The detector reads "1" because only `rs_1st_podrinje` survives AND sits within the whitelisted munis.

---

## Brigade fate trace (post-corps-territory-gate-fix)

All 17 vrs_herzegovina + vrs_drina brigades inspected via `final.military.formations[*]`. Forward-commitment audit done via grep over `pre_planned_operations.ts` + `triggered_operations.ts`.

### vrs_herzegovina (8 brigades)

| Brigade | Home OSID | Final location | Status | destroyed_t | Forward op assignment |
|---|---|---|---|---|---|
| rs_foa_brigade | foca:foca_3 | foca:prevrac | destroyed | 90 | Op Visegrad (Visegrad Seizure) + Op Foča (foca_valley) |
| rs_ajnie_brigade | cajnice:cajnice_2 | cajnice:zaborak | destroyed | 94 | Op Visegrad (Visegrad Seizure) |
| rs_bilea_brigade | bileca:bileca_2 | capljina:tasovcici_2 | destroyed | 72 | Op Foča (foca_valley) + Op Herzegovina Consolidation (konjic_south) |
| rs_gacko_brigade | gacko:avtovac_2 | stolac:rotimlja_2 | destroyed | 52 | Op Foča (kalinovik) |
| rs_kalinovik_brigade | kalinovik:kalinovik_2 | kalinovik:vlaholje | destroyed | 75 | Op Foča (kalinovik) |
| rs_nevesinje_brigade | nevesinje:krekovi_2 | mostar:hodbina_2 | destroyed | 94 | Op Herzegovina Consolidation (mostar_heights) |
| rs_2nd_herzegovina_light_infantry | bileca:korita | stolac:hatelji_2 | destroyed | 72 | NONE — zero battles, destroyed via stranded lifecycle at foreign OSID |
| rs_trebinje_brigade | trebinje:bihovo_2 | trebinje:trebimlja_2 | **active** | — | NONE — sole survivor |

**6 of 8 brigades are scripted forward in pre-planned/triggered ops.** 1 brigade (rs_2nd_herzegovina_light_infantry) is structurally allocated but never engages and ends up at a foreign OSID via stranded-lifecycle. 1 brigade (rs_trebinje) has no forward commitment and survives.

### vrs_drina (9 brigades)

| Brigade | Final state | Active? |
|---|---|---|
| rs_1st_birac | bratunac:pobudje_2, mor=11 | active |
| rs_1st_bratunac | srebrenica:osmace_2, mor=0 | active |
| rs_1st_milii | kalesija:seher_2, mor=0 | active |
| rs_1st_podrinje | rogatica:pljesevica, mor=0 | active (sole Goražde-cluster contributor) |
| rs_1st_vlasenica | rogatica:pljesevica | destroyed t23 |
| rs_1st_zvornik | kalesija:gojcin_2 | destroyed t89 |
| rs_5th_podrinje | kalesija:gojcin_2 | destroyed t87 |
| rs_skelani_battalion | srebrenica:mala_daljegosta_2 | destroyed t171 |
| rs_visegrad_brigade | visegrad:zlijeb | destroyed t134 |

### Battle-history pattern (forward concentration)

`rs_bilea_brigade` battle history (`brigade_history.engagements`) shows:
- t6–t7: defender at op:capljina:tasovcici_2 vs HRHB (early Federation push from Mostar)
- t21–t67: defender at **op:kalinovik:obalj** vs RBiH (arbih_442nd_mountain, repeated attacks from Goražde direction)
- t72: defender at op:nevesinje:krekovi_2 (final destruction)

Multiple vrs_herzegovina brigades (rs_bilea, rs_gacko, rs_nevesinje, rs_kalinovik, rs_foa) defended at the **same forward OSID kalinovik:obalj** during the t21–t67 window. They were concentrated there because:
1. obalj is painted-RS (reads as a "must-hold" RS sector territory) but init_RBiH (so it starts contested).
2. Continuous RBiH pressure from arbih_442nd_mountain (home gorazde area, one hop from obalj).
3. The bot brigade-distribution logic (`brigade_front_distribution.ts` + `brigade_assignment.ts`) concentrates brigades at the highest-pressure sub-segment without reserving a minimum home-zone garrison.

When the obalj defenders eventually fell (t67), the bleed had already destroyed enough brigades that the deep-south rear (Bileća, Gacko, Trebinje, Nevesinje, Ljubinje) had no garrison. Sector consolidation cascaded through the rear in t78–t90.

---

## Owner candidates (four owners, four sign-offs)

### Owner 1 — `data/source/oob_brigades.json` (formation-expert + historian)

**Issue:** vrs_herzegovina has 8 brigades for 92 OSIDs. Historically the VRS Herzegovina Corps had brigades at every major town (Trebinje, Bileća, Gacko, Nevesinje, Foča, Čajniče, Kalinovik) plus rear TDF detachments at smaller settlements. The current OOB has one brigade per major town with no smaller-settlement TDFs.

**Proposed change:** Add 3–4 light TDF brigades for:
- Ljubinje area (currently no garrison brigade)
- Trebinje secondary garrison (eastern muni, currently bare)
- Western Bileća coverage (rs_2nd_herzegovina_light_infantry at korita is the only second brigade, eastern half of muni only)
- Gacko secondary detachment

**Why bounded fix not safe in this packet:** OOB additions affect every scenario (40w + 188w + future starts), shift initial mobilization counts, change pool seeds, and require historical sourcing. Each addition needs `/formation-expert` + `/historian` sign-off and a paired `BB1`/`BB2`/ICTY citation. This is the right fix but is OOB-design work, not a packet-bounded engine fix.

**Sign-off required:** `/formation-expert`, `/historian`.

### Owner 2 — `src/sim/combat/pre_planned_operations.ts` (operations-expert)

**Issue:** Op Visegrad, Op Foča, and Op Herzegovina Consolidation collectively assign 6 of 8 vrs_herzegovina brigades to forward operations:
- Op Visegrad (Visegrad Seizure): rs_foa_brigade, rs_ajnie_brigade
- Op Foča (foca_valley): rs_foa_brigade (re-used), rs_bilea_brigade
- Op Foča (kalinovik): rs_gacko_brigade, rs_kalinovik_brigade
- Op Herzegovina Consolidation (mostar_heights): rs_nevesinje_brigade
- Op Herzegovina Consolidation (konjic_south): rs_bilea_brigade (re-used)

Brigades that are committed forward typically take heavy casualties at HRHB/RBiH-controlled forward objectives (rs_nevesinje took 506 casualties in one t20 attack at op:mostar:vranjevici_2; rs_kalinovik took 322 catastrophic at op:foca:patkovina t25).

**Proposed change candidates:**
- Drop rs_bilea_brigade from Op Foča (foca_valley) — leave that axis to rs_foa_brigade alone.
- Convert one or both Op Herzegovina Consolidation axes to JNA-phantom-only (jna_nevesinje_garrison, jna_konjic_south_tg already exist as similar synthetic forces in Op Herzegovina at line 285).
- Add a "garrison_priority" or "no_pull_forward" flag for rs_2nd_herzegovina_light_infantry (the only true rear-garrison brigade) and rs_trebinje_brigade (deep-south).

**Why bounded fix not safe in this packet:** Op Foča and Op Visegrad are historically grounded (BB1 p.193 Mostar hills, BB2 p.514 Glavatičevo, BB2 p.289 Goražde west approach). Removing brigades changes operation viability — the kalinovik axis with only one brigade may not satisfy `min_attack_outcome: 'repulsed'` and would abandon, costing the painted-RS Goražde-corridor objectives. Each axis needs `/operations-expert` to weigh historical-target preservation vs garrison-preservation. This is operations-design work, not a single-file engine fix.

**Sign-off required:** `/operations-expert`, secondary `/historian`.

### Owner 3 — `src/sim/combat/brigade_front_distribution.ts` + `brigade_assignment.ts` (sector-expert + corps-army-commander)

**Issue:** When a single forward OSID (kalinovik:obalj) becomes the highest-pressure sub-segment for vrs_herzegovina, the distributor concentrates 4–5 brigades there. The deep south rear (Bileća/Gacko/Trebinje/Nevesinje munis ~80 km behind the obalj front) is left at zero density. There is no rule that reserves a minimum home-zone garrison or caps the share of corps brigades that can stack on a single forward sub-segment.

**Proposed change candidates:**
- A `MIN_HOME_GARRISON_PER_MUNI` rule: each major-town home OSID retains at least 1 brigade tagged as "rear-anchor" before the rest of the corps is allowed to flow forward.
- A `MAX_CONCENTRATION_RATIO` rule: no single sub-segment can absorb >40% of corps brigades.
- Sector-territory floor: if a sector's territory_osids contains a home OSID for a corps brigade, that brigade defaults to rear-anchor unless explicitly assigned to a forward sub-segment.

**Why bounded fix not safe in this packet:** Any of the above rules touches the bot brigade-distribution AI for ALL corps and ALL factions, not just vrs_herzegovina. Validation cost is full 40w + 188w with cross-faction effects (could harm RBiH push effectiveness in Sarajevo/Tuzla/Bihać, could harm HRHB defensive consolidation). Calibration sweep needed across all benchmark anchors. This is corps-AI design work, not a packet-bounded fix.

**Sign-off required:** `/sector-expert`, `/corps-army-commander`, `/qa-engineer` for cross-faction validation.

### Owner 4 — `src/sim/combat/attack_resolution_osid.ts` (combat resolution)

**Issue:** rs_foa_brigade defended op:foca:brod_3 t88–t90 with three "decisive_victory" outcomes, but accumulated 251 + 185 + 129 = 565 casualties across the three battles and was destroyed on t90. Defender wins each battle but bleeds enough personnel/cohesion that the brigade collapses from successful-but-attritional defense.

This is the P1 defensive-fire / combat-attrition pattern documented in `docs/40_reports/COMBAT_MASTER.md`. With ARBiH artillery still in play and the current defensive multiplier capped at 1.8×, defender casualties scale even on victories.

**Proposed change candidates:** None bounded — this is the broad combat-tuning lane the user prompt explicitly forbids ("No global combat tuning"). Any defender-side casualty reduction would also affect RBiH defenders in Sarajevo/Tuzla and HRHB defenders in Mostar/Vitez — full re-calibration needed.

**Why bounded fix not safe in this packet:** Explicitly forbidden by prompt.

**Sign-off required:** Out of scope. Note for separate combat-calibration packet.

---

## Why no single bounded fix achieves Goražde 2/2

| Owner | Required sign-off | Out of this packet's scope? |
|---|---|---|
| OOB densification | formation-expert + historian | Yes — OOB-design work |
| Operation re-allocation | operations-expert + historian | Yes — operations-design work |
| Brigade distribution rule | sector-expert + corps-army-commander + qa-engineer | Yes — cross-faction AI work |
| Combat resolution tuning | (forbidden by prompt) | Yes — explicitly forbidden |

The user prompt's scope-fence: "Do not make broad combat tuning, global morale floors, or Path C cross-corps absorption changes in this packet." Each remaining owner is exactly that: broad operation tuning, broad bot-AI tuning, broad OOB tuning. The cross-corps drift cascade was the artifactual amplifier; with that closed, the residual is structural and multi-owner.

The prior packet's improvements (188w 78.7%→80.5%, validate_run_consistency 27→18, undefended subsegments 5→0, adjacent-uncontested 13→0) hit the bounded amplifier. This packet stops at high-confidence plan because the residual lives in four separate ownership lanes.

---

## High-confidence implementation plan (for future packets, with sign-offs)

### Packet 1 — vrs_herzegovina rear-garrison OOB densification
- **Skill:** `/formation-expert` (lead), `/historian` (citations)
- **Inputs:** BB1 vol 2 Herzegovina chapters; BB2 p.193, 289, 480, 514; ICTY VRS Herzegovina Corps OOB documents.
- **Output:** 3–4 new TDF brigades in `data/source/oob_brigades.json` covering Ljubinje, eastern Trebinje, western Bileća, Gacko secondary.
- **Validation:** 40w determinism rerun (target: hash drift OK if territorial outcomes ≥ baseline). 188w rerun: HERZEGOVINA area match target ≥ 67%. Goražde detector ≥ 2/2 if rs_trebinje + rs_bilea or rs_2nd_herzegovina survive.

### Packet 2 — Operation Foča / Op Herzegovina Consolidation re-allocation
- **Skill:** `/operations-expert` (lead), `/historian` (verify each axis still maps to BB-cited 1992-93 actions).
- **Action:** Drop rs_bilea_brigade from Op Foča foca_valley (it remains in Op Herzegovina Consolidation konjic_south). Consider converting Op Herzegovina Consolidation axes to JNA-phantom-only.
- **Validation:** Op completion rates unchanged; Goražde-corridor objectives still captured; rs_bilea + rs_2nd_herzegovina survive longer in 188w.

### Packet 3 — minimum home-zone garrison rule
- **Skill:** `/sector-expert` (lead), `/corps-army-commander` (validate corps AI doesn't break), `/qa-engineer` (cross-faction calibration sweep).
- **Action:** Add `MIN_HOME_GARRISON_PER_MUNI=1` constraint in `brigade_front_distribution.ts`: when a corps's largest sub-segment would absorb >40% of brigades, hold one brigade at each home-OSID muni.
- **Validation:** Full benchmark suite (RS w20, RS w40, RBiH w40, HRHB w40, KRAJINA, POSAVINA_NE, DRINA, HERZEGOVINA, CENTRAL_BOSNIA, SARAJEVO). No anchor regression; HERZEGOVINA + DRINA improvement ≥ +3pp each.

### Packet 4 — combat resolution defender-attrition (separate, broader calibration packet)
- Out of scope; flagged here for awareness. Existing `docs/40_reports/COMBAT_MASTER.md` P1 audit is the entry point.

---

## Validation summary (this packet)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Not run — no code change |
| Targeted vitest | Not run — no code change |
| Fresh 40w | Not run — no code change |
| Fresh 188w | Not run — no code change |
| 188w `compare_painted_vs_sim` | Re-confirmed n1587 from existing artifact: 80.5% area-weighted, DRINA 70.6%, HERZEGOVINA 60.7% |
| 188w `diagnose_run` | Re-confirmed n1587: 1 ERROR (Goražde 1/2), 32 warnings |
| 188w `validate_run_consistency` | Re-confirmed n1587: 18 failures, 0 undefended subsegments, 0 adjacent-uncontested |
| Probe `objective_capture_count` | Re-confirmed n1587: 0 across 188 weeks (no regression) |
| Orasje hold | Re-confirmed n1587: HRHB controls orasje/donja_mahala/ostra_luka |

No engine state, no scenario data, no canon doc changed. This packet ships only investigation + plan.

---

## STOP-AND-ASK decisions surfaced

1. **OOB densification (Packet 1):** Requires `/formation-expert` + `/historian` to source 3–4 TDF brigades for vrs_herzegovina rear, with BB1/BB2/ICTY citations. Touches every scenario start — can't be a packet-1 trial fix.
2. **Operation re-allocation (Packet 2):** Requires `/operations-expert` + `/historian` to weigh historical-target preservation against garrison-survival. The kalinovik axis viability with only 1 brigade is not pre-determined.
3. **Brigade distribution rule (Packet 3):** Requires `/sector-expert` + `/corps-army-commander` + `/qa-engineer`. Touches cross-faction bot AI; full calibration sweep needed.
4. **Combat-tuning (Packet 4):** Forbidden by user prompt's scope fence.
5. **Painted-vs-init mismatch (Family A):** CLAUDE rule "NEVER override initial OSIDs" forbids fixing the painted target. Documented as known structural tension.

---

## Determinism statement

No randomness, no timestamps, no `Date.now()`, no sorted-iteration changes. No code changed. The investigation reads existing run artifacts (`runs/.../n1587/final_save.json`, `weekly_report.jsonl`, `operation_aars.json`) and existing source files (`pre_planned_operations.ts`, `triggered_operations.ts`, `oob_brigades.json`).

---

## Files changed

| File | Change |
|---|---|
| `docs/40_reports/implemented/20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` | This report (new). |
| `docs/PROJECT_LEDGER.md` | Investigation entry (no behavioral change). |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Durable lesson on artifactual amplifier vs structural residual distinction. |

No engine code, no scenario data, no canon doc changed.
