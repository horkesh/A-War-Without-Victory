# Desk Consequence Route Localization

**Date:** 2026-06-06

**Type:** UI/read-model route and localization cleanup. No simulation, save schema, migration, scenario data, baseline manifest, generated artifact, randomness, timestamps, or persisted output ordering changed.

## Change

President's Desk consequence rows now honor the filed surface carried by each decision consequence record. Chronicle-filed decisions open Chronicle, while Records-filed receipts open Army HQ Records. The desk consequence row action labels and the Army HQ Decision Consequences route chrome now use English/BCS localization keys instead of hard-coded English copy.

The batch keeps the existing shared `buildDecisionConsequenceLedger(...)` receipt model and does not create another archive surface. It only fixes the final route/action layer for already-derived decision consequence records.

## Scope

- `ConsequenceStrip` routes rows by `recordTarget` and labels actions as Records or Chronicle.
- `PresidentDeskShell` accepts an optional Chronicle route callback and falls back to Records for older callers.
- The Warroom desk shell wires Chronicle-filed rows to the existing Chronicle opener.
- `DecisionConsequenceRecordsPanel` localizes titles, route labels, metric labels, empty text, and row actions.
- Focused UI tests cover both route destinations and BCS route chrome.

## Verification

- `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\ui\president_desk_shell.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\records_button_behavior.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

Scenario/baseline regression was not run because this is UI/read-model routing and localization only, with no sim/save/scenario byte path touched.

## Follow-Up

Remaining P0 Presidential Command Surface receipt work is deterministic loaded post-turn browser fixture proof and per-family receipt quality beyond this route chrome. The broader open surface work remains richer native overlays/focus proof for Intelligence, Staff, and Faction, retirement of remaining StrategicDashboard/EventLog residues, deeper partial repurposes, owner card art, and the full settlement/front picker.
