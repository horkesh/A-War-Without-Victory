# Records Route Cohesion

**Date:** 2026-06-05

## Summary

Army HQ Records now has a small archive-route spine above its sub-tabs. It summarizes turn records, completed operation AARs, decision consequences, Chronicle-filed decisions, and opportunity records from the same read-models the tabs render. The decision-consequence panel now shows deterministic route counts, family coverage, latest filed turn, and per-record filing destinations. Chronicle-filed decision records expose an `Open Chronicle` action; Records-filed records are explicitly marked for local review.

This is UI/read-model only. It does not change simulation turn logic, event/patron mechanics, save schema, migrations, scenario data, generated artifacts, baselines, or persisted outputs.

## Determinism

`buildDecisionConsequenceLedger(...)` no longer uses `localeCompare(...)` for same-turn tiebreaks. It uses a stable ASCII comparator and exposes `buildDecisionConsequenceLedgerSummary(...)` for route/family counts. Archive rows remain sorted newest turn first, then by stable record id.

## Files

- `src/ui/map/data/decisionConsequenceLedger.ts`
- `src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `tests/ui/decision_consequence_trail.test.ts`
- `tests/ui/decision_consequence_records_panel.test.ts`
- `tests/ui/operation_aar_records_review.test.ts`

## Verification

- `npx.cmd vitest run tests/ui/decision_consequence_trail.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/turn_aftermath_records_panel_i18n.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains` (total 507; `state: 172`, `sim: 327`, `derived: 8`)
- `git diff --check`
