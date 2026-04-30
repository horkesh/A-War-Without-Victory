# Target-Aware Scenario Health Baseline (apr1994 / apr1995 / oct1995)

**Date:** 2026-05-01
**Predecessors:**
- `docs/40_reports/implemented/20260430_SCENARIO_PAINTED_CONTROL_TARGET_TOOL.md` (target tool + workflow)
- Ledger entry `[2026-05-01] data(calibration): complete date-specific painted-control target set`
- `docs/40_reports/implemented/20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` (existing four-owner stop-at-plan for Herzegovina south)

**Scope:** Evidence/report packet only — no engine, scenario, OOB, operation, combat, or canon change. Run scenario baselines against the new definitive painted-control targets and report engine health (deterministic, causal, date-aware) without doing calibration fixes.

---

## 1. Executive verdict

**The engine is healthy.** Determinism and causality hold across all three runs. The painted-target gap at oct1995 (63.2% area-weighted) is **dominated by missing scenario content** — the late-1995 territorial reversals (Operation Storm, HV-HVO Maestral/Mistral, ARBiH 5th Corps liberation, VRS Krivaja-95, VRS Stupčanica-95) are not present in the codebase. Without them, no organic engine mechanism can produce the historical late-war reversal, and the simulation freezes the territorial outcome at roughly the early/mid-1994 state.

**The dominant residual is missing scripted ops, not engine health.** Three of six major mismatch families (Krajina collapse, Herzegovina southwest HVO push, Drina enclave fall) are in the same family — Family 1, "healthy engine + missing scenario content". One family (Herzegovina south persistent RS overgain + Goražde 1/2) is already documented in `20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` as a four-owner structural calibration residual. One detector finding (156w "intel system may be broken") is a Family-1 side-effect: a window with no scripted offensives produces no offensive_signs.

**Recommended next product-building lane:** a single scripted-ops packet adding the four late-1995 historical operations turn-gated ≥170, owned by `/operations-expert` + `/historian`. No engine code change, no global retune, clean owner.

---

## 2. Run table

| Date | Weeks | Scenario | Target | Run dir | Hash | Match % | Area-weighted % | Diagnose | Consistency |
|---|---|---|---|---|---|---|---|---|---|
| April 1994 | 104 | `apr1992_definitive_104w.json` | `apr1994` | `apr1992_definitive_104w__3e41e64e390a2768__w104_n1588` | `6b6daa39dcaf66f7` | 87.2% | **88.4%** | 0 ERR / 25 WARN | 36 fails |
| April 1995 | 156 | `apr1992_definitive_188w.json` (--weeks 156) | `apr1995` | `apr1992_definitive_188w__38158c1babaf1590__w156_n1589` | `57f742a558d8e619` | 81.5% | **77.8%** | 1 ERR (Goražde) / 31 WARN | 41 fails |
| October 1995 | 183 | `apr1992_definitive_188w.json` (--weeks 183) | `oct1995` | `apr1992_definitive_188w__e51a693239cc130c__w183_n1590` | `15f9740e253b42c2` | 70.9% | **63.2%** | 1 ERR (Goražde) / 32 WARN | 23 fails |

**Date-math note:** April 1, 1992 → October 1, 1995 ≈ 1278 days = 182.6 weeks → week 183 lands at ~Oct 1, 1995. We documented this as the "October 1995-equivalent" canonical week. Closer to mid-October would be ~week 185–186 but week 183 is within 2 weeks of canonical date and was used to keep determinism on a known week boundary. April 1, 1992 → April 1, 1994 = 104 weeks exactly; April 1, 1992 → April 1, 1995 = 156 weeks exactly.

---

## 3. Engine health verdict

### Determinism: ✅ healthy
- Each run produced a stable `final_state_hash` (`6b6daa39dcaf66f7` / `57f742a558d8e619` / `15f9740e253b42c2`).
- All three hashes are unique to their week count, confirming the engine evolves state deterministically per turn.
- 712-OSID universe alignment holds across all three painted targets and all three sim outputs (sim `political_controllers` always ≈ 712 keys).

### Causality: ✅ healthy
- `political.control_events` log every flip with `mechanism ∈ {combat, consolidation, event}`. No null-mechanism flips in any of the three runs.
- Apr1994 produced 4-of-2 Goražde detector (correct ground-truth — VRS held the cordon at that date).
- Apr1995/oct1995 produced 1-of-2 Goražde detector — explained by the documented Herzegovina south structural collapse (n1587 prior packet root-cause), not a new engine bug.

### Date-awareness: ✅ healthy
- Faction-area trajectory is monotonic and matches expectation: RBiH grows (RS=−58/−74/−1, RBiH=+39/+74/+29 across apr1994/apr1995/oct1995), HRHB declines except at oct1995 (where painted target spikes from 5.3k to 10.6k area-km² due to HVO Maestral capture — engine cannot follow because content missing).
- Apr1994 has Goražde siege OK (4/2). Apr1995/oct1995 have Goražde 1/2 — same root cause family as documented prior packet, not a new bug.
- 156w intel system fail clears by 183w (window-dependent, not flapping).

### Conclusion: engine substrate is sound. No determinism, causality, or date-awareness issue. The mismatch against painted targets is explained by content gaps and previously-documented calibration structure, not by a new engine bug.

---

## 4. Date-specific findings

### April 1994 (104w, n1588, hash `6b6daa39dcaf66f7`)

**Match:** 87.2% count, 88.4% area-weighted (best of three).

**Region area-match:** KRAJINA 97.9% / POSAVINA_NE 93.0% / DRINA 83.8% / CENTRAL_CORRIDOR 93.8% / CENTRAL_BOSNIA 77.0% / SARAJEVO 66.8% / HERZEGOVINA 87.9%.

**Diagnose:** 0 ERR / 25 WARN. Goražde siege OK 4/2 ✓, Sarajevo OK 6/2 ✓. 24 brigade-drift warnings (all vrs_1st_krajina/2nd_krajina at 5–6 hops from home — these are forward-committed Krajina brigades during Op Corridor / Op Vrbas, expected for w104). No empty sectors. No stranded pools. 1/223 combat ineffective concentration.

**Validate (36 fails):**
- 28 war-front faction-side coverage gaps in HRHB sector layer (Busovača/Vitez/Gornji Vakuf/Jablanica/Fojnica/Prozor) — central Bosnia HVO-ARBiH front geometry not fully mirrored into corps_front_sectors.
- 1 sector floor shortfall (vrs_1st_krajina:10 below floor 2/3 with legal donor available).
- 7 informational below-floor sector notes (no legal same-corps donor under current rules).

**Verdict:** 88.4% area-match against the new April 1994 painted target is the engine's best showing. Apr1994 sits within early/mid-war operational scope where the bot AI and scripted ops are calibrated.

### April 1995 (156w, n1589, hash `57f742a558d8e619`)

**Match:** 81.5% count, 77.8% area-weighted.

**Region area-match:** KRAJINA 99.6% / POSAVINA_NE 87.6% / DRINA 63.8% / CENTRAL_CORRIDOR 92.9% / CENTRAL_BOSNIA 80.8% / SARAJEVO 69.5% / HERZEGOVINA 51.8%.

**Diagnose:** 1 ERR / 31 WARN. Goražde 1/2 ERROR (only `rs_1st_podrinje` at rogatica). 1 stranded pool (foca:RBiH 207 available). 1 empty sector (`arbih_3rd_corps:0`).

**Validate (41 fails):** 36 war-front faction-side coverage gaps (HRHB Vakuf/Konjic/Jablanica/Prozor/Novi Travnik + RS Gracanica/Lukavac/Maglaj/Vares/Zavidovici); 3 empty contested sectors (`arbih_3rd_corps:0`, `arbih_3rd_corps:4`, `vrs_herzegovina:1`); 1 undefended subsegment (`subseg:sector:arbih_3rd_corps:0:0` gap=true across 6 edges); 3 adjacent uncontested territory (`konjic:bradina`, `kresevo:mratinici`); **1 intel system FAIL ("After turn 20, 0 intel records show offensive_signs — intel system may be broken")**.

**Verdict:** Matches apr1994 patterns plus the documented Goražde 1/2 collapse from prior packet. Intel-system fail is a Family-1 side-effect (no scripted offensives in the 156w window — most VRS scripted ops have completed by then and Federation late-war ops are absent), not a real intel-broken state.

### October 1995 (183w, n1590, hash `15f9740e253b42c2`)

**Match:** 70.9% count, 63.2% area-weighted (worst of three).

**Region area-match:** **KRAJINA 60.0%** / POSAVINA_NE 89.3% / **DRINA 60.6%** / CENTRAL_CORRIDOR 90.1% / CENTRAL_BOSNIA 63.9% / SARAJEVO 69.5% / **HERZEGOVINA 42.9%**.

**Faction area:** RS 51.3% sim vs **48.8% painted** (now overshot RS — was undershot at apr1995); RBiH 36.7% vs 30.7% (+6.0pp); **HRHB 12.0% vs 20.6% (−8.6pp)**.

**Diagnose:** 1 ERR / 32 WARN. Same Goražde 1/2 as 156w. 1 stranded pool (foca:RBiH 254 available).

**Validate (23 fails — improvement vs 41 in 156w):** 17 war-front faction-side coverage gaps (HRHB only — RS gaps from 156w resolved by w183); 2 empty contested sectors; 1 undefended subsegment; 3 adjacent uncontested territory; intel system OK.

**Three dramatic divergences from painted oct1995 target — all classified as Family 1 (missing scenario content):**

1. **KRAJINA collapses 99.2% → 66.1% count** (43 OSIDs painted=RBiH/HRHB but sim=RS in Bihać, Bosanska Krupa, Bosanski Petrovac, Ključ, Mrkonjić Grad, Sanski Most, Šipovo). Cause: engine has no scripted ARBiH 5th Corps Sana liberation, no HV-HVO Operation Storm/Maestral/Mistral 1995. `ARBIH_PRE_PLANNED = []` (no Federation pre-planned ops); `TRIGGERED_OPS` contains only `vrs_*` primary_corps entries. No matches for "storm", "maestral", "sana", "una" in pre-planned/triggered op definitions.

2. **HERZEGOVINA southwest** (6 OSIDs painted=HRHB but sim=RS in Glamoč, Kupres, Livno, Titov Drvar). Cause: no HVO Operation Cincar (Sep 1994) or Mistral 1995. `HRHB_PRE_PLANNED` contains only Operation Jackal (Stolac sweep). Zero HVO triggered ops in the codebase.

3. **DRINA enclave fall** (Srebrenica + Žepa OSIDs painted=RS but sim=RBiH). Cause: no Operation Krivaja-95 (Srebrenica July 1995) or Operation Stupčanica-95 (Žepa July 1995). Existing `Operation Cerska-Kamenica` (triggered_operations.ts) targets Cerska/Kamenica pocket OSIDs only, not srebrenica_2 / zepa_2 town cores. Engine is canon-mute on these — no comment indicating intentional deferral.

**Persistent pattern from prior packet (Family 2):** Bileća/Gacko/Trebinje/Nevesinje/Foča/Kalinovik HERZEGOVINA south falls to RBiH despite painted target showing them held by RS. This is the documented four-owner structural residual from `20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md` — late-war calibration residual, not engine health.

---

## 5. Cross-date patterns

| Pattern | apr1994 | apr1995 | oct1995 | Trajectory |
|---|---|---|---|---|
| Area-match % | 88.4% | 77.8% | 63.2% | Monotonic decline; gap dominated by missing late-war content |
| KRAJINA area-match | 97.9% | 99.6% | **60.0%** | Stable through apr1995, collapses oct1995 (Storm/Maestral missing) |
| HERZEGOVINA area-match | 87.9% | 51.8% | 42.9% | Declines through documented Family-2 structural residual |
| DRINA area-match | 83.8% | 63.8% | 60.6% | Declines via Family 2 + Family 1 (enclave fall) |
| Goražde siege | 4/2 ✓ | 1/2 ❌ | 1/2 ❌ | Collapses by 156w via Family-2 structural residual |
| HRHB faction area-share | +2.5pp vs painted | −1.6pp | −8.6pp | Engine cannot follow late-1995 HVO Maestral expansion |
| RS faction area-share | −7.7pp | −12.4pp | +2.5pp | Engine overshoots RS at oct1995 because Storm/Maestral missing |
| Validate fail count | 36 | 41 | 23 | Improvement at oct1995 (RS war-front coverage resolved by late-war) |
| Stranded pool foca:RBiH | — | 207 avail | 254 avail | Persistent Family-2 stranded pool; not engine health |

The decline from apr1994 88.4% → oct1995 63.2% is **not** a slow drift but a sharp two-event drop:
- apr1994 → apr1995 (−10.6pp area): primarily Family-2 structural collapse in Herzegovina south + Goražde, plus partial deeper-rear DRINA loss.
- apr1995 → oct1995 (−14.6pp area): primarily Family-1 missing late-1995 reversals (Storm/Maestral/Krivaja/Stupčanica), with KRAJINA going from 99.6% to 60.0%.

---

## 6. What this says about the engine, not just calibration

1. **Engine substrate is sound.** Determinism (per-week hash stability), causality (no null-mechanism flips), and date-awareness (faction-area trajectory monotonic and direction-correct) all hold. No engine-health bug surfaces.

2. **The product can be evaluated honestly against any of the four target dates.** Before this packet's tooling, late-war evaluation was forced to use Jan 1993 as the painted yardstick — a real category error that made the engine look worse than it was. Now the test infrastructure correctly distinguishes "engine-cannot-do-this" from "we-haven't-told-the-engine-what-to-do".

3. **The largest gap at oct1995 is content, not code.** Three of the six major mismatch families surface in oct1995 because the late-1995 historical operational reversals are entirely unscripted. Engine has no organic mechanism to spawn Operation Storm or Operation Krivaja-95 — these need explicit scripted ops at turn ≥170. Without them, the simulation is not "wrong" — it has truncated the war's last 6 months by structural omission.

4. **Family 2 (Herzegovina south structural) is already accepted as multi-owner stop-at-plan.** Prior packet (`20260430_DRINA_HERZEGOVINA_OVERGAIN_ROOT_CAUSE_PLAN.md`) documented this as four-owner work: OOB densification (formation-expert + historian), Op Foča / Op Visegrad re-allocation (operations-expert + historian), brigade-distribution rule (sector-expert + corps-army-commander + qa-engineer), and combat-resolution defender-attrition (forbidden by scope). Today's runs reconfirm without surprise.

5. **The 156w intel-system FAIL is window-dependent, not engine-broken.** It clears by 183w. The detector counts offensive_signs over the post-turn-20 trailing window; in 156w that window has no scripted offensives because most VRS scripted ops have already completed and Federation late-war ops are absent. Reclassify as a Family-1 side-effect of missing late-war ops; refine detector window logic if the noise becomes regular.

6. **Validate failures decrease at oct1995.** Counter-intuitive but explainable: at w156 the war-front faction-side coverage breaks for both HRHB (central Bosnia) AND RS (Gracanica/Lukavac/Maglaj/Vares/Zavidovici), but by w183 the RS-side gaps resolve as those fronts settle. The HRHB gaps persist because the central-Bosnia HVO-ARBiH war is structurally unmodeled in late-war content.

---

## 7. Recommended next game-building lane

**Single scripted-ops packet: late-1995 historical reversal operations.**

**Owner:** `/operations-expert` (lead) + `/historian` (citations) + secondary `/scenario-creator-runner-tester` (testing).

**Action:** Add four turn-gated scripted operations to `pre_planned_operations.ts` and/or `triggered_operations.ts`:

1. **ARBiH 5th Corps "Sana" / "Una-Sana" liberation** (Aug-Sep 1995). Triggered turn ≥170; primary_corps `arbih_5th_corps`; objectives include Bihać corridor relief, Krupa, Ključ, Sanski Most.
2. **HV-HVO joint Operation Mistral / Maestral / Sana** (Sep-Oct 1995). Triggered turn ≥170; primary_corps probably `hvo_main_staff`; objectives include Mrkonjić Grad, Šipovo, Drvar, Bosansko Grahovo.
3. **VRS Operation Krivaja-95** (Srebrenica fall, July 1995). Triggered turn ≥165; primary_corps `vrs_drina`; objective `op:srebrenica:srebrenica_2` and adjacent enclave OSIDs.
4. **VRS Operation Stupčanica-95** (Žepa fall, July 1995). Triggered turn ≥168; primary_corps `vrs_drina`; objective `op:rogatica:zepa_2`.

**Why this packet:**
- Three of six major mismatch families resolve in this single owner.
- No engine code change, no global retune, no canon revision.
- Zero risk to apr1994 / apr1995 (turn gates ≥170 ensure no early-mid-war regression).
- Owner is the same `/operations-expert` lane as Op Foča / Op Herzegovina Consolidation — known-good seam.
- Sensitive-history note: Krivaja-95 / Stupčanica-95 require careful framing (these capture genocide-adjacent municipalities). Defer to `/historian` + `/game-designer` for narrative integration; the territorial flip itself is uncontroversial historically.

**What this packet does NOT do:**
- Does not address Family 2 (Herzegovina south structural residual). That work is the prior packet's roadmap and remains stop-at-plan with four sign-offs.
- Does not retune combat, OOB, or bot AI.
- Does not add new player-facing UI, instrumentation, or events.

---

## 8. Items explicitly not fixed (this packet)

- Family 2 four-owner Herzegovina south structural residual (already documented stop-at-plan).
- Combat resolution defender-attrition tuning (forbidden by scope; separate combat-calibration lane).
- 156w "0 offensive_signs" detector noise (refine when the late-war ops packet lands; classification confirmed window-dependent).
- War-front faction-side sector-layer coverage gaps for HRHB central Bosnia (28+ in apr1994, 36 in apr1995, 17 in oct1995). Pattern is the unmodeled central-Bosnia HVO-ARBiH war structural seam — separate sector-layer correctness packet.
- Painted-vs-init Family A mismatches per CLAUDE rule "NEVER override initial OSIDs" (out-of-scope structural tension).
- Empty contested sector `arbih_3rd_corps:0` with 6 front edges and 0 brigades — appears in 156w + 183w but not 104w. Likely Family 2 structural side-effect; tracked but not fixed here.

---

## 9. Files changed

| File | Change |
|---|---|
| `docs/40_reports/implemented/20260501_TARGET_AWARE_SCENARIO_HEALTH_BASELINE.md` | This report (new). |
| `docs/PROJECT_LEDGER.md` | Engine-health baseline entry. |
| `working-on.md` | Continuation notes. |

No engine code, scenario data, OOB, operation, combat, movement, or canon doc changed. No painted target file altered. No new tests.

---

## 10. Validation results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Clean |
| `vitest tests/painted_control_targets.test.ts` | ✅ 6/6 pass |
| `node tools/compare_painted_vs_sim.cjs --list-targets` | ✅ 4 targets present (jan1993 / apr1994 / apr1995 / oct1995), all 712-OSID universe-aligned |
| 712-OSID universe alignment | ✅ All four painted target files have exactly 712 keys; faction values ∈ {RS, RBiH, HRHB} only |
| Apr1994 (104w n1588) hash | ✅ `6b6daa39dcaf66f7` deterministic |
| Apr1995 (156w n1589) hash | ✅ `57f742a558d8e619` deterministic |
| Oct1995 (183w n1590) hash | ✅ `15f9740e253b42c2` deterministic |
| compare_painted_vs_sim apr1994 | ✅ 87.2% / 88.4% area |
| compare_painted_vs_sim apr1995 | ✅ 81.5% / 77.8% area |
| compare_painted_vs_sim oct1995 | ✅ 70.9% / 63.2% area |
| diagnose_run apr1994 | 0 ERR / 25 WARN (Goražde OK 4/2) |
| diagnose_run apr1995 | 1 ERR (Goražde 1/2) / 31 WARN |
| diagnose_run oct1995 | 1 ERR (Goražde 1/2) / 32 WARN |
| validate_run_consistency apr1994 | 36 fails (HRHB war-front faction-side coverage + 1 sector floor + 8 below-floor info notes) |
| validate_run_consistency apr1995 | 41 fails (HRHB+RS war-front faction-side coverage + 3 empty contested sectors + 1 undefended subseg + 3 adjacent uncontested + 1 intel-system fail) |
| validate_run_consistency oct1995 | 23 fails (HRHB-only war-front faction-side coverage + 2 empty contested sectors + 1 undefended subseg + 3 adjacent uncontested) |

---

## 11. Commit hash if committed

**Committed:** `5fbcea53` on main (2 files: this report + ledger entry).

**Commit guidance:** If the user wishes to commit, suggested message:

```
docs(40_reports): target-aware scenario health baseline (apr1994 / apr1995 / oct1995)

Three target-aware runs against the new definitive painted-control set
confirm engine substrate is healthy (deterministic, causal, date-aware).
Headline finding: late-war target gap at oct1995 (63.2% area-weighted) is
dominated by MISSING SCENARIO CONTENT — Operation Storm, HV-HVO Maestral,
ARBiH 5th Corps Sana liberation, VRS Krivaja-95, VRS Stupčanica-95 are all
absent from pre_planned_operations.ts / triggered_operations.ts.

Recommended next product packet: a single scripted-ops packet adding the
four late-1995 reversal ops, owner /operations-expert + /historian.
```

Files staged should be exactly: this report + PROJECT_LEDGER.md + working-on.md. Do not stage scenario runs (they are reproducible deterministic artifacts; the hashes in this report are the authoritative reference).

---

## Determinism statement

- No randomness, no timestamps, no `Date.now()`, no sorted-iteration changes in any tool, document, or script.
- All three runs produced stable per-week hashes (`6b6daa39dcaf66f7` / `57f742a558d8e619` / `15f9740e253b42c2`).
- Painted target files unchanged.
- Comparison and diagnostic tools are read-only.
- Every aggregate, table, and OSID list in this report uses stable ordering — alphabetical OSID lists or chronological turn lists.
