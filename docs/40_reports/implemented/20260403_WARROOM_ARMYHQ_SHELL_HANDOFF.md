# 2026-04-03 - Warroom to Army HQ shell handoff

## Summary

- Demoted Warroom's live staff-packet props so they hand off into the embedded tactical shell instead of opening a second command-review stack.
- Added one shared shell-handoff command contract used by Warroom and the tactical shell.
- Made the same handoff survive browser/dev new-tab tactical-map launches through a query-param round-trip, not just the embedded Electron iframe path.
- Kept the old Warroom modal implementations on disk as fallback/reference, but stopped treating them as the live owner when the tactical shell is available.

## What changed

### Shared shell handoff contract

- Added `src/ui/shared/shellHandoff.ts`
- Defines the small player-shell handoff commands the live product now uses:
  - `army-hq` with `tab`, optional `recordsSubTab`, optional `corpsId`
  - `codex`

### Tactical shell receiver

- Updated `src/ui/map/utils/shellNavigation.ts`
  - added `applyShellHandoffCommand(...)`
- Updated `src/ui/map/App.tsx`
  - listens for `awwv-shell:handoff`
  - routes Warroom-originated handoffs into canonical Army HQ navigation
  - keeps Codex as a distinct shell handoff instead of forcing it into Army HQ tabs
  - consumes one-time `shellHandoff` query params for browser/dev launches and clears them from the URL after application

### Warroom sender

- Updated `src/ui/warroom/ClickableRegionManager.ts`
  - `wall_flag_area` / `commander_coatrack` now hand off to Army HQ `summary`
  - `command_briefing_folio` now hands off to Army HQ `briefing`
  - Warroom report stack path now hands off to Army HQ records `ops`
  - Warroom intelligence-journal path now hands off to Army HQ records `aar`
- Updated `src/ui/warroom/warroom.ts`
  - stores pending shell-handoff commands
  - ensures the embedded tactical map opens first
  - flushes the pending handoff into the iframe once it is ready
  - encodes the same handoff into the tactical-map URL for browser/dev launches where Warroom opens a new tab instead of an embedded iframe

## Why

Warroom had become a second staff shell:

- `FactionOverviewPanel`
- `CommandBriefingModal`
- `ReportsModal`
- `MagazineModal`

Army HQ already owns the real command-review depth in the tactical shell. Leaving Warroom props as parallel owners meant the product still had two live ways to review the same strategic truth. That is bad studio architecture and it also inflates modal sprawl.

This pass makes Warroom act more like an executive room:

- room shell
- atmosphere
- navigation and summary
- direct handoff into the canonical command shell

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_shell_navigation.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_player_visibility.test.ts`
- `node .\\node_modules\\vite\\bin\\vite.js build --config src\\ui\\warroom\\vite.config.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`

## Follow-up

- Demote or archive the old Warroom modal classes once the shell handoff is proven stable in live use.
- Continue collapsing Warroom into a cleaner executive shell while Army HQ owns detailed command review.
