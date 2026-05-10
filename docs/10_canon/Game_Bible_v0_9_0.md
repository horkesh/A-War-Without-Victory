# A War Without Victory -- Game Bible v0.9.0

**Last Updated:** 2026-05-05

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

**Implementation-note (2026-05-10 consequence pressure):** Patron-distance consequences are faction-scoped where the engine already owns faction-scoped patron review flags. The canonical Belgrade-Pale arms-review / partial-disavowal chain remains the strongest historical pattern, while RBiH and HRHB now have conditional external-channel review and partial-distance surfaces that write existing pressure substrates (`recruitment_modifier`, `supply_delta`, `patron_pressure`, and CostLedger annotations). These mirrors are audit-only pressure consequences: they do not create a rupture mechanic, new patron model, sensitive-history adjudication, or new player command lever.

## 15. Negotiation, intervention, and war termination

Wars end through negotiation, collapse, imposed settlement, or unresolved stalemate. No decisive victory state exists.

Negotiation emerges from exhaustion and pressure rather than moral or military clarity.

### 15.1 Peace treaty mechanics

Treaties are terminal: any accepted peace-triggering territorial treaty ends the war immediately and produces a deterministic end-state. Territorial clauses (transfer_settlements or recognize_control_settlements) trigger peace if accepted.

Any peace-triggering treaty must explicitly address Brčko special status. Treaties without Brčko resolution are rejected.

**Implementation-note (2026-05-10 early-peace handoff):** Accepted all-faction peace plans write the termination signal (`meta.game_over`, `meta.outcome`, `war_ended_early`, `early_peace_implemented`) and freeze the endgame snapshot. The Cost Ledger also records `early_peace_implementation_record`, a duration finding that names the accepted plan and termination week. This is a handoff fact, not a moral credit or proof that political or civilian costs vanished.

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

This document (v0.6.0) was the Game Bible for the two-phase (Peace/War) model. As of v0.9.0 the simulation is single-phase (War only); the peace phase has been removed (v0.7.3). The v0.6.0 design philosophy and abstraction layers in §§1-19 remain authoritative; the consolidation note here is preserved for lineage. Game_Bible_v0_9_0.md supersedes Game_Bible_v0_6_0.md; deprecated canon versions are archived in docs/_old/10_canon/.

## 21. The Metagame — Political Leadership and the Event System

The player is the wartime political leader of their faction. This identity is never stated explicitly — the game says "you" and "your faction." Events, briefings, and diplomatic encounters address the player as head of state. Military officers are subordinates who report to you.

### 21.1 Event System

Events are the primary vehicle for political and strategic dynamics. They are NOT scripted history — they emerge from game state conditions. Three types:

- **Decision events (~60%):** Player chooses between 2-4 options. Every option costs something.
- **Consequence events (~30%):** Something happened because of another faction's action or your prior choices. Real mechanical state change, no choice.
- **Forced events (~10%):** Truly exogenous (UN resolution, external power decision). Often followed by a decision event.

Events fire through the **pressure system**: conditions ripen, a readiness counter builds, and when it crosses threshold the event fires. The player can sometimes prevent events by changing the conditions.

### 21.2 Strategic Dimensions

Six dimensions per faction track cumulative reputation and position:

1. **Military credibility** — can your army deliver?
2. **Territorial legitimacy** — is your claim defensible?
3. **International standing** — how does the world see you?
4. **Patron confidence** — does your patron back you?
5. **Internal cohesion** — is your faction unified?
6. **Negotiating leverage** — composite strength at the table

Each dimension has a base value (computed from game state) plus an event modifier (accumulated from player decisions). Both contribute to the effective value that determines future event options and Dayton outcomes.

### 21.3 Foundational Decisions

At game start, each faction faces a defining choice that reshapes the entire event tree:

- **RS:** The Six Strategic Goals — adopt all, adopt selectively, or pursue aggressively
- **RBiH:** State identity — civic multi-ethnic republic, Bosniak national state, or pragmatic hybrid
- **HRHB:** Political goal — united front with ARBiH, separate Croat republic, or strategic ambiguity

These are ahistorical branching points. The bot always picks the historical option. The player can choose differently — and live with the consequences.

### 21.4 Event Flags

Player decisions set named flags on game state (e.g., `rs_strategic_goals: 'selective'`). Downstream events read these flags to modify their conditions, options, and consequences. Flags create explicit causal chains across the entire game.

## 22. Sensitive History Design Gate (canon, v0.9.0)

AWWV depicts the 1992-1995 Bosnian War — a war that included genocide, systematic ethnic cleansing, siege-starvation, and mass atrocity convicted by the International Criminal Tribunal for the former Yugoslavia. A negative-sum wargame that takes its subject seriously must settle the moral question before implementation continues, not after.

**Core position:** AWWV depicts atrocity without letting the player optimize against it. The game refuses to turn genocide into a manipulable cost-benefit system. **Atrocity is a consequence, not a lever.**

The full canonical statement is `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`. The Bible-level summary:

### 22.1 Three Rings (binding boundary)

Every depiction of sensitive history lives in exactly one of three rings:

- **Ring 1 — Modeled mechanically:** enclaves, displacement, paramilitary sweeps, war crimes counter, and rupture consequences (currently only `srebrenica_genocide_1995`).
- **Ring 2 — Represented narratively:** historical events, ICTY-cited essays, Chronicle entries, Cost Ledger prose. The game depicts every major atrocity from BB and ICTY in this ring.
- **Ring 3 — Refused:** no "commit genocide" decision tree, no concentration camp system, no negotiable condemnation, no body-count optimization surface, no "atrocity efficiency" metric, no calendar-driven atrocity recording, and seven other refused surfaces. This list is exhaustive and binding.

A feature that fits in none of the three rings does not exist yet. If you cannot place it in a ring, do not build it.

### 22.2 Rupture Expansion Rule

A historical event becomes eligible for rupture status only if it meets all four criteria:

1. **Mass scale:** >1,000 civilian deaths in a bounded event, or systematic over a bounded timeframe.
2. **International legal finding:** ICTY conviction (genocide, crimes against humanity, grave breaches) or ICJ/UN finding of equivalent weight.
3. **Specific trigger condition:** discrete, deterministic game-state condition (control of a specific OSID, presence of a flag, turn range), NOT a cumulative threshold and NOT a calendar-window heuristic.
4. **Non-reversible:** once recorded, the event is a fact of the world for the run.

Adding a rupture is a capital-R Decision requiring `/historian` + `/war-or-game` + `/game-designer` + user approval. The default is: do not add one.

### 22.3 Counterfactual silence is canon

When a player's modeled war does not satisfy the rupture trigger condition, the rupture is correctly silent. The historical record (Ring 2: essays + ICTY citations) remains canonical and accessible regardless of campaign path. The §3 ghost-entry register (e.g., Mission E `enclave_defended` ghost at `data/codex/ghost_entries/enclave_defended.md`) records the divergence in historical voice without celebration, minimization, or "less deadly than history" framing. (Q-CANON-RUPT-4 resolution, 2026-05-04.)

### 22.4 Cost Ledger wording

The Cost Ledger is the closing prosecutorial voice. Required: historical voice, ICTY case citations, specific atrocity names, integer civilian counts. Forbidden: euphemisms, trivializing comparisons, minimization, second-person framing, achievement-style language, humor or ironic distance. Tone draws from ICTY summary judgments and UN investigative reports — not sports commentary, not Paradox endgame summaries. Full constraints in `SENSITIVE_HISTORY_DESIGN_GATE.md` §4.

## 23. Victory Conditions and Pyrrhic Scoring (canon, v0.9.0)

**Thesis:** AWWV is a negative-sum political wargame. There is no winning. There are only graded failures. The player is judged on how much worse they made it versus what was possible — not on who prevailed.

The full canonical statement is `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`. The Bible-level summary:

### 23.1 No victory; only verdicts

- There is no victory screen. There is a **verdict screen**.
- There is no single winner. The verdict is per-faction.
- There is no scoreboard. Pyrrhic score is *supporting context*, not sovereign truth.
- Outcome class + grade are the primary verdict drivers. Condemnation flags can cap or taint any result.

### 23.2 Termination vs Judgment

Two distinct systems:

- **Termination** (`war_termination.ts`): *when* the war ends. Priority order: scenario victory conditions → faction collapse → turn limit stalemate.
- **Judgment** (`scoring.ts`): *how* the war is assessed. Produces `GameVerdict` with per-faction `FactionVerdict` packets.

Judgment runs regardless of which termination trigger fired. A victory-condition match does not give that faction automatic A+ — it still gets judged against its grade anchors.

### 23.3 Outcome Taxonomy

Seven `OutcomeClass` values: `strategic_success`, `survival`, `negotiated_escape`, `pyrrhic_success`, `hollow_victory`, `failure`, `collapse`. Classification order: condemnation flags FIRST (Srebrenica genocide forces `failure` regardless of territory), then territorial grades.

### 23.4 Faction grade anchors (canon)

Faction grades are gated by faction-specific anchors that encode historical reality. RBiH grades on territory + enclaves + Sarajevo + war crimes; RS grades on territory + cohesion + war crimes; HRHB grades on territory + cohesion. Grade anchors are canon — changing them changes what the game means by "roughly historical." Full table in `VICTORY_AND_PYRRHIC_SCORING.md` §3.2.

### 23.5 Non-Goals (binding)

The scoring system **does not and will not**: reward body count; treat atrocity as tradeable capital; invert under any input; expose a difficulty multiplier; produce a "winner" label; rank factions against each other; drift toward arcade endings.

## 24. v0.8 Command Chain (closed)

v0.8 closed the gap between *the player issues an order* and *the army does what the player intended*. Five milestones:

### 24.1 Corps Commander Intelligence (v0.8.0)

Named officers exercise interpretation authority over corps directives. The corps commander does not execute the player's order mechanically — they translate intent into a corps plan filtered by competence, aggressiveness, defensiveness, and the corps situation. A timid corps commander may downgrade an aggressive directive; a competent one may identify a better axis than the player chose.

This converts the army from a vending-machine ("insert order, receive movement") into a chain of subordinates with their own judgment. Player intent is real but never executes cleanly through bad commanders or bad situations — which is the historically correct model of the Bosnian War's institutionally fragile chains of command.

### 24.2 Commander Maturity (v0.8.1)

Commanders carry persistent belief state, motive stack, and a per-turn decision trace. The commander is not a function-of-state pure formula; they accumulate experience and conviction. Decisions become inspectable (the player can see *why* the commander did what they did) and replayable (deterministic envelope; same state + same belief state + same motive stack produces identical decision).

### 24.3 Political Leader Bot (v0.8.2)

Bot factions have a political layer — foundational decisions (RS Six Strategic Goals, RBiH state identity, HRHB political goal), patron management, faction identity. The army-level commander does not fabricate strategic priorities; they receive a strategic-priorities packet from the political layer and translate that into corps directives.

This separates *politics* from *military command*. The player's army-level commander is a subordinate to the player-as-political-leader, not a co-equal goal-setter.

### 24.4 Order Interpretation (v0.8.3)

The semantic gap between *what the player ordered* and *what the named officer interprets* becomes explicit. Subordinates may:

- **Delay:** wait for better intel, supply, or weather.
- **Partial-execute:** commit a smaller force than ordered.
- **Refuse:** decline an order that contradicts their judgment.
- **Escalate-to-context:** ask for clarification (surfaced as Decision Room cards).

The player sees the interpretation in the Pre-Advance Review surface before the turn commits. The player can override (force the order through) at the cost of cohesion, morale, or commander confidence.

### 24.5 Autonomy Depth + Claude API (v0.8.4)

Named-officer autonomy operates within a deterministic envelope; the optional Claude-API integration may add narrative texture (corps dialogue, battle narratives, war dispatches) but cannot change the autonomous decision once recorded. Replay determinism is preserved via `decision_log.ts`.

The Claude integration has four modes (cadet → recruit → officer → commander) at increasing API cost. Cadet is formula-only and the default; the deterministic envelope is canonical.

### 24.6 Phase 0 panel pattern (durable lesson)

When modifying a system that crosses combat / commander / political / events surfaces, dispatch a Phase 0 panel of the affected experts BEFORE writing code. Lane reports cite this pattern explicitly. The pattern is a durable rule recorded in `PROJECT_LEDGER_KNOWLEDGE.md`.

## 25. v0.9 Product Spine

v0.9 closes the loop between the simulation and the player's experience of the simulation. The pieces existed at v0.8.x; v0.9 makes them feel like one coherent presidential campaign loop.

### 25.1 Decision Room and Command Loop

Army HQ Decision Room collects the cards the player must address before advancing the turn — Strategic Priorities, opportunity dossiers, source handoffs to operational SITREP, command briefing, Turn Aftermath records, active cost summary, Chronicle entries. Each card carries a **canonical action target** rather than spawning a parallel action queue.

The Decision Room is an inspection affordance, not a second inbox. Source truth remains with the review queue, opportunity dossiers, operational SITREP, command briefing, Turn Aftermath records, active cost surface, and Chronicle. (See `PROJECT_LEDGER_KNOWLEDGE.md` "singular ownership" lesson.)

### 25.2 Pre-Advance Review and Turn Aftermath

The player reviews staged orders against named-officer interpretation BEFORE advancing the turn. Subordinate dissent (delay, partial-execute, refuse) surfaces here. The player may override at cost.

After the turn, the Turn Aftermath surface captures what happened, whose orders survived, which interpretations were recorded, what the named officers actually did, and what the consequences will be over the coming weeks.

### 25.3 Chronicle

A persistent narrative record of the war emergent from gameplay — major battles, atrocities, displacement waves, officer succession, treaty offers — surfaced in Army HQ and folded into the Verdict / Wrapped at endgame. The Chronicle is read by the player, not authored by the player. It records what the simulation produced; it does not simulate what was recorded.

### 25.4 Cost Ledger (v0.9.0)

ICTY-style prosecutorial endgame narrative, drawing on the war-crimes counter, displacement records, casualty ledger, and rupture consequences. Wording constrained by `SENSITIVE_HISTORY_DESIGN_GATE.md` §4. The Cost Ledger is the closing voice the war speaks back to the player about what they made of it.

### 25.5 Endgame Comparison and Dynamic Codex (v0.9.1)

Your war vs the historical war, side-by-side. Ghost essay sections in the Codex note where your campaign diverged from history. `VerdictScreen` may render milestone comparison rows from `historicalComparison.milestone_comparison`, with a duration-only fallback for older saves; the first authored baseline rows are Srebrenica and Dayton. These rows are downstream reflection, not score inputs. The Dynamic Codex may also render source-labeled Cost Ledger findings and milestone comparison rows inside historical essays when the endgame packets emit them; current authored consumers include Srebrenica, Dayton, Ahmici, Operation Storm, Zepa, the Federation Offensive, Drina, Prijedor camps, HVO camps, Markale shelling, Dayton talks, Grabovica/Uzdol, Tuzla Gate, Second Markale, Stupni Do, and Vance-Owen early peace. Those inserts inherit the Cost Ledger wording rules in §22.4 and remain Ring 2 narrative reflection. The §3 register (`SENSITIVE_HISTORY_DESIGN_GATE.md` §5) governs counterfactual narrative voice — historical recording, not celebration or minimization.

### 25.6 Tutorial / Onboarding (v0.9.2)

First-session guided steps; restart IPC for tutorial-aware new-game. The tutorial teaches the campaign loop, not the simulation's mechanical depth — depth is encountered through play.

### 25.7 Map That Scars / Refugee Column / Corridor Heartbeat (v0.9.4)

Visual layers that make the war's accumulated cost visible on the tactical map:

- **Map That Scars:** OSID-keyed damage seed (battles, casualties, flips, displacement spikes) drives a per-OSID damage overlay. The map records what the war did to the land.
- **Refugee Column:** displacement as visible map entity. Refugee columns move along the supply graph from origin OSIDs toward destination receivers, with carrying capacity caps, route blocking, and abroad-flight fractions visible.
- **Corridor Heartbeat:** supply corridor pulse visualization. Open corridors pulse green; brittle pulse amber; cut go dark. The corridor's state visually breathes with the war's logistics.

### 25.8 Force-quality and observability (v0.9.x)

The simulation's force-quality arc (officer_quality decay under casualty, growth under combat experience and frontline presence) bends toward historical reality through deterministic mechanism without faction-asymmetric multiplier railroad. The substrate fixes (reconstitution policy step curve, equipment_quality_modifier, officer-quality observability) are documented in `War_Specification_v0_9_0.md` §12. The observability surfaces (per-turn `brigade_temporal_log.jsonl`, force-quality trajectory diagnostic) are harness emissions, not engine state.

## 26. v0.9 Canon consolidation

This document (v0.9.0) supersedes Game_Bible_v0_6_0.md. The substantive design philosophy in §§1-21 is the v0.6.0 baseline and remains authoritative. §§22-25 fold in the v0.7-v0.9 design surface that landed since the v0.6.0 consolidation:

- §22 Sensitive History Design Gate (canon, 2026-04-16; Q-CANON-RUPT-4 amendment 2026-05-04)
- §23 Victory Conditions and Pyrrhic Scoring (canon, 2026-04-16)
- §24 v0.8 Command Chain (closed; v0.8.0 → v0.8.4 → v0.8.x-final)
- §25 v0.9 Product Spine (in progress; consequence-substrate live, broader matrix open)

Deprecated canon versions are archived in `docs/_old/10_canon/`.

---

*Game Bible v0.9.0 — design philosophy preserved from v0.6.0; v0.7-v0.9 sensitive-history gate, victory scoring, Command Chain, and product spine integrated as canon §§22-25.*
