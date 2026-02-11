# Canon v0.3 Change Proposal

**Project:** A War Without Victory
**Proposal Date:** 2026-02-02
**Current Canon Version:** v0.2.7
**Proposed Canon Version:** v0.3.0
**Prepared By:** External Expert Adviser

---

## Executive Summary

This proposal advances project canon from v0.2.7 to v0.3.0 by:

1. **Restoring early systems** inadvertently omitted from v0.2.7 (Stability Score, Declaration mechanics, Control Strain, turn resolution)
2. **Adding Pre-War Phase** to model organizational preparation and political positioning before sustained violence
3. **Formalizing Early-War Phase (Phase I)** as distinct from main war brigade-AoR mechanics
4. **Filling critical gaps** (temporal frame, command degradation, pre-negotiation diplomacy)
5. **Maintaining v0.2.7 excellence** (political control substrate, Phases 3A/B/C, determinism doctrine, peace treaty mechanics)

### Major Changes Summary

| System | Status in v0.2.7 | Change Type | Priority |
|--------|------------------|-------------|----------|
| Temporal Frame (weekly turns) | Implicit | **ADDITION** | CRITICAL |
| Stability Score System | Absent | **RESTORATION** | CRITICAL |
| Control Strain (renamed from IVP) | Absent | **RESTORATION** | CRITICAL |
| Declaration System (RS, HRHB) | Absent | **RESTORATION** | CRITICAL |
| Pre-War Phase | Absent | **ADDITION** | HIGH |
| Phase I (Early-War) Specification | Implicit | **FORMALIZATION** | HIGH |
| Turn Order Revision | Partial | **EXPANSION** | HIGH |
| Command Degradation Mechanics | Underspecified | **EXPANSION** | HIGH |
| Pre-Negotiation Diplomacy | Absent | **ADDITION** | MEDIUM |
| JNA Transition Mechanics | Absent | **ADDITION** | MEDIUM |
| Pressure Injection Framework | Absent | **ADDITION** | MEDIUM |

### What Remains Unchanged

- Political control substrate (Engine Invariants §9)
- Pressure eligibility and diffusion (Phase 3A)
- Pressure → exhaustion coupling (Phase 3B)
- Exhaustion → collapse gating (Phase 3C)
- Peace treaty mechanics (Systems Manual §20)
- Determinism doctrine (all documents)
- Negative-sum framing (all documents)

---

## Document-by-Document Changes

### 1. Engine Invariants v0.2.7 → v0.3.0

#### 1.1 Add Section 1.5: Temporal Frame

**NEW SECTION:**

```markdown
## 1.5 Temporal Frame

One game turn represents one calendar week.

All persistence thresholds, degradation rates, recovery times, and temporal
constraints must be expressed and reasoned in weekly increments.

No system may use or imply a different time scale without explicit derivation
from the weekly frame.
```

**Rationale:** The weekly turn scale is mentioned in briefings but nowhere codified in canonical documents. All temporal reasoning depends on this foundation.

**Confidence:** MAXIMUM

---

#### 1.2 Add Section 15: Pre-War Phase Invariants

**NEW SECTION:**

```markdown
## 15. Pre-War Phase Invariants

### 15.1 No Military Formations in Pre-War

No militia, brigades, or organized military formations may exist during
Pre-War Phase.

Coercive capacity exists through institutional presence (police, TO, JNA)
but not through formations with Areas of Responsibility.

### 15.2 No Control Transfer via Force in Pre-War

Municipal political control may not transfer via coercion during Pre-War Phase.

Authority may degrade; control may not flip.

### 15.3 Latent Effects Only

All Pre-War Phase effects are latent modifiers carried forward to Phase I.

No direct territorial, military, or control outcomes may occur in Pre-War Phase.

### 15.4 Declaration Emergence

Declarations (RS, HRHB) may not be player-triggered buttons.

Declarations become possible when enabling conditions accumulate.

Possibility does not guarantee occurrence.

Players may influence timing but cannot force or prevent declarations
if conditions are met.

### 15.5 Transition Threshold

Pre-War Phase ends when sustained organized violence meets escalation threshold.

Threshold is multi-causal and emergent, not date-triggered:
- Sustained armed clashes between organized groups
- Monopoly on force collapse in multiple municipalities
- Inter-faction relationship breakdown to hostile state

Transition is irreversible.
```

**Rationale:** Pre-War Phase requires explicit invariants preventing outcome-scripting and forced historical replication.

**Confidence:** HIGH

---

#### 1.3 Add Section 16: Control Strain Invariants

**NEW SECTION:**

```markdown
## 16. Control Strain Invariants

### 16.1 Control Strain Definition

Control Strain represents the cumulative burden of maintaining control over
hostile populations through coercion rather than consolidated authority.

Control Strain is distinct from exhaustion. Exhaustion is irreversible cumulative
damage; Control Strain is present burden that may decrease if authority consolidates.

### 16.2 Control Strain Accumulation

Control Strain accumulates from:
- Newly flipped settlements with hostile demographic majorities
- Displaced populations under faction control
- Coercive control without consolidated authority
- Prolonged occupation without legitimacy

Control Strain does NOT accumulate from:
- Control over demographic majority territories with consolidated authority
- Voluntary alignment
- Rear Political Control Zones with stable authority

### 16.3 Control Strain Effects

High Control Strain:
- Amplifies exhaustion accumulation rates
- Erodes internal and external legitimacy
- Increases fragmentation risk
- Elevates international humanitarian pressure

Control Strain effects are proportional and continuous, not threshold-triggered.

### 16.4 Control Strain Mitigation

Control Strain may decrease through:
- Authority consolidation over time (if conditions permit)
- Demographic change (via displacement or voluntary migration)
- Political settlement granting legitimacy

Control Strain mitigation is slow, conditional, and never guaranteed.

Displacement reduces Control Strain in one municipality but increases
exhaustion globally.

### 16.5 Control Strain and Negative-Sum War

Control Strain ensures territorial expansion via force is costly and constrained.

Conquest without authority creates long-term burdens, not automatic advantages.

Factions cannot pursue unlimited territorial maximalism without systemic collapse.
```

**Rationale:** Control Strain (restored from early IVP system) is a core constraint preventing pure military optimization. Requires invariant-level specification to prevent bypassing.

**Confidence:** HIGH

---

#### 1.4 Terminology Standardization

**CHANGE:** Throughout Engine Invariants:

- Replace any instances of "pre-frontline phase" with "Early-War Phase" (if present)
- Replace any instances of "Municipal Control Zones" with "Municipal Control Zones (MCZs)" for consistency

**Rationale:** Terminology harmonization across all canon documents.

**Confidence:** HIGH

---

### 2. Phase Specifications v0.2.7 → v0.3.0

#### 2.1 Add Phase Taxonomy Structure

**NEW SECTION (before Appendix A):**

```markdown
# Phase Taxonomy and Structure

## Macro-Phase Organization

The simulation is organized into macro-phases representing structurally distinct
periods of the conflict:

### Phase 0: Pre-War (Sept 1991 - April 1992)
- Organizational preparation and political positioning
- No military formations, no control flips via force
- Outputs: Latent modifiers, declaration eligibility, initial conditions

### Phase I: Early-War (April 1992 - Sustained Front Formation)
- Militia emergence, coercive control, initial territorial contestation
- Control flips via Stability + Pressure mechanics
- No AoRs (Areas of Responsibility not yet instantiated)
- High fluidity, rapid territorial change, declaration triggers

### Phase II: Frontline War (Sustained Fronts - Collapse/Negotiation)
- AoRs instantiated, brigade-level fronts emerge
- Pressure systems active (Phases 3A/B/C)
- Fronts harden, exhaustion accumulates, collapse gating
- Negotiation windows open

### Phase III: Endgame (Collapse or Negotiation)
- Exhaustion-driven breakdown or negotiated settlement
- War termination mechanics

## Phase Transition Criteria

Phases transition based on systemic conditions, not dates or turn counts:

**Pre-War → Early-War:**
- Sustained organized violence between armed groups
- Monopoly on force collapse in multiple municipalities
- Inter-faction relationships hostile

**Early-War → Frontline War:**
- Sustained opposing brigade deployments create continuous contact
- AoR system instantiation conditions met
- Front stabilization (reduced flip frequency)

**Frontline War → Endgame:**
- Exhaustion thresholds crossed
- Collapse eligibility triggered
- Negotiation acceptance thresholds met
- External imposition

## Overlapping Systems

Some systems operate across multiple phases:
- **Authority:** All phases
- **Exhaustion:** Phase I onward (begins accumulating in Early-War)
- **Control Strain:** Phase I onward
- **Supply:** Phase II onward (militarized logistics)
- **Negotiation:** Phase II onward (pre-terminal only in Phase II+)

## Design Constraint

No single system may operate identically across all phases.

Each phase must have mechanically distinct behavior appropriate to
historical conditions.

Attempting to use "one model for all periods" violates structural integrity.
```

**Rationale:** Current canon lacks explicit phase taxonomy. Systems are specified but temporal boundaries are unclear. This provides structural clarity.

**Confidence:** HIGH

---

#### 2.2 Add Appendix D: Phase 0 Specification

**NEW APPENDIX:** See separate document `Phase_0_Specification_v0_3_0.md` for full frozen specification.

**Summary of Contents:**
- Pre-War Phase purpose and scope
- Organizational penetration mechanics
- Alliance management (RBiH-HRHB)
- Declaration pressure accumulation
- Stability Score initialization
- Hand-off to Phase I (latent modifiers only)
- Explicit non-effects (no formations, no flips, no combat)

---

#### 2.3 Add Appendix E: Phase I Specification

**NEW APPENDIX:** See separate document `Phase_I_Specification_v0_3_0.md` for full frozen specification.

**Summary of Contents:**
- Early-War Phase purpose and scope
- Militia emergence mechanics
- Stability Score + Pressure → Flip mechanics
- Post-flip consolidation periods
- Control Strain accumulation
- Declaration triggers and effects
- JNA transition mechanics
- Transition to Phase II (AoR instantiation)

---

### 3. Systems Manual v0.2.7 → v0.3.0

#### 3.1 Section 1: Add Temporal Frame Specification

**INSERT** at beginning of Section 1:

```markdown
### 1.1 Temporal Scale

One game turn equals one calendar week.

All system specifications, persistence requirements, and degradation rates
are expressed in weekly increments.

Systems requiring different granularity must explicitly derive from the
weekly frame.
```

**Rationale:** Systems Manual must specify temporal frame for all mechanics.

---

#### 3.2 Section 1: Revise Turn Order

**REPLACE** existing turn phase list with:

```markdown
**Turn phases:**

1. **Directive Phase** - Player input (orders, posture, allocations)
2. **Declaration Phase** - Check declaration eligibility (RS, HRHB)
3. **Deployment Commitment Phase** - Formation positioning finalized
4. **Military Interaction Phase** - Pressure generation and application
5. **Control Resolution Phase** - Flip checks, post-flip consolidation
6. **Displacement Phase** - Population movement from flips
7. **Supply Resolution Phase** - Corridor states, supply tracing
8. **Political Effects Phase** - Authority, legitimacy, fragmentation
9. **Control Strain Resolution Phase** - Control Strain accumulation and effects
10. **Exhaustion Update Phase** - Exhaustion accumulation from all sources
11. **Persistence Phase** - Counters increment, eligibility checks

No system may resolve outside its designated phase.

**Phase applicability:**
- Phases 1-11: Phase II (Frontline War) onward
- Phases 1, 2, 4-11: Phase I (Early-War), modified mechanics
- Phase 0 (Pre-War): Distinct turn structure (see Phase 0 Specification)
```

**Rationale:** Integrates Declaration Phase, Control Resolution Phase (replaces vague "control flips"), Displacement Phase, and Control Strain Resolution Phase from early systems.

**Confidence:** HIGH

---

#### 3.3 Section 3: Rename and Expand Early-War Phase

**REPLACE** Section 3 title:

FROM: `## 3. Early-war and pre-frontline phase`
TO: `## 3. Phase I: Early-War`

**ADD** explicit subsections:

```markdown
## 3. Phase I: Early-War

### 3.1 Phase Characteristics

Phase I represents the transition from political contest to organized violence.

Characteristics:
- Militia-based forces, limited brigade formation
- High territorial fluidity
- Control via coercion and demographic alignment, not sustained fronts
- AoRs not yet instantiated
- Declarations (RS, HRHB) may trigger
- Control Strain begins accumulating

### 3.2 Transition from Pre-War (Phase 0)

Phase I inherits from Phase 0:
- Organizational penetration modifiers
- Alliance strain (RBiH-HRHB initial state)
- Authority degradation
- Declaration eligibility states
- Stability Scores (per municipality)

### 3.3 Militia Emergence

Militia forces emerge from local populations based on:
- Demographic composition
- Organizational penetration (from Phase 0)
- Authority state
- Threat perception

Militia have:
- Low cohesion
- Limited operational range
- Dependence on local authority
- High sensitivity to legitimacy

### 3.4 Coercive Control

During Early-War, control is established through:
- Armed presence and intimidation
- Demographic alignment (voluntary or coerced)
- Institutional capture (police, TO, local government)
- Displacement of hostile populations

Control is contested, fragile, and rapidly reversible.

### 3.5 Stability + Pressure Mechanics

Control flips occur when:

**Stability Score + Applied Pressure ≥ Flip Threshold**

See Phase I Specification for complete mechanics.

### 3.6 No Areas of Responsibility in Phase I

During Phase I, brigades (if formed) do not hold Areas of Responsibility.

AoRs are instantiated only when:
- Sustained opposing brigade contact creates continuous fronts
- Territorial fluidity decreases below threshold
- Supply systems militarize

Transition to Phase II (Frontline War) occurs when AoR conditions are met.
```

**Rationale:** Current §3 is vague and underspecified. This formalizes Early-War as a distinct phase with unique mechanics.

**Confidence:** HIGH

---

#### 3.4 Add Section 6.7: Command Degradation Mechanics

**NEW SUBSECTION** under §6 (Deployment and fronts):

```markdown
### 6.7 Command Degradation and Intent Divergence

As exhaustion rises and authority erodes, command coherence declines.

Command coherence represents the ability to translate political intent into
coordinated action.

#### 6.7.1 Command Coherence Tracking

Each faction tracks Command Coherence, range [0, 1].

Initial values:
- RBiH: 0.5 (institutional fragmentation, diverse composition)
- RS: 0.8 (JNA inheritance, ethnic homogeneity, authoritarian structure)
- HRHB: 0.6 (external patron support, internal tensions with RBiH)

#### 6.7.2 Degradation Factors

Command Coherence declines from:
- Accumulated exhaustion (all types)
- Authority fragmentation
- Supply corridor brittleness
- Patron pressure or withdrawal
- Internal legitimacy collapse
- Prolonged static fronts
- High Control Strain

Degradation is gradual, monotonic, and mostly irreversible.

#### 6.7.3 Command Degradation Effects

Low command coherence produces:

**Delays (Coherence < 0.6):**
- Orders execute 1-2 turns late
- AoR reshaping takes longer
- Reinforcement allocation delayed

**Partial Compliance (Coherence < 0.5):**
- AoR reshaping incomplete
- Posture changes ignored by some brigades
- Operational Group formation fails

**Misallocation (Coherence < 0.4):**
- Requested reinforcements go elsewhere
- Supply priorities overridden by local commanders
- Brigade refuses AoR expansion orders

**Non-Execution (Coherence < 0.3):**
- Orders simply not followed
- Brigades act autonomously
- Fragmentation imminent

#### 6.7.4 Player Visibility

Players see:
- Intended orders (what they commanded)
- Actual outcomes (what happened)
- Divergence annotations (why orders failed)

Players have NO direct control over command coherence recovery.

Recovery requires:
- Reduced exhaustion (impossible—exhaustion is irreversible)
- Authority consolidation (difficult)
- Patron support (conditional)
- War termination (endgame)

#### 6.7.5 Design Intent

Player intent must never propagate cleanly in late-war conditions.

Command degradation ensures the war becomes uncontrollable as exhaustion mounts.

This is a core negative-sum mechanic: continuing the war makes it impossible to end.
```

**Rationale:** Current canon mentions command degradation but provides no mechanics. This is critical for preventing clean player control in late-war.

**Confidence:** HIGH

---

#### 3.5 Add Section 20.0: Pre-Negotiation Diplomacy

**INSERT** new subsection before §20.1:

```markdown
### 20.0 Pre-Negotiation Diplomacy

Diplomatic activity occurs throughout the war but does not end it.

Pre-negotiation diplomacy creates pressure, constraints, and exhaustion effects
without triggering war termination.

#### 20.0.1 Ceasefire Proposals

Ceasefires may be proposed by:
- Factions (bilateral or multilateral)
- International mediators
- Patron states

Ceasefire characteristics:
- Non-binding (compliance is voluntary)
- Temporary (duration specified or conditional)
- Local or general (may apply to specific fronts or war-wide)

Ceasefire compliance:
- Voluntary, based on exhaustion and strategic position
- May degrade over time
- Violations increase exhaustion (domestic and international pressure)
- Repeated violations reduce legitimacy

Ceasefire effects:
- Reduces pressure generation while active and complied with
- Does NOT stop exhaustion accumulation (static fronts still costly)
- May open negotiation windows
- Creates diplomatic precedent

#### 20.0.2 Interim Agreements

Factions may negotiate interim agreements on:
- Humanitarian corridors
- Prisoner exchanges
- Civilian evacuations
- Localized ceasefires
- UN access

Interim agreements:
- Do NOT constitute peace treaties
- Do NOT end the war
- May improve authority or reduce exhaustion temporarily
- Constrain future actions (violating agreements costly)

#### 20.0.3 International Mediation

External actors propose territorial/institutional frameworks throughout the war:
- Cutileiro Plan (Feb-Mar 1992)
- Vance-Owen Plan (Jan 1993)
- Contact Group Plan (1994)
- Washington Agreement framework (Feb 1994)
- Dayton framework (Nov 1995)

Mediation proposals create pressure to accept or reject:
- Acceptance: Constrains future negotiation space, may require territorial concessions
- Rejection: Legitimacy cost (varies by patron alignment and proposal content)

Proposals do NOT:
- Force acceptance
- Script outcomes
- Guarantee war termination
- Override player agency

Proposals DO:
- Shift exhaustion thresholds
- Modify patron behavior
- Open/close negotiation windows
- Create diplomatic precedent

#### 20.0.4 Design Constraint

Diplomatic activity creates pressure and exhaustion effects.

Diplomacy does NOT script outcomes or provide cost-free benefits.

All diplomatic actions have consequences.
```

**Rationale:** Current canon jumps directly to terminal peace treaties. This fills the gap for wartime diplomacy that shapes but doesn't end the war.

**Confidence:** MEDIUM-HIGH

---

#### 3.6 Add Section 22: JNA Transition and Disintegration

**NEW SECTION** (after current §21):

```markdown
## 22. JNA Transition and Disintegration

### 22.1 Initial State (Phase 0 / Early Phase I)

At game start, JNA (Yugoslav People's Army) formations are present in
specified garrisons.

JNA characteristics:
- High cohesion and professionalization
- Heavy equipment (armor, artillery)
- Multi-ethnic officer corps with declining cohesion
- Declining legitimacy as federal state collapses

JNA presence:
- Provides coercive capacity in garrison municipalities
- Influences organizational penetration (see Phase 0 Specification)
- Creates initial asymmetry favoring Serb mobilization

### 22.2 Transition Triggers

JNA transition is triggered by:
- International recognition pressure
- Federal government collapse
- BiH independence declaration
- Sustained violence in BiH

Transition is NOT date-triggered.

Transition may occur in Phase 0 (forcing Early-War transition) or early Phase I.

### 22.3 JNA Disintegration Process

When transition triggers:

**Personnel Split:**
- Serb officers and soldiers → VRS (Vojska Republike Srpske, RS forces)
- Bosniak soldiers → desertion or RBiH militia integration
- Croat soldiers → desertion or HRHB militia integration
- Mixed-ethnicity units experience command breakdown

**Equipment Distribution:**
- Heavy equipment disproportionately to VRS
- Distribution based on garrison locations and officer ethnicity
- Creates initial VRS materiel advantage

**Command Structure:**
- VRS inherits JNA command structure and doctrine
- RBiH and HRHB build command structures from scratch

### 22.4 Post-Transition Effects

**VRS Advantages:**
- Inherited professionalization (initial cohesion bonus)
- Heavy equipment superiority
- Established command structures

**VRS Disadvantages:**
- Legitimacy deficit in non-Serb areas
- Overextension risk (inheriting garrisons in hostile territory)
- International isolation
- Early mobilization exhaustion (professional army, not sustainable)

**RBiH/HRHB Response:**
- Militia-based mobilization initially
- Gradual professionalization (requires time, authority, supply)
- Patron dependence for equipment

### 22.5 Authority Vacuum

JNA withdrawal from contested areas creates authority vacuum:
- Control becomes contestable in former garrison municipalities
- Local militias compete for institutional capture
- Triggers Early-War control flips

### 22.6 Design Constraint

JNA transition creates INITIAL ASYMMETRY, not permanent advantage.

VRS inherits equipment and professionalization but also:
- Legitimacy deficit
- Overextension risk
- Exhaustion from early total mobilization

The war is not predetermined by JNA transition.
```

**Rationale:** JNA transition is historically critical but absent from current canon. This provides mechanics without scripting outcomes.

**Confidence:** MEDIUM (requires historical validation from Balkan Battlegrounds)

---

#### 3.7 Add Section 23: Control Strain System

**NEW SECTION:**

```markdown
## 23. Control Strain System

### 23.1 Definition and Purpose

Control Strain represents the cumulative burden of maintaining control over
hostile populations through coercion rather than consolidated authority.

Control Strain is a core negative-sum constraint preventing unlimited
territorial maximalism.

### 23.2 Control Strain Accumulation

Control Strain accumulates per-municipality based on:

**Demographic Hostility:**
- Controlling faction is demographic minority: HIGH strain
- Controlling faction is plurality but <50%: MEDIUM strain
- Controlling faction is majority: LOW strain (may be zero if authority consolidated)

**Authority State:**
- Fragmented authority: AMPLIFIES strain
- Contested authority: INCREASES strain
- Consolidated authority: REDUCES strain (may eliminate if demographic majority)

**Control Method:**
- Coercive control (post-flip, no consolidation): HIGH strain
- Mixed control (partial consolidation): MEDIUM strain
- Legitimate control (consolidated authority + demographic alignment): ZERO strain

**Displacement Effects:**
- Recent displacement (within 4 weeks): VERY HIGH strain
- Displaced population concentration: INCREASES strain in host municipalities

**Time Factor:**
- Prolonged occupation without consolidation: INCREASES strain over time
- Authority consolidation progress: DECREASES strain slowly

### 23.3 Control Strain Effects

Control Strain is tracked per-faction, aggregated from all controlled municipalities.

**Exhaustion Amplification:**
- Each point of Control Strain increases weekly exhaustion accumulation by X%
- High Control Strain makes war progressively more costly

**Legitimacy Erosion:**
- Internal: High Control Strain reduces recruitment, increases desertion
- External: High Control Strain reduces patron support, increases international pressure

**Fragmentation Risk:**
- Control Strain above threshold enables internal resistance
- May trigger municipal control breakdown
- May enable splinter factions

**Command Degradation:**
- Control Strain contributes to command coherence decline
- Local commanders may refuse to enforce coercive control

### 23.4 Control Strain Mitigation

Control Strain may decrease through:

**Authority Consolidation (slow, conditional):**
- Requires: Time (8+ weeks), stable control, supply adequacy
- Effect: Gradual strain reduction if demographic conditions permit
- May never reach zero if demographic hostility remains

**Demographic Shift:**
- Via displacement (reduces strain in source, increases elsewhere temporarily)
- Via voluntary migration (rare in wartime)
- Effect: Reduces demographic hostility factor

**Political Settlement:**
- Negotiated legitimacy (rare, requires broader peace framework)
- Effect: Immediate strain reduction if accepted by population

### 23.5 Control Strain and Displacement Trade-Off

Displacement reduces Control Strain in conquered territory but:
- Increases exhaustion globally (humanitarian costs)
- Increases international pressure (visibility)
- Increases Control Strain temporarily in destination areas (refugee burden)
- Permanently reduces post-war legitimacy

Displacement is NOT a cost-free solution to Control Strain.

### 23.6 Control Strain Visibility

Players see:
- Per-municipality Control Strain contributions
- Total faction Control Strain
- Effects on exhaustion/legitimacy/fragmentation
- Mitigation progress (if authority consolidating)

Players CANNOT:
- Instantly eliminate Control Strain
- Bypass Control Strain through clever play
- Ignore Control Strain consequences

### 23.7 Design Intent

Control Strain ensures conquest is costly.

Factions cannot pursue unlimited territorial expansion without systemic collapse.

Military success without authority creates long-term burdens.

The optimal strategy is NOT "maximize territory" but "control only what can be governed."
```

**Rationale:** Control Strain (restored from early IVP system) is a core constraint. Requires detailed specification in Systems Manual.

**Confidence:** HIGH

---

### 4. Rulebook v0.2.7 → v0.3.0

#### 4.1 Section 2.3: Add Temporal Frame

**INSERT** after existing §2.3 intro:

```markdown
**Each turn represents one calendar week.**

Strategic decisions, military operations, political developments, and exhaustion
accumulation all occur within this weekly frame.
```

**Rationale:** Player-facing temporal frame specification.

---

#### 4.2 Section 3: Expand Phase Structure

**ADD** new subsection:

```markdown
### 3.3 Phases of the War

The war unfolds in distinct phases, each with different mechanics:

**Pre-War (Phase 0):**
- Organizational preparation, political positioning
- Allocate limited capital to shape early-war conditions
- Declarations (RS, HRHB) may emerge from accumulated pressure

**Early-War (Phase I):**
- Militia-based forces, rapid territorial shifts
- Control established through coercion and demographic alignment
- Declarations may trigger, shaping legitimacy and alliances

**Frontline War (Phase II):**
- Brigade-level fronts, Areas of Responsibility
- Sustained combat, pressure, exhaustion accumulation
- Fronts harden, options narrow

**Endgame (Phase III):**
- Collapse or negotiation
- Multiple possible outcomes, none representing total victory

Players experience all phases in sequence.
```

**Rationale:** Players need to understand phase structure.

---

#### 4.3 Section 6: Add Command Friction Expansion

**REPLACE** existing §14.1 content with:

```markdown
### 14.1 Command friction

Players do not have absolute control over their forces.

As exhaustion rises and command coherence declines, orders may:
- **Be delayed** by 1-2 turns
- **Be partially executed** (some brigades comply, others don't)
- **Be redirected** to different priorities by local commanders
- **Be ignored entirely** (especially in late-war with high exhaustion)

This degradation is systemic and cannot be directly reversed.

Continuing the war makes it increasingly uncontrollable.

Players must account for friction when planning operations.
```

**Rationale:** Player-facing explanation of command degradation.

---

#### 4.4 Section 13: Add Pre-Negotiation Diplomacy Overview

**INSERT** new subsection before §13.1:

```markdown
### 13.0 Pre-Terminal Diplomacy

Before the war ends, diplomatic activity continues:

**Ceasefires:**
- Temporary, non-binding agreements to reduce fighting
- Compliance is voluntary and may degrade
- Violations are costly (legitimacy, exhaustion)

**Interim Agreements:**
- Humanitarian corridors, prisoner exchanges, civilian evacuations
- May provide temporary relief but constrain future actions

**International Mediation:**
- External powers propose peace frameworks throughout the war
- Accepting or rejecting proposals has consequences
- No proposal is guaranteed to end the war

These activities create pressure and consequences but do not end the war.

Only peace-triggering treaties (with territorial clauses) end the war.
```

**Rationale:** Players need to understand diplomacy happens throughout war, not just at the end.

---

### 5. Game Bible v0.2.7 → v0.3.0

#### 5.1 Section 3: Add Temporal Frame

**INSERT** after first paragraph of §3:

```markdown
**Each turn represents one calendar week.** This temporal frame governs all
persistence requirements, degradation rates, and strategic timing.
```

---

#### 5.2 Section 5.1: Expand Political Control Substrate

**ADD** at end of §5.1:

```markdown
### Stability vs Control vs Authority

These three concepts are distinct and must not be collapsed:

**Political Control:** Which faction governs (stable by default)

**Stability:** Resistance to flip (dynamic, scored, varies by conditions)

**Authority:** Governance effectiveness (consolidated, contested, fragmented)

Political control is initialized from 1990 elections and demographic/institutional
dominance. It does not change due to absence of force or passage of time.

Stability measures how difficult it is to flip control via coercion. It is
affected by demographics, organization, geography, and authority state.

Authority measures governance capacity—ability to extract compliance, provide
services, maintain order. It degrades under strain and requires consolidation.

All three systems interact but none subsumes the others.
```

**Rationale:** Early systems had explicit three-tier model that was collapsed in current canon. Restoring the distinction improves clarity.

---

#### 5.3 Section 17.1: Add Scripted Events Position

**INSERT** new invariant after existing operational invariants:

```markdown
**No scripted outcomes:** Historical events are possible outcomes of systemic
interaction, not predetermined scripts.

External shocks (UN sanctions, NATO interventions, arms embargo) may occur as
pressure injections when systemic conditions are met, never as forced outcomes.

**No event-driven history:** The simulation does not rely on scripted events
to produce historical plausibility. Systemic pressures and constraints are sufficient.

Historical moments (Srebrenica fall, Dayton negotiations, etc.) are emergent
possibilities from exhaustion, collapse, and pressure dynamics, not mandatory
timeline checkpoints.
```

**Rationale:** Explicit prohibition on scripted outcomes, addressing external shocks framework.

**Confidence:** HIGH

---

#### 5.4 Section 18: Expand Non-Negotiables

**ADD** to historical plausibility paragraph:

```markdown
**Historical plausibility:** The simulation respects the constraints of the
historical conflict without scripting outcomes. Initial conditions, structural
pressures, and external context reflect 1991-1995 BiH.

Historical moments (Srebrenica, Dayton, etc.) are **emergent possibilities**,
not mandatory events. The war may unfold differently than history while remaining
within plausible boundaries.

Systemic constraints (demographics, geography, institutions, external powers)
define the **possibility space**. Players operate within constraints, not on rails.
```

**Rationale:** Clarifies historical grounding philosophy.

---

### 6. context.md Updates

#### 6.1 Add Temporal Frame Note

**INSERT** in Core Design Principles section:

```markdown
### 0. Temporal Frame
- One game turn = one calendar week
- All persistence thresholds, degradation rates expressed weekly
- Critical for Phase 3A/B/C specifications and all temporal reasoning
```

---

#### 6.2 Add Control Strain System

**INSERT** in Core Design Principles section (after Pressure → Exhaustion → Collapse Chain):

```markdown
### Control Strain System
- Measures burden of holding hostile populations via coercion
- Accumulates from flips, displacement, coercive control without authority
- Amplifies exhaustion, erodes legitimacy, enables fragmentation
- Prevents unlimited territorial maximalism
- Distinct from exhaustion (strain is present burden; exhaustion is permanent damage)
```

---

#### 6.3 Update Phase Structure

**REPLACE** Phase 3 description with:

```markdown
### Phase Structure
- **Phase 0 (Pre-War):** Organizational preparation, no formations, no flips
- **Phase I (Early-War):** Militia, coercion, Stability+Pressure flips, declarations
- **Phase II (Frontline War):** AoRs, brigades, pressure diffusion (3A), exhaustion coupling (3B), collapse gating (3C)
- **Phase III (Endgame):** Collapse or negotiation
```

---

#### 6.4 Add Scripted Events Policy

**INSERT** new section:

```markdown
### Scripted Events Policy
- NO scripted outcomes (predetermined territorial/political events)
- LIMITED external shocks (arms embargo, NATO context) as pressure injections
- ACCEPTABLE informational events (no mechanical forcing)
- Historical moments are emergent possibilities, not mandatory scripts
```

---

## New System Specifications

### System 1: Stability Score System

**Full specification in Phase I Specification document.**

**Summary:**

Stability Score measures resistance to control flip, range [0, 100].

**Formula:**
```
Stability = Base (50)
          + Demographic Factors
          + Organizational Factors
          - Geographic Vulnerabilities
```

**Demographic Factors:**
- Controller's population >60%: +25 (Strong Majority)
- Controller's population 50-60%: +15 (Majority)
- Controller's population 40-50%: +5 (Plurality)
- Controller's population <40%: -15 (Minority/Vulnerability)

**Organizational Factors:**
- Police Loyalty (loyal: +15, mixed: -10, hostile: -15)
- TO Control (controlled: +15, contested: -10)
- SDS Penetration (strong in non-RS: -15, strong in RS: +10)
- Patriotska Liga (strong in RBiH: +10)
- JNA Presence (RS areas: +10, non-RS: -10)

**Geographic Vulnerabilities:**
- Adjacent to hostile majority territory: -20
- Strategic route/corridor location: -10
- Isolated/enclave: -10
- Connected to friendly rear: +10

**Stability Bands:**
- 80-100: Very Stable (extremely resistant to flip)
- 60-80: Stable (secure control)
- 40-60: Unstable (vulnerable under pressure)
- 20-40: Very Unstable (high flip risk)
- 0-20: Collapse Imminent (will flip quickly in war)

**Usage:**
- Initialized in Pre-War Phase (Phase 0)
- Used in Early-War Phase (Phase I) for flip mechanics: `Stability + Pressure ≥ 50 → Flip`
- Becomes less relevant in Phase II as fronts harden and AoRs instantiate

---

### System 2: Declaration System

**Full specification in Phase I Specification document.**

**Summary:**

Declarations (RS, HRHB) are **emergent thresholds**, not player buttons.

**RS Declaration:**

**Enabling Conditions:**
- Organizational penetration in Serb-majority municipalities ≥ threshold
- JNA support secured (JNA transition triggered or imminent)
- RBiH-RS relationship hostile
- External patron (FRY/Serbia) support confirmed

**Triggering:**
When all conditions met, declaration pressure accumulates weekly.
When pressure exceeds threshold, RS declares independence.

Players may influence timing via organizational investment and political actions,
but cannot force or prevent if conditions are met.

**Effects:**
- Legitimacy: +0.2 in RS-controlled areas, -0.3 external (international isolation)
- Authority: Accelerates consolidation in RS core territories
- RBiH: +0.1 legitimacy (defensive framing, victim narrative)
- War escalation: Lowers threshold for sustained violence transition
- International: Recognition crisis, sanctions eligible

**HRHB Declaration:**

**Enabling Conditions:**
- Organizational penetration in Croat-majority municipalities ≥ threshold
- Croatian (Zagreb) patron support
- RBiH-HRHB alliance strain ≥ threshold
- RS already declared OR war already begun

**Triggering:**
Similar pressure accumulation model.

**Effects:**
- RBiH-HRHB alliance: Immediate degradation, hostile relationship possible
- Authority: Split in mixed RBiH/HRHB municipalities (Mostar, Central Bosnia)
- Legitimacy: -0.4 international (severe cost, "betraying alliance")
- HRHB: +0.15 internal legitimacy in Croat-majority areas
- Patron: Croatian support increases, international pressure increases

**Design Constraints:**
- Declarations NEVER force territorial outcomes
- Declarations NEVER guarantee alliance breakdown (RBiH-HRHB may repair)
- Declarations NEVER script war escalation (only shift thresholds)

---

### System 3: Control Strain (Full Mechanics)

**Detailed in Systems Manual §23 above.**

**Summary Formula (per municipality):**

```
Control Strain = Demographic Hostility Factor
               × Authority State Multiplier
               × Control Method Multiplier
               × Time Factor
               + Displacement Penalty
```

**Faction-Level Control Strain:**
Sum of all municipality-level strain.

**Effects:**
- Exhaustion accumulation rate: `base_rate × (1 + Control_Strain × 0.05)`
- Legitimacy erosion: `weekly_loss = Control_Strain × 0.01`
- Fragmentation threshold: `if Control_Strain > 80, fragmentation_eligible = true`
- Command degradation: `coherence_loss += Control_Strain × 0.002`

**Key Trade-Offs:**
- Conquest → Control Strain → Exhaustion → Collapse
- Displacement → Reduces local strain → Increases global exhaustion + legitimacy loss
- Authority consolidation → Reduces strain slowly → Requires stable control + time + supply

---

### System 4: Pre-War Phase (Overview)

**Full specification in Phase_0_Specification_v0_3_0.md.**

**Structure:**

Players allocate limited **Pre-War Capital** (asymmetric starting pools):
- RS/SDS: HIGH capital (institutional advantage, JNA coordination)
- RBiH: MEDIUM capital (government legitimacy, demographic majority)
- HRHB: LOW capital (late formation, external dependence)

**Investment Categories:**

1. **Organizational Penetration** (per municipality or region):
   - Increases organizational factors for Stability Score
   - Reduces militia emergence friction in Phase I
   - Enables authority consolidation post-flip

2. **Alliance Management** (RBiH-HRHB only):
   - Coordinate investment to reduce strain
   - Unilateral investment accelerates preparation but strains alliance

3. **Declaration Pressure Management:**
   - Players can accelerate or delay conditions
   - Cannot force or prevent if conditions objectively met

4. **Authority Positioning:**
   - Invest in institutional capture (police, TO, local government)
   - Invest in demographic mobilization (information, organization)

**Output (Hand-Off to Phase I):**
- Stability Scores (all municipalities)
- Organizational factor values (all municipalities)
- Alliance state (RBiH-HRHB initial relationship)
- Declaration eligibility (RS, HRHB pressure levels)
- Authority degradation (per municipality)

**Constraints:**
- NO formations created
- NO control flips
- NO combat
- NO supply systems (not yet militarized)
- ALL effects are latent modifiers only

**Transition:**
Pre-War Phase ends when escalation threshold met (sustained violence + monopoly collapse).

---

### System 5: Phase I Early-War (Overview)

**Full specification in Phase_I_Specification_v0_3_0.md.**

**Characteristics:**

- Militia-based forces (low cohesion, local)
- High territorial fluidity (rapid flips)
- Coercive control (not sustained fronts)
- No AoRs yet
- Declarations may trigger

**Core Mechanic: Stability + Pressure → Flip**

```
If (Stability_Score + Applied_Pressure ≥ 50):
  Control flips to attacker
  Municipality locked for consolidation period (4-8 weeks)
  Control Strain begins accumulating
```

**Applied Pressure sources:**
- Adjacent hostile control: +30
- Militia presence: +20
- Coercion events: +20
- Regional momentum: +15 (if 3+ adjacent flips in last 4 weeks)
- Demographic alignment: +10
- JNA presence (for RS): +20

**Post-Flip:**
- Control becomes 100% to capturing faction
- Municipality locks (cannot re-flip for consolidation period)
- Control Strain accumulates immediately
- Displacement may occur (population movement)
- Authority state: Becomes "Coercive" (must consolidate over time)

**Transition to Phase II:**
When sustained brigade contact creates continuous fronts and territorial fluidity decreases.

---

## Implementation Roadmap

### Phase 1: Documentation (Current)

**Deliverables:**
- Canon_v0_3_Change_Proposal.md (this document)
- Phase_0_Specification_v0_3_0.md
- Phase_I_Specification_v0_3_0.md

**Timeline:** Complete upon approval

---

### Phase 2: Canon Document Updates

**Update all v0.2.7 documents to v0.3.0:**

1. Engine_Invariants_v0_3_0.md
2. Phase_Specifications_v0_3_0.md
3. Systems_Manual_v0_3_0.md
4. Rulebook_v0_3_0.md
5. Game_Bible_v0_3_0.md
6. context.md (v0.3.0 update)

**Process:**
- Apply changes document-by-document
- Maintain formatting consistency
- Update all cross-references
- Generate .docx versions where needed

**Timeline:** 2-3 hours

---

### Phase 3: Historical Validation

**Read Balkan Battlegrounds I & II sections:**

1. Pre-War period (1991-March 1992): Organizational timeline, declarations
2. Early-War period (April-August 1992): Territorial patterns, flips, coercion
3. JNA transition and equipment distribution
4. Key events for pressure injection framework validation

**Deliverables:**
- Historical validation report
- Corrections to v0.3.0 specifications if conflicts found

**Timeline:** 3-5 hours

---

### Phase 4: Implementation

**Implement new systems in order of dependency:**

1. **Stability Score System** (foundational)
2. **Control Strain System** (foundational)
3. **Pre-War Phase mechanics** (depends on Stability Score)
4. **Phase I flip mechanics** (depends on Stability Score + Control Strain)
5. **Declaration System** (depends on Phase I)
6. **Command Degradation** (integrates with exhaustion)
7. **Turn Order Revision** (integrates all systems)

**Timeline:** 15-25 hours (depends on scope)

---

## Design Risks and Mitigations

### Risk 1: Pre-War Phase Becomes Optimization Puzzle

**Description:** Players treat Pre-War Phase as deterministic setup where "correct" investments unlock decisive advantages.

**Mitigations:**
- Hide precise modifier values (show qualitative effects: "Organization improved in region")
- Introduce uncertainty in Pre-War → Phase I hand-off (modifiers have ranges)
- Limit investment granularity (regional, not per-municipality for some factors)
- Ensure poor Pre-War choices are recoverable in war phase (slow, costly, but possible)

**Severity:** MEDIUM

---

### Risk 2: Control Strain Tuning Difficulty

**Description:** Control Strain may be too weak (allowing unconstrained conquest) or too strong (preventing any expansion).

**Mitigations:**
- Faction-specific Control Strain sensitivity (RS more vulnerable than RBiH due to overextension)
- Non-linear accumulation (first 10 municipalities low strain, next 10 medium, beyond high)
- Extensive playtesting with historical scenarios
- Provide tuning parameters in implementation

**Severity:** MEDIUM-HIGH

---

### Risk 3: Declaration System Timing Determinism

**Description:** Optimal play may force declarations at specific turns, creating pseudo-scripting.

**Mitigations:**
- Multi-causal triggering (requires MANY conditions, not just one)
- Pressure accumulation has variance (declarations occur in windows, not exact turns)
- Delaying declarations has costs (missed opportunity windows)
- Forcing declarations early has costs (legitimacy penalties)

**Severity:** MEDIUM

---

### Risk 4: Phase I Flip Frequency Too High

**Description:** Early-War may become chaotic if flips occur too easily, making the game unplayable.

**Mitigations:**
- Post-flip consolidation locks prevent instant re-flips (4-8 week lock)
- Flip threshold tuning (may need adjustment from initial 50)
- Regional momentum caps (prevent cascading collapse of entire regions instantly)
- Authority consolidation reduces flip vulnerability over time

**Severity:** MEDIUM

---

### Risk 5: Three-Phase War Too Complex

**Description:** Players may be confused by different mechanics in Phase 0 / Phase I / Phase II.

**Mitigations:**
- Clear UI indication of current phase
- Tutorial/scenario mode teaching each phase separately
- Rulebook explicitly teaches phase transitions
- Historical scenario starts bypass Pre-War Phase (start in Phase I or Phase II)

**Severity:** LOW-MEDIUM

---

### Risk 6: Early Systems Restoration Conflicts

**Description:** Restored early systems may conflict with v0.2.7 excellent work (pressure diffusion, political control, etc.).

**Mitigations:**
- Phase separation ensures different mechanics for different periods
- Early-War uses Stability+Pressure flips; Frontline War uses AoR+Pressure diffusion
- Political control substrate applies across all phases consistently
- Control Strain complements (not replaces) exhaustion

**Severity:** LOW

---

## Approval Checklist

Before adopting Canon v0.3.0, confirm:

### Foundational Decisions

- [ ] **Temporal frame (weekly turns)** is acceptable foundation
- [ ] **Control Strain** naming and concept approved
- [ ] **Three-phase war structure** (Pre-War / Early-War / Frontline) is acceptable
- [ ] **Stability Score restoration** aligns with design philosophy
- [ ] **Declaration system as emergent thresholds** (not player buttons) is correct approach

### System-by-System Approval

- [ ] **Pre-War Phase** structure and scope acceptable
- [ ] **Phase I Early-War** mechanics distinct from Phase II
- [ ] **Control Strain** formula and effects properly constrained
- [ ] **Declaration System** (RS, HRHB) historically grounded and non-scripted
- [ ] **Command Degradation** expansion sufficient for late-war intent divergence
- [ ] **JNA Transition** mechanics historically plausible
- [ ] **Pre-Negotiation Diplomacy** framework appropriate
- [ ] **Turn Order Revision** complete and properly sequenced

### Document Quality

- [ ] All terminology standardized across documents
- [ ] No conflicts between proposed changes
- [ ] v0.2.7 excellence preserved (political control, Phases 3A/B/C, determinism, peace)
- [ ] Design risks identified and mitigations proposed
- [ ] Implementation roadmap realistic

### Historical Validation (Post-Approval)

- [ ] Balkan Battlegrounds validation complete
- [ ] Historical conflicts resolved or documented
- [ ] System tuning parameters identified

---

## Conclusion

Canon v0.3.0 represents a significant advancement by restoring sophisticated early systems while preserving v0.2.7's excellent work on political control, pressure-exhaustion-collapse chains, and peace mechanics.

The three-phase war structure (Pre-War / Early-War / Frontline) provides mechanical diversity appropriate to historical periods while maintaining systemic coherence.

Control Strain ensures territorial expansion is costly and constrained, preventing military maximalism.

Declarations emerge from systemic conditions rather than player buttons or scripted dates, maintaining the simulation's commitment to emergent outcomes.

This proposal is ready for section-by-section review, modification, or approval.

---

**Next Steps:**
1. Review and approve/modify this proposal
2. Approve Phase 0 and Phase I specifications (separate documents)
3. Conduct historical validation (Balkan Battlegrounds)
4. Proceed with implementation

**Document Status:** AWAITING APPROVAL

**Prepared By:** External Expert Adviser
**Date:** 2026-02-02
**Version:** Draft 1.0
