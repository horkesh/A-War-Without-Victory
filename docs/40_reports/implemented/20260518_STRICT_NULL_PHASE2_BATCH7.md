# Strict Null Phase 2 Batch 7

Date: 2026-05-18

Lane: strict-null continuation, Phase 2 combat

## Scope

Batch 7 cleaned a small combat-adjacent strict-null slice outside the protected sector reconstruction/reconciliation lane:

- `src/sim/combat/attack_history_recording.ts`
- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/commander/commander_state.ts`
- `src/sim/combat/exhaustion.ts`
- `src/sim/combat/militia_garrison.ts`
- `src/sim/combat/osid_graph_analysis.ts`
- `tests/strict_null_inventory_progress.test.ts`

No scenario data, save schema, random source, ordering, calibration, or sector reconstruction files were changed.

## Red Evidence

Before source edits, the new Batch 7 inventory assertion failed as intended:

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts -t "Batch 7"
expected 5 to be +0
```

## Inventory Delta

Batch 7 slice before edits:

| Category | Count |
|---|---:|
| `as_factionid_casts` | 4 |
| `as_unknown_casts` | 1 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| Total | 5 |

Batch 7 slice after edits:

| Category | Count |
|---|---:|
| `as_factionid_casts` | 0 |
| `as_unknown_casts` | 0 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| Total | 0 |

Exact delta: `5 -> 0` (`-5` total), with `as_factionid_casts -4` and `as_unknown_casts -1`. Relative to the Batch 5 phase-ledger baseline, Phase 2 remaining inventory decreases from `110` to `105`.

## Implementation Notes

- Replaced redundant `as FactionId` casts with typed local variables or existing inferred `FactionId | null` reads.
- Added `campaign_role_deviation_reason` to `CommanderBriefing` so `buildBriefing` can construct the object directly instead of assigning through `as unknown`.
- Preserved existing sorted iteration and `strictCompare` paths.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts -t "Batch 7"
1 passed, 3 skipped

npx.cmd vitest run tests/strict_null_inventory_progress.test.ts
4 passed

npx.cmd vitest run tests/commander/briefing_campaign_intent.test.ts tests/combat_exhaustion.test.ts tests/exhaustion_accumulate.test.ts tests/strict_null_inventory_progress.test.ts
4 files passed, 27 tests passed

npm.cmd run typecheck
exit 0
```

## Determinism

No determinism risks found under `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`, `docs/20_engineering/CODE_CANON.md`, and `docs/10_canon/Engine_Invariants_v0_9_0.md`: the changes are type-shape and construction-only, do not add timestamps or randomness, and do not alter collection iteration order.

## Residual Risk

No 40w scenario hash run was performed in this narrow lane. Residual risk is low because no runtime defaults, data, ordering, or serialized fields were changed, but parent integration should run the usual scenario hash gate before closing the broader roadmap batch.
