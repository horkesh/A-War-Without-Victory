# Brigade Posture & Home Ground Defense — Integrated Design Specification

**Date:** 2026-03-04
**Status:** DESIGN — Approved for implementation planning
**Authors:** Paradox team convene (Game Designer, Historian, Tech Architect, Gameplay Programmer)
**Replaces:** Systems Manual §6.1 (posture table), Attack Resolution Spec §2.4 (posture multipliers)

---

## §1 — Design Philosophy

### 1.1 The Organic Asymmetry Principle

Every mechanical layer in AWWV exists to let doctrinal asymmetry *emerge* from the engine rather than be scripted. Brigade posture is the clearest expression of this: a VRS brigade in 1992 that adopts `assault` because it has cohesion 80, artillery support, and corps offensive stance is not executing a hard-coded "early VRS aggression" event. It is an expression of real capability — equipment, morale, officers, supply — translated into tactical behaviour through the posture system.

By 1995, the same corps can no longer field an assault. Not because of a hard cap, but because cohesion is depleted, heavy munitions are strained, officers have died, and the corps stance has shifted to defensive. The degradation is mechanical, not scripted.

### 1.2 Posture as Tactical Disposition; Home Ground as Existential Context

**Posture** is a chosen tactical orientation. It answers: *how is this brigade oriented right now?* It is mutable, ordered, and expensive — changing posture carries cohesion cost and takes effect next turn.

**Home Ground** is not chosen. It is a geographic and psychological fact: this brigade was raised here, these are their families, there is nowhere else to go. A brigade defending its home municipality does not decide to fight to the last. It simply does.

This distinction determines the implementation: posture is controlled through orders; home ground is computed automatically each turn from brigade origin and current position.

### 1.3 The Attack-Rest-Counterattack Cycle

The posture system creates a temporal rhythm that should be visible in play:

```
hold → dig_in (stable sector) → hold (fortification complete)
     ↓
  defend (threat rises) → attack (directive satisfied) → hold (cohesion recovery)
                                                       ↓
                      elastic_defense ← (overextended) ← attack fails
                             ↓
                      counterattack (window: 2 turns) → hold (recover)
```

For home-ground brigades, the cycle has a different character: they can sustain `defend` far longer than non-locals, their `counterattack` is more powerful, and `hold` recovers cohesion faster (local support). They never leave the cycle's defensive arc.

---

## §2 — Posture System: Complete Specification (8 Postures)

### 2.1 Posture Table

| Posture | Atk× | Def× | Coh/turn | Pressure | Reinf | Min Coh | Notes |
|---------|------|------|----------|----------|-------|---------|-------|
| `hold` | 0 | 1.20 | +1.0 | 0.20 | ×1.0 | 0 | Sustainable rest. Default state. |
| `defend` | 0 | 1.40 | −1.0 | 0.35 | ×1.0 | 0 | Active defense. Costs cohesion. |
| `defend_at_all_costs` | 0 | 1.60 | −4.0 | 0.10 | ×0.5 | 10 | Existential. No retreat. Burns out. |
| `elastic_defense` | 0 | 1.10 | −0.5 | 0.15 | ×1.0 | 0 | Trade space for time. |
| `counterattack` | 0.65 | 1.15 | −1.5 | 1.20 | ×0.7 | 10 | Reclaim lost ground. Opportunity-gated. |
| `dig_in` | 0 | 1.35→1.60† | +0.5 | 0.10 | ×1.0 | 0 | Fortify in place. Locked from ops. Resets on disruption. |
| `attack` | 1.00 | 0.80 | −3.0 | 1.50 | ×0.5 | 25 | Full offensive. |
| `assault` | 1.20 | 0.60 | −5.0 | 2.00 | ×0.5 | 60 | All-in gambit. Rare. |

†`dig_in` defense ramps from 1.35 (turn 1) to 1.60 (full dig, after 3+ turns). See §2.7 for construction mechanics.

**Columns:**
- **Atk×**: Multiplier on `computeAttackerPower()` base
- **Def×**: Multiplier on `computeDefenderPower()` base
- **Coh/turn**: Cohesion change per turn applied by `applyPostureCosts()`; home ground adds +0.5 (§3.5)
- **Pressure**: Multiplier on `computeBrigadeRawPressure()` output
- **Reinf**: Multiplier on recruitment reinforcement rate in `formation_spawn.ts`
- **Min Coh**: Minimum cohesion required to adopt this posture (`canAdoptPosture()`)

### 2.2 Adoption Constraints

Beyond minimum cohesion, posture adoption is gated by:

| Posture | Readiness Required | Corps Stance Gate | Home Ground Gate |
|---------|-------------------|-------------------|-----------------|
| `hold` | any | any | auto-upgraded to `defend` |
| `defend` | active, overextended, degraded, forming | any | no restriction |
| `defend_at_all_costs` | active, overextended, degraded | any | auto-applied (see §3.3) |
| `elastic_defense` | active, overextended, degraded | not `offensive` | allowed with penalty (§3.6) |
| `counterattack` | active, overextended | not `reorganize` | allowed + bonus (§3.4) |
| `dig_in` | active, degraded, overextended | any | **PREFERRED** — home brigades dig in by default on stable sectors |
| `attack` | active, overextended | any | **BLOCKED** |
| `assault` | active only | `offensive` only, coh ≥ 60 | **BLOCKED** |

Home ground BLOCKED postures: the brigade will not leave its defensive role for offensive expeditions while family and home are at stake. `attack` and `assault` are blocked; `dig_in` is the natural home-ground fortification state.

### 2.3 Posture Cohesion Sustainability

Maximum turns before cohesion reaches the adoption minimum at stated drain rate (from cohesion 85):

| Posture | Turns to min coh | Practical limit |
|---------|-----------------|-----------------|
| `assault` | ~17 turns | 3–5 turns (corps will abort operation) |
| `defend_at_all_costs` | ~19 turns | ~10–12 turns before relief needed |
| `attack` | ~20 turns | 1 full operation cycle |
| `counterattack` | ~50 turns | Window-limited (2 turns) anyway |
| `defend` | ~85 turns | Extended active defense campaign |
| `elastic_defense` | indefinitely | Sustainable |
| `dig_in` | indefinitely (recovers) | Sustainable while not disrupted |
| `hold` | indefinitely (recovers) | Rest state |

### 2.4 Posture Transitions

Valid transition pairs and their contexts:

```
hold        → defend          (sector threat rises)
hold        → attack          (corps directive assigned)
hold        → dig_in          (sector stable, player/bot elects fortification)
defend      → hold            (threat passes, recover)
defend      → counterattack   (adjacent OSID recaptured by enemy)
attack      → hold            (directive satisfied, recover)
attack      → defend          (post-battle forced, ammunition collapse)
elastic_def → counterattack   (auto-transition after retreat — see §3.4)
counterattack → hold          (window expired or objective recaptured)
dig_in      → defend          (brigade attacked; progress resets)
dig_in      → hold            (fortification complete, player releases)
```

`defend_at_all_costs` does not transition automatically — it must be manually removed or the brigade must be destroyed.

`dig_in` resets `dig_in_progress` to 0 on any forced transition (disruption, displacement, player movement order). The fortification cannot be packed up and moved.

### 2.5 Equipment Tempo Multipliers

Applied to equipment effectiveness in `computeEquipmentMultiplier()`:

| Posture | Equipment Tempo |
|---------|----------------|
| `assault` | 1.60× |
| `attack` | 1.50× |
| `counterattack` | 1.30× |
| `hold` / `defend` / `elastic_defense` / `defend_at_all_costs` | 1.00× |
| `dig_in` | 0.80× |

Tempo represents how intensively the brigade uses its heavy weapons. Offensive postures wear equipment faster. `dig_in` brigades are not engaging; their weapons sit in prepared positions while men dig — reduced maintenance expenditure.

### 2.6 Posture Removal: `consolidation` and `probe`

**`consolidation`** is removed from `BrigadePosture`. It was designed for Phase I territory settlement (flip uncontrolled OSIDs). Phase II disables `consolidation_flips.ts`. Its mechanical niche (weak attack, moderate defense, slight cohesion recovery) is covered by `dig_in` (deliberate fortification with cohesion recovery) and `hold` (pure rest). Phase II brigades should not be attacking uncontested OSIDs. Legacy constants in `combat_math.ts` (`POSTURE_ATTACK['consolidation']`, `POSTURE_DEFENSE['consolidation']`) are also removed. Any live formation with `posture === 'consolidation'` in save files is treated as `hold` on load.

**`probe`** is removed from `BrigadePosture`. It occupied a weak-attack niche that in practice requires the same bot infrastructure as `attack` while providing no distinguishable historical analogue. A "probing" operation in AWWV is simply an `attack` ordered with a marginal target — the outcome (stalemate, repulsed) produces the same information and effects. The offensive capability of `probe` is absorbed by the bot using `attack` on low-priority targets; the cohesion-efficient offensive role is absorbed by `counterattack`. Any live formation with `posture === 'probe'` is treated as `hold` on load.

### 2.7 `dig_in` Construction Mechanics

`dig_in` is the only posture with a multi-turn construction period. This is modelled via `FormationState.dig_in_progress: number` ([0.0, 1.0]).

**Construction rate:** `DIG_IN_PROGRESS_PER_TURN = 0.25`. Full effect reached at `dig_in_progress ≥ DIG_IN_FULL_EFFECT_THRESHOLD = 0.75`, requiring **3 turns**.

**Defense ramp:**
```
dig_in_def_mult = 1.35 + (dig_in_progress / DIG_IN_FULL_EFFECT_THRESHOLD) × (1.60 − 1.35)
                = 1.35 + progress_ratio × 0.25
```
At turn 1 (progress 0.25): 1.35 + 0.25/0.75 × 0.25 = **1.433×**
At turn 2 (progress 0.50): 1.35 + 0.50/0.75 × 0.25 = **1.517×**
At turn 3+ (progress ≥ 0.75): clamped to **1.60×**

**Entrenchment interaction:** `dig_in` raises the entrenchment rate to `3 × ENTRENCHMENT_PER_TURN = 0.105/turn` and raises the entrenchment cap from 6 to `DIG_IN_ENTRENCHMENT_CAP = 9`. This reflects proper field works: trenches, overhead cover, minefields, prepared firing positions — depth beyond what passive entrenchment produces.

**Operational lockout during dig_in:**
- Brigade cannot be issued movement orders
- Brigade cannot be designated as corps sector reserve
- Brigade cannot participate in sector offensive operations or pre-planned operations
- Brigade CAN successfully defend (its own OSID is attacked) — but a defensive loss that displaces it resets `dig_in_progress = 0` (position overrun, works abandoned)
- Brigade contributes minimal passive pressure (0.10×) — they are present but not threatening

**Interruption reset:** `dig_in_progress = 0` on: displacement (forced retreat), movement order executed, posture change to any other posture. The fortification cannot be resumed — if the position is abandoned, work starts over.

**Bot use of `dig_in`:** The bot assigns `dig_in` to brigades that meet all: sector has had no incoming attack in ≥ 3 turns; corps stance is defensive or balanced; brigade cohesion ≥ 20; brigade is not the designated counterattack reserve. VRS will use `dig_in` extensively in weeks 20–40 on quiet sectors. ARBiH will use it on enclave home-ground brigades between attacks.

---

## §3 — Home Ground Defense

### 3.1 Concept

A brigade is on **home ground** when its `municipalityId` tag matches the municipality of its current OSID. Formally:

```
home_defense_active = (brigade.municipalityId !== undefined)
    && (brigade.location_osid.startsWith(`op:${brigade.municipalityId}:`))
```

This is computed by the pipeline each turn as `compute-home-defense-active` and stored as `FormationState.home_defense_active: boolean`. It is always deterministic, geography-only, no external flags.

### 3.2 Mechanical Effects (Stack Summary)

When `home_defense_active === true`:

| Effect | Value | Application Point |
|--------|-------|-------------------|
| Defense power multiplier | ×1.25 | `computeDefenderPower()` — outermost multiplier |
| Counterattack attack multiplier | ×1.15 | `computeAttackerPower()` when posture=`counterattack` AND target OSID ∈ home municipality |
| Officer quality floor | +0.10 | `getOfficerQualityMult()` — added to result, capped at faction ceiling |
| Cohesion recovery | +0.5/turn | `applyPostureCosts()` — additive after posture drain |
| Entrenchment rate | +100% | `updateEntrenchment()` — doubles per-turn accumulation |
| Morale floor | 15 | `morale_drift.ts` — absolute floor, below faction-standard floor |
| Retreat behaviour | MODIFIED | `attack_resolution_osid.ts` — see §3.3 |
| Posture minimum | `defend` | `canAdoptPosture()` — `hold` auto-upgraded, `attack`/`assault` blocked; `dig_in` preferred on stable sectors |
| Movement orders | BLOCKED | Brigade refuses move orders out of home municipality |

### 3.3 No-Retreat Mechanic

A brigade on home ground that loses a combat does NOT execute a normal displacement. The resolution cascades as follows:

**Step 1: Within-municipality fallback**
If any other friendly OSID exists within the home municipality, the brigade falls back there. `home_defense_active` remains true. Penalties applied:
- +40% additional personnel loss (last-stand cost; these are casualties from a fighting withdrawal in known terrain, not a rout, but still costly)
- Cohesion −20
- Morale −15
- `disrupted_turns = 3`

**Step 2: Cross-municipality displacement (home lost)**
If no friendly OSID remains in the home municipality, the brigade falls back to an adjacent friendly OSID (normal displacement). `home_defense_active = false`. The brigade has lost its home ground. Penalties:
- +40% additional personnel loss
- Cohesion −30
- Morale −25 (home is gone)
- `disrupted_turns = 4`
- All accumulated entrenchment lost (normal on retreat)

**Step 3: Destruction in place**
If no adjacent friendly OSID exists (encirclement), the brigade is **destroyed**. No displacement. Personnel scattered, unit removed from formation record. This is the end-state for enclaves that fall completely — Srebrenica's defenders were not simply displaced.

**Decisive defeat override:**
The above cascade applies to ALL combat losses on home ground (repulsed, stalemate, costly defeat, even victory — the attacker took the OSID). If a brigade in `defend_at_all_costs` posture loses a decisive defeat:
- Step 1/2/3 applies as above
- +20% ADDITIONAL personnel loss stacked on the +40% (total +60% last-stand cost for DAAC)
- This models the reality of holding until the position is physically overrun

### 3.4 Home Ground Counterattack

When a brigade falls back from its home OSID (Step 1 above — within municipality), it automatically transitions to `counterattack` posture and receives the **counterattack opportunity window** (2 turns) on the lost OSID.

During this window:
- Attack power: 0.65 (counterattack base) × 1.30 (opportunity bonus) × 1.15 (home ground attack modifier) = **~0.97×**
- This is nearly equivalent to `attack` posture, representing the furious intensity of reclaiming home ground
- Enemy defender has no entrenchment (just captured), is disrupted, and may be at end of supply extension
- The combined effect makes these counterattacks historically accurate: sudden, intense, and often successful

Window expires after 2 turns regardless of whether the counterattack was attempted.

### 3.5 Home Ground Cohesion Dynamics

Local support networks — food, water, medical care from the population, knowledge of safe routes — partially offset the cohesion drain of active postures:

| Posture | Normal Coh/turn | Home Ground Coh/turn |
|---------|----------------|---------------------|
| `assault` | −5.0 | −4.5 |
| `defend_at_all_costs` | −4.0 | −3.5 |
| `attack` | BLOCKED on home ground | — |
| `counterattack` | −1.5 | −1.0 |
| `defend` | −1.0 | −0.5 |
| `elastic_defense` | −0.5 | 0.0 |
| `dig_in` | +0.5 | +1.0 (home ground bonus stacks) |
| `hold` | +1.0 | +1.5 |

A home-ground brigade in `dig_in` recovers cohesion at the same rate as a non-local brigade in `hold` (+1.0/turn). They are working, not fighting, in familiar ground with local support. This makes `dig_in` particularly cost-effective for enclave brigades that need both fortification and cohesion recovery between attacks.

A brigade resting in `hold` posture in its home municipality recovers cohesion 50% faster than elsewhere. A brigade actively defending recovers from operations more readily between battles.

### 3.6 Elastic Defense Override in Home Territory

A player CAN order `elastic_defense` on a home-ground brigade — this represents a deliberate command decision to trade space for force preservation (the Dudaković pattern in Bihać). The order is executed, but with significant costs:

- Immediate morale penalty: −20 (troops are ordered to retreat from their homes)
- The brigade retreats to a friendly OSID within the home municipality (Step 1 path), or cross-municipality if none available
- If remaining within municipality: `home_defense_active` stays true; counterattack window activates automatically
- If forced cross-municipality: home ground lost, morale penalty escalates to −30
- Cohesion drain during elastic_defense on home ground: 0.0/turn (the offset eliminates it — they're still fighting for something real)

This is a high-risk high-reward manoeuvre: you take a morale hit to preserve the brigade, but if you counterattack within the window you may retake the ground with near-`attack` power. If the window expires without counterattack, morale is simply lower and the position lost.

### 3.7 Morale Floor

The faction-standard morale retreat resistance floor (RBiH=62, RS=70, HRHB=65) does NOT apply to home-ground brigades in the normal sense — they fight regardless. Instead, a home-ground brigade has a separate morale floor of **15** for purposes of retreat resistance. Even brigades at morale 20 continue to defend their home ground. This is what produced the seemingly impossible holdouts: Goražde's defenders at zero supply, zero hope, still fighting.

This floor applies only while `home_defense_active === true`. If the brigade is displaced from home ground, normal morale thresholds resume.

### 3.8 Officer Quality Floor

A brigade defending home ground benefits from terrain familiarity, local intelligence networks, and intimate knowledge of every approach. This partially compensates for poor officer quality:

```
effective_officer_quality_defense = max(officer_quality_mult, officer_quality_mult + HOME_GROUND_OQ_BONUS)
HOME_GROUND_OQ_BONUS = 0.10
```

Applied as an additive bonus to `getOfficerQualityMult()` for defensive calculations only. Does not affect attack power (you still need trained officers to coordinate an assault). This means early-war ARBiH brigades defending their home municipalities are stronger than their officer quality alone suggests — they know the ground even without formal training.

### 3.9 Pre-loaded Entrenchment at Scenario Init

For mid-war scenarios (starting after week 0), home-ground brigades receive partial pre-loaded entrenchment reflecting months of digging in before the scenario begins:

```
init_entrenchment = min(MAX_ENTRENCHMENT, scenario_start_week × ENTRENCHMENT_PER_TURN × 0.5)
```

The 0.5 factor reflects that full entrenchment was never immediately achieved — work was interrupted, resources constrained, priorities shifted. For the `apr1992_definitive_40w` scenario starting at week 0, pre-loading is zero (entrenchment develops organically through play).

---

## §4 — Combat Formula Integration

### 4.1 Full Defensive Power Stack

The complete `computeDefenderPower()` formula with all multipliers in application order:

```
defenderPower =
    basePower                           // personnel × equipment ratio
    × POSTURE_DEFENSE[posture]          // §2.1 table
    × CORPS_STANCE_DEFENSE[corpsStance] // defensive:1.2, balanced:1.0, offensive:0.8
    × homeGroundMult                    // 1.25 if home_defense_active, else 1.0
    × ethnicDefenseBonus                // ethnic_defense.ts: 1.0–1.12
    × (1 + defense_terrain_bonus)       // per-brigade OOB field (Slavna +0.30, etc.)
    × terrainMult                       // osid terrain type (mountain 1.4×, river 1.3×, etc.)
    × entrenchmentBonus                 // 1.0 + (entrenchment × ENTRENCHMENT_MULT_FACTOR)
    × resilienceBonus                   // streak: up to 1.30× (6 consecutive defenses)
    × enclaveResilienceMult             // 1.0 + resilience × 0.005 × hardeningMod
    × supplyMult                        // getEffectiveSupplyState(): adequate 1.0, strained 0.75
    × officerQualityMult                // getOfficerQualityMult() + HOME_GROUND_OQ_BONUS if home
    × disruptionMult                    // disrupted: 0.60, normal: 1.0
```

### 4.2 Full Attacker Power Stack

```
attackerPower =
    basePower
    × POSTURE_ATTACK[posture]           // §2.1 table; 0 for non-attacking postures
    × CORPS_STANCE_ATTACK[corpsStance]  // offensive:1.15, balanced:1.0, defensive:0.5
    × counterattackOpportunityMult      // 1.30 if target captured within 2 turns, else 1.0
    × homeGroundCounterattackMult       // 1.15 if home_defense_active && posture=counterattack && target ∈ home mun
    × concentrationBonus                // estimateConcentratedOutcome() co-attack bonus
    × supplyMult                        // getEffectiveSupplyState()
    × officerQualityMult                // getOfficerQualityMult()
    × disruptionMult                    // 0.50 for disrupted attacker
    × externalSupportMult               // getExternalSupportMultiplier() from war_timeline
```

### 4.3 Worked Examples

**Example A: Viteška Brigade (HVO, Vitez) defending home ground, 1993**

Context: 246th Viteška Brigade (OOB field `defense_terrain_bonus: 0.25`). Cohesion 70, morale 55. Corps defensive stance. Fully entrenched (9 turns). Ethnic Croat majority in Vitez. Home ground active.

```
defenderPower =
    base(4200 personnel × 0.85 equipment) = 3570
    × 1.40  (defend posture)
    × 1.20  (corps defensive stance)
    × 1.25  (home ground)
    × 1.09  (ethnic defense, ~55% Croat)
    × 1.25  (defense_terrain_bonus)
    × 1.35  (terrain: urban/ridge)
    × 1.585 (entrenchment at 9 turns: 9 × 0.035 = 0.315 → bonus ≈ 1.585)
    × 1.15  (resilience streak: 4 consecutive)
    × 1.0   (no enclave)
    × 1.0   (adequate supply from Croatian pipeline)
    × 0.97  (HVO officer quality constant)
    × 1.0   (not disrupted)
    ≈ 3570 × 7.83 ≈ 27,953 effective power units
```

This explains why Vitez was never taken. An attacker would need extraordinary force concentration to overcome this.

**Example B: ARBiH brigade attacking the same position at Vitez**

Context: ARBiH 3rd Corps brigade, attack posture, cohesion 65, week 20 (officer quality ~0.91). Concentrated attack (2 brigades).

```
attackerPower =
    base(3800 × 0.52 equipment) = 1976
    × 1.0   (attack posture)
    × 1.0   (balanced corps stance)
    × 1.0   (no opportunity bonus)
    × 1.0   (not home ground)
    × 1.35  (concentration of 2 brigades)
    × 0.75  (strained supply)
    × 0.91  (officer quality, week 20)
    ≈ 1976 × 0.936 ≈ 1850 effective power units

ratio = 1850 / 27953 ≈ 0.066 → decisive defender victory, massive attacker casualties
```

**Example C: VRS rapid counterattack on just-captured OSID, Drina corridor 1994**

Context: VRS Guards Brigade (elite, 65th Protection equivalent), counterattack posture, cohesion 78, opportunity window active (enemy captured OSID 1 turn ago). VRS corps has 40 heavy weapons, adequate munitions.

```
attackerPower =
    base(2800 × 0.92 equipment) = 2576
    × 0.65  (counterattack posture base)
    × 1.15  (offensive corps stance)
    × 1.30  (opportunity bonus: captured 1 turn ago)
    × 1.0   (not home ground — Guards Brigade is rapid response, not local)
    × 1.0   (no concentration — single brigade)
    × 1.0   (adequate supply)
    × 1.10  (peak VRS officer quality week 10)
    × 1.18  (bombardment mult from 40 heavy weapons at adequate munitions)
    ≈ 2576 × 1.297 ≈ 3341 effective power units

enemy defender (ARBiH, just attacked, no entrenchment, disrupted):
    defenderPower = base(2400 × 0.58) × 0.5 (attack posture) × 0.60 (disrupted) × 1.0 ...
    ≈ 1392 × 0.30 ≈ 418 effective power units

ratio = 3341 / 418 ≈ 7.99 → decisive VRS counterattack, OSID recaptured
```

This is the historical pattern: VRS rapid response within 24-48 hours of any ARBiH penetration, supported by overwhelming artillery, usually succeeded in 1992-1994.

---

## §5 — Sector Defense Integration

### 5.1 Home-Ground Brigades as Sector Anchors

Within the corps front sector system (`corps_front_sectors.ts`), home-ground brigades anchor the defensive line. Because their effective defensive power is ~1.25× a comparable non-local brigade, they disproportionately reduce the sector's `threat_ratio`:

```
threat_ratio = sector_enemy_pressure / sector_defensive_power
```

A sector with one home-ground brigade in `defend` posture may have `threat_ratio` reduced from 1.3 to 0.9, shifting it from "threatened" to "stable" — which in turn affects bot targeting decisions, reserve allocation, and player alert thresholds.

### 5.2 Sector Density and Home-Ground Weight

The bot AI computing `BRIGADE_OPERATIONAL_FRONTAGE_CAP` per sector treats home-ground brigades as covering 1.5× the frontage of non-locals (they know every approach, every fold in the terrain). This means a home-ground brigade can be assigned a wider sector sub-segment before the density modifier kicks in. This is not a UI-visible field — it's a tacit weight in `computeSectorDensity()`.

Practically: home-ground brigades can be "stretched" across more OSIDs in their home municipality before suffering the thin-front penalty (0.6× defense reduction), because their local knowledge compensates.

### 5.3 Bot Targeting: Avoiding Home-Ground Sectors

When the corps AI (`bot_corps_ai.ts`) evaluates attack targets via `evaluateOperationProgress()` and `selectCorpsOffensiveTargets()`, it must apply an elevated `min_attack_outcome` threshold when the target sector contains home-ground brigades:

| Sector contains home-ground brigade? | Normal min_attack_outcome | Adjusted threshold |
|-------------------------------------|--------------------------|-------------------|
| No | `costly_victory` | unchanged |
| Yes (brigade not in path of attack) | `costly_victory` | `victory` |
| Yes (brigade directly in path) | `costly_victory` | `decisive` |

This reflects the AI recognizing that attacking prepared home defenders is extremely expensive. The bot should route operations around home-ground sectors when possible, targeting the gaps between them instead.

### 5.4 Reserve Allocation and Home-Ground Sectors

The `redistributeExcessReserves()` function (`corps_front_sectors.ts`) applies a HOME_GROUND_RESERVE_FACTOR to sectors that contain home-ground brigades: these sectors receive fewer reserves from the corps pool (they're already heavily fortified). Released reserves are redistributed to weaker non-home sectors, improving overall corps balance.

---

## §6 — Sector Operations Integration

### 6.1 Offensive Operations Against Home-Ground Positions

Sector operations (`sector_offensive.ts`) targeting OSIDs held by home-ground brigades face escalating difficulty:

**Momentum drain:** Each turn of operation against a home-ground sector drains momentum at 1.5× the normal rate. The attacker is grinding against prepared, motivated defenders. Operations that would sustain 3-turn execution against normal brigades may collapse in 2 turns against home-ground positions.

**Minimum momentum to continue:** Normal threshold is 0 (any positive momentum allows continuation). Against home-ground sectors: minimum momentum to continue is 1 (operation aborts at momentum=1 rather than momentum=0). The cost of pressing the attack is higher.

**Supply readiness gate:** Normal SUPPLY_READINESS_LAUNCH threshold is 0.6. Attacking home-ground sectors raises this to 0.75 — the attacker needs better supply because the operation will last longer and consume more.

### 6.2 Corps Counterattack Reserve

Each corps may designate one brigade as **counterattack reserve** in its `corps_command` record:

```
corps_command[corpsId].counterattack_reserve_id?: FormationId
```

This brigade is held out of normal sector assignments (not counted toward sector density). Its role is rapid response.

**Trigger:** When any OSID within the corps's sector falls to the enemy, the reserve brigade automatically receives:
1. `counterattack` posture order
2. A targeted attack order on the captured OSID
3. If the reserve brigade is a home-ground brigade relative to the captured OSID: both home ground multipliers apply

**Elite units as reserves:** The Guards Brigade (RBiH), 65th Protection Regiment (RS), and 1st Guard ABB (HVO) are the canonical counterattack reserves — they match the `elite_loan` system. When designated as corps reserve, they function as the pool from which the elite loan mechanic draws.

**VRS rapid response pattern:** VRS should routinely designate its best brigade as counterattack reserve while in offensive and balanced doctrine phases. The bot AI (`bot_corps_ai.ts`) should preferentially select the highest-quality non-disrupted brigade for this role.

### 6.3 Counterattack Window and Operation Timing

The 2-turn counterattack opportunity window creates urgent timing around sector operation phase transitions:

```
Turn N:    ARBiH operation captures OSID. VRS OSID lost.
Turn N+1:  VRS counterattack reserve attacks (window open, no entrenchment on enemy). Max bonus.
Turn N+2:  Window still open. Enemy begins to entrench. Still significant bonus.
Turn N+3:  Window closed. Enemy entrenched 1 turn. Normal attack conditions.
Turn N+4+: Each turn of delay adds entrenchment to the enemy. Cost escalates.
```

This timing creates pressure on both sides: the attacker wants to hold long enough for the window to expire; the defender wants to counterattack before the enemy digs in. It is the single clearest expression of the sector operation / posture interaction.

### 6.4 Sector Operations on Home-Ground Brigades: `assault` Restriction

The bot AI will never assign `assault` posture as part of a sector operation directive targeting a sector with home-ground brigades as primary defenders. The expected losses make it operationally reckless (see Example A calculation in §4.3 — even a decisive operation would leave the attacking corps crippled).

Player can override and order `assault` against home-ground positions, but the UI should surface the predicted outcome clearly (high probability of catastrophic attacker losses).

---

## §7 — Corps Stance ↔ Posture Interaction Matrix

### 7.1 What Corps Stance Does to Home-Ground Brigades

Home-ground brigades resist corps stance influence in the attack direction. A corps in `offensive` stance cannot order its home-ground brigades into `attack` or `assault` — the geographic reality overrides the strategic directive. However, corps stance still affects:
- Combat power multipliers (CORPS_STANCE_ATTACK / CORPS_STANCE_DEFENSE)
- Bot behavior for non-home brigades in the same corps
- Whether a corps can designate a home brigade as counterattack reserve (any stance)

| Corps Stance | Effect on home-ground brigade |
|-------------|------------------------------|
| `defensive` | Forces all non-home postures toward `defend`/`hold` (already the natural state) |
| `balanced` | No constraint beyond home-ground rules |
| `offensive` | Allows `counterattack` orders; still blocks `attack`/`assault` |
| `reorganize` | Auto-sets `hold` for all brigades including home-ground; cohesion recovery prioritised |

### 7.2 Posture Orders vs Corps Directive

When the corps AI generates a `CorpsDirective` with `offensive_targets`, brigades flagged as home-ground in that sector simply receive `defend` instead of `attack` in their posture orders, and the attack target is passed to a different (non-home) brigade. The home brigade holds the line while the attacker strikes.

This creates a natural combined-arms logic: home-ground brigades anchor the defensive line while non-local brigades handle offensive operations. The player observes this emerging without being told to do it.

---

## §8 — Supply System Integration

### 8.1 Supply State and Posture Floor

The existing supply gating in `bot_brigade_ai_osid.ts` (critical supply → forced defend; strained → no pioneer attacks) interacts with home-ground status:

| Supply State | Normal Brigade | Home-Ground Brigade |
|-------------|---------------|-------------------|
| Adequate | Full posture choice | Full posture choice |
| Strained | `attack` blocked for bot; `victory`+ required | Same, plus counterattack allowed (desperation overrides logistics) |
| Critical | Forced `defend` | Maintains `defend` (same result, different motivation) |

Home-ground counterattacks under strained supply are still permitted: a brigade defending home ground will attempt to reclaim it regardless of ammunition state. The mechanical result is lower attack power (supply mult reduces bombardment) but the attempt is not blocked. Historically, ARBiH's Bihać brigades counterattacked under chronic supply shortage throughout 1994-95.

### 8.2 Heavy Munitions and Counterattack

The VRS rapid response pattern depends critically on `heavy_munitions_reserve`. The bombardment casualty multiplier (`getBombardmentCasualtyMult()`) applies to counterattacks just as to initial assaults. As VRS heavy munitions decline post-1993:

```
Week 10 (adequate munitions): bombardment mult = 1.8× → counterattack total ≈ decisive
Week 30 (strained munitions): bombardment mult = 1.35× → counterattack still likely succeeds
Week 45 (critical munitions): bombardment mult = 0.9× → counterattack may stalemate
```

This is the engine's expression of VRS decline: not a scripted event, but the consequence of depleted heavy munitions reducing the effectiveness of their signature counterattack doctrine.

### 8.3 Enclave Supply and Home Defense

Enclave brigades on home ground face the combined pressure of:
- Isolated supply source (strained penalty from `findHeartlandComponent()`)
- High cohesion drain from sustained `defend`/`defend_at_all_costs`
- But: home ground morale floor (15) keeps them fighting despite supply collapse

This models the historical enclave survival: starving, under-supplied, but still fighting because there was nowhere else to go and the morale floor held.

---

## §9 — Enclave & Resilience Integration

### 9.1 Enclave Brigades as Home-Ground Units

All five defined enclaves contain brigades that are almost universally home-ground:
- **Bihać pocket**: 5th Corps brigades from Bihać, Cazin, Velika Kladuša, Bosanska Krupa
- **Srebrenica**: 28th Division brigades from Srebrenica municipalities
- **Žepa**: Local brigades from Rogatica municipalities
- **Goražde**: 81st Division brigades from Goražde
- **Sarajevo**: 1st Corps brigades from the city's own neighbourhoods

For these units, `home_defense_active === true` is essentially permanent (they cannot be redeployed outside the enclave anyway). The combination of home ground + enclave resilience produces the game's highest defensive states.

### 9.2 Stacking: Full Defensive Stack for Enclave Home-Ground Brigade

At `isolation_turns = 20`, `hardening_active = true`, `resilience = 25` (near max), on home ground, in `defend` posture:

```
defenderPower =
    base
    × 1.40  (defend posture)
    × 1.20  (defensive corps stance — enclave corps typically defensive)
    × 1.25  (home ground)
    × 1.09  (ethnic defense, enclave = almost 100% co-ethnic)
    × terrain modifiers
    × 1.50  (entrenchment — enclave brigades are permanently dug in)
    × 1.30  (resilience streak — enclave defenders have been holding for months)
    × 1.125 (enclave resilience: 25 × 0.005 = 0.125 bonus)
    × 1.05  (hardening: active)
    × 0.75  (supply strained — isolated enclave)
    × officerQuality + 0.10 (home ground OQ bonus)
    × 1.0   (not disrupted)
```

The supply penalty (0.75×) is offset by the extraordinary resilience bonuses. The net result is a defender roughly 4-5× stronger than an equivalently-sized brigade in open territory. This is why Goražde held against the VRS 1994 assault. The attacking Drina Corps had overwhelming force on paper; the enclave home defenders compounded every multiplier.

### 9.3 `defend_at_all_costs` Auto-Application for Enclaves

When `enclave_resilience[enclaveId].isolation_turns > HARDENING_THRESHOLD` (8 turns), the pipeline auto-assigns `defend_at_all_costs` to all brigades within that enclave, regardless of player orders. The isolation has become existential; the computer knows it; the troops know it. The player can observe this in the formation panel but cannot override it.

This is the enclave equivalent of the home-ground posture auto-minimum: the engine enforcing historical reality.

---

## §10 — Cohesion & Morale Integration

### 10.1 Cohesion Sustainability by Faction-Phase

Home ground cohesion bonus (+0.5/turn) changes the operational calculus significantly:

**VRS Drina Corps, week 5 (offensive phase):**
- Non-home attackers in `attack` posture: cohesion drains at −3/turn; need 5-turn rest cycles
- Home defenders in `defend` on their own Drina valley towns: drain at −0.5/turn; can sustain for 20+ weeks without rest

**ARBiH 5th Corps, week 30 (late defensive phase):**
- Bihać brigades on home ground: `defend` at −0.5/turn; `counterattack` at −1.0/turn
- They can run elastic_defense→counterattack cycles repeatedly without major cohesion attrition
- This is Dudaković's strategy: the 5th Corps was always at home, always recovering, always ready to spring

### 10.2 Post-Battle Morale Modifiers (Home Ground)

Standard post-battle morale modifiers (+5 attacker win, −5 attacker loss, +3 defender hold, −8 defender loss) apply normally to home-ground brigades, but the floor of 15 prevents them from dropping below combat effectiveness:

| Event | Normal brigade | Home-ground brigade |
|-------|---------------|-------------------|
| Holds attack (+3) | Morale +3 | Morale +3, floors at faction standard |
| Loses battle (−8) | Morale −8, may drop to retreat threshold | Morale −8, floors at 15 — still fights |
| Decisive loss (−8 −extra) | Brigade may collapse | Morale floors at 15; see §3.3 retreat cascade |

The morale floor means home-ground brigades almost never break from sustained pressure alone. They are broken by destroying them, not by demoralising them.

### 10.3 Ordered Elastic Defense: The Morale Cost

When the player explicitly orders `elastic_defense` on a home-ground brigade (§3.6), the −20 morale penalty is significant in the context of the floor of 15:

- Brigade at morale 60: drops to 40. Still above any retreat threshold. Usable but weakened.
- Brigade at morale 35: drops to 15. AT the floor. Will fight but barely.
- Brigade at morale 20: drops to 15 (floored). No additional degradation.

The player is making a calculated trade: short-term morale pain for tactical flexibility. If the counterattack window is used successfully (OSID recaptured), the brigade recovers morale from the "held home territory" chain of successes. If the window is missed, the morale cost is permanent until natural drift recovers it.

---

## §11 — Equipment & Heavy Weapons Integration

### 11.1 Terrain Familiarity and Equipment Ratio

Home-ground brigades benefit from a 0.10 floor on the officer quality calculation, but they do NOT get a direct equipment ratio bonus. Equipment is equipment — a home brigade with 40% functional weapons has 40% functional weapons regardless of where it is.

However, local terrain knowledge partially substitutes for equipment in defensive contexts: the home-ground brigade places its few weapons in pre-surveyed positions with maximum field of fire. This is modelled through the +0.10 OQ bonus rather than a direct equipment multiplier — it is a command and intelligence advantage, not an equipment advantage.

### 11.2 VRS Artillery and the Home-Ground Asymmetry

The bombardment casualty multiplier (`getBombardmentCasualtyMult()`) applies equally to home-ground defenders — being shelled in your own town is still devastating. VRS artillery advantage (400+ pieces vs ARBiH 50) produces the war's signature paradox: ARBiH home defenders were extraordinarily hard to dislodge by ground assault but were ground down by systematic artillery bombardment. The engine reproduces this:

- Home-ground defense multiplier (×1.25) helps against infantry assault
- Bombardment casualty multiplier from superior VRS artillery (up to ×1.8) inflicts personnel losses even on successful defenses
- Net: ARBiH enclave brigades shrink in personnel (frontline attrition + bombardment casualties) while maintaining extremely high defensive power per remaining soldier

This is the Srebrenica model: the 28th Division's brigades were well below their nominal strength by 1995 but remained dangerous defenders of every meter they held.

---

## §12 — Officer Quality Integration

### 12.1 Officer Quality Temporal Profiles (Existing)

As recorded in combat mechanics:
- VRS: 1.10× peak (JNA inheritance) → decays 0.002/week after week 20 → floor 0.95
- ARBiH: 0.85 → grows 0.003/week → cap 1.05
- HVO: constant 0.97

### 12.2 Home Ground OQ Bonus in Context

The +0.10 home ground OQ bonus interacts with faction trajectories:

**Early war ARBiH (week 0–10):** Officer quality 0.85 + 0.10 = 0.95 effective (defensive only). Home-ground brigades are substantially more capable than their formal officer quality suggests — matching their historical performance.

**Late war ARBiH (week 45+):** Officer quality 1.04 + 0.10 = 1.14 effective (capped at 1.05 after cap). By late war, ARBiH has outgrown the home-ground bonus for officer quality; their formal training has caught up with their terrain familiarity. The bonus is now redundant but harmless.

**VRS mid-war (week 25+):** Officer quality ~1.05 (decaying) + 0.10 = 1.15 effective for home defenders. VRS brigades defending their own Drina and Krajina towns retain more effective fighting power than their degrading formal officer quality implies — experienced veterans in known terrain.

### 12.3 `defend_at_all_costs` and Officer Quality

A brigade in `defend_at_all_costs` on home ground receives the full OQ bonus. The "fight and die" posture requires no tactical sophistication — you hold the position, you do not manoeuvre, you die in place if you must. Terrain familiarity is everything; formal officer quality matters less. This is historically accurate: the enclave defenders of Goražde included many undertrained men who nonetheless held positions expertly because they had been studying those specific ridgelines for three years.

---

## §13 — Bot AI Behaviour

### 13.1 Brigade Posture Assignment: 5-State Decision Tree

The bot in `bot_brigade_ai_osid.ts` currently uses a binary (attack/defend). This expands to a 5-state tree:

```
IF home_defense_active:
    IF adjacent home OSID just lost → assign counterattack
    ELSE IF sector threat_ratio > 1.5 → assign defend
    ELSE → assign defend (home brigades always defend, never hold at minimum)
    → EXIT (home brigades never get attack/assault paths; dig_in is preferred on stable sectors)

IF supply_state === critical:
    → assign hold or defend (supply gate unchanged)

IF corps_stance === reorganize:
    → assign hold

IF has viable attack target (predicted outcome >= costly_victory):
    IF corps_stance === offensive AND cohesion >= 60 AND sector momentum >= 2:
        → assign assault
    ELSE:
        → assign attack

IF in elastic_defense AND just retreated:
    → auto-transition to counterattack (within municipality if home ground)

IF sector threat_ratio > 1.5 AND corps_stance === defensive:
    → assign defend

IF sector threat_ratio > 2.0:
    → assign defend_at_all_costs (extreme threat, bot-assigned DAAC)

IF sector stable (no incoming attack in ≥ 3 turns) AND corps_stance === defensive AND cohesion >= 20 AND not counterattack_reserve:
    → assign dig_in (CHANGE: replaces probe as the "quiet sector" posture)

ELSE:
    → assign hold (CHANGE: was defend; now hold is the true resting state)
```

### 13.2 Corps Counterattack Reserve Management

`bot_corps_ai.ts` selects the counterattack reserve each time a new sector operation begins or when the previous reserve is committed:

**Selection criteria (priority order):**
1. Undisrupted elite brigade (Guards/65th/1st Guard) if available and cohesion ≥ 40
2. Highest cohesion active brigade in the corps not currently assigned to a hot sector
3. If no eligible brigade: no reserve designated (corps operates without rapid response)

**VRS-specific:** During the offensive phase (weeks 0–20), VRS corps should always maintain a designated reserve. The Guards Brigade / 65th Protection are loaned to this role. After week 20 (balanced/defensive), the reserve is maintained but may be unavailable if all high-cohesion brigades are committed.

### 13.3 Faction-Specific Posture Profiles

**VRS (Vojska Republike Srpske):**
- Weeks 0–20: Mixed attack/assault for operational brigades; home-ground brigades (Bijeljina, Zvornik, Foča areas) always in defend
- Weeks 20–40: Transition to hold/defend for most brigades; stable-sector brigades begin dig_in fortification (VRS digs in heavily during consolidation phase); counterattack reserves maintained
- Weeks 40+: dig_in on all stable sectors; defend on threatened sectors; home-ground brigades in defend_at_all_costs when ARBiH pressure rises; the VRS "thin line" is deep in prepared works
- Elite reserve: 65th Protection Regiment maintains counterattack designation throughout; not eligible for dig_in while on reserve

**ARBiH (Army of Republic of BiH):**
- Weeks 0–20: Survival defensive; home-ground brigades (Sarajevo, Tuzla area, enclaves) in defend; non-locals in hold
- Weeks 20–40: Increasing attack activity from front corps; rear-sector brigades dig_in; home-ground brigades still primarily defend but corps begins assigning counterattack ops
- Weeks 40+: ARBiH gains full offensive capability; home-ground brigades begin limited attack from non-home OSIDs; enclave brigades remain in defend/dig_in/DAAC cycling
- 5th Corps (Bihać): elastic_defense → counterattack cycling as primary tactical pattern throughout

**HVO (Hrvatska Vijeće Obrane):**
- Herzegovina heartland (Mostar, Livno, Tomislavgrad): permanent defend, home-ground brigades, extremely high defensive power; bot never attacks from here without Croatian pipeline
- Kiseljak/Vitez pocket: Viteška Brigade and similar in defend/defend_at_all_costs; elastic-counterattack for outer positions
- Limited attack operations only when `hv_coordination_enabled = true` and Croatian pipeline adequate

---

## §14 — Player Controls & UI

### 14.1 Player Posture Order Surface

| Order | Available to player | Home-ground restriction |
|-------|--------------------|-----------------------|
| `hold` | Yes (any brigade on front) | Auto-upgraded to `defend` for home-ground brigades |
| `defend` | Yes | Fully available |
| `defend_at_all_costs` | Yes | Fully available; applied automatically in extremis |
| `elastic_defense` | Yes | Available with −20 morale warning (§3.6) |
| `counterattack` | Yes, with target OSID | Available; home-ground bonus applies if targeting own municipality |
| `dig_in` | Yes | **PREFERRED** for home-ground brigades; full lockout constraints apply |
| `attack` | Yes, with target OSID | **BLOCKED** for home-ground brigades |
| `assault` | Yes, requires coh ≥60 + corps offensive | **BLOCKED** for home-ground brigades |

### 14.2 Player Move Orders and Home-Ground Brigades

A player CAN issue a move order to a home-ground brigade, but:
- The order triggers a confirmation dialog: *"This brigade is defending its home municipality. Moving it away will permanently remove the home defense bonus until it returns."*
- If confirmed: brigade moves; `home_defense_active = false` while deployed outside home territory
- Morale penalty: −20 immediately (ordered away from home)
- The brigade functions as a normal non-local brigade at the destination
- If the player later moves it back to its home municipality: `home_defense_active` resumes

This models the realistic trade-off: you gain flexibility by redeploying local defenders, but you lose a powerful defensive anchor and the troops resent it.

### 14.3 UI Indicators

**Formation counter stripe (posture, already implemented):**

| Posture | Stripe Color |
|---------|-------------|
| `hold` | `rgba(140, 140, 140, 0.95)` — gray |
| `defend` | `rgba(40, 120, 210, 0.95)` — blue |
| `defend_at_all_costs` | `rgba(255, 255, 255, 0.95)` — white (intense) |
| `elastic_defense` | `rgba(25, 175, 150, 0.95)` — teal |
| `counterattack` | `rgba(240, 130, 20, 0.95)` — orange |
| `dig_in` | `rgba(139, 101, 42, 0.95)` — earth brown |
| `attack` | `rgba(205, 45, 45, 0.95)` — red |
| `assault` | `rgba(130, 0, 0, 0.95)` — dark maroon |

**Home-ground counter indicator (new):**
Brigades with `home_defense_active = true` display a thin white inner border on the formation counter — visually a "double border" effect. The player can immediately see which brigades are on home ground across the map.

**FormationDetail panel:**
- Posture display (already shown)
- Home ground badge: "HOME GROUND" label when active
- If `home_defense_active`: show the effective defense multiplier (calculated) so the player understands the value of leaving this brigade in place
- If a blocked posture order is attempted: red inline error message explaining why

### 14.4 Player Strategic Layer

The posture + home-ground system gives the player meaningful strategic choices across several axes:

**Axis 1: Redeploy or anchor?**
Do you send the Viteška Brigade to reinforce a threatened corps flank, or keep it in Vitez where it's a 1.75× defender? The answer changes depending on how threatened each front is, but the trade-off is always visible.

**Axis 2: Hold or burn?**
`defend_at_all_costs` turns any brigade into an extraordinary defender for ~10 turns before it burns out. Timing this to coincide with expected enemy operations is a skill. Burning it too early or leaving it in DAAC when no attack comes wastes cohesion.

**Axis 3: Yield or fight?**
`elastic_defense` voluntarily gives up ground to preserve forces, but only if you execute the counterattack within 2 turns do you reclaim the territory. Waiting too long and the enemy entrenches — now you need `attack` posture against a prepared defender to get it back.

**Axis 4: Hold or fortify?**
`dig_in` posture sacrifices 3 turns of operational flexibility for a permanent defensive upgrade: 1.60× defense and entrenchment cap 9 instead of 6. A stable sector that you `dig_in` becomes dramatically harder to take — but those brigades cannot respond to emergencies elsewhere while digging. Timing the fortification window during enemy operational pauses is a skill; committing to `dig_in` on a sector that turns hot means watching a brigade sit there while the enemy concentrates against them, unable to support neighbors.

---

## §15 — Faction Doctrinal Profiles

### 15.1 VRS: Professional Advantage → Attrition Decline

**Home ground distribution:** RS brigades are home-ground across the Drina valley (Foča, Goražde approaches, Zvornik, Bijeljina), Krajina (Banja Luka approaches, Prijedor), and Pale/Sarajevo ring (Ilidža, Vogošća brigades).

**Early war (weeks 0–20):** VRS leads with `assault`-level operations using elite brigades and artillery. Corridor seizure (Posavina, Brčko), Sarajevo encirclement, Drina sweeps. Home-ground brigades anchor the rear while attack brigades push the front.

**Mid war (weeks 20–40):** VRS transitions to hold/defend. Corps operations become `attack` rather than `assault`. Home-ground brigades in the Drina towns begin seeing ARBiH counterattacks. The VRS rapid response pattern is at its height — heavy munitions adequate, Guards Brigade available.

**Late war (weeks 40+):** VRS is essentially in `defend` across all fronts. Home-ground brigades matter most now because the VRS has insufficient non-local strength to reinforce all sectors. The home-ground advantage is literally all that holds many positions as officer quality decays and heavy munitions strain.

### 15.2 ARBiH: Survival → Professionalization → Counteroffensive

**Home ground distribution:** Sarajevo (1st Corps brigades), Tuzla area (2nd Corps), Zenica (3rd Corps), Bihać/5th Corps (entire pocket), and enclave brigades (Srebrenica, Goražde, Žepa, Sarajevo).

**Early war:** ARBiH brigades are overwhelmingly in `hold`/`defend` everywhere. Home-ground brigades in Sarajevo and enclaves already performing at their best because the home-ground multiplier compensates for poor officer quality and equipment shortage. Non-local brigades are very weak.

**Mid war:** Growing officer quality and supply enable `attack` operations from 2nd and 3rd Corps. Rear-sector brigades begin `dig_in` fortification, freeing front-sector units to be assigned attack directives. 5th Corps (Bihać, entirely home-ground) runs elastic-counterattack cycles with `dig_in` between attacks to rebuild entrenchment cap. Srebrenica and Goražde brigades are under maximum pressure — `defend_at_all_costs` active, enclave resilience building.

**Late war:** ARBiH capable of `attack` operations from consolidated fronts. Home-ground brigades in Sarajevo can now support offensive operations from adjacent OSIDs (non-home brigades handle the assault; home brigades anchor the hold). The combination of high officer quality + home-ground + enclave resilience makes ARBiH's enclave defenders nearly invincible in defensive terms — the tragedy of Srebrenica was that the UN disarmed them in 1993.

### 15.3 HVO: Regional Strength, Thin Manpower

**Home ground distribution:** Herzegovina (Mostar, Livno, Tomislavgrad, Čapljina brigades), Central Bosnia pocket (Viteška/Kiseljak/Busovača), Posavina/Orašje.

**Herzegovina heartland:** HVO brigades defending their home municipalities in Herzegovina are among the war's most effective defenders. Croatian pipeline (external supply), home-ground multiplier, and terrain bonuses combine. These brigades essentially never face serious threat and anchor the entire HVO strategic position.

**Central Bosnia pocket:** Surrounded, isolated, extremely high home-ground motivation. `defend_at_all_costs` applies throughout most of 1993-94. Counterattack within municipality is the only available offensive option. When the Washington Agreement ends the RBiH-HVO war, these brigades can finally exhale and transition to `hold`.

**Orašje pocket:** The `fallback_osid` mechanic combined with home-ground status makes these brigades nearly impossible to destroy — they fall back within the pocket, counterattack, and hold. The pocket holds for the entire war.

**HVO vulnerability:** Thin manpower means each destroyed home-ground brigade is permanent — there are no reserves to raise a replacement from the militia pool in that municipality. Losing a home-ground HVO brigade to a last-stand destruction (§3.3 Step 3) is catastrophic and irreversible.

---

## §16 — Implementation Delta

### New Types / Fields

**`game_state.ts`:**
```typescript
export type BrigadePosture =
  'hold' | 'defend' | 'defend_at_all_costs' | 'elastic_defense' |
  'counterattack' | 'dig_in' | 'attack' | 'assault';
// Remove: 'consolidation', 'probe'

// On FormationState:
home_defense_active?: boolean;
counterattack_window_turns?: number;  // countdown from 2 after retreat
dig_in_progress?: number;             // [0.0, 1.0]; full effect at >= 0.75; resets on displacement/move
```

**`types.ts` (UI):**
```typescript
// FormationView addition:
home_defense_active?: boolean;
// posture: string already present — values expand to 8
```

### Modified Constants

**`combat_math.ts`:**
```typescript
POSTURE_ATTACK = { hold:0, defend:0, defend_at_all_costs:0, elastic_defense:0,
  counterattack:0.65, dig_in:0, attack:1.00, assault:1.20 }
POSTURE_DEFENSE = { hold:1.20, defend:1.40, defend_at_all_costs:1.60, elastic_defense:1.10,
  counterattack:1.15, dig_in: /* computed from dig_in_progress, see §2.7 */, attack:0.80, assault:0.60 }
HOME_GROUND_DEFENSE_MULT = 1.25
HOME_GROUND_COUNTERATTACK_MULT = 1.15
HOME_GROUND_OQ_BONUS = 0.10
HOME_GROUND_MORALE_FLOOR = 15
HOME_GROUND_COHESION_BONUS = 0.5
// Remove: POSTURE_ATTACK['consolidation'], POSTURE_DEFENSE['consolidation']
// Remove: POSTURE_ATTACK['probe'], POSTURE_DEFENSE['probe']
```

**`brigade_posture.ts`:**
```typescript
POSTURE_COHESION_COST = { hold:1.0, defend:-1.0, defend_at_all_costs:-4.0,
  elastic_defense:-0.5, counterattack:-1.5, dig_in:0.5, attack:-3.0, assault:-5.0 }
POSTURE_MIN_COHESION = { hold:0, defend:0, defend_at_all_costs:10,
  elastic_defense:0, counterattack:10, dig_in:0, attack:25, assault:60 }
DIG_IN_PROGRESS_PER_TURN = 0.25
DIG_IN_FULL_EFFECT_THRESHOLD = 0.75
DIG_IN_ENTRENCHMENT_CAP = 9
DIG_IN_ENTRENCHMENT_RATE_MULT = 3.0
DIG_IN_BASE_DEF = 1.35
DIG_IN_FULL_DEF = 1.60
DEFEND_COHESION_CAP = 85  // unchanged
ASSAULT_CORPS_GATE = 'offensive'  // new: assault requires corps offensive stance
```

### Pipeline Changes

**`war_phases.ts`:** Add `compute-home-defense-active` step before all combat steps:
```
'compute-home-defense-active' → sets formation.home_defense_active per municipality match
'update-counterattack-windows' → decrements counterattack_window_turns each turn
```

### Files to Modify

| File | Change Summary |
|------|---------------|
| `game_state.ts` | Expand BrigadePosture type (remove 'probe', 'consolidation'; add 'dig_in'); add home_defense_active, counterattack_window_turns, dig_in_progress to FormationState |
| `combat_math.ts` | Update all posture multiplier tables; add home ground constants; add dig_in defense ramp function |
| `brigade_posture.ts` | Update cohesion costs, min cohesion table; add dig_in constants; add home ground cohesion bonus; update canAdoptPosture() — remove probe block, add dig_in preference; auto-upgrade hold→defend for home ground |
| `attack_resolution_osid.ts` | Add within-municipality fallback; destruction-in-place logic; DAAC last-stand casualty modifier; dig_in progress reset on displacement |
| `brigade_pressure.ts` | Update POSTURE_PRESSURE_MULT and POSTURE_DEFENSE_MULT for 8 postures (remove probe, add dig_in) |
| `equipment_effects.ts` | Update equipment tempo (dig_in 0.80×; remove probe 1.20×) |
| `frontline_attrition.ts` | dig_in brigades: attrition reduction — they are better protected in prepared positions (dig_in_progress × 0.20 attrition reduction at full dig) |
| `bot_brigade_ai_osid.ts` | 5-state posture assignment; home-ground gate; elastic→counterattack auto-transition; dig_in assignment for stable-sector quiet brigades |
| `bot_corps_ai.ts` | Counterattack reserve designation; elevated min_attack_outcome for home-ground sectors; exclude dig_in brigades from reserve designation |
| `war_phases.ts` | Add compute-home-defense-active step; add update-counterattack-windows step; add update-dig-in-progress step |
| `formation_spawn.ts` | Pre-loaded entrenchment for home brigades in mid-war scenarios |
| `morale_drift.ts` | Home ground morale floor (15) override |
| `consolidation_flips.ts` | Remove posture === 'consolidation' and 'probe' checks (or make no-op) |
| `GameStateAdapter.ts` | Extract home_defense_active, dig_in_progress to FormationView |
| `formationIcons.ts` | Update stripe colors for 8 postures (dig_in: earth brown; remove probe amber); add double-border indicator for home ground |
| `brigade_posture.test.ts` | Update for 8 postures; add home-ground mechanic tests; add dig_in construction ramp tests |

### Tests Required

- Home ground detection: municipality prefix matching edge cases
- Retreat cascade: Step 1 (within-mun), Step 2 (cross-mun), Step 3 (destruction)
- DAAC casualty multipliers: +40% and +60% stacking
- Counterattack window: 2-turn countdown, bonus application, expiry
- Posture blocks: attack/assault rejected for home-ground brigades
- Hold auto-upgrade to defend for home-ground brigades
- Elastic defense override: morale penalty, auto-counterattack transition
- Corps counterattack reserve: designation, trigger on OSID loss, target assignment
- 8-posture cohesion costs: all values verified
- Assault gate: cohesion <60 blocked, corps stance non-offensive blocked
- `dig_in` construction ramp: defense at turn 1 (1.433×), turn 2 (1.517×), turn 3+ (1.60×)
- `dig_in` entrenchment rate: 3× normal, cap 9
- `dig_in` progress reset: displacement, movement order, posture change each reset to 0
- `dig_in` lockout: brigade cannot be issued move or assigned to reserve or operation
- `dig_in` cohesion: +0.5/turn; +1.0/turn on home ground
- Save file migration: 'probe' and 'consolidation' postures treated as 'hold' on load

---

## §17 — Calibration Targets

With the posture system expanded and home-ground defence activated, the 40-week scenario should produce:

**Territorial:** No regression from current 89.7% area-weighted OSID match. The posture changes affect *how* territory is held, not *whether* — the bot's same strategic objectives apply.

**Bihać pocket:** 5th Corps should maintain the pocket throughout via elastic-counterattack cycling. Any sim run where Bihać falls before week 40 is a calibration failure.

**Srebrenica/Goražde:** Should hold throughout the 40-week period. Enclave brigades in DAAC + home ground + enclave resilience should be essentially uncapturable at the scale of a 40-week sim.

**Sarajevo ring:** RS brigades defending Pale, Ilidža, Vogošća should hold these with high probability. ARBiH brigades in the city center should hold equally strongly. The siege is mutual and static — this should emerge from the posture mechanics, not be scripted.

**VRS counterattack effectiveness:** In weeks 0–20, every ARBiH penetration should be reversed within 2 turns with high probability (VRS rapid response at peak munitions). In weeks 30+, VRS counterattacks should succeed ~60% of the time (strained munitions). By week 40, ARBiH should be able to hold captured OSIDs long enough to entrench.

**Cohesion profiles:** At week 40, no faction's brigades should be uniformly above 70 cohesion — the attack-rest cycles should have produced a realistic mix of worn and recovered units. Enclave brigades should be below 50 cohesion (sustained isolation drain) but still combat-effective due to home ground.

---

*End of Specification. Proceed to implementation planning with Product Manager.*
