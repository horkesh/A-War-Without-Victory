# Phase H1.10 — Exhaustion semantics audit (docs-only)

**Date:** 2026-02-04  
**Scope:** Docs-only; no mechanics; no canon edits; no Phase O.

---

## 1) Purpose and non-goals

- **Purpose:** Produce a docs-only audit that clarifies what exhaustion *means* in the sim (interpretation), intended scale/domain, relation to supply pressure and command friction, and what downstream systems may or may not assume.
- **Non-goals:** No tuning; no mechanics changes; no normalization or clamping changes; no negotiation/end-state rules (Phase O out of scope). Output is an audit note and recommended follow-on decisions, not code or canon edits.

---

## 2) Canonical statements extracted (verbatim or near-verbatim, short)

**Engine Invariants v0.3.0 (§8 — Exhaustion Invariants):**
- Exhaustion values are monotonic and irreversible.
- Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain.
- Exhaustion compounds across military, political, and societal dimensions.
- "Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system."

**Phase II Specification v0.3.0 (§4.1):**
- **phase_ii_exhaustion**: Record<FactionId, number>, **non-negative, monotonic; never decreased** by any system (Engine Invariants §8).
- **phase_ii_supply_pressure**: Record<FactionId, number>, **domain [0, 100]**. Monotonic per faction; never decreased.
- **phase_ii_exhaustion_local**: optional; non-negative; stub (not driven).

**Phase II (§10 — Command Friction D0.9.1):**
- **command_friction_multiplier >= 1**; higher = more friction = worse execution.
- Formula (conceptual): multiplier = 1 + exhaustion * k1 + frontEdgeCount * k2; clamped to [1, MAX_MULTIPLIER].
- Use: Phase II costs (supply pressure increment, exhaustion delta) are **multiplied** by this multiplier. Deterministic; monotonic with exhaustion and front length; **never directly flip control or authority**; never serialized.

**Systems Manual v0.3.0:**
- Exhaustion is irreversible; drives breakdown, negotiation, war termination (Phase 3B overview).
- Exhaustion → collapse gating (Phase 3C): accumulated exhaustion may unlock *eligibility* for collapse; eligibility does not imply immediate failure.

**Rulebook v0.3.0 (§11.1):**
- Exhaustion represents cumulative military, political, and societal strain. Exhaustion is irreversible and shapes all other systems.

**Domain (explicit in canon):**
- Exhaustion: **non-negative, monotonic**; no upper bound stated.
- Supply pressure: **domain [0, 100]** (explicit).
- Friction: multiplier >= 1; clamped to [1, MAX_MULTIPLIER]; derived only; never stored.

---

## 3) Current implementation reality (evidence-based)

**Where exhaustion is stored:**
- **state.phase_ii_exhaustion**: Record<FactionId, number> (GameState root).
- **faction.profile.exhaustion**: number (AuthorityProfile). Serialized; both phase_ii_exhaustion and profile.exhaustion are in canonical key lists.

**How/when it increments:**
- **Phase II pipeline (src/sim/phase_ii/exhaustion.ts):** updatePhaseIIExhaustion(state, fronts, frictionMultipliers) writes only to **state.phase_ii_exhaustion**. Delta from static front count and supply pressure; capped per turn (MAX_DELTA_PER_TURN = 10); scaled by command friction multiplier.
- **Baseline ops (harness):** applyBaselineOpsExhaustion writes to **both** phase_ii_exhaustion and profile.exhaustion; delta = BASELINE_OPS_EXHAUSTION_RATE * level * scalar; no per-value cap.
- **Other writers of profile.exhaustion only:** src/state/exhaustion.ts (accumulateExhaustion), src/sim/pressure/phase3b_pressure_exhaustion.ts, src/sim/phase_i/control_strain.ts. These do not write phase_ii_exhaustion.

**Bounded/clamped:**
- **Exhaustion value itself:** Not clamped anywhere. Validator requires non-negative finite number; no max.
- **Delta per turn (Phase II core):** updatePhaseIIExhaustion caps effective delta at MAX_DELTA_PER_TURN (10).

**Faction-level vs local:**
- **Faction-level:** phase_ii_exhaustion and profile.exhaustion are per-faction.
- **Local:** phase_ii_exhaustion_local exists in schema; not driven by mechanics (stub).

**Command friction computation (derived-only):**
- src/sim/phase_ii/command_friction.ts: reads **phase_ii_exhaustion** (not profile.exhaustion). raw = 1 + exhaustion * FRICTION_PER_EXHAUSTION (0.01) + frontEdgeCount * FRICTION_PER_FRONT_EDGE (0.02); result clamped to [1, MAX_MULTIPLIER] (10). No normalization of exhaustion to [0,1] or [0,100]; uses raw scale.

**Baseline_ops sensitivity report (evidence; no external interpretation):**
- File: data/derived/scenario/baseline_ops_sensitivity/baseline_ops_sensitivity_report.json.
- Per run (26 weeks): exhaustion_end ~260 (scalar 0.25: ~260.01; scalar 1: ~260.05; scalar 4: ~260.18) for all three factions (HRHB, RBiH, RS).
- Scalar effects are small relative to baseline (~260): doubling scalar adds only a small absolute increment. Monotonicity and intensity-ordering checks pass.

---

## 4) Semantics candidates (explicit alternatives, no decision yet)

**A) Unbounded cumulative "wear" index (comparative only)**  
- Meaning: Exhaustion is a non-negative, monotonic accumulator with no fixed ceiling; only ordinal comparison (higher = more exhausted) is meaningful.  
- Downstream: Command friction scales linearly with raw value (current implementation); collapse/Phase G would use comparative thresholds (e.g. "exhaustion > X" for eligibility), not percentages.  
- Risks: Different run lengths produce very different absolute values; thresholds must be expressed in same scale as accumulator or derived comparatively.  
- Compatibility with ~260: Yes; no code change.

**B) Bounded exhaustion percentage [0, 100] with saturation**  
- Meaning: Exhaustion is conceptually a percentage; accumulation saturates at 100.  
- Downstream: Friction and collapse could use 0–100 directly; comparability across run lengths if saturation is reached or normalized.  
- Risks: Requires clamping/saturation in all writers; existing unbounded values (~260) would imply either a one-time migration or a rescale; tuning brittleness at saturation.  
- Compatibility with ~260: No without code change; would require clamp/rescale and canon addendum.

**C) Hybrid: unbounded internal accumulator, normalized to [0, 1] for downstream effects**  
- Meaning: Store unbounded value; when computing friction or collapse eligibility, use a normalizer (e.g. 1 / (1 + exhaustion/100) or min(1, exhaustion / 100)).  
- Downstream: Friction formula would use normalized value; collapse thresholds in [0,1].  
- Risks: Choice of normalizer is arbitrary; comparability across runs still depends on normalizer; two interpretations (raw vs normalized) must be documented.  
- Compatibility with ~260: Possible with formula change only (no clamp on stored value).

**D) Leave as-is; document "unbounded comparative index"**  
- Meaning: No formal domain; treat as unbounded comparative index until Phase G/O require a decision.  
- Downstream: Same as A; explicit doc that no percentage or [0,100] is implied.  
- Risks: Any consumer (e.g. supply_state_derivation’s exhaustion/200) relies on implicit scale; doc reduces ambiguity.  
- Compatibility with ~260: Yes.

---

## 5) Constraints and invariants (hard)

- Exhaustion must remain **monotonic and irreversible** (Engine Invariants §8).
- Exhaustion and friction must **not** flip political control or authority directly (Phase II, Systems Manual).
- Derived state (command friction multiplier, front descriptors) must **not** be serialized (Engine Invariants §13.1).
- All state and ordering must preserve **determinism** (no randomness, stable ordering, reproducible saves).
- This audit must **not** introduce Phase O logic (negotiation/end-state rules).

---

## 6) Ambiguities found (must be explicit)

- **Canon vs implementation — domain:** Canon states exhaustion "non-negative, monotonic; never decreased" and does **not** give an upper bound. Supply pressure explicitly has domain [0, 100]. Implementation is unbounded (no clamp). **No canonical mismatch:** both canon and implementation leave exhaustion unbounded.
- **Dual storage (phase_ii_exhaustion vs profile.exhaustion):** Phase II pipeline updates only phase_ii_exhaustion. Other code (Phase 3B, control strain, state/exhaustion accumulateExhaustion) updates only profile.exhaustion. Command friction reads phase_ii_exhaustion; supply_state_derivation and loss_of_control_trends read profile.exhaustion. Baseline_ops updates both. **Ambiguity:** Under which conditions the two stay in sync is not fully specified in canon; implementation has two sources of truth. This is an **implementation consistency** concern, not a canon/domain mismatch.
- **Implicit scale in consumers:** supply_state_derivation uses `1 - (faction.profile.exhaustion ?? 0) / 200` for production capacity. The constant 200 is an implicit "full exhaustion" scale; canon does not define it. **Ambiguity:** If exhaustion were later interpreted as [0,100], 200 would be wrong; as unbounded, 200 is an arbitrary divisor for scaling only. Flag for future docs: clarify that exhaustion has no canonical unit; any divisor (e.g. 200) is implementation choice for effect scaling.

---

## 7) Recommendations (docs-level only)

**Recommendation:** **No action; treat exhaustion as unbounded comparative index until Phase G/O needs normalization.**

- Canon and implementation agree: non-negative, monotonic, no upper bound. No code or canon change required for H1.10.
- **Trigger conditions** for when the team must decide:
  - When Phase G intent uses exhaustion thresholds (e.g. collapse eligibility), decide whether thresholds are absolute (unbounded scale) or normalized.
  - When Phase O collapse needs comparability across scenarios or run lengths, consider a small canon addendum to clarify bounds/units and/or a follow-on code phase to align implementation with any new bound (only if mismatch becomes real and harmful).
- Optional: Later, add a short addendum to canon (e.g. Phase II or Engine Invariants) that "exhaustion has no canonical upper bound; comparative use only unless a later phase specifies normalization." Do not change mechanics now.

---

## 8) Follow-on tasks (optional)

- **H1.12:** Long-horizon sensitivity (e.g. 104w, scope slicing) if needed for scale behaviour.
- **Docs addendum phase:** If the team adopts a formal bound or unit (e.g. "exhaustion remains unbounded; downstream effects may use implementation-defined scaling"), add one paragraph to Phase II or Engine Invariants; do not edit FORAWWV automatically.
- **Later:** Phase G intent integration plan (exhaustion thresholds, collapse eligibility); not in scope for H1.10.

---

*End of Phase H1.10 exhaustion semantics audit.*
