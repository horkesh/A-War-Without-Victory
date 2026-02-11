# A War Without Victory -- Systems and Mechanics Manual v0.2.7

## Purpose and scope

This document defines the full set of systems required to implement A War Without Victory. It operationalizes the Game Bible. All systems described here are qualitative and bounded; numeric tuning is deferred to implementation. Designer commentary explains intent but does not modify mechanical requirements.

## 1. Time, turns, and resolution framework

The game proceeds in discrete strategic turns representing compressed time. Each turn resolves in a fixed order to ensure determinism and traceability of causation.

**Turn phases:** Directive Phase, Deployment Commitment Phase, Military Interaction Phase, Fragmentation Resolution Phase, Supply Resolution Phase, Political Effects Phase, Exhaustion Update Phase, Persistence Phase.

No system may resolve outside its designated phase.

## 2. Spatial data model

The spatial model is grounded in pre-1991 municipalities. Each municipality contains settlements connected through an internal graph. Settlements are nodes; edges represent movement and supply connectivity.

Edges may be Open, Contested, or Interdicted. Municipalities store population, authority state, recruitment pools, exhaustion modifiers, and local production capacity.

### 2.1 Settlement assignment and Areas of Responsibility

Each brigade owns one Area of Responsibility (AoR), defined as a contiguous set of front-active settlements. AoRs may include limited rear depth within the front-active zone to preserve cohesion and prevent instantaneous rupture. Rear depth prevents single-settlement loss from producing instantaneous operational rupture and provides space for cohesion recovery and internal redistribution.

**AoR Scope:** AoRs apply only to front-active settlements—settlements where opposing factions' coercive forces may interact through adjacency, pressure eligibility conditions exist, or supply corridors, encirclement risk, or fragmentation dynamics are present.

Settlements that are politically controlled but not exposed to active or imminent military pressure are not required to be assigned to any brigade AoR. These settlements constitute **Rear Political Control Zones** that remain under faction control without direct brigade assignment.

**Transition:** A settlement transitions from Rear Political Control Zone to front-active status when opposing brigade pressure becomes eligible across adjacency edges, a supply corridor becomes contested or brittle, or internal fragmentation or authority collapse conditions activate military relevance. Once front-active, the settlement must be assigned to exactly one brigade's AoR.

**Control stability:** Settlement control does not change due to lack of brigade presence. Control change may occur only when opposing brigade pressure is applied and sustained under eligibility rules, or internal authority collapse triggers fragmentation or realignment. Rear Political Control Zones are stable by default but vulnerable to expansion of fronts or internal systemic failure.

Corps and Operational Groups do not own settlements and do not maintain AoRs. They operate as command layers and coordination overlays only.

### 2.2 Political control (pre-front substrate)

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them.

Each settlement has a **political controller** defined as the faction that currently exercises accepted authority over that settlement. Political control is distinct from brigade presence, Areas of Responsibility, fronts, and pressure application.

**Initialization:** At game start, political control is initialized deterministically before any fronts or military interactions exist. Each municipality has a default political controller representing pre-war institutional authority. All settlements inherit their municipality's political controller unless explicitly overridden.

Settlement-level overrides may occur only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible.

**Stability:** Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing.

**Change mechanisms:** Political control may change only through: (1) sustained opposing military pressure applied via front-active settlements meeting pressure eligibility and duration rules, (2) internal authority collapse or fragmentation, or (3) negotiated transfer through end-state or interim agreements.

## 3. Early-war and pre-frontline phase

The simulation begins before coherent frontlines exist. Authority and control shift through coercion, presence, and legitimacy rather than direct combat.

Municipal authority gradients determine initial compliance. Armed presence without contact may alter control. JNA formations begin with high coercive capacity but declining legitimacy, while emerging forces rely on local authority and militia.

Transition to the frontline phase occurs once sustained opposing deployments create continuous contact.

During the pre-frontline phase, Areas of Responsibility are not instantiated. Settlements may be subject to coercive presence and authority shifts without brigade assignment. AoRs are created only once sustained brigade-to-brigade contact emerges.

AoRs are instantiated only once sustained opposing brigade contact produces front-active settlements.

## 4. Military formations

All coercive force is represented through formations. Types include militia, Territorial Defense units, brigades, Operational Groups, and corps-level assets.

Formations have attributes: manpower, cohesion, readiness state, supply state, experience, exhaustion contribution, and assigned operational Area of Responsibility.

## 5. Formation lifecycle and readiness

Formations progress through readiness states: Forming, Active, Overextended, and Degraded.

Players assign brigades to Areas of Responsibility rather than specific settlements. AoRs shape where pressure is applied and absorbed. Fronts emerge where opposing brigades' AoRs meet across adjacent settlements and where control or contestation differs.

Operational Groups may be formed temporarily and dissolve automatically under cohesion loss or command degradation. This models ad-hoc wartime organization without allowing permanent force inflation.

## 6. Deployment and fronts

Players assign brigades to Areas of Responsibility rather than specific settlements. AoRs shape where pressure is applied and absorbed. Fronts emerge where opposing brigades' AoRs meet across adjacent settlements and where control or contestation differs.

Front state variables include pressure differential, stability, supply exposure, and accumulated exhaustion.

Fronts harden over time, increasing defensive value but accelerating exhaustion.

### 6.1 Brigade posture

Each brigade maintains a posture state chosen by the player. Posture governs internal battalion distribution within the AoR and modifies pressure output, defensive resilience, and exhaustion accumulation. Posture does not override supply state, cohesion, or command coherence.

**Minimum postures:** Defend, Probe, Attack, Elastic Defense.

- **Defend:** Maximizes coverage and minimizes exhaustion
- **Probe:** Increases limited pressure with restrained commitment
- **Attack:** Concentrates pressure and accelerates exhaustion while weakening rear-depth resilience
- **Elastic Defense:** Reduces exhaustion growth by permitting controlled loss of forward settlements to preserve cohesion

### 6.2 AoR reshaping and concentration

Players may reshape AoRs by transferring settlements between adjacent brigades' AoRs, subject to contiguity and assignment invariants. AoR reshaping resolves over time and generates cohesion loss, exhaustion increase, and temporary disruption.

Shrinking an AoR increases battalion density and offensive potential. Expanding an AoR reduces battalion density and increases failure risk.

Direct settlement targeting is forbidden. Territorial change occurs through sustained pressure exchange and cumulative failure within AoRs.

### 6.3 Operational Groups and temporary manpower reassignment

Operational Groups (OGs) are temporary coordination overlays authorized at Corps level. OGs do not own settlements and do not maintain AoRs. OG membership modifies timing, coordination, and execution reliability among member brigades.

With Corps authorization, OGs may detach battalion-equivalent manpower from donor brigades. Temporary manpower reassignment reduces the donor brigade's battalion-equivalent count without changing its AoR, immediately lowering coverage and increasing risk. Detached manpower only amplifies pressure within member brigades' AoRs and cannot hold settlements independently.

## 7. Combat interaction and pressure

Combat is resolved as pressure exchange rather than discrete battles. Pressure is derived from formation strength, cohesion, supply, terrain modifiers, and support assets.

Attrition is gradual and feeds exhaustion rather than producing decisive annihilation.

### 7.1 Phase 3A: Pressure eligibility and diffusion (overview)

Phase 3A allows pressure to propagate across settlement contacts using deterministic eligibility weights derived from Phase 2 contact metrics. Each turn, eligible pressure diffuses conservatively across those contacts, smoothing local imbalances and delaying propagation across weak links without creating or destroying pressure.

Diffusion is a structural substrate only: it does not itself cause exhaustion, collapse, territorial change, or negotiation effects.

*For the complete frozen specification, see Appendix A: Phase 3A Specification.*

### 7.2 Phase 3B: Pressure → exhaustion coupling (overview)

When pressure persists under static, constrained, or degraded conditions, it gradually converts into irreversible exhaustion. This coupling enforces the negative-sum nature of the conflict by narrowing future options rather than producing immediate collapse or territorial change.

Exhaustion, not pressure itself, drives breakdown, negotiation, and war termination.

*For the complete frozen specification, see Appendix B: Phase 3B Specification.*

### 7.3 Phase 3C: Exhaustion → collapse gating (overview)

When accumulated exhaustion persists and coincides with institutional or spatial degradation, it may unlock eligibility for collapse in specific domains such as authority, command cohesion, or spatial integrity.

Eligibility does not imply immediate failure. Collapse remains delayed, contingent, and multi-causal.

*For the complete frozen specification, see Appendix C: Phase 3C Specification.*

## 8. Command and control degradation

Each faction tracks Command Coherence, representing the ability to translate political intent into coordinated action.

Low command coherence introduces delays, partial compliance, misallocation of forces, or outright non-execution of directives.

Command degradation does not prevent action but increases unpredictability. Player intent should never propagate cleanly in late-war conditions.

## 9. Authority, control, and legitimacy

Authority reflects institutional governance capacity. Control reflects enforceable coercion. Claims have no mechanical effect without presence.

Authority states are Consolidated, Contested, and Fragmented. Authority gates recruitment, taxation, coordination, and stabilization actions.

Legitimacy erosion may trigger command disobedience and internal fragmentation.

## 10. Intra-side political fragmentation

Factional cohesion is tracked independently of territorial control.

Low cohesion may result in splinter behavior, refusal to support allied fronts, divergent negotiation incentives, or localized ceasefires.

Fragmentation increases exhaustion and weakens authority recovery.

## 11. Municipal Control Zones (MCZs)

Municipalities may fragment into MCZs when settlement connectivity is severed and authority collapses.

Each MCZ tracks local authority, supply, population access, exhaustion, and stability.

Reunification requires restored connectivity, authority consolidation, and time. Political divergence may persist.

## 12. Population and displacement

Population is tracked per municipality and MCZ.

Displacement permanently reduces recruitment and authority. Refugee concentration increases short-term manpower but accelerates exhaustion. Trapped populations increase humanitarian pressure.

## 13. Recruitment and militarization

Recruitment originates at the settlement level and aggregates upward.

Militia emerge early with low cohesion. Formation of organized brigades requires time, authority, supply, and training.

Desertion increases under exhaustion, legitimacy collapse, and command degradation.

## 14. Logistics, supply, and corridors

Supply is traced through settlement graphs and external corridors. Corridors are explicit objects enabling sustainment and movement.

Supply states are Adequate, Strained, and Critical. Degradation reduces combat effectiveness and cohesion.

Corridor collapse produces cascading effects across dependent regions.

**Note:** Treaty-level corridor rights are deprecated. Supply and sustainment are evaluated via reachability and territorial clauses rather than granting special corridor-rights clauses.

## 15. War economy and local production

Municipalities may possess limited local production capacity contributing to sustainment.

Production is constrained by authority, population, exhaustion, and connectivity.

Local production mitigates but never replaces external supply. Capacity degrades irreversibly under prolonged stress.

## 16. Enclave system

Enclaves track integrity and humanitarian pressure.

As integrity declines, international visibility and external pressure escalate. Enclaves are disproportionate political liabilities.

## 17. Exceptional spaces: Sarajevo

Sarajevo uses a unique connectivity model separating internal and external supply.

Siege conditions amplify political exhaustion and international pressure.

Symbolic weight modifies negotiation thresholds and patron behavior.

## 18. Exhaustion subsystems

Exhaustion is tracked across military, political, and societal dimensions.

Exhaustion accumulates from attrition, fragmentation, static fronts, displacement, and governance failure.

Cross-track amplification accelerates collapse. Exhaustion is irreversible.

## 19. External patrons

External patrons apply conditional aid and pressure.

Patron objectives may conflict with player goals.

Aid withdrawal or escalation modifies exhaustion and legitimacy.

## 20. Negotiation and end states

### 20.1 Negotiation windows

Negotiation windows open based on exhaustion, fragmentation, and international pressure.

End states include imposed settlement, negotiated compromise, frozen conflict, or collapse.

No outcome represents total military victory.

### 20.2 Peace treaty mechanics

Treaties contain territorial clauses (transfer_settlements or recognize_control_settlements) which are peace-triggering. If accepted, peace ends the war and sets the end state; all war dynamics stop thereafter.

Any peace-triggering treaty must explicitly include brcko_special_status. Otherwise it is rejected with rejection_reason = brcko_unresolved.

### 20.3 Institutional competences

Treaties may allocate competence IDs (e.g., police_internal_security, defence_policy, education_policy, health_policy, customs, indirect_taxation, currency_authority, airspace_control, international_representation).

Certain competences are bundled and must be allocated together:
- Customs + indirect_taxation
- Defence_policy + armed_forces_command

### 20.4 Acceptance computation

Acceptance is computed, not guaranteed. The acceptance breakdown is deterministic and includes competence_factor derived from static per-faction valuations.

## 21. Player action constraints

Certain actions are forbidden but attemptable, generating penalties rather than hard failure.

Institutional inertia and command degradation delay or distort execution.

## 22. Persistence and determinism

All state variables are serializable.

The simulation is strictly non-random. Reproducibility is achieved by deterministic state updates, stable ordering, canonical IDs, and timestamp-free derived artifacts.

Save/load must fully reconstruct world, faction, municipality, MCZ, formation, and front states.

## 23. Invariant clarifications (v0.2.3)

This version formalizes corridor states (Open/Brittle/Cut), settlement stabilization periods, authority invalid states, siege triggers based on connectivity, and persistence requirements for fragmentation. No new systems are introduced.

---

*Systems and Mechanics Manual v0.2.7 - Formatted Edition*
*Version updated from v0.2.5*
*Political control content integrated into Section 2.2*
*Phase 3A/B/C full specifications moved to Appendices A/B/C*
*Treaty system integrated into Section 20*
*All inline scope notes removed*
*Proper section numbering applied*

*See Appendices for complete Phase 3A/B/C frozen specifications*
