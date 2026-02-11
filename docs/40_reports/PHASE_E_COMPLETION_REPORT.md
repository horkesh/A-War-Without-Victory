# Phase E Completion Report
## Spatial & Interaction Systems

**Date:** 2026-02-02  
**Phase:** Phase E — Spatial & Interaction Systems  
**Status:** COMPLETE  
**Roadmap Reference:** docs/30_planning/ROADMAP_v1_0.md Phase E

---

## 1. Systems Implemented

### 1.1 Pressure Eligibility & Diffusion (E1)

**Status:** ✅ Complete (Phase E1.1, Steps 2–3)

**Implementation:**
- `src/sim/phase_e/pressure_eligibility.ts` — isPressureEligible, getEligiblePressureEdges
- `src/sim/phase_e/pressure_diffusion.ts` — diffusePressure (bounded, conservative)
- Pipeline phase: `phase-e-pressure-update` (runs after phase-ii-consolidation)

**Mechanics:**
- Pressure eligibility: adjacency-based, front-aware (opposing control), deterministic
- Hard gating: both settlements must have political control; pressure flows across front edges only
- Diffusion: bounded propagation (DIFFUSE_FRACTION 0.05, DIFFUSE_MAX_OUTFLOW 2.0), conservative (total pressure preserved), deterministic ordering
- Canonical pressure field: **state.front_pressure** (edge-keyed; Phase 3A §5.2)

**Guarantees:**
- Pressure accumulates and diffuses; does not flip control
- Deterministic: same state + edges → same diffusion stats
- No runaway amplification (bounded outflow, conservation checks)

### 1.2 Front Emergence Logic (E1)

**Status:** ✅ Complete (Phase E1.2)

**Implementation:**
- `src/sim/phase_e/front_emergence.ts` — derivePhaseEFronts (invoked by pipeline; ownership Phase II)
- Pipeline phase: `phase-ii-front-emergence` (Phase II–scoped; runs after phase-e-pressure-update)

**Mechanics:**
- Fronts derived from opposing political control across settlement adjacency edges
- Fronts only where sustained opposing control meets (Engine Invariants §6)
- Front descriptors: id, edge_ids, created_turn, stability (fluid/static/oscillating)
- No geometry; derived each turn; not serialized (Engine Invariants §13.1)

**Guarantees:**
- Fronts emergent from sustained opposing presence
- No single combat resolution causes decisive territorial change
- Deterministic: same state + edges → same front descriptors

### 1.3 AoR Instantiation (E2)

**Status:** ✅ Complete (Step 4)

**Implementation:**
- `src/sim/phase_e/aor_instantiation.ts` — deriveAoRMembership, isSettlementFrontActive, getFrontActiveSettlements
- Pipeline phase: `phase-e-aor-derivation` (runs after phase-ii-front-emergence)

**Mechanics:**
- AoRs emerge from sustained spatial dominance: active_streak >= 3, pressure >= 5
- Each formation (brigade) may have influence over edges where its faction has control on at least one endpoint
- Influence weight [0, 1] derived from pressure gradient and front segment persistence (average of pressure/100 and streak/10)
- Overlapping allowed: multiple formations may have influence on same edge
- Reversible: AoRs dissolve when conditions weaken (pressure drops or streak resets)

**Guarantees:**
- AoRs are soft, overlapping zones (not frontlines or borders)
- AoRs affect pressure diffusion and command friction (future integration)
- AoR assignment never creates or overrides political control (Engine Invariants §9.8)
- Derived each turn; not serialized (Engine Invariants §13.1)

### 1.4 Rear Political Control Zones (E3)

**Status:** ✅ Complete (Step 5)

**Implementation:**
- `src/sim/phase_e/rear_zone_detection.ts` — deriveRearPoliticalControlZones, isSettlementInRearZone, getRearZoneAuthorityStabilizationFactor
- Pipeline phase: `phase-e-rear-zone-derivation` (runs after phase-e-aor-derivation)

**Mechanics:**
- Rear zone = settlement with political control (non-null) that is NOT front-active
- Front-active = settlement on at least one pressure-eligible edge (opposing control adjacency)
- Rear zones are stable: do not generate/absorb pressure, do not require AoR assignment, do not experience control drift due to absence of formations (Engine Invariants §9.4)
- Authority stabilizing effects only: stabilization factor 0.5 for rear (50% reduction in degradation), 1.0 for front-active (full degradation)

**Guarantees:**
- Rear zones behind stabilized fronts with reduced contestation
- Authority stabilization is read-only (does NOT modify state.municipalities or faction.profile.authority)
- Rear zones do not flip control
- Derived each turn; not serialized (Engine Invariants §13.1)

### 1.5 Phase E Turn Structure Integration (E4)

**Status:** ✅ Complete (Step 6)

**Implementation:**
- `src/sim/turn_pipeline.ts` — Phase E phases integrated after phase-ii-consolidation
- Pipeline order: phase-e-pressure-update → phase-ii-front-emergence → phase-e-aor-derivation → phase-e-rear-zone-derivation

**Guarantees:**
- Phase E logic runs AFTER Phase II consolidation
- No Phase E logic runs earlier
- Guards: Phase E only runs when meta.phase === 'phase_ii'
- Deterministic ordering documented

---

## 2. Assumptions / Stubs

### 2.1 AoR Emergence Constants

- **AOR_EMERGENCE_PERSIST_TURNS = 3** — Minimum consecutive turns with pressure-eligible edges for AoR to emerge
- **AOR_MIN_PRESSURE_THRESHOLD = 5** — Minimum pressure gradient (absolute value) for AoR to form on an edge

These are conservative defaults per Phase 3A §5.3 style. If ROADMAP refines exact values, update constants.

### 2.2 Rear Zone Authority Stabilization

- **Stabilization factor 0.5** for rear zones (50% reduction in authority degradation)
- **Stabilization factor 1.0** for front-active zones (full degradation)

This is a read-only helper for future authority/exhaustion systems. It does NOT modify state.municipalities or faction.profile.authority. Future phases may consume this factor to reduce authority volatility in rear zones.

### 2.3 AoR Effects on Pressure Diffusion and Command Friction

- **Pressure diffusion:** Currently uses eligibility only (opposing control). Future integration: AoR influence weights may scale diffusion flow across edges.
- **Command friction:** Phase II command friction uses exhaustion + front edge count. Future integration: AoR influence may affect friction (e.g. overlapping AoRs increase friction).

These integrations are deferred to future phases (not required for Phase E exit criteria).

---

## 3. Invariants Enforced

### 3.1 Engine Invariants

- **§9.8 AoR Relationship Constraint:** AoR assignment never creates or overrides political control. ✅ Verified: deriveAoRMembership is read-only; does not mutate state.political_controllers.
- **§9.4 Rear Political Control Zones:** Settlements outside all brigade AoRs retain political control; do not generate/absorb pressure; do not require military responsibility; do not experience control drift. ✅ Verified: deriveRearPoliticalControlZones is read-only; rear zones are derived from control + front-active status.
- **§13.1 No Serialization of Derived States:** Derived states (corridors, fronts, AoRs, rear zones) must not be serialized. ✅ Verified: PhaseEAorMembership and PhaseERearZoneDescriptor are not on GameState; validateGameStateShape denylist includes phase_e_aor_membership, phase_e_aor_influence, phase_e_rear_zone.
- **§13.2 Recomputation Requirement:** All derived states must be recomputed each turn. ✅ Verified: deriveAoRMembership and deriveRearPoliticalControlZones are called each turn in pipeline; no persistence.
- **§11.3 Stable Ordering:** Stable ordering required for all iterations affecting outputs. ✅ Verified: all Phase E functions use strictCompare for sorting; deterministic ordering.

### 3.2 Phase E Scope Boundaries

- **No negotiation, collapse, or end-states:** Phase E modules do not contain negotiation, end_state, enforcement, or termination logic. ✅ Verified: phase_e0_1_guard.ts enforces at module load; test imports Phase E modules without error.
- **No serialization of derived geometry:** AoRs and rear zones are derived; not serialized. ✅ Verified: denylist in validateGameStateShape; no new serialized fields in GameState for AoR/rear.
- **No fixed borders or victory conditions:** AoRs are soft, overlapping zones; rear zones are derived from front-active status. ✅ Verified: no border geometry; no victory logic.
- **No override of Phase II exhaustion or supply rules:** Phase E is read-only for Phase II state. ✅ Verified: Phase E does not modify phase_ii_supply_pressure or phase_ii_exhaustion.

### 3.3 Phase D Invariants

- **Exhaustion monotonic:** Exhaustion never decreases. ✅ Verified: Phase E does not modify phase_ii_exhaustion; test confirms exhaustion >= original after runTurn.
- **No control flip by Phase E:** Phase E derivations are read-only. ✅ Verified: deriveAoRMembership, deriveRearPoliticalControlZones do not mutate state.political_controllers.

---

## 4. Known Limitations

### 4.1 AoR Effects Not Yet Wired

- **Pressure diffusion:** AoR influence weights are computed but not yet consumed by diffusePressure. Future: scale diffusion flow by AoR influence.
- **Command friction:** AoR overlap is detected but not yet consumed by getPhaseIICommandFrictionMultipliers. Future: overlapping AoRs may increase friction.

These are deferred integrations (not required for Phase E exit criteria). Phase E provides the *derivation* of AoRs and rear zones; *consumption* by other systems is future work.

### 4.2 Rear Zone Authority Stabilization Not Yet Applied

- **getRearZoneAuthorityStabilizationFactor** returns a stabilization factor [0, 1] for rear zones, but this factor is not yet consumed by authority degradation or exhaustion systems.
- Future: authority degradation in rear zones may be scaled by this factor (e.g. multiply degradation delta by stabilization factor).

### 4.3 Phase E Constants Are Conservative Defaults

- **AOR_EMERGENCE_PERSIST_TURNS = 3**, **AOR_MIN_PRESSURE_THRESHOLD = 5**, **DIFFUSE_FRACTION = 0.05**, **DIFFUSE_MAX_OUTFLOW = 2.0**
- These are conservative defaults per Phase 3A §5.3 style. If ROADMAP or canon refines exact values, update constants in aor_instantiation.ts and pressure_diffusion.ts.

---

## 5. Readiness for Next Phase

### 5.1 Readiness for Phase F

Phase E outputs provide front-active sets, rear-zone sets, and pressure fields; Phase F may consume these if ROADMAP Phase F requires them. Phase F scope must be taken from docs/30_planning/ROADMAP_v1_0.md. Phase E outputs are well-typed and consumable without reinterpretation.

### 5.2 Phase O (Negotiation & End-State, legacy)

Phase E provides:
- **AoR membership:** Phase O may use AoR influence to determine territorial control for treaty clauses (e.g. recognize_control_settlements).
- **Rear zones:** Phase O may use rear zones to determine stable vs contested territories for treaty constraints.
- **Front descriptors:** Phase O may use front emergence (phase_ii_front_emergence) to determine active fronts for ceasefire clauses.

Phase E does NOT implement negotiation, collapse, or end-state logic. Phase O will consume Phase E outputs as read-only inputs.

### 5.3 Phase II Unchanged

Phase E does not modify Phase II logic:
- Phase II consolidation (supply pressure, exhaustion, command friction) runs unchanged
- Phase E phases run AFTER Phase II consolidation
- Phase E is read-only for Phase II state (phase_ii_supply_pressure, phase_ii_exhaustion)

---

## 6. Exit Criteria Confirmation

Per ROADMAP Phase E §6:

| Exit Criterion | Status |
|----------------|--------|
| Pressure diffuses spatially and deterministically | ✅ Complete (diffusePressure, tests) |
| AoRs exist as interaction zones | ✅ Complete (deriveAoRMembership, tests) |
| Rear Political Control Zones stabilize the rear | ✅ Complete (deriveRearPoliticalControlZones, tests) |
| No negotiation, collapse, or end-state logic exists | ✅ Verified (phase_e0_1_guard.ts, tests) |
| Phase F / Phase O can consume Phase E outputs without reinterpretation | ✅ Verified (outputs well-typed, consumable) |

**All Phase E validation tests pass:** ✅ 568 tests pass (npm test)

---

## 7. Commits

Phase E implementation commits (2026-02-02):

1. **ed334f1** — phase e step1 phase e schema extension
2. **3a9bb8d** — phase e step4 aor instantiation
3. **e0d399b** — phase e step5 rear political control zones
4. **d2d0727** — phase e step6 pipeline integration
5. **03c09f6** — phase e step7 phase e validation suite

**Note:** Steps 2–3 (pressure eligibility, diffusion) were already implemented in Phase E1.1 (ledger entry 2026-02-02).

---

## 8. FORAWWV Addendum Requirement

**Status:** ❌ No addendum required.

Phase E implementation did not reveal systemic design insights or invalidate canon assumptions. All mechanics align with:
- Engine Invariants v0.3.0 (§6, §9, §11, §13)
- Phase_Specifications_v0_4_0.md (Appendix A: Phase 3A)
- Systems_Manual_v0_4_0.md (§2.1, §6, §7)
- ROADMAP_v1_0.md Phase E

No FORAWWV.md addendum required.

---

## 9. Phase E Summary

**Phase E — Spatial & Interaction Systems** formalizes spatial interaction on top of Phase II consolidation:

- **Pressure eligibility and diffusion:** Pressure flows across front edges (opposing control adjacency); bounded, conservative, deterministic.
- **Front emergence:** Fronts derived from sustained opposing control; no geometry; not serialized.
- **AoRs:** Emerge from sustained spatial dominance (pressure + active_streak); soft, overlapping zones; affect pressure diffusion and command friction (future integration); do NOT flip control.
- **Rear Political Control Zones:** Settlements outside all AoRs; stable by default; authority stabilizing effects only; do NOT flip control.

Phase E does NOT implement negotiation, collapse, or end-states. Phase E provides spatial interaction substrate for future phases (Phase F displacement, Phase O negotiation).

**Phase E is complete and ready for Phase F.**

---

*Phase E Completion Report — 2026-02-02*
