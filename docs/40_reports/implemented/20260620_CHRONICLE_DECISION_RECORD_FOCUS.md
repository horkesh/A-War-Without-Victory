# Chronicle Decision Record Focus

**Date:** 2026-06-20  
**Type:** UI route ownership / browser QA hardening  
**Branch:** `codex/chronicle-decision-record-focus`

## Summary

Chronicle presidential decision entries now route to the exact Army HQ Records decision receipt instead of falling back to generic Turn Records. Decision-ledger Chronicle cards expose `data-record-target="decision"` and `data-decision-record-id`, render a localized `Open Decision Record` action, and call the shared `openArmyHQDecisionConsequenceRecord(...)` shell helper.

The live surface browser sweep now understands Chronicle decision targets. When the first visible Chronicle dossier action is a decision record, `qa:live-surface:browser` waits for the Records Decisions subtab and the Decision Consequence Records panel before capturing evidence.

## Verification

- Red proof first failed because the Chronicle decision card could not find an `Open Decision Record` action and the live-sweep contract lacked `chronicleRecordTarget === 'decision'`.
- `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui/chronicle_decision_ledger.test.ts tests/ui/decision_consequence_records_panel.test.ts --pool=forks --reporter=dot` passed: 4 files / 23 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed with `archiveChronicleToRecordsTarget: "decision"`, `archiveChronicleToRecordsDrilldown: true`, `archiveRecordsDecisionToChronicleDrilldown: true`, `codexInternalDrilldown: true`, and port 3239 cleanup verified.
- `git diff --check` passed.

## Scope / Determinism

UI route metadata, i18n labels, browser QA tooling, focused tests, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
