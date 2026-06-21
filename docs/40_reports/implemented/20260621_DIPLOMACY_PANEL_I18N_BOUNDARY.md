# Diplomacy Panel I18n Boundary

**Date:** 2026-06-21

## Summary

Closed the Patron Relations / Diplomacy Panel localization residual from the Pyrrhic diplomacy scout. The active React diplomacy panel now renders related-track headings, qualitative diplomacy bands, confidence labels, patron labels, generated proposal copy, generated timeline rows, and generated needle hints through EN/BCS i18n keys or read-model copy tokens instead of title-casing raw English ids at the display edge.

## Changed

- `DiplomacyActorView`, `DiplomacyProposalView`, `DiplomacyPressureReasonView`, `DiplomacyTimelineEntryView`, and `DiplomacyNeedleHintView` now support optional `LocalizedCopyToken` metadata while preserving existing English fallback strings.
- `buildDiplomacyView` now emits token metadata for known patron labels, actor stance summaries, Dayton/fallback peace proposal copy, pressure-reason labels, negotiation timeline rows, patron-defiance material-cut rows, and needle hints.
- `DiplomacyPanel` now resolves tokenized copy through `t(...)`, maps support/constraint/commitment/isolation/pressure bands through explicit i18n keys, and localizes the negotiation timeline / needle-movement section headings.
- EN/BCS dictionaries now cover the new diplomacy panel copy keys.
- `tests/ui/diplomacy_panel.test.ts` pins BCS related-track headings and qualitative band labels against stale English leaks.
- `tests/ui/diplomacy_view.test.ts` pins generated diplomacy read-model token metadata.

## Verification

- Red proof 1: `npm.cmd exec -- vitest run tests/ui/diplomacy_panel.test.ts --pool=forks --reporter=dot` failed before implementation on the BCS `Pregovaracka hronologija` assertion while the panel still rendered `Negotiation Timeline` and raw English band labels.
- Red proof 2: `npm.cmd exec -- vitest run tests/ui/diplomacy_view.test.ts --pool=forks --reporter=dot` failed before implementation because generated patron stance copy tokens were absent.
- Red proof 3: the generated-path BCS panel test failed before `paramKeys` on English embedded labels (`Serbia`, `Sarajevo siege visibility`, `Enclave humanitarian pressure`, `Belgrade Border Pressure`).
- Green focused proof: `npm.cmd exec -- vitest run tests/ui/diplomacy_panel.test.ts tests/ui/diplomacy_view.test.ts tests/ui/diplomacy_player_truth.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 29/29.
- TypeScript: `npm.cmd run typecheck` passed.
- Player journey pack: `npm.cmd run qa:player-journeys` passed 239/239.
- Live browser sweep: `npm.cmd run qa:live-surface:browser` passed with first-hour surface reachability, owner drilldown, archive route, and dev-server cleanup evidence. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.
- Map bundle: `npm.cmd run desktop:map:build` passed with the existing Vite browser-external/chunk-size warnings.

## Scope

UI/read-model/i18n/test/docs polish only. No diplomacy mechanics, patron thresholds, pressure calculations, proposal ordering, scenario data, simulation logic, route commands, Srebrenica/Zepa event ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
