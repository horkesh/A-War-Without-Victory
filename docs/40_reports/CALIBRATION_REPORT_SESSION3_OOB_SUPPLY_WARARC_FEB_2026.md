# Calibration Session 3: OOB Recalibration, Supply System, War Arc

**Date:** 2026-02-25
**Scope:** Brigade OOB recalibration (240 brigades + 40 TDs), full supply system wiring, enclave resilience, war arc mechanics (ARBiH professionalization + RS degradation)
**Runs:** n142 (failed), n143 (failed), n144 (success, 52 weeks)
**Prior session:** n140 baseline — RS 266→397 (52.7%), 23,201 casualties, supply pressure 0 for all factions

---

## 1. Starting State (n140 Baseline)

Session 2 left the simulation with ethnic scoring, init control fix, and territorial calibration working. Key metrics:

| Metric | n140 |
|--------|------|
| RS territory | 52.7% (397/753 OSIDs) |
| Orders | 239 (RS:198, RBiH:23, HRHB:18) |
| Casualties | 23,201 |
| Combat weeks | 45/52 |
| Supply pressure | **0 for all factions, all turns** |

Three critical gaps were identified:

1. **Flat brigade parameters** — all 240 brigades used faction-wide defaults (RS 1200/72, RBiH 800/55, HRHB 800/62), erasing the massive JNA inheritance vs. TO militia asymmetry
2. **Supply system dead** — supply pressure always 0 because `updatePhaseIISupplyPressure()` read settlement-level isolation (always 0 in OSID mode)
3. **No war arc** — ARBiH's transformation from chaotic TO militia to professional army was invisible; RS started strong and stayed strong

---

## 2. Implementation Summary

### Part A: Brigade OOB Recalibration (A1-A5)

**A1-A4: Data recalibration** via automated script applied to `data/source/oob_brigades.json`:

| Faction | Brigades | Personnel Range | Cohesion Range | Equipment Classes |
|---------|----------|----------------|----------------|-------------------|
| RS | 80 | 800-1500 | 62-75 | mechanized (3), motorized (10), mountain (20), standard inf (30), light inf (17) |
| RBiH | 121 | 300-800 | 35-65 | police, light_infantry, mountain, special |
| HRHB | 39 | 650-900 | 52-62 | motorized (3), mountain (10), light_infantry (26) |

~40 `territorial_defense` formations added for municipalities without brigades at turn 0 (RBiH ~25, RS ~8, HRHB ~7). Personnel 200-500, cohesion 25-45, equipment police/light_infantry.

RBiH brigades received staggered `available_from` (0-40) reflecting gradual TO-to-brigade formation. Enclave units (Srebrenica 280-284, Gorazde 801-851) received low personnel (300-500) and cohesion (35-45).

**A5: Code changes:**
- `oob_loader.ts`: Extended kind parsing for `territorial_defense`
- `formation_constants.ts`: RBiH defaults lowered (500 personnel, 45 cohesion from 800/55)
- `equipment_effects.ts`: RBiH composition reduced to tanks:1, artillery:3, aa:0 (from 3/8/1); HRHB to tanks:10, artillery:10, aa:2 (from 15/15/3)

### Part B: Full Supply System (B1-B4)

**B1: OSID supply pressure wiring** (critical bug fix):
- `supply_pressure.ts`: Added `supplyStateByOsid` parameter; when present, overrides critical/strained counts from OSID report
- `turn_pipeline.ts`: Passes OSID supply report to consolidation step

**B2: Expanded supply sources:**

| Faction | Previous | Added |
|---------|----------|-------|
| RS | Banja Luka, Pale, Bijeljina | Doboj (S208019), Zvornik (S230545), Trebinje (S226084) |
| RBiH | Sarajevo, Zenica, Tuzla, Bihac | Visoko (S158275), Konjic (S127477) |
| HRHB | Mostar, Grude, Livno | Capljina (S110442), Tomislavgrad (S113611) |

**B3: Bot supply awareness:**
- `bot_brigade_ai_osid.ts`: Added `getAttackerSupplyPenalty()` function with faction-specific penalties:
  - Critical supply: RS -200, HRHB -250, RBiH -300
  - Strained supply: RS -50, HRHB -75, RBiH -100
- Applied at all 5 scoring call sites (VRS 1, ARBiH 2, HVO 2)

**B4: Enclave resilience system** (new file: `enclave_resilience.ts`):
- 5 enclaves defined: bihac_pocket, srebrenica, zepa, gorazde, sarajevo
- Resilience value [0, 30] per enclave, stored in `state.enclave_resilience`
- Growth: +2/turn critical, +1/turn strained, -1/turn adequate (cap at 30)
- Defense bonus: `1.0 + resilience * 0.005` (max 1.15 = +15%)
- Cohesion recovery: `floor(resilience / 10)` (max +3/turn)
- Wired into: turn_pipeline (after supply-osid), attack_resolution_osid (defense bonus), cohesion_drift (recovery)
- Added `enclave_resilience` to GameState type and serializer allowlist

### Part C: War Arc Mechanics (C1-C3)

**C1: Cohesion floor/ceiling** (new file: `faction_progression.ts`):

| Faction | Mechanic | Turn 0 | Turn 13 | Turn 26 | Turn 39 | Turn 52 |
|---------|----------|--------|---------|---------|---------|---------|
| RBiH | Floor (rising) | 35 | 42 | 50 | 56 | 62 |
| HRHB | Floor (constant) | 50 | 50 | 50 | 50 | 50 |
| RS | Ceiling (falling) | 85 | 82 | 78 | 73 | 68 |

Integrated in `cohesion_drift.ts` — drift result clamped to `[floor, ceiling]`.

**C2: Equipment progression** (runs every 4 turns):
- RBiH: +1 artillery per 8 turns, +1 tank per 16 turns (if cohesion > 40)
- HRHB: +1 artillery per 12 turns, +1 tank per 24 turns (if cohesion > 40)
- RS: No additions (peaked at JNA inheritance)

**C3: RS maintenance decay:**
- `getRSMaintenanceCapacityMult(turn) = max(0.5, 1.0 - turn/200)`
- Turn 0: 1.0, Turn 26: 0.87, Turn 52: 0.74
- Multiplied into equipment degradation rate for RS formations

---

## 3. Failed Runs

### n142: "home_mun 'sapna' not in registry"
**Cause:** OOB recalibration script used post-war/wartime municipality names that don't exist in the 1990 pre-war registry.
**Fix:** Corrected 4 invalid municipality IDs:
- `sapna` → `zvornik` (Sapna not a 1990 municipality)
- `doboj_jug` → `doboj` (post-Dayton subdivision)
- `brod` → `bosanski_brod` (RS wartime rename)
- `siroki_brijeg` → `listica` (1992 rename from 1990 name)

### n143: "unexpected top-level key 'enclave_resilience'"
**Cause:** `serializeGameState.ts` has an allowlist of top-level GameState keys. New `enclave_resilience` field wasn't added to it.
**Fix:** Added `'enclave_resilience'` to the `ALLOWED_TOP_LEVEL` set in `serializeGameState.ts`.

---

## 4. Results: Run n144 (52 Weeks)

### 4.1 Territorial Control

| Faction | Initial | Final | Delta | % |
|---------|---------|-------|-------|---|
| RS | 266 | 442 | +176 | 58.7% |
| RBiH | 372 | 243 | -129 | 32.3% |
| HRHB | 115 | 68 | -47 | 9.0% |

vs. Historical reference (Jan 1993): RS 328, RBiH 279, HRHB 132.

**RS overexpanded by +114 OSIDs** vs. Jan 1993 reference. RBiH -36 vs. reference. HRHB -64 vs. reference.

### 4.2 Combat Activity

| Metric | n140 | n144 | Delta |
|--------|------|------|-------|
| Total orders | 239 | 231 | -8 |
| RS orders | 198 | 219 | +21 |
| RBiH orders | 23 | 12 | -11 |
| HRHB orders | 18 | **0** | -18 |
| Flips | 169 | 191 | +22 |
| Casualties | 23,201 | 22,756 | -445 |
| Attacker casualties | — | 19,550 | — |
| Defender casualties | — | 3,206 | — |
| Combat weeks | 45/52 | 48/52 | +3 |
| Defender-absent battles | — | 172 | — |
| Defender-present battles | — | 24 | — |

### 4.3 Force Composition (Week 52)

| Faction | Brigades Active | Personnel | Recruitment Capital |
|---------|----------------|-----------|-------------------|
| RS | 33 | 63,218 | 931 |
| RBiH | 35 (+1 inactive) | 86,587 | 686 |
| HRHB | 19 | 36,832 | 515 |

### 4.4 Anchor Checks

| Anchor | Expected | Actual | Pass |
|--------|----------|--------|------|
| Zvornik | RS | RBiH | FAIL |
| Bijeljina | RS | RS | PASS |
| Srebrenica | RBiH | RBiH | PASS |
| Bihac | RBiH | RS | FAIL |
| Banja Luka | RS | RS | PASS |
| Tuzla | RBiH | RBiH | PASS |
| Sarajevo | RBiH | RBiH | PASS |

5/7 anchors passed (71%).

### 4.5 Weekly Combat Profile

The simulation shows three distinct phases:

**Phase 1 — RS Blitz (Weeks 2-12):** Peak RS offensive with 8-16 orders/week, 7-15 flips/week. RS sweeps undefended territory. Casualties peak at ~1,300 attacker/week. First RBiH orders appear week 6 and 12.

**Phase 2 — Operational Pause (Weeks 13-30):** Combat drops dramatically to 1-7 orders/week, 1-5 flips/week. Heartland decay penalty (-250 from turn 13) + exhaustion of easy targets. Weeks 20-28 show minimal 1 order/week pattern. Week 29 has zero combat.

**Phase 3 — Second Wave + ARBiH Counteroffensive (Weeks 31-41):** Heartland penalty further decays to -150 at turn 31, enabling RS second offensive wave (7 orders week 31, 6 orders week 35). **Week 40: ARBiH counteroffensive emerges** — 7 RBiH orders + 3 RS orders = 10 total, 7 flips. This is the war arc professionalization system working: by turn 40, RBiH cohesion floor is ~56, making brigades capable of offensive operations.

**Phase 4 — Low-Intensity Continuation (Weeks 42-52):** 1-2 RS orders/week, sporadic activity. War grinds toward exhaustion.

---

## 5. What Worked

### 5.1 War Arc Professionalization (C1)
The ARBiH counteroffensive at week 40 (7 orders) is the clearest signal that the cohesion floor system works. RBiH brigades that started at cohesion 35-50 were boosted to the floor of ~56 by turn 40, crossing the threshold for offensive capability. This is historically plausible — ARBiH launched Operation Neretva 93 (corps-level coordination) in September 1993, approximately 18 months after the war began.

### 5.2 Enclave Resilience (B4)
**Srebrenica held.** **Sarajevo held.** The defense bonus (+15% at max resilience) and cohesion recovery (+3/turn at max) made these enclaves resistant to RS assault. This matches historical reality — both held throughout the simulation timeframe.

### 5.3 Second RS Offensive Wave
The heartland penalty time-decay (from n140) combined with war arc mechanics produced a visible second RS push at weeks 31-36 (7 orders week 31, 6 orders week 35). This models the historical pattern of VRS conducting rolling offensives across different axes (corridor 1992, Drina 1992-93, Bihac 1994).

### 5.4 Sustained Combat
48/52 weeks with combat (vs. 45/52 in n140). Only weeks 1, 29, 50, 52 had zero combat. The combination of all systems produces year-long conflict, matching historical reality.

### 5.5 Supply Wiring (B1)
Supply pressure is now non-zero and functional. The bot supply awareness system means brigades in critical/strained supply avoid attacks, preserving enclaves. This was the highest-impact bug fix of the session.

---

## 6. What Didn't Work

### 6.1 Bihac Fell to RS (CRITICAL)
The Bihac pocket — held by ARBiH 5th Corps for the entire war (1992-1995) — fell to RS in the simulation. The enclave resilience system was not sufficient to protect it.

**Likely causes:**
- Bihac pocket OSID prefixes (`op:bihac:`, `op:cazin:`, `op:velika_kladusa:`, `op:bosanska_krupa:`) cover a large area with many OSIDs. Unlike Srebrenica (single OSID prefix), Bihac has a wide front.
- The VRS Bihac avoidance penalty (narrowed to 3 core town OSIDs in n140) may not cover enough of the pocket perimeter.
- Enclave defense bonus caps at +15% — insufficient against concentrated RS attack when pocket has many approach vectors.
- 5th Corps OOB may not be strong enough relative to RS Krajina Corps.

**Recommendation:** Increase VRS Bihac avoidance coverage (expand from 3 core OSIDs to full pocket OSID set). Consider stronger enclave defense bonus for larger enclaves. Review 5th Corps brigade parameters.

### 6.2 Zvornik Stayed RBiH (CRITICAL)
Zvornik should flip to RS in the first weeks — it was one of the earliest and most violent RS takeovers (April 1992). The Drina valley priority scoring should drive this, but the new OOB may have changed the balance.

**Likely causes:**
- RBiH TD/brigade at Zvornik may be too strong relative to available RS Drina Corps brigades in early turns
- Sapna TD was reassigned to Zvornik home_mun, potentially adding defensive strength
- RS brigades may not have Drina priority scoring high enough to overcome defended Zvornik OSIDs in early weeks when heartland penalty is strongest (-400)

**Recommendation:** Review Drina Corps initial dispositions. Consider adding explicit "first-week priority targets" for historically documented early takeovers. May need to reduce Zvornik-area RBiH initial strength.

### 6.3 HRHB Zero Combat Participation
HRHB had 0 attack orders in n144 (down from 18 in n140). The OOB recalibration dramatically weakened HRHB (central Bosnia brigades from 800→700 personnel, cohesion 62→55) while bot supply penalties hit them at -250/-75 for critical/strained.

**Likely causes:**
- Weaker HRHB brigades can't pass power ratio threshold for attacks
- Supply penalties may be too aggressive for HRHB's small force
- No HRHB-specific offensive trigger (HVO historically fought defensively in Central Bosnia but actively in Herzegovina)

**Recommendation:** Review HRHB power ratio thresholds. Consider lower supply penalties for Herzegovina-based HVO (better Croatian supply pipeline). May need HVO-specific offensive scoring for Mostar/Herzegovina area.

### 6.4 RBiH Low Offensive Activity
Only 12 RBiH orders in 52 weeks (down from 23 in n140). The weaker initial parameters (cohesion 35-50 instead of 55) make ARBiH brigades unable to attack for most of the first year. The counteroffensive at week 40 (7 orders) shows the system working late, but early/mid-game RBiH activity is too low.

**Likely causes:**
- RBiH starting cohesion too low (35-50) for any offensive capability in first 30 weeks
- Supply penalty (-300 critical) too harsh for RBiH's supply-constrained brigades
- Power ratio threshold prevents attack even when cohesion floor rises — personnel/equipment disadvantage persists

**Recommendation:** Consider lowering RBiH attack power ratio threshold (ARBiH historically attacked at unfavorable odds). Reduce RBiH critical supply penalty to -200. Review whether RBiH "probe attacks" need lower thresholds.

### 6.5 Casualty Asymmetry
19,550 attacker casualties vs. 3,206 defender casualties (6:1 ratio). 172 defender-absent battles vs. 24 defender-present. This means 88% of battles were against undefended territory — the simulation is still primarily about sweeping empty OSIDs rather than contested combat.

**Recommendation:** This is partially structural (RS does take many undefended positions early), but the ratio is too extreme. Need more defended positions earlier (faster RBiH/HRHB brigade mobilization), and more contested combat in mid/late game.

### 6.6 RS Overexpansion
RS at 58.7% (442 OSIDs) vs. Jan 1993 reference of 43.6% (328 OSIDs). The simulation gives RS 114 more OSIDs than the historical reference. While some deviation is expected (the reference is approximate and the simulation abstracts many factors), +35% over reference is significant.

**Likely causes:**
- Weakened RBiH initial parameters (historical: ARBiH was weak but not *this* weak)
- HRHB non-participation means RS faces no opposition on that front
- 172 undefended-territory captures suggest many OSIDs simply have no garrison

**Recommendation:** Review which OSIDs RS takes that it shouldn't. Consider pre-placing ARBiH TDs in more municipalities. Strengthening HRHB would redirect some RS effort.

---

## 7. Comparison: n140 vs n144

| Metric | n140 | n144 | Assessment |
|--------|------|------|-----------|
| RS final % | 52.7% | 58.7% | Worse (RS overexpands) |
| RBiH orders | 23 | 12 | Worse (less ARBiH activity) |
| HRHB orders | 18 | 0 | Much worse (HVO dead) |
| RS orders | 198 | 219 | Similar |
| Combat weeks | 45 | 48 | Better |
| Srebrenica held | No | **Yes** | Much better |
| Sarajevo held | Yes | **Yes** | Maintained |
| Bihac held | No info | **No** | Needs fix |
| War arc visible | No | **Yes** (week 40) | Much better |
| Supply functional | No | **Yes** | Much better |

**Net assessment:** The structural improvements (supply, enclave resilience, war arc) are significant and move the simulation toward historical plausibility. But the OOB recalibration over-weakened RBiH/HRHB, creating a power vacuum that RS exploits. The next tuning session should focus on restoring faction balance without losing the new mechanics.

---

## 8. Files Modified This Session

| File | Part | Changes |
|------|------|---------|
| `data/source/oob_brigades.json` | A1-A4 | Per-brigade parameters for 240 entries + ~40 new TDs; fixed 4 invalid municipality IDs |
| `src/scenario/oob_loader.ts` | A5 | Extended kind parsing for `territorial_defense` |
| `src/state/formation_constants.ts` | A5 | Lowered RBiH defaults (500 personnel, 45 cohesion) |
| `src/sim/phase_ii/equipment_effects.ts` | A5 | Reduced RBiH/HRHB faction composition defaults |
| `tests/brigade_composition.test.ts` | A5 | Updated test expectations |
| `src/sim/phase_ii/supply_pressure.ts` | B1 | Accept OSID supply report, override critical/strained counts |
| `src/sim/turn_pipeline.ts` | B1,B4,C | Pass OSID supply; add enclave resilience + equipment progression steps; RS maintenance decay |
| `src/scenario/scenario_runner.ts` | B2 | Expanded supply sources (6 new SIDs across 3 factions) |
| `src/sim/phase_ii/bot_brigade_ai_osid.ts` | B3 | Supply-aware target scoring with faction-specific penalties |
| `src/sim/phase_ii/enclave_resilience.ts` | B4 | **NEW**: Enclave resilience system (5 enclaves, defense bonus, cohesion recovery) |
| `src/state/game_state.ts` | B4 | Added `enclave_resilience?: Record<string, number>` field |
| `src/sim/phase_ii/attack_resolution_osid.ts` | B4 | Applied enclave defense bonus to defender power |
| `src/sim/phase_ii/cohesion_drift.ts` | B4,C1 | Enclave recovery + cohesion floor/ceiling + territorial_defense kind |
| `src/sim/phase_ii/faction_progression.ts` | C1-C3 | **NEW**: Cohesion floor/ceiling, equipment progression, RS maintenance decay |
| `src/state/serializeGameState.ts` | B4 | Added `enclave_resilience` to allowed top-level keys |

---

## 9. Recommendations for Next Session

### Priority 1: Fix Anchor Failures
1. **Bihac protection:** Expand VRS Bihac avoidance from 3 core OSIDs to full pocket (~15-20 OSIDs covering all Bihac/Cazin/V.Kladusa/B.Krupa prefixes). Consider increasing enclave defense bonus cap for large pockets.
2. **Zvornik early flip:** Add explicit early-turn priority targeting for historically documented Drina takeovers. May need to weaken Zvornik-area RBiH initial forces or add RS Drina Corps attack bonus for first 8 turns.

### Priority 2: Restore Faction Balance
3. **HRHB reactivation:** Lower HVO supply penalties in Herzegovina. Add HVO offensive triggers for Mostar/Herzegovina area. Consider separate power ratio threshold for HVO defensive vs. offensive posture.
4. **RBiH early activity:** Lower RBiH attack power ratio threshold (ARBiH historically attacked at unfavorable odds in early war). Consider "desperation attacks" mechanic for surrounded/besieged units.

### Priority 3: Reduce RS Overexpansion
5. **More defended positions:** Pre-place additional RBiH TDs in Drina valley municipalities. Ensure Zvornik, Vlasenica, Bratunac have initial garrison.
6. **RS attrition:** Consider faster RS cohesion drift in early weeks (JNA units had desertion issues among non-Serb conscripts in April-May 1992).

### Priority 4: Structural Improvements
7. **Casualty model:** 88% undefended battles is too high. Consider adding "light garrison" automatic defenders for controlled OSIDs even without assigned brigades.
8. **Equipment progression validation:** Verify RBiH equipment growth is visible in week 52 formation data (artillery per brigade should be 3-8, up from 0-1).
9. **Minority flight:** Still showing 0 displacement in all 52 weeks — separate investigation needed.

---

## 10. Determinism

All changes are deterministic:
- Sorted iteration via `strictCompare` in all new code
- Pure arithmetic (no `Math.random()`, no timestamps)
- Equipment progression uses sorted formation IDs
- Enclave resilience uses sorted enclave definitions
- Tests: 158 pass (vitest), tsc clean
- Final state hash: `6636175fb7441db4` (deterministic, reproducible)
