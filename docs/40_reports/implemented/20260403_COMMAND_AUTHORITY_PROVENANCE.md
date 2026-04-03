# Command Authority Post-Override Provenance

**Date:** 2026-04-03
**Status:** IMPLEMENTED
**Slice:** Command Authority vertical — post-override provenance
**Parent plan:** `docs/plans/2026-04-03-delegation-override-command-friction-plan.md` (Phase 6 substrate)

---

## Problem

When the player force-launched an operation (Level 3 Direct Intervention), the `force_launch` flag on `CorpsOperation` was cleared on recovery by `sector_offensive.ts`. By the time the AAR was compiled and the operation appeared in history, all evidence of the override was lost. The game "forgot" that the player overruled the command chain.

## Solution

### 1. Permanent provenance flag on CorpsOperation

Added `was_force_launched?: boolean` to `CorpsOperation` in `game_state.ts`. Unlike `force_launch` (which is a transient execution flag cleared on recovery), `was_force_launched` is permanent — set once by `electron-main.cjs` when the player force-launches, never cleared.

**Files:** `src/state/game_state.ts` (field), `src/desktop/electron-main.cjs` (set on force-launch)

### 2. AAR provenance fields

Added two fields to `OperationAAR` interface:
- `force_launched?: boolean` — true if the operation was force-launched
- `ca_cost_at_launch?: number` — CA cost paid (always 15 when force_launched is true)

Populated in `finalizeOperationAAR` from `operation.was_force_launched`.

**Files:** `src/sim/combat/operation_aar.ts` (interface + compilation)

### 3. UI plumbing

- `src/ui/map/data/types.ts` — added `was_force_launched?: boolean` to `OperationView`
- `src/ui/map/data/GameStateAdapter.ts` — passes `was_force_launched` through to renderer

### 4. ForceLaunchBadge in OperationBriefingModal

New `ForceLaunchBadge` component renders a compact amber badge ("Presidential Override — Direct Intervention, Cost: 15 CA") on operations in execution or recovery that carry the `was_force_launched` flag. Not shown during planning phase or on non-overridden operations.

Matches existing `DirectInterventionSection` amber styling. One line, no fake penalties.

**File:** `src/ui/map/components/OperationBriefingModal.tsx`

### 5. Regression tests

Added 5 tests to `tests/command_authority.test.ts` under `post-override provenance` describe block:
- `was_force_launched` set on force-launch
- `was_force_launched` survives recovery reset (while `force_launch` does not)
- AAR carries `force_launched` + `ca_cost_at_launch` when overridden
- AAR `force_launched` is false for normal operations
- AAR `force_launched` is false when explicitly set to false

All 24 tests in the file pass.

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 24/24 command_authority tests pass; 6 pre-existing failures in unrelated suites (brigade_posture, war_phase_step_order, etc.)
- `vite build` (map) — clean

## Files Changed

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Added `was_force_launched?: boolean` to `CorpsOperation` |
| `src/desktop/electron-main.cjs` | Set `was_force_launched = true` alongside `force_launch` |
| `src/sim/combat/operation_aar.ts` | Added `force_launched` + `ca_cost_at_launch` to `OperationAAR`; populated in `finalizeOperationAAR` |
| `src/ui/map/data/types.ts` | Added `was_force_launched` to `OperationView` |
| `src/ui/map/data/GameStateAdapter.ts` | Passes `was_force_launched` to renderer |
| `src/ui/map/components/OperationBriefingModal.tsx` | Added `ForceLaunchBadge` component |
| `tests/command_authority.test.ts` | 5 new provenance tests |

## Design Decisions

- **Permanent flag, not derived:** `was_force_launched` is a permanent boolean rather than being derived from `force_launch` history, because `force_launch` is cleared on recovery before AAR compilation.
- **Constant 15, not dynamic:** CA cost is hardcoded to 15 in the AAR because no per-operation CA cost field exists. Matches `FORCE_LAUNCH_COST` in both `electron-main.cjs` and `OperationBriefingModal.tsx`.
- **No friction penalties invented:** The badge is truthful provenance only — no morale hits, competence debuffs, or execution penalties. Those belong to future slices (v0.8.3+).
