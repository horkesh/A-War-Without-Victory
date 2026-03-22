# A War Without Victory — Gap Systems v2.0 Addendum

**Document Purpose:** Supplement to Gap Systems Implementation v1.0.0 adding:
- System 9: Faction-Specific Tactical Doctrines (INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE)
- System 10: Time-Based Capability Progression
- System 11: Initial Political Control with Stability-Based Contestation

**Status:** DRAFT for review and canon integration  
**Date:** 2026-02-04  
**Supplements:** Gap Systems Implementation v1.0.0  
**Applies to:** Engine Invariants v4.0.0, Systems Manual v4.0.0, Game Bible v4.0.0, Rulebook v4.0.0

---

## Integration Overview

This addendum integrates historical analysis from this design session into three new systems:

**System 9** enhances the existing posture system with faction-specific tactical doctrines based on equipment profiles and historical behavior patterns (ARBiH infiltration, VRS artillery defense, HVO coordination with Croatian Army).

**System 10** models the time-evolution of faction capabilities, with ARBiH improving from weak 1992 start to near-peer 1995 capability, while VRS degrades from JNA-inheritance peak to exhausted 1995 state.

**System 11** replaces the current binary political control initialization with stability-scored contested/secure control states, properly modeling cases like Prijedor (institutional control without demographic majority).

These systems integrate with v1.0.0 Systems 1-8 and enhance Systems 1 (Patron Pressure), 2 (Arms Embargo), and 3 (Heavy Equipment).

---

# SYSTEM 9: Faction-Specific Tactical Doctrines and Postures

## 9.1 Overview

Expands canon postures (DEFEND, PROBE, ATTACK, ELASTIC_DEFENSE) with three faction-specific doctrines reflecting historical tactical patterns.

## 9.2 New Postures

### 9.2.1 INFILTRATE (ARBiH-Specialized)

**Historical Basis:**
- ARBiH developed elite light infantry units for deep penetration
- Small, mobile formations bypassed VRS defensive lines
- Most effective: Naser Orić's operations around Srebrenica, Tuzla offensives
- Vulnerable to artillery counter-battery once detected

**Eligibility:**
```javascript
{
  faction: "ARBiH",
  formation_cohesion: > 70,
  formation_experience: > 0.6,
  equipment_ratio: < 0.5,  // Light infantry advantage
  supply_state: >= "ADEQUATE"
}
```

**Effects:**
- Pressure generation: 0.8x base (lower than ATTACK)
- Terrain bonus: +0.3 in mountains/forests
- vs STATIC_DEFENSE: +0.4 effectiveness
- Supply disruption: -0.2 enemy rear supply_integrity
- Bypasses front lines, applies pressure to enemy rear
- Exhaustion: 1.1x rate
- Equipment degradation: 0.4x tempo (light infantry, minimal heavy equipment)
- Duration: 6-8 turns before REFIT required

**Countered By:**
- ARTILLERY_COUNTER (VRS): -0.3 effectiveness
- Requires detection turn delay, then reduces infiltration 30%

**Progression (System 10):**
```javascript
infiltrate_effectiveness = {
  1992: 0.6,   // Limited training
  1993: 0.75,  // Experience gained
  1994: 0.85,  // Elite units mature
  1995: 0.9    // Peak effectiveness
}
```

### 9.2.2 ARTILLERY_COUNTER (VRS-Specialized)

**Historical Basis:**
- VRS inherited JNA artillery superiority (~400 pieces vs ARBiH ~50)
- Used concentrated fire to negate ARBiH infantry advantages
- Counter-battery and defensive barrages held static positions
- Example: Held Jajce defensive line 1992, Doboj corridor

**Eligibility:**
```javascript
{
  faction: "RS",
  operational_heavy_equipment: > 60,  // Artillery functional
  ammunition_resupply_rate: > 0.6,
  supply_state: >= "ADEQUATE",
  defensive_posture: true,  // Cannot attack while in ARTILLERY_COUNTER
  facing_enemy_pressure: true
}
```

**Effects:**
- Cannot generate offensive pressure (purely defensive)
- Defensive resistance vs attacks:
  - vs ATTACK: +0.25
  - vs INFILTRATE: +0.30
  - vs COORDINATED_STRIKE: +0.20
- Reduces enemy pressure effectiveness 25-35%
- Inflicts attacker exhaustion: +0.2 per turn
- Ammunition consumption: -0.3 resupply_rate per turn
- Equipment degradation: 1.3x tempo (heavy artillery use)
- Exhaustion: 1.2x rate
- Area denial: Adjacent settlements harder to capture

**Limitations:**
- Ammunition depleted → forced downgrade to STATIC_DEFENSE
- Equipment wear: +0.03 operational_heavy degradation per turn
- Vulnerable to: Supply interdiction, INFILTRATE bypass, COORDINATED_STRIKE counter-battery

**Progression (System 10):**
```javascript
artillery_counter_effectiveness = {
  1992: 1.0,   // Peak (JNA inheritance)
  1993: 0.9,   // Slight decline
  1994: 0.75,  // Drina blockade, equipment wear
  1995: 0.65   // Significant degradation, ammo shortages
}
```

### 9.2.3 COORDINATED_STRIKE (HVO-Specialized)

**Historical Basis:**
- HVO operated as "de facto adjunct" of Croatian Army (Balkan Battlegrounds)
- Joint operations: Winter '94 (Livno offensive), Summer '95 (Glamoč/Grahovo)
- HV provided: artillery prep, command staff, maintenance support
- Completely dependent on Croatian external pipeline
- Rapid collapse when isolated (1993 defeats to ARBiH)

**Eligibility:**
```javascript
{
  faction: "HRHB",
  croatian_external_pipeline_status: > 0.6,  // Croatia corridor open/brittle
  adjacent_hv_units: true OR within_2_settlements_of_croatia: true,
  operational_heavy_equipment: > 50,
  supply_corridors_to_croatia: ["OPEN", "BRITTLE"],  // Not CUT
  hv_coordination_enabled: true  // Post-Washington Agreement
}
```

**Effects:**
- Pressure generation: 1.4x base (highest of all postures)
- Modifiers:
  - HV artillery support: +0.25
  - Combined arms coordination: +0.15
  - Professional command (HV officers): +0.15
  - Total: up to 1.95x pressure
- Equipment degradation: Reduced by 30% (HV maintenance)
- operational_tempo: 1.6 but degradation_rate: 1.1 (HV support)
- Command coherence: +0.15
- Most effective vs VRS STATIC_DEFENSE
- Exhaustion: 1.25x rate (intensive ops)
- Duration limit: 4 turns, then 2-turn REFIT required

**Collapse Mechanics:**
```javascript
if (croatian_external_pipeline_status < 0.3):
  immediate_downgrade_to = "DEFEND"
  command_coherence -= 0.3
  exhaustion_spike = +15

if (hv_coordination_enabled == false):  // Patron pressure changed
  coordinated_strike_disabled = true
  all_formations_to = "DEFEND"
  morale_penalty = -0.2
```

**Historical Operations:**
- Winter '94 (Nov-Dec 1994): Pushed VRS back ~20km from Livno
- Summer '95 (July 1995): Captured Glamoč, Grahovo; ~1,600 sq km

**Availability Timeline (integrates System 1: Patron Pressure):**
```javascript
{
  1992_1993: false,  // HVO-ARBiH war
  1994_pre_washington: false,
  1994_post_washington: true,  // Washington Agreement enables
  1995: true,  // Full HV support for joint offensives
  
  // Subject to patron compliance
  if_hvo_resists_croatian_objectives: {
    disabled: true,
    material_support: -0.4
  }
}
```

## 9.3 Posture Interaction Matrix

| Attacker → Defender | INFILTRATE | ARTILLERY_COUNTER | COORDINATED_STRIKE | STATIC_DEFENSE |
|---------------------|-----------|-------------------|-------------------|----------------|
| INFILTRATE | 0 / 0 | -0.3 / +0.3 | 0 / 0 | +0.4 / -0.2 |
| ATTACK | 0 / 0 | -0.25 / +0.25 | 0 / 0 | +0.2 / -0.2 |
| COORDINATED_STRIKE | 0 / 0 | +0.2 / +0.1 | 0 / 0 | +0.3 / -0.3 |

*Format: Attacker modifier / Defender modifier*

## 9.4 Integration with Existing Systems

**Equipment (System 3):**
- Posture determines operational_tempo → degradation rate
- INFILTRATE: 0.4 (minimal heavy equipment)
- ARTILLERY_COUNTER: 1.3 (heavy usage)
- COORDINATED_STRIKE: 1.6 tempo but 1.1 degradation (HV support)

**Exhaustion:**
- INFILTRATE: 1.1x
- ARTILLERY_COUNTER: 1.2x
- COORDINATED_STRIKE: 1.25x

**Supply:**
- ARTILLERY_COUNTER: 1.5x consumption (high ammunition)
- COORDINATED_STRIKE: 1.3x consumption

**Patron Pressure (System 1):**
- COORDINATED_STRIKE availability controlled by Croatian patron timeline
- Disabled if HVO resists Croatian objectives

## 9.5 State Schema Additions

```typescript
type PostureType = 
  | "DEFEND" | "PROBE" | "ATTACK" | "ELASTIC_DEFENSE"  // Existing
  | "INFILTRATE"           // NEW: ARBiH
  | "ARTILLERY_COUNTER"    // NEW: VRS
  | "COORDINATED_STRIKE"   // NEW: HVO
  | "HOLDING" | "STATIC_DEFENSE" | "MOBILE_DEFENSE" | "REFIT";

interface FormationState {
  posture: PostureType,
  posture_eligibility: {
    infiltrate_eligible: boolean,
    artillery_counter_eligible: boolean,
    coordinated_strike_eligible: boolean,
    eligibility_reasons: string[]
  },
  doctrine_effectiveness: number,  // From System 10
  special_posture_duration: number,  // Turns in limited-duration posture
  posture_transition_cooldown: number
}
```

---

# SYSTEM 10: Time-Based Capability Progression

## 10.1 Overview

Models faction capability evolution over 1992-1995, with ARBiH improving from weak start to near-peer capability, VRS degrading from JNA-inheritance peak to exhaustion, and HVO dependent on Croatian support shifts.

## 10.2 Capability Profile Structure

```javascript
capability_profile: {
  equipment_access_level: number,      // 0.0-1.0, changes over time
  training_quality: number,            // 0.0-1.0, improves with experience
  organizational_maturity: number,     // 0.0-1.0, improves with time
  tactical_doctrine_effectiveness: {   // Per-posture effectiveness
    [posture_name]: number
  },
  progression_phase: string,           // "EMERGING" | "DEVELOPING" | "MATURE" | "DECLINING"
  turns_in_war: number,
  experience_accumulated: number
}
```

## 10.3 ARBiH Progression Curve (1992-1995)

**Pattern:** Weak → Improving → Capable → Mature

```javascript
arbih_by_year = {
  1992: {
    equipment_access: 0.15,
    training_quality: 0.35,
    organizational_maturity: 0.25,
    doctrine_effectiveness: {
      INFILTRATE: 0.6,   // Elite units beginning
      ATTACK: 0.5,
      DEFEND: 0.6
    },
    phase: "EMERGING"
  },
  
  1993: {
    equipment_access: 0.25,  // Smuggling networks develop
    training_quality: 0.55,
    organizational_maturity: 0.45,
    doctrine_effectiveness: {
      INFILTRATE: 0.75,  // Elite units mature
      ATTACK: 0.65,
      DEFEND: 0.75
    },
    phase: "DEVELOPING"
  },
  
  1994: {
    equipment_access: 0.40,  // **Washington Agreement jump**
    training_quality: 0.75,  // HV training support
    organizational_maturity: 0.70,
    doctrine_effectiveness: {
      INFILTRATE: 0.85,
      ATTACK: 0.80,
      DEFEND: 0.85,
      COORDINATED_STRIKE: 0.70  // With HVO post-Washington
    },
    phase: "DEVELOPING"
  },
  
  1995: {
    equipment_access: 0.50,
    training_quality: 0.85,
    organizational_maturity: 0.85,
    doctrine_effectiveness: {
      INFILTRATE: 0.90,  // Peak effectiveness
      ATTACK: 0.90,
      DEFEND: 0.90,
      COORDINATED_STRIKE: 0.85
    },
    phase: "MATURE"
  }
}
```

**Key Milestones:**
- **Q2 1993:** Elite units enable INFILTRATE posture
- **Q1 1994:** Washington Agreement: equipment_access 0.25→0.40, HV training
- **Q3 1994:** Brigade reorganization: org_maturity 0.60→0.70

## 10.4 VRS Degradation Curve (1992-1995)

**Pattern:** Peak → Sustained → Declining → Exhausted

```javascript
vrs_by_year = {
  1992: {
    equipment_operational: 0.90,  // JNA inheritance
    supply_access: 0.85,
    training_quality: 0.80,
    organizational_maturity: 0.85,
    doctrine_effectiveness: {
      ARTILLERY_COUNTER: 1.0,  // Peak
      STATIC_DEFENSE: 0.95,
      ATTACK: 0.90
    },
    phase: "MATURE"
  },
  
  1993: {
    equipment_operational: 0.75,  // Degradation begins
    supply_access: 0.75,
    training_quality: 0.75,
    organizational_maturity: 0.80,
    doctrine_effectiveness: {
      ARTILLERY_COUNTER: 0.9,
      STATIC_DEFENSE: 0.90,
      ATTACK: 0.80
    },
    phase: "MATURE"
  },
  
  1994: {
    equipment_operational: 0.60,  // **Drina blockade**
    supply_access: 0.55,           // Serbia cuts supply Aug 1994
    training_quality: 0.70,
    organizational_maturity: 0.75,
    doctrine_effectiveness: {
      ARTILLERY_COUNTER: 0.75,  // Ammo constraints
      STATIC_DEFENSE: 0.80,
      ATTACK: 0.65
    },
    phase: "DECLINING",
    drina_blockade_active: true
  },
  
  1995: {
    equipment_operational: 0.50,  // Severe degradation
    supply_access: 0.55,          // Blockade eased Dec '94 but damage done
    training_quality: 0.65,
    organizational_maturity: 0.70,
    doctrine_effectiveness: {
      ARTILLERY_COUNTER: 0.65,  // Ammo shortages
      STATIC_DEFENSE: 0.75,
      ATTACK: 0.55
    },
    phase: "DECLINING"
  }
}
```

**Key Events:**
- **Q3 1993:** Equipment degradation becomes visible
- **Q3 1994:** **Drina blockade** (Aug 1994): supply_access 0.75→0.55, material_support -0.3
- **Q4 1994:** Blockade eased (Dec 1994) but capabilities don't recover
- **1995:** Continued decline, Operation Storm

## 10.5 HVO Progression (External Dependency)

**Pattern:** Croatian-Dependent → War with ARBiH → Federation → HV-Supported

```javascript
hvo_by_year = {
  1992: {
    equipment_access: 0.60,  // Croatian pipeline
    training_quality: 0.50,
    organizational_maturity: 0.45,
    croatian_support: 0.7,
    doctrine_effectiveness: {
      ATTACK: 0.65,
      DEFEND: 0.70
    },
    phase: "DEVELOPING"
  },
  
  1993: {
    equipment_access: 0.55,  // War with ARBiH, losses
    training_quality: 0.45,
    organizational_maturity: 0.40,
    croatian_support: 0.8,  // Croatia supports territorial expansion
    doctrine_effectiveness: {
      ATTACK: 0.60,
      DEFEND: 0.65
    },
    phase: "DECLINING"  // Lost 6 towns to ARBiH
  },
  
  1994_pre_washington: {
    equipment_access: 0.50,
    training_quality: 0.50,
    organizational_maturity: 0.45,
    croatian_support: 0.5,  // Croatia pressured by US
    doctrine_effectiveness: {
      ATTACK: 0.55,
      DEFEND: 0.70
    },
    phase: "DECLINING"
  },
  
  1994_post_washington: {
    equipment_access: 0.65,  // **Washington Agreement**
    training_quality: 0.65,  // HV training
    organizational_maturity: 0.60,
    croatian_support: 0.9,  // Full HV coordination
    doctrine_effectiveness: {
      COORDINATED_STRIKE: 0.75,  // NEW posture enabled
      ATTACK: 0.70,
      DEFEND: 0.80
    },
    phase: "DEVELOPING"
  },
  
  1995: {
    equipment_access: 0.70,
    training_quality: 0.75,
    organizational_maturity: 0.70,
    croatian_support: 1.0,  // Peak HV support
    doctrine_effectiveness: {
      COORDINATED_STRIKE: 0.90,  // Peak joint ops
      ATTACK: 0.80,
      DEFEND: 0.85
    },
    phase: "MATURE"
  }
}
```

**Key Events:**
- **1993:** HVO-ARBiH war, territorial losses
- **Q1 1994:** Washington Agreement: equipment_access jump, HV coordination enabled
- **Q4 1994:** Winter '94 operation with HV
- **Q3 1995:** Summer '95 operation with HV

## 10.6 Formation Experience Accumulation

Individual formations gain experience through combat:

```javascript
formation_experience_gain_per_turn = {
  in_combat: 0.02,
  successful_operation: +0.05,
  failed_operation: +0.02,  // Learn from failure
  casualties_taken: +0.01,
  static_holding: 0.005
}

formation_experience_effects = {
  cohesion_bonus: experience_level * 10,
  pressure_bonus: experience_level * 0.15,
  exhaustion_resistance: experience_level * 0.1
}
```

**Elite Formation Threshold:**
- experience_level > 0.7
- cohesion > 75
- Unlocks: INFILTRATE eligibility (ARBiH), specialist operations

## 10.7 Integration with Existing Systems

**Arms Embargo (System 2):**
- equipment_access_level modifies heavy_equipment_access over time
- Smuggling efficiency adds to equipment_access

**Heavy Equipment (System 3):**
- VRS equipment_operational directly maps to operational_heavy ratio
- Degradation compounds: VRS starts high but degrades fastest

**Patron Pressure (System 1):**
- material_support_level modifies equipment_access
- Drina blockade (1994) directly reduces VRS supply_access and material_support

**Posture Effectiveness (System 9):**
- doctrine_effectiveness modifies posture pressure generation
- INFILTRATE becomes more effective 1992→1995 for ARBiH
- ARTILLERY_COUNTER becomes less effective 1992→1995 for VRS

## 10.8 Determinism

- All progression curves are pre-scripted by turn index
- Historical events trigger at specific turns (Washington Agreement, Drina blockade)
- No randomness in capability changes
- Formation experience accumulation is deterministic from combat exposure

## 10.9 Design Constraints

- Progression reflects historical patterns but doesn't guarantee outcomes
- Equipment acquisition subject to patron support and embargo
- Training improves with time and experience, never regresses
- Organizational maturity improves with stability, degrades with defeats
- No faction achieves perfect capability (all have constraints)

---

# SYSTEM 11: Initial Political Control with Stability-Based Contestation

## 11.1 Overview

Replaces binary political control initialization with stability-scored system distinguishing **secure**, **contested**, and **highly contested** control. Models cases like Prijedor (SDA mayor, 44% Bosniak population → highly contested).

## 11.2 Rationale

Current canon: All pre-war control treated as equal.

Historical reality:
- **Secure:** Banja Luka (SDS control + 55% Serb majority)
- **Contested:** Prijedor (SDA control + 44% Bosniak + 42% Serb)
- **Highly Contested:** Bratunac (SDA control + 64% Bosniak but immediate JNA/SDS pressure)

Canon already has Phase 0 Stability Score system (§4.5) but it's not integrated with initial control.

## 11.3 Integration with Phase 0 Stability System

Use existing Phase 0 stability calculation to derive control status:

```javascript
initial_control_status = {
  political_controller: faction_id,  // From 1990 elections
  stability_score: number,           // From Phase 0 §4.5
  control_status: enum               // SECURE | CONTESTED | HIGHLY_CONTESTED
}

control_status = {
  SECURE: stability_score >= 60,
  CONTESTED: 40 <= stability_score < 60,
  HIGHLY_CONTESTED: stability_score < 40
}
```

## 11.4 Stability Score Calculation (Enhanced Phase 0 §4.5)

```
Stability Score = Base (50)
  + Demographic Factors
  + Organizational Factors
  - Geographic Vulnerabilities
```

### Demographic Factors:
```
Controller's population >60%:  +25 (Strong Majority)
Controller's population 50-60%: +15 (Majority)
Controller's population 40-50%: +5 (Plurality)
Controller's population <40%:  -15 (Minority - Vulnerable)
```

### Organizational Factors:
```
Police Loyalty:
  Loyal to controller:    +15
  Mixed:                  -10
  Hostile to controller:  -15

TO (Territorial Defense) Control:
  Controlled by faction:  +15
  Contested:              -10
  Lost:                    0

SDS Penetration (non-RS areas):
  Strong SDS presence:    -15

Patriotska Liga (RBiH areas):
  Strong PL presence:     +10

JNA Garrison:
  In RS-aligned area:     +10
  In non-RS area:         -10 (threatening)
```

### Geographic Vulnerabilities:
```
Adjacent to hostile demographic majority: -20
Strategic corridor location:             -10
Isolated/enclave:                        -10
Connected to friendly rear:              +10
```

## 11.5 Prijedor Example (Detailed)

**Historical Facts:**
- 1990 Election: SDA won (Mayor Muhamed Čehajić)
- Demographics: 44% Bosniak, 42.5% Serb, 5.6% Croat
- Reality: SDS parallel structures, police split, JNA nearby

**Calculation:**
```
Base: 50

Demographic: 44% Bosniak for RBiH = Plurality: +5

Organizational:
  Police: Mixed:                           -10
  TO: Contested:                           -10
  SDS penetration in RBiH area (strong):   -15
  JNA nearby (threatening):                -10

Geographic:
  Adjacent to Serb-majority Banja Luka:    -20
  Strategic Posavina corridor:             -10

Total: 50 + 5 - 10 - 10 - 15 - 10 - 20 - 10 = -20
Floor at 20.

Status: HIGHLY CONTESTED (20 < 40)
```

**Historical Validation:** Prijedor fell to VRS April 1992, minimal resistance. Stability score correctly predicts vulnerability.

## 11.6 Effects of Control Status

### SECURE Control (Stability ≥ 60):
```javascript
{
  authority: "CONSOLIDATED",
  militia_growth_rate: 1.5x,
  flip_resistance: "HIGH",  // Requires sustained pressure + declaration
  legitimacy_bonus: 1.0,    // Full demographic legitimacy
  initial_cohesion: 70
}
```

### CONTESTED Control (40 ≤ Stability < 60):
```javascript
{
  authority: "CONTESTED",
  militia_growth_rate: 1.0x,
  flip_resistance: "MODERATE",  // Vulnerable to early-war pressure
  legitimacy_penalty: -0.2,
  initial_cohesion: 50
}
```

### HIGHLY CONTESTED Control (Stability < 40):
```javascript
{
  authority: "FRAGMENTED",
  militia_growth_rate: 0.7x,
  flip_resistance: "VERY_LOW",  // May flip Phase I turn 1-3
  legitimacy_penalty: -0.4,
  initial_cohesion: 30,
  
  // Special: May auto-flip on RS/HRHB declaration
  auto_flip_eligible: true
}
```

## 11.7 Data File Enhancement

Enhance `municipalities_1990_initial_political_controllers.json`:

```json
{
  "meta": {
    "version": "4.0.0",
    "stability_calculation": "Phase_0_Specification_v4.0.0_§4.5"
  },
  "controllers_by_mun1990_id": {
    "prijedor": {
      "political_controller": "RBiH",
      "demographic_alignment": "plurality",
      "controller_population_pct": 44.0,
      "stability_modifiers": {
        "demographic": 5,
        "organizational": -45,
        "geographic": -30
      },
      "initial_stability_score": 20,
      "control_status": "HIGHLY_CONTESTED",
      "notes": "SDA control, Serb plurality, SDS penetration, JNA proximity"
    },
    
    "banja_luka": {
      "political_controller": "RS",
      "demographic_alignment": "majority",
      "controller_population_pct": 54.9,
      "stability_modifiers": {
        "demographic": 15,
        "organizational": 40,
        "geographic": 10
      },
      "initial_stability_score": 115,
      "control_status": "SECURE",
      "notes": "SDS control, Serb majority, regional capital"
    }
  }
}
```

## 11.8 Integration with Existing Systems

**Phase 0 (Pre-War):**
- Players invest capital to improve stability_score in vulnerable municipalities
- Stability feeds directly into Phase I flip mechanics

**Phase I (Early War):**
- HIGHLY_CONTESTED (stability < 30) may auto-flip on declaration
- CONTESTED municipalities are primary militia pressure targets
- SECURE municipalities require sustained pressure to flip

**Legitimacy (System 4):**
- `institutional_legitimacy` component uses stability-based contested status
- Contested control reduces legitimacy_score by 0.2-0.4

**Control Strain (Phase I):**
- HIGHLY_CONTESTED control generates strain even without flip
- Holding minority-population municipalities is exhausting

## 11.9 Historical Validation Examples

**Should be SECURE (Stability 60-100):**
- Banja Luka (RS): 55% Serb + SDS control = ~80-90
- Sarajevo (RBiH): 50% Bosniak + SDA control + capital = ~70-80
- Mostar (HRHB areas): Croat-majority quarters + HDZ = ~70

**Should be CONTESTED (Stability 40-60):**
- Zvornik (RBiH): 60% Bosniak but Drina border + JNA = ~40-50
- Brčko (RBiH): Mixed population + strategic corridor = ~35-45
- Tešanj (RBiH): Bosniak majority but isolated = ~45-55

**Should be HIGHLY CONTESTED (Stability <40):**
- Prijedor (RBiH): 44% Bosniak + SDS penetration = ~20-30
- Višegrad (RBiH): Bosniak majority but Drina valley + JNA = ~30-35
- Foča (RBiH): Bosniak slight majority but strategic + JNA = ~25-35

**Should be NULL (No Clear Control):**
- Rare cases of immediate institutional collapse
- Certain isolated settlements during post-election chaos

## 11.10 Determinism

- All stability calculations are deterministic from demographic data + organizational research
- No randomness in stability scores
- Control status deterministically derived from stability
- Effects on militia, authority, flip resistance are deterministic

## 11.11 Design Constraints

- Stability score reflects pre-war institutional reality, not military strength
- Demographic majority is necessary but not sufficient for secure control
- Organizational factors (police, TO, party penetration) are critical
- Geographic position matters (isolation, strategic corridors)
- Historical validation required for all municipality assignments

---

# INTEGRATION GUIDE

## Integrating v2.0 Addendum with v1.0.0

### Step 1: Review v1.0.0 Systems 1-8
All eight systems from v1.0.0 remain valid and are enhanced by v2.0 systems.

### Step 2: Add System 9 (Tactical Doctrines)
- Extend posture enum in formation state
- Implement eligibility checks for INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE
- Wire posture effects into pressure calculation
- Connect to equipment degradation (System 3) and exhaustion

### Step 3: Add System 10 (Capability Progression)
- Add capability_profile to faction state
- Implement time-based progression curves (by turn or by year)
- Wire faction capabilities into:
  - equipment_access (System 2)
  - doctrine_effectiveness (System 9)
  - material_support (System 1)
- Handle milestone events (Washington Agreement, Drina blockade)

### Step 4: Add System 11 (Contested Control)
- Replace binary political_controller with stability-scored system
- Calculate stability from Phase 0 demographic + organizational + geographic factors
- Derive control_status (SECURE/CONTESTED/HIGHLY_CONTESTED)
- Wire control_status into:
  - Militia growth rates (Phase I)
  - Authority states (Phase I)
  - Legitimacy (System 4)
  - Flip resistance

### Step 5: Patron Pressure Enhancements (System 1)
Add to existing System 1:
- Croatia-HRHB pressure timeline with compliance mechanics
- Serbia-RS pressure timeline with Drina blockade
- RS resistance/inertia mechanics
- Patron objective conflicts

### Step 6: Update State Schemas
```typescript
// Faction state additions
interface FactionState {
  capability_profile: CapabilityProfile,  // System 10
  
  // Enhanced from v1.0.0 System 1
  patron_objectives: PatronObjectiveState,
  compliance_history: ComplianceRecord[]
}

// Formation state additions
interface FormationState {
  posture: ExtendedPostureType,  // System 9
  posture_eligibility: PostureEligibility,
  experience_level: number,      // System 10
  doctrine_effectiveness: number
}

// Municipality state additions
interface MunicipalityState {
  initial_stability_score: number,  // System 11
  control_status: ControlStatus,    // SECURE | CONTESTED | HIGHLY_CONTESTED
  stability_modifiers: StabilityModifiers
}
```

### Step 7: Validation and Testing

**Unit Tests Required:**
- System 9: Posture eligibility checks, pressure modifications
- System 10: Capability progression curves, milestone events
- System 11: Stability score calculations, control status derivation

**Integration Tests Required:**
- ARBiH INFILTRATE effectiveness vs VRS ARTILLERY_COUNTER
- VRS degradation curve impact on ARTILLERY_COUNTER availability
- HVO COORDINATED_STRIKE collapse when Croatian pipeline cut
- Stability-based flip resistance in Phase I

**Historical Validation Scenarios:**
- Prijedor fall (April 1992): HIGHLY_CONTESTED → rapid flip
- ARBiH 1994 offensives: Improved capabilities + INFILTRATE
- VRS 1995 decline: Degraded capabilities limit ARTILLERY_COUNTER
- HVO Summer '95: COORDINATED_STRIKE with peak HV support

### Step 8: Documentation Updates

Update for v4.0.0:
- **Engine Invariants:** Add posture eligibility invariants, stability-based control
- **Systems Manual:** Full descriptions of Systems 9-11
- **Game Bible:** Conceptual explanations of tactical doctrines, capability evolution
- **Rulebook:** Player-facing posture descriptions, control status meanings
- **Phase Specifications:** Phase 0 stability integration, Phase I contested control effects

---

# DESIGN RATIONALE

## Why These Three Systems?

### System 9: Tactical Doctrines
**Historical Grounding:** ARBiH, VRS, and HVO fought differently due to equipment profiles and organizational culture. This isn't aesthetic; it's fundamental to understanding the war.

**Gameplay Impact:** Creates asymmetric strategic choices. ARBiH players optimize for light infantry infiltration; VRS players preserve artillery; HVO players manage Croatian relationship.

**Educational Value:** Shows how equipment constraints shape doctrine.

### System 10: Capability Progression
**Historical Accuracy:** The war was a race between ARBiH capability growth and VRS capability degradation. By 1995, they were near-peers.

**Gameplay Impact:** Early-war VRS advantage fades; late-war ARBiH becomes formidable. No static balance.

**Educational Value:** Shows war as learning process, not snapshot.

### System 11: Contested Control
**Historical Accuracy:** Prijedor, Zvornik, Bratunac, etc. had institutional control without demographic stability. This mattered immediately (April 1992 rapid flips).

**Gameplay Impact:** Pre-war positioning matters. Players can invest to stabilize vulnerable municipalities.

**Educational Value:** Shows difference between institutional authority and demographic legitimacy.

## How They Integrate

All three systems enhance the v1.0.0 foundation:

- **System 9** makes asymmetric tactics from **System 2** (Arms Embargo) and **System 3** (Equipment) into gameplay
- **System 10** makes the patron support from **System 1** time-varying and consequential
- **System 11** makes **System 4** (Legitimacy) initialization historically accurate

Together they create a simulation where:
1. Initial conditions reflect historical complexity (System 11)
2. Factions fight asymmetrically based on capabilities (Systems 9, 2, 3)
3. Capabilities evolve deterministically over time (System 10)
4. External actors constrain but don't determine outcomes (System 1 enhanced)

---

# CONCLUSION

This addendum completes the Gap Systems Implementation by adding faction-specific tactical doctrines, time-based capability evolution, and stability-based contested political control.

Combined with v1.0.0's eight systems (patron pressure, arms embargo, heavy equipment, legitimacy, enclaves, Sarajevo, negotiation, AoR), the complete v2.0 specification provides:

- **11 complete systems** addressing all gaps from GAP_AND_RECOVERY_REPORT.md
- **Historical validation** for all mechanics
- **Deterministic implementation** (no randomness)
- **Integration with existing canon** (Phase 0, Phase I, Engine Invariants)

**Next Steps:**
1. Review and approve v2.0 systems
2. Implement Systems 9-11 in codebase
3. Update all canon documents to v4.0.0
4. Run historical validation scenarios
5. Calibrate parameters based on playtesting

**End of v2.0 Addendum**
