# Decision Consequence Record Focus

Date: 2026-06-06
Branch: `codex/command-route-cohesion-20260606`
Type: UI/read-model route cohesion

## Summary

Decision consequence Records routing now preserves the concrete record the player selected. Records-filed rows from the President's Desk open Army HQ Records on the Decision Consequences subtab and focus the matching consequence row instead of only opening the generic tab.

The Records handoff validator also now accepts the existing `recordsSubTab: 'decisions'` subtab value, aligning runtime validation with the declared `ArmyHQRecordsSubTab` union and the live Records UI.

## Scope

- Added focused decision-consequence id state to the tactical UI store.
- Added `openArmyHQDecisionConsequenceRecord(...)` as the canonical Records navigation helper for consequence rows.
- Updated President's Desk consequence rows to pass the selected record id for Records-filed receipts.
- Updated Army HQ Decision Consequences to expand beyond the normal 50-row window when a focused record is older, then scroll/focus and visually mark that row.
- Fixed shell-handoff validation so `recordsSubTab: 'decisions'` is valid.

No command authority behavior, simulation behavior, save schema, migration, scenario data, baseline manifest, replay writer, generated artifact, randomness, timestamps, or persisted output ordering changed.

## Verification

- `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\ui\records_button_behavior.test.ts tests\ui\president_desk_shell.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts --reporter=dot` passed 20/20.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node node_modules\vite\bin\vite.js build --config src\ui\map\vite.config.ts` passed with existing Vite externalization/dynamic-import/chunk-size warnings.
- Browser smoke on `http://127.0.0.1:3017/` passed: Playwright loaded title `AWWV Map` and confirmed the main menu/faction choices rendered.
- `git diff --check` passed.

Scenario/baseline regression was not run because this is UI/read-model route state only and does not change sim, save, scenario, generated artifact, or baseline bytes.
