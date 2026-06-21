# Chronicle FEEL Generated-Copy Localization

**Date:** 2026-06-22

**Type:** UI/read-model/i18n/test/docs polish.

## Summary

Localized generated Chronicle and FEEL copy that still lived inside read-model helpers instead of the EN/BCS message catalogs. This closes generated English scaffolding in combat/cost/displacement/formation Chronicle cards, operation AAR and officer spotlight cards, endgame comparison chrome, confirmed consequence receipts, war-weariness beats, refugee-flow cadence beats, Sarajevo-siege beats, generals' digest beats, and patron-defiance material receipt rows.

Authored content remains data-owned: event titles/options/narrative, officer names, operation names, settlement names, and historical comparison note text are preserved verbatim. Srebrenica/Zepa fall handling remains event-owned; no scripted-operation or calibration path was touched.

## Changed

- Added explicit `chronicle.generated.*` EN/BCS i18n keys for generated Chronicle/FEEL scaffolding.
- Moved generated templates in `generateChronicleEntries`, `warWearinessChronicle`, `refugeeFlowChronicle`, `refugeeFlow`, `sarajevoSiege`, `generalsDigest`, and `consequenceReceipts` behind `t(...)`.
- Kept compatibility fallback behavior and internal ids intact while adding BCS sentinels for generated-copy leaks.
- Added focused BCS regression coverage for Chronicle cards, war-weariness, refugee-flow, Sarajevo siege, generals' digest, and patron-defiance receipts.

## Verification

- `npx.cmd vitest run tests\chronicle_entries.test.ts tests\war_weariness_chronicle.test.ts tests\refugee_flow_chronicle.test.ts tests\sarajevo_siege_legibility.test.ts tests\generals_digest_chronicle.test.ts tests\ui\consequence_receipts.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` passed 112/112.
- Broader UI/i18n pack `npx.cmd vitest run tests\chronicle_entries.test.ts tests\war_weariness_chronicle.test.ts tests\refugee_flow_chronicle.test.ts tests\sarajevo_siege_legibility.test.ts tests\generals_digest_chronicle.test.ts tests\ui\consequence_receipts.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\ui_i18n.test.ts tests\ui\ui_copy_raw_id_fallbacks.test.ts tests\wrapped_slides.test.ts --reporter=dot` passed 157/157.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 249/249.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `npm.cmd run qa:live-surface:browser` passed on port 3239 and verified dev-server cleanup; `.tmp_live_surface_browser_sweep` was removed.
- `git diff --check` passed.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event mechanics, Srebrenica/Zepa event ownership, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
