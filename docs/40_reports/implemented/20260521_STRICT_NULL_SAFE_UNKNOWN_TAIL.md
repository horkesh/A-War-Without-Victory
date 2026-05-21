# Strict-Null Safe Unknown-Cast Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; type-contract and compatibility-read refactor.

## Summary

Cleaned two safe `as unknown` sites:

- `src/sim/negotiation/scoring.ts`
- `src/sim/ai_commander/corps_dialogue.ts`

`FactionVerdict.capital_breakdown` now reflects existing runtime truth by allowing `null` for no-negotiation-data verdicts, replacing the previous `null as unknown as NegotiationBreakdown` cast. The UI already guarded this field before rendering statistics. `corps_dialogue.ts` now reads the compatibility `combat_summary` field through a local structural extension type instead of an `unknown` double-cast.

No verdict scoring, condemnation, dialogue prompting/parsing, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 2
as_any_casts 179
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

The two remaining `as unknown` sites are classified as adapter/mock-state boundaries:

- `src/ui/map/components/VerdictScreen.tsx` casts `LoadedGameState` into the engine `GameState` ghost-entry builder boundary.
- `src/ui/warroom/warroom.ts` casts a deliberately partial browser mock into `GameState` for the standalone warroom fallback.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/scoring.test.ts tests/rupture_consequences.test.ts tests/rupture_silence_when_defended.test.ts tests/corps_dialogue.test.ts --reporter=dot
PASS 159/159

npm.cmd run typecheck
PASS
```
