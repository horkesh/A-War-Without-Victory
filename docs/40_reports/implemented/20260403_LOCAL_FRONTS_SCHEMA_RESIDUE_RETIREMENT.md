# 2026-04-03 - Local Fronts Schema Residue Retirement

## Summary

Finished the `local_fronts` swamp-drain slice by deleting the dead schema/runtime residue instead of merely not rebuilding it.

The live engine had already stopped using `local_fronts` as a canonical frontline authority, but the schema, turn pipeline, and backward-compatible AI export hub still made it look alive. That was exactly the kind of false authority that future cleanup or Claude work would eventually mistake for a live system.

## What changed

- removed the `LocalFront` interface from `src/state/game_state.ts`
- removed `local_fronts?: ...` from `GameState.military`
- removed the old `state.military.local_fronts = undefined` turn-pipeline clear from `src/sim/turn_pipeline.ts`
- removed the dead `compute-local-fronts` war-phase step from `src/sim/turn_phases/war_phases.ts`
- removed the stale `deriveCorpsFrontMapping(...)` re-export from `src/sim/combat/bot_corps_ai.ts`
- tightened the honesty regression so it now proves:
  - no `compute-local-fronts` runtime step remains
  - no `local_fronts` schema field remains
  - no `deriveCorpsFrontMapping(...)` compatibility surface remains in the live corps AI hub

## Why

This was not just dead-code cleanup.

`local_fronts` had already been demoted to a compatibility idea, but the repo still had enough schema and public-surface residue to teach the next implementer that it was still a valid frontline currency.

In a repo like AWWV, the most dangerous legacy systems are not the oldest ones. They are the ones that still look official.

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\engine_honesty_legacy_contracts.test.ts`

## Follow-on

- keep auditing remaining frontline vocabulary (`brigade_front_assignment`, `assignable_front_segments`, `front_segments`) and classify each path as canonical, compatibility-only, or dead
- keep canon docs honest whenever schema/runtime residue is removed, not just when gameplay formulas change
