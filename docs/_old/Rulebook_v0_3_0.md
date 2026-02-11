# A War Without Victory -- Rulebook v0.3.0

One game turn equals one week.

Municipalities cannot flip control through violence until the war-start escalation threshold is satisfied (pre-war degradation may occur, but control does not transfer).



## 1. Introduction

A War Without Victory is a strategic war game simulating the conflict in Bosnia and Herzegovina from late 1991 to 1995. Players assume the role of political and military leadership of one faction. The goal is not conquest, but survival, leverage, and shaping the conditions under which the war ends.

## 2. Core Concepts

### 2.1 What this game is

This is a strategic-level war game. Players influence military operations, political authority, logistics, and diplomacy, but do not control individual battles or units directly.

Military power matters, but it never resolves the war on its own. Political collapse, exhaustion, and external intervention are decisive.

### 2.2 What this game is not

This is not a lower-level wargame with unit micromanagement.

This is not a nation-builder where institutions grow without limits.

This is not a puzzle with a predetermined solution. History constrains possibilities, but does not dictate outcomes.

### 2.3 Time and turns

The game is played in turns, each representing a period of strategic time. During each turn, players issue directives, allocate forces, and respond to unfolding events.

All actions resolve through a fixed turn order. Effects may be delayed, partial, or distorted by exhaustion and command friction.

## 3. Space and Territory

### 3.1 The map

The map is based on pre-1991 municipalities. Each municipality contains settlements connected by roads and supply routes.

Municipalities can fragment internally when control breaks down. Control of space is political and logistical, not purely military.

### 3.2 Municipalities and settlements

Municipalities serve as political and logistical containers, hosting population, authority, recruitment, and supply systems. Settlements function as spatial anchors that define connectivity, movement corridors, and supply routing.

## 4. Political Control

### 4.1 Definition and purpose

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them. Political control defines **who governs**, not **who fights**.

Political control is a prerequisite for legitimacy, taxation, recruitment capacity, negotiation authority, and internal cohesion. Military formations may contest or replace political control, but they do not substitute for it.

Each settlement has a **political controller**, defined as the faction that currently exercises accepted authority over that settlement.

political_controller ∈ {RBiH, RS, HRHB, null}

Political control is distinct from brigade presence, Areas of Responsibility (AoRs), fronts, and pressure application. A settlement may have political control without any military formation assigned to it.

### 4.2 Initialization

At game start, political control is initialized deterministically, before any fronts or military interactions exist. Initialization follows a two-tier process:

**Municipal Authority Inheritance**

Each municipality has a default political controller representing pre-war institutional authority. At initialization, all settlements inherit their municipality's political controller, unless explicitly overridden under settlement-level rules.

Municipal authority reflects administrative control, policing, taxation, public services, and institutional continuity. Demographic majority alone is insufficient to override municipal authority.

**Settlement-Level Overrides (Exceptional)**

A settlement may override municipal authority only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

**Null Authority (Allowed, Rare)**

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible. Null authority does not imply contestation or instability by itself.

### 4.3 Stability and change

Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing. Rear settlements may remain politically controlled indefinitely without military garrisons.

Political control may change only through defined mechanisms:

1. **Sustained opposing military pressure** applied via front-active settlements, meeting pressure eligibility and duration rules
2. **Internal authority collapse or fragmentation** as defined in fragmentation and exhaustion systems
3. **Negotiated transfer** through end-state or interim agreements

No other mechanism may alter political control.

### 4.4 Relationship to military operations

Political control exists independently of military responsibility.

**Rear settlements:**
- Have political control
- Have no AoR
- Do not participate in pressure exchange

**Front-active settlements:**
- Retain political control
- Are assigned to exactly one brigade AoR
- May experience contested pressure

Fronts emerge only from interaction between opposing brigades. Political control does not create fronts. Political control is always attributable to a faction or explicitly null. There is no ambient, automatic, or unit-derived control. Military formations contest control; they do not generate it.

## 5. Military Forces

### 5.1 Brigades as spatial actors

Military forces are represented as formations such as militia, brigades, and lower-level groups. Brigades are the primary player-facing maneuver formations.

Brigades are the primary maneuver formations represented on the map. They are visible, selectable, and directly commanded by the player. Brigades are the only formations that hold spatial responsibility on the settlement layer. Corps and Operational Groups coordinate brigades but do not own territory.

Battalions exist only as internal subunits of brigades. They are not represented on the map and cannot be selected or assigned independently.

Formations differ in manpower, cohesion, supply, and experience.

### 5.2 Areas of Responsibility

Areas of Responsibility (AoRs) define **military responsibility for active, front-relevant space**. AoRs are assigned only where organized military formations are expected to apply, absorb, or contest coercive pressure.

AoRs are **not universal territorial ownership constructs**. They represent zones of active or potential military interaction rather than total political control.

**Scope of AoRs**

AoRs apply **only to front-active settlements**, defined as settlements where:
- Opposing factions' coercive forces may interact through adjacency, or
- Pressure eligibility conditions exist, or
- Supply corridors, encirclement risk, or fragmentation dynamics are present

AoRs include both frontline settlements and limited depth settlements necessary to sustain military operations and prevent immediate rupture.

Settlements that are politically controlled but **not exposed to active or imminent military pressure** are not required to be assigned to any brigade AoR.

### 5.3 Rear Political Control Zones

Settlements outside all brigade Areas of Responsibility constitute **Rear Political Control Zones**.

Rear Political Control Zones:
- Remain under faction control without direct brigade assignment
- Do not participate in pressure exchange
- Do not generate fronts
- Do not require garrison presence
- Do not experience control change solely due to the absence of military formations

These zones represent political, administrative, and societal space rather than active military space.

**Transition Between Rear and Front Space**

A settlement transitions from Rear Political Control Zone to front-active status only when:
- Opposing brigade pressure becomes eligible across adjacency edges
- A supply corridor becomes contested or brittle
- Or internal fragmentation or authority collapse conditions activate military relevance

Once front-active, the settlement must be assigned to exactly one brigade's AoR.

**Control Change**

Settlement control does not change due to lack of brigade presence. Control change may occur only when opposing brigade pressure is applied and sustained under eligibility rules, or internal authority collapse triggers fragmentation or realignment.

Rear Political Control Zones are therefore stable by default, but vulnerable to expansion of fronts or internal systemic failure.

### 5.4 Reshaping AoRs

Players command brigades by assigning and reshaping Areas of Responsibility rather than issuing orders to individual locations.

Players may reshape AoRs by transferring settlements between adjacent brigades. AoR changes resolve over time and generate cohesion loss, exhaustion, and temporary disruption. Shrinking an AoR concentrates force and improves offensive potential. Expanding an AoR stretches force and increases risk.

Players never issue orders to individual settlements. Territorial change occurs through sustained pressure within AoRs, mediated by supply, cohesion, exhaustion, and command friction.

### 5.5 Brigade posture

Each brigade has a posture selected by the player. Posture represents operational intent and governs how internal battalions are distributed across the AoR. Posture affects pressure, defensive resilience, and exhaustion, but does not guarantee outcomes.

**Postures:**
- **Defend** (default): Prioritizes balanced coverage and minimizes exhaustion
- **Probe**: Applies limited pressure to test weak points
- **Attack**: Concentrates pressure at the cost of higher exhaustion and weaker rear resilience
- **Elastic Defense**: Trades space for endurance, accepting controlled retreat to preserve cohesion

### 5.6 Operational Groups

Operational Groups are temporary coordination constructs authorized at Corps level. They do not own territory and do not have AoRs. They coordinate timing, posture alignment, and pressure among member brigades.

With Corps authorization, an Operational Group may temporarily pull battalion-equivalent manpower from brigades. Donor brigades retain their AoRs but immediately suffer reduced coverage and increased risk. Detached subunits reinforce pressure within member brigades' AoRs only. They cannot hold settlements independently and do not create new fronts.

## 6. Fronts and Combat

### 6.1 Front formation

Fronts emerge where opposing forces apply pressure against each other. Combat is resolved as gradual pressure and attrition, not decisive battles.

Frontlines harden over time as opposing Areas of Responsibility remain in sustained contact. Prolonged static contact increases exhaustion, reduces maneuver potential, and raises the cost of offensive action.

Early in the war, before coherent brigade fronts emerge, Areas of Responsibility are inactive. During this phase, control is exerted through coercive presence, militias, and ad hoc formations. The AoR system activates only once brigade-level fronts are established.

### 6.2 Pressure and attrition

Combat is resolved as gradual pressure and attrition, not decisive battles. Static fronts become harder to break over time but increase exhaustion for both sides.

### 6.3 Front hardening

Fronts harden over time, increasing defensive value but accelerating exhaustion.

### 6.4 Phase 3A: Pressure eligibility and diffusion

Phase 3A allows pressure to propagate across settlement contacts using deterministic eligibility weights derived only from Phase 2 contact metrics. Each turn, eligible pressure diffuses conservatively across those contacts, smoothing local imbalances and delaying propagation across weak links without creating or destroying pressure.

Diffusion is a structural substrate only: it does not itself cause exhaustion, collapse, territorial change, or negotiation effects.

*The formal frozen specification is defined in the Systems & Mechanics Manual under "Phase 3A --- Pressure Eligibility and Diffusion (Design Freeze)".*

### 6.5 Phase 3B: Pressure and exhaustion

Sustained pressure does not resolve the war directly. When pressure persists under static, constrained, or degraded conditions, it gradually converts into irreversible exhaustion.

This coupling enforces the negative-sum nature of the conflict by narrowing future options rather than producing immediate collapse or territorial change. Exhaustion, not pressure itself, drives breakdown, negotiation, and war termination.

*The formal frozen specification for this mechanism is defined in the Systems & Mechanics Manual under "Phase 3B --- Pressure → Exhaustion Coupling (Design Freeze)".*

### 6.6 Phase 3C: Exhaustion and collapse eligibility

Exhaustion does not automatically cause collapse. When accumulated exhaustion persists and coincides with institutional or spatial degradation, it may unlock eligibility for collapse in specific domains such as authority, command cohesion, or spatial integrity.

Eligibility does not imply immediate failure. Collapse remains delayed, contingent, and multi-causal.

*The formal frozen specification for collapse gating is defined in the Systems & Mechanics Manual under "Phase 3C --- Exhaustion → Collapse Gating (Design Freeze)".*

## 7. Authority and Governance

### 7.1 Authority vs control

Authority represents the ability to govern and organize. Control represents the ability to enforce power locally.

A faction may control territory without effectively governing it. Loss of authority can be as dangerous as military defeat.

### 7.2 Legitimacy and degradation

Authority degrades under stress and may diverge from control. Legitimacy erosion can trigger internal resistance and command disobedience.

## 8. Fragmentation and Enclaves

### 8.1 Municipal fragmentation

Municipalities may split into multiple control zones during the war when settlement connectivity is severed and authority collapses.

### 8.2 Enclave dynamics

Enclaves are isolated areas under pressure that generate humanitarian and political consequences beyond their military value.

## 9. Population and Recruitment

### 9.1 Population as resource and constraint

Population is both a resource and a constraint. Recruitment depends on authority, legitimacy, and exhaustion.

### 9.2 Displacement effects

Displacement permanently weakens long-term capacity even if short-term manpower increases.

## 10. Supply and Logistics

### 10.1 Supply tracing

Military operations depend on supply traced through settlements and corridors.

### 10.2 Corridors

Corridors have states (Open, Brittle, Cut) and affect supply flow. Loss of corridors can have cascading effects across entire regions.

### 10.3 Local production

Local production can partially offset supply shortages, but degrades over time.

## 11. Exhaustion

### 11.1 Nature of exhaustion

Exhaustion represents cumulative military, political, and societal strain. Exhaustion is irreversible and shapes all other systems.

### 11.2 Effects on capabilities

As exhaustion rises, actions become harder to execute and outcomes more unpredictable.

## 12. External Actors

### 12.1 Patron relationships

External patrons provide conditional support and apply pressure. Patron objectives may change over time and may not align fully with player goals.

## 13. Negotiation and War Termination

### 13.1 Opening negotiation windows

The war ends through negotiation, collapse, or imposed settlement. Military success influences negotiations but never guarantees victory.

### 13.2 Peace treaty mechanics

Peace treaties contain territorial clauses (transfer_settlements or recognize_control_settlements) which are peace-triggering. If accepted, peace ends the war and sets the end state; all war dynamics stop thereafter.

### 13.3 Territorial clauses

Territorial clauses define settlement control transfers and recognition of control.

### 13.4 Institutional competences

Treaties may allocate competence IDs (e.g., police_internal_security, defence_policy, education_policy, health_policy, customs, indirect_taxation, currency_authority, airspace_control, international_representation).

Certain competences are bundled and must be allocated together:
- Customs + indirect_taxation
- Defence_policy + armed_forces_command

### 13.5 Brčko special status

Any peace-triggering treaty must explicitly include brcko_special_status. Otherwise it is rejected with rejection_reason = brcko_unresolved.

### 13.6 Acceptance computation

Acceptance is computed, not guaranteed. The acceptance breakdown is deterministic and includes competence_factor derived from static per-faction valuations.

### 13.7 End states

Different end states reflect different balances of exhaustion, control, and external pressure. No total victory exists.

## 14. Player Agency and Limitations

### 14.1 Command friction

Players do not have absolute control. Orders may be delayed, partially executed, or ignored as command cohesion erodes.

### 14.2 Consequences

Some actions are possible but carry severe long-term consequences.

## 15. Victory Conditions

### 15.1 No total victory

There is no total victory. Success is measured by survival, leverage, and the terms under which the war ends.

### 15.2 Faction-specific paths

Different factions face different paths to acceptable outcomes.

---

*Rulebook v0.3.0 - Formatted Edition*
*All appendix-style sections integrated*
*Proper chapter numbering applied*
*Political control and peace mechanics fully integrated*