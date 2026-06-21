# Chronicle/Wrapped and Army HQ Threat Copy Polish

Date: 2026-06-21

## Summary

Closed the generated-copy boundary for Chronicle Wrapped, Chronicle chapter summaries, Chronicle accessibility chrome, and Army HQ threat assessment rows. The pass keeps authored event titles, operation names, brigade names, officer names, historical comparison notes, and standing-order names as authored data, while routing generated player-facing templates through EN/BCS i18n keys.

## Changes

- `generateWrappedSlides.ts` now localizes the ten canonical Wrapped slides and the optional causality slides.
- Causality slides keep raw branch tags in `data.tags` but render player-safe bullet labels instead of raw flags such as `rbih_national`.
- `WrappedSlide.tsx`, `WrappedOverlay.tsx`, `SpiderChart.tsx`, and `ChronicleSpine.tsx` now localize navigation/chrome labels; the spider chart separates canonical dimension keys from localized display labels so final-dimension values render correctly.
- `chronicleChapters.ts` now localizes boundary labels, doctrine fallback titles, type labels, month-range fallback copy, and chapter summaries.
- `ChronicleOverlay.tsx` now localizes filter titles and count aria labels.
- `generateThreatAssessment.ts` now builds localized threat titles/details and carries sector context fields alongside corps context for later drilldown routing.

## Verification

- Red proof before implementation: focused pack failed on BCS Wrapped core slides, causality slides, Chronicle chapter summaries, Wrapped component chrome/chart labels, and Army HQ threat prose.
- Green focused proof: `npx.cmd vitest run tests\ui\army_hq_readiness_threat_copy.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_causality_slides.test.ts --reporter=dot` passed 62/62.
- Expanded proof: `npx.cmd vitest run tests\ui\army_hq_readiness_threat_copy.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_causality_slides.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\ui\chronicle_spine_scrubber.test.ts tests\ui\chronicle_chapter_ui.test.ts --reporter=dot` passed 71/71.
- Broader UI/i18n proof: `npx.cmd vitest run tests\ui_i18n.test.ts tests\chronicle_entries.test.ts tests\ui\chronicle_decision_ledger.test.ts --reporter=dot` passed 37/37.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 249/249.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `npm.cmd run qa:live-surface:browser` passed on fresh port `3247` after an initial stale-port timeout; evidence showed the live surface sweep completed and verified dev-server cleanup.
- `git diff --check` passed with only the existing CRLF normalization warning for `src/ui/map/components/army_hq/generateThreatAssessment.ts`.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event mechanics, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Ups

- Command briefing read model still needs copy tokens or structured localization instead of English strings from `collect_briefing.ts`.
- Chief of Staff briefing should consume structured fields rather than parsing rendered English titles.
- Force readiness recommendation ids should become typed ids instead of English-string switches.
- Generated Chronicle entries from war weariness, refugee flow, Sarajevo siege, generals digest, and consequence receipts need their own localized template pass.
