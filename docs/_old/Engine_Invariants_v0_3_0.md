# A War Without Victory -- Engine Invariants v0.3.0

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

## 14. Final Meta-Assertion

No invariant may be bypassed or relaxed for balance, usability, or player convenience. If enforcement produces an unfavorable outcome, the outcome is correct.

---

*Engine Invariants v0.3.0 - Formatted Edition*
*All versioned sections integrated*
*Proper section numbering applied*
*Political control and peace invariants fully integrated*