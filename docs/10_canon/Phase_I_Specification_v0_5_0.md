# Phase I Specification v0.5.0
## Early-War Phase: Organizational Conflict and Control Establishment

**Status:** Canon (consolidated v0.3 + v0.4)
**Canon Version:** v0.5.0
**Freeze Date:** 2026-02-02
**Supersedes:** v0.3.0, v0.4.0 (consolidated)

---

## 1. Purpose

Phase I (Early-War) models the critical opening period of the Bosnian War (approximately March-June 1992) when:

1. **Declarations trigger war**: RS and/or HRHB declarations activate wartime mechanics
2. **Militia emerge**: Organizational penetration converts to armed formations
3. **Control flips occur**: Political control changes via Stability + Pressure mechanism
4. **Authority degrades**: Central RBiH government loses control over territory
5. **Control Strain begins**: Occupying hostile populations imposes costs
6. **Rear zones stabilize**: Non-frontline control becomes default political substrate

Phase I is the transition from latent organizational competition (Phase 0) to territorial consolidation and military operations. It ends when control patterns stabilize sufficiently for formal brigade Areas of Responsibility (AoRs) to be instantiated.

Phase I turn 1 begins immediately after Phase 0 completes. Any declaration occurring during Phase 0 is treated as having occurred at Phase I turn 0 for the purposes of consolidation timers, strain ramps, and persistence counters.

**Design Principle:** Phase I uses **organizational mechanics** (militia, police, paramilitaries) rather than formal military formations. Brigades exist on paper but do not have AoRs. Control flips are contested but consolidation periods prevent immediate reversals.

---

## 2. Conceptual Definition

### 2.1 What Phase I Is

Phase I represents the **violent crystallization of latent ethnic-territorial ambitions** into concrete control patterns. It is characterized by:

- **Militia-Based Operations**: Armed groups organized from TO, police, paramilitaries, and SDS/SDA/HDZ networks
- **Snap Control Changes**: Sudden control flips driven by organizational advantage + applied pressure
- **Post-Flip Consolidation**: Locked periods preventing immediate reversals
- **Displacement Initiation**: Hostile populations begin fleeing or being expelled
- **JNA Transition**: Federal army withdraws while transferring assets to RS
- **Authority Collapse**: RBiH central government loses effective control over municipalities
- **Alliance Strain**: RBiH-HRHB cooperation degrades under territorial competition

### 2.2 What Phase I Is NOT

Phase I does **not** include:

- **Brigade AoRs**: Formal territorial assignments do not exist yet
- **Frontline Operations**: No continuous front with defensive lines
- **Command Hierarchy Mechanics**: Corps/OG coordination not yet active
- **Sustained Offensives**: No multi-turn offensive operations
- **Pre-Negotiation Diplomacy**: Peace talks do not begin in Phase I
- **International Intervention**: UNPROFOR deployment occurs later

---

## 3. Canonical Inputs

Phase I receives the following from Phase 0 (Pre-War):

```yaml
phase_0_outputs:
  stability_scores:
    type: Map<MunicipalityID, StabilityScore>
    domain: [0, 100]
    description: "Initial stability for each municipality based on Phase 0 organizational investments"

  organizational_penetration:
    type: Map<MunicipalityID, Map<Faction, OrganizationalStrength>>
    components:
      - police_loyalty: [0.0, 1.0]
      - TO_control: [0.0, 1.0]
      - party_penetration: [0.0, 1.0]
      - paramilitary_presence: [0.0, 1.0]
    description: "Organizational strength for each faction in each municipality"

  declarations:
    RS_declared: boolean
    HRHB_declared: boolean
    RS_declaration_turn: integer | null
    HRHB_declaration_turn: integer | null
    description: "Whether declarations occurred and when"

  alliance_state:
    RBiH_HRHB_relationship: [-1.0, +1.0]
    description: "Alliance quality between RBiH and HRHB at war start"

  authority_state:
    RBiH_central_authority: [0.0, 1.0]
    RS_authority: [0.0, 1.0]
    HRHB_authority: [0.0, 1.0]
    description: "Authority scores at Phase 0 conclusion"

  JNA_status:
    transition_begun: boolean
    withdrawal_progress: [0.0, 1.0]
    asset_transfer_RS: [0.0, 1.0]
    description: "JNA withdrawal and asset transfer state"
```

For the purposes of political control invariants, militia pressure applied during Phase I constitutes sustained opposing military pressure.

---

## 4. Phase I Systems

### 4.1 Declaration Effects System

**Purpose:** Activate wartime mechanics when RS and/or HRHB declare independence/autonomy.

#### 4.1.1 RS Declaration Effects

When RS declares (Phase 0 or Phase I):

```yaml
RS_declaration_effects:
  immediate:
    - Enable RS militia emergence
    - Activate JNA → VRS asset transfer
    - Lock RS-controlled municipalities (cannot flip to RBiH for 4 turns)
    - RBiH_central_authority -= 0.15
    - International_legitimacy_RS = 0.20
    - FRY_support_RS = 1.0

  ongoing:
    - RS militia emerge at +2 strength per turn in RS-majority municipalities
    - JNA assets transfer at 5% per turn
    - All Serb-majority municipalities: stability += 10 (declaration legitimacy boost)
    - All Bosniak-majority municipalities: stability -= 10 (perceived threat)
```

#### 4.1.2 HRHB Declaration Effects

When HRHB declares (Phase 0 or Phase I):

```yaml
HRHB_declaration_effects:
  immediate:
    - Enable HRHB militia emergence
    - Activate Croatian military support
    - Lock HRHB-controlled municipalities (cannot flip to RBiH for 3 turns)
    - RBiH_HRHB_relationship -= 0.25
    - RBiH_central_authority -= 0.10
    - International_legitimacy_HRHB = 0.15
    - Croatian_support_HRHB = 0.80

  ongoing:
    - HRHB militia emerge at +1.5 strength per turn in Croat-majority municipalities
    - Croatian weapons/advisors arrive (+10% HRHB combat effectiveness)
    - All Croat-majority municipalities: stability += 8
    - RBiH_HRHB_relationship -= 0.02 per turn (continued degradation)
```

#### 4.1.3 War Activation

War begins when:
- **RS declares**, OR
- **HRHB declares**, OR
- **Any control flip occurs via force**

Upon war activation:
```yaml
war_activation_effects:
  - Enable Control Flip System
  - Enable Militia Emergence System
  - Enable Control Strain System
  - Enable Displacement System
  - Freeze Phase 0 organizational investments (no longer available)
  - Begin Phase I turn counter
```

---

### 4.2 Militia Emergence System

**Purpose:** Convert organizational penetration into armed formations.

#### 4.2.1 Militia Strength Formula

For each municipality, each faction:

```
Militia Strength = ( Police_Loyalty × 15
                   + TO_Control × 20
                   + Party_Penetration × 10
                   + Paramilitary_Presence × 25 )
                   × Declaration_Multiplier
                   × Demographic_Support_Factor
```

**Declaration Multiplier:**
- Own faction declared: 1.5
- Own faction not declared: 1.0

**Demographic Support Factor:**
- Municipality majority matches faction: 1.0
- Municipality plurality matches faction: 0.7
- Municipality minority: 0.4

**Bounds:** Militia Strength ∈ [0, 100]

#### 4.2.2 Militia Capabilities

Militia units can:
- **Apply Pressure** to adjacent municipalities (see §4.3)
- **Defend** against pressure from adjacent militias
- **Consolidate** control in post-flip municipalities

Militia units **cannot:**
- Conduct sustained offensives (requires Phase II brigades)
- Operate more than 1 settlement away from base municipality
- Coordinate across corps/OG structures (no command hierarchy yet)

#### 4.2.3 Militia Emergence Rate

Militia strength increases over Phase I at:

```
Militia Growth per Turn = Base_Organizational_Strength × 0.10
                        + Declaration_Bonus
                        + External_Support_Bonus
```

**Declaration Bonus:**
- RS declared: +2 strength/turn for RS militia in Serb-majority municipalities
- HRHB declared: +1.5 strength/turn for HRHB militia in Croat-majority municipalities

**External Support Bonus:**
- RS with JNA support: +1 strength/turn
- HRHB with Croatian support: +0.8 strength/turn

**Implementation-note (recruitment mode):** Scenario may set `recruitment_mode` to `"player_choice"` (three-resource brigade activation at Phase I entry) or `"auto_oob"` (legacy OOB auto-spawn when `init_formations_oob: true`). See `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10 and `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §2.

**Implementation-note (pool and penetration calibration 2026-02-15):** April 1992 scenario force levels use POOL_SCALE_FACTOR 55, organizational penetration seeds (party 85, paramilitary 60), and FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60); mandatory brigade spawn minimum 200. See `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §2.

---

### 4.3 Control Flip System

**Purpose:** Model sudden control changes based on organizational advantage and applied pressure.

#### 4.3.1 Flip Eligibility

A municipality is **flip-eligible** if:

1. **War is active** (at least one declaration OR one flip has occurred)
2. **Not in consolidation period** (see §4.3.5)
3. **Adjacent to hostile control** (share border with enemy-controlled municipality)
4. **Controlling faction has militia strength < 40** in the municipality

#### 4.3.2 Stability Score Dynamics

**Stability Score** represents resistance to control change. In Phase I:

```
Current Stability = Base Stability (from Phase 0)
                  + Militia_Defense_Bonus
                  - Applied_Pressure_Penalty
                  - Geographic_Vulnerability_Penalty
```

**Militia Defense Bonus:**
```
Militia_Defense_Bonus = Controlling_Faction_Militia_Strength × 0.15
```

**Applied Pressure Penalty:**
- Adjacent hostile municipality with militia ≥ 60: -30 stability
- Adjacent hostile municipality with militia 40-59: -20 stability
- Adjacent hostile municipality with militia 20-39: -10 stability
- Per adjacent hostile municipality (cumulative)

**Geographic Vulnerability Penalty:**
- Enclave (no friendly adjacent): -25 stability
- Isolated (only 1 friendly adjacent): -15 stability
- On strategic route (Brčko, Posavina, Drina valley): -10 stability

#### 4.3.3 Control Flip Trigger

A municipality **flips** when:

```
Current Stability + Defensive Militia Strength
    < 50 + (Attacking Militia Strength × 0.80)
```

**Interpretation:** Flip occurs when defense is overwhelmed by combination of low stability and strong adjacent militia pressure.

#### 4.3.4 Flip Resolution

Upon flip:

```yaml
flip_resolution:
  control_change:
    - Political control transfers to attacking faction
    - New stability = 100 (post-flip lockdown)
    - Militia strength of new controller = 100% in municipality
    - Militia strength of prior controller = 0

  consolidation_period:
    - Municipality locked for N turns (see §4.3.5)
    - Cannot flip back during consolidation
    - Stability cannot drop below 60 during consolidation

  displacement_trigger:
    - Begin displacement sequence (see §4.4)
    - Hostile population starts fleeing
    - Control Strain accumulates

  adjacent_effects:
    - All adjacent municipalities same ethnicity as lost control: stability -= 10 (panic)
    - All adjacent municipalities same ethnicity as gained control: stability += 5 (momentum)
```

#### 4.3.5 Consolidation Periods

After a flip, the municipality enters a **consolidation period** during which it cannot flip again:

```
Consolidation Duration = Base_Duration (4 turns)
                       + Demographic_Penalty
                       + Geographic_Penalty
```

**Demographic Penalty:**
- Hostile majority (>60%): +3 turns
- Hostile plurality (40-60%): +2 turns
- Mixed (<40% any group): +1 turn
- Friendly majority: +0 turns

**Geographic Penalty:**
- Enclave or isolated: +2 turns
- On strategic route: +1 turn

**During Consolidation:**
- Stability cannot drop below 60
- Pressure can be applied but does not trigger flips
- Militia strength growth doubled for controlling faction

#### 4.3.6 Settlement-level resolution

When municipality authority shifts (control flip), **settlement-level resolution** applies: settlements with attacker ethnic share ≥ threshold (e.g. 30%) flip immediately; hostile-majority settlements may become **holdouts**. Holdouts are cleared by formation cleanup (e.g. 1–2 per brigade per turn) and **isolation surrender** (e.g. after 4 turns isolated). **Brigade amplification:** brigades in adjacent municipalities may amplify Phase I attack strength (e.g. 0.5× multiplier). State: settlement_holdouts. Constants and formulas in implementation and in docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §8. Implementation: src/sim/phase_i/settlement_control.ts.

---

### 4.4 Displacement System

**Purpose:** Model population flight and expulsion following control flips.

#### 4.4.1 Displacement Trigger

Displacement begins immediately upon control flip if:

```
Hostile_Population_Share > 0.30
```

**Hostile Population:** Population ethnicity not matching new controlling faction.

#### 4.4.2 Displacement Rate

```
Population Displaced per Turn = Hostile_Population
                               × Displacement_Rate_Factor
```

**Displacement Rate Factor:**

```
Factor = Base_Rate (0.15)
       + Violence_Modifier
       + Enclave_Modifier
```

**Violence Modifier:**
- Active combat in adjacent municipalities: +0.10
- Active combat in this municipality: +0.20
- Atrocity reported: +0.30 (one-time spike)

**Enclave Modifier:**
- Enclave or isolated: +0.15 (no escape routes = faster collapse)

#### 4.4.3 Displacement Destinations

Displaced population flows to:

1. **Adjacent friendly-controlled municipalities** (70% of displaced)
2. **Distant friendly enclaves** (20% of displaced)
3. **Refugee camps / out of play** (10% of displaced)

**Receiving Municipality Effects:**
```yaml
receiving_effects:
  - Stability -= (Incoming_Population / Receiving_Population) × 10
  - Control_Strain += (Incoming_Population / Receiving_Population) × 5
  - Resource_burden += incoming population × 0.5
```

#### 4.4.4 Displacement Completion

Displacement continues until:

```
Hostile_Population_Share < 0.10
```

At completion:
- Municipality becomes ethnically homogenized
- Stability += 15 (homogenization bonus)
- Consolidation period ends (if not already ended)
- Control Strain from this municipality freezes

---

### 4.5 Control Strain System

**Purpose:** Accumulate the burden of holding hostile populations via coercion.

#### 4.5.1 Control Strain Accumulation

Control Strain begins accumulating upon first control flip. For each municipality each turn:

```
Control Strain Increment = Hostile_Population_Absolute
                         × Demographic_Hostility_Factor
                         × Authority_Multiplier
                         × Control_Method_Multiplier
                         × Phase_I_Time_Factor
```

**Hostile Population (Absolute):**
- Number of people (in thousands) of non-controlling ethnicity

**Demographic Hostility Factor:**
```
Factor = 1.0   if Hostile_Share > 0.70 (overwhelming majority)
       = 0.7   if 0.50 < Hostile_Share ≤ 0.70 (majority)
       = 0.4   if 0.30 < Hostile_Share ≤ 0.50 (significant minority)
       = 0.1   if Hostile_Share ≤ 0.30 (small minority)
```

**Authority Multiplier:**
```
Multiplier = (1.0 - Faction_Authority_Score)

Where:
- High authority (0.80-1.0): Low strain (multiply by 0.20-0.00)
- Medium authority (0.50-0.79): Medium strain (multiply by 0.50-0.21)
- Low authority (0.0-0.49): High strain (multiply by 1.0-0.51)
```

**Control Method Multiplier:**
```
Multiplier = 1.5   if Active_Displacement_Ongoing (forcing population out)
           = 1.0   if Militia_Control (armed presence maintaining order)
           = 0.8   if Police_Control (civil authority present)
```

**Phase I Time Factor:**
```
Time_Factor = 0.50 + (Turn_Number_Since_War_Start × 0.05)

Cap at 1.0 (reached at turn 10)
```

**Interpretation:** Strain starts at 50% normal rate and ramps up as war continues.

#### 4.5.2 Faction-Level Control Strain

Sum across all controlled municipalities:

```
Faction_Total_Control_Strain = Σ (Municipality_Control_Strain_Increment)
                              for all faction-controlled municipalities
```

#### 4.5.3 Control Strain Drag Effects

Control Strain imposes costs:

```yaml
control_strain_effects:
  exhaustion_coupling:
    - Faction_Exhaustion_Rate += Faction_Total_Control_Strain × 0.0001
    - Interpretation: "Every 10,000 Control Strain = +1% exhaustion per turn"

  authority_degradation:
    - Faction_Authority -= Faction_Total_Control_Strain × 0.000005
    - Interpretation: "Coercion erodes legitimacy"

  militia_recruitment_penalty:
    - Militia_Growth_Rate -= Faction_Total_Control_Strain × 0.00002
    - Interpretation: "Resources diverted to occupation"
```

**Note:** Control Strain effects are **slow-burning** in Phase I. Major impact occurs in Phase II when Control Strain accumulates over months.

---

### 4.6 JNA Transition System

**Purpose:** Model the withdrawal of the Yugoslav People's Army (JNA) and asset transfer to the Army of Republika Srpska (VRS).

#### 4.6.1 JNA Withdrawal Timeline

JNA withdrawal begins when RS declares (or war starts):

```
Withdrawal Progress = Initial_Progress (from Phase 0)
                    + 0.05 per turn
```

**Completion:** Withdrawal_Progress ≥ 1.0 (typically ~20 turns = 5 months)

#### 4.6.2 Asset Transfer to VRS

As JNA withdraws, assets transfer to RS:

```
Assets Transferred per Turn = JNA_Total_Assets × 0.05
```

**Assets Include:**
- Heavy weapons (artillery, tanks, APCs)
- Small arms and ammunition
- Logistics infrastructure
- Officer corps (experience transfer)

**RS Effects:**
```yaml
VRS_asset_effects:
  per_turn:
    - RS_Militia_Strength_Growth += 3 (enhanced by JNA weapons)
    - RS_Artillery_Capability += 2 (cumulative)
    - RS_Armor_Capability += 1 (cumulative)
    - RS_Officer_Experience += 0.5 (cumulative)

  at_completion:
    - VRS_Readiness = 1.0 (ready for formal brigade structure)
    - RS_Heavy_Weapons = Maximum (dominant advantage over RBiH)
    - Enable Phase II transition (VRS brigades with AoRs)
```

#### 4.6.3 RBiH Response

RBiH attempts to capture JNA weapons depots:

```
RBiH Captured Assets = ( RBiH_TO_Penetration
                        × Uncaptured_Depot_Vulnerability
                        × Opportunism_Factor )
```

**Depot Vulnerability:**
- High in RBiH-controlled municipalities (0.60)
- Medium in contested areas (0.30)
- Low in RS-controlled areas (0.10)

**RBiH Effects:**
```yaml
RBiH_captured_effects:
  - RBiH_Militia_Strength += Captured_Assets × 0.30
  - RBiH_Authority += 0.05 (successful resistance boost)
  - RS_Asset_Transfer_Rate -= 0.01 (slowed by losses)
```

---

### 4.7 Authority Degradation System

**Purpose:** Model the collapse of central RBiH authority and rise of RS/HRHB authority.

#### 4.7.1 RBiH Central Authority Decay

```
RBiH_Authority_Change = - ( RS_Declaration_Penalty
                          + HRHB_Declaration_Penalty
                          + Control_Loss_Penalty
                          + JNA_Opposition_Penalty )
                        + International_Recognition_Bonus
```

**Penalties:**
- RS declares: -0.15 (immediate), -0.01/turn (ongoing)
- HRHB declares: -0.10 (immediate), -0.008/turn (ongoing)
- Per municipality lost: -0.005
- JNA active opponent: -0.01/turn

**Bonuses:**
- International recognition as legitimate government: +0.02/turn
- Successful defense of Sarajevo: +0.005/turn

#### 4.7.2 RS/HRHB Authority Growth

```
Faction_Authority_Change = + ( Declaration_Bonus
                             + Control_Gain_Bonus
                             + External_Support_Bonus )
                           - Control_Strain_Penalty
```

**Bonuses:**
- Declaration enacted: +0.10 (immediate), +0.008/turn (ongoing)
- Per municipality gained: +0.008
- External support (FRY/Croatia): +0.01/turn

**Penalties:**
- Control Strain effects (see §4.5.3)

#### 4.7.3 Authority Caps

```
RBiH_Authority ∈ [0.20, 1.0]   # Cannot fall below 0.20 in Phase I
RS_Authority ∈ [0.0, 0.85]     # Cannot exceed 0.85 without peace treaty
HRHB_Authority ∈ [0.0, 0.70]   # Cannot exceed 0.70 without peace treaty
```

---

### 4.8 Alliance Degradation System (RBiH-HRHB)

**Purpose:** Model the strain and collapse of RBiH-HRHB cooperation.

#### 4.8.1 Alliance Decay Formula

```
Alliance_Change = - ( HRHB_Declaration_Penalty
                    + Territorial_Competition_Penalty
                    + Control_Strain_Friction )
                  + Coordinated_Action_Bonus
                  + External_Pressure_Bonus
```

**Penalties:**
- HRHB declares: -0.25 (immediate), -0.02/turn (ongoing)
- Per contested municipality (both claim): -0.03/turn
- Both factions have high Control Strain: -0.01/turn

**Bonuses:**
- Coordinated operations vs RS: +0.02/turn
- International pressure to cooperate: +0.01/turn

#### 4.8.2 Alliance Breakdown Threshold

```
IF Alliance_Relationship ≤ -0.30 THEN:
  - Enable RBiH-HRHB hostilities
  - Croat-majority municipalities under RBiH control become flip-eligible
  - Bosniak-majority municipalities under HRHB control become flip-eligible
  - War transitions from two-faction (vs RS) to three-faction
```

**Note:** Alliance breakdown typically occurs late Phase I or early Phase II.

---

## 5. Phase I Turn Structure

Phase I uses a modified turn sequence:

```
PHASE I TURN ORDER:

1. Declaration Phase [NEW]
   - Check RS declaration conditions (if not yet declared)
   - Check HRHB declaration conditions (if not yet declared)
   - Resolve declaration effects

2. Militia Emergence Phase [NEW]
   - Calculate militia strength growth
   - Apply JNA asset transfer effects (RS only)
   - Update militia capabilities

3. Pressure Application Phase [RENAMED from Military Interaction]
   - Each militia applies pressure to adjacent hostile municipalities
   - Calculate stability score changes
   - Identify flip-eligible municipalities

4. Control Flip Phase [NEW]
   - Resolve control flips (stability + militia checks)
   - Apply post-flip consolidation periods
   - Update control map

5. Displacement Phase [NEW]
   - Calculate displacement flows
   - Move displaced populations
   - Apply receiving municipality penalties

6. Control Strain Resolution Phase [NEW]
   - Calculate Control Strain accumulation
   - Apply faction-level Control Strain effects
   - Update exhaustion coupling

7. Authority Update Phase [NEW]
   - Update RBiH central authority
   - Update RS/HRHB authority
   - Apply authority caps

8. Alliance Update Phase [NEW]
   - Update RBiH-HRHB relationship
   - Check alliance breakdown threshold

9. JNA Transition Phase [NEW]
   - Advance JNA withdrawal progress
   - Transfer assets to VRS
   - Resolve RBiH asset capture attempts

10. Persistence Phase [UNCHANGED]
    - Write state to disk
    - Log turn summary
```

---

## 6. Transition to Phase II (Frontline War)

### 6.1 Transition Conditions

Phase I ends and Phase II begins when **all** of the following are true:

```yaml
phase_II_transition_conditions:
  control_stabilization:
    - No control flips in last 3 turns
    - ≤ 5 municipalities remain in consolidation periods
    - All three factions control contiguous territory blocks

  militia_maturation:
    - RS militia strength ≥ 80 in ≥ 60% of RS-controlled municipalities
    - RBiH militia strength ≥ 70 in ≥ 50% of RBiH-controlled municipalities
    - HRHB militia strength ≥ 70 in ≥ 50% of HRHB-controlled municipalities

  JNA_transition_complete:
    - JNA withdrawal progress ≥ 0.95
    - VRS asset transfer ≥ 90% complete

  frontline_formation:
    - ≥ 100 settlements have adjacent hostile control (potential frontline)
    - Frontline is contiguous (no isolated pockets except enclaves)

  time_minimum:
    - Phase I has lasted ≥ 12 turns (3 months minimum)
```

### 6.2 Transition Mechanics

When transition conditions are met:

```yaml
phase_II_initialization:
  formation_conversion:
    - Militia units convert to formal brigades
    - Brigade strength = Militia_Strength × Conversion_Factor
    - Conversion_Factor: RS=1.2, RBiH=0.9, HRHB=1.0

  AoR_instantiation:
    - Assign brigades to Areas of Responsibility
    - Front-active settlements identified (adjacent hostile control)
    - Rear-area settlements become political control zones (no AoR)

  command_structure_activation:
    - Corps and Operational Groups become active
    - Enable command hierarchy mechanics
    - Enable corps-level directive system

  systems_activation:
    - Enable sustained offensive operations
    - Enable supply interdiction mechanics
    - Enable siege mechanics (Sarajevo, Goražde, Bihać, etc.)
    - Enable pre-negotiation diplomacy

  freeze_phase_I_mechanics:
    - Disable Declaration Phase (declarations already complete)
    - Disable Militia Emergence (brigades replace militia)
    - Control Flip System continues but modified (requires AoR conquest)
```

---

## 7. Hand-Off to Phase II

Phase I outputs required by Phase II:

```yaml
phase_I_outputs:
  control_map:
    type: Map<MunicipalityID, Faction>
    description: "Final political control state after Early-War"
    requirements:
      - No municipalities in consolidation period
      - Control stable for ≥ 3 turns

  militia_converted_brigades:
    type: List<Brigade>
    components:
      - brigade_id: string
      - faction: Faction
      - strength: [0, 100]
      - location: MunicipalityID
      - parent_corps: CorpsID
    description: "Brigades formed from militia units"

  demographic_state:
    type: Map<MunicipalityID, Map<Ethnicity, Population>>
    description: "Population distribution after displacement"
    requirements:
      - All displacement flows complete
      - No municipalities with active displacement

  control_strain_accumulated:
    type: Map<Faction, Float>
    description: "Total Control Strain accumulated by each faction in Phase I"

  authority_state:
    RBiH_central_authority: [0.20, 1.0]
    RS_authority: [0.0, 0.85]
    HRHB_authority: [0.0, 0.70]
    description: "Authority scores at Phase I conclusion"

  alliance_state:
    RBiH_HRHB_relationship: [-1.0, +1.0]
    alliance_breakdown_occurred: boolean
    description: "Alliance state for Phase II"

  JNA_transition_complete:
    VRS_inherited_assets: Float
    RBiH_captured_assets: Float
    description: "Asset distribution after JNA withdrawal"

  frontline_identification:
    type: List<SettlementID>
    description: "Settlements adjacent to hostile control (front-active)"
    requirements:
      - Frontline is contiguous
      - All factions have identified frontline
```

---

## 8. Output Contract

Phase I **guarantees** the following to Phase II:

```yaml
phase_I_guarantees:
  control_stability:
    - Control map is stable (no flips in last 3 turns)
    - All consolidation periods complete
    - Enclaves identified and stable

  brigade_readiness:
    - All factions have formal brigade structures
    - Brigade strengths accurately reflect militia maturation
    - Brigade locations are valid (in friendly-controlled municipalities)

  displacement_complete:
    - No active displacement flows
    - Demographic state reflects all Phase I displacement
    - Receiving municipalities have absorbed refugees

  frontline_defined:
    - Front-active settlements identified
    - Rear-area settlements identified
    - Brigade AoR assignment feasible

  system_state:
    - Control Strain baseline established
    - Authority scores reflect Phase I outcomes
    - Alliance state reflects competition/breakdown
    - JNA transition complete (VRS fully formed)

  determinism:
    - All Phase I mechanics are deterministic
    - No random elements introduced
    - State is fully reproducible from Phase 0 + player directives
```

---

## 9. Determinism

Phase I **strictly maintains determinism**:

### 9.1 No Randomness

- **Militia emergence:** Deterministic formula based on organizational penetration
- **Control flips:** Deterministic threshold (stability + militia strength)
- **Displacement:** Deterministic rates based on population and violence
- **JNA asset transfer:** Fixed percentage per turn
- **Authority decay:** Deterministic formula based on control and declarations

### 9.2 Stable Ordering

When multiple municipalities are flip-eligible on the same turn:

```
Flip Resolution Order: Sort by (Stability Score ASC, Municipality_ID ASC)
```

**Interpretation:** Flip the least stable municipality first. Ties broken by deterministic ID sort.

### 9.3 No Timestamps

- Turn counter is ordinal (Turn 1, Turn 2, ...), not calendar dates
- No time-of-day or sub-turn timing
- All turn phases execute in fixed order

### 9.4 Reproducibility

Given identical:
- Phase 0 outputs
- Player directives (none in Phase I—purely systemic)
- Turn resolution order

Phase I will produce **bit-identical** outputs every execution.

---

## 10. Design Constraints

### 10.1 Mandatory Constraints

Phase I **must**:

1. **Convert organizational penetration to armed formations** (militia emergence)
2. **Allow control flips** when stability is overwhelmed by pressure
3. **Model displacement** of hostile populations following flips
4. **Accumulate Control Strain** as cost of occupation
5. **Complete JNA transition** (withdrawal + asset transfer to VRS)
6. **Degrade RBiH authority** as central government loses control
7. **Strain RBiH-HRHB alliance** through territorial competition
8. **Produce stable control map** for Phase II AoR assignment
9. **Maintain determinism** (no randomness, no timestamps)
10. **Hand off to Phase II** when conditions met

### 10.2 Prohibited Mechanics

Phase I **must not**:

1. **Script outcomes:** No "Srebrenica falls on Turn 8" hard-coding
2. **Use brigade AoRs:** Militia operate, not formal brigades with territorial assignments
3. **Allow sustained offensives:** No multi-turn coordinated attacks (Phase II mechanic)
4. **Enable peace negotiations:** War is too chaotic for diplomacy
5. **Introduce international intervention:** UNPROFOR arrives later
6. **Allow instant reversals:** Consolidation periods prevent immediate flip-backs
7. **Permit unlimited displacement:** Displacement completes when hostility threshold met
8. **Generate combat casualties:** Casualties are abstracted into Control Strain and exhaustion
9. **Use player directives for flips:** Flips are systemic, not player-ordered

### 10.3 Historical Fidelity Constraints

Phase I outcomes should be **historically plausible** but **not historically mandated**:

- **Plausible:** RS captures Prijedor, Zvornik, Foča (Serb-majority/plurality + adjacent RS territory)
- **Plausible:** RBiH holds Sarajevo, Tuzla, Zenica (Bosniak-majority + organizational strength)
- **Plausible:** HRHB secures Mostar, Široki Brijeg, Tomislavgrad (Croat-majority + Croatian support)
- **NOT mandated:** Exact municipalities, exact timing, exact displacement percentages

**Design Philosophy:** The system should make historical outcomes **likely** but not **inevitable**. Player decisions in Phase 0 (organizational investments) should meaningfully affect Phase I outcomes.

---

## 11. Non-Effects

Phase I explicitly does **not**:

1. **Generate strategic reserves:** Brigades do not have operational reserves (Phase II feature)
2. **Model siege mechanics:** Sieges formalized in Phase II (Sarajevo, etc.)
3. **Enable diplomacy:** No peace talks, no international mediation
4. **Introduce UNPROFOR:** International forces arrive Phase II
5. **Model war crimes tribunals:** ICTY is post-war
6. **Track individual atrocities:** Atrocities abstracted into Control Strain and displacement
7. **Enable economic warfare:** Sanctions and blockades are Phase II mechanics
8. **Model air power:** NATO airstrikes are Phase II events
9. **Track refugees outside BiH:** Only internal displacement modeled

---

## 12. Canonical Interpretation

In case of ambiguity between Phase I mechanics and other canon documents:

### 12.1 Precedence Order

1. **Engine Invariants v0.3.0** (cannot be violated)
2. **This document** (Phase I Specification v0.3.0)
3. **Phase 0 Specification v0.3.0** (for hand-off requirements)
4. **Systems Manual v0.3.0** (for detailed implementation)
5. **Game Bible v0.3.0** (for design philosophy)

### 12.2 Conflict Resolution

If Phase I spec conflicts with:

- **Engine Invariants:** Engine Invariants win (revise Phase I spec)
- **Systems Manual:** Phase I spec wins (revise Systems Manual)
- **Game Bible:** Discuss with design lead (both are authoritative)

### 12.3 Unspecified Behavior

If Phase I leaves behavior unspecified:

1. **Consult Systems Manual v0.3.0** for implementation guidance
2. **Consult historical sources** (Balkan Battlegrounds) for plausibility
3. **Default to simplest deterministic behavior** (avoid complexity)
4. **Document decision** in implementation notes

---

## 13. Freeze Status

**DESIGN-FROZEN as of 2026-02-02**

This specification is **frozen** for implementation. Changes require:

1. **Approval from design lead**
2. **Version increment** (v0.3.1 or v0.4.0 depending on scope)
3. **Propagation to dependent documents** (Engine Invariants, Systems Manual, etc.)
4. **Regression testing** of all Phase I mechanics

**Permitted without version change:**
- Clarifications that do not alter mechanics
- Typographical corrections
- Example additions
- Cross-reference updates

**Prohibited without version change:**
- Formula modifications
- New systems or mechanics
- Removal of existing mechanics
- Changes to transition conditions
- Changes to output contract

---

## 14. Implementation Notes

### 14.1 Recommended Implementation Order

1. **Declaration Effects System** (§4.1) — Prerequisite for war activation
2. **Militia Emergence System** (§4.2) — Prerequisite for pressure application
3. **Control Flip System** (§4.3) — Core Phase I mechanic
4. **Displacement System** (§4.4) — Follows immediately from flips
5. **Control Strain System** (§4.5) — Accumulates during displacement
6. **JNA Transition System** (§4.6) — Parallel to above, affects RS militia
7. **Authority Degradation System** (§4.7) — Slow-burn effect
8. **Alliance Degradation System** (§4.8) — Slow-burn effect
9. **Phase II Transition Logic** (§6) — Conditional checks each turn

### 14.2 Testing Requirements

Each system must be tested for:

- **Determinism:** Identical inputs → identical outputs
- **Bounds:** All values remain within specified ranges
- **Balance:** No faction auto-wins regardless of Phase 0 state
- **Plausibility:** Outcomes align with historical ranges
- **Performance:** Turn resolution < 5 seconds on reference hardware

### 14.3 Validation Criteria

Phase I implementation is **valid** if:

```yaml
validation:
  control_plausibility:
    - RS controls ≥ 50% of Serb-majority municipalities by Phase II
    - RBiH retains Sarajevo, Tuzla, Zenica in ≥ 80% of test runs
    - HRHB controls ≥ 60% of Croat-majority municipalities by Phase II

  displacement_plausibility:
    - Total displaced ≥ 500,000 people by end of Phase I
    - No municipality 100% ethnically cleansed in < 4 turns
    - Enclaves (Srebrenica, Goražde, etc.) still exist at Phase II transition

  strain_accumulation:
    - All factions have Control Strain > 0 by Phase II
    - RS Control Strain > RBiH Control Strain (RS holds more hostile population)
    - HRHB Control Strain is non-trivial (competes with RBiH)

  authority_dynamics:
    - RBiH authority decreases but remains ≥ 0.20
    - RS authority increases to 0.40-0.70 range
    - HRHB authority increases to 0.30-0.60 range

  alliance_dynamics:
    - RBiH-HRHB relationship decreases from Phase 0
    - Alliance breakdown occurs in 30-60% of test runs

  timeline:
    - Phase I lasts 12-24 turns (3-6 months) in typical game
    - Shortest possible: 12 turns
    - Longest before forced transition: 30 turns
```

---

## 15. Change Log

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| v0.3.0  | 2026-02-02 | Initial frozen specification for Phase I     |

---

## 16. Appendix: Phase I Formula Reference

Quick reference for all Phase I formulas:

```yaml
militia_strength:
  formula: "(Police×15 + TO×20 + Party×10 + Paramilitary×25) × Declaration_Mult × Demographic_Factor"
  domain: [0, 100]

control_flip_trigger:
  formula: "Stability + Defense_Militia < 50 + (Attack_Militia × 0.80)"
  interpretation: "Flip when defense overwhelmed"

consolidation_duration:
  formula: "4 + Demographic_Penalty + Geographic_Penalty"
  domain: [4, 9] turns

displacement_rate:
  formula: "Hostile_Pop × (0.15 + Violence_Mod + Enclave_Mod)"
  domain: [0.15, 0.75] per turn

control_strain_increment:
  formula: "Hostile_Pop × Hostility_Factor × Authority_Mult × Method_Mult × Time_Factor"
  interpretation: "Higher when authority is low and displacement is active"

JNA_asset_transfer:
  formula: "5% per turn"
  completion: "20 turns (100%)"

authority_decay_RBiH:
  formula: "- (Declarations + Control_Loss + JNA_Opposition) + International_Bonus"
  floor: 0.20 (cannot go lower in Phase I)

authority_growth_RS_HRHB:
  formula: "+ (Declaration + Control_Gain + External_Support) - Control_Strain_Penalty"
  caps: RS ≤ 0.85, HRHB ≤ 0.70

alliance_decay:
  formula: "- (HRHB_Declaration + Territorial_Competition + Strain_Friction) + Cooperation_Bonus"
  breakdown_threshold: ≤ -0.30
```

---

## v0.4 Additions (integrated into Phase I Canon v0.5.0)

### Contested control effects (System 11)
- control_status modifies early-war flip resistance and authority initialization.
- HIGHLY_CONTESTED areas may be eligible for rapid flips after declaration rules.
- SECURE areas require sustained pressure to flip; CONTESTED areas are primary early-war pressure targets.

### Legitimacy initialization (System 4)
- Legitimacy is initialized from demographic alignment, institutional authority, and control_status.

### Tactical doctrines and progression (Systems 9-10)
- Posture eligibility is constrained by early-war capability progression and supply.
- Doctrines must not bypass Phase I prohibitions (no AoR, no fronts).
- Doctrine availability must be re-evaluated each turn as capability and supply shift.

### AoR prohibition (System 8)
- AoR assignment remains prohibited throughout Phase I.

### Early-war municipality flips and displacement (Phase I §4.3–§4.4)

**Control flips (§4.3):** Municipality-level control changes in Phase I use the early-war flip formula only (stability + defensive militia vs attacking militia). No fronts or AoR; flip eligibility requires adjacent hostile control and sufficient attacker strength. Post-flip: consolidation period, stability lockdown, militia strength reset per controller/lost. Large-settlement muns may be ineligible when defender has no formation (MILITIA_BRIGADE_FORMATION_DESIGN §5). Within a flipped municipality, settlement-level resolution applies (wave flip, holdouts, cleanup per §4.3.6).

**Implementation-note (non-canon extension tracking):** Current code includes an optional `coercion_pressure_by_municipality` input that can reduce the effective flip threshold in implementation. This is tracked as implementation detail and ledgered; it is not normative v0.4 canon behavior unless promoted by formal canon addendum.

**Implementation-note (capability-weighted flip):** Implementation may scale attacker and defender effectiveness in the flip formula by faction capability (Systems Manual Appendix D). Capability modifiers are applied deterministically by faction doctrine (e.g. ATTACK for attacker, DEFEND for defender). This extension is tracked as implementation detail and ledgered; it is not normative v0.4 canon unless promoted by formal canon addendum.

**Implementation-note (formation-aware flip):** Implementation may include formation strength (personnel in formations whose home municipality is in an adjacent mun or in the defended mun) in the Phase I flip formula—attacker strength = militia + formation strength in adjacent muns; defender effectiveDefense = militia (+ allied) + formation strength in the defended mun. This reflects JNA/early RS historical fidelity (RS had heavy brigades from the start; RBiH holds where it has forces). Tracked as implementation detail; not normative v0.4 canon unless promoted by formal canon addendum.

**Implementation-note (military-action-only / no-flip scenarios):** When a scenario sets `disable_phase_i_control_flip` (e.g. military-action-only control resolution), the militia-pressure path for Phase I control flips is disabled; only military-driven (brigade-adjacent) flips may apply. Scenario names or aliases that suggest "no flip" do not imply zero control changes—they indicate that militia-alone pressure cannot trigger flips. See docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §4, §5.

**When persons become displaced (Phase I §4.4):** Displacement is **initiated** when a municipality flips and Hostile_Population_Share (share of population aligned with the **losing** faction) exceeds 0.30. Once initiated for that mun in that turn:
- A one-time displacement is applied: a portion of the population aligned with the losing faction is displaced out of the municipality.
- Displaced are routed to municipalities still controlled by the losing faction (friendly to the displaced); killed and fled-abroad fractions apply when 1991 census is available (same constants as Phase II).
- State updated: `displacement_state` (displaced_out at source, displaced_in at destinations, lost_population, displaced_in_by_faction when census exists). No further Phase I displacement from that mun for the same flip event.

**Phase II displacement:** Persons also become displaced in Phase II when front-active settlements accumulate displacement from conflict intensity and pressure (front-active + pressure deltas, unsupplied pressure, encirclement, breach persistence). Phase II uses the same `displacement_state` and routing/killed/fled-abroad rules. Tracking is authoritative: displaced_out, displaced_in, lost_population, displaced_in_by_faction (ethnicity-traced when census provided).

### RBiH-HRHB relationship (Phase I §4.8)

**State:** `phase_i_alliance_rbih_hrhb` (optional number in [-1, 1]). High = cooperative; low = hostile. When absent, implementation must treat the relationship as allied (see threshold below). Additional bilateral state tracked in `rbih_hrhb_state` (RbihHrhbState).

**Semantics:**
- Value > **allied threshold** (0.2): RBiH and HRHB are **allied**. They do not count as hostile neighbors for flip eligibility; neither can be the attacker in the control-flip formula against the other. No RBiH-HRHB control flips.
- Value <= threshold: RBiH and HRHB are **hostile**. Normal flip rules apply; either can flip the other's control.

**Initialization:** Scenario or Phase I init may set an initial value (e.g. April 1992 = 0.35 for a fragile but allied start). If unset, behaviour is allied (as when above threshold).

**Alliance strain (deterministic update):** Each turn, the alliance value is updated by a deterministic formula driven by: (a) RBiH appeasement (+APPEASEMENT_BASE_RATE per turn when no bilateral incidents), (b) HRHB patron pressure (-PATRON_PRESSURE_COEFF * HRHB patron_commitment per turn), (c) bilateral incident penalty (-INCIDENT_PENALTY_PER_FLIP per RBiH-HRHB control flip from previous turn), and (d) ceasefire recovery (+CEASEFIRE_RECOVERY_RATE per turn when ceasefire active). All constants are tunable and version-controlled; no randomness.

**Relationship phases (threshold-based):**
- Value > 0.50: **Strong alliance** (full coordination, joint defense bonus vs RS).
- Value (0.20, 0.50]: **Fragile alliance** (no flips, weakened coordination).
- Value (0.00, 0.20]: **Strained** (flips enabled, no coordination bonus, tensions).
- Value [-0.50, 0.00]: **Open war** (minority militia erosion begins in mixed muns).
- Value < -0.50: **Full war** (max pressure, formation displacement in mixed muns).

**Municipalities with allied presence:** Some municipalities historically had both RBiH and HRHB formations (e.g. Travnik, Novi Travnik, Vitez, Bugojno, Mostar, Kiseljak, Busovaca). Control remains a single controller per settlement. When the relationship is allied, both factions may have formations and pool/spawn in the same mun; `rbih_hrhb_state.allied_mixed_municipalities` tracks these muns dynamically. When RS attacks a mixed mun and the alliance is above ALLIED_THRESHOLD, the allied faction's militia contributes to defense (scaled by ALLIED_COORDINATION_FACTOR = 0.6).

**Open war and minority erosion:** When the value crosses below HOSTILE_THRESHOLD (0.0), minority faction militia in mixed municipalities erodes at MINORITY_EROSION_RATE_PER_TURN (0.10). Formations in enemy-controlled muns lose supply, cannot reinforce, and are displaced when minority militia drops below MINORITY_VIABLE_THRESHOLD (50).

**Implementation-note (earliest RBiH–HRHB open war):** For historical fidelity (ARBiH/HVO did not fight open war before October 1992; BB + OOB research), implementation may gate the earliest turn when RBiH–HRHB open war can begin (bilateral flips, war_started_turn, alliance below ALLIED_THRESHOLD). Scenario field `rbih_hrhb_war_earliest_week` and state `meta.rbih_hrhb_war_earliest_turn` (default 26 for April 1992 start = first week of October 1992). Before that turn, RBiH and HRHB are treated as allied for flip and alliance-update purposes. Tracked as implementation detail; not normative unless promoted by canon addendum.

**Bilateral ceasefire (precondition-driven):** The RBiH-HRHB ceasefire fires when ALL preconditions are met: (C1) war duration >= CEASEFIRE_MIN_WAR_DURATION turns since `war_started_turn`, (C2) HRHB exhaustion > CEASEFIRE_HRHB_EXHAUSTION, (C3) RBiH exhaustion > CEASEFIRE_RBIH_EXHAUSTION, (C4) stalemate >= CEASEFIRE_STALEMATE_MIN consecutive turns with zero bilateral flips, (C5) IVP negotiation_momentum > CEASEFIRE_IVP_THRESHOLD, (C6) HRHB patron_state.constraint_severity > CEASEFIRE_PATRON_CONSTRAINT. Ceasefire freezes bilateral flips, begins alliance recovery, halts minority erosion, and redirects bot targeting to RS.

**Washington Agreement (precondition-driven):** The Washington Agreement fires when ALL preconditions are met: (W1) ceasefire active, (W2) ceasefire duration >= WASH_CEASEFIRE_DURATION turns, (W3) IVP negotiation_momentum > WASH_IVP_THRESHOLD, (W4) HRHB patron_state.constraint_severity > WASH_PATRON_CONSTRAINT, (W5) RS territorial control share > WASH_RS_THREAT_SHARE, (W6) combined RBiH + HRHB exhaustion > WASH_COMBINED_EXHAUSTION. When fired: alliance set to WASH_ALLIANCE_LOCK_VALUE (0.80) and locked; HRHB capability profiles shift to post-Washington values (equipment_access 0.65, croatian_support 0.90); HRHB embargo enhanced (external_pipeline_status 0.85); COORDINATED_STRIKE "HV coordination enabled" flag set; joint operations against RS receive POST_WASH_JOINT_PRESSURE_BONUS (1.15); mixed municipalities restored to joint status.

---

## v0.5 Canon consolidation

This document (v0.5.0) consolidates the full Phase I Specification v0.3.0 with all v0.4 Additions. No content from v0.3 has been deleted. Implementation-notes above remain non-normative per docs/10_canon/context.md (Canon v0.5 implementation-notes policy).
