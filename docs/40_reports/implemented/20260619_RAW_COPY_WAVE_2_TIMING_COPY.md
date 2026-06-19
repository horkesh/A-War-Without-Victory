# Raw-Copy Wave 2 Timing And Fallback Copy

**Date:** 2026-06-19

**Type:** UI/read-model player-copy polish.

## Summary

The second 2026-06-19 raw-copy wave closes the queued timing and fallback leaks from President's Desk, Army HQ, Turn Aftermath, Decision History, Operations, Replay, Territory chart, Verdict/share, Peace Status, Advance Turn, Officer Matter, Army CO pushback, and Desk decision cards.

A follow-up specialist sweep in the same branch also closed residual HQ/shell leaks in Army HQ headers, ORBAT recent engagements, Peace Plan proposal timing, Turn Aftermath Records filing metrics, global loaded-state labels, Game Over fallback dates, AAR/sector/tooltip battle fallbacks, operation phase/outcome/tempo labels, unknown Event Modal categories, and the war-start identity modal title.

The durable rule is now explicit: player-facing timing should render calendar dates or semantic command-cycle copy, not raw engine turns, `T` shorthand, `W` week labels, or enum/id fallback strings.

## Implemented

- President's Desk strategic situation header now shows the calendar date only.
- Army HQ presidential attention rows show pending decision timing as calendar dates.
- Turn Aftermath consequence receipts, officer-resentment receipts, territory significance rows, and signal details use dated or neutral player-safe copy.
- Decision History row timing uses calendar dates.
- Command authority readiness copy says preparation step/cycle rather than raw turn count.
- Operations panel labels operation phase age as weeks in phase instead of `Turn {n}`.
- Replay scrubber and replay inspection banner show calendar dates and an autoplay cadence label rather than `ms / turn`.
- Territory-over-time chart ticks render compact calendar labels.
- Verdict milestones, verdict fallback end labels, and share text render calendar dates instead of raw weeks.
- Peace Status renders referendum/declaration timing as calendar dates, maps event types to player-safe labels, and localizes pending-investment copy.
- Advance Turn blockers use decision-surface type labels instead of raw inbox enum strings.
- Officer Matter modal maps officer event types to localized player-safe labels.
- Army CO pushback copy renders command authority, dates, command-cycle pauses, and command-cycle history instead of `political_capital`, `tN`, or cooldown shorthand.
- President's Desk decision cards use a neutral fallback family label for unknown inbox types.
- Army HQ modal headers now show the calendar date only.
- ORBAT recent engagements now show calendar dates and mapped/neutral outcome labels instead of `W{turn}` and raw outcome ids.
- Peace Plan modal proposal timing now renders a calendar date instead of `Week {n}`.
- Turn Aftermath Records now labels the filing date instead of a raw turn metric.
- Loaded-game display labels now derive from metadata date or `turnToDateString(...)` instead of `Turn {n}`.
- Game Over fallback date now uses `turnToDateString(...)`.
- AAR, Sector, and Tooltip battle fallbacks now use mapped or neutral engagement labels instead of raw outcome/friction ids.
- Operations panel phase timeline/detail, tempo, and minimum-outcome rows now use player-safe label maps with neutral fallbacks.
- Event Modal unknown categories now render the localized unknown category label instead of uppercasing the raw category.
- The war-start identity modal title now passes its resolved date into the `War begins: {date}` i18n key instead of showing the literal placeholder.

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\command_authority_explanation_delegation.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\president_desk_shell.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\decision_history_overlay.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts --reporter=dot` passed: 6 files / 105 tests.
- `node .\node_modules\vitest\vitest.mjs run tests\command_authority_explanation_delegation.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\president_desk_shell.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\decision_history_overlay.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\endgame_verdict_screen_mount.test.ts tests\ui\endgame_presentation_proof.test.ts tests\ui\endgame_verdict_replay_tab_live.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_visibility.test.ts tests\ui\territory_over_time_chart_timing.test.ts tests\ui\replay_scrubber_autoplay.test.ts --pool=forks --reporter=dot` passed: 13 files / 216 tests.
- `node .\node_modules\vitest\vitest.mjs run tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\decision_family_modals.test.ts tests\a5_army_co_pushback_ui.test.ts tests\ui\peace_status_panel_copy.test.ts tests\ui\turn_aftermath_modal_i18n.test.ts tests\ui\president_desk_decision_card_fallback.test.ts --pool=forks --reporter=dot` passed: 6 files / 31 tests.
- Combined focused wave pack passed: 18 files / 242 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- Final combined focused pack passed: 23 files / 275 passed / 2 skipped.
- `npm.cmd run qa:player-journeys` passed: 11 files / 107 tests.
- Follow-up residual pack passed: `tests\adapter_field_completeness.test.ts tests\ui_opord_player_safe_labels.test.ts tests\ui\peace_plan_modal.test.ts tests\ui\game_over_i18n.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\army_hq_timing_copy.test.ts` (7 files / 42 passed / 2 skipped).
- Follow-up `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:live-surface:browser` passed and verified port 3239 cleanup.
- `git diff --check` passed.

## Scope And Determinism

UI/read-model copy, i18n strings, focused tests, live browser QA, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Residuals

The next wave should handle newly proven live-browser or source-audit residuals outside this branch. Candidate areas are legacy i18n keys that may be diagnostic/dead, older component enum fallbacks not covered here, and any real-player raw-copy leaks discovered in fresh Warroom/Map/Army HQ/Records/Chronicle/Codex sweeps.
