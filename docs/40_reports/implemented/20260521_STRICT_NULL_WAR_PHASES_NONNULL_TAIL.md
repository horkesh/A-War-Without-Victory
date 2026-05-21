# Strict-Null War Phases Non-Null Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor.

## Summary

Cleaned the remaining inventory-counted dot/index non-null assertions from `src/sim/turn_phases/war_phases.ts`.

The `evaluate-events` step already owns the `result.fired` array before assigning it to `context.report.events_fired`, so the Graz Accords append now writes through that local array instead of asserting the report field. The smuggling income step already skipped reserve writes unless both optional reserve maps existed, so it now narrows those maps into locals and writes through the locals instead of repeatedly asserting the optional state fields.

No event firing, Graz Accords behavior, smuggling income, reserve formulas, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 4
non_null_assertions_index 0
optional_fields_game_state 473
```

`src/sim/turn_phases/war_phases.ts` now contributes zero inventory-counted dot/index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 70/70

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
