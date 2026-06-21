# Command Briefing Structured Metadata

Date: 2026-06-22

## Summary

Closed the Army HQ briefing metadata gap found by the Pyrrhic scout. Command briefing views now carry typed category, subject, and copy-token metadata beside their saved fallback strings, and the Chief of Staff briefing consumes that metadata instead of parsing English rendered titles. The same batch converts Force Readiness recommendations to typed ids while keeping legacy recommendation strings as fallback display compatibility.

## Changes

- `CommandBriefingItemView` now supports `briefingCategory`, `subject`, and `copyToken` metadata.
- `toCommandBriefingView(...)` infers stable briefing categories and subjects from canonical item ids and targets.
- `ChiefOfStaffBriefing` now finds cohesion alerts across critical and warning items and resolves corps/operation/sector labels from metadata or current formation state rather than English title parsing.
- `ForceReadiness` now generates typed `recommendationId` values and maps them to i18n keys, with legacy English strings retained only as compatibility fallback.

## Verification

- Focused proof: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts tests\ui_map_render_smoke.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts --reporter=dot` passed 68/68.
- Broader command/briefing proof: `npx.cmd vitest run tests\ui\chief_of_staff_briefing_i18n.test.ts tests\ui_map_render_smoke.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\warroom_priority_docket.test.ts --reporter=dot` passed 118/118.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 249/249.
- `npm.cmd run qa:live-surface:browser` passed on fresh port `3251`, with live sweep evidence and dev-server cleanup verified.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event mechanics, turn pipeline, Srebrenica/Zepa event ownership, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Ups

- Command briefing fallback strings from `collect_briefing.ts` still need full copy-token localization at render time.
- Generated Chronicle/FEEL entry templates remain the next generated-copy lane: war weariness, refugee flow, Sarajevo siege, generals digest, and consequence receipts.
