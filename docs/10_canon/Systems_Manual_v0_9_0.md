# A War Without Victory -- Systems and Mechanics Manual v0.9.0

**Last Updated:** 2026-05-10

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

**Shared spatial snapshot.** `SpatialContext` snapshots (`src/sim/spatial_context.ts`) are computed per war turn: pre-combat (after `supply-osid`) and post-combat (after `resolve-attack-orders`, with other steps in between); `reconcile-final-sector-truth` then recomputes the post-combat snapshot and replaces the cached one. Each holds adjacency, shared-boundary adjacency, friendly OSID sets and connected components per faction, and a politically-connected set (own plus allied territory, merged only above the alliance threshold) used for zone-corridor width and besieged-posture. A snapshot is frozen shallowly; treat its Maps and Sets as read-only. Pipeline steps read the snapshot instead of rebuilding adjacency.

### 2.1 Brigade location and Frontage (ZoC removed)

*(ZoC system removed 2026-03-02. zoc.ts, zoc_constrained_movement.ts, and tests/linked_zoc.test.ts deleted. Pipeline steps zoc-computation and zoc-constrained-movement removed. GameState fields war_enemy_zoc_by_faction and war_linked_zoc_by_faction removed. Replaced by: movement via brigade_movement_orders.ts / apply-brigade-movement step; defense gating via local_front_defense.ts density modifier; frontage cap BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 in formation_constants.ts; OSID-based retreat with no ZoC blocking.)*

Brigade deployment in War phase uses **OSID-based location**:

- **Brigade location:** Each brigade has a single **location_osid** (operational settlement ID). Multiple brigades may **stack** on the same OSID. Only **deployed** brigades (movement_state = deployed) participate in combat; brigades in packing / in_transit / unpacking do not fight until deployed.
- **Frontage constraint:** BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 (formation_constants.ts) limits how many brigades can effectively engage per front edge. Local front density modifier (local_front_defense.ts): THIN_FRONT_THRESHOLD=0.5 → MIN_COVERAGE_PENALTY=0.6× defender power; DENSE_FRONT_THRESHOLD=1.0 → MAX_DENSITY_BONUS=1.25× defender power. Control of an OSID **changes only via attack resolution or corps/frontline operations**—no passive pressure flip.
- **Front segment layer:** Hostile boundary edges between OSIDs (opposing political_controller) are grouped into contiguous assignable segments (`assignable_front_segments`) with stable IDs, length, optional name, and theatre linkage. Brigades are linked to front segments via `brigade_front_assignment`; `null` means reserve.
- **Normative clarification (2026-04-03):** `assignable_front_segments` and `brigade_front_assignment` are now compatibility-era frontline fields. They may survive in raw state, fallback logic, and historical reports, but they are not the canonical player-shell or frontline-authority model once corps sectors exist.
- **Corps Sectors (materialized standing-OG snapshot):** Each turn, front edges are partitioned into **Corps Sectors** via multi-source BFS from corps HQs through friendly-controlled territory. Each sector contains sub-segments (connected components of front edges), territory_osids (full geographic depth via Territory Voronoi BFS), assigned/reserve brigade lists, density, a sector pressure index (`threat_ratio`), and defensive power. The pressure index is not a force ratio: it divides the enemy personnel facing the whole sector by own defensive power per front edge, so it rises as own cohesion or own men fall, and with sector length (enemy personnel on the whole sector divided by own cohesion-weighted power per edge; 9999 when nothing defends a faced sector). Its readers' thresholds are tuned to that scale, which is kept as final (2026-11-16). *(Amended 2026-11-16: corrects the direction stated by the 2026-11-16 pressure-index description, which said the index falls with own cohesion; falling cohesion lowers own defensive power and so raises the index. Codex review comment r4588239176 on #745; verified against `local_front_defense.ts:43-48` and `brigade_assignment.ts:2561`. Wording only, no behaviour change.)* A system that needs a real force ratio divides enemy personnel by own effective personnel. The partition is recomputed at turn boundaries, then `corps_front_sectors` and the corresponding formation sector/sub-segment assignments are serialized as the materialized current-turn standing order of grouping. They are not rebuilt merely because a save is loaded: rebuilding can relocate brigades and therefore is a gameplay mutation. This persistence exception gives the Desk, command queries, fog, and map exact zero-turn continuity. Five disposable caches remain derived/transient: `active_offensives_against_corps`, `home_distance_cache`, `militia_garrison`, `sector_combat_ratings`, and `unresolved_sector_brigades`. `sector_intel` is also persisted because it contains cross-turn belief memory. Bot AI uses sectors to constrain attack targeting to geographically adjacent OSIDs. See `corps_front_sectors.ts`. **Multi-sector promotion (2026-03-01):** Sub-segments with ≥ MIN_SECTOR_EDGES (5) edges become independent sectors; smaller sub-segments merge into the nearest qualifying sector via OSID-hop BFS. **Territory Voronoi (2026-03-07):** After sector construction, `assignTerritoryVoronoi()` runs multi-source BFS from each sector's front-edge friendly OSIDs backward through friendly territory, creating contiguous `territory_osids` per sector. `classifyBrigadesByTerritory()` then applies three-tier classification: **front** (on sub_segments.friendly_osids), **reserve** (1 hop behind front), **deep rear** (BFS to nearest own-corps sector front; assigned but column-marched to sector). A territory pass (Phase 1.5) runs between front-line assignment and the pooled-brigade distribution: a pooled brigade whose `location_osid` lies in a same-corps sector's `territory_osids`, in the same friendly component and within 30 hops of that sector's front, is assigned to that sector; other brigades stay pooled. When several qualifying sectors remain, the one with the largest edge deficit (front length minus brigades already assigned) wins and ties go to the smaller sector id; corps and brigades are processed in sorted order, so the result is deterministic. In practice ~97% of assigned brigades are physically on the front line. Brigades in friendly territory but outside all sectors → reserve of nearest sector. **Final authority rebuild (updated 2026-08-23):** after late war-phase brigade/location writers and final `rederive-osid-front-segments`, the pipeline reruns final sector truth reconciliation so `corps_front_sectors`, transient `unresolved_sector_brigades`, and `sector_combat_ratings` match the final front-edge snapshot. A subsequent narrow pass may reissue the normal deterministic deployment order only for active, unassigned live elite loans named by that finalized unresolved list; final distribution and the kinded assignment seal run afterward. This prevents final topology from leaving a loan without movement ownership until the next turn. Because `unresolved_sector_brigades` is deliberately not serialized, final-save-only validators must report its completeness as NOT ESTABLISHED; live per-turn seals establish it. Sector ID format: `sector:{corps_id}:{index}`. CorpsDirective may include `sector_targets?: Record<string, string[]>` for per-sector offensive targets. GUI renders corps-colored sector boundaries with click-to-inspect detail panels.
- **Normative clarification (2026-04-03):** Corps sectors are the canonical frontline spatial truth for current engine and shell work. Bot AI, frontline density/fatigue logic, map drilldown, and command-side review should prefer sectors whenever they exist.
- **Physical versus command location:** `location_osid` is the only physical/combat/render location for a brigade. `hq_osid`, corps membership, parent assignment, and other command anchors provide hierarchy or navigation context only. Active combat brigades require a valid faction-controlled `location_osid`; non-spatial army-HQ and corps-asset rows may omit one.

**Removed from normative text:** brigade_aor, brigade_mun_orders, brigade_aor_orders, and front-active settlement assignment as the primary model. Control stability: rear OSIDs (not the target of attack resolution) remain under faction control; control change only via attack resolution or corps ops. **Implementation-notes** that reference existing AoR/municipality reports remain non-normative where they describe legacy or transition behavior; see docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md and 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md for the OSID/ZoC/attack-resolution design.

**Front assignment (War phase):** `brigade_front_assignment: Record<FormationId, FrontId | null>`. Reserve brigades do not execute attack/posture/movement until assigned.
**Normative clarification (2026-04-03):** `brigade_front_assignment` survives mainly as fallback/repair lineage for older saves and selected compatibility calculations. It is no longer the primary player-facing assignment model once sectors exist.

**Theatres:** `theatres` and `army_theatre_assignment`. Segment `theatre_id` on `assignable_front_segments` for Theatre -> Army -> Corps -> Brigade hierarchy.
**Normative clarification (2026-04-03):** `theatres` and `army_theatre_assignment` are compatibility lineage, not the live player-shell ownership model for current Warroom / Tactical Map / Army HQ work unless a future roadmap lane explicitly revives them.

Corps and Operational Groups do not own OSIDs; they operate as command layers and coordination overlays only. Corps Sectors are a materialized spatial command partition for targeting and density reference, not an ownership claim.

### 2.2 Political control (pre-front substrate)

Political control represents the exercise of recognized authority over a settlement independent of military presence. It exists prior to the formation of fronts and persists behind them.

Each settlement has a **political controller** defined as the faction that currently exercises accepted authority over that settlement. Political control is distinct from brigade presence, Areas of Responsibility, fronts, and pressure application.

**Initialization:** At game start, political control is initialized deterministically before any fronts or military interactions exist. Each municipality has a default political controller representing pre-war institutional authority. All settlements inherit their municipality's political controller unless explicitly overridden. Implementation-note: Scenario may set `init_control_mode` to *institutional* (default), *ethnic_1991* (1991 census majority per settlement), or *hybrid_1992* (institutional + ethnic overrides).

Settlement-level overrides may occur only if all conditions are met: overwhelming demographic dominance by a single faction, geographic or administrative separation from municipal centers, and historically weak or absent municipal reach. Overrides are rare, deterministic, precomputed, and fixed at initialization.

A settlement may initialize with political_controller = null only if no faction plausibly exercises authority, institutional collapse is immediate, and the situation is historically plausible.

**Stability:** Political control is stable by default. Political control does not change due to absence of brigade presence, lack of supply, demographic composition, or time passing.

**Change mechanisms:** Political control may change only through: (1) **attack resolution** (War phase: attack order → push-back/control flip at target OSID) or **corps/frontline operations** as defined, (2) internal authority collapse or fragmentation, or (3) negotiated transfer through end-state or interim agreements. There is no passive pressure flip.

**Implementation-note (2026-02-13 canonical runtime path):** Harness scenarios use a battle-driven control path: control changes occur via War-phase attack-order resolution after deterministic initialization. **Implementation-note (2026-02-16 April 1992 init):** Canonical historical Apr-1992 war-start scenarios use `init_control_mode: "hybrid_1992"` with `init_control: "apr1992"` (curated municipal controller file). The legacy `sep_1991` scenario (and `ethnic_1991` init mode for 1992 starts) was decommissioned in v0.7.0 in favor of the definitive April 1992 baseline. Early-war territorial asymmetry is modeled through deterministic War-phase pressure calibration.

## 3. Early-war and pre-frontline phase

The simulation begins before coherent frontlines exist. Authority and control shift through coercion, presence, and legitimacy rather than direct combat.

Municipal authority gradients determine initial compliance. Armed presence without contact may alter control. JNA formations begin with high coercive capacity but declining legitimacy, while emerging forces rely on local authority and militia.

Transition to the frontline phase occurs once sustained opposing deployments create continuous contact.

War phase uses **location_osid** only (no AoR). All canonical scenarios start directly in **war** (April 1992). Early-war mechanics (militia emergence, JNA dissolution, pool population) run as pipeline steps during the first ~12 weeks.

The `jna_withdrawal_1992` event's `jna_withdrawn` flag is authoritative terminal truth for `military.war_jna`: transition begun, withdrawal progress complete, and VRS asset transfer complete. Temporary synthetic JNA command formations remain active only while a spawned subordinate remains; after the last subordinate withdraws, the command is retained as inactive/withdrawn state and omitted from live command presentation, while completed operation AAR history remains available.

## 4. Military formations

All coercive force is represented through formations. Types include militia, Territorial Defense units, brigades, Operational Groups, and corps-level assets.

Formations have attributes: manpower, cohesion, **morale**, readiness state, supply state, experience, exhaustion contribution, **location_osid** (War phase; one OSID per formation), and **officer_quality** (per-brigade command effectiveness [0.05, 0.90]; see §7.5).

**Morale** (`morale: number`, [0,100]) represents willingness to fight, distinct from cohesion (tactical effectiveness). Morale is non-monotonic (can increase and decrease). Population affinity from 1991 census drives morale drift: defending own-majority OSID increases morale; defending enemy-majority OSID decreases it. Encirclement of own-population defenders causes morale spike (not collapse). High morale gates retreat: defenders with morale at or above their faction's resist floor absorb costly_victory outcomes without retreating, taking casualties but holding position. Per-faction resist floors: RBiH=50, RS=55, HRHB=60 (via `getMoraleResistFloor(faction)` in `combat_math.ts`). See Engine Invariants §14.3a.

**Battle outcome morale drift (n618):** Recent battle outcomes modify morale via `BATTLE_MORALE_DRIFT` in `morale_drift.ts` (decisive +5, victory +3, costly +1, stalemate 0, repulsed -2, catastrophic -4). Two modifiers apply: (1) **Habituation** — `1/(1 + battle_outcome_count × 0.03)` diminishes effect with combat experience (62% at 20 battles, 45% at 40). Tracked per formation via `battle_outcome_count`. (2) **Faction sensitivity** — victories: RS 0.8×, RBiH 1.3×, HRHB 1.0×; defeats: RS 1.3×, RBiH 0.7×, HRHB 1.0×. VRS expects to win (victories mundane, defeats shocking); ARBiH expects to suffer (defeats absorbed, victories electrifying). Separate immediate morale shock exists in `attack_resolution_osid.ts` (e.g. decisive +3 attacker, catastrophic -10 attacker).

## 5. Formation lifecycle and readiness

Formations progress through readiness states: Forming, Active, Overextended, and Degraded.

**Implementation-note (formation activation grace period):** Brigades that remain in Forming for at least BRIGADE_FORMATION_MAX_WAIT turns (e.g. 6) auto-activate regardless of supply or authority gates, so supply-gate cannot permanently block activation. Implementation: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §6.

The engine resolves brigade **location_osid** and orders from corps-CO directives; the president commands through the army/corps chain (command-shell review/approval flows), not direct brigade orders. Compatibility-era front-segment assignment may still survive under the hood for fallback logic, but it is no longer the primary player-facing command model.

Operational Groups may be formed temporarily and dissolve automatically under cohesion loss or command degradation. This models ad-hoc wartime organization without allowing permanent force inflation.

## 6. Deployment and fronts

Players command brigades by **location_osid** (one OSID per brigade; stacking allowed), sector-oriented staging, and commander-reviewed order flows. Movement is along the operational contact graph via brigade_movement_orders.ts (apply-brigade-movement step). *(ZoC-constrained movement removed 2026-03-02.)* Fronts emerge where adjacent OSIDs have opposing control or opposing brigades. `front_edges` remains the shared hostile-boundary substrate; `assignable_front_segments` and `brigade_front_assignment` are compatibility-era fields rather than the primary live shell language.

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

Each brigade maintains a posture state set by its commanders, derived from the corps and OG stance; brigade posture is never put to the president (amended 2026-11-12; corps/OG stance under the autonomy-dependent matter model, §6.4 and Engine Invariants §14.10c). Posture modifies **attacker and defender combat power** in the attack-resolution formula (see §7.4). Posture does not override supply state, cohesion, or command coherence.

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

**Standing OG morale-floor note (2026-06-03):** Fixed-home brigades assigned as same-corps Standing OG front holders can receive the existing faction home morale floor for morale drift only when their `home_osid` remains inside same-corps sector territory. This does **not** set `home_defense_active`, does not block attack/assault posture, and does not alter movement, operation membership, or assignment.

**HVO local-contact assignment note (2026-09-02):** A combat-ready HVO brigade with `placement:fixed_home_osid` is assigned first to its own friendly-held home OSID when that OSID lies on a contacted subsegment and an active opposing operation currently names it as an objective. This is a deterministic local-defense assignment preference only: it neither locks political control nor changes combat strength, movement authority, operation membership, or attack resolution. Quiet positions and other factions retain the ordinary widest-front assignment order.

### 6.2 Entrenchment

**Entrenchment** is accumulated by brigades that remain on the same OSID without moving. Each turn without movement increments **entrenchment_turns** (capped at MAX_ENTRENCHMENT = 6). **entrenchment_mult** uses a sqrt diminishing-returns curve with an effective cap: `1.0 + sqrt(min(ENTRENCHMENT_EFFECTIVE_CAP_TURNS, entrenchment_turns)) * ENTRENCHMENT_PER_TURN * 2 * suppressionFactor` with ENTRENCHMENT_PER_TURN = 0.035. **ENTRENCHMENT_EFFECTIVE_CAP_TURNS = 26** — the entrenchment bonus stops growing after 26 turns, modeling complacency and diminishing returns from static positions. At 1 turn: +0.07 bonus. At 6 turns: +0.171. At 26 turns: +0.357 (maximum). Entrenchment **resets to 0** when the brigade moves to a different OSID. **Degrade by 1** when the brigade is disrupted (instead of full reset). **State:** entrenchment_turns per brigade; serialized. Only deployed brigades on an OSID accrue entrenchment. **Implementation-note (Pipeline 2.3, 2026-02-25):** At War start (or scenario init in war), scenario parameter **war_entrenchment_init_turns** (legacy name: phase_ii_entrenchment_init_turns) (0..6) may set initial entrenchment for all brigades; stuck-in-Peace fallback (force transition after N turns) per War Spec §6 and docs/30_planning/PHASE_I_II_EDGE_CASES.md; report docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md.

### 6.2.1 Movement states (Column / Combat)

**movement_state:** deployed | packing | in_transit | unpacking. Only **deployed** brigades participate in combat. **Combat movement:** fixed-rate (e.g. 3 OSIDs per turn when deployed). **Column movement:** packing / in_transit / unpacking; composition-dependent rate (heavy mech >5% tanks+arty = 2 budget/turn, light infantry <1.5% = 4, mixed = 3); terrain-weighted edge costs (road quality 0.6×–1.0×, slope +0.8×, friction +0.6×, river +0.5, uphill +elevation/500). **Transit lifecycle:** order with stance 'column' → pathfinding through friendly OSIDs (Dijkstra) → in_transit with path and turns_remaining → on arrival set location_osid, clear movement state, reset entrenchment. **Note:** stance='column' must be set on merged movement orders; omitting it silently drops column marches (bug fix 2026-03-08). *(ZoC-constrained path validity removed 2026-03-02; path validity is friendly-OSID-only, no ZoC check.)* **State:** movement_state per formation; brigade_movement_orders for staged orders. **Implementation-note (2026-02-23):** osid_column_movement.ts implements terrain-weighted costs and getOsidColumnRate; processOsidColumnMovement two-pass (advance existing transits, then process new column orders). Pipeline: osid-column-movement runs before apply-brigade-movement (brigade_movement_orders.ts). *(zoc-constrained-movement step removed n344.)*

### 6.3 Operational Groups (OSID model)

The OSID model uses two related command forms. A corps sector is the **standing-OG spatial assignment entity** for a defensive front; it has **no political-control meaning** and does not own territory. Political control remains OSID state. Temporary donor-backed Tactical Groups are the offensive specialization: they have an operational location/scope, coordinate participating brigades, and dissolve through the operation lifecycle. *(ZoC removed 2026-03-02 — neither form projects ZoC.)*

**Standing-OG live contract:** ADR-0007 Phase B commits **at most one eligible reserve or rear formation per threatened-sector distribution pass**. An **active-operation** participant, a **disrupted** formation, a formation **in transit**, or a formation with an **existing movement order** is ineligible. Standing-OG **membership alone does not make a formation a reactive defender**. **Actual combat-resolver contributors** receive only the immediate effects assigned by that path: **defender casualties are weighted across those contributors**, while any **contributor-specific immediate fatigue remains on its named recipient**. The separate **post-battle defender-fatigue write and downstream aftermath remain primarily on the primary defender**.

**Friendly-only distance:** `bfsDistance` takes an optional friendly-OSID set and does not path through enemy territory. Brigade front distribution, sub-segment assignment, march correction and tactical-group selection pass the faction's friendly set. Search depth is capped at 20 hops. Some callers pass a corps-scoped subset of the friendly set.

**Temporary TG activation:** borrow personnel from eligible donor brigades under the accepted operation policy. **Lifecycle:** the owning corps operation remains the clock; dissolution/finalization returns surviving personnel and records participation. **State:** `tactical_groups` plus corps-operation and participation receipts. Legacy formation `kind: 'og'` is compatibility-only, not the live creation path.

### 6.4 Corps command and army stance (OSID model)

**Implementation-note (Claude-API persona-roleplay QA mode pointer, updated 2026-05-10):** The 6-verb canonical army-stance interface (`HOLD_AT_ALL_COSTS`, `PRESS_OFFENSIVE`, `MAINTAIN_CORRIDOR`, `PREPARE_RESERVE`, `HONOR_TRUCE`, `BALANCE_FRONTS`) is unchanged by the Claude-API persona-roleplay QA mode. Persona output (16-verb president intent etc.) is canonicalized via `tools/claude_plays_vrs/president_directive_bridge.ts` and its `PRESIDENT_TO_CANONICAL_DIRECTIVE` table before reaching corps-CO briefings; optional directive metadata (`target_corps_id`, `magnitude`, `permission_flags`) may be carried through the political -> army -> corps chain as intent clarification, but it does not expand the canonical verb vocabulary. The harness is opt-in, env-flag-gated, default-OFF byte-stable, and telemetry-only. Full spec lives in §7.9 and is authoritative in `docs/10_canon/FORAWWV.md` §XII.

**Implementation-note (player agency plan A-H, 2026-03-07; authored execution quality 2026-08-31):** Live corps-operation shaping now extends beyond the original sector-offensive minimum. `CorpsOperation` can persist player-selected `min_attack_outcome`, `tempo`, `schwerpunkt_osid`, `artillery_preparation`, `artillery_preparation_consumed`, `force_launch`, `dig_in_on_halt`, deception types (`feint`, `probe`), and `commander_officer_id` (named officer commanding the operation — see §7.5 Operation commander) in addition to the sector/objective fields below. An authored operation may also persist `execution_attack_power_mult`, clamped to `[0.5, 2.0]` and defaulting to `1.0`; prediction and resolution apply it per participating formation and only while that formation's operation is executing. This prevents mixed stacks from lending exceptional operation quality to unrelated attackers. It represents exceptional operation-level execution quality and never writes control directly. Execution behavior now includes early-launch cohesion penalty when forced before readiness, a first-turn artillery-preparation shock bonus, extra cohesion burn for `all_out` tempo, manual halt into recovery, optional dig-in on halt, probe-driven intel reveal, feint self-termination after limited execution, and immediate collapse of zero-eligibility idle execution shells into recovery so they do not register as invalid combat samples. Sector-level defensive intent also exists above brigades as `sector_stance_orders`; `applySectorStanceOrders()` translates those into standard brigade posture orders during the pipeline instead of mutating brigade state directly in UI or IPC.

**Presidential stance holds (posture model option 2, 2026-11-12).** For a live president at autonomy 2, a player-army corps stance change (or an OG moving into or out of Active Defense) made in the bot pass is reported as a stance matter. A Confirm, or no answer, changes nothing. A Countermand or Constrain is resolved by `resolve-stance-matters` before the next bot pass into a hold for four turns from its effective-from turn: the previous stance (countermand) or a ceiling (constrain: balanced or defensive for a corps; no Active Defense, or fortify/defend/screening only, for an OG, intersected with the corps-allowed sector stances). The hold is clamped after `generateCorpsStanceOrders`, after the bilateral-war reassignment and at the end of the faction pass, so it is the last writer; under a hold at defensive or below, a commander plan still concentrating is suspended instead of becoming ready (a ready plan launches its operation in the same pass), while operations already running continue; `getEffectiveCorpsStance` is capped by it; it never overrides `reorganize`; the HRHB patron directive ceiling caps it; an OG hold yields to a live operation in that OG; the president's own operation order ends it. A delayed overrule is recorded at resolution as an order with the Main Staff, naming the stance in force and the date it takes effect; a `hold_in_force` receipt is written only when it does take effect, and a hold that lapses first is recorded as dropped before it took effect. Main Staff delay: faction friction weight × the serving army commander's stubbornness (≥ 4 one turn, ≥ 5 two turns, never more). Overrule cost: an entry in the commander's `recent_overrides` (not the cowing count), an eight-turn Confirm-only window for that corps, and for HRHB under a directive a `patron_confidence` shift. Code: `src/sim/combat/stance_matters.ts`, `stance_matter_holds.ts`.

**Readiness gate (N1297, amended RF-AI2 2026-11-14).** The formula reads the previous turn's commander force assessment. A corps with a `main_effort` brigade (motorized or mechanized, offensively fit) is not capped. A corps without one, but with a **light strike group** (at least 3 combat-effective, non-disrupted, not-on-loan brigades of any equipment class with `fitness_offense >= 0.4`, all in one zone; `force_eval.hasLightStrikeGroup`), is capped at `balanced`: it may plan a local main effort but takes no corps-wide offensive posture, and the faction-wide offensive biases (RS early war, RBiH counteroffensive) do not lift it. A corps with neither is capped at `defensive` and starts no new commander plan. Authored, triggered and Army HQ operations still launch, the commander's probe and local-occupation paths do not read the stance, and the RS corridor override may still lift the corps to `balanced`. Before RF-AI2 only the `main_effort` test existed, which capped the ARBiH 5th Corps for the whole war and VRS corps whose brigades are classed mountain. Light corps attacked with infantry assault groupings (5th Corps: BB1 p.393, p.415; BB2 pp.527, 536); no artillery threshold is used, because firepower is already priced in combat.

**Bot objective lockout (RF-AI2 2026-11-14).** A bot commander-planned operation (`buildCommanderOperation`) that ends `zero_eligible_axis` or `max_failures` puts each unfinished objective on the corps' `failed_offensive_objectives` cooldown at once, for `OBJECTIVE_FAILURE_COOLDOWN_TURNS × failure_count` turns, so each repeated failure pushes the next try further out. `failure_count` is shared by every operation kind on that objective and never decays, so earlier authored failures there lengthen the lockout too. A later failure never shortens a lockout already in force. The bot plan path honours the cooldown, as the commander's local-occupation and probe paths already did. Authored, triggered, pre-planned and Army HQ operations never read the table, and their own failures still use the two-failure, 8-turn rule.

**Corps threat ratio reads the OSID graph (RF-F1g 2026-11-15).** The corps stance formula and the player-faction stance recommendations take a local threat ratio (`computeSectorThreat`): enemy personnel on the corps' brigade OSIDs and their neighbours, over the corps' own personnel on its OSIDs. Allied brigades (RBiH-HRHB while allied) count for neither side. Neighbours come from the OSID contact graph (`od.edges`, the same graph preCombat spatial adjacency is built from). Before this the war step passed the settlement (S-id) edges, which never match an OSID, so the ratio was 0 for every corps. The thresholds are unchanged (defensive above 1.5, offensive below 0.7). Measured effect today is one corps-week: HVO Northwest Bosnia goes defensive in week 1, and the 188-week final state is unchanged. The readiness gate, faction rules, doctrine and campaign plan otherwise set the same final stance. (The emergency defensive operation that once followed at threat 2.0 is retired; see below.)

**Corridor-breach pass retired (RF-corridor-breach 2026-11-15).** The bot corps pass no longer has a corridor-breach step. It read OSID-keyed control through an S-id settlement-to-municipality map, so it never found a target. With the keys fixed it would have built a hollow operation with no objectives, taken a corps' strongest brigades without garrison or queue guards, and forced the corps offensive over the faction rules. That would have sent the Herzegovina HVO corps, which rule E3 holds defensive, against allied ARBiH Mostar from mid-1992. `corridor_municipalities` is the territory a faction defends; it is not a list of breach targets. Corridor fights are authored operations (Corridor 92), and the commander loop plans opportunities. Do not revive the pass.

**Emergency defensive operation retired (RF-emergency-defense 2026-11-15).** The bot corps pass no longer creates an emergency defensive operation. It was meant to follow a defensive corps at threat 2.0 or more, but on main's 188-week run it never fired: 166 corps-turns met the threat, and none had two brigades at 70% of the 3,000 cap with cohesion 50. Had it fired, its operation had no axes, objectives or staging point, so no tactical group formed and it made no attacks. It froze the corps' four strongest brigades for about seven turns (no sector reassignment, no march back to the front, no reserve hold), gave a recovery defence penalty (x0.9) and +15 corps exhaustion, and blocked the commander loop. Its targets were any OSID not held by the corps' own faction, so HVO Northwest Bosnia (70 of the 166 turns) would have listed allied ARBiH ground. A threatened corps was worse defended with it than without. The defensive stance (x1.2 defence) is the reaction. `CorpsOperation.is_emergency` and the `limited` donor policy remain so older saves load; such an operation walks the normal strategic-defence lifecycle and is removed. A real emergency defence (committing reserves, a local counterattack) is a post-1.0 design item. Do not revive the old operation.

**Pre-planned operations have one launcher (RF-L3d 2026-11-15).** Authored pre-planned operations are launched only by the pre-planned launcher (`inject-queued-operations`), with their own rosters, axes, timing and, for the player, `HISTORICAL_OP:*` authorization. The corps commander never adopts a queued operation as its own plan, and a waiting queue raises no commander intent (`stage_operation` is never generated). The commander plans for that corps exactly as for a corps with an empty queue, except that brigades rostered by the due queue head (`getHeadQueuedPrePlannedBrigadeIds`: the head's axis brigades once its `enqueue_from`/`available_from` has passed) never join a commander plan or its operation. Probes and local occupation already applied that rule. Before this, the commander read the queued operation names as definitions, adopted a target-less plan that emitted no operation, and so a corps with a queued operation made no opportunity plan while the queue waited.

**A short queue head steps aside only for an admissible operation (PK5 2026-11-16).** A corps' queued pre-planned operations run one at a time in slot 0. When the head is due but short this turn, because no axis builds or fewer than its minimum viable participants remain, the launcher checks the operations behind it in queue order. The first one that would launch now, carries its own `available_from`, and shares no brigade with the head moves to the front and launches. The short head keeps its place directly behind it and is retried when the slot frees. An undated operation never goes ahead: its place in the chain is the plan (the 1KK Corridor, Jajce, Donji Vakuf order; moving Donji Vakuf up once stalled it 23 turns, blocked Corridor and cascaded). An operation that draws on the head's roster never goes ahead either, because it would wear down the brigades the head waits for. The check is read-only and passes the same gates as a real launch: not resolved, `available_from` passed, no probe or feint overlap, at least one axis not already claimed by an active operation, objectives not already all held, no blocking validation warning, a pending or declined player authorization counts as not admissible, an axis builds, and the minimum viable participants are met. If none qualifies, the queue waits as before. The step-aside is atomic. It writes an `op_injection_warnings` row (`check: 'queue_head_skipped'`) naming the head, the reason and the promoted operation only when the promoted operation launches; otherwise the queue order is restored. A pre-planned operation has no window end, so no head is dropped for lateness, and the step-aside never removes an operation from the queue. On main's historical and emergent 188-week runs no step-aside fires (both byte-identical); it guards a stall the queue could otherwise hold indefinitely.

**Corps reorganisation (RF-1 Phase B, 2026-11-15).** Dated corps reorganisations are data in `data/source/formation_lifecycle_events.json` (key `corps_reorganisation`). The `apply-corps-reorganisation` step applies them each war turn, right after `activate-corps` and before the corps front sectors are partitioned (`src/sim/corps_reorganisation.ts`). There are three event types. `corps_transfer` moves the listed brigades to a target corps from its trigger turn. It is standing: a listed brigade that appears later is moved when it appears. A brigade committed to a live operation finishes it first, for at most `max_defer_turns` (default 4), and is then released through the brigade-dissolution path. An optional `transition` cost (cohesion loss, `disrupted_turns`) is paid only by brigades that change corps inside the window `trigger_turn .. trigger_turn + max_defer_turns`. `corps_retire` hands a corps' brigades to a successor and switches the corps off. `commander_handover` seats a named officer in a corps once (see §7.5 Succession). A corps marked `strict_available_from` in `data/source/oob_corps.json` is never created before its `available_from` turn, not even at scenario start; `activate-corps` creates it on that turn; the war-step creation has no HQ-presence check (`war_phases.ts`, `early_war_phases.ts`). Reorganisation moves command only. It writes no control and launches no attack.

The ARBiH 7th Corps (Travnik) is the first live use. It forms at week 99 (26 February 1994) under Mehmed Alagić (per the ICTY indictment, IT-01-47 Case Information Sheet p.4; BB1 p.380; BB2 pp.468, 493). Twelve brigades transfer from the 3rd Corps that week: the 17th, 705th, 706th, 707th, 708th, 712th, 717th, 725th, 727th, 733rd, 737th and 770th. The transition cost is cohesion -4 and `disrupted_turns` 2. (In the measured April 1992 run the 706th is destroyed at t31, so 11 move.) The 7th Corps hosts Vlašić Ridge, the Paklarevo model, Donji Vakuf 95, Jajce 95 / Jajce Recovery and the COHA Vlašić exception. On Vlašić Ridge the 7th Muslim, 303rd and 314th stay in the 3rd Corps on a Zenica support axis. The RBiH army priority "Central Corridor Offensive" splits at week 99 (`bot_strategy.ts`): the 3rd Corps keeps Zenica, Kakanj, Visoko and Fojnica, and the 7th Corps takes Travnik, Bugojno and Gornji Vakuf ("Lasva-Vrbas Offensive", same weight and minimum outcome). The 6th Corps stays folded into the 4th and 1st Corps. An old save loaded after week 99 applies these steps on its first loaded turn. Past the window it pays no transition cost, and brigades still committed to a 3rd Corps operation are pulled out of it at once. This is a recorded limitation for pre-1.0 beta saves.

**Backing prices (command loop L6, owner decision 1, 2026-11-14).** Backing a general's offensive costs command authority: accepting an `APPROVE_OP:*` corps operation costs `BACK_CORPS_OPERATION_COST` (10); accepting a `HISTORICAL_OP:*` authorization or an `OPPORTUNITY:*` campaign, or answering a catalog opportunity with approve, redirect or under-resource, costs `BACK_CAMPAIGN_COST` (20). Authored historical operations are at present created already accepted under standing authorization (`ensureHistoricalOperationAuthorizationReview`, owner 2026-08-31), so their price is charged only on a review that actually reaches the president unanswered. Withholding, declining, delaying and stance matters are free. The prices live in `src/ui/map/utils/commandAuthority.ts` and `src/desktop/autonomy_ipc_contract.cjs` (parity-tested), and the debit runs only in the desktop `accept-proposal` and `resolve-operation-opportunity-decision` handlers, which refuse the answer and leave the account untouched when the balance cannot cover it. Income is unchanged; an ordinary approval sets no `was_force_launched` and so never counts as an intervention against income, and success refunds nothing (territorial gain is not an income source). The live recovery step (`recover-command-authority`, `isLivePresident` only) records the week's income and its parts in `command_authority.last_recovery_breakdown`, so the Desk and the directive price line can show next week's income with its sources. Headless and bot factions never debit and never carry the breakdown; their artifacts are byte-identical.

**What Authority is for (ratified 2026-11-15, Fable consult 1; L7 #670).** Authority is the price of overruling the army: author, stop, request, elite and replace (25), force over a no-go (15 on a pending plan, 25 proactive), Insist in an army clash (15, §6.5), and backing (10 or 20). The presidential gestures (front visit, address to the nation, decoration, strategic posture review; 20 each since held step 1, 2026-11-15) are the routine spend, renewable on a cooldown with no lifetime cap from their event's own `trigger.turn_min` (week 84), for the human President as on the bot path (G1, 2026-11-16); before that week the desktop contracts report `not_yet_available` with `availableFromTurn` (front visit every 26 weeks, address 52, decoration 52, posture review 26; Fable appendix D, 2026-11-15). Their `action_cadence` carries no `max_fires`; the loader then requires a positive `cooldown_turns`, and the desktop contracts report the gesture as renewable (`firesLeft: null`), never as exhausted. The engine never reads `action_cadence`. A President who spends nothing keeps a full meter at any income; that is a valid choice, shown as unspent capital, not a defect. Balance is judged by the three-President test of proposal §5D (hands-off, engaged, meddler; a turn counts at cap only when `current` equals `max` and the reserve is full; the engaged President at cap in at most 25% of turns after week 26). Income and the reserve are unchanged. The held tuning order is gestures 10 → 20, then remove the 15-point reserve, then lower base income, one measured step at a time; step 1 (gestures to 20) was taken on 2026-11-15 on the measured trigger (in the first three-President run the engaged President never fell below 65.5).

**Corps stance:** defensive (e.g. 0.5× attack, 1.2× defense); balanced (0.8 / 1.0); offensive (1.0 attack, 0.8 defense); reorganize (0× attack, force defend, +2 cohesion/turn). **Army stance (Amended 2026-11-16, Batch B; Fable consult 5 ruling 3):** the army-level standing order (general_offensive / general_defensive / total_mobilization / balanced) is still written each turn as the General Staff's proposal and display value, but it no longer overrides any corps stance: `getEffectiveCorpsStance` and the SID-fallback battle path read the corps's own stance, capped only by presidential holds and the October 1995 ceasefire, and corps stance changes are put to the President as stance matters regardless of the army stance. Measured: 188w historical and emergent, 40w and the 1993/1994/1995 starts hash-identical to the override version; the old override could only change a corps in reorganize, and none was. **Named operations:** planning (e.g. 3 turns, +5% defense) → execution (e.g. 4 turns, operations_mult 1.3 for attack power) → recovery (e.g. 3 turns, −40% attack, +1 cohesion/turn) → complete. All stance and operation effects apply in the attack-resolution formula (attacker/defender power multipliers). **State:** corps_command (per formation), army_stance (per faction). **Implementation-note:** FormationKind army_hq, corps_command init, and OG slots remain as in existing implementation-notes; combat and posture references use OSID and location_osid. **Implementation-note (sector offensives 2026-03-01):** CorpsOperation may be extended with sector offensive fields: sector_id, objectives, current_objective_index, planning_duration, supply_readiness, momentum (0–3 cap), last_result, failure_count, consecutive_failures_on_current. Lifecycle: planning → execution → recovery → removed. Named operations use per-faction historical name pools (operation_names.ts): VRS/JNA bureaucratic style (nature, fortification, minerals), ARBiH evolved identity (weather, aspirational, Islamic terms), HVO Croatian tradition (Adriatic winds, force, action). ~40 names per faction, sequential consumption via `state.used_operation_names` (no repeats per game). Pre-planned/triggered operations (Koridor, Drina, Prsten, etc.) use explicit names outside these pools. Triggered historical operations must satisfy both chronology and live relevance: they are skipped when no enemy-held objectives remain. Pipeline steps **advance-sector-offensives** (after corps orders, before brigade orders) and **update-sector-offensive-results** (after attack resolution). Launch criteria for a generated sector offensive: ≥2 brigades after the critical-supply filter (with at least one eligible attacker), ≥1 enemy OSID adjacent to the corps front, ≥1 objective, a passing launch-feasibility check (below), and the embargo gate when `embargo_offensive_gate_enabled` is on (the faction's embargo-phase `general` cap below 0.7, which in practice binds only RBiH). The sector-wide supply readiness figure (recorded for diagnostics, never a launch gate) is fixed at 1.0 since the supply-reserve economy was retired on 2026-11-17; it used to return 1.0 unless the reserve flag was on. Probes that miss their immediate launch window now enter short `planning_invalidated` recovery instead of contaminating execution diagnostics as `no_logged_attempt`. **Implementation-note (LANE-2026-05-02-B1, 2026-05-02):** `planning_invalidated` is a DIAGNOSTIC distinction separating planning-phase failure from execution-attempt counters; it does NOT exempt the failed objective from the CO objective-failure cooldown. `recordFailedObjectives` (sector_offensive.ts) now records `planning_invalidated` failures into `failed_offensive_objectives` like other failure modes (max_failures, brigade_attrition); after `OBJECTIVE_FAILURE_THRESHOLD=2` failures on the same objective the existing 8-turn cooldown bounds re-emission (exception since RF-AI2, 2026-11-14: a bot commander-planned op ending `zero_eligible_axis`/`max_failures` locks out at once for 8 × failure_count turns; see "Bot objective lockout" in §6). `probe_complete` (recon-by-force, not a failure) and `political_blocked` (truce-induced, not a corps decision) remain genuinely skipped. Recovery-phase ops can be replaced by new launches (+15 corps exhaustion). evaluateOperationProgress() skips sector_attack, probe, feint and reorganization ops; each has its own lifecycle handler (sector_attack: advanceSectorOffensives). For generated (sector and commander) offensives, planning duration is `min(4, base + 2)`, capped at `MAX_PLANNING_DURATION = 4` turns whatever the objective count; authored pre-planned operations (up to about 10 turns) and catalog operations (up to 5) carry their own planning duration. The commander planner and the Central Bosnia catalog do not start a new offensive for a corps with exhaustion above 30 (`MAX_EXHAUSTION_FOR_OPERATION`); that gate is not applied in sector-offensive creation or in pre-planned and triggered operations. A completed non-probe operation is recorded (`last_completed_operation`, `last_completed_operation_turn`; probes do not record). A theater-aware secondary-operation cooldown (`SECONDARY_OP_COOLDOWN_TURNS` 5, or 3 for an offensive-stance corps) is defined in `bot_corps_directives.ts` but is not wired to any caller; the only live reader of the completion turn is the Army HQ override idle wall. When a sector offensive or a triggered operation is created, `evaluateLaunchFeasibility` requires at least one objective where the attacker pool's power ratio is at least 1.0 (costly_victory; an objective with no defenders counts as feasible); otherwise the operation is rejected. Pre-planned and catalog operations bypass this check. Each turn the `reevaluate-weakened-operations` step moves a planning or execution operation into one-turn `brigade_attrition` recovery if it has no active brigades, fewer than its type minimum (probe 1, feint 1, sector_attack 2), or under 50% of its initial personnel. Momentum grants aggression bonus and relaxed min_outcome. Report: docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md.

**Implementation-note (authored operation viability, 2026-08-31):** `CorpsOperation.minimum_viable_participants` is an optional persisted live-roster floor. Operation construction clamps an authored value to at least one, and later attrition/viability reevaluation uses the same value. When absent, the operation-type default remains authoritative. This permits a historically justified local one-formation action without lowering generic sector-attack floors or bypassing CorpsOperation ownership.

**Implementation-note (authored assembly, 2026-08-31):** `CorpsOperation.minimum_assembled_participants` is an optional persisted synchronization floor. It counts active, non-disrupted formations with positive personnel; combined opening strength remains a separate predictor gate. The generic `MIN_ATTACK_PERSONNEL=500` attack floor is unchanged.

**Implementation-note (operation opportunities, updated 2026-09-28):** Late-war operation opportunities are prerequisite-driven proposal records, not calendar-forced operations. The canonical substrate is `src/sim/combat/operation_opportunities.ts`; family catalogs currently include the 5th Corps / Bihac family and the Central Bosnia / Vlasic family. `vlasic_ridge_95` is a non-sensitive Ring 1 ARBiH 7th Corps T1 opportunity (hosted by the 3rd Corps before RF-1 Phase B, 2026-11-15). Its 8-brigade ridge axis belongs to the 7th Corps. The 7th Muslim, 303rd and 314th stay in the 3rd Corps on a Zenica support axis with the same objectives and staging. It surfaces only when the proposal eligibility window (opening in the week of 20 February 1995, t150, and closing after t166), 7th Corps readiness, Travnik staging access, live RS-held Vlasic objectives, and post-Washington alliance context are green, with at least two optional axes (logistics, weather/season, commander confidence, force quality) also green. Eligibility does not force a launch or capture date. Approval and redirect route through `buildCorpsOperation`; decline records a resolution without spawning an operation; AAR closure links standard exit classes. No opportunity entry changes combat math or bypasses the CorpsOperation lifecycle.

**Authored same-operation phase handoff (owner-approved named opt-ins, updated 2026-10-23):** A `phase_gate` may name one brigade already admitted on its declared main/source axis for atomic transfer to the gated axis when that exact operation instance has an owned capture receipt for every prerequisite and still controls those OSIDs. Catalog-authored formation IDs bind to the live registry by exact key first or one unique `oob:<authored id>` alias; missing or ambiguous bindings reject the gated handoff. The resolved runtime ID is persisted in the live handoff. The brigade must remain active, eligible, faction-correct, assigned exactly once to the declared source axis, listed exactly once as an operation participant, and free of every other live-operation commitment. If any guard fails, neither gate phase nor roster changes. On success, source and destination memberships and main/support roles change together exactly once; operation participation, physical location, movement/transit state, pending-order precedence, readiness, force, confidence, dates, attack thresholds, and political control are unchanged. Operation Sana is the first operation-level opt-in and has two authored handoff axes: the 505th remains on the Krupa source axis until this operation owns and still holds Ivanjska, then transfers to the initially empty Veliki Badić cleanup axis; separately, the 510th stays with the 501st on the Petrovac–Ključ source axis until this operation owns and still holds Ključ, then joins the initially empty Sanica-first west-Sana axis while the 501st remains on the source. Operation Southern Move is the second operation-level opt-in and contributes the third and fourth authored handoffs overall, producing three Southern Move axes: its original Gerzovo–Majdan–Podrašnica–Mrkonjić Grad source-axis sequence, participant pool/order, and Šipovo staging remain intact; canonical Kralj Tomislav transfers from that source to an initially empty Bjelajce–Baljvine axis only after this operation owns and still holds Majdan, while Kralj Petar remains on the source axis; the Rama Brigade transfers from the source to the initially empty Donji Vrbljani axis only after this operation owns and still holds Podrašnica. These target chains represent qualified group-level pushes and do not assign each settlement capture specifically to the handed-off brigade.

**Southern Move Donji continuation (validated 2026-10-23):** A third initially empty holding axis targets Donji Vrbljani. It opens only after the same Southern Move instance owns and still holds Podrašnica, then transfers the Rama Brigade from the main axis exactly once. The operation's minimum-two participant rule, attack thresholds, dates, truce and withdrawal gates remain unchanged. Preparation excludes an axis from its current view only when `late_phase.phase === 'holding'`, a handoff exists and `assigned_brigades.length === 0`. Sector selection, intel confidence, defender/enclave aggregation, terrain/force ratio and in-transit relevance consume this view rather than add exclusion conditions. Staffed or held axes and all stored objectives remain available to ownership reconciliation and execution.

**Implementation-note (emergent operation intent and names, 2026-09-02):** Exposure alone does not authorize a corps offensive. The commander's primary tactical proposal must also be an Army-HQ/campaign objective, a recent local recapture, an enemy-salient neck, or a position directly threatening a must-hold OSID. An unpurposed primary proposal vetoes that planning cycle rather than shopping the entire front for a convenient fallback. Ordinary corps opportunities commit at most six brigades; authored and assigned bilateral operations retain their explicit force authority. During the Croat–Bosniak war, a bilateral offensive may target only territory currently controlled by the actual bilateral opponent. Historical catalog names and their semantic variants are reserved exclusively for authored operations; emergent pools use fictional replacements while retaining their prior slot counts so deterministic name hashing does not reseed other operations. These are intent and scope rules: they neither predetermine combat nor transfer control.

**Implementation-note (Level-1 operation authorization identity, 2026-07-15):** A corps commander may request presidential authorization only for a concrete `ready` plan with at least one target. The decision identity is the exact tuple `APPROVE_OP:<corps_id>:<plan_id>`. Approval remains authoritative until that exact operation is admitted to the active lifecycle; if emission is temporarily blocked, the plan remains ready and is not re-prompted. Rejection abandons the exact plan. Resolved exact-plan rows remain durable no-reprompt records, while a later genuinely new plan receives a new identity.

**Implementation-note (COHA pause, scoped Vlašić exception, and exact battle causality, implemented 2026-09-28; calendar corrected 2026-11-02):** During an active cessation-of-hostilities agreement, brigade AI clears operation attack/posture orders but preserves legal movement, and `advanceSectorOffensives()` pauses unrelated operation clocks with `operation_lifecycle_paused_reason: 'coha_ceasefire'`. The sole authored exception is `Operation Vlasic Ridge` of RBiH 7th Corps (3rd Corps before RF-1 Phase B, 2026-11-15; the closed brigade set is unchanged and still includes the three 3rd Corps Zenica brigades of its support axis) at receipt turn 155 only (the completed week of 20-26 March 1995): its validated authored participants and the current objective of their executing authored Vlašić axis may use the normal operation lifecycle, attack-order, battle-resolution, and result-reconciliation paths. Generic attacks, unrelated operations, future authored objectives, and all other COHA behavior remain suppressed. The upper bound stays 155 conservatively: it identifies the completed 20-26 March interval and does not claim that historical fighting ended on 26 March. Attack resolution records suppressed orders and, for actual battles, the exact attacker brigade ids plus contributing operation ids. AAR/scenario attribution consumes those receipts and never assigns a battle to an operation merely because both name the same target.

**Implementation-note (October 1995 general ceasefire, council fix 3, 2026-11-14):** Accepting Holbrooke's demand (`holbrooke_ceasefire_demand_oct95` → `accept_ceasefire`) records `event_flags.ceasefire_oct1995_in_force`. The ceasefire binds from the turn after the card fired. That turn is the same for the president, who answers after the turn resolves, and for a bot, which answers inside the event step. The one-week lag mirrors the gap between agreement (5 October) and effect (12 October 1995) (BB Vol. I p.392, KB BB1_p0429). Turn labels in this note are turn-start dates (t0 = 6 April 1992), as in the council diary; under the receipt-week convention of the COHA note above, each falls one week earlier. Scope is general, as for the COHA: the 5 October agreement bound the Republic and the Federation (Izetbegović) and Republika Srpska (Karadžić, Mladić) (A/50/718-S/1995/920, annex), so RS, RBiH and HRHB are all bound. A declined Dayton lifts it (`reopenWarAfterDaytonDecline`), and refusing the demand never sets it. The local-truce violation route (`check-truce-break`) covers local truces only, not this general agreement; as with the COHA, the general ceasefire can only be ended politically. The `enforce-oct1995-ceasefire` war step runs directly after `evaluate-events`, and every admission path reads the same predicate (`oct1995_ceasefire.ts`).
- **Operation channel closed.** No new operations from the commander loop (including the no-plan probe fallback) or pre-planned injection. Queued and authored definitions are kept, not consumed. Also closed: triggered and Army HQ operations, catalog opportunities (none enqueued, bot-approved, put to the president or admitted at preflight), linked probes, authored and REQUEST-OP levers, and authored reinforcements. The launch gate refuses every launch, force launch included.
- **Running offensives.** Planning offensives enter recovery at once with reason `ceasefire`; commander plans not yet executing are abandoned. An offensive executing on the first ceasefire turn records stand-down caps. Each axis that had already engaged (attacked or captured) may take only its current objective, even one it had not yet attacked; an axis that never engaged stands down at once. Then the operation stands down through the ordinary lifecycle, with recovery reason `ceasefire`, booking no failed objective, experience grade or completion exhaustion. If the ordinary lifecycle ends the operation first (all objectives taken, or failure/stall caps), its ordinary recovery reason and bookings apply. The ordinary failure caps bound the stand-down. In the 188-week run the last stand-down capture is at t185 (Farz takes Brijesnica Donja), and the last stand-down ends that turn. Historically, fighting in western Bosnia went on for about a week after 12 October (BB Vol. I p.392). The looser "current objective" rule (rather than "the cell already under assault") is what keeps the Farz guard; see below and REAL_WAR_MASTER.
- **Stances.** Corps stance and the combat-effective stance are held at Defensive. The army standing order cannot be General Offensive (it falls back to Balanced, which would leave a Reorganize corps alone), so there is no army-wide offensive. (The multi-corps offensive pre-set was retired on 2026-11-16, package P0: it was overwritten by the corps stance step except for a corps under a player stance order, where it overrode the President.) A stance matter caused by the cap gives the reason "ceasefire".
- **Combat.** As under the COHA, attack orders of bound factions, counter-attacks included, are cleared at generation and suppressed with `oct1995_ceasefire` receipts at resolution. The only exception is a stand-down order on its capped objective. Movement, redeployment and strategic defence continue; frontline attrition is not suspended.
- **Why not a hard cancel.** Calling off executing offensives outright was measured, and it breaches the enforced Farz guard: the simulated Uragan/Farz offensive takes its last Ozren cell at t185, about six weeks after Farz opened on 10 September 1995 (ICTY Delić TJ §285; BB Vol. I, KB BB1_p0423). Recorded in `docs/40_reports/implemented/20261114_COUNCIL_FIX3_RESPECT_THE_PEACE.md`.

**Mixed-battle occupation authority (2026-08-27):** A winning aggregated battle changes political control only when every validated contributing attacker permits occupation. Validation is the attack resolver's existing active, located, and tactical-adjacency gate. For each validated contributor, an explicit `occupies_on_victory: false` on its matched operation vetoes the shared territorial flip; a missing declaration or no matched operation defaults to `true`. Rejected or nonadjacent orders are outside the contributor set and cannot veto occupation. This rule changes only the territorial consequence: the battle result, casualties, and battle receipts remain valid when occupation is withheld.

**Implementation-note (operation participant eligibility, 2026-07-17):** Historical opportunity participants retain authored order but pass the same live status, personnel, disruption, transit, and host-corps eligibility gates as generated operations. Ineligible authored rows are skipped and later authored eligible reserves may fill minimum commitment.

**Implementation-note (operation formation identity, 2026-08-22):** Historical operation catalogs author OOB identities, not necessarily live formation dictionary keys. The shared resolver used by pre-planned, triggered, and opportunity operations prefers the exact key, otherwise admits one deterministic `oob:<authored id>` match, and rejects zero or multiple matches. Injection validation uses the same resolver, so a recruitment-generated formation cannot be warned missing and silently omitted merely because its live key is synthetic.

**Implementation-note (isolated-position operations, 2026-09-14; predicate corrected 2026-09-16):** After the week-20 paramilitary window, a small hostile position of at most six connected OSIDs may justify an emergent corps operation only when the attacking corps itself holds at least two-thirds (`ISOLATED_POSITION_RING_DOMINANCE_SHARE`) of the position's external shared-boundary ring and every remaining ring cell is held by a **current co-belligerent** — read from the live RBiH↔HRHB alliance value (`areRbihHrhbAllied`, above `ALLIED_THRESHOLD`), not from any combat, mobilization or ceasefire gate. A hostile or merely paused third party on the ring, or a sub-dominant attacker share, disqualifies. There is no calendar cutoff, and the alliance does not automatically end at any turn; it lapses only when its value actually falls. The rule confers no movement, supply or joint-defence capability. Defended isolated positions retain the existing requirement for at least two combat-ready same-corps brigades over friendly routes. A local occupation may instead commit one eligible surplus brigade already adjacent to the target, provided no physically present or reachable organized defender contributes and the population-aware combat prediction gives that brigade at least a costly victory. The selector checks legal brigade–target pairs in deterministic order, preserving readiness, commitments, front staffing, intelligence, enclave and political guards. Missing target-population or prediction inputs cannot authorize the exception. The resulting ordinary corps operation uses one viable/assembled participant and a verified ready preparation state; it still waits one planning turn and passes the normal launch, attack and capture gates. A reconnaissance cooldown does not suppress this distinct occupation task. A standalone local task cannot bypass player approval at autonomy level 1: it is withheld at that level for the selected player faction's corps only, and other factions' corps keep it at every level (amended 2026-11-14, PK1). The generic offensive force minimum and generic probe behavior remain unchanged. Topology never changes control by itself. Authored pre-planned staging marches carry `authored_preplanned` movement ownership, so routine march correction cannot cancel a dated concentration merely because its operation is still queued behind another historical operation.

For isolated-position qualification only, any OSID in the defender's connected position touching its patron state's exterior border disqualifies the position (HRHB: Croatia; RS: Serbia or Montenegro; RBiH: none), regardless of the in-country ring; the border relation comes from versioned derived operational geometry and changes neither control nor other operation purposes.

### 6.5 War phase bot (brigade AI) — implementation-note

When staff execution controls a faction in War phase, corps and brigade AI generate deterministic directives, posture orders, movement orders, and attack orders. **Column march:** interior and reassigned brigades receive `column` orders toward a reachable front destination; in-transit brigades are not retasked. `osid-column-movement` consumes column intent before `apply-brigade-movement` applies remaining adjacent movement.

**Player automation boundary (updated 2026-07-15; operation authorization recorded 2026-09-05):** Autonomy 0 is manual for the selected player faction, except that formations assigned to an accepted `HISTORICAL_OP:*` authorization receive operation-scoped staff assistance. Autonomy 1 and above include the selected player faction in deterministic corps and brigade staff execution. No player UI stages brigade posture or movement orders; at autonomy 2 the president's stance agency is the stance-matter boundary of Engine Invariants §14.10c (amended 2026-11-12). A null `player_faction`, as used by the headless runner, auto-controls every faction. Recruitment has a separate boundary: automatic recruitment excludes the selected player faction at autonomy 0 and 1 and includes it at autonomy 2 and above.

**Army clashes (command loop L7, 2026-11-15; owner decision 4).** After the desktop stages a presidential act (`stage-op-halt-order`, `stage-op-directive-order`, `reject-proposal` for `APPROVE_OP:*` or `OPPORTUNITY:*`, or `resolve-operation-opportunity-decision` with `decline`), it calls `raiseArmyClash` (`src/sim/combat/army_clashes.ts`, through the desktop_sim bundle). `detectPlanConflict` reads `military.campaign_plans[faction]` only while `valid_until_turn >= turn`: a stop conflicts when the corps is a `main_effort` participant of a synchronized operation or the operation's target settlements or axis objectives meet the corps' `offensive_targets`; a request when the corps' role is `economy` or `contain`; a withhold when the role is `primary`; a decline when the review's `proposed_value` is `approve`, the opportunity is still `eligible_pending_review` and every `required` axis is green. (The proposal's second request-op test, drawing brigades out of a besieged or garrison-short zone, is not implemented.) Compliance is `computeArmyComplianceScore` / `categoryForScore` (the A3 formula, now exported) against `PRESS_OFFENSIVE` for a request and `HOLD_AT_ALL_COSTS` otherwise; anything short of `full` raises the clash and is stored as its severity (`compliance`: modified, partial, refused; Fable consult 1, appendix A); full compliance, no army commander, or an acting one means a `noted` line instead. Ids are `CLASH_<turn>_<faction>` (a numeric suffix keeps receipt ids unique). The answer runs in `resolve-army-clash` (`src/desktop/army_clash_ipc.cjs`): Accept withdraws `pending_op_halt` / `pending_op_directive` and refunds its `ca_cost`, or restages the withheld or declined review as accepted / `approve` and debits the backing price (`proposalBackingCost`: 10 for `APPROVE_OP:*`, 20 for `OPPORTUNITY:*`), refusing the answer when the balance cannot cover it; Insist debits `ARMY_CLASH_INSIST_COST` (15) and appends `{ turn, resolution: 'override' }` to the army commander's `recent_overrides`; Replace calls `stageCoReplacement` for the corps. `advance-turn` sweeps an unanswered clash to a `lapsed` receipt after the turn. The decision manifest family `army_clash` is advisory and never blocks Advance. See Engine Invariants §14.10d.

**Queued prestage ownership hold (2026-10-28):** an already-arrived roster of the head queued
authored operation remains committed from its applicable marshaling date. Explicit enqueue-date
precedence is unchanged; the fallback to the existing prestaging date applies only to factions
other than the selected player, matching the actual prestaging boundary. Operation availability
and manual controls are unchanged.

Operation authorization is gated on autonomy 1 exactly — neither the staff-execution boundary of autonomy 1 and above nor the recruitment boundary of autonomy 2 and above. The commander-loop and operation-opportunity channels use separate autonomy boundaries. At autonomy 1 the selected player faction's commander-loop plans are held at `ready` until a player operation response is recorded for them. The hold is the player's alone, because only the president can answer it: at autonomy 1 every other faction's corps plan, launch and run local occupation exactly as at autonomy 0 and 2, and no bot plan waits for an approval (amended 2026-11-14, PK1; Engine Invariants §14.10b). A commander-loop plan advances to `executing` unauthorized at autonomy 2 and above. Operation-opportunity decisions surface as pending proposal reviews at autonomy levels 0 and 1, retaining the existing advisory decision-manifest gate; the deterministic bot path excludes the selected player faction at those levels. At levels 2 and above that path resolves military opportunities without a player review queue. Launched opportunity decision evidence stays visible; a uniquely bound own operation in planning or execution (phase reported) exposes the existing Stop-op action, otherwise the dossier states its unavailability. A halt, in either phase, resolves an authored operation: it is not queued again (CODE3, 2026-11-16). Scripted (authored and triggered) operations are not exhaustion-gated; discretionary plans are; exhaustion is a cost; Stop-op is the player's counter, from planning onward (CODE3, 2026-11-16; Engine Invariants §14.10b). No player post-turn catch-all sweep is used. At autonomy 0 no commander-loop plan is generated for the selected player faction at all, because staff execution does not run for it at that level. Authored historical operations are the exception to both boundaries: a pre-planned or triggered operation belonging to the selected player faction requires an accepted `HISTORICAL_OP:*` authorization at every autonomy level, and is deferred while that authorization is pending or declined. At autonomy 2 and above the president's operation lever is the halt order, not the authorization. *(Recorded 2026-09-05 — Game Designer ruling; owner waived panel review. Describes shipped behaviour; no behaviour change. Reasoning: `docs/plans/2026-09-01-player-opportunity-sweep-gap.md`.)*

*(Amended 2026-11-14, PK1 — behaviour change in the same change. The superseded sentence read: "At autonomy 1 every faction's commander-loop plan is held at `ready` until a player operation response is recorded for it; only the selected player faction can receive one." It recorded shipped behaviour, not design intent (PROJECT_LEDGER, 2026-09-05: "The Level-1 hold is NOT player-faction-scoped"). Bot corps waited for an answer that could never come: while level 1 was in force the code held every non-player faction's commander-generated plans at `ready` and switched off their local occupation (RS and HRHB in an RBiH campaign); authored historical operations still launched (R8 dry-run run m; `docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md` §8). The hold and the level-1 local-occupation switch-off now key on the selected player faction (`isLevel1PlayerApprovalFaction`, `src/sim/bot/staff_control.ts`). Headless runs are unaffected. Unanimous Pyrrhic panel: `docs/40_reports/governance/20261114_PK1_LEVEL1_PLAYER_ONLY_PANEL.md`.)*

*(BC01 implementation status, 2026-09-07 - the existing ruled opportunity boundary is implemented in candidate 3ad5ed25a. Independent Systems and Canon/Process QA reviewed this opportunity-only clarification. BC01 remains ACTIVE: the player endpoint-convergence expectation is unmet and requires explicit owner disposition. This annotation documents behavior, not an acceptance waiver or engine closure. Evidence: [BC01 implementation verification](../40_reports/audits/20260907_BC01_PLAYER_OPPORTUNITY_IMPLEMENTATION_VERIFICATION.md). The September 5 annotation remains historical; its waiver is not the authority for this change.)*

*(BC01 owner disposition, 2026-09-07 — the owner approved closure and merge based on verified operation/decision fixes and explicitly retired similar final territory as a BC01 requirement. The preceding ACTIVE annotation records the earlier assessment. Measured divergence is preserved; convergence is not claimed. No mechanic changes; final calibration remains open.)*

Attack-order eligibility uses the posture selected in the same pass. Strategic objectives, corridor needs, home recapture, enemy defense, consolidation value, supply state, corps directives, operation state, and commander constraints feed deterministic target selection with stable ID tie-breaks. Home-defense formations ordinarily defend or counterattack; active operation participants follow operation objectives; critical supply suppresses voluntary attacks. Corps sectors constrain frontage and assignment. Empty reachable same-corps sectors receive explicit reassignment intent that becomes delayed column movement; no phase directly rewrites a donor brigade's location. When enclave restrictions, connectivity, or donor commitments make staffing impossible, the sector remains truthfully marked `unstaffed_front`.

**Critical-supply stranded truth (2026-08-26):** sector membership cannot self-certify
reachability. If the canonical supply pass marks an OSID `critical`, a one-cell same-corps
sector wrapped around that isolated pocket does not make its brigade connected to the corps
front. The stranded-brigade lifecycle therefore treats the location as unreachable and invokes
the ordinary deterministic emergency-retreat/lifecycle path when combat removes the pocket.

**Stranded cohesion liveness clarification (2026-11-03):** the ordinary cohesion
drift still applies to every eligible unengaged formation, including positive and
negative ambient/enclave drift, OPSEC/TG suppression, ceiling and `[0,100]` bounds.
Only formations in the CURRENT fresh-turn lifecycle report's `still_holding`
receipt skip the upward faction-floor correction, so the same-pass stranded
cohesion decrement is not erased. This is a current-pass exception, not a
persistent flag, global holding exception, or suppression of ordinary recovery.
Absent, empty, stale, newly-stranded, reconnected, tagged-enclave, active or
queued-owned receipts keep existing behavior. Runtime/full-campaign/save/native
validation remains pending.

**Own-origin salient retention (2026-10-28):** automatic capture-triggered salient withdrawal
retains any component holding the displaced faction's OWN configured, currently held supply
origin. Being separate from a larger component is not by itself sufficient grounds for automatic
abandonment. Friendly territory may provide transit toward such an origin, but allied depots
never seed it, and captured, uncontrolled or missing origins offer no protection. This does not
grant adequate supply, weaken the critical-supply stranded rule, change ordinary combat retreat,
or protect control that combat actually lost.

**Owner-directed 102nd Odžak→Orašje evacuation (2026-10-28):** when the capture-triggered
salient lifecycle would evacuate `hrhb_102nd_brigade` from the Odžak/Bosanski Šamac neck, the
brigade is placed in its own held Orašje pocket and retains `hvo_northwest_bosnia` rather than
following the generic graph to central Bosnia. This is explicit owner-directed historical/scenario
placement authority whose actual travel route is unmodeled: it
applies only to that formation, faction, organic corps and departure municipalities, only when
ordinary evacuation would otherwise occur, and only to a destination still held by the faction
and claimed by its own corps sector. It is not ordinary enemy-territory traversal, does not flip
control, and grants no generalized movement or exemption; other formations keep the existing
graph path.

**Reconstitution stranded-episode reset (2026-11-03):** a successful non-collapsed
reactivation through the ordinary home/refugee pool or reserve Path C begins a new
stranded episode: `stranded_status` becomes `none` and `stranded_since_turn` is
cleared, while historical `last_reachable_turn` is preserved until the ordinary
same-turn lifecycle classifies the actual destination. A critically supplied
destination starts a NEW holding episode at the current turn and is not decayed
again in the same pass; a supplied destination remains `none` and updates
`last_reachable_turn`. Legacy `collapsed` records are terminal-dead (EH3) and are
refused before any pool, reserve or formation mutation; ordinary destroyed units
are otherwise unchanged. No forced movement, declared-supply exemption, date or
identity exception was added.

**Operation-completion ownership handoff (2026-10-23, focused candidate):** operations
completing in the current `advance-sector-offensives` invocation publish released participant
IDs on transient turn context after return handling and operation removal. Immediately before
normal final distribution/seal, eligible released participants are checked with the existing
postcombat same-corps reachability rule (using the established precombat fallback when needed).
Any assignment, movement order/state, active loan, active/queued operation, enclave ownership
or prior holding status excludes a participant from this handoff. Newly unreachable candidates
enter existing `holding` with current `stranded_since_turn`; `last_reachable_turn` is unchanged.
This classification does not apply another attrition tick or write movement, location, control,
supply or alliance state. The ordinary once-per-turn lifecycle and final collector remain
unchanged; stale ownership records can still produce a visible unresolved warning.

The command hierarchy remains army standing orders → corps AI and commander intent → brigade routing and execution. Shared targeting helpers live in `src/sim/combat/war_adjacency.ts`; the current movement authority contract is `docs/20_engineering/MOVEMENT_AUTHORITY.md`.

### 6.6 Graz Accords (RS-HRHB Non-Aggression)

**Implementation-note (2026-03-04, updated 2026-03-11, elevated to normative v0.7):** On 6 May 1992 (~week 4), Bosnian Serb and Bosnian Croat leaders agreed in Graz, Austria, to divide Bosnia. A de facto non-aggression pact held in Herzegovina and around Kiseljak. Fighting continued in Posavina, Jajce, and central Bosnia where RS/HRHB forces were entangled via RBiH presence.

**Trigger:** `GRAZ_ACCORDS_TURN = 4` (week 4). Both RS and HRHB must accept (bot factions auto-accept; player faction presented with accept/decline).

**Corps-pair truces:** Two geographic regions are covered by paired corps truces:
- **West Herzegovina:** `vrs_2nd_krajina` ↔ `hvo_tomislavgrad` (immediate at w4).
- **East Herzegovina:** `vrs_herzegovina` ↔ `hvo_southeast_herzegovina` (activates after Op Jackal concludes — historical HVO-VRS fighting for east Mostar/Stolac through June 1992).

When active, these corps pairs do not generate attack orders against each other's territory. Each pair can be broken independently.

**Kiseljak OSID exclusion:** 9 HRHB-held OSIDs (VRS cannot target) + 7 VRS-held OSIDs (HRHB cannot target) around Kiseljak. Breakable independently from Herzegovina truce.

**NOT covered:** Posavina corridor, central Bosnia outside Kiseljak, Krajina HRHB cells (including Jajce).

**Cold fronts:** `isColdFront()` in `frontline_attrition.ts` — RS↔HRHB fronts under corps-pair truce are exempt from frontline attrition (sniping, disease, desertion) and bombardment firepower.

**Player break:** Player may attack across the truce. First violation sets `truce_broken_turn[faction]`. Designed: the opponent bot gains `+0.25 aggression` for `6 turns` after truce break (`TRUCE_BREAK_SPIKE_TURNS`, `TRUCE_BREAK_AGGRESSION_SPIKE`). Current build: not applied. `truce_broken_turn` is recorded in state, but `getTruceBreakAggressionBonus` has no caller that feeds bot or corps aggression. Wiring is deferred post-1.0 (realism audit F6, `docs/40_reports/proposals/20261114_PRE_1_0_REALISM_AUDIT.md`).

**State:** `vienna_declaration_turn`, `vienna_accepted`, `vienna_herzegovina_broken_by`, `vienna_kiseljak_broken`, `truce_broken_turn`. Module: `src/sim/local_truces.ts`.

### 6.6a RBiH-HRHB Alliance (updated v0.7)

**Implementation-note (2026-03-18, values updated):** The RBiH-HRHB alliance tracks the uneasy wartime cooperation between Bosniak and Croat forces. `war_alliance_rbih_hrhb` on `political` state, range [0, 1].

**Updated constants:**
- `DEFAULT_INIT_ALLIANCE = 0.75` (was 0.35) — alliance starts high, reflecting early cooperation against VRS.
- `PATRON_PRESSURE_COEFF = 0.018` (was 0.015) — patron commitment drags alliance toward breakdown faster.
- `rbih_hrhb_war_earliest_turn` default = 40 in definitive scenario (was 26) — open war between RBiH and HRHB targets ~w50-52 (April 1993, historically accurate).

Alliance drift is computed per turn in `alliance_update.ts`: alliance deterioration from territorial friction, patron pressure (HRHB patron commitment × PATRON_PRESSURE_COEFF), and escalation events. When alliance drops below threshold and turn ≥ `war_earliest_turn`, RBiH-HRHB fronts activate and the factions enter open conflict.

**Implementation-note (A2b HRHB refugee compact, B5 2026-11-17).** Left alone, refugee pressure, about −0.016 a week, is the largest drift term; patron drag is about −0.012. So before this change no HRHB choice altered the outcome. The game designer and historian panel (orchestrator-approved) added the following in `src/sim/early_war/refugee_compact.ts`. It is derived from `event_decision_log`, so no new array is needed.

- **Grants.** The President's HRHB answers of `united_front` (`hrhb_political_goal`) and `formal_alliance_persists` (`hrhb_1992_graz_cooperation_collapse`) each open a compact entry for 56 turns. The length reaches the H6 window even when the goal is answered ahead of firing. Only answers with `decision_source: 'player'` count; a bot's answer never opens, renews or lapses a compact.
- **Damping.** Refugee pressure is ×0.6 per active entry.
- **Renewals.** These extend active entries; they never open one:
  - H6 `federate_early`, 40 turns;
  - federation overture `extend_federation_overture`, 30 turns (this is also the historical default, so bots never start a compact);
  - Gornji Vakuf `negotiate`, 30 turns.
- **Lapses.** These end the compact for good: VOPP `resist_patron` (pressing the provincial map against Zagreb's restraint); overture `maintain_separate_state` or `reject_federation_path`; Gornji Vakuf `escalate`; H6 `breakout_offensive`. VOPP `acknowledge_pressure`, the documented historical answer, is neutral: it neither renews nor ends the compact (re-keyed in A2b PR-B; before that a cooperative President had to choose the aggressive counterfactual to keep the compact). A played game never answers an unanswered advisory card for the President, so an unanswered VOPP card leaves the compact in force.
- **Suspension.** A bilateral flip during an active compact suspends the damping for 8 weeks (`rbih_hrhb_state.refugee_compact_suspended_until`, written only while a compact is active).
- **Price.** HRHB recruitment is ×0.9 per active entry, the cost of absorbing the displaced (see §12: refugee concentration adds men to the local pool, but the host administration pays for absorbing them; the compact's reading of that is a price, not a gain). patron_confidence costs a further −10 on each 1992 choice.
- **End.** The compact ends at the Washington signing: the Federation locks the alliance, so no damping, no price and no drag damping remain after `washington_turn`.
- **Patron drag.** Patron drag is ×0.5 per ACTIVE compact entry, exactly 1.0 with none: Zagreb's pull on the alliance is held back only while the compact stands, and returns in full when the entries run out, lapse or end at the signing (A2b PR-B amendment, game designer and historian, orchestrator-directed; it used to be ×0.5 per 1992 choice, permanently, which let two choices buy a one-week war). The 8-week flip suspension lifts only the refugee-pressure damping, not the drag damping or the price.
- **Related changes.**
  - `csq_federation_early_1994`'s alliance floor now lasts 17 turns, not 60, so it ends at the t87 overture and Mostar's answer there decides.
  - Path C (Federation by consent) does not fire after a refused overture.
- **Acceptance.**
  - Left alone, historical and emergent runs stay byte-identical.
  - Played, a President who keeps paying reaches Path C at t102 with no war.
  - Cooperative and then careless (both 1992 grants, no renewals): the compact runs out by time at t56 and t61, the alliance falls, and `csq_back_channel_communication_RS` (t68) then pins the RBiH-HRHB alliance at its 0.15 floor until t93, so the war comes at t98, four weeks before the Federation (t102). It came at t71 before the PR-B re-key. That floor is the known lock-conflict defect (a lock authored for the RS back-channel applies to the RBiH-HRHB alliance; fix held until package P2), not the compact: with it fixed the careless war would come well before t98 (not yet measured).
  - Grants, then resisting Zagreb at VOPP (t46; the compact lapses): the war comes at t67 and the Federation at t102.
  - Renewed and then reneged at t87, the war comes at t100, the engine ceasefire at t145 and Path A signs at t149.
- **Binding copy rule (historian).** No player-facing text may say or imply that refugees caused the 1993 war.

**Implementation-note (2026-09-01):** During open RBiH-HRHB war, the bilateral corps diversion assigns the operational initiative to RBiH and a defensive stance to HVO. The selected RBiH corps receives only live HVO-controlled objectives on its mixed front; the HVO corps receives no bilateral offensive objectives. Corps selection prefers a formation below the operation-exhaustion ceiling before using mixed-front overlap as a tie-break. A designated bilateral corps may form its bounded assault group from combat-ready brigades already holding its continuous front, even when front-edge allocation labels those brigades as garrison rather than residual surplus; the reserved group remains coherent across sub-sector repartition before launch. Washington/ceasefire state terminates this special bilateral offensive designation. RBiH-HRHB control may change through combat operations, but rear-pocket `consolidation` and `abandoned` resolution is prohibited between the two factions in either direction. No direct political-control authority is granted.

### 6.7 Reactive Sector Defense

**Implementation-note (n524→n668, elevated to normative v0.7):** Defense at an OSID may draw on eligible, reachable contributors selected by the combat resolver; standing-OG membership by itself is not participation. Two layers interact:

**Layer A — Distance-weighted contribution (n666-n667):** Eligible assigned defenders within 5 friendly BFS hops can contribute defensive power weighted by distance. Decay factor: `0.60^hops` (max 5 hops). Home-municipality motivation: eligible brigades defending their home municipality contribute at `1.3×`. `REACTIVE_DEFENSE_RATIO = 1.5` — maximum reactive power relative to frontline power. `MIN_DEFENSE_FLOOR_FRACTION = 0.75` — sector coverage does not reduce the local militia fallback. `DEFENDER_CASUALTY_ENGAGEMENT_CAP = 1.5` — actual contributors absorb casualties in proportion to their resolver contribution weight, subject to the cap.

**Layer B — Sector stances (n668):** Five independent sector-level stances modify reactive defense bonus and entrenchment rate:

| Stance | Reactive Bonus | Entrenchment Rate | Description |
|--------|---------------|-------------------|-------------|
| Fortify | 1.30× | 2.0× | Maximum defense, rapid entrenchment |
| Defend | 1.15× | 1.2× | Standard defensive posture |
| Elastic | 1.00× | 0.8× | Trade space for time |
| Active Defense | 0.85× | 0.6× | Local counterattacks, reduced digging |
| Screening | 0.50× | 0.0× | Minimal presence, no entrenchment |

The corps commander loop is the only deterministic bot writer of OG stance (amended 2026-11-14; the opt-in AI-commander override, `src/sim/ai_commander/corps_commander_ai.ts`, can also set it when enabled; until then the corps AI's `evaluateSectorStances` also wrote it and was overwritten every war turn). Besides contact and intel it reads two standing facts, which set a posture at once: an OG on a truce line (RS–HRHB under the Graz accords) takes Screening, and an OG from which the corps' own operation is staging or running takes Elastic, keeping reserves free for the operation (`CommanderBriefing.sector_situations`; operation staging is matched on the OG's brigades). "Enemy massing" counts only an enemy attack, feint or probe aimed at or assembling opposite that OG: an objective in its ground, or a staging point or participant on the enemy ground it faces (before 2026-11-14, any such operation anywhere on the enemy corps' front marked every OG facing it). Corps stance provides a ceiling (e.g., offensive corps cannot Fortify); the commander loop narrows every OG stance it emits into `CORPS_STANCE_ALLOWED_SECTOR_STANCES` (amended 2026-11-13; before that its output ignored the ceiling in about 16% of OG-turns).

**OG stance continuity (amended 2026-11-13).** The corps commander keeps each OG's posture across turns (`CommanderState.sector_stance_memory`, keyed by `stableSectorKey` because sectors are renumbered every turn). Contact, meaning ground lost or fighting in the sector that turn, changes the posture at once, as do the two standing facts above. An intel-driven change (enemy massing, a quiet front) waits until the posture has stood `OG_STANCE_MIN_DWELL_TURNS`, which is the commander's own intent-trust window (`BELIEF_INTENT_STALENESS_TURNS` = 3). With no fresh reason the OG keeps its posture, and returns to Defend only once its last confirming reason is that old. The quiet-front streak behind Screening follows the same stable key. The commander never overwrites a player-set OG stance.

**Known gap (2026-11-13, queued as its own calibration lane):** front sectors are rebuilt twice a turn with stance Defend, and the brigade entrenchment step and the sector-intel derivation both read the rebuilt sectors. So in practice the Entrenchment Rate column above and the patrol intel source for Screening / Active Defense do not apply: every brigade entrenches at the Defend rate. Carrying stances across rebuilds was measured (Apr95 708, Oct95 705) and held back for that lane.

At autonomy 2 a move into or out of Active Defense is reported to the president as a stance matter; a countermand or constraint holds for four turns (§6.4, "Presidential stance holds"). Legacy `sector_stance_orders` → `applySectorStanceOrders()` remains in the pipeline; no player UI stages them.

**Militia-only defense: magnitude, persistence, and accounting (2026-09-01).** When an attacked OSID has no physical defender, the local militia-defense floor applies. Its magnitude is derived from OSID population and is deliberately **not** bounded by `militia_pools[...].available` — that field is the post-mobilization recruitment residual and is structurally 0 for a faction defending ground it does not control (27 of 30 militia-only battles measured at battle time on `runs/preflight_baseline/apr1992_definitive_188w__f0b9d7b1bda55de4__w12_n0`; see `REAL_WAR_MASTER.md`), so binding defense to it would erase historically attested local defense at Kozarac, Foča, Višegrad, Zvornik and Vlasenica. The casualties those defenders take ARE durable: one writer (`militia_casualties.ts`) debits `available` by at most what it holds, adds permanent losses to `exhausted` at the standard 0.75 share (which throttles later mobilization), credits `wounded_pending` only in proportion to manpower actually drawn from the pool, and records the realism-scaled row in `casualty_ledger[faction].per_militia_pool`. Militia wounded recover through the existing `wia-trickleback` phase. Faction totals equal `sum(per_formation) + sum(per_militia_pool)` after every write.

**Reactive sector defense model:** Defense at an attacked OSID starts with an active physical defender on the target when one exists, then adds only eligible distance-weighted defenders that the resolver actually selects from the responsible corps sector. Contribution decays by friendly BFS distance and is capped proportional to attacking brigade count; sector stance modifies reactive response. If the target has no physical defender, the local militia-defense floor still applies, so sector coverage cannot make a settlement easier to seize than the militia-only fallback. Empty sector-roster holes may use an active same-corps defender one friendly hop away, but severed pockets without a legal nearby formation remain militia-only rather than receiving a fabricated brigade.

**Standing-OG doctrine pointer (ADR-0006/0007):** Phase B may physically commit one eligible second-echelon formation toward a threatened front under the §6.3 exclusions. That movement decision does not widen the current battle roster by membership. Actual resolver contribution governs weighted casualties, and the primary defender remains the principal owner of post-battle defender fatigue and aftermath. Retired experimental mechanics are historical ADR evidence, not live Systems Manual rules.

### 6.8 Ops-Only Attack Doctrine

**Implementation-note (n500, elevated to normative v0.7):** Brigades never attack independently. All offensive actions flow through `CorpsOperation`. Brigade-level `evaluateOffensive`, `evaluateDefensive`, `evaluateReorganize`, and `evaluateHomeDefense` are stripped of independent attack logic.

**Sole exception:** Counter-attacks — brigades may retake a recently lost position (enabled by `counterattack_window_turns > 0`) without an active operation. **Implementation extension (not canon; pending reconciliation with Engine Invariants §6.3, which allows only "counter-attacks to retake a just-lost position"):** for a defensive-stance corps, the bot brigade AI also lets healthy brigades in a sector that lost ground within the last 2 turns attack an adjacent enemy OSID within 2 hops of the OSID that was lost. Current gates: not disrupted, personnel ≥600, cohesion ≥30, predicted outcome costly_victory or better, targets recently repulsed from are skipped, and at most 2 such counter-attacks per sector per turn (a brigade's own counter-attack after its retreat uses the same per-sector count). These numbers are tuning values, not design promises. This manual does not establish whether a presidential OG or corps stance hold suppresses this path.

**Pioneer attacks:** The first brigade in an operation seeds an attack with `repulsed` threshold. Subsequent brigades join via `estimateConcentratedOutcome()`. `MAX_PARTICIPATING_BRIGADES = 20` per operation.

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
3. An adjacent friendly OSID: the first friendly neighbour of the lost OSID in `strictCompare`-sorted adjacency order. The search is declared as a friendly-only BFS of up to 8 hops (`EMERGENCY_RETREAT_BFS_MAX_HOPS`), but the frontier is not advanced past the first ring, so by defect it examines one hop only.
4. Corps HQ location, if reachable.
5. The first OSID, in sorted order, of the same friendly connected component.

Items 1, 2, 4 and 5 apply only when the lost position is still in the friendly set the caller supplies (a per-pass cache, so this can depend on battle order); when it has just been lost, only item 3 can succeed. The destination must be friendly-held and reachable through friendly territory only, and never lies in another component. If none exists, `findEmergencyRetreatOsid` returns null and `forceRetreatWithPenalties` disperses the brigade (status inactive, `destruction_turn` set). That outcome conflicts with Engine Invariants §6.2 ("never destroyed") and is open debt, not a settled rule. Callers without topology keep a sorted first-friendly-OSID compatibility fallback.

**Brigade dissolution** remains as a separate system (§7.4): brigades meeting 2-of-3 criteria (personnel < 400, cohesion ≤ 20, morale ≤ 15) are dissolved. Enclave brigades require 3-of-3. Equipment transferred to nearest same-corps brigade (70% salvaged). Personnel to strategic reserve (50%). Module: `src/sim/combat/brigade_dissolution.ts`.

**Formation admission contract (2026-07-17):** `lifecycle_status: 'forming'` is pre-operational state. Forming formations remain outside front/reserve/security sector rosters, elite-loan rescue placement, and historical or generated operation participant pools until they satisfy the shared sector-roster eligibility predicate.

### 6.10 Siege Defender Morale Drain (retired)

**Retired 2026-11-17 (Fable consult 6; §6 panel unanimous: historian, scenario-creator-runner-tester, engine/systems, red-team; canon + engine seats on this text).** The siege defender morale drain is not modelled in 1.0. It read `state.military.siege_turn_counters`, which ran only under the scenario flag `supply_reserves_enabled` (set only by `sep1991_to_dayton` and `jan1993_to_dayton`, which no player can start, since the desktop New Game accepts only `apr_1992`, and which are retired for 1.0 by the owner's one-start ruling; off in the scored apr1992 scenario), and its morale path sat behind a default-off switch (`SIEGE_MORALE_DRAIN_ENABLED`) since May 2026, so the drain itself never ran. Retired with it: the siege counters, the passive siege bombardment attrition, the reserve siege drain (`SIEGE_BASE_RATE` and its caps) and the `siege_active` event condition. `siege_turn_counters` stays an optional, compatibility-only save field so old saves load; nothing writes or reads it. Do not revive this mechanism as it stood: the record of why is in `docs/40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md` (SB1).

Authoritative invariant: Engine Invariants v0.9.0 §6.10 (retired).

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

**Combat power (defender):** base_power × posture_defense_mult × supply_mult × terrain_mult × **entrenchment_mult** × corps_stance_defense_mult × **resilience_mult** (defense_streak) × urban_mult × disruption_mult × **officer_quality_mult** × **ethnic_defense_mult**. Terrain applies to the defender's OSID (rivers, mountain, forest, road access, slope). **Entrenchment:** entrenchment_mult = 1.0 + sqrt(min(26, entrenchment_turns)) × 0.035 × 2 × suppressionFactor; MAX_ENTRENCHMENT = 6; ENTRENCHMENT_EFFECTIVE_CAP_TURNS = 26; resets on move; degrades by 1 when disrupted. **Resilience:** resilience_mult = 1.0 + min(defense_streak, 6) × 0.05; resets on move or when attacker succeeds. **Officer quality (two-tier system):** `officer_quality_mult` is computed by `getThreeTierOfficerMod(formation, state, role)` in `combat_math.ts` using a three-tier fallback: (1) When named officers are loaded (`state.named_officers`): brigade officer quality × corps commander modifier. Brigade mod = `1.0 + (quality - 0.30) × 0.4` where quality is per-brigade `officer_quality` [0, 0.90]. Corps mod = `0.90 + competence×0.03 + rating×0.01` (aggressiveness for attack, defensiveness for defense; acting commander flat 0.92). VRS pre-planned operations in execution phase use army commander (Mladić) modifier instead of corps commander. (2) When only brigade quality present: `getBrigadeOfficerMod(formation, turn)`. (3) Legacy fallback: `getOfficerQualityMult(faction, turn)` — VRS 1.10 peak decaying 0.002/w after w20 (floor 0.95), ARBiH 0.85 growing 0.003/w (cap 1.05), HVO constant 0.97. See §7.5 for full officer system specification. **Ethnic homeland defense:** +12% for ≥60% co-ethnic population in defender's OSID, graduated 30–60%, none <30% (`getEthnicDefenseBonus` in `ethnic_defense.ts`).

**Defender casualty multiplier:** Attacker heavy weapons inflict additional defender casualties via **bombardment casualty multiplier** (1.0–1.8×): `(artEff + tankEff×0.5) / 80` from attacker firepower. Applied after base casualty calculation (`getBombardmentCasualtyMult(attackers, factionId, state)` in `combat_math.ts`). The former scaling by a heavy-munitions reserve (`getHeavyMunitionsMult`) was retired on 2026-11-17 with the supply-reserve economy; it returned the full value in every apr1992 run, so nothing changes. Artillery suppression of entrenchment (`getArtillerySuppression`) is unscaled likewise.

**Power ratio:** attacker_power / defender_power.

**Power-ratio casualty scaling:** `getPowerRatioCasualtyMult` scales casualties for both sides: the power ratio is first clamped to [0.1, 10], the defender multiplier is ratio^0.33 and the attacker multiplier is ratio^-0.33, each clamped to [0.6, 2.0]. It is applied in attack resolution and in the combat predictor. In multi-brigade operations the highest-basePower brigade on an axis (ties by formation id) is the main brigade and the others are support; in the casualty split, "support" means listed as a support brigade of an execution-phase axis, and every other attacker counts as main when any support brigade exists. Support brigades keep full combat power (`SUPPORT_POWER_MULT = 1.0`). Attacker casualties are shared by personnel fraction times 1.40 (main) or 0.55 (support); the weights are renormalised and each share is rounded independently, so shares can differ from the total by rounding. These multipliers are tuning values, not design promises. When several defenders share an OSID outside a corps sector, defender casualties are split by personnel; the primary defender (highest power; ties keep the defender list order) absorbs the rounding remainder, bounded by its removable personnel. In sector-coverage defence the primary is the first positive-weight contributor in that ranking.

**Outcome thresholds:** ≥2.0 decisive victory; ≥1.5 victory; ≥1.0 costly victory; 0.7–1.0 stalemate; 0.5–0.7 repulsed; <0.5 catastrophic failure. Undefended OSID (militia only): victory threshold 1.0. Multi-brigade attacks on same OSID use combined attacker power with coordination penalty (2 brigades 0.9, 3+ 0.8). Defender stacking: strongest at full power, others at 30%.

**Casualties (§4 of spec):** Base rates and outcome modifiers apply; KIA/WIA/MIA split; equipment losses; cohesion and exhaustion effects. **casualty_ledger** serialized. WIA trickleback when out of combat (not attack posture, not disrupted). **Equipment attrition (n292, updated n905):** Per-battle equipment losses use TANK_LOSS_RATE=0.08, ARTILLERY_LOSS_RATE=0.04 in `attack_resolution_osid.ts` (live path). **Equipment acquisition (n905):** Four sources: (1) battlefield scavenging (10-20% of destroyed enemy, scaled by outcome), (2) capture from retreating forces (2-8%), (3) arms smuggling (faction-level budget), (4) local production (Zenica steelworks for ARBiH, HV transfers for HVO). **Write-off (n905):** `writeOffNonOperational()` scraps equipment when degraded+non_operational >40%. No per-brigade auto-tickers.

**Push-back and control flip (§5 of spec):** On decisive victory / victory / costly victory: defender retreats; political_controller(target_osid) = attacker faction; attacker may advance into target OSID (one OSID per attack; advancing resets entrenchment_turns to 0). **Retreat destination:** deterministically prefer friendly OSID not in enemy ZoC; tie-break **enemy adjacency count ascending**, then **OSID string sort**. No passive control change; control changes only via this resolution or corps/frontline operations.

**Snap events:** Ammunition Crisis, Commander Casualty, Last Stand, Surrender Cascade, Pyrrhic Victory, Fortification Destroyed—per spec §8 when state conditions are met. Equipment capture on surrender/elimination.

**Brigade dissolution (n292, updated n579/n905):** Brigades meeting 2-of-3 criteria — personnel < 400, cohesion ≤ 20, morale ≤ 15 — are dissolved. Enclave brigades require 3-of-3. Absolute floor (150, enclave 50) counts as "low personnel" criterion. Remaining personnel are returned to the faction's strategic reserve (50%). Surviving equipment is redistributed to nearest same-corps brigade (70% salvaged); **source brigade composition is zeroed on dissolution** (n905 duplication fix). Module: `src/sim/combat/brigade_dissolution.ts`.

**Salvage route clarification (2026-11-03):** the surviving-equipment recipient is the nearest eligible active same-faction, same-corps brigade/OG with a provable own-controlled location. Traversal uses the canonical friendly OSID graph (own or actually allied intermediate nodes only); source and recipient must be own-controlled, and unknown/null/enemy locations are barriers. Equal hop distance breaks by stable formation ID. Missing graph is fail-closed for remote transfer: only a provable own-controlled same-cell recipient may receive, otherwise equipment is unrecovered. The 70% tank/artillery rate, source zeroing including AA, 50% personnel reserve, dissolution criteria and all existing effects are unchanged. No unit movement, teleport, controller change or new equipment is created. Runtime proof remains pending.

**§6.4 Morale-collapse override (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, 2026-05-03):** Beyond the 2-of-3 attrition criteria, a fourth dissolution path exists for sustained morale collapse. Each turn, every brigade's `morale_low_streak` increments if its morale is at or below `MORALE_OVERRIDE_THRESHOLD` (15), and resets to 0 if morale rises above `MORALE_OVERRIDE_RESET` (20). When `morale_low_streak` reaches `MORALE_OVERRIDE_TURNS` (8), the brigade dissolves on the next dissolution check regardless of personnel count, cohesion, or equipment. Historical justification: sustained morale collapse historically dissolved units regardless of nominal strength (cf. JNA dissolution dynamics 1991–92, ARBiH 5th Corps wavering through Bihać pocket 1994). Reconstitution and replacement intake cannot reverse a brigade once this counter trips; the unit is removed from order of battle and its personnel are returned to the faction manpower pool. **Save/load contract:** `morale_low_streak` is persisted on FormationState; absent on legacy saves it deserializes to 0. **Implementation gate:** dissolution path gated behind environment flag `MORALE_OVERRIDE_ENABLED` (default `false`). With the flag off, the streak counter still increments (diagnostic-only); only the dissolution path is suppressed. The flag is intended to flip after user evidence-review of the streak distribution in production runs.

**Frontline attrition entrenchment reduction:** Passive frontline attrition (sniping, disease, desertion) and bombardment exposure attrition are both reduced by entrenchment. Modifier: `max(0.40, 1.0 - sqrt(entrenchment_turns) * 0.10)` — sqrt diminishing returns matching the combat entrenchment model. At 6 turns: 24.5% reduction. At 20 turns: 44.7% reduction. At 52 turns: 60% reduction (floor 0.40). **Sector-based lookup (n366):** frontline attrition uses `corps_front_sectors` `assigned_brigade_ids` to determine which brigades are on the front (replaces legacy `brigade_front_assignment` + `local_fronts`). Reserves not in any sector territory are exempt. Density modifier: `sector.assigned_brigade_ids.length / sector.length_edges`. Module: `src/sim/combat/frontline_attrition.ts`.

**Siege bombardment attrition (n292): retired 2026-11-17.** Bombardment losses of besieged formations are not modelled; shelling of the besieged fell mainly on civilians, and defender losses come from combat resolution. The retired module (`siege_attrition.ts`) never reached Sarajevo or Bihać (neither is ever a critical-supply pocket), sized its fire from faction-wide average firepower rather than the guns around a pocket, and bled any small isolated pocket every turn; measured alone it put about 10.8k casualties on Goražde and 4.4k on Srebrenica (several times the worst ground battle) and none on Sarajevo. See SB1 in the final-behaviour record.

**State (per brigade):** location_osid, entrenchment_turns, defense_streak, disrupted_turns, movement_state, **garrison** (boolean; see below). **Invariant:** No single resolution flips more than one OSID.

### 7.5 Officer system (two-tier)

**Implementation-note (2026-03-03):** The officer system models the Bosnian War's defining military inversion: VRS inherits the JNA professional officer corps (can't replace losses), ARBiH starts with almost zero trained officers (learns fast), HVO gets a trickle from Zagreb (political appointments undermine competence). Two tiers interact multiplicatively.

**Tier 2: Brigade officer quality.** Per-brigade `officer_quality` stat on FormationState [0.05, 0.90]. Initialized from OOB data (`initial_officer_quality`) or faction default (`getFactionDefaultOfficerQuality`: RS starts 0.55 decaying, RBiH starts 0.05 growing, HRHB constant 0.225). Growth from combat experience (`COMBAT_GROWTH_BASE=0.01/turn`) and frontline presence (`FRONTLINE_GROWTH_BASE=0.005/turn`), diminished at high quality (`× (1.0 - quality × 0.5)`). Loss from casualties (`casualtyRatio × 1.5 × (1.0 - quality × 0.3)`). Faction learning rates: RBiH 1.5×, RS 0.7×, HRHB 1.0× (from `war_timeline.officer_config`). VRS brain drain: `-0.001/turn` after w40. Pipeline step: `update-officer-quality` (after `update-sector-offensive-results`, before `evaluate-brigade-decorations`). Module: `officer_quality_update.ts`. **Implementation-note (OOB seeding 2026-03-08):** Historically distinguished brigades are seeded with modestly higher `initial_officer_quality` in OOB data: ARBiH Slavna units 0.10 (vs default 0.05), Viteška units 0.15; RS decorated units 0.60–0.62 (vs default 0.55). HRHB Guards receive no early seed (available_from: 80+, mid-war spawns). Army HQ formations (`vrs_main_staff`, `hvo_main_staff`, `arbih_general_staff`) are now also seeded: VRS oq=0.75/coh=72, HVO oq=0.50/coh=65, ARBiH oq=0.12/coh=38/morale=45. Fields flow through `OobCorps` → `oob_early_war_entry.ts` → FormationState. See report [20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md](../40_reports/implemented/20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md).

**Tier 1: Named officers (corps and above).** 63 historical officers loaded from `data/scenarios/officers/apr1992_officers.json` via `init_officers` scenario field. Each officer has competence (1–5), aggressiveness (1–5), defensiveness (1–5), political_reliability (1–5), casualty_vulnerability [0,1], origin (jna/hv/to/militia/foreign/political), pool_tier (starter/tier_a/tier_b/tier_c). State: `named_officers` on GameState (Record of NamedOfficerState with status, assignment, turns_in_command, battles, victories). Module: `officer_system.ts`.

**Corps combat modifier:** `getCorpsCommanderAttackMod = 0.90 + comp×0.03 + agg×0.01`; `getCorpsCommanderDefenseMod = 0.90 + comp×0.03 + def×0.01`. Acting commanders (generic replacement during delay): flat 0.92. Assignment penalty: incompatible corps = -2 competence for 12 turns; compatible but not home = -1 for 8 turns.

**Succession:** On departure (end of availability window) or casualty (cumulative tenure exposure: an engaged corps commander falls when `casualty_vulnerability × 0.1 × turns_in_command ≥ 1`, at most one per corps per turn), the corps is refilled. **Corps schedule (§5E, 2026-11-14):** `data/scenarios/corps_co_roster.json` names the holder of each corps by dated tenure; the scheduled holder fills a vacancy first, takes over from a fallback holder when his tenure starts (a generic acting commander retires, a named one returns to the reserve), and is never imposed over a commander the President appointed, accepted or kept; a manually controlled player receives a replacement matter instead of any swap or transfer. The fallback never re-picks an officer the schedule relieved from that corps. An officer the schedule records as surviving the war does not accrue the exposure clock; historical deaths and reliefs are scheduled data. The file ships empty (mechanism inert); the dates are the post-freeze calibration pass. **Reorganisation handover (RF-1 Phase B, 2026-11-15):** a `commander_handover` event (see "Corps reorganisation" in §6.4) seats its officer in a corps once; ordinary succession then refills the command he left. It has the schedule's protections: it never displaces an incumbent the President appointed, accepted or kept (the handover lapses), and for a manually controlled player it raises a replacement matter and is receipted only after his decision. It is never an automatic swap. The only shipped handover seats Mehmed Alagić in the ARBiH 7th Corps at week 99. When the schedule has no free holder, the best available pool officer replaces the departing commander. Pool priority: starter > tier_a > tier_b > tier_c; within tier: highest competence; tie-break by officer ID. Faction-specific rules: (a) HVO sorts by political_reliability first (modeling Zagreb political appointments); HVO replacement delay 4 turns (political) / 1 turn (combat death). (b) VRS has no pool regeneration (JNA corps is finite). (c) ARBiH regenerates pool officers every 12 turns (modeling battlefield promotion of NCOs/TO veterans). Generic officers created when pool exhausted. Pipeline step: `officer-succession` (after `tick-elite-loans`, before `generate-war-stories`).

**Operation commander (2026-03-07):** Named operations receive a dedicated commander from the reserve officer pool. Selection priority: home_corps_id match (regional), then compatible_corps_ids, then any reserve officer — sorted by competence, aggressiveness, then ID. During execution phase, participating brigades use the operation commander's modifier instead of the corps commander's (chain-of-command isolation). Commander assigned on operation creation (pre-planned, triggered, bot-generated, queued injection); released to reserve on operation completion. State: `CorpsOperation.commander_officer_id`, `NamedOfficerState.assigned_operation`. Combat integration: `getThreeTierOfficerMod` checks operation commander before corps commander. Module: `officer_system.ts` (`selectOperationCommander`, `assignOperationCommander`, `releaseOperationCommander`). Report: [20260307_OPERATIONS_COMMANDER_FEATURE.md](../40_reports/implemented/20260307_OPERATIONS_COMMANDER_FEATURE.md).

**Implementation-note (head-queue roster reservation, 2026-09-16):** The command-selection reservation for the next queued historical operation (`getHeadQueuedPrePlannedBrigadeIds`) excludes that operation's authored roster from new commander-generated operations only once the plan is due — when `(enqueue_from ?? available_from ?? 0) <= meta.turn` (missing timing defaults to due). It covers the commander's probes and local occupation and, since RF-L3d (2026-11-15), its plans and plan operations too; before RF-L3d the plan path did not apply it (see "Pre-planned operations have one launcher" in §6). A queue head whose `available_from` is still in the future is not preparing and must not freeze its roster. Active-operation ownership remains handled separately by the caller, and the full-queue routing helper (`getQueuedPrePlannedBrigadeIds`), task-group donor-consumption protection (`getReservedPrePlannedBrigadeIds`) and recruitment/assembly placement (`getActiveAuthoredAssemblyOsid`) are unchanged. Being released from this reservation does not make a formation automatically surplus, ordered to move, or guaranteed to participate.

**Calibration implementation note (2026-09-27, provisional):** The current `Prozor–Rama Line Counterattack` catalog entry has `available_from: 71`, an owner-approved scenario inference without a dated source for an August–September 1993 Lug/Paroš counterattack. Its authored HVO roster, objectives, and combat resolution remain ordinary operations. In the measured April 1992 campaign, this timing permits an RBiH combat capture of Doljani at turn 57 while Ljubunci, Lug, and Paroš are HRHB at week 104. The owner provisionally accepted the measured timing despite a week-105 Central Bosnia critical anomaly. The full suite and 188-week checkpoint verifier ran and failed, so adoption remains pending. See `docs/40_reports/CALIBRATION_MASTER.md` for the run evidence. This note does not change painted references, control authority, or the historical-source status of the inferred date.

**Authored-operation coordination (updated 2026-10-23):** `enqueue_from` admits a dated plan to its corps queue separately from `available_from`, which still gates launch. Operations sharing `sync_operation_name` may count the eligible formations of an executing peer at the same objective for attack readiness; each corps operation retains its own ownership and AAR. `coordinated_advance` is an optional opportunity-to-operation value. When true, a decisive operation-owned victory may advance one admitted same-axis supporting attacker alongside the lead attacker, capped at two formations and still guarded by the ordinary attack resolver. Mistral 2 is the validated authored opt-in. A dated `external_support` row affects OSID attack power and prediction only when it has `role: attack`, `osid_attack_support: true`, the target municipality, and a turn in its half-open `[start_turn, end_turn)` window. None of these fields writes political control or establishes historical actor attribution.

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

**Authored subordinate delivery (opt-in):** An operation may explicitly persist `preparation_probe_delivery: 'subordinate'`. Only an authored operation carrying that capability materializes its preparation request as a normal subordinate `CorpsOperation`; an absent capability retains the legacy in-place request and auto-resolution path. The child shares the exact planning parent's slot, exclusively owns the selected brigades, spends a full planning turn, and remains subject to ordinary order and combat gates. A real exact-target battle grants the existing single probe credit and exhaustion charge. Recovery restores surviving brigades to their recorded parent axes before the parent resumes, and the child writes a linked AAR without a second exhaustion charge. While the exact child remains live, the parent preserves its request and detached roster and consumes exactly one preparation-clock unit at its normal visit; it does not assess readiness, clear/reissue the request, or launch against detached ownership.

**Anti-paralysis safety valve:** If `preparation_turns_elapsed ≥ preparation_max_turns` and the commander hasn't issued `launch`, the system forces a launch to prevent indefinite preparation stalls.

**`planning_duration` march/preparation budget:** `preparation_max_turns` is initialised as `max(getPreparationMaxTurns(aggressiveness), op.planning_duration ?? 0)` so authored routes retain their full deterministic assembly and anti-paralysis window. The value is not a mandatory staff delay after readiness: after one full planning turn, an operation whose preparation and participant/opening-attack gates are ready may enter execution before the budget expires. If readiness never arrives, budget expiry opens the existing forced-attempt or named-recovery path rather than allowing indefinite planning. `force_launch` remains the only player-directed bypass of readiness; early readiness never bypasses `CorpsOperation` ownership.

**Postponement:** Commander may postpone (up to `MAX_POSTPONEMENTS=2`), resetting the assessment sub-phase while preserving accumulated intel and readiness.

**State fields on CorpsOperation:** `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `intel_confidence_at_assessment`, `supply_readiness_at_assessment`, `force_ratio_estimate`, `commander_assessment`, `postponement_count`, `active_probe: OperationActiveProbe`.

**Types:** `PreparationSubPhase`, `CommanderAssessment`, `OperationActiveProbe` defined in `game_state.ts`.

**Pipeline integration:** `tickPreparation()` is called from `advanceSectorOffensives()` (step `advance-sector-offensives`). Operations in preparation do not enter execution until `preparation_sub_phase === 'ready'`. `PreparationEvent` records are collected for turn reports.

**Player UI:** Commander Selection Modal (`CommanderSelectionModal.tsx`) — officer roster with competence/aggressiveness display, regional fit scoring (home/compatible/out-of-region), preparation time estimates, availability checks (KIA, captured, enclave lock, already assigned). Operation Briefing Modal (`OperationBriefingModal.tsx`) — readiness gauges (intelligence, supply, force cohesion), force ratio estimate, commander assessment badge, action buttons (Launch, Order Probe, Postpone, Abort). Store contexts in `gameStore.ts`; adapter mapping in `GameStateAdapter.ts`.

**Constants:** `PROBE_FORCE_COMMITMENT_FACTOR=0.4`, `COUNTER_PROBE_CONFIDENCE_GAIN=0.15`, `PROBE_EXHAUSTION_COST=5`, `MAX_POSTPONEMENTS=2`. All constants inline in `operation_preparation.ts`.

**Determinism:** Sub-phase advancement is pure arithmetic. Probe selection uses sorted iteration. No randomness.

**Lifecycle and AAR receipt ownership (2026-07-12):** A shared projection labels proposed, planning, executing, recovery, completed, and archived operations from active state plus raw history. It preserves stable row IDs, includes player-generated operations, and accounts for every raw history row as visible or explicitly excluded. Operation completion and AAR finalization have one simulation owner. Objective credit requires an attack-backed weekly capture receipt; control held at close is not causal capture evidence. Grading consumes the canonical operation attack-attempt count. Zero attempts produce a one-star `No Assault Attempted` verdict with zero duration efficiency and no duration star bonus. Advance verdicts require causal objective credit. The ending-force-versus-start grade factor is clamped to `[0, 100]` so reinforcements cannot inflate it above 100. Records is the complete operational ledger. Chronicle is narrative memory and emits exactly one narrative entry per visible completed operation, without duplicating the ledger or its receipts.

**Module:** `src/sim/combat/operation_preparation.ts`. Tests: `tests/probe_preparation.test.ts` (30 tests).

#### 7.6.1 Intel-Gated Operation Launch

Before launching any new operation, the corps AI checks intel confidence across all sectors against a faction-specific threshold (`INTEL_GATE_LAUNCH_THRESHOLD`): RS 0.25, RBiH 0.40, HRHB 0.30. If the worst sector's confidence is below threshold, a sector-scoped probe is launched instead of a full corps-level attack: max 2 brigades, 1-turn planning, `repulsed` minimum attack outcome. Full operations use `evaluateCorpsOffensiveLaunch` with corps-wide brigade pool and contiguity from all corps sectors.

**RS blitz exemption:** During the RS blitz phase (w0–12), JNA pre-planned operations bypass the intel gate entirely — they attack blind, reflecting inherited JNA operational plans.

**Probe commitment limit:** `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2`. After two consecutive probe operations on the same sector, the corps commits to a full attack regardless of intel confidence. The counter (`CorpsCommandState.consecutive_probes`) resets when a full attack launches or the operation completes. **KNOWN ISSUE (n1194):** `getSectorIntelConfidence()` returns the mean confidence across all enemy sectors rather than per-sector-pair freshness, causing redundant probes against already-scouted sectors. The forced commitment after 2 probes contradicts the purpose of reconnaissance — if intel reveals the enemy is stronger, the correct response is to defend, not attack. Planned fix: per-sector-pair probe freshness tracking; remove forced commitment or gate it on predicted outcome.

**Attack threshold:** `getSectorOffensiveProbeThreshold()` returns `'costly_victory'` (power ratio >= 1.0) as the default minimum predicted outcome for launching a sector offensive, or `'stalemate'` (ratio >= 0.7) once the axis momentum is 2 or more, unless the operation carries its own `min_attack_outcome`. It binds bot-launched sector offensives only; real offensives often failed, so the floor is not a claim that attacks happen only when favourable. The earlier known issue (n1194: a 0.7 default let corps attack into predicted losses) is resolved by this default.

**Decision flow:** `getSectorIntelConfidence()` (in `sector_intel.ts`) reads the maximum confidence from sector intel records. `shouldLaunchProbeInstead()` (in `bot_corps_directives.ts`) checks faction threshold, RS blitz exemption, and the probe counter. If true, the operation downgrades to a probe; otherwise, normal sector_attack proceeds.

**Bot AI integration:** (a) Corps commander aggressiveness modifies directive aggression: `shift = (aggressiveness - 3) × 0.05`. High-competence (≥4) commanders accept riskier attacks (min_attack_outcome downgraded to costly_victory). Module: `bot_corps_ai.ts`. (b) ARBiH warlord friction (pre-w78): for each corps with 2+ attackers, the `(turn % brigadeCount)`-th attacking brigade forced to defend. Deterministic, no probability. Module: `bot_brigade_ai_osid.ts`. (c) VRS Mladić override: pre-planned `general_offensive` operations in execution phase use army commander modifier instead of corps commander. Module: `combat_math.ts` (`getThreeTierOfficerMod`).

**War timeline integration:** Per-faction `officer_config` in `war_timeline` JSON: learning rates, brain drain parameters, pool regeneration intervals, Zagreb cadre timing, warlord friction end week, generic replacement competence. All constants read from timeline with hardcoded fallback.

**Manual assignment:** Players may manually reassign officers from the reserve pool to active Corps via the Warroom Faction Overview. Reassignment triggers a 2-turn penalty (Acting commander status), modeling transition friction. This uses the `assign-commander` IPC channel.

**Determinism:** casualty exposure is state-derived arithmetic (`casualty_vulnerability × 0.1 × turns_in_command`), no hash or Math.random; the corps schedule is validated and sorted at load. Sorted iteration via `strictCompare`. Growth/loss rates are pure arithmetic. Assignment penalties are lookup-based. Warlord friction uses `turn % brigadeCount`.

**Phase E GUI (2026-03-03):** Tactical map FormationDetail panel shows **Command** (brigade officer quality bar, corps/army commander name and Acting status) and **Recent command changes** for corps when the last turn report includes `officer_succession`. Warroom FactionOverviewPanel lists officers in a COMMAND subsection; NewspaperModal appends officer succession lines (replacements, casualties, departures) to AAR body. Main process sends `turn-report-updated` to both renderers after advance-turn; see DESKTOP_GUI_IPC_CONTRACT.

**Phase 4/5 GUI OVERHAUL (2026-03-20):** The tactical map adds an **optional Deck.gl overlay** (`src/ui/map/layers/`: `buildTacticalDeckLayers.ts`, `composeTacticalDeckLayers.ts`, `deckLayerCapabilities.ts`). **`DEFAULT_DECK_LAYER_CAPABILITIES`** sets **`deckFormationCounters: true`** — **Deck.gl** formation counters are the default render path; MapLibre `formation-markers` / `formation-labels` are hidden to prevent double-draw. Deck.gl supplies zoom-dependent scaling (16px @ Z6 to 40px @ Z14) and enrichments (health bar, supply dot, status icons, stack badges, op/disrupted glow rings). Setting `deckFormationCounters: false` restores MapLibre symbol layers as a fallback. **Major-municipality labels:** `buildMajorCityLabelGeoJSON.ts` + source `major-city-labels` (no strategic “Points” layer). Standardized on the **SVG Icon framework** (`Icon.tsx`) for UI chrome and **Open Sans** for map typography where applicable.

**Ops Planning Modal 3D + Deck.gl (2026-03-20):** The ops planning modal renders a **3D terrain map** (pitch 30, `setTerrain` with `terrain.pmtiles` at 2.5x exaggeration from Copernicus 30m DEM). Advance arrows use **Deck.gl PathLayer** (animated marching dashes via `PathStyleExtension`) + `PolygonLayer` arrowheads + `TextLayer` labels on a `MapboxOverlay`. **Staging/objective selectability constraints** enforce front-edge adjacency (non-selectable OSIDs dimmed 45%). **Terrain-aware camera** aligns bearing from friendly→enemy centroid. **Terrain tooltip** on hover shows elevation (m), terrain type (Flat/Forest/Hilly/Mountain), defense bonus (+15%/+30%/+50%), river crossing and road access warnings. Data: `loadTerrainScalars()` from `settlements_terrain_scalars.json` (6,137 SID entries). `ModalMapSource` utility enforces remove+re-add pattern for all modal map dynamic sources.

**Combat Effectiveness Display (2026-03-20):** `combatEffectiveness.ts` computes a composite combat power number visible at every hierarchy level. **Brigade:** `base (personnel x equipment x experience x cohesion x honor) x fatigue x officer x homeDistance x morale x disruption x supply` — displayed with worst-modifier callout. **Sector:** aggregate of assigned brigades. **Corps:** total + letter grade (A ≥85% avg mod, B ≥70%, C ≥55%, D ≥40%, F <40%) + weak/disrupted counts. **Army:** whole-army aggregate. Personnel always visible alongside. **Terrain info** merged into `osidPropertiesMap` at map init: elevation, slope, friction, road access, river penalty. Settlement panel shows terrain type badge with defense modifier.

Report and surviving implementation authority: [20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md](../40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md). The earlier `OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md` is no longer present in the current tree.

**Tactical-group donor routing (2026-08-26):** preparation receives the canonical operational
adjacency graph. A donor may route through politically friendly-controlled rear-area OSIDs;
an intermediate OSID need not contain a brigade. Donor iteration and BFS remain stable.
Personnel lent is distance-scaled and capped at the strength above the formation-kind residual
floor. A donor at the floor lends zero; a stronger donor may lend a reduced amount rather than
being rejected wholesale.

### 7.7 Army HQ Reserve Pool (Elite Brigade Loans)

**Implementation-note (2026-03-15, new in v0.7):** Army-level elite brigades can be temporarily loaned to corps commanders. The system models strategic reserve deployment at the army level — corps request reinforcements, army AI evaluates feasibility and priority, then auto-assigns (bot) or surfaces unresolved requests to the player panel.

**Loan lifecycle:** Op-tied (no hard timer). A brigade stays on loan until:
- Operation concludes and need evaporates → `op_complete` or `need_expired`.
- Player manually recalls → `player_recall`.
- Ordinary force-recall conditions → `casualty_threshold` (personnel below 70% of loan-start strength), `morale_collapse` (morale < 35), or `cohesion_collapse` (cohesion < 25).
- While an elite is authored for a historical operation in planning, execution, or recovery in the receiving corps, these three recalls are deferred until the operation releases it.
- `permanent_degradation` (personnel below 50% of loan-start strength) always recalls immediately and permanently removes elite-loan eligibility; authored operations cannot defer it.

Elapsed turns alone are not a recall condition. A healthy brigade supporting an active operation remains loaned beyond turn 12 or any other fixed duration; only the lifecycle conditions above may end the episode.

**Request priority scoring:** Corps submit `ArmyReserveRequest` with a reason (`offensive_support`, `defensive_gap`, `exploitation`, `enclave_relief`). Raw priority is computed from operational need; geographic penalty (BFS hop distance from nearest available brigade to requesting corps) reduces the effective priority. `MAX_AUTO_DEPLOY_HOPS = 8` — bot AI will not auto-assign a brigade beyond this distance.

**Implementation-note (request matching and movement continuity, 2026-07-15):** Feasible request-to-elite edges are matched globally in deterministic priority/corps/brigade order, so one brigade cannot be suggested to multiple simultaneous requests and one request receives at most one brigade. Once loaned, an elite formation outside the receiving corps territory retains or reacquires a legal column-movement order until it arrives, is recalled, or the loan otherwise ends.

**Operation commitment timing (2026-08-27):** Before bot brigade orders are generated, each live loan is reconciled into the receiving corps's first execution-phase operation when it is not already committed to any live operation. This reconciliation does not require spatial data; adjacency is required only for generating and evaluating new reserve requests. The post-combat loan tick owns recall thresholds and episode accounting and does not retroactively rewrite the operation roster after orders or battles.

**Constants:**
- `ELITE_LOAN_MIN_DURATION = 6` — minimum turns before voluntary recall (prevents thrash).
- `ELITE_LOAN_COOLDOWN = 4` — turns between loans for the same brigade.
- `ELITE_CASUALTY_THRESHOLD = 0.30` — loss beyond this fraction triggers ordinary forced recall, subject to the authored-operation exception above.
- `ELITE_MORALE_RECALL = 35` — morale floor for forced recall.
- `ELITE_COHESION_RECALL = 25` — cohesion floor for forced recall.
- `ELITE_DEGRADATION_THRESHOLD = 0.50` — loss beyond this fraction permanently degrades elite-loan eligibility and forces immediate recall.
- `ELITE_REINFORCEMENT_RATE = 0.50` — reinforcement rate when returned to army HQ pool.

**Tracking:** Per-brigade `EliteBrigadeTracker` records cumulative loan episodes (`EliteLoanEpisode`) with corps, reason, turns deployed, casualties taken, battles fought, OSIDs captured, and KIA inflicted. `EliteLoanState` on each eligible formation tracks current loan status, start personnel, and degradation.

**State:** `elite_loan_states` (per formation), `elite_brigade_trackers` (per brigade), `pending_reserve_requests`, `reserve_request_history`. Pipeline steps: `generate-army-reserve-requests` reconciles live loan commitments before `generate-bot-brigade-orders`, then generates/evaluates new requests when spatial adjacency exists; `tick-elite-loans` runs post-combat before `officer-succession` for recall and tracking. Module: `src/sim/combat/army_reserve_system.ts`. Types: `src/state/elite_loan_types.ts`. `pending_reserve_requests` and `reserve_request_history` are required persisted save/load arrays as of save schema v28; legacy saves materialize empty arrays. Triggered-operation bookkeeping records `triggered_operations_accepted`, `declined_operations`, and `used_operation_names` are required persisted save/load records as of save schema v29; legacy saves materialize empty records and current saves validate turn/count values as non-negative integers. Officer decision queues `pending_officer_events` and `officer_decision_history` are required persisted save/load arrays as of save schema v30; legacy saves materialize empty arrays and current saves validate conservative row shape without changing officer behavior. Consequence runtime queues `cascade_penalties`, `offensive_ops_suppressions`, `alliance_locks`, and `bot_priority_shifts` are required persisted save/load arrays as of save schema v31; legacy saves materialize empty arrays and current saves validate conservative row shape without changing consequence behavior.

### 7.8 Army HQ Gathering (Adaptive Doctrine)

Army HQ gathering follows the existing deterministic staff-execution boundary: it includes the selected player faction at autonomy 1 and above, excludes that faction at manual autonomy 0, and includes all factions in headless auto-control. Producing a campaign plan does not authorize or launch an operation; existing presidential authorization gates still apply. The phase retains its RS → RBiH → HRHB evaluation order.

**Implementation-note (2026-03-17, v0.4.7):** Periodic army-level command meetings (`evaluateArmyHQGathering`, step 134 in `war_phases.ts`) produce multi-turn `CampaignPlan` objects stored on `state.military.campaign_plans`. After the first gathering, adaptive doctrine overrides replace calendar-driven `doctrine_phases` — attack share, aggression, corps stances, and front priorities are derived from the campaign plan rather than from the timeline JSON. Front priorities (`primary` / `secondary` / `economy` / `contain`) are consumed by `generateCorpsDirectives()` to weight offensive targeting. Synchronized multi-corps operations use a `waiting_for_sync` preparation sub-phase so that participating corps begin execution simultaneously. Module: `src/sim/combat/army_hq_gathering.ts`. Types: `src/sim/combat/army_hq_gathering_types.ts`. Constants: `src/sim/combat/army_hq_gathering_constants.ts`. 54 new tests. Report: [20260317_ARMY_HQ_GATHERING_V047.md](../40_reports/implemented/20260317_ARMY_HQ_GATHERING_V047.md).

### 7.9 AI Commander System

**Implementation-note (2026-03-18, v0.4.9):** Optional AI command layer in `src/sim/ai_commander/` (14 files, ~1,683 lines). Provides LLM-assisted army and corps decision-making, plus narrative features (corps dialogue, battle narratives, war dispatches) with structured output parsing and deterministic fallback.

**Four modes** (`AiCommanderMode` in `ai_config.ts`):
- **cadet** — formula-only (default). No API calls. Deterministic heuristic decisions. All model routing set to `'formula'`. Narrative features hidden.
- **recruit** — Haiku for all decisions and narrative. Cheapest API tier (~$3/game).
- **officer** — Sonnet for army/advisor, Haiku for corps and narrative. Balanced cost/quality (~$5/game).
- **commander** — Opus for army/advisor/corps-ops, Haiku for corps routine and narrative. Maximum strategic depth (~$14/game).

**Core modules:** `ai_types.ts` (shared types: `ArmyDecision`, `CorpsDecision`, `AdvisorResponse`, `AiPrompt`), `ai_config.ts` (mode routing, defaults, constants), `ai_client.ts` (`AiClient` interface + `createAiClient()` factory), `anthropic_client.ts` (Anthropic SDK wrapper), `army_commander_ai.ts` (army-level decisions: corps stances, operation approvals, reserve deployment), `corps_commander_ai.ts` (corps-level: sector stances, operation plans, brigade movements), `player_advisor.ts` (situation analysis and recommendations for human players), `prompt_builder.ts` (game state → structured prompt), `response_parser.ts` (LLM output → validated game types), `personality_profiles.ts` (historical commander personality templates), `decision_log.ts` (replay determinism).

**Narrative modules (v0.4.9):** `corps_dialogue.ts` (corps commanders respond to orders in character — acknowledgment, concerns, confidence), `aar_narrative.ts` (significant battles narrated by officers — queue-then-generate pattern), `war_dispatches.ts` (monthly dispatches from UNHCR/NATO/civilian/diplomatic perspectives using actual game data, including cumulative displacement aggregates plus a bounded 4-turn recent displacement cue). All narrative output is **cosmetic-only** — stored on `MilitaryState` but never read by simulation logic.

**Stance override:** AI army decisions are respected by `generateCorpsStanceOrders()` in `bot_corps_stance.ts` — AI-chosen corps stances override the formula-driven defaults.

**Decision log:** `CommandDecisionLogEntry` records turn, level, faction, decision payload, model used, token counts, and latency. Enables replay determinism — logged decisions can be replayed without API calls. Module: `decision_log.ts`.

**Pipeline steps** (in `war_phases.ts`, after combat resolution):
- `ai-army-decisions` — per-faction army-level decisions (existing since v0.4.5)
- `ai-corps-decisions` — per-corps operational decisions (existing since v0.4.5)
- `ai-corps-dialogue` — corps commanders respond to orders in character (v0.4.9)
- `ai-battle-narratives` — generates narratives for queued significant battles (v0.4.9)
- `ai-war-dispatches` — monthly humanitarian/military/civilian/diplomatic dispatches (v0.4.9, every 4 turns)

**GameState fields** on `MilitaryState`:
- `ai_decision_log?: CommandDecisionLogEntry[]` — replay log
- `ai_army_decisions?: Record<FactionId, ArmyDecision>` — current turn army decisions
- `corps_dialogues?: CorpsDialogueEntry[]` — current turn officer responses (cleared each turn)
- `battle_narratives?: BattleNarrative[]` — rolling buffer of 20 battle stories
- `narrative_queue?: NarrativeQueueEntry[]` — pending battles for narrative (cleared after generation)
- `war_dispatches?: WarDispatch[]` — rolling buffer of 10 dispatches

**IPC handlers** (Electron desktop): `set-ai-commander-config`, `get-ai-commander-config`, `get-advisor-recommendation`. Preload bridge on `window.awwv`.

**UI components:** `AiSettingsPanel.tsx` (API key + mode selector), `AiAdvisorPanel.tsx` (on-demand advisor overlay), `CorpsDialoguePanel.tsx` (officer reports with confidence indicators), `WarDispatchPanel.tsx` (archival dispatch display with perspective-colored borders).

**QA tool:** `npm run sim:qa:commanders` — runs headless scenario with AI commander diagnostics.

**Temperature:** Fixed at 0 (`AI_TEMPERATURE = 0`) for deterministic outputs. All constants in `ai_config.ts`.

**Implementation-note (Claude-API persona-roleplay QA mode, 2026-05-07):** A separate Claude-API persona-roleplay path exists alongside the four `AiCommanderMode` modes above as an opt-in, env-flag-gated QA harness (president / army CO / corps CO layers). It is **default-OFF**, **byte-stable** when disabled, and **telemetry-only** — emits to gitignored `data/derived/_debug/` artefacts and **does not affect deterministic engine state or GameState**. The deterministic AI commander (and `cadet`/formula path) remains the canonical engine path; persona-roleplay is QA-only. Authoritative spec: `docs/10_canon/FORAWWV.md` §XII (env-flag schema, mid-run auto-swap, suppressors, signal-quality empirics, cost calibration).

### 7.10 Conditional Events

**Implementation-note (2026-03-18):** Historical events can now specify game-state conditions that must be satisfied before firing. Events without conditions continue to fire by week range as before (backward compatible).

**EventCondition type** (selected variants in `src/sim/events/event_types.ts`; use the type and loader vocabulary for the complete set):
- `territory_control` — faction controls municipality/OSID above threshold
- `alliance_below` / `alliance_above` — RBiH-HRHB alliance level check
- `faction_controls_municipality` — faction controls ≥threshold fraction of municipality OSIDs
- `operation_completed` — named operation matching pattern has completed; optional `min_attacks` requires recorded combat attempts
- `operation_attacked` — matching operation has recorded at least one attack (or `min_attacks` if supplied); reads live execution, completed AARs, and player-halted attack records, so a merely queued or planned operation does not qualify
- `and` / `or` / `not` — logical combinators (recursive)

**Evaluator:** `evaluateCondition(condition, state)` — recursive evaluator in `event_types.ts`. Called from `shouldEventFire()` when an event's trigger includes a `condition` field. Returns boolean.

**Effect application (§6 E1, 2026-11-16):** A firing event applies its required `effect` and then every entry of its optional `effects[]`, each once (`collectEffects`). An `effect` must not be repeated inside `effects[]`. The loader rejects any row or response option whose `effect` equals an `effects[]` entry by key-sorted content (`validateNoRepeatedEffect`, `stableStringify`). Until E1, 27 automatic cards repeated it, so the engine applied those effects twice while the card showed them once. The event card lists a mechanical `effect` together with `effects[]`, as the engine applies them.

**Terminal follow-up persistence (2026-09-27 candidate):** If play ends before the next turn, `writeOwedRecordsAtTermination` writes only once-only, no-choice, no-pressure event rows whose single-turn window opens immediately next turn, all prerequisite events have fired, at least one prerequisite fired on the terminal turn, and every prerequisite window closes on that terminal turn. The row must still pass its normal eligibility checks. It is stamped at that retrospective opening turn before the terminal save and endgame snapshot are finalized. It does not advance combat, offer a decision, or evaluate unrelated future events. The write is idempotent across war-pipeline and desktop persistence paths.

**Converted events** (in `data/scenarios/events/war_1992.json`):
- `operation_corridor_1992` — fires when RS controls ≥50% of Brcko municipality (w12-22)
- `jajce_falls_1992` — fires when RS controls ≥50% of Jajce municipality (w30-40)
- `concentration_camps_revealed_1992` — fires when RS controls ≥50% of Prijedor municipality (w18-28)

#### §7.10.1 v0.6.0 Expanded Condition Types

14 additional condition types added to `EventCondition` union in `event_types.ts`:

| Type | Parameters | Evaluates |
|------|-----------|-----------|
| `territory_percentage` | faction, comparator (above/below), threshold | Fraction of all OSIDs controlled by faction |
| `dimension_above` | faction, dimension, threshold | `strategic_dimensions[faction][dimension].effective_value >= threshold` |
| `dimension_below` | faction, dimension, threshold | Same, `< threshold` |
| `flag_equals` | flag, value | `event_flags[flag] === value` |
| `flag_not_set` | flag | `!(flag in event_flags)` |
| `patron_pressure_above` | faction, threshold | `patron_relationships[faction].override_authority >= threshold` |
| `war_crimes_above` | faction, threshold | `capital[faction].war_crimes_events >= threshold` |
| `morale_average_below` | faction, threshold | Average morale of active brigades < threshold |
| `week_since_event` | event_id, min_weeks?, max_weeks? | Weeks since event last fired within range |
| `event_fire_count` | event_id, min_count?, max_count? | Event fire count within range |
| `enclave_supply_status` | municipality, status | Placeholder — deferred to supply integration |
| `corridor_severed` | from_osid, to_osid, faction | Placeholder — deferred to BFS integration |

All combinators (`and`, `or`, `not`) work with all condition types.

#### §7.10.2 Pressure System

Events with a `pressure` config fire through readiness counters instead of direct trigger matching:

```
Each turn:
  1. Check trigger conditions
  2. If met: readiness += base_rate (+ modifier bonuses)
  3. If readiness >= threshold: EVENT FIRES, readiness resets to 0
  4. If conditions NOT met: readiness -= decay_rate (floor 0)
```

`PressureConfig` fields: `base_rate` (increment per turn), `threshold` (fire point), `decay_rate` (decay when conditions lapse), `modifiers[]` (conditional rate bonuses).

Pipeline: `update-event-readiness` step runs BEFORE `evaluate-events` (step ~139 of 142).

Events WITHOUT pressure config use legacy `triggerMatches()` (backward compatible).

#### §7.10.3 Strategic Dimensions

6 per-faction dimensions track cumulative reputation. Hybrid model:

| Dimension | What it measures |
|-----------|-----------------|
| `military_credibility` | Operation outcomes, decisive victories |
| `territorial_legitimacy` | Holding claimed territory, historical presence |
| `international_standing` | Inverse of war crimes, UN cooperation |
| `patron_confidence` | Following patron directives |
| `internal_cohesion` | Officer loyalty, civil-military relations |
| `negotiating_leverage` | Weighted composite of the other five |

Each dimension: `base_value` (computed from game state each turn) + `event_modifier` (accumulated from player decisions) = `effective_value` (clamped 0-100).

Stored on `NegotiationState.strategic_dimensions`. Module: `src/sim/events/strategic_dimensions.ts`.

**One accumulator rule (§6 E3a1, 2026-11-17).** Every write to a dimension's `event_modifier` goes through `applyDimensionShift()`: event `dimension_shifts`, command levers, CO replacement, stance matters, scripted patron events (`humanitarian_delta`) and peace-plan rejection (`credibility_change_on_reject`). The accumulator is not clamped. A side at −110 that takes −30 more sits at −140. Only the result is clamped: `effective_value = clamp(base_value + event_modifier, 0, 100)`. Sim readers take `effective_value`, never the raw `event_modifier`.

**One base writer (§6 E3a1).** `computeDimensionBaseValues()` (pipeline step `compute-dimension-bases`) is the only function that writes any `base_value`, through `updateBaseValue()`. `computeNegotiationBreakdown()` (step `compute-negotiation-capital`) only rebuilds the raw capital record, including `peace_plans_accepted/rejected` from `peace_plan_history`. `resolvePeacePlan()` does not push into those lists; the history row is the single source.

**`international_standing` base inputs:**

`base = clamp(50 − war_crimes_events × 10 − paramilitary_finding_penalty − civilian_casualties_caused / 5000 + plans_accepted × 10 − plans_rejected × 15, 0, 100)`

- `war_crimes_events × 10`: the capital war-crimes counter.
- `paramilitary_finding_penalty`: from the faction's latest paramilitary war-crimes finding: 2 / 4 / 5 per deployment for the minor / mid / severe band, plus a 10-point cliff at severe. It is added to the war-crimes term and never replaces it, so a sweep that brings a finding can never raise the base.
- `civilian_casualties_caused / 5000`.
- Plans accepted (+10 each) and rejected (−15 each), counted from `peace_plan_history`.

**Ordinary-player startup initialization (2026-10-25 candidate):** `initializeNegotiationState()` supplies absent negotiation containers and canonical capital/patron entries before the selected faction's foundational decision in Electron and browser startup. It preserves present values, references and partial dimension stores; it performs no derived update. The existing per-turn compute call retains its old initialization position and behavior. Observer/no-player startup, baked snapshots and save migration are unchanged. The retained no-player first-turn crime-counter undercount remains unresolved and cannot be used as moral or historical comparison evidence.

**RBiH opening policy (2026-10-25 candidate):** after the explicit turn-0 identity response, the existing complete command-policy event is presented before first Advance through the ordinary event modal and canonical resolver. All three authored choices and consequences remain intact, with default `ask`, no preselection and historical default `always_deny`. This is an explicit policy decision, not a capture award. Catalog-authored later identity/policy decisions in older saves retain their ordinary response path and do not acquire an early policy queue. Qualification and real packaged calibration remain pending in the controlling Electron-validation plan.

#### §7.10.4 Event Flags and Metagame State

`event_flags: Record<string, string | number | boolean>` on MilitaryState. Set by `sets_flags` on EventDefinition or EventResponseOption. Read by `flag_equals` / `flag_not_set` conditions.

Key flags set by foundational decisions:
- `rs_strategic_goals`: `'all_six'` | `'selective'` | `'aggressive'`
- `rbih_state_identity`: `'civic'` | `'bosniak_national'` | `'pragmatic'`
- `hrhb_political_goal`: `'united_front'` | `'croat_republic'` | `'strategic_ambiguity'`

#### §7.10.5 Recurrence Model

Events can fire multiple times via `RecurrenceConfig`:
- `max_fires`: maximum fire count (replaces binary `once`)
- `cooldown_turns`: minimum turns between firings
- `escalation`: `'static'` | `'escalating'` | `'deteriorating'` (how stakes change)

Response options can have `available_from_fire` / `unavailable_after_fire` to change available choices on each recurrence.

#### §7.10.6 Event Constraint Bus

`event_constraints` on MilitaryState. Three constraint types:
- `operation_blocks[]`: `{ faction, expires_turn, reason }` — blocks new operation launches
- `doctrine_overrides[]`: `{ faction, forced_stance, expires_turn, reason }` — forces corps stance
- `scope_restrictions[]`: `{ faction, allowed_municipalities?, blocked_municipalities?, expires_turn?, reason }` — filters offensive targets

Checked by `bot_corps_directives.ts` via `isOperationBlocked()` and `filterByScope()` from `event_constraints.ts`.

#### §7.10.7 Bot Decision Logic

`pickBotResponseV1()` in `bot_response.ts`. Personality-weighted scoring:

- `historical` / `accept_first`: always picks first option (historical choice)
- `reject_all`: always picks last option
- `personality_weighted`: scores each option as `aggression_affinity × aggrNorm × 2 + (1 - risk_level) × compNorm` where `aggrNorm = (aggressiveness - 3) / 2` and `compNorm = (competence - 3) / 2`

Bot factions always pick historical option for foundational decisions.

**Emergent political decisions keep history while the war is historical (B5 2026-11-16).** In `decision_mode: 'emergent'` a bot faction's response to a faction-attributed event and its scored peace-plan answer go through the political scorer (`scorePoliticalOption`). Where the event has an authored historical response (`historical_default_response_id`, or `accept_first` logic), or the plan has a `historical_responses` entry, the bot keeps it unless both hold: the war's map has left history's territory band, meaning some faction's area share is more than 3 points outside the range its share spans between the two checkpoints either side of the week (the April 1992 starting control, then the painted Jan 1993, Apr 1994, Apr 1995 and Oct 1995 checkpoints; after Oct 1995 the Apr–Oct 1995 band holds; `historical_territory_band.ts`); and the alternative beats the historical response by more than the faction's `divergence_threshold` (RS 3.0, RBiH 3.0, HRHB 1.33; a tie keeps history). The gate is recomputed at every decision and stores no state. "History's band" is read from the painted calibration references (`data/source/calibration/painted_control_*.json`), baked into `HISTORICAL_TERRITORY_CHECKPOINTS` and checked against them by a test: a later paint correction shifts the gate, so re-bake the table and re-measure a hands-off emergent run with it. The peace-plan hard branches (RS territory floor, patron override, Washington alignment, RBiH Owen-Stoltenberg and Dayton) run first and are not gated. Events with no authored historical response are scored as before, including events left unauthored on purpose (the Drina decision, a §6 case). Historical mode, the player's own decisions and the Observer default are unchanged. So a game left alone reproduces the record, and a game the player drives off history's map lets the opponents improvise.

**The gate also opens on politics, per faction (B5 political gate, 2026-11-16).** Besides the territory band, the first condition holds for a bot faction when a political departure has made its history impossible (`political_departure_markers.ts`). A **choice marker** is the player's own pick (an `event_decision_log` row with `decision_source: 'player'`) of a listed departure response: RBiH rejects Vance-Owen (opens HRHB and RS); HRHB rejects Vance-Owen (opens RBiH and RS); RS overrides its Assembly on Vance-Owen (opens RBiH and HRHB); RBiH accepts Owen-Stoltenberg at the Assembly (opens RS and HRHB); on the Contact Group plan, RS accepts, or RBiH or HRHB reject (each opens the other two); HRHB refuses the federation path (opens RBiH and RS). Softer variants ("with modifications", "with reservations") and picks that merely differ from the default are not markers. The **state marker** is the RBiH-HRHB war not having started by turn 80, the last turn of the 1993 war event (read from the engine's record, `rbih_hrhb_state.war_started_turn`): it opens RBiH and HRHB. Markers are read from append-only logs at every decision, so there is no state; left alone (no player rows; the 1993 war fires) none is open. **§6 carve-out:** the political opening never applies to the §6-sensitive decisions: both 1992 paramilitary policies, the 1992 camps, RBiH minority retention, Srebrenica demilitarisation, the HRHB camp exposure, the Drina decision, the 1995 UN hostage crisis, RS compliance under Deliberate Force, RBiH compliance with the 1994 NATO ultimatum, the RS strategic goals, the HVO detention-camp rows, the camp-exposure family, and every Ring-3 sensitive family. Only the territory band can open the gate for them. A completeness test requires every gate-reachable event that the §4 sensitivity classifier flags to be carved out or on a reviewed allow-list (`POLITICAL_GATE_REVIEWED_ALLOWED_EVENT_IDS`: peace-plan answers and political or posture decisions whose options depict no atrocity). Once open, the faction threshold applies as before.

#### §7.10.8 Event Queue

Maximum 4 events per turn. Candidates are sorted by `priority` (lower fires first, default 100), `trigger.turn_min`, then event id. Same-turn `mutex_group` filtering runs after sorting and before the cap: the first candidate in a group remains eligible and later same-group candidates are suppressed for that turn. Events suppressed only by the cap persist as `military.event_overflow_queue` ids in save schema v22, re-enter evaluation on later turns, and are re-gated before they can fire. Mutex-suppressed, stale, phase-blocked, trigger-blocked, recurrence-blocked, cooldown-blocked, or probability-failed ids are not retained in the queue.

### 7.11 Corps Diagnostic Fields

**Implementation-note (2026-03-18):** Per-corps diagnostic state for operation launch debugging and UI status display.

**CorpsStatusReason** type (8 values): `executing_operation` | `density_strained` | `supply_critical` | `no_targets` | `cooldown` | `no_eligible_sectors` | `queued_ops_pending` | `ready`. Stored as `status_reason` on `CorpsCommandState`.

**op_launch_trace:** `string[]` — per-turn gate audit recording why a corps did or did not launch an operation. Each entry uses a `blocked:` or `clear:` prefix (e.g. `blocked:existing_op(Operation Drina:execution)`, `blocked:density_strained(0.120<0.167)`, `blocked:stance(defensive)`, `clear:all_gates_passed`). Consumed by AI commander tools and QA diagnostics.

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

Displacement permanently reduces recruitment and authority. Refugee concentration adds men to the local pool in the short term but accelerates exhaustion, and the host administration pays for absorbing them: under the HRHB refugee compact (§6.6a, A2b note) that cost is a recruitment price, not a gain. Trapped populations increase humanitarian pressure.

### 12.1 Per-municipality displacement routing

Displacement routing uses origin-specific per-municipality tables instead of generic faction-ordered lists. Each municipality maps to a geographic routing region per displaced ethnicity. Routes specify primary destinations (nearest frontline settlements), secondary destinations (regional hubs), and abroad fraction.

**Structure:** 8 geographic regions (Krajina, Posavina/NE, Tuzla Basin, Central Bosnia, Sarajevo, Drina Valley, Herzegovina, Bihać Pocket) × 3 ethnicities (Bosniak/Serb/Croat) × sub-regional routing. See design doc `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8 for complete routing tables.

**Dynamic validation:** At routing time, each destination must be: (1) controlled by displaced person's faction (≥1 OSID), (2) have a friendly brigade present, (3) below receiving capacity. If primary route blocked → secondary → `FALLBACK_ROUTES_BY_FACTION` → abroad.

### 12.2 OSID-level displacement tracking

Displacement state tracks per-OSID granularity:
- `displaced_out_by_osid: Record<string, number>` — origin OSID → count displaced.
- `displaced_in_by_osid: Record<string, number>` — destination OSID → count settled.
- `displacement_event_log: DisplacementEvent[]` on GameState — per-turn displacement event buffer with turn, origin, destination, ethnicity, counts (displaced, killed, fled_abroad, settled); cleared after the turn once stream/aggregate outputs are updated.
- `displacement_humanitarian_aggregates` — cumulative caused-by/receiver humanitarian totals.
- `displacement_origin_dest_arrivals` — cumulative origin-municipality/ethnicity to destination-municipality settled totals.
- `displacement_recent_by_turn` — per-turn refugee-created totals (`displaced + killed + fled_abroad`) used by cosmetic war dispatches to compute the current 4-turn/monthly displacement cue.
- Events sorted by (turn, origin_mun) for deterministic ordering while present in the per-turn buffer.

**Implementation-note (2026-02-17, updated 2026-09-02):** War phase includes delayed hostile-takeover displacement for at-war control flips: a 4-turn takeover timer (mandatory for all sides), municipality camp holding pool for 4 turns, then deterministic reroute to ordered urban centers with motherland preference and overflow handling. Battle-driven flips are consumed from the battle ledger and seed timers for all minority factions, not only the defender. The active non-battle owners that directly call `seedDisplacementTimerOnFlip()` are the bounded early-war paramilitary sweep and JNA phantom captures. The legacy rear-pocket helper still contains its historical hook but is not in the production pipeline, and null-OSID auto-claim is not a current control owner. **Receiving cap (2026-02-18):** Receivers cap at pre-war population × 1.5; Sarajevo area × 1.1 (siege). When a receiver is at cap, overflow is routed to next-closest urban centers. **Routing (n942 overhaul):** Per-municipality origin-specific routes. Drina split: Zvornik→Kalesija/Tuzla (west); Bratunac/Vlasenica→Srebrenica (forming enclave). Per-municipality Krajina: Prijedor→Bihać, Ključ→Donji Vakuf (M-5), Bosanski Novi→Bosanska Krupa. Krajina Bosniak flee-abroad 55% (ICRC convoy municipalities; 35% before 2026-11-14). Posavina Croat: Brod/Derventa→south (Žepče/Travnik). **Militia pool contribution:** `REINFORCEMENT_RATE=0.02` (2% of settled displaced join militia pools). Besieged enclaves use `ENCLAVE_REINFORCEMENT_RATE=0.005`. `DISPLACED_CONTRIBUTION_CAP=300` per municipality per turn. Expulsion: RBiH 50% Serbs, HRHB/RS 100%. Non-takeover (settlement-level): RBiH Serb 50% gradual; HRHB Serb 100%; RS Bosniaks/Croats 100% immediate. Enclave overrun (Srebrenica/Gorazde/Zepa) applies higher kill fraction than standard displacement.

**Policy seed (RF-5B, 2026-11-14):** the bot-only minority-expulsion policy also starts takeover timers with no control change (`cause: 'policy_expulsion'`; a bot-controlled HRHB only, once the open RBiH-HRHB war has begun; one bounded wave per OSID in the sourced `POLICY_EXPULSION_SCOPE` municipalities, declared Bosniaks only; no sustained drain; booked to the holding faction; the first wave records one authorized war crime). See `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 and §6 and `DISPLACEMENT_MASTER.md`.

**Implementation-note (2026-11-13, displacement attribution lane):** `caused_by` is the side that took or held control after a takeover (`displacement_takeover.ts`, including a bot faction's minority-expulsion policy wave, booked to the holding faction; RF-5B) or that carried out a paramilitary sweep (`paramilitary_sweep.ts`). The siege path in `updateDisplacement` is live (the war step passes it the OSID front and OSID supply). One pass runs per municipality and side holding settlements there. Siege triggers when that side's settlements touch an at-war front and none is supplied for 3 consecutive turns (counter persisted per side in `DisplacementState.unsupplied_pressure_by_side`); encirclement triggers under front pressure when every held settlement lies in a body outside the side's main territory that held at most 15% of its settlements at turn 0. The rate is 0.1% per week of the holder's own people (the larger trigger, never the sum). Departures are booked to the pressing side, shared pro rata, never the holder, with killed 0 and no flight abroad, and go only to municipalities the holder's side holds. The path splits a municipality without a census entry by the national 1991 sums (tag `census_fallback_national`). See `SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

### 12.3 Per-OSID census data for displacement depth

Displacement volume per OSID uses actual per-OSID census demographics from `operational_settlements.geojson` rather than municipality-level averages. Each OSID record contains: `population_total`, `population_bosniaks`, `population_serbs`, `population_croats`, `population_others`.

**Hostile share computation:** Per-OSID hostile share maps faction→ethnicity: RBiH = bosniak + other, RS = serb, HRHB = croat (matching `getFactionAlignedPopulation` logic). Cap: 0.95 for per-OSID census data; 0.80 for municipality-level fallback. Graceful fallback: if census data is missing for an OSID, reverts to even-split population (`floor(munPop / osidCount)`) and municipality-level `getDynamicHostileShare`.

**Sustained pool accounting:** After initial maturation fire, `cumulative_displaced` is set to the initial displacement amount (not zero), preventing the sustained displacement pool from double-counting the initial fire.

**Implementation-note (2026-03-01):** Per-OSID census depth calibration. Operational settlements loaded separately in turn pipeline via `loadSettlementGraph()` (OSID-keyed, `op:` prefix validated). Both Branch A (initial maturation) and Branch B (sustained displacement) use per-OSID population and hostile share. n319 result: 668k total displaced (RBiH 458k, HRHB 150k, RS 60k) vs 481k before. Ljubija displacement: 5,331→13,399 (+151%). System complete — see `docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`.

## 13. Recruitment and militarization

Recruitment originates at the settlement level and aggregates upward.

Militia emerge early with low cohesion. Formation of organized brigades requires time, authority, supply, and training.

**Brigade activation at war entry and ongoing turns:** Scenario may set `recruitment_mode` to select how brigades are created. When `recruitment_mode` is `"player_choice"`, brigade activation uses three resources: manpower (from militia pools), recruitment capital, and equipment points. At war entry, the player or bot activates OOB brigades from initial pools; during War-phase turns, pools can accrue deterministically and additional OOB brigades can be activated when eligibility and costs are met (`available_from`, control in home municipality, manpower, capital, equipment). In ongoing War-phase recruitment, implementation may retry both mandatory and elective OOB brigades each turn under deterministic per-faction recruit caps. Equipment accrual is derived from production facilities, local production capacity, and embargo profile, with optional scenario trickles. Capital accrual uses deterministic organizational inputs (militia/pool base, authority, legitimacy, displacement effects) and optional scenario trickles. When `recruitment_mode` is `"auto_oob"` or absent, legacy behavior applies: all OOB slots are created at war entry when `init_formations_oob: true`, then filled from pools. When `recruitment_mode` is `"bottom_up"`, formation growth uses militia emergence and pool population; the turn pipeline runs the bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) **even in war phase** so that scenarios starting in War can still grow formations. Engine Invariants §14.10; implementation: `src/sim/turn_pipeline.ts`. **Calibration note:** The 40-week calibration scenario uses `player_choice` (not bottom_up) because in bottom_up mode RS brigades are 1-per-HQ with no stacking, so spreadBrigadesToFrontOsids does not move them to the front and they generate no attack orders. See docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md. **Implementation-note (deferred start mode 2026-02-17):** with `recruitment_mode: "player_choice"` and scenario flag `no_initial_brigade_formations: true`, initialization creates corps/army_hq only and skips initial brigade activation; brigades are created only by turn-based recruitment from turn 0 onward using the same deterministic Peace → militia emergence → pool population path. Implementation and design: `docs/40_reports/recruitment_system_implementation_report.md`, `docs/40_reports/recruitment_system_design_note.md`; formation design: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10. **Implementation-note (non-normative):** The tactical map provides a player recruitment UI when state has recruitment (toolbar capital, Recruit modal with OOB catalog and Activate flow, desktop IPC apply-recruitment, placement feedback); desktop advance runs accrual without bot recruitment. Spec: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §13.8, §21; report: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §6. **Implementation-note (force calibration 2026-02-15):** April 1992 scenario force levels calibrated via pool scale (POOL_SCALE_FACTOR 55), organizational penetration seeds (party 85, paramilitary 60), mandatory spawn minimum 200, FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), and scenario recruitment resources; see `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §2. **Implementation-note (ongoing recruitment sequencing and RS mobilization 2026-02-16):** In current War-phase pipeline ordering, ongoing recruitment resolves before brigade reinforcement so reinforcement does not consume pool manpower first. RS pending mandatory brigades may receive a deterministic, capped per-turn manpower mobilization top-up in their home municipalities to prevent permanent stalling below the mandatory spawn floor. **Implementation-note (War-phase ongoing mobilization 2026-02-24):** A dedicated pipeline step **ongoing-mobilization** runs before brigade-reinforcement and adds per-turn pool growth from conscription (eligible pop × rate × surge × faction scale × authority), plus shared displacement and RBiH cross-ethnic contributions. Exhaustion caps (e.g. 15% / 25% of eligible pop) limit cumulative mobilization per municipality. Faction-specific initial brigade personnel (e.g. RS 1,200, others 800) and initial cohesion (RS 72, HRHB 62, RBiH 55) are defined in formation constants and applied at OOB creation. RS receives a one-time JNA inheritance pool bonus at scenario init (e.g. ~20K distributed by eligible Serb population). **Implementation-note (org-pen init 2026-02-16):** Initial municipality organizational penetration is seeded deterministically at scenario/new-game initialization and Peace→War uninvested handoff from three factors: (A) municipality controller (mayor-party proxy), (B) faction-aligned 1991 population share threshold, and (C) planned war-start OOB brigade presence (`available_from <= war_start_turn`). This replaces uniform handoff defaults and keeps early militia/pool variance linked to war-start force availability. See `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` §12 and `docs/40_reports/implemented/ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md`.

**Shared eligibility and autonomy boundary (2026-07-12):** Catalog presentation and recruitment application use the same recruitment context and eligibility evaluator: faction, current turn, scenario OOB catalog, existing formations, political control, municipality manpower, recruitment capital, equipment, and availability. Ineligibility is labeled (`wrong_faction`, `not_yet_available`, `already_recruited`, `no_control`, `no_manpower`, `no_capital`, or `no_equipment`) rather than silently reinterpreted by a UI fallback. Newly activated brigades are placed on a faction-controlled OSID in the home municipality, preferring the controlled municipal HQ anchor and then a strict-sorted controlled fallback; if none exists, activation fails. Automatic recruitment excludes the selected player faction at autonomy 0 and 1, includes it at autonomy 2+, and remains unrestricted for headless auto-control.

**Implementation-note (paramilitary rear pocket cleanup; corrected 2026-09-02):** The `'paramilitary'` FormationKind models bounded autonomous rear-pocket cleanup during weeks 0-20 only (`PARAMILITARY_FADE_WEEK`). Detection considers only `op:` nodes and requires an undefended pocket plus sufficient local paramilitary penetration; organized defense prevents capture, and a unit intercepted after dispatch retreats and dissolves without changing control. Captures use `mechanism: 'paramilitary'` and retain the established displacement and war-crime accounting. Bot corps AI excludes active paramilitary targets from opportunistic targeting. After week 20 there is no passive rear-pocket control transfer: topology alone does not award political control, and isolated ground must change control through attack or operation resolution. The legacy `rear_pocket_consolidation.ts` helper is not part of the production pipeline. Pipeline: `paramilitary-detect`, then `paramilitary-advance`. Constants remain in `formation_constants.ts`; historical reports remain in `docs/40_reports/implemented/`.

**Enclave-boundary truth guard (2026-08-31):** rear-pocket paramilitary cleanup may consolidate
an OSID inside the faction's authored enclave boundary, but it may not expand that enclave into
a same-municipality OSID outside the boundary. Outward territorial change requires a
CorpsOperation. This guard does not protect enclave territory from operation-owned combat.

Desertion increases under exhaustion, legitimacy collapse, and command degradation.

**Superseding calibration note (2026-08-26):** the 40-week calibration wording above describes
the 2026-02 experiment only. The sole current scoring trajectory is
`apr1992_definitive_188w.json`; January 1993 is its week-39 checkpoint. Do not use a 40-week
scenario or its recruitment behavior to quote or tune the current calibration.

## 14. Logistics, supply, and corridors

Supply is traced through settlement graphs and external corridors. Corridors are explicit objects enabling sustainment and movement.

Supply states are **Adequate**, **Strained**, and **Critical**. Degradation reduces combat effectiveness and cohesion.

Corridor states are **Open**, **Brittle**, or **Cut** (Engine Invariants §4). Corridor collapse can produce cascading effects across dependent regions.

**Note:** Treaty-level corridor rights are deprecated. Supply and sustainment are evaluated via reachability and territorial clauses rather than granting special corridor-rights clauses.

**Scope (war economy, ruling D3, 2026-06-05):** The war economy is abstract (scarcity, supply state, corridors, smuggling, equipment lifecycle) and final for 1.0; there are no player-managed production queues or build orders. See `docs/40_reports/design/20260605_D3_WAR_ECONOMY_DEPTH_DECISION.md`.

### 14.1 Sources

A **supply source** is a settlement (or operational node) from which supply may originate for a faction. Typical sources include faction capital(s), major supply nodes (a source is a place supply enters, not a stock), or scenario-defined supply nodes. Supply resolution (pipeline step **supply-resolution**) computes reachability from these sources; see §14.2. Sources are defined per faction (e.g. `supply_sources` or equivalent in state); when operational (OSID) data is used, supply state may be defined per OSID from constituent canonical SIDs or from “supply at OSID = state at controlling settlement(s)” per implementation. **Implementation-note:** Current pipeline uses canonical settlement graph and `computeSupplyReachability`; OSID-keyed supply state derivation may be added when operational layer is authoritative for supply.

### 14.2 OSID graph tracing and supply state

**Implementation-note (player supply agency, 2026-03-07; retired 2026-11-17):** The enclave airdrop allocation (`airdrop_allocation`, the `stage-airdrop-allocation` IPC and the airdrop button) and the smuggling allocation (`smuggling_allocation`) are retired with the supply-reserve economy (§14.2c). They resolved only inside the reserve module under the scenario flag `supply_reserves_enabled`, which the apr1992 start never sets, so they changed nothing a player could see; the root `airdrop_allocation` field had no reader. Both fields stay optional compatibility-only save fields. `sarajevo_tunnel_operational` stays: the tunnel is a recurring relief hook, not a second supply-network system. **Retired (F1i, 2026-11-16, §6 panel):** humanitarian convoys (`evaluate-humanitarian-convoys`) are not modelled in 1.0. The step never found a route on any reachable path (it ran only with `supply_reserves_enabled`, true only in scenarios a player cannot start, and on legacy settlement edges that never match an OSID). Relief convoys to the enclaves were real and were obstructed, not ended; the model leaves them out rather than misrepresent them. `pending_convoy_decisions` stays an optional save field so old saves load; nothing creates an entry. The player convoy surfaces (decision modal, inbox, desk and records entries, the `stage-convoy-decision` IPC, the `convoy_decision` manifest family) were removed in the F1i family retirement (2026-11-16, addendum to the §6-panel record, factual correction only); `convoy_decision_history` likewise stays an optional save field that nothing reads. The enclave-derived tunnel activation is also retired: the tunnel is event truth (`sarajevo_lifeline.ts`, `isTunnelActive`), and `sarajevo_tunnel_operational` stays as the flag that path, the IVP Sarajevo modifier and the UI read.

**Implementation-note (IVP consequence surface, 2026-03-07):** International visibility pressure now exposes `composite_ivp` as the UI-facing aggregate gauge over Sarajevo, enclave, atrocity, and negotiation pressure. Consequence bands are hysteretic rather than single-threshold toggles, preventing flapping around thresholds while still affecting patron/material support behavior.

**Implementation-note (Phase E municipality support, 2026-03-07):** Deferred player-agency Phase E now ships as a shared `municipality_support_orders` surface with faction-specific effects rather than a universal shipment mechanic. `RBiH` can stage `weapons_shipment` for a one-turn local mobilization boost, `RS` can stage `staff_priority` for a one-turn local reinforcement-rate boost from the existing pool, and `HRHB` can stage `croatian_support_package` for a one-turn local reinforcement cohesion bonus. This remains intentionally local and pool-constrained; it does not rewrite global manpower availability. **Timing fix (2026-11-07):** an order staged on player turn N (`staged_turn = N`) applies to the resolution of turn N, during which the pipeline has already advanced `meta.turn` to N+1; `getActiveMunicipalitySupport` therefore matches `staged_turn + 1 === meta.turn` (`isMunicipalitySupportOrderActiveForResolution`). Before this fix the check required `staged_turn === meta.turn`, so the lever never applied in a real turn. Bots never stage orders, so headless runs are unaffected. Regression: `tests/municipality_support_pipeline.test.ts`.

### 14.2a Additional war-phase state surfaces

The live player-agency implementation added these persistent war-phase fields to the canonical runtime surface:

- `sector_stance_orders`
- `opsec_sectors` — sectors marked during operation planning; passive intel buildup halved for OPSEC sectors (see §8a OPSEC integration below)
- `pending_convoy_decisions` (retired F1i 2026-11-16; optional, kept so old saves load; nothing writes a new entry)
- `sarajevo_tunnel_operational`
- `municipality_support_orders`

These are serialized state, not derived caches. Derived application still happens in the turn pipeline, chiefly through `applySectorStanceOrders()`, and sector-intel updates.

Reachability is computed over the settlement (or operational) graph from the faction's own eligible, currently controlled configured sources. Normal transit may cross territory controlled by that faction or a current ally under the canonical live alliance predicate; allied transit does not borrow allied depots, change ownership, create a supply origin or grant neutral/enemy access. Only the beneficiary's controlled nodes appear in **reachable_controlled** versus **isolated_controlled**. Corridor derivation includes the actual reachable transit network when evaluating **Open**, **Brittle** and **Cut** links (Engine Invariants §4). Transit connectivity does not guarantee adequate or unlimited supply: corridor bottlenecks, graph cuts and existing reserve/siege constraints still apply. Changes in alliance or transit ownership invalidate the corresponding derived reachability/corridor cache. Supply uses the alliance effective at its pipeline step, not the separate zone-posture snapshot. No new treaty corridor right is introduced.

**Supply state per settlement (or per OSID):**
- **Critical:** settlement/OSID is isolated (not reachable from sources).
- **Strained:** reachable but at least one corridor on the path is Brittle.
- **Adequate:** reachable and all corridors on the path are Open.

When the operational graph (OSID) is the base layer, “supply at OSID” is the supply state at that OSID—either derived from the state at the controlling settlement(s) for that OSID or from a dedicated OSID-level trace; see War Specification §8 for use in supply pressure (isolation). **Implementation-note (Supply Phases 1–5, 2026-02-24):** OSID supply trace (supply_reachability_osid, deriveSupplyStateByOsid), pipeline step **supply-osid**, supply_state_by_osid in turn report; getSupplyMult in attack_resolution_osid and combat_predictor use supply_state_by_osid when present; bot receives supplyStateByOsid and supplyConnectivityByFaction; querySupplyPaths extended; 3D supply mode; enclave resilience stub; cascade semantics in Engine Invariants §4. See SUPPLY_DESIGN.md, SUPPLY_IMPLEMENTATION_PLAN.md, PROJECT_LEDGER 2026-02-24.

### 14.2c Supply is connection, not stock (supply-reserve economy retired 2026-11-17)

**Retired (Fable consult 6, 2026-11-17).** Supply is modelled as connection, not stock. A formation is supplied if it can be reached from a source over the OSID graph; there are no depots, ammunition stocks or patron shipments. The faction-level reserve layer added in March 2026 (Phases A to E: `general_supply_reserve` and `heavy_munitions_reserve` per faction [0..100], maintenance drain, per-battle expenditure, production and patron-aid income, the embargo income multiplier and per-faction supply caps, production-facility combat damage, UN airdrops, the smuggling allocation and smuggling routes, the one-time JNA warehouse bonus, the reserve-blended effective supply state, the heavy-munitions scaling of bombardment and the artillery-preparation reserve spend) is not modelled in 1.0. Removed with it: the pipeline steps `compute-supply-reserves` and `update-smuggling-routes`, the airdrop button and IPC, the reserve bars of the Logistics panel and the Economy panel, and the `supply_reserves_enabled` scenario key (now ignored). It ran only under that scenario flag, which no apr1992 scenario sets (only `sep1991_to_dayton` and the retired `jan1993_to_dayton` did; no player can start either), so the retirement is byte-identical on apr1992 historical and hands-off emergent. The reserve fields stay optional, compatibility-only save fields so old saves load; no new game creates them. The `supply_below` and `supply_above` event conditions and the `supply_delta` event effect were retired on 2026-11-17 with 18 authored events that could only fire on the reserve (the remaining events lost their `supply_delta` lines); the loader rejects all three. An old save's staged decision that still carries a `supply_delta` effect loads and resolves as a no-op, and the player is not shown it. The live supply condition is `enclave_supply_status` (per-OSID reachability). Do not revive this mechanism as it stood; the record of why is in `docs/40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md` (SB2).

**Still live from that work.** Enclave resilience and hardening (Phase C: structured `EnclaveResilienceEntry`; +5% defense after 8+ isolation turns; exhaustion reduction for RBiH up to 30% at resilience 30; constants in `src/state/enclave_resilience_constants.ts`; pipeline step `enclave-resilience`). The supply map layer (map mode "supply" colours OSIDs by faction supply pressure, `buildSupplyGeoJSON.ts`) and the Logistics panel (`SupplyPanel.tsx`: corridor open/strained/cut counts and the Sarajevo lifeline indicator; the reserve bars are gone). Supply-aware bot targeting (a score multiplier on enemy targets by supply state, 1.10 critical and 1.05 strained, in `bot_corps_directives.ts`). The embargo offensive-launch gate (`embargo_offensive_gate_enabled`, the embargo-phase `general` cap), which reads only the embargo phase and never read a reserve.

### 14.3 Corridors

**Definition:** A corridor is a path or set of edges through which supply flows from sources to controlled territory. Corridors are derived per faction from dependency, capacity, and redundancy (Engine Invariants §4).

**Sustainment:** Open corridors allow full sustainment (Adequate state along the path). Brittle corridors apply continuous penalties every turn; junction loss alone must not collapse a corridor unless dependency thresholds are crossed (Engine Invariants §4).

**Collapse and cascade:** When a critical edge is lost (e.g. control flip), dependent regions may transition from Adequate → Strained → Critical. Full collapse cascade semantics (e.g. Posavina, Route Duck Tuzla–Zenica, Sarajevo over Igman/Bjelasnica) are design intent; see historical pattern reports and BB2 for corridor narratives. **Implementation-note:** Current pipeline derives corridor state (open/brittle/cut) and supply state (adequate/strained/critical); full cascade propagation across dependent regions is not yet fully confirmed (see DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15).

### 14.4 Enclave supply

Enclaves (e.g. Srebrenica, Žepa, Goražde, Bihać) depend on narrow corridors or airlift for supply. Enclave integrity and humanitarian pressure are in §16. Supply state for enclaves is derived by the same reachability rules: if the only path is Cut or lost, the enclave is Critical. Historical pattern reports and BB2 document enclave supply constraints; design may refine enclave-specific rules in line with §16.

### 14.5 Attack resolution (supply_mult)

Combat power in War phase attack resolution (Systems Manual §7.4) uses a **supply_mult** multiplier for both attacker and defender. The intended mapping from supply state to multiplier is:

- **Adequate:** supply_mult = 1.0 (attacker and defender).
- **Strained:** supply_mult = 0.75 (attacker and defender). The earlier 0.7 / 0.8 split in the Attack Resolution Formula Spec is superseded by the shipped code (`combat_math.ts`, formation supply multiplier).
- **Critical:** supply_mult = 0.45 (attacker), 0.5 (defender).
- A formation whose location has no supply state uses 1.0 if it was supplied within the last 2 turns, otherwise 0.4 (attacker) or 0.5 (defender). A logistics-priority clamp is applied on top in every case.

Supply_mult is applied to the formation’s location (or the settlement/OSID where the formation is); it reflects the supply state at that location. See docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md §2.2–2.3 and War Specification §8 (isolation feeds supply pressure; supply state feeds attack resolution when wired). **Implementation-note (supply gating of offensives 2026-03-01):** Supply state also gates offensive behavior: when a sector offensive's participant pool is built, brigades at critical supply (the reserve-adjusted effective state, and only when a per-OSID supply map is supplied) are excluded, and a critical-supply brigade that is not an active operation participant is forced to defend (an assigned brigade that is off its sector front moves first instead). Brigades at strained supply may take part in operations; the 0.75× supply multiplier models their degraded effectiveness (the earlier "victory-only attacks, no pioneer" rule for strained brigades no longer exists in code). Corps strip offensives when critical_fraction > 0.5. See §6.5 and docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md.

### 14.6 Defense industry and local production

Local production and war economy (defense industry) contribute to sustainment and equipment per §15; they do not replace corridor-based supply. Production capacity (authority, population, exhaustion, connectivity) and its degradation are defined in **§15. War economy and local production**. Equipment accrual for recruitment uses production facilities, local production capacity, and embargo profile; see §15 for capacity and irreversible degradation under stress.

## 15. War economy and local production

Municipalities may possess limited local production capacity contributing to sustainment.

Production is constrained by authority, population, exhaustion, and a connectivity factor. In the current engine the connectivity factor is always 0.5: the reachable-settlement input it reads is empty, so every municipality's production capacity is halved, whatever its supply state. That half rate is the calibrated rate (F1h); replacing the dead connectivity term with a named constant is queued and changes no output. Local production does not respond to a municipality's supply connection.

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

**Settlement on the plan map (2026-11-07, owner; RD lane):** an accepted plan or a signed/imposed Dayton records `negotiation.settlement` — the plan's map at OSID level from the researched plan maps, the settled territory share, and each party's status under the plan (`src/sim/negotiation/peace_settlement.ts`). This is the territorial clause of the treaty; `political_controllers` is not rewritten (it remains the record of the front). The Dayton map is made contiguous (`settlement_contiguity.ts`; Posavina canton kept detached). The verdict reads the settled share and status caps (`VICTORY_AND_PYRRHIC_SCORING.md`). The Dayton table itself (decline and forced table, captured-ground packages, patron leverage) runs on interim rules owned by the Dayton conference redesign (`handoffs/20261107_dayton_end_map_to_conference.md`); `WAR_TERMINATION_SPEC.md` carries the detail.

**Vance-Owen decision ownership (2026-07-12):** The peace-plan resolution is the single player-decision owner. Accepting or rejecting Vance-Owen synchronizes the matching event decision, consumes any duplicate pending event, writes one durable event-decision receipt, and appends one peace-plan-history chronology row. The event queue must not ask or record the same choice a second time.

**Owen-Stoltenberg staged ownership (2026-07-30):** For an RBiH player, the Presidency review owns the documented conditional-acceptance stage and the later Assembly event owns the final RBiH disposition. Conditional acceptance at the Presidency clears the legacy peace-plan surface but does not append a final peace-plan-history row or end the war. The Assembly appends exactly one final chronology row. The legacy peace-plan modal and Desk item remain suppressed while either canonical stage is pending.

**Cutileiro historical-disposition normalization (2026-07-31):** Cutileiro is a pre-war diplomatic record, not a week-one emergent settlement vote. When the player selects that faction's documented Cutileiro response, resolution normalizes all three delegations to the documented final disposition: RBiH rejected; RS and HRHB accepted. Because unanimity is absent, an HRHB historical acceptance does not end a live war campaign. A counterfactual player response continues to use the normal emergent response computation. This exception is limited to Cutileiro and does not weaken the terminal rule for an actually unanimous peace-triggering treaty.

### 20.3 Institutional competences

Treaties may allocate competence IDs (e.g., police_internal_security, defence_policy, education_policy, health_policy, customs, indirect_taxation, currency_authority, airspace_control, international_representation).

Certain competences are bundled and must be allocated together:
- Customs + indirect_taxation
- Defence_policy + armed_forces_command

### 20.4 Acceptance computation

Acceptance is computed, not guaranteed. The acceptance breakdown is deterministic and includes competence_factor derived from static per-faction valuations.

**Implementation-note (Pipeline 2.4–2.5, updated 2026-05-01):** **Operation Storm:** War Spec §11.3 and the implementation report docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md define a conditional late-war precondition check when Washington is active and RS threat, exhaustion, and IVP meet thresholds. Pipeline step **operation-storm-check** runs after washington-check. When abstract preconditions align it records `state.meta.operation_storm_preconditions_met` and `operation_storm_precondition_turn`; it does **not** open the western theater. Actual western-theater rupture is event truth: `state.meta.operation_storm_triggered` and `operation_storm_turn` are set only after `operation_storm_1995` fires. Consumers that need pre-Storm or post-Storm theater state should use `operation_storm_theater.ts` helpers rather than treating precondition readiness as the event. **Scoring / evaluation:** Minimal evaluation criteria for end-game and timeout/stalemate are in WAR_TERMINATION_MINIMAL_SPEC §8 (territory vs pre-war, population preserved, exhaustion, treaty terms favorability); War Spec §11.2.4 references that section; exact formula TBD.

**HV depth integration (2026-07-17):** When late-war external HV support is admitted, all selected brigades receive deterministic legal HRHB-controlled stationing or none are integrated. The selected BiH station is the formation's operational home for this external deployment exception, and physical `location_osid`, station, and home truth must agree. The Cincar catalog staging anchor requires explicit HRHB control; missing ownership never counts as access.

**Mistral 1 roster reservation candidate (2026-09-28):** From t154 through t160 inclusive, generic operation and probe admission, carry-over, replacement, and Army-HQ matching exclude Mistral 1's five canonical runtime participants (including `F_HRHB_0001`). The named `Operation Mistral 1` may claim them. A generic claim carried into t154 releases the formation from its operation roster without relocating it. The existing `Operation Cincar / Kupres` commitment that began at t132 may retain `F_HRHB_0001` during its t154–155 overlap, but a new operation with that name cannot admit the formation. Goražde rules remain unchanged.

## 21. Player action constraints

Certain actions are forbidden but attemptable, generating penalties rather than hard failure.

Institutional inertia and command degradation delay or distort execution.

**Presidential Command Model (additive note — LOCKED design 2026-06-01):** Canonically the player is the **president and commands through generals (strategic directives), not as a general; brigade-level operation planning is post-1.0 / DLC.** The president's military agency is five command levers: (1) **Authorize op — SHIPPED**; (2) **Request op — SHIPPED (#106)**; (3) **Stop op — SHIPPED (#103/#104)**; (4) **Authorize elite deployment — SHIPPED (#105)**; (5) **Replace a corps CO at cost — SHIPPED (#107)** — **all five levers SHIPPED 2026-06-01, player-only → historical/headless byte-identical.** Still forthcoming as depth (not levers): the force-op disposition-tinted pushback card, and patron-event consolidation + supply dead-channel fix. Forcing an op over a commander's objection surfaces disposition-tinted pushback before commit and an authored consequence after — i.e. command friction (institutional inertia / command degradation above) is the mechanism, not a hard block. Refusing a patron demand is the event layer, not a sixth lever. Authoritative design: `docs/plans/2026-06-01-presidential-command-model-design.md`. *(Additive note; does not supersede §6.4, §7.5, or §8.)*

**Implementation note — regular REQUEST-OP force selection (2026-10-25):** The commander selects 3–12 available, uncommitted, active corps brigades that retain the existing operation-objective and enclave eligibility. The selected formations must be physically connected to an own-controlled target-adjacent staging OSID through ordinary friendly/allied territory. The first strict-sorted staging candidate with enough legal formations is used; the roster follows the established sector-attack equipment priority with strict ID ties and is stored in canonical ID order. A forced request cannot bypass a hard selector or operation-slot rejection. This records the existing regular directive bounds and policies; it does not alter authored-operation floors, enclave geometry, movement, supply, combat, control, command-authority cost or save shape. [Bounded proof](../../logs/r8-native-calibration-parity-20261024/directive-selector-20261025/MANIFEST.v2.json)

## 22. Persistence and determinism

All state variables are serializable.

**Implementation note — scenario graph domain (2026-10-25):** Weekly headless scenario front reconstruction uses operational OSID graph edges, matching its OSID control/front consumers and the existing final-save path. Canonical settlement-ID edges are a different domain and must not be substituted. This correction changes no front rule, controller, combat, movement, supply, enclave, threshold, data or save contract.

The simulation is strictly non-random. Reproducibility is achieved by deterministic state updates, stable ordering, canonical IDs, and timestamp-free derived artifacts.

Save/load must fully reconstruct world, faction, municipality, MCZ, formation, and front states.

**Desktop mutation persistence (2026-07-12):** Every successful canonical desktop mutation serializes one new state, autosaves it, and then broadcasts that same serialization to all live renderers, including the invoking renderer. Autosave failure rejects the mutation and restores the prior in-memory serialization. The invoke response alone is not durable state authority.

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

**Implementation-note (negotiation momentum inputs, RF-F1, 2026-11-14):** `negotiation_momentum = clamp01(Σ factions' negotiation.pressure / 100)`, and pressure is a monotonic per-faction counter fed each turn by exhaustion delta, front breaches (capped at 3), unsupplied formations (÷5), unsupplied militia pools (÷10) and collapsed municipalities (+1 each). Before RF-F1 two of those inputs ran on legacy `S…` settlement edges against OSID control: every militia pool was "unsupplied" and 109 of 110 municipalities were "surrounded" and collapsed by turn 8, so momentum read 1.0 from turn 4. Both now use the OSID front and supply (`buildOsidDisplacementPressureInputs`). Sustainability evaluates each municipality once per turn for one holder: a faction whose OSIDs there are all cut off from its supply sources (so minority pockets such as Srebrenica and Žepa count), otherwise the faction holding most of its OSIDs; surrounded means that holder's OSIDs there are unreachable from its supply sources (a faction with no supply entry at all is never judged cut off). Collapse stays permanent and its +1 goes to the current controller (legacy Phase 22 rule). A militia pool is supply-isolated only where its faction holds ground; a pool in a municipality its faction holds none of is lost territory and is not counted. Breach candidates stay 0 while `front_segments`/`front_pressure` are unpopulated (legacy front substrate, F9), and the exhaustion delta comes from that same dormant substrate. **Known:** on honest inputs the formula still saturates (momentum 1.0 from about turn 19), so Washington W3 (`> 0.50`) and ceasefire C5 (`> 0.40`) remain open from mid-August 1992 (turn 19) and the agreements fire on their other gates (ceasefire t94, Washington t98 in the shipping campaign, each about 5 weeks before the real 23 February 1994 ceasefire and 18 March 1994 Washington Agreement). Re-deriving the normalisation is a separate design item.

### System 2: Arms Embargo Asymmetry
**State:** `embargo_profile` per faction with `heavy_equipment_access`, `ammunition_resupply_rate`, `maintenance_capacity`, `smuggling_efficiency`, `external_pipeline_status`. **Core rules:** Equipment access ceilings faction-specific and time-modified; ammunition resupply constrains offensives. **Key formulas:** `max_heavy_equipment_per_brigade = base_max * heavy_equipment_access`; `pressure_equipment_modifier = 0.5 + (0.5 * effective_equipment_ratio)`; `smuggling_efficiency_t = smuggling_efficiency_base + (turn_index / 200) * 0.3` (cap 1.0). **Constraints:** differential effects only; no binary embargo switch.

### System 3: Heavy Equipment + Maintenance
**State:** `equipment_state` per formation; `maintenance_capacity` per faction. **Typed composition (BrigadeComposition):** infantry, tanks, artillery, aa_systems plus per-type condition fractions (operational / degraded / non_operational). **Default profiles by faction (e.g.):** RS 40 tanks, 30 artillery; HRHB 15 / 15; RBiH 3 / 8 (JNA inheritance and embargo). **Equipment multiplier:** 1.0 + (tankBonus + artilleryBonus) / infantry; tanks amplify offense more, artillery amplifies both. **Degradation:** per turn from posture tempo and faction maintenance capacity; operational → degraded → non_operational. **Capture:** on settlement flip, e.g. 5% capture rate; captured equipment arrives degraded. **State:** composition on FormationState. **Core rules:** Degradation scales with operational tempo and maintenance deficit; non-operational equipment permanent loss without explicit repair. **Key formulas:** operational_tempo by posture (OFFENSIVE 1.5, REFIT 0.3, etc.); degradation_points formula; effective_equipment_ratio. **Constraints:** heavy equipment wasting asset; degradation monotonic without repair. See docs/40_reports/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md for constants.

### System 4: Legitimacy
**State:** `legitimacy_state` per settlement. **Core rules:** Legitimacy from demographics, institutional inheritance, coercion penalties; low legitimacy reduces recruitment, slows authority consolidation. **Key formulas:** demographic_legitimacy, institutional_legitimacy, stability_bonus, coercion_penalty, legitimacy_score, recruitment_multiplier. **Constraints:** control does not imply legitimacy.

### System 5: Enclave Integrity
**State:** `enclaves` array. **Core rules:** Deterministic detection; integrity weighted composite; humanitarian pressure feeds IVP. **F1i (2026-11-16, §6 panel, unanimous):** detection is keyed by OSID (the OSID supply report `supply_state_by_osid` and the operational graph edges); before this the step read legacy settlement data and `enclaves` was always empty. Any connected component of a faction's controlled OSIDs in critical supply is an entry, so the list includes short-lived mixed-control pockets as well as the real sieges. IVP's enclave humanitarian term reads System 5a `enclave_resilience` alone (one source: stacking the detector on it double-counted the same sieges); negotiation capital has no enclave term; nothing else reads `enclaves`. `collapsed` means "integrity floor reached", **not** "enclave fallen" (the detector marks Srebrenica, Žepa and Goražde collapsed long before history does), and any future reader of `enclaves` (UI, report or mechanic) needs §6 review. Known defects, recorded and not fixed: an entry's history is keyed by its lowest OSID, so siege duration and integrity reset when that OSID falls; the supply component is fixed at 0. This note does not claim Engine Invariants §12.2 is met (see the register). **Constraints:** no random collapse. **Per-enclave resilience (n292):** Differentiated `max_resilience` and `growth_mult` per enclave in `enclave_resilience.ts` — Zepa 20/0.7, Gorazde 30/0.9, Srebrenica 25/0.8, Bihac 40/1.1, Sarajevo 45/1.3 — reflecting population, infrastructure, and strategic importance.

#### System 5a: Enclave Resilience Expansion (v0.7)

**Garrison power (n527):** `getEnclaveGarrisonPower()` in `enclave_resilience.ts` represents TDF, Patriotic League, police, and civilian volunteers. Formula: `population × ENCLAVE_GARRISON_MOBILIZATION(0.05) × GARRISON_EFFECTIVENESS(0.15) × resilienceMult`. Added to ALL defense paths (sector, direct, ghost militia) in resolver and predictor. Applies to all 5 known enclaves.

**Resilience scaling (n527):** Scaling increased from `0.005` to `0.02` per resilience point. At resilience 20: 1.40× (was 1.10). At resilience 45: 1.90× (was 1.225). This makes enclave defense meaningful at high resilience values.

**Always-besieged enclaves:** `ALWAYS_BESIEGED_ENCLAVES` list — Sarajevo is forced to `strained` minimum supply status at all times. Resilience builds continuously, never decays. Per-enclave `max_resilience` and `growth_mult` in `ENCLAVE_CONFIG`.

**Sarajevo initial resilience:** `initial_resilience: 20` seeded on first encounter (first turn where Sarajevo is detected as enclave).

**Urban defense (n527):** `getUrbanMult()` returns `2.0×` for Sarajevo OSIDs (was 1.5). `isUrbanOsid()` detects urban terrain. **Urban tank penalty:** `URBAN_TANK_TERRAIN_FLOOR = 1.7` — tanks in urban terrain penalized at mountain-equivalent level (70% reduction) via `getHeavyWeaponsOffensiveMult()`.

### System 6: Sarajevo Exceptions
**State:** `sarajevo_state`. **Core rules:** Siege from connectivity; dual supply model; integrity floor and amplified visibility. **Constraints:** Sarajevo exceptional but not scripted.

### System 7: Negotiation Capital + Territorial Valuation
**State:** `negotiation_state` per faction. **Core rules:** Capital from exhaustion, IVP, patron; "liabilities cheaper" asymmetry; required clauses. **Implementation note (F1i, 2026-11-16):** capital has no direct enclave term; the enclave liability penalty is retired (it billed the besieged party for its own sieges), and a siege's political cost reaches capital through IVP and negotiation momentum. Its zero ledger row is kept so ledger ids stay stable. **Constraints:** deterministic acceptance. **Acceptance report:** Implementation produces a deterministic `decision` per evaluation (`accept` | `reject` | `counter`). On reject or counter, a deterministic `counter_offer` (id and terms) is produced; repeated rejection yields identical counter id/terms for same state and proposal.

### System 8: OSID location, Corps Sectors, and Frontage (AoR removed, ZoC removed)
**State:** Per-formation **location_osid**; no brigade_aor. **Core rules:** Each brigade has one OSID; frontage capped at BRIGADE_OPERATIONAL_FRONTAGE_CAP=48; control change only via attack resolution or corps/frontline operations. *(ZoC removed 2026-03-02 — zoc.ts, zoc_constrained_movement.ts, tests/linked_zoc.test.ts deleted; GameState fields war_enemy_zoc_by_faction + war_linked_zoc_by_faction removed; pipeline steps zoc-computation + zoc-constrained-movement removed. Replaced by: apply-brigade-movement via brigade_movement_orders.ts; local_front_defense.ts density modifier [THIN_FRONT_THRESHOLD=0.5, MIN_COVERAGE_PENALTY=0.6, DENSE_FRONT_THRESHOLD=1.0, MAX_DENSITY_BONUS=1.25]; OSID-based retreat with no ZoC blocking.)* Front segments derived from war front edges (war_front_edges_osid); brigade_front_assignment links brigades to segments (null = reserve). **Corps Sectors:** Recomputed at turn boundaries via multi-source BFS from corps HQs; partitions front edges into per-corps sectors with sub-segments, density, and threat metrics. Used for bot attack targeting constraint and GUI visualization. Persisted together with formation sector/sub-segment assignments as the materialized current-turn standing-OG/AoR snapshot; save load preserves it rather than rebuilding it. See §2.1, War_Specification_v0_9_0.md §4 and §6, AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md, 20260301_SPATIAL_MODEL_EVOLUTION_AOR_ZOC_CORPS_SECTORS.md.

#### System 8a: Sector Intel (v0.7)

**Implementation-note (elevated to normative v0.7):** Per-sector confidence model replaces the legacy SID-keyed `recon_intelligence.ts` (deleted 2026-03-05). Intel confidence represents how well a faction understands the enemy's disposition in an adjacent sector.

**Per-OSID confidence extension (2026-05-18):** `SectorIntelRecord` may carry optional sorted `osid_confidence[]` entries for enemy OSIDs directly visible across a sector front. Each entry is JSON-safe (`osid`, `confidence`, `sources`) and source-bounded by deterministic observation tags: `passive_contact`, `patrol`, `scout`, and `combat`. These entries refine commander belief strength estimates when present and order comparable corps offensive objectives toward better-known OSIDs; records without them retain legacy sector-pair behavior. This field must not expose non-front hidden enemy truth.

**Confidence model:** Each sector has a confidence value [0, 1] per opposing faction. Confidence decays over time and grows through:
- **Passive observation:** Frontline contact with enemy sectors provides baseline confidence growth.
- **Recon-by-force (probes):** Active probes (see §7.6) grant `result_confidence_gain` to the operation's intel. Counter-probe: defenders gain `COUNTER_PROBE_CONFIDENCE_GAIN = 0.15` intel about the probing force.
- **Battle outcomes:** Engagements reveal enemy strength and composition.

**Bot target weighting:** `getSectorIntelConfidence()` feeds into bot targeting decisions. Low-confidence sectors are deprioritized for full attacks; the intel gate (§7.6.1) may downgrade operations to probes when confidence is below faction-specific thresholds (RS 0.25, RBiH 0.40, HRHB 0.30).

**OPSEC integration:** When a player marks sectors via `opsec_sectors`, passive intel buildup by the opposing faction is halved for those sectors during operation planning. The `offensive_signs` field on `SectorIntelRecord` is set when contact intel reaches `CONFIDENCE_ROUGH_STRENGTH` and an enemy attack, feint or probe is aimed at or assembling opposite that friendly OG (`isOperationOppositeSector`; amended 2026-11-14, see §6.7), or by a counter-probe. The commander reads it as enemy intent 'mass' for the zone, which drives the Fortify / Active Defence reaction. (The n1194 gate `confidence >= 0.8 AND recon_range >= 2` and the `bot_corps_directives.ts` 2x threat-weight reaction described here earlier no longer exist.)

**Combat predictor fog-of-war (owner-reconciled 2026-10-27):** `combat_predictor.ts` discounts estimated organized defense by `0.70 + 0.25 * sector confidence`; learned retreat/repulse targets have a minimum factor of0.95. The same existing factor applies once to the full enemy garrison estimate, including its resilience-dependent component; actual battle resolution retains full garrison power. This extends uncertainty to that enemy estimate without proxy constants or hidden OPSEC queries. A paper roster with no contributing brigade uses the same militia path as no roster; it does not create a brigade fog discount or organized-defender metadata. Known friendly execution friction uses attacker-side target confidence separately. Exact enemy collapse/last-stand effects remain outside this simple estimate. Forecast power, casualty estimates and eventual capture are distinct claims; all source, information-contract and qualification reviews remain required.

**GUI fog-of-war:** `GameStateAdapter` derives `fogOfWar` from `sector_intel` + `corps_front_sectors`. `buildFogOfWarGeoJSON` renders opacity-graded fog. Toggled via `fogVisible` in `MapContainer`.

**State:** `sector_intel` on `military`. Module: `src/sim/combat/sector_intel.ts`, constants in `sector_intel_constants.ts`.

**Execution friction extension (2026-05-18):** `attack_resolution_osid.ts` reads attacker-side sector intel for the defending sector and target OSID. Missing/stale confidence applies a deterministic attacker power multiplier from `0.85` at confidence `0` to `1.0` at confidence `1`; sectors currently in `opsec_sectors` apply a bounded `1.08` defender-power multiplier. Batch 15 adds bounded attacker casualty friction only for low-confidence attacks into OPSEC-defended sectors. Batch 16 pairs that ambush hook with bounded defender casualty friction under the same predicate, representing defenders avoiding some exposure during prepared ambushes. Batch 17 scales both casualty effects by the observed attacker confidence gap, reaching the existing maximum effect at zero confidence and neutral at the low-confidence threshold. Public-safe optional `execution_friction` annotations may expose only `stale_intel`, `defender_opsec`, `ambush_risk`, and broad confidence bands. This remains execution-time combat friction: no randomness, no exact hidden confidence in UI, and no hidden enemy truth exposure.

### System 9: Tactical Doctrines
**State:** extended postures and eligibility flags. **Core rules:** ARBiH INFILTRATE, RS ARTILLERY_COUNTER, HRHB COORDINATED_STRIKE; eligibility per formation per turn. **Constraints:** doctrines respect supply, equipment, exhaustion.

### System 10: Capability Progression
**State:** `capability_profile` per faction. **Core rules:** Deterministic time-indexed curves; Washington Agreement precondition-driven; formation experience. **Implementation-note (Washington paths, B5 A2 2026-11-16):** `washington_signed` is set by Path A (ceasefire plus diplomatic preconditions), Path B (patron override in a long bilateral war), or Path C, "Federation by consent". Path C fires once, on the first turn from the Washington week (102) onward, when the RBiH-HRHB war never started (`rbih_hrhb_state.war_started_turn` null) and the alliance is above `ALLIED_THRESHOLD`. It gives the same Federation benefits, but starts no ceasefire and never lowers an alliance already above the 0.80 lock. A President who kept the alliance is not treated worse than one who broke and mended it. Both Washington event cards key on the same war record (condition `rbih_hrhb_war_started`). **Implementation-note (Washington Path A', B5 2026-11-16):** Path A' ("the signed cards on a quiet front", `evaluateWashingtonQuietFront`, evaluated after Paths A and B and before C) fires once, with Path A's effects including the bilateral ceasefire, when: not yet signed; the war was fought (`war_started_turn` set); turn ≥ 102; the front is quiet (`stalemate_turns` ≥ 4, or a ceasefire held ≥ 4 weeks; 4 = W2); HRHB's last answer to `zagreb_orders_hrhb_ceasefire` was `acknowledge_pressure` (the patron's price); both Washington cards were signed (`accept` or `reluctant`, read from `event_decision_log`); and the alliance is above `ALLIED_THRESHOLD`. It closes the gap in which both cards could be accepted at t102 while Path A waited for an engine ceasefire keyed to the war's length (45 weeks), so the cards said "signed" and the engine withheld the Federation for weeks. Game designer and historian ruling: the historical ceasefire, framework and signing came 1-3.5 weeks apart (23 February, 1 March, 18 March 1994). Left alone, the historical run signs through Path A before t102 and Path A' cannot fire. `tools/scenario_runner/run_baseline_regression.ts` fails both the compare and the re-pin if that ever stops holding. **Implementation-note (early-war flip use):** Implementation may scale flip by capability; tracked as implementation detail. **Implementation-note (formation-aware early-war flip):** Implementation may include formation strength in flip formula; tracked as implementation detail. **Brigade movement and combat:** No separate movement step; pressure–breach–control-flip pipeline.

### System 11: Contested Control Initialization
**State:** `control_status` per municipality/settlement. **Political control semantics:** Per settlement (`political_controllers[sid]`); municipality control derived. **Core rules:** control_status derived from stability metrics (SECURE >= 60, CONTESTED 40-59, HIGHLY_CONTESTED < 40). **Implementation-note (coercion):** Optional per-municipality coercion pressure tracked as implementation scope. **Constraints:** deterministic.

---

## Appendix A (v0.6): State schema additions

**Implementation-note (Phase 3 Engine & State Refactoring, 2026-03-08):** The monolithic `GameState` was restructured into nested domains (`military`, `political`, `displacement`) to enforce strict boundaries. 
- **Root:** `schema_version`, `meta`, `factions`, `turn_summaries`, `operation_history`, `pending_paramilitary_requests`.
- **`military`:** `formations`, `militia_pools`, `front_segments`, `front_posture`, `front_pressure`, `casualty_ledger`, `corps_command`, `brigade_movement_state`, `municipality_support_orders`.
- **State-ownership clarification (2026-04-03):** Compatibility-era front fields may still appear in raw state, but corps sectors and player-safe summaries are the modern frontline shell.
- **`political`:** `political_controllers`, `municipalities`, `war_exhaustion`, `war_alliance_rbih_hrhb`, `rbih_hrhb_state`, `enclave_resilience`, `international_visibility_pressure`, `sarajevo_state`.
- **`displacement`:** `displacement_state`, `civilian_casualties`, `municipality_displacement`, `settlement_displacement`.

All state additions are serializable and deterministic. Disposable derived caches remain non-serialized; the materialized current-turn standing-OG/AoR snapshot is the explicit persistence exception.

**Global state:** `international_visibility_pressure`, `enclaves[]`, `sarajevo_state`

**GameState (brigade operations):** `brigade_posture_orders`, `corps_command`, `army_stance`, `og_orders`, `settlement_holdouts`. Brigade location is per-formation `location_osid`; no brigade_aor, brigade_aor_orders, or brigade_mun_orders.

**Faction state:** `patron_state`, `embargo_profile`, `maintenance_capacity`, `negotiation_state`, `capability_profile`

**Formation state:** `equipment_state`, extended posture fields and eligibility flags; **brigade operations:** `posture`, `corps_id`, `composition`, `disrupted`, **`garrison`** (boolean; parsed from OOB, forces defend posture in bot AI — e.g. 65th Protection Regiment Sarajevo); **`distinction_potential`** (`'tier_1'|'tier_2'|'tier_3'`; reduces decoration-earning thresholds by 30–35% for historically distinguished units — replaces pre-awarded `historical_decorations` at war start; see decoration_evaluator.ts `getDistinctionMult()`); **`decorations`** (BrigadeDecoration[]; earned during the war only — never pre-awarded from OOB). **HRHB cohesion floor (n292):** time-varying via war_timeline (40 until w52, 30 after w52) in `faction_progression.ts`.

**Settlement/Municipality state:** `legitimacy_state`, `control_status`, `coercion_pressure_by_municipality` (implementation extension; non-normative until canonized). No assigned_brigade or brigade_aor; War phase uses location_osid per formation (System 8).

**Not serialized (derived each turn):** brigade pressure, density, resilience modifier, and the five disposable military caches `active_offensives_against_corps`, `home_distance_cache`, `militia_garrison`, `sector_combat_ratings`, and `unresolved_sector_brigades`. **Persisted turn-boundary projection:** `corps_front_sectors` is the per-corps partition of front edges via multi-source BFS, split by opposing faction and capped at MAX_SECTOR_EDGES=25 / MAX_SECTOR_BRIGADES=8; Territory Voronoi BFS from front edges creates contiguous territory_osids per sector; brigades are classified by territory membership — in territory → assigned, outside all sectors → reserve of nearest; exempt corps are excluded. That snapshot and its formation sector/sub-segment assignments are preserved across load. **Legacy note (2026-04-03):** the old `local_fronts` cache is retired from the live schema/runtime; compatibility density fallback now derives directly from `brigade_front_assignment + assignable_front_segments` when sector truth is absent. **Implementation-note (2026-03-04 brigade discipline):** Brigade AI enforces directive discipline — brigades may only attack OSIDs listed in effectiveDirective.offensive_targets (sole exception: counter-attacks). Combat fatigue: ops.fatigue increments +2 per attacker/+1 per defender battle, cap 30; recovers -1 every 2 turns (FATIGUE_RECOVERY_INTERVAL=2) when the formation did not fight that turn, including front-assigned formations. Frontline duty adds +0.5 fatigue points per turn (FRONTLINE_FATIGUE_PER_TURN=0.5). One turn is one week. The owner ratified these accepted-n101 coefficients on 2026-10-27: the later 2026-03-08 correction (`6f3c18682`) supersedes the earlier n292 3-turn/1.5/off-front policy (`777d7f33f`). This reconciles rate policy; it does not retune coefficients. Separately, the execution-consistency timing repair applies current-turn engagement exclusion in the post-combat recover-formation-fatigue step; applyFrontlineDutyFatigue() owns frontline duty in update-formation-fatigue before planning/combat; applyFatigueRecovery() owns only postcombat recovery and existing strain, without another duty increment. Forecasts and resolution therefore use the same entering-combat fatigue, battle fatigue applies once, and combatants cannot recover that week. Fatigue acts as a combat power modifier: getFatigueMult() applies floor 0.6× for attackers, 0.75× for defenders at max fatigue. Early-war supply-assignment fatigue inert for war-phase brigades (no assignment field). **Vienna Declaration truce (2026-03-04):** At week 4 (May 1992), the Vienna Declaration event fires (evaluate-events step, src/sim/local_truces.ts) and sets state.vienna_declaration_turn. After that point, bot RS and HRHB corps filter each other's controlled OSIDs from offensive_targets, except Posavina corridor (brod/derventa/odzak/bosanski_samac/orasje) and jajce. Player may still attack across the truce — detected in check-truce-break pipeline step; first violation sets state.truce_broken_turn[faction] and emits a warning event. Opponent bot gains +0.25 aggression for 6 turns after a truce break. State fields: vienna_declaration_turn?, truce_broken_turn?.

For tunable parameter tables (Appendix B), doctrine eligibility and effects (Appendix C), capability progression curves (Appendix D), and stability score calculation (Appendix E), see the full tables in archived Peace Specification and Systems_Manual_v0_4_0.md; the normative rules above are sufficient for integration.

**Implementation-note (tactical map and desktop app):** The launchable desktop GUI (Electron), tactical map UI (War Status, order arrows, ORDERS/AAR/EVENTS tabs, replay scrubber with read-only Play/Pause, step controls, and selected-frame map inspection, advance-turn flow), and main/renderer IPC contract are specified in engineering docs: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `GUI_DESIGN_BLUEPRINT.md`, and `DESKTOP_GUI_IPC_CONTRACT.md`. The **New Game** flow is a case file: faction dossier, explicit historical/emergent mode, fixed April 1992 scenario, and inventory-backed Field Records. It sets `meta.player_faction` and `meta.decision_mode`. The mode chooses whether the other factions replay the record or improvise; it does not change what the player's own atrocity costs (`SENSITIVE_HISTORY_DESIGN_GATE.md` §2a(i)); exact delivery behavior is specified in DESKTOP_GUI_IPC_CONTRACT.md. The **operational 3D map** (`map_operational_3d.html`) provides formation counter data modes (D-key cycle), two-tier formation counters (brigade light / corps CRT style), stem lines to terrain, read-only IPC queries (movement range/path, combat estimate, supply paths, corps sectors, battle events), polygon movement range and settlement highlight rings, right-side panel stack (Selection with posture/deploy, Orders queue, Battle log, Forces summary), SELECT/ATTACK/MOVE mode toolbar (1/2/3, Escape) using stage-posture-order and stage-attack-order, right-click movement preview, attack-odds preview, fog/recon visualization, F-key map overlays (F1–F4: operations, supply, displacement, command), battle replay markers with skip, and command hierarchy panel with OOB parity — all specified in TACTICAL_MAP_SYSTEM.md and DESKTOP_GUI_IPC_CONTRACT.md. This manual defines simulation mechanics and state; UI behavior and delivery are not specified here. **Map rendering filter:** `corps_asset` and `army_hq` formations are filtered from map GeoJSON — they are organizational concepts, not physical map units.

---

## v0.6 Canon consolidation

This document (v0.6.0) consolidated the Systems and Mechanics Manual. Supersedes Systems_Manual_v0_5_0.md. As of v0.7.3, the simulation is single-phase (War only); peace phase removed.

## v0.7 Additions

v0.7.0 adds the following normative sections:
- **§6.2 Entrenchment** — Updated: MAX_ENTRENCHMENT=6, ENTRENCHMENT_PER_TURN=0.035, ENTRENCHMENT_EFFECTIVE_CAP_TURNS=26, sqrt formula.
- **§6.6 Graz Accords** — RS-HRHB non-aggression pact, corps-pair truces, Kiseljak exclusion, cold fronts.
- **§6.6a RBiH-HRHB Alliance** — Updated: DEFAULT_INIT_ALLIANCE=0.75, PATRON_PRESSURE_COEFF=0.018, war_earliest_turn=40.
- **§6.7 Reactive Sector Defense** — Distance-weighted reserve contribution (Layer A) and five sector stances (Layer B).
- **§6.8 Ops-Only Attack Doctrine** — All attacks through CorpsOperation; march-first doctrine.
- **§6.9 Brigade No-Destruction** — Emergency retreat replaces destruction; retreat chain.
- **§7.7 Army HQ Reserve Pool** — Elite brigade loan lifecycle, request priority, force-recall conditions.
- **§7.9 AI Commander System** — Optional Claude API integration, 4 modes (cadet/recruit/officer/commander), decision log, QA tool. v0.4.9: narrative features (corps dialogue, battle narratives, war dispatches).
- **§7.10 Conditional Events** — EventCondition type (9 variants), recursive evaluator, 3 converted historical events.
- **§7.11 Corps Diagnostic Fields** — CorpsStatusReason (8 values), op_launch_trace gate audit.
- **System 5a: Enclave Resilience Expansion** — Garrison power, increased resilience scaling, always-besieged enclaves, urban defense.
- **System 8a: Sector Intel** — Per-sector confidence model, recon-by-force, bot target weighting, fog-of-war.

Supersedes Systems_Manual_v0_6_0.md. Deprecated docs in docs/_old/10_canon/.

## v0.8 / v0.9 Additions

v0.9.0 (filename + body version-bump pass, 2026-05-05) folds in already-landed v0.7.x → v0.9.x amendments and the v0.8 Command Chain integration. The Manual remains the authoritative implementation spec for all the systems below; mechanics already documented in §6 / §7 / §14 / Appendix A continue to govern. Highlights:

**Combat / dissolution amendments:**
- **§6.4 Morale-collapse override** (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, commit `58624617`, 2026-05-03): fourth dissolution path keyed on `morale_low_streak ≥ 8`. Gated behind `MORALE_OVERRIDE_ENABLED` env flag (default off); counter increments diagnostically with flag off. Engine Invariants §6.2.4 mirrors this.
- **must_hold variable multiplier** (R2-1, commit `e4c661d5`, 2026-05-03): `commander/allocate.ts` replaces the flat 1.5× must_hold weight with `max(2.0, min(5.0, 0.75 × commitment_ratio))` — the must_hold weight scales with the corps's commitment ratio rather than being a static lever. Pressure-responsive, faction-agnostic. The `must_hold` substrate is now normative; the static fallback is retired.
- **`equipment_quality_modifier` substrate** (Wave 3, commit `658241df`, 2026-05-04): new effect kind `EventEffectEquipmentQualityModifier` (multiplicative, faction-scoped, time-bounded) + `MilitaryState.equipment_quality_modifiers` field + reader `getActiveEquipmentQualityMultiplier(state, faction, currentTurn)`. Threaded through combat predictor power computation behind a no-op early return; preserves byte-stable arithmetic on no-event historical paths. Mirrors `recruitment_modifier` precedent. Consumed by event #11 `csq_weapons_embargo_partial_lift` (Wave 3) and Wave 4 `csq_patron_equipment_delivery_confirmed` (substrate-then-content sequencing precedent).
- **Reconstitution policy step curve** (Wave 4 Lane A, commit `e9584dd3`, 2026-05-04): VRS `getFactionReinforcementMult` flat 1.0× → 4-band step curve (1.0× <w52, 0.85× <w78, 0.65× <w104, 0.45× thereafter); HRHB extended 2-band → 4-band; RBiH unchanged. Mechanism is faction-agnostic in code (`lookupStepCurve`); only data parameters drive faction asymmetry. Closes the Force-Quality Gap 2 upstream lever identified in `20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md`.
- **`planning_invalidated` cooldown** (LANE-2026-05-02-B1-PLANNING-INVALIDATED-COOLDOWN, 2026-05-02): planning-invalidated ops now feed `failed_offensive_objectives` cooldown like other failure modes (max_failures, brigade_attrition); after `OBJECTIVE_FAILURE_THRESHOLD=2` failures on the same objective the existing 8-turn cooldown bounds re-emission (exception since RF-AI2, 2026-11-14: a bot commander-planned op ending `zero_eligible_axis`/`max_failures` locks out at once for 8 × failure_count turns; see "Bot objective lockout" in §6). `probe_complete` (recon-by-force) and `political_blocked` (truce-induced) remain genuinely skipped. Already documented inline at §6.4.

**v0.8 Command Chain (closed):**
- **Corps Commander Intelligence** (v0.8.0): named officers exercise interpretation authority over corps directives via the `commander/` cluster (`commander_loop.ts`, `briefing.ts`, `allocate.ts`, etc.). Officer competence/aggressiveness/defensiveness shape directive translation. See §7.5 (officer system) + §6.4 (corps command and army stance).
- **Commander Maturity** (v0.8.1): persistent belief state, motive stack, and per-turn decision trace serialized on `CorpsCommandState`. Inspectable in player command-review surfaces.
- **Political Leader Bot** (v0.8.2): bot factions have a political layer (foundational decisions, patron management, faction identity) that drives the army-level commander's strategic-priorities packet. See `political/` cluster.
- **Order Interpretation** (v0.8.3): explicit semantic gap between player order and named-officer interpretation. Subordinates may delay, partial-execute, refuse, or escalate-to-context. Surfaced in the Pre-Advance Review surface.
- **Autonomy Depth + Claude API** (v0.8.4): named-officer autonomy operates within a deterministic envelope; the optional Claude-API integration (§7.9) may add narrative texture but cannot change the autonomous decision once recorded. Replay determinism preserved via `decision_log.ts`.
- **Phase 0 panel pattern** (durable lesson, codified in PROJECT_LEDGER_KNOWLEDGE): when modifying a system that crosses combat / commander / political / events surfaces, dispatch a Phase 0 panel of the affected experts before writing code. Lane reports cite this pattern explicitly.
- **Replay-buffer streaming** (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER + producer, 2026-05-04; replay consumer closures 2026-05-10): `replay_save_sequence.json` sidecar captures per-turn save deltas; harness emit (`replay_save_emit.ts`) mirrors `brigade_temporal_emit.ts` precedent. Replay playback consumer + ReplayScrubber UI live on tactical map with deterministic summary cards, sparse manifest loading, read-only Play/Pause and step controls, and full-frame map inspection when a full replay sequence is present.
- **Tier 2 perf** (R2-4 baseline + Mission C A0 Tarjan, 2026-05-04): supply-osid corridor derivation moved from O(E²) per-edge BFS-removal to O(V+E) iterative-DFS Tarjan in `findBridgesInSubgraphOsid`. G1 (10k property trials) + G2 (parity wrapper) + G3 (40w hash-identity) gates established the deterministic-equivalence ship contract for future hot-path optimizations.

**v0.9 product spine (in progress):**
- **Decision Room and command loop**: see Rulebook §17.2 / §17.5; mechanically the Decision Room is a derived read-model over Strategic Priorities, opportunity dossiers, source handoffs (operational SITREP, command briefing, Turn Aftermath, active cost summary, Chronicle). No new state shape; no parallel action queue.
- **Sensitive-history Ring 1 substrate** (Mission E ghost #3 `enclave_defended`, LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE, 2026-05-04 + Q-CANON-RUPT-4 Path (d), commit `ce95c162`): the canonical pattern for counterfactual-recording ahistorical paths is a deterministic predicate (e.g., `predEnclaveDefended` reading `enclave_held_through_turn` flag) plus a §4-compliant ghost narrative entry. Rupture consequences fire ONLY on emergent satisfaction of a discrete game-state condition; calendar-window heuristics are forbidden. Counterfactual silence in ahistorical campaigns is canonically correct. See `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11, §2 criterion 3, §5.
- **Divergence event substrate** (R2-2 + Wave 4 + Wave 4 Lane B through Wave 18): 125 divergence events authored at `data/scenarios/events/consequences.json`. `cost_ledger_annotation` effect family + `MilitaryState.cost_ledger_annotations` additive optional field. New condition kinds (`alliance_holds_past_w35`, `paramilitary_authorization_refused`, `enclave_held_alt_intervention`, etc.) layered on existing `EventCondition` union without breaking backward compatibility. Wave 18 (2026-05-10) added four non-sensitive mirror closures using only existing predicates/effects: HRHB third-party arms channel, HRHB captured-equipment windfall, RS winter supply attrition, and RS doctrine drift.
- **Officer-quality observability** (Force-Quality Gap 1, commit `0bd5a938`, 2026-05-04): `BrigadeTemporalRow` schema extended with optional `officer_quality` + `officer_count_active` fields (conditional attach for byte-identity preservation on legacy fixtures). Per-turn trajectory now traceable in `brigade_temporal_log.jsonl`.
- **Sector subtype anomaly classification** (LANE-2026-05-02-B3, 2026-05-02): `AnomalyReport.subtype` field disambiguates `pool_exhausted` (corps has 0 unassigned brigades) vs `misallocated` (corps has surplus in another sector) for empty-contested-sector and undefended-front-subsegment anomalies. Routes signals to /operations-expert + /formation-expert vs /corps-army-commander.
- **Per-turn brigade-keyed snapshot emission** (LANE-2026-05-02-A1, 2026-05-02): `brigade_temporal_log.jsonl` per-turn 20-field row schema written by harness (`scenario_runner.ts`), not engine. Pure observability; no engine state shape change; no save/load impact; no run-hash impact. Mirrors `weekly_report.jsonl` precedent.

Supersedes Systems_Manual_v0_7_0.md.

---

*Systems and Mechanics Manual v0.9.0*
*Single-phase (War only) model; v0.4 Systems 1–11, v0.7 combat/defense/intel/AI commander systems, v0.8 Command Chain, v0.9 product-spine substrate amendments integrated*
