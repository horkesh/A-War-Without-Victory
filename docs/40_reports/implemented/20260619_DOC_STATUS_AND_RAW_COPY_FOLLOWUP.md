# 2026-06-19 - Docs Status and Raw-Copy Follow-Up

## Summary

Closed the follow-up hygiene found after the raw-copy wave 2 merge:

- COMMAND_BOARD no longer describes PR #329 as open/mergeable; it is closed stale NO-GO and must not be resurrected without a new panel-approved calibration packet.
- The active 2026-06-16 execution plan now carries a supersession note so agents do not restart closed DeckGL/#170/raw-copy lanes from stale wording.
- Issue #170 same-axis concentration language is narrowed to the current truth: helper-contract tests remain, but the production arithmetic change is calibration-held after the 188w `matched_osids` floor failed 637/712 versus the required 658.
- Additional UI fallback leaks now render neutral/date-based copy in Corps Front, Operation History, Chronicle generation, Humanitarian Ledger, Army HQ field visits, Game Over, Verdict, and legacy Warroom status labels.
- CI expectation drift from the prior player-copy change was corrected in the endgame, war-start, and Turn Aftermath tests.

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\ui\endgame_presentation_proof.test.ts tests\ui\game_start_intro.test.ts tests\ui\turn_aftermath.test.ts tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\operation_aar_records_review.test.ts tests\ui\endgame_verdict_screen_mount.test.ts tests\ui\warroom_date_i18n.test.ts --pool=forks --reporter=dot` passed 130/130.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 107/107.
- `npm.cmd run qa:live-surface:browser` passed and verified strict-port cleanup.

## Determinism / Scope

UI/read-model copy, tests, and docs only. No simulation logic, scenario data, save schema, generated calibration artifacts, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, or packaged installer artifact changed.
