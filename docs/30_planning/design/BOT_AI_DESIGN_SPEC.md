# Bot AI Design Specification — Three Faction AIs

**Date:** 2026-02-23
**Status:** Design Draft
**Scope:** Complete rewrite of bot AI for OSID/ZoC-era simulation. Three distinct faction AIs (VRS, ARBiH, HVO) with historically-grounded personalities, formula-aware tactical intelligence, and civilian-aware priorities.
**Depends on:** `20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md`, `20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md`, `bot_strategy.ts`, `bot_corps_ai.ts`
**Replaces:** `generateBotBrigadeOrdersOsid()` (current OSID bot), legacy AoR-based posture/target logic in `generateBotBrigadeOrders()`

---

## 0. Why This Document Exists

The current bot AI was built for the AoR (Area of Responsibility) regime, where brigades owned canonical settlements and decisions were made against 5,822-node settlement graphs. The game has since moved to an OSID (Operational Settlement) model with 753 nodes, ZoC-based movement, and OSID-based attack resolution. The old bot produces **zero attacks** in the new regime because:

1. Its posture logic depends on AoR data (`brigade_aor`) that no longer exists in OSID-space
2. Its target scoring uses settlement-level garrison checks that don't map to OSID combat
3. Its posture is never applied before the OSID attack path reads it

This spec designs three new faction AIs from scratch, operating entirely in OSID space, that understand every formula in the attack resolution system and make historically plausible decisions.

---

## 1. Design Principles

### 1.1 Formula omniscience

The bot has **perfect knowledge of all game formulas.** Unlike a human player who must intuit the combat model, the bot can compute exact power ratios, predict outcomes, and calculate expected casualties before committing to an attack. This is the bot's primary advantage and the foundation of tactical competence.

**What the bot knows:**
- Exact attacker/defender combat power (§2 of Attack Resolution Spec)
- Outcome thresholds: decisive (2.0), victory (1.5), costly (1.0), stalemate (0.7), repulsed (0.5)
- Casualty rates and outcome modifiers (attacker 4% base, defender 2%)
- Entrenchment values for every enemy brigade (turns × 0.065, max 1.78)
- Defense streak values (turns × 0.05, max 1.3)
- Terrain multipliers per OSID
- Overextension penalties (0.85 per excess enemy adjacency beyond 2)
- Disruption state of all visible formations
- ZoC coverage and retreat paths for all factions

### 1.2 Strategic plausibility

Each faction AI must produce behavior that a historian of the Bosnian War would recognize. Not a perfect recreation — the simulation is stochastic enough that exact replication is impossible — but the *character* of each faction's war must emerge from bot decisions:

- VRS should seize territory aggressively early, then shift to defense
- ARBiH should survive early, then probe everywhere, then counterattack selectively
- HVO should consolidate Herzegovina, fight for central Bosnia when politically triggered, then defend

### 1.3 Tactical competence

The bot should never do obviously stupid things:
- Never attack an entrenched defender when the predicted outcome is "repulsed" or worse
- Never advance into a 3+ enemy adjacency salient without corps authorization
- Never leave a corridor OSID undefended
- Always retreat when ZoC-locked and retreat is available (unless ordered to hold)
- Always counterattack a just-captured OSID when the new occupant has entrenchment=0

### 1.4 Civilian-aware defense priority

Bots weigh defense decisions by co-ethnic civilian population at risk. A position with 10,000 co-ethnic civilians behind it is defended more aggressively than an empty stretch of front. This is not an "evacuation" mechanic — civilians move via the existing displacement system. The bot's job is to hold the line so displacement routes remain open.

**Implementation:** Each OSID has a **civilian weight** derived from the population of co-ethnic civilians in that OSID and in OSIDs reachable only through it (chokepoint analysis). Bots add civilian weight to their defensive priority scoring.

### 1.5 Determinism

All bot decisions must be deterministic. Same GameState + same turn → same orders. No Math.random(), no timestamps. All iteration in sorted order via `strictCompare`. All tie-breaking by OSID/formation ID string sort.

---

## 2. Architecture

### 2.1 Layered decision model

```
Layer G: Army HQ Gathering        (deliberative, multi-turn scope — v0.4.7)
Layer 0: Army Standing Orders     (time-phased, per faction — fallback/initial defaults)
Layer 1: Corps AI                 (stance, named operations, OGs)
Layer 2: Brigade AI               (OSID-native posture, attack, movement)
```

Each layer runs in pipeline order. Higher layers constrain lower layers. Corps stance flows down to modulate brigade behavior. Army stance flows down to constrain corps stance.

#### Layer G: Army HQ Gathering (v0.4.7)

Periodic deliberative meetings producing a `CampaignPlan` with multi-turn scope. Runs every 8–14 turns (faction-specific) plus emergency sessions. Outputs:
- **Front priorities** (primary/secondary/economy/contain) — drives corps stance baselines and target selection
- **Doctrine override** — adaptive army stance + aggression, replaces calendar-driven `FACTION_DOCTRINE_PHASES` after first gathering
- **Synchronized operations** — multi-corps launch windows with `waiting_for_sync` preparation state

Layer G sets the strategic context that constrains all lower layers. When no gathering has fired (turn 0 to first gathering), Layer 0 defaults apply.

#### Layer 0: Army Standing Orders

Serves as **fallback/initial defaults** before the first Layer G gathering fires, and as the sole strategic layer for player-controlled factions (which do not use the gathering system). Provides time-phased army stance and doctrine baselines per faction.

### 2.2 OSID-native operation

All Layer 2 decisions operate in OSID space:
- **Posture** decided by OSID adjacency (has enemy neighbor?), formation strength, and corps orders
- **Attack targets** are adjacent enemy OSIDs, scored by formula-predicted outcome
- **Movement** is OSID-to-OSID (one hop per turn for non-ZoC-locked brigades)
- **No dependency on `brigade_aor`, `brigade_municipality_assignment`, or canonical settlement graphs**

### 2.3 Shared vs faction-specific code

| Component | Shared | Faction-specific |
|-----------|--------|-----------------|
| OSID adjacency computation | Yes | No |
| Combat power prediction | Yes | No |
| Outcome prediction (power ratio → outcome) | Yes | No |
| ZoC analysis | Yes | No |
| Civilian weight computation | Yes | No |
| Posture decision | Partially | Thresholds differ per faction |
| Target scoring | No | Fully faction-specific |
| Named operation catalog | No | Per-faction catalog |
| Corps stance rules | Partially | Exception rules per faction |
| Retreat logic | Yes | No |

### 2.4 Pipeline integration

```
Turn Pipeline:
  1. sync-front-segments
  2. ensure-brigade-front-assignment
  3. zoc-computation                    → context.operationalData
  4. zoc-constrained-movement
  5. derive-osid-front-segments
  6. evaluate-army-hq-gathering          → Layer G (v0.4.7: campaign plan)
  7. generate-bot-corps-orders          → Layer 1 (unchanged)
  8. generate-bot-brigade-orders-osid   → Layer 2 (NEW: this spec)
  9. apply-brigade-posture              → applies posture from Layer 2
 10. phase-ii-resolve-attack-orders     → resolves attacks from Layer 2
```

**Key change:** Step 7 now runs the OSID-native brigade AI directly. The legacy `generateBotBrigadeOrders` is no longer called when OSID context is active. Posture, attack, and movement orders are all produced by the new OSID-native code.

---

## 3. Shared Intelligence Layer

### 3.1 Combat outcome predictor

The bot's core tactical tool. Given an attacking brigade and a target OSID, computes:

```typescript
interface CombatPrediction {
  attacker_power: number;
  defender_power: number;
  power_ratio: number;
  predicted_outcome: 'decisive' | 'victory' | 'costly' | 'stalemate' | 'repulsed' | 'catastrophic';
  expected_attacker_casualties: number;
  expected_defender_casualties: number;
  attacker_casualty_percent: number;
  defender_casualty_percent: number;
  net_cohesion_attacker: number;
  net_cohesion_defender: number;
  defender_entrenchment: number;
  defender_terrain_mult: number;
  is_counter_attack_opportunity: boolean;  // defender has entrenchment=0
  overextension_risk: number;              // # enemy adj if we advance
}
```

**Implementation:** Mirrors `attack_resolution_osid.ts` computation but read-only. Runs for every candidate attack order before committing. This is the function that makes the bot "know the formulas better than any player."

### 3.2 OSID strategic graph analysis

Pre-computed once per turn, shared across all faction AIs:

| Analysis | What it computes | Used for |
|----------|-----------------|----------|
| **Chokepoint detection** | OSIDs where losing control disconnects friendly territory | Corridor defense, civilian protection |
| **Supply connectivity** | BFS from faction HQ through friendly OSIDs | Supply state prediction |
| **Salient detection** | Friendly OSIDs with 3+ enemy adjacencies | Overextension avoidance |
| **Encirclement risk** | Friendly brigades with no retreat path through friendly territory | Emergency retreat/defense |
| **Civilian weight** | Co-ethnic population reachable only through each OSID | Defense priority weighting |
| **Front classification** | Each front OSID classified as: quiet / active / threatened / critical | Posture assignment |
| **Weak point detection** | Enemy OSIDs with low garrison, no entrenchment, or disrupted defenders | Attack opportunity scoring |

### 3.3 Front classification algorithm

For each friendly OSID adjacent to at least one enemy OSID:

```
threat_score = sum(enemy_brigade_power for each adjacent enemy OSID with a brigade)
friendly_strength = own_brigade_power if a brigade is present, else 0

if friendly_strength == 0:
    classification = 'undefended'        → highest priority for reserve deployment
elif threat_score / friendly_strength > 2.0:
    classification = 'critical'          → may need reinforcement or retreat
elif threat_score / friendly_strength > 1.0:
    classification = 'threatened'        → defend aggressively
elif threat_score > 0:
    classification = 'active'            → normal front
else:
    classification = 'quiet'             → can thin (economy of force)
```

### 3.4 Civilian weight computation

For each OSID:

```
civilian_weight(osid) = co_ethnic_population(osid)
    + sum(co_ethnic_population(downstream_osid)
          for each downstream_osid reachable ONLY through this osid
          among co-ethnic majority OSIDs)
```

An OSID that is the sole corridor connecting 50,000 co-ethnic civilians to the rest of faction territory gets a weight of 50,000. An interior OSID with alternatives gets only its own population.

This weight is added to the defensive priority score, making bots fight hardest for positions that protect the most civilians.

---

## 4. VRS Bot AI — "Strategic Dominance"

### 4.1 Historical character

The VRS (Vojska Republike Srpske) inherited the bulk of the JNA's heavy equipment — tanks, artillery, air defense, and an organized command structure. In April 1992, VRS was the most powerful military force in Bosnia by a wide margin. Its strategy was to rapidly seize territory to create facts on the ground, then hold that territory through fortification and siege.

**Behavioral signature:** Aggressive early, methodical always, risk-averse once gains are consolidated. The VRS fights like a professional army — it doesn't gamble, it calculates.

### 4.2 War phases

| Phase | Weeks | Army Stance | Character |
|-------|-------|-------------|-----------|
| **Territorial Seizure** | 0–26 | `general_offensive` | Exploit JNA equipment. Attack everywhere, especially Drina Valley, Posavina Corridor, Sarajevo ring. Accept moderate casualties for territorial gain. |
| **Consolidation** | 26–52 | `balanced` | Fortify gains. Dig in on all fronts. Only attack to improve tactical positions or close gaps. Begin manpower conservation. |
| **Strategic Hold** | 52–104 | `general_defensive` | Manpower crisis biting. Pure defense except for local counterattacks. Trade exhaustion for territory only when forced. |
| **Endgame** | 104+ | `general_defensive` | Hold for political settlement. Accept stalemate. Fight only to prevent catastrophic loss. |

> **v0.4.7 note:** After the first Army HQ Gathering fires, the `DoctrineOverride` from Layer G replaces these calendar-driven phase values. The table above serves as initial defaults only. The gathering's adaptive doctrine adjusts army stance and aggression based on current battlefield conditions rather than a fixed weekly schedule.

### 4.3 Corps-level behavior

**1st Krajina Corps (Banja Luka region):**
- Primary mission: Secure Posavina Corridor (existential supply line)
- Secondary: Western Bosnia consolidation
- Never below `balanced` stance when corridor is threatened
- Corridor OSIDs are always maximum priority defense
- Named operations: "Operation Corridor" (weeks 8–16), "Krajina Consolidation" (ongoing)

**Sarajevo-Romanija Corps:**
- Primary mission: Maintain siege of Sarajevo
- Defensive by nature — siege is a defensive posture with offensive pressure
- Attacks are rare, targeted at tightening the ring (Igman, Hrasnica, Stup)
- Named operations: "Sarajevo Tightening" (opportunistic)

**Drina Corps:**
- Primary mission: Drina Valley ethnic cleansing campaign → territorial contiguity with Serbia
- Most aggressive corps in weeks 0–26: Zvornik, Bratunac, Srebrenica, Vlasenica
- Shifts to containment of enclaves after initial sweep
- Named operations: "Drina Sweep" (weeks 0–20), enclave containment (ongoing)

**East Bosnia Corps:**
- Primary mission: Bijeljina-Zvornik corridor, Posavina eastern flank
- Supports Drina Corps and 1st Krajina Corps
- Generally balanced stance

**Herzegovina Corps:**
- Primary mission: Hold southeastern Herzegovina
- Least aggressive VRS corps — mostly holding terrain against HVO
- Always defensive stance unless army orders otherwise

**2nd Krajina Corps:**
- Primary mission: Western Bosnia (Bihac containment, Livno/Glamoc area)
- Anti-5th Corps (ARBiH) focus
- Named operations: "Bihac Containment" (periodic)

### 4.4 Brigade-level decision rules

**Posture assignment (OSID-native):**

```
For each VRS brigade:
  1. If ZoC-locked → retreat or attack ZoC source (standard)
  2. If in corridor OSID (chokepoint civilian weight > threshold) → DEFEND
  3. If corps stance = 'offensive' AND adjacent to enemy:
     a. Predict combat outcome against best adjacent target
     b. If predicted outcome >= 'costly_victory' → ATTACK
     c. If predicted outcome >= 'stalemate' AND target has entrenchment < 4 → PROBE
     d. Else → DEFEND (wait for better opportunity)
  4. If corps stance = 'balanced' AND adjacent to enemy:
     a. If counter-attack opportunity (enemy entrenchment=0) → ATTACK
     b. If predicted outcome >= 'victory' → PROBE
     c. Else → DEFEND
  5. If corps stance = 'defensive' → DEFEND
  6. If not adjacent to enemy → move toward nearest front OSID with 'critical' or 'threatened' classification
```

**Target scoring (VRS-specific):**

```
score(target_osid) =
    base: predicted_outcome_score                    // 0–100 based on predicted outcome
  + corridor_bonus:  +200 if in Posavina corridor    // corridor is existential
  + drina_bonus:     +150 if in Drina Valley (weeks 0–26 only)
  + siege_ring:      +120 if in Sarajevo siege ring
  + undefended:      +100 if no enemy brigade present
  + counter_attack:  +180 if enemy entrenchment == 0  // punish recent captures
  + weak_defender:   +80 if defender cohesion < 30 or personnel < 50%
  + civilian_threat: +civilian_weight(target) / 100   // protect co-ethnic civilians
  - overextension:   -150 if advance would create 3+ enemy adjacency
  - entrenchment:    -30 × defender_entrenchment_turns  // avoid dug-in positions
  - casualty_cost:   -200 if expected_attacker_casualties > 10% of personnel
  - supply_risk:     -100 if target OSID would extend supply beyond 3 hops from HQ
```

**Predicted outcome scoring:**

| Predicted outcome | Score |
|-------------------|-------|
| Decisive victory | 100 |
| Victory | 80 |
| Costly victory | 40 |
| Stalemate | 10 |
| Repulsed | -50 |
| Catastrophic failure | -200 |

**VRS personality modifier:** Multiply all attack scores by `1.3` during weeks 0–26 (JNA aggression window). After week 52, multiply by `0.6` (manpower conservation). VRS bot is risk-averse by default — it won't attack unless the math says it will work.

### 4.5 VRS-specific tactical intelligence

The VRS bot should exploit these formula features:

1. **Equipment advantage early:** VRS equipment_ratio starts ~0.75 vs ARBiH ~0.30. This makes VRS base power 2.5× for equal personnel. The bot should attack aggressively in weeks 0–26 when this advantage is largest.

2. **Entrenchment is the VRS endgame:** After week 26, VRS brigades should dig in. At 12 turns entrenchment (1.78×), even a weaker VRS brigade becomes extremely hard to dislodge. The bot should avoid moving brigades off entrenched positions unless strategically necessary.

3. **Siege warfare:** Against Sarajevo, the VRS bot should never directly assault (urban_mult × sarajevo_siege_mult × entrenchment = essentially impregnable). Instead: maintain pressure, prevent breakout, tighten when opportunities arise. Starve, don't storm.

4. **Corridor defense:** If any Posavina corridor OSID is threatened, all adjacent brigades shift to DEFEND regardless of other orders. Corridor loss is existential — everything east of the break is cut off.

5. **Counter-attack exploitation:** When an enemy captures a VRS OSID, the new occupant has entrenchment=0. The VRS bot should immediately counterattack with the nearest available brigade. This produces the historical back-and-forth dynamic on contested positions.

---

## 5. ARBiH Bot AI — "Survival and Attrition"

### 5.1 Historical character

The ARBiH (Armija Republike Bosne i Hercegovine) started the war as a disorganized collection of territorial defense units and police, facing a professional army with overwhelming firepower. It survived through desperate defense, urban warfare, and sheer numerical weight. By 1994 it had reorganized into a functional corps structure and adopted its signature strategy: constant small attacks across the entire front to prevent VRS concentration — death by a thousand cuts.

**Behavioral signature:** Cautious early, stubborn always, increasingly bold as the war progresses. The ARBiH fights like partisans who gradually become soldiers.

### 5.2 War phases

| Phase | Weeks | Army Stance | Character |
|-------|-------|-------------|-----------|
| **Survival Defense** | 0–12 | `general_defensive` | Don't die. Hold cities, hold enclaves, trade empty territory for survival. No offensive operations. |
| **Active Defense** | 12–40 | `balanced` | Reorganize into corps. Local counterattacks where opportunities arise. Begin probing enemy positions. |
| **Stretch the Front** | 40–80 | `general_offensive` | The signature ARBiH strategy: probe *everywhere*. Not breakthroughs — just constant pressure along the entire front. Force VRS to man every position. Exploit any gap. |
| **Controlled Counteroffensive** | 80+ | `balanced` | Shift from attrition to selective concentration. Corps-level operations against weakened VRS sectors. The late-war offensives. |

### 5.3 Corps-level behavior

**1st Corps (Sarajevo):**
- Primary mission: Hold Sarajevo at all costs
- Always `defensive` stance (Sarajevo siege ring is impregnable with urban + entrenchment bonuses)
- Occasional probing of siege ring for opportunities (Hrasnica, Igman)
- Named operations: "Sarajevo Breakout" (late war, only if conditions are excellent)
- **Civilian awareness maximum:** 300,000+ civilians depend on Sarajevo defense

**2nd Corps (Tuzla region):**
- Primary mission: Hold Tuzla salient, support eastern enclaves
- Most balanced ARBiH corps — can go offensive when conditions permit
- Named operations: "Tuzla Widening", "Enclave Relief"

**3rd Corps (Central Bosnia — Zenica/Travnik):**
- Primary mission: Hold central corridor (Sarajevo-Tuzla lifeline)
- Secondary: Fight HRHB in Lasva Valley when bilateral war active
- Stance shifts based on HRHB alliance: defensive vs HRHB when at war, balanced vs VRS always
- Named operations: "Central Corridor", "Central Bosnia Defense"

**4th Corps (Herzegovina — Mostar):**
- Primary mission: Hold ARBiH Mostar enclaves
- Always defensive — smallest, weakest ARBiH corps
- Named operations: "Mostar Counter" (only when HRHB war active)

**5th Corps (Bihac pocket):**
- Primary mission: Survive in encirclement (Bihac pocket is surrounded by VRS/HRHB)
- Always defensive except late-war when breakout becomes possible
- **Civilian awareness extreme:** 200,000+ civilians in isolated pocket
- Named operations: "Bihac Pocket Defense"

### 5.4 Brigade-level decision rules

**Posture assignment (OSID-native):**

```
For each ARBiH brigade:
  1. If ZoC-locked → retreat (ARBiH preserves force; only attacks ZoC source if no retreat)
  2. If in Sarajevo core OSID → DEFEND (always)
  3. If in recognized enclave (Srebrenica, Zepa, Gorazde, Bihac) → DEFEND
  4. If week < 12 → DEFEND (survival phase — no exceptions)
  5. If corps stance = 'defensive' → DEFEND
  6. If week 40–80 (Stretch the Front phase):
     a. If adjacent to enemy AND NOT in defensive priority zone → PROBE
        // This is the "pinprick everywhere" strategy — even weak brigades probe
     b. Exception: brigades with personnel < 400 still DEFEND
  7. If corps stance = 'balanced' or 'offensive' AND adjacent to enemy:
     a. If counter-attack opportunity (enemy entrenchment=0) → ATTACK
     b. If predicted outcome >= 'victory' → ATTACK
     c. If predicted outcome >= 'stalemate' AND week > 40 → PROBE
     d. Else → DEFEND
  8. If not adjacent to enemy → move toward nearest front OSID classified as 'critical'
```

**Target scoring (ARBiH-specific):**

```
score(target_osid) =
    base: predicted_outcome_score
  + counter_attack:  +200 if enemy entrenchment == 0  // ARBiH loves counter-attacks
  + weak_defender:   +120 if defender disrupted or cohesion < 25
  + enclave_relief:  +180 if target connects to an isolated friendly enclave
  + corridor_open:   +160 if capture would open a supply corridor
  + civilian_rescue: +civilian_weight(target) / 50    // ARBiH weights civilians heavily
  + siege_break:     +150 if in Sarajevo siege ring (late war only, week > 60)
  - defended_strong: -250 if predicted outcome <= 'repulsed'
  - overextension:   -200 if advance would create 3+ enemy adjacency  // ARBiH cannot afford salients
  - casualty_cost:   -300 if expected_casualties > 8% of personnel  // ARBiH is MORE casualty-averse than VRS
  - supply_isolation: -250 if capture would create an isolated salient
```

**ARBiH personality modifier:** Weeks 0–12: multiply all attack scores by `0.0` (no attacks period). Weeks 12–40: multiply by `0.7` (cautious). Weeks 40–80: multiply probe scores by `1.5` (stretch the front — probe everything). Weeks 80+: multiply attack scores by `1.2` for corps-authorized targets only.

### 5.5 ARBiH-specific tactical intelligence

1. **Survive the equipment gap:** ARBiH equipment_ratio (~0.30) means raw power is 40% of VRS at equal numbers. The bot must compensate with terrain (mountains + entrenchment). ARBiH should always fight from prepared positions. Attacking in the open is suicidal.

2. **The "pinprick" strategy (weeks 40–80):** The key to the historical ARBiH approach: assign PROBE posture to every front brigade that isn't defending a critical position. Each brigade probes its adjacent enemy. Most probes will stalemate or be repulsed, but each engagement costs the VRS casualties and prevents VRS from concentrating. The bot should accept individual losses as long as the aggregate pressure is sustained.

3. **Counter-attack windows:** When VRS captures an OSID, the new occupant has entrenchment=0. This is the single best moment for ARBiH to fight — the equipment gap matters less when the defender isn't entrenched. The bot should prioritize counter-attacks within 1 turn of enemy capture.

4. **Enclave isolation awareness:** If an enclave's last supply route is threatened, ALL brigades in that sector should shift to DEFEND, and reserves should move toward the threatened chokepoint. Losing a corridor to an enclave is catastrophic (historically: Srebrenica, Zepa).

5. **Sarajevo is never attacked directly:** The urban + siege multipliers make Sarajevo the strongest defensive position in the game. The ARBiH bot should invest zero offensive effort on Sarajevo breakout until very late war (week 80+) with corps authorization and named operation bonuses.

---

## 6. HVO Bot AI — "Opportunist and Survivor"

### 6.1 Historical character

The HVO (Hrvatsko vijece obrane) was the smallest of the three forces, concentrated in Herzegovina and scattered pockets in central Bosnia. It fought a two-front war — alongside the ARBiH against VRS early on, then against the ARBiH in the Lasva Valley and Mostar (1993), then back to alliance after the Washington Agreement (February 1994). The HVO had decent equipment (supplied by Croatia) but limited manpower and a fragmented geographic position.

**Behavioral signature:** Opportunistic and alliance-dependent. Aggressive when it smells weakness, defensive when isolated. Politically driven — the Washington Agreement literally flips its behavior.

### 6.2 War phases

| Phase | Weeks | Army Stance | Character |
|-------|-------|-------------|-----------|
| **Consolidate Herzegovina** | 0–12 | `balanced` | Secure the Croat heartland (Mostar, Siroki Brijeg, Citluk, Capljina). Cooperate with ARBiH against VRS. |
| **Lasva Offensive** | 12–26 | `general_offensive` | Push into Lasva Valley to connect central Bosnia Croat pockets to Herzegovina. Fight ARBiH where territories overlap. This only fires when bilateral war is active (alliance < 0). |
| **Washington Pivot** | 26+ (or when alliance restored) | `general_defensive` | Cease offensive operations vs ARBiH. Defend existing territory. Cooperate with Federation forces. |

### 6.3 Corps-level behavior

**Southeast Herzegovina OZ (Mostar/Capljina/Stolac):**
- Primary mission: Hold Herzegovina heartland — ALWAYS defensive
- Never gives up core Croat territory
- Named operations: "Herzegovina Shield" (permanent)
- **Civilian awareness:** Herzegovina is the Croat population center

**Central Bosnia OZ (Vitez/Busovaca/Kiseljak):**
- Behavior switches based on alliance:
  - Allied with RBiH: `balanced` — defend Croat pockets, cooperate vs VRS
  - At war with RBiH: `offensive` — Lasva Valley campaign, push to connect pockets
  - Post-Washington: `defensive` — hold existing territory
- Named operations: "Lasva Valley" (during bilateral war), "Usora Pocket"

**Northwest Bosnia OZ (Orasje/Odzak):**
- Primary mission: Hold Posavina Croat pocket (extremely vulnerable)
- Always `defensive` — this pocket is surrounded and survival is the only goal
- Named operations: "Posavina Defense"

**Tomislavgrad OZ:**
- Rear area / reserve
- Usually `balanced`

### 6.4 Brigade-level decision rules

**Posture assignment (OSID-native):**

```
For each HVO brigade:
  1. If ZoC-locked → retreat (HVO is too small to sacrifice brigades)
  2. If in Herzegovina core OSID → DEFEND (always)
  3. If alliance with RBiH active AND adjacent OSID is RBiH → do not attack (alliance respect)
  4. If bilateral war active (alliance < 0):
     a. If in central Bosnia AND week 12–26 AND corps offensive:
        - If predicted outcome >= 'costly_victory' vs RBiH → ATTACK
        - Else → PROBE
     b. Else → DEFEND
  5. If corps stance = 'offensive' AND adjacent to VRS:
     a. If predicted outcome >= 'victory' → ATTACK
     b. If predicted outcome >= 'stalemate' → PROBE
     c. Else → DEFEND
  6. If corps stance = 'balanced' AND adjacent to enemy:
     a. If counter-attack opportunity → ATTACK
     b. Else → DEFEND
  7. If corps stance = 'defensive' → DEFEND
  8. If not adjacent to enemy → move toward nearest friendly front OSID
```

**Target scoring (HVO-specific):**

```
score(target_osid) =
    base: predicted_outcome_score
  + pocket_connect: +200 if capture would connect two friendly clusters
  + counter_attack: +150 if enemy entrenchment == 0
  + mostar_control: +180 if in Mostar municipality (during bilateral war)
  + lasva_objective: +160 if in Lasva Valley (during bilateral war, weeks 12–26)
  + civilian_protect: +civilian_weight(target) / 80
  - casualty_cost:  -350 if expected_casualties > 8% of personnel  // HRHB most casualty-averse (smallest army)
  - overextension:  -250 if advance creates 3+ enemy adjacency
  - isolation_risk: -300 if target is 2+ hops from nearest friendly cluster
  - alliance_target: -9999 if target is allied faction (Washington Agreement)
```

**HVO personality modifier:** Weeks 0–12: multiply attack scores by `0.8` (cautious consolidation). Weeks 12–26 during bilateral war: multiply by `1.4` (Lasva aggression). Post-Washington: multiply by `0.3` (minimal offensive activity).

### 6.5 HVO-specific tactical intelligence

1. **Fragmented geography:** HVO territory is split into several non-contiguous clusters (Herzegovina, Vitez pocket, Kiseljak pocket, Usora, Orasje). The bot must treat each cluster independently for defense, and should prioritize operations that connect clusters.

2. **Alliance sensitivity:** The HVO bot must check `phase_i_alliance_rbih_hrhb` every turn. When alliance value crosses thresholds:
   - `>= 0`: Allied — cannot attack RBiH, shared front awareness
   - `< 0`: At war — all RBiH positions become valid targets
   - Post-Washington (alliance restored): immediately cease all anti-RBiH operations

3. **Manpower fragility:** HVO has the smallest manpower pool (~21,000 vs ARBiH ~97,000 and VRS ~57,000). Every casualty hurts more. The casualty-aversion threshold should be the strictest of all three factions: reject any attack where expected casualties exceed 8% of personnel.

4. **Croatian supply:** HVO equipment ratio is moderate (~0.50) thanks to Croatian support. This gives HVO a qualitative advantage over ARBiH but not VRS. The bot should exploit this in anti-ARBiH operations but respect VRS firepower superiority.

5. **Defensive depth in Herzegovina:** Herzegovina is HVO's stronghold. Every OSID in Herzegovina core should have a brigade in DEFEND posture with maximum entrenchment. Herzegovina must be impregnable.

---

## 7. Civilian-Aware Defense Priority

### 7.1 Rationale

All three factions historically fought hardest to protect areas with large co-ethnic civilian populations. This was not altruism — it was political necessity. A faction that loses its civilian population base loses political legitimacy, recruitment potential, and the reason for fighting.

### 7.2 Implementation

**Data source:** `political_controllers_osid` combined with population data per OSID (from `operational_settlements.geojson` or derived census data).

**Co-ethnic population per OSID:**
```
coethnic_pop(osid, faction) = population(osid) × ethnic_majority_fraction(osid)
    where ethnic group matches faction (Bosniak → RBiH, Serb → RS, Croat → HRHB)
```

**Civilian weight (chokepoint analysis):**
```
For each faction:
  1. Build subgraph of faction-controlled OSIDs
  2. For each OSID on the front (adjacent to enemy):
     a. Remove this OSID from the subgraph
     b. Count co-ethnic population in any newly disconnected components
     c. civilian_weight(osid) = co_ethnic_pop(osid) + disconnected_population
  3. Cache per turn (recompute only when control changes)
```

**Integration with defense priority:**
- Add `civilian_weight / CIVILIAN_WEIGHT_DIVISOR` to defensive priority score
- Brigades on high civilian-weight OSIDs get hard `DEFEND` posture (cannot be reassigned to attack)
- Corps AI increases sector threat assessment when civilian weight is high
- `CIVILIAN_WEIGHT_DIVISOR = 100` (so 10,000 civilians = +100 priority, comparable to corridor bonuses)

### 7.3 Faction-specific civilian weighting

| Faction | Civilian weight multiplier | Rationale |
|---------|--------------------------|-----------|
| RS | 1.0 | Standard — VRS protected Serb civilians but also prioritized territory |
| RBiH | 1.5 | Higher — ARBiH had massive civilian populations in enclaves/cities; losing them was catastrophic |
| HRHB | 1.2 | Moderate — HVO civilian base was concentrated in Herzegovina (less fragmented) |

### 7.4 Displacement-aware revaluation — "Who lives there NOW?"

**Critical principle:** The bot must use *current* civilian population, not 1991 census data. As the war progresses, displacement reshapes the demographic map. Civilians flee combat zones, and the populations that remain (or arrive as refugees) change which territory matters to which faction.

**The dynamic in practice:**

- **Early war (weeks 0–12):** Prijedor has a large Bosniak population. The ARBiH bot treats Prijedor-area OSIDs as high civilian-weight defense priorities. The VRS bot treats them as lower priority (non-co-ethnic civilians).
- **After ethnic cleansing/displacement (weeks 12+):** If the Bosniak population of Prijedor has been displaced (fled or expelled), the ARBiH bot's civilian weight for those OSIDs drops toward zero. Defending empty territory is no longer a priority — the people are gone. Meanwhile, if Serb settlers or refugees have moved in, the VRS bot's civilian weight for those OSIDs *increases*.
- **Refugee destination awareness:** Bots should recognize that OSIDs receiving large displaced populations have *increased* civilian weight. Tuzla, Zenica, Sarajevo, and Mostar absorb waves of displaced people. Their civilian weights grow over time, making them even higher defense priorities.

**Implementation:**

```
// Recompute co-ethnic population every turn from current displacement state
current_coethnic_pop(osid, faction) =
    remaining_coethnic(osid, faction)           // original population minus displaced-out
  + displaced_received(osid, faction)           // displaced people who arrived here

// This replaces the static census-based computation
civilian_weight uses current_coethnic_pop, not 1991 census
```

**Effect on bot behavior:**

| Scenario | Old civilian weight | New civilian weight | Bot behavior change |
|----------|--------------------|--------------------|-------------------|
| Prijedor after Bosniak displacement | High (1991 Bosniak pop) | Near zero | ARBiH deprioritizes defense; VRS may increase priority if Serb refugees arrived |
| Tuzla receiving 50,000 Bosniak refugees | Moderate | Very high | ARBiH treats Tuzla as critical — more important than ever |
| Srebrenica enclave shrinking | High | Declining (people fleeing) | ARBiH still defends (people still there) but urgency increases as population leaves |
| Herzegovina after Croat consolidation | High | Higher (Croat refugees from central Bosnia arrive) | HVO treats Herzegovina as even more critical to hold |

**What this means for "trading territory":**

A faction that has lost its civilians from a territory will be *more willing to trade that territory* in exchange for defending where its people actually are now. This is historically accurate:

- ARBiH didn't commit massive forces to retake rural eastern Bosnia after the population was expelled — they focused on holding what they had (Sarajevo, Tuzla, Zenica, Bihac, the remaining enclaves).
- VRS didn't spend much effort defending areas they had already ethnically cleansed and which were now empty — they moved forces to where the fight was.
- HVO concentrated defense in Herzegovina precisely because that's where most Croat civilians ended up.

**The bot doesn't "abandon" territory — it reprioritizes.** An OSID with zero co-ethnic civilians still has strategic value (it might be a corridor, a chokepoint, or a terrain advantage), but it no longer carries the civilian defense premium. The bot allocates its scarce brigades to where they protect the most people.

**Guard against pathological behavior:** A minimum strategic value floor prevents bots from completely ignoring empty territory:

```
effective_defense_priority(osid) =
    max(STRATEGIC_FLOOR, civilian_weight(osid))
  + corridor_bonus(osid)
  + terrain_value(osid)
  + chokepoint_value(osid)

STRATEGIC_FLOOR = 20  // even empty territory has some value
```

This ensures bots don't create bizarre gaps in their front lines just because civilians left. They still defend coherent lines, but they fight *hardest* where their people live.

---

## 8. Formula-Aware Tactical Behaviors

### 8.1 Counter-attack detection and exploitation

When the attack resolution reports an enemy capture (control flip), the bot should immediately check:
- Is there an adjacent friendly brigade?
- What is the predicted outcome against the new occupant (entrenchment=0, possibly disrupted)?
- If predicted >= `costly_victory`: issue immediate counter-attack

This creates the historical back-and-forth dynamic. Every successful attack invites a counter-attack while the attacker is weak.

### 8.2 Entrenchment-aware attack avoidance

```
if defender.entrenchment_turns >= 8:
    // Effective entrenchment_mult >= 1.52
    // Combined with terrain, this defender is essentially immovable without named operation
    reject_attack unless:
        - Named operation active with execution bonus (1.3)
        - AND predicted outcome >= 'costly_victory'
```

The bot should *never* order a single-brigade attack against a defender with 8+ turns entrenchment unless it's a named operation. This matches the historical stasis on most fronts.

### 8.3 Overextension avoidance

Before committing to an advance after predicted victory:
```
advance_enemy_adjacency = count(enemy-controlled OSIDs adjacent to target)
if advance_enemy_adjacency >= 3:
    // Overextension penalty: 0.85 per extra = 0.85 at 3, 0.72 at 4
    // The new position will be nearly indefensible
    do not advance (hold current position, flip control but don't occupy)
    UNLESS this is a named operation with specific orders to advance
```

### 8.4 Economy of force

On quiet front sectors (front classification = 'quiet' for 4+ consecutive turns):
```
if sector has multiple brigades AND no enemy threat:
    assign one brigade to DEFEND (hold the line with entrenchment)
    release other brigades toward 'threatened' or 'critical' sectors
    thin to 1 brigade per 3 quiet OSIDs (minimum)
```

This frees force for concentration elsewhere without abandoning the line.

### 8.5 Named operation timing

Corps AI should time named operations to maximize the operation execution bonus against weak points:

```
optimal_operation_target(corps) =
    Find enemy front OSID where:
    - defender.entrenchment_turns < 4     (not yet dug in)
    - OR defender.disrupted_turns > 0     (recently disrupted)
    - OR defender.cohesion < 30           (weak morale)
    - AND reachable within operation target sector
    - AND predicted outcome with operation bonus >= 'victory'
```

If no such target exists: do not launch named operation. Wait for opportunity. This prevents wasting the 3-turn planning investment on attacks that will stalemate anyway.

---

## 9. Reserve and Reinforcement Management

### 9.1 Reserve identification

Brigades not adjacent to any enemy OSID are reserves. The bot should maintain a reserve of:
- **RS:** 10–15% of brigades (well-equipped, can afford reserves)
- **RBiH:** 5% of brigades (needs everyone on the line, but keeps minimal reserve for counter-attacks)
- **HRHB:** 5–10% of brigades (small army, but Herzegovina rear can hold reserves)

### 9.2 Reserve deployment

When a front OSID is classified as 'critical':
1. Identify nearest reserve brigade
2. Issue movement order toward the threatened sector
3. Reserve deploys in 1–2 turns (OSID movement)
4. On arrival, takes DEFEND posture

When a named operation is about to enter execution phase:
1. Identify reserve brigades in the same corps
2. Move them toward the operation target sector
3. They arrive as reinforcements during execution

### 9.3 Rotation

After a brigade has been in combat (taking casualties) for 4+ consecutive turns:
```
if reserve_available AND brigade.cohesion < 40:
    issue movement order: swap positions with reserve
    combat brigade moves to rear for recovery
    reserve takes the front position
```

This prevents cohesion death spirals where exhausted brigades keep fighting until they collapse.

---

## 10. Difficulty Presets

### 10.1 Parameterization

All bot behavior is controlled by tunable constants. Difficulty presets adjust these:

| Parameter | Easy | Normal | Hard |
|-----------|------|--------|------|
| Attack threshold (predicted outcome) | >= `victory` | >= `costly_victory` | >= `stalemate` |
| Casualty tolerance | 5% | 10% | 15% |
| Named operation frequency | Low (1 per 8 turns) | Normal (1 per 5 turns) | High (1 per 3 turns) |
| Counter-attack detection | 50% chance to miss | Always detect | Always detect + multi-brigade |
| Entrenchment avoidance | Avoid at 4+ turns | Avoid at 8+ turns | Avoid at 10+ turns |
| Reserve management | No rotation | Basic rotation | Active rotation + swaps |
| Economy of force | No thinning | Basic thinning | Aggressive thinning + redeployment |
| Civilian weight multiplier | ×0.5 | ×1.0 | ×1.5 |

**Note on "Easy" difficulty:** The easy bot still plays competently — it doesn't make obviously stupid moves. It just sets a higher bar for when to attack (only attacks when it's very confident of victory) and doesn't exploit counter-attack windows as aggressively. This makes the war more static on easy, which the player experiences as "easier to hold the line" rather than "the AI is dumb."

### 10.2 Faction-difficulty interaction

The three faction AIs are independently tuned. In a typical game:
- All bot factions default to "Normal"
- The player's opponents could be set to "Hard" for challenge
- Factions not being fought by the player could be "Easy" for performance

---

## 11. Implementation Plan

### Phase 1: Foundation (must-have)

1. **OSID combat predictor** — `predictCombatOutcome(attacker, targetOsid, state, opData)` → `CombatPrediction`
2. **OSID strategic graph analysis** — front classification, chokepoint detection, salient detection
3. **VRS brigade AI** — OSID-native posture + target scoring with formula awareness
4. **ARBiH brigade AI** — OSID-native posture + target scoring with survival + pinprick logic
5. **HVO brigade AI** — OSID-native posture + target scoring with alliance sensitivity
6. **Pipeline integration** — replace `generateBotBrigadeOrdersOsid` with new faction-dispatched AI
7. **Verification run** — 20w + 52w scenario runs, confirm non-zero battles, check anchor stability

### Phase 2: Intelligence (should-have)

8. **Counter-attack detection** — detect enemy captures and issue immediate counter-attacks
9. **Named operation timing** — corps AI selects targets based on enemy weakness analysis
10. **Reserve management** — basic reserve deployment toward threatened sectors
11. **Economy of force** — thin quiet sectors, concentrate on active sectors

### Phase 3: Polish (nice-to-have)

12. **Civilian weight computation** — chokepoint analysis for co-ethnic population
13. **Difficulty presets** — parameterize all thresholds, expose to scenario config
14. **Brigade rotation** — swap exhausted front brigades with reserves
15. **Supply awareness** — BFS supply trace through OSID graph, supply_mult prediction

---

## 12. Files Affected

| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Replace OSID bot with three faction-specific AIs |
| `src/sim/combat/bot_strategy.ts` | Expand with OSID-native constants, civilian weights |
| `src/sim/combat/bot_corps_ai.ts` | Update named operation timing, reserve deployment |
| `src/sim/combat/combat_predictor.ts` | **NEW:** Read-only combat outcome prediction |
| `src/sim/combat/osid_graph_analysis.ts` | **NEW:** Strategic graph analysis (chokepoints, salients, front classification) |
| `src/sim/turn_pipeline.ts` | Update bot step to dispatch to faction-specific AIs |
| `tests/bot_osid_*.test.ts` | **NEW:** Test suite for OSID-native bot decisions |

---

## 13. Success Criteria

A successful implementation produces these observable outcomes in a 52-week canonical scenario run:

| Metric | Target | Why |
|--------|--------|-----|
| Total attacks | > 200 | Bots are actively fighting (current: 0) |
| Defender-present battles | > 30% of attacks | Real battles, not just land-grabs |
| Settlement flips | 50–150 | Territory changes hands, but not wildly |
| RS control at week 26 | 45–55% | Historical VRS peak territory |
| RBiH control at week 52 | 20–30% | Historical ARBiH holding pattern |
| HRHB control at week 52 | 15–20% | Historical HVO stable |
| 8/8 anchor checks pass | All | No faction loses its core territory |
| Counter-attacks observed | > 20 | Back-and-forth dynamic on contested OSIDs |
| Named operations launched | > 5 per faction | Corps AI actually plans operations |
| Zero attacks with predicted 'catastrophic' outcome | 0 | Bots never do obviously stupid things |
| Deterministic | Same hash on repeated runs | No randomness |

---

## 14. Open Questions

1. **OSID population data:** Is co-ethnic population available per OSID? May need derivation from census data mapped through `canonical_to_operational_map`.

2. **Terrain multipliers per OSID:** The attack resolution spec references terrain data but the napkin notes "terrain scalars per OSID" as deferred. The bot can work without terrain initially (set all terrain_mult to 1.0) but terrain awareness significantly improves tactical decisions.

3. **Multi-brigade OSID attacks:** The current OSID model allows one brigade per OSID. Can multiple brigades attack the same target OSID from different adjacent OSIDs? The attack resolution spec says yes (§3.4, coordination penalty). The bot needs to know the answer to decide whether to coordinate attacks.

4. **Legacy bot deprecation:** Once the OSID bot is functional, should `generateBotBrigadeOrders` (legacy AoR path) be fully deprecated? Or kept as fallback when operational data is unavailable?

5. **Posture staging:** The OSID bot now decides posture internally. Should it still produce `brigade_posture_orders` for the pipeline to apply, or should posture be applied inline? The pipeline currently expects posture orders to be staged and applied separately. Recommend keeping the staged approach for consistency.

---

*This specification will be updated as implementation proceeds. Constants are tuning targets, not final values. The core architecture (three-layer, formula-aware, faction-specific) is the stable design.*
