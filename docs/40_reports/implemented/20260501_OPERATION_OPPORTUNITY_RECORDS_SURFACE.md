# Operation Opportunity Records Surface

**Date:** 2026-05-01
**Baseline:** Operation Opportunity MVP + AAR-loop closure (`cecaaa02`)
**Result:** Army HQ can now consume and display opportunity proposal/decision/outcome truth

## Summary
- Added a read-only opportunity ledger view derived from `operation_opportunities`, `operation_opportunity_resolutions`, pending proposal reviews, and linked `operation_history` AARs.
- Added an Army HQ Records subtab (`OPPORTUNITIES`) that shows pending/resolved/completed opportunity records for the player faction.
- Kept the opportunity catalog and operation execution lanes untouched. This is a consumer surface only.

## Changes Made

### UI Data Adapter
- `src/ui/map/data/operationOpportunityLedger.ts` derives player-scoped records with:
  - proposal id / opportunity id / display name
  - proposal status and decision response
  - linked AAR id and exit class
  - AAR outcome, attacks, objective counts, and grade
  - prerequisite-axis counts from the last opportunity evaluation
- `src/ui/map/data/GameStateAdapter.ts` exposes `operationOpportunityRecords` and `operationOpportunitySummary` on `LoadedGameState`.

### Army HQ Records
- `src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx` renders the read-only ledger.
- `src/ui/map/components/army_hq/RecordsContent.tsx` adds an `OPPORTUNITIES` subtab beside AAR and Operation History.
- `src/ui/shared/shellHandoff.ts`, `src/ui/map/store/gameStore.ts`, and `src/ui/map/App.tsx` accept `opportunities` as an Army HQ Records subtab target.

## Invariants
- No combat math, opportunity catalog entries, operation definitions, OOB, scenario data, painted targets, or turn-pipeline mechanics changed.
- The panel is read-only. It does not approve, decline, spawn, halt, or mutate opportunities.
- Player scoping is defensive: records with a known non-player faction are hidden from the player-facing view.
- The surface consumes `executed_op_aar_id` and `exit_class`; it does not infer outcomes from operation names.

## Verification
- `npx.cmd tsc --noEmit` -> clean.
- `npx.cmd vitest run tests/ui_map_game_state_adapter.test.ts tests/ui_shell_navigation.test.ts tests/ui/inbox_items.test.ts` -> 65/65 pass.
- `npm.cmd run desktop:map:build` -> pass. Existing Vite warnings only: large bundle / dynamic import chunking / loaders.gl browser external.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/data/types.ts` | Add opportunity ledger view types and LoadedGameState fields. |
| `src/ui/map/data/operationOpportunityLedger.ts` | New pure derivation helper. |
| `src/ui/map/data/GameStateAdapter.ts` | Expose records and summary. |
| `src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx` | New read-only Army HQ records panel. |
| `src/ui/map/components/army_hq/RecordsContent.tsx` | Add OPPORTUNITIES subtab. |
| `src/ui/shared/shellHandoff.ts` | Allow records handoff to `opportunities`. |
| `src/ui/map/store/gameStore.ts` | Store the new records subtab value. |
| `src/ui/map/App.tsx` | Type records navigation for the new subtab. |
| `tests/ui_map_game_state_adapter.test.ts` | Adapter proof for player-scoped AAR-linked opportunity records. |
| `tests/ui_shell_navigation.test.ts` | Shell navigation proof for the new subtab. |

## Next Steps
- Cost Ledger / endgame can now add an opportunity-history section using the same record shape.
- Future Claude catalog lanes should not add UI code for each new opportunity family; they only need to populate catalog truth and the ledger will display the resulting records.
