# Shell Ownership and HQ Records Canonicalization

Date: 2026-04-02  
Branch: `codex/engine-health-wave1`

## Why

The tactical-map shell was still carrying split ownership:

- Army HQ was supposed to own records and command review.
- The live shell still had orphan-style history entrypoints and a tactical operations panel that read like a second headquarters.
- Codex visibility depended too much on hidden flows and legacy assumptions.

This pass tightened those ownership boundaries without removing useful field context.

## What changed

### 1. Army HQ records became the canonical top-level history path

- Added `armyHQRecordsSubTab` to map UI store state.
- Added `setArmyHQRecordsSubTab(...)` so shell navigation can open Army HQ directly into:
  - `aar`
  - `ops`
- `RecordsContent` now reads that shared state instead of holding a private local tab that top-level shell code could not address.

Files:

- `src/ui/map/store/gameStore.ts`
- `src/ui/map/components/army_hq/RecordsContent.tsx`

### 2. Shell navigation now has one reusable Army HQ routing helper

Added `src/ui/map/utils/shellNavigation.ts` with:

- `openArmyHQTab(...)`
- `openArmyHQRecordsSubTab(...)`
- `openArmyHQBriefingForCorps(...)`

This gives the shell one honest route into Army HQ instead of each component inventing its own direct state edits.

### 3. PresidentialToolbar is now treated as the real live shell

The live tactical-map app mounts `PresidentialToolbar`, not `TopToolbar`.

This pass made the active shell explicitly usable by adding visible buttons for:

- `SUMMARY`
- `RECORDS`
- `OPS`
- `EVENTS`
- `CODEX`

Those buttons now route through the current canonical shell behavior instead of leaving the player to discover everything through keyboard shortcuts or secondary panels.

File:

- `src/ui/map/components/PresidentialToolbar.tsx`

### 4. Tactical Operations panel is now explicitly a field snapshot

`OperationsPanel` now frames itself as:

- `Field Ops Snapshot`
- map-facing
- not the canonical command-review owner

It also has an `HQ Review` button that routes the player into Army HQ briefing focused on the selected corps.

File:

- `src/ui/map/components/OperationsPanel.tsx`

### 5. App-level orphan history modals were demoted

The live app no longer keeps top-level `AARPanel` / `OperationHistoryPanel` modal ownership in `App.tsx` for primary shell flows.

Top-level shell navigation now routes records/history through Army HQ records instead.

File:

- `src/ui/map/App.tsx`

## Product-architecture consequence

This clarifies the shell contract:

- `PresidentialToolbar` is the live top shell for tactical-map play.
- `Army HQ` owns records and command review.
- `OperationsPanel` is a spatial companion, not a rival command center.
- `Codex` remains its own knowledge system, but now has a visible top-level path again.

## Verification

Passed:

- `node_modules\.bin\vitest.cmd run tests\ui_shell_navigation.test.ts tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

Note:

- Full `tsc --noEmit -p tsconfig.json` in this clean worktree is still not a useful gate right now because the execution lane is missing React/type resolution for the broader TSX surface. That is an environment lane issue, not a regression introduced by this slice.

## Follow-on work

- classify `TopToolbar.tsx` explicitly as retired/legacy or revive it intentionally
- continue player-knowledge leak cleanup in Army HQ summary and other staff surfaces
- keep shrinking shell duplication between Warroom, tactical map, Army HQ, and Codex

## Done means

- canonical owner: `Army HQ` for records / command review; `PresidentialToolbar` for live tactical-map shell
- demoted path: orphan top-level history modal ownership in `App.tsx`
- player-visible truth: Codex and records are visible via explicit live shell buttons
- canonical UI surface: Army HQ records for AAR/ops history; tactical map ops panel for field context only
- proof: shell-navigation tests + Warroom visibility tests + governance check
