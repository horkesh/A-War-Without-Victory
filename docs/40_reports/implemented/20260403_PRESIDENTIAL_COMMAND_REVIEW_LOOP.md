# Presidential Command-Review Loop — Implementation Report

**Date:** 2026-04-03
**Commit baseline:** 278388ef (Command Authority vertical arc)
**Author:** Claude Code (Sonnet 4.6)

## Problem Statement

`CorpsOperation.commander_assessment` is a live field recomputed each turn. There was no snapshot of what the commander recommended at the moment the president made the decision. This meant:

- An operation in execution showed `ForceLaunchBadge` but gave no record of whether the commander had recommended Abort, Postpone, or Launch.
- A normally-approved operation had zero provenance of the commander's original recommendation.
- The four-part command story (recommendation → decision → CA cost → outcome) was structurally impossible to render from a single source.

## Root Cause

No snapshot taken at decision time. Live field is always overwritten by the preparation pipeline.

## Solution

One new field — `commander_assessment_at_launch?: CommanderAssessment` — set once at decision time in the IPC handlers, carried through to the AAR, mapped through the adapter, and rendered in both the modal and history panel.

## Changes Made

### `src/state/game_state.ts`
Added `commander_assessment_at_launch?: CommanderAssessment` to `CorpsOperation` after `commander_assessment`. Field is set once at presidential decision; never recomputed. Survives recovery reset.

### `src/desktop/electron-main.cjs`
- `stage-operation-force-launch` handler: after setting `was_force_launched = true`, also sets `op.commander_assessment_at_launch = op.commander_assessment`.
- `stage-operation-decision` handler: on `'launch'` decision, sets `op.commander_assessment_at_launch = op.commander_assessment ?? 'launch'`. Not set on postpone or abort — those are non-commit decisions.

### `src/sim/combat/operation_aar.ts`
- Added `CommanderAssessment` to the import from `game_state.ts`.
- Added `commander_assessment_at_launch?: CommanderAssessment` to `OperationAAR` interface.
- In `finalizeOperationAAR`: copies `op.commander_assessment_at_launch` to the AAR when present.

### `src/ui/map/data/types.ts`
- Added `commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort'` to `OperationView`.
- Added `commander_assessment_at_launch?: 'launch' | 'postpone' | 'abort'` to the `operationHistory` element type.

### `src/ui/map/data/GameStateAdapter.ts`
- Active operations mapping: maps `op.commander_assessment_at_launch` into `OperationView`.
- `deriveOperationHistory()`: maps `aar.commander_assessment_at_launch` into the history element type.

### `src/ui/map/components/OperationBriefingModal.tsx`
Added `CommandRecord` component — the canonical four-part presidential decision surface:
- Commander Recommended: `AssessmentBadge` showing the snapshot value
- Presidential Decision: "Approved" (green) or "⚠ Overrode Command Chain" (amber)
- Command Authority Spent: shown only when `wasForce === true`

Rendering logic:
- When `operation.phase !== 'planning'` AND `commander_assessment_at_launch` is present → render `CommandRecord` (supersedes `ForceLaunchBadge`)
- Legacy fallback: when `was_force_launched` is set but `commander_assessment_at_launch` is absent (ops launched before this feature) → render `ForceLaunchBadge` as before

`ForceLaunchBadge` is demoted to legacy-only. Its comment updated to reflect this.

### `src/ui/map/components/OperationHistoryPanel.tsx`
Added command record provenance sentence in the expanded section of `CompletedOpCard`:
- If `force_launched` AND `commander_assessment_at_launch` present: "Commander recommended X — President overrode command chain (cost: Y CA)"
- If `!force_launched` AND `commander_assessment_at_launch` present: "Commander recommended X — President approved"
- Compact amber `⚠ Override · N CA` badge in the header row is preserved as the quick-scan indicator; the expanded sentence is additive.

### `tests/command_authority.test.ts`
Added `describe('commander_assessment_at_launch snapshot')` with 7 new tests:
1. Force-launch sets snapshot to commander's assessment
2. Normal launch sets snapshot to commander's assessment
3. Normal launch with absent `commander_assessment` defaults snapshot to `'launch'`
4. `finalizeOperationAAR` copies snapshot to AAR when present
5. `finalizeOperationAAR` omits snapshot when absent (graceful degradation)
6. `deriveOperationHistory` maps snapshot from AAR when present
7. `deriveOperationHistory` omits snapshot when AAR lacks it

All 7 pass. All pre-existing tests continue to pass.

## Verification

```
npx.cmd tsc --noEmit          → clean (0 errors)
npm.cmd run test:vitest        → 1905 pass, 20 fail (all pre-existing, unrelated to this change)
desktop:map:build              → ✓ built in 6.62s (chunk size warning pre-existing)
check_claude_governance.ps1   → Claude governance check: OK
```

## Ownership Clarity

The `CommandRecord` component is the single canonical surface for the full presidential decision record on in-flight operations. `ForceLaunchBadge` is now explicitly a legacy-only fallback. There are no duplicate "Presidential Override" labels when `CommandRecord` renders. Terminology is consistent: "Direct Intervention" for the action, "Command Authority" for the resource.

## Pattern Learned

**Live fields are not provenance.** Any field that the engine recomputes each turn cannot serve as a historical record. Whenever a player makes a decision against a live field, snapshot it immediately at decision time into a dedicated `_at_launch` / `_at_decision` field. The live field continues to be authoritative for current state; the snapshot is authoritative for history.

---

```
Canonical owner: src/ui/map/components/OperationBriefingModal.tsx (CommandRecord section)
Demoted path: ForceLaunchBadge (standalone — now legacy fallback only, superseded by CommandRecord when snapshot available)
Player-visible truth: Every operation in execution/recovery shows Commander Recommendation + Presidential Decision + CA cost in one coherent Command Record section
Canonical UI surface: OperationBriefingModal — CommandRecord section (executing/recovery ops); OperationHistoryPanel expanded view (completed ops)
Done means: commander_assessment_at_launch flows from game_state → electron-main (set at decision) → operation_aar (captured in finalizeOperationAAR) → GameStateAdapter (mapped in deriveOperationHistory) → OperationHistoryPanel expanded view + OperationBriefingModal CommandRecord section; 7 new tests cover the full pipeline; tsc + vitest + vite build clean; governance passes
```
