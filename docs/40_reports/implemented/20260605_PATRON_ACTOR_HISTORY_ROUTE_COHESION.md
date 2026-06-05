# Patron Actor History Route Cohesion

**Date:** 2026-06-05

## Summary

Patron-defiance material-support cuts now travel through the same receipt routes as other presidential consequences. `buildDecisionConsequenceLedger(...)` projects player-faction `rawGameState.military.patron_defiance_supply_cuts` rows into Records-filed `Patron relations` consequences, and Chronicle receives the same ledger entries through its existing decision-ledger bridge. Patron Relations also adds the realized player-faction cuts to the negotiation timeline as known actor-history entries.

This is UI/read-model only. It does not change patron mechanics, event decisions, material support math, save schema, migrations, scenario data, baselines, generated artifacts, randomness, timestamps, or persisted output ordering.

## Determinism

Rows are filtered to the current player faction, use stable receipt ids (`patron-defiance:<faction>:<turn>:<cut>:<support>`), and flow through the existing deterministic ledger/timeline sorters. Same-turn ledger ordering remains stable by record id; Patron Relations timeline ordering remains turn, label, then id.

## Files

- `src/ui/map/data/decisionConsequenceLedger.ts`
- `src/ui/map/data/diplomacyView.ts`
- `tests/ui/decision_consequence_trail.test.ts`
- `tests/ui/decision_consequence_records_panel.test.ts`
- `tests/ui/chronicle_decision_ledger.test.ts`
- `tests/ui/diplomacy_view.test.ts`

## Verification

- Red/green `npx.cmd vitest run tests\ui\decision_consequence_trail.test.ts --reporter=dot`
- Red/green `npx.cmd vitest run tests\ui\diplomacy_view.test.ts --reporter=dot`
- `npx.cmd vitest run tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts tests\ui\chronicle_decision_ledger.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
