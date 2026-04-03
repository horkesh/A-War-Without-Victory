# Command Authority Override in Operation History Panel

**Date:** 2026-04-03
**Scope:** UI pipeline — `OperationAAR` → adapter → types → `OperationHistoryPanel`

## Summary

Presidential override provenance (`force_launched`, `ca_cost_at_launch`) was defined on `OperationAAR` but invisible to the player in the canonical retrospective surface (Army HQ Records → ops subtab). This change wires the fields through the adapter and renders an amber "Override" badge in the compact card header of every force-launched operation.

## Changes

### 1. `src/ui/map/data/types.ts`
- Added `force_launched?: boolean` and `ca_cost_at_launch?: number` to the `operationHistory` array element type (after `recovery_reason`).

### 2. `src/ui/map/data/GameStateAdapter.ts`
- `deriveOperationHistory()`: extracts `force_launched` (strict `=== true` guard) and `ca_cost_at_launch` (strict `typeof === 'number'` guard) from the AAR record. Undefined values are not forwarded.

### 3. `src/ui/map/components/OperationHistoryPanel.tsx`
- `CompletedOpCard` compact header: renders an amber badge ("⚠ Override" + CA cost) when `op.force_launched === true`. Positioned after the recovery reason badge in the right-side column. Style matches the `ForceLaunchBadge` in `OperationBriefingModal` (amber tint, uppercase, compact pill).

### 4. `tests/command_authority.test.ts`
- Added `operation history adapter pipeline` describe block with 5 tests:
  - `force_launched: true` + `ca_cost_at_launch: 15` extracted correctly
  - `ca_cost_at_launch` extracted when set to a number
  - Neither field present when AAR has them unset
  - `force_launched` omitted when explicitly `false`
  - `ca_cost_at_launch` omitted when not a number

## Verification

- `npx.cmd tsc --noEmit` — clean
- `npm run test:vitest` — 29/29 command_authority tests pass
- `vite build` — clean (tactical map builds successfully)

## Completion Block

```
Canonical owner:      src/ui/map/components/OperationHistoryPanel.tsx
Demoted path:         force_launched/ca_cost_at_launch stuck at AAR layer, invisible to player
Player-visible truth: Completed operations that were presidentially overridden show an amber "⚠ Override" badge in the operation history panel
Canonical UI surface: Army HQ Records → ops subtab → CompletedOpCard compact header
Done means:           force_launched flows through adapter → types → panel; badge visible in compact card view; tests cover the full pipeline; tsc + vitest + vite build clean
```
