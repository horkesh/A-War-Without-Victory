# A War Without Victory -- Game Bible v0.6.0

One game turn equals one week.

## 1. What this game is

A War Without Victory is a strategic-level simulation of a modern civil-interstate war. It models conflict as a negative-sum process in which all actors operate under compounding political, military, and societal constraints.

The player exercises meaningful but constrained agency over military deployments, force structuring, political authority, and logistical prioritization. Tactical outcomes matter, but they never resolve the war on their own.

No political, territorial, or institutional outcome is predetermined. State survival, partition, prolonged stalemate, or collapse are all possible results emerging from systemic interaction rather than scripted victory conditions.

## 2. What this game is not

This is not a lower-level wargame in the narrow sense. The player does not micromanage individual engagements, squads, or maneuvers. Combat outcomes are shaped by positioning, supply, pressure, and time rather than moment-to-moment control.

This is not a conventional nation-builder. State capacity cannot be freely expanded, institutions degrade under stress, and territorial control does not automatically translate into effective governance.

This is not a sandbox without resistance. Every action generates second- and third-order consequences, and violence always produces political and societal costs.

This is not a deterministic historical reenactment. Historical conditions constrain possibilities but do not script outcomes.

## 3. Time, scope, and perspective

The simulation begins in the late stages of Yugoslavia's disintegration and proceeds in discrete turns representing compressed strategic time. Each turn abstracts weeks or months of political, military, and societal activity.

The player acts from the perspective of political-military leadership rather than field command. Agency is exercised through directives, allocations, and prioritization, not direct battlefield control.

Player power is intentionally limited. Inaction, delay, and misalignment between systems are as influential as decisive moves.

## 4. Core abstraction layers

The game is structured around interacting abstraction layers: political, military, logistical, and spatial. Each layer has its own state variables and rules.

No layer subsumes another. Military success cannot override political collapse, logistical failure undermines battlefield dominance, and spatial control does not guarantee authority.

## 5. Space as politics, not terrain

The simulation is grounded in pre-1991 municipalities as the primary political and logistical containers. Municipalities host population, authority, recruitment, and supply systems.

Settlements function as spatial anchors that define connectivity, movement corridors, and supply routing. Connectivity, rather than borders, determines practical control.

Geography matters politically because it shapes who can govern, supply, and sustain, not because it confers abstract ownership.

Spatial responsibility is held at brigade level through **location**: each brigade occupies **one operational settlement (OSID)**. Multiple brigades may stack on the same OSID. Corps and temporary Operational Groups coordinate effort but never own space. Frontage constraint is enforced via **BRIGADE_OPERATIONAL_FRONTAGE_CAP=48**; local front density (local_front_defense.ts) modifies defender power based on brigade-to-edge coverage. *(ZoC system removed 2026-03-02.)* **Control change** over territory occurs only when a brigade **attacks** (or through defined frontline/corps operations)—there is no passive pressure flip. Rear political control zones are those OSIDs (or canonical settlements derived from them) not currently contested by attack resolution; they remain stable unless control is changed by an authorized mechanism.

### 5.1 Political control substrate

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them. Political control defines who governs, not who fights.

Each settlement has a political controller—a faction that exercises accepted authority. This control is initialized deterministically before any military interactions and remains stable by default. Political control does not drift due to absence of military formations or passage of time.

Political control may change only through **authorized mechanisms**: **attack resolution** (War phase: attack → push-back/control flip at the target OSID), **corps or frontline operations** (as defined), internal authority collapse or fragmentation, or negotiated transfer. In the OSID model, control does not change from passive pressure alone; it changes only via attack resolution or corps/frontline ops for War phase. This substrate is essential for modeling that wars occur within existing political space—fronts advance through governed territory; they do not create it.

## 6. Force as organized coercion

Military power is represented exclusively through organized formations, including militia, Territorial Defense units, brigades, lower-level groups, and corps-level assets.

Only formations generate coercive pressure and combat friction. Political or administrative units do not fight. Military control cannot exist without force presence. Political control exists independently of military formations and precedes military contestation.

Political control defines governance and authority. Military formations contest or replace political control through pressure and collapse mechanisms but do not generate it.

## 7. Brigades, frontage, and attack-driven control

*(ZoC system removed 2026-03-02. Movement is no longer ZoC-constrained; retreat destinations are OSID-based with no ZoC blocking.)*

Brigades occupy **one OSID** (operational settlement) each; stacking on the same OSID is allowed. Control over an OSID **changes only when a brigade attacks** (attack resolution → push-back and control flip) or through defined frontline/corps operations—there is no passive pressure flip. Brigade frontage is constrained by **BRIGADE_OPERATIONAL_FRONTAGE_CAP=48** (formation_constants.ts). Local front density modifier (local_front_defense.ts) applies THIN_FRONT_THRESHOLD=0.5 and DENSE_FRONT_THRESHOLD=1.0 to scale defender power based on brigade coverage of front edges.

Fronts are derived from hostile OSID adjacency: a front exists where two adjacent OSIDs have opposing controllers. Front edges are grouped into contiguous, assignable front segments. Front segments are organized within theatres (Theatre → Army → Corps → Brigade) for operational command framing.

Over time, fronts may harden (e.g. through entrenchment), stabilize, or fracture depending on supply and exhaustion. Static fronts accumulate strain rather than resolve conflict.

Players do not draw geometric frontline entities directly. They assign brigades to derived front segments, optionally name those segments, and command posture, movement, and attacks through formation-level orders. Column movement allows multi-hop redeployment through friendly rear (terrain and composition affect speed). Combat is resolved by the attack-resolution formula (outcome thresholds, casualties, push-back, control flip). Unassigned brigades are reserve and do not execute attack or offensive movement until assigned.

**Implementation-note (bot AI and calibration):** Bot brigade AI uses faction strategic objectives (e.g. RS corridor/Drina/Sarajevo, RBiH enclaves/corridors, HRHB Herzegovina) and target scoring; Feb 2026 calibration added gap filling, concentration attacks, corridor priority scoring, and corps-level rebalancing. Session 2 (2026-02-25): ethnic scoring, init control fix (hybrid_1992 + operational_political_control.json), Bihać OSID narrowing, heartland time-decay, Pelagićevo corridor, ARBiH undefended bonus, HVO Posavina retreat (War phase Spec §12, PROJECT_LEDGER). Current state and open issues (front-assignment bug, personnel distribution, enclave protection) are documented in War phase Spec §12 and docs/40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md; no new mechanics invented here.

## 8. Authority, control, and legitimacy

Authority represents the capacity to govern, coordinate, and extract compliance. Control reflects the ability to enforce decisions locally. Claims represent political intent without enforcement.

These variables are tracked separately and frequently diverge under wartime conditions. Military dominance without authority produces instability rather than consolidation.

### 8.1 Political control as pre-front substrate

Political control is distinct from both authority and control in the abstract sense. It is the specific, attributable exercise of recognized governance over a settlement. Where authority represents general capacity to govern and control represents enforcement capability, political control identifies which faction actually governs a given settlement.

This distinction matters because military formations can contest or replace political control without possessing authority, and political control can persist in rear areas without active military control. The substrate of political control provides the foundation upon which authority and military control operate.

## 9. Internal fragmentation of political space

Municipalities are divisible political spaces. Sustained military pressure and loss of settlement connectivity may cause a municipality to fragment into multiple Municipal Control Zones.

Fragmentation is an emergent systemic outcome, never a player-declared action. It weakens governance, complicates supply, and accelerates exhaustion for all actors involved.

## 10. Population as constraint

Population is finite and exhaustible. Displacement, attrition, and demographic shifts permanently reshape political and military capacity.

Urban and rural populations impose different constraints on recruitment, control, and legitimacy. Population loss reduces options rather than freeing them.

## 11. Recruitment, organization, and militarization

Military forces emerge through localized recruitment pipelines constrained by authority, supply, and social cohesion.

Organizational friction limits the speed and scale of force generation. Expanding territory does not guarantee increased manpower.

## 12. Logistics and sustainment

Logistics is central to the simulation. Supply is traced through settlements and internal connectivity rather than abstract stockpiles.

Interdiction degrades sustainment gradually. Cutting supply rarely produces immediate collapse but steadily erodes operational capacity.

## 13. Exhaustion as the primary strategic currency

Exhaustion represents cumulative societal, institutional, and military strain. It is irreversible and accumulates from combat, fragmentation, displacement, and prolonged pressure.

Exhaustion constrains action and drives negotiation more decisively than battlefield defeat.

## 14. External actors and asymmetric pressure

External patrons exert influence through material support, diplomatic pressure, and strategic constraints. Their objectives are asymmetric and conditional.

External involvement often destabilizes internal dynamics rather than resolving them.

## 15. Negotiation, intervention, and war termination

Wars end through negotiation, collapse, imposed settlement, or unresolved stalemate. No decisive victory state exists.

Negotiation emerges from exhaustion and pressure rather than moral or military clarity.

### 15.1 Peace treaty mechanics

Treaties are terminal: any accepted peace-triggering territorial treaty ends the war immediately and produces a deterministic end-state. Territorial clauses (transfer_settlements or recognize_control_settlements) trigger peace if accepted.

Any peace-triggering treaty must explicitly address Brčko special status. Treaties without Brčko resolution are rejected.

### 15.2 Institutional competences

Institutions are negotiated as competence allocations. Treaties may allocate specific competences (police, defense, education, health, customs, taxation, currency, airspace, international representation) to faction holders.

Certain competences are bundled: customs with indirect taxation, defense policy with armed forces command. These must be allocated together to the same holder.

### 15.3 Acceptance and end states

Negotiation is negative-sum. Acceptance is computed deterministically from an explicit breakdown including competence valuations. No offer is guaranteed acceptance.

Different end states reflect different balances of exhaustion, control, and external pressure. All outcomes are shaped by systemic constraints, not scripted victory paths.

## 16. Exceptional spaces and systemic anomalies

Certain spaces, including besieged capitals, long-term enclaves, and critical corridors, require explicit systemic handling due to their strategic and symbolic weight.

Exceptions are modeled openly rather than hidden within generic rules.

## 17. Design principles and invariants

The simulation enforces several invariants: no retroactive legitimacy, no unitless control, no cost-free violence, and no purely military solutions.

### 17.1 Operational invariants

**No unitless control:** Control cannot exist without formation presence and responsibility.

**Brigade location is one OSID:** Each brigade has a single location_osid; multiple brigades may stack. Corps and operational groups coordinate only; they do not own OSIDs.

**Control change only via attack or corps ops:** Territorial (OSID) control changes only through **attack resolution** (War phase attack → push-back/control flip) or **corps/frontline operations** as defined, or internal authority collapse or negotiated transfer. There is no passive pressure flip.

**Rear Political Control Zones:** OSIDs (or settlements derived from them) that are not the target of attack resolution remain under faction control. They do not experience control change solely due to absence of military formations. Rear zones are stable by default but vulnerable when fronts expand via attack or corps ops.

**No cost-free violence:** Military action always increases exhaustion and produces political and societal costs.

**Breakthroughs require cumulative failure:** Single settlement loss does not create operational rupture without depth, supply, and cohesion collapse.

**No total victory:** End states are negotiated, imposed, frozen, or collapsed outcomes shaped by exhaustion and external pressure.

These principles prevent system drift and preserve the integrity of the simulation.

### 17.2 Foundational invariants

Municipalities are composite political spaces. Internal division is the default wartime condition.

Strategic corridors are emergent flow axes defined by dependency, capacity, and redundancy.

Authority and control are distinct. Exhaustion is irreversible.

Certain spaces, such as Sarajevo, function as exhaustion amplifiers rather than capture objectives.

### 17.3 Institutional limits

Institutions do not mature cleanly over time. Even as forces professionalize, command structures remain fragile, contested, and vulnerable to exhaustion and political fracture. No faction achieves fully reliable institutional control during the war.

## 18. Design boundaries and non-negotiables

The design is bounded by historical plausibility, mechanical integrity, and thematic coherence.

**Historical plausibility:** The simulation respects the constraints of the historical conflict without scripting outcomes. Factions, geography, demographics, and initial conditions reflect 1991-1995 Bosnia and Herzegovina.

**Mechanical integrity:** No system may be bypassed for convenience. Invariants are enforced deterministically. Derived states are recomputed each turn and never serialized.

**Thematic coherence:** This is a war without victory. The simulation models exhaustion, constraint, and negative-sum conflict. Military power matters but never resolves the war alone. Political collapse is as dangerous as military defeat.

These boundaries are non-negotiable and define what this game is and what it is not.

## 19. v0.4 Design Additions (Systems 1-11)

### Negative-sum conflict reinforced
- External pressure and embargo asymmetry constrain options without creating empowerment.
- Heavy equipment degradation and legitimacy costs ensure no enduring advantage.
- Enclave liabilities and Sarajevo pressure increase cost for all sides.

### Governance vs occupation
- Legitimacy separates control from accepted rule; occupation is costly and unstable.
- Authority consolidation is blocked by low legitimacy and critical supply.

### Spatial liabilities
- Enclaves and Sarajevo encode humanitarian and diplomatic costs as systemic pressure.
- Spatial isolation creates liabilities that can be traded in negotiation.

### Negotiation as constraint resolution
- Settlement is a budgeted exchange of liabilities and assets, not a victory state.
- Required clauses (Brcko, Sarajevo) enforce structural limits on treaties.
- Negotiation capital is intentionally scarce to force compromise.

### Asymmetric evolution
- Factions evolve differently; doctrine and capability progression reflect historical asymmetries without scripting outcomes.
- Progression is deterministic and bounded by supply, exhaustion, and equipment.

### Determinism
- All new systems remain deterministic, auditable, and replayable.
- Historical variability comes from initial conditions and interactions, not randomness.

## 20. v0.6 Canon consolidation

This document (v0.6.0) is the Game Bible for the two-phase (Peace/War) model. It supersedes Game_Bible_v0_5_0.md; deprecated canon versions are archived in docs/_old/10_canon/.
