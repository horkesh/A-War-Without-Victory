# Receipt Route Browser Proof

## Summary

This batch closes the next receipt-route cohesion slice after the desk consequence route/localization work. Records-filed President's Desk consequence rows now route to Army HQ Records -> Decision Consequences instead of the generic Turn Aftermath records view, patron-defiance material cuts no longer duplicate between the Chronicle receipt bridge and decision-ledger bridge, and Army HQ Records counts After-Action Report availability from `latestTurnSummary` instead of completed operation history.

The new `tools/ui/receipt_route_browser_smoke.cjs` starts the Vite map shell, loads a deterministic modified startup save through `window.handleManualSaveLoad`, opens the Warroom President's Desk, clicks a Records-filed patron consequence row, and verifies the live shell lands on Decision Consequences with `AFTER-ACTION REPORT0` and `OPERATION HISTORY1` split correctly.

## Behavior

- President's Desk consequence records now carry an optional Decision Records callback so Records-filed receipts open `armyHQRecordsSubTab = 'decisions'`.
- Generic Records routing still opens Turn Aftermath records.
- Chronicle-filed receipt behavior remains unchanged.
- Patron-defiance cuts remain in the Chronicle decision-ledger trail, but the generated consequence-receipt bridge skips those rows so the Chronicle generator does not produce duplicate patron cards when an event catalog is present.
- AAR tab counts now reflect `latestTurnSummary` availability; completed operation history remains counted under Operation History.

## Determinism

This is UI/read-model and browser-proof tooling only. No simulation behavior, save schema, migration, scenario data, baseline manifest, generated artifact, replay writer, randomness, timestamps, or persisted output ordering changed. The browser smoke writes proof JSON/PNG only under ignored `.tmp_receipt_route_browser_proof/` and verifies its Vite port cleanup.

## Verification

- `node ..\..\node_modules\vitest\vitest.mjs run tests\ui\president_desk_shell.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\diplomacy_view.test.ts tests\ui\operation_aar_records_review.test.ts --reporter=dot`
- `node tools\ui\receipt_route_browser_smoke.cjs`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

