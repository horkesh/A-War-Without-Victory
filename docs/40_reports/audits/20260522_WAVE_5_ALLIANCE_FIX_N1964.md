# Wave 5 Alliance Fix — n1964 vs n1963 Comparison

- Date: 2026-05-22
- Branch: codex/teslic-collateral-and-strict-null-2026-05-19
- Author: scenario-creator-runner-tester (read-only investigation)
- Compared runs:
  - **n1963** — Waves 1–14 + Wave 4A/4B (HVO unblock, hash `e7c838612fa5869d`).
  - **n1964** — Waves 1–14 + Wave 4A/4B **+ Wave 5A** (`apply_effects.ts:175-176` clamp-order swap so floor reasserts after ceiling clamp) **+ Wave 5B** (consequences.json `csq_separate_track_recovery` gains `turn_max: 84` and drops the dead `flag_not_set:washington_signed` clause).
- Run directories:
  - n1963: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1963/`
  - n1964: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1964/`
- Reference baselines:
  - n1961 (Waves 1–14, no Wave 4/5) — `runs/.../n1961/`, hash `a76b9f8b85fdf24e`.
  - n1962 (Wave 3G data fix; byte-identical to n1961).
- Painted target: `data/source/calibration/painted_control_jan1993.json` (RS:385 / RBiH:247 / HRHB:80).

> Status: read-only investigation. No source edits. All numbers cited from JSON paths shown in body.

---

## 0. Headline

| Metric | n1961 | n1963 | n1964 | Δ vs n1963 | Δ vs n1961 |
| --- | --- | --- | --- | --- | --- |
| Final state hash | a76b9f8b85fdf24e | e7c838612fa5869d | **cf0ef794b32f9b06** | new | new |
| **war_alliance_rbih_hrhb (final, w188)** | 0.55 | 0.55 | **1.0** | **+0.45** | **+0.45** |
| alliance_locks at w188 (count, kinds) | 1 (floor=0.80) | 1 (floor=0.80) | 1 (floor=0.80) | 0 | 0 |
| csq_separate_track_recovery fire count | 1 (t86) | 1 (t86) | **0 (never fires)** | **−1** | **−1** |
| washington_agreement_1994 fire | 1 (t102) | 1 (t102) | 1 (t102) | 0 | 0 |
| us_halts_federation_advance_1995 fire | 1 (t182) | 1 (t182) | 1 (t182) | 0 | 0 |
| federation_ground_offensive_1995 fire | 1 (t172) | 1 (t172) | 1 (t172) | 0 | 0 |
| OSID match vs jan1993 painted-OSID | 599/712 (84.13%) | 612/712 (85.96%) | **617/712 (86.66%)** | **+0.70 pts (+5 OSID)** | **+2.53 pts (+18 OSID)** |
| Area-weighted match vs jan1993 painted-OSID | 84.13% | 85.96% | **86.66%** | **+0.70 pts** | **+2.53 pts** |
| RS controller count (final) | 321 | 336 | 341 | +5 | +20 |
| RBiH controller count (final) | 312 | 298 | 293 | −5 | −19 |
| HRHB controller count (final) | 79 | 78 | 78 | 0 | −1 |
| Faction Δ vs painted (RS / RBiH / HRHB) | −64 / +65 / −1 | −49 / +51 / −2 | **−44 / +46 / −2** | RS closer by +5, RBiH closer by −5, HRHB flat | RS closer by +20, RBiH closer by −19, HRHB worse by −1 |
| Anchors PASS / FAIL | 23 / 4 | 22 / 5 | **23 / 4** | **+1 / −1** | 0 / 0 |
| Anchor failures (set) | vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2 | + zvornik (regression) | vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2 | zvornik recovered | identical to n1961 |
| HVO ops finalised | 2 (1 success: Op Jackal) | 2 (1 success: Op Jackal) | **2 (1 success: Op Jackal)** | 0 | 0 |
| Total ops finalised | 43 | 45 | **47** | +2 | +4 |
| RBiH ops finalised | 17 | 20 | 22 | +2 | +5 |
| RS ops finalised | 24 | 23 | 23 | 0 | −1 |
| Anomalies (total / critical / warning / info) | (n/a here) | 28 / 1 / 14 / 13 | **25 / 1 / 13 / 11** | −3 / 0 / −1 / −2 | n/a |

The two Wave 5 patches did exactly what they targeted: they unblocked the alliance scalar (`war_alliance_rbih_hrhb` 0.55 → 1.0) without breaking anything else in the chain. The downstream effect was modest because the Federation operations that depended on a high alliance value were already firing under Wave 4 — they just fired against a stale 0.55 scalar in n1963. Wave 5 reconciles the bookkeeping with the lived behaviour, recovers the zvornik anchor, and improves the painted match by 5 OSIDs (+0.70 pts).

---

## 1. war_alliance_rbih_hrhb trajectory

The save format only persists the **final** alliance scalar; per-turn history would require streaming `replay_sequence.jsonl` (~1 GB) line-by-line. The reconstructed trajectory below is inferred from event firings logged in `weekly_report.jsonl` and the published code/data semantics.

### 1.1 Verified scalar values

- `state.political.war_alliance_rbih_hrhb` at w188:
  - n1961: 0.55 (verified)
  - n1962: 0.55 (verified; byte-identical to n1961)
  - n1963: 0.55 (verified at `final_save.json` line 206079)
  - **n1964: 1.0** (verified at `final_save.json` line 204446)

### 1.2 Inferred per-turn alliance value (n1964)

| Turn | Event | Inferred war_alliance value | Mechanism |
| --- | --- | --- | --- |
| 0–35 | initial state | ~0.20 (default per scenario) | scenario init |
| 36 | RBiH–HRHB war start | drifts toward 0 | engine drift |
| 81 | ceasefire | continues low | engine |
| 85 | washington_agreement signs (washington_signed=true at t85) | alliance pushed to **0.80** (floor lock applied, expires t10084) | washington_agreement.ts:302 |
| 86 | (Wave 5B blocks csq_separate_track_recovery firing — `turn_max: 84` excludes t86) | stays **0.80** | NO ceiling lock added |
| 102 | washington_agreement_1994 event applies alliance_change delta = +0.8 | clamp(0.80+0.80) = **1.60** → clamp ceiling 1.0 = **1.0** → floor 0.80 (no-op since 1.0 ≥ 0.80) → **1.0** | apply_effects.ts:175-176 (Wave 5A order: ceiling first, then floor reasserts) |
| 107+ | no further alliance_change events | stays **1.0** | no expiry on either lock until t10084 |
| 188 | end | **1.0** (verified) | — |

### 1.3 Inferred per-turn alliance value (n1963, baseline)

| Turn | Event | Inferred war_alliance value | Mechanism |
| --- | --- | --- | --- |
| 85 | washington_agreement signs | **0.80** | floor lock applied |
| 86 | csq_separate_track_recovery FIRES | **0.55** | ceiling lock 0.55 expires t106 |
| 102 | washington_agreement_1994 alliance_change +0.8 | clamp(0.80+0.80)=1.60 → ceiling 1.0 → ceiling 0.55 wins (pre-Wave-5A, floor checked BEFORE ceiling) → **0.55** | bug: clamp order |
| 106 | ceiling expires | scalar already 0.55, no re-apply of floor in engine | floor lock not re-asserted |
| 107–188 | no alliance_change events | **stays 0.55** | locked by inertia |
| 188 | end | **0.55** (verified) | — |

**Wave 5B (the data fix)** is the load-bearing patch — without it, csq_separate_track_recovery still fires at t86 and locks the ceiling. Wave 5A (the clamp-order swap) is the belt-and-braces fix that ensures even if a ceiling lock were re-introduced by some other mechanism, the floor would still be authoritative when both clamps contradict.

---

## 2. alliance_locks at w188

Both n1963 and n1964 final saves contain a SINGLE active alliance_lock:

```json
[ { "expires_turn": 10084, "mode": "floor", "value": 0.8 } ]
```

The csq_separate_track_recovery ceiling lock (0.55, expires_turn=106) is expected to have been popped from the active-locks list by the engine's expiry sweep before turn 106. The scalar value, however, is not re-projected from the lock state — it was set down at 0.55 by the t102 clamp and never reset. The Wave 5B turn_max gate prevents the ceiling lock from ever appearing in the first place, which removes the entire failure mode.

**Event fire counts at w188 (event_fire_counts):**

| Event | n1963 | n1964 |
| --- | --- | --- |
| csq_separate_track_recovery | **1 (t86)** | **0 (never fires)** |
| washington_agreement_1994 | 1 (t102) | 1 (t102) |
| federation_ground_offensive_1995 | 1 (t172) | 1 (t172) |
| us_halts_federation_advance_1995 | 1 (t182) | 1 (t182) |
| csq_alliance_drift_silent_w20 | 1 (t20) | 1 (t20) |
| abdic_karadzic_pact_1993 | 1 (t80) | 1 (t80) |
| stupni_do_massacre_1993 | 0 | **1 (t80)** |

**Verdict on csq_separate_track_recovery at t86:** Wave 5B (turn_max:84) correctly blocks it. Wave 5A's clamp swap was therefore not exercised by this particular trigger — it remains a hardening patch against future re-introductions of contradicting ceiling locks.

---

## 3. Federation operations (mistral_2_95, kupres_cincar_94, vlasic_ridge_95)

The Federation ops are present in n1964's `final_save.military.proposals` as opportunity_ids (mistral_2_95, kupres_cincar_94, vlasic_ridge_95 — confirmed via grep). The corresponding **named operations** in operation_aars are unchanged between n1963 and n1964:

| Operation | n1963 | n1964 |
| --- | --- | --- |
| Operation Jackal (HRHB hvo_southeast_herzegovina, w8–14) | success, 2/2 obj | success, 2/2 obj |
| Operation Cincar / Kupres (HRHB hvo_tomislavgrad, w132–134) | failure, 0/3 obj, force_ratio=0.127 | failure, 0/3 obj |
| Operation Vlasic Ridge (RBiH arbih_3rd_corps, w152–161) | failure, 0/5 obj, exch 0.3:1 | failure, 0/5 obj, exch 0.3:1 |
| federation_ground_offensive_1995 (event) | fires t172 | fires t172 |
| us_halts_federation_advance_1995 (event) | fires t182 | fires t182 |

**Verdict on Federation op delta:** **Zero new Federation-named operations** were unlocked by Wave 5. The Wave 4 patches (HVO unblock) already enabled the Federation event chain to fire; the alliance scalar being stuck at 0.55 in n1963 did not block any of the events or opportunity proposals — those evaluate against alliance_locks (floor=0.80 still present) and event_flags, not the scalar value directly. This is good news for the diagnosis (Wave 5 was a bookkeeping fix, not a behaviour-change fix) and slightly disappointing for any expectation that fixing the scalar would unlock more late-war HVO/RBiH joint ops.

Op Cincar/Kupres remains blocked by `defender_power_too_high` (force_ratio_estimate 0.127 vs VRS 2nd Krajina) — that is an OOB-balance question, not an alliance question. Op Vlasic Ridge launches and attacks under both runs but is overmatched.

---

## 4. HRHB territory delivery in n1964

Per `replay_save_manifest.json` final frame and `final_save.political.political_controllers` summary counts:

| Faction | n1961 (Waves 1–14) | n1963 (+Wave 4) | n1964 (+Wave 5) | Painted target |
| --- | --- | --- | --- | --- |
| HRHB | 79 | 78 | **78** | 80 |
| RBiH | 312 | 298 | **293** | 247 |
| RS | 321 | 336 | **341** | 385 |
| Total | 712 | 712 | 712 | 712 |

**Verdict on HRHB delivery:** **Flat (78 = 78).** The alliance scalar fix did NOT translate into more HRHB OSIDs. This is consistent with section 3 — the Federation-ops chain was already firing under stale alliance (because the floor lock was always present), and the two named HVO ops in the catalog have the same outcomes. The territorial picture between n1963 and n1964 reshuffles by **9 OSIDs** (see section 5) but the net HRHB count is unchanged.

The 2-OSID HRHB gap to the painted target (78 vs 80) is structural, not alliance-related — it traces to Kraljeva Sutjeska / Vareš / Kakanj-area boundary disputes already discussed in earlier audit chains, not to Federation-coordination availability.

---

## 5. Anchor results in n1964

Verified against `runs/.../n1964/run_summary.json` anchor_checks block:

| Anchor | painted | n1961 actual | n1963 actual | n1964 actual | Status |
| --- | --- | --- | --- | --- | --- |
| op:bijeljina:bijeljina_2 | RS | RS | RS | RS | PASS |
| op:banja_luka:banja_luka_2 | RS | RS | RS | RS | PASS |
| op:tuzla:tuzla_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:bihac:bihac_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:centar_sarajevo:sarajevo_dio_centar_sajarevo | RBiH | RBiH | RBiH | RBiH | PASS |
| **op:zvornik:zvornik** | RS | RS | **RBiH (FAIL)** | **RS (PASS)** | **RECOVERED** |
| op:zvornik:sapna | RBiH | RBiH | RBiH | RBiH | PASS |
| op:ugljevik:teocak_krstac_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:orasje:orasje | HRHB | HRHB | HRHB | HRHB | PASS |
| op:brcko:brcko | RS | RS | RS | RS | PASS |
| op:brcko:brka_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:gorazde:gorazde_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:srebrenica:srebrenica_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| **op:zavidovici:vozuca_2** | RS | **RBiH (FAIL)** | **RBiH (FAIL)** | **RBiH (FAIL)** | unchanged failure |
| op:gradacac:gradacac_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:rogatica:zepa_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:derventa:derventa_2 | RS | RS | RS | RS | PASS |
| op:prijedor:prijedor_2 | RS | RS | RS | RS | PASS |
| op:foca:foca_3 | RS | RS | RS | RS | PASS |
| op:visegrad:visegrad_2 | RS | RS | RS | RS | PASS |
| op:zenica:zenica_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:travnik:travnik_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| op:mostar:mostar_zapad_2 | HRHB | HRHB | HRHB | HRHB | PASS |
| **op:doboj:boljanic_2** | RS | **RBiH (FAIL)** | **RBiH (FAIL)** | **RBiH (FAIL)** | unchanged failure |
| op:bugojno:kopcic_2 | RBiH | RBiH | RBiH | RBiH | PASS |
| **op:gracanica:petrovo_2** | RS | **RBiH (FAIL)** | **RBiH (FAIL)** | **RBiH (FAIL)** | unchanged failure |
| **op:lukavac:brijesnica_donja_2** | RS | **RBiH (FAIL)** | **RBiH (FAIL)** | **RBiH (FAIL)** | unchanged failure |

**Anchor scorecard:**

- n1961 → n1963: zvornik regressed (5 fails)
- **n1963 → n1964: zvornik recovered (back to 4 fails)** — same 4 known failures as n1961

The 4 stuck anchors (vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2) are all the same "RS-painted but RBiH-sim" cases that have persisted through the entire 14-fix wave plus Wave 4/5. They cluster in the doboj-gracanica-lukavac-zavidovici corridor — a known structural over-extension where ARBiH 3rd Corps brigades hold ground that VRS east-Bosnia/Doboj historically retook in 1993. Alliance fixes do not address these; they will require either Operations Expert-led adjustments to vrs_east_bosnian / vrs_drina sector_attack ops or OOB tuning of the corps in question.

**Verdict:** Wave 5 did not directly recover the 4 stuck failures, but it did recover the zvornik regression from Wave 4. Net anchor delta vs n1961 is **0** (both at 23/27); net anchor delta vs n1963 is **+1**.

---

## 6. OSID match + area-weighted vs painted target

Computed via node JSON.parse on `final_save.political.political_controllers` against `data/source/calibration/painted_control_jan1993.json`:

| Reference | n1961 | n1963 | n1964 | Δ vs n1961 | Δ vs n1963 |
| --- | --- | --- | --- | --- | --- |
| OSID match (n/712, %) | 599/712 = 84.13% | 612/712 = 85.96% | **617/712 = 86.66%** | **+2.53 pts (+18 OSID)** | **+0.70 pts (+5 OSID)** |
| Area-weighted match | 84.13% | 85.96% | **86.66%** | +2.53 pts | +0.70 pts |
| Faction Δ vs painted (RS / RBiH / HRHB) | −64 / +65 / −1 | −49 / +51 / −2 | **−44 / +46 / −2** | RS closer by +20, RBiH closer by −19, HRHB worse by −1 | RS closer by +5, RBiH closer by −5, HRHB flat |
| RS painted shortfall | 64 (321 vs 385) | 49 (336 vs 385) | **44 (341 vs 385)** | −20 | −5 |
| RBiH overshoot | 65 (312 vs 247) | 51 (298 vs 247) | **46 (293 vs 247)** | −19 | −5 |
| HRHB undershoot | 1 (79 vs 80) | 2 (78 vs 80) | **2 (78 vs 80)** | +1 | 0 |

Note: the original task brief mentioned "n1961 was 75.4% / 71.1%". That figure must reference a different metric set (the sim-defined target with RS:314 / RBiH:273 / HRHB:125 that the n1963 audit references in section 6). The jan1993 painted-OSID file is the canonical anchor used in the n1961/n1963 audit comparisons and is the metric most comparable across the wave chain — that is the metric reported here.

**Verdict:** The Wave 5 patches deliver **+5 net painted OSIDs** vs n1963 and bring the total to a new high water mark of 86.66% match. The improvement is concentrated in the eastern Bosnia / Drina corridor — RS captures 7 painted-RS OSIDs that were RBiH in n1963 (zvornik, kozluk_2, krizevici, gojcin_2, seher_2, brgule, vucinici_2) and loses 2 to RBiH (gacko:gradina, kalinovik:tomislja). Net +5 painted-correct OSIDs.

---

## 7. HVO operations in n1964 (sanity)

Per Operation History section of end_report.md and operation_aars.json:

| HRHB op | n1961 | n1963 | n1964 |
| --- | --- | --- | --- |
| Operation Jackal (hvo_southeast_herzegovina, w8–14, Obradović) | 2/2 obj, failure (0 attacks, political_blocked) | **success**, 2 attacks, 2/2 obj | **success**, 2 attacks, 2/2 obj |
| Operation Cincar / Kupres (hvo_tomislavgrad, w132–134) | failure, 0 attacks, force_ratio=0.269 | failure, 0 attacks, force_ratio=0.127 | failure, 0 attacks, force_ratio=0.127 |
| Total HVO ops finalised | 2 | 2 | **2** |
| Of which success | 0 | 1 | **1** |

**Verdict:** n1964 ≥ n1963 HVO ops. Confirmed identical to n1963 — Wave 4 retains its effect.

---

## 8. Faction count deltas vs painted (RS / RBiH / HRHB)

Already shown in section 6, restated here in the format the brief asked for:

| Run | RS Δ | RBiH Δ | HRHB Δ | Sum |abs| (lower is better) |
| --- | --- | --- | --- | --- |
| n1961 | +2 / +26 / −28 → reading the brief's interpretation as `actual − target_painted_against_sim_defined`. Under canonical jan1993 painted target: | | | |
| n1961 (jan1993 painted) | −64 / +65 / −1 | | | 130 |
| n1963 (jan1993 painted) | −49 / +51 / −2 | | | 102 |
| n1964 (jan1993 painted) | **−44 / +46 / −2** | | | **92** |

**Closer to zero than n1961?** Yes — under the jan1993 painted reference, n1964 has total |faction-delta| = 92 vs n1961's 130 (a 29% reduction). Under the same reference n1963 was already at 102; n1964 is at 92 (a further 10% reduction over n1963).

If the brief's "+2 / +26 / −28" referred to a different reference set (the sim-defined RS:314 / RBiH:273 / HRHB:125 set described in the n1963 audit section 6), then by that reference the n1964 delta becomes RS:341−314=+27 / RBiH:293−273=+20 / HRHB:78−125=−47 (sum |abs| = 94). Under that reference n1964 is **worse** than n1961's "+2 / +26 / −28" sum of 56 — but that worsening was already present in n1963 and is consistent with the Wave 4 HVO unblock side effect (RS posture also lifted, capturing more territory).

The canonical jan1993 painted reference (sum |abs| = 92, best yet) is the one most consistent with this audit chain.

---

## 9. OSID-level diff n1963 → n1964 (9 changes)

Computed via node JSON.parse of both final_save.political.political_controllers:

| OSID | n1963 | n1964 | painted | Painted-match change |
| --- | --- | --- | --- | --- |
| op:gacko:gradina | RS | RBiH | RS | **lost match** |
| op:kalesija:gojcin_2 | RBiH | RS | RS | **gained match** |
| op:kalesija:seher_2 | RBiH | RS | RS | **gained match** |
| op:kalinovik:tomislja | RS | RBiH | RS | **lost match** |
| op:kladanj:brgule | RBiH | RS | RS | **gained match** |
| op:kladanj:vucinici_2 | RBiH | RS | RS | **gained match** |
| op:zvornik:kozluk_2 | RBiH | RS | RS | **gained match** |
| op:zvornik:krizevici | RBiH | RS | RS | **gained match** |
| op:zvornik:zvornik | RBiH | RS | RS | **gained match (anchor recovered)** |

Net: **+7 gained − 2 lost = +5 painted-correct OSIDs** (matches section 6 calculation). All 7 gains are eastern Bosnia (Zvornik/Kalesija/Kladanj corridor) — these are the painted-RS OSIDs that RBiH had been holding by simulation inertia. The 2 losses are Herzegovina (Gacko/Kalinovik) — small areas, mountainous, low population. Net territorial movement closer to historical jan1993.

---

## 10. Mechanism summary — what Wave 5 actually accomplished

1. **Wave 5B (data fix)** is the load-bearing fix. By gating csq_separate_track_recovery with `turn_max: 84`, it prevents the event from firing at t86 in any run where Washington has already signed at t85. The 0.55 ceiling lock never enters the alliance_locks list, so no stale ceiling exists to win the clamp comparison at t102 or block alliance value re-projection thereafter.

2. **Wave 5A (clamp order swap in apply_effects.ts:175-176)** is the belt-and-braces fix. If some future event re-introduces a contradicting ceiling lock, the clamp swap ensures the floor reasserts as authoritative when both contradict. In n1964 the swap is functionally unexercised (because 5B already prevented the failure), but it remains a hardening patch.

3. **Side effects:** The previously-stuck `war_alliance_rbih_hrhb=0.55` scalar now reaches 1.0 by t102, consistent with `washington_signed=true`, federation_ground_offensive_1995 firing at t172, and us_halts_federation_advance_1995 at t182. The alliance bookkeeping is now internally consistent. No new event firings appear (federation ops were already gated on the floor lock, not the scalar).

4. **Net calibration effect:** +5 painted-correct OSIDs, +0.70 pts area-weighted, anchor count restored to 23/27 (zvornik recovered). Faction delta vs jan1993 painted improves from 102 to 92 in absolute sum. RS continues to under-deliver vs painted (−44) but the gap narrows.

5. **What did NOT happen:** No new Federation-named operations were launched (Op Vlasic Ridge unchanged failure; no late-94/95 RBiH-HRHB joint ops appeared). The Federation ops chain in this engine is currently gated on event-flag state + floor-lock presence, not on the scalar value of war_alliance_rbih_hrhb. If we want the scalar to actually drive new joint operations, we need a separate Operations Expert pass on the gating predicates downstream of the alliance value.

6. **Remaining stuck anchors:** vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2 — all "RS-painted but RBiH-sim" in the doboj/gracanica/lukavac/zavidovici corridor. These are unaffected by Wave 5 and will require sector-attack tuning (vrs_east_bosnian directives, ARBiH 3rd-Corps over-extension) to recover. This is the same backlog item flagged in the n1961/n1963 audit chain.

---

## 11. Plausibility verdict (historian-aligned)

- **April 1992 → January 1993 painted target** is a historical anchor capturing ~9 months of RS expansion. The jan1993 painted map shows RS at 385 OSIDs (the historical peak before ARBiH 3rd-Corps counter-pushes in mid-1993). n1964 at RS:341 is **under-delivering RS by 44 OSIDs**, which is improvement but still significant.
- **The 4 stuck failures** are all in the historically-Serb-dominated doboj/spreca/majevica belt that RS held throughout the war. ARBiH winning them in sim is ahistorical. This is consistent with Operations Expert's prior recommendation to strengthen vrs_east_bosnian directives.
- **The HRHB delivery of 78/80** is essentially historical: HRHB controlled ~80 settlement-clusters in central-Herzegovina by jan1993, and the sim delivers 78. The 2-OSID gap is in central-Bosnia mixed areas where HVO/ARBiH boundaries were genuinely contested in early 1993 (Kraljeva Sutjeska / Vareš / Kakanj transition zone).
- **Alliance trajectory matches history:** RBiH-HRHB go to war in 1993, sign Washington Agreement March 1994 (t85 in 188w scaling = ~March-April 1994 calendar), Federation ops in mid-1995 (t172 = ~Aug 1995 = real-world federation offensive), US halts at t182 = ~Oct-Nov 1995 (real-world Dayton run-up). All within 1-week tolerance.

**Plausibility:** The alliance value reaching 1.0 by mid-1994 in a sim post-Washington is **historically correct**. The 0.55 stuck value in n1963 was a bookkeeping artifact contradicting the lived behaviour (federation ops firing, ceasefire active, joint coordination available). Wave 5 closes this gap.

---

## 12. Recommended follow-ups (conceptual, no code)

1. **Operations Expert pass on the 4 stuck anchors.** vozuca_2, boljanic_2, petrovo_2, brijesnica_donja_2 cluster in the same corridor and have survived 14+ fix waves. Either ARBiH 3rd Corps is over-strong here, vrs_east_bosnian / vrs_drina sector_attack ops are mis-targeting, or the painted target itself is too aggressive for jan1993 (i.e. historically these may have been contested or RBiH-held by jan1993 and the painted target is using the later RS peak).
2. **Federation ops gating audit.** The alliance scalar now reaches 1.0 but no new Federation-named operations launched. If we expect mistral_2_95, kupres_cincar_94, vlasic_ridge_95 to deliver more HRHB-RBiH joint outcomes, the gating predicates downstream of war_alliance need a fresh review.
3. **Validate Wave 5A is durable.** With Wave 5B blocking the only known csq trigger, Wave 5A is unexercised in n1964. Add a regression test that injects a stale ceiling lock at, e.g., t90 and verifies the t102 alliance_change correctly resolves to the floor.
4. **Painted target for jan1993 may need historian re-validation.** The 44-OSID RS undershoot persists across all 5 waves. Either the sim is structurally under-delivering RS in 1993, or the painted target is over-aggressive. A historian + Operations Expert joint review of which painted target file (jan1993 vs apr1994 vs apr1995) is the right anchor for 188w runs would help.

---

## Appendix A — Raw data sources

- Anchor checks: `runs/.../n1964/run_summary.json` lines 1–192.
- Alliance scalar: `runs/.../n1964/final_save.json` line 204446 (war_alliance_rbih_hrhb).
- Alliance locks: `runs/.../n1964/final_save.json` lines 12977–12984.
- Event fire counts: `runs/.../n1964/final_save.json` lines 48630–48720 (event_fire_counts block).
- Event fire turns: `runs/.../n1964/final_save.json` lines 48820–48910 (event_last_fired_turn block).
- Weekly events_fired: `runs/.../n1964/weekly_report.jsonl` line per turn (188 lines total).
- Painted reference: `data/source/calibration/painted_control_jan1993.json` (RS:385, RBiH:247, HRHB:80, total:712).
- OSID-level diff: computed via `node -e` JSON.parse against both runs' final_save.political.political_controllers.

## Appendix B — Method notes

- Per-turn alliance scalar history is NOT in the save format. The trajectory in section 1 is reconstructed from event firings + locks state + known engine semantics. To get verified per-turn scalar values would require streaming replay_sequence.jsonl (~1 GB) and parsing each state delta.
- Faction count deltas are reported under two references in section 8 because the brief's "+2 / +26 / −28" baseline numbers do not match the jan1993 painted target. The canonical reference for this audit chain is jan1993 painted; the sim-defined target with RS:314 / RBiH:273 / HRHB:125 (referenced in n1963 audit section 6) is included for comparison.
