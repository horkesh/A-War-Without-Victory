# AWWV Calibration Master Reference

**Purpose:** Persistent lessons-learned record for Phase II 40w calibration (April 1992 → January 1993).
**Updated:** 2026-03-03
**Canonical target run:** n335 (`apr1992_definitive_40w__205b3676c8fe3ce4__w40_n335`)
**Latest calibration run:** n409 (90.5% area-weighted ATH maintained — Phase E: PATRON_AID_SCALE=12, JNA inheritance bonus for RS, heavy munitions gates bombardment/suppression. ATH unchanged from n407.)
**Previous calibration run:** n407 (90.5% area-weighted ATH, 86.7% count-based — Phase D: supply reserves enabled by default, UN airdrops for RBiH enclaves, bot supply-aware targeting.)
**Previous calibration run:** n392 (88.6% count-based ATH — comprehensive combat formula: officer quality, ethnic homeland defense, bombardment exposure attrition. Krajina 98.5%. ARBiH KIA 9,831 toward 11,500 target.)
**Previous calibration run:** n374 (87.6%, ceiling removal + emergent growth via pool mechanics.)
**Previous calibration run:** n364 (87.4%, verification run — combat summaries pipeline step added, zero behavioral change.)

---

## Target State (January 1993 / Week 40)

### Territory (OSIDs of 744 total; was 753 before degenerate merge 2026-03-03)
| Faction | Target | n284 | n295 | n303 | n335 | n359 | n362 | n364 | n374 | n392 | n407 | Delta (n407) | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RS | 416 | 392 | 393 | 382 | 387 | 432 | 409 | 409 | 411 | 420 | **426** | +10 | Near-target |
| RBiH | 248 | 271 | 273 | 277 | 273 | 236 | 260 | 260 | 256 | 246 | **230** | -18 | Below target |
| HRHB | 89 | 90 | 87 | 94 | 93 | 85 | 84 | 84 | 86 | 87 | **88** | -1 | Near-target |

### Army Strengths (end of 40w)

**Historical bands from knowledge base** (see §Historical OOB Baselines below for full citations):

| Faction | Dec 1992 Target Band | Full-War Peak | n284 | n364 | n374 | n392 | Brigades (n392) | Growth Mechanism | Status |
|---|---|---|---|---|---|---|---|---|---|
| VRS (RS) | **90k–100k** | 100k–110k (1993–94) | ~120k | **103k** | **97k** | **85k** | 81 | Emergent (pool exhaustion + bombardment cascade) | Below band (-5k) |
| ARBiH (RBiH) | **110k–130k** | 180k–200k (1995) | ~149k | **124k** | **127k** | **119k** | 86 | Emergent (pool exhaustion + bombardment attrition) | **In band** |
| HVO (HRHB) | **40k–45k** | 50k–55k (1993) | ~52k | **43k** | **46k** | **41k** | 31 | Emergent (pool exhaustion + attrition) | **In band** |

**NOTE:** `FACTION_HISTORICAL_PEAK` ceiling system REMOVED (n369). Personnel totals now emerge organically from pool demographics, mobilization rates, exhaustion thresholds, and combat attrition — no hardcoded caps. See §Ceiling Removal (n369–n374) below.

### Casualties (40 weeks, n254)
- **Attacker total:** ~24,000 — dominated by RS (318 attack orders vs RBiH 87 vs HRHB low)
- **Defender total:** ~3,100
- **Attacker:Defender casualty ratio:** ~7.7:1

**Historical full-war KIA targets (3.5 years = 182 weeks):**
| Faction | Full-War KIA | Yr 1 Est (~50%) | At w40 (~77% of Yr 1) |
|---|---|---|---|
| VRS (RS) | ~24,000 | ~12,000 | ~9,200 |
| ARBiH (RBiH) | ~30,000 | ~15,000 | ~11,500 |
| HVO (HRHB) | ~8,000 | ~3,200 | ~2,500 |
| **Total** | **~62,000** | **~30,200** | **~23,200** |

**n254 distribution concern:** RS is listed as attacker in 318/405 (~78%) orders. At that rate, RS loses ~18.7k attacker casualties — 2× their estimated year-1 historical total. The issue is NOT total casualties but that **RS is fighting too much, including against wrong targets (HRHB), while ARBiH attacks 87 times (still too many historically).**

### Displacement (n319 — per-OSID census depth)
- **Total displaced:** 668,202 (RBiH 457,716, HRHB 150,360, RS 60,126)
- **Historical target:** ~1M by Jan 1993
- **Key improvements (n310→n319):** Per-OSID census data replaced municipality-level even-split averaging. Hostile share cap raised from 0.80 to 0.95 for per-OSID data. Sustained pool accounting fixed (cumulative_displaced initialized to initial fire amount).
- **Ljubija (Prijedor):** 5,331→13,399 initial fire (+151%). 80% Bosniak OSID now correctly shows near-complete displacement.
- **Minority flight:** 0 (disabled — `enable_rbih_hrhb_dynamics: false`)
- **Note:** Engine counts only War-phase takeover-triggered + pressure displacement. Pre-war mass displacement is baked into `init_control` snapshot. Displacement system complete as of n319. See `docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`.

### Match Rate vs Painted Targets (n407, latest)
Overall count-based: **86.7%** (645/744 OSIDs correct); **Area-weighted: 90.5% (46,470/51,337 km²) — NEW ALL-TIME HIGH**

| Region | n374 Match | n392 Match | n407 Match | n407 Area | Key Issues (n407) |
|---|---|---|---|---|---|
| KRAJINA | 95.5% (126/132) | 98.5% (130/132) | **93.1% (122/131)** | 96.1% | -5.4pp count but +1.1pp area |
| POSAVINA_NE | 81.7% (89/109) | 81.7% (89/109) | **81.7% (89/109)** | 84.3% | Stable |
| DRINA | 81.3% (104/128) | 82.0% (105/128) | **78.0% (96/123)** | 83.4% | Višegrad still mostly RBiH; Goražde hinterland |
| CENTRAL_CORRIDOR | 90.4% (85/94) | 90.4% (85/94) | **88.3% (83/94)** | 92.6% | Minor drift in Doboj/Maglaj area |
| CENTRAL_BOSNIA | 88.0% (146/166) | 87.3% (145/166) | **85.9% (140/163)** | 86.9% | Hadžići suburbs drifting RS |
| SARAJEVO | 87.1% (27/31) | 87.1% (27/31) | **87.1% (27/31)** | 80.6% | Stable — Trnovo/Pale edges |
| HERZEGOVINA | 88.2% (82/93) | 92.5% (86/93) | **94.6% (88/93)** | 95.2% | Best result — Kupres edges |

Note: Area-weighted metric better reflects historical territory; count-based penalizes small eastern settlements that RS didn't hold in history.

---

## Calibration Run History

| Run | Scenario Hash | RS | RBiH | HRHB | Notes |
|---|---|---|---|---|---|
| n233 | 52w | 526 | 163 | 64 | Old 52w run, front frozen w35 |
| n246 | 4524ee926374c26f | 406 | 265 | 82 | First 40w baseline, all 6 benchmarks pass |
| n252 | 4524ee926374c26f | — | — | — | Same hash as n246 — avoided_osids silently dropped |
| n253 | 26e02206211e085d | 392 | 279 | 82 | Vozuca anchor PASS; RS dropped 14 from Vozuca fix |
| **n254** | 26e02206211e085d | **422** | **248** | **83** | **OOB home fixes. Best run. RBiH exact.** |
| n255 | 54295acf83337756 | 406 | 265 | 82 | Bulk avoided_osids made things worse — reverted |
| **n268** | 00750db9480be428 | **437** | **235** | **81** | Phase M mechanics (morale, ZoC virtual defense, enclave OOB, displacement routing). 81.0% match (610/753). 6/6 benchmarks. Drina enclave overexpansion (+24 RBiH OSIDs). |
| n275 | 00750db9480be428 | 425 | 246 | 82 | P2 (enclave morale 55), P5 (RS pool 0.25), P5b (cas mult), Bugojno 3rd Corps. 81.5% match (614/753). RS-12, RBiH+11. **But** Drina WORSE (65.6% vs 68.8%) — morale drift nullified P2 in 3 turns. VRS 117k (pool scale had no effect — recruitment capital drives growth). KIA 5,587 (lower — fewer absorptions). |
| **n276** | 205b3676c8fe3ce4 | **432** | **238** | **83** | **Supply-CRITICAL morale suppression + RS recruitment reduction.** 83.3% match (627/753). Drina 72.7% (+7.1% from supply fix). Sarajevo 74.2% (+6.5%). Herzegovina 94.6%. VRS still 117k (mandatory OOB, not recruitment capital). KIA 5,404. |
| n277 | 205b3676c8fe3ce4 | 432 | 238 | 83 | Enclave tag gate + 3rd Corps weights (60→100, 120→150). **Identical OSIDs to n276** — tags weren't propagated (bug). Same hash as n276 sans tag. |
| **n279** | 205b3676c8fe3ce4 | **437** | **233** | **83** | **Enclave tag propagation fix** (oob_loader + recruitment_engine). 83.7% match (630/753). Enclave brigades capped at initial personnel. Drina 73.4%. Sarajevo 80.6% (+6.4). RS +5 overall (enclave weakening let RS take more). |
| n280 | 205b3676c8fe3ce4 | 432 | 237 | 84 | REVERTED — added Srebrenica/Gorazde to Drina Sweep + RS attack share 0.28→0.22 + enclave personnel reduced. 81.9% match. Drina COLLAPSED to 67.2%. Adding fortified enclaves to Drina Sweep diluted attacks. |
| n281 | 205b3676c8fe3ce4 | 431 | 240 | 82 | REVERTED — enclave personnel only (Gorazde 1100→700, Srebrenica 900→600). 81.8% match. Drina 65.6%. Paradoxically worse — cascade effects from weaker enclaves. |
| n283 | d88dbeb669b72a6f | 404 | 259 | 90 | REVERTED — blunt corps target cap (max(5, 0.75×subordinates)). 82.7% match (623/753). Drina WORSE (69.5%) — cap starved small corps. Central Corridor better but overall worse. |
| **n284** | **e12111ddb29e02ab** | **392** | **271** | **90** | **P3: Opportunistic target municipality filter.** 85.1% match (641/753). Central Corridor 87.2% (+5.3pp). Posavina 84.4% (+7pp). Krajina 97.0%. Drina 71.9% (still weakest). 6/6 benchmarks. 11/14 anchors. VRS 120k, ARBiH 149k, HVO 52k. |
| n291 | 205b3676c8fe3ce4 | 390 | 276 | 87 | Pre-local-fronts baseline. 84.7% match (638/753). 6/6 benchmarks. Posavina 83.5%, Central Bosnia 80.7%. |
| **n295** | **205b3676c8fe3ce4** | **393** | **273** | **87** | **Local Fronts + defense_terrain_bonus.** 85.1% match (641/753). +3 OSID fixes (Brčko krepsic, Kalesija gojcin, Lopare jablanica). Posavina 85.3% (+1.8pp). Central Corridor 90.4% (+3.2pp from n284). 6/6 benchmarks. VRS 122k, ARBiH 205k, HVO 65k. |
| n297 | 205b3676c8fe3ce4 | 393 | 273 | 87 | Baseline re-run. local_fronts was empty (bug: compute-local-fronts ran with canonical SID segments; OSID segments only in refreshFrontEdgeSnapshot). Identical OSIDs to n295. |
| n298 | 205b3676c8fe3ce4 | 393 | 273 | 87 | Fix 1: buildLocalFronts added to refreshFrontEdgeSnapshot. 9 local fronts now populated but corps assigned_front_ids still 0 (same root cause — sync-front-segments used canonical edges). |
| **n299** | **205b3676c8fe3ce4** | **389** | **273** | **91** | **Fix 2: sync-front-segments prefers OSID edges.** 86.3% match (650/753). **+9 from n295.** Corps now have assigned fronts. 13 local fronts with density modifiers active. Central Bosnia 83.7% (+2.4pp). Posavina 86.2% (+0.9pp). Sarajevo 80.6% (+3.2pp). Herzegovina 93.5% (+3.2pp). Drina still 71.9%. RS-27 (from -23), HRHB+2 (from -2). |
| n300 | 205b3676c8fe3ce4 | 293 | 339 | 121 | REVERTED — Corps front sectors with per-sector density. 77.6% match. Severe regression: VRS thin sectors (0.08-0.17 density) got 0.6× penalty, collapsing RS lines everywhere. Per-sector density too punishing for overextended factions. |
| n302 | 205b3676c8fe3ce4 | 321 | 321 | 111 | REVERTED — Same but with broader brigade assignment to sectors. 78.6% match. Same root cause: per-sector density penalizes VRS which is inherently thin per-corps. |
| **n303** | **205b3676c8fe3ce4** | **382** | **277** | **94** | **Corps front sectors (targeting only, density unchanged).** 86.7% match (653/753). **+3 from n299.** Sectors partition front edges by corps via multi-source BFS from HQs. Corps offensive targets filtered to sector-adjacent OSIDs, preventing sprawl. Central Bosnia 88.0% (+4.3pp from sector targeting). Drina 72.7% (+0.8pp). Density modifier unchanged (faction-level aggregation). 14 sectors, 18 corps. |
| n311 | 205b3676c8fe3ce4 | 389 | 272 | 92 | **Phase A: Multi-sector promotion.** 86.3% match (650/753). Sub-segments >= 5 edges promoted to independent sectors. 4 multi-sector corps (ARBiH 2nd/3rd, VRS 2nd Krajina/SRK). Per-sector brigade assignment + sector_targets in directives. |
| n312 | 205b3676c8fe3ce4 | 389 | 272 | 92 | **Phase B: Supply gating.** 87.4% match (658/753). **+5 from n303.** Critical supply → forced defend. Strained → victory-only, no pioneer. Corps supply health gating. Drina 75.0% (+2.3pp). Central Corridor 91.5% (+2.1pp). |
| **n314** | **205b3676c8fe3ce4** | **389** | **272** | **92** | **Phase A+B+C: Multi-sector + supply gating + sector offensives.** 87.4% match (658/753). **+5 from n303.** Sector offensive infrastructure (named operations, momentum, lifecycle) wired but inactive in 40w window (year-1 defensive doctrine). See L37. |
| n310 | 205b3676c8fe3ce4 | — | — | — | Pre-displacement-depth baseline. Displacement: 481k total (RBiH 269k, HRHB 120k, RS 37k). Municipality-level even-split averaging. |
| **n319** | **42ad78a39746d166** | **—** | **—** | **—** | **Per-OSID census displacement depth.** 86.7% match (653/753). Displacement: **668k total** (RBiH 458k, HRHB 150k, RS 60k). Ljubija: 5,331→13,399 (+151%). Sustained pool double-count fix. Displacement system complete. See 20260301_DISPLACEMENT_DEPTH_CALIBRATION.md. |
| n338 | 205b3676c8fe3ce4 | — | — | — | **Supply Reserves Phase A verification.** 86.9% match (654/753). Supply reserves implemented but gated off (`supply_reserves_enabled=false`). Zero behavioral change confirmed — identical within noise of n335. 14 calibration constants, 13 unit tests, pipeline step compute-supply-reserves. See 20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md. |
| n348 | — | 415 | 261 | 77 | **Reserve proportional cap + rear pocket targeting.** 84.9% match (639/753). Reserve cap `RESERVE_PER_EDGE_CAP=0.5`. Rear pocket targeting (enemy pockets with all neighbors faction-controlled). |
| n354 | — | — | — | — | **Baseline before sector offensive activation.** 85.8% match. Reference run for n359 comparison. |
| **n359** | **—** | **432** | **236** | **85** | **Sector offensive activation.** 86.7% match (653/753). 26 sector offensives in 40w (was 0). Fixes: (1) skip sector_attack in evaluateOperationProgress() — sole handler is advanceSectorOffensives(); (2) supply readiness returns 1.0 when supply_reserves_enabled=false; (3) allow new launches during recovery phase (+15 exhaustion); (4) min objectives 2→1. VRS 1st Krajina=7 ops, East Bosnian=6, Drina=6, 2nd Krajina=4; ARBiH 5th Corps=3 counteroffensives. See L42, L43. |
| **n362** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **ALL-TIME HIGH: 87.4% match (658/753).** Winter strengthening + Bihać DTB + Bosniak abroad routes. VRS 103k, ARBiH 124k, HVO 43k — **ALL THREE FACTIONS NOW WITHIN HISTORICAL DEC 1992 BANDS** (VRS 90–100k near, ARBiH 110–130k, HVO 40–45k). 12/14 anchors (zvornik + bihac fail). Krajina 96.2%, Herzegovina 92.5%, Central Corridor 91.5%, Sarajevo 90.3%, Central Bosnia 88.0%, Posavina 81.7%, Drina 75.0%. Casualties: ARBiH 27.4k, VRS 33.5k, HVO 10.6k (71.5k total military). |
| **n364** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **Verification run — combat summaries pipeline step.** 87.4% match (658/753). Identical OSIDs to n362. New `compute-combat-summaries` step produces aggregate CombatSummary on corps/army_hq formations (read-only aggregation, zero behavioral change). 16 formations with combat_summary. State hash `d4e0b2ff59a5cb38`. |
| n369 | 205b3676c8fe3ce4 | 412 | 256 | 85 | **Ceiling removal — first iteration.** 87.5% match (659/753). Removed `FACTION_HISTORICAL_PEAK` ceiling system. Mobilization scales RBiH 0.28, RS 0.16, HRHB 0.50. Exhaustion 0.15/0.25. JNA 12k. Personnel: ARBiH **151k** (OVER), VRS **79k** (UNDER), HVO **55k** (OVER). 13/14 anchors (bihac PASS, zvornik FAIL). |
| n370 | 205b3676c8fe3ce4 | 410 | 257 | 86 | **Ceiling removal — iteration 2.** 87.4% match (658/753). Scales RBiH 0.16, RS 0.22, HRHB 0.30. JNA restored 15k. Personnel: ARBiH **134k** (near), VRS **96k** (IN BAND), HVO **50k** (over). 12/14 anchors (zvornik + bihac FAIL). |
| n371 | 205b3676c8fe3ce4 | 411 | 256 | 86 | **Ceiling removal — iteration 3.** 87.6% match (660/753). Scales RBiH 0.14, RS 0.22, HRHB 0.24. Personnel: ARBiH **129k** (IN BAND), VRS **97k** (IN BAND), HVO **49k** (over). Drina 81.3% (+6.3pp from n362). 12/14 anchors. |
| n372 | 205b3676c8fe3ce4 | 411 | 256 | 86 | Scales HRHB 0.18 (ongoing mob). Identical OSIDs to n371. HVO 48k — ongoing mobilization not the driver; FACTION_POOL_SCALE is. |
| n373 | 205b3676c8fe3ce4 | 411 | 256 | 86 | FACTION_POOL_SCALE HRHB 2.10→1.80. HVO 46k. Identical OSIDs to n371. |
| **n374** | **205b3676c8fe3ce4** | **411** | **256** | **86** | **ALL-TIME HIGH: 87.6% (660/753).** Ceiling removal complete. FACTION_POOL_SCALE HRHB 1.70. Personnel: ARBiH **127k** (IN BAND), VRS **97k** (IN BAND), HVO **46k** (near band, +1k). Casualties: ARBiH 21.6k, VRS 32.2k, HVO 11.4k (65.2k total). 12/14 anchors (zvornik structural, bihac VRS overran). Drina **81.3%** (+6.3pp from n362). No hardcoded personnel caps — growth emerges from pool demographics, mobilization, exhaustion, and attrition. |
| **n375** | **205b3676c8fe3ce4** | **409** | **260** | **84** | **Comprehensive combat formula: officer quality + ethnic defense + bombardment.** 88.3% match (665/753). Three new mechanics: `getOfficerQualityMult()` (VRS 1.10→decays, ARBiH 0.85→grows, HVO 0.97), `getEthnicDefenseBonus()` (+12% for defending co-ethnic majority OSID), `getBombardmentCasualtyMult()` (1.0–1.8× defender casualties from attacker heavy weapons). HRHB pool 1.70. |
| n376–n381 | 205b3676c8fe3ce4 | — | — | — | **Parameter exploration**: bombardment scaling (2.0/50, 2.5/40), morale absorption (1.75, 2.5), morale resist floors (45/60/52), BASE_DEFENDER_LOSS_RATE (0.03). All showed diminishing returns or paradoxical cascade effects. Reverted to n375 values. |
| n382 | 205b3676c8fe3ce4 | 418 | 248 | 87 | **n375 verification with HRHB pool 1.55.** 88.3% match (665/753). Confirmed n375 baseline. HRHB pool 1.70→1.55 reduced HVO 47k→46k. |
| n383 | 205b3676c8fe3ce4 | 416 | 250 | 87 | **Bombardment exposure v1 (linear deficit).** 88.0% match (663/753). First bombardment exposure attrition in frontline_attrition.ts. ARBiH KIA 8,057 (+843). HVO over-penalized (4,577 KIA, 41k). |
| n385 | 205b3676c8fe3ce4 | — | — | — | **Bombardment exposure v2 (linear, tuned).** 88.4% match (666/753). RATE=0.012, DIVISOR=12. ARBiH KIA 9,287 (+2,073). VRS 88k, HVO 42k. |
| n386 | 205b3676c8fe3ce4 | 416 | 251 | 86 | RATE=0.015, DIVISOR=10. ARBiH KIA 10,292 but HVO 39k (below band), VRS 88k. Regressed to 88.0%. |
| n387 | 205b3676c8fe3ce4 | — | — | — | **Bombardment exposure v3 (ratio-based).** 88.2%. Log-ratio model: `ln(incoming/own) / SCALE`. Better ARBiH/HVO differentiation. RATE=0.015 too aggressive (VRS 85k). |
| **n392** | **205b3676c8fe3ce4** | **420** | **246** | **87** | **ALL-TIME HIGH (count-based): 88.6% (667/753).** Ratio-based bombardment exposure (RATE=0.012, SCALE=2.0). Krajina **98.5%** (+3.0pp). ARBiH KIA **9,831** (target 11,500, 85% achieved). Personnel: ARBiH 119k (in band), VRS 85k (below band -5k), HVO 41k (in band). Total military KIA: 25,805. Civilian killed: 27,868. |
| **n407** | **2da7a05b322452f6** | **426** | **230** | **88** | **ALL-TIME HIGH (area-weighted): 90.5% (46,470/51,337 km²).** Supply reserves enabled by default (`supply_reserves_enabled: true`). Count-based 86.7% (645/744). Phase D: UN airdrops (RBiH enclave supply 7.5 at w40), bot supply-aware targeting, MAINTENANCE_DRAIN 0.15→0.04. Krajina **96.1%**. Herzegovina **95.2%**. ARBiH KIA **12,054** (historically plausible for year-1 intensity; 11.5k was a floor estimate). VRS KIA 13,170. HVO KIA 5,904. Personnel: ARBiH 129k, VRS 77k, HVO 38k. Civilian killed: 28,159. |
| **n408** | **2da7a05b322452f6** | **426** | **230** | **88** | **Phase E1: PATRON_AID_SCALE 1→12; JNA inheritance +40 heavy munitions for RS (start=100).** ATH maintained at 90.5% area-weighted. Total KIA 31,128. RS heavy_munitions=100 at w40 (JNA bonus), general_supply→0 (siege drain accumulation — deferred). |
| **n409** | **2da7a05b322452f6** | **426** | **230** | **88** | **Phase E2: heavy munitions gates getBombardmentCasualtyMult + getArtillerySuppression via getHeavyMunitionsMult().** ATH maintained at 90.5%. E2 mechanism inert at 40w (RS heavy_munitions stays at 100; drain rate too low to deplete in 40 weeks from JNA start). |

---

## Comprehensive Combat Formula (n375–n392)

### New Mechanics Added

**1. Officer Quality** (`combat_math.ts:getOfficerQualityMult`)
Faction-level command effectiveness curve modeled on historical doctrinal arcs:
- **VRS**: 1.10 peak (JNA officers), decays 0.002/week after w20, floor 0.95 (brain drain, no replacement officers)
- **ARBiH**: 0.85 floor (no officers, rabble), grows 0.003/week, cap 1.05 (professionalization)
- **HVO**: constant 0.97 (Croatian backing, stable cadre)
Applied to both `computeAttackerPower` and `computeDefenderPower`.

**2. Ethnic Homeland Defense** (`ethnic_defense.ts`)
Defenders fight harder in co-ethnic majority OSIDs:
- ≥60% co-ethnic population → +12% defense power
- 30–60% → graduated bonus
- <30% → no bonus
Shared module (`OsidEthnicComposition`), wired into resolver, predictor, and bot AI.

**3. Bombardment Casualty Multiplier** (`combat_math.ts:getBombardmentCasualtyMult`)
Attacker heavy weapons inflict extra defender casualties even on stalemate/repulsed outcomes:
- `(artEff + tankEff×0.5) / 80` → 1.0–1.8× defender casualties
- Models VRS artillery causing ARBiH losses while ARBiH never yields

**4. Bombardment Exposure Attrition** (`frontline_attrition.ts`)
Passive attrition from enemy heavy weapons — the major new mechanic for closing the casualty gap:
- Ratio-based vulnerability: `ln(incoming/ownFP) / SCALE`
- Brigades with very low own firepower facing high enemy firepower are exponentially more vulnerable
- ARBiH (own FP ~1.8, incoming ~13) → ln(7.2)/2.0 = 0.99 → near-full effect
- HVO (own FP ~5, incoming ~13) → ln(2.6)/2.0 = 0.48 → half effect
- VRS (own FP ~17, incoming ~2) → ln(0.13) < 0 → zero effect
- BOMBARDMENT_EXPOSURE_RATE = 0.012, BOMBARDMENT_RATIO_SCALE = 2.0
- Enemy FP distributed across all non-enemy brigades (not just own faction)

### Calibration Iterations (n375–n392)

| Run | Model | RATE | DIVISOR/SCALE | ARBiH KIA | VRS P | HVO P | OSID |
|---|---|---|---|---|---|---|---|
| n382 | none | — | — | 7,214 | 91k | 46k | 88.3% |
| n383 | linear deficit | 0.005 | DIV=20 | 8,057 | — | 41k | 88.0% |
| n385 | linear deficit | 0.012 | DIV=12 | 9,287 | 88k | 42k | 88.4% |
| n386 | linear deficit | 0.015 | DIV=10 | 10,292 | 88k | 39k | 88.0% |
| n387 | **ratio ln()** | 0.015 | SCALE=2.0 | 10,403 | 85k | 39k | 88.2% |
| **n392** | **ratio ln()** | **0.012** | **SCALE=2.0** | **9,831** | **85k** | **41k** | **88.6%** |

### Key Finding: Cascade Dynamics
Increasing bombardment attrition weakens ARBiH/HVO → VRS attacks more successfully → VRS takes more attacker casualties → VRS personnel drops. RS pool scale is extremely sensitive: 0.25→0.27 crashed OSID match from 88.6% to 85.7% (VRS over-extension). The VRS at 85k is an emergent consequence of historically aggressive VRS offensive behavior.

### Remaining Gap
- ARBiH KIA: 9,831 vs target 11,500 (85% achieved, 1,669 gap)
- Gap likely requires siege-specific mechanics (Sarajevo daily shelling, enclave bombardment) rather than further parameter tuning
- VRS at 85k: below 90k band, driven by combat cascade — accepted as emergent behavior

---

## Ceiling Removal (n369–n374)

### Problem
`FACTION_HISTORICAL_PEAK` ceiling system applied hardcoded caps (RBiH 130k, RS 185k, HRHB 45k) via soft/hard cap ratios. Values were factually wrong (ARBiH peak should be 180-200k, VRS peak 100-110k) and violated the design principle of emergent growth.

### Solution
Removed ceiling system entirely. Tuned mobilization parameters so personnel naturally settles within historical bands:

| Parameter | Before | After (n374) | File |
|---|---|---|---|
| `FACTION_HISTORICAL_PEAK` | RBiH 130k, RS 185k, HRHB 45k | **DELETED** | `formation_constants.ts` |
| `FACTION_SOFT_CAP_RATIO` | 0.85 | **DELETED** | `formation_constants.ts` |
| `FACTION_HARD_CAP_RATIO` | 0.95 | **DELETED** | `formation_constants.ts` |
| `ABOVE_SOFT_CAP_REINFORCEMENT_MULT` | 0.25 | **DELETED** | `formation_constants.ts` |
| `getFactionCeilingMult()` | Soft/hard cap gating | **DELETED** | `formation_spawn.ts` |
| `getFactionTotalPersonnel()` | Personnel counter for ceiling | **DELETED** | `formation_spawn.ts` |
| `FACTION_MOBILIZATION_SCALE.RBiH` | 0.40 | **0.14** | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.RS` | 0.25 | **0.22** | `ongoing_mobilization.ts` |
| `FACTION_MOBILIZATION_SCALE.HRHB` | 0.90 | **0.18** | `ongoing_mobilization.ts` |
| `EXHAUSTION_THRESHOLD` | 0.20 | **0.15** | `ongoing_mobilization.ts` |
| `EXHAUSTION_HARD_CAP` | 0.35 | **0.25** | `ongoing_mobilization.ts` |
| `FACTION_POOL_SCALE.HRHB` | 2.10 | **1.55** | `pool_population.ts` |

### Calibration iterations
| Run | RBiH mob | RS mob | HRHB mob | HRHB pool | ARBiH | VRS | HVO | Match |
|---|---|---|---|---|---|---|---|---|
| n364 (baseline) | 0.40 + ceiling | 0.25 + ceiling | 0.90 + ceiling | 2.10 | 124k | 103k | 43k | 87.4% |
| n369 | 0.28 | 0.16 | 0.50 | 2.10 | 151k | 79k | 55k | 87.5% |
| n370 | 0.16 | 0.22 | 0.30 | 2.10 | 134k | 96k | 50k | 87.4% |
| n371 | 0.14 | 0.22 | 0.24 | 2.10 | 129k | 97k | 49k | 87.6% |
| n374 | 0.14 | 0.22 | 0.18 | 1.70 | 127k | 97k | 46k | 87.6% |

### Design principle confirmed
Personnel totals emerge from: census demographics (initial pool size) → mobilization rate × surge × exhaustion (ongoing growth) → reinforcement rate ramp (pool→brigade transfer) → combat attrition (drain) → pool depletion (finite manpower). No hardcoded limits needed.

---

## Front System Analysis (n314)

### Corps Front Sectors (end of 40 weeks)

The corps sector system partitions front edges by corps via multi-source BFS from HQ locations. Sub-segments with >= 5 edges promote to independent sectors; small sub-segments merge into nearest. Multi-sector corps get per-sector targeting. Sectors are used for **targeting only** (not density modifiers).

| Corps | Faction | Stance | Sectors | Total Edges | Total Brigades |
|---|---|---|---|---|---|
| arbih_1st_corps | RBiH | defensive | 1 | 14 | 10 |
| arbih_2nd_corps | RBiH | offensive | **3** | 68 | 21 |
| arbih_3rd_corps | RBiH | offensive | **2** | 33 | 10 |
| arbih_4th_corps | RBiH | offensive | 1 | 19 | 4 |
| arbih_5th_corps | RBiH | offensive | 1 | 9 | 2 |
| vrs_1st_krajina | RS | defensive | 1 | 95 | 11 |
| vrs_2nd_krajina | RS | defensive | **2** | 23 | 6 |
| vrs_drina | RS | defensive | 1 | 52 | 7 |
| vrs_east_bosnian | RS | balanced | 1 | 20 | 1 |
| vrs_sarajevo_romanija | RS | defensive | **2** | 88 | 3 |
| vrs_herzegovina | RS | defensive | 1 | 17 | 2 |

**Multi-sector corps (bold):** ARBiH 2nd (3 sectors — covers Tuzla/Majevica/Posavina), ARBiH 3rd (2 sectors — covers Central Bosnia), VRS 2nd Krajina (2 sectors — covers Doboj/Corridor), VRS SRK (2 sectors — covers Sarajevo siege ring).

### Key Design Decision: Density stays at faction level

n300-n302 tested per-sector density modifiers — catastrophic regression (77-78%). VRS is inherently thin per-corps (0.03-0.26 density) because RS has ~80 brigades across 420+ front edges spread over 6 corps. Per-sector density applied 0.6× THIN penalty to EVERY VRS sector, collapsing RS lines. Faction-level mega-front aggregation (80/167 = 0.48 density) hid this truth but matched historical outcomes better.

**Lesson L35:** Do not use per-corps density for the THIN/DENSE modifier. VRS overextension is real but managed by distributing forces. The density modifier should reflect faction-level front density, not per-corps. Per-sector density should only apply to attack sectors (Phase 3 — future work).

### Local Fronts (density modifier — faction-level aggregation)

| Front | Faction | Brigades | Edges | Density | Flag |
|---|---|---|---|---|---|
| RBiH-RS Bratunac mega | RBiH | 150 | 171 | 0.877 | — |
| RBiH-RS Zvornik | RBiH | 25 | 65 | 0.385 | THIN |
| HRHB-RS Bugojno-1 | HRHB | 10 | 3 | 3.333 | DENSE |
| HRHB-RS Bugojno-2 | HRHB | 8 | 24 | 0.333 | THIN |
| HRHB-RS Jajce | HRHB | 8 | 12 | 0.667 | — |
| HRHB-RS Orašje | HRHB | 2 | 5 | 0.400 | THIN |
| HRHB-RS Neum | HRHB | 1 | 4 | 0.250 | THIN |
| HRHB-RS Vareš | HRHB | 3 | 1 | 3.000 | DENSE |

### Corps-Front Mapping

All 15 corps now have front assignments. Most VRS corps map to the RBiH-RS mega-front. Key mappings:
- **ARBiH 1st Corps**: 1 front (mega) — Sarajevo defense through mega-front
- **ARBiH 2nd Corps**: 3 fronts — Banovići-Vozuća + mega + Zapolje
- **ARBiH 3rd Corps**: 2 fronts — Banovići-Vozuća + Donji Vakuf
- **ARBiH 5th Corps**: 1 front — Bihać (isolated, correct)
- **VRS 1st Krajina**: 6 fronts — spans HRHB and RBiH boundaries (correct — largest corps)
- **VRS Drina**: 1 front (mega) — correct assignment but mega-front too large

### Structural Issue: Mega-Front

The front segmentation algorithm (`deriveAssignableFrontSegments`) groups edges into contiguous connected components. The entire RBiH-RS border is one connected graph → one segment → 167 edges with 80 brigades. This makes front density modifiers less meaningful (density 0.479 = modest THIN penalty across entire front, rather than per-sector variation).

**Needed:** Corps-level front splitting. Each corps should "own" a section of the mega-front based on brigade AoR/position, creating 5-8 smaller fronts with more meaningful density variation.

---

## Historical OOB Baselines

### VRS Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~80,000 | JNA inheritance, full heavy weapons |
| December 1992 (w40 target) | ~90,000–100,000 | Expansion + consolidation |
| 1993–1994 peak | ~100,000–110,000 | Plateau |

**Corps breakdown (April 1992):**
| Corps | HQ | Strength | Mission |
|---|---|---|---|
| 1st Krajina | Banja Luka | ~40,000 | Strongest; offensive; Posavina corridor |
| 2nd Krajina | Drvar | ~15,000 | Weakest; besieging Bihać |
| East Bosnian | Bijeljina | ~25,000 | Corridor security; northeastern ops |
| Drina | Vlasenica | ~15,000 | Siege of Srebrenica, Žepa, Goražde |
| Sarajevo-Romanija | Lukavica | ~20,000 | Static siege of Sarajevo |
| Herzegovina | Bileća | ~10,000 | **DEFENSIVE** — southern BiH; Goražde ops |

**Key point:** Herzegovina Corps was DEFENSIVE. VRS attacking HRHB in Herzegovina = misuse of Herzegovinian forces they didn't have to spare.

**Equipment inherited from JNA:**
- Tanks: ~200–300 (T-55, T-72, T-34) — by end 1992 ~300–400
- APCs/IFVs: ~400–500 (M-80, BOV)
- Artillery: Extensive JNA stockpiles — 155mm, 122mm, 105mm, mortars
- Ammunition: Abundant (full JNA depots)

### ARBiH Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~60,000–80,000 | Many UNARMED; arms embargo from day 1 |
| December 1992 (w40 target) | ~110,000–130,000 | Growing but still outgunned |
| 1995 peak | ~180,000–200,000 | Fully organized |

**Corps at w40 (December 1992):**
| Corps | HQ | Est. Strength | Mission |
|---|---|---|---|
| 1st Corps | Sarajevo | ~20,000–30,000+ | Defending besieged capital (1,425 days) |
| 2nd Corps | Tuzla | ~10,000–15,000 | Industrial base; some counter-pressure on corridor |
| 3rd Corps | Zenica | ~15,000–20,000 | Central Bosnia defense (incl. Bugojno); two-front war forming 1993 |
| 4th Corps | Mostar | ~5,000–10,000 | Neretva valley defense; Konjic/Jablanica |
| 5th Corps | Bihać | ~10,000–15,000 | ISOLATED POCKET; no resupply; internal Abdić crisis forming |

**Enclave commands — survival posture ONLY:**
| Enclave | Fighters | Equipment | Supply | Historical Mission |
|---|---|---|---|---|
| Srebrenica | 1,000–2,000 | **Small arms only** (hunting rifles, captured weapons) | **NONE** — besieged | Survival; Orić raids were desperate foraging, not offensive |
| Goražde | 2,000–3,000 | **Small arms only** | **NONE** — besieged | Survival; relied on UNPROFOR presence |
| Žepa | 500–800 | **Small arms only** | **NONE** — besieged | Survival |

**Critical constraint:** ARMS EMBARGO throughout entire war. No tanks, no artillery at start. Equipment only via capture or black market. At week 40, enclave brigades have zero resupply, zero logistics, no ammunition reserves.

### HVO Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~25,000–35,000 | Establishing control in Croat-majority areas |
| December 1992 (w40 target) | ~40,000–45,000 | Expanded; Croatian supply lines functional |
| 1993 peak (war with ARBiH) | ~50,000–55,000 | Maximum expansion |

**Operational Zones at w40:**
| OZ | HQ | Strength | Mission |
|---|---|---|---|
| Southeast Herzegovina | Mostar (west) | ~10,000–15,000 | Strongest; Croatian supply; defensive vs VRS |
| Central Bosnia | Vitez/Busovača | ~8,000–12,000 | Besieged enclaves; helicopter supply from Split |
| Posavina NW | Orašje | ~5,000–8,000 | Isolated pockets; fighting VRS WITH ARBiH |
| Tomislavgrad | Tomislavgrad | ~5,000–8,000 | Western sector; defensive |

---

## Faction Doctrinal Arcs (Full War)

**CRITICAL CALIBRATION PRINCIPLE — memorize and apply always.**

### VRS (RS): Professional → Degraded
- **Starts** as a professional, well-equipped army. Inherits JNA officer corps, heavy weapons, logistics, doctrine. Capable of coordinated multi-corps offensive operations (Corridor '92, Drina sweep).
- **Ends** as mostly rabble without the starter officer corps. Attrition, brain drain, and inability to replace trained NCOs/officers degrades operational capability over 3.5 years. Still capable of defensive operations and local counterattacks, but increasingly unable to sustain large-scale offensives.
- **Calibration implication:** VRS early-war effectiveness should be HIGH (good morale, high experience, low war weariness). Late-war VRS should show degraded cohesion, officer loss penalties, rising insubordination/war weariness. Equipment advantage persists but crew quality drops.

### ARBiH (RBiH): Rabble → Professional
- **Starts** as rabble. No officer corps, no heavy weapons, no logistics, many fighters unarmed. Relies on militia formations, Territorial Defense remnants, and sheer numbers in urban defense.
- **Ends** as a professional army. Still under-equipped compared to VRS (arms embargo throughout), but capable of larger coordinated operations (1994–1995 offensives). Trained officer corps developed organically through combat experience and foreign training.
- **Calibration implication:** ARBiH early-war should have LOW experience, LOW morale, LOW cohesion — but HIGH willingness to hold ground (desperation, defending homes). Late-war ARBiH should show rising experience, better coordination, ability to conduct corps-level offensives. Equipment gap narrows but never closes.

### HVO (HRHB): Capable Militia → Overstretched
- **Starts** as capable militia with Croatian state backing. Good equipment pipeline from Croatia, motivated fighters in Croat-majority areas.
- **Ends** overstretched by two-front war (VRS + ARBiH from 1993). Equipment advantage over ARBiH but manpower-limited. Increasingly reliant on Croatian Army (HV) support.
- **Calibration implication:** HVO should be regionally strong but unable to project power far from Croat heartland. Manpower ceiling reached early. Two-front war from 1993 should strain resources.

### Design Rule
These arcs must emerge **organically** from game mechanics (experience gain, attrition, recruitment exhaustion, war weariness) — NOT from hard-coded phase switches or artificial caps. The sim should produce these trajectories as natural consequences of the faction starting conditions and the mechanics acting on them over time.

---

## RS-HRHB Relations in 1992

**Classification: "Ambiguous Ally" — NO OPEN WAR between VRS and HVO in 1992.**

| Area | Reality | Implication |
|---|---|---|
| Posavina | HVO and ARBiH fighting TOGETHER against VRS | RS vs HRHB conflict is ACCEPTABLE here |
| Kupres (April 1992) | HVO cooperated with VRS to take from ARBiH | Exception — specific, brief |
| Herzegovina | **No VRS-HVO combat in 1992** | RS attacking HRHB here = AHISTORICAL |
| Central Bosnia | Competing territorial claims; uneasy cooperation | No open fighting |

**Calibration rule:** If RS is attacking HRHB territory in Herzegovina or Central Bosnia, the root cause is that **RS doesn't have enough brigades in its actual priority areas** (Drina corridor, Central Corridor). The fix is correct brigade positioning and a large scoring penalty, not behavioral blocks.

**RS-HRHB scoring rule (to implement):** RS attacking HRHB-controlled OSIDs outside Posavina = -400 score penalty. "VRS would not spend Serb blood for Croatian land unless strategically compelled."

---

## Displacement System Reference

### Implementation Files
- `src/sim/early_war/displacement_hooks.ts` — Phase I (one-time flip trigger)
- `src/state/displacement.ts` — Phase II continuous pressure triggers
- `src/state/displacement_takeover.ts` — 4-week timer + camp maturation
- `src/state/displacement_routing_data.ts` — Routing tables by faction/region
- `src/state/displacement_state_utils.ts` — Brigade presence check for routing gate

### Timer System (Phase II Takeover)
- `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` — settlement flip → displacement initiation
- `CAMP_REROUTE_DELAY_TURNS = 4` — camp creation → population routed to receiving municipality
- Total: **8 turns** from settlement flip to displaced population visible at destination
- Stored in `state.hostile_takeover_timers` keyed by MunicipalityId

### Kill and Flight Fractions
| Scenario | Killed | Flee Abroad | Internal Camp |
|---|---|---|---|
| RS displaced (Serb) | 10% | 30% | 60% |
| HRHB displaced (Croat) | 10% | 25% | 65% |
| RBiH displaced (Bosniak) | 10% | 0% (no external state) | 90% |
| Posavina Croats (regional override) | 10% | 70% | 20% |
| **Enclave overrun** (RS takes RBiH enclave) | **35%** | — | 65% |
| No 1991 census available | 20% lost | — | 15% displaced per flip |

### Camp Routing (Motherland Preference)
- **RBiH displaced**: Tuzla → Zenica → Travnik → Goražde → Srebrenica → Sarajevo → Bihać
- **HRHB displaced**: Mostar → Livno → Gradačac → Brčko → Orašje
- **RS displaced**: Pale/Sokolac/Han Pijesak (if Sarajevo area) → Banja Luka → Bijeljina → Doboj

**Routing gate:** Displaced can only route to municipalities where the **receiving faction has a brigade present**. If no brigade: population stays in camp awaiting future brigade deployment. This is critical for enclave supply simulation.

### Phase II Continuous Pressure Triggers
- Unsupplied 3+ consecutive turns: 5% per turn
- Encirclement (no friendly adjacency path): 10% per turn
- 2+ concurrent front breaches: 3% per turn
- Max per turn: 5% remaining population (PHASE_F_MAX_DELTA_PER_TURN)

### Calibration Context
- n254: ~43k routed + ~5.7k fled + ~5.7k killed for Phase II displacement only
- Phase I displacement (historical: ~1M+ by Jan 1993) is baked into `init_control` snapshot
- Minority flight disabled (`enable_rbih_hrhb_dynamics: false`)
- **The engine is correct**. The discrepancy vs historical 1M+ is by design — Phase I chaos is not re-simulated.

---

## Engine Combat Mechanics Reference

### Existing "Last Stand" Logic (`attack_resolution_osid.ts` lines 610–629)
```
if (retreatDests.length === 0) {
  defenderPower ×= 1.5        // defender fights harder
  lastStandCasMult = 2        // BOTH sides take double casualties
}
```
Triggers only when defender has **zero valid retreat destinations** (complete encirclement).

### Casualty Rate Constants
- `BASE_ATTACKER_LOSS_RATE = 0.045` (4.5% of attacker personnel per engagement; was 0.03, Phase A n343)
- `BASE_DEFENDER_LOSS_RATE = 0.02` (2%; was 0.015, Phase A n343)
- `KIA_FRACTION = 0.30` (30% of casualties are killed; 55% wounded; 15% MIA; was 0.25/0.60, Phase A n343)
- **Morale retreat resistance**: per-faction via `getMoraleResistFloor()`: RBiH=55, RS=70, HRHB=65 (was flat 70)
- **Frontline attrition**: 0.5%/week passive loss for front-assigned brigades (`frontline_attrition.ts`)
- Outcome multipliers: decisive\_victory → attacker 1.0×/defender 2.5×; stalemate → 1.0×/0.8×; repulsed → 2.0×/0.5×

### Cohesion Mechanics
- Cohesion is a **direct multiplier** on combat power (`coh/100` × other factors)
- `RBiH cohesion floor`: rises from 35 (week 0) → 62 (week 52) — enforcing professionalization
- `RS cohesion ceiling`: falls from 85 (week 0) → 68 (week 52) — enforcing decay
- `surrenderCascade`: cohesion < 10 AND powerRatio > 2.5 → forced decisive victory, defender eliminated in place

### Local Front Density Modifier (n295+)
```
density = assigned_brigades / coverage_length (edge count)
density < 0.5  →  penalty: 0.6× to 1.0× (linear interpolation)
0.5 ≤ density ≤ 1.0  →  normal: 1.0×
density > 1.0  →  bonus: 1.0× to 1.25× (linear, capped at 2× threshold)
```
Applied to both `computeDefenderPower` and `computeZocDefenderPower`.
Derived each turn in `compute-local-fronts` pipeline step (`local_front_defense.ts`).

### Per-Brigade Defense Terrain Bonus (n295+)
```
defenderPower ×= (1 + formation.defense_terrain_bonus)
```
OOB field. Applied in direct defense AND ZoC projection. Synced between resolver + predictor.
Current assignments: 255th Slavna (+0.30), 246th Vitezka (+0.25), 328th/351st Mountain (+0.20).
Stacks multiplicatively with honor (slavna 1.10×, viteska 1.20×).

### What Does NOT Exist
- No "desperation" parameter (encirclement does not boost morale)
- No "homeland defense" multiplier (home municipality not weighted)
- No retreat reluctance (defenders always retreat if a friendly OSID is adjacent)
- Entrenchment increases defender **power** but does not reduce **casualty rates**
- No background attrition (artillery bombardment between formal combats)

---

## Root Cause Analysis (n254 Gaps)

### Gap 1: Enclave Brigades Attack Outward [DRINA 62.5%]
- **Symptom:** ~36 OSIDs wrong — Srebrenica 5 brigades + Goražde 7 brigades push into RS territory
- **Root cause:** Enclave brigades are given same equipment and supply as regular ARBiH brigades. No material constraint prevents them from scoring attacks as worthwhile.
- **Historical reality:**
  - Srebrenica: Naser Orić's "raids" were desperate food-foraging into surrounding villages, not coordinated offensive operations
  - Goražde/Žepa: Pure survival. No ammunition reserves. UNPROFOR presence.
  - These brigades had **no tanks, no artillery, no supply lines**
- **Wrong fix:** `avoided_osids` — proven to redirect attacks to other RS targets (n255: RS dropped 422→406)
- **Correct fix:** Material deprivation — enclave brigade compositions with zero heavy weapons; enclave supply status = CRITICAL by definition
- **Engine leverage:** RBiH CRITICAL supply penalty = -300 per attack score. If enclave brigades are always marked CRITICAL supply, attacks score negative and they stop.

### Gap 2: RS Attacks HRHB Territory [HRHB territory −6 OSIDs; Central Bosnia wrong]
- **Symptom:** RS holds Kupres, Orasje (HRHB pocket), some Bugojno/Konjic/Herzegovina OSIDs
- **Root cause:** RS brigades are not covering their actual priority areas (Drina, Central Corridor) densely enough. Attack scoring finds HRHB-adjacent OSIDs as convenient targets.
- **Historical reality:** VRS Herzegovina Corps was DEFENSIVE. VRS had no reason to attack HVO territory in 1992 — they weren't at war.
- **Correct fix 1:** Large scoring penalty for RS attacking HRHB-controlled OSIDs outside Posavina (~-400)
- **Correct fix 2:** Remaining OOB home municipality corrections — more RS brigades in Drina Corps AOR

### Gap 3: Central Corridor — RS Overruns ARBiH Territory [CORRIDOR 77.7%]
- **Symptom:** ~13 extra RS OSIDs in Tešanj, Zavidovići, Kakanj, Maglaj
- **Root cause:** ARBiH 3rd Corps brigades (Zenica, ~15–20k men) not defending organically. Current weight=80 insufficient vs RS 1st Krajina pressure.
- **Historical reality:** 3rd Corps held a continuous corridor through Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993. This was their core defensive mission.
- **Correct fix:** Increase 3rd Corps "Central Corridor Counter" weight (80→110–120) AND/OR ensure 3rd Corps brigades spawn in corridor municipalities (OOB home_mun review)

### Gap 4: ARBiH Attacks Too Much (87 orders over 40 weeks)
- **Symptom:** RBiH issues 87 attack orders. Even this is too many for an arm-embargoed army defending from siege.
- **Root cause:** `general_defensive` stance still allocates attack shares. Most attacks likely from enclave brigades or 2nd Corps opportunism.
- **Historical reality:** ARBiH was almost entirely defensive in 1992. No ammunition for offense. Defending urban centers.
- **Correct fix:** Enclave brigades: attack_share = 0.0 (when supply=CRITICAL, attack_score will anyway be negative). Global ARBiH attack_share reduction for early war period.

### Gap 5: Casualty Distribution Wrong — ARBiH Absorbs Too Few Casualties
- **Symptom:** Total n254 casualties: ~27k (attacker+defender combined). At KIA_FRACTION=0.25 → ~6.75k KIA. Historical target at w40: ~20–23k KIA total. Deficit: ~3×.
- **Deeper symptom:** Defender casualties (~3.1k) are minimal. ARBiH historically had MORE total KIA than VRS (30k vs 24k over full war) despite being predominantly defenders. In the game, ARBiH defenders barely bleed.
- **Historical reality (BB evidence):**
  - 5th Corps fought "harder and more grimly" as pushed back — inverse of normal morale collapse (BB2 p556)
  - Srebrenica engagements: VRS lost 30 KIA + 100 wounded in ONE action (BB2 p405) — defenders also bled heavily
  - HV 81st Guards (400–500 elite) took 40 casualties to dislodge 120 VRS defenders at Previle Pass (BB1 p456)
  - "Bitterly contested" Donji Vakuf — some of the hardest-fought ground of the entire war (BB2 p484)
  - ARBiH fighters used "iron pipes filled with nails" and still fought hard (BB2 p416)
- **Root cause:** Defenders who CAN retreat DO retreat, taking minimal casualties. The engine models this correctly for conventional defense, but ARBiH defenders often chose NOT to retreat because retreat = abandoning civilians/families, and there was nowhere safe to go. The "no retreat option" → higher absorption — this is only partially modeled (lastStand at complete encirclement). Between encirclement and free defense lies the "homeland defense" zone that the engine does not capture.
- **Correct fix:** "Homeland Determination" mechanic — when a brigade defends its home municipality or an enclave, apply a power multiplier (+20–30%) and casualty multiplier (×1.3–1.5) that shifts outcomes toward stalemate/costly while raising total casualties on both sides.

### Gap 6: VRS Troop Count 116k vs 100k Target
- **Symptom:** VRS spawns ~116k personnel; target is ~100k (historically ~90–100k by December 1992)
- **Root cause:** `FACTION_POOL_SCALE` RS=0.35 generates excess recruits
- **Correct fix:** Lower to RS=0.30 (estimated result: ~97–100k)

---

## Lessons Learned

### L1 — OOB home municipalities matter enormously
**Session:** 2026-02-28 (n253→n254)
Brigade spawn location (home_mun) determines initial placement. Correcting 4 brigades
(107th Gradačac, 108th Brčko, 115th Zrinski, VRS 2nd Sarajevo) moved RS from 392 to 422
— a +30 OSID swing for 4 OOB fixes. Brigade spawn is the highest-leverage calibration knob.
**Do instead:** Before any AI tuning, audit all brigade home municipalities against OOB master docs.

### L2 — avoided_osids is a crutch, not a fix
**Session:** 2026-02-28 (n254→n255)
Adding avoided_osids for 36 RBiH Drina OSIDs caused RS to DROP from 422 to 406.
Blocking RBiH from attacking Drina redirected their attack slots to OTHER RS targets.
Net effect: worse. The correct fix changes the AI's incentive structure materially.
**Exception:** Single specific historical anchors (e.g., op:zavidovici:vozuca_2) are
acceptable when there is a clear historiographic reason and no better structural fix.

### L3 — Co-ethnic scoring (-80..+80) alone is insufficient
**Session:** 2026-02-28
RS still attacks HRHB-held OSIDs despite penalty. -80 does not overcome strategic
scoring bonuses. Need explicit RS-HRHB scoring penalty (~-400 outside Posavina):
"VRS would not spend Serb blood for Croatian land unless strategically compelled."

### L4 — Enclave brigades need material deprivation, not behavioral blocks
**Session:** 2026-02-28 (REVISED from initial behavioral fix proposal)
Srebrenica/Goražde/Žepa enclave brigades attack outward. The fix is NOT behavioral
(avoided_osids, attack_share=0 in strategy) but MATERIAL:
- Enclave brigade OOB composition: infantry=1000, tanks=0, art=0, aa=0
- Enclave supply status: always CRITICAL (besieged = no supply)
- CRITICAL supply penalty (-300 for RBiH) makes attack scoring negative → organically stops attacks
**Do instead:** Fix the material conditions. Behavior follows from conditions.

### L5 — normalizeScenario is a whitelist — new fields must be explicitly added
**Session:** 2026-02-28
`scenario_loader.ts:normalizeScenario()` explicitly extracts each known field. Any new
field MUST be added in both return objects. Otherwise silently dropped (same hash).
This burned 2 runs (n252 same as n246).

### L6 — Scenario hash depends on scenario JSON, not OOB data
**Session:** 2026-02-28
Changing `oob_brigades.json` does not change the scenario hash. Always check run folder
name (hash) AND actual territory counts. Same hash ≠ same results if OOB changed.

### L7 — Central Corridor: RS pushes too deep
**Session:** 2026-02-28 (n254 analysis)
RS holds ~13 extra OSIDs in Tešanj/Zavidovići/Kakanj that should be RBiH.
ARBiH 3rd Corps Counter (weight=80) not sufficient. Historical: 3rd Corps held
continuous corridor Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993.

### L8 — Sarajevo OSID distribution: count correct, positions wrong
**Session:** 2026-02-28 (n254)
Sarajevo faction counts perfect (RS=21/21, RBiH=10/10). But specific OSIDs wrong —
Trnovo extra RS, Ilidža/Vogošća RS deficit. Positional issue, not quantity. Harder to fix.

### L9 — Phase I bypassed: init_control is a snapshot
**Session:** 2026-02-28
The canonical 40w scenario starts in phase_ii with init_control: "apr1992". April chaos
is not simulated. Casualties and displacement in run summaries do NOT include Phase I.
This is deliberate — calibrating Phase I is harder than starting from known snapshot.

### L10 — "Last stand" mechanic exists but triggers too rarely
**Session:** 2026-02-28 (engine research)
The engine has `lastStandCasMult=2` and defender power ×1.5 when `retreatDests.length === 0`
(complete encirclement). This is correct but only fires in extreme geographic isolation.
Historically, defenders fought like cornered soldiers even when technically adjacent to
one more friendly OSID — because that OSID was just the next position in the last stand.
**Do instead:** Extend the determination mechanic to "homeland defense" (not just encirclement).

### L11 — RS attacking HRHB = RS too weak in priority areas, not too aggressive
**Session:** 2026-02-28 (user correction)
If RS attacks HRHB territory (Herzegovina, Bugojno, Kupres), the diagnosis is NOT
"RS is over-aggressive" but "RS doesn't have enough brigades covering its actual
priorities (Drina valley, Central Corridor, Posavina)." Fix RS brigade positioning first;
then add co-ethnic RS-HRHB penalty to prevent residual attacks.

### L12 — ARBiH was almost entirely defensive in 1992
**Session:** 2026-02-28 (user directive + OOB research)
87 ARBiH attack orders in 40 weeks is already too many. Historical: ARBiH had no
ammunition reserves, no heavy weapons, no logistics. Defending Sarajevo, Tuzla, Zenica,
Bihać. Any attack capability is emergent from 2nd Corps (Tuzla) only. Enclave brigades
(Srebrenica, Goražde, Žepa) had ZERO offensive capability.

### L13 — Homeland defense = last stand psychology even without encirclement
**Session:** 2026-02-28 (BB2 research)
BB2 p556: 5th Corps fighters fought "harder and more grimly" as pushed toward original positions.
BB2 p484: 7th Corps (Donji Vakuf displaced men) were "coldly determined to return to their homes."
Abdić insight (BB2 p538): kept civilians in Pecigrad because defenders lose willingness if
civilians evacuate — population proximity IS the willingness mechanic.
This pattern does NOT require complete encirclement to activate. Brigades fighting in their
home municipality or in an enclave fight with elevated determination organically.
**Engine implication:** `home_mun === defending_mun` is the data hook. No new fields needed.
The OOB already encodes home municipality. Use it as the determination trigger.

### L14 — Defender casualties are structurally too low
**Session:** 2026-02-28
n254: defender total ~3.1k for 40 weeks. Historical ARBiH KIA alone: ~11.5k by week 40.
Gap of ~10k. Root: defenders retreat when adjacent friendly exists (taking minimal casualties).
ARBiH historically did NOT retreat like conventional armies — they absorbed casualties.
Fix: Homeland determination mechanic must RAISE defender casualty rate in home/enclave
positions even when they succeed in holding. A stalemate in their home municipality should
bleed the defender at 0.8× rate (current) × 1.35 (homeland mult) = 1.08× — meaningful.

### L15 — Morale is separate from cohesion; population affinity drives retreat resistance
**Session:** 2026-02-28 (user directive)
Cohesion = tactical effectiveness (how organized/trained a unit is).
Morale = willingness to fight and resist (how much a unit WANTS to hold).
These are distinct. A badly organized militia defending its home village has LOW cohesion but HIGH morale.
A professional unit fighting for territory it doesn't care about has HIGH cohesion but LOW morale.
Currently the engine conflates both into cohesion. Morale needs to be a separate field.

**Population affinity as the data hook (NOT home_mun):**
The retreat/determination decision should be based on the 1991 CENSUS POPULATION of the OSID
being defended — not the brigade's home_mun (which is a coarser proxy).
- OSID with 80% Bosniak population → ARBiH defenders EXTREMELY reluctant to retreat
- OSID with 80% Serb population → ARBiH defenders more likely to yield (fighting for enemy land)
- OSID with mixed population → intermediate determination
This data already exists in the engine (1991 census drives displacement calculations).
Population affinity = fraction of OSID population sharing ethnicity with the defending faction.
**Effect:** High-affinity defense → morale bonus → retreat requires worse outcome → casualties absorbed instead of territory yielded.

### L16 — Both attacker and defender bleed more in homeland defense engagements
**Session:** 2026-02-28 (BB1/BB2 evidence)
BB1 p456: 40 attacker casualties to dislodge 120 mountain defenders. BB2 p405: 130 VRS
casualties in one Srebrenica action. The pattern: determined defense costs BOTH sides dearly.
The engine's lastStand mechanic (×2 casualties both sides) captures this at encirclement.
Homeland determination should extend this (×1.35 casualty mult) to home-municipality defense.
Net effect: more total casualties in contested areas, VRS bleed higher when hitting
determined ARBiH positions, ARBiH defender casualties rise toward historical.

### L17 — Command hierarchy is already correct — brigades don't freelance
**Session:** 2026-02-28 (BB research + engine research)
BB1 p417, BB2 p540: All VRS operations were corps-directed or Main Staff-coordinated.
BB2 p401, p506: ARBiH organized under Corps → Operational Groups → Brigades.
The engine's three-tier bot AI (Army → Corps → Brigade) matches history.
CorpsDirective generates offensive_targets; brigades execute from the list.
**Exception:** Enclave brigades (Srebrenica, Goražde) were de facto autonomous due to
isolation, but formally under 1st Corps / 28th Division / 81st Division.

### L18 — Rear-area cleanup was a distinct early-war phase for all sides
**Session:** 2026-02-28 (BB research)
VRS systematically secured Serb-majority areas by eliminating hostile populations (Prijedor,
Sanski Most, Kotor Varoš, Ključ, Zvornik). Used paramilitaries + police + regular forces.
Corps-directed, Main Staff-coordinated. (BB1 PATTERN_REPORT, BB1 pp496-501)
ARBiH also cleaned isolated settlements (Bilješevo, Čardak — user-confirmed, not in BB KB).
This is a phase-specific priority: weeks 0-10, corps directives should include "cleanup"
targets — undefended hostile-population OSIDs behind the front line.
**Data hook:** Population composition (1991 census). High hostile population + undefended =
high cleanup priority. Not faction-coded — emerges from population data.

### L19 — ZoC-locked frontlines need defense extension
**Session:** 2026-02-28 (engine research)
Current linked ZoC blocks enemy MOVEMENT but provides NO DEFENSE. An unoccupied OSID in a
ZoC chain has no defender if attacked — easy victory. Historically a brigade covers its
entire sector, not just the settlement it sits in. Patrols, outposts, firing positions span
the whole zone.
**Fix:** ZoC-locked brigades should defend adjacent OSIDs in their linked ZoC chain at 100%
readiness. When an attacker targets an empty ZoC'd OSID, the nearest locked brigade in the
chain provides the defense. This simulates continuous frontline defense.
**Implication:** Fewer "free" OSID captures. More combat, more casualties. Front stabilizes
faster. This is probably the single biggest behavior fix for realistic front lines.

### L20 — Cut-off brigades need breakthrough/escape mechanic
**Session:** 2026-02-28 (BB research)
Current engine: cut-off = last stand → win or die (personnel=0, inactive). No escape.
Historical: HVO brigades from Derventa/Modriča retreated to Orašje through hostile territory.
Orasje Corps originally had 6 brigades (101st-106th, BB1 p437-438). After "heavy combat
losses in 1992 and early 1993" they consolidated at Orašje (3,000 dead + 10,000 WIA total
war, BB1 p462).
**Fix:** Cut-off brigades should attempt breakthrough toward nearest friendly territory.
High-casualty movement through hostile OSIDs. Not guaranteed — may fail and be destroyed.
But better than instant annihilation.

### L21 — Player-proofing: model conditions, never assumptions
**Session:** 2026-02-28 (user directive)
"A real player will take a bot side at some point and we don't want HVO breaking from Livno
to Banja Luka just because RS bot 'knows' HRHB won't attack."
HRHB didn't attack RS because: (A) no offensive power — light infantry, no tanks, limited
artillery → low attack scores vs entrenched VRS. (B) no strategic incentive — war aims don't
include RS territory. Both must be modeled through CONDITIONS:
- (A) HVO equipment composition: historically accurate → material limit on offensive capability
- (B) HVO army priorities: no targets in RS territory → bot doesn't generate offensive orders
If a player takes HRHB: they ALSO can't attack RS because equipment composition makes it
impossible to overcome VRS entrenchment. Not because of a bot rule.
RS bot defensive posture should be based on threat assessment (power ratios, brigade counts),
not on faction-specific "HRHB won't attack" assumptions.

### L22 — Displacement system is complete and deterministic
**Session:** 2026-02-28 (research finding)
The engine has a full displacement system: 4-turn takeover timer + 4-turn camp maturation,
kill fractions by ethnicity (10% normal, 35% enclave overrun), flee-abroad fractions
(RS=30%, HRHB=25%, RBiH=0%, Posavina Croats=70%), and brigade-gated routing.
The n254 displacement numbers are not wrong — they reflect Phase II only.
Phase I (~1M+ historical) is captured in the init_control snapshot, not re-simulated.

### L26 — Enclave morale drift nullifies initial_morale reduction
**Session:** 2026-03-01 (n275 analysis)
Enclave brigades get +2/turn (affinity: Bosniak majority) + +3/turn (encirclement + own pop)
= **+5 morale/turn**. Starting at morale 55 → reaches 70 (resist floor) in 3 turns.
P2 (morale 70→55) was effectively nullified. Drina match rate went from 68.8% to 65.6% (WORSE).
**Do instead:** Don't rely on initial_morale alone. Must either cap morale drift for supply-CRITICAL
brigades, or mark enclave supply as permanently CRITICAL and add supply drain on morale.

### L27 — FACTION_POOL_SCALE affects init pools, not ongoing recruitment
**Session:** 2026-03-01 (n275 analysis)
RS pool scale 0.28→0.25 reduced init militia pools but VRS end strength went UP (115k→117k).
Ongoing troop growth is driven by `recruitment_capital_trickle` (5/turn) and `max_recruits_per_faction_per_turn`
(4 brigades/turn) in the scenario JSON, not by FACTION_POOL_SCALE.
**Do instead:** To reduce VRS end strength, lower RS `recruitment_capital_trickle` and/or `recruitment_capital`
in the scenario JSON. Pool scale is a minor lever.

### L28 — Morale absorption casualty multiplier needs sufficient absorption events
**Session:** 2026-03-01 (n275 analysis)
P5b (MORALE_ABSORPTION_CAS_MULT = 1.35) implemented but total KIA dropped from 6,082 to 5,587.
Root cause: fewer morale absorptions (enclave morale started at 55 → fewer absorptions) offset the
per-event multiplier. The casualty mult is correct design but needs a steady population of
high-morale defenders to have significant aggregate effect.
**Do instead:** Fix the enclave overexpansion first (so more regular ARBiH vs VRS engagements
occur with morale ≥ 70), then the casualty mult will have its intended effect.

### L24 — Bugojno is 3rd Corps (Zenica), not 4th Corps (Mostar)
**Session:** 2026-03-01 (user correction)
Bugojno-Konjic Defense army priority was assigned to `arbih_4th_corps` (Mostar/Neretva).
Historically, Bugojno is in the 3rd Corps (Zenica) area of responsibility. 4th Corps
covers Neretva valley only (Jablanica, Konjic, Mostar). Fixed in `bot_strategy.ts`:
`corps_id: 'arbih_4th_corps'` → `'arbih_3rd_corps'` for Bugojno-Konjic Defense.
**Do instead:** Always cross-check army priority corps assignments against OOB tables above.

### L25 — Displacement continuous pressure pathway uses wrong routing
**Session:** 2026-03-01 (user correction)
`src/state/displacement.ts` (continuous pressure) routes displaced via **supply reachability**
— which fails for besieged factions. `displacement_routing_data.ts` has correct static
routing tables (47 sub-regions × 3 ethnicities, Phase M4). The continuous pressure pathway
must be connected to these tables. Supply has nothing to do with refugee routing — people
flee on foot along roads. Prijedor Bosniaks → Travnik/Jajce/Zenica/Bihac (not Tuzla).
**Do instead:** All displacement pathways must use the same routing tables.

### L29 — DO NOT add Srebrenica/Gorazde to Drina Sweep targets
**Session:** 2026-03-01 (n280 analysis — 81.9% match, reverted)
Adding Srebrenica and Gorazde to the RS Drina Sweep target_municipalities DILUTED Drina Corps
attacks. With only 2 attack slots per turn, the weight-160 priority sent attacks toward heavily
fortified enclave concentrations (7 brigades at Gorazde, 5 at Srebrenica) where they FAIL,
instead of targeting weaker Bratunac/Visegrad/Cajnice where they succeed.
Drina match rate COLLAPSED from 73.4% to 67.2%.
**Rule:** Never add fortified positions to sweep priorities. Sweeps should target lightly
defended or undefended areas. Enclaves are containment targets, not sweep targets.

### L30 — DO NOT reduce enclave personnel below 900/1100
**Session:** 2026-03-01 (n281 analysis — 81.8% match, reverted)
Reducing Gorazde 1100→700 and Srebrenica 900→600 paradoxically made Drina WORSE (65.6%
vs 73.4%). The cascade: weaker enclave brigades change battle outcomes and force
redistribution patterns throughout the Drina valley. RS ends up with FEWER Drina OSIDs (73
vs 81). The exact mechanism is unclear but reproducible.
**Rule:** Enclave personnel levels (1100 Gorazde, 900 Srebrenica, 600 Zepa) are calibrated.
Do not change without understanding the cascade effects.

### L31 — Reducing RS attack share globally hurts all regions
**Session:** 2026-03-01 (n280 analysis)
RS w0-20 attack share 0.28→0.22 reduces 1KK attacks from 7 to 5 per turn BUT also reduces
Drina/EBK/SRK attacks proportionally. Net effect: RS loses territory everywhere, not just
Central Corridor. Overall match rate dropped. The Central Corridor overruns come from
OPPORTUNISTIC targets (all front-line enemy OSIDs during general_offensive), not from
priority-based targeting. Reducing share doesn't selectively reduce opportunistic targets.
**Do instead:** Need per-corps attack budget or corps-level avoid mechanisms.

### L32 — OOB tags must be propagated through ALL formation creation paths
**Session:** 2026-03-01 (n277-n279 investigation)
Tags added to `oob_brigades.json` were silently dropped because:
1. `OobBrigade` interface had no `tags` field → loader ignored them
2. `oob_phase_i_entry.ts` builds tags from scratch (`mun:`, `corps:` only)
3. `recruitment_engine.ts` also builds tags from scratch (adds `equip:`)
In `player_choice` mode, brigades go through `recruitment_engine.ts` (which adds `equip:` tag),
not `oob_phase_i_entry.ts`. Fixed all three: loader, phase_i_entry, and recruitment_engine.
**Rule:** Any new OOB field must be propagated through ALL formation creation paths.
The `equip:` tag on the formation reveals which path created it.

### L33 — Opportunistic target municipality filter is the correct P3 fix
**Session:** 2026-03-01 (n283-n284)
A blunt count-based corps target cap (`max(5, floor(0.75 × subordinates))`) starved small corps with
legitimate sweep missions (Drina Corps: 10 brigades, capped from 30→7 targets). n283 dropped to 82.7%.
The correct approach: filter opportunistic targets (undefended_front, weak_enemy_osids) to only include
OSIDs in municipalities that appear in the corps's active army priorities. This preserves:
- All priority targets from `findTargetOsidsFromMunicipalities` (unlimited)
- Rear-area cleanup targets (no municipality filter)
- Named operation targets (no municipality filter)
- Pocket targets (always attack surrounded enemies)
While preventing corps from sprawling into non-priority municipalities. n284: 85.1% (641/753).
**Rule:** Corps opportunistic targets must be filtered by priority municipalities, not count-capped.
**Key result:** 1KK stopped sprawling into tesanj/maglaj/zavidovici (not in any RS priority).

### L34 — Blunt corps target cap HURTS small corps with big AoR
**Session:** 2026-03-01 (n283)
`max(5, floor(0.75 × subordinates))` caps Drina Corps (10 brigades) at 7 targets from 30+.
Drina has 12 priority municipalities with many target OSIDs — capping these destroys the Drina Sweep.
83.7% → 82.7% (−7 matches). REVERTED. Use municipality filter instead.

### L35 — Local front density modifier improves defensive calibration
**Session:** 2026-03-01 (n291→n295)
Front density = assigned_brigades / coverage_length (edge count). Below 0.5 density → defense penalty
(down to 0.6×); above 1.0 density → mutual support bonus (up to 1.25×). Applied multiplicatively to
both `computeDefenderPower` and `computeZocDefenderPower` in resolver + predictor.
**Result:** +3 OSIDs (84.7% → 85.1%). Rewards concentrated defense without penalizing it.
Correctly identifies thin RS fronts as vulnerable and concentrated NE positions as strong.
**File:** `src/sim/combat/local_front_defense.ts`. Pipeline step `compute-local-fronts`.
**Rule:** Front density is a DERIVED state (recomputed each turn). Never serialize as ground truth.

### L36 — Per-brigade defense_terrain_bonus captures unit-specific terrain mastery
**Session:** 2026-03-01 (n295)
OOB field `defense_terrain_bonus` → FormationState → `× (1 + bonus)` in defender power.
Distinct from per-OSID terrain (geographic) — this is unit quality: years of fighting in same terrain.
Assigned: 255th Slavna (Teočak, +30%), 246th Vitezka (Šapna, +25%), 328th/351st Mountain (Zavidovići, +20%).
Stacks multiplicatively with honor: 246th Vitezka (1.20× honor × 1.25× terrain = 1.50× total defense).
**Key insight:** honors are offensive + defensive; defense_terrain_bonus is defense-only. This lets
specialized defenders hold without making them better attackers (which they weren't historically).
**Rule:** defense_terrain_bonus must be synced between attack_resolution_osid.ts and combat_predictor.ts.

### L38 — Honor-based DTB effectively protects enclaves/pockets
**Session:** 2026-03-01 (n335)
Auto-derived defense_terrain_bonus from honor designation: slavna +10%, viteska +15%.
Falls back to honor DTB when no explicit OOB defense_terrain_bonus set.
Combined effect: viteska brigades get 1.20× honor + 1.15× DTB = 1.38× total defense.
**Key outcome:** Bihać pocket (5th Corps, multiple viteska brigades) now **survives**.
Previously falling to RS in n334. Historically accurate — these units earned honors through defense.
**Rule:** Explicit OOB defense_terrain_bonus overrides honor DTB (not additive).

### L39 — Brčko initial control override insufficient alone
**Session:** 2026-03-01 (n335)
Setting `op:brcko:brcko` and `op:brcko:krepsic` to RS at init doesn't prevent RBiH recapture.
East Bosnian Corps Operacija Koridor has 1-OSID objective (`op:modrica:garevac_2`), too narrow.
**Fix needed:** Expand Koridor targets to include Brčko-area OSIDs, or increase EBC force commitment.

### L40 — OSID-based operations improve targeting precision but may reduce opportunism
**Session:** 2026-03-01 (n335)
Municipality-scanned targets produced operations attacking wrong priorities.
OSID-specific targets ensure each operation pushes exactly where intended.
Overall match: 87.6% vs 87.4% (n314) — marginal. But Drina +10.2pp and Sarajevo +9.7pp.
Posavina NE dropped to 72.5% — tighter targeting misses some opportunistic captures.
**Rule:** OSID targets are correct approach; expand per-operation target lists rather than reverting to mun scan.

### L41 — Planning phase creates correct 1-turn execution delay
**Session:** 2026-03-01 (n335)
Operations inject at turn 0 in `planning` phase, execute at turn 1.
Historically more accurate — JNA plans existed but needed coordination.
Staging_osid during planning phase ensures brigades concentrate before attacking.
**Rule:** Do NOT revert to turn-0 execution. The 1-turn delay is intentional.

### L42 — Supply readiness gate must respect supply_reserves_enabled
**Session:** 2026-03-02 (n359)
`computeSupplyReadiness()` in `sector_offensive.ts` read OSID supply reachability data even when
`supply_reserves_enabled=false`. The `deriveSupplyStateByOsid()` pipeline step runs unconditionally,
producing reachability data that flagged forward VRS positions as 0% adequate supply at game start.
This silently aborted ALL 5 pre-planned VRS operations on turn 1 (`supply_readiness=0.00 < SUPPLY_READINESS_ABORT=0.4`).
**Fix:** Early return `1.0` when `!state.meta?.supply_reserves_enabled`.
**Rule:** Any function gated by supply data must check `supply_reserves_enabled` before using reachability/reserve values.

### L43 — Each operation type needs exactly one lifecycle manager
**Session:** 2026-03-02 (n359)
`evaluateOperationProgress()` in `bot_corps_ai.ts` handled ALL operations including `sector_attack`,
using global `PLANNING_DURATION=2` instead of the op's own `planning_duration`. Meanwhile
`advanceSectorOffensives()` in `sector_offensive.ts` is the dedicated sector_attack handler with
per-op duration. Both managing planning→execution transitions caused race conditions and wrong timing.
**Fix:** `if (op.type === 'sector_attack') continue;` in `evaluateOperationProgress()`.
**Rule:** Operation type handlers must be exclusive — one handler per type, no overlap.

### L23 — Orasje pocket: 3 HVO brigades stay, Derventa/Modrica brigades fall back
**Session:** 2026-03-01 (user directive)
3 HVO brigades currently under ARBiH 2nd Corps coordination are supposed to REMAIN in
the Orasje pocket throughout the war. These are the Posavina NW OZ garrison.
Separately, HVO brigades from Derventa, Modrica, and other Posavina municipalities that
RS captures in weeks 1–8 must fall back to Orasje (not be destroyed in place).
Historical: HVO Orasje Corps originally had 6 brigades (101st–106th, BB1 p437–438) —
the 3 garrison brigades plus retreating Derventa/Modrica units that consolidated there.
After heavy combat losses in 1992–early 1993, they consolidated at ~3,000 dead + 10,000
WIA total war (BB1 p462).
**Two fixes needed:**
1. **OOB:** Assign 3 brigades to `hvo_northwest_bosnia` (currently 0) with home_mun in
   Orasje area. These must NOT be reassignable.
2. **Breakthrough retreat:** When RS captures Derventa/Modrica, HVO brigades there must
   attempt high-casualty retreat toward Orasje instead of being destroyed.
   This is the primary historical test case for the N8 breakthrough mechanic.
**Do instead:** Fix the OOB (3 brigades at Orasje) FIRST — this alone may fix the
Orasje gap. Breakthrough retreat is the second layer for Derventa/Modrica fallback.

---

## Known Gaps (as of n295 — 85.1% match rate, 641/753)

| # | Region | Gap (n295) | Root Cause | Fix | Priority |
|---|---|---|---|---|---|
| 1 | DRINA (71.9%) | RS=77 vs painted=99 (−22). Enclaves hold correctly (Srebrenica/Gorazde/Zepa RBiH PASS), but Bratunac(4), Cajnice(4), Visegrad(5), Rudo(2), Foca(2), Vlasenica(4) still RBiH-held. RS Drina Corps too small to sweep 12 muns in 20w. | Structural: initial control gives RBiH holdouts across Drina valley; RS Drina Corps needs more firepower. **L29: DO NOT add enclaves to Drina Sweep. L30: DO NOT reduce enclave personnel.** | More RS Drina Corps brigades (OOB) OR Drina offensive window extension OR initial control adjustment | **HIGH** |
| 2 | CORRIDOR (90.4%) | RS=44 vs painted=38 (+6). Improved from 87.2% (n284). Maglaj(3), Doboj(3), Visoko(1), Zavidovici(1). Local fronts + defense_terrain_bonus (328th/351st Mountain) helped. | P3 filter + local front density. Remaining overruns: Doboj is correct RS priority; Maglaj structural. | 3rd Corps strengthening or initial control tuning. Much improved. | **MEDIUM** |
| 3 | C. BOSNIA (81.3%) | RS=37 vs painted=42 (−5). Bugojno still 8+ RS overruns. HRHB takes some Jajce/Travnik. Konjic/Kladanj go RBiH (should be RS). | Mixed: Bugojno overrun persists (2KK Krajina Sweep). Konjic/Kladanj/Jajce are initial-control edge cases. HRHB takes Jajce/Prozor/Novi Travnik (alliance dynamics). | RS 2KK avoid Bugojno muns; HRHB-RBiH alliance tuning | **MEDIUM** |
| 4 | POSAVINA (85.3%) | RS=53 vs painted=65 (−12). Zvornik(8 wrong direction), Brcko(4 RBiH instead RS). Improved from 84.4% (n284) — Lopare jablanica fixed by front density. | Zvornik: Sapna/Teocak holdouts structural. Brcko: 1KK targets it but RBiH holds south bank. defense_terrain_bonus on 246th Vitezka (Šapna) + 255th Slavna (Teočak) helps but doesn't fully solve. | Zvornik initial control; Brcko south structural | **MEDIUM** |
| 5 | VRS strength | 122k vs 100k target (+22k) | All RS brigades mandatory, max_personnel too high. n295 VRS slightly higher than n284 (fewer casualties from stronger defense). | OOB: reduce RS brigade count or max_personnel | **MEDIUM** |
| 6 | SARAJEVO (77.4%) | RS=22 vs painted=21 (+1). Trnovo(3 RS overruns), Ilidza(2 should be RS), Pale(1), Vogosca(1). | Trnovo overruns, Ilidza edges. Unchanged from n284. | Sarajevo Corps priority tuning | **LOW** |
| 7 | HERZEGOVINA (90.3%) | Livno(7 RS→HRHB), Duvno(3), Nevesinje(1), Trebinje(1). Regressed from 94.6% (n284). RS taking Livno/Duvno from HRHB. | RS Herzegovina Corps + 2KK targeting Livno area — may be n291→n295 code delta effect on RS early-war expansion. | Check RS Herzegovina target priorities for Livno/Duvno | **MEDIUM** |
| 8 | Anchors | Zvornik (RS→RBiH), Bihac (RBiH→RS), Teocak (RBiH→RS). | Zvornik holdout, Bihac RS sweep, Teocak structural (255th Slavna spawns w26, pocket may fall before then) | Structural | **LOW** |

---

## Next Actions (Structural, Not Artificial)

**Rule:** Every fix must change material conditions, not impose behavioral blocks.

### N0 — Morale + Population Affinity [Gap 5 — Casualty Distribution] ← SUPERSEDED by Mechanic 1
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 1

The original `home_mun` trigger has been replaced by population affinity from 1991 census data.
Morale is now a separate field from cohesion. Key changes from original N0:
- Trigger: census-based population affinity of OSID, not `home_mun`
- Morale gates retreat resistance (high-morale defenders absorb costly_victory without retreating)
- Encirclement of own-population defenders → morale SPIKE (not collapse)
- Morale drift system: +3/turn for high-affinity defense, −2/turn for low-affinity
- Both sides bleed more in high-affinity contests (1.2× defender, 1.8× attacker for absorbed costly_victory)
- Symmetric: works for all factions equally — VRS also fights hard for Serb-majority OSIDs

### N1 — Enclave Brigade Material Deprivation [Gap 1, 5]
Change enclave brigade OOB compositions in `data/source/oob_brigades.json`:
- Srebrenica brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.4
- Goražde brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.45
- Žepa brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.35
And ensure these brigades are always marked CRITICAL supply in their municipality context.
Expected effect: attack scoring goes negative (-300 CRITICAL penalty) → no offensive orders

### N2 — RS-HRHB Co-Ethnic Penalty [Gap 3]
In `bot_brigade_ai_osid.ts`, add scoring penalty for RS attacking HRHB-controlled OSIDs:
- Outside Posavina corridor: -400 score ("VRS won't bleed for Croat land")
- Within Posavina (Orasje/Brcko area): -100 score (some RS-HVO conflict is historical)
Expected effect: RS redirects attacks to RS priority areas (Drina, Corridor)

### N3 — ARBiH 3rd Corps Corridor Weight [Gap 2]
In `bot_strategy.ts`, increase 3rd Corps "Central Corridor Counter" weight: 80 → 120
Consider also adding specific hold_osids for Tešanj, Maglaj, Zavidovići, Žepče in 3rd Corps directive.
Expected effect: RS pushed back to ~77% → 85%+ in Corridor region

### N4 — VRS Troop Count [Gap 4]
In `src/sim/early_war/pool_population.ts`, lower `FACTION_POOL_SCALE` RS: 0.35 → 0.30
Expected result: VRS ~97–100k (currently 116k)

### N5 — Run n256 [Verification]
After implementing N1–N4:
- Drina should improve significantly (enclave brigades stop attacking)
- Central Corridor should improve (3rd Corps holds)
- HRHB territory should improve (RS-HRHB penalty redirects RS)
- VRS troop count should drop to target range
- RBiH attack orders should drop significantly (enclave brigades go quiet)
- Target: >85% overall match rate

### N6 — ZoC Frontline Defense Extension [Gap 6 — Free OSID Captures]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 2
ZoC-locked brigades defend adjacent empty OSIDs at 50% entrenchment, 50% casualty exposure.
Expected: free OSID captures drop from ~188 to <50; more actual combat required.

### N7 — Per-Municipality Displacement Routing [Displacement Correctness]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8
Replaces generic `FALLBACK_ROUTES_BY_FACTION` with origin-specific routing tables for all
110 municipalities, 8 geographic regions, and 3 displaced ethnicities. Adds OSID-level tracking
of displacement origins and destinations. Design complete — ready for implementation.

### N8 — Cut-Off Brigade Breakthrough + Orasje OOB [HVO Posavina] ← SEE L23
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 4
**Two-part fix (per L23):**
1. **OOB first:** Assign 3 HVO brigades to `hvo_northwest_bosnia` with home_mun in Orasje area.
   These are the garrison that STAYS. This alone may fix the Orasje gap (currently 0 brigades).
2. **Breakthrough retreat second:** HVO brigades from Derventa/Modriča attempt high-casualty
   retreat toward Orasje when RS captures those municipalities. Primary historical test case.
Historical: HVO 101st–106th Brigades (BB1 p437–438). Derventa/Modriča units fell back to
Orašje and consolidated there. 3 brigades under 2nd Corps coordination must stay at Orasje.

### N9 — Rear-Area Cleanup Priority [Early-War Territory]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 3
Census-driven corps directive priority for weeks 0-10: secure hostile-population OSIDs
behind front line. Player-proof (available to all factions equally).

### N10 — Phase Restructuring [Architecture]
Peace Phase → War Phase. No Phase 0/I/II distinction. When war starts, all mechanics active.
`init_control: "apr1992"` is turn 0 of War Phase. Displacement runs from turn 0.

### N11 — Deferred: 52w Validation
After 40w converges to >85%, run 52w to verify front freezes appropriately at w40–52.

---

## Post-n268 Iteration Plan (2026-03-01)

**Status of N0–N11 after Phase M:**
- N0 (Morale + population affinity): **PARTIAL** (Phase M2). Morale field, drift, retreat resistance implemented. **BUT: casualty multiplier NOT implemented.** Morale ≥ 70 prevents retreat on costly_victory, but absorbed engagement does NOT increase casualties for either side. L13–L16 (homeland determination → ×1.35 casualty mult) is documented but missing from `attack_resolution_osid.ts`. This is the primary reason defender casualties are 2,718 total vs ~11,500 historical ARBiH KIA at w40.
- N1 (Enclave material deprivation): **PARTIAL** (Phase M3). Enclave OOB infantry-only + morale 70, but morale 70 = resist floor → they NEVER retreat and counterattack. Needs morale 70→55.
- N3 (3rd Corps corridor weight): **DONE** (Phase M4). Weight 80→120. Still insufficient — RS overruns +16 in corridor.
- N4 (VRS troop count): **PARTIAL**. Pool scale lowered 0.35→0.28. Still 115k vs 100k target. Needs 0.28→0.25.
- N6 (ZoC frontline defense): **DONE** (Phase M2 + n295). Virtual ZoC defense at 50% readiness + Local Fronts density modifier (P6). defense_terrain_bonus for key brigades.
- N7 (Per-municipality displacement routing): **DONE** (Phase M4). 47 sub-regions × 3 ethnicities.
- N8 (Orasje OOB + breakthrough): **NOT STARTED**. See L23.
- N9 (Rear-area cleanup): **DONE** (Phase M4). REAR_CLEANUP_END_WEEK = 12.
- N10 (Phase restructuring): **DONE**. Peace/War lifecycle migration complete. See Phase M refactor-pass report.

### Post-n268 Next Actions (Priority Order)

#### P1 — Continuous displacement under hostile control [Gap 7]
When faction X controls a municipality, non-X population should drain at a configurable
rate per turn (e.g. 5–10% of hostile population per week). This does NOT need settlement
flips — it models ongoing ethnic cleansing as a consequence of territorial control.
Current displacement requires a settlement flip + 4-turn timer. Hundreds of thousands of
Bosniaks in RS-controlled Banja Luka, Prijedor, Bijeljina, Zvornik are never displaced.

**CRITICAL BUG (user-identified, 2026-03-01):** The continuous pressure pathway in
`src/state/displacement.ts` uses **supply reachability** for routing — NOT the static
routing tables in `displacement_routing_data.ts`. Supply reachability fails for besieged
factions (no supply path exists), so 98% of displaced_out → lost_population. The routing
tables already exist (Phase M4, 47 sub-regions × 3 ethnicities) and are correct:
- Prijedor Bosniaks → `KRAJINA_NORTHWEST` → Travnik, Jajce, Zenica, Bihać (NOT Tuzla)
- Supply has **nothing** to do with refugee routing — people flee on foot along roads

**Implementation:** New pipeline step in war turn: for each municipality, if controller ≠
population majority ethnicity, drain `HOSTILE_DRAIN_RATE × hostile_pop` per turn into
displacement routing. Use existing routing tables from `displacement_routing_data.ts`.
Also fix continuous pressure pathway to use same routing tables instead of supply reachability.

#### P2 — Enclave morale 70→55 [Gap 1 — CRITICAL, single biggest territory improvement]
Enclave brigade `initial_morale` in OOB: 70 → 55. Since `MORALE_RESIST_FLOOR = 70`,
this means enclave brigades at morale 55 WILL retreat on costly victories instead of
absorbing them. They stop counterattacking outward because morale < floor means retreat
resistance doesn't activate. Expected improvement: ~24 OSIDs in Drina alone.
**One-line OOB change** for 13 enclave brigades in `data/source/oob_brigades.json`.

#### P3 — Reduce corps target sprawl [Gap 8 — enables concentration]
Corps directives currently pass ALL army priority targets through as offensive_targets.
VRS 1st Krajina: 35 brigades / 35 targets = 1.0 brigades per target — no concentration
is physically possible. Pioneer + concentration mechanics are inert.
**Fix:** Cap directive `offensive_targets` to `floor(assigned_brigades × 0.5)`, selecting
the highest-priority subset. With 35 brigades → 17 targets → ~2 brigades per target.
Corps can rotate targets over time. This naturally creates the concentration the pioneer
mechanic needs to function.

#### P4 — ~~Increase free-capture casualties~~ **RESOLVED — militia already inflicts casualties**
**Correction (2026-03-01):** The earlier "180 attacks with 0 casualties" was WRONG. Even
militia-only defense (`pop × MILITIA_DEFENSE_RATIO × 0.25 = ~37.5 power`) produces a real
battle with a decisive_victory outcome. Attackers take `3% × personnel × 1.0 outcome mod`
= ~45 casualties per 1,500-man brigade. Over 180 militia engagements: ~8,100 casualties
(~2,025 KIA). Virtual militia casualties are NOT tracked (no formation), but attacker
casualties ARE recorded via `recordBattleCasualties()`. **No code change needed.**
The real KIA gap (6,082 vs ~16,000) comes from: (a) P5b — morale absorption doesn't raise
casualties, (b) too few total engagements (312 in 40w), (c) no inter-battle attrition.

#### P5 — RS FACTION_POOL_SCALE 0.28→0.25 [Gap 5]
Brings VRS from 115k toward 100k target. Simple constant change in `pool_population.ts`.

#### P5b — Homeland determination casualty multiplier [Gap 6 — KIA too low]
N0 morale retreat resistance is implemented (Phase M2), but the **casualty multiplier** from
L13–L16 is NOT. When a brigade absorbs a costly_victory due to morale ≥ resist floor,
casualties should increase for both sides (attacker ×1.8, defender ×1.2 per L16 design).
Currently: morale check prevents retreat, but `computeCasualties()` runs BEFORE the morale
check — casualties are identical whether the defender retreats or absorbs.
**Fix:** In `attack_resolution_osid.ts`, when morale resistance triggers (outcome = costly_victory
AND morale ≥ MORALE_RESIST_FLOOR AND defender stays), apply post-hoc casualty multiplier:
defender ×1.35, attacker ×1.35 (both sides bleed more in determined defense per BB evidence).
This is the primary lever for closing the KIA gap (6,082 → ~16,000 target).

#### P6 — Front segment assignment (replaces ZoC as defensive model) [Structural] — **DONE (n295)**
~~Current linked ZoC provides only 35% defense power to adjacent OSIDs.~~

**Implemented as Local Fronts mechanic (n295, 2026-03-01):**
- `local_front_defense.ts`: builds `LocalFront` from `assignable_front_segments` + `brigade_front_assignment`
- Coverage density = assigned_brigades / edge_count → defense multiplier (0.6× to 1.25×)
- Applied to both direct defense and ZoC projection in resolver + predictor
- Pipeline step `compute-local-fronts` after `ensure-brigade-front-assignment`
- Derived state (recomputed each turn per Engine Invariants §13)
- **Result:** +3 OSIDs (84.7% → 85.1%). Thin RS fronts weaker, concentrated positions stronger.
- **Complement:** `defense_terrain_bonus` OOB field for historically fortified brigades (255th Slavna +30%, 246th Vitezka +25%, 328th/351st Mountain +20%). Multiplicative, defense-only.
- **What it DOES NOT do:** Force attackers to engage the whole segment. Individual OSIDs are still targetable — density modifier models the softer reality that thin fronts are weaker everywhere.
- **Future:** Could add segment-level concentration requirement (attacker must overcome segment density, not just OSID defender). Deferred until density-only proves insufficient.

#### P7 — Orasje OOB + breakthrough retreat [Gap 4, L23]
Two-part fix per L23:
1. OOB: 3 HVO brigades at Orasje (immediate)
2. Breakthrough retreat for Derventa/Modrica HVO (mechanic)

### Verification Target
~~After P1–P5: expect 85–88% match rate. After P6–P7: expect 88–90%+.~~
**Updated (n295):** P6 done. Current 85.1%. After P1–P5 + P7: expect 87–90%+. Drina gap (71.9%) remains the ceiling constraint — structural OOB/initial-control fix needed for >88%.
