# Municipality Supra-Layer Implementation Report

## Overview

Phase II brigades now have a **municipality-level deployment layer** above settlement AoR. Brigades are assigned to municipalities; settlement-level AoR and frontline coverage are **derived** from that assignment with deterministic tie-breaking when multiple brigades share a municipality. Municipality movement orders are applied in-pipeline before pressure and attack resolution, keeping both layers coherent.

Backward compatible: existing scenarios and saves without the new fields get bootstrap/migration at load so behavior remains deterministic.

## Architecture

### Two-Layer Model

| Layer | State | Purpose |
|-------|--------|---------|
| **Municipality (supra)** | `brigade_municipality_assignment`, `brigade_mun_orders` | Deployment decisions; movement orders; source of truth for “which brigade covers which municipality” |
| **Settlement (AoR)** | `brigade_aor` | Derived from municipality assignment; single owner per settlement; used for pressure, attacks, HQ relocation |

Flow:

1. **Init / load:** Bootstrap or migrate so every active brigade has a municipality assignment; derive AoR from it (shared municipalities split settlements deterministically).
2. **Each turn:** Apply `brigade_mun_orders` (movement between adjacent municipalities) in a dedicated pipeline step **before** pressure and attack; then sync municipality assignment after any settlement-level reshape so both layers stay aligned.
3. **Consumers** (pressure, attack resolution, HQ relocation) use **derived** settlement coverage only; they do not write to the municipality layer.

### Determinism

- All municipality, brigade, and settlement traversal uses **stable sorted ordering** (e.g. by municipality id, brigade id).
- Tie-breaks when splitting settlements in a shared municipality are deterministic (e.g. brigade id, then settlement id).
- No timestamps, random seeds, or nondeterministic iteration.

### Key Behaviors

- **Shared municipality:** Multiple brigades can be assigned the same municipality; each settlement in that municipality is assigned to exactly one brigade via deterministic rules (e.g. brigade order, then settlement order).
- **Movement orders:** `brigade_mun_orders` specify target municipality; validation ensures adjacency; application runs in a fixed step so outcome is reproducible.
- **Sync after reshape:** When settlement-level orders reshape AoR (e.g. handoffs), a sync step updates municipality assignment from the resulting AoR so the supra-layer reflects actual coverage.

## Files Touched

| Area | Files |
|------|--------|
| State | `src/state/game_state.ts` (new fields), `src/state/serializeGameState.ts`, `src/state/validateGameState.ts` |
| AoR / municipality logic | `src/sim/phase_ii/brigade_aor.ts` (bootstrap, split, orders, derivation, sync) |
| Pipeline | `src/sim/turn_pipeline.ts` (apply-municipality-orders step, sync after reshape) |
| Phase II entry / scenario | `src/sim/phase_transitions/phase_i_to_phase_ii.ts`, `src/scenario/scenario_runner.ts` (graph context for municipality-aware AoR init) |
| Tests | `tests/brigade_aor.test.ts` (shared-municipality and order application) |
| Canon | `docs/10_canon/Phase_II_Specification_v0_5_0.md`, `docs/10_canon/Systems_Manual_v0_5_0.md` |

## Validation and Runs

- **Typecheck:** `npm run typecheck`
- **Unit tests:** `npx vitest run tests/brigade_aor.test.ts`
- **Scenario runs (apr1992_phase_ii_4w):** 4w hash `c5f42406012f891d`, 26w hash `242484bdee4de615`, 52w hash `cb99339acdf22d12` (deterministic artifacts)

In 4w and 26w reports, top direction changes no longer show early RBiH ↔ HRHB bilateral flips consistent with the new coverage derivation and pipeline order.

## References

- Ledger: PROJECT_LEDGER.md (2026-02-11 municipality supra-layer entry)
- Napkin: Patterns That Work — “Municipality supra-layer”
- Canon: Phase_II_Specification_v0_5_0.md, Systems_Manual_v0_5_0.md (updated semantics and order flow)
