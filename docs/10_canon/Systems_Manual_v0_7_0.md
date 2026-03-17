# A War Without Victory -- Systems and Mechanics Manual v0.7.0

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

### 2.1 Brigade location and Frontage (ZoC removed)

*(ZoC system removed 2026-03-02. zoc.ts, zoc_constrained_movement.ts, and tests/linked_zoc.test.ts deleted. Pipeline steps zoc-computation and zoc-constrained-movement removed. GameState fields war_enemy_zoc_by_faction and war_linked_zoc_by_faction removed. Replaced by: movement via brigade_movement_orders.ts / apply-brigade-movement step; defense gating via local_front_defense.ts density modifier; frontage cap BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 in formation_constants.ts; OSID-based retreat with no ZoC blocking.)*

Brigade deployment in War phase uses **OSID-based location**:

- **Brigade location:** Each brigade has a single **location_osid** (operational settlement ID). Multiple brigades may **stack** on the same OSID. Only **deployed** brigades (movement_state = deployed) participate in combat; brigades in packing / in_transit / unpacking do not fight until deployed.
- **Frontage constraint:** BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 (formation_constants.ts) limits how many brigades can effectively engage per front edge. Local front density modifier (local_front_defense.ts): THIN_FRONT_THRESHOLD=0.5 → MIN_COVERAGE_PENALTY=0.6× defender power; DENSE_FRONT_THRESHOLD=1.0 → MAX_DENSITY_BONUS=1.25× defender power. Control of an OSID **changes only via attack resolution or corps/frontline operations**—no passive pressure flip.
- **Front segment layer:** Hostile boundary edges between OSIDs (opposing political_controller) are grouped into contiguous assignable segments (`assignable_front_segments`) with stable IDs, length, optional name, and theatre linkage. Brigades are linked to front segments via `brigade_front_assignment`; `null` means reserve.
- **Corps Sectors (derived):** Each turn, front edges are partitioned into **Corps Sectors** via multi-source BFS from corps HQs through friendly-controlled territory. Each sector contains sub-segments (connected components of front edges), territory_osids (full geographic depth via Territory Voronoi BFS), assigned/reserve brigade lists, density, threat ratio, and defensive power. Sectors are derived each turn and not serialized (Engine Invariants §13). Bot AI uses sectors to constrain attack targeting to geographically adjacent OSIDs. See `corps_front_sectors.ts`. **Multi-sector promotion (2026-03-01):** Sub-segments with ≥ MIN_SECTOR_EDGES (5) edges become independent sectors; smaller sub-segments merge into the nearest qualifying sector via OSID-hop BFS. **Territory Voronoi (2026-03-07):** After sector construction, `assignTerritoryVoronoi()` runs multi-source BFS from each sector's front-edge friendly OSIDs backward through friendly territory, creating contiguous `territory_osids` per sector. `classifyBrigadesByTerritory()` then applies three-tier classification: **front** (on sub_segments.friendly_osids), **reserve** (1 hop behind front), **deep rear** (BFS to nearest own-corps sector front; assigned but column-marched to sector). In practice ~97% of assigned brigades are physically on the front line. Brigades in friendly territory but outside all sectors → reserve of nearest sector. Sector ID format: `sector:{corps_id}:{index}`. CorpsDirective may include `sector_targets?: Record<string, string[]>` for per-sector offensive targets. GUI renders corps-colored sector boundaries with click-to-inspect detail panels.

**Removed from normative text:** brigade_aor, brigade_mun_orders, brigade_aor_orders, and front-active settlement assignment as the primary model. Control stability: rear OSIDs (not the target of attack resolution) remain under faction control; control change only via attack resolution or corps ops. **Implementation-notes** that reference existing AoR/municipality reports remain non-normative where they describe legacy or transition behavior; see docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md and 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md for the OSID/ZoC/attack-resolution design.

**Front assignment (War phase):** `brigade_front_assignment: Record<FormationId, FrontId | null>`. Reserve brigades do not execute attack/posture/movement until assigned.

**Theatres:** `theatres` and `army_theatre_assignment`. Segment `theatre_id` on `assignable_front_segments` for Theatre -> Army -> Corps -> Brigade hierarchy.

Corps and Operational Groups do not own OSIDs; they operate as command layers and coordination overlays only. Corps Sectors are a derived spatial partition for targeting and density reference, not an ownership claim.

### 2.2 Political control (pre-front substrate)

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them.

Each settlement has a **political controller** defined as the faction that currently exercises accepted authority over that settlement. Political control is distinct from brigade presence, Areas of Responsibility, fronts, and pressure application.

**Initialization:** At game start, political control is initialized deterministically before any fronts or military interactions exist. Each municipality has a default political controller representing pre-war institutional authority. All settlements inherit their municipality's political controller unless explicitly overridden. Implementation-note: Scenario may set `init_control_mode` to *institutional* (default), *ethnic_1991* (1991 census majority per settlement), or *hybrid_1992* (institutional + ethnic overrides).

Settlement-level overrides may occur only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible.

**Stability:** Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing.

**Change mechanisms:** Political control may change only through: (1) **attack resolution** (War phase: attack order → push-back/control flip at target OSID) or **corps/frontline operations** as defined, (2) internal authority collapse or fragmentation, or (3) negotiated transfer through end-state or interim agreements. There is no passive pressure flip.

**Implementation-note (2026-02-13 canonical runtime path):** Harness scenarios use a battle-driven control path: no Peace-phase control flips are applied in canonical runs, and control changes occur via War-phase attack-order resolution after deterministic initialization. **Implementation-note (2026-02-16 April 1992 init):** Canonical historical Apr-1992 war-start scenarios use `init_control_mode: "hybrid_1992"` with `init_control: "apr1992"` (curated municipal controller file); `ethnic_1991` is ahistorical for spring 1992. Early-war territorial asymmetry is also modeled through deterministic War-phase pressure calibration (including RS external-support pressure on selected municipalities).

## 3. Early-war and pre-frontline phase

The simulation begins before coherent frontlines exist. Authority and control shift through coercion, presence, and legitimacy rather than direct combat.

Municipal authority gradients determine initial compliance. Armed presence without contact may alter control. JNA formations begin with high coercive capacity but declining legitimacy, while emerging forces rely on local authority and militia.

Transition to the frontline phase occurs once sustained opposing deployments create continuous contact.

During Peace phase, brigade location is not yet in OSID space for War. War phase uses **location_osid** only (no AoR).

**Implementation-note (scenario runtime):** Canonical historical scenarios (e.g. April 1992) start directly in **war**; Peace phase remains available for pre-war scenarios.

## 4. Military formations

All coercive force is represented through formations. Types include militia, Territorial Defense units, brigades, Operational Groups, and corps-level assets.

Formations have attributes: manpower, cohesion, **morale**, readiness state, supply state, experience, exhaustion contribution, **location_osid** (War phase; one OSID per formation), and **officer_quality** (per-brigade command effectiveness [0.05, 0.90]; see §7.5).

**Morale** (`morale: number`, [0,100]) represents willingness to fight, distinct from cohesion (tactical effectiveness). Morale is non-monotonic (can increase and decrease). Population affinity from 1991 census drives morale drift: defending own-majority OSID increases morale; defending enemy-majority OSID decreases it. Encirclement of own-population defenders causes morale spike (not collapse). High morale gates retreat: defenders with morale at or above their faction's resist floor absorb costly_victory outcomes without retreating, taking casualties but holding position. Per-faction resist floors: RBiH=50, RS=55, HRHB=60 (via `getMoraleResistFloor(faction)` in `combat_math.ts`). See Engine Invariants §14.3a.

**Battle outcome morale drift (n618):** Recent battle outcomes modify morale via `BATTLE_MORALE_DRIFT` in `morale_drift.ts` (decisive +5, victory +3, costly +1, stalemate 0, repulsed -2, catastrophic -4). Two modifiers apply: (1) **Habituation** — `1/(1 + battle_outcome_count × 0.03)` diminishes effect with combat experience (62% at 20 battles, 45% at 40). Tracked per formation via `battle_outcome_count`. (2) **Faction sensitivity** — victories: RS 0.8×, RBiH 1.3×, HRHB 1.0×; defeats: RS 1.3×, RBiH 0.7×, HRHB 1.0×. VRS expects to win (victories mundane, defeats shocking); ARBiH expects to suffer (defeats absorbed, victories electrifying). Separate immediate morale shock exists in `attack_resolution_osid.ts` (e.g. decisive +3 attacker, catastrophic -10 attacker).

## 5. Formation lifecycle and readiness

Formations progress through readiness states: Forming, Active, Overextended, and Degraded.

**Implementation-note (formation activation grace period):** Brigades that remain in Forming for at least BRIGADE_FORMATION_MAX_WAIT turns (e.g. 6) auto-activate regardless of supply or authority gates, so supply-gate cannot permanently block activation. Implementation: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §6.

Players assign brigades to front segments; each brigade has a single **location_osid**. Fronts are first-class contiguous segments derived from hostile OSID boundaries; brigades are assigned to segments via brigade_front_assignment (null = reserve).

Operational Groups may be formed temporarily and dissolve automatically under cohesion loss or command degradation. This models ad-hoc wartime organization without allowing permanent force inflation.

## 6. Deployment and fronts

Players assign brigades to front segments and command **location_osid** (one OSID per brigade; stacking allowed). Movement is along the operational contact graph via brigade_movement_orders.ts (apply-brigade-movement step). *(ZoC-constrained movement removed 2026-03-02.)* Fronts emerge where adjacent OSIDs have opposing control or opposing brigades. Front state keys include `front_edges`, `assignable_front_segments`, and `brigade_front_assignment`.

Fronts harden over time (entrenchment, defensive value); prolonged static contact accelerates exhaustion.

### 6.0a Enclave brigade equipment isolation

Enclave brigades (Srebrenica, Goražde, Žepa) have explicitly set composition reflecting arms embargo and siege conditions:
- Infantry-only: tanks=0, artillery=0, aa_systems=0.
- Low equipment condition (0.35–0.45).
- Combined with CRITICAL supply status → attack scores go strongly negative → brigades organically stop attacking without behavioral blocks.
- Player-proof: a human player issuing attack orders from an enclave will fail because infantry-only vs entrenched defenders with artillery = catastrophic outcome.
- These brigades defend with high morale (enclave militia init = 70, population affinity bonus) but cannot attack.

### 6.0b Population affinity

Population affinity is computed from 1991 census data (per municipality):
```
affinity = fraction of OSID's 1991 population sharing ethnicity with defending faction
```
RBiH aligns with Bosniak + Other; RS with Serb; HRHB with Croat. This data is already maintained for displacement calculations (`MunicipalityPopulation1991Map`). Affinity drives morale drift direction and retreat resistance thresholds. The mechanic is symmetric: VRS defenders of Serb-majority OSIDs also get the bonus.

### 6.1 Brigade posture (OSID model)

Each brigade maintains a posture state chosen by the player. Posture modifies **attacker and defender combat power** in the attack-resolution formula (see §7.4). Posture does not override supply state, cohesion, or command coherence.

**8 postures (attack mult / defense mult / cohesion cost per turn):**

| Posture | Attack | Defense | Coh/turn | Notes |
|---------|--------|---------|----------|-------|
| hold | 0.25 | 1.20 | +1.0 | Recovery; caps at 85 |
| defend | 0.35 | 1.40 | −1.0 | Standard defense |
| defend_at_all_costs | 0.10 | 1.60 | −4.0 | Never auto-downgrades |
| elastic_defense | 0.15 | 1.10 | −0.5 | Planned retreat chain |
| counterattack | 1.20 | 1.15 | −1.5 | min cohesion 10; enabled by counterattack_window_turns |
| dig_in | 0.10 | 1.35→1.60 | +0.5 | Ramps over 3 turns (DIG_IN_FULL_EFFECT_THRESHOLD=0.75); caps at 85; no move/ops |
| attack | 1.50 | 0.80 | −3.0 | min cohesion 25 |
| assault | 2.00 | 0.60 | −5.0 | min cohesion 60; offensive corps stance required |

**Home ground defense (2026-03-04, updated 2026-03-12):** `home_defense_active` is computed per turn: true when `location_osid.startsWith('op:${origin_mun}:')`. Home-defense brigades: attack/assault blocked; hold auto-upgrades to defend; +0.5 cohesion/turn bonus; faction-differentiated morale floor (RBiH=30, HRHB=25, RS=20; via `FACTION_HOME_MORALE_FLOOR` in `morale_drift.ts`). RBiH formations in co-ethnic majority areas (affinity >50%) additionally receive an existential morale floor of 25 even without `home_defense_active` (`RBIH_EXISTENTIAL_FLOOR`). Sector march orders override `home_defense_active` — corps-level needs take priority over garrison duty. **State:** brigade_posture_orders; posture on FormationState; home_defense_active, counterattack_window_turns, dig_in_progress on FormationState. **Save migration:** legacy postures 'probe' and 'consolidation' normalize to 'hold' on load. All posture and corps/OG references in combat use **OSID** (brigade location_osid, target OSID).

### 6.2 Entrenchment

**Entrenchment** is accumulated by brigades that remain on the same OSID without moving. Each turn without movement increments **entrenchment_turns** (capped at MAX_ENTRENCHMENT = 12). **entrenchment_mult** = 1.0 + (entrenchment_level × ENTRENCHMENT_PER_TURN) with ENTRENCHMENT_PER_TURN = 0.065 (max mult 1.0 + 12×0.065 = 1.78). Entrenchment **resets to 0** when the brigade moves to a different OSID. **Degrade by 1** when the brigade is disrupted (instead of full reset). **State:** entrenchment_turns per brigade; serialized. Only deployed brigades on an OSID accrue entrenchment. **Implementation-note (Pipeline 2.3, 2026-02-25):** At War start (or scenario init in war), scenario parameter **war_entrenchment_init_turns** (legacy name: phase_ii_entrenchment_init_turns) (0..12) may set initial entrenchment for all brigades; stuck-in-Peace fallback (force transition after N turns) per War Spec §6 and docs/30_planning/PHASE_I_II_EDGE_CASES.md; report docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md.

### 6.2.1 Movement states (Column / Combat)

**movement_state:** deployed | packing | in_transit | unpacking. Only **deployed** brigades participate in combat. **Combat movement:** fixed-rate (e.g. 3 OSIDs per turn when deployed). **Column movement:** packing / in_transit / unpacking; composition-dependent rate (heavy mech >5% tanks+arty = 2 budget/turn, light infantry <1.5% = 4, mixed = 3); terrain-weighted edge costs (road quality 0.6×–1.0×, slope +0.8×, friction +0.6×, river +0.5, uphill +elevation/500). **Transit lifecycle:** order with stance 'column' → pathfinding through friendly OSIDs (Dijkstra) → in_transit with path and turns_remaining → on arrival set location_osid, clear movement state, reset entrenchment. **Note:** stance='column' must be set on merged movement orders; omitting it silently drops column marches (bug fix 2026-03-08). *(ZoC-constrained path validity removed 2026-03-02; path validity is friendly-OSID-only, no ZoC check.)* **State:** movement_state per formation; brigade_movement_orders for staged orders. **Implementation-note (2026-02-23):** osid_column_movement.ts implements terrain-weighted costs and getOsidColumnRate; processOsidColumnMovement two-pass (advance existing transits, then process new column orders). Pipeline: osid-column-movement runs before apply-brigade-movement (brigade_movement_orders.ts). *(zoc-constrained-movement step removed n344.)*

### 6.3 Operational Groups (OSID model)

Operational Groups are temporary coordination overlays authorized at Corps level. An OG has a **location_osid** and participates in combat. OGs do not own OSIDs beyond their location; they provide **og_mult** (e.g. 1.15) to friendly brigades attacking from an adjacent OSID as part of the same operation. *(ZoC removed 2026-03-02 — OGs no longer project ZoC.)*

**Activation:** borrow personnel from donor brigades (min 200 per donor, min 500 total). **Lifecycle:** per-turn cohesion drain; dissolve when cohesion < 15 or max_duration; at dissolution return personnel to donors. **State:** og_orders; OG formations kind 'og'.

### 6.4 Corps command and army stance (OSID model)

**Implementation-note (player agency plan A-H, 2026-03-07):** Live corps-operation shaping now extends beyond the original sector-offensive minimum. `CorpsOperation` can persist player-selected `min_attack_outcome`, `tempo`, `schwerpunkt_osid`, `artillery_preparation`, `artillery_preparation_consumed`, `force_launch`, `dig_in_on_halt`, deception types (`feint`, `probe`), and `commander_officer_id` (named officer commanding the operation — see §7.5 Operation commander) in addition to the sector/objective fields below. Execution behavior now includes early-launch cohesion penalty when forced before readiness, a first-turn artillery-preparation shock bonus, extra cohesion burn for `all_out` tempo, manual halt into recovery, optional dig-in on halt, probe-driven intel reveal, feint self-termination after limited execution, and immediate collapse of zero-eligibility idle execution shells into recovery so they do not register as invalid combat samples. Sector-level defensive intent also exists above brigades as `sector_stance_orders`; `applySectorStanceOrders()` translates those into standard brigade posture orders during the pipeline instead of mutating brigade state directly in UI or IPC.

**Corps stance:** defensive (e.g. 0.5× attack, 1.2× defense); balanced (0.8 / 1.0); offensive (1.0 attack, 0.8 defense); reorganize (0× attack, force defend, +2 cohesion/turn). **Army override:** general_offensive / general_defensive / total_mobilization as defined. **Named operations:** planning (e.g. 3 turns, +5% defense) → execution (e.g. 4 turns, operations_mult 1.3 for attack power) → recovery (e.g. 3 turns, −40% attack, +1 cohesion/turn) → complete. All stance and operation effects apply in the attack-resolution formula (attacker/defender power multipliers). **State:** corps_command (per formation), army_stance (per faction). **Implementation-note:** FormationKind army_hq, corps_command init, and OG slots remain as in existing implementation-notes; combat and posture references use OSID and location_osid. **Implementation-note (sector offensives 2026-03-01):** CorpsOperation may be extended with sector offensive fields: sector_id, objectives, current_objective_index, planning_duration, supply_readiness, momentum (0–3 cap), last_result, failure_count, consecutive_failures_on_current. Lifecycle: planning → execution → recovery → removed. Named operations use per-faction historical name pools (operation_names.ts): VRS/JNA bureaucratic style (nature, fortification, minerals), ARBiH evolved identity (weather, aspirational, Islamic terms), HVO Croatian tradition (Adriatic winds, force, action). ~40 names per faction, sequential consumption via `state.used_operation_names` (no repeats per game). Pre-planned/triggered operations (Koridor, Drina, Prsten, etc.) use explicit names outside these pools. Pipeline steps **advance-sector-offensives** (after corps orders, before brigade orders) and **update-sector-offensive-results** (after attack resolution). Launch criteria: ≥3 brigades, ≥2 enemy OSIDs, supply readiness ≥0.6 (returns 1.0 when supply_reserves_enabled=false), ≥1 objective. Recovery-phase ops can be replaced by new launches (+15 corps exhaustion). evaluateOperationProgress() skips sector_attack ops (sole handler: advanceSectorOffensives). Momentum grants aggression bonus and relaxed min_outcome. Report: docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md.

### 6.5 War phase bot (brigade AI) — implementation-note

When the bot controls a faction in War phase, brigade AI generates posture orders and attack orders in a single pass. **Column march (2026-02-23):** Interior brigades (≥3 BFS hops from front through friendly territory) receive column march orders to a front destination; in-transit brigades are skipped for order generation. Column orders use stance 'column' and destination_sids; osid-column-movement pipeline step consumes them (must run before zoc-constrained-movement). **Player faction exclusion (implementation-note):** If `meta.player_faction` is set (desktop "play myself"), the bot does not generate corps or brigade orders for that faction—the player's staged orders are preserved. When `player_faction` is null (e.g. headless scenario runner), all factions are bot-controlled. Attack-order eligibility uses the posture just decided in that pass (pending posture), not the previously applied state, so attack/assault brigades can issue attack orders in the same turn. **Soft fronts** (adjacent enemy settlements with no or weak garrison) receive **hold** posture; **real fronts** are brigade-vs-brigade. Faction-specific strategic objectives (offensive and defensive municipality lists—e.g. RS Drina valley and Sarajevo siege ring; RBiH enclaves and central corridors; HRHB Herzegovina heartland and Lasva valley) and attack target scoring (undefended +150, corridor +95, offensive objective +85, home recapture +60, weak garrison 0–80, plus weighted consolidation/breakthrough score for rear cleanup and isolated clusters) are applied deterministically; tie-break by settlement ID. **Implementation-note (rear-cleanup scope 2026-02-16):** Fast rear-cleanup municipality bonus (e.g. Prijedor/Banja Luka) is faction-scoped in implementation (RS-scoped) to avoid cross-faction over-prioritization of RS rear holdouts. **One brigade per target:** at most one brigade per faction per turn is assigned to attack a given settlement; the only exception is when the brigade is part of an OG conducting an operation toward that settlement and the target has heavy resistance (defender brigade present or garrison ≥ threshold)—operation targeting is not yet implemented so duplicates are currently disallowed. Brigades in their home municipality (home_defense_active) are assigned counterattack (when counterattack_window_turns > 0) or defend; offensive postures are blocked. Non-home-ground brigades with no attack target default to hold. All iteration and selection use stable ordering; no randomness. **Three-layer bot:** army standing orders (historical stance per faction) → corps AI (stance, named operations, OGs including defensive, corridor breach, emergency defensive ops, multi-corps coordination) → brigade AI (posture, targets, attack orders, dynamic elastic defense). Shared helpers in `src/sim/combat/war_adjacency.ts`. **Implementation-note (2026-02-18):** Peace-phase bot runs in headless pipeline (investments + relationship init); Peace-phase faction-specific strategies (RS paramilitary-first, RBiH TO-first, HRHB police/party) and alliance-aware coordination; Peace-era bot posture (hold/probe/push) in `src/sim/early_war/bot_phase_i.ts`; War-phase expanded operations catalog, defensive OGs, emergency defensive operations, inter-corps coordination, corridor strip width 8, dynamic elastic defense [1, 4]. See FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md (IMPLEMENTED_WORK_CONSOLIDATED §25). **RS early-war window (priority B):** RS offensive doctrine, Territorial Seizure standing order, effective attack-share boost, and corps E1 offensive bias apply for weeks 0–26 (RS_EARLY_WAR_END_WEEK in bot_strategy.ts). See PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md. Implementation: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §6, §25, `src/sim/consolidation_scoring.ts`, `src/sim/combat/bot_corps_ai.ts`, `src/sim/combat/bot_brigade_ai_osid.ts`, `src/phase0/bot_phase0.ts`, `src/state/turn_pipeline.ts`. **Implementation-note (Feb 2026 bot calibration):** See docs/40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md. Implemented: front-line gap filling (all factions, all stances), concentration-aware attacks (up to 3 per target with combined power estimate), corridor priority scoring (VRS_CORRIDOR_CRITICAL +500 bonus, repulsed threshold override weeks 1–30), corps-level brigade stacking per corps, HVO OOB fixes (Posavina OG, subordination). Open: front-assignment bug (all RS brigades on HRHB-RS front — corridor blocker), corps personnel distribution imbalance, enclave protection (Srebrenica/Goražde/Cazin), ARBiH 4th/2nd Corps balance. **Session 2 (2026-02-25):** Ethnic composition scoring (getCoEthnicScore in all three faction scorers), init control fix for hybrid_1992 when operational data present (operational_political_control.json), Bihać penalty narrowed to VRS_BIHAC_POCKET_OSIDS, heartland time-decay, Pelagićevo corridor, ARBiH undefended bonus, HVO Posavina retreat (Rule 1.5); PROJECT_LEDGER 2026-02-25. **Supply gating and sector offensives (2026-03-01):** Brigades at critical supply are forced to defend (no voluntary attacks). At strained supply, min_attack_outcome is upgraded to 'victory' and pioneer attacks disabled. Corps-level: when critical_fraction > 0.5 among subordinate brigades, all offensive targets are stripped (defense only); when adequate_fraction < 0.3, min_attack_outcome is upgraded to 'victory'. supplyByOsid is passed from supply_resolution to generateAllCorpsOrders. Sector offensives: executing brigades attack current objective with momentum bonuses; recovering brigades forced defend. Multi-sector corps: sector_targets in CorpsDirective; per-sector brigade assignment. Report: docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md.

### 6.6 Graz Accords (RS-HRHB Non-Aggression)

**Implementation-note (2026-03-04, updated 2026-03-11, elevated to normative v0.7):** On 6 May 1992 (~week 4), Bosnian Serb and Bosnian Croat leaders agreed in Graz, Austria, to divide Bosnia. A de facto non-aggression pact held in Herzegovina and around Kiseljak. Fighting continued in Posavina, Jajce, and central Bosnia where RS/HRHB forces were entangled via RBiH presence.

**Trigger:** `GRAZ_ACCORDS_TURN = 4` (week 4). Both RS and HRHB must accept (bot factions auto-accept; player faction presented with accept/decline).

**Corps-pair truces:** Two geographic regions are covered by paired corps truces:
- **West Herzegovina:** `vrs_2nd_krajina` ↔ `hvo_tomislavgrad` (immediate at w4).
- **East Herzegovina:** `vrs_herzegovina` ↔ `hvo_southeast_herzegovina` (activates after Op Jackal concludes — historical HVO-VRS fighting for east Mostar/Stolac through June 1992).

When active, these corps pairs do not generate attack orders against each other's territory. Each pair can be broken independently.

**Kiseljak OSID exclusion:** 9 HRHB-held OSIDs (VRS cannot target) + 7 VRS-held OSIDs (HRHB cannot target) around Kiseljak. Breakable independently from Herzegovina truce.

**NOT covered:** Posavina corridor, central Bosnia outside Kiseljak, Krajina HRHB cells (including Jajce).

**Cold fronts:** `isColdFront()` in `frontline_attrition.ts` — RS↔HRHB fronts under corps-pair truce are exempt from frontline attrition (sniping, disease, desertion) and bombardment firepower. HRHB siege drain also skipped on cold fronts.

**Player break:** Player may attack across the truce. First violation sets `truce_broken_turn[faction]`. Opponent bot gains `+0.25 aggression` for `6 turns` after truce break (`TRUCE_BREAK_SPIKE_TURNS`, `TRUCE_BREAK_AGGRESSION_SPIKE`).

**State:** `vienna_declaration_turn`, `vienna_accepted`, `vienna_herzegovina_broken_by`, `vienna_kiseljak_broken`, `truce_broken_turn`. Module: `src/sim/local_truces.ts`.

### 6.7 Reactive Sector Defense

**Implementation-note (n524→n668, elevated to normative v0.7):** Defense at any OSID within a sector draws on reserves behind the front line. Two layers interact:

**Layer A — Distance-weighted reserve contribution (n666-n667):** When a sector is attacked, reserve brigades within 5 BFS hops contribute defensive power weighted by distance. Decay factor: `0.60^hops` (max 5 hops). Home-municipality motivation: brigades defending their home municipality contribute at `1.3×`. `REACTIVE_DEFENSE_RATIO = 1.5` — maximum reactive reserve power relative to frontline power. `MIN_DEFENSE_FLOOR_FRACTION = 0.75` — sector always defends at ≥75% of its nominal power even without reserves. `DEFENDER_CASUALTY_ENGAGEMENT_CAP = 1.5` — reactive reserves that contribute to defense also absorb proportional casualties (capped). Casualty distribution: proportional to each brigade's contribution weight.

**Layer B — Sector stances (n668):** Five independent sector-level stances modify reactive defense bonus and entrenchment rate:

| Stance | Reactive Bonus | Entrenchment Rate | Description |
|--------|---------------|-------------------|-------------|
| Fortify | 1.30× | 2.0× | Maximum defense, rapid entrenchment |
| Defend | 1.15× | 1.2× | Standard defensive posture |
| Elastic | 1.00× | 0.8× | Trade space for time |
| Active Defense | 0.85× | 0.6× | Local counterattacks, reduced digging |
| Screening | 0.50× | 0.0× | Minimal presence, no entrenchment |

Bot AI evaluates stance per sector based on threat and corps directive. Corps stance provides a ceiling (e.g., offensive corps cannot Fortify). Player overrides persist across turns. Applied via `sector_stance_orders` → `applySectorStanceOrders()` in pipeline.

**Unified sector defense model (n500):** Defense at any OSID = totalSectorPower × (1/sector_edges) × densityMod. The front is a continuous locked line — no brigade-at-OSID vs sector-coverage distinction.

### 6.8 Ops-Only Attack Doctrine

**Implementation-note (n500, elevated to normative v0.7):** Brigades never attack independently. All offensive actions flow through `CorpsOperation`. Brigade-level `evaluateOffensive`, `evaluateDefensive`, `evaluateReorganize`, and `evaluateHomeDefense` are stripped of independent attack logic.

**Sole exception:** Counter-attacks — brigades may retake a recently lost position (enabled by `counterattack_window_turns > 0`) without an active operation.

**Pioneer attacks:** The first brigade in an operation seeds an attack with `repulsed` threshold. Subsequent brigades join via `estimateConcentratedOutcome()`. `MAX_PARTICIPATING_BRIGADES = 12` per operation.

**March-first doctrine (n636):** During operation execution, brigades not adjacent to the objective march through friendly territory toward the objective first. Attack-through (fighting through enemy territory) is last resort only when no friendly path exists.

### 6.9 Brigade No-Destruction

**Implementation-note (n500, elevated to normative v0.7):** Brigades are never destroyed outright by combat. All 5 former destruction paths in `attack_resolution_osid.ts` are replaced by `forceRetreatWithPenalties()`.

**Retreat penalties:**
- `EMERGENCY_RETREAT_PERSONNEL_RETAIN = 0.60` — brigade retains 60% of current personnel.
- `COHESION_LOSS = 20` — immediate cohesion reduction.
- `DISRUPTED_TURNS = 3` — brigade is disrupted and cannot fight for 3 turns.

**Retreat chain** (deterministic priority order):
1. `home_osid` — brigade's OOB home position (if friendly-controlled).
2. `fallback_osid` — per-brigade designated fallback (from OOB data).
3. Corps HQ location — if both above are enemy-held.
4. Any friendly OSID — last resort via BFS search.

**Brigade dissolution** remains as a separate system (§7.4): brigades meeting 2-of-3 criteria (personnel < 400, cohesion ≤ 20, morale ≤ 15) are dissolved. Enclave brigades require 3-of-3. Equipment transferred to nearest same-corps brigade (70% salvaged). Personnel to strategic reserve (50%). Module: `src/sim/combat/brigade_dissolution.ts`.

## 7. Combat interaction and attack resolution

In War phase, **combat** is resolved by **attack resolution** (see §7.4): discrete attacks per target OSID with combat power formulas, outcome thresholds, casualties, push-back, and control flip. There is no passive pressure flip; control changes only via attack resolution or corps/frontline operations. Pressure-derived metrics (e.g. for exhaustion coupling in Phase 3A/3B/3C) may still be computed from formation state and adjacency but do not cause control change.

**Implementation-note (legacy pressure metrics):** Where brigade-derived pressure or edge pressure is still computed (e.g. for exhaustion coupling or UI), it does not cause control change. Control change is only via attack resolution (§7.4) or corps/frontline operations. Attrition and casualties from attack resolution feed exhaustion; no passive pressure flip.

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

### 7.4 War phase attack-order resolution (Attack Resolution Formula)

When War phase runs, attack orders are resolved as **discrete attacks** per target OSID. The resolution follows the **Attack Resolution Formula Spec** (docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md). Summary:

**Combat power (attacker):** base_power × posture_attack_mult × supply_mult × corps_stance_mult × operations_mult × og_mult × disruption_mult × **officer_quality_mult**. Base power = personnel × equipment_ratio × experience × (cohesion/100).

**Combat power (defender):** base_power × posture_defense_mult × supply_mult × terrain_mult × **entrenchment_mult** × corps_stance_defense_mult × **resilience_mult** (defense_streak) × urban_mult × disruption_mult × **officer_quality_mult** × **ethnic_defense_mult**. Terrain applies to the defender's OSID (rivers, mountain, forest, road access, slope). **Entrenchment:** entrenchment_mult = 1.0 + min(entrenchment_turns, 12) × 0.065; resets on move; degrades by 1 when disrupted. **Resilience:** resilience_mult = 1.0 + min(defense_streak, 6) × 0.05; resets on move or when attacker succeeds. **Officer quality (two-tier system):** `officer_quality_mult` is computed by `getThreeTierOfficerMod(formation, state, role)` in `combat_math.ts` using a three-tier fallback: (1) When named officers are loaded (`state.named_officers`): brigade officer quality × corps commander modifier. Brigade mod = `1.0 + (quality - 0.30) × 0.4` where quality is per-brigade `officer_quality` [0, 0.90]. Corps mod = `0.90 + competence×0.03 + rating×0.01` (aggressiveness for attack, defensiveness for defense; acting commander flat 0.92). VRS pre-planned operations in execution phase use army commander (Mladić) modifier instead of corps commander. (2) When only brigade quality present: `getBrigadeOfficerMod(formation, turn)`. (3) Legacy fallback: `getOfficerQualityMult(faction, turn)` — VRS 1.10 peak decaying 0.002/w after w20 (floor 0.95), ARBiH 0.85 growing 0.003/w (cap 1.05), HVO constant 0.97. See §7.5 for full officer system specification. **Ethnic homeland defense:** +12% for ≥60% co-ethnic population in defender's OSID, graduated 30–60%, none <30% (`getEthnicDefenseBonus` in `ethnic_defense.ts`).

**Defender casualty multiplier:** Attacker heavy weapons inflict additional defender casualties via **bombardment casualty multiplier** (1.0–1.8×): `(artEff + tankEff×0.5) / 80` from attacker firepower, scaled by attacker **heavy munitions reserve** (adequate ≥50 → 1.0×; strained 20–49 → 0.75×; critical <20 → 0.5×). Applied after base casualty calculation (`getBombardmentCasualtyMult(attackers, factionId, state)` in `combat_math.ts`; scaling via `getHeavyMunitionsMult()`). Artillery suppression of entrenchment (`getArtillerySuppression`) is similarly scaled by heavy munitions. Both functions are no-ops (return full values) when `supply_reserves_enabled` is false.

**Power ratio:** attacker_power / defender_power.

**Outcome thresholds:** ≥2.0 decisive victory; ≥1.5 victory; ≥1.0 costly victory; 0.7–1.0 stalemate; 0.5–0.7 repulsed; <0.5 catastrophic failure. Undefended OSID (militia only): victory threshold 1.0. Multi-brigade attacks on same OSID use combined attacker power with coordination penalty (2 brigades 0.9, 3+ 0.8). Defender stacking: strongest at full power, others at 30%.

**Casualties (§4 of spec):** Base rates and outcome modifiers apply; KIA/WIA/MIA split; equipment losses; cohesion and exhaustion effects. **casualty_ledger** serialized. WIA trickleback when out of combat (not attack posture, not disrupted). **Equipment attrition (n292):** Per-battle equipment losses use TANK_LOSS_RATE=0.08, ARTILLERY_LOSS_RATE=0.04, with Math.round rounding (not floor) in `battle_resolution.ts`.

**Push-back and control flip (§5 of spec):** On decisive victory / victory / costly victory: defender retreats; political_controller(target_osid) = attacker faction; attacker may advance into target OSID (one OSID per attack; advancing resets entrenchment_turns to 0). **Retreat destination:** deterministically prefer friendly OSID not in enemy ZoC; tie-break **enemy adjacency count ascending**, then **OSID string sort**. No passive control change; control changes only via this resolution or corps/frontline operations.

**Snap events:** Ammunition Crisis, Commander Casualty, Last Stand, Surrender Cascade, Pyrrhic Victory, Fortification Destroyed—per spec §8 when state conditions are met. Equipment capture on surrender/elimination.

**Brigade dissolution (n292):** Brigades meeting all three criteria — personnel < 200, cohesion ≤ 10, and readiness = degraded — are dissolved. Remaining personnel are returned to the faction's strategic reserve; surviving equipment is redistributed to a sibling brigade within the same corps. Module: `src/sim/combat/brigade_dissolution.ts`.

**Frontline attrition entrenchment reduction:** Passive frontline attrition (sniping, disease, desertion) and bombardment exposure attrition are both reduced by entrenchment. Modifier: `max(0.40, 1.0 - sqrt(entrenchment_turns) * 0.10)` — sqrt diminishing returns matching the combat entrenchment model. At 6 turns: 24.5% reduction. At 20 turns: 44.7% reduction. At 52 turns: 60% reduction (floor 0.40). **Sector-based lookup (n366):** frontline attrition uses `corps_front_sectors` `assigned_brigade_ids` to determine which brigades are on the front (replaces legacy `brigade_front_assignment` + `local_fronts`). Reserves not in any sector territory are exempt. Density modifier: `sector.assigned_brigade_ids.length / sector.length_edges`. Module: `src/sim/combat/frontline_attrition.ts`.

**Siege bombardment attrition (n292):** Besieged OSIDs with enemy artillery in range suffer passive casualties each turn, independent of active combat. This models the slow attrition of garrison forces under sustained bombardment (e.g. Sarajevo, enclaves). Module: `src/sim/combat/siege_attrition.ts`.

**State (per brigade):** location_osid, entrenchment_turns, defense_streak, disrupted_turns, movement_state, **garrison** (boolean; see below). **Invariant:** No single resolution flips more than one OSID.

### 7.5 Officer system (two-tier)

**Implementation-note (2026-03-03):** The officer system models the Bosnian War's defining military inversion: VRS inherits the JNA professional officer corps (can't replace losses), ARBiH starts with almost zero trained officers (learns fast), HVO gets a trickle from Zagreb (political appointments undermine competence). Two tiers interact multiplicatively.

**Tier 2: Brigade officer quality.** Per-brigade `officer_quality` stat on FormationState [0.05, 0.90]. Initialized from OOB data (`initial_officer_quality`) or faction default (`getFactionDefaultOfficerQuality`: RS starts 0.55 decaying, RBiH starts 0.05 growing, HRHB constant 0.225). Growth from combat experience (`COMBAT_GROWTH_BASE=0.01/turn`) and frontline presence (`FRONTLINE_GROWTH_BASE=0.005/turn`), diminished at high quality (`× (1.0 - quality × 0.5)`). Loss from casualties (`casualtyRatio × 1.5 × (1.0 - quality × 0.3)`). Faction learning rates: RBiH 1.5×, RS 0.7×, HRHB 1.0× (from `war_timeline.officer_config`). VRS brain drain: `-0.001/turn` after w40. Pipeline step: `update-officer-quality` (after `update-sector-offensive-results`, before `evaluate-brigade-decorations`). Module: `officer_quality_update.ts`. **Implementation-note (OOB seeding 2026-03-08):** Historically distinguished brigades are seeded with modestly higher `initial_officer_quality` in OOB data: ARBiH Slavna units 0.10 (vs default 0.05), Viteška units 0.15; RS decorated units 0.60–0.62 (vs default 0.55). HRHB Guards receive no early seed (available_from: 80+, mid-war spawns). Army HQ formations (`vrs_main_staff`, `hvo_main_staff`, `arbih_general_staff`) are now also seeded: VRS oq=0.75/coh=72, HVO oq=0.50/coh=65, ARBiH oq=0.12/coh=38/morale=45. Fields flow through `OobCorps` → `oob_early_war_entry.ts` → FormationState. See report [20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md](../40_reports/implemented/20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md).

**Tier 1: Named officers (corps and above).** 63 historical officers loaded from `data/scenarios/officers/apr1992_officers.json` via `init_officers` scenario field. Each officer has competence (1–5), aggressiveness (1–5), defensiveness (1–5), political_reliability (1–5), casualty_vulnerability [0,1], origin (jna/hv/to/militia/foreign/political), pool_tier (starter/tier_a/tier_b/tier_c). State: `named_officers` on GameState (Record of NamedOfficerState with status, assignment, turns_in_command, battles, victories). Module: `officer_system.ts`.

**Corps combat modifier:** `getCorpsCommanderAttackMod = 0.90 + comp×0.03 + agg×0.01`; `getCorpsCommanderDefenseMod = 0.90 + comp×0.03 + def×0.01`. Acting commanders (generic replacement during delay): flat 0.92. Assignment penalty: incompatible corps = -2 competence for 12 turns; compatible but not home = -1 for 8 turns.

**Succession:** On departure (end of availability window) or casualty (deterministic hash check: `officerHash(turn, officerId) < vulnerability × 0.1` when corps engaged in battle), the best available pool officer replaces the departing commander. Pool priority: starter > tier_a > tier_b > tier_c; within tier: highest competence; tie-break by officer ID. Faction-specific rules: (a) HVO sorts by political_reliability first (modeling Zagreb political appointments); HVO replacement delay 4 turns (political) / 1 turn (combat death). (b) VRS has no pool regeneration (JNA corps is finite). (c) ARBiH regenerates pool officers every 12 turns (modeling battlefield promotion of NCOs/TO veterans). Generic officers created when pool exhausted. Pipeline step: `officer-succession` (after `tick-elite-loans`, before `generate-war-stories`).

**Operation commander (2026-03-07):** Named operations receive a dedicated commander from the reserve officer pool. Selection priority: home_corps_id match (regional), then compatible_corps_ids, then any reserve officer — sorted by competence, aggressiveness, then ID. During execution phase, participating brigades use the operation commander's modifier instead of the corps commander's (chain-of-command isolation). Commander assigned on operation creation (pre-planned, triggered, bot-generated, queued injection); released to reserve on operation completion. State: `CorpsOperation.commander_officer_id`, `NamedOfficerState.assigned_operation`. Combat integration: `getThreeTierOfficerMod` checks operation commander before corps commander. Module: `officer_system.ts` (`selectOperationCommander`, `assignOperationCommander`, `releaseOperationCommander`). Report: [20260307_OPERATIONS_COMMANDER_FEATURE.md](../40_reports/implemented/20260307_OPERATIONS_COMMANDER_FEATURE.md).

### 7.6 Operation Preparation System

**Implementation-note (2026-03-12):** Operations now pass through a preparation phase between launch and execution, modeled as a state machine within `CorpsOperation`. The preparation system gates execution on readiness and is shaped by commander personality.

**Preparation sub-phases:** `intel_gathering` → `force_staging` → `supply_check` → `assessment` → `ready`. Each sub-phase advances once per turn via `tickPreparation()`. The state machine loops through sub-phases, building readiness, until the commander issues an assessment (`launch`, `postpone`, or `abort`).

**Commander personality formulas:** The assigned operation commander's competence and aggressiveness drive preparation behavior:
- `getRequiredConfidence(comp, agg)` — cautious commanders (high comp, low agg) demand higher intel confidence before launch.
- `getRequiredForceRatio(comp, agg)` — aggressive commanders accept lower force ratios.
- `getPreparationMaxTurns(comp, agg)` — aggressive commanders prepare faster (fewer max turns); cautious commanders take longer.
- `getGoThreshold(comp, agg)` — composite readiness score threshold for a "launch" recommendation.

**Intel integration:** `getOperationIntelConfidence()` reads from `state.military.sector_intel` for enemy sectors adjacent to the operation's objectives. Confidence feeds into the commander's assessment.

**Probe mechanic:** During preparation, the commander may order a reconnaissance-in-force probe. `selectProbeBrigades()` chooses probe candidates (equipment priority, personnel floor ≥400, not disrupted). Probes resolve via `resolveActiveProbe()`, granting `result_confidence_gain` to the operation's intel and applying `PROBE_EXHAUSTION_COST=5` to probe brigades. Counter-probe: defenders gain `COUNTER_PROBE_CONFIDENCE_GAIN=0.15` intel about the probing force. Unresolved probes block preparation advancement. `autoResolveProbe()` resolves stale probes (≥2 turns).

**Anti-paralysis safety valve:** If `preparation_turns_elapsed ≥ preparation_max_turns` and the commander hasn't issued `launch`, the system forces a launch to prevent indefinite preparation stalls.

**Postponement:** Commander may postpone (up to `MAX_POSTPONEMENTS=2`), resetting the assessment sub-phase while preserving accumulated intel and readiness.

**State fields on CorpsOperation:** `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `intel_confidence_at_assessment`, `supply_readiness_at_assessment`, `force_ratio_estimate`, `commander_assessment`, `postponement_count`, `active_probe: OperationActiveProbe`.

**Types:** `PreparationSubPhase`, `CommanderAssessment`, `OperationActiveProbe` defined in `game_state.ts`.

**Pipeline integration:** `tickPreparation()` is called from `advanceSectorOffensives()` (step `advance-sector-offensives`). Operations in preparation do not enter execution until `preparation_sub_phase === 'ready'`. `PreparationEvent` records are collected for turn reports.

**Player UI:** Commander Selection Modal (`CommanderSelectionModal.tsx`) — officer roster with competence/aggressiveness display, regional fit scoring (home/compatible/out-of-region), preparation time estimates, availability checks (KIA, captured, enclave lock, already assigned). Operation Briefing Modal (`OperationBriefingModal.tsx`) — readiness gauges (intelligence, supply, force cohesion), force ratio estimate, commander assessment badge, action buttons (Launch, Order Probe, Postpone, Abort). Store contexts in `gameStore.ts`; adapter mapping in `GameStateAdapter.ts`.

**Constants:** `PROBE_FORCE_COMMITMENT_FACTOR=0.4`, `COUNTER_PROBE_CONFIDENCE_GAIN=0.15`, `PROBE_EXHAUSTION_COST=5`, `MAX_POSTPONEMENTS=2`. All constants inline in `operation_preparation.ts`.

**Determinism:** Sub-phase advancement is pure arithmetic. Probe selection uses sorted iteration. No randomness.

**Module:** `src/sim/combat/operation_preparation.ts`. Tests: `tests/probe_preparation.test.ts` (30 tests).

#### 7.6.1 Intel-Gated Operation Launch

Before launching any new operation, the corps AI checks the target sector's intel confidence against a faction-specific threshold (`INTEL_GATE_LAUNCH_THRESHOLD`): RS 0.25, RBiH 0.40, HRHB 0.30. If confidence is below threshold, a probe operation is launched instead of a full sector attack: max 2 brigades, 1-turn planning, `repulsed` minimum attack outcome.

**RS blitz exemption:** During the RS blitz phase (w0–12), JNA pre-planned operations bypass the intel gate entirely — they attack blind, reflecting inherited JNA operational plans.

**Probe commitment limit:** `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2`. After two consecutive probe operations on the same sector, the corps commits to a full attack regardless of intel confidence. The counter (`CorpsCommandState.consecutive_probes`) resets when a full attack launches or the operation completes.

**Decision flow:** `getSectorIntelConfidence()` (in `sector_intel.ts`) reads the maximum confidence from sector intel records. `shouldLaunchProbeInstead()` (in `bot_corps_directives.ts`) checks faction threshold, RS blitz exemption, and the probe counter. If true, the operation downgrades to a probe; otherwise, normal sector_attack proceeds.

**Bot AI integration:** (a) Corps commander aggressiveness modifies directive aggression: `shift = (aggressiveness - 3) × 0.05`. High-competence (≥4) commanders accept riskier attacks (min_attack_outcome downgraded to costly_victory). Module: `bot_corps_ai.ts`. (b) ARBiH warlord friction (pre-w78): for each corps with 2+ attackers, the `(turn % brigadeCount)`-th attacking brigade forced to defend. Deterministic, no probability. Module: `bot_brigade_ai_osid.ts`. (c) VRS Mladić override: pre-planned `general_offensive` operations in execution phase use army commander modifier instead of corps commander. Module: `combat_math.ts` (`getThreeTierOfficerMod`).

**War timeline integration:** Per-faction `officer_config` in `war_timeline` JSON: learning rates, brain drain parameters, pool regeneration intervals, Zagreb cadre timing, warlord friction end week, generic replacement competence. All constants read from timeline with hardcoded fallback.

**Manual assignment:** Players may manually reassign officers from the reserve pool to active Corps via the Warroom Faction Overview. Reassignment triggers a 2-turn penalty (Acting commander status), modeling transition friction. This uses the `assign-commander` IPC channel.

**Determinism:** `officerHash(turn, officerId)` uses FNV-1a (no Math.random). Sorted iteration via `strictCompare`. Growth/loss rates are pure arithmetic. Assignment penalties are lookup-based. Warlord friction uses `turn % brigadeCount`.

**Phase E GUI (2026-03-03):** Tactical map FormationDetail panel shows **Command** (brigade officer quality bar, corps/army commander name and Acting status) and **Recent command changes** for corps when the last turn report includes `officer_succession`. Warroom FactionOverviewPanel lists officers in a COMMAND subsection; NewspaperModal appends officer succession lines (replacements, casualties, departures) to AAR body. Main process sends `turn-report-updated` to both renderers after advance-turn; see DESKTOP_GUI_IPC_CONTRACT.

Report: [20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md](../40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md). Design doc: [OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md](../30_planning/OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md).

### 7.7 Army HQ Reserve Pool (Elite Brigade Loans)

**Implementation-note (2026-03-15, new in v0.7):** Army-level elite brigades can be temporarily loaned to corps commanders. The system models strategic reserve deployment at the army level — corps request reinforcements, army AI evaluates feasibility and priority, then auto-assigns (bot) or surfaces unresolved requests to the player panel.

**Loan lifecycle:** Op-tied (no hard timer). A brigade stays on loan until:
- Operation concludes and need evaporates → `op_complete` or `need_expired`.
- Player manually recalls → `player_recall`.
- Force-recall conditions → `casualty_threshold` (≥30% personnel lost), `morale_collapse` (morale < 35), `cohesion_collapse` (cohesion < 25), or `permanent_degradation` (≥50% personnel lost — elite status permanently revoked).

**Request priority scoring:** Corps submit `ArmyReserveRequest` with a reason (`offensive_support`, `defensive_gap`, `exploitation`, `enclave_relief`). Raw priority is computed from operational need; geographic penalty (BFS hop distance from nearest available brigade to requesting corps) reduces the effective priority. `MAX_AUTO_DEPLOY_HOPS = 8` — bot AI will not auto-assign a brigade beyond this distance.

**Constants:**
- `ELITE_LOAN_MIN_DURATION = 6` — minimum turns before voluntary recall (prevents thrash).
- `ELITE_LOAN_COOLDOWN = 4` — turns between loans for the same brigade.
- `ELITE_CASUALTY_THRESHOLD = 0.30` — fraction of loan-start personnel lost triggers forced recall.
- `ELITE_MORALE_RECALL = 35` — morale floor for forced recall.
- `ELITE_COHESION_RECALL = 25` — cohesion floor for forced recall.
- `ELITE_DEGRADATION_THRESHOLD = 0.50` — fraction of personnel lost that permanently degrades elite status.
- `ELITE_REINFORCEMENT_RATE = 0.50` — reinforcement rate when returned to army HQ pool.

**Tracking:** Per-brigade `EliteBrigadeTracker` records cumulative loan episodes (`EliteLoanEpisode`) with corps, reason, turns deployed, casualties taken, battles fought, OSIDs captured, and KIA inflicted. `EliteLoanState` on each eligible formation tracks current loan status, start personnel, and degradation.

**State:** `elite_loan_states` (per formation), `elite_brigade_trackers` (per brigade), `pending_reserve_requests`. Pipeline step: `tick-elite-loans` (after `advance-sector-offensives`, before `officer-succession`). Module: `src/sim/combat/army_reserve_system.ts`. Types: `src/state/elite_loan_types.ts`.

### 7.8 Army HQ Gathering (Adaptive Doctrine)

**Implementation-note (2026-03-17, v0.4.7):** Periodic army-level command meetings (`evaluateArmyHQGathering`, step 134 in `war_phases.ts`) produce multi-turn `CampaignPlan` objects stored on `state.military.campaign_plans`. After the first gathering, adaptive doctrine overrides replace calendar-driven `doctrine_phases` — attack share, aggression, corps stances, and front priorities are derived from the campaign plan rather than from the timeline JSON. Front priorities (`primary` / `secondary` / `economy` / `contain`) are consumed by `generateCorpsDirectives()` to weight offensive targeting. Synchronized multi-corps operations use a `waiting_for_sync` preparation sub-phase so that participating corps begin execution simultaneously. Module: `src/sim/combat/army_hq_gathering.ts`. Types: `src/sim/combat/army_hq_gathering_types.ts`. Constants: `src/sim/combat/army_hq_gathering_constants.ts`. 54 new tests. Report: [20260317_ARMY_HQ_GATHERING_V047.md](../40_reports/implemented/20260317_ARMY_HQ_GATHERING_V047.md).

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

### 12.1 Per-municipality displacement routing

Displacement routing uses origin-specific per-municipality tables instead of generic faction-ordered lists. Each municipality maps to a geographic routing region per displaced ethnicity. Routes specify primary destinations (nearest frontline settlements), secondary destinations (regional hubs), and abroad fraction.

**Structure:** 8 geographic regions (Krajina, Posavina/NE, Tuzla Basin, Central Bosnia, Sarajevo, Drina Valley, Herzegovina, Bihać Pocket) × 3 ethnicities (Bosniak/Serb/Croat) × sub-regional routing. See design doc `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8 for complete routing tables.

**Dynamic validation:** At routing time, each destination must be: (1) controlled by displaced person's faction (≥1 OSID), (2) have a friendly brigade present, (3) below receiving capacity. If primary route blocked → secondary → `FALLBACK_ROUTES_BY_FACTION` → abroad.

### 12.2 OSID-level displacement tracking

Displacement state tracks per-OSID granularity:
- `displaced_out_by_osid: Record<string, number>` — origin OSID → count displaced.
- `displaced_in_by_osid: Record<string, number>` — destination OSID → count settled.
- `displacement_event_log: DisplacementEvent[]` on GameState — cumulative event log with turn, origin, destination, ethnicity, counts (displaced, killed, fled_abroad, settled).
- Events sorted by (turn, origin_mun) for deterministic ordering.

**Implementation-note (2026-02-17):** War phase includes delayed hostile-takeover displacement for at-war control flips: a 4-turn takeover timer (mandatory for all sides), municipality camp holding pool for 4 turns, then deterministic reroute to ordered urban centers with motherland preference and overflow handling. **Receiving cap (2026-02-18):** Receivers cap at pre-war population × 1.5; Sarajevo area × 1.1 (siege). When a receiver is at cap, overflow is routed to next-closest urban centers. Nation-specific routing: Croat (Banja Luka/Prijedor -> Herzegovina; Posavina -> Gradačac/Brčko/Orašje, high flee-abroad), Serb (FBiH -> RS; Sarajevo east-of-Sarajevo bias). Expulsion: RBiH 50% Serbs, HRHB/RS 100%. Non-takeover (settlement-level): RBiH Serb 50% gradual; HRHB Serb 100%; RS Bosniaks/Croats 100% immediate. East-Bosnia Bosniak routing prioritizes Srebrenica and Tuzla (then Gorazde). Enclave overrun (Srebrenica/Gorazde/Zepa) applies higher kill fraction than standard displacement. Implementation uses shared `displacement_state_utils.ts` (getOrInitDisplacementState, getMunicipalityIdFromRecord) for displacement_takeover and minority_flight; see IMPLEMENTED_WORK_CONSOLIDATED §23.

### 12.3 Per-OSID census data for displacement depth

Displacement volume per OSID uses actual per-OSID census demographics from `operational_settlements.geojson` rather than municipality-level averages. Each OSID record contains: `population_total`, `population_bosniaks`, `population_serbs`, `population_croats`, `population_others`.

**Hostile share computation:** Per-OSID hostile share maps faction→ethnicity: RBiH = bosniak + other, RS = serb, HRHB = croat (matching `getFactionAlignedPopulation` logic). Cap: 0.95 for per-OSID census data; 0.80 for municipality-level fallback. Graceful fallback: if census data is missing for an OSID, reverts to even-split population (`floor(munPop / osidCount)`) and municipality-level `getDynamicHostileShare`.

**Sustained pool accounting:** After initial maturation fire, `cumulative_displaced` is set to the initial displacement amount (not zero), preventing the sustained displacement pool from double-counting the initial fire.

**Implementation-note (2026-03-01):** Per-OSID census depth calibration. Operational settlements loaded separately in turn pipeline via `loadSettlementGraph()` (OSID-keyed, `op:` prefix validated). Both Branch A (initial maturation) and Branch B (sustained displacement) use per-OSID population and hostile share. n319 result: 668k total displaced (RBiH 458k, HRHB 150k, RS 60k) vs 481k before. Ljubija displacement: 5,331→13,399 (+151%). System complete — see `docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`.

## 13. Recruitment and militarization

Recruitment originates at the settlement level and aggregates upward.

Militia emerge early with low cohesion. Formation of organized brigades requires time, authority, supply, and training.

**Brigade activation at war entry and ongoing turns:** Scenario may set `recruitment_mode` to select how brigades are created. When `recruitment_mode` is `"player_choice"`, brigade activation uses three resources: manpower (from militia pools), recruitment capital, and equipment points. At war entry, the player or bot activates OOB brigades from initial pools; during War-phase turns, pools can accrue deterministically and additional OOB brigades can be activated when eligibility and costs are met (`available_from`, control in home municipality, manpower, capital, equipment). In ongoing War-phase recruitment, implementation may retry both mandatory and elective OOB brigades each turn under deterministic per-faction recruit caps. Equipment accrual is derived from production facilities, local production capacity, and embargo profile, with optional scenario trickles. Capital accrual uses deterministic organizational inputs (militia/pool base, authority, legitimacy, displacement effects) and optional scenario trickles. When `recruitment_mode` is `"auto_oob"` or absent, legacy behavior applies: all OOB slots are created at war entry when `init_formations_oob: true`, then filled from pools. When `recruitment_mode` is `"bottom_up"`, formation growth uses militia emergence and pool population; the turn pipeline runs the bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) **even in war phase** so that scenarios starting in War can still grow formations. Engine Invariants §14.10; implementation: `src/sim/turn_pipeline.ts`. **Calibration note:** The 40-week calibration scenario uses `player_choice` (not bottom_up) because in bottom_up mode RS brigades are 1-per-HQ with no stacking, so spreadBrigadesToFrontOsids does not move them to the front and they generate no attack orders. See docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md. **Implementation-note (deferred start mode 2026-02-17):** with `recruitment_mode: "player_choice"` and scenario flag `no_initial_brigade_formations: true`, initialization creates corps/army_hq only and skips initial brigade activation; brigades are created only by turn-based recruitment from turn 0 onward using the same deterministic Peace → militia emergence → pool population path. Implementation and design: `docs/40_reports/recruitment_system_implementation_report.md`, `docs/40_reports/recruitment_system_design_note.md`; formation design: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10. **Implementation-note (non-normative):** The tactical map provides a player recruitment UI when state has recruitment (toolbar capital, Recruit modal with OOB catalog and Activate flow, desktop IPC apply-recruitment, placement feedback); desktop advance runs accrual without bot recruitment. Spec: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §13.8, §21; report: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §6. **Implementation-note (force calibration 2026-02-15):** April 1992 scenario force levels calibrated via pool scale (POOL_SCALE_FACTOR 55), organizational penetration seeds (party 85, paramilitary 60), mandatory spawn minimum 200, FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), and scenario recruitment resources; see `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §2. **Implementation-note (ongoing recruitment sequencing and RS mobilization 2026-02-16):** In current War-phase pipeline ordering, ongoing recruitment resolves before brigade reinforcement so reinforcement does not consume pool manpower first. RS pending mandatory brigades may receive a deterministic, capped per-turn manpower mobilization top-up in their home municipalities to prevent permanent stalling below the mandatory spawn floor. **Implementation-note (War-phase ongoing mobilization 2026-02-24):** A dedicated pipeline step **ongoing-mobilization** runs before brigade-reinforcement and adds per-turn pool growth from conscription (eligible pop × rate × surge × faction scale × authority), plus shared displacement and RBiH cross-ethnic contributions. Exhaustion caps (e.g. 15% / 25% of eligible pop) limit cumulative mobilization per municipality. Faction-specific initial brigade personnel (e.g. RS 1,200, others 800) and initial cohesion (RS 72, HRHB 62, RBiH 55) are defined in formation constants and applied at OOB creation. RS receives a one-time JNA inheritance pool bonus at scenario init (e.g. ~20K distributed by eligible Serb population). **Implementation-note (org-pen init 2026-02-16):** Initial municipality organizational penetration is seeded deterministically at scenario/new-game initialization and Peace→War uninvested handoff from three factors: (A) municipality controller (mayor-party proxy), (B) faction-aligned 1991 population share threshold, and (C) planned war-start OOB brigade presence (`available_from <= war_start_turn`). This replaces uniform handoff defaults and keeps early militia/pool variance linked to war-start force availability. See `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §12 and `docs/40_reports/implemented/ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md`.

**Implementation-note (paramilitary rear pocket cleanup 2026-03-08 update):** A new `'paramilitary'` FormationKind models autonomous rear pocket cleanup. Small units (PARAMILITARY_UNIT_SIZE=150) spawn when graph analysis detects enemy OSID clusters (1-3 connected same-controller OSIDs where ALL external neighbors are faction-controlled) via BFS cluster detection. Only `op:`-prefixed nodes considered (canonical `S:` nodes filtered out). Scans ALL controlled OSIDs (not just front OSIDs) to find interior pockets. Spawn probability is faction-differentiated (RS=0.85, HRHB=0.55, RBiH=0.30) reflecting historical organizational penetration. Instant capture (PARAMILITARY_MARCH_TURNS=0) — rear pockets are already surrounded; prevents bot brigade AI from racing paramilitaries. Bot corps AI excludes active paramilitary target OSIDs from opportunistic targeting. Capture of undefended targets or heavy casualties against defended ones (3x rate). Casualties use standard KIA/WIA/MIA split (0.30/0.55/0.15). Civilian casualties (PARAMILITARY_CIVILIAN_CASUALTY_RATE=0.02 of avg population) recorded as war crimes against losing faction; `civilian_casualties` object initialized via `??=`. Active weeks 0-20 only (PARAMILITARY_FADE_WEEK); war professionalizes after. Post-week-20: cluster-aware `rear_pocket_consolidation.ts` auto-flips surrounded enemy clusters without defending brigades. Player faction: `paramilitary_policy` ('ask'/'always_allow'/'always_deny') + per-request decisions via `pending_paramilitary_requests`. Bot factions auto-approve. `paramilitary_deployment_count` tracks cumulative deployments for future IVP/legitimacy consequences. Excluded from reinforcement, bot AI, formation spawn. Pipeline: `paramilitary-detect` and `paramilitary-advance` after `partition-corps-front-sectors`. Constants in `formation_constants.ts`. Report: `docs/40_reports/implemented/20260307_PARAMILITARY_SWEEP_FEATURE.md`.

Desertion increases under exhaustion, legitimacy collapse, and command degradation.

## 14. Logistics, supply, and corridors

Supply is traced through settlement graphs and external corridors. Corridors are explicit objects enabling sustainment and movement.

Supply states are **Adequate**, **Strained**, and **Critical**. Degradation reduces combat effectiveness and cohesion.

Corridor states are **Open**, **Brittle**, or **Cut** (Engine Invariants §4). Corridor collapse can produce cascading effects across dependent regions.

**Note:** Treaty-level corridor rights are deprecated. Supply and sustainment are evaluated via reachability and territorial clauses rather than granting special corridor-rights clauses.

### 14.1 Sources

A **supply source** is a settlement (or operational node) from which supply may originate for a faction. Typical sources include faction capital(s), major depots, or scenario-defined supply nodes. Supply resolution (pipeline step **supply-resolution**) computes reachability from these sources; see §14.2. Sources are defined per faction (e.g. `supply_sources` or equivalent in state); when operational (OSID) data is used, supply state may be defined per OSID from constituent canonical SIDs or from “supply at OSID = state at controlling settlement(s)” per implementation. **Implementation-note:** Current pipeline uses canonical settlement graph and `computeSupplyReachability`; OSID-keyed supply state derivation may be added when operational layer is authoritative for supply.

### 14.2 OSID graph tracing and supply state

**Implementation-note (player supply agency, 2026-03-07):** War-phase supply state now exposes limited player-facing agency without breaking deterministic logistics. New state surfaces include `airdrop_allocation` (enclave relief allocation), `pending_convoy_decisions` (allow/block/divert), `smuggling_allocation`, and `sarajevo_tunnel_operational`. These are resolved in `supply_reserves.ts` and integrated in `war_phases.ts`; they affect enclave resilience, supply relief, and international-pressure tradeoffs rather than bypassing the existing supply-state model. The Sarajevo tunnel is modeled as a recurring relief hook, not as a second supply-network system.

**Implementation-note (IVP consequence surface, 2026-03-07):** International visibility pressure now exposes `composite_ivp` as the UI-facing aggregate gauge over Sarajevo, enclave, atrocity, and negotiation pressure. Consequence bands are hysteretic rather than single-threshold toggles, preventing flapping around thresholds while still affecting patron/material support behavior.

**Implementation-note (Phase E municipality support, 2026-03-07):** Deferred player-agency Phase E now ships as a shared `municipality_support_orders` surface with faction-specific effects rather than a universal shipment mechanic. `RBiH` can stage `weapons_shipment` for a one-turn local mobilization boost, `RS` can stage `staff_priority` for a one-turn local reinforcement-rate boost from the existing pool, and `HRHB` can stage `croatian_support_package` for a one-turn local reinforcement cohesion bonus. This remains intentionally local and pool-constrained; it does not rewrite global manpower availability.

### 14.2a Additional war-phase state surfaces

The live player-agency implementation added these persistent war-phase fields to the canonical runtime surface:

- `sector_stance_orders`
- `opsec_sectors`
- `airdrop_allocation`
- `pending_convoy_decisions`
- `smuggling_allocation`
- `sarajevo_tunnel_operational`
- `municipality_support_orders`

These are serialized state, not derived caches. Derived application still happens in the turn pipeline, chiefly through `applySectorStanceOrders()`, sector-intel updates, and supply-reserve resolution.

Reachability is computed over the settlement (or operational) graph: from each faction’s sources, traverse only through nodes controlled by that faction. Result: **reachable_controlled** (supplied) vs **isolated_controlled** (not reachable). Corridor derivation then labels each traversed edge as **Open** (redundant path) or **Brittle** (bridge; single point of failure); edges that are potential links but not traversed are **Cut** (Engine Invariants §4).

**Supply state per settlement (or per OSID):**
- **Critical:** settlement/OSID is isolated (not reachable from sources).
- **Strained:** reachable but at least one corridor on the path is Brittle.
- **Adequate:** reachable and all corridors on the path are Open.

When the operational graph (OSID) is the base layer, “supply at OSID” is the supply state at that OSID—either derived from the state at the controlling settlement(s) for that OSID or from a dedicated OSID-level trace; see War Specification §8 for use in supply pressure (isolation). **Implementation-note (Supply Phases 1–5, 2026-02-24):** OSID supply trace (supply_reachability_osid, deriveSupplyStateByOsid), pipeline step **supply-osid**, supply_state_by_osid in turn report; getSupplyMult in attack_resolution_osid and combat_predictor use supply_state_by_osid when present; bot receives supplyStateByOsid and supplyConnectivityByFaction; querySupplyPaths extended; 3D supply mode; enclave resilience stub; cascade semantics in Engine Invariants §4. See SUPPLY_DESIGN.md, SUPPLY_IMPLEMENTATION_PLAN.md, PROJECT_LEDGER 2026-02-24.

**Implementation-note (Phase A — Supply Reserves, 2026-03-01):** Faction-level supply reserves add a consumption/replenishment layer on top of OSID reachability. Two categories: `general_supply_reserve` and `heavy_munitions_reserve` per faction [0..100]. Three consumption channels: (1) maintenance drain (0.04 per formation per turn, general only), (2) combat expenditure (per-battle deduction scaled by intensity, both pools), (3) siege (Phase B). Production income (from production facilities) replenishes reserves at a 60/40 general/heavy split. **Effective supply state** combines BFS reachability with reserve level via interaction table:

| Reachability \ Reserve | ≥50 | 20–49 | <20 |
|---|---|---|---|
| adequate | adequate | strained | critical |
| strained | strained | strained | critical |
| critical | critical | critical | critical |

Integration: `getSupplyMult()` in `combat_math.ts` uses `getEffectiveSupplyState()` when `supply_reserves_enabled` is true. Pipeline step **compute-supply-reserves** (after supply-osid, before enclave-resilience) runs `updateSupplyReserves()`. Combat expenditure deducted per battle in `attack_resolution_osid.ts`. All behavior gated by scenario flag `supply_reserves_enabled` (enabled by default in `apr1992_definitive_40w`). Constants: `src/state/supply_reserve_constants.ts`. Core module: `src/state/supply_reserves.ts`. See SUPPLY_AMMO_SYSTEM_PLAN.md and `docs/40_reports/implemented/20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md`.

**Implementation-note (Phase B+C — Siege, Replenishment, Enclave Hardening, 2026-03-02):** Phase B adds escalating siege drain per besieged OSID (`siege_turn_counters`, key `${factionId}:${osid}`), patron aid income (from `patron_state.material_support_level`), embargo reduction (multiplicative cap on income from `embargo_profile`), and production facility combat damage (0.05 condition per battle in target municipality). Pipeline step **update-siege-counters** inserted between supply-osid and compute-supply-reserves. Phase C enhances enclave resilience with structured `EnclaveResilienceEntry` (resilience, isolation_turns, hardening_active); hardening defense bonus (+5%) activates after 8+ consecutive isolation turns; enclave-based exhaustion reduction for RBiH (up to 30% at max resilience 30). 25+ calibration constants in `supply_reserve_constants.ts`. All gated by `supply_reserves_enabled`. See `docs/40_reports/implemented/20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md`.

**Implementation-note (Phase D — Supply UX + UN Airdrops + Bot Targeting, 2026-03-03):** Phase D adds three capabilities: (1) **Supply map layer** — map mode 'supply' colors OSIDs by faction supply pressure (adequate ≥80 green, strained 50–79 amber, critical <50 red), derived via `buildSupplyGeoJSON.ts` from `controlBySettlement` + `war_supply_pressure`; (2) **Logistics panel** — `SupplyPanel.tsx` (bottom-left overlay when supply mode active) shows per-faction reserve bars (general + heavy munitions, color-coded ≥50/20-49/<20) and corridor summary (open/strained/cut count); `factionReserves` extracted from `general_supply_reserve` + `heavy_munitions_reserve` in `GameStateAdapter.ts` and exposed on `LoadedGameState`; (3) **UN Airdrops** — deterministic weekly general supply injection to RBiH enclaves with `isolation_turns ≥ AIRDROP_ISOLATION_THRESHOLD` (4 turns); capped at `AIRDROP_MAX_SUPPLY_PER_TURN` (3; was 15, reduced in n159 audit); humanitarian only (no munitions); pipeline function `applyUnAirdrops()` runs after `enclave-resilience`; (4) **Bot supply-aware targeting** — enemy offensive targets sorted by supply state (critical → strained → adequate → unknown) in `bot_corps_ai.ts`. Scenario `apr1992_definitive_40w` enables `supply_reserves_enabled: true` by default. 8 Vitest tests in `tests/supply_airdrop.test.ts`. Calibration: n407 90.5% area-weighted (ATH), 86.7% count-based. See `docs/40_reports/implemented/20260303_SUPPLY_PHASE_D_IMPLEMENTATION.md`.

**Implementation-note (Phase E — Income Balance + Heavy Munitions Differentiation, 2026-03-03; updated n292 2026-03-08):** Phase E1 sets `PATRON_AID_SCALE` to 6 (reduced from 12 in n292 supply embargo rebalance). Faction supply efficiency differentiates aid conversion: RBiH=0.3, RS=0.8, HRHB=0.6 (reflecting logistics infrastructure asymmetry). Per-faction supply caps enforce hard ceilings: RBiH=45, RS=90, HRHB=70 (in `supply_reserve_constants.ts` and `supply_reserves.ts`). RS also receives a one-time `applyJnaInheritanceBonus()` at scenario init: +40 heavy munitions (JNA warehouse captures, April 1992), giving effective starting `heavy_munitions_reserve` of 100. Phase E2 wires heavy munitions into bombardment paths: `getHeavyMunitionsMult(factionId, state)` returns 1.0/0.75/0.5 (adequate/strained/critical) and scales both `getBombardmentCasualtyMult()` and `getArtillerySuppression()`. Sigatures updated to `(attackers, attackerFactionId, state)`; callers in `attack_resolution_osid.ts` and `combat_predictor.ts` updated. Calibration: n409 90.5% area-weighted (ATH maintained). 15 Vitest tests (supply_phase_e1.test.ts: 7, supply_phase_e2_bombardment.test.ts: 8). See `docs/40_reports/implemented/20260303_SUPPLY_PHASE_E_IMPLEMENTATION_REPORT.md`.

### 14.3 Corridors

**Definition:** A corridor is a path or set of edges through which supply flows from sources to controlled territory. Corridors are derived per faction from dependency, capacity, and redundancy (Engine Invariants §4).

**Sustainment:** Open corridors allow full sustainment (Adequate state along the path). Brittle corridors apply continuous penalties every turn; junction loss alone must not collapse a corridor unless dependency thresholds are crossed (Engine Invariants §4).

**Collapse and cascade:** When a critical edge is lost (e.g. control flip), dependent regions may transition from Adequate → Strained → Critical. Full collapse cascade semantics (e.g. Posavina, Route Duck Tuzla–Zenica, Sarajevo over Igman/Bjelasnica) are design intent; see historical pattern reports and BB2 for corridor narratives. **Implementation-note:** Current pipeline derives corridor state (open/brittle/cut) and supply state (adequate/strained/critical); full cascade propagation across dependent regions is not yet fully confirmed (see DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15).

### 14.4 Enclave supply

Enclaves (e.g. Srebrenica, Žepa, Goražde, Bihać) depend on narrow corridors or airlift for supply. Enclave integrity and humanitarian pressure are in §16. Supply state for enclaves is derived by the same reachability rules: if the only path is Cut or lost, the enclave is Critical. Historical pattern reports and BB2 document enclave supply constraints; design may refine enclave-specific rules in line with §16.

### 14.5 Attack resolution (supply_mult)

Combat power in War phase attack resolution (Systems Manual §7.4) uses a **supply_mult** multiplier for both attacker and defender. The intended mapping from supply state to multiplier is:

- **Adequate:** supply_mult = 1.0 (attacker and defender).
- **Strained:** supply_mult = 0.7 (attacker), 0.8 (defender) — per Attack Resolution Formula Spec.
- **Critical:** supply_mult = 0.4 (attacker), 0.5 (defender).

Supply_mult is applied to the formation’s location (or the settlement/OSID where the formation is); it reflects the supply state at that location. See docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md §2.2–2.3 and War Specification §8 (isolation feeds supply pressure; supply state feeds attack resolution when wired). **Implementation-note (supply gating of offensives 2026-03-01):** Supply state also gates offensive behavior: critical → forced defend; strained → victory-only attacks, no pioneer. Corps strip offensives when critical_fraction > 0.5. See §6.5 and docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md.

### 14.6 Defense industry and local production

Local production and war economy (defense industry) contribute to sustainment and equipment per §15; they do not replace corridor-based supply. Production capacity (authority, population, exhaustion, connectivity) and its degradation are defined in **§15. War economy and local production**. Equipment accrual for recruitment uses production facilities, local production capacity, and embargo profile; see §15 for capacity and irreversible degradation under stress.

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

**Implementation-note (Pipeline 2.4–2.5, 2026-02-25):** **Operation Storm:** War Spec §11.3 and design doc docs/30_planning/OPERATION_STORM_DESIGN.md define a conditional late-war intervention when Washington is active and RS threat, exhaustion, and IVP meet thresholds; pipeline step **operation-storm-check** runs after washington-check and sets state.meta.operation_storm_triggered when preconditions are met. **Scoring / evaluation:** Minimal evaluation criteria for end-game and timeout/stalemate are in WAR_TERMINATION_MINIMAL_SPEC §8 (territory vs pre-war, population preserved, exhaustion, treaty terms favorability); War Spec §11.2.4 references that section; exact formula TBD. Report: docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md.

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
**State:** `enclaves` array. **Core rules:** Deterministic detection; integrity weighted composite; humanitarian pressure feeds IVP. **Constraints:** no random collapse. **Per-enclave resilience (n292):** Differentiated `max_resilience` and `growth_mult` per enclave in `enclave_resilience.ts` — Zepa 20/0.7, Gorazde 30/0.9, Srebrenica 25/0.8, Bihac 40/1.1, Sarajevo 45/1.3 — reflecting population, infrastructure, and strategic importance.

#### System 5a: Enclave Resilience Expansion (v0.7)

**Garrison power (n527):** `getEnclaveGarrisonPower()` in `enclave_resilience.ts` represents TDF, Patriotic League, police, and civilian volunteers. Formula: `population × ENCLAVE_GARRISON_MOBILIZATION(0.05) × GARRISON_EFFECTIVENESS(0.15) × resilienceMult`. Added to ALL defense paths (sector, direct, ghost militia) in resolver and predictor. Applies to all 5 known enclaves.

**Resilience scaling (n527):** Scaling increased from `0.005` to `0.02` per resilience point. At resilience 20: 1.40× (was 1.10). At resilience 45: 1.90× (was 1.225). This makes enclave defense meaningful at high resilience values.

**Always-besieged enclaves:** `ALWAYS_BESIEGED_ENCLAVES` list — Sarajevo is forced to `strained` minimum supply status at all times. Resilience builds continuously, never decays. Per-enclave `max_resilience` and `growth_mult` in `ENCLAVE_CONFIG`.

**Sarajevo initial resilience:** `initial_resilience: 20` seeded on first encounter (first turn where Sarajevo is detected as enclave).

**Urban defense (n527):** `getUrbanMult()` returns `2.0×` for Sarajevo OSIDs (was 1.5). `isUrbanOsid()` detects urban terrain. **Urban tank penalty:** `URBAN_TANK_TERRAIN_FLOOR = 1.7` — tanks in urban terrain penalized at mountain-equivalent level (70% reduction) via `getHeavyWeaponsOffensiveMult()`.

### System 6: Sarajevo Exceptions
**State:** `sarajevo_state`. **Core rules:** Siege from connectivity; dual supply model; integrity floor and amplified visibility. **Constraints:** Sarajevo exceptional but not scripted.

### System 7: Negotiation Capital + Territorial Valuation
**State:** `negotiation_state` per faction. **Core rules:** Capital from exhaustion, IVP, patron; "liabilities cheaper" asymmetry; required clauses. **Constraints:** deterministic acceptance. **Acceptance report:** Implementation produces a deterministic `decision` per evaluation (`accept` | `reject` | `counter`). On reject or counter, a deterministic `counter_offer` (id and terms) is produced; repeated rejection yields identical counter id/terms for same state and proposal.

### System 8: OSID location, Corps Sectors, and Frontage (AoR removed, ZoC removed)
**State:** Per-formation **location_osid**; no brigade_aor. **Core rules:** Each brigade has one OSID; frontage capped at BRIGADE_OPERATIONAL_FRONTAGE_CAP=48; control change only via attack resolution or corps/frontline operations. *(ZoC removed 2026-03-02 — zoc.ts, zoc_constrained_movement.ts, tests/linked_zoc.test.ts deleted; GameState fields war_enemy_zoc_by_faction + war_linked_zoc_by_faction removed; pipeline steps zoc-computation + zoc-constrained-movement removed. Replaced by: apply-brigade-movement via brigade_movement_orders.ts; local_front_defense.ts density modifier [THIN_FRONT_THRESHOLD=0.5, MIN_COVERAGE_PENALTY=0.6, DENSE_FRONT_THRESHOLD=1.0, MAX_DENSITY_BONUS=1.25]; OSID-based retreat with no ZoC blocking.)* Front segments derived from war front edges (war_front_edges_osid); brigade_front_assignment links brigades to segments (null = reserve). **Corps Sectors:** Derived each turn via multi-source BFS from corps HQs; partitions front edges into per-corps sectors with sub-segments, density, and threat metrics. Used for bot attack targeting constraint and GUI visualization. Not serialized (derived state). See §2.1, War_Specification_v0_6_0.md §4 and §6, AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md, 20260301_SPATIAL_MODEL_EVOLUTION_AOR_ZOC_CORPS_SECTORS.md.

#### System 8a: Sector Intel (v0.7)

**Implementation-note (elevated to normative v0.7):** Per-sector confidence model replaces the legacy SID-keyed `recon_intelligence.ts` (deleted 2026-03-05). Intel confidence represents how well a faction understands the enemy's disposition in an adjacent sector.

**Confidence model:** Each sector has a confidence value [0, 1] per opposing faction. Confidence decays over time and grows through:
- **Passive observation:** Frontline contact with enemy sectors provides baseline confidence growth.
- **Recon-by-force (probes):** Active probes (see §7.6) grant `result_confidence_gain` to the operation's intel. Counter-probe: defenders gain `COUNTER_PROBE_CONFIDENCE_GAIN = 0.15` intel about the probing force.
- **Battle outcomes:** Engagements reveal enemy strength and composition.

**Bot target weighting:** `getSectorIntelConfidence()` feeds into bot targeting decisions. Low-confidence sectors are deprioritized for full attacks; the intel gate (§7.6.1) may downgrade operations to probes when confidence is below faction-specific thresholds (RS 0.25, RBiH 0.40, HRHB 0.30).

**GUI fog-of-war:** `GameStateAdapter` derives `fogOfWar` from `sector_intel` + `corps_front_sectors`. `buildFogOfWarGeoJSON` renders opacity-graded fog. Toggled via `fogVisible` in `MapContainer`.

**State:** `sector_intel` on `military`. Module: `src/sim/combat/sector_intel.ts`, constants in `sector_intel_constants.ts`.

### System 9: Tactical Doctrines
**State:** extended postures and eligibility flags. **Core rules:** ARBiH INFILTRATE, RS ARTILLERY_COUNTER, HRHB COORDINATED_STRIKE; eligibility per formation per turn. **Constraints:** doctrines respect supply, equipment, exhaustion.

### System 10: Capability Progression
**State:** `capability_profile` per faction. **Core rules:** Deterministic time-indexed curves; Washington Agreement precondition-driven; formation experience. **Implementation-note (early-war flip use):** Implementation may scale flip by capability; tracked as implementation detail. **Implementation-note (formation-aware early-war flip):** Implementation may include formation strength in flip formula; tracked as implementation detail. **Brigade movement and combat:** No separate movement step; pressure–breach–control-flip pipeline.

### System 11: Contested Control Initialization
**State:** `control_status` per municipality/settlement. **Political control semantics:** Per settlement (`political_controllers[sid]`); municipality control derived. **Core rules:** control_status from Peace phase stability (SECURE >= 60, CONTESTED 40-59, HIGHLY_CONTESTED < 40). **Implementation-note (coercion):** Optional per-municipality coercion pressure tracked as implementation scope. **Constraints:** deterministic; precedes War phase.

---

## Appendix A (v0.6): State schema additions

**Implementation-note (Phase 3 Engine & State Refactoring, 2026-03-08):** The monolithic `GameState` was restructured into nested domains (`military`, `political`, `displacement`) to enforce strict boundaries. 
- **Root:** `schema_version`, `meta`, `factions`, `turn_summaries`, `operation_history`, `pending_paramilitary_requests`.
- **`military`:** `formations`, `militia_pools`, `front_segments`, `front_posture`, `front_pressure`, `casualty_ledger`, `corps_command`, `brigade_movement_state`, `municipality_support_orders`, `airdrop_allocation`.
- **`political`:** `political_controllers`, `municipalities`, `war_exhaustion`, `war_alliance_rbih_hrhb`, `rbih_hrhb_state`, `enclave_resilience`, `international_visibility_pressure`, `sarajevo_state`.
- **`displacement`:** `displacement_state`, `civilian_casualties`, `municipality_displacement`, `settlement_displacement`.

All state additions are serializable and deterministic. Derived state remains non-serialized.

**Global state:** `international_visibility_pressure`, `enclaves[]`, `sarajevo_state`

**GameState (brigade operations):** `brigade_posture_orders`, `corps_command`, `army_stance`, `og_orders`, `settlement_holdouts`. Brigade location is per-formation `location_osid`; no brigade_aor, brigade_aor_orders, or brigade_mun_orders.

**Faction state:** `patron_state`, `embargo_profile`, `maintenance_capacity`, `negotiation_state`, `capability_profile`

**Formation state:** `equipment_state`, extended posture fields and eligibility flags; **brigade operations:** `posture`, `corps_id`, `composition`, `disrupted`, **`garrison`** (boolean; parsed from OOB, forces defend posture in bot AI — e.g. 65th Protection Regiment Sarajevo); **`distinction_potential`** (`'tier_1'|'tier_2'|'tier_3'`; reduces decoration-earning thresholds by 30–35% for historically distinguished units — replaces pre-awarded `historical_decorations` at war start; see decoration_evaluator.ts `getDistinctionMult()`); **`decorations`** (BrigadeDecoration[]; earned during the war only — never pre-awarded from OOB). **HRHB cohesion floor (n292):** time-varying via war_timeline (40 until w52, 30 after w52) in `faction_progression.ts`.

**Settlement/Municipality state:** `legitimacy_state`, `control_status`, `coercion_pressure_by_municipality` (implementation extension; non-normative until canonized). No assigned_brigade or brigade_aor; War phase uses location_osid per formation (System 8).

**Not serialized (derived each turn):** brigade pressure, density, resilience modifier, corps_front_sectors (per-corps partition of front edges via multi-source BFS, split by opposing faction and capped at MAX_SECTOR_EDGES=25 / MAX_SECTOR_BRIGADES=8; Territory Voronoi BFS from front edges creates contiguous territory_osids per sector; brigades classified by territory membership — in territory → assigned, outside all sectors → reserve of nearest; exempt corps excluded), local_fronts (sub-segment defensive power and density). **Implementation-note (2026-03-04 brigade discipline):** Brigade AI enforces directive discipline — brigades may only attack OSIDs listed in effectiveDirective.offensive_targets (sole exception: counter-attacks). Combat fatigue: ops.fatigue increments +2 per attacker/+1 per defender battle, cap 30; recovers -1 every 3 turns (FATIGUE_RECOVERY_INTERVAL=3) via applyFatigueRecovery() in update-formation-fatigue pipeline step; recovery gated on NOT front-assigned. Fatigue acts as a combat power modifier: getFatigueMult() applies floor 0.6× for attackers, 0.75× for defenders at max fatigue; +1.5/turn frontline duty accumulation (FRONTLINE_FATIGUE_PER_TURN=1.5; n292 rebalance from 0.5). Peace-phase supply-assignment fatigue inert for war-phase brigades (no assignment field). **Vienna Declaration truce (2026-03-04):** At week 4 (May 1992), the Vienna Declaration event fires (evaluate-events step, src/sim/local_truces.ts) and sets state.vienna_declaration_turn. After that point, bot RS and HRHB corps filter each other's controlled OSIDs from offensive_targets, except Posavina corridor (brod/derventa/odzak/bosanski_samac/orasje) and jajce. Player may still attack across the truce — detected in check-truce-break pipeline step; first violation sets state.truce_broken_turn[faction] and emits a warning event. Opponent bot gains +0.25 aggression for 6 turns after a truce break. State fields: vienna_declaration_turn?, truce_broken_turn?.

For tunable parameter tables (Appendix B), doctrine eligibility and effects (Appendix C), capability progression curves (Appendix D), and stability score calculation (Appendix E), see the full tables in Peace Specification (formerly Phase 0 Spec v0.5.0) §4.5 Stability Score and in archived Systems_Manual_v0_4_0.md; the normative rules above are sufficient for integration.

**Implementation-note (tactical map and desktop app):** The launchable desktop GUI (Electron), tactical map UI (War Status, order arrows, ORDERS/AAR/EVENTS tabs, replay scrubber, advance-turn flow), and main/renderer IPC contract are specified in engineering docs: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `GUI_DESIGN_BLUEPRINT.md`, and `DESKTOP_GUI_IPC_CONTRACT.md`. The **New Game** flow (side picker, fixed April 1992 scenario, optional `meta.player_faction` for which side the human plays) is specified in DESKTOP_GUI_IPC_CONTRACT.md and GUI_DESIGN_BLUEPRINT.md §19.2. The **operational 3D map** (`map_operational_3d.html`) provides formation counter data modes (D-key cycle), two-tier formation counters (brigade light / corps CRT style), stem lines to terrain, read-only IPC queries (movement range/path, combat estimate, supply paths, corps sectors, battle events), polygon movement range and settlement highlight rings, right-side panel stack (Selection with posture/deploy, Orders queue, Battle log, Forces summary), SELECT/ATTACK/MOVE mode toolbar (1/2/3, Escape) using stage-posture-order and stage-attack-order, right-click movement preview, attack-odds preview, fog/recon visualization, F-key map overlays (F1–F4: operations, supply, displacement, command), battle replay markers with skip, and command hierarchy panel with OOB parity — all specified in TACTICAL_MAP_SYSTEM.md and DESKTOP_GUI_IPC_CONTRACT.md. This manual defines simulation mechanics and state; UI behavior and delivery are not specified here. **Map rendering filter:** `corps_asset` and `army_hq` formations are filtered from map GeoJSON — they are organizational concepts, not physical map units.

---

## v0.6 Canon consolidation

This document (v0.6.0) consolidated the Systems and Mechanics Manual for the two-phase (Peace/War) model. All references to Phase 0/I/II as lifecycle replaced with Peace/War. Supersedes Systems_Manual_v0_5_0.md.

## v0.7 Additions

v0.7.0 adds the following normative sections:
- **§6.6 Graz Accords** — RS-HRHB non-aggression pact, corps-pair truces, Kiseljak exclusion, cold fronts.
- **§6.7 Reactive Sector Defense** — Distance-weighted reserve contribution (Layer A) and five sector stances (Layer B).
- **§6.8 Ops-Only Attack Doctrine** — All attacks through CorpsOperation; march-first doctrine.
- **§6.9 Brigade No-Destruction** — Emergency retreat replaces destruction; retreat chain.
- **§7.7 Army HQ Reserve Pool** — Elite brigade loan lifecycle, request priority, force-recall conditions.
- **System 5a: Enclave Resilience Expansion** — Garrison power, increased resilience scaling, always-besieged enclaves, urban defense.
- **System 8a: Sector Intel** — Per-sector confidence model, recon-by-force, bot target weighting, fog-of-war.

Supersedes Systems_Manual_v0_6_0.md. Deprecated docs in docs/_old/10_canon/.

---

*Systems and Mechanics Manual v0.7.0*
*Two-phase (Peace/War) model; v0.4 Systems 1–11, v0.7 combat/defense/intel systems integrated*
