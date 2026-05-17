# SettingsScreen Shell Cleanup

**Date:** 2026-05-18
**Baseline:** Structural defect audit row: `SettingsScreen` shell mounts but settings do not affect behavior.
**Result:** Partly stale, partly implemented cleanup.

## Summary
- The broad audit claim is stale: Settings now has real-backed BCS language, accessibility, tutorial restart, and soundscape controls.
- Three visible dead controls still existed: Turn Confirmation, Fog of War, and Map Quality.
- Removed those dead affordances from the visible Settings shell without adding simulation-impacting settings.

## Evidence
### Existing Substrates
- BCS localization: `src/ui/map/i18n/*`, `SettingsScreen` Language tab, and `tests/ui/settings_screen_i18n.test.ts`.
- Soundscape controls: `src/ui/map/audio/audio_preferences.ts`, `SettingsScreen` Audio tab, and `tests/ui/settings_audio_preferences.test.ts`.
- Accessibility preferences: `REDUCE_MOTION_STORAGE_KEY`, `COLORBLIND_PRESET_STORAGE_KEY`, `globals.css` html hooks, and `tests/v093_a11y_lane_d_contrast_reduced_motion.test.ts`.
- Tutorial restart: `OnboardingRestartButton` gated by `tutorial_state.dismissed === true`.

### Stale Or Removed
- Turn Confirmation: removed. It used a local uncontrolled toggle with no app/read-model consumer.
- Fog of War: removed. It used a local uncontrolled toggle and did not control the map fog substrate.
- Map Quality: removed. It was a local select with no renderer/performance substrate.
- Telemetry/crash wording: no SettingsScreen telemetry/crash control was found in the current shell.

## Changes Made
### SettingsScreen
- Default section now opens to Audio, the first always-available real-backed settings surface.
- Gameplay tab is shown only when it has a real tutorial restart action to host.
- Display tab was removed because its only setting was the dead Map Quality select.
- Removed the unused local-only `ToggleSwitch` component.

### Tests
- Added `tests/ui/settings_screen_shell_cleanup.test.ts`.
- The new test first failed against the existing Display tab, then passed after the cleanup.

## Verification
- `npx.cmd vitest run tests\ui\settings_screen_shell_cleanup.test.ts --reporter=dot`
  - Red before implementation: 1 failed, 1 passed. Failure: `Display` button was still rendered.
  - Green after implementation: 1 file passed, 2 tests passed.
- `npx.cmd vitest run tests\ui\settings_screen_shell_cleanup.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\settings_audio_preferences.test.ts tests\v093_a11y_lane_d_contrast_reduced_motion.test.ts tests\v092_tutorial_lane_b_auto_dismiss.test.ts --reporter=dot`
  - 5 files passed, 26 tests passed.
- `npm.cmd run desktop:map:build`
  - Exit 0. Vite built 1059 modules in 18.32s.
  - Existing warnings remained: browser-externalized `node:fs`/`node:path`, loaders.gl `spawn` export warning, dynamic-import chunking notes, and large chunk warning.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/SettingsScreen.tsx` | Removed dead Gameplay/Display controls; kept real-backed settings surfaces. |
| `tests/ui/settings_screen_shell_cleanup.test.ts` | Added regression coverage for the cleanup. |
| `docs/40_reports/implemented/20260518_SETTINGS_SCREEN_SHELL_CLEANUP.md` | Verification report. |

## Next Steps
- Parent integration docs can mark the original backlog row as partially stale and now cleaned up.
- Do not re-add Turn Confirmation, Fog of War, or Map Quality until each has an existing non-sim-breaking substrate and focused tests.
