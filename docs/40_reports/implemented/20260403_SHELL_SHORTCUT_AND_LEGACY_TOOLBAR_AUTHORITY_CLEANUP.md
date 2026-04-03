# 2026-04-03 — Shell Shortcut and Legacy Toolbar Authority Cleanup

## Summary

This slice removed two remaining shell-authority traps in the tactical map:

1. `TopToolbar.tsx` was explicitly demoted to legacy prototype status so future work does not treat it as a live shell owner beside `PresidentialToolbar`.
2. `useKeyboardShortcuts.ts` no longer advances the turn by scanning DOM buttons for `"ADVANCE TURN"` text. Space now routes through the canonical `advanceTurnAndSync(...)` action.

## Why

The repo still had polished but non-live shell surfaces that looked production-ready, and the keyboard layer still relied on DOM text to trigger a major command. Both patterns are classic false-authority traps:

- they encourage new work to extend the wrong shell
- they make behavior depend on presentation details instead of typed command routes

## Changes

### Legacy shell demotion

- [src/ui/map/components/TopToolbar.tsx](F:/A-War-Without-Victory/src/ui/map/components/TopToolbar.tsx)
  - added explicit legacy/non-canonical header comment
- [src/ui/map/stories/TopToolbar.stories.tsx](F:/A-War-Without-Victory/src/ui/map/stories/TopToolbar.stories.tsx)
  - Storybook title changed to `Legacy/TopToolbar`
- [src/ui/map/desktop/orderActions.ts](F:/A-War-Without-Victory/src/ui/map/desktop/orderActions.ts)
  - comment now names `PresidentialToolbar` as the mounted shell owner
- [src/ui/map/vite.config.ts](F:/A-War-Without-Victory/src/ui/map/vite.config.ts)
- [src/ui/map/vite.config.js](F:/A-War-Without-Victory/src/ui/map/vite.config.js)
  - build-time comment no longer references `TopToolbar`

### Shortcut authority cleanup

- [src/ui/map/hooks/useKeyboardShortcuts.ts](F:/A-War-Without-Victory/src/ui/map/hooks/useKeyboardShortcuts.ts)
  - imported canonical `advanceTurnAndSync(...)`
  - imported live IPC bridge through `useIPC()`
  - Space now advances the turn through the canonical action path
  - removed DOM scan / button-text click behavior
  - added repeat/concurrency guard so a held Space key does not fire stacked turn-advance requests
- [tests/ui_shell_navigation.test.ts](F:/A-War-Without-Victory/tests/ui_shell_navigation.test.ts)
  - added authority test asserting the shortcut layer no longer uses DOM button scans for turn advance

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\ui_shell_navigation.test.ts tests\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome

The live tactical shell now has one clearer command path:

- `PresidentialToolbar` is the mounted shell owner
- the keyboard layer uses canonical actions instead of DOM guesswork
- `TopToolbar` remains available only as a legacy reference, not as plausible live authority
