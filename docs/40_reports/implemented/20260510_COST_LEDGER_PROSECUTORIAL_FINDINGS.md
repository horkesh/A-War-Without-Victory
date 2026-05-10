# Cost Ledger Prosecutorial Findings

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.0 Cost Ledger / consequence-system closure slice

## Summary

The Cost Ledger now has a live prosecutorial finding layer instead of only numeric rows and comparison helpers.

`buildCostLedger(...)` emits deterministic `findings` derived from existing upstream truth: casualty totals, civilian killed totals, refugee totals, faction war-crime-event records, and fired rupture consequences. `WarCostSummary` renders those findings under **Prosecutorial Findings** with source labels. The casualty comparison helper no longer uses "less costly" / "more costly" or percent-of-history minimization phrasing; it now renders a neutral historical-reference index.

## Implementation

- Added `CostLedgerFinding` records to `src/sim/endgame/cost_ledger.ts`.
- Added deterministic finding generation for:
  - human cost record
  - civilian displacement record
  - Srebrenica rupture finding when the rupture fired
  - per-faction war-crime-event records
- Added a `Prosecutorial Findings` section to `src/ui/map/components/WarCostSummary.tsx`.
- Updated endgame/UI proof fixtures for the new Cost Ledger contract.
- Updated the Cost Ledger design doc and Master Roadmap to reflect that the core prosecutorial path is live.

## Canon Posture

This is a Ring 2 narrative/reflection surface. It does not add a new rupture, event trigger, scoring rule, state writer, or player atrocity lever.

The wording follows `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §4:

- third-person historical voice
- integer counts
- source labels for ICTY/ICJ or canon references
- no second-person blame
- no achievement framing
- no "less costly" / "more costly" minimization language

## Verification

- Red first: focused tests failed on missing `findings`, missing `Prosecutorial Findings` rendering, and the old casualty-ratio wording.
- Green focused pack: `npx.cmd vitest run tests/cost_ledger_comparison.test.ts tests/ui/war_cost_summary.test.ts tests/ui/endgame_presentation_proof.test.ts tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/endgame_interaction_proof.test.ts tests/ui/endgame_live_store_proof.test.ts --reporter=dot` passed 116/116.
- Typecheck: `npm.cmd run typecheck` passed.

## Remaining Work

This closes the core Cost Ledger prosecutorial rendering gap. v0.9.0 remains partial because broader consequence narrative breadth and divergence-chain authoring remain separate milestone work.
