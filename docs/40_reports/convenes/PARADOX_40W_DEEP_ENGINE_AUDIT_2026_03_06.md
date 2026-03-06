# Paradox 40-Week Deep Engine Audit — 2026-03-06

## Metadata

- **Scenario:** apr1992_definitive_40w
- **Run ID:** apr1992_definitive_40w__7c821fa7d934716d__w40_n159
- **Weeks:** 40 (April 1992 → January 1993)
- **Final state hash:** 3bfada3e56322112 (deterministic — matches n158)
- **Artifacts:** runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n159/

---

## Executive Summary

The engine is **structurally healthy** — combat causality gate GREEN, 124 attack orders, 103 battles, 85 objective captures, zero invalid operations. Determinism confirmed. However, deep inspection reveals **significant gaps between what the engine tracks and what it actually produces as emergent behavior**. The core territorial problem (RS at 41.6% vs historical 55%) is the headline, but the deeper issues are: casualties are running 2-3× too fast, combat fatigue is effectively inert, brigade postures lack variety, and several subsystems are tracked but don't produce meaningful gameplay differentiation yet.

---

## 1. Tracked Dimensions Summary

### Territory Control (OSID-weighted)

| Faction | Sim (n159) | Historical Target | Delta | Status |
|---------|-----------|-------------------|-------|--------|
| RS | 41.6% (313/753) | 55.3% | **-13.7pp** | FAIL |
| RBiH | 43.0% (324/753) | 32.9% | **+10.1pp** | FAIL |
| HRHB | 15.4% (116/753) | 11.8% | +3.6pp | MARGINAL |

### Control Changes

- Total flips: **34** (all combat-attributed, zero consolidation)
- Direction: RBiH→RS: 29, HRHB→RS: 5
- No RS→RBiH or RS→HRHB flips (no counterattacks)
- Peak municipality: Foča (6), Hadžići (5), Prijedor (4)

### Troop Strengths (end of w40 = ~Jan 1993)

| Faction | Sim Personnel | Historical Target | Status |
|---------|--------------|-------------------|--------|
| ARBiH | 104,502 | 110,000–130,000 | SLIGHTLY UNDER |
| VRS | 103,465 | 90,000–100,000 | SLIGHTLY OVER |
| HVO | 32,922 | 40,000–45,000 | **UNDER by ~25%** |

### Brigade Counts

| Faction | Initial | Final | Added | Historical |
|---------|---------|-------|-------|------------|
| RBiH | 36 | 80 active + 1 inactive | +45 | OK |
| RS | 57 | 77 active | +20 | OK |
| HRHB | 25 | 31 active | +6 | LOW |

### Military Casualties (Casualty Ledger — all causes)

| Faction | KIA | WIA | MIA | Total | Full-War KIA Target | 40w % of Full War |
|---------|-----|-----|-----|-------|--------------------|--------------------|
| RS | 14,876 | 28,113 | 11,009 | 53,998 | ~24,000 | **62% — TOO HIGH** |
| RBiH | 9,382 | 18,125 | 8,068 | 35,575 | ~30,000 | 31% — OK |
| HRHB | 6,010 | 11,358 | 4,329 | 21,697 | ~8,000 | **75% — TOO HIGH** |

### Civilian Casualties

| Faction (ethnicity) | Killed | Fled Abroad | Assessment |
|---------------------|--------|-------------|------------|
| Bosniak (RBiH) | 12,551 | 16,207 | Plausible |
| Serb (RS) | 10,860 | 88,520 | **WAY TOO HIGH** — Serb civilian KIA ~4k total war |
| Croat (HRHB) | 2,059 | 23,837 | Plausible |

### Attacker/Defender Casualty Ratio

- Attacker casualties: 10,664 / Defender casualties: 2,232 = **4.78:1**
- Historical ratio: ~2–3:1. **Attackers losing too much, defenders too little.**

### Supply Reserves

| Faction | General Supply | Heavy Munitions | Status |
|---------|---------------|-----------------|--------|
| RBiH | 100.0 | 100.0 | Full (no drain) |
| RS | 100.0 | 100.0 | Full (no drain) |
| HRHB | **6.9** | **60.3** | Near depleted |

### Bot Benchmarks

| Turn | Faction | Benchmark | Expected | Actual | Status |
|------|---------|-----------|----------|--------|--------|
| 20 | HRHB | secure_herzegovina_core | 0.12 ± 0.05 | 0.155 | PASS |
| 20 | RBiH | hold_core_centers | 0.35 ± 0.08 | 0.437 | **FAIL** (+8.7pp) |
| 20 | RS | early_territorial_expansion | 0.55 ± 0.08 | 0.408 | **FAIL** (-14.2pp) |
| 40 | HRHB | hold_central_bosnia_nodes | 0.118 ± 0.04 | 0.154 | PASS |
| 40 | RBiH | preserve_survival_corridors | 0.329 ± 0.05 | 0.430 | **FAIL** (+10.1pp) |
| 40 | RS | consolidate_gains | 0.553 ± 0.05 | 0.416 | **FAIL** (-13.7pp) |

---

## 2. System-by-System Audit

### WORKING AS INTENDED

| System | Evidence | Notes |
|--------|----------|-------|
| **Combat causality** | 124 orders, 103 battles, 0 invalid ops | Gate GREEN |
| **Entrenchment** | 181/207 formations have entrenchment_turns > 0, avg 11.9 | Working. Field is `entrenchment_turns`, not `entrenchment`. |
| **Equipment decay** | RS brigades at 0.925 (14 weeks × 0.005/wk from w26) | Correct |
| **Vienna Declaration** | Fires at turn 4, truce not broken | Working |
| **Decorations** | 42 formations with decorations | Historical decorations present |
| **War stories** | 188 formations with narrative arcs | Working — garrison/destroyed/etc arcs |
| **Experience** | 40 brigades with experience > 0, avg 0.1 | Accumulating but slowly |
| **Displacement events** | 27,909 events, 2,890 settlements affected | Mechanism fires |
| **Civilian casualties** | Tracked per ethnicity | Working, but magnitudes need tuning (see below) |
| **Siege counters** | Active on many pockets (40-turn sieges on isolated cells) | Working |
| **War exhaustion** | HRHB 400, RBiH 323.5, RS 400 | Tracking |
| **Sector operations** | 85/95 objective captures, operations launch→execute→recover | Working |
| **Corps AI directives** | All 6 VRS corps offensive w1→balanced w20→defensive w40 | Transitions working |
| **Control change attribution** | All 34 changes combat-attributed | Clean |
| **Recruitment** | 71 brigades recruited over 40 weeks | Working |
| **Militia pools** | Active per faction (HRHB 24.8k/52.4k/2.7k avail/committed/exhausted) | Working |

### FLAGGED — NOT WORKING OR UNDERPERFORMING

#### P0: Brigade History Not Recording

- `brigade_history` is **empty for all 207 formations** despite 103 battles occurring.
- `recordAttackerEngagements()` and `recordDefenderEngagement()` are called at `attack_resolution_osid.ts:836` but results don't persist to `FormationState.brigade_history`.
- War stories DO track stats (`battles_fought`, `casualties_inflicted`) through a separate mechanism, so there is evidence of combat — but the per-engagement FIFO history is not populating.
- **Impact:** No detailed engagement records for brigade narrative, UI, or replay. War stories partially compensate.

#### P0: Combat Fatigue Effectively Inert

- **ALL 207 formations at combat_fatigue = 0** in the final save.
- The end_report showed max fatigue of 3 (Kalinovik brigade) during the run, but recovery (-1/turn) resets it within 3 turns.
- With only ~1.3 battles per RS brigade over 40 weeks (+2 attacker fatigue per battle), the system mathematically can't produce sustained fatigue.
- **Root cause:** Too few battles per individual brigade + fast recovery = fatigue is cosmetic.
- **Impact:** Combat fatigue has zero gameplay effect. Brigades never tire.

#### P0: Only 3 Brigade Postures Used (defend/dig_in/none)

- Final state: defend=181, dig_in=7, none=19.
- ZERO brigades in `attack`, `assault`, `advance`, `counterattack`, `march`, `withdraw`, or `retreat`.
- The code DOES set `attack`/`assault` posture during combat in `bot_brigade_ai_osid.ts:1109`, but this appears to be reset to `defend` after combat resolution completes within the same turn.
- **Impact:** Posture variety exists in code but not in observable state. The player/UI sees only "defend" for 87% of brigades. There is no meaningful posture system from a gameplay perspective.

#### P1: RS Territory 13.7pp Below Target

- RS controls 41.6% at w40 vs historical 55.3%.
- Only 34 combat flips (all RS gains from RBiH/HRHB), compared to ~170 needed for target.
- Combat tempo drops sharply after w20: w1-20 averaged 4.4 orders/week; w21-40 averaged 1.8 orders/week.
- Zero objective captures after w27 except one at w32.
- **Root cause:** VRS transitions to balanced at w20, then to defensive by w40. After that transition, operations stall — the bot doesn't generate enough offensive pressure to maintain territorial expansion.

#### P1: Only RS Issues Attack Orders (124/124)

- RBiH and HRHB have **ZERO** attack orders over 40 weeks.
- While RBiH `general_defensive` through w56 is intentional, and HRHB doesn't attack RS (Vienna Declaration), there should still be some counterattacks.
- Historical reality: ARBiH conducted local counterattacks even in 1992 (e.g., Srebrenica perimeter, Bihać corridor). HVO fought defensively around Mostar.
- **Impact:** One-sided warfare. No counterattacks, no reconquests, no territory-changing in either direction except RS→others.

#### P1: Military KIA Running 2-3× Too Fast

- RS: 14,876 KIA in 40w = 62% of full-war target (24k).
- HRHB: 6,010 KIA in 40w = 75% of full-war target (8k).
- At this rate, RS would reach 25k+ KIA by week 60 and HRHB would exhaust full-war KIA budget by w53.
- Attacker:defender casualty ratio is 4.78:1 (should be ~2-3:1).
- **Root cause likely:** Frontline attrition and bombardment exposure attrition applying steady background losses regardless of actual combat. Pool exhaustion rate at 25% may still be too aggressive for HRHB.

#### P1: Serb Civilian Casualties Wildly Ahistorical

- RS civilian killed: 10,860 at w40. Full-war Serb civilian deaths ~4,000 total.
- RS fled_abroad: 88,520 — more than 5× the Bosniak figure (16,207).
- **Root cause:** Displacement-driven civilian killing mechanic may not be differentiating between controlling faction's civilians vs. minority civilians in contested areas. Serb civilians in RS-controlled territory should be largely safe from ethnic cleansing.

#### P2: HRHB Supply Near-Depleted

- General supply at 6.9/100. This represents near-starvation.
- Historical: HVO had adequate supply through Croatia for mainland Herzegovina. Isolated pockets (Busovača, Vitez) should be strained, but mainland HRHB should not.
- **Possible cause:** Isolation detection treating the whole HRHB territory as partially surrounded, or patron aid scale too low for HRHB.

#### P2: RBiH/RS Supply at 100% (No Drain)

- Both at 100% general supply and 100% heavy munitions through 40 weeks.
- Historical: ARBiH was under severe arms embargo, should show strain by January 1993 (especially enclaves). RS inherited JNA stocks but consumed them.
- **Root cause:** Supply drain may only be firing for isolated components (siege mechanics), not for ongoing consumption by active forces.

#### P2: VRS Corps Stance Regression to Defensive

- At w40, ALL VRS corps are `defensive` or `balanced`. None remain `offensive`.
- Historical: VRS maintained offensive capability into 1993 (Cerska offensive, Srebrenica pressure).
- The transition chain appears to be: `general_offensive` (w1-20) → `balanced` (w20+) → `defensive` (by w40). The bot is choosing defensive without ongoing offensive stimulus.

#### P3: Zero Active Operations at w40

- All operations have completed/cleared. No ongoing offensive campaigns.
- This means the VRS is completely static by January 1993 — no planned operations, no sector attacks.
- Historical: VRS was still conducting corps-level operations in early 1993.

#### P3: Displacement State Counter Bug

- `displacement_state.displaced_out` is empty (0 entries) despite:
  - `municipality_displacement` having 103 non-zero entries
  - `settlement_displacement` having 2,890 entries
  - `displacement_event_log` having 27,909 events
  - End report showing "107/703960" displacement
- The summary counter may not be accumulating correctly, or it uses a different aggregation path.

---

## 3. Combat Tempo Analysis

### Weekly Orders / Battles / Flips

| Phase | Weeks | Orders/wk | Battles/wk | Flips/wk | Assessment |
|-------|-------|-----------|------------|----------|------------|
| Early offensive (w1-8) | 8 | 5.1 | 3.9 | 1.9 | Healthy |
| Mid offensive (w9-20) | 12 | 3.6 | 2.7 | 0.8 | Declining |
| Post-transition (w21-27) | 7 | 2.7 | 2.7 | 0.6 | Stalling |
| Late war (w28-40) | 13 | 1.2 | 1.2 | 0.1 | **Nearly inert** |

The **combat tempo collapse after w20** is the single biggest calibration issue. RS operations stop generating captures after w27, and by w28-40 the war is essentially frozen with 1-2 attacks per week and no territorial change.

### Objective Capture Rate

- w1-12: 49 captures from 52 attempts (94%)
- w13-20: 21 captures from 28 attempts (75%)
- w21-27: 5 captures from 7 attempts (71%)
- w28-40: 1 capture from 8 attempts (**12.5%**)

Defenders become impenetrable in late game. Entrenchment (avg 11.9 turns) + cohesion hardening likely makes late-game assaults futile.

---

## 4. Anchor Check Results

| Anchor | Expected | Actual | Status |
|--------|----------|--------|--------|
| Zvornik (mun) | RS | RBiH | **FAIL** |
| Bijeljina (mun) | RS | RS | PASS |
| Srebrenica (mun) | RBiH | RBiH | PASS |
| Bihać (mun) | RBiH | RBiH | PASS |
| Banja Luka (mun) | RS | RS | PASS |
| Tuzla (mun) | RBiH | RBiH | PASS |
| Centar Sarajevo (mun) | RBiH | RBiH | PASS |
| Zvornik:vitinica_2 | RBiH | RBiH | PASS |
| Ugljevik:teocak | RBiH | RBiH | PASS |
| Orašje | HRHB | HRHB | PASS |
| Brčko:brka_2 | RBiH | RBiH | PASS |
| Goražde | RBiH | RBiH | PASS |
| Srebrenica OSID | RBiH | RBiH | PASS |
| Vozuća | RS | RS | PASS |

13/14 pass. **Zvornik municipality FAIL** — should be RS-controlled by January 1993.

---

## 5. Calibration Plan

### Priority 0 — Engine Bugs (fix before any calibration tuning)

1. **Fix brigade_history recording** — `recordAttackerEngagements()`/`recordDefenderEngagement()` results not persisting. Check if the FIFO is writing to the correct field on FormationState, or if serialization strips it.

2. **Fix posture lifecycle** — Brigade postures should persist between turns, not reset to 'defend' after combat. An attacking brigade should show 'attack' posture until it receives a different order. Investigate where posture is being cleared.

3. **Investigate displacement_state.displaced_out** counter not accumulating despite displacement events firing.

### Priority 1 — Casualty Rate Tuning (before territory tuning)

4. **Reduce background attrition rates** — Military KIA is running 2-3× historical pace. Investigate `frontline_attrition.ts` and `pool_population.ts` — the 25% pool exhaustion rate may need further reduction (15-20%?). Check bombardment exposure attrition contribution.

5. **Fix Serb civilian casualty model** — RS civilian deaths should not be 10,860 at w40. The displacement/ethnic-cleansing mechanic needs faction-context awareness: civilians of the controlling faction in their own territory should not be killed at the same rate as minorities.

6. **Rebalance attacker/defender casualty ratio** — Current 4.78:1 is too skewed. Consider increasing `BASE_DEFENDER_CASUALTY_RATE` or reducing `BASE_ATTACKER_CASUALTY_RATE` to get closer to 2.5-3:1.

### Priority 2 — Territory and Combat Tempo

7. **Address VRS post-w20 tempo collapse** — The transition from general_offensive→balanced is too sharp. Options:
   - Extend VRS aggressive period (but RS_EARLY_WAR_END_WEEK=20 is load-bearing, DO NOT CHANGE)
   - Instead: Tune `balanced` stance to allow more offensive operations than current
   - Increase aggression_modifier decay rate so balanced corps still attack high-value targets
   - Ensure operations continue to launch after w20 (currently they stall)

8. **Address late-game entrenchment wall** — At 11.9 avg entrenchment turns, defenders are very hard to dislodge. Consider:
   - Artillery suppression of entrenchment being more effective
   - Concentration bonus for multi-brigade assaults
   - Reducing entrenchment benefit curve (diminishing returns past ~6 turns)

9. **Enable counterattacks for RBiH/HRHB** — Zero attack orders from non-RS factions is unrealistic. Even `general_defensive` should allow local counterattacks when opportunity presents (e.g., recently captured territory, weak enemy force detected).

### Priority 3 — Supply and Exhaustion Tuning

10. **HRHB supply isolation** — Mainland Herzegovina HRHB should receive adequate patron aid through Croatia. Only isolated pockets (central Bosnia) should drain.

11. **RS/RBiH supply drain** — Both at 100% after 40 weeks is unrealistic. Even with external support, ongoing operations should consume supplies. The supply system may only fire for isolated pockets.

12. **VRS stance regression** — VRS corps should not all be defensive by w40. Maintain at least 2-3 corps at balanced or offensive through w52 to match historical operational tempo.

### Priority 4 — Gameplay Depth

13. **Make combat fatigue meaningful** — With current parameters (1.3 battles/brigade/40w, +2 fatigue/battle, -1/turn recovery), fatigue will never accumulate. Either increase fatigue gain per battle, reduce recovery rate, or add non-combat fatigue sources (frontline duty, etc).

14. **Report `brigade_history` in scenario harness** — Once recording is fixed, add to end_report and run_summary for visibility.

---

## 6. Key Numbers vs Historical (January 1993)

| Metric | Sim (n159) | Historical | Verdict |
|--------|-----------|------------|---------|
| RS territory | 41.6% | ~55% | **-13pp** |
| RBiH territory | 43.0% | ~33% | **+10pp** |
| HRHB territory | 15.4% | ~12% | +3pp |
| ARBiH personnel | 104.5k | 110-130k | Slightly under |
| VRS personnel | 103.5k | 90-100k | Slightly over |
| HVO personnel | 32.9k | 40-45k | **Under 25%** |
| RS military KIA | 14,876 | ~7-8k (prorated) | **2× too high** |
| HRHB military KIA | 6,010 | ~2-3k (prorated) | **2-3× too high** |
| RBiH military KIA | 9,382 | ~8-10k (prorated) | Plausible |
| Bosniak civ killed | 12,551 | ~12k prorated | Plausible |
| Serb civ killed | 10,860 | ~1-2k prorated | **5-10× too high** |
| Croat civ killed | 2,059 | ~1-2k prorated | Slightly high |
| Combat flips | 34 | ~170+ needed | **Far too few** |
| RS attack orders | 124 | — | Only faction attacking |
| Other factions' attacks | 0 | Should be 10-20+ | **Zero** |

---

## 7. Single Priority and Owner

**Single Priority:** Fix engine bugs (P0: brigade_history, posture lifecycle) FIRST, then address military casualty rates (P1) before attempting any territory calibration. Territory tuning without fixing the underlying combat model will produce false calibration — the same trap that led to the n65→n142 regression.

**Owner:** Gameplay Programmer → fix P0 bugs; then Orchestrator → PM for P1/P2 phased plan.

---

## References

- Run artifacts: `runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n159/`
- Calibration master: `docs/40_reports/CALIBRATION_MASTER.md`
- Knowledge base: `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- Previous ATH: n65 (99.2% area-weighted, with OSID overrides)
- Current honest baseline: n159 (81.5% area-weighted, combat-causality GREEN)
