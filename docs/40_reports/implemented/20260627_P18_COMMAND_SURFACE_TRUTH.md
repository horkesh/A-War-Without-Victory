# P18 Command Surface Truth

## Summary

P18 closes the next non-packaging owner-playthrough information-quality packet. It focuses on places where a player could be confused by an inert action, stale command projection, or sparse command data being presented as exact truth.

## Changes

- Decision Room action rows now carry unavailable reasons when a card has no route, and disabled action buttons expose the reason in visible helper text, title text, and accessible names.
- Generic Decision Room navigation no longer treats the President's Desk inbox target as a map-route target. App-level Desk handlers remain the owner for opening the Desk.
- Stale English Decision Room copy now says `Advanced Review` and `Decision Loop` instead of implying a second desk/product surface.
- Sector coverage tiers in Army HQ, OOB, and Corps Detail now derive from live line holders over sector front segments when that denominator exists, not from stale roster density alone.
- Corps Front reserve ratio no longer renders a fake `0%` without a reported sector-personnel denominator, and an unreported sector-security state uses neutral action copy instead of implying security is inactive.
- Opening corps commander projection is now turn-zero only and still skips operation-assigned officers.
- Formation Detail war narratives are sanitized through the same player-safe settlement-label replacement used for notable moments.

## Verification

- `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts tests/ui/presidential_decision_room_panel_i18n.test.ts tests/ui/decision_room_navigation_owner.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/corps_front_panel_routing.test.ts --pool=forks --reporter=dot` passed: 6 files / 127 tests.
- `npm.cmd exec -- vitest run tests/ui/opening_corps_commander_display.test.ts tests/ui/commander_read_model_surfaces.test.ts tests/ui/formation_detail_parity.test.ts --pool=forks --reporter=dot` passed: 3 files / 57 tests.
- Combined focused proof passed `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts tests/ui/presidential_decision_room_panel_i18n.test.ts tests/ui/decision_room_navigation_owner.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/opening_corps_commander_display.test.ts tests/ui/commander_read_model_surfaces.test.ts tests/ui/formation_detail_parity.test.ts --pool=forks --reporter=dot`: 9 files / 184 tests.
- Shell-navigation contract repair passed `npm.cmd exec -- vitest run tests/ui_shell_navigation.test.ts tests/ui/decision_room_navigation_owner.test.ts --pool=forks --reporter=dot`: 2 files / 20 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed: 43 files / 681 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- Manual in-app browser proof on `http://127.0.0.1:3006/` from this worktree verified RBiH start, war-start/opening brief, foundational decision response, Desk owner handoff, Decision Room `Advanced Review` / `Decision Loop` labels, disabled `Report` / `Cost` unavailable reasons, turn-zero acting commanders in OOB, and console health with only the expected browser/dev desktop-bridge fallback warning.
- `git diff --check` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema migration, baseline/golden manifest, structural fingerprint artifact, calibration floor, packaged installer artifact, randomness, timestamps, locale persistence, persisted output ordering, or Srebrenica/Zepa event-owned fall receipt behavior changed.
