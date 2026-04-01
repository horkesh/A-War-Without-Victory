# COMBAT_MASTER — Combat Resolution System

**Owner:** Gameplay Programmer / Systems Programmer
**Updated:** 2026-04-01 (factor audit, P0–P10 gap list, Brcko defensive fire finding)
**Audit source:** `docs/40_reports/20260326_DEPLOYMENT_AND_COMBAT_AUDIT.md`

---

## Purpose

Single source of truth for combat resolution design decisions, factor implementations, known gaps, and lessons learned. Read this before touching any file in `src/sim/combat/`.

---

## Current State (n1288)

| Metric | Value |
|---|---|
| Calibration | 93.3% area-weighted (40w) — new ATH |
| Anchors | 24/25 (boljanic_2 FAIL — pre-existing P1) |
| Benchmarks | 6/6 |
| Hash | 9344d886b3257fb6 |
| Attacker:defender casualty ratio | ~0.33:1 (defenders take ~3× casualties) |
| Decisive victory share | ~87% of battles |

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

### P4 — Forest terrain: absent

**Root cause:** No `forest_density` scalar exists in `TerrainScalarsData`. Central Bosnia forest fighting — critical to early ARBiH performance — is entirely unmodeled.

**Fix:** `forest_density` scalar in TerrainScalarsData, ×1.15 friction modifier for dense forest applied to defender.

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

## Key Decisions & Lessons

### 2026-04-01 — Sector Merge Guard Regression Fix

Sector merge guard regression fixed: `areSectorsFrontEdgeAdjacent` added a shared-friendly-OSID fast path to handle synthetic test edges without `min_dist`/`shared_segments` fields. `vrs_drina:1` now correctly splits into Srebrenica encirclement sector + Kalesija/Zvornik sector. Design principle confirmed: enclave rings (Srebrenica, Goražde) are valid small isolated sectors — same topology as Sarajevo siege. Merge must never re-unite fronts the splitter correctly separated.

---

### 2026-04-01 — Brcko Corridor Defensive Fire Gap

**Investigation:** ARBiH rifle-only units can take `op:brcko:brcko` in 1992 because RS artillery is silent when defending. VRS 15 artillery pieces per brigade provide 0 active-battle attacker-casualty effect. Equipment asymmetry is implemented on the offensive side only.

**Lesson:** Equipment asymmetry must apply to BOTH sides of each battle — when the well-equipped faction defends, their heavy weapons should punish the attacker, not just when they attack.

**Historical basis:** ARBiH could not realistically threaten Brčko in 1992. Corridor cuts that occurred were by HVO/HV at Orašje, not by ARBiH at Brčko. (*Jelisić* TJ §§24–27 confirms RS continuous hold from May 1992 through the full 40-week scenario window.)

**Status:** Root cause of brcko anchor failure confirmed. Immediate fix path is `must_hold: true` on the corridor sector (Run D). P1 defender artillery fix addresses the underlying mechanic.

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
