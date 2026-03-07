# A War Without Victory -- Engine Invariants v0.6.0

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
- **Cascade:** When connectivity is lost (e.g. control flip), dependent regions transition Adequate→Strained→Critical only when dependency threshold is crossed (no path or only brittle path). Propagation order is deterministic (by faction_id, then by node id). Supply cascade is visible at the start of the **next** turn (supply is not re-run after control flips within the same turn). See SUPPLY_DESIGN.md and SUPPLY_IMPLEMENTATION_PLAN.md.

**Supply Requirements:**
- All supply must trace through corridors or local production
- Supply recovery must be slower than degradation
- Supply cannot improve without improved connectivity or authority

**Implementation-note (Phase A — Supply Reserves, 2026-03-01):** Faction-level reserves (`general_supply_reserve`, `heavy_munitions_reserve` [0..100]) implement the "recovery slower than degradation" invariant: maintenance drain (0.04 per formation per turn) and combat expenditure (per-battle deduction) continuously consume reserves; production income replenishes at a bounded rate. Reserve depletion degrades the effective supply state even when OSID reachability is adequate (reserve < 50 → strained; reserve < 20 → critical). Gated by scenario flag `supply_reserves_enabled` (enabled by default in `apr1992_definitive_40w`). See `src/state/supply_reserves.ts`, SUPPLY_AMMO_SYSTEM_PLAN.md §3.

**Implementation-note (Phase B+C — Siege, Replenishment, Enclave Hardening, 2026-03-02):** Phase B extends reserves with escalating siege drain (per besieged OSID, from `siege_turn_counters`), patron aid income, and embargo reduction on income. Phase C adds enclave hardening: after 8+ consecutive isolation turns, enclaves gain a +5% defense bonus; enclave resilience (up to 30) reduces exhaustion accumulation for RBiH by up to 30%. Production facility combat damage (0.05 condition per battle) degrades facility output over time. All gated by `supply_reserves_enabled`. See `docs/40_reports/implemented/20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md`.

## 5. Settlement Stabilization Invariants

- Newly captured settlements must enter a stabilization state
- Stabilization increases reversal probability and authority penalties
- Additional exhaustion applies if supply is below Adequate

## 6. Front and Combat Invariants

- Fronts may only exist where sustained opposing control meets (hostile OSID adjacency).
- Static fronts must increase exhaustion and defensive hardness together.
- **No single resolution flips more than one OSID.** One attack → one target OSID; control flip at most for that OSID.

### 6.1 Defense of Unoccupied OSIDs

*(ZoC Defensive Projection removed 2026-03-02 — ZoC system deleted. Unoccupied OSIDs adjacent to friendly brigades have militia-only defense. Frontage constraint is enforced by BRIGADE_OPERATIONAL_FRONTAGE_CAP=48 in formation_constants.ts. Local front density modifier (local_front_defense.ts) applies THIN_FRONT_THRESHOLD=0.5 / MIN_COVERAGE_PENALTY=0.6 to defender power when brigades are sparse.)*

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

Political control must not be inferred from military formations, brigade location (OSID), or fronts.

### 9.2 Initialization Precedence

Political control must be initialized deterministically **before**:
- Any front detection
- Any brigade location logic
- Any pressure, exhaustion, or supply logic

Any system operating on settlements must treat political control as pre-existing state.

### 9.3 Independence from Military Presence

Political control exists independently of brigade presence.

A settlement may be politically controlled without:
- Any brigade assigned to it (or to its OSID)
- Adjacency to hostile control

### 9.4 Rear Political Control Zones

Settlements (or OSIDs) not targeted by attack resolution and not adjacent to hostile control constitute Rear Political Control Zones.

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
- **Attack resolution** (War phase): an attack order is resolved → push-back and control flip at the target OSID (per Attack Resolution Formula Spec)
- **Corps or frontline operations** as defined in War Specification / Systems Manual
- Internal authority collapse or fragmentation
- Negotiated transfer through end-state or interim agreements

**No passive pressure flip:** In the OSID model, control does not change from "sustained opposing military pressure" alone; it changes only when an attack (or corps/frontline op) is resolved. Any other change constitutes a violation of invariants.

### 9.7 Null Political Control

A settlement may have political_controller = null only if:
- No faction exercises credible authority
- The condition is initialized deterministically
- No automatic reassignment occurs without authorized mechanisms

### 9.8 War phase OSID-only (AoR removed)

In War phase, brigade location is **location_osid** only; no AoR or settlement-level assignment. Control change only via attack resolution or corps/frontline operations. All OSID-keyed state must use stable ordering (e.g. strictCompare, sorted keys) in iteration and output.

**Implementation-note (formation location-in-control, 2026-03-03):** Every active formation with `location_osid` set must be in an OSID controlled by that formation's faction (`political_controllers[location_osid] === formation.faction`). Enforced by: pipeline step `displace-enemy-territory` (after attack resolution, when operational data + edges present); scenario runner initial-state displacement after backfill; validation `validateBrigadeLocationControl` in `src/validate/brigade_location_control.ts` (run in `validateState` before serialize). OOB `home_osid` in `data/source/oob_brigades.json` must be faction-controlled at scenario start (e.g. 282nd East Bosnian Light: `op:srebrenica:srebrenica_2`). See context.md "Formation location-in-control invariant", PROJECT_LEDGER 2026-03-03.

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

Municipality control is derived from settlement-level political control. Control changes at settlement/OSID level occur only via authorized mechanisms (§9.6): **attack resolution** or **corps/frontline operations** in War phase; authority collapse, fragmentation, or negotiated transfer otherwise. No passive pressure flip.

### 14.2 Brigade operations determinism

All brigade-operations iteration must use stable (e.g. strictCompare) sorted keys. No randomness; no timestamps in state.

### 14.3 Cohesion bounds

Formation cohesion must remain in [0, 100] after all updates.

### 14.3a Morale

**Morale** is a FormationState field (`morale: number`, range [0, 100]) representing willingness to fight. It is distinct from cohesion (tactical effectiveness):

| Field | Represents | Modifies |
|---|---|---|
| Cohesion | How organized/trained the unit is | Combat power (multiplicative) |
| Morale | How much the unit wants to hold | Retreat resistance, casualty absorption |

**Invariants:**
- Morale must remain in [0, 100] after all updates.
- Morale is **non-monotonic**: it may increase (population affinity, encirclement reversal) and decrease (defeat, low affinity). This is distinct from exhaustion (monotonic/irreversible).
- Morale drift and retreat resistance gates are **deterministic**: no randomness.
- Population affinity (fraction of OSID's 1991 population sharing ethnicity with defending faction) drives morale drift direction. Census data (per-municipality) is the source.
- Encirclement of own-population defenders (affinity > 0.50) causes morale to drift UP ("cornered rat" effect), not down. Encirclement of low-affinity defenders causes morale to drift DOWN (standard doctrine).
- Morale gates the retreat decision: high morale + costly_victory outcome → defender absorbs casualties and holds position (territory does NOT flip). Decisive victory always causes retreat regardless of morale.
- Default morale for new/migrated formations: 60.

### 14.4 Brigade location (OSID)

**Every brigade has a valid location_osid.** Control changes only via attack resolution or corps/frontline operations (no passive pressure flip).

### 14.5 Retreat "prefer rear" (determinism)

When a defender retreats, valid destinations are chosen deterministically. **Tie-break** among valid retreat destinations: **enemy adjacency count ascending** (prefer rear), then **OSID string sort** (stable ordering). No randomness.

**Retreat destination classes (priority order):** *(ZoC removed 2026-03-02; OSID-based retreat destinations, no ZoC blocking)*
1. **Friendly OSID (preferred — safe rear retreat)** — chosen by enemy adjacency count ascending, then OSID string sort
2. **Breakthrough to friendly** (desperate — cut-off brigade escapes through hostile territory; see §14.5a)
3. **Last stand** (no retreat possible — fight to destruction; defenderPower × 1.5, casualty multiplier × 2)

### 14.5a Breakthrough Retreat

When a brigade has NO valid retreat destination (classes 1-2 empty) AND a friendly OSID exists within M hops (M = 3–4):

- Brigade attempts breakthrough movement toward nearest friendly OSID.
- Deterministic gate: BFS path through adjacency graph with sorted neighbor iteration.
- Breakthrough resolution: brigade fights at 60% normal power (disorganized), takes 20–30% casualties per hop, entrenchment resets.
- If path is blocked (all hops defended, breakthrough fails): falls back to **last stand** (class 4).
- If no friendly OSID within M hops: **last stand** immediately.
- All path selection and resolution is deterministic. No randomness.

### 14.6 Equipment conservation

Capture transfers equipment from loser to winner; total equipment is conserved minus degradation (no creation or destruction except by defined degradation/capture rules).

### 14.7 OG personnel conservation

At Operational Group activation, personnel are deducted from donors; at dissolution, personnel are returned (implementation may specify equal return to same-corps brigades unless donor tracking is added).

### 14.8 Phase gating

Brigade operations pipeline steps run only when meta.phase === "war".

### 14.9 War movement pipeline order

*(ZoC removed 2026-03-02 — zoc-constrained-movement step deleted; replaced by apply-brigade-movement using brigade_movement_orders.ts.)* **osid-column-movement** must run **before** **apply-brigade-movement**. Column movement consumes orders with stance 'column' and must process them first. Violation causes column march orders to be dropped.

### 14.10 Bottom-up recruitment in War context

When `state.meta.recruitment_mode === 'bottom_up'`, the turn pipeline **must** run the militia emergence, pool population, formation spawn, activate corps, and promote formations steps after the main War steps, regardless of `state.meta.phase`, so that scenarios starting in War with bottom-up formation growth still populate militia pools and spawn formations each turn. Implementation: `src/sim/turn_pipeline.ts` (injection block when `recruitment_mode === 'bottom_up'`). Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.

## 15. Final Meta-Assertion

No invariant may be bypassed or relaxed for balance, usability, or player convenience. If enforcement produces an unfavorable outcome, the outcome is correct.

## 16. v0.4 Additions and Extensions (Systems 1-11)

### A. Legitimacy and Control
- Legitimacy is distinct from political control and authority; control does not imply legitimacy.
- Legitimacy must never increase as a direct consequence of military success.
- Authority consolidation requires control and sufficient legitimacy; low legitimacy caps authority at Contested.
- Legitimacy erosion is easier than recovery and must be gradual and deterministic.

### B. War phase brigade location (OSID; AoR removed)
- Every brigade has a valid **location_osid**. No AoR or settlement-level territorial assignment.
- Control change in War phase only via attack resolution or corps/frontline operations; no passive pressure flip.
- OSID-keyed state must use stable ordering in all iteration and serialization.

### C.–K.

Sections C through K (External Patron, Arms Embargo, Heavy Equipment, Enclave, Sarajevo, Negotiation Capital, Tactical Doctrines, Capability Progression, Contested Control) unchanged in substance from v0.5.0. Contested Control (§K): control status derives from **Peace** phase stability calculations and carries into **War** phase; affects early-war flip resistance and authority initialization. Washington Agreement and RBiH–HRHB ceasefire milestones remain precondition-driven; see Peace and War specifications for details.

## 17. v0.6 Canon consolidation

This document (v0.6.0) consolidates Engine Invariants for the two-phase (Peace/War) model. All references to "Phase II" or "phase_ii" as the war lifecycle are replaced with "War phase" or "war". Supersedes Engine_Invariants_v0_5_0.md. Deprecated docs are in docs/_old/10_canon/.

---

*Engine Invariants v0.6.0 — Two-phase (Peace/War) model.*
