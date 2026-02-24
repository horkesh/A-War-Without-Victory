# Phase II Specification v0.5.0
## Mid-War Phase: Fronts, Supply Pressure, Exhaustion, Command Friction

**Status:** Canon (v0.5.0; full v0.3 content preserved)
**Canon Version:** v0.5.0
**Freeze Date:** 2026-02-02
**Supersedes:** v0.3.0 (no v0.4 Phase II; consolidated into canon set)

---

## 1. Purpose

Phase II (Mid-War / Consolidation) models the period when:

1. **Fronts are active**: Sustained opposing control at OSID boundaries produces front segments; brigade location is **location_osid** only (no Areas of Responsibility). Phase I hand-off sets location_osid per formation.
2. **Supply pressure and exhaustion dominate**: Overextension and isolation increase supply pressure; static fronts and supply pressure drive irreversible exhaustion (Engine Invariants §4, §6, §8).
3. **Command friction degrades intent**: Exhaustion and front length reduce effective command coherence; friction may scale Phase II effects (supply pressure and/or exhaustion accumulation) but never flips control or authority (Systems Manual §8).
4. **No total victory**: Front descriptors and Phase II logic do not produce decisive territorial or victory outcomes; war trends toward stalemate or collapse.

Phase II begins only after a deterministic transition from Phase I (see §6). Phase II turn structure integrates into the sim pipeline after supply-resolution; Phase II phases run only when meta.phase === "phase_ii".

**Design Principle:** Phase II uses **front-emergent** mechanics (derived fronts, supply pressure, exhaustion, command friction). Derived front descriptors are not serialized (Engine Invariants §13.1). All Phase II mechanics are deterministic; no randomness, no timestamps.

---

## 2. Conceptual Definition

### 2.1 What Phase II Is

Phase II represents:

- **Front Emergence**: Fronts derived from settlement-level opposing political control across adjacency edges; fronts are descriptors (id, edge_ids, created_turn, stability) only—no geometry created or stored.
- **Front Stability**: Fluid / static / oscillating derived from segment active_streak (e.g. static when sustained opposing control ≥ N turns).
- **Supply Pressure**: Monotonic per-faction pressure from overextension (front edge count) and isolation (critical/strained supply); no free replenishment.
- **Exhaustion Accumulation**: Irreversible, monotonic faction-level exhaustion from static fronts and supply pressure; does not flip control.
- **Command Friction**: A computed factor (exhaustion + front length) that degrades intent; may scale supply pressure and/or exhaustion increments; never directly flips control or authority.

### 2.2 What Phase II Is NOT

Phase II does **not**:

- Serialize derived state (front descriptors, corridors): Engine Invariants §13.1; all derived state is recomputed each turn (§13.2).
- Introduce randomness or timestamps.
- Hard-code historical outcomes or dates.
- Allow exhaustion or friction to directly change political_controller or authority.
- Implement Phase E systems (pressure eligibility/diffusion, rear zones) — those are separate roadmap phases. AoR is phased out; Phase II uses OSID/ZoC only.

### 2.3 Control changes in Phase II (canon amendment 2026-02)

**Fronts move only through military actions.** In Phase II, political control (political_controllers) may change only as a result of **attack resolution** (attack order → push-back and control flip at the target OSID) or **corps/frontline operations** as defined. There is no passive pressure flip. The Phase I control-flip mechanic **does not run** when meta.phase === "phase_ii". Only attack resolution or corps ops change control. See Systems Manual §7.4 and Attack Resolution Formula Spec.

**Implementation-note (consolidation flips 2026-02-21):** Consolidation as a flip-causing mechanic is Phase I only per canon. The pipeline step `phase-ii-consolidation-flips` still runs when meta.phase === "phase_ii", but `applyConsolidationFlips` returns 0 flips in Phase II (no control change). Bots may still use consolidation posture and scoring for behavior; only the application of control flips from that posture is disabled in Phase II.

---

## 3. Canonical Inputs

Phase II consumes:

- **GameState**: meta.phase, meta.turn, political_controllers, factions, phase_ii_supply_pressure, phase_ii_exhaustion, phase_ii_exhaustion_local (optional), front_segments (persistent segment state used for stability derivation).
- **Settlement edges**: EdgeRecord[] (adjacency) for front edge derivation and friction.
- **Supply report** (optional): SupplyStateDerivationReport for isolation (critical/strained counts per faction).

Phase II receives Phase I hand-off implicitly via state: control map stable, phase_ii_* fields initialized or defaulted when transition occurs.

---

## 4. Required State Fields

### 4.1 Persisted (serialized)

- **phase_ii_supply_pressure**: Record<FactionId, number>, domain [0, 100]. Monotonic per faction; never decreased.
- **phase_ii_exhaustion**: Record<FactionId, number>, non-negative, monotonic; never decreased by any system (Engine Invariants §8).
- **phase_ii_exhaustion_local**: Record<SettlementId, number> (optional). Non-negative; currently not driven by mechanics in implementation (stub).

### 4.2 Derived (not serialized)

- **Front descriptors** (PhaseIIFrontDescriptor): id, edge_ids, created_turn, stability. Recomputed each turn from political_controllers and settlement edges; never written to state or save (Engine Invariants §13.1).
- **Command friction factor**: Recomputed per faction each turn; never stored in state.

### 4.3 Brigade operations (persisted)

When brigade operations are enabled, the following state is persisted (serialized):

- **GameState**: brigade_posture_orders, corps_command, army_stance, og_orders, settlement_holdouts. Brigade location and attack resolution state are per-formation (see below). Removed from normative brigade ops state: brigade_aor, brigade_aor_orders, brigade_mun_orders, brigade_municipality_assignment (see HoI ZoC design: docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md).
- **FormationState** (per brigade): posture, corps_id, composition, disrupted; **location_osid** (OSID); **entrenchment_turns** (number, 0–MAX_ENTRENCHMENT); **defense_streak** (number); **disrupted_turns** (number, 0 = not disrupted); **movement_state** (deployed | packing | in_transit | unpacking).
- **Movement state**: brigade-level movement is represented in **movement_state**; movement orders are staged (e.g. brigade_movement_orders or attack orders) and resolved with ZoC constraints. Path validity: ZoC-constrained (in enemy ZoC, only stay, retreat, or attack ZoC source).

**Movement-state contract (canonical):**
- UI labels map movement_state to **Combat** (`deployed`) and **Column** (`packing | in_transit | unpacking`).
- Movement is along the operational contact graph (OSID to OSID); pathing ZoC-constrained and friendly-only where applicable.
- Combat movement fixed-rate (e.g. 3 OSIDs per turn when deployed); column movement composition-dependent (e.g. 12 OSIDs per turn baseline) with road/terrain penalties.
- **Implementation-note (OSID terrain-weighted column 2026-02-23):** Column movement uses terrain-weighted edge costs (road quality, slope, friction, river crossing, uphill) and composition-dependent rate: heavy mech >5% tanks+arty = 2 budget/turn, light infantry <1.5% = 4, mixed = 3. Transit lifecycle: order with `stance: 'column'` → in_transit with path and turns_remaining → on arrival set location_osid, clear movement state, reset entrenchment. Pathfinding: Dijkstra through friendly OSIDs only; deterministic tie-break. See 20260223_OSID_COLUMN_MOVEMENT_AND_BOT_COLUMN_MARCH.md.

For full type definitions and interfaces, see Attack Resolution Formula Spec §9 and docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §8 where still applicable.

---

## 5. Phase II Turn Structure and Pipeline Integration

Phase II logic runs inside the sim turn pipeline (src/sim/turn_pipeline.ts):

- **When**: Only when meta.phase === "phase_ii". For meta.phase === "phase_i", Phase I phases run and Phase II consolidation is skipped; for phase_0, the state pipeline is used.
- **Where**: After any phase-ii init (when present), **update-formation-lifecycle** runs first (so brigades may transition forming → active before bot AI evaluates them). Then the following brigade operations phases run in order, then "phase-ii-consolidation":
  1. **zoc-computation** (compute ZoC from deployed brigades' location_osid; derive ZoC-locked state)
  2. **osid-column-movement** (advance existing column transits; process new column orders with stance: 'column'; terrain-weighted pathfinding through friendly OSIDs. **Must run before zoc-constrained-movement** because that step clears all brigade_movement_orders.)
  3. **zoc-constrained-movement** (resolve movement orders; only stay, retreat, or attack ZoC source when in enemy ZoC)
  4. generate-bot-brigade-orders
  5. apply-brigade-posture
  6. update-corps-effects
  7. advance-corps-operations
  8. activate-operational-groups
  9. equipment-degradation
  10. apply-posture-costs
  11. **phase-ii-resolve-attack-orders** (attack resolution per Attack Resolution Formula Spec: combat power, outcome thresholds, casualties, push-back, control flip; see Systems Manual §7.4)
  12. phase-ii-hostile-takeover-displacement (4-turn hostile-takeover timer, camp holding pool, camp reroute to urban centers; at-war gate applies, including RBiH-HRHB alliance gate)
  13. phase-ii-recruitment (accrual + ongoing mandatory/elective recruitment when recruitment_state exists; see Systems Manual §13)
  14. phase-ii-ongoing-mobilization (per-turn pool growth from conscription, displacement, and cross-ethnic enrollment; see Systems Manual §13; runs before brigade-reinforcement so freshly mobilized manpower is available same turn)
  15. phase-ii-brigade-reinforcement (reinforce brigades from militia pools)
  16. phase-ii-wia-trickleback (wounded return to formations when out of combat; rate WIA_TRICKLE_RATE, only when not in attack posture and not disrupted)
  17. update-og-lifecycle

**Removed from pipeline (OSID/ZoC-only model):** All AoR steps (validate-brigade-aor, rebalance-brigade-aor, enforce-brigade-aor-contiguity, enforce-corps-aor-contiguity, surrounded-brigade-reform, apply-municipality-orders, apply-aor-reshaping, compute-brigade-pressure) are deleted. Phase II control change is only via attack resolution or corps/frontline operations. See AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md.

When **recruitment_state** exists, **phase-ii-recruitment** runs before brigade reinforcement so reinforcement does not consume pool manpower first. Ongoing recruitment may retry mandatory and elective OOB brigades under deterministic per-faction caps (see Systems Manual §13). **Implementation-note (deferred start mode 2026-02-17):** In scenarios with `recruitment_mode: "player_choice"` and `no_initial_brigade_formations: true`, turn 0 starts with corps/army_hq only; brigades are recruited from turn 0 onward under standard eligibility (`available_from === 0` at turn 0, `available_from <= turn` later) using deterministic pools seeded from the same Phase 0->I organizational penetration path. Then phase-ii-consolidation runs. Order within consolidation:
  1. Detect fronts: detectPhaseIIFronts(state, edges).
  2. Update supply pressure: updatePhaseIISupplyPressure(state, edges, supplyReport).
  3. Update exhaustion: updatePhaseIIExhaustion(state, fronts).

Command friction is computed where needed (e.g. when scaling supply pressure or exhaustion deltas) and is not a separate pipeline phase.

**Implementation-note (ceasefire and Washington Agreement in Phase II):** Implemented: pipeline steps phase-ii-ceasefire-check and phase-ii-washington-check run when meta.phase === "phase_ii", invoking the same precondition logic as Phase I (RBiH–HRHB bilateral ceasefire and Washington Agreement). They run in the phases array immediately after phase-ii-alliance-update.

---

## 6. Entry / Transition from Phase I

Phase I → Phase II transition is **deterministic and one-way**, **state-driven** (no fixed elapsed-time threshold). It is implemented by `applyPhaseIToPhaseIITransition(state)` in src/sim/phase_transitions/phase_i_to_phase_ii.ts, invoked after Phase I phases and after updating the opposing-edges streak for the turn.

**Adopted transition rule (D0.9.1, state-driven):** All of the following must hold:

1. **meta.phase === "phase_i"**
2. **referendum_held === true** and **war_start_turn** is defined and **meta.turn >= war_start_turn**
3. **JNA transition complete (Phase I §6.1):** phase_i_jna.transition_begun and withdrawal_progress >= 0.95 and asset_transfer_rs >= 0.9
4. **Front-precursor persistence:** The number of opposing-control adjacency edges (same edge set as Phase II front emergence) is >= **MIN_OPPOSING_EDGES** (25) and this condition has persisted for **PERSIST_TURNS** (4) consecutive turns. Persistence is tracked in **meta.phase_i_opposing_edges_streak** (updated once per Phase I turn before the transition check; reset to 0 when count < MIN_OPPOSING_EDGES).

Constants: **MIN_OPPOSING_EDGES = 25**, **PERSIST_TURNS = 4**. No hard-coded historical dates. Once meta.phase === "phase_ii", Phase I phases are no longer executed for subsequent turns.

When **edges** are provided to the transition, it ensures every brigade has **location_osid** set (e.g. via backfillFormationLocationOsid) and initializes corps command state (see §7.1). No AoR is populated.

---

## 7. Fronts (Emergent, Derived)

- **Definition**: A front is a set of settlement adjacency edges where the two settlements have different non-null political_controller (opposing control).
- **Grouping**: Edges are grouped by normalized faction pair (side_a, side_b); each group is one front descriptor.
- **Stability**: Derived from front_segments (active_streak, max_active_streak). Static when min(active_streak) ≥ N (e.g. 4); oscillating when any edge has active_streak === 1 and max_active_streak > 1; fluid otherwise.
- **No geometry**: Front descriptors contain only edge_ids and metadata; no polygon or geometric state. Derived each turn; not serialized (Engine Invariants §13.1).

### 7.1 Brigade location init by OSID at Phase II entry

When the Phase I → Phase II transition runs (or when a scenario starts in Phase II), **every brigade must have a valid location_osid** at creation. All spawn points and initial placements use **location_osid**.

**Remapping:** Brigades are placed by OSID, not by canonical settlement ID or municipality alone. Use **canonical_to_operational_map** (data/derived/operational/canonical_to_operational_map.json) to map canonical SID → OSID. When deriving from municipality (e.g. home_mun): choose one OSID deterministically—e.g. **first faction-controlled OSID in that municipality by stable sort** (e.g. OSID string sort). Same inputs (scenario, init_control, formation list) must always yield the same location_osid per formation.

**At creation:** Every brigade gets location_osid set when the formation is created (OOB spawn, recruitment, or scenario init). No brigade is placed or moved in canonical settlement space for game logic; movement and combat use only OSID.

**Canonical state:** Phase II uses **location_osid** per formation only; no brigade_aor or brigade_municipality_assignment. See docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md and AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md.

---

## 8. Supply Pressure

- **Sources**: (1) Overextension: pressure per front edge for that faction. (2) Isolation: pressure per critical/strained settlement from supply derivation report.
- **Properties**: Monotonic per faction (new pressure = max(current, computed)); cap at 100. No free supply (pressure never decreased).
- **Optional supply report**: When supply-resolution runs in the same pipeline, its report may be passed; otherwise isolation contribution is zero.

---

## 9. Exhaustion

- **Sources**: Static front count (exhaustion per static front) and supply pressure (exhaustion per pressure point).
- **Properties**: Monotonic, irreversible (Engine Invariants §8). Per-faction; delta capped per turn. Does not flip control or authority.
- **Command friction**: When wired, exhaustion increment is multiplied by command friction multiplier (>= 1); higher multiplier = more friction = larger effective delta (Phase D0.9.1).

---

## 10. Command Friction (D0.9.1)

- **Definition**: **command_friction_multiplier >= 1**; higher value = more friction = worse execution. Derived from faction exhaustion and front edge count for that faction.
- **Formula (conceptual)**: multiplier = 1 + exhaustion * k1 + frontEdgeCount * k2; clamped to [1, MAX_MULTIPLIER].
- **Use**: Phase II costs worsened by friction (supply pressure increment, exhaustion delta) are **multiplied** by this multiplier. Deterministic; monotonic with exhaustion and front length; never directly flip control or authority; never serialized.

---

## 11. Validation Requirements and Exit Criteria

- **Determinism**: Same state + inputs → same outputs; no randomness; no timestamps in state or derived artifacts.
- **Exhaustion monotonicity**: Exhaustion never decreased.
- **Supply pressure monotonicity**: Per-faction supply pressure never decreased.
- **No derived state serialized**: Front descriptors and command friction multiplier are not written to GameState or save (Engine Invariants §13.1).
- **Phase II only when meta.phase === "phase_ii"**: Phase I phases run only when meta.phase === "phase_i"; Phase II consolidation runs only when meta.phase === "phase_ii".

---

## 11.1 Scenario run artifacts (diagnostics)

When the scenario runner produces a run, **run_summary.json** includes a **phase_ii_attack_resolution** block (when Phase II ran): `weeks_with_phase_ii`, `weeks_with_orders`, `orders_processed`, `flips_applied`, attacker/defender casualty counts, `defender_present_battles`, and `defender_absent_battles`. This supports diagnostic interpretation of 0-flip or low-activity Phase II outcomes (e.g. no orders issued, threshold not met, or RBiH–HRHB gate active).

---

## 11.2 War Termination and End-Game

Phase II does not have a fixed duration. The war continues until one of the following terminal conditions is met:

### 11.2.1 Negotiated Settlement
When exhaustion, international pressure, and patron constraints reach sufficient levels, a negotiation window opens (see Rulebook §13). The game ends when a treaty is accepted by all parties per the acceptance computation. Treaty terms (territorial clauses, institutional competences, Brčko status) determine the end state.

### 11.2.2 Faction Collapse
If a faction's exhaustion exceeds a critical threshold while its authority is Fragmented across all controlled municipalities, and it controls fewer settlements than a minimum viability threshold, the faction is eliminated. Remaining factions continue or negotiate.

### 11.2.3 Timeout / Stalemate
If the war persists beyond a maximum duration (scenario-defined, e.g. 208 weeks / 4 years for the canonical April 1992 scenario), external intervention forces all parties to the table. This acts as a hard stop ensuring the game always terminates.

### 11.2.4 Scoring and Evaluation
There is no total victory (Rulebook §15). End-game evaluation considers:
- Territory controlled vs. pre-war territory
- Population preserved (displacement as negative score)
- Exhaustion level (lower is better)
- Treaty terms favorability (institutional competences, territorial recognition)

**Implementation-note:** War termination mechanics are not yet implemented. This section defines the minimal design intent. A full specification (negotiation window thresholds, collapse conditions, scoring formula) is a critical-path item per the comprehensive review roadmap. See ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md §3 Recommendations.

---

## 12. Stubs / Known Limitations (Implementation)

- **phase_ii_exhaustion_local**: In schema but not driven by mechanics; may be used by future systems.
- **Transition conditions**: State-driven (D0.9.1): JNA complete + opposing-control edge count >= MIN_OPPOSING_EDGES for PERSIST_TURNS consecutive turns; no fixed time offset.
- **Command friction**: getPhaseIICommandFrictionMultipliers returns multipliers >= 1; applied to supply pressure and exhaustion increments.
- **Supply report**: Optional; isolation is zero when not provided (e.g. when Phase II runs without supply-resolution in same run).
- **Brigade operations / attack resolution (canon):** Phase II attack resolution follows the **Attack Resolution Formula Spec** (docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md): combat power (attacker/defender formulas with entrenchment, resilience/defense_streak), outcome thresholds (≥2.0 decisive, ≥1.5 victory, ≥1.0 costly victory, 0.7–1.0 stalemate, 0.5–0.7 repulsed, <0.5 catastrophic), casualties (§4), push-back and control flip (§5), retreat tie-break (enemy adjacency count ascending, then OSID string sort). Implementation-note: Existing reports (BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md §8, battle_resolution_engine_report_2026_02_12) describe pre-OSID battle resolution; canonical target is the Formula Spec. Defender casualty reporting floor, JNA composition, OG donor tracking, and maintenance integration remain as implementation details where still applicable.
- **Phase II bot brigade AI (per BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md and AI_STRATEGY_SPECIFICATION.md):** Formation lifecycle runs before the brigade ops block so forming→active transition occurs before generate-bot-brigade-orders. Bot generates posture orders and attack orders in one pass; attack-order eligibility uses the posture just decided in that pass (pending posture), not the previously applied state. **Soft fronts** (adjacent enemy with no or weak garrison) receive **consolidation** posture; **real fronts** are brigade-vs-brigade. Consolidation brigades may still issue attack orders so rear cleanup produces casualty-ledger updates. Faction strategic objectives (offensive and defensive municipality lists—e.g. RS Drina/Sarajevo, RBiH enclaves/corridors, HRHB Herzegovina) and attack target scoring (undefended +150, corridor +95, offensive objective +85, home recapture +60, weak garrison 0–80, plus weighted consolidation/breakthrough score for rear cleanup and isolated clusters) are applied deterministically; tie-break by settlement ID. Fast rear-cleanup municipality bonus in implementation is faction-scoped (RS-scoped for Prijedor/Banja Luka set). Brigades in offensive-objective municipalities may use a lower coverage threshold for probe. **Implementation-note (2026-02-18):** Corps AI generates corps stance, named operations (expanded catalog including strategic_defense), OG activations (including defensive posture during strategic_defense and emergency ops), emergency defensive operations when sector threat exceeds threshold, and multi-corps offensive coordination under general_offensive; brigade AI uses dynamic elastic defense (1–4 brigades scaled by front length). Phase 0 bot investments run in headless pipeline; Phase I bot assigns hold/probe/push posture. See FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md (IMPLEMENTED_WORK_CONSOLIDATED §25). **RS early-war (priority B 2026-02-18):** RS doctrine phase, standing order "Territorial Seizure", effective attack-share taper, and corps E1 aggression override use weeks 0–26 (RS_EARLY_WAR_END_WEEK); previously 0–12. See PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md. One brigade per target per faction per turn (exception: OG operation + heavy resistance—not yet implemented). See Systems Manual §6.1 (Consolidation posture), §6.5 (soft/real front, target scoring, one-brigade-per-target).

---

## 13. Derived State and Serialization (Engine Invariants §13.1)

**Explicit:** Derived front descriptors (PhaseIIFrontDescriptor), corridor state, and command friction multipliers are **not** serialized. They are recomputed each turn from persisted state and inputs. Engine Invariants §13.1: "Derived states (corridors, fronts, municipality status) must not be serialized." §13.2: "All derived states must be recomputed each turn."

---

## 14. References

- Engine_Invariants_v0_3_0.md (§3, §4, §6, §8, §11, §13)
- Phase_Specifications_v0_3_0.md (Phase 3A/B/C; AoR instantiation only after Phase I)
- Phase_I_Specification_v0_3_0.md (§6 Transition to Phase II, §7 Hand-Off)
- Systems_Manual_v0_3_0.md (§6 Deployment and fronts, §8 Command and control degradation, §14 Supply and corridors)
- Rulebook_v0_3_0.md (player-facing)
- ROADMAP_v1_0.md (Phase D, Phase E ordering)
- PHASE_D_COMPLETION_REPORT.md (implementation behavior)

---

## 15. Implementation Notes

- **Transition rule (D0.9.1):** State-driven: meta.phase === "phase_i", referendum_held and turn >= war_start_turn, JNA complete (withdrawal_progress >= 0.95, asset_transfer_rs >= 0.9), and meta.phase_i_opposing_edges_streak >= PERSIST_TURNS (4). MIN_OPPOSING_EDGES = 25. updatePhaseIOpposingEdgesStreak(state, edges) runs each Phase I turn before applyPhaseIToPhaseIITransition. Implemented in src/sim/phase_transitions/phase_i_to_phase_ii.ts.
- **Friction (D0.9.1):** getPhaseIICommandFrictionMultipliers(state, edges) returns Record<FactionId, number> with values >= 1; higher = more friction. Supply pressure increment and exhaustion delta are **multiplied** by the multiplier. Friction never flips control or authority; never serialized.
- **Hostile-takeover displacement (2026-02-17):** After Phase II attack-resolution flips, municipalities with at-war hostile takeover enter a delayed displacement sequence: 4-turn takeover timer (mandatory for all sides) -> displacement to municipality camp pool -> 4-turn camp hold -> ordered reroute to urban centers with motherland preference and deterministic overflow. Receivers cap at pre-war population × 1.5 (Sarajevo area × 1.1 due to siege); overflow beyond cap is routed to next-closest urban centers. RBiH-HRHB allied flips (or before earliest war turn) do not trigger this path. Enclave overrun (Srebrenica/Gorazde/Zepa) applies higher kill fraction than standard displacement; routed arrivals are attributed by faction and feed destination militia pools deterministically.
- **Displacement routing and expulsion policies (2026-02-17):** Croat routing: Banja Luka/Prijedor area -> Herzegovina (Mostar, Livno) first; Posavina Croats -> Gradačac, Brčko, Orašje, high flee-abroad. Serb routing: FBiH Serbs -> RS; Sarajevo Serbs east-of-Sarajevo bias. Expulsion intensity (hostile takeover): RBiH takes from RS 50% Serbs; HRHB takes from RS 100% Serbs; RS takes from RBiH/HRHB 100% Bosniaks/Croats. Non-takeover (settlement-level): RBiH Serb (majority or minority) 50% gradual over 6 months; HRHB Serb 100%; RS Bosniaks/Croats 100% immediate.
- **Remaining stubs**: phase_ii_exhaustion_local not driven; local exhaustion not driven.

---

## v0.5 Canon consolidation

This document (v0.5.0) preserves the full Phase II Specification v0.3.0. There was no Phase II v0.4 document; Phase II is included in the canon set at v0.5. For cross-references to other canon docs use the v0_5_0 versions (e.g. Phase_Specifications_v0_5_0.md, Engine_Invariants_v0_5_0.md).

---

*Phase II Specification v0.5.0 — Full v0.3 content preserved; part of canon v0.5 set.*
