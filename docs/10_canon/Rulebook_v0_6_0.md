# A War Without Victory -- Rulebook v0.6.0

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

Political control is distinct from brigade presence, brigade location (OSID), fronts, and pressure application. A settlement may have political control without any military formation assigned to it.

### 4.2 Initialization

At game start, political control is initialized deterministically, before any fronts or military interactions exist. Initialization follows a two-tier process:

**Municipal Authority Inheritance**

Each municipality has a default political controller representing pre-war institutional authority. At initialization, all settlements inherit their municipality's political controller, unless explicitly overridden under settlement-level rules.

Municipal authority reflects administrative control, policing, taxation, public services, and institutional continuity. Demographic majority alone is insufficient to override municipal authority.

**Settlement-Level Overrides (Exceptional)**

A settlement may override municipal authority only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

**Null Authority (Allowed, Rare)**

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible. Null authority does not imply contestation or instability by itself.

**Implementation-note (scenario-configured init):** Initial political control may be set per scenario via `init_control_mode`: *institutional* (default—municipal authority from init_control file), *ethnic_1991* (1991 census majority per settlement), or *hybrid_1992* (institutional baseline with ethnic overrides where settlement majority differs from municipal controller and exceeds threshold). This does not change the definition of political control for dynamics after Turn 0. The assumption that only municipal institutional init exists is deprecated; ethnic and hybrid modes are additive scenario options.

### 4.3 Stability and change

Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing. Rear settlements may remain politically controlled indefinitely without military garrisons.

Political control may change only through defined mechanisms:

1. **Attack resolution** (War phase): an attack order is resolved → push-back and control flip at the target OSID
2. **Corps or frontline operations** as defined in the War phase / Systems Manual
3. **Internal authority collapse or fragmentation** as defined in fragmentation and exhaustion systems
4. **Negotiated transfer** through end-state or interim agreements

There is no passive pressure flip; control does not change from sustained pressure alone. No other mechanism may alter political control.

### 4.4 Relationship to military operations

Political control exists independently of military responsibility.

**Rear OSIDs (or settlements derived from them):**
- Have political control
- Are not the target of attack resolution
- Do not experience control change from absence of formations

**Contested / front OSIDs:**
- Retain political control until attack resolution or corps ops change it
- May be occupied by one or more brigades (stacking allowed)
- Are adjacent to hostile control or enemy brigades

Fronts emerge from hostile OSID adjacency. Political control is always attributable to a faction or explicitly null. Control changes only via attack resolution or corps/frontline operations—military formations contest control through attack; they do not generate it by passive pressure.

## 5. Military Forces

### 5.1 Brigades as spatial actors

Military forces are represented as formations such as militia, brigades, and lower-level groups. Brigades are the primary player-facing maneuver formations.

Brigades are the primary maneuver formations represented on the map. They are visible, selectable, and directly commanded by the player. Each brigade has a **single location**: one **OSID** (operational settlement). Multiple brigades may **stack** on the same OSID. Corps and Operational Groups coordinate brigades but do not own OSIDs.

The command hierarchy is Theatre -> Army -> Corps -> Brigade. Theatres are top-level operational partitions used for command grouping and front assignment context.

Battalions exist only as internal subunits of brigades. They are not represented on the map and cannot be selected or assigned independently.

Formations differ in manpower, cohesion, supply, and experience.

### 5.2 Brigade location and Zone of Control

**OSID location:** Each brigade occupies one OSID (`location_osid`). Stacking is allowed. Only **deployed** brigades (not in column: packing / in_transit / unpacking) project ZoC and participate in combat.

**Zone of Control (ZoC):** A brigade projects ZoC to all OSIDs **adjacent** to its current OSID (in the operational contact graph). An **enemy** brigade that is in the ZoC of a friendly brigade is **ZoC-locked**.

**ZoC-locked options:** While in enemy ZoC, a brigade may only: **stay** on its current OSID; **retreat** to an OSID that is not in any enemy ZoC; or **attack** the OSID occupied by the ZoC-owning enemy (attack that tile). Any other move (e.g. moving to a different enemy-ZoC tile without attacking the ZoC source) is disallowed.

**Retreat (prefer rear):** When retreating, valid destinations are friendly-controlled OSIDs not in enemy ZoC (or, if none, friendly OSIDs in enemy ZoC—retreat under pressure). Tie-break among valid destinations: **enemy adjacency count ascending** (prefer rear), then **OSID string sort** (determinism).

**Attack-only control change:** Control of an OSID does not change from passive pressure. It changes only when an **attack** is resolved (attack resolution → push-back and control flip) or through defined corps/frontline operations.

### 5.3 Rear Political Control Zones

OSIDs (or settlements derived from them) that are not the target of attack resolution constitute **Rear Political Control Zones** when they remain under faction control without being adjacent to hostile control or enemy brigades.

Rear zones:
- Remain under faction control
- Do not experience control change solely due to absence of military formations
- Become contested when fronts expand via attack or corps ops

### 5.4 Front assignment and movement

Brigades are assigned to derived front segments (`brigade_front_assignment`). `null` assignment means the brigade is in **reserve**. Reserve brigades do not execute attack or offensive movement orders until assigned to a front.

Movement is along the **operational contact graph** (OSID to OSID) and is **ZoC-constrained**: in enemy ZoC, only stay, retreat, or attack the ZoC source. **Column movement** allows multi-hop redeployment through friendly rear areas (terrain-weighted path, composition-dependent rate); brigades in column are in_transit and do not project ZoC or fight until they arrive. Combat is resolved by the **attack resolution** formula: outcome thresholds, casualties, push-back, and control flip at the target OSID.

### 5.5 Brigade posture

Each brigade has a posture selected by the player. Posture affects attack power, defensive resilience, and exhaustion in the attack-resolution formula. Posture does not guarantee outcomes.

Reserve rule: brigades in reserve (no front assignment) do not issue attack/posture/movement orders until assigned to a front segment.

**Postures (summary):** Defend, Hold, Probe, Attack, Assault (per Attack Resolution Formula Spec). Posture multipliers apply to attacker and defender combat power.

### 5.6 Operational Groups

Operational Groups are temporary coordination constructs authorized at Corps level. They do not own OSIDs. They occupy an OSID and function like a brigade for ZoC and combat; they coordinate timing and provide bonuses (e.g. og_mult) to adjacent friendly attacks during operations.

With Corps authorization, an OG may temporarily pull battalion-equivalent manpower from brigades. Donor brigades retain their location_osid but suffer reduced strength. Detached manpower operates within the OG's OSID and operation scope; OGs dissolve per lifecycle rules and personnel return to donors.

## 6. Fronts and Combat

### 6.1 Front formation

Fronts are first-class contiguous segments derived from **hostile OSID boundary edges**: adjacent OSIDs with opposing political controllers. Brigades on OSIDs adjacent to enemy control or enemy brigades define the front. Combat is resolved by **attack resolution**: discrete engagements with outcome thresholds, casualties, push-back, and control flip. There is no passive pressure flip.

Front assignment: a brigade assigned to a front segment is on the front; an unassigned brigade is in reserve. Theatre membership provides the top-level grouping for front segments and command panels.

### 6.2 Combat: attack resolution

Combat occurs when a brigade **attacks** an adjacent OSID (enemy-controlled or occupied by enemy brigades). The **attack resolution formula** (Systems Manual §7.4; Attack Resolution Formula Spec) computes attacker and defender combat power, then:

- **Power ratio** determines outcome: decisive victory (≥2.0), victory (≥1.5), costly victory (≥1.0), stalemate (0.7–1.0), repulsed (0.5–0.7), catastrophic (<0.5).
- **Casualties** apply to both sides; snap events may apply when state conditions are met.
- **Push-back and control flip:** On attacker victory (decisive/victory/costly), the defender retreats, control of the target OSID flips to the attacker, and the attacker may advance into it (one OSID per attack). Retreat destination is chosen deterministically: prefer friendly OSID not in enemy ZoC, then tie-break by enemy adjacency count (ascending) then OSID string sort.

**Entrenchment** and **resilience (defense_streak)** modify defender power. Only deployed brigades participate. No single resolution flips more than one OSID.

### 6.3 Front hardening and exhaustion

Fronts harden over time (e.g. entrenchment on current OSID); prolonged static contact increases exhaustion. Exhaustion does not flip control; it narrows options and drives negotiation.

### 6.4 Phase 3A: Pressure eligibility and diffusion

Phase 3A allows pressure to propagate across settlement contacts using deterministic eligibility weights derived only from Phase 2 contact metrics. Each turn, eligible pressure diffuses conservatively across those contacts. Diffusion is a structural substrate only: it does not itself cause control change, exhaustion, collapse, or negotiation effects. *Control change in War War phases only via attack resolution or corps ops.*

*The formal frozen specification is defined in the Systems & Mechanics Manual under "Phase 3A --- Pressure Eligibility and Diffusion (Design Freeze)".*

### 6.5 Phase 3B: Pressure and exhaustion

Sustained pressure does not resolve the war directly. When pressure persists under static, constrained, or degraded conditions, it gradually converts into irreversible exhaustion. Exhaustion does not flip control.

*The formal frozen specification for this mechanism is defined in the Systems & Mechanics Manual under "Phase 3B --- Pressure → Exhaustion Coupling (Design Freeze)".*

### 6.6 Phase 3C: Exhaustion and collapse eligibility

Exhaustion does not automatically cause collapse. When accumulated exhaustion persists and coincides with institutional or spatial degradation, it may unlock eligibility for collapse in specific domains. Eligibility does not imply immediate failure.

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

## 15. Player's Turn Guide

A phase-by-phase summary of player actions each turn. For system details, see the relevant sections above. *Implementation-note: This section satisfies pipeline backlog item 1.2 (Player's Turn Guide); confirmed 2026-02-24.*

### 15.1 Peace phase (Pre-War)

Each turn the player:
1. **Reviews** the political landscape: stability scores, organizational factors, faction declarations
2. **Allocates capital** to investments: police loyalty, TO control, organizational penetration, political pressure
3. **Monitors** escalation: referendum timing, JNA posture, rival declarations
4. **Ends turn** — investments resolve; escalation conditions evaluated

The player cannot control military forces (none exist). Strategic choices shape starting conditions for war.

### 15.2 War phase (Early War)

Each turn the player:
1. **Reviews** the situation: control map, militia emergence, authority states, alliance status
2. **Sets brigade postures** (when formations exist): hold, defend, defend_at_all_costs, elastic_defense, counterattack, dig_in, attack, assault
3. **Issues attack orders** against adjacent enemy-controlled settlements
4. **Monitors** JNA withdrawal, alliance strain, and War phase→II transition conditions
5. **Ends turn** — postures apply; battles resolve; control may flip; displacement triggers

The player commands through posture and targeting, not direct unit movement. Command friction may degrade order execution.

### 15.3 War phase (Mid-War to Late-War)

Each turn the player:
1. **Reviews** reports: front status, exhaustion, supply pressure, corps operations, recent battles
2. **Sets brigade postures** and **issues attack orders** (as in War phase, but with ZoC constraints)
3. **Manages corps operations**: front assignments, operational groups, attack axes
4. **Monitors** exhaustion, recruitment, equipment degradation, alliance dynamics
5. **Responds** to events: ceasefire conditions, Washington Agreement preconditions, enclave integrity (implementation-note: enclave protection for Srebrenica/Goražde/Cazin is not yet implemented; see CALIBRATION_REPORT_BOT_AI_FEB_2026.md §7)
6. **Ends turn** — ZoC-constrained movement resolves; attacks resolve; supply/exhaustion update; recruitment accrues

War phase adds operational depth (corps, fronts, supply) but reduces tactical flexibility (ZoC, exhaustion, friction).

### 15.4 General Principles

- **No undo:** Once the turn ends, consequences are permanent.
- **Incomplete information:** Fog of war limits what the player sees; some events are revealed only after the fact.
- **No total control:** Orders may be degraded by command friction, supply shortages, or low cohesion.
- **Consequences accumulate:** Displacement, exhaustion, and international pressure compound over time.

## 16. Victory Conditions

### 16.1 No total victory

There is no total victory. Success is measured by survival, leverage, and the terms under which the war ends.

### 16.2 Faction-specific paths

Different factions face different paths to acceptable outcomes.

## 17. v0.4 Player-Facing Additions (Systems 1-11)

### External Constraints
- International pressure and patron constraints shape what is possible; they do not grant victory.
- Diplomatic isolation and visibility raise exhaustion and increase pressure to negotiate.
- Patron behavior is time-indexed and cannot be commanded by the player.

### Equipment and Sustainment
- Heavy equipment degrades with use; sustaining it is costly and constrained by supply and maintenance.
- Arms embargo effects are asymmetric by faction and evolve over time.
- Ammunition resupply limits prolonged offensives.

### Governance and Legitimacy
- Political control is not the same as legitimate governance.
- Low legitimacy reduces recruitment and increases exhaustion.
- Long-term control without legitimacy is possible but unstable.

### Enclaves and Sarajevo
- Enclaves are liabilities that generate humanitarian pressure.
- Sarajevo is exceptional: it degrades slower but costs more; any treaty must address it.
- Enclave collapse triggers large displacement and diplomatic fallout.

### Negotiation
- Negotiation operates as a constrained spending system.
- Ceding liabilities is cheaper than ceding assets; required clauses and red lines apply.
- Treaty acceptance is computed deterministically, not player choice.
- Negotiation capital is finite and decreases as exhaustion rises.

### Doctrine and Progression
- Factions have distinct tactical doctrines and different capability trajectories.
- Postures are constrained by equipment, supply, and faction profile.
- Doctrine postures can be unavailable when eligibility gates are not met.
- Capabilities evolve over time; early-war advantages are not permanent.

### Contested Control
- Initial control can be secure, contested, or highly contested based on Peace phase stability.
- Highly contested areas are fragile in early war.

## 18. v0.6 Canon consolidation

This document (v0.6.0) is the Rulebook for the two-phase (Peace/War) model. It supersedes Rulebook_v0_5_0.md; deprecated canon versions are archived in docs/_old/10_canon/.
