# COMBAT_MASTER — Combat Resolution System

**Owner:** Gameplay Programmer / Systems Programmer
**Updated:** 2026-04-01 (factor audit, P0–P10 gap list, Brcko defensive fire finding)
**Audit source:** `docs/40_reports/20260326_DEPLOYMENT_AND_COMBAT_AUDIT.md`

---

## 2026-05-23: Combat Graph BFS Queue Cursor

**Change:** Six FIFO BFS helpers in combat graph and rear-pocket support now use head cursors instead of `Array.shift()`: `bfsReachable(...)`, optimized/legacy `analyzeFactionGraph(...)` pocket clustering, `isSettlementSetContiguous(...)`, `consolidateRearPockets(...)`, and `buildFriendlyComponentsLocal(...)`.

**Determinism:** Queue insertion order and neighbor expansion are unchanged. Existing optimized-vs-legacy graph parity remains covered by 10,000-trial deterministic tests.

**Report:** [implemented/20260523_COMBAT_GRAPH_BFS_QUEUE_CURSOR.md](implemented/20260523_COMBAT_GRAPH_BFS_QUEUE_CURSOR.md)

---

## 2026-05-23: Combat Movement BFS Queue Cursor

**Change:** Five FIFO BFS helpers in combat movement now use head cursors instead of `Array.shift()`: four bot brigade movement helpers in `src/sim/combat/bot_brigade_movement_ai.ts` and `shortestPathThroughFriendly(...)` in `src/sim/combat/brigade_movement.ts`.

**Determinism:** Queue insertion order and sorted neighbor expansion are unchanged. This is a compute-only dequeue optimization; no combat math, operation behavior, save schema, calibration, or output contract changed.

**Report:** [implemented/20260523_COMBAT_MOVEMENT_BFS_QUEUE_CURSOR.md](implemented/20260523_COMBAT_MOVEMENT_BFS_QUEUE_CURSOR.md)

---

## Purpose

Single source of truth for combat resolution design decisions, factor implementations, known gaps, and lessons learned. Read this before touching any file in `src/sim/combat/`.

---

## Current State (n1302)

| Metric | Value |
|---|---|
| Calibration | **93.7% area-weighted (40w) — NEW ATH** |
| Anchors | 25/25 |
| Benchmarks | 6/6 |
| Hash | 0cf989330bd36cc8 |
| Attacker:defender casualty ratio | 0.814 (attack_resolution) / 0.63 (anomaly_detection) — source discrepancy unresolved |
| Decisive victory share | ~87% of battles |

**Note on casualty ratio:** The aggregate number is faction-blind. VRS-attacks-ARBiH and ARBiH-attacks-VRS have opposing expected ratios. See "Faction-Specific Casualty Context" section below.

---

## Combat Resolution Architecture

| File | Role |
|---|---|
| `src/sim/combat/attack_resolution_osid.ts` | Main resolver — power calculation, outcome determination, casualty application |
| `src/sim/combat/combat_math.ts` | All multiplier functions: terrain, equipment, officer, experience, fatigue, morale |
| `src/sim/combat/frontline_attrition.ts` | Passive attrition on contested front lines; cold-front (`isColdFront()`) exemption |
| `src/sim/combat/morale_drift.ts` | Per-turn morale decay and recovery |
| `src/sim/combat/cohesion_drift.ts` | Cohesion change from combat, rest, and posture |
| `src/sim/combat/seasonal_effects.ts` | Monthly terrain modifiers, winter slot caps |
| `src/sim/combat/supply_state.ts` | Supply status classification (adequate / strained / critical) |
| `src/sim/combat/sector_offensive.ts` | Canonical lifecycle owner for ALL operation types |
| `src/sim/combat/corps_operation_helpers.ts` | Four CorpsOperation factory functions |

---

## Design Principles

1. **Equipment asymmetry must dominate combat.** ARBiH rifle-only vs VRS artillery+tanks = massive loss asymmetry. This is the core mechanical expression of the historical power imbalance.
2. **All relevant factors must be calculated.** Terrain, morale, exhaustion, officers, experience, ToE, artillery, armor, supply, fortification — each has a named multiplier function.
3. **Defenders benefit from terrain, entrenchment, and morale absorption.** Attackers pay an equipment tax for their firepower advantage.
4. **The sector defense model aggregates all sector-assigned brigades via distance-weighted reactive defense.** Pre-computed at turn start; no mid-battle reserve exploitation.
5. **Determinism is sacred.** No `Math.random()`, no timestamps. All iteration sorted via `strictCompare`.

---

## Combat Factors — Implementation Status (audited 2026-04-01)

| # | Factor | Implemented | Applied To | Plausible? | Gap |
|---|---|---|---|---|---|
| 1 | Artillery (attacker suppression) | YES — `getArtillerySuppression()` `combat_math.ts:575`, up to 70% entrenchment suppression | Attacker only | Yes | Defender artillery provides no active-battle attacker-casualty effect — biggest asymmetry gap |
| 2 | Artillery (defender defensive fire) | YES — `getDefensiveFireMult()` `combat_math.ts`. VRS 15 art = 1.135× attacker cas; ARBiH 1 art = 1.010×. Also `getBombardmentCasualtyMult()` adds up to 2.2× defender casualties from attacker artillery | Both | Yes | — |
| 3 | Armor/tanks (attacker) | YES — `getHeavyWeaponsOffensiveMult()` `combat_math.ts:635`, up to 2.5× attack power, terrain-penalized | Attacker only | Yes | Same gap: defender tanks provide no explicit attacker-casualty bonus |
| 4 | Armor/tanks (defender) | PARTIAL — tanks in `getEquipmentRatio()` improve basePower | Defender implicit | Implausible at scale | No defensive anti-armor multiplier; VRS 40-tank defense does not punish attacker beyond equipment ratio (~4% gap) |
| 5 | Terrain — slope/river/friction | YES — `terrainCompositeForSid()` `combat_math.ts:969`, river ×1.3, slope≥0.5 ×1.4, friction ×1.2 | Defender only | Yes | No attacker movement/concentration penalty; no pre-crossing casualties |
| 6 | Terrain — urban | YES — data-driven: population ≥10,000 AND density ≥500/km². 19 OSIDs in `data/derived/operational/urban_osids.json`. Loaded via `setUrbanOsidSet()` at scenario start. `getUrbanMult()` 2.0× defense | Defender only | Yes | — |
| 7 | Terrain — forest | NO | N/A | N/A | No forest/woodland modifier. Central Bosnia forest fighting unmodeled. |
| 8 | Morale (combat effectiveness) | YES — `getCriticalMoralePenalty()` below morale 15: 1.0→0.3×. Soft bonus above floor: `1.0 + 0.15 × (morale/100)`, range [1.0, 1.15] | Both | Yes | — |
| 9 | Morale (resist retreat) | YES — faction floors (RBiH 50, RS 55, HRHB 60), absorbs costly_victory with 1.6× casualties | Defender only | Yes | Only on costly_victory; stalemate doesn't trigger absorption |
| 10 | Exhaustion/fatigue (unit) | YES — `getFatigueMult()` 1.0→0.6 floor (attack) / 0.75 (defend) | Both | Yes | Correctly applied |
| 11 | War exhaustion (faction) | YES — feeds political collapse AND `getWarExhaustionTempoMult()`. Linear ramp 1.0→0.85 between exhaustion 500–800. Attack only. | Both (attack penalty) | Yes | — |
| 12 | Officer quality | YES — `getThreeTierOfficerMod()` range ~0.88–1.24×, aggressiveness for attack, defensive_skill for defend | Both | Yes | Correctly applied |
| 13 | Experience | YES — `basePower()` EXPERIENCE_BASE(0.6) + EXPERIENCE_SCALE(0.4)×exp, ARBiH learns 1.5× faster | Both | Yes | No terrain-familiarity bonus for veterans |
| 14 | ToE completeness | PARTIAL — `getEquipmentRatio()` from actual composition, no authorized-vs-held ratio | Both | Partial | No formal "% of authorized ToE" metric; no reconstitution priority trigger |
| 15 | Fortification/entrenchment | YES — sqrt curve up to +51% at t=52, artillery suppresses up to 70%. `initial_entrenchment_turns` field in OOB JSON: 10 SRK brigades=18, 5 Drina river-line=12. Seeded in `oob_early_war_entry.ts` | Defender only | Yes | — |
| 16 | Supply | YES — adequate 1.0×, strained 0.75×, critical attack 0.45×/defend 0.50× | Both asymmetric | Yes | 94% RBiH at strained makes 0.75× the permanent baseline, not a situational penalty |
| 17 | Numerical superiority | YES — concentration bonus +10%/brigade capped +30%, coordination penalty. `getLanchesterConcentrationBonus()`: +5% defender cas per extra brigade above 2, gated on ≥3 attackers and powerRatio ≥1.5, cap 30% | Both | Yes | — |
| 18 | Cohesion | YES — cohesion/100 multiplier in basePower, surrender cascade at <10 | Both | Yes | No rest/refit recovery; dig_in posture doesn't restore cohesion |
| 19 | Weather/Season | YES — `getSeasonalModifiers()` mountain/lowland by month, Jan attack 25% slots | Both | Yes | Defense winter bonus only +5%; historically prepared defenders benefited much more |
| 20 | Air support (NATO) | NO | N/A | N/A | `nato_deliberate_force_1995` event exists but has zero combat effect |
| 21 | Reserve commitment mid-battle | PARTIAL — reactive defense pre-computed at turn start | Defender only | Partial | No attacker reserve exploitation after decisive_victory |

---

## Priority Gap List (2026-04-01)

### P1 — Defender artillery: no active-battle attacker-casualty effect ✓ IMPLEMENTED 2026-04-01

**Implementation:** `getDefensiveFireMult()` in `combat_math.ts`. VRS 15 art = 1.135× attacker cas; ARBiH 1 art = 1.010×. Symmetric to `getBombardmentCasualtyMult`.

**Historical basis:** VRS artillery advantage was most visible when they were defending prepared positions, not just when attacking. ARBiH offensives at Ozren, Majevica, and around the Brcko corridor failed precisely because defenders had artillery and the attackers did not.

---

### P2 — Urban terrain: brigade-level bonus only for Sarajevo ✓ IMPLEMENTED 2026-04-01

**Implementation:** Data-driven: `population >= 10,000 AND density >= 500/km²`. 19 OSIDs in `data/derived/operational/urban_osids.json`. Loaded at scenario start via `setUrbanOsidSet()`. Replaces brittle Sarajevo string matching — all major cities now covered.

---

### P3 — Morale: no graduated effect above critical floor (15) ✓ IMPLEMENTED 2026-04-01

**Implementation:** Soft bonus above critical floor: `1.0 + 0.15 × (morale/100)`. Range [1.0, 1.15] above the morale 15 threshold. `getCriticalMoralePenalty()` retains the hard 0.3× penalty below floor.

---

### P4 — Forest terrain ✓ IMPLEMENTED 2026-04-01

**Implementation:** Highland elevation+slope proxy: `elevation_mean_m ≥ 900 AND slope_index ≥ 0.50`. 106 OSIDs in `data/derived/operational/forest_osids.json`. `getForestMult()` returns FOREST_DEFENSE_MULT=1.15, applied to defender power only. Covers Vlašić, Romanija, Igman/Bjelašnica, Treskavica highlands. Ozren and Majevica correctly excluded (below 900m). Loaded at scenario start via `setForestOsidSet()` in `combat_terrain_sets_node.ts`.

---

### P5 — NATO air support: zero combat effect

**Root cause:** `nato_deliberate_force_1995` event fires but has no wiring into combat resolution. The event exists as a political event only.

**Fix:** When `nato_deliberate_force_1995` active, RS attacker power ×0.5 for 4 weeks + heavy munitions mult throttling.

---

### P6 — No breakthrough exploitation

**Root cause:** After a decisive_victory there is no mechanism for fresh adjacent brigades to exploit the breach. Every subsequent attack requires a full new operation lifecycle.

**Fix:** After decisive_victory with a fresh adjacent brigade, allow a single reduced-power continuation (0.7× power, 1.5× fatigue).

---

### P7 — War exhaustion: no unit combat feedback ✓ IMPLEMENTED 2026-04-01

**Implementation:** `getWarExhaustionTempoMult()`. Linear ramp 1.0→0.85 between exhaustion 500–800. Applied to attack only. Models VRS/ARBiH operational tempo collapse as war drags on.

---

### P8 — Prepared positions: no static starting entrenchment ✓ IMPLEMENTED 2026-04-01

**Implementation:** `initial_entrenchment_turns` field in OOB JSON. 10 SRK brigades=18 turns, 5 Drina river-line brigades=12 turns. Seeded in `oob_early_war_entry.ts` at scenario start.

---

### P9 — Supply calibration: 94% RBiH strained makes it a permanent tax not a penalty

**Root cause:** ARBiH supply routing classifies almost all units as strained (0.75× multiplier). This means the supply system never actually penalises ARBiH — 0.75× is the baseline, not a situational condition.

**Fix:** Recalibrate ARBiH supply routing or reclassify baseline so "strained" reflects historical normal and "critical" is the true penalty.

---

### P10 — Lanchester: kill rates don't scale with concentration ✓ IMPLEMENTED 2026-04-01

**Implementation:** `getLanchesterConcentrationBonus()`. +5% defender casualties per extra brigade above 2, gated on ≥3 attackers and powerRatio ≥1.5. Cap 30%.

---

### P11 — Multi-brigade coordination: no officer quality effect ✓ IMPLEMENTED 2026-04-02 (n1300)

**Implementation:** `getCoordinationCompetenceFactor()` in `battle_resolution.ts`. Applies only to multi-brigade attacks (single-brigade unaffected). Formula: `effN_adjusted = effN_base × (1.0 - (3 - competence_int) × 0.04)`. Range: competence 5 = +8%, baseline 3 = neutral, competence 1 = -8%. Clamped [0.85, 1.10].

**Historical basis:** JNA-trained VRS staff (Mladić, Milovanović, Talić) extracted more from combined-arms coordination than ARBiH improvised commanders. A modest ±8% swing at extremes is conservative but directionally correct.

---

### P12 — Opportunity target selection: no tactical intelligence (lexicographic only) ✓ IMPLEMENTED 2026-04-02 (n1301)

**Implementation:** `selectOpportunityTargets()` in `commander/plan.ts`. Ranks enemy OSIDs by approach count — number of staging-zone OSIDs adjacent to each target. More approach vectors = more exposed = higher priority. Falls back to lex sort if spatial data absent.

**Historical basis:** Commanders prefer soft flanks and exposed salients. Lex sort picked arbitrary targets with no tactical rationale.

---

### P13 — Defender armor/tanks: no dedicated anti-attacker multiplier (Engine Health Audit, 2026-04-02)

**Gap:** `getDefensiveFireMult()` covers artillery only. VRS 40 tanks on defense have zero anti-attacker multiplier. Historically, tanks in defensive positions were one of the most dangerous threats facing advancing infantry — they could hold prepared positions and deliver direct fire against assaults.

**Scope:** `getBombardmentCasualtyMult()` (attacker's artillery advantage on offense) and `getDefensiveFireMult()` (defender's artillery advantage) are both implemented. But neither function touches the `tanks` equipment field.

**Expected delta:** ~+10–20% attacker casualties in VRS-defended OSID battles with 10+ tanks. Does not affect ARBiH (no significant armour pool). Symmetry: if `getDefensiveFireMult()` uses `artillery`, a parallel `armor` term should raise attacker casualties when the defender has tanks.

**Fix path:** Add an armor-defense term inside `getDefensiveFireMult()` or a new `getArmorDefenseMult()`. Scale sub-linearly (tanks in prepared positions differ from tanks in the open). Calibrate to observed ARBiH-attacks-VRS casualty ratios.

**Priority:** P2 — equipment asymmetry is partially captured (artillery); armor gap means VRS prepared-position defense is under-represented. Not P1 because artillery fire carries most of the historical weight.

---

### P14 — Combat predictor blind to defender artillery, terrain, and entrenchment: drives 47% ZEA rate (Engine Health Audit, 2026-04-02)

**Gap:** `checkLaunchFeasibility()` in `bot_corps_directives.ts` computes force requirement as `basePower × 0.8`. It does not include:
- Defender artillery (`getDefensiveFireMult()` — up to 1.8×)
- Terrain multipliers (urban 1.35×, forest 1.15×, combined up to ~1.55×)
- Entrenchment bonus (SRK 18-turn initial = up to +51% effective defense)

**Impact:** A defender with 15 artillery, urban cover, and 10 turns entrenched has effective defensive power ≈2.5× raw brigade strength. The predictor sees raw power. Corps CO thinks the operation is feasible; launches; hits the real multipliers; zero eligible attackers. This is the primary mechanical driver of the 47% ZEA rate.

**Fix path:** Expose `getDefensiveFireMult()`, `getUrbanMult()`, `getForestMult()`, and entrenchment scaling to `checkLaunchFeasibility()`. Compute adjusted required-power as: `rawDefPower × defensiveFire × terrain × entrenchment / targetRatio`. This gives the CO an honest force requirement before committing.

**Priority:** P1 — 47% ZEA rate is a major engine health problem. Operations that never find eligible attackers waste 39% of all planning cycles. Fixing the predictor will reduce ZEA toward the expected 10–15% operational pause range.

---

## Faction-Specific Casualty Context

**The single aggregate att:def ratio is insufficient for realism assessment.** This war has opposing asymmetries by faction pair.

| Faction pair | Attacker | Expected att:def ratio | Why |
|---|---|---|---|
| ARBiH attacks VRS | ARBiH rifle-only | **2:1 to 4:1** (ARBiH bleeds) | VRS defensive fire (15 art) punishes rifle-only assault. `getDefensiveFireMult()` = 1.135× attacker cas. Historical: Ozren/Majevica/Brcko offensives failed catastrophically. |
| VRS attacks ARBiH | VRS armor+art | **0.5:1 to 1.2:1** (VRS lighter) | VRS firepower dominates. ARBiH defender absorbs `getBombardmentCasualtyMult()`. VRS can take *fewer* casualties than defenders — this is historically correct, not a bug. |
| ARBiH defends vs VRS | — | ARBiH still bleeds | VRS bombardment fires regardless of who is "attacking." ARBiH defenders absorb artillery. Defender role ≠ protected from firepower. |
| HRHB attacks RS | HVO | ~1:1 to 1.5:1 | HVO had JNA-inherited equipment, closer to parity. |

**When reviewing runs:** Always partition by faction pair before concluding. If ARBiH-attacks-VRS shows near-parity, the equipment asymmetry isn't biting — flag P1. If the aggregate looks "attacker heavy" it may be because the aggregate mixes ARBiH-attacks-VRS (high attacker losses) with VRS-attacks-ARBiH (low attacker losses).

---

## Key Decisions & Lessons

### 2026-04-02 — Commander Intelligence n1294–n1301

Eight commander system improvements shipped together (pre-planned sequence). Key results at n1302: +0.5pp area (93.7% ATH), 25/25 anchors, 6/6 benchmarks. Specific impacts:

- **must_hold garrison (n1295–n1296):** 1.5× garrison budget for vrs_posavina (Brcko) and vrs_east_bosnian (Doboj). Worked as intended — Brcko held all 40w from n1289 P1 defensive fire alone; must_hold adds a second structural guarantee. Track 2 (engine chokepoint detection) disabled: fraction-of-faction-total threshold 0.05 can't discriminate RS Brcko (~9% of RS territory) from ARBiH Central Bosnia valley passes (~8% of ARBiH territory). Needs corps-boundary discriminator or absolute OSID count.
- **Op scale cap (n1298):** Capping to `tier_counts.main_effort` did not change total order counts (91 — identical to n1289), but ZEA rate rose 39%→47%. Eligible attacker pools narrowing as intended; expected tradeoff.
- **DRINA regression:** n1302 DRINA 86.6% vs implied ~88% at n1289. Possible cause: must_hold corridor garrison changes freed Drina Corps brigades toward eastern OSID captures. Investigate vrs_drina operation counts vs n1289.

### 2026-04-01 — Sector Merge Guard Regression Fix

Sector merge guard regression fixed: `areSectorsFrontEdgeAdjacent` added a shared-friendly-OSID fast path to handle synthetic test edges without `min_dist`/`shared_segments` fields. `vrs_drina:1` now correctly splits into Srebrenica encirclement sector + Kalesija/Zvornik sector. Design principle confirmed: enclave rings (Srebrenica, Goražde) are valid small isolated sectors — same topology as Sarajevo siege. Merge must never re-unite fronts the splitter correctly separated.

---

### 2026-04-01 — Brcko Corridor Defensive Fire Gap

**Investigation:** ARBiH rifle-only units can take `op:brcko:brcko` in 1992 because RS artillery is silent when defending. VRS 15 artillery pieces per brigade provide 0 active-battle attacker-casualty effect. Equipment asymmetry is implemented on the offensive side only.

**Lesson:** Equipment asymmetry must apply to BOTH sides of each battle — when the well-equipped faction defends, their heavy weapons should punish the attacker, not just when they attack.

**Historical basis:** ARBiH could not realistically threaten Brčko in 1992. Corridor cuts that occurred were by HVO/HV at Orašje, not by ARBiH at Brčko. (*Jelisić* TJ §§24–27 confirms RS continuous hold from May 1992 through the full 40-week scenario window.)

**Status:** RESOLVED — P1 defensive fire alone closed the brcko anchor. No must_hold needed. VRS artillery defense raises attacker casualties enough that ARBiH rifle-only brigades cannot sustain the corridor assault.

---

### 2026-03-26 — Casualty Ratio Inversion (0.33:1)

**Finding:** Attacker:defender casualty ratio at w40 is ~0.33:1. Defenders take approximately 3× more casualties than attackers. This is the inverse of conventional military wisdom.

**Why this is not a bug:** Three multiplicative systems drive the inversion:
1. `getBombardmentCasualtyMult()` — up to 2.2× defender casualties from attacker artillery (VRS)
2. `getPowerRatioCasualtyMult()` — cube-root exponent applied to defender casualties when attackers have power advantage (3:1 → 1.44× defender losses)
3. Decisive victory share (~87%) — applies heavy casualty modifiers to losing side (typically the defender in VRS attacks)

**Base rates:** `BASE_ATTACKER_CASUALTY_RATE = 0.08`, `BASE_DEFENDER_CASUALTY_RATE = 0.06`. Base rates favour defender, but the VRS multiplier stack inverts this completely.

**Open question:** Whether 3:1 defender-casualty ratio is historically defensible for aggregate BiH War combat. Needs Historian review and comparison against ICTY/BB loss data.

---

### 2026-03-26 — attCasMult Discard Bug (Fixed)

**Bug:** `attCasMult` was computed but then discarded via `[,]` destructuring — attacker casualty multiplier was never applied. This caused the attacker:defender ratio to be even more skewed than intended.

**Fix:** Destructuring corrected; `attCasMult` now applied. Ratio moved from ~0.55 to ~0.70 (attacker:defender in the pre-inversion sense).

**Lesson:** Destructuring bugs are silent — the variable disappears without a type error. Any multiplier chain that uses array returns must verify the destructuring pattern.

---

### 2026-03-19 — Cold Front Exemption (`isColdFront()`)

**Design decision:** RS↔HRHB fronts under the Graz Accords are exempt from frontline attrition and bombardment FP. HRHB siege drain is also skipped.

**Implementation:** `isColdFront()` in `frontline_attrition.ts`. Applied when the two facing factions have a non-aggression arrangement at the scenario date.

**Cascade:** This change required rebalancing HRHB pool (1.60→1.05) and RBiH pool (now 0.15). Without cold-front exemption, HRHB burns through its pool on a frozen front, starving the active front.

---

### 2026-03-12 — Reactive Defense (n666–n668)

**Design:** Distance-weighted reactive defense. Up to 5 independent sector stances. Defender brigades weighted by inverse BFS distance from the contested OSID.

**Key invariant:** Reactive defense is pre-computed at turn start, not dynamically assembled mid-battle. No mid-battle reserve commitment exists. This is a known gap (see P6 above).

---

## Casualty Constants (current)

| Constant | Value | Location |
|---|---|---|
| `BASE_ATTACKER_LOSS_RATE` | 0.08 | `combat_math.ts:236` |
| `BASE_DEFENDER_LOSS_RATE` | 0.06 | `combat_math.ts:240` |
| `POWER_RATIO_CASUALTY_MAX` | 2.0 | `combat_math.ts` |
| Power ratio exponent | 0.33 (cube-root) | `getPowerRatioCasualtyMult()` |
| Bombardment mult max | 2.2× | `getBombardmentCasualtyMult()` |
| Armor offensive mult max | 2.5× | `getHeavyWeaponsOffensiveMult()` |
| Entrenchment max bonus | +51% (at t=52) | sqrt curve |
| Artillery entrenchment suppression | up to 70% | `getArtillerySuppression()` |
| Morale critical floor | 15 | `getCriticalMoralePenalty()` |
| Morale critical mult | 0.3× | `getCriticalMoralePenalty()` |
| Fatigue attack floor | 0.6× | `getFatigueMult()` |
| Fatigue defend floor | 0.75× | `getFatigueMult()` |

---

## Cross-reference

- `SECTOR_MASTER.md` — sector system design, contiguity rules, brigade distribution
- `CALIBRATION_MASTER.md` — calibration runs, outcome tracking, anchor history
- `MUST_HOLD_MASTER.md` — must_hold corridor design and Run D plan
- `20260326_DEPLOYMENT_AND_COMBAT_AUDIT.md` — earlier deployment + combat audit (pre-commander v0.8); casualty ratio root cause analysis, anomaly detector design
