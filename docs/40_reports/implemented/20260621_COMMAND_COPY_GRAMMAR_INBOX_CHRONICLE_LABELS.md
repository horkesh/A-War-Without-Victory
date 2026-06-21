# Command Copy Grammar, Inbox Localization, and Chronicle Label Closeout

**Date:** 2026-06-21

**Type:** UI/read-model/i18n/test polish.

## Summary

This batch closes residual D2-entry player-copy leaks in three related surfaces:

- Command strain, presidential attention, and Operation Briefing count copy now use explicit `one` / `many` EN/BCS message keys instead of English-style suffix composition.
- Generated Presidential Inbox rows for operation opportunities, autonomy proposals, paramilitary requests, and officer matters now render through EN/BCS keys instead of hardcoded English literals; BCS mode no longer echoes non-localized generated proposal descriptions.
- Chronicle and Wrapped summaries now route displacement groups and political faction ids through shared player-safe / localized label helpers before display.

The Warroom priority docket action label now consistently says `Open Decision Room`, matching the Decision Room ownership model.

## Implementation Notes

- `src/ui/map/data/command_strain.ts` selects plural-specific copy tokens for prior delays, recovery forecasts, and must-hold deficit constraints.
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx` and `src/ui/map/components/OperationBriefingModal.tsx` render count-specific message keys for review and postponement badges.
- `src/ui/map/data/inboxItems.ts` localizes generated opportunity, autonomy, paramilitary, and officer Inbox titles/subtitles while preserving existing route/action semantics.
- `src/ui/map/utils/playerSafeText.ts` now exposes shared displacement-group display labels for Chronicle and Wrapped consumers.
- `src/ui/map/components/chronicle/generateChronicleEntries.ts`, `generateWrappedSlides.ts`, and `WrappedSlide.tsx` stop rendering raw faction/displacement ids as player copy; Wrapped faction labels use the same EN/BCS faction keys as the side picker.

## Verification

- `npx.cmd vitest run tests\ui\warroom_priority_docket.test.ts tests\ui\command_strain_i18n_boundary.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\inbox_items.test.ts tests\ui\paramilitary_inbox_items.test.ts tests\chronicle_entries.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` passed 107/107.
- `npx.cmd vitest run tests\ui\warroom_priority_docket.test.ts tests\ui\command_strain_i18n_boundary.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\inbox_items.test.ts tests\ui\paramilitary_inbox_items.test.ts tests\chronicle_entries.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 124/124.
- `npx.cmd vitest run tests\ui\inbox_items.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` passed 70/70 after the reviewer follow-up for non-empty BCS generated descriptions and localized Wrapped faction labels.
- `npm.cmd run qa:player-journeys` passed 249/249.
- `npm.cmd run qa:first-hour:browser` passed and verified all-faction foundational flows, Records/Chronicle receipts, raw first-hour label absence, and dev-server cleanup.
- `npm.cmd run qa:live-surface:browser` passed and verified major surface reachability, Army HQ/Records drilldowns, operation-opportunity Decision Room routing, battle marker/AAR fixture proof, archive routes, Codex drilldowns, and dev-server cleanup.
- `npm.cmd run desktop:map:build` passed with the existing Vite browser-external/chunk-size warnings.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed. Srebrenica/Zepa fall ownership remains event-receipt owned and untouched.
