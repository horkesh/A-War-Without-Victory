# Bot AI Calibration Report — February 2026

**Date range:** 2026-02-24 (multi-session, runs n115–n125)
**Scope:** Phase II bot brigade AI tuning for historical plausibility (52-week April 1992 scenario)
**Author:** Claude Code calibration session
**Targets:** RS 60–65% territory, sustained combat, historical force trajectories, strategic objective alignment

**Scenario note:** The 40w calibration scenario (apr1992_definitive_40w) uses `recruitment_mode: "player_choice"` so that brigades are spread to front OSIDs and generate attack orders; bottom_up is not used for this scenario. See docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.

---

## 1. Starting State

Before calibration began, a 50-week scenario showed a critical bottleneck: **brigades didn't move**. All 242 brigades were stacked at HQ locations. A multi-part plan was created addressing movement bugs, initial placement, column movement, and OSID-era rates. Parts 1–4 of that plan were implemented in an earlier session.

The first calibration run (n115) after those fixes showed:

| Metric | n115 |
|--------|------|
| RS territory | 57.4% (424 OSIDs) |
| Total orders | 247 |
| Casualties | 19,520 |
| Combat dies | Week ~12 |

The core problem: RS expanded rapidly in weeks 1–12 taking undefended positions, then combat died completely because individual RS brigades couldn't overcome entrenched ARBiH defenders.

---

## 2. Runs Summary

| Run | RS % | OSIDs | Orders (RS/RBiH/HRHB) | Flips | Casualties | Key change |
|-----|------|-------|------------------------|-------|------------|------------|
| n115 | 57.4 | 424 | ~247 | ~170 | 19,520 | Baseline after movement fix |
| n118 | 57.4 | 424 | — | — | — | Heavy weapons multiplier |
| n119 | 57.2 | 423 | — | — | — | Column march fix + 1-hop 'active' fallback |
| n120 | 56.3 | 416 | — | — | — | Linked ZoC defense |
| n121 | 56.3 | 416 | — | — | — | Entrenchment penalty removal |
| n122 | 56.7 | 419 | 199/40/3 | 177 | 19,283 | Corps rebalancing + HVO OOB fixes |
| n123 | 57.6 | 426 | 224/44/4 | 182 | 20,771 | Concentration-aware attacks (3 per target) |
| n124 | 58.1 | 429 | 243/57/5 | 202 | 25,357 | Front-line gap filling |
| n125 | 59.0 | 436 | 253/57/5 | 209 | 25,629 | Corridor priority scoring |

---

## 3. Challenges Encountered

### 3.1 Combat dies at week 12

The single biggest challenge. After RS sweeps undefended positions in weeks 1–12, all remaining enemy positions are defended by entrenched brigades. Individual RS brigades (avg 1,440 personnel) face ARBiH defenders (avg 3,000 personnel, entrenchment 9–12 turns). Power ratio: ~0.64 → predicted "repulsed." No RS brigade will attack.

**Root cause:** Personnel imbalance between factions AND within factions. ARBiH 2nd Corps alone has 75K+ personnel (47% of all ARBiH), while VRS Sarajevo-Romanija Corps has only 2,663. The flat 1,200 initial personnel per RS brigade × uneven brigade counts per corps creates massive imbalance.

### 3.2 Posavina Corridor not taken

VRS Strategic Objective #2 — the Posavina Corridor connecting Banja Luka to Serbia — is not achieved. Brčko remains ARBiH-held after 52 weeks. Investigation (week 5 save analysis) revealed:

- **11 of 13 Brčko OSIDs are RBiH-controlled** (only 2 RS)
- **9,293 ARBiH personnel** defend Brčko vs **3,839 VRS** within reach (2.42:1)
- **Critical bug: ALL 71 RS brigades are assigned to the HRHB-RS front** — zero brigades see RBiH-RS front edges. The attack AI cannot target Brčko because the front-assignment system doesn't assign RS brigades to that front.
- Corridor scoring bonus (+200) was insufficient vs. easier targets elsewhere

### 3.3 Corps-level personnel distribution

Massive structural imbalance in corps personnel:

**VRS:** 1st Krajina has 56,707 (56% of all VRS) vs. Sarajevo-Romanija 2,663 (2.6%). Root causes: (a) 38 brigades assigned to 1st Krajina vs 5 to Sarajevo-Romanija; (b) flat 1,200 initial personnel per brigade; (c) municipality-level reinforcement with no corps-level balancing; (d) brigade personnel cap of 3,000 means SRC can never exceed 15K even at full strength.

**ARBiH:** 2nd Corps has 75,606 (47%) vs. 4th Corps has 0 brigades (all 11 have available_from >= 8). Root causes: (a) 35 turn-0 brigades in 2nd Corps vs 0 in 4th Corps; (b) early surge mobilization favors factions with turn-0 brigades; (c) 18 municipalities with large Bosniak populations feed 2nd Corps pools.

### 3.4 Enclaves fall when they shouldn't

Srebrenica (11 flips), Goražde (16 flips in earlier run, 7 in n125), and Cazin (from n122 run report) fall to RS. Historically these were besieged enclaves that held throughout the war (Srebrenica until July 1995). The sim has no enclave protection mechanism.

### 3.5 HRHB near-zero combat participation

HRHB has only 3–5 attack orders in 52 weeks. Initially flagged as a problem, but research revealed this is **historically correct** for 1992: HVO barely fought VRS (Graz Agreement on territorial division). The real HVO fighting was (a) against RS only in Posavina and (b) against ARBiH starting 1993 (bilateral war, not yet triggered in first 52 weeks).

---

## 4. Avenues Attempted

### 4.1 Heavy weapons multiplier (n118)
Added 1.4–1.6× power multiplier for formations with heavy equipment (tanks, artillery). VRS has higher heavy weapons share than ARBiH, so this was meant to compensate for personnel disadvantage. **Result:** Minimal impact — 0% territory change. The multiplier helps but doesn't overcome the 2:1 personnel ratio.

### 4.2 Linked ZoC defense (n120)
Implemented ZoC-based defense linking where a brigade defends adjacent friendly OSIDs at reduced power. Meant to reduce gaps in the front line. **Result:** Actually reduced RS territory slightly (57.2% → 56.3%) because it strengthened ARBiH defense.

### 4.3 Entrenchment penalty removal (n121)
The scoring function had been double-counting entrenchment — once in the combat prediction (correct) and again as a score penalty (double-dipping). Removed the score penalty. **Result:** Minimal change (56.3% → 56.3%). The combat prediction already included entrenchment in the power ratio.

### 4.4 Corps-level rebalancing (n122)
Changed brigade stacking threshold from faction-wide to per-corps counting. MAX_CORPS_BRIGADES_PER_OSID = 2 per corps. **Result:** Minimal impact alone (56.3% → 56.7%). Correct design decision but insufficient without combat fixes.

### 4.5 Concentration-aware attacks (n123)
MAX_ATTACKERS_PER_TARGET raised from 2 to 3. Added `estimateConcentratedOutcome()` helper that estimates combined power ratio when multiple brigades target the same OSID. A single RS brigade predicts "repulsed" (0.64 ratio), but 3 brigades together predict ~1.07 = "costly_victory." **Result:** +1% territory (57.6%), +30 orders. Helpful but not transformative because not enough brigades are adjacent to the same targets.

### 4.6 Front-line gap filling (n124)
Added `findAdjacentFrontGap()` and `countFactionBrigadesAtOsid()` helpers. When a front-line brigade has no attack target and an adjacent front OSID is undefended, it moves to cover the gap (if ≥2 faction brigades at current OSID). Applied to all three factions, in all combat stances. **Result:** Significant — +10 weeks of combat (33 vs 23), +13 RBiH orders, sporadic late-war combat through week 52. Historically realistic pattern: intense early → stabilization → sporadic adjustments.

### 4.7 Corridor priority scoring (n125)
Added `VRS_CORRIDOR_CRITICAL` pattern list (Brčko, Odžak, Derventa, Bosanski Brod, Orašje, Gradačac). Corridor critical targets get +500 score bonus in weeks 1–30 (vs +200 for general corridor). Lowered minimum outcome threshold to 'repulsed' for corridor critical targets. **Result:** +1% territory (59.0%), +10 RS orders, but Brčko still not taken. Root cause is the front-assignment bug, not the scoring.

---

## 5. Mistakes Made

### 5.1 Wrong assumption: "combat dying is a bug that needs fixing"
Initially assumed that combat dying at week 12 was always bad. The user correctly reframed: combat dying is fine IF strategic goals are met. The real issue isn't that combat stops but that RS doesn't reach 60–65% or achieve its strategic objectives (especially the corridor). This reframe saved significant effort.

### 5.2 HVO subordination errors
Initially reassigned HVO brigades 107th, 108th, 110th, 115th to `hvo_northwest_bosnia`. User corrected: these brigades were historically subordinated to ARBiH corps commands (107th/108th to ARBiH 2nd Corps, 110th Usora to ARBiH 3rd Corps). The 111th (Žepče) correctly remains HVO. Understanding subordination rules was essential.

### 5.3 Wrong target: 65–70% for RS
Initially calibrating toward 65–70% RS territory based on commonly cited "~70% by 1993" figures. User corrected: RS was more like 60–65% at peak. The 70% figure may include loosely contested areas. Adjusting the target down by 5% changes the calibration significantly.

### 5.4 Overlooked front-assignment as the corridor blocker
Spent effort on corridor scoring bonuses and threshold overrides, but the actual blocker was that ALL RS brigades are assigned to the HRHB-RS front — zero see the RBiH-RS front. No amount of scoring change matters if the brigades can't see the targets. This should have been investigated earlier.

### 5.5 Personnel distribution not investigated early enough
The user flagged corps-level personnel imbalance ("Sarajevo-Romanija Corps is severely understaffed, 2nd ARBiH Corps has 75K+"). This is a structural issue that affects everything — combat predictions, force ratios, territorial expansion. It should have been the first thing investigated after the initial movement fix.

---

## 6. Successes Accomplished

### 6.1 Front-line gap filling (most impactful single change)
Extended combat from 23 to 33 weeks of activity. Created historically realistic pattern: intense early combat → stabilization → sporadic late-war adjustments. Applied to all three factions across all combat stances.

### 6.2 Concentration-aware attacks
Enabled multi-brigade coordinated attacks (up to 3 per target) with combined power estimation. This is historically correct — VRS massed corps-level forces for key operations.

### 6.3 Corps-level rebalancing
Correct architectural decision: brigade redistribution managed per-corps rather than faction-wide. Each corps commander manages their zone independently.

### 6.4 HVO OOB corrections
Fixed Posavina OG (101st/102nd Orašje brigades now mandatory), corrected subordination assignments, removed duplicate 108th brigade entry.

### 6.5 Historical strategic goal framework
Research established correct framework for evaluation:
- RS: Six Strategic Objectives (corridor, Drina, Sarajevo siege, ethnic separation)
- HRHB: Protect ethnic territories, not fight RS (except Posavina)
- Combat dying = OK if strategic goals met
- Target 60–65% not 65–70%

### 6.6 Territory trend
RS territory grew from 56.3% (n120) to 59.0% (n125) = +2.7% through cumulative fixes. Still 1–6% below target but trending correctly.

---

## 7. Open Issues (Not Yet Resolved)

| Issue | Impact | Root Cause | Priority |
|-------|--------|------------|----------|
| **Front-assignment bug** | RS brigades can't attack RBiH at Brčko | ALL RS brigades assigned to HRHB-RS front | **Critical** |
| **Corps personnel imbalance** | VRS 1st Krajina 56K vs SRC 2.6K | Flat initial personnel × uneven brigade counts | **High** |
| **Enclaves fall** | Srebrenica, Goražde taken by RS | No enclave protection mechanism | **High** |
| **ARBiH 4th Corps empty** | 0 brigades at week 0, all arrive turn 8+ | OOB data: available_from gating | **Medium** |
| **RS at 59% not 60–65%** | Below historical target | Combination of above issues | **Medium** |
| **ARBiH 2nd Corps oversized** | 75K (47% of all ARBiH) | 35 turn-0 brigades + large Bosniak municipalities | **Medium** |

---

## 8. Files Modified During Calibration

| File | Changes |
|------|---------|
| `src/sim/phase_ii/bot_brigade_ai_osid.ts` | Corps rebalancing, front-line gap filling, concentration attacks, corridor priority, corridor-specific minimum outcome override |
| `data/source/oob_brigades.json` | HVO Posavina OG (101st/102nd mandatory), subordination corrections (107th/108th/110th/115th), removed duplicate 108th |
| `src/sim/phase_ii/attack_resolution_osid.ts` | Heavy weapons multiplier (earlier session) |
| `src/sim/phase_ii/combat_predictor.ts` | Mirrored heavy weapons (earlier session) |

---

## 9. Key Insights for Future Work

1. **Personnel distribution is the hidden governor.** When VRS brigades have 1,440 avg personnel vs ARBiH 3,000, no amount of scoring or AI logic can overcome a 2:1 power disadvantage. Fix the distribution first.

2. **Front-assignment architecture matters more than AI logic.** The Brčko corridor blocker is not about scoring — it's about which front RS brigades are assigned to. Architectural issues trump tuning.

3. **Evaluate against strategic objectives, not raw territory %.** "Did RS take the corridor?" is a better question than "Did RS reach 65%?"

4. **Correct assumptions before optimizing.** The 65–70% target was wrong. The "combat must continue" assumption was wrong. Getting the right evaluation framework saved significant wasted effort.

5. **HVO passivity is a feature, not a bug.** In the first year, HVO not fighting RS is historically accurate (Graz Agreement). The bilateral war comes in year 2.

6. **Front-line gap filling was the most impactful behavioral change.** Simple logic — "if your neighbor on the front is undefended and you have a spare brigade, cover it" — produced the most historically realistic combat pattern.
