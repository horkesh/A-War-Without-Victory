# Phase F Completion Report — Displacement & Population Dynamics

**Date:** 2026-02-03  
**Roadmap:** docs/30_planning/ROADMAP_v1_0.md Phase F  
**Directive:** Phase F Implementation Directive (displacement at settlement + municipality levels; irreversible; no control flips)

---

## 1. Systems Implemented

| System | Description | Location |
|--------|-------------|----------|
| **F1. Displacement State Schema** | `settlement_displacement`, `settlement_displacement_started_turn`, `municipality_displacement` (stored; [0,1]; monotonic) | `src/state/game_state.ts`; validation/serialization |
| **F2. Displacement Trigger Conditions** | Front-active + pressure => per-settlement bounded deltas; deterministic; report for tests | `src/sim/phase_f/displacement_triggers.ts` |
| **F3. Settlement-Level Accumulation** | Apply deltas to `settlement_displacement`; monotonic; bounded; optional `started_turn` | `src/sim/phase_f/displacement_accumulation.ts` |
| **F4. Municipality Aggregation** | Mean of settlement displacement within municipality; monotonic; stable ordering | `src/sim/phase_f/displacement_municipality_aggregation.ts` |
| **F5. Capacity Consequences (hooks)** | Read-only: `getMunicipalityDisplacementFactor`, `getSettlementDisplacementFactor`, `buildDisplacementCapacityReport` | `src/sim/phase_f/displacement_capacity_hooks.ts` |
| **F6. Phase F Turn Structure** | Pipeline step `phase-f-displacement` after Phase E rear-zone; only when `meta.phase === 'phase_ii'` | `src/sim/turn_pipeline.ts` |
| **F7. Phase F Validation Suite** | Monotonic, no control flips, deterministic re-run; Phase A–E tests still pass | `tests/phase_f_*.test.ts` |

---

## 2. Assumptions / Stubs

- **Trigger inputs:** Control-change flags are not in state; scaffold uses conflict-intensity only (front-active + pressure). Hostility proxy not invented; constants `PHASE_F_BASE_FRONT_ACTIVE_DELTA`, `PHASE_F_PRESSURE_SCALE` are named and tunable.
- **Aggregation rule:** Municipality displacement = mean of settlement displacement within municipality. Spec may define weighted/max later.
- **Capacity consequences:** Hooks are read-only. Supply/authority/exhaustion do not yet consume Phase F factors; authorized integration deferred until spec wires them.
- **Phase 21 displacement_state:** Existing municipality-level `displacement_state` (Phase 21) is unchanged; Phase F adds separate `settlement_displacement` and `municipality_displacement` (capacity degradation [0,1]).

---

## 3. Invariants Enforced

- **Monotonic:** Settlement and municipality displacement never decrease.
- **Bounded:** Values in [0, 1].
- **No control flips:** Phase F does not modify `political_controllers`.
- **Determinism:** Stable ordering (strictCompare); no randomness; no timestamps in state.
- **No serialization of derived state:** Trigger report and capacity report are not serialized (Engine Invariants §13.1).
- **Phase gating:** Phase F displacement runs only when `meta.phase === 'phase_ii'`.

---

## 4. Known Limitations

- Displacement does not yet feed into supply local production, authority degradation, or exhaustion acceleration (hooks only).
- Control-change-based triggers are not implemented (no recent-control-change flags in state).
- Population totals / trickle redistribution / loss-external fractions are out of scope for this Phase F slice (ROADMAP Phase F core tasks F1–F7 as implemented).

---

## 5. Readiness for Phase G and Phase O

- **Phase G (UI):** Phase F state and reports can be exposed read-only for map/inspection (e.g. `phase_f_displacement.capacity_report`).
- **Phase O (negotiation/end-state):** Phase F does not implement negotiation or termination; no change to end-state logic.

---

## 6. List of Commits (Phase F)

1. `phase f prep rename phase e front helper to phase ii ownership`
2. `phase f step1 displacement schema (settlement + municipality)`
3. `phase f step2 displacement triggers`
4. `ledger: Phase F Step 2 displacement triggers`
5. `phase f step3 settlement displacement accumulation`
6. `phase f step4 municipality displacement aggregation`
7. `phase f step5 displacement consequences hooks`
8. `phase f step6 pipeline integration`
9. `phase f step7 displacement validation suite` (to be committed with this report)

---

## 7. Exit Criteria Confirmation (from ROADMAP)

| Criterion | Status |
|-----------|--------|
| Displacement modeled at settlement and municipality levels | Met |
| Displacement irreversible and permanently weakens capacity | Met (monotonic [0,1]; hooks for capacity) |
| No control flips caused directly by displacement | Met |
| Tests pass and determinism preserved | Met |

---

## 8. FORAWWV Addendum

**Flag only:** No automatic edit to FORAWWV.md. If design insights arise (e.g. aggregation rule choice, trigger constants), document in FORAWWV per CANON.md.
