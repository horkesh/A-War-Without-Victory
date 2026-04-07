# 2026-04-08 — Warroom Shell Cohesion: desk_map Contract Clarification

## Summary

Closed a real shell-cohesion seam in `src/ui/map/components/warroom/WarroomShellLayer.tsx`.

The old `regionToShellHandoff()` comment lied about which regions were "unmapped." Four hotspots named in the comment were explicitly mapped in the switch. Only `desk_map` was truly unmapped, and that absence is intentional: returning `undefined` triggers the shell's map-entry transition.

This lane did not change Warroom truth ownership or add new data paths. It clarified the shell contract and locked it down with tests so future engineers do not form the wrong mental model.

## Seam

- **Exact seam chosen:** stale `regionToShellHandoff()` comment plus the undocumented implicit `desk_map` handoff in `WarroomShellLayer.tsx`
- **Why it mattered:** the comment misdescribed the live shell flow and the only intentionally unmapped hotspot had no named regression guard

## Implementation

- Updated `src/ui/map/components/warroom/WarroomShellLayer.tsx` comment to:
  - name `desk_map` as the single intentionally unmapped region
  - explain the implicit flow: `undefined -> warroomCommandStaysInRoom(undefined) -> false -> setAppScreen('game')`
  - state that all other known hotspots are explicitly mapped below
- Added two tests to `tests/warroom_shell_layer.test.ts`:
  - `desk_map` returns `undefined`
  - the full `onNavigate` path enters game view without applying a shell command

## Verification

- `npm.cmd run test:vitest` passed: 216/216 files, 3018/3018 tests
- `npx.cmd tsc --noEmit -p tsconfig.json` passed
- `npm.cmd run build` passed

## Residual

- `App.tsx` postMessage `handleShellHandoff` should be gated before `event-log` / `strategic-overview` are ever wired into that channel
- This is a shell-cohesion fix, not a new roadmap lane or truth-owner change

## Report path

- `docs/40_reports/implemented/20260408_WARROOM_SHELL_DESK_MAP_CONTRACT.md`
