# Phase II Specification v0.5.0
## Mid-War Phase: Fronts, Supply Pressure, Exhaustion, Command Friction

**Status:** Canon (v0.5.0; full v0.3 content preserved)
**Canon Version:** v0.5.0
**Freeze Date:** 2026-02-02
**Supersedes:** v0.3.0 (no v0.4 Phase II; consolidated into canon set)

---

## 1. Purpose

Phase II (Mid-War / Consolidation) models the period when:

1. **Fronts are active**: Sustained opposing control produces front-active settlements; Areas of Responsibility (AoRs) may be instantiated per Phase_Specifications_v0_5_0 and Phase I hand-off.
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
- Implement Phase E systems (pressure eligibility/diffusion, AoR instantiation rules, rear zones) — those are separate roadmap phases.

### 2.3 Control changes in Phase II (canon amendment 2026-02)

**Fronts move only through military actions.** In Phase II, political control (political_controllers) may change only as a result of **military-driven** resolution: specifically, settlement-level flips when front pressure exceeds breach threshold on a front edge (breach-driven flip). The Phase I control-flip mechanic (municipality-level stability and militia/formation strength) **does not run** when meta.phase === "phase_ii". Thus, in Phase II there are no municipality flips from Phase I logic; only breach-based settlement flips apply. Exceptions (e.g. a short list of "contested municipalities" that retain Phase I–style flip eligibility in Phase II) may be defined in a future amendment.

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

- **GameState**: brigade_municipality_assignment (Record<FormationId, MunicipalityId[]>), brigade_mun_orders, brigade_aor (Record<SettlementId, FormationId | null>), brigade_aor_orders, brigade_posture_orders, corps_command, army_stance, og_orders, settlement_holdouts.
- **FormationState** (per formation): posture, corps_id, composition, disrupted.
- **Movement state**: brigade-level movement transitions are represented in `brigade_movement_state` with statuses `deployed | packing | in_transit | unpacking`; settlement movement orders are staged in `brigade_movement_orders`.

**Movement-state contract (canonical):**
- UI labels map these states to **Combat** (`deployed`) and **Column** (`packing | in_transit | unpacking`) for player readability.
- Settlement movement pathing remains friendly-only in canonical runs.
- Combat movement remains fixed-rate at `3` settlements per turn.
- Column movement is composition-dependent with a baseline of `12` settlements per turn and roads/terrain-scalar penalties (weaker road access, uphill transitions, major-river crossing penalties).

For full type definitions and interfaces (BrigadePosture, CorpsStance, ArmyStance, EquipmentCondition, BrigadeComposition, BrigadeAoROrder, BrigadePostureOrder, CorpsOperation, CorpsCommandState, OGActivationOrder, SettlementHoldoutState), see docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §8.

---

## 5. Phase II Turn Structure and Pipeline Integration

Phase II logic runs inside the sim turn pipeline (src/sim/turn_pipeline.ts):

- **When**: Only when meta.phase === "phase_ii". For meta.phase === "phase_i", Phase I phases run and Phase II consolidation is skipped; for phase_0, the state pipeline is used.
- **Where**: After "phase-ii-aor-init" (when present), **update-formation-lifecycle** runs first (so brigades may transition forming → active before bot AI evaluates them). Then the following brigade operations phases run in order, then "phase-ii-consolidation":
  1. validate-brigade-aor
  2. rebalance-brigade-aor
  3. enforce-brigade-aor-contiguity (repair islands; no brigade covers non-contiguous settlement)
  4. enforce-corps-aor-contiguity (when corps_command present; enclave-aware)
  5. surrounded-brigade-reform (reform in home territory when brigade AoR entirely in enclave)
  6. apply-municipality-orders
  7. generate-bot-brigade-orders
  8. apply-aor-reshaping
  9. apply-brigade-posture
  10. update-corps-effects
  11. advance-corps-operations
  12. activate-operational-groups
  13. equipment-degradation
  14. apply-posture-costs
  15. compute-brigade-pressure
  16. phase-ii-resolve-attack-orders (battle resolution: terrain, casualties, control flips; see Systems Manual §7.4)
  17. phase-ii-hostile-takeover-displacement (4-turn hostile-takeover timer, camp holding pool, camp reroute to urban centers; at-war gate applies, including RBiH-HRHB alliance gate)
  18. phase-ii-recruitment (accrual + ongoing mandatory/elective recruitment when recruitment_state exists; see Systems Manual §13)
  19. phase-ii-brigade-reinforcement (reinforce brigades from militia pools)
  20. phase-ii-wia-trickleback (wounded return to formations when out of combat; rate WIA_TRICKLE_RATE, only when not in attack posture and not disrupted)
  21. update-og-lifecycle

When **recruitment_state** exists, **phase-ii-recruitment** runs before brigade reinforcement so reinforcement does not consume pool manpower first. Ongoing recruitment may retry mandatory and elective OOB brigades under deterministic per-faction caps (see Systems Manual §13). **Implementation-note (deferred start mode 2026-02-17):** In scenarios with `recruitment_mode: "player_choice"` and `no_initial_brigade_formations: true`, turn 0 starts with corps/army_hq only; brigades are recruited from turn 0 onward under standard eligibility (`available_from === 0` at turn 0, `available_from <= turn` later) using deterministic pools seeded from the same Phase 0->I organizational penetration path. Then phase-ii-consolidation runs. Order within consolidation:
  1. Detect fronts: detectPhaseIIFronts(state, edges).
  2. Update supply pressure: updatePhaseIISupplyPressure(state, edges, supplyReport).
  3. Update exhaustion: updatePhaseIIExhaustion(state, fronts).

Command friction is computed where needed (e.g. when scaling supply pressure or exhaustion deltas) and is not a separate pipeline phase.

---

## 6. Entry / Transition from Phase I

Phase I → Phase II transition is **deterministic and one-way**, **state-driven** (no fixed elapsed-time threshold). It is implemented by `applyPhaseIToPhaseIITransition(state)` in src/sim/phase_transitions/phase_i_to_phase_ii.ts, invoked after Phase I phases and after updating the opposing-edges streak for the turn.

**Adopted transition rule (D0.9.1, state-driven):** All of the following must hold:

1. **meta.phase === "phase_i"**
2. **referendum_held === true** and **war_start_turn** is defined and **meta.turn >= war_start_turn**
3. **JNA transition complete (Phase I §6.1):** phase_i_jna.transition_begun and withdrawal_progress >= 0.95 and asset_transfer_rs >= 0.9
4. **Front-precursor persistence:** The number of opposing-control adjacency edges (same edge set as Phase II front emergence) is >= **MIN_OPPOSING_EDGES** (25) and this condition has persisted for **PERSIST_TURNS** (4) consecutive turns. Persistence is tracked in **meta.phase_i_opposing_edges_streak** (updated once per Phase I turn before the transition check; reset to 0 when count < MIN_OPPOSING_EDGES).

Constants: **MIN_OPPOSING_EDGES = 25**, **PERSIST_TURNS = 4**. No hard-coded historical dates. Once meta.phase === "phase_ii", Phase I phases are no longer executed for subsequent turns.

When **edges** are provided to the transition, it initializes brigade AoR and corps command state (see §7.1).

---

## 7. Fronts (Emergent, Derived)

- **Definition**: A front is a set of settlement adjacency edges where the two settlements have different non-null political_controller (opposing control).
- **Grouping**: Edges are grouped by normalized faction pair (side_a, side_b); each group is one front descriptor.
- **Stability**: Derived from front_segments (active_streak, max_active_streak). Static when min(active_streak) ≥ N (e.g. 4); oscillating when any edge has active_streak === 1 and max_active_streak > 1; fluid otherwise.
- **No geometry**: Front descriptors contain only edge_ids and metadata; no polygon or geometric state. Derived each turn; not serialized (Engine Invariants §13.1).

### 7.1 Brigade AoR at Phase II entry

When the Phase I → Phase II transition runs with **edges** provided, brigade deployment initializes in two layers:

1. **Municipality assignment layer** (`brigade_municipality_assignment`): active brigades are assigned to one or more municipalities (multiple brigades may share a municipality).
2. **Settlement AoR layer** (`brigade_aor`): front-active settlements (plus optional 1-hop rear depth) are deterministically derived from municipality assignments; each settlement is assigned to exactly one brigade or null (rear).

Within a municipality shared by multiple brigades of the same faction, settlement split is deterministic (stable ordering + deterministic graph traversal/tie-break). Municipality movement orders (`brigade_mun_orders`) apply before pressure and attack resolution; settlement-level reshape orders (`brigade_aor_orders`) remain available as fine-grain adjustment. See Systems_Manual_v0_5_0.md §2.1 and §6; implementation: src/sim/phase_ii/brigade_aor.ts and src/sim/turn_pipeline.ts.

**Implementation-note (2026-02-14):** When `state.corps_command` exists and is non-empty, assignment uses the corps-directed algorithm (partition front into corps sectors, allocate brigades along each sector's frontline; home municipality plus up to two contiguous neighbor municipalities per brigade; contiguity enforced and repaired). Otherwise the legacy Voronoi BFS path is used (Phase I / tests). Rebalance step guards transfers with `wouldRemainContiguous` so the donor brigade stays contiguous. See [BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **Implementation-note (2026-02-15):** Corps-level contiguity is enforced: `checkCorpsContiguity`, `repairCorpsContiguity`, `enforceCorpsLevelContiguity` (enclave-aware; settlements in faction enclaves excluded). Step 9 in `assignCorpsDirectedAoR`; pipeline step `enforce-corps-aor-contiguity` after `enforce-brigade-aor-contiguity` (guards: phase_ii, brigade_aor, corps_command). Brigade contiguity repair prefers same-corps targets. See [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **Implementation-note (2026-02-17):** No brigade may cover a non-contiguous settlement. Rebalance absorb only accepts transfers when receiver would remain contiguous (`checkBrigadeContiguity`). Pipeline step `enforce-brigade-aor-contiguity` after `rebalance-brigade-aor` runs `enforceContiguity` to repair islands. Surrounded brigades (entire AoR in enclave) are reformed in home territory: AoR cleared, HQ set to faction-controlled settlement in main territory (prefer home mun); if none, formation set inactive. Pipeline step `surrounded-brigade-reform` after `enforce-corps-aor-contiguity`. Design: [AOR_CONTIGUITY_AND_SURROUNDED_BRIGADE_DESIGN_2026_02_17.md](../40_reports/convenes/AOR_CONTIGUITY_AND_SURROUNDED_BRIGADE_DESIGN_2026_02_17.md). **Scenario init order (2026-02-15):** Scenario runner calls `initializeCorpsCommand(state)` before `initializeBrigadeAoR(state)` so corps_command exists when municipality assignment runs and the corps-directed path (with contiguity enforcement) is used. `initializeBrigadeAoR()` then calls `enforceContiguity()` and `enforceCorpsLevelContiguity()` after `deriveBrigadeAoRFromMunicipalities()` as an idempotent safety net. See [SCENARIO_INIT_SIX_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). **Brigade/corps HQ (2026-02-15):** Brigade and corps HQ settlement must be faction-controlled at creation. `resolveValidHqSid()` (recruitment_engine) validates default HQ from municipality data; if not faction-controlled, falls back to first (by SID sort) faction-controlled settlement in the same municipality. Applied to mandatory brigade, elective brigade, and corps HQ creation. See [SCENARIO_INIT_SIX_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).

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

## 12. Stubs / Known Limitations (Implementation)

- **phase_ii_exhaustion_local**: In schema but not driven by mechanics; may be used by future systems.
- **Transition conditions**: State-driven (D0.9.1): JNA complete + opposing-control edge count >= MIN_OPPOSING_EDGES for PERSIST_TURNS consecutive turns; no fixed time offset.
- **Command friction**: getPhaseIICommandFrictionMultipliers returns multipliers >= 1; applied to supply pressure and exhaustion increments.
- **Supply report**: Optional; isolation is zero when not provided (e.g. when Phase II runs without supply-resolution in same run).
- **Brigade operations (per BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md §8 and battle_resolution_engine_report_2026_02_12):** Phase II attack resolution is implemented as discrete battle resolution: combat power (garrison × equipment × experience × cohesion × posture × supply × terrain × corps × operations × OG × resilience × disruption), outcome thresholds (≥1.2 attacker victory, 0.7–1.2 stalemate, <0.7 defender victory), terrain modifier (rivers, slope, urban/Sarajevo bonus), per-engagement and cumulative casualties (casualty_ledger), equipment losses and capture on surrender, and deterministic snap events (Ammunition Crisis, Commander Casualty, Last Stand, Surrender Cascade, Pyrrhic Victory). Current casualty calibration uses baseline intensity 50, minimum 15 casualties per side per battle, undefended-defender casualty scale 0.5, and intensity divisor 350. **Defender casualty reporting floor (2026-02-18):** When a defender formation is present but personnel is at or below MIN_COMBAT_PERSONNEL, reported defender casualties use a floor (min(15, defenderPersonnel)) so run_summary and battle reports never show zero; applied loss remains capped so the formation stays at or above MIN_COMBAT_PERSONNEL. JNA equipment transfer to RS brigades is not implemented; RS brigades receive default composition from equipment_effects. **Implementation-note (2026-02-18):** When formations are created via runBotRecruitment (player_choice + init_formations_oob), RS OOB brigades with default_equipment_class mechanized or motorized now receive JNA-heavy composition (40 tanks, 30 artillery) via getRsJnaHeavyComposition() in equipment_effects; see INITIAL_BRIGADE_PLACEMENTS_STRENGTHS_JNA_REEVALUATION_2026_02_18 and PARADOX_RS_JNA_PARAMILITARY_PER_ARMY_FLAVOR_2026_02_18. OG donor tracking returns personnel equally to same-corps brigades at dissolution, not proportionally to original donors. The maintenance module is not yet integrated with the typed equipment system.
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
