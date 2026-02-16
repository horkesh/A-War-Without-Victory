# Refactor pass: brigade_aor (2026-02-11)

## Scope

Files from recent session (git diff): `src/sim/phase_ii/brigade_aor.ts`, `tests/brigade_aor.test.ts`. Doc/artifact files (PROJECT_LEDGER, napkin, latest_run_final_save.json) were not refactored.

## Changes

### 1. Merged imports (brigade_aor.ts)

- **Before:** Two separate imports from `formation_constants.js` (BRIGADE_OPERATIONAL_AOR_HARD_CAP, getMaxBrigadesPerMun).
- **After:** Single import: `import { BRIGADE_OPERATIONAL_AOR_HARD_CAP, getMaxBrigadesPerMun } from '../../state/formation_constants.js';`
- **Lines:** −1.

### 2. Extracted `isActiveBrigade` helper (brigade_aor.ts)

- **Duplication removed:** The condition `!f || f.status !== 'active' || (f.kind ?? 'brigade') !== 'brigade'` appeared 12 times across `ensureBrigadeMunicipalityAssignment`, `deriveBrigadeAoRFromMunicipalities`, `applyBrigadeMunicipalityOrders`, and `syncBrigadeMunicipalityAssignmentFromAoR`.
- **New helper:** `function isActiveBrigade(f: FormationState | null | undefined): f is FormationState` — returns true only when `f` is defined, `status === 'active'`, and `(kind ?? 'brigade') === 'brigade'`.
- **Replacements:** All 12 sites now use `if (!isActiveBrigade(f)) continue` or `if (!isActiveBrigade(f)) return false` or the block form for order rejection. `getActiveBrigades` now uses `if (!f || f.faction !== faction || !isActiveBrigade(f)) continue` (one predicate instead of four separate checks).
- **Lines:** +4 for helper, −24 from inlined conditionals (net −20).

### 3. Tests

- **tests/brigade_aor.test.ts:** No dead code or duplication found; no changes.
- **Verification:** `npx vitest run tests/brigade_aor.test.ts` — 17 tests passed.

## Verification

- `npx tsc --noEmit` — passed.
- `npx vitest run tests/brigade_aor.test.ts` — 17 passed.
- Full `npx vitest run`: 94 tests passed; remaining failures are pre-existing (“No test suite found” for Node `node:test` files).

## Summary

| Item              | Before → After |
|-------------------|----------------|
| formation_constants imports | 2 lines → 1 line |
| Repeated “active brigade” condition | 12 occurrences → 0 (replaced by `isActiveBrigade`) |
| New helper        | — → `isActiveBrigade()` |
| Net line count (brigade_aor.ts) | ~1052 → ~1035 (approx. −17) |

No dead code removed beyond the inlined condition; no backward-compat shims or over-engineered stubs were present. Logic and behavior unchanged.
