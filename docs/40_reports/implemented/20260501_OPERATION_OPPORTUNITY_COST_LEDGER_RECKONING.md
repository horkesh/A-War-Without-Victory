# Operation Opportunity Cost Ledger Reckoning

**Date:** 2026-05-01
**Type:** Endgame observability + UI display. No simulation behavior, combat math, opportunity catalog content, OOB, scenario data, painted targets, or operation definitions changed.

## Summary

The Operation Opportunity system already had the full causal chain: proposal, decision, normal CorpsOperation execution, AAR closeout, and `OperationOpportunityResolution.executed_op_aar_id + exit_class`. This packet makes the endgame Cost Ledger consume that truth directly.

`buildCostLedger(...)` now includes an optional `operation_opportunities` summary derived from `state.military.operation_opportunity_resolutions`, `state.military.operation_opportunities`, and linked `state.operation_history` AAR rows. `WarCostSummary` renders the summary in the final War Reckoning panel when opportunity decisions exist.

## What Changed

- `src/sim/endgame/cost_ledger.ts`
  - Added `OpportunityCostLedger`, `OpportunityCostLedgerEntry`, and per-faction summary types.
  - Added deterministic derivation from opportunity resolution rows plus linked AARs.
  - Captures response, faction, linked AAR id, exit class, AAR outcome, attacks, objective counts, and grade stars.
  - Keeps the new field optional for backward compatibility with older saves/tests.

- `src/ui/map/components/WarCostSummary.tsx`
  - Renders an `Opportunity Decisions` block when the cost ledger has opportunity history.
  - Shows decision count, completed count, success count, and per-entry operation name / faction / response / exit class / attacks.
  - Reads only the cost-ledger packet; it does not re-derive opportunity truth in the UI.

- Tests
  - `tests/cost_ledger_comparison.test.ts` now proves `buildCostLedger(...)` summarizes linked opportunity/AAR outcomes.
  - `tests/ui/endgame_mount_proof.test.ts` now proves the endgame component renders the opportunity reckoning.

## Invariants

- The Cost Ledger remains a reflection surface. It writes no game state and does not affect simulation.
- Opportunity outcomes are derived from `executed_op_aar_id + exit_class`, not operation-name inference.
- The UI consumes one downstream packet from `CostLedger`; it does not read raw opportunity state or raw AARs.
- Ordering is deterministic: response turn, opportunity id, proposal id.

## Verification

- Red first:
  - `npx.cmd vitest run tests/cost_ledger_comparison.test.ts` failed because `operation_opportunities` did not exist on the ledger.
  - `npx.cmd vitest run tests/ui/endgame_mount_proof.test.ts` failed because `WarCostSummary` did not render `Opportunity Decisions`.
- Green:
  - `npx.cmd tsc --noEmit` clean.
  - `npx.cmd vitest run tests/cost_ledger_comparison.test.ts tests/ui/endgame_mount_proof.test.ts` -> 34/34 pass.
  - `npx.cmd vitest run tests/cost_ledger_comparison.test.ts tests/ui/endgame_mount_proof.test.ts tests/ui/endgame_presentation_proof.test.ts tests/ui/endgame_live_store_proof.test.ts tests/ui/endgame_interaction_proof.test.ts tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/render_proof_real_fixtures.test.ts` -> 122/122 pass.
  - `npm.cmd run desktop:map:build` passes with pre-existing Vite warnings only.

## Next

The natural next player-visible lane is the full opportunity dossier review surface: prerequisite chips, force-quality trait bands, map footprint, staff recommendation, and the five canonical choices. This packet only closes the endgame reckoning side.
