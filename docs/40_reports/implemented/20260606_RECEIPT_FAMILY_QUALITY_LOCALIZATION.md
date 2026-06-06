# Receipt Family Quality and Localization Batch

## Summary

President's Desk and Army HQ Records now render decision-consequence family labels through stable localized family IDs instead of hard-coded English family strings. The existing English `family` text remains on the read-model record for compatibility, while the UI uses display-safe hyphenated `familyId` values to choose English/BCS labels.

Army HQ Records archive-summary chrome is now localized in English/BCS, closing the remaining English-only receipt route summary in the Records surface.

The loaded-save browser smoke now proves multiple receipt families together: patron material receipts, reserve request receipts, operation opportunity receipts, and Chronicle-filed convoy receipts. It also keeps the AAR/Operation History split proof and verifies a Chronicle-filed receipt opens Chronicle.

## Scope

- UI/read-model display and browser-proof tooling only.
- No simulation behavior changed.
- No save schema, migration, scenario data, baseline manifest, replay writer, generated artifact, randomness, timestamps, or persisted output ordering changed.
- The browser fixture mutates an in-memory startup save only inside `tools/ui/receipt_route_browser_smoke.cjs`.

## Files

- `src/ui/map/data/decisionConsequenceLedger.ts`
- `src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx`
- `src/ui/map/components/presidential_desk/ConsequenceStrip.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/decision_consequence_records_panel.test.ts`
- `tests/ui/operation_aar_records_review.test.ts`
- `tests/ui/presidential_desk_assets.test.ts`
- `tools/ui/receipt_route_browser_smoke.cjs`

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\operation_aar_records_review.test.ts tests\ui\president_desk_shell.test.ts tests\ui\records_button_behavior.test.ts tests\ui\turn_aftermath_records_panel_i18n.test.ts tests\ui\presidential_desk_assets.test.ts --reporter=dot`
  - Passed: 37/37.
- `npm.cmd run typecheck -- --pretty false`
  - Passed.
- `node tools/ui/receipt_route_browser_smoke.cjs`
  - Passed.
  - Evidence: `.tmp_receipt_route_browser_proof/receipt_route_browser_smoke.json`.
  - Screenshot: `.tmp_receipt_route_browser_proof/receipt_route_browser_smoke.png`.
  - Dev server cleanup verified port `3231` was no longer listening.
- `git diff --check`
  - Passed.

## Notes

The live browser smoke loads the full tactical map shell and still records existing DeckGL overlay console errors during map-layer initialization. The receipt assertions passed; this batch does not alter map layers or overlay geometry.
