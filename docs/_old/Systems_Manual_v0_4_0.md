# A War Without Victory -- Systems Manual v0.4.0
 
## Scope and inheritance
This document **supersedes** the prior Systems Manual and incorporates all earlier system rules by reference unless explicitly overridden or extended below.
 
## v0.4 Systems (1-11)
The following systems are canonical at v0.4. This manual provides the authoritative mechanics summary and required state fields for integration.

### System 1: External Patron Pressure + IVP
**State:**
- `patron_state` (per faction): `material_support_level`, `diplomatic_isolation`, `constraint_severity`, `patron_commitment`, `last_updated`.
- `international_visibility_pressure` (global): `sarajevo_siege_visibility`, `enclave_humanitarian_pressure`, `atrocity_visibility`, `negotiation_momentum`, `last_major_shift`.

**Core rules:**
- Patron behavior is deterministic and time-indexed; no reactive player control.
- IVP accumulation sources: Sarajevo siege visibility, enclave humanitarian pressure, atrocity visibility triggers.
- Patron commitment follows pre-scripted curves with modifiers for visibility and negotiation momentum.

**Key formulas:**
- `equipment_availability_multiplier = 0.5 + (0.5 * material_support_level)`
- `exhaustion_external_modifier = (diplomatic_isolation * 0.1) + (negotiation_momentum * 0.05) - (patron_commitment * 0.05)`
- `exhaustion_per_turn += exhaustion_base * (1.0 + exhaustion_external_modifier)`
- `adjusted_negotiation_threshold = base_threshold - (negotiation_momentum * 10.0) - (diplomatic_isolation * 5.0)`
- `patron_commitment_next = patron_commitment_base[turn] * (1.0 - atrocity_visibility * 0.1) * (1.0 + negotiation_momentum * 0.05)`

**Constraints:** patrons constrain options; no direct empowerment or victory.

### System 2: Arms Embargo Asymmetry
**State:** `embargo_profile` per faction with `heavy_equipment_access`, `ammunition_resupply_rate`, `maintenance_capacity`, `smuggling_efficiency`, `external_pipeline_status`.

**Core rules:**
- Equipment access ceilings are faction-specific and time-modified by smuggling and pipelines.
- Ammunition resupply constrains sustained offensives.

**Key formulas:**
- `max_heavy_equipment_per_brigade = base_max * heavy_equipment_access`
- `pressure_equipment_modifier = 0.5 + (0.5 * effective_equipment_ratio)`
- `smuggling_efficiency_t = smuggling_efficiency_base + (turn_index / 200) * 0.3` (cap at 1.0)
- `equipment_acquisition_per_turn = base_acquisition_rate * heavy_equipment_access * external_pipeline_status`

**Constraints:** differential effects only; no binary embargo switch.

### System 3: Heavy Equipment + Maintenance
**State:** `equipment_state` per formation; `maintenance_capacity` per faction.

**Core rules:**
- Degradation scales with operational tempo and maintenance deficit.
- Routine maintenance slows degradation; major repairs require capacity and conditions.
- Non-operational equipment is a permanent loss without explicit repair allocation.

**Key formulas:**
- `operational_tempo` mapped by posture: OFFENSIVE 1.5, HOLDING 1.0, MOBILE_DEFENSE 1.2, STATIC_DEFENSE 0.8, REFIT 0.3
- `degradation_points = operational_tempo * base_degradation_rate * (1 + maintenance_deficit * 0.1) * (2.0 - spare_parts_availability)`
- `effective_equipment_ratio = (operational_heavy + degraded_heavy * 0.5) / total_heavy`
- `pressure_equipment_modifier = 0.3 + (0.7 * effective_equipment_ratio)`

**Constraints:** heavy equipment is a wasting asset; degradation monotonic without repair.

### System 4: Legitimacy
**State:** `legitimacy_state` per settlement with demographic, institutional, coercion, and stability components.

**Core rules:**
- Legitimacy derives from demographics, institutional inheritance, duration of stable control, and coercion penalties.
- Low legitimacy reduces recruitment, slows authority consolidation, raises exhaustion, and weakens pressure resistance.

**Key formulas:**
- `demographic_legitimacy = settlement_population_fraction[controlling_faction]`
- `institutional_legitimacy = 1.0 if controller == pre_war_authority; 0.6 if override; 0.3 otherwise`
- `stability_bonus = min(0.3, turns_since_control_change * 0.01)`
- `coercion_penalty += 0.2 per coercive flip; decays -0.01 per turn`
- `legitimacy_score = (demographic * 0.4) + (institutional * 0.3) + stability_bonus - coercion_penalty`
- `recruitment_multiplier = 0.5 + (0.5 * legitimacy_score)`

**Constraints:** control does not imply legitimacy; military success cannot directly increase legitimacy.

### System 5: Enclave Integrity
**State:** `enclaves` array with integrity components, humanitarian pressure, siege duration, and membership.

**Core rules:**
- Enclaves are detected deterministically by connectivity.
- Integrity is a weighted composite of supply, authority, population, and connectivity.
- Humanitarian pressure accumulates as integrity declines and feeds IVP.

**Key formulas:**
- `enclave_integrity = 0.4 * supply + 0.3 * authority + 0.2 * population + 0.1 * connectivity`
- `humanitarian_pressure_per_turn = (1 - integrity) * population_weight * visibility_multiplier`
- `integrity_decay += 0.02 per turn when siege_duration > 4 and integrity < 0.7`

**Constraints:** deterministic detection and decay; no random collapse.

### System 6: Sarajevo Exceptions
**State:** `sarajevo_state` with siege status, supply channels, intensity, and international focus.

**Core rules:**
- Siege status derived from connectivity (external corridor and internal connectivity).
- Dual supply model: external + internal supply with non-zero external floor.
- Sarajevo has integrity floor, slower degradation, and amplified visibility.

**Key formulas:**
- `sarajevo_supply_state = max(external_supply * 0.7, internal_supply * 0.3)`
- `siege_intensity = (siege_status == BESIEGED ? 1.0 : 0.5) * (siege_duration / 20) * (1.0 - external_supply_effectiveness)` (cap at 1.0)
- `international_focus = base_importance + (siege_intensity * 10.0) + (humanitarian_pressure * 0.5)`

**Constraints:** Sarajevo is exceptional but not scripted to fall or hold.

### System 7: Negotiation Capital + Territorial Valuation
**State:** `negotiation_state` per faction; territorial valuation computed per settlement.

**Core rules:**
- Negotiation capital derives from exhaustion, IVP, patron support, and territorial liabilities.
- Territorial valuation applies "liabilities are cheaper" asymmetry.
- Acceptance requires required clauses and respects red lines and bundle constraints.

**Key formulas:**
- `base_capital = 100.0 - (faction_exhaustion * 0.5)`
- `negotiation_capital = base_capital + territorial_control_bonus - IVP_penalty + patron_bonus - enclave_liability_penalty`
- `net_settlement_value = max(0.5, settlement_base_value - settlement_liability)`
- `cost_to_cede = net_settlement_value * ceding_multiplier`
- `value_to_gain = net_settlement_value * gaining_multiplier`

**Constraints:** deterministic acceptance; no randomness.

### System 8: AoR Assignment Formalization
**State:** `assigned_brigade` per settlement; brigade AoR sets.

**Core rules:**
- Front-active settlements must have AoR; rear settlements may have none.
- AoR must match political control and is exclusive (one brigade).
- Pressure generation only for AoR-assigned settlements.

**Constraints:** AoR is responsibility, not ownership; prohibited in Phase I.

### System 9: Tactical Doctrines
**State:** extended postures and eligibility flags per formation.

**Core rules:**
- ARBiH: INFILTRATE (terrain bonus, rear disruption; lower equipment tempo).
- RS: ARTILLERY_COUNTER (defensive, ammo intensive).
- HRHB: COORDINATED_STRIKE (requires Croatian pipeline/support, short duration).

**Eligibility examples:**
- INFILTRATE: cohesion > 70, experience > 0.6, equipment_ratio < 0.5, supply >= ADEQUATE.
- ARTILLERY_COUNTER: operational_heavy > 60, ammo_resupply > 0.6, supply >= ADEQUATE.
- COORDINATED_STRIKE: Croatian pipeline > 0.6, HV coordination enabled, supply corridors not CUT.

**Constraints:** doctrine effects must respect supply, equipment, and exhaustion rules.

### System 10: Capability Progression
**State:** `capability_profile` per faction.

**Core rules:**
- Deterministic time-indexed progression curves per faction (1992-1995 baseline).
- Milestones (Washington Agreement, Drina blockade) adjust profiles. The **Washington Agreement** milestone is **precondition-driven and deterministic**. It fires when ALL of the following are met: (1) RBiH–HRHB ceasefire active for >= WASH_CEASEFIRE_DURATION turns, (2) IVP negotiation_momentum > WASH_IVP_THRESHOLD, (3) HRHB patron_state.constraint_severity > WASH_PATRON_CONSTRAINT, (4) RS territorial control share > WASH_RS_THREAT_SHARE, (5) combined RBiH + HRHB exhaustion > WASH_COMBINED_EXHAUSTION. When it fires: the RBiH–HRHB relationship (Phase I §4.8) is set to WASH_ALLIANCE_LOCK_VALUE (0.80) and **locked**; HRHB capability profiles shift to post-Washington values (HVO_1994_POST_WASH_EQUIP = 0.65); HRHB doctrine eligibility is enhanced (HV coordination enabled); and joint operations against RS receive a pressure coordination bonus (POST_WASH_JOINT_PRESSURE_BONUS = 1.15).
- Formation experience accumulates deterministically from combat exposure.

**Constraints:** no randomness; progression cannot violate exhaustion invariants.

**Implementation-note (Phase I flip use):** Implementation may use capability profiles to scale attacker and defender effectiveness in the Phase I control-flip formula (stability + defensive militia vs attacking militia). Modifiers are read from doctrine_effectiveness (e.g. ATTACK for attacker, DEFEND for defender) per Appendix D curves, deterministically by faction. Tracked as implementation detail; not normative unless promoted by canon addendum.

**Implementation-note (formation-aware Phase I flip):** Implementation may include formation strength (personnel in formations with home mun in adjacent or defended municipality) in the flip formula—attacker strength and defender effectiveDefense may add formation strength so that RS gains from day one where VRS brigades sit and RBiH holds where it has forces (JNA/early RS historical fidelity). Tracked as implementation detail; not normative unless promoted by canon addendum.

**Brigade movement and combat (design clarification):** There is no separate "movement" or "combat resolution" step. Formation location is defined by home municipality (HQ settlement) and by posture assignments (edge or region). Combat is represented by the existing pressure–breach–control-flip pipeline: formations commit posture to front edges/regions; front pressure accumulates; breaches may trigger control flip proposals; flips update political control and (in Phase II) AoR. Formation experience (EXPERIENCE_GAIN_IN_COMBAT) and combat effectiveness (e.g. degraded equipment) apply within this pipeline. No randomness; deterministic ordering throughout.

### System 11: Contested Control Initialization
**State:** `control_status` per municipality/settlement; stability modifiers.

**Political control semantics:** Political control is stored and simulated **per settlement** (`political_controllers[sid]`). Settlements can change owner independently; the unit of flip is the settlement. Municipality-level control is a **derived** view (e.g. majority of settlements in that municipality) for display and aggregation only, not the source of truth.

**Core rules:**
- `control_status` derived from Phase 0 stability score: SECURE >= 60, CONTESTED 40-59, HIGHLY_CONTESTED < 40.
- control_status modifies early-war flip resistance and authority initialization.

**Implementation-note (non-canon extension tracking):** Implementation may include optional per-municipality coercion pressure input used in code-level flip-threshold calculations. This note tracks implementation scope only and does not change normative v0.4 rules unless a formal canon addendum is accepted.

**Constraints:** deterministic initialization; precedes Phase I.

---

## Appendix A: State schema additions (v0.4)
All state additions are serializable and deterministic. Derived state remains non-serialized.

### Global state
- `international_visibility_pressure`
- `enclaves[]`
- `sarajevo_state`

### Faction state
- `patron_state`
- `embargo_profile`
- `maintenance_capacity`
- `negotiation_state`
- `capability_profile`

### Formation state
- `equipment_state`
- extended posture fields and eligibility flags

### Settlement/Municipality state
- `legitimacy_state`
- `assigned_brigade`
- `control_status`
- `coercion_pressure_by_municipality` (implementation extension; non-normative until canonized)

---

## Appendix B: Tunable parameter tables (v0.4 baseline)
These values are defaults; any change must be documented and version-controlled.

### System 1: External Patron Pressure
| Parameter | Default | Notes |
| --- | --- | --- |
| EXHAUSTION_DIPLOMATIC_MULTIPLIER | 0.1 | Effect of diplomatic isolation on exhaustion |
| NEGOTIATION_MOMENTUM_MULTIPLIER | 0.05 | Effect of IVP momentum on exhaustion |
| PATRON_COMMITMENT_RESISTANCE | 0.05 | Exhaustion resistance from patron support |
| SARAJEVO_VISIBILITY_RATE | 0.5 | Visibility accumulation per turn under siege |
| ENCLAVE_PRESSURE_WEIGHT | 1.0 | Humanitarian pressure scaling |

### System 2: Arms Embargo Asymmetry
| Parameter | Faction | Default | Notes |
| --- | --- | --- | --- |
| heavy_equipment_access | VRS | 0.9 | JNA inheritance |
| heavy_equipment_access | ARBiH | 0.2 | Embargo impact |
| heavy_equipment_access | HRHB | 0.6 | Croatian pipeline |
| ammunition_resupply_rate | VRS | 0.8 | Serbian support |
| ammunition_resupply_rate | ARBiH | 0.3 | Limited resupply |
| ammunition_resupply_rate | HRHB | 0.6 | Croatian support |
| smuggling_efficiency_growth | All | 0.0015/turn | Deterministic growth |

### System 3: Heavy Equipment Maintenance
| Parameter | Default | Notes |
| --- | --- | --- |
| BASE_DEGRADATION_RATE | 0.02 | Base per-turn degradation |
| OPERATIONAL_TEMPO_OFFENSIVE | 1.5 | Offensive tempo multiplier |
| OPERATIONAL_TEMPO_REFIT | 0.3 | Refit tempo multiplier |
| DEGRADED_EFFECTIVENESS | 0.5 | Combat effectiveness of degraded equipment |
| REPAIR_COST_DEGRADED | 3.0 | Maintenance actions per repair |
| REPAIR_COST_NON_OPERATIONAL | 10.0 | Maintenance actions per repair |

### System 4: Legitimacy
| Parameter | Default | Notes |
| --- | --- | --- |
| DEMOGRAPHIC_WEIGHT | 0.4 | Weight of demographic alignment |
| INSTITUTIONAL_WEIGHT | 0.3 | Weight of pre-war authority |
| COERCION_PENALTY_INCREMENT | 0.2 | Per coercive flip |
| COERCION_DECAY_RATE | 0.01 | Per-turn decay |
| STABILITY_BONUS_RATE | 0.01 | Per-turn stability bonus |
| STABILITY_BONUS_CAP | 0.3 | Maximum stability bonus |
| RECRUITMENT_LEGITIMACY_MIN | 0.5 | Minimum recruitment multiplier |

### System 5: Enclave Integrity
| Parameter | Default | Notes |
| --- | --- | --- |
| SUPPLY_INTEGRITY_WEIGHT | 0.4 | Integrity component weight |
| AUTHORITY_INTEGRITY_WEIGHT | 0.3 | Integrity component weight |
| POPULATION_INTEGRITY_WEIGHT | 0.2 | Integrity component weight |
| CONNECTIVITY_INTEGRITY_WEIGHT | 0.1 | Integrity component weight |
| INTEGRITY_DECAY_RATE | 0.02 | Per-turn decay under siege |
| HUMANITARIAN_PRESSURE_MULTIPLIER | 1.0 | Pressure scaling |
| CAPITAL_ENCLAVE_VISIBILITY | 3.0 | Visibility multiplier |
| INTEGRITY_COLLAPSE_THRESHOLD | 0.1 | Collapse threshold |

### System 6: Sarajevo Exceptions
| Parameter | Default | Notes |
| --- | --- | --- |
| SARAJEVO_INTEGRITY_FLOOR | 0.15 | Minimum integrity |
| SARAJEVO_DEGRADATION_RATE | 0.5 | Slower degradation multiplier |
| SARAJEVO_PRESSURE_MULTIPLIER | 3.0 | Humanitarian pressure |
| SARAJEVO_EXHAUSTION_RBIH | 3.0 | Exhaustion per turn |
| SARAJEVO_EXHAUSTION_RS | 2.0 | Exhaustion per turn |
| SARAJEVO_ISOLATION_RATE | 0.05 | Diplomatic isolation increase |

### System 7: Negotiation Capital
| Parameter | Default | Notes |
| --- | --- | --- |
| BASE_CAPITAL | 100.0 | Starting negotiation capital |
| EXHAUSTION_CAPITAL_MULTIPLIER | 0.5 | Capital reduction per exhaustion |
| TERRITORIAL_CONTROL_BONUS | 0.1 | Bonus per controlled value |
| IVP_MOMENTUM_PENALTY | 10.0 | Capital reduction from IVP |
| PATRON_COMMITMENT_BONUS | 5.0 | Capital increase from patron support |
| CEDING_MULTIPLIER_HIGH | 1.0 | Cost multiplier for assets |
| CEDING_MULTIPLIER_LOW | 0.4 | Cost multiplier for liabilities |
| GAINING_MULTIPLIER_HIGH | 0.8 | Value multiplier for gains |
| GAINING_MULTIPLIER_LOW | 0.3 | Value multiplier for liabilities |

### System 8: AoR Assignment
| Parameter | Default | Notes |
| --- | --- | --- |
| FRONT_ACTIVE_REQUIRE_AOR | true | Front-active settlements must be assigned |
| AOR_EXCLUSIVE_ASSIGNMENT | true | One brigade per settlement |
| AOR_FACTION_MATCH_REQUIRED | true | AoR faction must match control |
| REAR_ZONE_NO_AOR | true | Rear zones may have no AoR |

### System 9: Tactical Doctrines
| Parameter | Default | Notes |
| --- | --- | --- |
| INFILTRATE_TERRAIN_BONUS | 0.3 | Mountains/forest bonus |
| INFILTRATE_VS_STATIC_DEFENSE | 0.4 | Effectiveness vs static defense |
| INFILTRATE_EXHAUSTION_MULT | 1.1 | Exhaustion multiplier |
| ARTILLERY_COUNTER_DEFENSE_BONUS | 0.25 | Defense vs attack |
| ARTILLERY_COUNTER_AMMO_MULT | 1.5 | Ammo consumption multiplier |
| COORDINATED_STRIKE_PRESSURE_MULT | 1.4 | Base pressure multiplier |
| COORDINATED_STRIKE_DURATION | 4 | Max turns before refit |

### System 10: Capability Progression
| Parameter | Default | Notes |
| --- | --- | --- |
| ARBIH_1992_EQUIP_ACCESS | 0.15 | Start-of-war access |
| ARBIH_1995_EQUIP_ACCESS | 0.50 | Late-war access |
| VRS_1992_EQUIP_OPERATIONAL | 0.90 | JNA inheritance |
| VRS_1995_EQUIP_OPERATIONAL | 0.50 | Late-war degradation |
| HVO_1994_POST_WASH_EQUIP | 0.65 | Post-Washington access |
| EXPERIENCE_GAIN_IN_COMBAT | 0.02 | Per turn in combat |

### System 11: Contested Control
| Parameter | Default | Notes |
| --- | --- | --- |
| STABILITY_SECURE_MIN | 60 | SECURE threshold |
| STABILITY_CONTESTED_MIN | 40 | CONTESTED threshold |
| HIGHLY_CONTESTED_AUTOFLIP | true | Eligible for early flip |

---

## Appendix C: Doctrine eligibility and effects (System 9)
These rules are deterministic and evaluated per formation per turn.

### C.1 Eligibility rules
| Doctrine | Faction | Eligibility conditions |
| --- | --- | --- |
| INFILTRATE | ARBiH | cohesion > 70; experience > 0.6; equipment_ratio < 0.5; supply_state >= ADEQUATE |
| ARTILLERY_COUNTER | RS | operational_heavy > 60; ammunition_resupply_rate > 0.6; supply_state >= ADEQUATE; defensive_posture true |
| COORDINATED_STRIKE | HRHB | croatian_pipeline_status > 0.6; HV coordination enabled; operational_heavy > 50; corridor not CUT |

### C.2 Posture effects (baseline)
| Doctrine | Pressure multiplier | Exhaustion multiplier | Equipment tempo |
| --- | --- | --- | --- |
| INFILTRATE | 0.8 | 1.1 | 0.4 |
| ARTILLERY_COUNTER | 0.0 (defensive) | 1.2 | 1.3 |
| COORDINATED_STRIKE | 1.4 | 1.25 | 1.1 (with HV maintenance) |

### C.3 Interaction matrix (attacker -> defender)
| Attacker -> Defender | INFILTRATE | ARTILLERY_COUNTER | COORDINATED_STRIKE | STATIC_DEFENSE |
| --- | --- | --- | --- | --- |
| INFILTRATE | 0 / 0 | -0.3 / +0.3 | 0 / 0 | +0.4 / -0.2 |
| ATTACK | 0 / 0 | -0.25 / +0.25 | 0 / 0 | +0.2 / -0.2 |
| COORDINATED_STRIKE | 0 / 0 | +0.2 / +0.1 | 0 / 0 | +0.3 / -0.3 |

---

## Appendix D: Capability progression curves (System 10)
All values are deterministic by turn/year index. These are default curves and may be tuned only with a recorded parameter change.

### D.1 ARBiH capability profile (1992-1995)
| Year | equipment_access | training_quality | organizational_maturity | doctrine_effectiveness |
| --- | --- | --- | --- | --- |
| 1992 | 0.15 | 0.35 | 0.25 | INFILTRATE 0.6; ATTACK 0.5; DEFEND 0.6 |
| 1993 | 0.25 | 0.55 | 0.45 | INFILTRATE 0.75; ATTACK 0.65; DEFEND 0.75 |
| 1994 | 0.40 | 0.75 | 0.70 | INFILTRATE 0.85; ATTACK 0.80; DEFEND 0.85 |
| 1995 | 0.50 | 0.85 | 0.85 | INFILTRATE 0.90; ATTACK 0.90; DEFEND 0.90 |

### D.2 VRS capability profile (1992-1995)
| Year | equipment_operational | supply_access | training_quality | organizational_maturity | doctrine_effectiveness |
| --- | --- | --- | --- | --- | --- |
| 1992 | 0.90 | 0.85 | 0.80 | 0.85 | ARTILLERY_COUNTER 1.0; STATIC_DEFENSE 0.95; ATTACK 0.90 |
| 1993 | 0.75 | 0.75 | 0.75 | 0.80 | ARTILLERY_COUNTER 0.9; STATIC_DEFENSE 0.90; ATTACK 0.80 |
| 1994 | 0.60 | 0.55 | 0.70 | 0.75 | ARTILLERY_COUNTER 0.75; STATIC_DEFENSE 0.80; ATTACK 0.65 |
| 1995 | 0.50 | 0.55 | 0.65 | 0.70 | ARTILLERY_COUNTER 0.65; STATIC_DEFENSE 0.75; ATTACK 0.55 |

### D.3 HRHB capability profile (1992-1995)
| Year | equipment_access | training_quality | organizational_maturity | croatian_support | doctrine_effectiveness |
| --- | --- | --- | --- | --- | --- |
| 1992 | 0.60 | 0.50 | 0.45 | 0.70 | ATTACK 0.65; DEFEND 0.70 |
| 1993 | 0.55 | 0.45 | 0.40 | 0.80 | ATTACK 0.60; DEFEND 0.65 |
| 1994_pre | 0.50 | 0.50 | 0.45 | 0.50 | ATTACK 0.55; DEFEND 0.70 |
| 1994_post | 0.65 | 0.65 | 0.60 | 0.90 | COORDINATED_STRIKE 0.75; ATTACK 0.70; DEFEND 0.80 |
| 1995 | 0.70 | 0.75 | 0.70 | 1.00 | COORDINATED_STRIKE 0.90; ATTACK 0.80; DEFEND 0.85 |

---

## Appendix E: Stability score calculation (System 11)
Stability Score = Base (50) + Demographic + Organizational + Geographic.

### E.1 Demographic modifiers
| Condition | Modifier |
| --- | --- |
| Controller population > 60% | +25 |
| Controller population 50-60% | +15 |
| Controller population 40-50% | +5 |
| Controller population < 40% | -15 |

### E.2 Organizational modifiers
| Condition | Modifier |
| --- | --- |
| Police loyal to controller | +15 |
| Police mixed | -10 |
| Police hostile | -15 |
| Territorial Defense controlled | +15 |
| Territorial Defense contested | -10 |
| SDS penetration strong (non-RS areas) | -15 |
| Patriotska Liga strong (RBiH areas) | +10 |
| JNA garrison in RS-aligned area | +10 |
| JNA garrison in non-RS area | -10 |

### E.3 Geographic modifiers
| Condition | Modifier |
| --- | --- |
| Adjacent to hostile majority | -20 |
| Strategic corridor location | -10 |
| Isolated/enclave | -10 |
| Connected to friendly rear | +10 |
