# Winter Effects Design Document

**Date:** 2026-02-28
**Author:** Research + Design (AWWV Seasonal Modifier System)
**Status:** Proposal (no code changes)

---

## 1. Historical Evidence: Winter Slowdown in the Bosnian War

### 1.1 Pattern: Winter as Operational Pause

The Bosnian War (1992-1995) displayed a strong seasonal rhythm. Every year of the war shows the same pattern: major offensives launched in spring/summer, offensive tempo declining in autumn, and near-total operational stasis in winter (December through February), followed by renewed activity in spring.

**Key BB citations:**

- **BB2 p.445 (Kiseljak, winter 1993-94):** "The HVO's failed attempt to recapture Fojnica in November marked the end of large-scale fighting in the area. For the remainder of the winter, both sides dug in, regrouped, recovered... and awaited the resumption of fighting in the coming year." This is an explicit statement of winter operational pause.

- **BB2 p.486 (Donji Vakuf, winter 1994-95):** "The war of maneuver was over, at least until the following spring." And: "The Bosnian Serbs still held the even higher peaks to the northwest and northeast that gave them a secure defensive position for the winter months." This directly links mountain terrain to winter defensive advantage.

- **BB2 p.499 (Tesanj-Teslic, Nov 1994):** "The ARBiH 3rd Corps advance from 8 to 17 November was to mark the last major success in the Tesanj-Teslic area, as winter set in." November marks the end of the offensive season.

- **BB1 p.424 (Ozren, Sep 1995):** "The Bosnian Army sought to capture the remainder of the Ozren territory before the battlefield lines were frozen by a peace settlement or the Bosnian Serbs used the lull in fighting elsewhere." Late September urgency to finish operations before winter.

- **BB2 p.519 (Bjelasnica, Oct 1994):** References to "snow-covered mountain" in the context of combat at 2,000m elevation. Mountain operations continued into October but at reduced effectiveness.

### 1.2 Year-by-Year Operational Tempo

| Period | Major Operations | Notes |
|--------|-----------------|-------|
| Apr-Oct 1992 | Corridor 92 (Jun-Jul), Drina sweep (Apr-Jun), Jajce (Sep-Oct) | Peak offensive tempo for VRS/JNA |
| Nov 1992-Feb 1993 | Srebrenica raids (Jan 1993 -- exception, infantry-only) | General lull; Oric's raids were exceptional light-infantry operations in snow (BB2 p.405) |
| Mar-Oct 1993 | Cerska/Srebrenica VRS offensive (Feb-Apr), Drina valley (Apr-Aug), Igman (Jul-Aug) | VRS strategic offensive of 1993 began Feb/Mar |
| Nov 1993-Feb 1994 | Hill 935/Crkvica (Jan 1993 -- localized trench fighting) | "World War I-style trench warfare" -- small-scale, not large operations (BB2 p.430) |
| Mar-Nov 1994 | Gorazde (Apr), Kupres/Donji Vakuf (Oct-Nov) | Spring restart; Nov = last offensive before winter |
| Dec 1994-Feb 1995 | Bihac crisis (Nov-Dec 1994 -- exceptional, VRS defensive) | The Bihac crisis is the one exception to winter pause, driven by extreme strategic necessity |
| Mar-Sep 1995 | Srebrenica (Jul), Oluja (Aug), autumn offensives (Sep) | Final campaign season |

### 1.3 Why Winter Slowed Operations

1. **Snow and ice on mountain passes:** Bosnia's interior is mountainous (40-60% of the country above 500m). Mountain passes above 800m become impassable or extremely difficult in winter. Most front lines ran along mountain ridges.

2. **Mud season (rasputitsa):** The transition periods (late October-November and March-April) turn unpaved roads into mud. Bosnia's road network was limited and much of the military movement depended on secondary roads and tracks.

3. **Supply line degradation:** Heavy vehicles bog down, fuel consumption increases dramatically, and resupply over mountain roads becomes sporadic. The ARBiH, already supply-constrained, was hit hardest.

4. **Reduced daylight:** Balkan winter daylight is approximately 8-9 hours (vs. 15-16 in summer), reducing the operational window for coordinated attacks.

5. **Cold-weather casualties and morale:** Troops in trenches without adequate shelter, clothing, or heating suffered disproportionately. Frostbite, hypothermia, and desertion increased in winter.

6. **Vehicle immobilization:** Tanks and APCs -- the VRS's main advantage -- are less effective in snow and ice. Roads become icy, off-road movement is restricted, and maintenance demands increase.

### 1.4 Exceptions to Winter Pause

- **Srebrenica raids (Jan 1993):** Naser Oric's light infantry, operating on foot without vehicles, raided Kravica and attacked toward Skelani in January in snow. This was a survival operation by desperate, starving defenders -- not a planned offensive. Light infantry in familiar mountain terrain can operate in winter at reduced capability.

- **Bihac crisis (Nov-Dec 1994):** The VRS/APWB offensive against Bihac extended into early winter, driven by existential strategic imperatives (5th Corps breakout threatening the Krajina). Even this operation slowed dramatically by late December.

- **Sarajevo siege shelling:** Artillery bombardment continued year-round. Static siege operations (firing from fixed positions) are less affected by weather than maneuver operations.

---

## 2. Current Simulation State: No Seasonal Effects

### 2.1 What Exists

The simulation currently has **no seasonal or weather modifiers whatsoever.** The following systems run identically regardless of what calendar month corresponds to the current turn:

- **Attack resolution** (`src/sim/combat/attack_resolution_osid.ts`): Terrain multipliers exist (river x1.3, mountain x1.4, slope x1.15, friction x1.2) but are static year-round.
- **Bot strategy** (`src/sim/combat/bot_strategy.ts`): Doctrine phases are time-phased by week number but driven by strategic/political considerations (RS early war, HRHB Lasva), not by seasons.
- **Combat predictor** (`src/sim/combat/combat_predictor.ts`): Mirrors attack resolution constants; no seasonal input.
- **Supply** (`src/state/supply_state_derivation.ts`): No seasonal degradation.
- **Movement** (`src/sim/combat/brigade_movement.ts`, `osid_column_movement.ts`): No seasonal slowdown.

### 2.2 Date Tracking

The simulation tracks time as integer weeks in `state.meta.turn`. The `scenario_start_date` field in meta provides the calendar anchor:

- **Phase 0 start:** `{ year: 1991, month: 8, day: 1 }` (September 1, 1991 -- month is 0-indexed)
- **War-start scenario:** `{ year: 1992, month: 3, day: 6 }` (April 6, 1992 -- month is 0-indexed)

The UI already has `turnToCalendarMonthYear()` in `src/ui/warroom/components/warroom_utils.ts` that converts turns to calendar months. This logic can be adapted for the simulation layer.

---

## 3. Turn-to-Month Mapping

For the primary scenario (April 1992 start, turn 0 = week of April 6, 1992):

| Turn Range | Calendar Period | Season |
|-----------|----------------|--------|
| 0-3 | April 1992 | Spring |
| 4-7 | May 1992 | Spring |
| 8-12 | June 1992 | Summer |
| 13-16 | July 1992 | Summer |
| 17-21 | August 1992 | Summer |
| 22-25 | September 1992 | Autumn |
| 26-29 | October 1992 | Autumn |
| 30-34 | November 1992 | Late Autumn / Early Winter |
| 35-38 | December 1992 | Winter |
| 39-42 | January 1993 | Winter |
| 43-47 | February 1993 | Winter |
| 48-51 | March 1993 | Early Spring / Mud Season |
| 52-55 | April 1993 | Spring (Year 2) |

**Seasonal definitions (calendar month, 1-indexed):**

| Season | Months | Modifier Label |
|--------|--------|---------------|
| Summer | Jun-Aug (6,7,8) | None (baseline) |
| Shoulder (spring) | Apr-May (4,5) | Mild mud / thaw |
| Shoulder (autumn) | Sep-Oct (9,10) | Mild rain / cooling |
| Late autumn | Nov (11) | Moderate winter onset |
| Deep winter | Dec-Feb (12,1,2) | Full winter penalty |
| Early spring | Mar (3) | Thaw / mud season |

---

## 4. Proposed Seasonal Modifier System

### 4.1 Design Principles

1. **Affect attackers more than defenders.** Winter strongly penalizes offensive operations but has less effect on static defense. This matches the historical pattern: troops dug in their trenches year-round, but launching attacks across open ground in snow is far harder.

2. **Interact with terrain.** Mountain terrain should amplify winter effects. Lowland operations (e.g., Posavina corridor) are less affected than mountain operations (e.g., Bjelasnica at 2,000m).

3. **Deterministic.** The modifier depends only on `state.meta.turn` and `state.meta.scenario_start_date` -- no randomness.

4. **Gradual transitions.** No abrupt on/off switch. Use smooth ramps between seasons, reflecting the gradual onset and thaw of winter.

5. **Bot AI awareness.** The bot corps AI should reduce aggression in winter, reflecting historical commanders' reluctance to launch major operations in winter.

### 4.2 Core Modifier: Seasonal Attack Multiplier

A function `getSeasonalAttackMult(turn, scenarioStartDate, terrainSlope)` returns a multiplier on attacker power:

```
Month    | Base Mult | Mountain Mult (slope >= 0.35)
---------|-----------|-----------------------------
Apr      | 0.95      | 0.90    (spring thaw/mud)
May      | 1.00      | 1.00    (full capability)
Jun      | 1.00      | 1.00
Jul      | 1.00      | 1.00
Aug      | 1.00      | 1.00
Sep      | 1.00      | 0.95    (early mountain autumn)
Oct      | 0.95      | 0.85    (autumn rain, early mountain snow)
Nov      | 0.85      | 0.70    (winter onset)
Dec      | 0.75      | 0.55    (deep winter)
Jan      | 0.70      | 0.50    (deep winter, peak cold)
Feb      | 0.75      | 0.55    (deep winter)
Mar      | 0.85      | 0.65    (thaw/mud, mountain still frozen)
```

**Rationale for magnitudes:**

- **Lowland winter (0.70-0.75):** Operations do not stop entirely in lowlands -- the Posavina corridor saw some winter activity. But offensive power is reduced by ~25-30% due to supply difficulties, reduced daylight, cold-weather losses, and vehicle immobilization.

- **Mountain winter (0.50-0.55):** Mountain passes become impassable, off-road movement is impossible, and supply lines collapse. Attackers at 50% effectiveness means only the most concentrated attacks can succeed -- matching the historical pattern where only Srebrenica-type desperation raids occurred in mountain winter.

- **Spring/autumn shoulders (0.85-0.95):** The mud season (rasputitsa) degrades roads and movement but does not prevent operations. This captures the October Jajce fall and November end-of-season pattern.

### 4.3 Defender Seasonal Modifier

Defenders are less affected by winter because they hold prepared positions:

```
Month    | Defense Mult
---------|-------------
Nov-Mar  | 1.05 (entrenched positions gain slight advantage from frozen ground, reduced attacker capability)
Apr-Oct  | 1.00 (baseline)
```

The defense bonus is deliberately small (5%). The main winter effect is through attacker penalty, not defender bonus. This is because the entrenchment system already models the advantage of prepared positions -- winter just makes it harder to assault them.

### 4.4 Supply Seasonal Modifier

Winter degrades supply effectiveness, particularly for formations in mountainous terrain:

```
Month    | Supply Efficiency Mult
---------|----------------------
Apr-Oct  | 1.00
Nov      | 0.90
Dec-Feb  | 0.80 (mountain: 0.65)
Mar      | 0.85
```

This interacts with the existing supply system by reducing the effective supply state. A formation rated "adequate" in summer might become "strained" in winter if the seasonal modifier pushes it below threshold.

### 4.5 Bot AI Seasonal Aggression Modifier

The bot corps AI should reduce aggression in winter. This is implemented as an additive modifier to the existing `aggression_modifier` in `CorpsDirective`:

```
Month    | Bot Aggression Adjustment
---------|-------------------------
Apr-Sep  | 0.00 (no change)
Oct      | -0.05
Nov      | -0.10
Dec-Feb  | -0.20 (significantly reduced offensive intent)
Mar      | -0.10
```

This stacks with existing doctrine-phase aggression modifiers. For example, RS in early-war doctrine (aggression_modifier = 0.35) would become 0.15 in December -- still somewhat aggressive, but significantly toned down. RBiH in survival defense (aggression_modifier = -0.2) would become -0.4 in December -- essentially zero offensive activity, matching history.

### 4.6 Movement Seasonal Modifier (Optional)

Column movement speed could be reduced in winter:

```
Month    | Movement Rate Mult
---------|-------------------
Apr-Oct  | 1.00
Nov      | 0.85
Dec-Feb  | 0.70 (mountain: 0.50)
Mar      | 0.80
```

This is lower priority than the attack modifier but would complete the seasonal picture. In practice, formation movement in the sim is already somewhat constrained by ZoC and contiguity rules.

---

## 5. Implementation Plan

### 5.1 New File: `src/sim/combat/seasonal_effects.ts`

A new pure-function module with no side effects:

```typescript
/**
 * Seasonal effects on military operations.
 *
 * Deterministic: depends only on turn number and scenario start date.
 * No randomness, no timestamps.
 *
 * Historical basis: Bosnian War operations showed strong seasonal rhythm.
 * Major offensives launched Apr-Oct; near-total stasis Dec-Feb.
 * Mountain terrain amplifies winter effects.
 *
 * BB2 p.445: "For the remainder of the winter, both sides dug in..."
 * BB2 p.486: "The war of maneuver was over, at least until the following spring."
 * BB2 p.499: "...as winter set in" (marking end of offensive season)
 */

interface SeasonalModifiers {
    attack_mult: number;       // [0.5, 1.0] applied to attacker power
    defense_mult: number;      // [1.0, 1.05] applied to defender power
    supply_mult: number;       // [0.65, 1.0] applied to supply effectiveness
    aggression_adj: number;    // [-0.20, 0.00] additive to bot aggression
    movement_mult: number;     // [0.50, 1.0] applied to movement rate
    season_label: string;      // 'summer' | 'spring' | 'autumn' | 'winter' | 'deep_winter' | 'mud_season'
}

function getSeasonalModifiers(
    turn: number,
    scenarioStartDate: { year: number; month: number; day: number },
    avgSlopeIndex: number  // 0-1; from terrain scalars
): SeasonalModifiers { ... }

function getCalendarMonth(
    turn: number,
    scenarioStartDate: { year: number; month: number; day: number }
): number { ... }  // 1-12
```

### 5.2 Integration Points

| System | File | How |
|--------|------|-----|
| **Attack resolution** | `attack_resolution_osid.ts` | Multiply attacker power by `attack_mult` after existing terrain/posture/supply multipliers. Pass `defense_mult` to defender power. |
| **Combat predictor** | `combat_predictor.ts` | Mirror the attack resolution changes so bot AI sees accurate predictions. |
| **Bot corps AI** | `bot_corps_ai.ts` | Add `aggression_adj` to existing aggression modifier in `generateCorpsDirective()`. |
| **Bot strategy** | `bot_strategy.ts` | Optionally adjust `max_attack_share_override` downward in winter. |
| **Supply derivation** | `supply_state_derivation.ts` | Multiply supply scores by `supply_mult` before threshold comparison. |
| **Column movement** | `osid_column_movement.ts` | Multiply movement rate by `movement_mult`. |
| **Turn pipeline** | `turn_pipeline.ts` | Compute seasonal modifiers once per turn and pass to consumers. |

### 5.3 Terrain Interaction

The `avgSlopeIndex` parameter is derived from the OSID's terrain scalars. This creates a natural terrain-season interaction:

- **Lowland OSID** (slope_index < 0.20): Base winter penalty only (e.g., 0.75x in January)
- **Hill OSID** (slope_index 0.20-0.35): Moderate mountain penalty (interpolated, ~0.60x in January)
- **Mountain OSID** (slope_index >= 0.35): Full mountain winter penalty (0.50x in January)

The formula for attack_mult:

```
attack_mult = base_seasonal_mult + (mountain_seasonal_mult - base_seasonal_mult) * clamp(slope_index / 0.5, 0, 1)
```

This provides smooth interpolation between lowland and mountain effects based on actual terrain.

---

## 6. Calibration Knobs

All modifier values should be defined as tunable constants in `seasonal_effects.ts`:

| Constant | Default | Range | Effect |
|----------|---------|-------|--------|
| `WINTER_ATTACK_MULT_LOWLAND` | 0.70 | 0.5-0.9 | Deep winter attacker penalty (lowland) |
| `WINTER_ATTACK_MULT_MOUNTAIN` | 0.50 | 0.3-0.7 | Deep winter attacker penalty (mountain) |
| `WINTER_DEFENSE_BONUS` | 1.05 | 1.0-1.15 | Deep winter defender bonus |
| `WINTER_SUPPLY_MULT_LOWLAND` | 0.80 | 0.6-0.95 | Winter supply degradation (lowland) |
| `WINTER_SUPPLY_MULT_MOUNTAIN` | 0.65 | 0.4-0.85 | Winter supply degradation (mountain) |
| `WINTER_AGGRESSION_ADJ` | -0.20 | -0.40-0.00 | Bot aggression reduction in deep winter |
| `WINTER_MOVEMENT_MULT_LOWLAND` | 0.70 | 0.5-0.9 | Winter movement penalty (lowland) |
| `WINTER_MOVEMENT_MULT_MOUNTAIN` | 0.50 | 0.3-0.7 | Winter movement penalty (mountain) |
| `SHOULDER_ATTACK_MULT` | 0.85 | 0.7-0.95 | Nov/Mar shoulder season penalty |
| `MUD_SEASON_ATTACK_MULT` | 0.95 | 0.85-1.0 | Apr spring thaw penalty |
| `WINTER_MONTHS` | [12,1,2] | - | Months considered deep winter |
| `SHOULDER_MONTHS` | [11,3] | - | Months considered shoulder season |

---

## 7. Impact Assessment: 52-Week Run

### 7.1 Expected Effects

With winter modifiers active, the 52-week April 1992-April 1993 run should exhibit:

1. **Weeks 0-26 (Apr-Oct 1992):** No change. Full offensive capability. RS territorial seizure proceeds as before.

2. **Weeks 27-29 (Oct 1992):** Slight slowdown. The fall of Jajce (Oct 1992) should still occur but perhaps in the last possible window before winter onset.

3. **Weeks 30-34 (Nov-Dec 1992):** Offensive operations drop sharply. RS consolidates gains. RBiH digs in. Front lines freeze in place. This matches historical reality exactly.

4. **Weeks 35-47 (Jan-Mar 1993):** Near-total stasis on most fronts. The Srebrenica January raids can still occur (light infantry in mountain terrain at 0.50x is still possible for concentrated forces vs. weak defense). Front lines barely move.

5. **Weeks 48-52 (Apr 1993):** Spring thaw. Operations resume. VRS Drina offensive begins.

### 7.2 Impact on RS Territory Gap

The RS territory gap (44% at 52 weeks vs. ~60% target) may **improve** with winter effects. Why:

- RS makes its largest territorial gains in the first 26 weeks (spring-summer 1992). These are unaffected.
- Winter freezes the front lines in place, **preventing RBiH counter-captures** during weeks 30-47. Currently, the sim allows unrealistic winter counter-attacks that claw back RS territory.
- The net effect should be RS retaining more of its gains through the first winter, ending Year 1 closer to the historical 60% target.

### 7.3 Impact on Casualty Model

Winter should reduce casualties in the Dec-Feb period by ~30-50% (fewer attacks = fewer battles = fewer casualties). This matches historical data: the ICRC and UNHCR data show lower casualty rates in winter months across all three years of the war.

### 7.4 Interaction with Existing Doctrine Phases

The winter modifier stacks with existing doctrine phases but does not conflict:

- **RS week 30 doctrine transition** (general_offensive -> balanced): Already occurs at approximately the same time as winter onset. Winter reinforces this transition.
- **RBiH survival defense** (weeks 0-26): Already minimal offensive activity. Winter in weeks 30-47 doubles down on this.
- **HRHB post-week-26 balanced stance:** Winter further suppresses HRHB offensive operations, matching the historical pattern of the Croat-Muslim war starting in earnest only in spring 1993.

---

## 8. Testing Strategy

### 8.1 Unit Tests

- `getCalendarMonth()` returns correct month for known turn/start-date pairs
- `getSeasonalModifiers()` returns baseline (1.0) for summer months
- `getSeasonalModifiers()` returns penalized values for winter months
- Mountain slope amplifies winter penalty correctly
- Smooth interpolation between seasons (no abrupt jumps)

### 8.2 Integration Tests

- Run 52-week scenario with winter effects and verify:
  - Fewer attacks occur in weeks 30-47 vs. current baseline
  - RS territory at week 52 is >= current 44% (should increase)
  - Total casualties decrease by 15-25% (weighted toward winter reduction)
  - Front line movement in weeks 35-47 is near zero

### 8.3 Regression

- Verify determinism: same seed produces identical results with winter effects enabled
- Verify that summer-month turns produce identical results to current baseline

---

## 9. Open Questions

1. **Should artillery/shelling be exempt from winter penalties?** Historical evidence suggests static shelling continued year-round (Sarajevo siege). The attack resolution system conflates maneuver attacks with bombardment. If needed, a future refinement could exempt `consolidation` posture from winter penalty.

2. **Should winter affect entrenchment gain rate?** Frozen ground is harder to dig, but troops also have more time to improve positions in winter. These effects may cancel out. Current recommendation: no change to entrenchment.

3. **Should the Bihac crisis (Nov-Dec 1994) be modeled as an exception?** The VRS/APWB offensive against Bihac extended into early winter. This could be handled by the existing army-priority system (high-weight strategic necessity overrides winter caution) rather than exempting specific operations.

4. **Fuel and ammunition consumption in winter:** Should winter increase supply consumption (more fuel for heating, vehicles)? This would be a second-order effect that could be added later.

5. **Feature flag:** Should this be gated behind a `scenario.enable_seasonal_effects` flag for backward compatibility? Recommended: yes, defaulting to `true` for new runs.

---

## 10. Balkan Battlegrounds Citations Index

| Citation | Content | Relevance |
|----------|---------|-----------|
| BB2 p.405 | Srebrenica winter raids, Jan 1993 -- operations "in the snow" | Winter infantry operations are possible but exceptional |
| BB2 p.411 | Igman/Bjelasnica -- "1984 Winter Olympics ski jump" elevation | Mountain winter context |
| BB2 p.430 | Hill 935/Crkvica, Jan 1993 -- "World War I-style trench warfare" in winter | Localized fighting continues; major operations do not |
| BB2 p.445 | Kiseljak -- "For the remainder of the winter, both sides dug in, regrouped, recovered..." | Explicit winter operational pause |
| BB1 p.443 | UN plan to "Winterize" enclaves, Nov 1993 | Winter as a recognized humanitarian/operational factor |
| BB2 p.486 | Donji Vakuf -- "The war of maneuver was over, at least until the following spring" | Mountain terrain + winter = complete halt |
| BB2 p.486 | "Secure defensive position for the winter months" | Winter favors defense, especially in mountains |
| BB2 p.499 | Tesanj-Teslic -- "as winter set in" marking end of offensive season | November = end of offensive operations |
| BB2 p.519 | Bjelasnica -- "snow-covered mountain" in October operations | Mountain snow begins in October at high altitude |
| BB1 p.424 | Ozren -- "battlefield lines were frozen" (Sep 1995, anticipating winter) | Pre-winter urgency to complete operations |

---

## 11. Summary

The Bosnian War exhibited a clear seasonal operational rhythm that the AWWV simulation currently does not model. Historical evidence from Balkan Battlegrounds consistently shows:

- Major offensives launched April-October
- November marks the end of the offensive season
- December-February sees near-total operational stasis
- Mountain terrain amplifies winter effects to near-impossibility
- Spring thaw brings a mud season before full capability resumes

The proposed system adds a lightweight, deterministic seasonal modifier that:

- Reduces attacker power by 25-50% in winter (terrain-dependent)
- Reduces bot AI aggression in winter
- Degrades supply effectiveness in winter
- Smoothly transitions between seasons with no abrupt jumps
- Uses existing terrain scalars (slope_index) for terrain interaction
- Preserves determinism (depends only on turn number and start date)

Expected impact on the 52-week run: RS territory retention improves (frozen front lines prevent unrealistic winter counter-attacks), total casualties decrease modestly, and the simulation's operational rhythm matches the historical record.
