# Determinism Test Matrix (AWWV)

## Rules → Gates
### No timestamps / wall-clock values
- Gate: `tests/determinism_static_scan_r1_5.test.ts`
- Gate: `tests/scenario_determinism_h1_1.test.ts`
- Gate: `tests/scenario_bots_determinism_h2_4.test.ts`
- Gate: `tools/scenario_runner/run_baseline_regression.ts`

### Stable ordering (collections, records, outputs)
- Gate: `tests/turn_pipeline_order.test.ts`
- Gate: `tests/phase_e_pressure_determinism.test.ts`
- Gate: `tools/scenario_runner/run_baseline_regression.ts`

### Derived state not serialized as source of truth
- Code invariant: `src/state/serializeGameState.ts` (denylist + key ordering + wrapper rejection)
- Gate: `tests/scenario_determinism_h1_1.test.ts`

### Byte-identical reruns from identical inputs
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Gate: `tests/scenario_determinism_h1_1.test.ts`

## System-specific determinism (B1, authority, B4)
- **events_fired (B1):** Same state + seed + turn → same `report.events_fired`; RNG used only for random-event probability; registry iteration order fixed. **Test:** `tests/events_evaluate.test.ts` (trigger matching, phase/turn bounds, determinism, registry order). Baseline regression implicitly covers event path via scenario outputs.
- **Authority derivation:** `deriveMunicipalityAuthorityMap` iterates municipality IDs in sorted order; no randomness. See MILITIA_BRIGADE_FORMATION_DESIGN.md §8.1.1.
- **Coercion pressure (B4):** Read-only per turn from state; no randomness in flip threshold. Same state → same flip outcomes.

## Gaps (Explicit)
- Static scan for `Date.now` / `new Date` / `Math.random`: enforced in `tests/determinism_static_scan_r1_5.test.ts` (src/ and tools/scenario_runner/ scope).
- Explicit “no Map/Set in GameState” runtime test: covered in serializer, not a dedicated test.
