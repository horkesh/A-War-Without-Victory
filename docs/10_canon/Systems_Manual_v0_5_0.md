# A War Without Victory -- Systems and Mechanics Manual v0.5.0

One game turn equals one week.

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

Brigade deployment in Phase II uses a two-layer model:
- **Municipality layer:** brigades are assigned to one or more municipalities (`brigade_municipality_assignment`); multiple brigades may share a municipality.
- **Settlement AoR layer:** front-active settlements are deterministically derived from municipality assignments into exactly one brigade per settlement (`brigade_aor`) or null (rear).

AoRs may include limited rear depth within the front-active zone to preserve cohesion and prevent instantaneous rupture. Rear depth prevents single-settlement loss from producing instantaneous operational rupture and provides space for cohesion recovery and internal redistribution.

**AoR Scope:** AoRs apply only to front-active settlements—settlements where opposing factions' coercive forces may interact through adjacency, pressure eligibility conditions exist, or supply corridors, encirclement risk, or fragmentation dynamics are present.

Settlements that are politically controlled but not exposed to active or imminent military pressure are not required to be assigned to any brigade AoR. These settlements constitute **Rear Political Control Zones** that remain under faction control without direct brigade assignment.

**Transition:** A settlement transitions from Rear Political Control Zone to front-active status when opposing brigade pressure becomes eligible across adjacency edges, a supply corridor becomes contested or brittle, or internal fragmentation or authority collapse conditions activate military relevance. Once front-active, the settlement must be assigned to exactly one brigade's AoR.

**Control stability:** Settlement control does not change due to lack of brigade presence. Control change may occur only when opposing brigade pressure is applied and sustained under eligibility rules, or internal authority collapse triggers fragmentation or realignment. Rear Political Control Zones are stable by default but vulnerable to expansion of fronts or internal systemic failure.

**AoR assignment (Phase II):** Settlement AoR is derived from municipality assignments and front-active settlements. In shared municipalities (same-faction multi-brigade co-presence), settlement ownership is split deterministically (stable ordering and deterministic traversal/tie-break) while preserving the invariant of exactly one brigade per settlement. **Density** = personnel / max(1, aor_settlement_count), and is the core metric for pressure. Front-active expansion may add 1-hop rear depth for operational buffer. **State:** `brigade_municipality_assignment`, `brigade_mun_orders`, `brigade_aor`.

Corps and Operational Groups do not own settlements and do not maintain AoRs. They operate as command layers and coordination overlays only.

### 2.2 Political control (pre-front substrate)

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them.

Each settlement has a **political controller** defined as the faction that currently exercises accepted authority over that settlement. Political control is distinct from brigade presence, Areas of Responsibility, fronts, and pressure application.

**Initialization:** At game start, political control is initialized deterministically before any fronts or military interactions exist. Each municipality has a default political controller representing pre-war institutional authority. All settlements inherit their municipality's political controller unless explicitly overridden. Implementation-note: Scenario may set `init_control_mode` to *institutional* (default), *ethnic_1991* (1991 census majority per settlement), or *hybrid_1992* (institutional + ethnic overrides).

Settlement-level overrides may occur only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible.

**Stability:** Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing.

**Change mechanisms:** Political control may change only through: (1) sustained opposing military pressure applied via front-active settlements meeting pressure eligibility and duration rules, (2) internal authority collapse or fragmentation, or (3) negotiated transfer through end-state or interim agreements.

**Implementation-note (2026-02-13 canonical runtime path):** Harness scenarios use a battle-driven control path: no Phase I control flips are applied, and control changes occur via Phase II attack-order resolution after deterministic initialization. Canonical historical Apr-1992 war-start scenarios keep `init_control_mode: "ethnic_1991"`; early-war territorial asymmetry is modeled through deterministic Phase II pressure calibration (including RS external-support pressure on selected municipalities), not municipal institutional pre-assignment.

## 3. Early-war and pre-frontline phase

The simulation begins before coherent frontlines exist. Authority and control shift through coercion, presence, and legitimacy rather than direct combat.

Municipal authority gradients determine initial compliance. Armed presence without contact may alter control. JNA formations begin with high coercive capacity but declining legitimacy, while emerging forces rely on local authority and militia.

Transition to the frontline phase occurs once sustained opposing deployments create continuous contact.

During the pre-frontline phase, Areas of Responsibility are not instantiated. Settlements may be subject to coercive presence and authority shifts without brigade assignment. AoRs are created only once sustained brigade-to-brigade contact emerges.

**Implementation-note (scenario runtime):** Canonical historical scenarios now start directly in `phase_ii`; pre-frontline Phase I remains available for legacy/reference fixtures but is not used for canonical war-start runs.

AoRs are instantiated only once sustained opposing brigade contact produces front-active settlements.

## 4. Military formations

All coercive force is represented through formations. Types include militia, Territorial Defense units, brigades, Operational Groups, and corps-level assets.

Formations have attributes: manpower, cohesion, readiness state, supply state, experience, exhaustion contribution, and assigned operational Area of Responsibility.

## 5. Formation lifecycle and readiness

Formations progress through readiness states: Forming, Active, Overextended, and Degraded.

**Implementation-note (formation activation grace period):** Brigades that remain in Forming for at least BRIGADE_FORMATION_MAX_WAIT turns (e.g. 6) auto-activate regardless of supply or authority gates, so supply-gate cannot permanently block activation. Implementation: `docs/40_reports/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md`.

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

**Posture multipliers (pressure / defense):** Defend 0.3 / 1.5; Probe 0.7 / 1.0; Attack 1.5 / 0.5; Elastic Defense 0.2 / 1.2. **Constraints:** attack requires cohesion ≥ 40 and readiness active; probe requires cohesion ≥ 20 and active or overextended. **Per-turn cohesion costs:** attack −3; probe −1; elastic_defense −0.5 (truncated); defend +1 (capped at 80). If cohesion drops below the posture minimum, posture auto-downgrades to defend. **State:** brigade_posture_orders; posture on FormationState. **Implementation-note:** A fifth posture, **Consolidation**, is used for soft fronts (rear cleanup, undefended pockets): pressure 0.6, defense 1.1, cohesion cost +0.5; brigades in consolidation posture may still issue attack orders so cleanup produces casualty-ledger updates.

### 6.2 AoR reshaping and concentration

Players may reposition brigades at municipality level and may also reshape settlement AoR boundaries:
- **Municipality movement orders:** replace a brigade's municipality assignment for the turn (`brigade_mun_orders`), subject to deterministic adjacency and per-(municipality,faction) concentration limits.
- **Settlement reshape orders:** transfer settlements between adjacent brigades' AoRs (`brigade_aor_orders`) for fine-grain adjustments.

Both flows resolve deterministically and preserve the single-owner-per-settlement invariant.

**Validation (settlement reshape):** Same faction, active brigades, donor adjacent to target AoR, donor retains ≥ 1 settlement after transfer. **Costs:** receiving brigade −3 cohesion; donating brigade −2 cohesion; both brigades set disrupted (halves pressure next turn). **State:** brigade_aor_orders.

Shrinking an AoR increases battalion density and offensive potential. Expanding an AoR reduces battalion density and increases failure risk.

Direct settlement targeting is forbidden. Territorial change occurs through sustained pressure exchange and cumulative failure within AoRs.

### 6.3 Operational Groups and temporary manpower reassignment

Operational Groups (OGs) are temporary coordination overlays authorized at Corps level. OGs do not own settlements and do not maintain AoRs. OG membership modifies timing, coordination, and execution reliability among member brigades.

With Corps authorization, OGs may detach battalion-equivalent manpower from donor brigades. **Activation:** borrow personnel from donor brigades; each donor retains min 200; min 500 total for the OG. **Lifecycle:** per-turn −4 cohesion drain; dissolve when cohesion &lt; 15 or max_duration exceeded (e.g. 3–8 turns); at dissolution return personnel to donors (implementation may specify equal return to same-corps brigades). **Coordination bonus:** e.g. 1.3× pressure multiplier on edges covered by the OG. **Donor strain:** −5 cohesion on each donor brigade at activation. **State:** og_orders; OG formations have kind 'og'. Temporary manpower reassignment reduces the donor brigade's battalion-equivalent count without changing its AoR, immediately lowering coverage and increasing risk. Detached manpower only amplifies pressure within member brigades' AoRs and cannot hold settlements independently.

### 6.4 Corps command and army stance

**Corps stance:** defensive (0.7× pressure, 1.2× defense); balanced (1.0 / 1.0); offensive (1.2× pressure, 0.8× defense, plus exhaustion); reorganize (0× pressure, force defend, +2 cohesion/turn). **Army override:** general_offensive → all corps offensive; general_defensive → all defensive; total_mobilization → all reorganize. **Named operations:** planning (e.g. 3 turns, +5% defense) → execution (e.g. 4 turns, +50% pressure, −4 cohesion/turn) → recovery (e.g. 3 turns, −40% pressure, +1 cohesion/turn) → complete. **State:** corps_command (per formation), army_stance (per faction). Command span and OG slots initialized from formation tags or defaults (e.g. command span 5; 2 OG slots for large corps ≥ 6 subordinates, 1 otherwise).

### 6.5 Phase II bot (brigade AI) — implementation-note

When the bot controls a faction in Phase II, brigade AI generates posture orders and attack orders in a single pass. Attack-order eligibility uses the posture just decided in that pass (pending posture), not the previously applied state, so probe/attack/consolidation brigades can issue attack orders in the same turn. **Soft fronts** (adjacent enemy settlements with no or weak garrison) receive **consolidation** posture; **real fronts** are brigade-vs-brigade. Faction-specific strategic objectives (offensive and defensive municipality lists—e.g. RS Drina valley and Sarajevo siege ring; RBiH enclaves and central corridors; HRHB Herzegovina heartland and Lasva valley) and attack target scoring (undefended +100, corridor +95, offensive objective +85, home recapture +60, weak garrison 0–50, plus consolidation/breakthrough score for rear cleanup and isolated clusters) are applied deterministically; tie-break by settlement ID. Brigades headquartered in offensive-objective municipalities may adopt probe at a lower coverage threshold. All iteration and selection use stable ordering; no randomness. Implementation: `docs/40_reports/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md`, `src/sim/consolidation_scoring.ts`.

## 7. Combat interaction and pressure

Combat is resolved as pressure exchange rather than discrete battles. Pressure is derived from formation strength, cohesion, supply, terrain modifiers, and support assets. In Phase II, **attack orders** are additionally resolved as discrete engagements (see §7.4).

**Brigade-derived pressure (Phase II):** Raw pressure = density × posture_mult × readiness_mult × cohesion_factor × supply_factor × equipment_mult × resilience_mult × disruption_mult. **Defense** uses the same factors with defense multipliers and front hardening bonus (e.g. min(0.5, active_streak × 0.05)). **Edge pressure:** per front edge, pressure delta from assigned brigades on each side, clamped (e.g. [−10, 10]). **Resilience modifier:** existential threat (control &lt; 30% → up to +30% defense), home defense (+20%), cohesion under pressure (+15%). Brigade pressure, density, and resilience modifier are computed each turn and not serialized.

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

### 7.4 Phase II attack-order resolution (discrete battles)

When Phase II runs, attack orders are resolved as **discrete battles** per engagement. Each engagement compares attacker and defender **combat power** (garrison × equipment × experience × cohesion × posture × supply × terrain modifier × corps stance × named operations × OG bonus × resilience × disruption). Terrain modifier applies to the defender (rivers, slope, urban/Sarajevo bonus, friction, road access). Outcome: attacker victory when power ratio ≥ 1.3 (settlement control flips); stalemate 0.8–1.3; defender victory &lt; 0.8. Personnel casualties (KIA/WIA/MIA) and equipment losses are applied per engagement; formation personnel is reduced (floor MIN_BRIGADE_SPAWN) and cumulative totals are recorded in **casualty_ledger** (per-faction and per-formation). Deterministic snap events (e.g. Ammunition Crisis, Commander Casualty, Last Stand, Surrender Cascade, Pyrrhic Victory) may apply when state conditions are met. Equipment capture occurs on surrender. Implementation: `docs/40_reports/battle_resolution_engine_report_2026_02_12.md`; state: `casualty_ledger` is canonical (serialized).

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

**Brigade activation at Phase I entry and ongoing turns:** Scenario may set `recruitment_mode` to select how brigades are created. When `recruitment_mode` is `"player_choice"`, brigade activation uses three resources: manpower (from militia pools), recruitment capital, and equipment points. At Phase I entry, the player or bot activates OOB brigades from initial pools; during Phase II turns, pools can accrue deterministically and additional OOB brigades can be activated when eligibility and costs are met (`available_from`, control in home municipality, manpower, capital, equipment). Equipment accrual is derived from production facilities, local production capacity, and embargo profile, with optional scenario trickles. Capital accrual uses deterministic organizational inputs (militia/pool base, authority, legitimacy, displacement effects) and optional scenario trickles. When `recruitment_mode` is `"auto_oob"` or absent, legacy behavior applies: all OOB slots are created at Phase I entry when `init_formations_oob: true`, then filled from pools. Implementation and design: `docs/40_reports/recruitment_system_implementation_report.md`, `docs/40_reports/recruitment_system_design_note.md`; formation design: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10.

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

## 24. v0.4 Systems (1-11)

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
**State:** `embargo_profile` per faction with `heavy_equipment_access`, `ammunition_resupply_rate`, `maintenance_capacity`, `smuggling_efficiency`, `external_pipeline_status`. **Core rules:** Equipment access ceilings faction-specific and time-modified; ammunition resupply constrains offensives. **Key formulas:** `max_heavy_equipment_per_brigade = base_max * heavy_equipment_access`; `pressure_equipment_modifier = 0.5 + (0.5 * effective_equipment_ratio)`; `smuggling_efficiency_t = smuggling_efficiency_base + (turn_index / 200) * 0.3` (cap 1.0). **Constraints:** differential effects only; no binary embargo switch.

### System 3: Heavy Equipment + Maintenance
**State:** `equipment_state` per formation; `maintenance_capacity` per faction. **Typed composition (BrigadeComposition):** infantry, tanks, artillery, aa_systems plus per-type condition fractions (operational / degraded / non_operational). **Default profiles by faction (e.g.):** RS 40 tanks, 30 artillery; HRHB 15 / 15; RBiH 3 / 8 (JNA inheritance and embargo). **Equipment multiplier:** 1.0 + (tankBonus + artilleryBonus) / infantry; tanks amplify offense more, artillery amplifies both. **Degradation:** per turn from posture tempo and faction maintenance capacity; operational → degraded → non_operational. **Capture:** on settlement flip, e.g. 5% capture rate; captured equipment arrives degraded. **State:** composition on FormationState. **Core rules:** Degradation scales with operational tempo and maintenance deficit; non-operational equipment permanent loss without explicit repair. **Key formulas:** operational_tempo by posture (OFFENSIVE 1.5, REFIT 0.3, etc.); degradation_points formula; effective_equipment_ratio. **Constraints:** heavy equipment wasting asset; degradation monotonic without repair. See docs/40_reports/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md for constants.

### System 4: Legitimacy
**State:** `legitimacy_state` per settlement. **Core rules:** Legitimacy from demographics, institutional inheritance, coercion penalties; low legitimacy reduces recruitment, slows authority consolidation. **Key formulas:** demographic_legitimacy, institutional_legitimacy, stability_bonus, coercion_penalty, legitimacy_score, recruitment_multiplier. **Constraints:** control does not imply legitimacy.

### System 5: Enclave Integrity
**State:** `enclaves` array. **Core rules:** Deterministic detection; integrity weighted composite; humanitarian pressure feeds IVP. **Constraints:** no random collapse.

### System 6: Sarajevo Exceptions
**State:** `sarajevo_state`. **Core rules:** Siege from connectivity; dual supply model; integrity floor and amplified visibility. **Constraints:** Sarajevo exceptional but not scripted.

### System 7: Negotiation Capital + Territorial Valuation
**State:** `negotiation_state` per faction. **Core rules:** Capital from exhaustion, IVP, patron; "liabilities cheaper" asymmetry; required clauses. **Constraints:** deterministic acceptance. **Acceptance report:** Implementation produces a deterministic `decision` per evaluation (`accept` | `reject` | `counter`). On reject or counter, a deterministic `counter_offer` (id and terms) is produced; repeated rejection yields identical counter id/terms for same state and proposal.

### System 8: AoR Assignment Formalization
**State:** `brigade_aor`: Record<SettlementId, FormationId | null> on GameState (rear settlements null). **Core rules:** Front-active settlements must have exactly one brigade; rear settlements null; AoR exclusive, matches control. Assignment and validation as in §2.1 and Phase_II_Specification_v0_5_0.md §7.1. **Constraints:** prohibited in Phase I.

### System 9: Tactical Doctrines
**State:** extended postures and eligibility flags. **Core rules:** ARBiH INFILTRATE, RS ARTILLERY_COUNTER, HRHB COORDINATED_STRIKE; eligibility per formation per turn. **Constraints:** doctrines respect supply, equipment, exhaustion.

### System 10: Capability Progression
**State:** `capability_profile` per faction. **Core rules:** Deterministic time-indexed curves; Washington Agreement precondition-driven; formation experience. **Implementation-note (Phase I flip use):** Implementation may scale flip by capability; tracked as implementation detail. **Implementation-note (formation-aware Phase I flip):** Implementation may include formation strength in flip formula; tracked as implementation detail. **Brigade movement and combat:** No separate movement step; pressure–breach–control-flip pipeline.

### System 11: Contested Control Initialization
**State:** `control_status` per municipality/settlement. **Political control semantics:** Per settlement (`political_controllers[sid]`); municipality control derived. **Core rules:** control_status from Phase 0 stability (SECURE >= 60, CONTESTED 40-59, HIGHLY_CONTESTED < 40). **Implementation-note (coercion):** Optional per-municipality coercion pressure tracked as implementation scope. **Constraints:** deterministic; precedes Phase I.

---

## Appendix A (v0.4): State schema additions

All state additions are serializable and deterministic. Derived state remains non-serialized.

**Global state:** `international_visibility_pressure`, `enclaves[]`, `sarajevo_state`

**GameState (brigade operations):** `brigade_aor`, `brigade_aor_orders`, `brigade_posture_orders`, `corps_command`, `army_stance`, `og_orders`, `settlement_holdouts`

**Faction state:** `patron_state`, `embargo_profile`, `maintenance_capacity`, `negotiation_state`, `capability_profile`

**Formation state:** `equipment_state`, extended posture fields and eligibility flags; **brigade operations:** `posture`, `corps_id`, `composition`, `disrupted`

**Settlement/Municipality state:** `legitimacy_state`, `assigned_brigade` / brigade_aor (see System 8), `control_status`, `coercion_pressure_by_municipality` (implementation extension; non-normative until canonized)

**Not serialized (derived each turn):** brigade pressure, density, resilience modifier.

For tunable parameter tables (Appendix B), doctrine eligibility and effects (Appendix C), capability progression curves (Appendix D), and stability score calculation (Appendix E), see the full tables in Phase 0 Specification v0.5.0 §4.5 Stability Score and in archived Systems_Manual_v0_4_0.md; the normative rules above are sufficient for integration.

---

## v0.5 Canon consolidation

This document (v0.5.0) consolidates the full Systems and Mechanics Manual v0.3.0 (sections 1–23) with v0.4 Systems 1–11 and state schema additions. No content from v0.3 has been deleted. Implementation-notes (coercion pressure, capability-weighted flip, formation-aware flip) remain non-normative per docs/10_canon/context.md (Canon v0.5 implementation-notes policy).

---

*Systems and Mechanics Manual v0.5.0*
*Full v0.3 sections 1–23 retained; v0.4 Systems 1–11 and state schema integrated*