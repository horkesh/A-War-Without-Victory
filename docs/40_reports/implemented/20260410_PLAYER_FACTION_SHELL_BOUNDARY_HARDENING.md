# 2026-04-10 - Player-Faction Shell Boundary Hardening

## Lane

- **Lane title:** `fix(ui): align shell player-faction ownership with canonical resolver`
- **Date:** 2026-04-10
- **Branch/worktree:** `codex/hardening-444-pocket`

## Why this lane

After the front-sector visibility and threat-precision lanes, the next highest-value bounded seam on the global board was duplicated player-faction ownership across shell/bootstrap surfaces. Multiple UI entrypoints were still minting a fallback player side with literals like `'RBiH'`, `'RS'`, or `factions[0]?.id` whenever canonical `player_faction` was absent or not yet ready.

This was not just cosmetic:

- it created a second truth owner beside `state.meta.player_faction`
- it let shell behavior differ by surface
- it made missing identity look like a real campaign side
- it risked leaking wrong-faction news, warroom state, and action routing

This was a bounded hardening lane because the canonical owner already existed. The correct move was to propagate that owner more strictly, not invent a new contract.

## Seam and root cause

### Exact seam

Shell/bootstrap surfaces were reading player identity through ad hoc fallbacks instead of shared canonical resolvers.

### Root cause

The repo had already established canonical helpers for player-safe faction identity, but several entrypoints predated that cleanup and still used local defaults:

- `App.tsx`
- `BottomStatusStrip.tsx`
- `DaytonNegotiationModal.tsx`
- `WrappedOverlay.tsx` / `WrappedSlide.tsx`
- `WarroomShellLayer.tsx`
- `useKeyboardShortcuts.ts`
- `ClickableRegionManager.ts`
- `NewsTicker.ts`
- `warroom.ts`

That meant shell behavior depended on which component loaded first, not on one canonical owner.

## Canonical owner after cleanup

- **Canonical owner:** `state.meta.player_faction`
- **Canonical resolver path:** `resolvePlayerFacingFaction(...)` and `getPlayerFacingFaction(...)`
- **Demoted path:** per-surface fallback literals and `factions[0]?.id`

## Changes made

1. `App.tsx`
   - Replaced hardcoded fallback player-faction selection with `resolvePlayerFacingFaction(...)`
   - Made shell bootstrap auto-selection null-safe instead of inventing a side

2. `BottomStatusStrip.tsx`
   - Replaced `?? 'RS'` logic with canonical resolver
   - Made percent/trend/dimension rendering null-safe

3. `DaytonNegotiationModal.tsx`
   - Replaced `?? 'RBiH'`
   - Made capital/patron/territorial package logic null-safe
   - Early-return when no canonical player faction exists

4. `WrappedOverlay.tsx` / `WrappedSlide.tsx`
   - Removed default faction invention
   - Allowed neutral rendering when faction identity is unavailable

5. `WarroomShellLayer.tsx`
   - Replaced fallback faction logic
   - Shows truthful unavailable state when no campaign side is selected

6. `useKeyboardShortcuts.ts`
   - Prevents tab-cycle corps routing from inventing a side

7. `ClickableRegionManager.ts`
   - Removed `factions[0]?.id` / fallback ownership
   - Preview generation now returns a neutral unavailable message when shell identity is missing

8. `NewsTicker.ts`
   - Stops generating player-faction-specific war events when identity is absent
   - Uses neutral `LIVE WIRE` label instead of fabricating a faction

9. `warroom.ts`
   - No longer invents `RBiH` during scenario fallback
   - Passes canonical player faction to map overlay only when it truly exists

10. Regression coverage
   - Added `tests/player_faction_shell_boundary_truth.test.ts` to lock the no-fallback contract

## Player-visible result

Shell/UI surfaces now prefer neutral or unavailable states over fake player-side identity.

Concrete effects:

- no shell surface silently becomes RBiH/RS because a state field is temporarily absent
- warroom preview/ticker behavior stays aligned with actual campaign identity
- bootstrap routing and keyboard shortcuts no longer act on fabricated faction context

## Proof

This lane is local UI/bootstrap truth hardening, not a sim/anomaly lane, so scenario reruns are not the strongest proof source. The strongest truthful proof is targeted shell regression coverage plus the full verification bar.

### Baseline

`tests/player_faction_shell_boundary_truth.test.ts` initially failed with 13 literal fallback violations across the shell/bootstrap surface area.

### Post-fix

The same regression now passes, and broader shell/player-visibility suites remain green.

### Exact verification

- `npx.cmd vitest run tests/player_faction_shell_boundary_truth.test.ts`
- `npx.cmd vitest run tests/player_faction_shell_boundary_truth.test.ts tests/ui_player_visibility.test.ts tests/ui_shell_navigation.test.ts tests/warroom_shell_layer.test.ts tests/warroom_player_visibility.test.ts tests/dayton_negotiation.test.ts tests/wrapped_slides.test.ts`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Outcome

- the duplicated player-faction fallback owner is gone from the targeted shell/bootstrap surfaces
- the ownership story is simpler: `player_faction` exists or the UI stays neutral
- no scenario/runtime behavior changed, which is correct for this lane

## Files changed

- `src/ui/map/App.tsx`
- `src/ui/map/components/BottomStatusStrip.tsx`
- `src/ui/map/components/DaytonNegotiationModal.tsx`
- `src/ui/map/components/chronicle/WrappedOverlay.tsx`
- `src/ui/map/components/chronicle/WrappedSlide.tsx`
- `src/ui/map/components/warroom/WarroomShellLayer.tsx`
- `src/ui/map/hooks/useKeyboardShortcuts.ts`
- `src/ui/warroom/ClickableRegionManager.ts`
- `src/ui/warroom/components/NewsTicker.ts`
- `src/ui/warroom/warroom.ts`
- `tests/player_faction_shell_boundary_truth.test.ts`
- `docs/40_reports/implemented/20260410_PLAYER_FACTION_SHELL_BOUNDARY_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual risks

- Operation force-ratio precision is still too exact in several player-facing shells and remains the clearest next bounded UI/player-truth lane.
- Gorazde residual uncovered-territory seams remain content/runtime-audit territory.
- Podrinje strandedness remains redesign-blocked.
- 444th Konjic remains doctrine realism, not a shell ownership seam.

## Next lane

- **Next bounded lane selected:** `fix(ui): demote player-facing operation force-ratio precision to staff abstractions`
