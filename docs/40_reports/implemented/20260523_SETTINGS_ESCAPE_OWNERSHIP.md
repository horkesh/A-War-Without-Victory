# Settings Escape Ownership

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Settings now owns `Escape` while it is open and closes itself without letting the global pause shortcut fire underneath.
- This fixes the remaining pause/settings keyboard edge where opening Settings from Pause could leave Escape ambiguous.
- UI-only shell behavior change. No sim, save, scenario, calibration, or baseline output changed.

## Changes Made
### Settings Modal
- `src/ui/map/components/SettingsScreen.tsx` adds a capture-phase Escape listener.
- The listener prevents default behavior, stops propagation to global shortcut owners, and calls the existing `onClose` callback.

### Regression Coverage
- `tests/ui/settings_screen_shell_cleanup.test.ts` now mounts Settings with the global keyboard shortcut hook and verifies Escape closes Settings while keeping `pauseMenuOpen` false.
- The test was added red-first and failed because `onClose` was not called.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/SettingsScreen.tsx` | Adds Settings-level Escape ownership. |
| `tests/ui/settings_screen_shell_cleanup.test.ts` | Adds regression coverage against reopening Pause below Settings. |

## Verification
- `npx.cmd vitest run tests\ui\settings_screen_shell_cleanup.test.ts --reporter=dot` PASS 3/3 after the red failure.

## Next Steps
- Broader settings polish can still add key remapping and richer display controls, but the core Escape tree is now owned.
