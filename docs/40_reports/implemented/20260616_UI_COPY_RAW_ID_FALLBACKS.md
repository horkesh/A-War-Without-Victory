# UI Copy Raw-ID Fallback Closure

**Date:** 2026-06-16

## Summary
- Closed lower-priority player-facing raw-id fallbacks in command planning, Chief of Staff briefing prose, Warroom hotspot titles, and autonomy proposal value chips.
- Preserved raw ids as internal payloads for click/navigation/proposal actions while rendering neutral or human-readable labels at the UI edge.

## Changes Made
- `CommandTopBar` now shows `Unassigned command authority` when only an internal commander id is available.
- `ChiefOfStaffBriefing` resolves command-strain corps names through the player-safe corps formatter and falls back to neutral corps-command copy.
- `WarroomShellLayer` uses the same humanized region label for hotspot `title` text as it uses for the accessible name.
- `AutonomyPanel` formats proposal `current_value` / `proposed_value` strings through display labels instead of printing slug payload values.

## Verification
- RED: `node_modules\.bin\vitest.cmd run tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` failed on the existing raw-id fallbacks.
- GREEN: `node_modules\.bin\vitest.cmd run tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 5/5.
- Nearby tests: `node_modules\.bin\vitest.cmd run tests/ui/ui_copy_raw_id_fallbacks.test.ts tests/ui/chief_of_staff_briefing_i18n.test.ts tests/autonomy_panel_player_faction_truth.test.ts tests/warroom_shell_layer.test.ts tests/ui/warroom_shell_accessibility.test.ts --pool=forks --reporter=dot` passed 65/65.
- Typecheck: `npm.cmd run typecheck` passed.

## Determinism And Scope
- UI/read-model presentation only. No simulation logic, scenario data, save schema, serialization, generated artifacts, calibration floor, or baseline outputs changed.
