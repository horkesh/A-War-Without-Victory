# A War Without Victory — Gap Systems Implementation v1.0.0

**Document Purpose:** Full specification of systems identified in GAP_AND_RECOVERY_REPORT.md as discussed historically but not fully implemented in current canon. This document provides complete system designs for integration into v4.0.0 canon documents.

**Status:** DRAFT for review and canon integration  
**Date:** 2026-02-04  
**Supersedes:** None (new systems)  
**Applies to:** Engine Invariants v4.0.0, Systems Manual v4.0.0, Game Bible v4.0.0, Rulebook v4.0.0

---

## Document Structure

This implementation document develops the following systems:

1. **External Patron Pressure and International Visibility** — Asymmetric constraints from outside actors
2. **Arms Embargo Asymmetry** — Differential force composition effects
3. **Heavy Equipment and Maintenance** — Equipment sustainability and degradation
4. **Legitimacy System** — Formal distinction from control and authority
5. **Enclave Integrity System** — Besieged and isolated settlement dynamics
6. **Sarajevo Exception Rules** — Special mechanics for symbolic spaces
7. **Negotiation Capital and Territorial Valuation** — Complete treaty acceptance mechanics
8. **Settlement-Brigade Assignment (AoR)** — Formalization of brigade responsibility rules

---

# PART I: EXTERNAL PRESSURE SYSTEMS

## System 1: External Patron Pressure and International Visibility Pressure (IVP)

### 1.1 System Overview

**Purpose:** Model asymmetric influence of external actors (states, international organizations, NGOs) on faction capabilities and constraints without simulating diplomatic gameplay.

**Core Principle:** Patrons are not players. They apply conditional constraints that alter feasible paths, resource availability, and political costs. External pressure operates as a modifier to faction exhaustion, negotiation posture, and material capabilities.

### 1.2 Conceptual Model

External actors exert pressure through three channels:

1. **Material Support Channel** — Arms, equipment, training, financial aid
2. **Diplomatic Pressure Channel** — International visibility, sanctions, recognition
3. **Constraint Imposition Channel** — Limitations on action (e.g., no-fly zones, safe areas, arms embargoes)

Patron behavior is deterministic and time-conditional, not reactive to player actions.

### 1.3 System State

#### 1.3.1 Faction-Level Patron State

Each faction tracks:

```javascript
patron_state: {
  material_support_level: number,      // 0.0-1.0, affects equipment availability
  diplomatic_isolation: number,        // 0.0-1.0, increases negotiation pressure
  constraint_severity: number,         // 0.0-1.0, limits operational freedom
  patron_commitment: number,           // 0.0-1.0, stability of support
  last_updated: turn_index
}
```

#### 1.3.2 Global IVP State

```javascript
international_visibility_pressure: {
  sarajevo_siege_visibility: number,   // Amplified by siege duration
  enclave_humanitarian_pressure: number, // Sum of enclave integrity losses
  atrocity_visibility: number,         // Triggered by specific events
  negotiation_momentum: number,        // External push toward settlement
  last_major_shift: turn_index
}
```

### 1.4 Patron Support Rules

#### 1.4.1 Material Support Calculation

Material support affects:
- Heavy equipment availability (see System 3)
- Supply capacity multipliers
- Formation quality ceilings

```
equipment_availability_multiplier = 0.5 + (0.5 * material_support_level)
```

#### 1.4.2 Diplomatic Isolation Effects

Diplomatic isolation increases:
- Base exhaustion accumulation rate by `diplomatic_isolation * 0.1` per turn
- Negotiation pressure by `diplomatic_isolation * 5.0` per turn
- Authority decay rate in contested settlements by `diplomatic_isolation * 0.05` per turn

#### 1.4.3 Constraint Severity

Constraint severity reduces:
- Maximum offensive posture from baseline (HIGH becomes LIMITED under constraints)
- Tactical flexibility in encircled areas
- Ability to escalate pressure in monitored zones

### 1.5 IVP Accumulation Rules

#### 1.5.1 Sarajevo Siege Amplification

```
if (sarajevo_controlled_by != sarajevo_besieged_by && siege_duration_turns > 4):
  sarajevo_siege_visibility += 0.5 per turn
```

Sarajevo siege visibility contributes to:
- RS diplomatic isolation: `+0.02 * sarajevo_siege_visibility` per turn
- International negotiation momentum: `+0.1 * sarajevo_siege_visibility` per turn

#### 1.5.2 Enclave Humanitarian Pressure

For each enclave with integrity < 0.5:
```
enclave_humanitarian_pressure += (1.0 - enclave_integrity) * enclave_population_weight
```

Enclave pressure contributes to:
- Besieging faction diplomatic isolation
- Increased international intervention likelihood
- Negotiation window opening thresholds

#### 1.5.3 Atrocity Visibility Triggers

Certain events trigger atrocity visibility spikes:
- Large-scale displacement from single municipality (>30% in one turn)
- Settlement control flip with high demographic mismatch (>80% opposition population)
- Prolonged enclave siege with critical supply (>8 turns)

Atrocity visibility:
- Decays slowly (0.05 per turn) but accumulates rapidly
- Triggers patron commitment shifts
- Opens intervention possibilities (narrative markers, not gameplay)

### 1.6 Patron Commitment Dynamics

#### 1.6.1 Commitment Shifts

Patron commitment changes based on:
- International visibility thresholds
- Faction exhaustion relative to opponents
- Duration of conflict (general war weariness)
- Specific historical trigger dates

Commitment shifts are pre-scripted per turn (historical calendar) with modifiers:

```
patron_commitment_next = patron_commitment_base[turn] 
  * (1.0 - atrocity_visibility * 0.1)
  * (1.0 + negotiation_momentum * 0.05)
```

#### 1.6.2 Commitment Effects

Low patron commitment (<0.4):
- Reduces material_support_level by 0.3
- Increases diplomatic_isolation by 0.2
- Increases internal fragmentation risk

High patron commitment (>0.7):
- Stabilizes material_support_level
- Reduces diplomatic_isolation decay
- Provides exhaustion resistance (+0.1 to exhaustion thresholds)

### 1.7 Integration with Existing Systems

#### 1.7.1 Exhaustion System

External pressure modifies exhaustion accumulation:

```
exhaustion_external_modifier = 
  (diplomatic_isolation * 0.1) +
  (IVP.negotiation_momentum * 0.05) -
  (patron_commitment * 0.05)

exhaustion_per_turn += exhaustion_base * (1.0 + exhaustion_external_modifier)
```

#### 1.7.2 Negotiation System

External pressure affects negotiation windows:

```
negotiation_threshold_modifier = 
  -(IVP.negotiation_momentum * 10.0) -
  (diplomatic_isolation * 5.0)

// Lower threshold = easier to open negotiation
adjusted_negotiation_threshold = base_threshold + negotiation_threshold_modifier
```

#### 1.7.3 Supply System

Material support affects supply capacity:

```
faction_supply_capacity_max = 
  base_supply_capacity * equipment_availability_multiplier
```

### 1.8 Determinism and Auditability

All patron state changes are:
- Deterministic from turn index and game state
- Never random
- Fully serializable
- Auditable through structured logs

Historical triggers are pre-scripted with exact turn indices.

### 1.9 Design Constraints

- Patrons never "play the game" or make decisions
- No diplomatic gameplay or player influence over patron behavior
- External pressure is a constraint system, not an empowerment system
- All effects are gradual and cumulative, not decisive

### 1.10 Canonical Interpretation

External actors shape the strategic environment through material support, diplomatic pressure, and visibility amplification. These constraints are asymmetric, conditional on time and events, and operate as modifiers to faction capabilities rather than as independent gameplay systems. Wars unfold within an international context that limits and enables different paths without producing simple solutions.

---

## System 2: Arms Embargo Asymmetry

### 2.1 System Overview

**Purpose:** Model the differential impact of international arms embargoes on faction force composition, equipment availability, and military capability.

**Historical Context:** The UN arms embargo on Yugoslavia (Resolution 713, 1991) affected factions asymmetrically. The VRS inherited JNA heavy equipment; the ARBiH faced severe equipment shortages; the HVO had access to Croatian supply routes.

### 2.2 Conceptual Model

The arms embargo is not a binary on/off switch but a differential constraint on:
- Heavy equipment acquisition rates
- Equipment quality ceilings
- Maintenance capacity
- Ammunition availability

Each faction has an **embargo evasion capacity** that determines their ability to acquire restricted materials.

### 2.3 System State

#### 2.3.1 Faction Embargo Profile

```javascript
embargo_profile: {
  heavy_equipment_access: number,      // 0.0-1.0, VRS high, ARBiH low
  ammunition_resupply_rate: number,    // Rate of ammunition replenishment
  maintenance_capacity: number,        // Ability to maintain equipment
  smuggling_efficiency: number,        // Evasion of embargo
  external_pipeline_status: number     // Croatian corridor for HVO, etc.
}
```

#### 2.3.2 Equipment Categories

Equipment is categorized by embargo sensitivity:

- **HEAVY:** Tanks, artillery, APCs (highly restricted)
- **MEDIUM:** Mortars, heavy machine guns, anti-tank weapons (moderately restricted)
- **LIGHT:** Small arms, ammunition (minimally restricted)

### 2.4 Embargo Effect Rules

#### 2.4.1 Force Composition Effects

Embargo profiles affect formation composition:

```
// ARBiH example (low heavy_equipment_access = 0.2)
max_heavy_equipment_per_brigade = base_max * heavy_equipment_access
// ARBiH brigades have 20% of nominal heavy equipment

// VRS example (high heavy_equipment_access = 0.9)
max_heavy_equipment_per_brigade = base_max * heavy_equipment_access
// VRS brigades have 90% of nominal heavy equipment
```

#### 2.4.2 Combat Effectiveness Modifiers

Equipment shortages reduce pressure generation:

```
pressure_equipment_modifier = 
  0.5 + (0.5 * effective_equipment_ratio)

// effective_equipment_ratio = current_equipment / max_equipment_for_profile
```

Factions with low heavy equipment (ARBiH) generate less pressure per brigade but can deploy more brigades due to lower equipment requirements.

#### 2.4.3 Ammunition Constraints

Ammunition resupply affects sustained operations:

```
if (sustained_offensive_duration > ammunition_resupply_rate * 2):
  pressure_ammunition_penalty = 0.3 * (duration - threshold)
  effective_pressure *= (1.0 - pressure_ammunition_penalty)
```

Low resupply rates (ARBiH) make sustained offensives harder; high resupply (VRS) allows prolonged pressure.

### 2.5 Smuggling and External Pipelines

#### 2.5.1 Smuggling Efficiency

Smuggling efficiency increases over time as networks develop:

```
smuggling_efficiency_t = smuggling_efficiency_base + (turn_index / 200) * 0.3
// Caps at 1.0
```

Improved smuggling gradually increases:
- heavy_equipment_access by 0.1 per year
- ammunition_resupply_rate by 0.15 per year

#### 2.5.2 External Pipeline Status

HVO external pipeline (Croatian corridor):
- When Open: +0.4 to heavy_equipment_access
- When Brittle: +0.2 to heavy_equipment_access
- When Cut: No bonus

ARBiH external pipeline (air drops, limited sea access):
- Minimal effect (<0.1 increase)
- Highly variable based on international pressure

VRS external pipeline (Serbia):
- Stable throughout war
- Subject to international sanctions pressure (reduces over time)

### 2.6 Integration with Heavy Equipment System (System 3)

Embargo asymmetry determines the **acquisition rate** for heavy equipment.
Heavy equipment maintenance (System 3) determines the **sustainability** of existing equipment.

```
equipment_acquisition_per_turn = 
  base_acquisition_rate * heavy_equipment_access * external_pipeline_status

equipment_loss_per_turn = 
  total_equipment * maintenance_failure_rate (from System 3)
```

### 2.7 Determinism and Auditability

- All embargo profiles are initialized deterministically
- Smuggling efficiency follows deterministic time-based progression
- External pipeline status depends on corridor state (deterministic)
- No randomness in equipment acquisition or loss

### 2.8 Design Constraints

- Embargo effects are differential, not absolute
- No faction is completely cut off or completely supplied
- Effects compound with other systems (exhaustion, supply, maintenance)
- Asymmetry is historically grounded but not scripted to predetermined outcomes

### 2.9 Canonical Interpretation

The international arms embargo created structural asymmetries in force composition and sustainability. Factions with inherited equipment (VRS) faced maintenance challenges but retained capability. Factions building forces from scratch (ARBiH) faced acquisition challenges but developed adaptive infantry tactics. These asymmetries shaped military strategy without determining outcomes.

---

## System 3: Heavy Equipment and Maintenance

### 3.1 System Overview

**Purpose:** Model equipment degradation, maintenance requirements, and sustainability constraints for heavy military equipment (tanks, artillery, APCs).

**Core Principle:** Heavy equipment is a wasting asset. Without maintenance capacity, equipment degrades irreversibly. This creates strategic trade-offs between offensive operations (accelerating wear) and preservation.

### 3.2 Conceptual Model

Heavy equipment has three states:
1. **Operational** — Fully functional, contributes to combat power
2. **Degraded** — Partially functional, reduced effectiveness
3. **Non-Operational** — Cannot be used, requires major repair or is permanently lost

Equipment transitions between states based on:
- Operational tempo (usage intensity)
- Maintenance capacity (faction-level and formation-level)
- Supply availability (parts, fuel, expertise)

### 3.3 System State

#### 3.3.1 Formation Equipment State

```javascript
equipment_state: {
  operational_heavy: number,           // Count of operational heavy equipment
  degraded_heavy: number,              // Count of degraded heavy equipment
  non_operational_heavy: number,       // Count of non-operational heavy equipment
  total_heavy: number,                 // Total = sum of above
  maintenance_deficit: number,         // Cumulative unmet maintenance needs
  last_maintenance: turn_index
}
```

#### 3.3.2 Faction Maintenance Capacity

```javascript
maintenance_capacity: {
  base_capacity: number,               // Maintenance actions per turn
  skilled_technicians: number,         // Quality of maintenance
  spare_parts_availability: number,    // 0.0-1.0, from supply system
  workshop_access: number,             // Rear area workshop availability
  external_support: number             // From patron_state (System 1)
}
```

### 3.4 Equipment Degradation Rules

#### 3.4.1 Operational Tempo Effects

Operational tempo is derived from brigade posture:

```
operational_tempo = {
  OFFENSIVE: 1.5,
  HOLDING: 1.0,
  MOBILE_DEFENSE: 1.2,
  STATIC_DEFENSE: 0.8,
  REFIT: 0.3
}[brigade_posture]
```

#### 3.4.2 Degradation Accumulation

Per turn, per formation:

```
degradation_points = operational_tempo * base_degradation_rate 
  * (1.0 + maintenance_deficit * 0.1)
  * (2.0 - spare_parts_availability)

// Base degradation rate = 0.02 (2% per turn at normal tempo with full parts)
```

#### 3.4.3 State Transitions

Equipment transitions from Operational → Degraded:
```
if (degradation_points >= operational_heavy * 0.05):
  transition_count = floor(degradation_points / 0.05)
  operational_heavy -= transition_count
  degraded_heavy += transition_count
```

Equipment transitions from Degraded → Non-Operational:
```
if (degradation_points >= degraded_heavy * 0.1):
  transition_count = floor(degradation_points / 0.1)
  degraded_heavy -= transition_count
  non_operational_heavy += transition_count
```

Non-operational equipment may be:
- Cannibalized for parts (reduces non_operational, increases spare_parts_availability slightly)
- Abandoned (permanent loss)
- Repaired (requires major maintenance investment)

### 3.5 Maintenance Actions

#### 3.5.1 Routine Maintenance

Formations in REFIT or STATIC_DEFENSE postures may perform routine maintenance:

```
maintenance_applied = min(
  maintenance_capacity.base_capacity,
  operational_heavy * 0.1 + degraded_heavy * 0.2
)

degradation_points_reduced = maintenance_applied * skilled_technicians 
  * spare_parts_availability
```

Routine maintenance:
- Prevents Operational → Degraded transitions
- Does not reverse Non-Operational status
- Reduces maintenance_deficit

#### 3.5.2 Major Repairs

Degraded or Non-Operational equipment may be repaired:

```
repair_capacity = maintenance_capacity.base_capacity * workshop_access

repair_cost_degraded = 3.0 maintenance_actions
repair_cost_non_operational = 10.0 maintenance_actions

// If sufficient capacity allocated:
degraded_heavy -= repaired_count
operational_heavy += repaired_count
```

Major repairs require:
- Formation not engaged in offensive operations
- Access to rear workshop facilities (workshop_access > 0.5)
- Adequate spare parts (spare_parts_availability > 0.6)

### 3.6 Combat Effectiveness Impact

#### 3.6.1 Effective Equipment Ratio

```
effective_equipment_ratio = 
  (operational_heavy + degraded_heavy * 0.5) / total_heavy
```

#### 3.6.2 Pressure Modification

```
pressure_equipment_modifier = 
  0.3 + (0.7 * effective_equipment_ratio)

final_pressure = base_pressure * pressure_equipment_modifier
```

Formations with mostly degraded or non-operational equipment generate significantly less pressure.

### 3.7 Integration with Other Systems

#### 3.7.1 Supply System

- spare_parts_availability is derived from supply corridor state
- Cut corridors reduce spare_parts_availability to 0.2
- Brittle corridors reduce to 0.6
- Open corridors allow 1.0

#### 3.7.2 Exhaustion System

High maintenance_deficit increases exhaustion:

```
exhaustion_equipment_component = maintenance_deficit * 0.01 per turn
```

#### 3.7.3 Arms Embargo (System 2)

- Heavy_equipment_access (System 2) determines replacement acquisition rate
- maintenance_capacity.external_support is modified by patron_state.material_support_level (System 1)

### 3.8 Faction Asymmetries

**VRS:**
- High initial operational_heavy (JNA inheritance)
- Moderate maintenance_capacity (skilled technicians from JNA)
- High spare_parts_availability initially, declining over time

**ARBiH:**
- Low initial operational_heavy
- Low maintenance_capacity (limited technical expertise)
- Very low spare_parts_availability (embargo effects)

**HVO:**
- Moderate initial operational_heavy
- Moderate maintenance_capacity
- Spare parts dependent on Croatian corridor status

### 3.9 Determinism and Auditability

- All degradation calculations are deterministic
- No randomness in state transitions
- Equipment state fully serializable
- Maintenance actions logged per turn

### 3.10 Design Constraints

- Equipment degradation is monotonic within conflict (no magical restoration)
- Maintenance can slow degradation but not eliminate it
- Trade-off between operational tempo and equipment sustainability
- Non-operational equipment represents permanent capability loss

### 3.11 Canonical Interpretation

Heavy equipment is a finite, degrading resource. Operational tempo accelerates wear, and maintenance capacity determines sustainability. Factions face trade-offs between preserving equipment for later and expending it in current operations. The lack of replacement capacity (due to embargo or production limits) makes equipment losses irreversible, narrowing strategic options over time.

---

# PART II: POLITICAL AND INSTITUTIONAL SYSTEMS

## System 4: Legitimacy System

### 4.1 System Overview

**Purpose:** Formalize legitimacy as distinct from political control and authority, representing the perceived rightfulness of governance and the voluntary compliance of the governed.

**Distinction:**
- **Political Control** = who governs (attributable exercise of authority)
- **Authority** = capacity to govern and extract compliance
- **Legitimacy** = perceived rightfulness and acceptance of governance

### 4.2 Conceptual Model

Legitimacy is a settlement-level attribute that affects:
- Recruitment efficiency
- Authority consolidation speed
- Resistance to opposing pressure
- Exhaustion accumulation in governed areas

Legitimacy is derived from:
- Demographic alignment (ethnicity match with controller)
- Pre-war institutional authority (municipal inheritance)
- Duration of stable control
- Coercion level (reduces legitimacy)
- Displacement and atrocity visibility (erodes legitimacy)

### 4.3 System State

#### 4.3.1 Settlement Legitimacy State

```javascript
legitimacy_state: {
  legitimacy_score: number,            // 0.0-1.0
  demographic_legitimacy: number,      // Base from demographics
  institutional_legitimacy: number,    // Pre-war authority inheritance
  coercion_penalty: number,            // Cumulative from coercive control
  stability_bonus: number,             // From duration of control
  last_control_change: turn_index
}
```

### 4.4 Legitimacy Calculation

#### 4.4.1 Demographic Legitimacy

```
demographic_legitimacy = settlement_population_fraction[controlling_faction]

// Example:
// Settlement 80% Bosniak, controlled by RBiH: demographic_legitimacy = 0.8
// Settlement 80% Bosniak, controlled by RS: demographic_legitimacy = 0.2
```

#### 4.4.2 Institutional Legitimacy

```
institutional_legitimacy = {
  1.0 if settlement.political_controller == settlement.municipality.pre_war_authority,
  0.6 if settlement.political_controller == settlement.pre_war_override_authority,
  0.3 otherwise
}
```

Settlements that retain pre-war governance structure have higher institutional legitimacy.

#### 4.4.3 Coercion Penalty

Coercive control accumulates penalty:

```
if (control_method == COERCIVE_PRESSURE_FLIP):
  coercion_penalty += 0.2

coercion_penalty decays slowly: -0.01 per turn if no additional coercion
```

#### 4.4.4 Stability Bonus

Duration of stable control increases legitimacy:

```
turns_since_control_change = current_turn - last_control_change

stability_bonus = min(0.3, turns_since_control_change * 0.01)

// Caps at +0.3 after 30 turns of stable control
```

#### 4.4.5 Final Legitimacy Score

```
legitimacy_score = 
  (demographic_legitimacy * 0.4) +
  (institutional_legitimacy * 0.3) +
  stability_bonus -
  coercion_penalty

// Bounded [0.0, 1.0]
```

### 4.5 Legitimacy Effects

#### 4.5.1 Recruitment Efficiency

```
recruitment_legitimacy_multiplier = 0.5 + (0.5 * legitimacy_score)

effective_recruitment_pool = base_pool * recruitment_legitimacy_multiplier
```

Low legitimacy reduces recruitment from that settlement's population.

#### 4.5.2 Authority Consolidation Speed

```
authority_consolidation_rate_modifier = 
  (legitimacy_score - 0.5) * 0.2

// High legitimacy (>0.5): faster consolidation
// Low legitimacy (<0.5): slower consolidation
```

#### 4.5.3 Resistance to Opposing Pressure

```
pressure_resistance_legitimacy = legitimacy_score * 5.0

// Added to settlement's base resistance to control flip
```

Settlements with high legitimacy are harder to flip through pressure.

#### 4.5.4 Exhaustion Modification

```
exhaustion_legitimacy_modifier = (1.0 - legitimacy_score) * 0.05

// Low legitimacy areas generate more exhaustion for controlling faction
```

Governing low-legitimacy areas is exhausting.

### 4.6 Legitimacy Erosion

Legitimacy erodes due to:

1. **Displacement:** `-0.1 legitimacy per 10% population displaced`
2. **Atrocity Visibility:** `-0.2 legitimacy for atrocity spikes in controlled area`
3. **Prolonged Supply Strain:** `-0.01 legitimacy per turn if supply is Critical`
4. **Authority Fragmentation:** `-0.15 legitimacy when MCZ fragments`
5. **Failed Promises:** `-0.05 legitimacy if control lost after consolidation`

### 4.7 Legitimacy Recovery

Legitimacy recovers slowly through:

1. **Stable Governance:** `+0.01 per turn if authority Consolidated and supply Adequate`
2. **Demographic Reinforcement:** `+0.05 if settlement receives refugees of matching ethnicity`
3. **Reduced Coercion:** `coercion_penalty decays at -0.01 per turn`

Legitimacy never fully recovers from deep erosion (<0.3) during conflict.

### 4.8 Integration with Existing Systems

#### 4.8.1 Political Control System

Political control determines who governs; legitimacy determines how effectively.

```
// A settlement may be controlled without legitimacy (occupation)
// A settlement may have legitimacy without control (authority in exile)
```

#### 4.8.2 Authority System

Authority consolidation requires both control and legitimacy:

```
if (legitimacy_score < 0.4):
  authority_state = max(authority_state, CONTESTED)
  // Cannot achieve Consolidated authority with low legitimacy
```

#### 4.8.3 Fragmentation System

Low legitimacy increases fragmentation risk:

```
fragmentation_legitimacy_modifier = (0.5 - legitimacy_score) * 0.1

// Applied to fragmentation threshold calculation
```

### 4.9 Faction Asymmetries

**RBiH:**
- High legitimacy in Bosniak-majority areas
- Low legitimacy in Serb- or Croat-majority areas
- Moderate institutional legitimacy (pre-war state authority)

**RS:**
- High legitimacy in Serb-majority areas
- Very low legitimacy in Bosniak- or Croat-majority areas
- Low institutional legitimacy (breakaway entity)

**HRHB:**
- High legitimacy in Croat-majority areas
- Low legitimacy elsewhere
- Low institutional legitimacy (sub-state entity)

### 4.10 Determinism and Auditability

- All legitimacy calculations are deterministic
- No randomness in legitimacy changes
- Legitimacy state fully serializable
- Legitimacy changes logged with causes

### 4.11 Design Constraints

- Legitimacy is gradual, not binary
- Legitimacy can exist without control (exiled authority)
- Control can exist without legitimacy (occupation)
- Legitimacy erosion is easier than legitimacy building
- Military success does not create legitimacy

### 4.12 Canonical Interpretation

Legitimacy represents the perceived rightfulness of governance. It is distinct from the fact of control (political_control) and the capacity to govern (authority). Military dominance may establish control but cannot create legitimacy. Governing without legitimacy is possible but exhausting and unstable. Legitimacy is historically and demographically grounded, eroded by coercion and displacement, and recovered only slowly through stable governance.

---

## System 5: Enclave Integrity System

### 5.1 System Overview

**Purpose:** Model the dynamics of besieged and isolated settlement clusters, tracking their degradation, humanitarian pressure, and strategic weight.

**Core Principle:** Enclaves are liabilities that generate disproportionate political and international pressure. Their integrity degrades deterministically under supply strain and isolation.

### 5.2 Conceptual Model

An **enclave** is a contiguous cluster of settlements controlled by a faction but completely surrounded by opposing or neutral territory.

Enclaves track:
- **Integrity** (0.0-1.0): Composite measure of supply, authority, population welfare
- **Humanitarian Pressure**: International visibility and intervention risk
- **Strategic Value**: Military importance vs. political cost

Enclave integrity degrades under sustained siege. Low integrity triggers cascading effects.

### 5.3 System State

#### 5.3.1 Enclave Definition

```javascript
enclave: {
  enclave_id: string,                  // Unique identifier
  controlling_faction: faction_id,
  besieging_factions: faction_id[],
  settlement_members: settlement_id[], // All settlements in enclave
  is_capital_enclave: boolean,         // Special (e.g., Sarajevo)
  enclave_integrity: number,           // 0.0-1.0
  siege_duration: number,              // Turns under siege
  humanitarian_pressure: number,       // 0.0-100.0+
  strategic_importance: number,        // Base importance weight
  last_supply_delivery: turn_index
}
```

#### 5.3.2 Integrity Components

```javascript
integrity_components: {
  supply_integrity: number,            // From supply corridor state
  authority_integrity: number,         // From MCZ authority state
  population_integrity: number,        // From population loss/displacement
  connectivity_integrity: number       // Internal enclave connectivity
}
```

### 5.4 Enclave Detection

Enclaves are detected dynamically each turn:

```
For each faction:
  1. Identify contiguous clusters of controlled settlements
  2. For each cluster, check if completely surrounded by non-friendly territory
  3. If surrounded, create or update enclave object
  4. Calculate enclave properties
```

#### 5.4.1 Enclave Boundary

An enclave boundary is the set of edges where:
- One node is enclave member (controlled by enclave faction)
- Adjacent node is controlled by opposing faction or null

If any boundary edge connects to friendly non-enclave territory, cluster is not an enclave (it's a salient).

### 5.5 Integrity Degradation

#### 5.5.1 Supply Integrity

```
supply_integrity = {
  1.0 if primary_corridor_state == OPEN,
  0.6 if primary_corridor_state == BRITTLE,
  0.2 if primary_corridor_state == CUT,
  0.0 if no external corridor and local_production < threshold
}

supply_integrity_decay = -0.05 per turn if supply_integrity < 0.4
```

#### 5.5.2 Authority Integrity

```
authority_integrity = mean(
  mcz.authority_score for mcz in enclave_settlements
)

// Authority score: Consolidated=1.0, Contested=0.5, Fragmented=0.2
```

If authority is Fragmented in any enclave settlement, authority_integrity capped at 0.5.

#### 5.5.3 Population Integrity

```
population_integrity = 
  current_population / initial_population

// Reduced by displacement, emigration, casualties
```

Population integrity decays irreversibly.

#### 5.5.4 Connectivity Integrity

```
connectivity_integrity = 
  (internal_reachable_settlements / total_enclave_settlements)

// If internal roads/paths are cut by degradation
```

### 5.6 Enclave Integrity Calculation

```
enclave_integrity = 
  (supply_integrity * 0.4) +
  (authority_integrity * 0.3) +
  (population_integrity * 0.2) +
  (connectivity_integrity * 0.1)

// Weighted by component importance
```

Integrity decay is monotonic under siege:
```
if (siege_duration > 4 AND enclave_integrity < 0.7):
  enclave_integrity -= 0.02 per turn
```

### 5.7 Humanitarian Pressure Accumulation

#### 5.7.1 Base Accumulation

```
humanitarian_pressure_per_turn = 
  (1.0 - enclave_integrity) * population_weight * visibility_multiplier

population_weight = enclave_population / 10000
visibility_multiplier = {
  3.0 if is_capital_enclave,
  2.0 if population > 50000,
  1.5 if population > 20000,
  1.0 otherwise
}
```

#### 5.7.2 Critical Threshold Effects

When enclave_integrity < 0.3:
- humanitarian_pressure += 5.0 per turn (critical conditions)
- Triggers international visibility spike (IVP System 1)
- Increases besieging faction diplomatic_isolation

When enclave_integrity < 0.15:
- humanitarian_pressure += 10.0 per turn (catastrophic conditions)
- Triggers narrative "humanitarian crisis" event
- Major diplomatic_isolation penalty for besieging faction

### 5.8 Strategic Value vs. Political Cost

#### 5.8.1 Strategic Value

```
strategic_value = 
  base_importance +
  (corridor_control_value if enclave blocks opposing corridor) +
  (symbolic_value if is_capital_enclave)
```

#### 5.8.2 Political Cost

```
political_cost = 
  humanitarian_pressure * diplomatic_sensitivity

diplomatic_sensitivity = {
  1.5 for RS (international scrutiny),
  1.0 for RBiH,
  1.2 for HRHB
}
```

#### 5.8.3 Net Enclave Burden

```
net_enclave_burden = political_cost - strategic_value

if (net_enclave_burden > threshold):
  // Enclave becomes negotiation liability
  negotiation_pressure_modifier += net_enclave_burden * 0.1
```

### 5.9 Enclave Collapse Conditions

Enclave collapses when:

1. **Integrity Collapse:** `enclave_integrity < 0.1` for 3+ consecutive turns
2. **Authority Failure:** All enclave MCZs reach Fragmented state
3. **Population Loss:** `population_integrity < 0.2` (mass exodus)
4. **Supply Cutoff:** `supply_integrity == 0.0` for 8+ turns

Collapse triggers:
- Automatic control flip to besieging faction (if single besieger)
- Automatic null control (if multiple besiegers)
- Large displacement event
- Major humanitarian_pressure spike
- Exhaustion spike for controlling faction

### 5.10 Special Enclave Rules

#### 5.10.1 Capital Enclaves (Sarajevo)

Capital enclaves have modified rules:
- integrity_floor = 0.15 (cannot collapse below this without special conditions)
- Integrity degradation rate halved (external support)
- humanitarian_pressure accumulates 3x faster
- Generates "siege_visibility" for IVP System 1

#### 5.10.2 Multi-Faction Enclaves

If an enclave contains settlements from allied factions (e.g., RBiH + HRHB in same pocket):
- integrity calculated per faction independently
- humanitarian_pressure shared
- Fragmentation risk increased (competing authorities)

### 5.11 Integration with Existing Systems

#### 5.11.1 Supply System

Enclaves receive supply through:
- External corridors (if any)
- Air supply (narrative, limited game effect)
- Local production (inadequate for siege)

Cut corridors to enclaves trigger rapid integrity decay.

#### 5.11.2 Exhaustion System

Controlling an enclave increases exhaustion:
```
exhaustion_enclave_burden = 
  (number_of_enclaves * 2.0) +
  (sum of (1.0 - enclave_integrity) per enclave) * 5.0

faction_exhaustion += exhaustion_enclave_burden per turn
```

#### 5.11.3 IVP System (System 1)

Enclave humanitarian pressure feeds into global IVP:
```
IVP.enclave_humanitarian_pressure = sum(
  enclave.humanitarian_pressure for all enclaves
)
```

### 5.12 Determinism and Auditability

- Enclave detection is deterministic (graph connectivity)
- Integrity calculations are deterministic
- No randomness in degradation or collapse
- All enclave state fully serializable

### 5.13 Design Constraints

- Enclaves are strategic liabilities, not assets
- Integrity degradation is monotonic under siege
- Humanitarian pressure is cumulative and visible
- No heroic relief or miraculous survival without supply

### 5.14 Canonical Interpretation

Enclaves represent isolated pockets of control under siege. They are politically costly, militarily vulnerable, and internationally visible. Enclave integrity degrades deterministically under supply strain, generating humanitarian pressure that increases diplomatic isolation for besieging factions. Maintaining enclaves is exhausting; allowing them to collapse is politically damaging. There are no good options for enclaves, only trade-offs.

---

## System 6: Sarajevo Exception Rules

### 6.1 System Overview

**Purpose:** Define special mechanics for Sarajevo due to its unique strategic, symbolic, and humanitarian significance.

**Rationale:** Sarajevo is not a typical settlement cluster. It is:
- The capital of Bosnia and Herzegovina
- The symbolic heart of the conflict
- The longest modern siege in history
- A major focus of international attention

Standard systems do not capture Sarajevo's exceptional dynamics.

### 6.2 Sarajevo Definition

Sarajevo is defined as:
- All settlements within Sarajevo municipality (post-split: Centar, Novi Grad, Novo Sarajevo, Stari Grad)
- May be treated as single macro-settlement or settlement cluster depending on context

Sarajevo state includes:
```javascript
sarajevo_state: {
  siege_status: enum,                  // NOT_BESIEGED, BESIEGED, PARTIALLY_BESIEGED
  siege_start_turn: number,
  external_supply_corridor_state: corridor_state,
  internal_connectivity_state: enum,   // INTACT, DEGRADED, SEVERED
  siege_intensity: number,             // 0.0-1.0
  international_focus: number,         // Media/diplomatic attention
  symbolic_exhaustion_multiplier: number
}
```

### 6.3 Sarajevo-Specific Mechanics

#### 6.3.1 Siege Status Determination

Sarajevo siege status is determined by connectivity:

```
siege_status = {
  NOT_BESIEGED if any external corridor is OPEN and internal connectivity INTACT,
  PARTIALLY_BESIEGED if external corridor BRITTLE or internal connectivity DEGRADED,
  BESIEGED if external corridor CUT and internal connectivity SEVERED
}
```

Siege status triggers different rule sets.

#### 6.3.2 Dual Supply Model

Unlike other settlements, Sarajevo tracks two supply systems:

1. **External Supply:** Via tunnels, air drops, limited ground corridors
2. **Internal Supply:** Internal resource distribution and local production

```
sarajevo_supply_state = max(
  external_supply_effectiveness * 0.7,
  internal_supply_capacity * 0.3
)
```

External supply can be minimal (0.2) but not zero due to tunnel/air supply.
Internal supply degrades over time under siege.

#### 6.3.3 Siege Intensity

Siege intensity increases exhaustion and humanitarian pressure:

```
siege_intensity = 
  (1.0 if siege_status == BESIEGED else 0.5) *
  (siege_duration / 20) *
  (1.0 - external_supply_effectiveness)

// Capped at 1.0
```

#### 6.3.4 Symbolic Exhaustion Multiplier

Controlling Sarajevo under siege increases RBiH exhaustion, but losing it would be catastrophic:

```
if (sarajevo_controlled_by == RBiH AND siege_status == BESIEGED):
  exhaustion_sarajevo = siege_intensity * 3.0 per turn
else if (sarajevo_controlled_by != RBiH):
  // Narrative end condition: RBiH effectively defeated
  RBiH_negotiation_position = COLLAPSED
```

Besieging Sarajevo increases RS exhaustion due to international pressure:

```
if (siege_status == BESIEGED):
  RS_exhaustion_sarajevo = siege_intensity * 2.0 per turn
  RS_diplomatic_isolation += 0.05 per turn
```

#### 6.3.5 International Focus

Sarajevo generates international attention disproportionate to its size:

```
international_focus = 
  base_sarajevo_importance +
  (siege_intensity * 10.0) +
  (humanitarian_pressure * 0.5)

// Feeds into IVP System 1: sarajevo_siege_visibility
```

### 6.4 Sarajevo Enclave Integrity

If Sarajevo is treated as an enclave (System 5):

- integrity_floor = 0.15 (cannot fully collapse)
- External support prevents complete supply cutoff
- Humanitarian pressure accumulation 3x normal rate
- Integrity degradation rate 0.5x normal rate (slower than typical enclave)

Sarajevo paradox: It degrades slower but generates more pressure.

### 6.5 Sarajevo in Negotiation

#### 6.5.1 Sarajevo Control Requirement

Any peace treaty must address Sarajevo control explicitly:

```
if (treaty.sarajevo_control_clause == undefined):
  treaty_acceptance = REJECTED
  rejection_reason = "sarajevo_unresolved"
```

Similar to BrÄko special status requirement.

#### 6.5.2 Sarajevo Valuation

Sarajevo territorial value in treaty acceptance:

```
sarajevo_territorial_value = {
  +50.0 for RBiH if retain control,
  -100.0 for RBiH if lose control,
  +30.0 for RS if gain control,
  -20.0 for RS if siege lifted without control
}
```

Losing Sarajevo is near-automatic treaty rejection for RBiH.

### 6.6 Integration with Existing Systems

#### 6.6.1 Supply System

Sarajevo supply uses dual-channel model instead of standard corridor-only model.

#### 6.6.2 IVP System

```
IVP.sarajevo_siege_visibility = sarajevo_state.international_focus
```

#### 6.6.3 Exhaustion System

Sarajevo generates exhaustion for both besieger and besieged based on siege intensity.

### 6.7 Determinism and Auditability

- All Sarajevo calculations are deterministic
- No special randomness for Sarajevo
- Siege status derived from connectivity state
- Sarajevo state fully serializable

### 6.8 Design Constraints

- Sarajevo is exceptional but not scripted
- Siege creates negative-sum exhaustion (both sides suffer)
- No automatic outcomes (neither guaranteed fall nor guaranteed hold)
- Humanitarian and international pressure are systemic, not narrative

### 6.9 Canonical Interpretation

Sarajevo is the symbolic and strategic heart of the conflict. The siege of Sarajevo generates exhaustion for both RBiH (defending under strain) and RS (besieging under international scrutiny). The city's fall would be a decisive RBiH defeat; its defense is costly but essential. Sarajevo's significance is modeled through amplified exhaustion, international pressure, and negotiation weight, not through special immunities or guaranteed outcomes.

---

# PART III: NEGOTIATION AND TREATY SYSTEMS

## System 7: Negotiation Capital and Territorial Valuation

### 7.1 System Overview

**Purpose:** Complete the negotiation and treaty acceptance system with explicit capital expenditure tracking, territorial valuation mechanics, and structural acceptance constraints.

**Current State:** Treaty offers exist; acceptance is computed. This system formalizes the underlying economic model.

### 7.2 Conceptual Model

Negotiation operates as a spending system:
- Each faction has **negotiation capital** (finite, derived from exhaustion and position)
- Treaty clauses have **costs** (territorial, institutional, symbolic)
- Acceptance requires: `capital_available >= capital_required`

Territorial valuation follows "liabilities are cheaper" principle:
- Controlling valuable, sustainable territory costs more to cede
- Controlling unsustainable, besieged, or low-legitimacy territory costs less to cede
- Gaining territory has value, but less than the cost to the ceding party

### 7.3 System State

#### 7.3.1 Faction Negotiation State

```javascript
negotiation_state: {
  negotiation_capital: number,         // Total available for spending
  negotiation_pressure: number,        // Urgency to settle
  territorial_value_held: number,      // Value of controlled territory
  territorial_liabilities: number,     // Cost of unsustainable holdings
  institutional_preferences: object,   // Competence valuations
  red_lines: string[],                 // Non-negotiable clauses
  last_offer_made: turn_index
}
```

#### 7.3.2 Treaty Clause Costs

```javascript
clause_costs: {
  transfer_settlements: {
    settlement_id: cost_to_cede,       // Per settlement transferred
  },
  recognize_control_settlements: {
    settlement_id: cost_to_recognize,  // Per settlement recognized
  },
  competence_allocations: {
    competence_id: cost_to_allocate,   // Per competence granted
  },
  brcko_special_status: fixed_cost,    // Required clause
  sarajevo_control_clause: fixed_cost  // Required clause
}
```

### 7.4 Negotiation Capital Calculation

#### 7.4.1 Base Capital from Exhaustion

```
base_capital = 100.0 - (faction_exhaustion * 0.5)

// Exhausted factions have less negotiating power
```

#### 7.4.2 Modifiers

```
capital_modifiers = {
  territorial_control_bonus: controlled_settlements_value * 0.1,
  external_pressure_penalty: -(IVP.negotiation_momentum * 10.0),
  patron_support_bonus: patron_commitment * 5.0,
  enclave_liability_penalty: -sum(enclave_political_costs),
  siege_pressure_penalty: -(sarajevo_siege_intensity * 5.0)
}

negotiation_capital = base_capital + sum(capital_modifiers)
```

### 7.5 Territorial Valuation

#### 7.5.1 Settlement Valuation Components

Each settlement has a base value to its controller:

```
settlement_base_value = 
  (population_size / 1000) +
  (strategic_corridor_importance * 2.0) +
  (symbolic_value if capital or major city) +
  (legitimacy_score * 3.0) +
  (economic_production_value)
```

#### 7.5.2 Liability Adjustment

Liabilities reduce value:

```
settlement_liability = 
  (1.0 - supply_integrity) * 2.0 +
  (1.0 - legitimacy_score) * 2.0 +
  (enclave_burden if in enclave) +
  (demographic_mismatch_penalty)

demographic_mismatch_penalty = {
  3.0 if demographic_opposition > 0.8,
  1.5 if demographic_opposition > 0.6,
  0.0 otherwise
}
```

#### 7.5.3 Net Territorial Value

```
net_settlement_value = max(0.5, settlement_base_value - settlement_liability)

// Minimum value 0.5 (no settlement is worthless, but liabilities reduce value)
```

#### 7.5.4 Liabilities Are Cheaper Principle

When calculating cost to cede:

```
cost_to_cede = net_settlement_value * ceding_multiplier

ceding_multiplier = {
  1.0 if net_settlement_value >= settlement_base_value * 0.8,
  0.7 if net_settlement_value >= settlement_base_value * 0.5,
  0.4 if net_settlement_value < settlement_base_value * 0.5
}

// Ceding liabilities costs less than ceding assets
```

When calculating value to gain:

```
value_to_gain = net_settlement_value * gaining_multiplier

gaining_multiplier = {
  0.8 for sustainable territory (legitimacy > 0.6, supply adequate),
  0.5 for contested territory,
  0.3 for liability territory
}

// Gaining territory is worth less than it costs opponent to cede
```

This asymmetry creates negotiation space: ceding a liability settlement costs 0.4x its base value, but gaining it is only worth 0.3x, so there is potential for positive-sum exchange (both sides benefit from transferring liabilities).

### 7.6 Treaty Acceptance Calculation

#### 7.6.1 Capital Expenditure

For a given treaty offer:

```
capital_required = 
  sum(cost_to_cede for each transferred_settlement) +
  sum(cost_to_recognize for each recognized_settlement) +
  sum(cost_to_allocate for each competence allocated) +
  brcko_cost +
  sarajevo_cost (if applicable)

capital_gained = 
  sum(value_to_gain for each received_settlement) +
  sum(value_of_recognition for each settlement recognized as yours) +
  sum(value_of_competence for each competence received)

net_capital_cost = capital_required - capital_gained
```

#### 7.6.2 Acceptance Decision

```
if (net_capital_cost > negotiation_capital):
  acceptance = REJECTED
  rejection_reason = "insufficient_capital"
else if (violates_red_line):
  acceptance = REJECTED
  rejection_reason = red_line violation
else if (missing_required_clause):
  acceptance = REJECTED
  rejection_reason = "required_clause_missing"
else:
  acceptance = ACCEPTED
```

### 7.7 Structural Acceptance Constraints

#### 7.7.1 Red Lines (Non-Negotiable)

Each faction has red lines that auto-reject treaties:

**RBiH Red Lines:**
- Losing Sarajevo control
- Recognizing RS sovereignty as independent state
- Allocating defence_policy to RS alone

**RS Red Lines:**
- Dissolving RS entity structure
- Losing Pale or Banja Luka
- Unified command under RBiH

**HRHB Red Lines:**
- No territorial continuity to Croatia
- No institutional recognition

Red lines are deterministic and pre-defined per faction.

#### 7.7.2 Required Clauses

Certain clauses are required for any peace treaty:
- `brcko_special_status` (must be explicitly addressed)
- `sarajevo_control_clause` (must assign control)

Omitting required clauses results in automatic rejection.

#### 7.7.3 Bundled Competences

Certain competences must be allocated together:
- `customs` + `indirect_taxation`
- `defence_policy` + `armed_forces_command`

Allocating one without the other results in automatic rejection with reason "bundled_competence_violation".

### 7.8 Competence Valuations

#### 7.8.1 Per-Faction Competence Values

Competences have different values to different factions:

```javascript
competence_valuations = {
  RBiH: {
    defence_policy: 20.0,
    international_representation: 15.0,
    currency_authority: 10.0,
    // ...
  },
  RS: {
    defence_policy: 25.0,
    police_internal_security: 15.0,
    education_policy: 10.0,
    // ...
  },
  HRHB: {
    education_policy: 15.0,
    police_internal_security: 12.0,
    health_policy: 8.0,
    // ...
  }
}
```

These valuations are static (tunable but fixed once set).

#### 7.8.2 Competence Allocation Costs

Allocating a competence to a faction costs the donor:

```
cost_to_allocate = competence_valuations[receiving_faction][competence_id]
```

Receiving a competence provides value:

```
value_of_competence = competence_valuations[receiving_faction][competence_id] * 0.8

// Value is less than cost, but factions value different competences differently
```

### 7.9 Dynamic Capital Adjustments

Negotiation capital changes over time:

```
capital_per_turn_change = 
  -(exhaustion_increase_rate * 0.5) +
  (negotiation_pressure * 0.1) +
  (IVP_momentum_effect)
```

As exhaustion increases, capital decreases (worse negotiating position).
As negotiation pressure increases, urgency increases (more willing to settle).

### 7.10 Offer Generation Constraints

AI-generated or player-generated treaty offers must respect:

1. **Capital Feasibility:** Offered treaty must be within offering faction's capital budget
2. **Structural Validity:** Must include required clauses, respect bundling rules
3. **Non-Absurdity:** Cannot offer to cede all territory or all competences
4. **Reciprocity:** Must offer something to receiving faction (net_capital_gain > 0)

### 7.11 Integration with Existing Systems

#### 7.11.1 Exhaustion System

Exhaustion reduces negotiation capital, making settlement more likely as war drags on.

#### 7.11.2 IVP System

IVP.negotiation_momentum reduces capital available (external pressure forces settlement).

#### 7.11.3 Enclave System

Enclave political costs reduce negotiation capital for controlling faction.

#### 7.11.4 Legitimacy System

Legitimacy affects territorial valuation (low legitimacy = lower settlement value).

### 7.12 Determinism and Auditability

- All valuation calculations are deterministic
- No randomness in acceptance decisions
- Treaty acceptance breakdown fully logged
- Capital expenditure auditable per turn

### 7.13 Design Constraints

- Negotiation is zero-sum in outcomes but can have positive-sum exchanges (trading liabilities)
- Capital is finite and decreases over time (urgency increases)
- No perfect deals exist; all treaties involve compromise
- Acceptance is computed, not guaranteed

### 7.14 Canonical Interpretation

Negotiation operates as a spending system where factions exchange territorial control and institutional competences within their capital budget. Territorial value reflects sustainability and legitimacy, not just size. Ceding liabilities is cheaper than ceding assets, creating space for mutually beneficial exchanges. External pressure and exhaustion reduce negotiating capacity over time, forcing eventual settlement. No treaty satisfies all parties; acceptance reflects constraint satisfaction, not preference satisfaction.

---

## System 8: Settlement-Brigade Assignment (AoR) Formalization

### 8.1 System Overview

**Purpose:** Formalize the rules for Area of Responsibility (AoR) assignment, clarifying when settlements require brigade assignment and the relationship between political control, AoR, and front activity.

**Current State:** Implied in code; not explicitly documented in Engine Invariants.

### 8.2 Conceptual Model

**AoR Rule:** Every **front-active** settlement must be assigned to exactly one brigade's Area of Responsibility.

**Political Control Rule:** Every settlement has political control (faction or null).

**Independence Principle:** Political control exists independently of AoR assignment.

### 8.3 Definitions

#### 8.3.1 Front-Active Settlement

A settlement is **front-active** if any of the following apply:

1. **Adjacent to Opposing Control:** Settlement is adjacent to a settlement controlled by an opposing faction
2. **Pressure Eligible:** Settlement is eligible to generate or receive pressure (edge-level pressure > threshold)
3. **Supply Contested:** Settlement is part of a contested or brittle corridor
4. **Enclave Member:** Settlement is part of an enclave (besieged or isolated)
5. **Authority Unstable:** Settlement's MCZ has authority state Contested or Fragmented

#### 8.3.2 Rear Political Control Zone

A settlement in a **Rear Political Control Zone** is:
- Politically controlled by a faction
- NOT front-active
- NOT assigned to any brigade AoR
- Stable by default

Rear zones represent secure interior territory with no military contestation.

### 8.4 AoR Assignment Rules

#### 8.4.1 Mandatory Assignment

```
if (settlement.is_front_active()):
  assert settlement.assigned_brigade != null
  // Violation if no brigade assigned
```

#### 8.4.2 Exclusive Assignment

```
for each settlement:
  assert len([brigade for brigade in faction.brigades 
              if settlement in brigade.aor]) <= 1
  // A settlement cannot be in multiple brigade AoRs
```

#### 8.4.3 Faction Constraint

```
if (settlement.assigned_brigade != null):
  assert settlement.assigned_brigade.faction == settlement.political_controller
  // Cannot assign opposing faction's brigade to controlled settlement
```

#### 8.4.4 Contiguity Preference (Not Required)

Brigade AoRs should be spatially contiguous where possible, but this is not a hard requirement.

Non-contiguous AoRs may occur due to:
- Enclaves
- Rapid front changes
- Fragmented control zones

### 8.5 AoR Assignment Process

#### 8.5.1 Initialization (Game Start)

At game start:
1. Determine political control for all settlements (deterministic)
2. Identify front-active settlements (based on adjacency and initial posture)
3. Assign front-active settlements to brigades

Initial AoR assignment may be pre-scripted or algorithmically generated (contiguous clustering).

#### 8.5.2 Dynamic Assignment (During War)

Each turn:
1. Detect settlements that transition to front-active (front expansion)
2. Assign newly front-active settlements to appropriate brigades
3. Detect settlements that transition to rear (front contraction)
4. Remove AoR assignment from rear settlements (optional, may retain)

Assignment priority:
- Adjacency to existing AoR (extend contiguous zone)
- Distance to brigade HQ (if modeled)
- Load balancing (avoid overloading single brigade)

### 8.6 AoR and Pressure Generation

#### 8.6.1 Pressure Eligibility

Only settlements with AoR assignment may generate pressure:

```
if (settlement.assigned_brigade == null):
  settlement.pressure_generation = 0.0
```

Rear settlements do not participate in pressure mechanics.

#### 8.6.2 AoR Boundaries

Front edges are determined by AoR boundaries where opposing factions meet:

```
front_edge = edge where:
  edge.node_A.assigned_brigade.faction != edge.node_B.assigned_brigade.faction
```

### 8.7 AoR and Authority

#### 8.7.1 Authority Consolidation

Authority consolidation in a settlement is influenced by:
- AoR assignment (presence of responsible brigade)
- Brigade posture (HOLDING or STATIC_DEFENSE aids consolidation)
- Duration of stable AoR assignment

```
authority_consolidation_aor_modifier = {
  +0.1 if assigned_brigade != null AND brigade_posture == HOLDING,
  +0.05 if assigned_brigade != null,
  0.0 if assigned_brigade == null
}
```

Rear settlements without AoR may still consolidate authority, but slower.

#### 8.7.2 Authority Collapse

If a settlement loses its assigned brigade (brigade destroyed or withdrawn):
- Settlement may transition from front-active to rear (if front recedes)
- OR settlement may be reassigned to another brigade
- OR settlement's authority may degrade (no responsible formation)

### 8.8 AoR and Control Change

#### 8.8.1 Control Flip Process

When a settlement's political control changes due to opposing pressure:

1. Settlement's current AoR assignment is removed
2. Settlement transitions to opposing faction's control
3. Settlement is assigned to opposing faction's brigade (if front-active)

Control flip without AoR reassignment is invalid:
```
if (settlement.political_controller changed):
  assert settlement.assigned_brigade == null OR 
         settlement.assigned_brigade.faction == settlement.political_controller
```

#### 8.8.2 Null Control

Settlements with null political control:
- May be front-active (contested by multiple factions)
- Are NOT assigned to any brigade AoR
- Generate no pressure
- Await capture by adjacent faction

### 8.9 Integration with Existing Systems

#### 8.9.1 Political Control (System 4, Engine Invariants §9)

Political control is initialized and maintained independently of AoR.

AoR is a military responsibility layer on top of political control.

#### 8.9.2 Formation System

Brigades track their AoR as a set of settlement IDs:

```javascript
brigade: {
  aor_settlements: settlement_id[],
  aor_boundary_edges: edge_id[],
  aor_size: number,
  aor_centroid: coordinate
}
```

#### 8.9.3 Front Detection (Engine Invariants §6)

Fronts emerge at AoR boundaries where opposing brigades meet.

### 8.10 Determinism and Auditability

- AoR assignment is deterministic
- No randomness in assignment decisions
- All AoR changes logged with reason
- AoR state fully serializable

### 8.11 Validation Rules

#### 8.11.1 Per-Turn Validation

```
validate_aor_assignment():
  for each settlement:
    if settlement.is_front_active():
      assert settlement.assigned_brigade != null
      assert settlement.assigned_brigade.faction == settlement.political_controller
    
  for each brigade:
    for each aor_settlement in brigade.aor_settlements:
      assert aor_settlement.political_controller == brigade.faction
```

#### 8.11.2 Enforcement

If validation fails:
- Log invariant violation
- Attempt automatic repair:
  - Assign unassigned front-active settlements to nearest brigade
  - Remove AoR assignments for non-front-active settlements
  - Correct faction mismatches

If repair fails, halt execution with structured error.

### 8.12 Design Constraints

- AoR is military responsibility, not ownership
- Political control precedes AoR assignment
- Rear settlements exist without AoR (not a gap, by design)
- AoR boundaries define fronts

### 8.13 Canonical Interpretation

Areas of Responsibility define which brigade is militarily responsible for a settlement. AoR assignment is mandatory for front-active settlements but unnecessary for secure rear areas. Political control exists independently; AoR is a layer of military accountability. The relationship between political control and AoR is one-directional: political control determines eligible assignees, but AoR does not determine control. Every front-active settlement must have a responsible brigade to generate pressure and contest enemy positions.

---

# PART IV: INTEGRATION AND IMPLEMENTATION NOTES

## Integration Summary

### System Dependencies

```
External Patron Pressure (1)
  ├─> Arms Embargo Asymmetry (2) [via material_support_level]
  ├─> Heavy Equipment (3) [via external_support]
  ├─> Negotiation Capital (7) [via IVP and diplomatic_isolation]
  └─> Enclave Integrity (5) [via humanitarian_pressure feed]

Arms Embargo Asymmetry (2)
  └─> Heavy Equipment (3) [determines acquisition rates]

Heavy Equipment (3)
  └─> Pressure generation [via equipment effectiveness modifiers]

Legitimacy (4)
  ├─> Authority consolidation [speeds or slows]
  ├─> Recruitment [efficiency multiplier]
  ├─> Exhaustion [low legitimacy increases exhaustion]
  └─> Territorial Valuation (7) [affects settlement values]

Enclave Integrity (5)
  ├─> IVP (1) [humanitarian pressure contribution]
  ├─> Exhaustion [enclave burden]
  ├─> Negotiation Capital (7) [enclave liabilities reduce capital]
  └─> Sarajevo Exception (6) [special enclave rules]

Sarajevo Exception (6)
  ├─> IVP (1) [siege visibility]
  ├─> Exhaustion [symbolic multiplier]
  └─> Negotiation Capital (7) [special valuation rules]

Negotiation Capital (7)
  ├─> Uses Exhaustion, IVP, Territorial Valuation
  └─> Determines treaty acceptance

AoR Assignment (8)
  ├─> Political Control [determines eligible brigades]
  ├─> Pressure generation [only AoR settlements generate pressure]
  └─> Authority [AoR presence aids consolidation]
```

### Implementation Phases

**Phase 1: Foundation Systems**
1. Legitimacy (4) — Extends political control, affects multiple downstream systems
2. AoR Assignment (8) — Formalizes existing implied rules

**Phase 2: External Pressure**
3. External Patron Pressure (1) — Framework for asymmetric constraints
4. Arms Embargo Asymmetry (2) — Builds on patron system

**Phase 3: Equipment and Sustainment**
5. Heavy Equipment (3) — Depends on embargo and patron systems

**Phase 4: Special Cases**
6. Enclave Integrity (5) — Uses legitimacy, feeds IVP
7. Sarajevo Exception (6) — Special enclave rules

**Phase 5: Negotiation Completion**
8. Negotiation Capital (7) — Uses legitimacy, enclaves, IVP, exhaustion

### Data Requirements

**New State Fields Required:**

```javascript
// Faction-level additions
faction_state: {
  patron_state: {...},                 // System 1
  embargo_profile: {...},              // System 2
  maintenance_capacity: {...},         // System 3
  negotiation_state: {...}             // System 7
}

// Formation-level additions
formation_state: {
  equipment_state: {...}               // System 3
}

// Settlement-level additions
settlement_state: {
  legitimacy_state: {...},             // System 4
  assigned_brigade: brigade_id         // System 8
}

// Global additions
global_state: {
  international_visibility_pressure: {...}, // System 1
  enclaves: [...],                     // System 5
  sarajevo_state: {...}                // System 6
}
```

### Tunable Parameters

All systems include tunable parameters (rates, thresholds, weights) that should be:
- Clearly documented
- Initialized with plausible defaults
- Subject to playtesting and historical validation
- Version-controlled

Example parameter sets:
- Patron commitment curves per faction per turn
- Embargo profile values per faction
- Equipment degradation rates
- Legitimacy component weights
- Territorial valuation formulas
- Competence valuation matrices

### Testing and Validation

**Unit Tests Required:**
- Legitimacy calculation from components
- Equipment degradation state transitions
- Enclave detection (connectivity)
- AoR assignment validation
- Negotiation capital calculation

**Integration Tests Required:**
- Patron pressure effects on exhaustion
- Arms embargo effects on force composition
- Equipment degradation effects on combat power
- Legitimacy effects on recruitment and authority
- Enclave integrity effects on IVP
- Treaty acceptance with complex clauses

**Historical Validation:**
- Sarajevo siege dynamics (duration, intensity, exhaustion)
- Enclave collapses (Srebrenica, Žepa, others)
- Arms flow asymmetries (VRS heavy equipment advantage)
- Diplomatic pressure timing (Contact Group, safe areas, etc.)

### Determinism Guarantees

All systems maintain determinism:
- No random number generation
- No timestamps in derived state
- Stable iteration ordering
- Reproducible from saved state
- Hash-trackable outputs

### Performance Considerations

**Expensive Operations:**
- Enclave detection (graph traversal, connectivity checks)
- AoR assignment (clustering algorithm)
- Treaty acceptance (valuation of all settlements)

**Optimization Strategies:**
- Cache enclave detection results (recompute only on control changes)
- Incremental AoR updates (not full reassignment every turn)
- Pre-compute territorial valuations per turn

### Documentation Requirements

**For Canon v4.0.0 Integration:**

1. **Engine Invariants v4.0.0** — Add:
   - Legitimacy invariants (distinct from control/authority)
   - AoR assignment invariants (mandatory for front-active)
   - Equipment degradation monotonicity
   - Enclave integrity degradation rules

2. **Systems Manual v4.0.0** — Add:
   - Complete system descriptions for all 8 systems
   - State field definitions
   - Calculation formulas
   - Integration points

3. **Game Bible v4.0.0** — Add:
   - Conceptual explanations of new systems
   - Design philosophy rationale
   - Player-facing implications

4. **Rulebook v4.0.0** — Add:
   - Player-understandable descriptions
   - Strategic implications
   - Visual examples

5. **Phase Specifications v4.0.0** — Add:
   - Turn-order integration for new systems
   - Phase execution conditions
   - Output contracts

---

# PART V: DESIGN RATIONALE AND CONSTRAINTS

## Why These Systems?

### Historical Accuracy

All systems are grounded in historical dynamics of the 1992-1995 Bosnian War:

- **External Patron Pressure:** Serbia's support for VRS, Croatia's support for HVO, international arms embargo, Contact Group pressure
- **Arms Embargo Asymmetry:** UN Resolution 713 affected factions differently
- **Heavy Equipment:** VRS inherited JNA tanks/artillery; ARBiH struggled with equipment shortages
- **Legitimacy:** Ethnic majority/minority dynamics, institutional authority
- **Enclaves:** Srebrenica, Žepa, Goražde, Bihać pocket
- **Sarajevo:** Longest siege of modern warfare (1992-1996)

### Negative-Sum Conflict

These systems reinforce the negative-sum nature of the conflict:

- Patron pressure reduces capital (no empowerment)
- Equipment degrades irreversibly (wasting assets)
- Low legitimacy is exhausting (occupation is costly)
- Enclaves drain resources (strategic liabilities)
- Sarajevo siege exhausts both sides (no winners)

### Educational Value

These systems demonstrate:

- Asymmetric warfare dynamics
- Costs of maintaining untenable positions
- Role of international actors as constraints
- Difference between military control and political legitimacy
- Why wars persist despite lack of victory prospects

## What These Systems Do NOT Do

### No Empowerment

- Patron support does not make factions stronger, only less constrained
- Equipment cannot be magically restored
- Legitimacy cannot be created by military success
- Enclaves cannot be heroically held indefinitely

### No Decisive Outcomes

- No system produces automatic victory or defeat
- All systems contribute to exhaustion and negotiation pressure
- Even Sarajevo's fall would not end the war mechanically (narrative weight, but not hard-coded win)

### No Player Omnipotence

- Cannot command patrons
- Cannot manufacture legitimacy
- Cannot prevent equipment degradation without trade-offs
- Cannot relieve enclaves without cost

### No Randomness

- All systems are deterministic
- Historical variability comes from initial conditions and interactions, not dice rolls

## Alignment with Design Principles

These systems align with core AWWV design principles:

1. **No Victory Condition:** All systems generate exhaustion and pressure toward negotiation, not decisive outcomes
2. **Negative-Sum Dynamics:** Resource degradation, exhaustion accumulation, liability burdens
3. **Constraint-Based Agency:** Players work within constraints (patron behavior, equipment limits, legitimacy deficits)
4. **Historical Grounding:** All systems reflect actual war dynamics
5. **Educational Focus:** Systems make visible the structural problems of the conflict
6. **Determinism:** No randomness, full auditability

---

# PART VI: OPEN QUESTIONS AND FUTURE WORK

## Open Questions for Review

1. **Legitimacy Component Weights:** Are the weights (0.4 demographic, 0.3 institutional, etc.) appropriate?
2. **Enclave Integrity Floor:** Should Sarajevo have a hard floor (0.15) or just slower degradation?
3. **Territorial Valuation Multipliers:** Are the ceding (0.4-1.0) and gaining (0.3-0.8) multipliers balanced?
4. **Patron Commitment Curves:** How should patron_commitment change over time for each faction?
5. **Equipment Degradation Rates:** What is a plausible base_degradation_rate (currently 0.02)?
6. **AoR Assignment Algorithm:** Should initial AoR be pre-scripted or algorithmically generated?

## Future Extensions (Out of Scope for v4.0.0)

1. **Population Displacement System:** Mentioned as future constraint in ChatGPT archives, but explicitly NOT implemented yet
2. **Multi-Faction Enclaves:** RBiH+HRHB cooperation in pockets
3. **Patron Shifts:** Dynamic patron behavior based on international events
4. **Legitimacy Recovery Programs:** Post-conflict mechanisms (out of war scope)
5. **Economic Production:** Local production capacity modeling (skeletal in current systems)

## Calibration and Tuning

All systems require:
- Parameter tuning through playtesting
- Historical validation against known scenarios
- Balance adjustments to prevent dominant strategies
- Sensitivity analysis (which parameters matter most?)

Recommended approach:
1. Implement with conservative default parameters
2. Run stress tests (Sarajevo siege, enclave collapses, offensive campaigns)
3. Tune parameters to match plausible historical ranges
4. Lock parameters as "calibration version X"

---

# APPENDIX A: State Schema Additions

## Complete State Schema Changes

```typescript
// Global State Additions
interface GlobalState {
  // Existing fields...
  
  // System 1: External Patron Pressure
  international_visibility_pressure: {
    sarajevo_siege_visibility: number;
    enclave_humanitarian_pressure: number;
    atrocity_visibility: number;
    negotiation_momentum: number;
    last_major_shift: number; // turn_index
  };
  
  // System 5: Enclave Tracking
  enclaves: Enclave[];
  
  // System 6: Sarajevo State
  sarajevo_state: SarajevoState;
}

// Faction State Additions
interface FactionState {
  // Existing fields...
  
  // System 1: Patron State
  patron_state: {
    material_support_level: number;
    diplomatic_isolation: number;
    constraint_severity: number;
    patron_commitment: number;
    last_updated: number;
  };
  
  // System 2: Embargo Profile
  embargo_profile: {
    heavy_equipment_access: number;
    ammunition_resupply_rate: number;
    maintenance_capacity_base: number;
    smuggling_efficiency: number;
    external_pipeline_status: number;
  };
  
  // System 3: Faction Maintenance
  maintenance_capacity: {
    base_capacity: number;
    skilled_technicians: number;
    spare_parts_availability: number;
    workshop_access: number;
    external_support: number;
  };
  
  // System 7: Negotiation State
  negotiation_state: {
    negotiation_capital: number;
    negotiation_pressure: number;
    territorial_value_held: number;
    territorial_liabilities: number;
    institutional_preferences: Record<string, number>;
    red_lines: string[];
    last_offer_made: number;
  };
}

// Formation State Additions
interface FormationState {
  // Existing fields...
  
  // System 3: Equipment State
  equipment_state: {
    operational_heavy: number;
    degraded_heavy: number;
    non_operational_heavy: number;
    total_heavy: number;
    maintenance_deficit: number;
    last_maintenance: number;
  };
}

// Settlement State Additions
interface SettlementState {
  // Existing fields...
  
  // System 4: Legitimacy
  legitimacy_state: {
    legitimacy_score: number;
    demographic_legitimacy: number;
    institutional_legitimacy: number;
    coercion_penalty: number;
    stability_bonus: number;
    last_control_change: number;
  };
  
  // System 8: AoR Assignment
  assigned_brigade: string | null; // brigade_id or null
}

// New Type: Enclave (System 5)
interface Enclave {
  enclave_id: string;
  controlling_faction: string;
  besieging_factions: string[];
  settlement_members: string[];
  is_capital_enclave: boolean;
  enclave_integrity: number;
  siege_duration: number;
  humanitarian_pressure: number;
  strategic_importance: number;
  last_supply_delivery: number;
  
  integrity_components: {
    supply_integrity: number;
    authority_integrity: number;
    population_integrity: number;
    connectivity_integrity: number;
  };
}

// New Type: Sarajevo State (System 6)
interface SarajevoState {
  siege_status: 'NOT_BESIEGED' | 'PARTIALLY_BESIEGED' | 'BESIEGED';
  siege_start_turn: number;
  external_supply_corridor_state: 'OPEN' | 'BRITTLE' | 'CUT';
  internal_connectivity_state: 'INTACT' | 'DEGRADED' | 'SEVERED';
  siege_intensity: number;
  international_focus: number;
  symbolic_exhaustion_multiplier: number;
}
```

---

# APPENDIX B: Tunable Parameter Tables

## System 1: External Patron Pressure

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `EXHAUSTION_DIPLOMATIC_MULTIPLIER` | 0.1 | 0.05-0.2 | Effect of diplomatic isolation on exhaustion |
| `NEGOTIATION_MOMENTUM_MULTIPLIER` | 0.05 | 0.02-0.1 | Effect of IVP momentum on exhaustion |
| `PATRON_COMMITMENT_RESISTANCE` | 0.05 | 0.0-0.1 | Exhaustion resistance from patron support |
| `SARAJEVO_VISIBILITY_RATE` | 0.5 | 0.3-1.0 | Visibility accumulation per turn under siege |
| `ENCLAVE_PRESSURE_WEIGHT` | 1.0 | 0.5-2.0 | Population weight scaling for humanitarian pressure |

## System 2: Arms Embargo Asymmetry

| Parameter | Faction | Value | Notes |
|-----------|---------|-------|-------|
| `heavy_equipment_access` | VRS | 0.9 | JNA inheritance |
| `heavy_equipment_access` | ARBiH | 0.2 | Embargo impact |
| `heavy_equipment_access` | HRHB | 0.6 | Croatian pipeline |
| `ammunition_resupply_rate` | VRS | 0.8 | Serbian support |
| `ammunition_resupply_rate` | ARBiH | 0.3 | Limited resupply |
| `ammunition_resupply_rate` | HRHB | 0.6 | Croatian support |
| `smuggling_efficiency_growth` | All | 0.0015/turn | Increases over time (caps at 1.0) |

## System 3: Heavy Equipment Maintenance

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `BASE_DEGRADATION_RATE` | 0.02 | 0.01-0.05 | Base per-turn degradation |
| `OPERATIONAL_TEMPO_OFFENSIVE` | 1.5 | 1.3-2.0 | Degradation multiplier for offensive operations |
| `OPERATIONAL_TEMPO_REFIT` | 0.3 | 0.1-0.5 | Degradation during refit |
| `DEGRADED_EFFECTIVENESS` | 0.5 | 0.3-0.7 | Combat effectiveness of degraded equipment |
| `REPAIR_COST_DEGRADED` | 3.0 | 2.0-5.0 | Maintenance actions to repair degraded unit |
| `REPAIR_COST_NON_OPERATIONAL` | 10.0 | 8.0-15.0 | Maintenance actions for non-operational unit |

## System 4: Legitimacy

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `DEMOGRAPHIC_WEIGHT` | 0.4 | 0.3-0.5 | Weight of demographic alignment |
| `INSTITUTIONAL_WEIGHT` | 0.3 | 0.2-0.4 | Weight of pre-war authority |
| `COERCION_PENALTY_INCREMENT` | 0.2 | 0.1-0.3 | Penalty per coercive control flip |
| `COERCION_DECAY_RATE` | 0.01 | 0.005-0.02 | Per-turn decay of coercion penalty |
| `STABILITY_BONUS_RATE` | 0.01 | 0.005-0.02 | Per-turn increase from stable control |
| `STABILITY_BONUS_CAP` | 0.3 | 0.2-0.5 | Maximum stability bonus |
| `RECRUITMENT_LEGITIMACY_MIN` | 0.5 | 0.3-0.6 | Minimum recruitment multiplier |

## System 5: Enclave Integrity

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `SUPPLY_INTEGRITY_WEIGHT` | 0.4 | 0.3-0.5 | Weight in integrity calculation |
| `AUTHORITY_INTEGRITY_WEIGHT` | 0.3 | 0.2-0.4 | Weight in integrity calculation |
| `POPULATION_INTEGRITY_WEIGHT` | 0.2 | 0.1-0.3 | Weight in integrity calculation |
| `CONNECTIVITY_INTEGRITY_WEIGHT` | 0.1 | 0.05-0.15 | Weight in integrity calculation |
| `INTEGRITY_DECAY_RATE` | 0.02 | 0.01-0.05 | Per-turn decay under siege |
| `HUMANITARIAN_PRESSURE_MULTIPLIER` | 1.0 | 0.5-2.0 | Base humanitarian pressure rate |
| `CAPITAL_ENCLAVE_VISIBILITY` | 3.0 | 2.0-5.0 | Visibility multiplier for capital enclaves |
| `INTEGRITY_COLLAPSE_THRESHOLD` | 0.1 | 0.05-0.2 | Threshold for enclave collapse |

## System 6: Sarajevo Exceptions

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `SARAJEVO_INTEGRITY_FLOOR` | 0.15 | 0.1-0.25 | Minimum integrity (external support) |
| `SARAJEVO_DEGRADATION_RATE` | 0.5 | 0.3-0.8 | Multiplier (slower than normal enclaves) |
| `SARAJEVO_PRESSURE_MULTIPLIER` | 3.0 | 2.0-5.0 | Humanitarian pressure amplification |
| `SARAJEVO_EXHAUSTION_RBIH` | 3.0 | 2.0-5.0 | Exhaustion per turn when besieged |
| `SARAJEVO_EXHAUSTION_RS` | 2.0 | 1.0-3.0 | Exhaustion per turn when besieging |
| `SARAJEVO_ISOLATION_RATE` | 0.05 | 0.02-0.1 | Diplomatic isolation increase for RS |

## System 7: Negotiation Capital

| Parameter | Default Value | Range | Notes |
|-----------|--------------|-------|-------|
| `BASE_CAPITAL` | 100.0 | 50.0-150.0 | Starting negotiation capital |
| `EXHAUSTION_CAPITAL_MULTIPLIER` | 0.5 | 0.3-0.8 | Capital reduction per exhaustion point |
| `TERRITORIAL_CONTROL_BONUS` | 0.1 | 0.05-0.2 | Bonus per settlement value controlled |
| `IVP_MOMENTUM_PENALTY` | 10.0 | 5.0-20.0 | Capital reduction from IVP |
| `PATRON_COMMITMENT_BONUS` | 5.0 | 2.0-10.0 | Capital increase from patron support |
| `CEDING_MULTIPLIER_HIGH` | 1.0 | 0.8-1.0 | Cost multiplier for high-value territory |
| `CEDING_MULTIPLIER_LOW` | 0.4 | 0.2-0.6 | Cost multiplier for liability territory |
| `GAINING_MULTIPLIER_HIGH` | 0.8 | 0.6-1.0 | Value multiplier for sustainable gains |
| `GAINING_MULTIPLIER_LOW` | 0.3 | 0.2-0.5 | Value multiplier for liability gains |

---

# APPENDIX C: Historical Validation Scenarios

## Scenario 1: Sarajevo Siege (1992-1995)

**Historical Facts:**
- Siege duration: ~1,425 days (47.5 turns at 1 week = 1 turn)
- RBiH controlled Sarajevo throughout
- RS besieged from surrounding hills
- Tunnel provided limited supply
- International attention extremely high
- Neither side achieved decisive outcome

**Expected System Behavior:**
- Sarajevo enclave integrity degrades to ~0.3-0.4 (not collapse)
- RBiH exhaustion increases by ~140 points over siege (3.0/turn * 47 turns)
- RS exhaustion increases by ~95 points over siege (2.0/turn * 47 turns)
- IVP sarajevo_siege_visibility reaches very high levels (>20)
- RS diplomatic_isolation increases significantly (>0.7)
- Neither side achieves control flip

## Scenario 2: Srebrenica Enclave Collapse (1995)

**Historical Facts:**
- Enclave besieged for ~3 years
- Population ~40,000 (1993 peak)
- Supply corridors cut repeatedly
- Fell to VRS in July 1995
- Triggered massive international response

**Expected System Behavior:**
- Enclave integrity degrades to <0.1 over ~150 turns
- Humanitarian pressure accumulates significantly (>50)
- Population integrity drops sharply (displacement >50%)
- Eventually crosses collapse threshold
- Control flips to RS
- Major IVP atrocity_visibility spike
- RS diplomatic_isolation increases sharply

## Scenario 3: VRS Heavy Equipment Advantage (1992-1994)

**Historical Facts:**
- VRS inherited JNA tanks, artillery
- ARBiH struggled with equipment shortages
- VRS maintained artillery advantage throughout war
- Equipment degraded over time without replacement

**Expected System Behavior:**
- VRS heavy_equipment_access = 0.9 (high initial)
- ARBiH heavy_equipment_access = 0.2 (low initial)
- VRS equipment degrades from ~90% operational to ~50% operational over 2 years
- ARBiH acquires limited equipment through smuggling (0.2 → 0.35 over 2 years)
- VRS pressure generation remains higher due to equipment advantage
- Neither side achieves equipment parity

## Scenario 4: Washington Agreement (1994)

**Historical Facts:**
- RBiH-HRHB war ended March 1994
- External pressure (US, Contact Group) major factor
- Neither side militarily defeated
- Competences allocated in federation structure

**Expected System Behavior:**
- Negotiation pressure increases for both RBiH and HRHB
- IVP negotiation_momentum increases (external push)
- Negotiation capital sufficient for both sides to accept federation
- Territorial valuation makes some exchanges positive-sum (trading liabilities)
- Competence allocations follow bundle rules
- Treaty acceptance calculated as feasible

---

# APPENDIX D: Implementation Checklist

## Phase 1: Foundation Systems

- [ ] System 4: Legitimacy
  - [ ] Add `legitimacy_state` to settlement schema
  - [ ] Implement legitimacy calculation (demographic, institutional, coercion, stability)
  - [ ] Implement legitimacy effects (recruitment, authority, exhaustion)
  - [ ] Add legitimacy erosion mechanics (displacement, atrocities, supply strain)
  - [ ] Add legitimacy recovery mechanics (stable governance)
  - [ ] Unit tests for legitimacy calculation
  - [ ] Integration tests with recruitment, authority, exhaustion

- [ ] System 8: AoR Assignment
  - [ ] Add `assigned_brigade` to settlement schema
  - [ ] Implement front-active detection
  - [ ] Implement AoR assignment algorithm
  - [ ] Implement AoR validation (mandatory for front-active, exclusive, faction-aligned)
  - [ ] Add AoR enforcement on control flip
  - [ ] Unit tests for front-active detection, assignment algorithm
  - [ ] Integration tests with pressure generation, authority

## Phase 2: External Pressure

- [ ] System 1: External Patron Pressure
  - [ ] Add `patron_state` to faction schema
  - [ ] Add `international_visibility_pressure` to global schema
  - [ ] Implement patron support calculation (material, diplomatic, constraints)
  - [ ] Implement IVP accumulation (Sarajevo, enclaves, atrocities)
  - [ ] Implement patron commitment dynamics
  - [ ] Add patron effects on exhaustion, negotiation, supply
  - [ ] Unit tests for patron calculations, IVP accumulation
  - [ ] Integration tests with exhaustion, negotiation systems

- [ ] System 2: Arms Embargo Asymmetry
  - [ ] Add `embargo_profile` to faction schema
  - [ ] Initialize faction-specific embargo profiles
  - [ ] Implement force composition effects (equipment ceilings)
  - [ ] Implement combat effectiveness modifiers
  - [ ] Implement ammunition constraints
  - [ ] Implement smuggling efficiency progression
  - [ ] Implement external pipeline status effects
  - [ ] Unit tests for embargo effects calculation
  - [ ] Integration tests with heavy equipment system

## Phase 3: Equipment and Sustainment

- [ ] System 3: Heavy Equipment and Maintenance
  - [ ] Add `equipment_state` to formation schema
  - [ ] Add `maintenance_capacity` to faction schema
  - [ ] Implement operational tempo calculation
  - [ ] Implement degradation accumulation
  - [ ] Implement state transitions (Operational → Degraded → Non-Operational)
  - [ ] Implement routine maintenance
  - [ ] Implement major repairs
  - [ ] Implement combat effectiveness impact
  - [ ] Unit tests for degradation, maintenance, repairs
  - [ ] Integration tests with supply, exhaustion, pressure systems

## Phase 4: Special Cases

- [ ] System 5: Enclave Integrity
  - [ ] Add `enclaves` array to global schema
  - [ ] Define `Enclave` type
  - [ ] Implement enclave detection (connectivity-based)
  - [ ] Implement integrity calculation (supply, authority, population, connectivity)
  - [ ] Implement integrity degradation
  - [ ] Implement humanitarian pressure accumulation
  - [ ] Implement strategic value vs. political cost
  - [ ] Implement enclave collapse conditions
  - [ ] Unit tests for enclave detection, integrity calculation, collapse
  - [ ] Integration tests with IVP, exhaustion, supply systems

- [ ] System 6: Sarajevo Exception Rules
  - [ ] Add `sarajevo_state` to global schema
  - [ ] Define `SarajevoState` type
  - [ ] Implement Sarajevo identification (settlements in Sarajevo municipalities)
  - [ ] Implement siege status determination
  - [ ] Implement dual supply model
  - [ ] Implement siege intensity calculation
  - [ ] Implement symbolic exhaustion multipliers
  - [ ] Implement international focus calculation
  - [ ] Implement Sarajevo negotiation requirements
  - [ ] Unit tests for siege status, intensity, effects
  - [ ] Integration tests with enclave, IVP, exhaustion, negotiation systems

## Phase 5: Negotiation Completion

- [ ] System 7: Negotiation Capital and Territorial Valuation
  - [ ] Add `negotiation_state` to faction schema
  - [ ] Implement negotiation capital calculation (base + modifiers)
  - [ ] Implement territorial valuation (base value, liabilities, net value)
  - [ ] Implement "liabilities are cheaper" mechanics
  - [ ] Implement treaty clause cost calculation
  - [ ] Implement capital expenditure and acceptance decision
  - [ ] Implement structural acceptance constraints (red lines, required clauses, bundles)
  - [ ] Implement competence valuations (per-faction)
  - [ ] Implement dynamic capital adjustments
  - [ ] Unit tests for capital calculation, territorial valuation, acceptance decision
  - [ ] Integration tests with exhaustion, IVP, legitimacy, enclave systems

## Cross-Cutting Tasks

- [ ] Update serialization to include all new state fields
- [ ] Update validation to check all new invariants
- [ ] Add structured logging for all new systems
- [ ] Update UI to display new state (legitimacy, equipment, enclaves, etc.)
- [ ] Create parameter configuration files (JSON) for tunables
- [ ] Write integration tests for system interactions
- [ ] Run historical validation scenarios
- [ ] Update all canon documents (Engine Invariants, Systems Manual, Game Bible, Rulebook)

---

# CONCLUSION

This document provides complete specifications for eight systems identified as missing or under-specified in the GAP_AND_RECOVERY_REPORT. All systems are:

- Historically grounded
- Deterministic and auditable
- Integrated with existing canon
- Aligned with negative-sum design principles
- Ready for implementation and testing

The systems collectively address:
- External actor influence (patrons, embargo, IVP)
- Equipment sustainability (degradation, maintenance)
- Political dynamics (legitimacy, AoR)
- Special cases (enclaves, Sarajevo)
- Negotiation mechanics (capital, valuation, acceptance)

Next steps:
1. **Review and approve** — Validate system designs against historical sources and design philosophy
2. **Parameter tuning** — Establish default parameter values for all systems
3. **Implementation** — Follow phased implementation checklist
4. **Testing** — Run unit, integration, and historical validation tests
5. **Canon integration** — Update all v4.0.0 documents with new systems
6. **Calibration** — Tune parameters based on playtesting and historical scenarios

**End of Document**
