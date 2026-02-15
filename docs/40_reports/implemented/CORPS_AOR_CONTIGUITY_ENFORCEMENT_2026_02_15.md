# Corps AoR Contiguity Enforcement

**Date:** 2026-02-15
**Type:** Feature — engine invariant
**Scope:** Corps-level AoR contiguity checking and repair, enclave exception, brigade contiguity corps-preference improvement, turn pipeline integration
**Prereq:** Corps-directed AoR assignment (2026-02-14)

---

## 1. Problem Statement

Brigade AoR contiguity was already a hard invariant, enforced via `checkBrigadeContiguity()`, `repairContiguity()`, and `wouldRemainContiguous()` in `aor_contiguity.ts`. But no equivalent check existed at the corps level.

A corps' effective AoR — the union of all settlements assigned to its subordinate brigades via `state.brigade_aor` — could become discontiguous through three mechanisms:

1. **Brigade contiguity repair** (Step 8 in `assignCorpsDirectedAoR`) reassigns orphan settlements to the nearest same-faction brigade regardless of corps affiliation.
2. **`rebalanceBrigadeAoR()`** transfers settlements between brigades without any corps awareness — a rear settlement shed from an oversized brigade of Corps A could be absorbed by an adjacent brigade of Corps B.
3. **Front-line changes between turns** (battle resolution flips) can fragment a formerly contiguous corps sector.

**Why it matters:** A corps commands a contiguous front sector. If its subordinate brigades hold disconnected settlement clusters within the main territory, the corps' command authority is unrealistic — it implies the corps is somehow coordinating across enemy-held gaps.

**Exception:** Enclaves and pockets are legitimate disconnections. If the faction's territory itself is fragmented (detected by `detectDisconnectedTerritories()`), brigades in enclaves are naturally isolated from the main territory and should not trigger contiguity violations.

---

## 2. Changes Implemented

### 2.1 Corps Contiguity Functions (`aor_contiguity.ts`)

Two new exports alongside the existing brigade contiguity utilities:

**`checkCorpsContiguity(corpsId, settlements, adj)`** — wraps the generic `checkBrigadeContiguity()` (BFS component detector). Returns `{ corpsId, contiguous, components, orphans }` where orphans are settlements in non-largest components. The caller is responsible for excluding enclave settlements before calling.

**`repairCorpsContiguity(state, faction, corpsId, orphans, adj)`** — for each orphan settlement (sorted deterministically), searches adjacent settlements for a brigade belonging to a **different** corps of the same faction. Reassigns `state.brigade_aor[orphan]` to that brigade. Falls back to `null` (unassigned) if no valid target exists. Returns count of reassignments.

### 2.2 Corps-Level Enforcement (`corps_directed_aor.ts`)

**`enforceCorpsLevelContiguity(state, edges)`** — new exported function, enclave-aware:

1. For each faction, calls `detectDisconnectedTerritories()` to identify enclaves
2. Builds `Map<corpsId, SettlementId[]>` from `state.brigade_aor`, excluding null assignments and enclave settlements
3. For each corps (sorted deterministically), calls `checkCorpsContiguity()` — if discontiguous, calls `repairCorpsContiguity()` on orphans

Called at two enforcement points:
- **Step 9** in `assignCorpsDirectedAoR()` (after Step 8 brigade contiguity repair)
- **Pipeline step** `'enforce-corps-aor-contiguity'` in turn_pipeline.ts (after `'rebalance-brigade-aor'`)

### 2.3 Brigade Contiguity Corps-Preference

The existing `enforceContiguity()` function (Step 8) previously reassigned brigade orphan settlements to "nearest adjacent brigade of same faction" without any corps preference. Updated to prefer same-corps brigades first, falling back to any same-faction brigade. This reduces the frequency of corps-level contiguity violations created by brigade-level repair.

### 2.4 Turn Pipeline Step

New `'enforce-corps-aor-contiguity'` step inserted after `'rebalance-brigade-aor'` and before `'apply-municipality-orders'`. Catches contiguity breaks introduced by the corps-unaware rebalancing pass. Guards: skips if not phase_ii, no brigade_aor, or no corps_command.

### 2.5 Tests

New Vitest test file `tests/corps_aor_contiguity.test.ts` with 11 test cases across three describe blocks:

- `checkCorpsContiguity`: contiguous detection, discontiguous detection, single/empty settlement edge cases
- `repairCorpsContiguity`: orphan reassignment to adjacent different-corps brigade, unassignment when no valid target, cross-faction rejection
- `enforceCorpsLevelContiguity`: no-op on contiguous state, repair on discontiguous state, enclave exception (settlements in faction enclaves excluded from check), determinism (identical result when run twice)

---

## 3. Architecture

```
assignCorpsDirectedAoR()
  ├── Steps 1-7: Territory detection, corps sector partition, brigade allocation, settlement derivation
  ├── Step 8: enforceContiguity() — brigade-level repair (now prefers same-corps targets)
  └── Step 9: enforceCorpsLevelContiguity() — corps-level repair (enclave-aware)
        │
        ├── detectDisconnectedTerritories() → enclaves excluded
        ├── Build per-corps settlement sets from brigade_aor
        ├── checkCorpsContiguity() per corps
        └── repairCorpsContiguity() on orphans → reassign to adjacent different-corps brigade

Turn Pipeline (phase_ii)
  ├── 'rebalance-brigade-aor'          — corps-unaware settlement transfers
  ├── 'enforce-corps-aor-contiguity'   — NEW: restore corps contiguity after rebalancing
  ├── 'apply-municipality-orders'      — player movement orders
  └── ...
```

---

## 4. Files Modified

| File | Changes |
|------|---------|
| `src/sim/phase_ii/aor_contiguity.ts` | Added `CorpsContiguityResult` interface, `checkCorpsContiguity()`, `repairCorpsContiguity()`; imported `GameState`, `FactionId`, `getFormationCorpsId` |
| `src/sim/phase_ii/corps_directed_aor.ts` | Added exported `enforceCorpsLevelContiguity()`; Step 9 call in `assignCorpsDirectedAoR()`; improved `enforceContiguity()` to prefer same-corps targets |
| `src/sim/turn_pipeline.ts` | Added `'enforce-corps-aor-contiguity'` pipeline step after `'rebalance-brigade-aor'`; imported `enforceCorpsLevelContiguity` |
| `tests/corps_aor_contiguity.test.ts` | New Vitest test file (11 tests) |
| `vitest.config.ts` | Added new test to include list |

---

## 5. Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 tests pass (9 files including new `corps_aor_contiguity.test.ts`)
- `npm run canon:check` — determinism scan clean + baseline regression match
- No UI changes — pure engine invariant enforcement
