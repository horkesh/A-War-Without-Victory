# v0.8-to-v0.9 Command Briefing Truth Unification

Date: 2026-04-07
Lane: `v0.8-to-v0.9 — Command Briefing / SITREP Truth Unification and Save-Load Briefing Hardening`
Status: Complete

## Why this lane

The repo already had a deterministic, sim-owned command briefing packet in `state.military.last_briefing`, but Army HQ, Warroom, and the map command strip were still generating overlapping command/SITREP truth through separate UI heuristics. That created three risks before `v0.9`:

- player-facing briefings could drift from the sim-owned packet
- diagnostics and SITREP surfaces could disagree on the same turn state
- save/load confidence for the canonical briefing packet stayed implicit instead of explicitly proven

This lane was chosen because it removed a real duplicate-truth seam instead of polishing around it.

## Audit findings

Before the change:

- `src/ui/map/data/GameStateAdapter.ts` built a synthetic `commandBriefing` from adapter heuristics instead of reading `military.last_briefing`
- `src/ui/map/components/army_hq/generateBriefing.ts` generated a second Army HQ-only briefing from `LoadedGameState`
- `src/ui/warroom/components/CommandBriefingModal.ts` generated a third Warroom-only command story from `extractWarData(...)`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx` used `firedEvents.length` as a pending-dot proxy, which was not the same thing as pending player decisions

The canonical source already existed:

- `src/sim/briefing/collect_briefing.ts`
- persisted at end of turn in `src/sim/turn_phases/war_phases.ts`
- stored as `state.military.last_briefing`

## Canonical ownership after cleanup

- Engine truth owner: `state.military.last_briefing`
- UI read adapter: `src/ui/map/data/GameStateAdapter.ts`
- Shared UI transform: `src/ui/shared/command_briefing_views.ts`
- Army HQ: presentation-only consumer of adapter-provided command briefing items
- Warroom command modal: presentation-only consumer of the same canonical packet
- Pending decision dot: `pendingEventDecisions`, not `firedEvents`

## Implementation

### Retired / narrowed

- Deleted `src/ui/map/components/army_hq/generateBriefing.ts`
- Removed adapter-side heuristic `buildCommandBriefing(...)` from `src/ui/map/data/GameStateAdapter.ts`
- Replaced Warroom's local `extractWarData(...)` command prose path with direct rendering of `military.last_briefing`
- Narrowed `WarroomStatusBar` from "any fired event" to actual pending event decisions

### Added / unified

- Added `src/ui/shared/command_briefing_views.ts` as the single UI transform from sim `CommandBriefing` to UI-facing `CommandBriefingView`
- `GameStateAdapter` now maps `state.military.last_briefing` directly into `loadedGameState.commandBriefing`
- `ArmyHQModal` now consumes `state.commandBriefing?.items`
- `SituationBriefing.tsx` is now a pure presenter over canonical briefing items
- `CommandBriefingModal.ts` now renders the canonical briefing headline and items rather than rebuilding its own summary

### Save/load hardening

- Added explicit round-trip coverage proving `military.last_briefing` survives `serializeState -> deserializeState -> serializeState` unchanged
- Updated adapter tests to prove `parseGameState` maps the canonical briefing packet instead of rebuilding it

## Verification

Targeted seam verification:

- `npx.cmd vitest run tests/ui_adapter_boundary.test.ts tests/ui_map_render_smoke.test.ts`
- `npx.cmd tsx --test tests/state.test.ts`
- `npx.cmd tsx --test tests/ui_map_game_state_adapter.test.ts`
- `npx.cmd vitest run tests/warroom_player_visibility.test.ts`

Full verification:

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

Results:

- full Vitest pass: 209/209 files, 2962/2962 tests
- `tsx --test tests/state.test.ts`: 3/3 pass, including canonical briefing round-trip identity
- `tsx --test tests/ui_map_game_state_adapter.test.ts`: 12/12 pass
- `tsc --noEmit`: pass
- `npm run build`: pass

## Determinism / truth evidence

- `state.military.last_briefing` remains the single source of command briefing truth
- UI ordering now comes from the already-sorted sim packet instead of separate UI heuristics
- save/load round-trip explicitly preserves the canonical packet byte-stably through serialize/deserialize/serialize
- Warroom and Army HQ now consume the same underlying command packet rather than parallel summaries

## Files changed

- `src/ui/shared/command_briefing_views.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/army_hq/SituationBriefing.tsx`
- `src/ui/map/components/CommandBriefingLayer.tsx`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- `src/ui/warroom/components/CommandBriefingModal.ts`
- `tests/state.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui_map_render_smoke.test.ts`
- `tests/ui_adapter_boundary.test.ts`
- `tests/warroom_player_visibility.test.ts`

Deleted:

- `src/ui/map/components/army_hq/generateBriefing.ts`

## Deferred

Explicitly deferred to later `v0.8-to-v0.9` or `v0.9` work:

- broader explanation-surface expansion beyond the command briefing packet
- deeper save/load / replay hardening outside command briefing persistence
- larger Warroom shell parity and layout polish
- any new command-review feature work not required to unify existing truth owners
