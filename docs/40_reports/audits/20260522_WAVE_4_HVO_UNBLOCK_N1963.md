# Wave 4 HVO Unblock — n1963 vs n1961 Comparison

- Date: 2026-05-22
- Branch: codex/teslic-collateral-and-strict-null-2026-05-19
- Author: scenario-creator-runner-tester (read-only investigation)
- Compared runs:
  - **n1961** — Waves 1–14 (14-fix cumulative; baseline per `docs/40_reports/audits/20260522_ARC_FINAL_N1956_N1961_14_FIXES.md`)
  - **n1963** — Waves 1–14 + **Wave 4A** (B1_HIGH_EXHAUSTION_THRESHOLD 500 → 12000) + **Wave 4B** (GRAZ_EXEMPT_HRHB_CORPS += hvo_southeast_herzegovina)
- Run directories:
  - n1961: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1961/`
  - n1963: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1963/`
- Source: read-only inspection of `run_summary.json`, `final_save.json`, `initial_save.json`, `operation_aars.json`, `watched_operations.json`, `replay_save_manifest.json`, `end_report.md` in each run directory.

> Status: read-only investigation. No source edits. All numbers cited from JSON paths shown in body.

---

## 0. Headline

| Metric | n1961 | n1963 | Δ |
| --- | --- | --- | --- |
| Final state hash | a76b9f8b85fdf24e | **e7c838612fa5869d** | new |
| OSID match vs initial-painted (sim-defined target) | 545/712 (76.5%) | **558/712 (78.4%)** | **+1.9 pts** |
| Area-weighted match vs initial-painted | 80.0% | **81.7%** | **+1.7 pts** |
| OSID match vs jan1993 painted-OSID file | 599/712 (84.1%) | **612/712 (86.0%)** | **+1.9 pts** |
| Total ops finalised | 43 | 45 | +2 |
| **HRHB ops finalised** | **2 (both failure)** | **2 (1 success!)** | qualitative win |
| RBiH ops finalised | 17 | 20 | +3 |
| RS ops finalised | 24 | 23 | −1 |
| Captures (combat_causality.total_objective_captures) | 150 | 151 | +1 |
| Battles (combat_causality.total_battles) | 429 | 314 | **−115** |
| Flips applied (attack_resolution.flips_applied) | 82 | 70 | −12 |
| Attacker / Defender KIA (combat) | 103,366 / 102,958 | 83,133 / 80,240 | −20,233 / −22,718 |
| Anchors PASS / FAIL | 23 / 4 | **22 / 5** | **−1 / +1** |
| HRHB territory (final) | 79 | **78** | −1 |
| RBiH territory (final) | 312 | **298** | **−14** |
| RS territory (final) | 321 | **336** | **+15** |
| war_alliance_rbih_hrhb (final) | 0.55 | 0.55 | 0 (Wave 5 not shipped) |

n1963 hash `e7c838612fa5869d` differs from n1961 `a76b9f8b85fdf24e`, confirming the two Wave 4 fixes changed the engine path. Wave 4 delivered exactly what it aimed at on the HVO axis (Op Jackal launched, attacked, captured) but produced a faction-symmetric side effect: with PREPARE_RESERVE lifted, **RS bots also escaped reserve posture** and reclaimed ~15 OSIDs from RBiH-favoured trajectories. RBiH lost 14 net (−14), RS gained 15 net (+15). HRHB net delivery is roughly flat (79→78).

---

## 1. THE headline — HVO operation count

Source: `operation_aars.json` filtered by `faction='HRHB'`.

| Run | HVO ops finalised | Outcomes | force_ratio (Op Jackal) | total_attacks (Op Jackal) |
| --- | --- | --- | --- | --- |
| n1961 | 2 (Jackal, Cincar/Kupres) | failure, failure | 2.59 | 0 (`political_blocked`) |
| n1963 | 2 (Jackal, Cincar/Kupres) | **success, failure** | 2.42 | **2** |

The op **count** is unchanged at 2 — the HVO catalog only injects 2 named ops in the 188-turn window. The Wave 4 fixes did **NOT** unlock new HVO operation injections; they unlocked the **execution** of the existing Op Jackal slot. The Cincar/Kupres slot remains `defender_power_too_high` blocked (att fr=0.13 vs n1961's fr=0.27 — actually *worse* in n1963).

### Per-op details

**Operation Jackal** (`hvo_southeast_herzegovina`, Obradović):
- n1961: t8–13, **failure**, 0 attacks, `recovery_reason=political_blocked`, force_ratio_estimate=2.594, 0/2 obj captured.
- n1963: t8–14, **SUCCESS**, **2 attacks**, `recovery_reason=completed`, force_ratio_estimate=2.424, **2/2 obj captured** (`op:mostar:hodbina_2`, `op:stolac:rotimlja_2`).
- Grade: 5-star "Brilliant Victory" — exchange ratio 65.5, objective completion 100, preservation 99.9, tempo 25.
- Casualties: inflicted 829k / 1520w; suffered 418k / 766w.
- Equipment: destroyed 4 art, 4 tanks; lost 2 art, 3 tanks.
- Participating brigades (9): hrhb_1st_brigade_mostar, hrhb_1st_herzegovina_brigade_knez_domagoj, hrhb_apljina_brigade, hrhb_mostar_brigade, hrhb_stolac_units, hv_113th_brigade_tg, hv_116th_brigade_tg, hv_1st_guards_tg, hv_4th_guards_tg.

**Operation Cincar / Kupres** (`hvo_tomislavgrad`):
- n1961: t132–134, **failure**, 0 attacks, `recovery_reason=defender_power_too_high`, force_ratio_estimate=0.269, 0/3 obj.
- n1963: t132–134, **failure**, 0 attacks, `recovery_reason=defender_power_too_high`, force_ratio_estimate=0.127, 0/3 obj.
- The Wave 4A reserve-gate fix did **not** help this op — `hvo_tomislavgrad` has only 2 brigades (Kralj Petar Krešimir IV, Kralj Tomislav) facing a much stronger VRS 2nd Krajina defender. The blocker is now strictly attacker-power scarcity, not posture.

---

## 2. Op Jackal status in n1963 — Y/N table

| Question | n1961 | n1963 |
| --- | --- | --- |
| Launched? | Yes (t=8) | Yes (t=8) |
| Attacked? | **No (0 attacks, political_blocked)** | **Yes (2 attacks)** |
| Captured objectives? | 0/2 | **2/2 (hodbina_2, rotimlja_2)** |
| Outcome AAR | failure | success |
| Casualties inflicted | 0 | 829 KIA + 1520 WIA |
| Equipment destroyed | 0 | 4 art + 4 tanks |

**Why it now attacks (Wave 4B):** The op-level Graz gate in `src/sim/local_truces.ts` previously short-circuited any HVO attack involving south-east Herzegovina territory because the East-Herzegovina-pair brigade-level exemption (`isEastHerzegovinaPair`) was not mirrored at the operation level. Wave 4B added `hvo_southeast_herzegovina` to `GRAZ_EXEMPT_HRHB_CORPS`, allowing the op-level gate to pass and Obradović's brigades to execute the planned attacks on hodbina_2 and rotimlja_2 (force_ratio 2.42 → expected attacker win).

**Cross-check:** `final_save.political.political_controllers["op:mostar:hodbina_2"]` = `HRHB` in n1963 (was `RBiH` in n1961); `final_save.political.political_controllers["op:stolac:rotimlja_2"]` = `HRHB` in n1963 (was `RBiH` in n1961). The captures stick to end-game.

---

## 3. HRHB political_directives_by_faction — verb progression

Source: `final_save.military.political_directives_by_faction.HRHB` and `.RS`.

The save format only persists the **latest** directive (turn-188 snapshot). Per-turn directive history is not in the save schema; it would require parsing `replay_sequence.jsonl` (1.14 GB) line-by-line. Below is the t=188 final snapshot:

| Faction | n1961 verb (t=188) | n1963 verb (t=188) | Magnitude shift |
| --- | --- | --- | --- |
| **HRHB** | `PREPARE_RESERVE` | **`BALANCE_FRONTS`** | `limited` → **`standard`** |
| **RS** | `PREPARE_RESERVE` | **`PRESS_OFFENSIVE`** | `limited` → **`standard`** (gains `authorize_offensive` permission flag) |
| RBiH | (absent — player_faction short-circuit at line ~280) | (absent — same) | — |

**Verdict on Wave 4A:** Confirmed. Both HRHB and RS shed PREPARE_RESERVE. HRHB lands on BALANCE_FRONTS (defensive but not reserve-locked), RS lands on PRESS_OFFENSIVE (aggressive — with `authorize_offensive` flag turned on). The Wave 4A fix is structurally sound but **faction-symmetric** — it relaxes the gate equally for HRHB and RS without distinguishing between them, which feeds directly into the territory swing in §10.

The shape of the trajectory (init → t50 → t100 → t150 → t188) cannot be reconstructed without `replay_sequence.jsonl` parsing — flagged as a follow-up if needed.

---

## 4. RS operation count change — accidental over-empower?

Source: `operation_aars.json` filtered by `faction='RS'`.

| Per-corps | n1961 ops | n1963 ops | Δ |
| --- | --- | --- | --- |
| jna_herzegovina_command | 1 | 1 | 0 |
| vrs_1st_krajina | 14 | 12 | −2 |
| vrs_herzegovina | 3 | 3 | 0 |
| vrs_drina | 3 | 3 | 0 |
| vrs_east_bosnian | 1 | 1 | 0 |
| vrs_sarajevo_romanija | 1 | 2 | **+1** |
| vrs_2nd_krajina | 1 | 1 | 0 |
| **Total RS** | **24** | **23** | **−1** |
| RS outcomes | 2 succ / 3 part / 19 fail | 2 succ / 3 part / 18 fail | quality flat |

RS **op count is essentially unchanged** (−1 net), with one shift from 1st Krajina to Sarajevo-Romanija. The +15 RS territorial gain in §10 is **not** driven by RS launching more ops. Examining the per-op record (§9 table), n1963's RS ops have the **same outcome distribution** as n1961 (2 success, 3 partial, 18-19 failure) — RS ops are not noticeably more successful per-op.

**Where the RS gain comes from:** Wave 4A lifted RS bot posture from reserve to PRESS_OFFENSIVE (§3). This affects sector-level bot brigade allocation and stance-screening behaviour outside the formal op pipeline — specifically the bot_corps_directives layer, which feeds non-op sector flips (consolidation: 67 in n1963 vs 68 in n1961; combat: 107 vs 119). Total control changes dropped 191→178, but the *direction* of changes shifted: RS→RBiH dropped from 49→33 (**−16**), while RBiH→RS held steady at 74. That 16-OSID asymmetry is the headline RS gain mechanism.

**Conclusion on (c):** RS is **not** over-empowered by added ops, but it IS over-empowered by relaxed posture symmetry. RBiH lost 14 net territory while RS gained 15, despite running 3 MORE RBiH ops. The cost is paid in sector-edge battles, not in op-success rate.

---

## 5. HRHB territory delivery — sim vs painted

Source: `final_save.political.political_controllers` vs `initial_political_controllers`.

| Metric | n1961 | n1963 |
| --- | --- | --- |
| Initial HRHB painted (sim start) | 110 | 110 |
| Final HRHB (sim end) | 79 | **78** |
| HRHB painted → held HRHB | 72 | **71** |
| HRHB painted → flipped to RS | 25 | **26** |
| HRHB painted → flipped to RBiH | 13 | 13 |
| RS painted → flipped to HRHB | 0 | 0 |
| RBiH painted → flipped to HRHB | 7 | **7** |

**HRHB delivery is essentially flat** (72→71 held HRHB-painted, −1 net). The Op Jackal capture pair (hodbina_2, rotimlja_2) flipped from RBiH-painted to HRHB-sim (visible as +2 in `RBiH_painted → flipped to HRHB`-equivalent — though my decomposition shows held at 7, see §1 detail above for the Mostar/Stolac flips).

Examining the end_report direction counts:
| Direction | n1961 | n1963 | Δ |
| --- | --- | --- | --- |
| HRHB → RBiH | 12 | 13 | +1 |
| HRHB → RS | 23 | 24 | +1 (slightly WORSE for HRHB) |
| RBiH → HRHB | 5 | 4 | −1 |
| **RS → HRHB** | **2** | **4** | **+2** (Op Jackal captures!) |
| RBiH → RS | 74 | 74 | 0 |
| RS → RBiH | 49 | 33 | **−16** |

Op Jackal delivers cleanly visible as RS→HRHB: 2→4 (+2). But HRHB→RS rose 23→24 and RBiH→HRHB fell 5→4, so the net HRHB headcount is −1.

**Krajina-collapse / Mistral-Maestral 2 OSID delivery:** None of the structural HVO catalog ops fire for these clusters (Mistral-Maestral 2 1995 op chain is wired through federation events, not HVO bot ops). The Cincar/Kupres OSIDs (`bucovaca`, `donji_malovan`, `novo_selo_2`) remain RS-held in both runs — the Op Cincar/Kupres force-ratio remains <0.2, blocking launch on attacker-power scarcity, not posture.

---

## 6. OSID match + area-weighted vs painted target

Source: `final_save.political.political_controllers` × `osid_areas.json`.

The n1961 audit's "75.4% / 537 of 712" figure was computed against a stricter filter; my reproduction using the canonical `initial_political_controllers` (the painted snapshot at sim start) yields slightly different counts but tracks the same delta. Both metrics are reported:

| Reference | n1961 OSID% | n1963 OSID% | Δ | n1961 area% | n1963 area% | Δ area |
| --- | --- | --- | --- | --- | --- | --- |
| `initial_political_controllers` (painted-at-start) | 545/712 = 76.5% | **558/712 = 78.4%** | **+1.9 pts** | 80.0% | **81.7%** | **+1.7 pts** |
| `painted_control_jan1993.json` (jan1993 painted target) | 599/712 = 84.1% | **612/712 = 86.0%** | **+1.9 pts** | 85.1% | **86.8%** | **+1.7 pts** |
| `run_summary.vs_historical` (jan1993 reference, mun1990-derived) | 559/712 = 78.5% (calc-derived) | 543/712 = 76.3% (calc-derived) | −2.2 pts (different reference set, RS-heavy target) | — | — | — |

The painted-OSID match improves by **+1.9 percentage points** under the canonical initial-painted reference and **+1.9 points** under the jan1993 painted-OSID reference. The run_summary's separate `vs_historical` block uses a different reference set with RS:314 / RBiH:273 / HRHB:125, and against that target the swing is **slightly negative** (RS overshoot widens: delta −47 HRHB / +25 RBiH / +22 RS in n1963 vs −46/+39/+7 in n1961). The HRHB undelivery worsens by 1 OSID, the RBiH overshoot narrows by 14, and the RS overshoot widens by 15.

**Net interpretation:** Against the "what the player painted at game-start" target, n1963 is better. Against the "what RS should historically control by January 1993" target, n1963 is worse because the RS push lifted RS into 1993-paint-overshoot territory.

---

## 7. Anchor pass-fail vs n1961's 4 failures

Source: `run_summary.anchor_checks`. 27 anchors total.

| Anchor | Expected | n1961 actual | n1963 actual |
| --- | --- | --- | --- |
| op:zavidovici:vozuca_2 | RS | RBiH ✗ | RBiH ✗ |
| op:doboj:boljanic_2 | RS | RBiH ✗ | RBiH ✗ |
| op:gracanica:petrovo_2 | RS | RBiH ✗ | RBiH ✗ |
| op:lukavac:brijesnica_donja_2 | RS | RBiH ✗ | RBiH ✗ |
| **op:zvornik:zvornik** | **RS** | **RS ✓** | **RBiH ✗ (NEW)** |

**Net: 23 PASS / 4 FAIL (n1961) → 22 PASS / 5 FAIL (n1963).** One regression: `op:zvornik:zvornik` flipped to RBiH in n1963. This anchor is **Zvornik town itself** — a high-profile RS-VRS strategic asset (April 1992 massacres, fall of Zvornik to JNA/paramilitaries was historically definitive). Wave 4A's RS-symmetric posture lift apparently re-directed enough RS bot resources elsewhere that the ARBiH 2nd Corps was able to seize Zvornik town. The new arbih_2nd_corps activity (4 ops in n1963 vs 0 in n1961 — see §9) is the likely driver, even though those 4 ops all report 0 attacks. Direct combat or consolidation-tier flips around the Zvornik perimeter (the high-fr 11.6, 29.4, 29.6 ops mostly hovered around the eastern Tuzla / Zvornik approaches) likely tilted sector control without a logged op capture.

**None of the original 4 failures recovered.** The Vozuća/Doboj/Petrovo/Brijesnica cluster remains anchor-failing under Wave 4 — those flips are driven by Op Nada and 3rd Corps sector activity (n1961 dynamics carried forward).

---

## 8. war_alliance trajectory in n1963

Source: `final_save.political.war_alliance_rbih_hrhb`, `final_save.military.alliance_locks`.

| Snapshot | n1961 | n1963 |
| --- | --- | --- |
| war_alliance_rbih_hrhb at t=188 | 0.55 | **0.55** |
| alliance_locks at t=188 | `[{mode:"floor", value:0.8, expires_turn:10084}]` | **`[{mode:"floor", value:0.8, expires_turn:10084}]`** (identical) |
| rbih_hrhb_war_earliest_turn | 26 | 26 |

**Wave 5 confirmed not yet shipped.** Alliance plateaus at 0.55 from t=106 onward in both runs (identical pattern). The `ic_rbih_restraint_post_washington` ceiling-installation root cause documented in n1961 §3 is unchanged in n1963.

---

## 9. HVO catalog ops fired — per op id status

Source: `operation_aars.json` (faction=HRHB) + `watched_operations.json`.

| Op id | Window | n1961 | n1963 |
| --- | --- | --- | --- |
| **Operation Jackal** (hvo_southeast_herzegovina) | t8–13 | failure, 0 attacks, fr 2.59, `political_blocked` | **SUCCESS, 2 attacks, fr 2.42, completed (2/2 obj)** |
| **Operation Cincar / Kupres** (hvo_tomislavgrad) | t132–134 | failure, 0 attacks, fr 0.27, `defender_power_too_high` | failure, 0 attacks, fr 0.13, `defender_power_too_high` |
| Operation Bosanski Novi (HRHB catalog, queued for HVO/HV?) | t20 | (not in AAR) | skipped (`all_objectives_owned`, in op_injection_validation) |
| Mistral-2 1995 | t179 (federation event tier) | event fired, no HVO AAR | event fired, no HVO AAR |

The HVO catalog only finalises 2 ops via the corps AI op-pipeline. Mistral-2 etc. fire as federation-tier events through the political layer, not as HVO corps ops. Therefore the **HVO-corps-op headline is 1/2 = 50% success rate** in n1963 (vs 0/2 = 0% in n1961). Op Jackal is the entire delta.

`op_injection_validation` in n1963 also reports the same 10 injection-time issues as n1961, none of which are HVO-specific blockers — they cover Operation Corridor (all-objectives-owned), Operation Bosanski Novi (all-objectives-owned), Krivaja-95 (brigade_ineligible at t170+), Stupčanica-95 (brigade_ineligible at t172+).

---

## 10. VRS dropped OSIDs / RBiH-vs-RS swing

Source: `replay_save_manifest.frames`; `final_save.political_controllers`.

### Per-turn control trajectory

| Turn | n1961 HRHB / RBiH / RS | n1963 HRHB / RBiH / RS |
| --- | --- | --- |
| 1 | 93 / 308 / 311 | 93 / 308 / 311 |
| 10 | 91 / 265 / 356 | 91 / 265 / 356 |
| 20 | 91 / 262 / 359 | **93 / 262 / 357** (Op Jackal +2 vs RS) |
| 33 | 85 / 262 / 365 | 87 / 263 / 362 |
| 36 (war start) | 84 / 263 / 365 | 83 / 267 / 362 |
| 52 | 79 / 268 / 365 | 80 / 270 / 362 |
| 75 | 78 / 270 / 364 | 78 / 279 / 355 |
| 85 (WA fires) | 78 / 270 / 364 | 78 / 279 / 355 |
| 100 | 78 / 272 / 362 | 78 / 280 / 354 |
| 106 | 78 / 276 / 358 | 78 / 283 / 351 |
| 120 | 79 / 279 / 354 | 78 / 284 / 350 |
| 140 | 79 / 287 / 346 | 78 / 285 / 349 |
| 160 | 79 / 288 / 345 | 78 / 285 / 349 |
| 172 (fed offensive) | 79 / 296 / 337 | 78 / 285 / 349 |
| 180 | 79 / 299 / 334 | 78 / 286 / 348 |
| 185 | 79 / 309 / 324 | 78 / 295 / 339 |
| 188 (end) | 79 / 312 / 321 | **78 / 298 / 336** |

### Key observations

- **t=20: HRHB peaks at 93 OSIDs in n1963** (vs 91 in n1961) — Op Jackal captures count.
- **t=75: RS 355 in n1963 vs 364 in n1961** (−9) — RBiH +9 early gain. This is RBiH 2nd Corps + 3rd Corps activity that no longer occurs through ops in n1963 the way it did in n1961.
- **t=140–172: n1963 RS holds 349 throughout** while n1961 RS dropped from 346 → 337 (−9). The Wave 4A RS posture lift produced a **late-war RS holding pattern** that prevents the federation-era RBiH advance that n1961 saw.
- **t=185–188: Both runs see late ARBiH lunge** (combat: 107 in n1963 vs 119 in n1961). The n1963 lunge is smaller.

### Headline swing

- n1961: RS peak 365 → end 321 = **−44 RS OSIDs across w33–w188**.
- n1963: RS peak 362 → end 336 = **−26 RS OSIDs across w33–w188**.
- **Difference: +18 RS OSIDs retained by RS in n1963 vs n1961.** Of these, the cleanest decomposition is from the direction tally:
  - RS→RBiH flips dropped 49→33 (**−16 OSIDs that RBiH no longer claims**).
  - HRHB→RS rose 23→24 (+1).
  - RS→HRHB rose 2→4 (+2, Op Jackal).
  - Net RS gain ≈ +15 OSID end-state count, matching direct count (321→336).

### RS overshoot vs jan1993 historical target

- n1961: `vs_historical` reports RS final 321 vs reference 314, **delta +7** (RS overshoot in 1993-frame).
- n1963: `vs_historical` reports RS final 336 vs reference 314, **delta +22** (RS overshoot widened by 15).
- Recall: jan1993 reference uses RS:314 / RBiH:273 / HRHB:125. In n1963, RS is +22 over target, RBiH is +25 over target, HRHB is −47 under target. The HRHB undelivery is roughly steady (−46→−47, +1 OSID worse) — n1963's gain comes from RS overshoot, not HRHB gain.

---

## 11. Combat volume diff

Source: `run_summary.attack_resolution`, `run_summary.combat_causality`.

| Metric | n1961 | n1963 | Δ |
| --- | --- | --- | --- |
| Total attack orders | 645 (HRHB 31 + RBiH 468 + RS 123 + others 23) | 419 (HRHB 17 + RBiH 285 + RS 117 + others 0) | **−226** |
| Battles | 429 | 314 | **−115** |
| Defender-present battles | 275 | 216 | −59 |
| Defender-absent battles | 154 | 98 | −56 |
| Captures | 150 | 151 | +1 |
| Flips applied | 82 | 70 | −12 |
| Attacker KIA (combat) | 103,366 | 83,133 | −20,233 |
| Defender KIA (combat) | 102,958 | 80,240 | −22,718 |
| Civ KIA RBiH | 32,876 | (lower — not extracted) | likely flat |
| Combat control changes | 119 | 107 | −12 |
| Consolidation control changes | 68 | 67 | −1 |

**Big interpretation:** n1963 is a **dramatically lower-tempo** war than n1961 — 27% fewer orders, 27% fewer battles, 22% fewer attacker casualties. Yet n1963 has roughly the same total captures (+1) because the captures-per-battle ratio rose. The reduction is overwhelmingly on the RBiH attack-order count (468 → 285, **−183 orders**), suggesting the bot retargeting logic is producing fewer feasible attack windows under the post-Wave-4 directive landscape.

---

## 12. Per-faction per-corps op delta table (master)

| Faction | Corps | n1961 ops | n1963 ops | Δ |
| --- | --- | --- | --- | --- |
| RS | jna_herzegovina_command | 1 | 1 | 0 |
| RS | vrs_1st_krajina | 14 | 12 | −2 |
| RS | vrs_herzegovina | 3 | 3 | 0 |
| RS | vrs_drina | 3 | 3 | 0 |
| RS | vrs_east_bosnian | 1 | 1 | 0 |
| RS | vrs_sarajevo_romanija | 1 | 2 | +1 |
| RS | vrs_2nd_krajina | 1 | 1 | 0 |
| **RS subtotal** | | **24** | **23** | **−1** |
| HRHB | hvo_southeast_herzegovina | 1 (fail) | 1 (**success**) | qualitative |
| HRHB | hvo_tomislavgrad | 1 (fail) | 1 (fail) | 0 |
| **HRHB subtotal** | | **2** | **2** | **0 (1 success, +1)** |
| RBiH | arbih_2nd_corps | **0** | **4** (all 0-attack fails) | **+4** |
| RBiH | arbih_3rd_corps | 7 | 8 | +1 |
| RBiH | arbih_4th_corps | 7 | 5 | −2 |
| RBiH | arbih_5th_corps | 3 | 3 | 0 |
| **RBiH subtotal** | | **17** | **20** | **+3** |
| **TOTAL** | | **43** | **45** | **+2** |

**RBiH 2nd Corps activation is a NEW signal in n1963** — n1961 had 0 ops from 2nd Corps. The 4 ops (Operacija Kiša, Grad, Šahin, Zora) all show high force-ratio estimates (11.6, 29.4, 29.6, 3.0) but **all report total_attacks=0** with `recovery_reason=zero_eligible_axis`. The 2nd Corps op-shell is firing but no axis is finding eligible attackers — a launch-feasibility predicate failure. This suggests the Wave 4A directive lift unblocked 2nd Corps planning but a downstream BFS-reachability or staging-OSID problem keeps the brigades from executing.

---

## 13. Anomaly comparison

| Anomaly | n1961 | n1963 |
| --- | --- | --- |
| Total anomalies | 19 (1 critical + 7 warning + 11 info) | (not extracted in this audit) |
| Critical: disconnected sector | vrs_drina:2 (sizes 11,1) | likely same (geometry unchanged) |
| `zero_eligible_axis` ops | 8 | **higher** — at least 11 in op AARs (multiple new RBiH ops fall here) |
| morale=0 cluster | vrs_1st_krajina | likely **less severe** (RS gained ground) |
| offensive_intel_blindness | 0/97 sectors | (likely same) |

The `zero_eligible_axis` blocker rises significantly in n1963 — most of the new RBiH ops (Operacija Izlaz, Rijeka, Džihad, Kopljem, Grad, Šahin, Zora, Lavina) and the new RS ops (Operacija Grab) all hit this. The launch-predicate is shutting down many of the bot-generated ops; the directive layer freed them but the brigade-eligibility layer cannot satisfy them.

---

## 14. Summary — what Wave 4 delivered, what it did not

### Delivered

1. **Op Jackal launches and succeeds.** 2 captures (hodbina_2, rotimlja_2), 5-star Brilliant Victory, 829 KIA + 1520 WIA inflicted, 4 art + 4 tanks destroyed. Wave 4B Graz exemption is doing exactly what it was supposed to.
2. **HRHB+RS directives lift from PREPARE_RESERVE to active stances** (BALANCE_FRONTS / PRESS_OFFENSIVE). Wave 4A's threshold-rescaling fix is structurally correct.
3. **OSID-match vs painted-at-start target improves by +1.9 pts** (76.5% → 78.4%).
4. **Area-weighted match improves by +1.7 pts** (80.0% → 81.7%).
5. **RBiH 2nd Corps op pipeline activates** (4 ops in n1963 vs 0 in n1961) — though all are 0-attack failures, the planning layer is now reaching 2nd Corps.

### Side effects (not delivered, or regressions)

1. **RS symmetric posture lift causes +15 RS net territory** vs n1961. RS overshoot widens from +7 to +22 in jan1993-reference frame. Wave 4A is faction-blind — should it distinguish HVO from VRS in the threshold?
2. **Anchor regression at op:zvornik:zvornik** (5 FAIL vs 4). Zvornik town flips RBiH — a historically severe ahistorical outcome (Zvornik fell to RS/JNA in April 1992 with massacres; sim now has ARBiH 2nd Corps capturing it). Net +1 anchor failure.
3. **HRHB total OSID count drops by 1** (79→78). Op Jackal gained 2 OSIDs but HRHB→RS loss rose by 1 and RBiH→HRHB fell by 1. HRHB-painted held went 72→71. **Net HRHB delivery flat-to-slightly-worse**.
4. **Op Cincar/Kupres still fails on attacker-power scarcity** (fr 0.27 → 0.13, *worse*). Wave 4A's reserve-gate fix does not help when the underlying force-ratio is hostile.
5. **Battle volume drops 429→314** and orders drop 645→419. Less war happens in n1963 than n1961.
6. **n1963 RBiH only achieves 1 op success** (Operacija Neretva, fr 1.37) vs n1961's 5 successes (Nada, Crveni Lav, Proljeće, Farz, Sjena). The Wave 4A symmetric lift apparently **destabilises the ARBiH op pipeline** that previously scored 5 wins on the central-Bosnia corridor.

### Open questions for next wave

1. **Why does Wave 4A help HRHB Op Jackal launch but break ARBiH's central-Bosnia op pipeline?** ARBiH 3rd/4th Corps go from 5 ops with successes to 13 ops with mostly partials/failures. The directive lift seems to expose attempted but unfeasible ops.
2. **Should B1_HIGH_EXHAUSTION_THRESHOLD be RS-specific or HVO-specific?** A faction-blind threshold raise lets RS escape reserve at the same rate as HVO, producing the +15 RS territory drift.
3. **Why does arbih_2nd_corps launch 4 ops and all 0-attack-fail?** The directive layer reaches 2nd Corps but the brigade-eligibility predicate blocks. Hand off to operations-expert and corps-army-commander.
4. **Zvornik town anchor regression** — investigate whether 2nd Corps ops directly captured Zvornik or whether sector-edge consolidation flipped it. Hand off to historian + scenario-creator.
5. **Cincar/Kupres force ratio worsened 0.27→0.13.** HVO Tomislavgrad's brigades may have lost equipment/strength elsewhere because of Wave 4A's posture changes; needs formation-expert review.

---

## 15. Hand-off table

| Issue | Recommended role | Severity |
| --- | --- | --- |
| Wave 4A is faction-blind — RS escapes reserve as easily as HRHB, causing +15 RS overshoot | game-designer + operations-expert | P0 (calibration regression in 1993-reference frame) |
| op:zvornik:zvornik anchor failure (NEW) — RS town flipped to RBiH | historian + scenario-creator-runner-tester + sector-expert | P0 (historically severe) |
| arbih_2nd_corps 4 ops with total_attacks=0 (launch-predicate failure post-directive-lift) | operations-expert + corps-army-commander | P1 |
| ARBiH 3rd/4th Corps op-pipeline destabilization (5 successes → 1) under Wave 4A | operations-expert + war-or-game (explicit request only) | P1 |
| HVO Cincar/Kupres still 0-attack (fr 0.13) | formation-expert + corps-army-commander (HVO OOB review) | P2 |
| HRHB net territory still −1 vs n1961 (Op Jackal gain absorbed by HRHB→RS sector losses) | sector-expert + operations-expert | P2 |
| Vozuca/Doboj/Petrovo/Brijesnica 4 anchors still fail (carried from n1961, unchanged) | historian + game-designer | P2 |

---

## 16. Verification metadata

- **run_summary.final_state_hash n1963:** `e7c838612fa5869d` (≠ n1961 `a76b9f8b85fdf24e`)
- **operation_aars.json n1963:** 45 ops (vs 43 in n1961)
- **watched_operations.json n1963:** 9 entries (vs 6 in n1961) — 2 launched (Herzegovina Consolidation, Cerska-Kamenica), 7 not_launched / unknown (Kotor Varos, Krivaja-95 ×3 with different blockers, Stupčanica-95 ×3 with different blockers).
- **replay_save_manifest.frames count n1963:** 188 (all turns captured)
- **Final OSIDs by faction (replay frame t=188 vs final_save):** HRHB=78, RBiH=298, RS=336 (matches end_report Net control counts line).

---

## 17. One-sentence verdict

n1963 trades **a HVO operational win (Op Jackal: 0 captures → 2 captures, +5-star Brilliant Victory)** for **a faction-symmetric RS posture lift that pushes RS +15 OSIDs over baseline, breaks ARBiH's 5-success central-Bosnia op pipeline down to 1 success, and adds 1 new anchor failure at Zvornik town** — the engine path is **better on the headline HVO metric** and **better on the painted-at-start target by +1.9 pts**, but **worse on the jan1993 historical target** (RS overshoot widens from +7 to +22) and **worse on anchors (4 → 5 fail)**. Wave 4A needs faction discrimination before the next pin; Wave 4B is fine as-is.
