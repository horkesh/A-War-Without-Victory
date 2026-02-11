# Phase II Specification v0.3.0
## Mid-War Phase: Fronts, Supply Pressure, Exhaustion, Command Friction

**Status:** DESIGN-FROZEN (retroactive)
**Canon Version:** v0.3.0
**Freeze Date:** 2026-02-02
**Supersedes:** None (retroactive specification aligned to Phase D implementation and canon)

---

## 1. Purpose

Phase II (Mid-War / Consolidation) models the period when:

1. **Fronts are active**: Sustained opposing control produces front-active settlements; Areas of Responsibility (AoRs) may be instantiated per Phase_Specifications_v0_3_0 and Phase I hand-off.
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

---

## 5. Phase II Turn Structure and Pipeline Integration

Phase II logic runs inside the sim turn pipeline (src/sim/turn_pipeline.ts):

- **When**: Only when meta.phase === "phase_ii". For meta.phase === "phase_i", Phase I phases run and Phase II consolidation is skipped; for phase_0, the state pipeline is used.
- **Where**: A single consolidation phase, "phase-ii-consolidation", runs after "supply-resolution" and before "update-formation-lifecycle". Order within consolidation:
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

---

## 7. Fronts (Emergent, Derived)

- **Definition**: A front is a set of settlement adjacency edges where the two settlements have different non-null political_controller (opposing control).
- **Grouping**: Edges are grouped by normalized faction pair (side_a, side_b); each group is one front descriptor.
- **Stability**: Derived from front_segments (active_streak, max_active_streak). Static when min(active_streak) ≥ N (e.g. 4); oscillating when any edge has active_streak === 1 and max_active_streak > 1; fluid otherwise.
- **No geometry**: Front descriptors contain only edge_ids and metadata; no polygon or geometric state. Derived each turn; not serialized (Engine Invariants §13.1).

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

## 12. Stubs / Known Limitations (Implementation)

- **phase_ii_exhaustion_local**: In schema but not driven by mechanics; may be used by future systems.
- **Transition conditions**: State-driven (D0.9.1): JNA complete + opposing-control edge count >= MIN_OPPOSING_EDGES for PERSIST_TURNS consecutive turns; no fixed time offset.
- **Command friction**: getPhaseIICommandFrictionMultipliers returns multipliers >= 1; applied to supply pressure and exhaustion increments.
- **Supply report**: Optional; isolation is zero when not provided (e.g. when Phase II runs without supply-resolution in same run).

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
- **Remaining stubs**: phase_ii_exhaustion_local not driven; local exhaustion not driven.

---

*Phase II Specification v0.3.0 — Retroactive, aligned to canon and Phase D implementation.*
