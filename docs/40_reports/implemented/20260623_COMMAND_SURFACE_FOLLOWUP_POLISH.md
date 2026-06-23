# Command Surface Follow-Up Polish

**Date:** 2026-06-23

**Type:** UI/read-model/accessibility/i18n/test/docs polish.

## Summary

Closed the 2026-06-23 Pyrrhic scout queue for non-packaging, non-BCS command-surface polish:

- Brigade supply dots now use explicit player-visible supply state projected by `GameStateAdapter`, not fatigue/cohesion/status inference.
- Missing brigade supply renders as `Supply unreported`; explicit `critical` supply renders as critical.
- Warroom status and advance-review rows label `command` and `counter_offer` categories instead of falling back to `Memory`.
- Blocked President Desk advance action renders as `Review Advance Blockers` and opens the command-surface blocker review path.
- OperationsPanel card accessible names use player-safe operation phase labels.
- Army Reserve inspect and recall actions are sibling controls, eliminating nested buttons and ambiguous row/action ownership.

## Files

- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/components/BrigadeRow.tsx`
- `src/ui/map/components/OperationsPanel.tsx`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui/brigade_row_supply_labels.test.ts`
- `tests/ui/oob_operations_panel.test.ts`
- `tests/ui/gui_audit_dead_controls.test.ts`
- `tests/ui/advance_turn_button_gated_feedback.test.ts`
- `tests/ui/president_desk_shell.test.ts`
- `tests/ui/warroom_shell_accessibility.test.ts`

## Verification

- `npm.cmd exec -- vitest run tests/ui_map_game_state_adapter.test.ts tests/ui/brigade_row_supply_labels.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/gui_audit_dead_controls.test.ts tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/president_desk_shell.test.ts tests/ui/warroom_shell_accessibility.test.ts --pool=forks --reporter=dot` passed 94/94.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 277/277.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- Manual in-app browser proof on `http://127.0.0.1:3003/?dev=1` verified RS faction start, war-start identity brief, Begin flow, Desk blocked-action copy, Army HQ/command surface, zero console errors, and zero nested buttons.

## Scope

No simulation logic, scenario source data, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
