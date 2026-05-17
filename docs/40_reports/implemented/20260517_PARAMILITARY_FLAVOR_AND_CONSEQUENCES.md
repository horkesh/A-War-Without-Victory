# Paramilitary Flavor and Consequences Implementation Report

Date: 2026-05-17
Lane: Paramilitary flavor and consequences
Plan: docs/plans/2026-05-17-paramilitary-flavor-and-consequences-plan.md

## Summary

Implemented the three authorized phases as one independent lane:

- Added deterministic paramilitary severity bands (`minor`, `mid`, `severe`) and cost-ledger war-crimes findings sourced from paramilitary deployment annotations.
- Wired pending paramilitary requests into ask-mode inbox projection with integer civilian-risk counts, war-crime-event increment text, international-standing impact, and Sensitive History Design Gate context.
- Added a cited five-unit paramilitary catalog and deterministic lookup for spawned formation names.
- Moved the rear-pocket paramilitary fade week from 20 to 28, citing the BB1 ARBiH absorption window.

No Scorpions/Skorpioni or Yellow Wasps/Zute Ose entries were added. Static exclusion tests keep those names out of the shipped catalog and generator pools pending historian follow-up `PARAMILITARY-NAMED-UNITS-H1`.

## Files

Owned implementation files changed:

- `src/sim/combat/paramilitary_sweep.ts`
- `src/sim/endgame/cost_ledger.ts`
- `src/sim/negotiation/compute_capital.ts`
- `src/state/formation_constants.ts`
- `src/state/game_state.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/types.ts`
- `data/source/oob/paramilitary_named_units.ts`

Owned tests added or extended:

- `tests/paramilitary_severity_bands.test.ts`
- `tests/cost_ledger_war_crimes_findings.test.ts`
- `tests/paramilitary_review_decision_manifest.test.ts`
- `tests/game_state_adapter_estimated_civilian_risk.test.ts`
- `tests/paramilitary_named_units_catalog.test.ts`
- `tests/paramilitary_name_pool_exclusion.test.ts`
- `tests/paramilitary_fade_week.test.ts`
- `tests/paramilitary_sweep.test.ts`
- `tests/ui/paramilitary_inbox_items.test.ts`

Shared files in the working tree also contain concurrent non-paramilitary edits by other lanes; this report only claims the paramilitary-owned changes above.

## Verification

Focused paramilitary and decision/UI contract suite:

```text
npx.cmd vitest run tests\paramilitary_severity_bands.test.ts tests\cost_ledger_war_crimes_findings.test.ts tests\paramilitary_review_decision_manifest.test.ts tests\game_state_adapter_estimated_civilian_risk.test.ts tests\ui\paramilitary_inbox_items.test.ts tests\paramilitary_named_units_catalog.test.ts tests\paramilitary_name_pool_exclusion.test.ts tests\paramilitary_fade_week.test.ts tests\paramilitary_sweep.test.ts tests\player_decision_manifest.test.ts tests\desktop_player_decision_gate_contract.test.ts tests\ui\pre_advance_command_review.test.ts
```

Result: passed, 12 files, 55 tests.

Post scalar-conversion regression check:

```text
npx.cmd vitest run tests\paramilitary_sweep.test.ts tests\paramilitary_severity_bands.test.ts
```

Result: passed, 2 files, 34 tests.

Typecheck:

```text
npm.cmd run typecheck
```

Result: passed.

Renderer build:

```text
npm.cmd run desktop:map:build
```

Result: passed with existing Vite/browser-externalization and chunk-size warnings.

Full suite:

```text
npx.cmd vitest run
```

Result: timed out after 304 seconds without a final summary.

40-week scenario:

```text
npm.cmd run sim:scenario:run:40w
```

Result: passed.

- Run directory: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1861`
- Final hash: `c0d8212847398b8f`
- Anchors: 27/27 passed
- Anomalies: 0 critical, 0 warning, 12 info
- Historical controller deltas: HRHB 87 vs 125 (-38), RBiH 254 vs 273 (-19), RS 371 vs 314 (+57)

Paramilitary consequence annotations in final save:

- `RS`: latest `paramilitary_war_crimes_severe`, `deployment_count=59`, turn 9
- `HRHB`: latest `paramilitary_war_crimes_mid`, `deployment_count=7`, turn 11
- Total paramilitary war-crimes finding annotations: 12

The final save still contains legacy root `paramilitary_deployment_count: 0`; the implemented consequence path reads the cost-ledger annotations, not this root field. The stale root normalization appears tied to existing migration/serialization code outside this lane's ownership.

## Stop Gates

- Sensitive-history anchors did not regress: 27/27 anchors passed and no critical or warning anomalies were emitted.
- No Scorpions/Skorpioni or Yellow Wasps/Zute Ose were shipped.
- Full Vitest remains unresolved because the broad suite timed out; focused suites, typecheck, renderer build, and 40-week scenario passed.
- Root `paramilitary_deployment_count` serialization remains a parent-integration item outside this lane; do not use it for consequence reporting until the migration/serializer is reconciled.
