# A War Without Victory -- Rulebook v0.9.0

**Last Updated:** 2026-05-05

One game turn equals one week.

Municipalities cannot flip control through violence until the war-start escalation threshold is satisfied (pre-war degradation may occur, but control does not transfer).

## 1. Introduction

A War Without Victory is a strategic war game simulating the conflict in Bosnia and Herzegovina from late 1991 to 1995. Players assume the role of political and military leadership of one faction. The goal is not conquest, but survival, leverage, and shaping the conditions under which the war ends.

**Presidential Command Model (additive note — LOCKED design 2026-06-01):** Canonically, **the player is the president and commands the war through their generals (strategic directives), not as a general; brigade-level operation planning is post-1.0 / DLC.** In 1.0 the president's military agency is five command levers: (1) **Authorize op — SHIPPED**; (2) Request op; (3) Stop op; (4) Authorize elite deployment; (5) Replace a corps CO at cost — **levers 2–5 are locked-design/forthcoming, not yet built.** Refusing a patron demand is the event layer, not a sixth lever. Authoritative design: `docs/plans/2026-06-01-presidential-command-model-design.md`. *(Additive note; does not supersede existing Rulebook sections. **Owner-review flag:** §5.1/§5.5 state brigades are "directly commanded by the player" and brigade posture is "selected by the player." This describes the shipped tactical command surface and is not in itself contradicted — the brigade op-PLANNING UX deferred to DLC is the operation-authoring surface, not posture/movement — but the precise reconciliation of brigade-direct-command vs president-through-generals framing is left for owner resolution.)*

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

No other mechanism may alter political control.

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

### 5.2 Brigade location and movement

*(ZoC system removed 2026-03-02. Movement is no longer ZoC-constrained. Retreat destinations are OSID-based with no ZoC blocking. Frontage is constrained by BRIGADE_OPERATIONAL_FRONTAGE_CAP=48.)*

**OSID location:** Each brigade occupies one OSID (`location_osid`). Stacking is allowed. Only **deployed** brigades (not in column: packing / in_transit / unpacking) participate in combat.

**Movement orders:** Brigade movement uses `brigade_movement_orders.ts` (apply-brigade-movement pipeline step). Column movement allows multi-hop redeployment through friendly rear (terrain-weighted path, composition-dependent rate); brigades in column are in_transit and do not fight until they arrive.

**Retreat (prefer rear):** When retreating, valid destinations are friendly-controlled OSIDs. Tie-break among valid destinations: **enemy adjacency count ascending** (prefer rear), then **OSID string sort** (determinism). No ZoC blocking of retreat destinations.

**Attack-only control change:** Control of an OSID does not change from passive pressure. It changes only when an **attack** is resolved (attack resolution → push-back and control flip) or through defined corps/frontline operations.

### 5.3 Rear Political Control Zones

OSIDs (or settlements derived from them) that are not the target of attack resolution constitute **Rear Political Control Zones** when they remain under faction control without being adjacent to hostile control or enemy brigades.

Rear zones:
- Remain under faction control
- Do not experience control change solely due to absence of military formations
- Become contested when fronts expand via attack or corps ops

### 5.4 Front assignment and movement

Brigades are assigned to derived front segments (`brigade_front_assignment`). `null` assignment means the brigade is in **reserve**. Reserve brigades do not execute attack or offensive movement orders until assigned to a front.

Movement is along the **operational contact graph** (OSID to OSID). *(ZoC-constrained movement removed 2026-03-02; ZoC system deleted.)* **Column movement** allows multi-hop redeployment through friendly rear areas (terrain-weighted path, composition-dependent rate); brigades in column are in_transit and do not fight until they arrive. Frontage constraint: BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 (formation_constants.ts). Local front density modifier (local_front_defense.ts) scales defender power: THIN_FRONT_THRESHOLD=0.5 / DENSE_FRONT_THRESHOLD=1.0 / MIN_COVERAGE_PENALTY=0.6 / MAX_DENSITY_BONUS=1.25. Combat is resolved by the **attack resolution** formula: outcome thresholds, casualties, push-back, and control flip at the target OSID.

### 5.5 Brigade posture

Each brigade has a posture selected by the player. Posture affects attack power, defensive resilience, and exhaustion in the attack-resolution formula. Posture does not guarantee outcomes.

Reserve rule: brigades in reserve (no front assignment) do not issue attack/posture/movement orders until assigned to a front segment.

**Postures (summary):** Hold, Defend, Defend At All Costs, Elastic Defense, Counterattack, Dig In, Attack, Assault. `Probe` is now an operation type at corps level rather than a brigade posture. Posture multipliers still apply to attacker and defender combat power.

### 5.6 Brigade survivability

Brigades are never outright destroyed in combat. When a brigade is forced to retreat and no adjacent friendly OSID is available, the brigade executes an **emergency retreat with penalties** rather than being eliminated from the order of battle.

**Force retreat with penalties:** The retreating brigade retains 60% of its personnel, suffers -20 cohesion, and is disrupted for 3 turns (unable to attack or be ordered). Entrenchment and defense streak reset to zero.

**Emergency retreat destination priority:** The system searches for a safe destination in the following order:
1. The brigade's `home_osid` (if friendly-controlled)
2. The brigade's `fallback_osid` (a per-brigade OOB field designating a secondary rally point)
3. The brigade's corps HQ location
4. Any friendly-controlled OSID reachable by the brigade's faction

**Design rationale:** Historical Bosnian War brigades rarely ceased to exist even after catastrophic defeats. Personnel dispersed, regrouped, and reformed. Outright destruction is replaced by severe degradation that takes many turns to recover from — a brigade that suffers emergency retreat is combat-ineffective for weeks but eventually returns to the line.

### 5.7 Operational Groups

Operational Groups are temporary coordination constructs authorized at Corps level. They do not own OSIDs. They occupy an OSID and participate in combat; they coordinate timing and provide bonuses (e.g. og_mult) to adjacent friendly attacks during operations. *(ZoC removed 2026-03-02 — OGs no longer project ZoC.)*

With Corps authorization, an OG may temporarily pull battalion-equivalent manpower from brigades. Donor brigades retain their location_osid but suffer reduced strength. Detached manpower operates within the OG's OSID and operation scope; OGs dissolve per lifecycle rules and personnel return to donors.

### 5.8 Named officers and command

Historical corps and army-level commanders are represented as **named officers** with individual ratings that shape military operations. Officers are not abstract bonuses — they are specific individuals with documented careers, personalities, and limitations.

**Officer ratings:**
- **Competence** (1-5): Overall military skill. Primary combat modifier for the corps.
- **Aggressiveness** (1-5): Attack willingness. Shapes corps directive aggression, operation tempo, and launch thresholds.
- **Defensive skill** (1-5): Defensive combat proficiency. Modifies defensive power for the corps.
- **Political reliability** (1-5): Loyalty to faction political leadership. Affects HVO succession priority.

**Officer origins:** Officers come from different backgrounds — JNA (Yugoslav People's Army career officers), TO (Territorial Defense), HV (Croatian Army), militia (wartime volunteer leaders), political (political appointees), and foreign (volunteers or advisors). Origin affects initial competence and improvement potential.

**Corps assignment and penalties:** Each officer has a preferred corps (`home_corps_id`) and optionally compatible corps. Assignment to the home corps incurs no penalty. Assignment to a compatible corps imposes -1 effective competence for 8 turns. Assignment to an incompatible corps imposes -2 effective competence for 12 turns. Acting commanders (temporary assignments without a named officer) operate at 92% effectiveness.

**Officer casualties:** Officers face per-battle casualty risk based on their `casualty_vulnerability` rating (0.0-1.0). Officers can be killed, captured, or wounded. Officer loss triggers immediate succession.

**Competence improvement:** Officers marked `can_improve` gain competence through combat experience at their `improvement_rate` per battle, reflecting the wartime learning curve — especially important for ARBiH officers who started with minimal training.

**War crimes records:** 27 officers carry `war_crimes_record` annotations documenting ICTY or BiH State Court proceedings. These records are informational and do not affect gameplay mechanics. They provide historical context for the player.

**Enclave-locked officers:** Some officers are physically trapped in besieged enclaves and can only command operations within that enclave's territory. Examples include Naser Oric (Srebrenica) and Atif Dudakovic (Bihac). Enclave locks may expire at historical breakout dates.

### 5.9 Officer succession

When an officer departs (historical departure date, casualty, capture, or retirement), the system must find a replacement.

**Player faction:** The player receives a notification event (`replacement_suggested`) identifying the departing officer and recommending a historical successor. The player may accept the recommendation, choose a different officer from the available pool, or leave the position temporarily vacant (acting commander at reduced effectiveness). The `available_until_turn` field on an officer creates a suggestion event — the officer does not automatically retire, giving the player time to plan the transition.

**Bot factions:** Automatic succession using historical successor lookup. The system finds the next officer with the same `home_corps_id`, available at the current turn, prioritized by pool tier (starter > tier_a > tier_b > tier_c).

**Faction-specific succession rules:**
- **VRS:** Brain drain — officers leave at an increasing rate after week 40, reflecting the real degradation of the Serbian officer corps.
- **ARBiH:** Pool regeneration — new officers emerge periodically with modest base competence but high improvement potential, reflecting the wartime professionalization of the Bosnian army. Early-war warlord friction reduces effectiveness.
- **HVO:** Zagreb cadre — officers arrive from Croatia periodically. Political replacement delays (4 turns) reflect the politicized HVO command structure. Combat death replacements are faster (1 turn).

**Pending officer events:** Succession events accumulate in `pending_officer_events` on the military state. Each event has a unique ID, type, faction, turn, and acknowledgment status. Events persist until the player acknowledges them.

### 5.10 Army HQ reserve pool

Each faction's Army HQ maintains a pool of elite brigades that can be loaned to corps commanders on request. This represents the historical practice of army-level reserves being committed to critical sectors.

**Request and allocation:** Corps commanders generate requests based on operational need (offensive preparation, defensive emergency, or counterattack opportunity). Army AI evaluates requests by geographic feasibility (graph distance from the elite brigade to the requesting corps), request priority, and current commitments. The player can also manually assign elite brigades.

**Loan lifecycle:** Elite brigade loans are operation-tied rather than time-limited. A loaned brigade remains with the receiving corps until:
- The operation concludes and the need expires (`op_complete` or `need_expired`)
- The player manually recalls the brigade (`player_recall`)
- Force-recall conditions are met: the brigade suffers casualties beyond a threshold, morale collapses, or permanent degradation occurs (`casualty_threshold`, `morale_collapse`, `permanent_degradation`)

**Loan tracking:** Each brigade accumulates `EliteLoanEpisode` records tracking deployment history, duration, casualties sustained during loan, and recall reason. A cooldown period applies between consecutive loans of the same brigade.

**Design rationale:** The army reserve system prevents elite brigades from being permanently absorbed into a single corps while ensuring they are available where most needed. It creates a strategic decision layer — committing the reserve to one sector means it is unavailable elsewhere.

## 6. Fronts and Combat

### 6.1 Front formation

Fronts are first-class contiguous segments derived from **hostile OSID boundary edges**: adjacent OSIDs with opposing political controllers. Brigades on OSIDs adjacent to enemy control or enemy brigades define the front. Combat is resolved by **attack resolution**: discrete engagements with outcome thresholds, casualties, push-back, and control flip. There is no passive pressure flip.

Front assignment: a brigade assigned to a front segment is on the front; an unassigned brigade is in reserve. Theatre membership provides the top-level grouping for front segments and command panels.

### 6.2 Combat: attack resolution

Combat occurs when a brigade **attacks** an adjacent OSID (enemy-controlled or occupied by enemy brigades). The **attack resolution formula** (Systems Manual §7.4; Attack Resolution Formula Spec) computes attacker and defender combat power, then:

- **Power ratio** determines outcome: decisive victory (≥2.0), victory (≥1.5), costly victory (≥1.0), stalemate (0.7–1.0), repulsed (0.5–0.7), catastrophic (<0.5).
- **Casualties** apply to both sides; snap events may apply when state conditions are met.
- **Push-back and control flip:** On attacker victory (decisive/victory/costly), the defender retreats, control of the target OSID flips to the attacker, and the attacker may advance into it (one OSID per attack). Retreat destination is chosen deterministically (OSID-based, no ZoC blocking): prefer friendly OSID with fewest enemy neighbors (ascending enemy adjacency count), then OSID string sort. *(ZoC removed 2026-03-02.)*

**Entrenchment** and **resilience (defense_streak)** modify defender power. Only deployed brigades participate. No single resolution flips more than one OSID.

### 6.3 Reactive sector defense

When a sector is attacked, the defense is not limited to brigades physically present at the targeted OSID. Reserve brigades throughout the sector contribute to the defense based on their distance and readiness — representing lateral fire support, reserve mobilization, and rapid reinforcement along interior lines.

**Distance-weighted contributions:** Each reserve brigade's contribution decays exponentially with BFS hop distance from the attacked OSID (base 0.60 per hop, maximum 5 hops). A brigade 1 hop away contributes 60% of its power; at 2 hops, 36%; at 3 hops, 21.6%. Beyond 5 hops, contribution is zero.

**Home-municipality motivation:** Brigades defending OSIDs within their home municipality receive a 1.3x motivation bonus to their reactive contribution. This reflects the historical pattern of Bosnian War units fighting hardest when defending their own communities.

**Reactive defense ratio:** The defender mobilizes up to 1.5 brigade-equivalents of reserves per attacking brigade (capped at available reserve power). This prevents massed attacks from automatically overwhelming defenders — the defense reacts proportionally to the threat.

**Minimum defense floor:** Even if no brigade is physically present, the defense at any sector edge is at least 75% of one brigade's average power, representing the continuous locked front line.

**Casualty distribution:** When reserves contribute to defense, casualties are distributed proportionally to each brigade's contribution weight. Brigades closer to the fight and with home-municipality motivation absorb more casualties. A casualty engagement cap (1.5x attacker personnel) prevents defenders from taking disproportionate losses when they have overwhelming local superiority.

**Sector stances (Layer B):** Each sector can adopt one of five independent defensive stances that modify reactive defense effectiveness and entrenchment growth:

| Stance | Reactive Bonus | Entrenchment Rate | Description |
|---|---|---|---|
| **Fortify** | 1.30x | 2.0x | Maximum defensive preparation. Dig in deep. |
| **Defend** | 1.15x | 1.2x | Standard defense with good responsiveness. |
| **Elastic** | 1.00x | 0.8x | Trade space for time. Reserves counterattack. |
| **Active Defense** | 0.85x | 0.6x | Aggressive patrolling and local counterattacks. |
| **Screening** | 0.50x | 0.0x | Minimal presence. Observation only. No entrenchment. |

Sector stances are constrained by the parent corps stance. An offensive corps cannot order its sectors to Fortify; a defensive corps cannot order Active Defense. The player sets sector stances; bot AI evaluates stance per-sector based on threat assessment.

### 6.4 Ops-only attack doctrine

Brigades do not attack independently. All offensive attacks flow through **corps operations** (CorpsOperation). The corps operation system decides when, where, and with which brigades to attack based on the commander's directives, sector intelligence, and available forces.

The sole exception is **counter-attacks**: a brigade that has just lost its position (retreat from a successful enemy attack) may attempt to retake the lost OSID on its own initiative. This represents the immediate, reflexive response of a unit trying to recover ground before the enemy consolidates.

**Design rationale:** Independent brigade attacks — where a single brigade decides on its own to attack an adjacent enemy OSID — were historically rare in the Bosnian War. Operations required corps-level coordination: reconnaissance, supply buildup, artillery preparation, and multi-brigade timing. The ops-only doctrine ensures that attacks are deliberate, planned events rather than opportunistic single-brigade gambles.

### 6.5 Front hardening and exhaustion

Fronts harden over time (e.g. entrenchment on current OSID); prolonged static contact increases exhaustion. Exhaustion does not flip control; it narrows options and drives negotiation.

### 6.6 Phase 3A: Pressure eligibility and diffusion

Phase 3A allows pressure to propagate across settlement contacts using deterministic eligibility weights derived only from Phase 2 contact metrics. Each turn, eligible pressure diffuses conservatively across those contacts. Diffusion is a structural substrate only: it does not itself cause control change, exhaustion, collapse, or negotiation effects. *Control change in War phase only via attack resolution or corps ops.*

*The formal frozen specification is defined in the Systems & Mechanics Manual under "Phase 3A --- Pressure Eligibility and Diffusion (Design Freeze)".*

### 6.7 Phase 3B: Pressure and exhaustion

Sustained pressure does not resolve the war directly. When pressure persists under static, constrained, or degraded conditions, it gradually converts into irreversible exhaustion. Exhaustion does not flip control.

*The formal frozen specification for this mechanism is defined in the Systems & Mechanics Manual under "Phase 3B --- Pressure → Exhaustion Coupling (Design Freeze)".*

### 6.8 Phase 3C: Exhaustion and collapse eligibility

Exhaustion does not automatically cause collapse. When accumulated exhaustion persists and coincides with institutional or spatial degradation, it may unlock eligibility for collapse in specific domains. Eligibility does not imply immediate failure.

*The formal frozen specification for collapse gating is defined in the Systems & Mechanics Manual under "Phase 3C --- Exhaustion → Collapse Gating (Design Freeze)".*

## 7. Operations and Preparation

### 7.1 Corps operations

Corps operations are the primary mechanism through which offensive action occurs. A corps operation designates target OSIDs, assigns participating brigades (up to 12), and coordinates the attack sequence across multiple turns. Operations are corps-level: the corps commander selects targets from the full corps directive and draws brigades from the entire corps pool. Contiguity is enforced from the corps' full front (all sectors), not a single sector. Probes (small recon-by-force) remain sector-scoped.

### 7.2 Operation preparation

Before an operation executes, it passes through a **five-phase preparation state machine**:

1. **Intel Gathering:** The corps collects intelligence on the target sector. Sector intel confidence must reach the commander's threshold before proceeding. During this phase, the player may order **reconnaissance-in-force probes** — limited engagements (max 2 brigades at 40% combat power) that test enemy defenses and improve intelligence confidence. Probes cost 5 corps exhaustion. The enemy may detect incoming probes and gain a counter-probe confidence boost (+0.15).

2. **Force Staging:** Participating brigades move into position. The operation cannot proceed until sufficient forces are staged near the objective.

3. **Supply Check:** The corps verifies that supply reserves are adequate to sustain the planned operation.

4. **Assessment:** The operation commander evaluates all gathered information and issues a **go/no-go recommendation** based on intel confidence, force ratio, supply status, and their own personality. The assessment score is computed against the commander's go-threshold (aggressive commanders launch at lower scores).

5. **Ready:** The operation is cleared for execution. It transitions to the active execution phase on the next turn.

**Commander personality and preparation tempo:** The assigned commander's ratings directly shape preparation:
- **Aggressive commanders** (aggressiveness 5) complete preparation in as few as 3 turns and require lower intel confidence (0.38) and force ratios (1.25).
- **Cautious commanders** (aggressiveness 1) take up to 7 turns and demand higher confidence (0.74) and force ratios (1.65).
- **Competent commanders** require slightly higher confidence but also demand better force ratios, reflecting thoroughness.

**Postponement and abort:** If the commander's assessment is negative, the operation may be postponed. A maximum of 2 postponements are allowed before the operation is forced to a final go/no-go decision. The player can **force-launch** an operation at any preparation phase, overriding the commander's recommendation — at the risk of attacking with incomplete intelligence and insufficient forces.

**Operation commanders:** Each operation is assigned a named officer from the reserve pool. Selection prioritizes regional match (home corps), then competence, then aggressiveness. During execution, participating brigades use the operation commander's combat modifier instead of their corps commander's. Enclave-locked officers can only command operations within their enclave.

### 7.3 Operation execution

Once launched, the operation enters execution. Brigades march toward the objective through friendly territory first; attacking through enemy territory is a last resort when no friendly path exists. Operations track total failures (max 5) and consecutive failures on the current target (max 3). Movement-only stalls are capped at 4 turns. When an operation stalls or exhausts its failure budget, it concludes and participating brigades return to normal sector duties.

### 7.4 Event Conditions (v0.6.0 expansion)

**v0.6.0 expansion:** 14 additional condition types: `supply_below/above`, `territory_percentage`, `dimension_above/below`, `flag_equals/not_set`, `patron_pressure_above`, `war_crimes_above`, `morale_average_below`, `week_since_event`, `event_fire_count`, `enclave_supply_status`, `corridor_severed`.

## 8. Authority and Governance

### 8.1 Authority vs control

Authority represents the ability to govern and organize. Control represents the ability to enforce power locally.

A faction may control territory without effectively governing it. Loss of authority can be as dangerous as military defeat.

### 8.2 Legitimacy and degradation

Authority degrades under stress and may diverge from control. Legitimacy erosion can trigger internal resistance and command disobedience.

## 9. Fragmentation and Enclaves

### 9.1 Municipal fragmentation

Municipalities may split into multiple control zones during the war when settlement connectivity is severed and authority collapses.

### 9.2 Enclave dynamics

Enclaves are isolated areas under pressure that generate humanitarian and political consequences beyond their military value.

## 10. Population and Recruitment

### 10.1 Population as resource and constraint

Population is both a resource and a constraint. Recruitment depends on authority, legitimacy, and exhaustion.

### 10.2 Displacement effects

Displacement permanently weakens long-term capacity even if short-term manpower increases.

## 11. Supply and Logistics

### 11.1 Supply tracing

Military operations depend on supply traced through settlements and corridors.

### 11.2 Corridors

Corridors have states (Open, Brittle, Cut) and affect supply flow. Loss of corridors can have cascading effects across entire regions.

### 11.3 Local production

Local production can partially offset supply shortages, but degrades over time.

## 12. Diplomacy and Local Truces

### 12.1 Graz Accords (RS-HRHB Non-Aggression)

In May 1992 (approximately week 4 of the war), Bosnian Serb leader Karadzic and Bosnian Croat leader Boban met in Graz, Austria, and agreed to partition Bosnia between them. This produces a de facto RS-HRHB non-aggression pact that holds in Herzegovina and around Kiseljak, while fighting continues in the Posavina corridor, Jajce, and central Bosnia where all three factions are entangled.

**Two-component truce structure:**

1. **Herzegovina corps-pair truce:** Specific RS and HRHB corps are bound by a ceasefire. The western pair (VRS 2nd Krajina Corps and HVO Tomislavgrad) observes the truce immediately from week 4. The eastern pair (VRS Herzegovina Corps and HVO Southeast Herzegovina Corps) begins the truce only after initial fighting for east Mostar and Stolac concludes. These corps will not generate attack orders against each other's territory while the truce holds.

2. **Kiseljak OSID exclusion:** A set of HRHB-held OSIDs near Kiseljak are protected from VRS attack, and a corresponding set of VRS-held OSIDs bordering Kiseljak are protected from HRHB attack. This reflects the local power-sharing arrangement in the Kiseljak pocket.

**What the Graz Accords do NOT cover:** The Posavina corridor (where RS and HVO fought throughout 1992), central Bosnia outside the Kiseljak pocket, and Krajina HRHB cells including Jajce. In these areas, RS and HRHB forces may fight each other normally.

**Cold fronts:** Front edges between Graz-covered corps pairs are classified as "cold fronts." Cold fronts do not generate passive frontline attrition or bombardment fire. HRHB siege drain is also skipped on cold fronts. This means RS and HRHB forces facing each other in Herzegovina conserve strength rather than grinding each other down.

**Player agency:** The player can choose to break the truce — either the Herzegovina component or the Kiseljak exclusion — by ordering an attack against protected territory. Breaking the truce has consequences: the wronged faction receives a +0.25 aggression modifier for 6 turns, representing the retaliatory response. Both RS and HRHB automatically accept the Graz Accords (bot behavior); future implementation will allow the player to accept or decline.

**Strategic significance:** The Graz Accords are a major structural feature of the early war. They free RS and HRHB forces in Herzegovina to concentrate against ARBiH, while RBiH faces potential hostility from both sides. Breaking the accords is a high-risk decision that opens a new front but may be necessary if the truce partner is exploiting the peace to consolidate against you.

## 13. Exhaustion

### 13.1 Nature of exhaustion

Exhaustion represents cumulative military, political, and societal strain. Exhaustion is irreversible and shapes all other systems.

### 13.2 Effects on capabilities

As exhaustion rises, actions become harder to execute and outcomes more unpredictable.

## 14. External Actors

### 14.1 Patron relationships

External patrons provide conditional support and apply pressure. Patron objectives may change over time and may not align fully with player goals.

## 15. Negotiation and War Termination

### 15.1 Opening negotiation windows

The war ends through negotiation, collapse, or imposed settlement. Military success influences negotiations but never guarantees victory.

### 15.2 Peace treaty mechanics

Peace treaties contain territorial clauses (transfer_settlements or recognize_control_settlements) which are peace-triggering. If accepted, peace ends the war and sets the end state; all war dynamics stop thereafter.

### 15.3 Territorial clauses

Territorial clauses define settlement control transfers and recognition of control.

### 15.4 Institutional competences

Treaties may allocate competence IDs (e.g., police_internal_security, defence_policy, education_policy, health_policy, customs, indirect_taxation, currency_authority, airspace_control, international_representation).

Certain competences are bundled and must be allocated together:
- Customs + indirect_taxation
- Defence_policy + armed_forces_command

### 15.5 Brčko special status

Any peace-triggering treaty must explicitly include brcko_special_status. Otherwise it is rejected with rejection_reason = brcko_unresolved.

### 15.6 Acceptance computation

Acceptance is computed, not guaranteed. The acceptance breakdown is deterministic and includes competence_factor derived from static per-faction valuations.

### 15.7 End states

Different end states reflect different balances of exhaustion, control, and external pressure. No total victory exists.

## 16. Player Agency and Limitations

### 16.1 Command friction

Players do not have absolute control. Orders may be delayed, partially executed, or ignored as command cohesion erodes.

### 16.2 Consequences

Some actions are possible but carry severe long-term consequences.

### 16.3 War-phase player agency

War-phase player control is real but bounded. The player does not micromanage battles; the player shapes intent, commitment, and risk.

In practice, this means the player can:
- set brigade postures and attack orders on the line
- set sector-level defensive stances (Fortify / Defend / Elastic / Active Defense / Screening) for individual corps sectors, shaping how reserves respond to attacks and how quickly entrenchments grow
- shape corps operations with tempo, artillery preparation, launch discipline, and target focus
- review operation readiness during preparation: intelligence confidence, supply status, force ratio estimates, and commander assessment (launch/postpone/abort recommendation)
- select operation commanders from the reserve officer pool, with regional fit and personality affecting preparation tempo and launch thresholds
- order reconnaissance-in-force probes during operation preparation to improve intelligence before committing to execution
- make go/no-go decisions on operations: force early launch, accept commander recommendation, postpone (up to 2x), or abort
- manually assign corps commanders from the reserve pool (subject to alignment and reassignment delays)
- accept or decline officer succession recommendations, choosing replacements from the available pool
- request elite brigades from the Army HQ reserve pool for critical operations, and manually recall them when the need has passed
- accept or break the Graz Accords (RS-HRHB non-aggression pact), weighing the cost of a new front against the strategic opportunity
- use information-warfare tools such as OPSEC, feints, and probes
- make constrained supply-agency decisions such as enclave airdrops, convoy approvals, smuggling allocation, and municipality support

These tools expand agency without overriding command friction, logistics, exhaustion, or international consequences.

## 17. Player's Turn Guide

A phase-by-phase summary of player actions each turn. For system details, see the relevant sections above. *Implementation-note: This section satisfies pipeline backlog item 1.2 (Player's Turn Guide); confirmed 2026-02-24.*

### 17.1 War phase (Early War)

Each turn the player:
1. **Reviews** the situation: control map, militia emergence, authority states, alliance status
2. **Sets brigade postures** (when formations exist): hold, defend, defend_at_all_costs, elastic_defense, counterattack, dig_in, attack, assault
3. **Issues attack orders** against adjacent enemy-controlled settlements
4. **Monitors** JNA withdrawal, alliance strain, and early-war transition conditions
5. **Responds** to the Graz Accords event (week 4): accept or decline the RS-HRHB non-aggression pact
6. **Ends turn** — postures apply; battles resolve; control may flip; displacement triggers

The player commands through posture and targeting, not direct unit movement. Command friction may degrade order execution.

### 17.3 War phase (Mid-War to Late-War)

Each turn the player:
1. **Reviews** reports: front status, exhaustion, supply pressure, corps operations, recent battles, officer status
2. **Sets brigade postures** and **sector defensive stances**. Note: brigades do not attack independently — all attacks flow through corps operations (see §6.4). The player sets posture as a readiness directive; the sector and operation machinery decides when and where to attack.
3. **Manages corps operations**: front assignments, operational groups, attack axes, tempo, launch timing, and deception tools such as feints or probes. Operations now include a **preparation phase** before execution (see §7.2) — the player reviews readiness briefings, selects commanders, may order probes, and makes go/no-go decisions. Commander personality (competence x aggressiveness) shapes preparation tempo and launch recommendations
3a. **Brigade sector override** (n717): player may permanently assign a brigade to a specific same-corps sector via the brigade's Orders tab. The sector commander then orders the brigade to march to its frontline position. Useful for concentrating a veteran unit on a key sector or pulling a brigade back from a threatened flank. Override persists until cleared. Effectiveness cost shown in the panel: brigades operating far from their home municipality perform at reduced effectiveness (up to 30% penalty; elite mechanized/motorized brigades have a gentler decay curve).
4. **Manages the officer corps**: responds to succession events, assigns replacement commanders, reviews officer combat records. Selects operation commanders for upcoming operations.
5. **Manages army reserves**: reviews elite brigade loan requests from corps commanders, approves or denies deployments, recalls loaned brigades when the need has passed.
6. **Allocates constrained supply agency**: enclave airdrops, convoy decisions, smuggling focus, municipality support, and related relief choices where available
7. **Monitors** exhaustion, recruitment, equipment degradation, alliance dynamics, truce status (Graz Accords), and international visibility pressure consequences
8. **Responds** to events: ceasefire conditions, Washington Agreement preconditions, enclave integrity, officer succession notifications (implementation-note: enclave protection for Srebrenica/Gorazde/Cazin is not yet implemented; see CALIBRATION_REPORT_BOT_AI_FEB_2026.md §7)
9. **Ends turn** — brigade movement resolves (brigade_movement_orders.ts); attacks resolve; supply/exhaustion update; recruitment accrues. *(ZoC-constrained movement removed 2026-03-02.)*

War phase adds operational depth (corps, fronts, supply, officer management, army reserves) but reduces tactical flexibility (frontage cap, exhaustion, friction).

### 17.4 General Principles

- **No undo:** Once the turn ends, consequences are permanent.
- **Incomplete information:** Fog of war limits what the player sees; some events are revealed only after the fact.
- **No total control:** Orders may be degraded by command friction, supply shortages, or low cohesion.
- **Consequences accumulate:** Displacement, exhaustion, and international pressure compound over time.
- **Officers matter:** Commander quality shapes operation tempo, launch decisions, and combat effectiveness. Losing a good commander is a strategic setback.

### 17.5 Event Decisions and the Metagame

The event system presents the player with political and strategic decisions throughout the war. Events fire from game state conditions through the **pressure system** (not calendar triggers).

**Decision events** offer 2-4 options. Each option:
- Has immediate mechanical effects (morale, supply, equipment changes)
- Sets **event flags** that downstream events read
- Shifts **strategic dimensions** (6 per faction: military_credibility, territorial_legitimacy, international_standing, patron_confidence, internal_cohesion, negotiating_leverage)

**Foundational decisions** (w1-7) define faction identity:
- RS: Six Strategic Goals — scope of offensive operations, cleansing policy
- RBiH: State identity — multi-ethnic recruitment, international standing
- HRHB: Political goal — alliance with ARBiH, relationship with Zagreb

**Event constraints** — some events impose military restrictions:
- **Operation blocks:** faction cannot launch new operations for N turns
- **Scope restrictions:** offensive targets limited to specific municipalities
- **Doctrine overrides:** forced defensive/offensive posture

**Recurring decisions** — some events fire multiple times with escalating stakes. Options narrow as the player defers.

**Maximum 4 events per turn.** Candidates are sorted by priority, trigger week, then event id. Events sharing a `mutex_group` cannot co-fire in the same turn; only the first candidate in canonical order remains eligible. Events delayed only by the four-event cap are persisted as an overflow queue and rechecked on later turns before they can fire.

## 18. Victory Conditions

### 18.1 No total victory

There is no total victory. Success is measured by survival, leverage, and the terms under which the war ends.

### 18.2 Faction-specific paths

Different factions face different paths to acceptable outcomes.

## 19. v0.4 Player-Facing Additions (Systems 1-11)

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
- Initial control can be secure, contested, or highly contested based on early-war stability.
- Highly contested areas are fragile in early war.

## 20. v0.7 Systems Summary

This document (v0.7.0) adds the following systems implemented since v0.6:

- **Graz Accords / Local Truces** (§12.1): RS-HRHB non-aggression pact from week 4 with corps-pair truces, Kiseljak exclusion zone, cold front mechanics, and player truce-break agency.
- **Operation Preparation** (§7.2): Five-phase state machine (intel gathering, force staging, supply check, assessment, ready) with commander personality-driven tempo, reconnaissance probes, and player go/no-go decisions.
- **Named Officers and Succession** (§5.8, §5.9): Historical commanders with competence/aggressiveness/defensive skill ratings, combat casualties, enclave locks, war crimes records, and player-choice succession for the player faction.
- **Reactive Sector Defense** (§6.3): Distance-weighted reserve contributions with home-municipality motivation bonus, five sector stances (Fortify/Defend/Elastic/Active Defense/Screening), and proportional casualty distribution.
- **Army HQ Reserve Pool** (§5.10): Elite brigade loan system with priority-based allocation, operation-tied lifecycle, force-recall conditions, and player manual control.
- **Brigade Survivability** (§5.6): Brigades are never destroyed — emergency retreat with penalties (60% personnel retained, -20 cohesion, 3 turns disrupted) to home_osid, fallback_osid, corps HQ, or any friendly OSID.
- **Ops-Only Attack Doctrine** (§6.4): All attacks flow through corps operations. Counter-attacks (retake lost position) are the sole brigade-level exception.

## 21. v0.8 / v0.9 Systems Summary

This document (v0.9.0) adds the following systems and player-facing surfaces implemented since v0.7. Mechanical detail lives in the Systems Manual; this section is the player-facing index.

**v0.8 Command Chain (closed):**
- **Corps Commander Intelligence** (v0.8.0): named officers exercise interpretation authority over corps directives — they may delay, escalate, or dissent rather than execute orders mechanically. The player issues *intent*; the named officer translates intent into a corps plan filtered by competence, aggressiveness, and the corps situation.
- **Commander Maturity** (v0.8.1): commanders carry persistent belief state, motive stack, and a per-turn decision trace. Their reasoning becomes inspectable in the player command-review surfaces.
- **Political Leader Bot** (v0.8.2): bot factions have a political layer (foundational decisions, patron management, faction identity) that drives the army-level commander's strategic-priorities packet — rather than the army layer fabricating its own goals.
- **Order Interpretation** (v0.8.3): explicit semantic gap between the player's order and the named officer's interpretation. Subordinates may *delay*, *partial-execute*, *refuse*, or *escalate-to-context* — and the player sees that interpretation in the Pre-Advance Review surface before the turn commits.
- **Autonomy Depth** (v0.8.4): named-officer autonomy operates within a deterministic envelope; the optional Claude-API integration may add narrative texture but cannot change the autonomous decision once recorded.

**v0.9 product spine:**
- **Decision Room and Command Loop**: Army HQ Decision Room collects the cards the player must address before advancing — Strategic Priorities, opportunity dossiers, source handoffs to operational SITREP, command briefing, Turn Aftermath records, active cost summary, and Chronicle entries. Each card carries a canonical action target rather than spawning a parallel action queue.
- **Pre-Advance Review and Turn Aftermath**: the player reviews staged orders against named-officer interpretation before advancing the turn; after the turn, the Turn Aftermath surface captures what happened, whose orders survived, and which interpretations were recorded.
- **Chronicle**: a persistent narrative record of the war emergent from gameplay — major battles, atrocities, displacement waves, officer succession, treaty offers — surfaced in Army HQ and folded into the Verdict / Wrapped at endgame.
- **Cost Ledger** (`v0.9.0`): ICTY-style prosecutorial endgame narrative, drawing on the war-crimes counter, displacement records, casualty ledger, and rupture consequences. Wording constrained by `SENSITIVE_HISTORY_DESIGN_GATE.md` §4.
- **Endgame Comparison and Dynamic Codex** (`v0.9.1`): your war vs the historical war, side-by-side; ghost essay sections that note where your campaign diverged from history.
- **Tutorial / Onboarding** (`v0.9.2`): first-session guided steps; restart IPC for tutorial-aware new-game.
- **Map That Scars / Refugee Column / Corridor Heartbeat** (`v0.9.4`): visual layers that make the war's accumulated cost visible on the tactical map.

**Sensitive-history gate (canonical, see `SENSITIVE_HISTORY_DESIGN_GATE.md`):**
- Atrocity is a **consequence**, never a **lever**. The Pyrrhic score does not invert under any input.
- Sensitive-history features live in exactly one of three rings: modeled mechanically (Ring 1), represented narratively (Ring 2), or refused (Ring 3). The boundaries are explicit and binding.
- Rupture consequences (currently only `srebrenica_genocide_1995`) fire only on emergent satisfaction of a discrete game-state condition — never on calendar-window heuristics. Counterfactual silence (no rupture in an ahistorical campaign that did not produce the trigger condition) is canonically correct; the historical record remains in Ring 2 (essays + codex) regardless.

This version supersedes Rulebook_v0_7_0.md.
