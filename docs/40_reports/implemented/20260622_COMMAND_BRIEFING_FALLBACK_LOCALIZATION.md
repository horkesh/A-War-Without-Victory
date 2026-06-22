# Command Briefing Fallback Localization

Date: 2026-06-22
Status: Implemented

## Summary

Closed the command briefing fallback-string display gap left after the structured metadata pass. The sim command briefing packet may still persist English fallback strings for legacy-save compatibility, but normal UI consumers now resolve known generated briefing items through EN/BCS i18n at the display boundary.

## Changes

- Added `src/ui/map/data/commandBriefingCopy.ts` as the shared display resolver for command briefing headlines, item titles/details, action labels, and chip labels.
- Wired the resolver into the tactical command briefing banner, Army HQ Situation Briefing, Presidential Decision Room briefing cards, and the legacy Warroom command briefing modal.
- Added EN/BCS keys for command briefing headline counts, operations, disrupted formations, cohesion, supply, peace-plan, patron, enclave, field-report, order-interpretation, officer-event, action, and target labels.
- Extended BCS component/read-model tests so command briefing surfaces reject the old English fallback strings.
- Extended the BCS live browser sweep sentinel list for command briefing English fallback phrases.

## Verification

- TDD red proof before implementation: `npx.cmd vitest run tests\ui\situation_briefing_progressive_disclosure.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts --reporter=dot` failed on the intended BCS command briefing leak tests.
- Focused green proof: `npx.cmd vitest run tests\ui\situation_briefing_progressive_disclosure.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\warroom_player_visibility.test.ts --reporter=dot` passed 77/77.
- Expanded command/UI proof: `npx.cmd vitest run tests\ui\situation_briefing_progressive_disclosure.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\chief_of_staff_briefing_i18n.test.ts tests\ui\command_briefing_banner_contract.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts --reporter=dot` passed 148/148.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 250/250.
- BCS live browser proof: `$env:AWWV_UI_LOCALE='bcs'; $env:AWWV_LIVE_SURFACE_BROWSER_LOCALE='bcs'; npm.cmd run qa:live-surface:browser` passed and wrote evidence to `.tmp_live_surface_browser_sweep/live_surface_browser_sweep.json`.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.

## Determinism / Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, event mechanics, scenario data, save schema, command briefing persistence shape, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Follow-Up

The long-term architecture target remains typed copy params at the command briefing read-model boundary. This batch deliberately avoided save-shape churn and localized known generated fallback ids at render time.
