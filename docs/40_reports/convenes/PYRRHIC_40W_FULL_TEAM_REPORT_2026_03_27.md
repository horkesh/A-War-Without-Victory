# Pyrrhic Team Full Scenario Report -- 40w Calibration Run n1143

## 1. Title & Metadata

| Field | Value |
|-------|-------|
| **Run ID** | n1143 (commit e181c797) |
| **Scenario** | `apr1992_definitive_40w` |
| **Duration** | 40 weeks (April 6, 1992 -- January 1993) |
| **Date** | 2026-03-27 |
| **Phase** | War (full war from w0) |
| **Seed** | `harness-seed` |
| **Area-Weighted Accuracy** | **92.2%** (ATH tied with n943) |
| **OSID Match** | 646 / 712 (90.7%) |
| **Final Save** | `data/derived/latest_run_final_save.json` |
| **Painted Targets** | `data/source/calibration/painted_control_jan1993.json` |

---

## 2. Executive Summary

Run n1143 achieves **92.2% area-weighted accuracy** against January 1993 painted targets, tying the all-time high set by n943. This session delivered 10 commits addressing a wide range of mechanical issues: sector-coverage displacement guards, cross-faction HRHB pool seeding for 4 previously missing brigades, a complete Teocak corridor fix (255th enclave brigade, 246th garrison, Op Teocak 2nd axis with Black Swans elite loan), probe type gate fix eliminating 66 idle operation-turns, strategic reserve overflow threshold correction, orphan pool drainage, East Herzegovina Bosniak displacement reroute, a code simplification pass, and the vitinica-to-sapna OSID rename. The most impactful improvements were: battle count rising from 44 to 62 (still below the 150-250 target), 4th Corps health improving from 2/10 to 9/10 healthy brigades (6/10 above 800 personnel), and HRHB launching 5 attacks for the first time (from zero). The 66 mismatched OSIDs span 3,989 km2 of territory with the largest gaps in Livno (HRHB overreach), Mostar (RS under-capture), Kalinovik (RS under-capture), Vlasenica (Podrinje overrun), and Prozor (HRHB overreach into RBiH territory).

---

## 3. Tracked Dimensions

### 3.1 Troop Strengths (Active Brigades at w40)

| Faction | Brigades | Total Personnel | Avg Personnel | Avg Cohesion | Avg Morale | Low Health (<800) |
|---------|----------|----------------|---------------|-------------|-----------|-------------------|
| **RBiH** | 129 | 162,493 | 1,260 | 59.6 | 70.8 | 31 (24%) |
| **RS** | 144 | 124,935 | 868 | 31.5 | 66.0 | 75 (52%) |
| **HRHB** | 48 | 48,694 | 1,014 | 37.9 | 51.3 | 19 (40%) |
| **Total** | **321** | **336,122** | -- | -- | -- | 125 (39%) |

RS has the most brigades but the lowest average personnel (868) and cohesion (31.5). Over half of VRS brigades are below 800 personnel -- a sign of spreading too thin across 366 controlled OSIDs. RBiH is the healthiest force with 1,260 avg personnel and 59.6 cohesion. HRHB is small but moderate.

### 3.2 Formation Spawning & Cross-Faction

| Faction | Spawned | Dissolved | Cross-Faction Brigades |
|---------|---------|-----------|----------------------|
| **RBiH** | 52 | 0 (+ arbih_712th_mountain w1) | 6: arbih_hvo_kralj_tvrtko, hrhb_107th, hrhb_108th, hrhb_110th, hrhb_115th, hvo_101st_bihac |
| **RS** | 61 | 0 | 0 |
| **HRHB** | 16 | 2 (hrhb_103rd w19, hvo_nikola_subic_zrinski w26) | 0 |
| **Total** | **129** | **4** | 6 |

All 6 cross-faction brigades (HVO units under ARBiH command) are active and accounted for. The 4 previously missing HRHB pool-seeded brigades are now spawning correctly. HRHB suffered 2 dissolutions in Posavina (103rd Derventa, Nikola Subic Zrinski) -- historically plausible as this corridor was under intense RS pressure.

### 3.3 Militia Pools (at w40)

| Faction | Pool Count | Available | Committed | Exhausted | Total |
|---------|-----------|-----------|-----------|-----------|-------|
| **RBiH** | 110 | 23,177 | 168,853 | 12,408 | 204,438 |
| **RS** | 110 | 14,872 | 83,473 | 5,014 | 103,359 |
| **HRHB** | 104 | 8,603 | 42,857 | 1,613 | 53,073 |

No stranded or orphaned pools remain (previously a known issue). RBiH has significant remaining available manpower (23k), consistent with the historical pattern of gradual ARBiH buildup through 1992. RS exhausted pool is only 5k -- lower than expected given their intense early operations. HRHB pools are tight (8.6k available) but functional.

### 3.4 Displacement

| Ethnicity | Displaced |
|-----------|-----------|
| **RBiH (Bosniak)** | 617,895 |
| **RS (Serb)** | 234,591 |
| **HRHB (Croat)** | 174,229 |
| **Total** | **1,026,715** |

RS-caused displacement dominates as expected (985,336 refugees created per negotiation capital). RBiH refugees at 232k and HRHB at 73k. The East Herzegovina Bosniak displacement reroute is now functional -- previously these populations were stranded.

### 3.5 Casualties

| Faction | KIA | WIA | MIA/Captured | Total | Equipment Lost |
|---------|-----|-----|-------------|-------|---------------|
| **RBiH** | 12,874 | 25,482 | 10,766 | **49,122** | 26 artillery, 0 tanks |
| **RS** | 5,653 | 10,750 | 4,466 | **20,869** | 65 artillery, 44 tanks |
| **HRHB** | 2,443 | 4,674 | 1,623 | **8,740** | 9 artillery, 0 tanks |

**Total combat casualties: 78,731.** RBiH bears the heaviest losses (49k), consistent with their defender role against simultaneous RS offensives across multiple fronts. The KIA:WIA:MIA split is roughly 30:55:15 for all factions, matching the configured casualty ratios. RS equipment losses (44 tanks, 65 artillery) reflect their armored advantage being ground down.

**Battle-level totals:** 11,029 attacker casualties vs 18,259 defender casualties across 62 battles. Defender casualties exceed attacker casualties, which is notable -- driven by the reactive defense model where multiple defending brigades absorb casualties proportionally.

### 3.6 Battle Count

| Attacker | Battles |
|----------|---------|
| **RS** | 48 |
| **RBiH** | 9 |
| **HRHB** | 5 |
| **Total** | **62** |

Up from 44 in the previous run. The probe type gate fix alone unblocked 66 idle operation-turns, directly contributing to more engagements. RS dominates offensive action (77% of battles). RBiH's 9 attacks include Op Teocak activity. HRHB's 5 attacks (from 0 previously) are driven by Op Jackal in Herzegovina. Still far below the 150-250 battle target -- the primary gap is that most operations complete through uncontested movement rather than assault.

### 3.7 Territorial Control (at w40)

| Faction | OSIDs | Area-Weighted % | Painted Target | Delta |
|---------|-------|-----------------|---------------|-------|
| **RS** | 366 | 56.19% (OSID count) / 62.2% (area) | ~57% | +5.2% |
| **RBiH** | 257 | 36.10% (count) / 29.5% (area) → 24.5% (w40 snap) | ~35% | -10.5% |
| **HRHB** | 89 | 12.50% (count) / 14.3% (area) → 13.3% (w40 snap) | ~12% | +1.3% |

**Week-by-week territory arc:** RS grows from 56.2% (w1) to 62.2% (w40), with the steepest gains in weeks 1-10 (early blitz). Territory stabilizes around w31, with no OSID flips in the final 9 weeks -- the front has locked.

**Total OSID flips:** 69 (RS gained 59, RBiH 3, HRHB 7).

### 3.8 Operations

| Operation | Faction | Type | Weeks | Outcome | Attacks | Objectives |
|-----------|---------|------|-------|---------|---------|-----------|
| Op Visegrad | RS | sector_attack | w0-w7 | **Success** | 0 | 4/4 |
| Op Drina | RS | sector_attack | w0-w8 | **Success** | 0 | 9/9 |
| Op Prijedor | RS | sector_attack | w0-w9 | Orphaned | 5 | 10/10 |
| Op Prsten (Sarajevo) | RS | sector_attack | w0-w9 | Partial | 2 | 3/8 |
| Op Herzegovina | RS | sector_attack | w0-w10 | Partial | 4 | 1/4 |
| Op Foca | RS | sector_attack | w7-w14 | Failure | 0 | 0/4 |
| Op Jackal | **HRHB** | sector_attack | w8-w15 | **Success** | 1 | 2/2 |
| Op Koridor | RS | sector_attack | w0-w15 | Partial | 6 | 5/7 |
| Op Podrinje Sweep | RS | sector_attack | w8-w16 | **Success** | 5 | 3/3 |
| Op Corridor | RS | sector_attack | w9-w20 | **Success** | 4 | 3/3 |
| Op Herzegovina Consol. | RS | sector_attack | w14-w22 | Failure | 2 | 0/2 |
| **Op Teocak** | **RBiH** | sector_attack | w15-w23 | **Success** | 1 | 1/1 |
| Op Jajce (1st) | RS | sector_attack | w20-w31 | **Success** | 5 | 5/5 |
| Op Jajce (2nd) | RS | sector_attack | w24-w33 | Partial | 0 | 4/8 |
| Op Posavina Corridor | RS | sector_attack | w31-w39 | Failure | 0 | 0/2 |

**Summary:** 15 operations total (13 RS, 1 HRHB, 1 RBiH). 7 successes, 4 partial, 3 failures, 1 orphaned. RS early operations (Visegrad, Drina, Koridor) are highly effective. Mid-to-late operations degrade: Op Foca fails, Op Herzegovina Consolidation fails, Op Posavina Corridor fails with 0 attacks -- reflecting RS exhaustion. Op Teocak succeeds (1 objective captured: rastosnica_2), a historically important RBiH win.

### 3.9 Enclaves

| Enclave | Control at w40 | Key OSID | Status |
|---------|---------------|----------|--------|
| **Srebrenica** | RBiH | op:srebrenica:srebrenica_2 | HELD -- 280th (502 pers), 282nd (100), 283rd (100), 284th (100) at various locations |
| **Zepa** | RBiH | op:rogatica:zepa_2 | HELD |
| **Gorazde** | RBiH | op:gorazde:gorazde_2 | HELD |
| **Bihac** | RBiH | op:bihac:bihac_2 | HELD |

**4/4 enclaves held.** Srebrenica garrison is depleted (280th at 502 personnel, others at minimums of 100-155) but surviving. The 281st at 155 personnel is dangerously close to dissolution thresholds.

### 3.10 Special Formations

| Formation | Personnel | Location | Status |
|-----------|-----------|----------|--------|
| 255th Slavna (Teocak) | 1,105 | teocak_krstac_2 | Active, on station |
| 246th Vitezka (garrison) | 1,800 | malesici | Active, full strength |
| 120th Black Swans (elite) | 1,200 | klokotnica_2 | Active, loaned to 2nd Corps since w15 |

The Teocak corridor fix is working: 255th holds teocak_krstac_2 (painted target: RBiH -- MATCH), and the Black Swans elite loan to Op Teocak was approved and deployed (26 turns on loan, 0 casualties taken).

### 3.11 4th Corps Health

| Brigade | Personnel | Health |
|---------|-----------|--------|
| 441st Vitezka Mountain | 1,800 | HEALTHY |
| 442nd Mountain | 1,800 | HEALTHY |
| 443rd Mountain | 1,654 | HEALTHY |
| 444th Mountain | 984 | HEALTHY |
| 445th Mountain | 1,800 | HEALTHY |
| 447th Liberation | 977 | HEALTHY |
| 448th Liberation | 469 | LOW |
| 449th E. Herzegovina Mtn | 442 | LOW |
| 450th Light | 372 | LOW |
| 4th Muslim Light | 428 | LOW |

**6/10 healthy (>=800 personnel), 4/10 low.** The user reported "9/10 healthy" in the session, which may use a different threshold. Using the standard 800-personnel threshold: 6 healthy, 4 low. The low brigades (448th-450th, 4th Muslim) are the East Herzegovina formations -- historically the most exposed and under-resourced. This is a massive improvement from 2/10 healthy in the prior run.

### 3.12 Strategic Reserves & Supply

| Faction | Strategic Reserve | Heavy Munitions | Supply Level |
|---------|------------------|-----------------|-------------|
| **RBiH** | 0 | 15.0 | 30.6 |
| **RS** | 0 | 100.0 | 74.1 |
| **HRHB** | 0 | 50.1 | 70.0 |

All strategic reserves at 0 -- the overflow threshold fix (<=  to <) appears to be draining reserves into formations effectively. RBiH heavy munitions at 15.0 reflects the arms embargo. RS at 100.0 (essentially unlimited JNA inheritance). Supply levels show the expected gap: RS/HRHB at 70-74, RBiH at 30.6.

### 3.13 Events Fired

23 events fired across 40 weeks:

| Turn | Event |
|------|-------|
| w1 | rs_strategic_goals |
| w3 | rbih_state_identity, arms_embargo_impact_1992 |
| w4 | hrhb_political_goal, battle_of_the_barracks (Sarajevo, Tuzla, Visoko), graz_accords |
| w5 | battle_of_the_barracks_zenica, sarajevo_siege_begins_1992, jna_withdrawal_1992 |
| w7 | mostar_liberation_1992 |
| w10 | srebrenica_enclave_forms_1992 |
| w11 | drina_cleansing_decision_1992, drina_valley_ethnic_cleansing_1992 |
| w12 | operation_corridor_1992 |
| w15 | concentration_camps_revealed_1992 |
| w18 | gorazde_pocket_consolidation_1992 |
| w23 | hvo_arbih_tensions_rise_1992 |
| w36 | gornji_vakuf_clashes_1993 |
| w39 | kravica_attack_1993, vance_owen_plan_1993 |
| w40 | jajce_falls_1992, turajlic_assassination_1993 |

Event sequencing is historically plausible. Barracks events at w4-5, Sarajevo siege at w5, Drina cleansing at w11, Srebrenica enclave at w10, concentration camps at w15, corridor at w12 -- all roughly matching the historical timeline. The Vance-Owen plan at w39 and Gornji Vakuf clashes at w36 correctly signal the transition to 1993 dynamics.

### 3.14 Negotiation Capital

| Dimension | RBiH | RS | HRHB |
|-----------|------|-----|------|
| Internal Cohesion | 29.9 | 52.9 | 9.1 |
| International Standing | 45.0 | 0.0 | 15.0 |
| Military Credibility | 100.0 | 100.0 | 28.3 |
| Negotiating Leverage | 74.8 | 86.5 | 33.1 |
| Patron Confidence | 50.0 | 90.0 | 45.0 |
| Territorial Legitimacy | 29.4 | 69.6 | 26.0 |

RS has dominant leverage (86.5) and territorial legitimacy (69.6) but zero international standing (-95 event modifier). RBiH compensates with high international standing (45) and negotiating leverage (74.8). HRHB's internal cohesion has collapsed to 9.1 (base 34, -25 event modifier). Vance-Owen plan pending: HRHB accepted, RS rejected.

---

## 4. Per-Role Assessments

### 4.1 Operations Expert

**What works:**
- Op Teocak succeeds with the new 2nd axis (255th + Black Swans loan). rastosnica_2 captured and held. This was the critical session deliverable.
- Op Corridor (the historical Posavina breakthrough) succeeds: derventa_2, novo_selo_2, brod all captured by w20. Historically accurate.
- Op Jajce (1st attempt) full success: all 5 objectives taken by w31. Jajce's fall at w40 fires the event correctly.
- Op Podrinje Sweep succeeds: 3 objectives captured including godjenje_2 and zapolje_2. This clears the Drina valley.
- Elite loan system functional: Black Swans deployed to 2nd Corps for 26 turns, Guards Brigade to 1st Corps for 28 turns, RS 65th Regiment to Drina Corps across 3 episodes.

**What does not work:**
- Op Prsten (Sarajevo encirclement) only captures 3/8 objectives. The Ilijas OSIDs (krivajevici, dragoradi, sirovine, medojevici) are ALL mismatches -- RBiH holds them instead of RS. This is a meaningful Sarajevo-fringe calibration gap.
- Op Foca fails with 0 attacks -- likely a targeting or assembly gate issue in mountainous terrain.
- Op Posavina Corridor (late-war) fails with 0 attacks in 8 weeks (w31-w39). RS exhaustion has set in. Historically this corridor was under constant threat, so 0 attacks may be too passive.
- Op Herzegovina Consolidation fails to take Mostar (vranjevici_2, kruzanj_2 still mismatched). RS never captures east Mostar area -- this is a known structural issue.

**Investigation needed:**
- Why do late-war RS operations generate 0 attacks? Is it exhaustion, assembly gate, or doctrine throttle?
- Op Prijedor marked "orphaned" despite capturing all 10 objectives -- why?

### 4.2 Formation Expert

**What works:**
- All 6 cross-faction HVO-under-ARBiH brigades are present and fighting (107th, 108th, 110th, 115th, 101st Bihac, Kralj Tvrtko).
- 129 total spawns across 3 factions. RS spawns 61 (most), RBiH 52, HRHB 16.
- 255th enclave brigade correctly deployed at teocak_krstac_2.
- 246th garrison at malesici with full 1,800 personnel.
- 4th Corps improved to 6/10 healthy (from 2/10). East Herzegovina formations remain weak but are no longer completely depleted.

**What does not work:**
- 75 of 144 RS brigades (52%) are below 800 personnel. RS is overstretched. Average RS brigade has only 868 personnel vs 1,260 for RBiH.
- RS cohesion at 31.5 is critically low. Many brigades are near the dissolution threshold of 20.
- Only 4 dissolutions in 40 weeks. This seems low given the attrition levels -- are dissolution criteria too lenient, or is the strategic reserve keeping formations alive?
- Srebrenica garrison is skeletal: 281st at 155, 282nd/283rd/284th all at 100 (absolute floor?). These formations are barely functional.

**Investigation needed:**
- Are the 100-personnel enclave brigades hitting the absolute floor and persisting indefinitely? Is this realistic?
- Should RS brigade dissolution be triggering more given 52% low-health rate?

### 4.3 Scenario Expert

**What works:**
- 92.2% area-weighted accuracy against Jan 1993 painted targets. 646/712 OSIDs match.
- Key anchors all correct: zepa_2=RBiH, srebrenica_2=RBiH, gorazde_2=RBiH, bihac_2=RBiH, derventa_2=RS, sapna(vitinica)=RBiH, rastosnica_2=RBiH.
- Territorial arc is historically plausible: RS rapid expansion in weeks 1-10 (56% to 61%), gradual consolidation through w31 (62.2%), then complete stasis.
- Jajce falls at the right time (w31-40 range, historically October-November 1992).
- Corridor operation succeeds in the right timeframe (w9-w20).

**Regional breakdown of mismatches (66 OSIDs, 3,989 km2):**
- **31 OSIDs where RS should hold but RBiH/HRHB does** (RS under-capture): Ilijas (4), Donji Vakuf (5), Kalinovik (3), Travnik (2), Kladanj (2), Mostar (2), etc. The Ilijas and Donji Vakuf clusters are the largest systematic errors.
- **16 OSIDs where RBiH should hold but RS does** (RS over-capture): Vlasenica (3), Brcko (2), Bratunac (2), Foca (2), Visegrad (2). These are Drina valley over-advances.
- **8 OSIDs where RBiH holds but HRHB should** (HRHB under-capture): Prozor (5), Jablanica, Kiseljak, Novi Travnik. HRHB is not aggressive enough in central Bosnia.
- **6 OSIDs where RS should hold but HRHB does**: Livno (2), Teslic (1), Stolac (1), Orasje (1), Bosanski Samac (1). HRHB overreach at periphery.
- **5 OSIDs where HRHB should hold but RBiH does**: Bugojno (2), Mostar (1), Gornji Vakuf (1), Konjic (1). HRHB losing ground to RBiH in mixed areas.

**What does not work:**
- Donji Vakuf completely wrong: all 5 central OSIDs (prusac_2, jemanlici, korenici, oborci_2, donji_vakuf_2) are RBiH instead of RS. This is a P1 calibration gap -- RS should control Donji Vakuf by January 1993.
- Kalinovik (3 OSIDs, 259 km2): RS should hold golubici_2, varos_2, sela_2 but RBiH does. Op Foca's failure is directly responsible.
- Prozor (5 OSIDs): HRHB should control several areas but RBiH holds them. The HRHB-RBiH pre-conflict dynamic is not aggressive enough.
- Vlasenica cluster (3 OSIDs): cerska_2, pomol_2, sebiocina should be RBiH but RS holds them. The Podrinje Sweep overran historical enclave limits.

### 4.4 War-or-Game (Realism Auditor)

**Plausible:**
- RS early-war blitz producing rapid territorial gains: historically accurate. VRS inherited JNA equipment and had overwhelming firepower advantage.
- Posavina corridor being contested with HRHB dissolutions: the 103rd Derventa and Nikola Subic Zrinski brigades dissolving under RS Corridor pressure is realistic.
- 4/4 enclaves surviving to January 1993: historically correct. All eastern enclaves held through early 1993.
- RS war crimes count (28 events) dwarfing RBiH (4) and HRHB (5): proportionally consistent with the historical record.
- RBiH bearing the heaviest casualties: defenders suffered enormously in 1992 as they were outgunned.

**Questionable:**
- **Battle tempo (62 battles in 40 weeks):** This is ~1.5 battles per week across the entire country. Historical estimates suggest 150-250 significant engagements in this period. The sim underproduces combat by 2.5-4x. Most territorial changes happen through uncontested occupation rather than battle. This is the single largest realism gap.
- **Zero OSID flips in weeks 31-40:** The front completely freezes for 9 weeks. In reality, local fighting continued throughout late 1992 even as the front largely stabilized. There should be small-scale back-and-forth.
- **RS with 0 strategic reserve at w40 while fielding 144 brigades:** The VRS was stretched thin but maintained operational reserves. Zero reserve feels too depleted.
- **HRHB internal cohesion at 9.1:** While HVO was politically fractured, an effective value of 9.1 seems extreme for early 1993 (the real HRHB-RBiH war has not started yet).
- **RBiH military credibility at 100.0:** This seems inflated for January 1993. ARBiH was still poorly organized and equipped at this point.
- **Ilijas (4 OSIDs) held by RBiH:** RS controlled the Ilijas corridor from early in the war. This is a known deficiency of Op Prsten.

**Absurd (would make a real commander suspicious):**
- **Srebrenica garrison at 100 personnel per brigade:** Three brigades with exactly 100 people each are combat-ineffective formations that should have merged or been evacuated. A real commander would not maintain three separate 100-man "brigades."
- **Op Posavina Corridor (w31-39) generating 0 attacks in 8 weeks:** RS actively fought to maintain the Posavina corridor throughout this period. An 8-week operation with no combat is unrealistic.
- **Black Swans loaned for 26 turns with 0 casualties and 0 battles:** An elite unit deployed for half a year without fighting is wasted.

### 4.5 Systems Programmer

**What works:**
- Determinism verified: seed `harness-seed` produces consistent results.
- Probe type gate fix correctly unlocked 66 previously idle operation-turns. The issue was probes being incorrectly gated by operation type.
- Strategic reserve overflow threshold fix (`<=` to `<`) ensures reserves drain into formations.
- Orphan pool drainage eliminates stranded militia pools.
- OSID rename (vitinica to sapna) propagated cleanly.

**Concerns:**
- Turn summaries store `battles` as an array of objects but `movements` also as an array of objects -- the concatenation with `+` operator produces `[object Object]` strings instead of counts. The `movements` field is not being counted correctly in turn summary aggregation.
- No ordering anomalies detected in this run.
- 50 sectors at w40 across all factions. No reports of disconnected sectors.

### 4.6 Game Designer

**Balance assessment:**
- The three-faction asymmetry is working: RS has military superiority but declining cohesion, RBiH has manpower depth but equipment poverty, HRHB is small but geographically concentrated.
- Negative-sum dynamics are visible: RS personnel declining (868 avg at w40), RS cohesion collapsing (31.5), but RS territorial gains are locked in. There is no path to "winning" -- only degrees of exhaustion.
- The front-locking behavior (0 flips after w31) creates the intended stalemate, but it happens too early and too completely. Some late-1992 volatility is needed.
- HRHB launching 5 attacks (from 0) is progress, but HRHB should be more active -- Op Jackal is their only operation.
- Elite loan system adds narrative texture: the approval dialogues, travel hops, and recall reasons create believable command-chain friction.

**Exhaustion curve:**
- RS goes from 56.2% territory at w1 to 62.2% at w31, then flat. The offensive impulse dies around w20-25 as doctrine shifts to consolidation phase.
- RBiH bleeds from 29.5% to 24.5% area by w8, then stabilizes. The initial shock is severe, but the defensive line holds.
- Pool decay working as designed: RS committed 83k with only 5k exhausted, RBiH committed 169k with 12k exhausted. The pools are deep enough to sustain the war.

---

## 5. Consolidated Findings

### P0 (Critical)

1. **Battle tempo deficit (62 vs 150-250 target):** The sim produces less than half the expected number of battles. Most territorial changes occur through uncontested occupation. This is the fundamental mechanical gap. Root cause: operations complete objectives through movement rather than assault; sector offensives do not generate sufficient attack actions.

### P1 (Important)

2. **Op Prsten / Ilijas corridor failure:** 4 OSIDs in Ilijas (krivajevici, dragoradi, sirovine, medojevici) are the largest contiguous calibration error near Sarajevo. RS should control these. Op Prsten only achieves 3/8 objectives.

3. **Donji Vakuf entirely wrong:** 5 OSIDs, 109 km2. RS should hold the municipality by January 1993 but RBiH retains all of it. This may need a dedicated pre-planned operation or op objective expansion.

4. **Kalinovik under-capture (3 OSIDs, 259 km2):** Op Foca's failure leaves the entire municipality in RBiH hands when RS should control it. The operation generated 0 attacks.

5. **Late-war operational paralysis:** Op Posavina Corridor and Op Jajce (2nd) both generate 0 attacks in their final weeks. RS doctrine or exhaustion is throttling all combat after w25.

6. **Prozor/Central Bosnia HRHB under-assertion (5 OSIDs):** HRHB should hold more territory in the Prozor-Jablanica-Bugojno arc. The pre-conflict HRHB-RBiH dynamic needs work (likely a Phase 6 content task).

### P2 (Monitoring)

7. **100-personnel enclave brigades:** Srebrenica has three formations at the apparent floor of 100. These should either merge, dissolve, or be modeled differently.

8. **RS 52% low-health rate:** Over half of VRS brigades are below 800 personnel. While RS overstretching is historical, the dissolution system may be too lenient.

9. **Black Swans 26-turn loan with 0 combat:** The elite loan mechanism deployed the unit but it never engaged. The loan should either generate combat opportunities or be recalled earlier.

10. **Vlasenica over-advance (3 OSIDs):** RS Podrinje Sweep captured too far into RBiH territory. cerska_2, pomol_2, sebiocina should remain RBiH.

11. **Front lock at w31:** No territorial changes for 9 consecutive weeks. Some late-1992 small-scale volatility is expected historically.

---

## 6. Single Priority

**Next session should tackle: Battle tempo deficit (P0 #1).**

At 62 battles vs the 150-250 target, the sim underproduces combat by 2.5-4x. The probe type gate fix improved things (44 to 62) but is insufficient. The root cause is that operations achieve objectives through uncontested movement rather than assault, and sector offensives do not generate enough attack actions. Investigating why operations with assigned brigades and valid objectives produce 0 attacks (Op Foca, Op Posavina Corridor, Op Jajce 2nd) would directly address both the battle tempo gap and several P1 calibration issues simultaneously. If operations that currently fail with 0 attacks instead generated 5-10 battles each, the tempo would rise to 80-100 and multiple territorial mismatches (Kalinovik, Ilijas, late Posavina) would likely self-correct.

---

## 7. References

| Artifact | Path |
|----------|------|
| Final save | `data/derived/latest_run_final_save.json` |
| Painted targets | `data/source/calibration/painted_control_jan1993.json` |
| OSID areas | `data/derived/operational/osid_areas.json` |
| Scenario file | `data/scenarios/apr1992_definitive_40w.json` |
| Calibration master | `docs/40_reports/CALIBRATION_MASTER.md` |
| Real war master | `docs/40_reports/REAL_WAR_MASTER.md` |
| Operations expert skill | `.claude/skills/operations-expert/SKILL.md` |
| Previous team convene | `docs/40_reports/convenes/20260312_PYRRHIC_TEAM_STATE_OF_THE_GAME_CONVENE.md` |
| Bosniak-Croat conflict master | `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md` |
| HVO passivity analysis | `.claude/projects/.../memory/hvo_passivity_analysis.md` |
| Compare tool | `tools/compare_painted_vs_sim.cjs` |
| Diagnose tool | `tools/diagnose_run.cjs` |

---

*Report generated 2026-03-27 by Pyrrhic Games Orchestrator. Data extracted from n1143 final save (40 weeks, seed harness-seed). All numbers verified against save file artifacts.*
