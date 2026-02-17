# Displacement Refactor: Shared Utils (2026-02-17)

**Status:** Implemented  
**Scope:** Code organization only; no behavior change  
**Canon:** Systems Manual §12, Phase II §15, displacement redesign 2026-02-17

---

## Summary

Refactor pass on displacement modules to extract shared helpers and remove duplication. Introduces `displacement_state_utils.ts` as the single source for `getOrInitDisplacementState` and `getMunicipalityIdFromRecord`, used by `displacement_takeover` and `minority_flight`. Simplifies `minority_flight` by removing redundant assignments and unused imports.

---

## What was implemented

### 1. New shared module: `src/state/displacement_state_utils.ts`

- **`getOrInitDisplacementState(state, munId, originalPopulation)`** — Gets or creates `DisplacementState` for a municipality; ensures `displacement_state` map exists.
- **`getMunicipalityIdFromRecord(rec: SettlementRecord)`** — Returns `mun1990_id ?? mun_code` for settlement records; used for settlement→municipality mapping in displacement routing.

### 2. `displacement_takeover.ts`

- Removed local copies of `getOrInitDisplacementState` and `getMunicipalityId`.
- Imports both from `displacement_state_utils.js`.

### 3. `minority_flight.ts`

- Removed local copies of `getOrInitDisplacementState` and `getMunicipalityId`.
- Removed redundant `toRBiH = 0; toHRHB = 0` in RBiH/HRHB branch of `getSettlementMinorityPop`.
- Removed unused `DisplacementState` type import.
- Imports both helpers from `displacement_state_utils.js`.

### 4. `displacement.ts` (unchanged)

- Retains its own private `getOrInitDisplacementState`; not migrated in this pass to keep scope minimal. Can be migrated to shared utils in a future refactor.

---

## Verification

- `npx tsc --noEmit` — passes
- `npx vitest run` — 130 tests pass
- `npx tsx --test tests/displacement_takeover.test.ts tests/minority_flight.test.ts` — 12 tests pass

---

## Files modified

| File | Change |
|------|--------|
| `src/state/displacement_state_utils.ts` | **New** — shared helpers |
| `src/state/displacement_takeover.ts` | Import from utils; remove ~30 lines |
| `src/state/minority_flight.ts` | Import from utils; remove ~30 lines; simplify conditionals |

---

## Determinism

No change. All logic uses existing stable iteration; helpers are pure and deterministic.
