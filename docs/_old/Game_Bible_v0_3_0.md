# A War Without Victory -- Game Bible v0.3.0

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

Spatial responsibility is held at brigade level through Areas of Responsibility (AoRs). Brigades are accountable for contiguous clusters of settlements, including both contact and rear depth. Corps and temporary Operational Groups coordinate effort but never own space. This ensures control is traceable, contested, and costly, rather than a clean function of borders.

### 5.1 Political control substrate

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them. Political control defines who governs, not who fights.

Each settlement has a political controller—a faction that exercises accepted authority. This control is initialized deterministically before any military interactions and remains stable by default. Political control does not drift due to absence of military formations or passage of time.

Political control may change only through sustained opposing military pressure, internal authority collapse, or negotiated transfer. This substrate is essential for modeling that wars occur within existing political space—fronts advance through governed territory; they do not create it.

## 6. Force as organized coercion

Military power is represented exclusively through organized formations, including militia, Territorial Defense units, brigades, lower-level groups, and corps-level assets.

Only formations generate coercive pressure and combat friction. Political or administrative units do not fight. Military control cannot exist without force presence. Political control exists independently of military formations and precedes military contestation.

Political control defines governance and authority. Military formations contest or replace political control through pressure and collapse mechanisms but do not generate it.

## 7. Fronts as emergent phenomena

Fronts emerge dynamically from the interaction of opposing formations deployed across space. They are not drawn by the player and do not exist as independent entities.

Over time, fronts may harden, stabilize, or fracture depending on pressure, supply, and exhaustion. Static fronts are dangerous because they accumulate strain rather than resolve conflict.

Front emergence is evaluated on the settlement graph where adjacent settlements are controlled or contested by different brigades. Players influence fronts indirectly by reshaping brigade Areas of Responsibility and selecting brigade posture, not by drawing lines or selecting settlements.

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

**No settlement targeting:** Players do not issue orders to assume control, defend, or attack individual settlements. Territorial change occurs through sustained pressure within Areas of Responsibility.

**No spatial ownership above brigade level:** Only brigades hold Areas of Responsibility. Corps and operational groups coordinate only.

**AoRs apply only to front-active settlements:** Settlements exposed to active or imminent military pressure require brigade AoR assignment. Settlements that are politically controlled but not exposed to military pressure are not required to have AoR assignment.

**Rear Political Control Zones exist without AoR assignment:** These rear settlements remain under faction control without direct brigade assignment. They do not participate in pressure exchange, do not generate fronts, and do not experience control change solely due to absence of military formations.

**Control change requires defined mechanisms:** Settlement control changes only when opposing brigade pressure is applied and sustained under eligibility rules, or internal authority collapse triggers fragmentation or realignment. Rear Political Control Zones are stable by default but vulnerable to expansion of fronts or internal systemic failure.

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

---

*Game Bible v0.3.0 - Formatted Edition*
*Version updated from v0.2.5*
*Political control content integrated into Sections 5.1 and 8.1*
*Treaty synopsis integrated into Section 15*
*Operational invariants updated for v0.3.0 AoR scoping*
*Section 18 added on design boundaries*
*All inline scope notes removed*