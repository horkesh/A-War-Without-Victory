# Army HQ Records Provenance Drilldown

**Date:** 2026-06-21  
**Status:** Implemented locally on `codex/army-hq-records-provenance-batch`  
**Type:** UI/read-model, route ownership, copy-boundary, and browser-QA hardening.

## Summary

This batch closes the latest Army HQ / Records player-polish findings:

- Turn-0 setup provenance no longer appears as normal Turn Aftermath or AAR history. Records and embedded AAR count only summaries that pass the shared terrain narration guard.
- Army HQ sector and operation briefing actions preserve corps context when routing to the tactical field.
- Army HQ sector and ORBAT rows now separate row expansion from explicit `Inspect` field-routing controls.
- Army HQ corps cards expose opening-command provenance on first paint through stable DOM hooks.
- Situation Briefing and command-access labels now use player-facing i18n copy instead of hardcoded staff shorthand.
- `qa:first-hour:browser` asserts all playable factions keep turn-0 Records aftermath/AAR counts at zero while filing foundational decisions to Records/Chronicle.
- `qa:live-surface:browser` now proves Army HQ opening-command provenance and the Army HQ sector inspect-on-field route in a real browser.
- The live sweep caught a Corps Front `DEF/EDGE` shorthand leak; it is now `Defense per front segment` / `Odbrana po frontovskom segmentu`.
- The stale fast-suite copy assertion for localized Records count aria labels was synced to the shipped UI contract.

## Verification

- `npx.cmd vitest run tests\ui\operation_aar_records_review.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\commander_read_model_surfaces.test.ts tests\ui\situation_briefing_progressive_disclosure.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --reporter=dot` passed 99/99.
- `npm.cmd run qa:first-hour:browser` passed; evidence showed RBiH/RS/HRHB turn-0 Records counts `aftermath: 0`, `aar: 0` while foundational decisions filed.
- `npm.cmd run qa:live-surface:browser` passed after fixing the selector hook and Corps Front shorthand leak.
- `npm.cmd run qa:player-journeys` passed 246/246.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.

## Scope

No simulation logic, scenario data, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, package/installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed. Srebrenica/Zepa remain event-owned receipts and were not touched.
