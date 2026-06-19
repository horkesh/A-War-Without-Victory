# OSID/OPSEC Warroom Copy and QA Gate

**Date:** 2026-06-19
**Run ID:** N/A
**Baseline:** D2 player-polish branch after docs drift closeout
**Result:** UI/read-model copy cleanup plus expanded local player-journey gate

## Summary
- Removed reachable English raw/internal terminology from Game Over, Verdict, Tooltip/AAR friction, legacy Warroom settlement/diplomacy/advance-confirmation, paramilitary error, Main Menu, and Side Picker error paths.
- Expanded `qa:player-journeys` from the first-hour/store/inbox subset to include existing panel rail, shell navigation, settlement, Decision Room, OOB operations, and commander read-model tests.
- Kept BCS wording unchanged except where existing tests already pin it; owner/native-language LQA remains the gate for BCS copy changes.

## Changes Made
### Player-Facing Copy
- Replaced visible `OSID` control-count copy in English Game Over and Verdict fallback surfaces with settlement-count copy.
- Replaced tooltip/AAR `OPSEC` shorthand and defense-preview `at OSID` wording with player-facing concealment/position copy.
- Removed legacy Warroom `[PHASE II]`, `Composite IVP`, raw `IVP momentum`, raw turn advance confirmation, and dead `Modify Garrison` control copy.
- Changed the paramilitary desktop fallback from `Desktop IPC` wording to desktop command-shell copy.

### Error Sanitization
- Routed Main Menu and Side Picker startup errors through `playerFacingErrorCopy`.
- Added sanitizer coverage for raw `event_id` / `response_id` errors so decision internals do not echo into startup surfaces.

### QA Gate
- Added existing shell/panel/settlement/Decision Room/OOB/commander tests to `qa:player-journeys`.
- Added source and render guards for the cleaned English raw-copy paths.

## Scenario Results
N/A. No scenario or simulation behavior changed.

## Lessons Learned
- The previous live-surface sweep proved reachability, but not enough of the owner’s actual inspection journey. The local Vitest gate now carries more of that coverage, while live-browser owner-journey expansion remains the next tooling step.
- BCS copy must stay behind native review; English copy can be cleaned while preserving existing BCS assertions.

## Files Changed
| File | Change |
|------|--------|
| `package.json` | Expanded `qa:player-journeys` to include existing UI surface tests |
| `src/ui/map/components/GameOverModal.tsx` | Settlement-count formatter for English player copy |
| `src/ui/map/components/MainMenu.tsx` | Sanitized startup error rendering |
| `src/ui/map/components/SidePickerOverlay.tsx` | Sanitized startup error rendering |
| `src/ui/map/components/Tooltip.tsx` | Removed OPSEC/OSID visible tooltip copy |
| `src/ui/map/i18n/messages.en.ts` | Updated English raw-copy strings |
| `src/ui/map/utils/errorCopy.ts` | Redacted raw event/response identifier errors |
| `src/ui/warroom/ClickableRegionManager.ts` | Rendered advance confirmation dates instead of raw turns |
| `src/ui/warroom/components/DiplomacyModal.ts` | Replaced threshold labels with staff-facing condition copy |
| `src/ui/warroom/components/IvpBreakdownModal.ts` | Replaced IVP labels with diplomatic-pressure copy |
| `src/ui/warroom/components/SettlementInfoPanel.ts` | Removed phase labels and dead garrison button |
| `tests/*` | Added focused render/source guards and QA gate contract assertions |

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\ui\game_over_i18n.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\endgame_verdict_screen_mount.test.ts tests\ui\paramilitary_review_modal_i18n.test.ts tests\ui\error_copy_contract.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\warroom_player_visibility.test.ts tests\player_journey_qa_gate_contract.test.ts --pool=forks --reporter=dot` passed 82/82.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 21 files / 204 tests.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.

## Next Steps
- Add a deeper live-browser owner-journey gate for inbox action routing and tactical settlement/sector/unit panel interaction.
- Wire browser gates into CI when the workflow cost is acceptable.
- Continue raw-copy sweeps only from fresh failing proof, not stale closed lists.
