# Strict Null Phase 2 Batch 10

Date: 2026-05-18

## Scope

Owned files only:
- `src/sim/combat/hv_integration.ts`
- `src/sim/combat/sector_splitting.ts`
- `tests/strict_null_inventory_progress.test.ts`
- `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`

Protected areas were not edited: project ledger, roadmap/backlog files, sector-performance files, intel-extension files, napkin, and ledger knowledge.

## Inventory Delta

Focused pre-change inventory for the two owned combat files:
- `as_factionid_casts`: 0
- `as_unknown_casts`: 0
- `as_any_casts`: 2
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- Total: 2

Post-change inventory for the same files:
- `as_factionid_casts`: 0
- `as_unknown_casts`: 0
- `as_any_casts`: 0
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- Total: 0

Batch 10 delta: -2 inventory-counted escapes, both `as_any_casts`.

## Implementation Notes

- `hv_integration.ts`: replaced the elite-flag mutation through `as any` with a local intersection type, preserving the existing emitted `is_elite: true` property only for elite HV brigade spawns.
- `sector_splitting.ts`: typed the temporary edge metadata map with the same structural shape accepted by `buildEdgeAdjacency`, removing the fallback-path `as any`.
- `strict_null_inventory_progress.test.ts`: added a focused Batch 10 assertion for only the two owned files.

No defaults, state-shape changes, ordering changes, random sources, or serialization changes were introduced.

## Verification

- Red assertion before source cleanup: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` failed with Batch 10 current total `2`.
- Green assertion after cleanup: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` passed, 7 tests.
- Final requested verification: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` passed, 7 tests.
- Final requested verification: `npm.cmd run typecheck` passed.
