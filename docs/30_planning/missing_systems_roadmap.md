# A War Without Victory (AWWV)
# Missing systems roadmap and canonization plan

## Purpose and scope
This document consolidates and integrates:
1. *AWWV_Gap_Systems_v2_0_Addendum.md*
2. *AWWV_Gap_Systems_Implementation_v1_0_0.md*

Its purpose is to provide a single, implementation-ready roadmap for canonizing all historically discussed but currently missing or under-specified systems in A War Without Victory. It is written so that an external expert, unfamiliar with prior conversations but fluent in systems design and simulation engineering, can understand what is missing, why it matters, how it fits the existing engine, and exactly how to implement it without violating established invariants.

This is not a design brainstorm. All systems listed here are treated as *already conceptually agreed* and pending formal canon integration.

---

## Canon baseline and assumptions

This roadmap assumes:
- Deterministic, turn-based engine execution
- No randomization anywhere in state evolution
- Negative-sum conflict model
- Separation of control, authority, legitimacy, logistics, and exhaustion
- Settlement-first spatial substrate with derived fronts
- Pre-1991 municipalities as the authoritative political unit

All new systems must:
- Be serializable
- Be auditable per turn
- Degrade or constrain over time rather than empower
- Never hard-code historical outcomes

---

## High-level gap summary

Across ChatGPT and Claude discussions, eight major systems repeatedly appeared as *structurally necessary* but were never fully canonized. Their absence creates analytical blind spots and forces ad-hoc explanations for historically central dynamics.

The missing systems are:

1. External patron pressure and international visibility
2. Arms embargo asymmetry
3. Heavy equipment and maintenance degradation
4. Legitimacy as a distinct political variable
5. Enclave integrity and humanitarian pressure
6. Sarajevo exception mechanics
7. Negotiation capital and territorial valuation
8. Formal Area of Responsibility (AoR) assignment rules

These systems are tightly coupled. Canonization must therefore be staged, not piecemeal.

---

## Dependency graph (conceptual)

Legitimacy and AoR are foundational political-military layers. External pressure and embargoes shape material constraints. Equipment degradation translates material asymmetry into long-term attrition. Enclaves and Sarajevo convert spatial isolation into political cost. Negotiation capital resolves accumulated pressure into settlement.

In dependency order:

1. Legitimacy system
2. AoR formalization
3. External patron pressure (IVP)
4. Arms embargo asymmetry
5. Heavy equipment and maintenance
6. Enclave integrity
7. Sarajevo exception rules
8. Negotiation capital and treaty acceptance

---

## System-by-system canonization roadmap

### Phase 1 — Political and military foundations

#### System A: Legitimacy (settlement-level)

**Why it is missing:**
Control and authority currently exist, but there is no variable capturing perceived rightfulness of rule. This forces coercion, occupation, and voluntary compliance into the same bucket.

**What it adds:**
- Recruitment efficiency
- Authority consolidation speed
- Resistance to pressure flips
- Exhaustion penalties for illegitimate control

**Canon steps:**
1. Add `legitimacy_state` to settlement schema
2. Compute legitimacy from:
   - Demographic alignment
   - Pre-war institutional inheritance
   - Duration of stable control
   - Coercion penalties
3. Integrate legitimacy into:
   - Authority consolidation rules
   - Recruitment pools
   - Exhaustion accumulation
   - Territorial valuation (later)
4. Enforce monotonic erosion under displacement and coercion

**Invariant additions:**
- Control ≠ legitimacy
- Military success cannot directly increase legitimacy

---

#### System B: Area of Responsibility (AoR)

**Why it is missing:**
AoR exists implicitly in code but is not enforced as a rule, allowing undefined responsibility at the front.

**What it adds:**
- Clear responsibility for every front-active settlement
- Deterministic front emergence
- Clean separation of rear vs front zones

**Canon steps:**
1. Define `front-active settlement`
2. Add `assigned_brigade` to settlement state
3. Enforce:
   - Every front-active settlement has exactly one brigade
   - Rear settlements may have none
4. Tie pressure generation strictly to AoR
5. Validate AoR invariants every turn

**Invariant additions:**
- Political control precedes AoR
- AoR never confers ownership

---

### Phase 2 — External constraint systems

#### System C: External patron pressure and IVP

**Why it is missing:**
Washington Agreement, sanctions, and diplomatic isolation currently have no systemic representation.

**What it adds:**
- Asymmetric exhaustion pressure
- Negotiation momentum independent of battlefield success
- Gradual constraint tightening over time

**Canon steps:**
1. Add `patron_state` to factions
2. Add global `international_visibility_pressure`
3. Accumulate IVP from:
   - Sarajevo siege duration
   - Enclave humanitarian pressure
   - Atrocity-scale displacement events
4. Feed IVP into:
   - Exhaustion
   - Negotiation thresholds
   - Diplomatic isolation

**Key rule:**
Patrons constrain options, they never enable victory.

---

#### System D: Arms embargo asymmetry

**Why it is missing:**
Force composition differences are currently abstracted away.

**What it adds:**
- Structural asymmetry between VRS, ARBiH, and HVO
- Long-term sustainability differences

**Canon steps:**
1. Add `embargo_profile` per faction
2. Define equipment access ceilings
3. Model smuggling as slow, deterministic improvement
4. Feed embargo effects into equipment acquisition and ammo resupply

**Key rule:**
Embargo effects are differential, not binary.

---

### Phase 3 — Material degradation

#### System E: Heavy equipment and maintenance

**Why it is missing:**
Heavy equipment currently behaves as permanent capability.

**What it adds:**
- Irreversible degradation
- Trade-off between tempo and sustainability
- Maintenance as a strategic constraint

**Canon steps:**
1. Add `equipment_state` to formations
2. Add `maintenance_capacity` to factions
3. Implement degradation based on operational tempo
4. Implement limited maintenance and repair rules
5. Tie equipment state directly to pressure output

**Key rule:**
Heavy equipment is a wasting asset.

---

### Phase 4 — Spatial political liabilities

#### System F: Enclave integrity

**Why it is missing:**
Enclaves currently exist spatially but not politically.

**What it adds:**
- Deterministic siege degradation
- Humanitarian pressure as a cost
- Enclaves as negotiation liabilities

**Canon steps:**
1. Detect enclaves via graph connectivity
2. Track integrity components:
   - Supply
   - Authority
   - Population
   - Connectivity
3. Accumulate humanitarian pressure
4. Trigger collapse conditions deterministically
5. Feed pressure into IVP and exhaustion

---

#### System G: Sarajevo exception rules

**Why it is missing:**
Sarajevo cannot be modeled as a normal enclave without distortion.

**What it adds:**
- Amplified international pressure
- Dual-sided exhaustion
- Negotiation red-line logic

**Canon steps:**
1. Define Sarajevo cluster explicitly
2. Apply special integrity floor and pressure multipliers
3. Enforce Sarajevo clauses in any treaty
4. Feed siege visibility directly into IVP

**Key rule:**
Sarajevo degrades slower but costs more.

---

### Phase 5 — War termination mechanics

#### System H: Negotiation capital and territorial valuation

**Why it is missing:**
Treaty acceptance exists, but without an explicit economic logic.

**What it adds:**
- Explicit trade-offs
- Liability-driven negotiation space
- External pressure resolution

**Canon steps:**
1. Add `negotiation_state` to factions
2. Derive capital from exhaustion, IVP, and patron pressure
3. Value territory by sustainability, not size
4. Enforce red lines and required clauses
5. Compute acceptance deterministically

**Key rule:**
Liabilities are cheaper to give up than assets.

---

## Canon integration checklist

For each system:
- Engine Invariants update
- Systems Manual specification
- Rulebook player-facing explanation
- Serialization schema update
- Validation rules
- Unit and integration tests

No system is considered canon until all five are complete.

---

## Implementation discipline

- One system per branch
- One phase-scoped commit per system
- Ledger entry for every canon change
- No silent tuning or undocumented constants

---

## Outcome

Once this roadmap is executed, AWWV will:
- Systemically explain Washington-style settlements
- Model why heavy equipment advantages erode
- Make enclaves politically costly, not just spatial
- Separate occupation from governance
- Force negotiation without scripting outcomes

This completes the transition from a mechanically sound war simulator to a structurally complete strategic conflict model.
