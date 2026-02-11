# A War Without Victory -- Engine Invariants v0.5.0

One game turn equals one week.

## 1. Global Assertion Rules

All assertions are evaluated once per turn after state update. Invariant violations must be handled deterministically and audibly.
Only corrections explicitly defined as enforcement rules are permitted.
If no such correction exists, the system must return a structured invariant failure result.

Development-time validation tools may abort execution on invariant violation.

## 2. Settlement and Municipality Invariants

- Municipality control must always be derived from political control
- Municipality consolidation is valid only if all settlements are controlled by one faction and authority is consolidated for the required duration
- Any contested or flipped settlement immediately invalidates consolidation

## 3. Authority Invariants

- Authority cannot be Consolidated if supply is Critical or any dependent corridor is Cut
- Authority must degrade automatically when invalid states are detected
- Control does not imply authority under any circumstances

## 4. Supply and Corridor Invariants

**Corridor States:**
- Corridors are derived per faction based on dependency, capacity, and redundancy
- Corridors must always exist in exactly one state: Open, Brittle, or Cut
- Brittle corridors must apply continuous penalties every turn
- Junction loss alone must not collapse a corridor unless dependency thresholds are crossed

**Supply Requirements:**
- All supply must trace through corridors or local production
- Supply recovery must be slower than degradation
- Supply cannot improve without improved connectivity or authority

## 5. Settlement Stabilization Invariants

- Newly captured settlements must enter a stabilization state
- Stabilization increases reversal probability and authority penalties
- Additional exhaustion applies if supply is below Adequate

## 6. Front and Combat Invariants

- Fronts may only exist where sustained opposing control meets
- Static fronts must increase exhaustion and defensive hardness together
- No single combat resolution may cause decisive territorial change

## 7. Fragmentation Invariants

- Fragmentation requires concurrent authority collapse and connectivity disruption
- Fragmentation and reunification both require persistence over multiple turns
- One-turn fragmentation or reunification is invalid

## 8. Exhaustion Invariants

- Exhaustion values are monotonic and irreversible
- Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain
- Exhaustion compounds across military, political, and societal dimensions

Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system.

JNA transition and withdrawal effects may increase escalation pressure but must not, by themselves, satisfy the war-start escalation threshold.

## 9. Political Control Invariants

### 9.1 Existence of Political Control

Every settlement must have a political control state at all times, defined as either controlled by a faction or explicitly ungoverned (null).

Political control must not be inferred from military formations, Areas of Responsibility (AoRs), or fronts.

### 9.2 Initialization Precedence

Political control must be initialized deterministically **before**:
- Any front detection
- Any AoR assignment
- Any pressure, exhaustion, or supply logic

Any system operating on settlements must treat political control as pre-existing state.

### 9.3 Independence from Military Presence

Political control exists independently of brigade presence.

A settlement may be politically controlled without:
- Brigade assignment
- AoR inclusion
- Adjacency to front-active space

### 9.4 Rear Political Control Zones

Settlements outside all brigade AoRs constitute Rear Political Control Zones.

Rear Political Control Zones:
- Retain political control
- Do not generate or absorb pressure
- Do not require military responsibility
- Do not experience control drift due to absence of formations

### 9.5 Control Stability

Political control must not change due to:
- Time progression
- Demographics
- Lack of supply
- Absence of brigades

Political control is stable by default.

### 9.6 Authorized Control Change Mechanisms

Political control may change **only** via:
- Sustained opposing military pressure reaching the settlement
- Internal authority collapse or fragmentation
- Negotiated transfer through end-state or interim agreements

Any other change constitutes a violation of invariants.

### 9.7 Null Political Control

A settlement may have political_controller = null only if:
- No faction exercises credible authority
- The condition is initialized deterministically
- No automatic reassignment occurs without authorized mechanisms

### 9.8 AoR Relationship Constraint

AoR assignment must never create, imply, or override political control.

When a rear settlement becomes front-active:
- AoR assignment becomes mandatory
- Political control remains unchanged until altered by authorized mechanisms

### 9.9 Determinism and Auditability

Political control initialization and transitions must be:
- Deterministic
- Replayable
- Serializable
- Auditable from state alone

## 10. Peace and Negotiation Invariants

### 10.1 Peace is Terminal

Any accepted treaty containing transfer_settlements or recognize_control_settlements ends the war immediately and writes end_state.

Post-peace processing of fronts, pressure, supply reachability, breaches, and control-flip proposals must be skipped.

### 10.2 Treaty Constraints

Treaty constraints are deterministic and ordered; first violation wins and yields a single rejection_reason.

### 10.3 Brčko Completeness

Any peace-triggering treaty must include brcko_special_status or be rejected with rejection_reason = brcko_unresolved.

### 10.4 Competence Bundle Assertions

The following competences must be allocated together:
- Customs and indirect_taxation must be allocated together
- Defence_policy and armed_forces_command must be allocated together
- Bundle members must allocate to the same holder

These are gating-only assertions (prevent invalid treaties).

## 11. Determinism Invariants

### 11.1 No Randomness

No randomness is permitted in simulation logic, validators, derived artifacts, or UI export paths.

### 11.2 No Timestamps

No timestamps (Date.now, time-based IDs) are permitted in derived artifacts or serialization.

### 11.3 Stable Ordering

Stable ordering is required whenever iterating collections that affect outputs.

### 11.4 Reproducibility

All state variables must be serializable. Save/load must fully reconstruct world, faction, municipality, MCZ, formation, and front states.

## 12. Exceptional Space Invariants

### 12.1 Sarajevo and Siege Conditions

- Siege state requires sustained connectivity loss plus continuous contact
- Siege multipliers must not apply while any viable connectivity exists
- High-contact non-siege states still generate exhaustion

### 12.2 Enclave Pressure

- Enclave pressure must escalate non-linearly as integrity declines
- Territorial stasis must not prevent escalation

## 13. Derived State Enforcement

### 13.1 No Serialization of Derived States

Derived states (corridors, fronts, municipality status) must not be serialized.

### 13.2 Recomputation Requirement

All derived states must be recomputed each turn.

### 13.3 Brigade Operations Derived State

Brigade pressure, density, and resilience modifier are computed each turn and must not be serialized (consistent with §13.1).

## 14. Brigade Operations and Settlement-Level Control Invariants

### 14.1 Settlement-level control

Municipality control is derived from settlement-level political control. Control changes may occur at settlement level (e.g. wave flip when municipality authority shifts and settlement meets demographic threshold; holdouts when hostile-majority; holdout cleanup and isolation surrender per rules). These are part of authority/control resolution; authorized mechanisms remain §9.6 (sustained pressure, authority collapse, negotiated transfer).

### 14.2 Brigade operations determinism

All brigade-operations iteration must use stable (e.g. strictCompare) sorted keys. No randomness; no timestamps in state.

### 14.3 Cohesion bounds

Formation cohesion must remain in [0, 100] after all updates.

### 14.4 AoR coverage

Every front-active settlement must be assigned to exactly one brigade. Rear settlements have null AoR.

### 14.5 Equipment conservation

Capture transfers equipment from loser to winner; total equipment is conserved minus degradation (no creation or destruction except by defined degradation/capture rules).

### 14.6 OG personnel conservation

At Operational Group activation, personnel are deducted from donors; at dissolution, personnel are returned (implementation may specify equal return to same-corps brigades unless donor tracking is added).

### 14.7 Phase gating

Brigade operations pipeline steps run only when meta.phase === "phase_ii".

## 15. Final Meta-Assertion

No invariant may be bypassed or relaxed for balance, usability, or player convenience. If enforcement produces an unfavorable outcome, the outcome is correct.

## 16. v0.4 Additions and Extensions (Systems 1-11)

### A. Legitimacy and Control
- Legitimacy is distinct from political control and authority; control does not imply legitimacy.
- Legitimacy must never increase as a direct consequence of military success.
- Authority consolidation requires control and sufficient legitimacy; low legitimacy caps authority at Contested.
- Legitimacy erosion is easier than recovery and must be gradual and deterministic.

### B. AoR Assignment
- Every **front-active** settlement must be assigned to exactly one brigade AoR.
- Rear Political Control Zones may have no AoR and must not generate pressure.
- AoR assignment does not confer political control.
- AoR assignment is prohibited in Phase I.
- AoR assignment must be exclusive (no settlement assigned to multiple brigades).
- AoR must match political control (no opposing brigade ownership).
- Pressure generation is invalid from settlements with no AoR.

### C. External Patron Pressure and IVP
- Patron state and international visibility pressure (IVP) are deterministic functions of turn index and state.
- IVP accumulation must be monotonic when inputs worsen; decay is allowed only if defined explicitly.
- External patron systems constrain options; they may not directly confer victory or create control flips.
- IVP triggers are limited to explicit events (Sarajevo siege visibility, enclave humanitarian pressure, atrocity visibility).
- Patron commitment changes are time-indexed and cannot be player-directed.

### D. Arms Embargo Asymmetry
- Embargo profiles are deterministic and faction-specific.
- Smuggling progression is deterministic and time-indexed.
- Embargo effects are differential (never binary on/off) and must not be bypassed.
- Ammunition and equipment ceilings must be enforced by embargo profiles.

### E. Heavy Equipment Degradation
- Heavy equipment is a wasting asset; degradation is monotonic absent explicit repair rules.
- Maintenance can slow degradation but cannot restore non-operational equipment without explicit repair allocation.
- Equipment state is serializable and auditable per turn.
- Operational tempo must influence degradation deterministically.

### F. Enclave Integrity
- Enclaves are detected deterministically via settlement connectivity.
- Enclave integrity decays under siege conditions; integrity decay is monotonic unless explicit relief rules apply.
- Enclave humanitarian pressure must be accumulated deterministically and feed IVP.
- Enclave collapse triggers must be deterministic and auditable.

### G. Sarajevo Exception
- Sarajevo has special integrity floors and visibility multipliers as specified in v0.4 systems.
- Sarajevo siege visibility must feed IVP deterministically.
- Treaties must address Sarajevo control explicitly; omission is an invariant violation.
- Sarajevo supply uses a dual-channel model; external supply cannot reach zero.

### H. Negotiation Capital and Territorial Valuation
- Negotiation capital is deterministic, auditable, and spendable.
- Territorial valuation must be deterministic; "liabilities are cheaper" asymmetry is enforced.
- Required clauses (e.g., Brcko, Sarajevo) and competence bundles are enforced deterministically.
- Treaties omitting required clauses are rejected deterministically, regardless of acceptance score.
- Acceptance must be computed, not chosen by player action.
- Negotiation capital spending must never reduce exhaustion or violate monotonic exhaustion rules.

### I. Tactical Doctrines and Posture Eligibility
- Posture eligibility rules (INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE) are deterministic.
- Doctrines must not override supply, equipment, or exhaustion invariants.
- Doctrine postures may be temporarily disabled when eligibility gates are not met.

### J. Capability Progression
- Capability progression is deterministic and time-indexed; no randomness.
- Progression curves may shift capabilities but must not violate determinism or exhaustion monotonicity.
- Milestone events (e.g., Washington Agreement, Drina blockade) must be deterministic. Milestones may be **time-indexed** (fire at a deterministic turn derived from scenario start), **precondition-driven** (fire when all preconditions are met, where each precondition is a deterministic function of state), or **hybrid** (preconditions with a time gate). All milestone evaluation must be a pure function of game state with no randomness.
- The **Washington Agreement** milestone is precondition-driven: it fires when ceasefire duration, IVP momentum, patron constraint, RS territorial threat, and combined RBiH–HRHB exhaustion all exceed their respective thresholds (see Phase I §4.8 for details). When it fires, the RBiH–HRHB alliance state is set to a post-federation value and locked.
- The **RBiH–HRHB bilateral ceasefire** is precondition-driven: it fires when war duration, mutual exhaustion, stalemate, IVP, and patron constraint thresholds are all met (see Phase I §4.8).

### K. Contested Control Initialization
- Initial political control must include stability-based control status (SECURE/CONTESTED/HIGHLY_CONTESTED).
- Control status derives from Phase 0 stability calculations and carries into Phase I.
- Control status affects early-war flip resistance and authority initialization.

## 17. v0.5 Canon consolidation

This document (v0.5.0) consolidates the full Engine Invariants v0.3.0 with all v0.4 Additions and Extensions. No content from v0.3 has been deleted. Implementation-notes in Phase I and Systems Manual remain non-normative per docs/10_canon/context.md (Canon v0.5 implementation-notes policy).
