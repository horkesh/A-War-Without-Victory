# Warroom React Migration — Wave 2

**Date:** 2026-04-03
**Scope:** Canvas render loop gating, hotspot interaction gating, scene plate asset skip, advance-turn in React
**Status:** Complete

## Summary

Wave 2 consolidates ownership between the legacy canvas warroom path and the React `WarroomShellLayer`. The React shell is now the canonical room-navigation surface when `REACT_SHELL_ENABLED=true`. The canvas path is reduced to a clearly-fenced legacy fallback.

Four consolidation targets delivered:

---

## Target 1 — Disable canvas render loop when React owns the room

**File:** `src/ui/warroom/warroom.ts`

- Added `private renderLoopRunning = false` field.
- Added `startRenderLoop()` / `stopRenderLoop()` pair. `startRenderLoop()` guards against double-scheduling.
- `renderLoop()` now checks `renderLoopRunning` at entry — if false, returns without rescheduling. If `REACT_SHELL_ENABLED && tacticalMapInWarroomMode`, stops itself (sets flag false, returns).
- `init()` calls `startRenderLoop()` instead of `renderLoop()` directly.
- `showWarroomScene()` clears `tacticalMapInWarroomMode = false` and calls `startRenderLoop()` to restore the loop when reverting to legacy mode.
- Result: zero rAF cost when React owns the warroom surface.

## Target 2 — Disable canvas mouse handlers when React owns hotspot interaction

**File:** `src/ui/warroom/warroom.ts`

- `mousemove` and `click` listeners in `init()` now guard with `if (REACT_SHELL_ENABLED && this.tacticalMapInWarroomMode) return` before calling `onMouseMove` / `onClick`.
- Comment: `// LEGACY ROOM CANVAS: React owns hotspot interaction when REACT_SHELL_ENABLED.`
- Result: no dual-ownership of cursor feedback or click dispatch when React shell is active.

## Target 3 — Skip canvas scene plate and flag asset loading when React owns rendering

**File:** `src/ui/warroom/warroom.ts`

- `Promise.all([...])` in `init()` now gates `loadScenePlateAssets()` and `loadFlagAssets()` behind `REACT_SHELL_ENABLED ? Promise.resolve() : ...`.
- Comment: `// LEGACY FALLBACK: Scene plates and flags are loaded by React's static imports when REACT_SHELL_ENABLED.`
- Result: no wasted `HTMLImageElement` decode or network fetch for assets React already owns via static Vite imports.

## Target 4 — Advance-turn in React (fill the missing hotspot)

### 4a — `ShellHandoffCommand` union extended

**File:** `src/ui/shared/shellHandoff.ts`

- Added `| { kind: 'advance-turn' }` to the union.
- Updated `isShellHandoffCommand` to accept `'advance-turn'`.

### 4b — `regionToShellHandoff` wired

**File:** `src/ui/map/components/warroom/WarroomShellLayer.tsx`

- `case 'wall_calendar_area':` and `case 'wall_calendar':` now return `{ kind: 'advance-turn' }`.
- Previously both returned `undefined` — clicking the calendar in the React shell transitioned to game view with no action (completely broken).

### 4c — `advanceTurnPending` added to game store

**File:** `src/ui/map/store/gameStore.ts`

- Added `advanceTurnPending: boolean` field (default `false`) and `setAdvanceTurnPending: (v: boolean) => void` setter.

### 4d — `applyShellHandoffCommand` handles `'advance-turn'`

**File:** `src/ui/map/utils/shellNavigation.ts`

- `ShellNavigationState` interface extended with optional `setAdvanceTurnPending?: (v: boolean) => void`.
- `applyShellHandoffCommand` now handles `command.kind === 'advance-turn'` by calling `state.setAdvanceTurnPending?.(true)`.

### 4e — `AdvanceTurnModal` component created

**File:** `src/ui/map/components/warroom/AdvanceTurnModal.tsx`

- Renders when `advanceTurnPending=true` (returns null otherwise).
- Confirm path: calls `advanceTurnAndSync` (same path as `PresidentialToolbar`) then clears `advanceTurnPending`.
- Cancel path: clears `advanceTurnPending` immediately.
- Advancing state: button disabled + label changes to "Advancing…" while IPC call is in flight.
- Style: neutral/presidential (white card, green confirm, neutral cancel — consistent with app conventions).

### 4f — `AdvanceTurnModal` wired into `App.tsx`

**File:** `src/ui/map/App.tsx`

- Imported `AdvanceTurnModal`.
- Added `<AdvanceTurnModal />` to JSX alongside other modals (after `VerdictScreen`, before warroom shell layer).

---

## Legacy fallback demarcation

`warroom.ts` now has `// LEGACY ROOM CANVAS` comments above:
- `startRenderLoop()` / `stopRenderLoop()` / `renderLoop()`
- `loadScenePlateAssets()` / `loadFlagAssets()` call sites
- Canvas `mousemove` / `click` listener guards

Pattern used: `// LEGACY ROOM CANVAS: Only active when REACT_SHELL_ENABLED=false. Delete this block when REACT_SHELL_ENABLED is permanently true.`

---

## Tests

**File:** `tests/warroom_shell_layer.test.ts`

Changes:
- Updated stale assertion: `wall_calendar_area → undefined` → `wall_calendar_area → { kind: 'advance-turn' }`.
- Added: `wall_calendar → advance-turn`.
- Added: `wall_calendar_area` and `wall_calendar` to the mapped-regions validity sweep.
- Added describe block: `advance-turn ShellHandoffCommand` — type-level compile check + `isShellHandoffCommand` runtime check.
- Added describe block: `AdvanceTurnModal state contract` — three pure-logic tests verifying the pending flag contract.

All 20 warroom shell layer tests pass.

---

## Smoke-test triad

```
npx.cmd tsc --noEmit          → CLEAN (no output)
npm run test:vitest            → 1931 pass, 20 pre-existing failures (war_phase_step_order + unrelated suites — none caused by this wave)
Vite map build                 → ✓ built in 6.33s
check_claude_governance.ps1    → Claude governance check: OK
```

Pre-existing failures confirmed unrelated: `war_phase_step_order` (step count 148 vs 153 — pipeline mismatch from prior session), and other unrelated suites. Zero new failures introduced.

---

## Completion block

```
Canonical owner:    React WarroomShellLayer (scene rendering, hotspot interaction, advance-turn)
Demoted path:       warroom.ts canvas render loop, scene plate HTMLImageElement loading, canvas mouse handlers — all gated when REACT_SHELL_ENABLED=true
Player-visible truth: Clicking the wall calendar in the React Warroom shell now shows the advance-turn confirmation modal (was: silently transitioned to game view with no action)
Canonical UI surface: src/ui/map/components/warroom/ (WarroomShellLayer.tsx, AdvanceTurnModal.tsx)
Done means:         Canvas loop stopped in React warroom mode; no duplicate asset loading; wall_calendar_area hotspot is functional; all warroom shell layer tests pass; tsc + Vite build clean
```
